/* =====================================================================================================
   THE STREAMED TERRAIN (src/world/wterrain.js): level-0 height tiles for the game, and a quadtree of terrain chunks for the eye.
   - A level-0 tile is 128 m of the 2 m lattice (65x65 heights): owH reads the very triangles the near terrain is drawn with
     (the diagonal of a cell follows the parity of its global indices, as before).
   - A chunk of level L is 128*2^L m wide and has 64x64 cells (2*2^L m), with skirts that hide the cracks where levels meet;
     chunks near the camera are level 0 (they are drawn from the level-0 tiles), farther ones coarser, out to about 6 km.
   - Vertices are stored relative to the chunk's corner (the mesh is placed there), so precision is the same everywhere.
   - Every chunk with water in it has a water mesh: the lattice cells where the water level stands over the ground, at the water level of each
     corner, so rivers slope with their water and fall over cliffs as steep sheets (waterfalls), lakes are level; a cell whose corners' levels differ
     is drawn only when it is one stream falling along its flow (two waters at different levels never meet in a sheet).
   ===================================================================================================== */
const WT={syncR:420,on:false,LMAX:5,N:64,K:1.4,chunks:new Map(),tiles:new Map(),tileCap:520,pool:[],reqs:new Map(),reqId:0,asked:new Set(),ready:new Map(),seed:0,onTile:null,group:null,mat:null,wmat:null,idx:null,widx:null,q:[],shown:new Set(),
  budget:6,cam:{x:0,y:0,z:0},frame:0,stats:{built:0,ms:0,tiles:0,tms:0,wk:0,wms:0},tex:null,time:{value:0}};
const wtKey=(L,i,k)=>L+':'+i+':'+k;
/* ---------- the level-0 tiles (the ground the game stands on) ---------- */
function wtTile(ti,tk){const key=ti+','+tk;let t=WT.tiles.get(key);if(t){t.use=WT.frame;return t;}const T0=performance.now(),S=WG_CFG.tile,n=S/WG_CFG.res;
  const g=wgGrid(ti*S,tk*S,WG_CFG.res,n,0);t=wtTileSet(ti,tk,g);WT.stats.tiles++;WT.stats.tms+=performance.now()-T0;return t;}
function wtTileSet(ti,tk,g){const key=ti+','+tk,S=WG_CFG.tile;let t=WT.tiles.get(key);if(t)return t;t={ti,tk,g,use:WT.frame,x0:ti*S,z0:tk*S};WT.tiles.set(key,t);if(WT.tiles.size>WT.tileCap)wtTileEvict();if(WT.onTile)WT.onTile(t);return t;}
/* a tile asked of a worker (nothing if it exists or is on its way; the roads that reach it must be known first) */
function wtTileAsk(ti,tk){const key=ti+','+tk;if(WT.tiles.has(key)||WT.asked.has('t'+key))return;const S=WG_CFG.tile;if(typeof wsReady==='function'&&!wsReady(ti*S,tk*S,(ti+1)*S,(tk+1)*S))return;
  if(wtAsk('t'+key,ti*S,tk*S,WG_CFG.res,S/WG_CFG.res,0,g=>{WT.asked.delete('t'+key);if(WT.on&&WT.seed===WG.seed)wtTileSet(ti,tk,g);}))WT.asked.add('t'+key);}
/* ---------- the workers ---------- */
function wtPoolInit(src,seed){wtPoolStop();WT.seed=seed;if(!src||typeof Worker==='undefined')return 0;const n=Math.max(1,Math.min(3,(navigator.hardwareConcurrency||4)-1));let url;
  try{url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));}catch(e){return 0;}
  for(let i=0;i<n;i++){try{const w=new Worker(url);w.busy=0;w.onmessage=wtOnMsg;w.onerror=e=>{console.warn('world worker:',e.message);w.dead=true;};w.postMessage({init:1,seed});WT.pool.push(w);}catch(e){console.warn('no world worker',e);break;}}
  return WT.pool.length;}
function wtPoolStop(){for(const w of WT.pool)w.terminate();WT.pool=[];WT.reqs.clear();WT.asked.clear();WT.ready.clear();whpReset();}
function wtOnMsg(e){const m=e.data;if(m.hyd){whpOnMsg(this,m);return;}const r=WT.reqs.get(m.id);this.busy=Math.max(0,this.busy-1);if(!r)return;WT.reqs.delete(m.id);WT.stats.wk++;WT.stats.wms+=m.g.ms||0;r.cb(m.g);}
/* a grid of the world from the least busy worker (cb gets it); false if none is free */
function wtAsk(key,x0,z0,step,n,lite,cb){let w=null;for(const p of WT.pool)if(!p.dead&&(!w||p.busy+(p.hjob?.5:0)<w.busy+(w.hjob?.5:0)))w=p;if(!w||w.busy>=2)return false;/* (a worker working out hydrology, WHP, is passed over while another is as free) */
  const st=lite>=1?null:(WG.stampsIn?WG.stampsIn(x0-step,z0-step,x0+(n+1)*step,z0+(n+1)*step):null);
  const id=++WT.reqId;WT.reqs.set(id,{key,cb});w.busy++;w.postMessage({grid:1,id,x0,z0,step,n,lite,st});return true;}
/* ---------- the hydrology ahead of the game (v54) ----------
   The first time a place is touched its hydrology (wgen.js: the heights of the 96 m lattice, where each point drains, how much drains through it - counted up
   to 40 steps upstream, kilometres off - its lakes and streams) cost the main thread 50-160 ms: the far villages' sites, the landmarks, the roads and the trees
   ask for it. The workers work it out ahead: the blocks of 8 x 8 points round the player out to WHP.R (set by wstFrame: as far as the game asks), nearest
   first, one block a job, on a worker with at most one chunk of ground in hand (the chunks of ground come first; a block something waits for may go behind
   two); the main thread takes in each block whole
   (wgHydPut: the numbers it would have worked out itself). What can wait (the far sites, landmarks and trees) asks wtHydReady first: false while its blocks are on
   their way (they are asked for first); a block asked for over WHP.wait ms ago and still not given to a worker is left to the main thread (one a worker has in hand
   is waited for up to WHP.cap ms): only a worker lost should come to that - a block the main thread works out itself pulls in every block upstream of it (wgAcc). */
const WHP={R:0,cx:1e9,cz:1e9,vx:0,vz:0,px:null,pz:null,pt:0,plan:[],pi:0,pri:[],asked:new Map(),req:new Map(),ep:-1,id:0,wait:30000,cap:30000,max:2,look:16,stats:{jobs:0,got:0,dup:0,ms:0,pri:0,late:0}};
/* (each worker keeps to its own squares of 4 x 4 blocks, 3 km: a block's neighbours and what drains into it are mostly its own already - three workers over the same
   ground would each work all of it out; at most WHP.max workers at it at once, so the main thread keeps a core) */
const whpOwner=(bi,bj,n)=>wnHashI(Math.floor(bi/4),Math.floor(bj/4),977)%n;
const whpHas=(bi,bj)=>WG.hyd.has(wgKey(bi*8,bj*8));
function whpReset(){WHP.plan=[];WHP.pi=0;WHP.pri=[];WHP.asked.clear();WHP.req.clear();WHP.cx=WHP.cz=1e9;WHP.px=null;for(const w of WT.pool)w.hjob=0;}
const whpOn=()=>WT.pool.length>0&&WT.seed===WG.seed&&WG.on;
/* the blocks within R of the focus (a square: the sites are asked for ring by ring of cells), nearest to where it is heading first */
function whpPlan(cx,cz,R){const B=WG_CFG.hydroCell*8,b0=Math.floor((cx-R)/B),b1=Math.floor((cx+R)/B),c0=Math.floor((cz-R)/B),c1=Math.floor((cz+R)/B),L=Math.min(R/3,Math.hypot(WHP.vx,WHP.vz)*4),
    sp=Math.hypot(WHP.vx,WHP.vz)||1,ax=cx+WHP.vx/sp*L,az=cz+WHP.vz/sp*L,out=[];
  for(let bj=c0;bj<=c1;bj++)for(let bi=b0;bi<=b1;bi++){if(whpHas(bi,bj))continue;out.push([Math.hypot((bi+.5)*B-ax,(bj+.5)*B-az),bi,bj]);}
  out.sort((p,q)=>p[0]-q[0]);WHP.plan=out;WHP.pi=0;WHP.cx=cx;WHP.cz=cz;WHP.pR=R;}
/* per frame (wstFrame, after the ground's chunks were asked for): jobs to the workers that have no block in hand, at most WHP.max of them at once */
function whpStep(cx,cz){if(!whpOn())return;if(WHP.ep!==WG.ep){whpReset();WHP.ep=WG.ep;}const now=performance.now();
  if(WHP.px!==null&&now-WHP.pt>500){const dt=(now-WHP.pt)/1000;WHP.vx=WHP.vx*.5+.5*(cx-WHP.px)/dt;WHP.vz=WHP.vz*.5+.5*(cz-WHP.pz)/dt;WHP.px=cx;WHP.pz=cz;WHP.pt=now;}else if(WHP.px===null){WHP.px=cx;WHP.pz=cz;WHP.pt=now;}
  if(WHP.R>0&&(Math.hypot(cx-WHP.cx,cz-WHP.cz)>256||Math.abs(WHP.R-WHP.pR)>100||(WHP.pi>=WHP.plan.length&&WT.frame%60===0)))whpPlan(cx,cz,WHP.R);
  const P=WT.pool,n=P.length;let on=0;for(const w of P)if(w.hjob)on++;
  for(let wi=0;wi<n&&on<Math.min(WHP.max,n);wi++){const w=P[wi];if(w.dead||w.hjob)continue;
    let b=null;/* (what is waited for first - on any worker -, then the plan - of the next few, the first in its own squares - on a worker with at most one chunk in hand) */
    while(WHP.pri.length&&w.busy<=2){const c=WHP.pri.shift();if(!whpHas(c[0],c[1])&&!WHP.asked.has(wgKey(c[0],c[1]))){b=c;WHP.stats.pri++;break;}}
    if(!b&&w.busy<=1){while(WHP.pi<WHP.plan.length){const c=WHP.plan[WHP.pi];if(whpHas(c[1],c[2])||WHP.asked.has(wgKey(c[1],c[2])))WHP.pi++;else break;}
      let pick=-1;for(let k=WHP.pi;k<Math.min(WHP.plan.length,WHP.pi+WHP.look);k++){const c=WHP.plan[k];if(c[3])continue;if(pick<0&&!whpHas(c[1],c[2])&&!WHP.asked.has(wgKey(c[1],c[2])))pick=k;if(whpOwner(c[1],c[2],n)===wi&&!whpHas(c[1],c[2])&&!WHP.asked.has(wgKey(c[1],c[2]))){pick=k;break;}}
      if(pick>=0){const c=WHP.plan[pick];c[3]=1;b=[c[1],c[2]];if(pick===WHP.pi)WHP.pi++;}}
    if(!b)continue;on++;const id=++WHP.id;w.hjob=1;WHP.asked.set(wgKey(b[0],b[1]),now);WHP.stats.jobs++;w.postMessage({hyd:1,id,ep:WG.ep,seed:WG.seed,bi:b[0],bj:b[1]});}}
function whpOnMsg(w,m){w.hjob=0;const k=wgKey(m.bi,m.bj);WHP.asked.delete(k);WHP.req.delete(k);if(!m.F||m.ep!==WG.ep||m.seed!==WG.seed||!WG.on)return;WHP.stats.ms+=m.ms;
  if(wgHydPut(m.bi,m.bj,m.F))WHP.stats.got++;else WHP.stats.dup++;}
/* whether the hydrology of a rectangle is here (wgHydHas); if not, its blocks are asked for first and false is returned - true with no workers, or once a block has
   been waited for over WHP.wait ms (the main thread works it out then) */
function wtHydReady(x0,z0,x1,z1){if(!whpOn())return true;const HC=WG_CFG.hydroCell,b0=Math.floor((Math.floor(x0/HC)-3)/8),b1=Math.floor((Math.floor(x1/HC)+3)/8),c0=Math.floor((Math.floor(z0/HC)-3)/8),c1=Math.floor((Math.floor(z1/HC)+3)/8),now=performance.now();
  let ok=true;for(let bj=c0;bj<=c1;bj++)for(let bi=b0;bi<=b1;bi++){if(whpHas(bi,bj))continue;const k=wgKey(bi,bj),t=WHP.req.get(k);if(t===undefined){WHP.req.set(k,now);WHP.pri.push([bi,bj]);ok=false;}else if(now-t<(WHP.asked.has(k)?WHP.cap:WHP.wait))ok=false;else if(t>0){WHP.stats.late++;WHP.req.set(k,-1e15);}}
  return ok;}
function wtTileEvict(){const arr=[...WT.tiles.values()].sort((a,b)=>a.use-b.use),drop=arr.length-Math.floor(WT.tileCap*.85);for(let i=0;i<drop;i++){if(arr[i].pin)continue;WT.tiles.delete(arr[i].ti+','+arr[i].tk);}}
const wtHasTile=(x,z)=>WT.tiles.has(Math.floor(x/WG_CFG.tile)+','+Math.floor(z/WG_CFG.tile));
/* the height of the ground at a point, from the triangles of its level-0 tile (the tile is made if it does not exist yet) */
function wtH(x,z){const S=WG_CFG.tile;return wtHt(wtTile(Math.floor(x/S),Math.floor(z/S)),x,z);}
function wtHt(t,x,z){if(t.rd){const hd=wrdHt(t,x,z);if(hd!==null)return hd;}/* (the river ground in detail, wrdetail.js) */const res=WG_CFG.res,g=t.g,n=g.n;
  let fx=(x-t.x0)/res,fz=(z-t.z0)/res;if(fx>n-1e-6)fx=n-1e-6;if(fz>n-1e-6)fz=n-1e-6;if(fx<0)fx=0;if(fz<0)fz=0;
  const i=fx|0,k=fz|0,u=fx-i,v=fz-k,s=n+1,h=g.h,q=k*s+i,a=h[q],b=h[q+1],d=h[q+s],e=h[q+s+1];
  if(((i+k)&1)===0)return u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
  return u>=v?a+(b-a)*u+(e-b)*v:a+(d-a)*v+(e-d)*u;}
/* the water level at a point (-1e9: none), bilinear over its tile's lattice */
function wtWater(x,z){const S=WG_CFG.tile,res=WG_CFG.res,t=wtTile(Math.floor(x/S),Math.floor(z/S)),g=t.g,n=g.n,s=n+1;let fx=Math.min(n-1e-6,Math.max(0,(x-t.x0)/res)),fz=Math.min(n-1e-6,Math.max(0,(z-t.z0)/res));
  const i=fx|0,k=fz|0,q=k*s+i,w=[g.wl[q],g.wl[q+1],g.wl[q+s],g.wl[q+s+1]];if(w.some(v=>v<-1e8))return Math.max(...w)<-1e8?-1e9:Math.max(...w);const u=fx-i,v=fz-k;return(w[0]*(1-u)+w[1]*u)*(1-v)+(w[2]*(1-u)+w[3]*u)*v;}

/* ---------- procedural textures: tileable noise the ground shader samples at several scales ---------- */
function wtNoiseTex(){if(WT.tex)return WT.tex;const S=256,data=new Uint8Array(S*S*4),R=wnRng(1234567);
  /* periodic gradient noise on a lattice of P cells */
  const grad=(P,seed)=>{const g=new Float32Array(P*P*2);const r=wnRng(seed);for(let i=0;i<P*P;i++){const a=r()*6.2832;g[i*2]=Math.cos(a);g[i*2+1]=Math.sin(a);}return g;};
  const pn=(g,P,x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*xf*(xf*(xf*6-15)+10),v=yf*yf*yf*(yf*(yf*6-15)+10);
    const ix0=((xi%P)+P)%P,iy0=((yi%P)+P)%P,ix1=(ix0+1)%P,iy1=(iy0+1)%P,d=(ix,iy,dx,dy)=>{const q=(iy*P+ix)*2;return g[q]*dx+g[q+1]*dy;};
    const a=d(ix0,iy0,xf,yf),b=d(ix1,iy0,xf-1,yf),c=d(ix0,iy1,xf,yf-1),e=d(ix1,iy1,xf-1,yf-1);return (a+(b-a)*u)+((c+(e-c)*u)-(a+(b-a)*u))*v;};
  const fbm=(base,oct,seed,x,y)=>{let s=0,a=.5,n=0;for(let o=0;o<oct;o++){const P=base<<o,g=G[seed+o]||(G[seed+o]=grad(P,seed*31+o));s+=a*pn(g,P,x*P,y*P);n+=a;a*=.5;}return s/n;};const G={};
  /* periodic Worley cells: F2-F1 (cracks) */
  const WC=12,pts=[];const rr=wnRng(777);for(let i=0;i<WC*WC;i++)pts.push([rr(),rr()]);
  const wor=(x,y)=>{const X=x*WC,Y=y*WC,xi=Math.floor(X),yi=Math.floor(Y);let f1=9,f2=9;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=xi+dx,cy=yi+dy,p=pts[(((cy%WC)+WC)%WC)*WC+(((cx%WC)+WC)%WC)],px=cx+p[0],py=cy+p[1],d=Math.hypot(px-X,py-Y);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}return[f1,f2];};
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const x=i/S,y=j/S,q=(j*S+i)*4;
    const a=fbm(4,5,1,x,y),b=fbm(2,5,9,x,y),w=wor(x,y),c=Math.min(1,(w[1]-w[0])*2.2),d=fbm(16,3,20,x,y);
    data[q]=Math.max(0,Math.min(255,128+a*300));data[q+1]=Math.max(0,Math.min(255,128+b*300));data[q+2]=Math.round(c*255);data[q+3]=Math.max(0,Math.min(255,128+d*300));}
  const t=new THREE.DataTexture(data,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
  WT.tex=t;return t;}

/* ---------- the ground material: the game's Phong lighting (sun, shadows, lamps, fog) with the colour and the relief worked out per pixel ----------
   grass: a green that changes over broad patches and small ones, yellower and brighter on crests and slopes facing the sun, deeper and bluer in hollows
   and in the shade; the forest floor darker and mossier; rock where it is steep (and on the cliffs and the spires) as chiselled stone: every facet one
   flat plane with one value, quiet bands of strata, the region's stone, the meadow's grass on facets that face the sky (see src/world/wrock.js, which
   dresses the cliffs near the player with blocks drawn by this same material); snow on the high spires, off the steepest faces, with its streaks and
   relief; damp ground by the water; under water the ground fades into the colour of the water by depth. */
const WT_GLSL_FUNCS=`
uniform sampler2D tWN;uniform float uWTime;
varying vec4 vA;varying vec4 vB;varying vec3 vWp;varying vec3 vWn;varying float vWl;
float wn(vec2 p,int c){vec4 t=texture2D(tWN,p);return c==0?t.r:c==1?t.g:c==2?t.b:t.a;}
vec3 wtPerturb(vec3 sp,vec3 sn,float hgt){vec3 dx=dFdx(sp),dy=dFdy(sp);vec3 R1=cross(dy,sn),R2=cross(sn,dx);float det=dot(dx,R1);float dHx=dFdx(hgt),dHy=dFdy(hgt);
  vec3 g=sign(det)*(dHx*R1+dHy*R2);return normalize(abs(det)*sn-g);}
`;
function wtMaterial(){return WT.mat||(WT.mat=wtMakeMat(null));}
/* the ground's chunks: the same material, but where a cliff sheet covers the face (wcliff.js) the steep lattice faces stand back into the rock (WT_INSET),
   so the 2 m facets never show through the sheet: in the vertex shader only (the heights the game walks on stay), within uClf.y of the camera,
   where the sheet can be (not on the spires, in the elderglade or by water, steeper than the sheet's own rock) */
WT.clf={value:new THREE.Vector3(1,260,1.85)};
function wtGroundMat(){return WT.gmat||(WT.gmat=wtMakeMat(null,true));}
/* the same, the lattice lowered 0.6 m where the river ground is drawn in detail (wrdetail.js: aRd, a level-0 chunk takes it while its detail is shown) */
function wtGroundMatRd(){return WT.gmatRd||(WT.gmatRd=wtMakeMat(null,true,true));}
/* the same material for a landmark seen from afar (the Great Elder Circle, wfeat.js): its upper part shows faintly through the haze past the end of the
   air (wdepth.js WD_SEE; y0: the height of its foot, R: its size, x, z: its middle). One material each (its own uniform), one program for all. */
function wtMaterialSee(y0,R,x,z){return wtMakeMat({y0,R,x,z});}
/* the Great Elder Circles shown (wfeat.js fills it each frame): x, z, the height of its foot, its size (0: none) - the haze's top over them, wdepth.js */
WT.gU=[0,1,2,3].map(()=>new THREE.Vector4(0,0,0,0));
function wtMakeMat(see,inset,rdl){const tex=wtNoiseTex(),m=new THREE.MeshPhongMaterial({color:0xffffff,specular:0x000000,shininess:2,flatShading:false});
  m.defines=see?{WD_SEE:1,WD_PED:1}:{WD_PED:1};if(inset)m.defines.WT_INSET=1;if(rdl)m.defines.WT_RD=1;if(see)m.userData.see=new THREE.Vector4(see.y0,see.R,see.x||0,see.z||0);/* (WD_PED: the pedestal shows through the haze, wdepth.js) */
  m.onBeforeCompile=sh=>{sh.uniforms.tWN={value:tex};sh.uniforms.uWTime=WT.time;sh.uniforms.uClf=WT.clf;sh.uniforms.uSunD=WCM.sun;sh.uniforms.tGS={value:wtStrokeTex()};if(typeof WTP!=='undefined'){wtpInit();sh.uniforms.tTr=WTP.uT;sh.uniforms.uTrO=WTP.uO;}sh.uniforms.uGreat={value:WT.gU};sh.uniforms.uZen={value:WD.zen};sh.fragmentShader='varying float vIk;\nvarying vec3 vRv;\nuniform vec4 uGreat[4];\nuniform vec3 uZen;\nuniform sampler2D tTr;\nuniform vec4 uTrO;\nuniform vec3 uSunD;\nuniform sampler2D tGS;\n'+sh.fragmentShader;if(see){sh.uniforms.uSee={value:m.userData.see};sh.fragmentShader='uniform vec4 uSee;\n'+sh.fragmentShader;}
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aA;attribute vec4 aB;attribute float aW;varying vec4 vA;varying vec4 vB;varying vec3 vWp;varying vec3 vWn;varying float vWl;varying float vIk;attribute vec3 aRv;varying vec3 vRv;uniform vec3 uClf;\n#ifdef WT_RD\nattribute float aRd;\n#endif\n#ifdef WT_INSET\nattribute vec2 aPu;\n#endif\n')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvIk=0.0;vRv=aRv;\n#ifdef WT_RD\ntransformed.y-=aRd*0.6;\n#endif\n#ifdef WT_INSET\n{vec3 wp0=(modelMatrix*vec4(transformed,1.0)).xyz;'+
        'float k=(1.0-smoothstep(0.25,0.35,aA.x))*(1.0-smoothstep(0.40,0.50,aA.z))*uClf.x*(1.0-smoothstep(uClf.y*0.85,uClf.y,length(wp0.xz-cameraPosition.xz)));'+
        'transformed.xz+=aPu*k*uClf.z;vIk=k*min(1.0,length(aPu)*4.0);}\n#endif\nvA=aA;vB=aB;vWl=aW;vWp=(modelMatrix*vec4(transformed,1.0)).xyz;vWn=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+WT_GLSL_FUNCS+WCM_PAL+WT_GLSL_STONE+WT_GLSL_MEADOW+WRL.GLSL_NOISE)
      .replace('#include <map_fragment>',WT_GLSL_COLOR.replace('/*@WRL_RIVER@*/',WRL.GLSL_GROUND_RIVER))
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  if(wtFacet>0.001)normal=normalize(mix(normal,normalize((viewMatrix*vec4(wtNf,0.0)).xyz),wtFacet));\n  {vec3 bn=wtPerturb(-vViewPosition,normal,wtBump*wtBumpK);normal=bn;}');};
  m.customProgramCacheKey=()=>see?'wtground18see':inset?(rdl?'wtground18kr':'wtground18k'):'wtground18';return m;}
/* the meadow (world look 4: the mockup's MEADOW, grassRamp, meadowT, meadowStrokes, gStrokes) - a painted green of several shades: broad patches,
   darker clover clumps (the noise texture's channels: r broad, a fine), and two sizes of painted blade strokes leaning along a slowly turning direction
   (wtStrokeTex: a pointed stroke a cell). The ground's grass and the cliffs' (wcliffmat.js) are painted by the same functions: no seam where they meet */
const WT_GLSL_MEADOW=`
float wtH31(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
vec3 wtCell2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 c=vec2(wtH31(vec3(i,2.1)),wtH31(vec3(i,5.7)))*0.7+0.15;return vec3(wtH31(vec3(i,1.3)),length(f-c),wtH31(vec3(i,9.9)));}
vec3 wtGrassRamp(float t){t=clamp(t,0.0,1.0)*4.0;vec3 a=vec3(0.11,0.24,0.07),b=vec3(0.21,0.39,0.09),c=vec3(0.34,0.54,0.12),d=vec3(0.49,0.66,0.16),e=vec3(0.65,0.75,0.25);
  return t<1.0?mix(a,b,t):t<2.0?mix(b,c,t-1.0):t<3.0?mix(c,d,t-2.0):mix(d,e,t-3.0);}
float wtMeadowT(vec2 X,float fd,out float clump){float big=texture2D(tWN,X/114.0).r,mid=texture2D(tWN,X/28.6+vec2(0.37,0.71)).r,fine=texture2D(tWN,X/10.0+vec2(0.13,0.29)).a;
  float t=0.55+0.34*(big-0.5)+0.30*(mid-0.5)+0.06*(fine-0.5)*fd;
  clump=smoothstep(0.58,0.74,texture2D(tWN,X/21.0+vec2(0.61,0.43)).a+0.10*(texture2D(tWN,X/5.3).a-0.5))*(0.15+0.85*fd);return t-0.10*clump;}
vec3 wtMeadowStrokes(vec3 col,vec2 X,float fd){float k=smoothstep(0.35,0.95,0.5+1.6*(texture2D(tWN,X/50.0+vec2(0.2,0.6)).g-0.5));
  vec4 A=texture2D(tGS,X*(2.6/8.0)),B=texture2D(tGS,X*(6.5/8.0)+vec2(0.37,0.11));vec2 s1=mix(A.rg,A.ba,k)*fd,s2=mix(B.rg,B.ba,k)*fd*fd;
  col=mix(col,col*vec3(1.16,1.10,0.78)+vec3(0.035,0.035,0.0),max(s1.x*0.75,s2.x*0.6));return mix(col,col*vec3(0.70,0.80,0.86),max(s1.y*0.6,s2.y*0.5));}
`;
/* the meadow's strokes, painted once into a tileable texture (8 x 8 cells a tile, one pointed stroke a cell as the mockup's gStrokes, light in r and b, dark
   in g and a, leaning 0.25 rad in r/g and 1.05 rad in b/a): one mipmapped read a scale instead of nine cells' hashes a pixel */
function wtStrokeTex(){if(WT.gs)return WT.gs;const S=256,C=8,cs=S/C,d=new Uint8Array(S*S*4),R=wnRng(4242),cells=[];
  for(let j=0;j<C;j++)for(let i=0;i<C;i++)cells.push([R(),R(),R(),R(),R()]);
  for(const[ch,ang]of[[0,.25],[2,1.05]])for(let y=0;y<S;y++)for(let x=0;x<S;x++){const px=x/cs,py=y/cs,ix=Math.floor(px),iy=Math.floor(py);let L=0,D=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=ix+dx,cy=iy+dy,c=cells[((cy%C+C)%C)*C+((cx%C+C)%C)],a=ang+(c[2]-.5)*.9,ex=px-cx-c[0],ey=py-cy-c[1];
      const lx=ex*Math.cos(a)+ey*Math.sin(a),ly=-ex*Math.sin(a)+ey*Math.cos(a),u=lx/(.7+.5*c[3]),w=.19*Math.max(1-u*u,0)*(1-.4*u),m=Math.abs(u)<=1?1-wnS(Math.abs(ly),w-.03,w+.03):0;
      if(c[4]<.58)L=Math.max(L,m);else D=Math.max(D,m);}
    const q=(y*S+x)*4+ch;d[q]=Math.round(L*255);d[q+1]=Math.round(D*255);}
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
  return WT.gs=t;}
/* courses of big blocks in a face's plane, anchored to the world (q: along the face, up): x = the distance to the nearest seam (m), y = the block's hash */
const WT_GLSL_STONE=`
float wtH1(float n){return fract(sin(n*12.9898+4.1414)*43758.5453);}
vec2 wtStoneQ(vec2 q){float Hr=2.8;q.y+=0.9*sin(q.x*0.19)+0.5*sin(q.x*0.53+1.7);/* (the courses wander; the joints lean, row by row) */
  float ry=q.y/Hr,r=floor(ry),fy=ry-r,W=3.6+2.4*wtH1(r+0.5),sk=(wtH1(r+0.25)-0.5)*0.8,cx=(q.x+sk*fy*Hr+wtH1(r)*W)/W,c=floor(cx),fx=cx-c;
  return vec2(min(min(fy,1.0-fy)*Hr,min(fx,1.0-fx)*W/sqrt(1.0+sk*sk)),wtH1(r*57.0+c*13.0+0.37));}
`;
const WT_GLSL_COLOR=`
  /* (four texture reads: two for the green, two for rock where there is rock - every channel of the noise texture is a different scale) */
  vec3 P=vWp;vec3 Nw=normalize(vWn);
  /* (a face pushed into the rock, WT_INSET, is steeper than its vertices' normal: how steep it really is - the triangle's own normal - for the rock below) */
  float slIk=(1.0-abs(normalize(cross(dFdx(vWp),dFdy(vWp))).y))*smoothstep(0.0,0.3,vIk);
  float fp=length(fwidth(P));float d1=1.0-smoothstep(0.09,0.35,fp),d2=1.0-smoothstep(0.35,1.6,fp),d3=1.0-smoothstep(1.6,7.0,fp);
  float wSp=vA.x,wTb=vA.y,wLk=vA.z,wFo=vA.w,wPl=max(0.0,1.0-wSp-wTb-wLk);
  /* (vB.x: the snow of the spires where there are spires, elsewhere the Great Elder Circle's pedestal - its mountain - whose rock is the ring's stone) */
  float cav=vB.y*2.0-1.0,hiP=step(0.002,wSp),snowP=vB.x*hiP,ped=vB.x*(1.0-hiP),wet=vB.z;
  vec4 T1=texture2D(tWN,P.xz/393.0),T2=texture2D(tWN,P.xz/23.0);
  float nL=T1.r,hue=T1.g,nm=T1.a,ns=mix(0.5,T2.g,d3),nt=mix(0.5,T2.r,d2),nu=mix(0.5,T2.a,d1);
  /* ---- grass: the meadow (world look 4, WT_GLSL_MEADOW) - its painted shades and strokes (gone by 42 m), lighter on crests and deeper in hollows, darker on
     banks, warmer where it faces the sun, dry yellow patches on sunny flat ground, the shade and the clumps a little bluer, a few tiny flowers ---- */
  float dcam=length(P-cameraPosition),fdF=1.0-smoothstep(28.0,80.0,dcam),fdS=1.0-smoothstep(14.0,42.0,dcam),slp=1.0-Nw.y,clump;
  float mt=wtMeadowT(P.xz,fdF,clump)+0.20*clamp(-cav*2.5,0.0,1.0)-0.34*clamp(cav*2.5,0.0,1.0)-0.50*smoothstep(0.18,0.6,slp);
  float sunG=clamp(dot(Nw,normalize(uSunD)),0.0,1.0);mt+=0.14*(sunG-0.65);float val=mt;
  vec3 grass=wtGrassRamp(mt);grass=wtMeadowStrokes(grass,P.xz,fdS);
  float dry=smoothstep(0.6,0.8,texture2D(tWN,P.xz/67.0+vec2(0.31,0.17)).r)*(0.4+0.6*sunG)*(1.0-smoothstep(0.1,0.4,slp))*(1.0-wFo);
  grass=mix(grass,grass*vec3(1.12,1.05,0.68)+vec3(0.05,0.03,0.0),dry*0.55);grass=mix(grass,grass*vec3(0.84,0.95,1.10),clamp(max(cav,0.0)*2.0+clump*0.5,0.0,1.0)*0.5);
  if(fdF>0.001){vec3 cl=wtCell2(P.xz*2.2);float fl=step(0.968,cl.x)*(1.0-smoothstep(0.05,0.1,cl.y))*smoothstep(0.35,0.65,texture2D(tWN,P.xz/28.6+vec2(0.5,0.2)).r)*(1.0-smoothstep(0.1,0.3,slp))*fdF*(1.0-wFo);
    grass=mix(grass,cl.z<0.45?vec3(0.96,0.96,0.92):cl.z<0.75?vec3(0.95,0.66,0.78):vec3(0.98,0.86,0.33),fl);}
  vec3 forest=mix(vec3(0.085,0.18,0.07),vec3(0.17,0.29,0.09),smoothstep(0.2,0.8,val));grass=mix(grass,forest,wFo*0.85);
  grass=mix(grass,grass*vec3(1.05,1.07,0.88),wTb*0.55);grass=mix(grass,grass*vec3(0.95,1.04,0.98),wLk*0.4);
  /* ---- a trail (world look 3, wtrail.js): the distance to its middle and its half width from the window round the camera (tTr); the edge broken by two
     scales of noise over a band of 45 % of the width - dirt patches out into the grass, grass patches onto the trail, no line anywhere - a muted dusty brown,
     lighter where it is worn in the middle, darker damp blotches, a few pebbles ---- */
  if(uTrO.w>0.5){vec2 tu=(P.xz-uTrO.xy)/uTrO.z;if(min(tu.x,tu.y)>0.0&&max(tu.x,tu.y)<1.0){vec4 TR=texture2D(tTr,tu);if(TR.r<0.99){float td=TR.r*3.0,hw=0.48+TR.g*0.64;vec4 TN=texture2D(tWN,P.xz/3.3);
    float trM=smoothstep(0.35,0.65,1.0-smoothstep(0.55*hw,1.45*hw,td)+0.45*(TN.r-0.5)+0.25*(nt-0.5));
    float tt=clamp(0.30+0.20*(1.0-smoothstep(0.0,0.8*hw,td))-0.18*smoothstep(0.55,0.75,TN.g)+0.10*(nu-0.5),0.0,1.0);
    vec3 dirt=tt<0.5?mix(vec3(0.30,0.23,0.17),vec3(0.48,0.39,0.30),tt*2.0):mix(vec3(0.48,0.39,0.30),vec3(0.66,0.56,0.44),tt*2.0-1.0);
    {vec2 pc=P.xz*5.0,pf=fract(pc)-0.5;float ph=fract(sin(dot(floor(pc),vec2(12.9898,78.233)))*43758.5453);dirt=mix(dirt,vec3(0.60,0.56,0.48),step(0.94,ph)*(1.0-smoothstep(0.16,0.24,length(pf+0.15*(ph-0.97))))*d1*0.7);}/* (a few pebbles) */
    grass=mix(grass,dirt*0.94,trM);}}}
  /* ---- how rocky ---- */
  float sl=max(1.0-Nw.y,slIk);float rt=mix(0.31,0.17,wTb)-0.04*wSp+(nm-0.5)*0.12+(ns-0.5)*0.07;
  /* (the elderglade's own rock - its knolls, the great mountain's outcrops - is sculpted: smoothly shaded, no per-facet speckle or strata, its edge
     against the grass soft (the lattice's rock floor counts little there); a ring's stone keeps its chiselled facets) */
  float gRk=wLk*(1.0-step(0.97,vB.w))*(1.0-ped);/* (the pedestal's rock is chiselled, as the ring's stone) */
  float rocky=max(smoothstep(rt,rt+0.1,sl),vB.w*(1.0-gRk));
  if(ped>0.002){
    /* the pedestal (ped: strongest at the ring, fading out to the mountain's foot): grass, moss and stone in one palette, so the ring belongs to its
       ground - the grass deeper near the ring and turning to the ring's moss as the ground steepens towards rock, and the rock coming in over a
       wider band */
    vec3 mossC=mix(vec3(0.12,0.225,0.075),vec3(0.22,0.35,0.10),smoothstep(0.2,0.8,val));
    grass=mix(grass,mossC,min(1.0,ped*1.3)*(0.24+0.5*smoothstep(rt-0.2,rt+0.06,sl)));
    rocky=max(mix(smoothstep(rt,rt+0.1,sl),smoothstep(rt-0.04,rt+0.24,sl),ped),vB.w*(1.0-gRk));}
  vec3 col=grass;float wtBump=(nt-0.5)*0.12*d1;float sn=0.0;float wtFacet=0.0;vec3 wtNf=Nw;
  if(rocky>0.002||snowP>0.002){
    /* ---- rock: chiselled stone (src/world/wrock.js). Every facet - a triangle of the ground, of a block, a boulder, a ring - is one flat plane of stone:
       it is lit as a plane (its normal from the screen derivatives of the world position) and has one value, from its own normal: lighter where it faces
       up, with a step from facet to facet. Quiet bands of strata a few metres high, each its own tint (higher bands in the tablelands and the spires);
       the region's stone (cool grey spires, warm tablelands, dark mossy lake rock, a warm grey elsewhere); the meadow's own grass on the facets that face
       the sky. Far off the facets soften a little (the lattice there is coarse). No striations, streaks or cracks: clean planes. ---- */
    float stri=0.5,streak=0.5,striF=0.5;
    if(snowP>0.002){/* (the streaks of the snow down the faces: two reads, only where there can be snow) */float bx=abs(Nw.x),bz=abs(Nw.z),bs=bx*bx*bx*bx+bz*bz*bz*bz+1e-4;float wx=bx*bx*bx*bx/bs,wz=1.0-wx;
      vec4 RX=texture2D(tWN,vec2(P.z/34.8,P.y/250.0)),RZ=texture2D(tWN,vec2(P.x/34.8+0.37,P.y/250.0));vec4 R=RX*wx+RZ*wz;stri=R.r;streak=R.g;striF=mix(0.5,R.a,d2);}
    vec3 Nf=normalize(cross(dFdx(P),dFdy(P)));if(dot(Nf,Nw)<0.0)Nf=-Nf;
    wtFacet=rocky*(1.0-0.45*smoothstep(400.0,2200.0,length(P-cameraPosition)))*(1.0-0.9*gRk);wtNf=Nf;
    float bandH=3.2+1.6*wTb+2.2*wSp,bi=floor((P.y+(nm-0.5)*7.0)/bandH),bh=fract(sin(bi*12.9898+7.13)*43758.5453);
    vec3 fq=floor(Nf*5.0+0.5);float fh=fract(sin(dot(fq,vec3(12.9898,78.233,37.719))+bi*3.71)*43758.5453);
    float rv=clamp(0.44+0.34*smoothstep(-0.25,0.75,mix(Nf.y,Nw.y,gRk*0.7))+0.17*(fh-0.5)*(1.0-0.8*gRk)+0.12*(bh-0.5)*(1.0-0.85*gRk)+0.14*(nm-0.5)+0.08*(nL-0.5),0.0,1.0);
    vec3 rSp=mix(vec3(0.40,0.42,0.47),vec3(0.85,0.86,0.89),rv);
    vec3 rTb=mix(vec3(0.50,0.42,0.33),vec3(0.90,0.82,0.68),rv);rTb=mix(rTb,rTb*vec3(1.06,0.94,0.82),step(0.55,bh)*0.4);
    vec3 rLk=mix(vec3(0.30,0.33,0.30),vec3(0.64,0.67,0.60),rv);
    vec3 rPl=mix(vec3(0.46,0.42,0.37),vec3(0.86,0.81,0.71),rv);rPl=mix(rPl,rPl*vec3(1.04,0.96,0.88),step(0.6,bh)*0.3);
    vec3 rock=rPl*wPl+rSp*wSp+rTb*wTb+rLk*wLk;
    /* world look 1: the ground's own stone is the cliff's (wcliffmat.js) - its palette (brown; grey on the spires' stone and the pedestals), four soft
       tone steps, lighter where it faces up, and on steep faces courses of big blocks anchored to the world with thin dark seams (70 %, warm), so the
       far cliffs past the sheets and the faces round them read as the same carved rock; the facets light softly (the look is paint, not facets).
       Not a ring's or a boulder's block (aB.w = 1): those keep their chiselled stone */
    if(vB.w<0.97){float gry=clamp(wSp*2.0+(1.0-wTb-wSp)*0.35+ped,0.0,1.0),stp=smoothstep(0.42,0.62,sl);
      vec2 sq=abs(Nf.x)>abs(Nf.z)?wtStoneQ(vec2(P.z,P.y)):wtStoneQ(vec2(P.x+17.3,P.y));float fq=fwidth(sq.x);stp*=smoothstep(60.0,140.0,length(P-cameraPosition));/* (the courses are the far cliffs': near, the sheets are the rock) */
      float upv=clamp(Nw.y*0.5+0.5,0.0,1.0),t=0.52+0.30*(upv-0.5)+0.14*(sq.y-0.5)*stp*(1.0-smoothstep(0.3,1.2,fq))+0.12*(nm-0.5)+0.08*(ns-0.5)+0.05*(nL-0.5);
      float q4=t*4.0;t=mix(t,(floor(q4)+smoothstep(0.3,0.7,fract(q4)))/4.0,0.8);vec3 rn=wcStone(t,gry);
      float seam=(1.0-smoothstep(0.09-fq,0.09+fq+0.002,sq.x))*stp*(1.0-smoothstep(0.12,0.45,fq));rn*=mix(1.0,0.70,seam);rn=mix(rn,rn*vec3(1.0,0.88,0.78),seam*0.5);
      rock=mix(rn,rock,gRk*0.6);wtFacet*=0.3;}
    float ledge=smoothstep(0.56,0.8,mix(Nf.y,Nw.y,gRk));
    /* a block of the cliffs (wrock.js, aB.w = 1): less light where it is shut in (aB.y, its cavity: low down, at the ground, in the crevices, underneath),
       and a tint and brightness of its own (aB.z, cooler or warmer), so a wall is many stones */
    float blk=step(0.97,vB.w),bo=max(blk,ped*0.8)*clamp(cav,0.0,1.0);
    rock*=(1.0-0.42*bo)*(1.0-0.16*ped);rock*=mix(1.0,0.86+0.28*vB.z,blk);rock=mix(rock,rock*mix(vec3(0.92,0.97,1.05),vec3(1.07,0.98,0.87),vB.z),blk*0.7);
    /* a ring of the elderglade (wring.js: a block whose aA.w is its moss), and the rock of a Great Elder Circle's pedestal: the moss takes what faces
       up first and creeps down the sides in patches */
    float mos=max(blk*wFo,ped*0.4);/* (and the pedestal's rock is mossy like the ring: one stone, the ring growing out of it) */
    if(mos>0.003){float mt=mos*(0.7+0.55*Nf.y)+(ns-0.5)*0.5+(nt-0.5)*0.35+(nm-0.5)*0.25;float mA=smoothstep(0.36,0.5,mt);
      vec3 mc=mix(vec3(0.11,0.215,0.07),vec3(0.24,0.38,0.10),clamp(0.3+0.55*Nf.y+(nu-0.5)*0.6+(nL-0.5)*0.4+(fh-0.5)*0.2,0.0,1.0));rock=mix(rock,mc*(1.0-0.3*bo),mA);}
    rock=mix(rock,grass*1.04,clamp(ledge*0.93+wLk*0.25*smoothstep(0.3,0.56,Nf.y),0.0,1.0)*(1.0-wSp*0.5));
    col=mix(grass,rock,rocky);
    /* ---- snow on the upper spires, off the steepest faces, in streaks down them ---- */
    float snowE=snowP+(nL-0.5)*0.4+(nm-0.5)*0.45+(ns-0.5)*0.2+(cav<0.0?-cav*0.25:-cav*0.15);
    sn=smoothstep(0.25,0.5,snowE)*smoothstep(0.86,0.5,sl+(streak-0.5)*0.5+(striF-0.5)*0.2);
    col=mix(col,vec3(0.88,0.91,0.97)*(0.92+0.08*nt),clamp(sn*1.5,0.0,1.0));
    wtBump=(stri*0.9*d3+striF*0.4*d2)*sn*0.5+wtBump*(1.0-rocky);}
  /* ---- the river look (wrlook.js, HANDOFF 3.4): where a stream's bank is (aWd > -9) the mockup's bed, wet waterline, earth bank face and mud - its own
     code, word for word (WRL.GLSL_GROUND_RIVER), on its own variables: X the ground's xz, fd the fine-detail fade (28-80 m), slope 1 - N.y, vOcc the
     contact patches round the rocks in the water and the pebbles (aRv's third value: the river ground in detail has it, wrdetail.js; 0 on the lattice) - in place of the shore colours below ---- */
  float vWd=vRv.x,vBf=vRv.y;
  if(vWd>-8.5){vec2 X=P.xz;float fd=fdF,slope=slp,vOcc=vRv.z;
/*@WRL_RIVER@*/
  }
  /* ---- by the water ---- */
  float dep=vWl-P.y;
  if(vWd<=-8.5&&dep>-2.0){col=mix(col,col*vec3(0.6,0.65,0.6),wet*0.5*(1.0-rocky));
    col=mix(col,mix(vec3(0.53,0.50,0.40),vec3(0.70,0.66,0.52),ns),smoothstep(-0.9,0.05,dep)*smoothstep(1.2,0.0,dep)*0.6*(1.0-rocky*0.7));
    if(dep>0.0){vec3 sand=mix(vec3(0.60,0.60,0.47),vec3(0.74,0.72,0.58),ns);vec3 bot=mix(sand,col,0.3);vec3 wc=mix(vec3(0.22,0.66,0.63),vec3(0.04,0.22,0.36),1.0-exp(-dep*0.2));col=mix(bot,wc,1.0-exp(-dep*0.6));}}
  else if(vWd<=-8.5&&wet>0.0)col=mix(col,col*vec3(0.6,0.65,0.6),wet*0.5*(1.0-rocky));
  col*=1.0-clamp(cav,0.0,1.0)*0.3;
  diffuseColor.rgb*=col;float wtBumpK=0.5+0.5*rocky;
`;
/* the water (stylized, v48): clean surfaces coloured by depth - turquoise in the shallows, blue-green further out, deep blue in the deep - nearly
   opaque from a couple of metres, fading to nothing over the last few decimetres so the shore meets the ground softly, with a thin clean line of foam
   that breathes gently; broad slow ripples that fade with distance (lakes almost still, rivers streaked and moving along their flow), a soft sky tint at
   low angles and a sun glint; falls white, streaming down. No fine noise: nothing to shimmer. */
function wtWaterMat(){if(WT.wmat)return WT.wmat;const tex=wtNoiseTex(),m=new THREE.MeshPhongMaterial({color:0xffffff,specular:0x4c6066,shininess:110,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  m.onBeforeCompile=sh=>{sh.uniforms.tWN={value:tex};sh.uniforms.uWTime=WT.time;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aD;varying vec3 vD;varying vec3 vWp2;varying vec3 vWn2;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvD=aD;vWp2=(modelMatrix*vec4(transformed,1.0)).xyz;vWn2=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tWN;uniform float uWTime;varying vec3 vD;varying vec3 vWp2;varying vec3 vWn2;')
      .replace('#include <map_fragment>',`
  float d=max(vD.x,0.0);vec2 fl=vD.yz;float fs=min(1.0,length(fl));vec3 P=vWp2;float steep=1.0-clamp(vWn2.y,0.0,1.0);
  float far=length(P-cameraPosition),fd=1.0-smoothstep(80.0,900.0,far),fall=smoothstep(0.12,0.45,steep);/* (white from rapids on: a stream down a steep slope foams) */
  /* broad ripples (two slow layers, carried along by the flow) and, on a river, streaks drawn out along it */
  vec2 uvA=P.xz/16.0+vec2(uWTime*0.011,uWTime*0.007)-fl*uWTime*0.32,uvB=P.xz/7.0-vec2(uWTime*0.009,-uWTime*0.013)-fl*uWTime*0.8;
  float rA=texture2D(tWN,uvA/6.0).a,rB=texture2D(tWN,uvB/5.0).r;float rip=((rA-0.5)*0.6+(rB-0.5)*0.4)*fd;
  float streak=0.0;if(fs>0.02){vec2 fdir=normalize(fl);vec2 sp=vec2(dot(P.xz,vec2(-fdir.y,fdir.x))/1.8,dot(P.xz,fdir)/11.0-uWTime*1.1*fs);streak=smoothstep(0.64,0.84,texture2D(tWN,sp/4.0).g)*fs*fd*(0.4+0.6*rA);}
  /* the colour by depth */
  vec3 cS=vec3(0.32,0.81,0.75),cM=vec3(0.10,0.56,0.63),cD=vec3(0.04,0.25,0.41);
  vec3 wc=mix(mix(cS,cM,1.0-exp(-d*0.5)),cD,1.0-exp(-d*0.11));wc*=1.0+rip*0.12;wc=mix(wc,wc*1.15+vec3(0.03),streak*0.35);
  float a=smoothstep(0.0,0.22,d)*mix(0.55,0.95,1.0-exp(-d*0.55));
  /* the shore: a thin clean line of foam just inside the edge, breathing slowly */
  float br=0.5+0.5*sin(uWTime*1.2+P.x*0.13+P.z*0.17);float foam=smoothstep(0.30,0.10,d)*smoothstep(0.0,0.05,d)*(0.5+0.3*br)*(1.0-fall)*(1.0-0.6*fs);
  /* falls: white water streaming down */
  float fs2=texture2D(tWN,vec2((P.x+P.z)/3.1,P.y/9.0+uWTime*0.9)/4.0).b;wc=mix(wc,vec3(0.90,0.95,0.96)*(0.88+0.12*fs2),fall*0.85);a=max(a,fall*0.9);
  /* a soft sky tint at low angles */
  vec3 V=normalize(cameraPosition-P);float fr=pow(1.0-clamp(V.y,0.0,1.0),3.0)*(1.0-fall);
  #ifdef USE_FOG
  vec3 skyC=mix(vec3(0.62,0.80,0.90),fogColor,0.5);
  #else
  vec3 skyC=vec3(0.66,0.82,0.92);
  #endif
  wc=mix(wc,skyC,fr*0.45);a=max(a,fr*0.8*smoothstep(0.0,0.22,d));
  diffuseColor.rgb*=mix(wc,vec3(0.93,0.97,0.98),clamp(foam,0.0,1.0));diffuseColor.a*=clamp(a+foam*0.5,0.0,1.0);`)
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  {float calm=0.45+0.55*fs;normal=normalize(normal+(viewMatrix*vec4((rA-0.5)*0.16,0.0,(rB-0.5)*0.16,0.0)).xyz*(1.0-steep)*fd*calm);}');};
  m.customProgramCacheKey=()=>'wtwater3';WT.wmat=m;return m;}

/* ---------- chunks ---------- */
/* the index of a chunk (shared by all: 64x64 cells, the diagonal by the parity of the cell, then the four skirts) */
function wtIndex(){if(WT.idx)return WT.idx;const n=WT.N,m=n+1,ix=[];
  for(let k=0;k<n;k++)for(let i=0;i<n;i++){const a=k*m+i,b=a+1,d=a+m,e=d+1;if(((i+k)&1)===0)ix.push(a,d,b,b,d,e);else ix.push(a,d,e,a,e,b);}
  const base=m*m,edges=[[...Array(m).keys()].map(t=>t),[...Array(m).keys()].map(t=>n*m+t),[...Array(m).keys()].map(t=>t*m),[...Array(m).keys()].map(t=>t*m+n)];
  edges.forEach((E,ei)=>{const b0=base+ei*m;for(let j=0;j<m-1;j++){const a=E[j],b=E[j+1],c=b0+j,d=b0+j+1;ix.push(a,c,b,b,c,d,a,b,c,b,d,c);}});
  WT.idx=new THREE.BufferAttribute(new Uint32Array(ix),1);return WT.idx;}
/* the ground and the water of one chunk */
function wtBuild(L,i,k,gIn){const T0=performance.now(),N=WT.N,S=WG_CFG.tile<<L,step=S/N,x0=i*S,z0=k*S;let g=gIn,tile=null;
  if(!g){if(L===0){tile=wtTile(i,k);g=tile.g.nrm?tile.g:wgGrid(x0,z0,step,N,0);}else g=wgGrid(x0,z0,step,N,wtLite(L));}
  const m=N+1,nv=m*m,tot=nv+4*m,pos=new Float32Array(tot*3),nr=new Int8Array(tot*3),aA=new Uint8Array(tot*4),aB=new Uint8Array(tot*4),aW=new Float32Array(tot),aP=new Int8Array(tot*2),aR=new Float32Array(tot*2),aD=new Uint8Array(tot),drop=1.5+step*1.4;
  const rdm=L===0&&tile&&typeof wrdMask==='function'?wrdMask(g):null;if(tile)tile.rdm=rdm;/* (river look: the blocks drawn in detail, wrdetail.js) */
  let ymin=1e9,ymax=-1e9;
  for(let q=0;q<nv;q++){const ii=q%m,kk=(q/m)|0,h=g.h[q];pos[q*3]=ii*step;pos[q*3+1]=h;pos[q*3+2]=kk*step;if(h<ymin)ymin=h;if(h>ymax)ymax=h;
    nr[q*3]=Math.round(g.nrm[q*3]*127);nr[q*3+1]=Math.round(g.nrm[q*3+1]*127);nr[q*3+2]=Math.round(g.nrm[q*3+2]*127);
    for(let c=0;c<4;c++)aA[q*4+c]=Math.round(Math.max(0,Math.min(1,g.A[q*4+c]))*255);
    aB[q*4]=Math.round(Math.max(0,Math.min(1,g.B[q*4]))*255);aB[q*4+1]=Math.round((g.B[q*4+1]*.5+.5)*255);aB[q*4+2]=Math.round(g.B[q*4+2]*255);aB[q*4+3]=Math.round(Math.max(0,Math.min(1,g.B[q*4+3]))*255);aW[q]=g.wl[q]>-1e8?g.wl[q]:-1e4;if(g.rv){aR[q*2]=g.rv[q*2];aR[q*2+1]=g.rv[q*2+1];}else aR[q*2]=-9;if(rdm)aD[q]=rdm.low[q];if(g.pu){aP[q*2]=Math.round(Math.max(-1,Math.min(1,g.pu[q*2]))*127);aP[q*2+1]=Math.round(Math.max(-1,Math.min(1,g.pu[q*2+1]))*127);}}
  const edges=[[...Array(m).keys()],[...Array(m).keys()].map(t=>N*m+t),[...Array(m).keys()].map(t=>t*m),[...Array(m).keys()].map(t=>t*m+N)];
  edges.forEach((E,ei)=>E.forEach((v,j)=>{const r=nv+ei*m+j;pos[r*3]=pos[v*3];pos[r*3+1]=pos[v*3+1]-drop;pos[r*3+2]=pos[v*3+2];for(let c=0;c<3;c++)nr[r*3+c]=nr[v*3+c];for(let c=0;c<4;c++){aA[r*4+c]=aA[v*4+c];aB[r*4+c]=aB[v*4+c];}aW[r]=aW[v];aP[r*2]=aP[v*2];aP[r*2+1]=aP[v*2+1];aR[r*2]=aR[v*2];aR[r*2+1]=aR[v*2+1];aD[r]=aD[v];}));
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nr,3,true));
  geo.setAttribute('aA',new THREE.BufferAttribute(aA,4,true));geo.setAttribute('aB',new THREE.BufferAttribute(aB,4,true));geo.setAttribute('aW',new THREE.BufferAttribute(aW,1));geo.setAttribute('aPu',new THREE.BufferAttribute(aP,2,true));geo.setAttribute('aRv',new THREE.BufferAttribute(aR,2));if(rdm)geo.setAttribute('aRd',new THREE.BufferAttribute(aD,1));geo.setIndex(wtIndex());
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(S/2,(ymin+ymax)/2,S/2),Math.hypot(S/2,S/2,(ymax-ymin)/2+drop));
  const mesh=new THREE.Mesh(geo,wtGroundMat());mesh.position.set(x0,0,z0);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.matrixAutoUpdate=false;mesh.updateMatrix();
  /* water */
  let water=null;{const wp=[],wa=[],wi=[];const vmap=new Int32Array(nv).fill(-1),vert=q=>{if(vmap[q]>=0)return vmap[q];const ii=q%m,kk=(q/m)|0;vmap[q]=wp.length/3;wp.push(ii*step,g.wl[q],kk*step);wa.push(g.wl[q]-g.h[q],g.fw[q*2],g.fw[q*2+1]);return vmap[q];};
    /* a cell whose corners' levels differ is drawn only as a fall of one stream (every corner flowing, the level dropping along the flow); two waters at
       different levels - a lake and a stream, two lakes, a stream and the world's water - never stretch a sheet between them */
    const F=g.fw,tol=.3+.12*step,fl=q=>F[q*2]*F[q*2]+F[q*2+1]*F[q*2+1]>.25;
    for(let kk=0;kk<N;kk++)for(let ii=0;ii<N;ii++){const a=kk*m+ii,b=a+1,d=a+m,e=d+1,W=g.wl;if(W[a]<-1e8||W[b]<-1e8||W[d]<-1e8||W[e]<-1e8)continue;const H=g.h;if(W[a]<=H[a]&&W[b]<=H[b]&&W[d]<=H[d]&&W[e]<=H[e])continue;
      if(typeof wrvRibbon==='function'&&fl(a)&&fl(b)&&fl(d)&&fl(e))continue;/* (a stream's own water: its ribbon draws it, wriver.js) */
      if(Math.max(W[a],W[b],W[d],W[e])-Math.min(W[a],W[b],W[d],W[e])>tol){let ok=true,fx=0,fz=0;for(const q of[a,b,d,e]){const u=F[q*2],v=F[q*2+1];if(u*u+v*v<.25){ok=false;break;}fx+=u;fz+=v;}
        if(ok){const gx=(W[b]-W[a]+W[e]-W[d])*.5,gz=(W[d]-W[a]+W[e]-W[b])*.5,gl=Math.hypot(gx,gz)||1,fl=Math.hypot(fx,fz)||1;ok=-(gx*fx+gz*fz)/(gl*fl)>.5;}if(!ok)continue;}
      const A=vert(a),B=vert(b),D=vert(d),E=vert(e);if(((ii+kk)&1)===0)wi.push(A,D,B,B,D,E);else wi.push(A,D,E,A,E,B);}
    if(wi.length){const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));wg.setAttribute('aD',new THREE.Float32BufferAttribute(wa,3));wg.setIndex(wi);wg.computeVertexNormals();wg.computeBoundingSphere();
      water=new THREE.Mesh(wg,wtWaterMat());water.position.set(x0,0,z0);water.frustumCulled=false;water.receiveShadow=true;water.renderOrder=2;water.matrixAutoUpdate=false;water.updateMatrix();}}
  if(tile&&tile.g===g){/* (the tile keeps only what the game reads: heights and water) */g.nrm=null;g.A=null;g.B=null;g.fw=null;g.pu=null;g.rv=null;}
  const ch={L,i,k,x0,z0,S,mesh,water,ymin,ymax,use:WT.frame,on:false,rdl:!!(rdm&&rdm.nl)};WT.stats.built++;WT.stats.ms+=performance.now()-T0;return ch;}
const wtLite=L=>L>=3?2:L>=2?1:0;
function wtDispose(ch){if(ch.on)wtShow(ch,false);ch.mesh.geometry.dispose();if(ch.water)ch.water.geometry.dispose();}
function wtShow(ch,on){if(ch.on===on)return;ch.on=on;if(on){WT.group.add(ch.mesh);if(ch.water)WT.group.add(ch.water);}else{WT.group.remove(ch.mesh);if(ch.water)WT.group.remove(ch.water);}}
/* ---------- which chunks: a quadtree round the camera, finer where it is near ---------- */
const _wtFr=new THREE.Frustum(),_wtM=new THREE.Matrix4(),_wtSp=new THREE.Sphere(),_wtV=new THREE.Vector3();
function wtWant(cx,cy,cz){const out=[],LM=WT.LMAX,S=WG_CFG.tile<<LM,K=WT.K,gy=WT.gy||0,alt=Math.max(0,cy-gy),MX=WT.maxD||1e9;
  const visit=(L,i,k)=>{const s=WG_CFG.tile<<L,x0=i*s,z0=k*s,dx=Math.max(0,Math.abs(cx-(x0+s/2))-s/2),dz=Math.max(0,Math.abs(cz-(z0+s/2))-s/2),d=Math.hypot(dx,dz,alt*.6);if(Math.hypot(dx,dz)>MX)return;/* (past the end of the air nothing is drawn: a Great Elder Circle's pedestal is under the haze there, only the top of its ring shows) */
    if(L>0&&d<K*s){for(let b=0;b<2;b++)for(let a=0;a<2;a++)visit(L-1,i*2+a,k*2+b);}else out.push({L,i,k,d,key:wtKey(L,i,k)});};
  const i0=Math.floor(cx/S),k0=Math.floor(cz/S),rr=MX>1e8?1:Math.max(1,Math.min(5,Math.ceil(MX/S)));/* (the top chunks round enough to reach the end of the air: 3 x 3 to about 4 km, 11 x 11 at 17.5 km) */
  for(let k=k0-rr;k<=k0+rr;k++)for(let i=i0-rr;i<=i0+rr;i++)visit(LM,i,k);return out;}
/* per frame: choose the chunks, build the missing ones (nearest first, within the time budget), show what is ready and keep the old chunks where the new ones
   are not ready yet (a coarse chunk stays until all four of its children are built, and fine ones stay until the coarse one replacing them is built) */
function wtUpdate(camera,force){if(!WT.on)return;WT.frame++;const cp=camera.position;WT.cam.x=cp.x;WT.cam.y=cp.y;WT.cam.z=cp.z;WT.time.value=performance.now()/1000;
  if(typeof wrvUpdate==='function')wrvUpdate(cp,force);/* (the streams' ribbons, wriver.js) */
  if(typeof wrdUpdate==='function')wrdUpdate(cp);/* (the river ground in detail near the camera, wrdetail.js) */
  if(WT.frame%2===0||force){WT.gy=wtHasTile(cp.x,cp.z)?wtH(cp.x,cp.z):WT.gy||0;WT.want=wtWant(cp.x,cp.y,cp.z);}
  const want=WT.want||[];const T0=performance.now(),lim=force?1e9:WT.budget;
  const missing=want.filter(w=>!WT.chunks.has(w.key)).sort((a,b)=>a.d-b.d);
  for(const w of missing){if(performance.now()-T0>lim)break;const rg=WT.ready.get(w.key);
    if(rg){WT.ready.delete(w.key);WT.chunks.set(w.key,wtBuild(w.L,w.i,w.k,rg));continue;}
    if(!WT.pool.length||(force&&w.d<WT.syncR)){WT.chunks.set(w.key,wtBuild(w.L,w.i,w.k));continue;}
    if(w.L===0){const t=WT.tiles.get(w.i+','+w.k);if(t&&t.g.nrm){WT.chunks.set(w.key,wtBuild(0,w.i,w.k));continue;}if(!t){wtTileAsk(w.i,w.k);continue;}}
    if(!WT.asked.has('c'+w.key)){const S=WG_CFG.tile<<w.L,key=w.key;if(wtAsk('c'+key,w.i*S,w.k*S,S/WT.N,WT.N,wtLite(w.L),g=>{WT.asked.delete('c'+key);if(WT.on&&WT.seed===WG.seed)WT.ready.set(key,g);}))WT.asked.add('c'+key);}}
  /* what to show */
  const show=new Set();
  const has=(L,i,k)=>WT.chunks.get(wtKey(L,i,k));
  /* a wanted chunk that is not built yet: shown by its built children (from before) or by its built parent */
  for(const w of want){const ch=has(w.L,w.i,w.k);if(ch){show.add(ch);continue;}
    if(w.L>0){const kids=[];for(let b=0;b<2;b++)for(let a=0;a<2;a++){const c=has(w.L-1,w.i*2+a,w.k*2+b);if(c)kids.push(c);}if(kids.length===4){kids.forEach(c=>show.add(c));continue;}}
    let L=w.L,i=w.i,k=w.k;while(L<WT.LMAX){L++;i=Math.floor(i/2);k=Math.floor(k/2);const p=has(L,i,k);if(p){show.add(p);break;}}}
  /* a parent shown for a missing child hides that parent's other children (they would overlap it) */
  for(const ch of [...show]){if(ch.L>0){for(const o of [...show])if(o!==ch&&o.L<ch.L){const s=ch.S;if(o.x0>=ch.x0&&o.x0<ch.x0+s&&o.z0>=ch.z0&&o.z0<ch.z0+s)show.delete(o);}}}
  camera.updateMatrixWorld();_wtM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_wtFr.setFromProjectionMatrix(_wtM);
  /* (the far plane of the frustum is ignored: far chunks are drawn by the depth compression, see wdepth) */
  _wtFr.planes[4].constant=1e9;_wtFr.planes[5].constant=1e9;
  for(const ch of WT.chunks.values()){let on=show.has(ch);if(on){ch.use=WT.frame;_wtSp.center.set(ch.x0+ch.S/2,(ch.ymin+ch.ymax)/2,ch.z0+ch.S/2);_wtSp.radius=Math.hypot(ch.S*.71,(ch.ymax-ch.ymin)/2+20);on=_wtFr.intersectsSphere(_wtSp);}wtShow(ch,on);}
  WT.shown=show;
  /* chunks unused for a while go */
  if(WT.chunks.size>320&&WT.frame%30===0){const arr=[...WT.chunks.values()].filter(c=>!show.has(c)).sort((a,b)=>a.use-b.use);for(let j=0;j<arr.length&&WT.chunks.size>260;j++){wtDispose(arr[j]);WT.chunks.delete(wtKey(arr[j].L,arr[j].i,arr[j].k));}}}
function wtInit(group){WT.group=group;WT.on=true;wtMaterial();wtWaterMat();wtIndex();if(typeof wrvInit==='function')wrvInit(group);}
function wtReset(){if(typeof wrvReset==='function')wrvReset();if(typeof wrdReset==='function')wrdReset();for(const ch of WT.chunks.values())wtDispose(ch);WT.chunks.clear();WT.tiles.clear();WT.want=null;WT.on=false;WT.asked.clear();WT.ready.clear();WT.reqs.clear();for(const w of WT.pool)w.busy=0;whpReset();}


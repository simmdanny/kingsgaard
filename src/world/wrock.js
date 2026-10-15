/* =====================================================================================================
   CHISELLED STONE (src/world/wrock.js): the stone of the world - its cliffs, mountain faces, pillars, boulders - as clean chiselled facets.
   - The ground's own material draws every rock the same way (wterrain.js: each facet one flat plane of stone, a value per facet, quiet bands of
     strata, the region's stone, grass on what faces the sky), so a block, a boulder, a ring and the face of a mountain far off are one stone.
   - A height lattice of 2 m cannot be rugged, so near the player the steep ground is dressed with stones, a merged mesh per level-0 tile:
     wherever a cliff face (steeper than about 53 degrees) crosses a terrace level, blocks are lined up along that contour. Each block's top lies at its
     level (the ground just uphill is there, so the top is a strip of meadow), its face reaches down the whole step (to the level below, or to the
     foot of the steep ground), the rest lies under the ground; neighbours overlap into one wall that steps up the cliff. The steps follow the
     height of the cliff (3.2 m on a low one, 6.4 or 9.6 m on the tall cliffs of the tablelands, with blocks to match), so a tall
     wall is a few big clean bands, not a mosaic. Levels wander a little; now and then a crag stands higher than its band, a tall slab spans two
     bands, a broken piece lies on a ledge; blocks thinner than a step are left out (they would read as plates on the grass). The spires get none:
     their horn peaks are steep cones under snow, where blocks read as rubble; their stone is the ground's own chiselled rock.
   - Each stone is an icosphere squared towards a block and cut by flat planes (wrkShape). Each block draws from its own stream, seeded by where it
     stands: nothing here touches the world's generation, its grid, its props or its saves.
   - Light falls off on each stone as it would: its lower part, where it meets the ground, its sides set back between its neighbours (the wall's crevices)
     and what faces down are darker (wrkOcc, baked per vertex into aB.y, which the ground material reads as its cavity); each stone has its own tint and
     brightness (aB.z), and aB.w = 1 marks a block for the material. So a wall is many stones, not one pattern.
   - Stones of 80 facets; tiles within WRK.near cast shadows, farther ones (out to WRK.R) keep only the blocks of tall cliffs - past WRK.full, which the Detail
     distance pushes out (all of a cliff's blocks out to it); at most WRK.cap blocks a tile. A tile is built
     a few milliseconds a frame (wrkGen is a generator), the nearest first.
   ===================================================================================================== */
const WRK={on:false,group:null,R:200,near:90,full:90,cap:[340,110],far:[],farR:0,fcap:600,fm:new Map(),fjob:null,ff:0,TH:.4,ms:3,tiles:new Map(),job:null,N:null,ico:{},tpl:null,stats:{built:0,ms:0,blocks:0,tris:0}};
function wrkInit(group){WRK.group=group;WRK.on=true;if(!WRK.N)WRK.N=wnSimplex(424242);}
function wrkReset(){for(const r of WRK.tiles.values())wrkDrop(r);WRK.tiles.clear();WRK.job=null;for(const e of WRK.fm.values())wrkDrop(e);WRK.fm.clear();WRK.fjob=null;WRK.on=false;}
function wrkDrop(r){if(r.mesh){if(r.mesh.parent)r.mesh.parent.remove(r.mesh);r.mesh.geometry.dispose();r.mesh=null;}}
const wrkIco=d=>WRK.ico[d]||(WRK.ico[d]=(d<0?new THREE.BoxGeometry(1.4,1.4,1.4).toNonIndexed():new THREE.IcosahedronGeometry(1,d)).attributes.position.array);/* (-1: a box, the far levels': 1.4 brings it within 5 % of the 20-facet stone's size) */
/* a template's corners: its faces share them, so a stone works each one out once - for every vertex which corner it is (map) and the first vertex of each
   corner (first), found once per template (by the rounded position, as each stone used to find them) */
function wrkIcoU(d){const c=WRK.icoU||(WRK.icoU={});if(c[d])return c[d];const src=wrkIco(d),n=src.length/3,map=new Int32Array(n),first=[],seen=new Map();
  for(let j=0;j<n;j++){const i=j*3,k=Math.round(src[i]*1e4)+','+Math.round(src[i+1]*1e4)+','+Math.round(src[i+2]*1e4);let u=seen.get(k);if(u===undefined){u=first.length;first.push(j);seen.set(k,u);}map[j]=u;}
  return c[d]={map,first:Int32Array.from(first)};}

/* one stone in its own frame (x along the slope, y up, z out of it), non-indexed: squared towards a block by o.box (0 round .. 1 a block with soft
   corners), roughened, stretched to w x h x d, chiselled by o.cuts planes (o.up of them take off the top edges, the rest are upright faces round the
   sides), a flat top at o.top and a flat bottom. R: the stone's own stream. */
function wrkShape(R,w,h,d,o){const src=wrkIco(o.det||0),U=wrkIcoU(o.det||0),out=new Float32Array(src.length),V=new Float64Array(U.first.length*3),ph=R()*100,P=[],pw=1-(o.box||0)*.68,N=WRK.N,
    sq=t=>Math.sign(t)*Math.pow(Math.abs(t),pw),nu=o.up==null?1:o.up;
  for(let k=0;k<o.cuts;k++){const a=R()*6.2832,up=k<nu?.55+R()*.3:(R()-.5)*.3,c=Math.sqrt(1-up*up);P.push([Math.cos(a)*c,up,Math.sin(a)*c,(k<nu?.9:.78)+R()*(k<nu?.09:.17)]);}
  if(o.top!=null)P.push([0,1,0,o.top]);P.push([0,-1,0,.55]);
  for(let u=0;u<U.first.length;u++){const i=U.first[u]*3;let x=sq(src[i]),y=sq(src[i+1]),z=sq(src[i+2]);const r=1+(o.rough||0)*(wnN(N,x*1.6+ph,y*1.6+z*1.2)+.5*wnN(N,x*3.4-ph,z*3.2+y*2));x*=r;y*=r;z*=r;
    for(const q of P){const e=x*q[0]+y*q[1]+z*q[2]-q[3];if(e>0){x-=e*q[0];y-=e*q[1];z-=e*q[2];}}
    V[u*3]=x*w/2;V[u*3+1]=y*h/2;V[u*3+2]=z*d/2;}
  for(let j=0,M=U.map;j<M.length;j++){const u=M[j]*3;out[j*3]=V[u];out[j*3+1]=V[u+1];out[j*3+2]=V[u+2];}
  return out;}

/* the boulders' templates (wstream.js wstRocks keeps its places and its draws; only the shapes are these): six chiselled stones, a little squared */
function wrkBoulderTpl(){if(WRK.tpl)return WRK.tpl;if(!WRK.N)WRK.N=wnSimplex(424242);const out=[];
  for(let v=0;v<6;v++){const R=wnRng(9001+v*77),sx=.8+.5*((v*37)%10)/10,sy=.55+.35*((v*53)%10)/10,sz=.8+.5*((v*71)%10)/10;
    const p=wrkShape(R,2*sx,2*sy,2*sz,{det:1,cuts:5+(v%3),up:1,rough:.08,box:.45+.08*(v%4)}),g=new THREE.BufferGeometry();
    for(let i=1;i<p.length;i+=3)if(p[i]<-.25)p[i]=-.25+(p[i]+.25)*.35;/* (a flatter underside, as before) */
    g.setAttribute('position',new THREE.BufferAttribute(p,3));g.computeVertexNormals();
    {const oc=new Float32Array(p.length/3),nr=g.attributes.normal.array,ylo=-.25*sy*1.1,yhi=sy;for(let i=0;i<oc.length;i++){const hf=Math.min(1,Math.max(0,(p[i*3+1]-ylo)/(yhi-ylo)));
      oc[i]=Math.min(1,1-(1-.55*Math.pow(1-hf,1.8))*(1-.35*wnS(nr[i*3+1],-.1,-.6)));}g.setAttribute('occ',new THREE.BufferAttribute(oc,1));}/* (how little light reaches it: low down and underneath) */
    out.push(g);}
  return WRK.tpl=out;}

/* ---------- the dressing of one level-0 tile (a generator: it yields when its time is up; the result is in out) ---------- */
function* wrkGen(t,lod,out){const fl=lod?(lod-1)>>1:0,tallOnly=lod>0&&((lod-1)&1)===1,/* (wrkLod: the facet level and whether only the tall cliffs keep their blocks) */g=t.g,n=g.n,s=n+1,res=WG_CFG.res,TH=WRK.TH,det=fl>=2?-1:fl>=1?0:1,/* (the far levels, WRK.far: a few pixels across there) */hh=g.h,H=(x,z)=>wtHt(t,x,z),N=WRK.N,seed=WG.seed|0,RW=new Float64Array(4);
  const pos=out.pos,aA=out.aA,aB=out.aB,kept=new Map(),Nv=[0,0,0];let tY=performance.now();
  const nrmAt=(x,z,o)=>{const e=1,hx=H(x+e,z)-H(x-e,z),hz=H(x,z+e)-H(x,z-e),l=Math.hypot(hx,2*e,hz);o[0]=-hx/l;o[1]=2*e/l;o[2]=-hz/l;return o;};
  /* (the blocks kept so far, by step size and level (K) and by 4 m cell within the tile - number keys: a dense cliff asks this thousands of times) */
  const kx0=Math.floor(t.x0/4)-64,kz0=Math.floor(t.z0/4)-64,cellK=(x,z)=>(Math.floor(x/4)-kx0)*256+Math.floor(z/4)-kz0;
  const taken=(K,x,z,r)=>{if(!K)return false;const c0=cellK(x,z),m=Math.ceil(r/4);for(let a=-m;a<=m;a++)for(let b=-m;b<=m;b++){const L=K.get(c0+a*256+b);if(L)for(const q of L)if((q[0]-x)**2+(q[1]-z)**2<r*r)return true;}return false;};
  const OC=[],G=(x,z)=>H(x+t.x0,z+t.z0);
  const tag=(nv,w,tint)=>{const a0=Math.round(w[0]*255),a1=Math.round(w[1]*255),a2=Math.round(w[2]*255),tz=Math.round(tint*255),o0=OC.length-nv;for(let v=0;v<nv;v++){aA.push(a0,a1,a2,0);aB.push(0,Math.round(128+127*OC[o0+v]),tz,255);}};
  /* candidates: two per lattice cell each way (1 m), only in cells whose corners say steep (a tile keeps only its heights and its water) */
  for(let k=0;k<n;k++){for(let i=0;i<n&&out.nb<WRK.cap[tallOnly?1:0];i++){const q=k*s+i,a=hh[q],b=hh[q+1],c=hh[q+s],e=hh[q+s+1];
      if(Math.max(Math.abs(b-a),Math.abs(c-a),Math.abs(e-b),Math.abs(e-c))<.6*res)continue;
      const cx0=t.x0+(i+.5)*res,cz0=t.z0+(k+.5)*res;wgRegions(cx0,cz0,RW);const W=[RW[1],RW[2],RW[3]];if(W[0]>.3||W[2]>.45)continue;/* (nor in the elderglade: its rock is sculpted, rounded knolls - stacked blocks read as raw cuts there) *//* (not on the spires: their horn peaks are steep cones under snow, blocks on them read as rubble; the ground's chiselled rock is their stone) */
      for(let sk=0;sk<2;sk++)for(let si=0;si<2;si++){const x=t.x0+(i+.25+si*.5)*res,z=t.z0+(k+.25+sk*.5)*res;nrmAt(x,z,Nv);if(1-Nv[1]<TH)continue;/* (cliff faces only: a steep flank is the ground's own chiselled rock, a carpet of blocks over it reads as rubble) */
        const l=Math.hypot(Nv[0],Nv[2])||1,ox=Nv[0]/l,oz=Nv[2]/l,gh=H(x,z);
        /* the step follows the height of the cliff: what the ground does over 10 m up and down the slope */
        const rel=H(x-ox*10,z-oz*10)-H(x+ox*10,z+oz*10),sc=rel<22?1:rel<52?2:3,STEP=3.2*sc;
        if(tallOnly&&sc<2)continue;/* (far off - past WRK.full - only the tall cliffs keep their blocks) */
        const wb=1.1*sc*wnN(N,x*.04/sc+2,z*.04/sc-5)+.35*sc*wnN(N,x*.13/sc,z*.13/sc+9),lvK=Math.floor((gh+wb)/STEP);
        if(Math.floor((H(x-ox*.9*sc,z-oz*.9*sc)+wb)/STEP)<=lvK)continue;           /* (here the slope crosses the level above) */
        const ks=sc*1e6+lvK;let K=kept.get(ks);if(taken(K,x,z,3.1*sc))continue;{if(!K)kept.set(ks,K=new Map());const key=cellK(x,z);let L=K.get(key);if(!L)K.set(key,L=[]);L.push([x,z]);}
        const Rp=wnRng(wnHashI(Math.round(x*16),Math.round(z*16),seed+4242)),r=[Rp(),Rp(),Rp(),Rp(),Rp(),Rp(),Rp(),Rp()];if(fl>=3&&(wnHashI(Math.round(x*16),Math.round(z*16),seed+4243)>>>0)%100>=50)continue;/* (the farthest level: half of them, evenly - the place stays taken) */
        /* how far down the slope this step reaches: to the level below, or to the foot of the steep ground (the block's face stands there) */
        const lv=(lvK+1)*STEP-wb,dt=.4*sc;let run=.6,fh=gh,ph=gh;
        for(let tt=dt;tt<=5*sc;tt+=dt){fh=H(x+ox*tt,z+oz*tt);run=tt;if(fh<lv-STEP+.35||ph-fh<dt*.3)break;ph=fh;}
        const crag=r[1]<.17,tall=!crag&&r[1]>.9,kind=crag?0:(r[2]<.28?2:1);
        const top=lv+(r[0]-.5)*.5*sc+(crag?(.9+r[5]*1.9)*sc:0)+(tall?STEP*.95:0);if(top-fh<1.3*sc)continue;
        const bot=fh-1-.3*sc,TOP=.72+r[6]*.18,hgt=(top-bot)/((TOP+.55)/2);
        const w=[2.3+r[3]*1.4,4.4+r[3]*2.8,5.2+r[3]*3.2][kind]*sc,d=Math.max([2.5+r[4],3+r[4]*1.2,3.5+r[4]*1.4][kind]*sc,run+1.7*sc),off=d*.5-run-(kind===2?.25:.1)*sc;
        const lean=(Math.PI/2-Math.acos(Math.min(1,Nv[1])))*(.02+.08*r[7]),yaw=(r[7]-.5)*.5;
        const n0=pos.length;
        wrkPut(pos,Rp,[x-ox*off-t.x0,top-TOP*hgt/2,z-oz*off-t.z0],ox,oz,lean,yaw,w,hgt,d,{det,cuts:[6,7,5][kind]+Math.floor(r[2]*3),up:[2,1,0][kind],rough:[.04,.06,.05][kind],box:[.9,.78,.82][kind],top:TOP},OC,G);
        tag((pos.length-n0)/3,W,Rp());out.nb++;
        if(r[5]<.3&&!crag&&!tallOnly&&fl===0){const ps=(.4+r[0]*.7)*sc,ex=x-ox*(.2+ps*.4),ez=z-oz*(.2+ps*.4),n1=pos.length;
          wrkPut(pos,Rp,[ex-t.x0,top+ps*.12,ez-t.z0],ox,oz,0,r[3]*6.28,ps*1.4,ps,ps*1.15,{det:0,cuts:6,up:1,rough:.06,box:.7},OC,G);tag((pos.length-n1)/3,W,Rp());}}
      if(performance.now()-tY>WRK.ms){yield;tY=performance.now();}/* (the time is looked at after every cell: a row of a dense cliff takes tens of milliseconds) */}}}
/* the mesh of a finished tile */
function wrkMesh(t,lod,out){if(!out.pos.length)return null;const geo=new THREE.BufferGeometry(),nv=out.pos.length/3;geo.setAttribute('position',new THREE.Float32BufferAttribute(out.pos,3));geo.computeVertexNormals();
  geo.setAttribute('aA',new THREE.BufferAttribute(Uint8Array.from(out.aA),4,true));geo.setAttribute('aB',new THREE.BufferAttribute(Uint8Array.from(out.aB),4,true));
  geo.setAttribute('aW',new THREE.BufferAttribute(new Float32Array(nv).fill(-1e4),1));geo.computeBoundingSphere();if(lod>=3)/* (facet level 1 and up, wrkLod) */for(const k in geo.attributes)geo.attributes[k].onUpload(wrkFree);
  const m=new THREE.Mesh(geo,wtMaterial());m.position.set(t.x0,0,t.z0);m.castShadow=lod===0;m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();m.userData.keep=1;
  if(lod>=3){const bs=geo.boundingSphere;m.userData.sp=new THREE.Sphere(new THREE.Vector3(bs.center.x+t.x0,bs.center.y,bs.center.z+t.z0),bs.radius);m.frustumCulled=false;m.onAfterRender=wrkSeen;}return m;}
/* put one stone: p (its middle, in the tile's frame), (ox,oz) out of the slope, lean (its face leaning back), yaw (turned about the vertical) */
function wrkPut(pos,R,p,ox,oz,lean,yaw,w,h,d,o,occ,G){const sh=wrkShape(R,w,h,d,o),cy=Math.cos(yaw),sy=Math.sin(yaw),fx=ox*cy-oz*sy,fz=ox*sy+oz*cy,ct=Math.cos(lean),st=Math.sin(lean);
  const F=[fx*ct,st,fz*ct],U=[-fx*st,ct,-fz*st],Rt=[fz,0,-fx],p0=pos.length;
  for(let i=0;i<sh.length;i+=3){const x=sh[i],y=sh[i+1],z=sh[i+2];pos.push(p[0]+Rt[0]*x+U[0]*y+F[0]*z,p[1]+U[1]*y+F[1]*z,p[2]+Rt[2]*x+U[2]*y+F[2]*z);}
  if(occ)wrkOcc(pos,p0,sh,h,d,o,occ,G);}
/* How little light reaches each corner of a stone (0 open .. 1 shut in), baked per vertex: the lower part of the stone, where it meets the ground,
   its sides set back between its neighbours (the crevices of the wall) and what faces down. Where it faces the sky (a ledge's grass) the recess counts
   less. G(x,z): the ground's height in the tile's frame. Written into occ, one value per vertex. */
function wrkOcc(pos,p0,sh,h,d,o,occ,G){const y0=-.55*h/2,y1=(o.top!=null?o.top:1)*h/2,S=wnS;
  for(let i=0;i<sh.length;i+=9){const a=p0+i,ux=pos[a+3]-pos[a],uy=pos[a+4]-pos[a+1],uz=pos[a+5]-pos[a+2],vx=pos[a+6]-pos[a],vy=pos[a+7]-pos[a+1],vz=pos[a+8]-pos[a+2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const nl=Math.hypot(nx,ny,nz)||1;ny/=nl;
    const under=.4*S(ny,-.15,-.65),up=Math.max(0,ny);
    for(let k=0;k<3;k++){const q=i+k*3,ly=sh[q+1],lz=sh[q+2],wx=pos[p0+q],wy=pos[p0+q+1],wz=pos[p0+q+2];
      const hf=Math.min(1,Math.max(0,(ly-y0)/(y1-y0))),low=.5*Math.pow(1-hf,1.6),
        touch=.55*(1-S(wy-G(wx,wz),0,.9)),back=.45*(1-S((lz+d/2)/d,.3,.78))*(1-.7*up);
      occ.push(Math.min(1,1-(1-low)*(1-touch)*(1-back)*(1-under)));}}}
/* per frame: the tiles round the camera dressed (near ones in full, far ones plainer), the nearest unfinished one built a few ms a frame; dropped beyond reach.
   force: build everything in reach at once (a start, a teleport, the lab) */
/* a tile's level (wrkLod): 0 within WRK.near (shadows); beyond it 1 + 2 x the facet level + 1 where only the tall cliffs keep their blocks (past WRK.full).
   The facet levels (WRK.far, [] unless the Detail distance setting - kingsgaard.html owDetailApply - sets it): the 80-facet stones, past far[0] the 20-facet
   ball, past far[1] a 12-facet box, past far[2] half of those. WRK.full (the Detail distance sets it; WRK.near, 90 m, as the game always was): out to it every
   block of every cliff, the low ones and the broken pieces on the ledges too - a far cliff as rich as a near one; past it only the tall cliffs' blocks.
   So 1 is a full tile of 80-facet stones without shadows, 2 the old far tile (tall cliffs), 3/4 the same in 20 facets, 5/6 in boxes, 7/8 half the boxes.
   A tile keeps its level for 40 m past an edge, so walking along one does not rebuild it back and forth. Their vertices stay only on the graphics card:
   a far mesh is drawn once wherever it is (not culled until then, wrkSeen), and its arrays are let go once sent (wrkFree). Then wrkCull hides it outside the view
   each frame - by the terrain's frustum, which has no far plane: three.js's own culling would drop everything past the camera's 2.1 km far plane, though the
   depth compression (wdepth.js) draws it. So such a mesh must never be raycast
   (Mesh.raycast reads position.array) nor sent again (a lost WebGL context could not restore it) */
function wrkLod(d,r){const F=WRK.far,full=WRK.full,lv=x=>{let f=0;while(f<F.length&&x>=F[f])f++;return 1+2*f+(x<full?0:1);},L=lv(d);
  if(r&&r.lod>=1&&r.lod!==L&&(lv(d-40)===r.lod||lv(d+40)===r.lod))return r.lod;return L;}
function wrkFree(){this.array=null;}
function wrkSeen(){this.userData.seen=1;this.onAfterRender=wrkNone;}
/* every frame: the far meshes outside the view hidden (the terrain's frustum without its far plane, _wtFr, wterrain.js wtUpdate - it runs first); the far
   cliffs' blocks show with their chunk (wtUpdate culls and swaps the chunks) while it is in their band */
function wrkCull(){if(typeof _wtFr==='undefined')return;for(const r of WRK.tiles.values()){const m=r.mesh;if(m&&m.userData.seen)m.visible=_wtFr.intersectsSphere(m.userData.sp);}
  for(const e of WRK.fm.values())if(e.mesh)e.mesh.visible=e.ch.on&&e.band;}
function wrkNone(){}
function wrkView(cam,force){if(!WRK.on||!WRK.group)return;wrkCull();const T0=performance.now(),busy=wrkNear(cam,force,T0);if(WRK.farR>WRK.R||WRK.fm.size)wrkFar(cam,force,busy&&(WRK.ff=(WRK.ff+1)%3)!==0,T0);}
/* the dressing of the level-0 tiles; true when it used this frame's time */
function wrkNear(cam,force,T0){const S=WG_CFG.tile;
  const want=(t)=>{const d=Math.hypot(Math.max(0,Math.abs(t.x0+S/2-cam.x)-S/2),Math.max(0,Math.abs(t.z0+S/2-cam.z)-S/2)),r=WRK.tiles.get(t.ti+','+t.tk);
    return{d,lod:d<WRK.near?0:(r&&r.lod===0&&d<WRK.near+40?0:wrkLod(d,r))};};
  for(const[key,r]of WRK.tiles){const t=WT.tiles.get(key);if(!t||t!==r.t){wrkDrop(r);WRK.tiles.delete(key);continue;}if(want(t).d>WRK.R+60){wrkDrop(r);WRK.tiles.delete(key);}}
  if(WRK.job){const j=WRK.job,w=WT.tiles.get(j.key)===j.t?want(j.t):null;if(!w||w.d>WRK.R+60||w.lod!==j.lod)WRK.job=null;}
  for(let guard=0;guard<(force?1e6:1);guard++){
    if(!WRK.job){let best=null;for(const t of WT.tiles.values()){const w=want(t);if(w.d>=WRK.R)continue;const r=WRK.tiles.get(t.ti+','+t.tk);if(r&&r.t===t&&r.lod===w.lod)continue;if(!best||w.d<best.d)best={t,d:w.d,lod:w.lod};}
      if(!best)return false;const out={pos:[],aA:[],aB:[],nb:0};WRK.job={t:best.t,key:best.t.ti+','+best.t.tk,lod:best.lod,out,gen:wrkGen(best.t,best.lod,out),ms:0};}
    const j=WRK.job,t1=performance.now();if(!j.done){if(force){while(!j.gen.next().done);j.done=true;}else j.done=j.gen.next().done;j.ms+=performance.now()-t1;if(!force)return true;}
    /* (the mesh is made in a frame of its own, after the last part of the search) */
    const old=WRK.tiles.get(j.key);if(old)wrkDrop(old);const m=wrkMesh(j.t,j.lod,j.out);WRK.tiles.set(j.key,{t:j.t,lod:j.lod,mesh:m,blocks:j.out.nb,tris:j.out.pos.length/9});if(m)WRK.group.add(m);
    WRK.stats.built++;WRK.stats.ms+=j.ms;WRK.stats.blocks+=j.out.nb;WRK.stats.tris+=j.out.pos.length/9;WRK.job=null;
    if(!force&&performance.now()-T0>WRK.ms)return true;}return false;}
/* ---------- far off: past WRK.R (the level-0 tiles above reach 3 km at most - about 35 KB each) out to WRK.farR (the Detail distance), the tall cliffs'
   blocks are made from the chunks the ground is drawn with (wterrain.js, level 3 and up: cells of 16-64 m): one block for each steep cell of a tall face
   (two on a taller one, one above the other), about the size of the cell, its face out of the slope, so the far cliffs read as stepped stone, not smooth walls.
   As near: not on the spires, not in the elderglade; the blocks' own light and tint (aB), aB.w = 1. A chunk's blocks show while it does (wrkCull); cells
   within WRK.R of the camera are left to the dressing above, and a chunk by that edge is made again once the camera has gone 400 m. Built a few
   milliseconds a frame after the dressing above (and every third frame even while that is busy), the nearest chunk first; dropped with their chunk. ---------- */
const wrkChD=(ch,c)=>Math.hypot(Math.max(0,Math.abs(c.x-(ch.x0+ch.S/2))-ch.S/2),Math.max(0,Math.abs(c.z-(ch.z0+ch.S/2))-ch.S/2));
function wrkFar(cam,force,busy,T0){const F=WRK.fm,R0=WRK.R,R1=WRK.farR;
  for(const[key,e]of F){const ch=WT.chunks.get(key);if(ch!==e.ch||R1<=R0){wrkDrop(e);F.delete(key);continue;}e.band=wrkChD(ch,cam)<R1;}
  if(R1<=R0||busy&&!force)return;
  if(WRK.fjob&&WT.chunks.get(WRK.fjob.key)!==WRK.fjob.ch)WRK.fjob=null;
  for(let guard=0;guard<(force?1e6:1);guard++){
    if(!WRK.fjob){let best=null;for(const ch of WT.shown){if(ch.L<3||!ch.mesh)continue;const d=wrkChD(ch,cam);if(d>=R1||d+ch.S*1.42<R0)continue;const key=wtKey(ch.L,ch.i,ch.k),e=F.get(key);
        if(e&&e.ch===ch&&(Math.hypot(e.cx-cam.x,e.cz-cam.z)<400||d>R0+1500))continue;/* (made with the camera elsewhere: that matters only by the edge) */if(!best||d<best.d)best={ch,d,key};}
      if(!best)return;const out={pos:[],aA:[],aB:[],nb:0};WRK.fjob={ch:best.ch,key:best.key,out,gen:wrkFarGen(best.ch,cam.x,cam.z,out),cx:cam.x,cz:cam.z};}
    const j=WRK.fjob;if(!j.done){if(force){while(!j.gen.next().done);j.done=true;}else{j.done=j.gen.next().done;if(!j.done)return;}}
    const old=F.get(j.key);if(old)wrkDrop(old);const m=wrkMesh({x0:j.ch.x0,z0:j.ch.z0},2,j.out);if(m){m.visible=false;WRK.group.add(m);}
    F.set(j.key,{ch:j.ch,mesh:m,cx:j.cx,cz:j.cz,band:true});WRK.fjob=null;WRK.stats.far=(WRK.stats.far||0)+j.out.nb;
    if(!force&&performance.now()-T0>WRK.ms)return;}}
/* one chunk's far blocks: its heights (the lattice of its mesh) and region weights (its aA), in the chunk's frame */
function* wrkFarGen(ch,cx,cz,out){const geo=ch.mesh.geometry,P=geo.attributes.position.array,A=geo.attributes.aA.array,N=WT.N,m=N+1,st=ch.S/N,x0=ch.x0,z0=ch.z0,seed=WG.seed|0,R0=WRK.R,STEP=st*.7;
  const pos=out.pos,aA=out.aA,aB=out.aB,OC=[];let tY=performance.now();if(!WRK.N)WRK.N=wnSimplex(424242);
  const hq=q=>P[q*3+1],G=(lx,lz)=>{const fi=Math.min(N-1e-6,Math.max(0,lx/st)),fk=Math.min(N-1e-6,Math.max(0,lz/st)),i=fi|0,k=fk|0,u=fi-i,v=fk-k,q=k*m+i;
    return (hq(q)*(1-u)+hq(q+1)*u)*(1-v)+(hq(q+m)*(1-u)+hq(q+m+1)*u)*v;};
  for(let k=0;k<N;k++){for(let i=0;i<N&&out.nb<WRK.fcap;i++){const q=k*m+i,a=hq(q),b=hq(q+1),c=hq(q+m),e=hq(q+m+1),gx=(b-a+e-c)/(2*st),gz=(c-a+e-b)/(2*st),gl=Math.hypot(gx,gz);
      if(gl<1||gl*st<18)continue;/* (steeper than 45 degrees over the whole cell - a cliff, smeared over it - and a tall one) */
      const lx=(i+.5)*st,lz=(k+.5)*st;if(Math.hypot(x0+lx-cx,z0+lz-cz)<R0)continue;/* (the dressing above has it) */
      const w1=A[q*4]/255,w3=A[q*4+2]/255;if(w1>.3||w3>.45)continue;
      const W=[w1,A[q*4+1]/255,w3],ox=-gx/gl,oz=-gz/gl,Rp=wnRng(wnHashI(Math.round(x0+lx),Math.round(z0+lz),seed+4244));
      /* the face crosses terrace levels STEP apart (as near, wrkGen): a block for each level it crosses, its top on the level, its face standing out of the
         slope - side by side along the cliff they make its steps */
      const hc=G(lx,lz),lo=hc-gl*st*.5,hi=hc+gl*st*.5,wb=STEP*.35*wnN(WRK.N,(x0+lx)/(st*7),(z0+lz)/(st*7));
      for(let lv=Math.ceil((lo+wb)/STEP)*STEP-wb;lv<hi;lv+=STEP){const r=[Rp(),Rp(),Rp(),Rp()],dh=(lv-hc)/gl,px=lx-ox*dh,pz=lz-oz*dh;/* (where the slope has this level's height) */
        const hgt=STEP*(1.15+.35*r[1]),w=st*(1+.45*r[0]),d=Math.min(st*.6,STEP*1.1/gl+st*.15)*(1+.3*r[2]),n0=pos.length,o0=OC.length;
        wrkPut(pos,Rp,[px+ox*d*.3,lv-hgt*.42,pz+oz*d*.3],ox,oz,.05*r[3],(r[0]-.5)*.25,w,hgt,d,{det:-1,cuts:5,up:1,rough:.04,box:.9,top:.84},null,null);
        const nv=(pos.length-n0)/3,tz=Math.round((.35+.3*r[3])*255),a0=Math.round(W[0]*255),a1=Math.round(W[1]*255),a2=Math.round(W[2]*255);
        for(let v=0;v<nv;v++){const yv=(pos[n0+v*3+1]-(lv-hgt))/hgt;aA.push(a0,a1,a2,0);aB.push(0,Math.round(128+127*.35*Math.max(0,1-yv*1.6)),tz,255);}out.nb++;if(out.nb>=WRK.fcap)break;}}
    if(performance.now()-tY>WRK.ms){yield;tY=performance.now();}}}

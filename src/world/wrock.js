/* =====================================================================================================
   CHISELLED STONE (src/world/wrock.js): the cliffs near the player, and the chiselled stones others use.
   - World look 1: a cliff is one continuous rock surface made with the terrain (src/world/wcliff.js, its material src/world/wcliffmat.js) - no
     longer walls of separate blocks. Here: which level-0 tiles get a sheet and at which level (the grid 0.8 / 1.6 / 3.2 m by distance, WRK.lodD),
     out to WRK.clR (300 m; the Detail distance setting pushes it to 450 m), made by the world workers (wterrain.js's pool) or, forced or without
     workers, here a slice a frame; dropped beyond reach. Past the sheets the ground's own stone (wterrain.js: the cliff's palette and courses of blocks)
     is the cliff. The ground's lattice stands back from the faces under the sheets (WT.clf, wterrain.js WT_INSET) out to WRK.clR + 40 m.
   - wrkShape: a stone in its own frame - an icosphere squared towards a block, roughened, chiselled by flat planes (the elderglade rings' rubble,
     wring.js, uses it; the boulders are src/world/wboulder.js).
   ===================================================================================================== */
const WRK={pend:new Map(),lodD:[40,100],on:false,group:null,clR:300,ms:3,tiles:new Map(),job:null,N:null,ico:{},stats:{built:0,ms:0,blocks:0,tris:0}};
function wrkInit(group){WRK.group=group;WRK.on=true;if(!WRK.N)WRK.N=wnSimplex(424242);}
function wrkReset(){for(const r of WRK.tiles.values())wrkDrop(r);WRK.tiles.clear();WRK.job=null;WRK.pend.clear();WRK.on=false;}
function wrkDrop(r){if(r.mesh){if(r.mesh.parent)r.mesh.parent.remove(r.mesh);r.mesh.geometry.dispose();if(r.mesh.userData.cliff&&typeof wcmDrop==='function')wcmDrop(r.mesh);r.mesh=null;}}
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


/* per frame: the sheets round the camera (force: every one in reach at once - a start, a teleport, the lab) */
function wrkView(cam,force){if(!WRK.on||!WRK.group)return;if(typeof wcmFrame==='function')wcmFrame();if(WT.clf)WT.clf.value.y=WRK.clR+40;wrkNear(cam,force,performance.now());}
/* a tile's sheet from the least busy world worker (wterrain.js's pool; cb gets wclGen's arrays); false if none is free. The stamps of the sampler's
   square go with it, as with a grid */
function wclAsk(t,lod,cb){let w=null;for(const p of WT.pool)if(!p.dead&&!p.busy&&!p.hjob){w=p;break;}if(!w)return false;/* (an idle worker only: the ground's tiles never wait behind a sheet) */
  const S=WG_CFG.tile,M=WCL.margin,X0=t.x0-M,Z0=t.z0-M,E=(Math.round((S+2*M)/WCL.r)+1)*WCL.r,st=WG.stampsIn?WG.stampsIn(X0-2,Z0-2,X0+E+2,Z0+E+2):null;
  const id=++WT.reqId;WT.reqs.set(id,{key:'c'+t.ti+','+t.tk,cb});w.busy++;w.postMessage({cliff:1,id,x0:t.x0,z0:t.z0,ti:t.ti,tk:t.tk,lod,st});return true;}
/* a sheet back from a worker: shown if its tile is still the one there and still wanted */
function wrkTake(t,key,lod,out){WRK.pend.delete(key);if(!WRK.on||WT.tiles.get(key)!==t)return;const S=WG_CFG.tile,c=WT.cam||{x:0,z:0},d=Math.hypot(Math.max(0,Math.abs(t.x0+S/2-c.x)-S/2),Math.max(0,Math.abs(t.z0+S/2-c.z)-S/2));
  if(d>WRK.clR+60)return;const old=WRK.tiles.get(key);if(old)wrkDrop(old);const m=wcmMesh(t,lod,out),nt=out.ntri||0,ns=out.stones?out.stones.length/WCL_SN:0;
  WRK.tiles.set(key,{t,lod,mesh:m,blocks:ns,tris:nt,tm:out.tm,ms:out.ms,nodes:out.nodes,cols:out.cols});if(m)WRK.group.add(m);WRK.stats.built++;WRK.stats.wk=(WRK.stats.wk||0)+1;WRK.stats.wms=(WRK.stats.wms||0)+(out.ms||0);WRK.stats.blocks+=ns;WRK.stats.tris+=nt;}
function wrkNear(cam,force,T0){const S=WG_CFG.tile;
  /* (world look 1: a tile's cliff sheet, wcliff.js - its grid 0.8 m within WRK.lodD[0], 1.6 m within WRK.lodD[1], 3.2 m beyond, so a triangle stays some
     pixels wide; a finer level is kept 15 m past its edge) */
  /* (the level by the distance in 3D - the camera's height over the tile's highest ground counts: from a cliff top or the air the tiles below are far) */
  const cy=cam.y!==undefined?cam.y:typeof camera!=='undefined'&&camera?camera.position.y:undefined;/* (the stream's focus has no height: the camera's) */
  const top=t=>{if(t._hTop===undefined){let m=-1e9;const H=t.g&&t.g.h;if(H)for(let i=0;i<H.length;i++)if(H[i]>m)m=H[i];t._hTop=H?m:-1e9;}return t._hTop;};
  const want=(t)=>{const d=Math.hypot(Math.max(0,Math.abs(t.x0+S/2-cam.x)-S/2),Math.max(0,Math.abs(t.z0+S/2-cam.z)-S/2)),r=WRK.tiles.get(t.ti+','+t.tk),L=WRK.lodD;
    const dl=cy===undefined?d:Math.hypot(d,Math.max(0,cy-top(t)));let lod=dl<L[0]?0:dl<L[1]?1:2;if(r&&r.lod<lod&&dl<L[r.lod]+15)lod=r.lod;return{d,lod};};
  for(const[key,r]of WRK.tiles){const t=WT.tiles.get(key);if(!t||t!==r.t){wrkDrop(r);WRK.tiles.delete(key);continue;}if(want(t).d>WRK.clR+60){wrkDrop(r);WRK.tiles.delete(key);}}
  if(WRK.job){const j=WRK.job,w=WT.tiles.get(j.key)===j.t?want(j.t):null;if(!w||w.d>WRK.clR+60||w.lod!==j.lod)WRK.job=null;}
  /* (with the world workers the sheets are made there, two at a time, nearest first - a request lost with a reset is let go after 10 s; a forced view, or
     no workers, makes them here, a slice a frame) */
  const wk=!force&&WT.pool.length>0&&WT.seed===WG.seed&&!WRK.noWk,now=performance.now();if(wk)for(const[k,tm]of WRK.pend)if(now-tm>10000)WRK.pend.delete(k);
  for(let guard=0;guard<(force?1e6:wk?3:1);guard++){
    if(!WRK.job){let best=null;for(const t of WT.tiles.values()){const w=want(t);if(w.d>=WRK.clR)continue;const key=t.ti+','+t.tk,r=WRK.tiles.get(key);if(r&&r.t===t&&r.lod===w.lod)continue;if(wk&&WRK.pend.has(key))continue;if(!best||w.d<best.d)best={t,d:w.d,lod:w.lod};}
      if(!best)return false;
      if(wk){const bt=best.t,key=bt.ti+','+bt.tk,lod=best.lod;if(WRK.pend.size>=2||!wclAsk(bt,lod,out=>wrkTake(bt,key,lod,out)))return true;WRK.pend.set(key,now);continue;}
      const out={nb:0};WRK.job={t:best.t,key:best.t.ti+','+best.t.tk,lod:best.lod,out,gen:wclGen(best.t,best.lod,out),ms:0};}
    const j=WRK.job,t1=performance.now();if(!j.done){if(force){while(!j.gen.next().done);j.done=true;}else j.done=j.gen.next().done;j.ms+=performance.now()-t1;if(!force)return true;}
    /* (the mesh is made in a frame of its own, after the last part of the search) */
    const old=WRK.tiles.get(j.key);if(old)wrkDrop(old);const m=wcmMesh(j.t,j.lod,j.out),nt=j.out.ntri||0,ns=j.out.stones?j.out.stones.length/WCL_SN:0;WRK.tiles.set(j.key,{t:j.t,lod:j.lod,mesh:m,blocks:ns,tris:nt,tm:j.out.tm,ms:j.ms,nodes:j.out.nodes,cols:j.out.cols});if(m)WRK.group.add(m);
    WRK.stats.built++;WRK.stats.ms+=j.ms;WRK.stats.blocks+=ns;WRK.stats.tris+=nt;WRK.job=null;
    if(!force&&performance.now()-T0>WRK.ms)return true;}return false;}

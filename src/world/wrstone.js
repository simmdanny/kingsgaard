/* =====================================================================================================
   THE STREAM'S BANKS (src/world/wrstone.js, river look 3 and 4 - tools/mockups/river/HANDOFF.md 3.5-3.7): bank stones (clusters of flat slabs, blocks
   and small stones, snapped to the real, wobbly shore and rooted in the bed), rocks in the water (a contact patch on the bed, pebbles round each),
   pebble clusters at the waterline, the grass by the stones and over the lip of the steep banks, the reeds and the ivy on the taller stones - the
   mockup's own code (WRL: riverStones, putStone, placeBoulder, bankTufts, lipReeds, tuftKit, ivySpots, ivyKit - wrlook.js) fed each stream piece of
   the game's hydrology.
   - Per stream piece (wgSeg of a hydrology point: its curve, its water level falling along it, its half width), seeded from the world's seed and the
     piece: its curve resampled at 1 m is the mockup's RIV; rivHalf is the game's half width with the mockup's noise (wrbHalf), WL the stream's level
     where along it, rivBank this stream's bankCore (its y the ground there). The rocks in the water: a rocky reach of 5-8 rocks (4-5.4 m apart, from
     side to side, 0.15-0.5 of the half width out) per ~115 m of river, as the mockup's one in its 115 m; 26 pebble clusters and 34 reed clusters per
     115 m (DEVIATIONS D14, D19).
   - The ground is exact (wgHeightAt's numbers): the stones' placing runs with the heights known so far (a guess for the others) and an idle world
     worker measures the points it asked (wrsHeights, wrbank.js); it runs again with them (no height changes where a stone goes). The grass and the
     reeds are placed by a worker with the ground at hand (wrsTuftWork: the mockup's bankTufts and lipReeds have no three.js; a reed stands only above
     WL - 0.35 m), their matrices made here. Then the ivy, a few stones a frame (three.js's own ray cast onto the stone, as the mockup).
   - A stone stays only where the ground is this stream's bank (the ground's river values there are this stream's water: not in a lake, a fall,
     another stream's channel - D15); the grass and reeds only along the metres of the piece where its middle is so (D19).
   - Drawn within WRS.R of the camera (pebbles within WRS.RP, grass and reeds within WRS.RT, ivy within WRS.RI): the bank stones in the mockup's stone
     material with the bank uniforms, the water level per stone (an instanced attribute: the game's water falls along a stream - D16); the pebbles as
     field boulders (the boulders' shapes and materials, the region's palette: wboulder.js); level 5 / 4 / 3 icospheres by distance, as the boulders;
     the grass and the ivy in the mockup's own materials (D18). The bigger stones block the hero.
   - Their contact shade (the mockup's aOcc from solids: the rocks in the water at .85 of their reach, every pebble at .95) goes onto the river ground in
     detail (wrdetail.js: wrsSolidsIn, wrsOccRefresh). The meadow's grass (grass.js) is left out by the mockup's rule at the river (wrsMeadowSkip).
   ===================================================================================================== */
const WRS={R:300,RP:150,RT:100,RI:60,segs:new Map(),t:0,dirty:true,cx:1e9,cz:1e9,group:null,seed:null,pg:null,shapes:{},mat:null,gmat:null,imat:null,meshes:new Map(),pend:0,
  stats:{gen:0,ms:0,bank:0,peb:0,tuft:0,leaf:0,inst:0,dropped:0,shapeMs:0,rounds:0,pts:0,ivyMs:0}};
/* the bank stones' shapes at a level (5: the placing's, the ivy's and the near ones; 4 and 3 when drawing asks) */
function wrsShapes(lv){if(!WRS.shapes[lv]){const T0=performance.now();WRS.shapes[lv]=WRL.bankShapes(lv===5?null:lv);WRS.stats.shapeMs+=performance.now()-T0;}return WRS.shapes[lv];}
const _wrsO={rn:[0,0,1],W:0,hw:0,s:0,g:0,fx:0,fz:0};
/* a stream piece's data for the placing: the curve at 1 m (RIV), the half width, water level and distance along the stream there, the seeds, the rocks */
function wrsPrep(e){const s=e.s,cv=wrsCurve(s),RIV=cv.RIV,hwA=cv.hwA;e.RIV=RIV;e.hwA=hwA;e.wlA=cv.wlA;e.s0=cv.s0;const p=s.p,hs=k=>wnHashI(p.i,p.j,WG.seed+k);
  e.seed=hs(731)%233280;e.sd=(hs(737)%40000)*20;e.tseed=hs(751);e.lseed=hs(757)%233280;e.iseed=hs(761)%233280;
  /* the rocks in the water: [where along (m), how far out (of the half width, + one side, - the other), size] */
  const rr=WRL.mkRng(hs(743)%233280),len=RIV.length,R=[],nR=Math.floor(len/115+rr());
  for(let q=0;q<nR&&len>40;q++){let t=4+rr()*(len-40),sg=rr()<.5?1:-1;const m=5+Math.floor(rr()*4);
    for(let j=0;j<m;j++){const ti=Math.round(t),o=sg*(.15+.35*rr()),sz=.7+.6*rr();if(ti<=len-2&&wrbHalf(wrsLerp(hwA,ti),e.s0+ti)>=1.5)R.push([ti,o,sz]);sg=-sg;t+=4+1.4*rr();}}
  e.ROCKS=R;e.NPEB=Math.floor(26*len/115+rr());e.NREED=Math.floor(34*len/115+rr());
  const RW=new Float64Array(4),mid=RIV[len>>1];wgRegions(mid[0],mid[1],RW);e.grey=Math.min(1,Math.max(0,RW[1]*2+(1-RW[2]-RW[1])*.35))>.5;
  let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const q of RIV){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);z0=Math.min(z0,q[1]);z1=Math.max(z1,q[1]);}e.bb=[x0-12,z0-12,x1+12,z1+12];
  e.hc=new Map();e.stage=0;}
/* this stream's rivBank at x, z (its y, read only by the lip grass, the ground there) */
function wrsBank(e,H){const s=e.s,o=_wrsO;return(x,z)=>{wrbNear(s,x,z,o);const bk=WRB.bankCore(x,z,0,o.rn,wrbHalf(o.hw,o.s),o.W,o.s);Object.defineProperty(bk,'y',{get:()=>H(x,z)});return bk;};}
/* stage 0, the stones (the mockup's placing over the piece); and the piece's middle at each metre: is the ground there this stream's (the grass's rule) */
function wrsStones(e,H){const s=e.s,o=_wrsO,sh=wrsShapes(5),BKI=sh.BSH.map(()=>[]),BINST=WBLD.shapes.map(()=>[]);
  for(const q of e.RIV)H(q[0],q[1]);
  const E={r:WRL.mkRng(e.seed),RIV:e.RIV,rivHalf:(z,v)=>wrbHalf(wrsLerp(e.hwA,v),e.s0+v),WLat:v=>wrsLerp(e.wlA,v),ROCKS:e.ROCKS,NPEB:e.NPEB,sd:e.sd,
    rivBank:wrsBank(e,H),solids:[],bankSpots:[],bankTops:[],waterRocks:[],BKI,BINST};
  E.putStone=WRL.bankKit({BSH:sh.BSH,BKIND:sh.BKIND,BKI,H}).putStone;
  E.placeBoulder=WRL.makePlaceBoulder({SHAPES:WBLD.shapes,BINST,H,pathDist:()=>1e9,pathHalfAt:()=>0,rivMask:()=>true});/* (every call has its size: no companions) */
  WRL.riverStones(E);return E;}
/* the ground there is this stream's bank (its river value its water) */
function wrsOk(e,x,z){const c=e.hc.get(x+','+z);if(!c||c[1]<-1e8)return false;wrbNear(e.s,x,z,_wrsO);return Math.abs(c[1]-_wrsO.W)<.05;}
function wrsStonesDone(e,E){const o=_wrsO,tint=new Map();E.BKI.forEach(L=>L.forEach(b=>tint.set(b.M,b.tint)));
  e.valid=e.RIV.map((q,i)=>{const c=e.hc.get(q[0]+','+q[1]);return!!c&&c[1]>-1e8&&Math.abs(c[1]-e.wlA[i])<.05;});
  const bank=[],sol=[],rocks=[],spots=[],tops=[],props=[],keep=new Set();
  for(const st of E.bankSpots){const el=st.M.elements,x=el[12],z=el[14];if(!wrsOk(e,x,z)){WRS.stats.dropped++;continue;}const c=tint.get(st.M);keep.add(st);spots.push(st);st.wl=o.W;
    bank.push({si:st.si,M:Float32Array.from(el),c:[c.r,c.g,c.b],wl:o.W,x,z,rw:st.rw});if(st.kind!==2&&st.rw>.3)props.push({type:'rock',x,z,r:st.rw*.85,alive:true});}
  for(const t of E.bankTops)if(keep.has(t[0]))tops.push(t);
  for(const st of E.waterRocks)if(keep.has(st))rocks.push([st.x,st.z,st.rw]);
  for(const so of E.solids)if(wrsOk(e,so[0],so[1]))sol.push(so);
  const peb=[];E.BINST.forEach((L,si)=>L.forEach(b=>{if(!wrsOk(e,b.x,b.z))return;peb.push({si,M:Float32Array.from(b.M.elements),c:[b.tint.r,b.tint.g,b.tint.b],x:b.x,z:b.z,rw:b.rw,sc:b.sc});sol.push([b.x,b.z,b.rw*0.95,1]);}));
  e.bank=bank;e.peb=peb;e.sol=sol;e.rocks=rocks;e.spots=spots;e.tops=tops;e.props=props;wrsPropsAdd(e);
  WRS.stats.bank+=bank.length;WRS.stats.peb+=peb.length;WRS.dirty=true;if(typeof wrsOccRefresh==='function')wrsOccRefresh(e.bb);}
/* stage 1, the grass: the tufts behind the bank stones, the lip grass and the reeds are placed by an idle worker (WRB.bankTufts, WRB.lipReeds with the
   exact ground: wrsTuftWork, wrbank.js), then each tuft's matrix and colour here (WRL.tuftKit), the grass's random stream carried on from the worker's */
function wrsAskT(e){let w=null;for(const p of WT.pool)if(!p.dead&&!p.busy&&!p.hjob){w=p;break;}if(!w)return false;
  const tops=new Float64Array(e.tops.length*8),spots=new Float64Array(e.spots.length*3);e.tops.forEach(([st,nx,nz],i)=>tops.set([st.x,st.z,st.rw,st.top,st.kind,st.wl,nx,nz],i*8));
  e.spots.forEach((st,i)=>spots.set([st.x,st.z,st.rw],i*3));
  const b=e.bb,st=WG.stampsIn?WG.stampsIn(b[0]-4,b[1]-4,b[2]+4,b[3]+4):null,id=++WT.reqId,key=e.key,seed=WG.seed;
  WT.reqs.set(id,{key:'rt'+key,cb:g=>{WRS.pend=Math.max(0,WRS.pend-1);if(WRS.segs.get(key)!==e||seed!==WG.seed)return;if(!g||!g.spots){e.st=0;return;}
    const R=wrsRndS(1);R.s=g.rs;e.tq={g,R,tk:WRL.tuftKit(),i:0,T:[]};e.st=4;}});/* (the matrices a few hundred a frame: wrsTuftMats) */
  w.busy++;WRS.pend++;e.st=1;e.tm=performance.now();w.postMessage({rt:1,id,i:e.p.i,j:e.p.j,tops,spots,tseed:e.tseed,lseed:e.lseed,NREED:e.NREED,st});return true;}
/* a piece's tufts' matrices and colours, in the mockup's order (its random stream carried on), for ms a frame; then its ivy is due */
function wrsTuftMats(e,ms){const q=e.tq,g=q.g,T0=performance.now();
  while(q.i<g.spots.length){if((q.i&63)===0&&performance.now()-T0>ms)break;const i=q.i++,sp=g.spots[i],[M,C]=q.tk(sp,q.R.f,()=>g.hs[i]);q.T.push({M:Float32Array.from(M.elements),c:[C.r,C.g,C.b],x:sp[0],z:sp[1]});}
  WRS.stats.ms+=performance.now()-T0;if(q.i<g.spots.length)return;
  wrsTuftsDone(e,q.T);e.tq=null;e.stage=2;e.st=2;e.ivyQ=e.tops.slice();e.ivyR=WRL.mkRng(e.iseed);e.leaves=[];WRS.stats.gen++;}
/* a tuft stays where the piece's middle at its nearest metre is this stream's water (not a lake, a fall, another stream) */
function wrsTuftsDone(e,T){const s=e.s,o=_wrsO,c=wrbCum(s),out=[];
  for(const t of T){wrbNear(s,t.x,t.z,o);const u=o.rn[1],k=Math.min(s.n-1,Math.floor(u)),m=Math.round(c[k]+(c[k+1]-c[k])*(u-k));if(e.valid[Math.max(0,Math.min(e.valid.length-1,m))])out.push(t);}
  e.tufts=out;WRS.stats.tuft+=out.length;WRS.dirty=true;}
/* run a piece's stones with the heights known; the unknown ones it asked go to a worker (then it runs again), or they are done; then its grass */
function wrsStep(e){if(e.stage===1)return wrsAskT(e);const T0=performance.now(),hc=e.hc,s=e.s,o=_wrsO,miss=[],seen=new Set();
  const H=(x,z)=>{const k=x+','+z,c=hc.get(k);if(c)return c[0];if(!seen.has(k)){seen.add(k);miss.push(x,z);}
    wrbNear(s,x,z,o);return WRB.bankCore(x,z,o.W+1,o.rn,wrbHalf(o.hw,o.s),o.W,o.s).y;};/* (a guess till the worker has measured it: this stream's bank over land 1 m above its water) */
  const out=wrsStones(e,H);WRS.stats.rounds++;WRS.stats.ms+=performance.now()-T0;
  if(miss.length){e.ask=Float64Array.from(miss);return wrsAskH(e);}
  wrsStonesDone(e,out);WRS.stats.ms+=performance.now()-T0;e.stage=1;e.st=0;return true;}
/* an idle worker measures the points asked */
function wrsAskH(e){let w=null;for(const p of WT.pool)if(!p.dead&&!p.busy&&!p.hjob){w=p;break;}if(!w){e.st=0;return false;}
  const b=e.bb,st=WG.stampsIn?WG.stampsIn(b[0]-4,b[1]-4,b[2]+4,b[3]+4):null,id=++WT.reqId,key=e.key,seed=WG.seed,P=e.ask;e.ask=null;WRS.stats.pts+=P.length/2;
  WT.reqs.set(id,{key:'rs'+key,cb:F=>{WRS.pend=Math.max(0,WRS.pend-1);if(WRS.segs.get(key)!==e||seed!==WG.seed)return;if(!F||F.length!==P.length){e.st=0;return;}
    for(let i=0;i<P.length;i+=2)e.hc.set(P[i]+','+P[i+1],[F[i],F[i+1]]);e.st=0;}});
  w.busy++;WRS.pend++;e.st=1;e.tm=performance.now();w.postMessage({rs:1,id,P,st});return true;}
/* the ivy of a piece, a few stones a frame (the mockup's ivySpots one stone at a time, its random stream carried on: the same leaves as all at once) */
function wrsIvy(e,ms){if(!e.ivyQ||!e.ivyQ.length)return;const T0=performance.now(),sh=wrsShapes(5);
  while(e.ivyQ.length&&performance.now()-T0<ms){const top=e.ivyQ.shift(),L=[];WRL.ivySpots({BSH:sh.BSH,bankTops:[top],WLof:st=>st.wl,r:e.ivyR,leafSpots:L,cast:(rc,tmp)=>rc.intersectObject(tmp,false)[0]});/* (three.js's own cast, as the mockup: ~0.1 ms a ray) */
    if(L.length){const ik=WRL.ivyKit();for(const sp of L){const [M,C]=ik(sp);e.leaves.push({M:Float32Array.from(M.elements),c:[C.r,C.g,C.b],x:sp[0].x,z:sp[0].z});}WRS.stats.leaf+=L.length;WRS.dirty=true;}}
  WRS.stats.ivyMs+=performance.now()-T0;}
/* the bigger stones block the hero, as the boulders (OW.props, by 4 m cell) */
function wrsPropsAdd(e){if(!e.props||!OW.propGrid)return;for(const p of e.props){OW.props.push(p);const k=Math.floor(p.x/4)+','+Math.floor(p.z/4);(OW.propGrid.get(k)||OW.propGrid.set(k,[]).get(k)).push(p);}e.pg=OW.propGrid;}
function wrsPropsDrop(e){if(!e.props||e.pg!==OW.propGrid)return;const P=new Set(e.props);OW.props=OW.props.filter(p=>!P.has(p));
  for(const p of e.props){const k=Math.floor(p.x/4)+','+Math.floor(p.z/4),L=OW.propGrid.get(k);if(L){const L2=L.filter(q=>q!==p);if(L2.length)OW.propGrid.set(k,L2);else OW.propGrid.delete(k);}}e.pg=null;}
/* the solids (x, z, radius, 1) of the pieces whose stones are done and whose box meets a rectangle: the river ground's contact shade (wrdetail.js) */
function wrsSolidsIn(x0,z0,x1,z1){const out=[];for(const e of WRS.segs.values()){if(!e.sol||!e.sol.length)continue;const b=e.bb;if(b[2]<x0||b[0]>x1||b[3]<z0||b[1]>z1)continue;
    for(const q of e.sol)if(q[0]>x0-3&&q[0]<x1+3&&q[1]>z0-3&&q[1]<z1+3)out.push(q);}return out;}
/* the meadow's grass at the river (grass.js): the streams near a cell, and the mockup's rule for a plant there - left out only in the water or on a steep
   earth face (WRB.meadowSkip on the nearest gentle stream's rivBank, its y the ground) */
function wrsMeadowSegs(x0,z0,cs){return wgHydroIn(x0-8,z0-8,x0+cs+8,z0+cs+8).segs;}
function wrsMeadowSkip(S,x,z,h){const o=_wrsO;let best=null,bm=0,bW=0;
  for(const s of S){if(x<s.x0||x>s.x1||z<s.z0||z>s.z1)continue;{const t=Math.max(0,Math.min(1,((x-s.ax)*(s.bx-s.ax)+(z-s.az)*(s.bz-s.az))/s.cl2)),ex=s.ax+(s.bx-s.ax)*t-x,ez=s.az+(s.bz-s.az)*t-z;if(ex*ex+ez*ez>s.cap*s.cap)continue;}
    wrbNear(s,x,z,o);if(o.rn[0]>wrbReach(o.hw)||wrbGentle(o.g)<=.5)continue;const bk=WRB.bankCore(x,z,h,o.rn,wrbHalf(o.hw,o.s),o.W,o.s),m=bk.dd-bk.w;if(!best||m<bm){best=bk;bm=m;bW=o.W;}}
  if(!best)return false;best.y=h;return WRB.meadowSkip(best,bW);}
/* the materials: the bank stones' - the mockup's stone material with its bank uniforms (WRL.bankUniforms: PAL.bank, moss .45, moss on top .3, uUpK .16,
   under water fade on), the sun the game's, the point lights left out as the boulders' (wcmLights), its water level per stone (aWli) in place of uWL;
   the grass's and the ivy's - the mockup's, the sun the game's, the game's far-sight air (wdepth.js) given the view position it reads */
function wrsBankMat(){if(WRS.mat)return WRS.mat;const u=WRL.bankUniforms(new THREE.Vector3(0,1,0));u.uSunDir=WCM.sun;
  const m=WRL.boulderMat(u),ob=m.onBeforeCompile;
  m.onBeforeCompile=sh=>{ob(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>',wcmLights());
    sh.vertexShader='attribute float aWli;\nvarying float vWli;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWli=aWli;');
    sh.fragmentShader='varying float vWli;\n'+sh.fragmentShader.replace('float uw=uWL-P.y;','float uw=vWli-P.y;');};
  m.customProgramCacheKey=()=>'wrsbank1';return WRS.mat=wrxLit(m,WRX.k.stone);}/* (the game's light: wrlight.js) */
function wrsShaderMat(m,noSun){if(!noSun)m.uniforms.uSun=WCM.sun;m.vertexShader=m.vertexShader.replace('#include <fog_vertex>','vec3 wdV=mvPosition.xyz;\n#include <fog_vertex>');return m;}
function wrsGrassMat(){return WRS.gmat||(WRS.gmat=wrxOwn(wrsShaderMat(WRL.grassMaterial(new THREE.Vector3(0,1,0))),'grass'));}
function wrsIvyMat(){return WRS.imat||(WRS.imat=wrxOwn(wrsShaderMat(WRL.ivyMaterial(new THREE.Vector3(0,1,0))),'ivy'));}
/* an instanced mesh for a key, with room for n (made anew, bigger, when it has not) */
function wrsFit(key,n,G,mat,shadow,wl,recv){let m=WRS.meshes.get(key);if(m&&m.instanceMatrix.count>=n)return m;const cap=Math.max(n,m?m.instanceMatrix.count*2:16);
  if(m){OW.group.remove(m);}m=new THREE.InstancedMesh(G,mat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  if(wl){const a=new THREE.InstancedBufferAttribute(new Float32Array(cap),1);a.setUsage(THREE.DynamicDrawUsage);G.setAttribute('aWli',a);}
  m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=recv!==false;m.userData.keep=1;OW.group.add(m);WRS.meshes.set(key,m);return m;}
function wrsClear(){for(const e of WRS.segs.values())wrsPropsDrop(e);WRS.segs.clear();for(const m of WRS.meshes.values())if(m.parent)m.parent.remove(m);WRS.meshes.clear();WRS.dirty=true;WRS.pend=0;}
/* per frame: the pieces within WRS.R asked for (nearest first, two at a time), the far ones dropped; the ivy of the near ones; the instances when they or
   the camera changed */
function wrsView(f){if(!OW.group||typeof WRL==='undefined'||!WBLD.shapes)return;
  if(WRS.group!==OW.group||WRS.seed!==WG.seed){if(WRS.group===OW.group)wrsClear();else{WRS.segs.clear();WRS.meshes.clear();WRS.pend=0;}WRS.group=OW.group;WRS.seed=WG.seed;WRS.dirty=true;}
  if(WRS.pg!==OW.propGrid){WRS.pg=OW.propGrid;for(const e of WRS.segs.values())if(e.bank){e.pg=null;wrsPropsAdd(e);}}
  const now=performance.now(),R=WRS.R,HC=WG_CFG.hydroCell;
  if(now-WRS.t>300&&wgHydHas(f.x-R,f.z-R,f.x+R,f.z+R)){WRS.t=now;
    for(const[k,e]of WRS.segs){const d=wrsDist(e,f);if(d>R+100){wrsPropsDrop(e);WRS.segs.delete(k);WRS.dirty=true;}else if(e.st===1&&now-e.tm>20000)e.st=0;}
    for(let j=Math.floor((f.z-R)/HC)-1;j<=Math.floor((f.z+R)/HC)+1;j++)for(let i=Math.floor((f.x-R)/HC)-1;i<=Math.floor((f.x+R)/HC)+1;i++){const key=i+','+j;if(WRS.segs.has(key))continue;
      const p=wgHyd(i,j),s=p&&wgSeg(p);if(!s)continue;const e={key,p,s,st:0};const c=wrbCum(s);if(c[s.n]<6){e.st=3;WRS.segs.set(key,e);continue;}
      e.bb=[s.x0+s.band-12,s.z0+s.band-12,s.x1-s.band+12,s.z1-s.band+12];if(wrsDist(e,f)<=R)WRS.segs.set(key,e);}}
  {let best=null,bd=1e9;for(const e of WRS.segs.values()){if(e.st!==0)continue;const d=wrsDist(e,f);if(d<bd){bd=d;best=e;}}
    if(best&&WRS.pend<2){if(!best.RIV)wrsPrep(best);if(best.ask)wrsAskH(best);else wrsStep(best);}}/* (points asked and no worker free: ask again, no new run) */
  {let best=null,bd=1e9;for(const e of WRS.segs.values()){if(e.st!==4)continue;const d=wrsDist(e,f);if(d<bd){bd=d;best=e;}}if(best)wrsTuftMats(best,2);}
  {let best=null,bd=1e9;for(const e of WRS.segs.values()){if(!e.ivyQ||!e.ivyQ.length)continue;const d=wrsDist(e,f);if(d<bd&&d<WRS.RI+60){bd=d;best=e;}}if(best)wrsIvy(best,2);}
  if(!WRS.dirty&&Math.hypot(f.x-WRS.cx,f.z-WRS.cz)<8)return;WRS.dirty=false;WRS.cx=f.x;WRS.cz=f.z;
  const per=new Map(),put=(k,b)=>{let L=per.get(k);if(!L)per.set(k,L=[]);L.push(b);};let ni=0;
  for(const e of WRS.segs.values()){if(!e.bank||wrsDist(e,f)>R)continue;
    for(const b of e.bank){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>R)continue;put('b'+b.si+'|'+(d<32?5:d<110?4:3),b);}
    for(const b of e.peb){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>WRS.RP)continue;put('p'+b.si+'|'+(d<32?5:d<110?4:3)+'|'+(e.grey?1:0),b);}
    if(e.tufts)for(const b of e.tufts)if(Math.hypot(b.x-f.x,b.z-f.z)<WRS.RT)put('t',b);
    if(e.leaves)for(const b of e.leaves)if(Math.hypot(b.x-f.x,b.z-f.z)<WRS.RI)put('i',b);}
  const seen=new Set();
  for(const[k,L]of per){let m,W=null;
    if(k==='t'){m=wrsFit(k,L.length,WRS.tg||(WRS.tg=WRL.tuftGeometry()),wrsGrassMat(),false,false,false);}
    else if(k==='i'){m=wrsFit(k,L.length,WRS.ig||(WRS.ig=new THREE.PlaneGeometry(1,1).translate(0,-.38,0)),wrsIvyMat(),true,false,false);}
    else{const bank=k[0]==='b',[si,lv,gr]=k.slice(1).split('|').map(Number),G=bank?wrsShapes(lv).BSH[si]:(lv===5?WBLD.shapes[si]:wbldLod(lv,si));
      m=wrsFit(k,L.length,G,bank?wrsBankMat():wbldMaterial(!!gr),lv>3,bank);if(bank)W=G.getAttribute('aWli');}
    seen.add(m);const A=m.instanceMatrix.array,C=m.instanceColor.array;
    L.forEach((b,j)=>{A.set(b.M,j*16);C[j*3]=b.c[0];C[j*3+1]=b.c[1];C[j*3+2]=b.c[2];if(W)W.array[j]=b.wl;});m.count=L.length;m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;
    if(W)W.needsUpdate=true;ni+=L.length;}
  for(const m of WRS.meshes.values())if(!seen.has(m))m.count=0;
  WRS.stats.inst=ni;}
function wrsDist(e,f){const b=e.bb;return Math.hypot(Math.max(0,b[0]-f.x,f.x-b[2]),Math.max(0,b[1]-f.z,f.z-b[3]));}

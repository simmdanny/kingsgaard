/* =====================================================================================================
   THE STREAM'S BANKS (src/world/wrstone.js, river look 3 - tools/mockups/river/HANDOFF.md 3.5): bank stones (clusters of flat slabs, blocks and small
   stones, snapped to the real, wobbly shore and rooted in the bed), rocks in the water (a contact patch on the bed, pebbles round each) and pebble
   clusters at the waterline - the mockup's own code (WRL.riverStones, putStone, placeBoulder: wrlook.js) fed each stream piece of the game's hydrology.
   - Per stream piece (wgSeg of a hydrology point: its curve, its water level falling along it, its half width), seeded from the world's seed and the
     piece: its curve resampled at 1 m is the mockup's RIV; rivHalf is the game's half width with the mockup's noise (wrbHalf), WL the stream's level
     where along it, rivBank this stream's bankCore. The rocks in the water: a rocky reach of 5-8 rocks (4-5.4 m apart, from side to side, 0.15-0.5 of
     the half width out) per ~115 m of river, as the mockup's one in its 115 m; 26 pebble clusters per 115 m (DEVIATIONS D14).
   - The ground under each stone is exact (wgHeightAt's numbers), measured by an idle world worker (wrsHeights, wrbank.js): the placing runs once to
     learn which points it asks for (no height changes where a stone goes, nor the seeded stream), the worker measures them, the placing runs again
     with them. A stone stays only where the ground is this stream's bank (the ground's river values there are this stream's water: not in a lake, a
     fall, another stream's channel - DEVIATIONS D15).
   - Drawn within WRS.R of the camera (pebbles within WRS.RP): the bank stones in the mockup's stone material with the bank uniforms, the water level
     per stone (an instanced attribute: the game's water falls along a stream - D16); the pebbles as field boulders (the boulders' shapes and
     materials, the region's palette: wboulder.js); level 5 / 4 / 3 icospheres by distance, as the boulders. The bigger stones block the hero.
   - Their contact shade (the mockup's aOcc from solids: the rocks in the water at .85 of their reach, every pebble at .95) goes onto the river ground in
     detail (wrdetail.js: wrsSolidsIn, wrsOccRefresh).
   ===================================================================================================== */
const WRS={R:300,RP:150,segs:new Map(),t:0,dirty:true,cx:1e9,cz:1e9,group:null,seed:null,pg:null,shapes:{},mat:null,meshes:new Map(),pend:0,
  stats:{gen:0,ms:0,bank:0,peb:0,inst:0,kept:0,dropped:0,shapeMs:0}};
/* the bank stones' shapes at a level (5: the placing's and the near ones; 4 and 3 when drawing asks) */
function wrsShapes(lv){if(!WRS.shapes[lv]){const T0=performance.now();WRS.shapes[lv]=WRL.bankShapes(lv===5?null:lv);WRS.stats.shapeMs+=performance.now()-T0;}return WRS.shapes[lv];}
const _wrsO={rn:[0,0,1],W:0,hw:0,s:0,g:0,fx:0,fz:0};
const wrsLerp=(A,v)=>{const i=Math.max(0,Math.min(A.length-2,Math.floor(v))),f=Math.min(1,Math.max(0,v-i));return A[i]+(A[i+1]-A[i])*f;};
/* a stream piece's data for the placing: the curve at 1 m (RIV), the half width, water level and distance along the stream there, the seeds, the rocks */
function wrsPrep(e){const s=e.s,P=s.pts,n=s.n,c=wrbCum(s),L=c[n],N=Math.floor(L)+1,RIV=[],hwA=new Float64Array(N),wlA=new Float64Array(N);let k=0;
  for(let i=0;i<N;i++){while(k<n-1&&c[k+1]<i)k++;const t=Math.min(1,Math.max(0,(i-c[k])/((c[k+1]-c[k])||1e-9)));
    RIV.push([P[k*2]+(P[k*2+2]-P[k*2])*t,P[k*2+1]+(P[k*2+3]-P[k*2+1])*t]);hwA[i]=s.hw+(s.hwQ-s.hw)*((k+t)/n);wlA[i]=s.wl[k]+(s.wl[k+1]-s.wl[k])*t;}
  e.RIV=RIV;e.hwA=hwA;e.wlA=wlA;e.s0=wrbS0(s.p);const p=s.p;
  e.seed=wnHashI(p.i,p.j,WG.seed+731)%233280;e.sd=(wnHashI(p.i,p.j,WG.seed+737)%40000)*20;
  /* the rocks in the water: [where along (m), how far out (of the half width, + one side, - the other), size] */
  const rr=WRL.mkRng(wnHashI(p.i,p.j,WG.seed+743)%233280),len=RIV.length,R=[],nR=Math.floor(len/115+rr());
  for(let q=0;q<nR&&len>40;q++){let t=4+rr()*(len-40),sg=rr()<.5?1:-1;const m=5+Math.floor(rr()*4);
    for(let j=0;j<m;j++){const ti=Math.round(t),o=sg*(.15+.35*rr()),sz=.7+.6*rr();if(ti<=len-2&&wrbHalf(wrsLerp(hwA,ti),e.s0+ti)>=1.5)R.push([ti,o,sz]);sg=-sg;t+=4+1.4*rr();}}
  e.ROCKS=R;e.NPEB=Math.floor(26*len/115+rr());
  const RW=new Float64Array(4),mid=RIV[len>>1];wgRegions(mid[0],mid[1],RW);e.grey=Math.min(1,Math.max(0,RW[1]*2+(1-RW[2]-RW[1])*.35))>.5;
  let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const q of RIV){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);z0=Math.min(z0,q[1]);z1=Math.max(z1,q[1]);}e.bb=[x0-12,z0-12,x1+12,z1+12];}
/* the placing (the mockup's code) over a piece, with H the ground */
function wrsPass(e,H){const s=e.s,o=_wrsO,sh=wrsShapes(5),BKI=sh.BSH.map(()=>[]),BINST=WBLD.shapes.map(()=>[]);
  const E={r:WRL.mkRng(e.seed),RIV:e.RIV,rivHalf:(z,v)=>wrbHalf(wrsLerp(e.hwA,v),e.s0+v),WLat:v=>wrsLerp(e.wlA,v),ROCKS:e.ROCKS,NPEB:e.NPEB,sd:e.sd,
    rivBank:(x,z)=>{wrbNear(s,x,z,o);return WRB.bankCore(x,z,0,o.rn,wrbHalf(o.hw,o.s),o.W,o.s);},/* (its y is not read by the placing: no land) */
    solids:[],bankSpots:[],bankTops:[],waterRocks:[],BKI,BINST};
  E.putStone=WRL.bankKit({BSH:sh.BSH,BKIND:sh.BKIND,BKI,H}).putStone;
  E.placeBoulder=WRL.makePlaceBoulder({SHAPES:WBLD.shapes,BINST,H,pathDist:()=>1e9,pathHalfAt:()=>0,rivMask:()=>true});/* (every call has its size: no companions) */
  WRL.riverStones(E);return E;}
/* pass 1: the points the placing asks the ground at; then an idle worker measures them */
function wrsAsk(e){let w=null;for(const p of WT.pool)if(!p.dead&&!p.busy&&!p.hjob){w=p;break;}if(!w)return false;
  if(!e.pts){wrsPrep(e);const pts=[];wrsPass(e,(x,z)=>{pts.push(x,z);return 0;});e.pts=Float64Array.from(pts);}
  if(!e.pts.length){e.st=3;return true;}
  const b=e.bb,st=WG.stampsIn?WG.stampsIn(b[0],b[1],b[2],b[3]):null,id=++WT.reqId,key=e.key,seed=WG.seed;
  WT.reqs.set(id,{key:'rs'+key,cb:F=>wrsTake(key,e,F,seed)});w.busy++;WRS.pend++;e.st=1;e.tm=performance.now();w.postMessage({rs:1,id,P:e.pts,st});return true;}
/* pass 2 with the worker's numbers: the stones, kept where the ground is this stream's bank */
function wrsTake(key,e,F,seed){WRS.pend=Math.max(0,WRS.pend-1);if(WRS.segs.get(key)!==e||seed!==WG.seed)return;const T0=performance.now();
  if(!F||F.length!==e.pts.length){e.st=0;return;}
  const rv=new Map();let q=0,bad=0;const E=wrsPass(e,(x,z)=>{if(e.pts[q*2]!==x||e.pts[q*2+1]!==z)bad++;const h=F[q*2];rv.set(x+','+z,F[q*2+1]);q++;return h;});
  if(bad||q*2!==e.pts.length){console.warn('wrstone: the placing asked other points the second time',key,bad);e.st=3;return;}
  const o=_wrsO,s=e.s,ok=(x,z)=>{const w=rv.get(x+','+z);if(w===undefined||w<-1e8)return false;wrbNear(s,x,z,o);return Math.abs(w-o.W)<.05;};
  const tint=new Map();E.BKI.forEach(L=>L.forEach(b=>tint.set(b.M,b.tint)));
  const bank=[],sol=[],rocks=[],spots=[],tops=[],props=[],keep=new Set();
  for(const st of E.bankSpots){const el=st.M.elements,x=el[12],z=el[14];if(!ok(x,z)){WRS.stats.dropped++;continue;}const c=tint.get(st.M);keep.add(st);spots.push(st);
    bank.push({si:st.si,M:Float32Array.from(el),c:[c.r,c.g,c.b],wl:o.W,x,z,rw:st.rw});if(st.kind!==2&&st.rw>.3)props.push({type:'rock',x,z,r:st.rw*.85,alive:true});}
  for(const t of E.bankTops)if(keep.has(t[0]))tops.push(t);
  for(const st of E.waterRocks)if(keep.has(st))rocks.push([st.x,st.z,st.rw]);
  for(const so of E.solids)if(ok(so[0],so[1]))sol.push(so);
  const peb=[];E.BINST.forEach((L,si)=>L.forEach(b=>{if(!ok(b.x,b.z))return;peb.push({si,M:Float32Array.from(b.M.elements),c:[b.tint.r,b.tint.g,b.tint.b],x:b.x,z:b.z,rw:b.rw,sc:b.sc});sol.push([b.x,b.z,b.rw*0.95,1]);}));
  e.bank=bank;e.peb=peb;e.sol=sol;e.rocks=rocks;e.spots=spots;e.tops=tops;e.props=props;e.st=2;e.pts=null;wrsPropsAdd(e);
  WRS.stats.gen++;WRS.stats.kept+=bank.length;WRS.stats.bank+=bank.length;WRS.stats.peb+=peb.length;WRS.stats.ms+=performance.now()-T0;WRS.dirty=true;
  if(typeof wrsOccRefresh==='function')wrsOccRefresh(e.bb);}
/* the bigger stones block the hero, as the boulders (OW.props, by 4 m cell) */
function wrsPropsAdd(e){if(!e.props||!OW.propGrid)return;for(const p of e.props){OW.props.push(p);const k=Math.floor(p.x/4)+','+Math.floor(p.z/4);(OW.propGrid.get(k)||OW.propGrid.set(k,[]).get(k)).push(p);}e.pg=OW.propGrid;}
function wrsPropsDrop(e){if(!e.props||e.pg!==OW.propGrid)return;const P=new Set(e.props);OW.props=OW.props.filter(p=>!P.has(p));
  for(const p of e.props){const k=Math.floor(p.x/4)+','+Math.floor(p.z/4),L=OW.propGrid.get(k);if(L){const L2=L.filter(q=>q!==p);if(L2.length)OW.propGrid.set(k,L2);else OW.propGrid.delete(k);}}e.pg=null;}
/* the solids (x, z, radius, 1) of the pieces done whose box meets a rectangle: the river ground's contact shade (wrdetail.js) */
function wrsSolidsIn(x0,z0,x1,z1){const out=[];for(const e of WRS.segs.values()){if(e.st!==2||!e.sol.length)continue;const b=e.bb;if(b[2]<x0||b[0]>x1||b[3]<z0||b[1]>z1)continue;
    for(const q of e.sol)if(q[0]>x0-3&&q[0]<x1+3&&q[1]>z0-3&&q[1]<z1+3)out.push(q);}return out;}
/* the material of the bank stones: the mockup's stone material with its bank uniforms (WRL.bankUniforms: PAL.bank, moss .45, moss on top .3, uUpK .16, under
   water fade on), the sun the game's, the point lights left out as the boulders' (wcmLights); its water level per stone (aWli) in place of uWL */
function wrsBankMat(){if(WRS.mat)return WRS.mat;const u=WRL.bankUniforms(new THREE.Vector3(0,1,0));u.uSunDir=WCM.sun;
  const m=WRL.boulderMat(u),ob=m.onBeforeCompile;
  m.onBeforeCompile=sh=>{ob(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>',wcmLights());
    sh.vertexShader='attribute float aWli;\nvarying float vWli;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWli=aWli;');
    sh.fragmentShader='varying float vWli;\n'+sh.fragmentShader.replace('float uw=uWL-P.y;','float uw=vWli-P.y;');};
  m.customProgramCacheKey=()=>'wrsbank1';return WRS.mat=m;}
/* an instanced mesh for a key, with room for n (made anew, bigger, when it has not) */
function wrsFit(key,n,G,mat,shadow,wl){let m=WRS.meshes.get(key);if(m&&m.instanceMatrix.count>=n)return m;const cap=Math.max(n,m?m.instanceMatrix.count*2:16);
  if(m){OW.group.remove(m);}m=new THREE.InstancedMesh(G,mat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  if(wl){const a=new THREE.InstancedBufferAttribute(new Float32Array(cap),1);a.setUsage(THREE.DynamicDrawUsage);G.setAttribute('aWli',a);}
  m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=true;m.userData.keep=1;OW.group.add(m);WRS.meshes.set(key,m);return m;}
function wrsClear(){for(const e of WRS.segs.values())wrsPropsDrop(e);WRS.segs.clear();for(const m of WRS.meshes.values())if(m.parent)m.parent.remove(m);WRS.meshes.clear();WRS.dirty=true;WRS.pend=0;}
/* per frame: the pieces within WRS.R asked for (nearest first, two at a time), the far ones dropped; the instances when they or the camera changed */
function wrsView(f){if(!OW.group||typeof WRL==='undefined'||!WBLD.shapes)return;
  if(WRS.group!==OW.group||WRS.seed!==WG.seed){if(WRS.group===OW.group)wrsClear();else{WRS.segs.clear();WRS.meshes.clear();WRS.pend=0;}WRS.group=OW.group;WRS.seed=WG.seed;WRS.dirty=true;}
  if(WRS.pg!==OW.propGrid){WRS.pg=OW.propGrid;for(const e of WRS.segs.values())if(e.st===2){e.pg=null;wrsPropsAdd(e);}}
  const now=performance.now(),R=WRS.R,HC=WG_CFG.hydroCell;
  if(now-WRS.t>300&&wgHydHas(f.x-R,f.z-R,f.x+R,f.z+R)){WRS.t=now;
    for(const[k,e]of WRS.segs){const d=wrsDist(e,f);if(d>R+100){wrsPropsDrop(e);WRS.segs.delete(k);WRS.dirty=true;}else if(e.st===1&&now-e.tm>20000)e.st=0;}
    for(let j=Math.floor((f.z-R)/HC)-1;j<=Math.floor((f.z+R)/HC)+1;j++)for(let i=Math.floor((f.x-R)/HC)-1;i<=Math.floor((f.x+R)/HC)+1;i++){const key=i+','+j;if(WRS.segs.has(key))continue;
      const p=wgHyd(i,j),s=p&&wgSeg(p);if(!s)continue;const e={key,p,s,st:0};const c=wrbCum(s);if(c[s.n]<6){e.st=3;WRS.segs.set(key,e);continue;}
      e.bb=[s.x0+s.band-12,s.z0+s.band-12,s.x1-s.band+12,s.z1-s.band+12];if(wrsDist(e,f)<=R)WRS.segs.set(key,e);}}
  if(WRS.pend<2){let best=null,bd=1e9;for(const e of WRS.segs.values()){if(e.st!==0)continue;const d=wrsDist(e,f);if(d<bd){bd=d;best=e;}}if(best)wrsAsk(best);}
  if(!WRS.dirty&&Math.hypot(f.x-WRS.cx,f.z-WRS.cz)<8)return;WRS.dirty=false;WRS.cx=f.x;WRS.cz=f.z;
  const per=new Map();let ni=0;
  for(const e of WRS.segs.values()){if(e.st!==2)continue;if(wrsDist(e,f)>R)continue;
    for(const b of e.bank){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>R)continue;const lv=d<32?5:d<110?4:3,k='b'+b.si+'|'+lv;let L=per.get(k);if(!L)per.set(k,L=[]);L.push(b);}
    for(const b of e.peb){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>WRS.RP)continue;const lv=d<32?5:d<110?4:3,k='p'+b.si+'|'+lv+'|'+(e.grey?1:0);let L=per.get(k);if(!L)per.set(k,L=[]);L.push(b);}}
  const seen=new Set();
  for(const[k,L]of per){const bank=k[0]==='b',[si,lv,gr]=k.slice(1).split('|').map(Number);
    const G=bank?wrsShapes(lv).BSH[si]:(lv===5?WBLD.shapes[si]:wbldLod(lv,si)),m=wrsFit(k,L.length,G,bank?wrsBankMat():wbldMaterial(!!gr),lv>3,bank);seen.add(m);
    const A=m.instanceMatrix.array,C=m.instanceColor.array,W=bank?G.getAttribute('aWli').array:null;
    L.forEach((b,j)=>{A.set(b.M,j*16);C[j*3]=b.c[0];C[j*3+1]=b.c[1];C[j*3+2]=b.c[2];if(W)W[j]=b.wl;});m.count=L.length;m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;
    if(W)G.getAttribute('aWli').needsUpdate=true;ni+=L.length;}
  for(const m of WRS.meshes.values())if(!seen.has(m))m.count=0;
  WRS.stats.inst=ni;}
function wrsDist(e,f){const b=e.bb;return Math.hypot(Math.max(0,b[0]-f.x,f.x-b[2]),Math.max(0,b[1]-f.z,f.z-b[3]));}

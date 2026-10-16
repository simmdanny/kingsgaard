/* =====================================================================================================
   BOULDERS (src/world/wboulder.js, world look 2): chunky stones that look broken off the cliffs, seeded and instanced.
   - Shapes (river look, HANDOFF 3.1): fourteen, from the mockup's one generator for every rock, WRL.makeStone (wrlook.js: a box scaled unevenly, 3-6
     plane cuts through corners and edges, an exact bevel by projecting a dense sphere onto the cut box), seeds 1000 + 37 i. Each shape three times -
     the same projection on a level 5, 4 and 3 icosphere (WBLD.l5, WBLD.near, beyond): the same stone with fewer corners; built a few a frame.
   - Places (wbldPlace): per level-0 tile from a hash of the tile and the world's seed, never its stream; the density of before (more on talus and steep
     ground, on the lake region's shores, in the spires and the tablelands, now and then one in a meadow); shape, size (0.22-2.1, mostly small),
     turn and a few percent of brightness from the boulder's own seed; aligned to the ground's slope and sunk 25 % (big) to 45 % (small) of its height;
     two in five of the big ones get 1-3 small companions. Never in the water, on a road, a trail or a village's ground (the grid), nor within reach of a
     cliff's stones (the ground rising steeply within 4 m) - so no boulder sits inside a cliff sheet (wcliff.js).
   - Drawn as one InstancedMesh per shape near (WBLD.near, with shadows) and one far, out to WROCK.R; the instance data (iData: brightness, the ground's
     height there, seed, grey) is an instanced attribute. The stone (river look, HANDOFF 3.2): the mockup's stone material of every rock, WRL.boulderMat,
     with the field boulders' settings (moss on two in five, uUpK .30, no underwater fade) in the region's palette (two materials: brown and grey) - the
     instance data as the mockup's instanceColor (brightness, (ground height + 20) / 60, seed). Under each a soft darker ring on the ground (a flat
     instanced card: the contact the ground's own light cannot know).
   ===================================================================================================== */
const WBLD={N:14,l5:32,near:110,shapes:null,low:null,mat:null,ringMat:null,ringGeo:null,meshes:null,group:null,dirty:true,cx:1e9,cz:1e9,stats:{inst:0,near:0,builds:0}};
/* the shapes (river look): WRL.makeStone (wrlook.js, the mockup's generator) - level 5 for the placing (its ymin, ymax, rx) and the near ones, then 4 and 3,
   the same projection on fewer corners. Level 5 of all fourteen at once (the first boulders need them); the lower levels when drawing asks (wbldLod) */
function wbldShapes(){if(WBLD.shapes)return;const T0=performance.now();WBLD.shapes=[];WBLD.mid=[];WBLD.low=[];for(let i=0;i<WBLD.N;i++)WBLD.shapes.push(WRL.makeStone(1000+i*37));WBLD.stats.shapeMs=performance.now()-T0;}
function wbldLod(lv,i){const A=lv===4?WBLD.mid:WBLD.low;if(!A[i]){const T0=performance.now();A[i]=WRL.makeStone(1000+i*37,{det:lv});WBLD.stats.shapeMs+=performance.now()-T0;}return A[i];}

/* ---------- places: the boulders of one level-0 tile (t.g: its heights and water) ---------- */
function wbldPlace(t){wbldShapes();const S=WG_CFG.tile,g=t.g,n=g.n,s=n+1,R=wnRng(wnHashI(t.ti,t.tk,WG.seed+701)),list=[],props=[];
  const RW=new Float64Array(4);wgRegions(t.x0+S/2,t.z0+S/2,RW);const grey=Math.min(1,Math.max(0,RW[1]*2+(1-RW[2]-RW[1])*.35));
  /* (the roads by their points, from the settlements' stamps: the ground's road marks do not reach every road's edge) */
  const ST=WG.stampsIn?WG.stampsIn(t.x0-12,t.z0-12,t.x0+S+12,t.z0+S+12):null;
  const road=(x,z,r)=>{if(!ST||!ST.nr)return false;const R2=(2.8+r)*(2.8+r);for(let tz=Math.floor((z-6)/8);tz<=Math.floor((z+6)/8);tz++)for(let tx=Math.floor((x-6)/8);tx<=Math.floor((x+6)/8);tx++){const L=ST.rh[tx+','+tz];if(!L)continue;
    for(let i=0;i<L.length;i+=2){const rd=ST.roads[L[i]],j=L[i+1],dx=rd.p[j*2]-x,dz=rd.p[j*2+1]-z;if(dx*dx+dz*dz<R2)return true;}}return false;};
  const lat=(x,z)=>{const i=Math.min(n-1,Math.max(0,((x-t.x0)/2)|0)),k=Math.min(n-1,Math.max(0,((z-t.z0)/2)|0));return k*s+i;};
  const free=(x,z,h,sl,scr)=>{if(scr&&sl>1.2)return false;if(x<t.x0||z<t.z0||x>=t.x0+S||z>=t.z0+S)return false;const k=lat(x,z);if(g.wl[k]>h-.2)return false;
    const c=owCell(x,z),gv=grid[c.r]&&grid[c.r][c.c];if(gv!==0&&gv!==2)return false;if(gv===2&&sl<.5)return false;/* (closed but not steep: a building's ground or the keep) */
    if(typeof wtPathAt==='function'&&wtPathAt(x,z)<1.4)return false;/* (a trail, with a margin: world look 3) */
    /* (within reach of a cliff's stones: the ground rising more steeply than 1 in 1 within 4 m, any way) */
    for(let a=0;a<8;a++){const ca=Math.cos(a*.7854),sa=Math.sin(a*.7854);let hp=h,dp=0;if(scr)continue;for(const d of[1.2,2.5,4]){const hd=owH(x+ca*d,z+sa*d);if((hd-hp)/(d-dp)>1.05)return false;hp=hd;dp=d;}}
    return true;};
  const put=(x,z,seed,fixed,talus,dw)=>{const h=owH(x,z),e=.6,gx=(owH(x+e,z)-owH(x-e,z))/(2*e),gz=(owH(x,z+e)-owH(x,z-e))/(2*e),sl=Math.hypot(gx,gz);if(!free(x,z,h,sl,!!dw))return;
    const r=wnRng(seed),si=Math.floor(r()*WBLD.N),G=WBLD.shapes[si],ud=G.userData,u=r();let sc=fixed||(.22+1.9*Math.pow(u,2.4))*(1+.5*talus*(RW[1]+RW[2]));
    if(dw){sc=Math.min(sc,(dw-1.2)/ud.rx);if(sc<.2)return;}/* (scree: dw, the face's distance - its edge 1.2 m clear of it) */if(road(x,z,ud.rx*sc))return;/* (a road: its edge 2.8 m and more from the road's middle line) */const hg=(ud.ymax-ud.ymin)*sc;
    const f=.45-.20*Math.min(1,Math.max(0,(sc-.3)/1.6)),nrm=new THREE.Vector3(-gx,1,-gz).normalize();/* (sunk 45 % of its height when small, 25 % when big) */
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),nrm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r()*6.283));
    const M=new THREE.Matrix4().compose(new THREE.Vector3(x,h-f*hg-ud.ymin*sc,z),q,new THREE.Vector3(sc,sc,sc));
    list.push({si,M:Float32Array.from(M.elements),d:[r(),h,r(),grey],x,z,h,nx:nrm.x,ny:nrm.y,nz:nrm.z,rw:ud.rx*sc,sc});
    if(sc>.35)props.push({type:'rock',x,z,r:ud.rx*sc*.85,alive:true});
    if(!fixed&&!dw&&sc>.6&&r()<.4){const k=1+Math.floor(r()*3);for(let j=0;j<k;j++){const a=r()*6.283,d=sc*ud.rx*(1.3+r()),cs=sc*(.22+.3*r());put(x+Math.cos(a)*d,z+Math.sin(a)*d,seed*7+j*13+1,cs,0);}}};
  const tries=6+Math.round(10*(RW[1]+RW[2])+4*RW[3]);
  for(let q=0;q<tries;q++){const x=t.x0+R()*S,z=t.z0+R()*S,pk=R(),sd=Math.floor(R()*2147483647),k=lat(x,z),h=owH(x,z);
    const e=1.5,sl=Math.hypot(owH(x+e,z)-owH(x-e,z),owH(x,z+e)-owH(x,z-e))/(2*e),talus=wnS(sl,.3,.75),shore=g.wl[k]>-1e8?1-wnS(h-g.wl[k],.5,4):0;
    if(pk>.12+talus*.85+shore*.6*RW[3]+.25*(RW[1]+RW[2]))continue;put(x,z,sd,0,talus);}
  /* scree (the cliff rework): at the foot of a tall cliff - a rise of 6 m or more over 4 m of the lattice - boulders gather, big and small, thick by the
     wall and thinning out into the grass; how far out each one is is measured to the face itself (the ground rising 3 m), and a boulder keeps its edge
     1.2 m clear of it (a column stands out up to 2.6 m: the biggest rest against the columns). Their own stream, from a hash of the tile */
  {const Rs=wnRng(wnHashI(t.ti*31+7,t.tk*17+3,WG.seed+709));for(let k=0;k<=n;k+=2)for(let i=0;i<=n;i+=2){const h0=g.h[k*s+i];
    for(let dir=0;dir<4;dir++){const di=dir===0?2:dir===2?-2:0,dk=dir===1?2:dir===3?-2:0,ii=i+di,kk=k+dk;if(ii<0||kk<0||ii>n||kk>n)continue;if(g.h[kk*s+ii]-h0<6)continue;if(Rs()>.75)continue;
      const ux=di/2,uz=dk/2,m=2+Math.floor(Rs()*4);for(let j=0;j<m;j++){const d0=-1+9*Math.pow(Rs(),1.6),lat=(Rs()-.5)*5,x=t.x0+i*2-ux*d0-uz*lat,z=t.z0+k*2-uz*d0+ux*lat,u=Rs(),sd=Math.floor(Rs()*2147483647);
        /* (the face: the ground 3 m over this point, toward the wall, in half-metre steps) */
        const hb=owH(x,z);let dF=-1;for(let e=0;e<=8;e+=.5)if(owH(x+ux*e,z+uz*e)>hb+3){dF=e;break;}if(dF<0)continue;
        const sc=(.3+1.7*Math.pow(u,1.4))*(1-.55*Math.min(1,dF/9));put(x,z,sd,sc,0,dF);}}}}
  return {list,props};}

/* ---------- the material (river look, HANDOFF 3.2): the mockup's stone material (WRL.boulderMat) with the field boulders' uniforms - the mockup's boulderU:
   palU(palette, .7, 0), uMossP .4, uMossTop 0, uUpK .30, uUW 0 - one for the brown palette and one for the grey; the sun is the game's (WCM.sun).
   The three.js point lights are left out of its program, as the cliff's (wcmLights: with them the stone's work ran out of registers) ---------- */
function wbldMaterial(grey){const k=grey?'g':'b';if(WBLD.mats&&WBLD.mats[k])return WBLD.mats[k];WBLD.mats=WBLD.mats||{};
  const u=WRL.palU(grey?'grey':'brown',.7,0);u.uSunDir=WCM.sun;u.uDbg={value:0};u.uMossP={value:.4};u.uIvy={value:0};u.uMossTop={value:0};u.uUpK={value:.30};u.uUW={value:0};u.uWL={value:0};
  const m=WRL.boulderMat(u),ob=m.onBeforeCompile;m.onBeforeCompile=sh=>{ob(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>',wcmLights());};
  return WBLD.mats[k]=wrxLit(m,WRX.k.stone);}/* (the game's light: wrlight.js) */
/* the contact ring: a flat card under each boulder, darkest just outside its foot */
function wbldRing(){if(WBLD.ringMat)return;const g=new THREE.PlaneGeometry(2,2);g.rotateX(-Math.PI/2);WBLD.ringGeo=g;
  /* (a plain material with a radial alpha: the game's fog patches - wdepth.js - apply to it as to every other) */
  const S=64,d=new Uint8Array(S*S*4);for(let j=0;j<S;j++)for(let i=0;i<S;i++){const r=Math.hypot(i-S/2+.5,j-S/2+.5)/(S/2),k=(j*S+i)*4,a=(1-wnS(r,.62,1))*wnS(r,.25,.6)*.42+(1-wnS(r,0,.62))*.18;d[k]=8;d[k+1]=10;d[k+2]=5;d[k+3]=Math.round(255*a);}
  const tx=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);tx.magFilter=tx.minFilter=THREE.LinearFilter;tx.needsUpdate=true;
  WBLD.ringMat=new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});}

/* ---------- drawing: per shape, palette and level one InstancedMesh (level 5 within WBLD.l5, 4 within WBLD.near - both with shadows - 3 beyond), filled from
   the tiles' lists when they change or the camera has moved; the instance data as the mockup's instanceColor (brightness, (ground + 20) / 60, seed) ---------- */
const WBLD_LV=[5,4,3];
function wbldMk(G,mat,cap,shadow){const m=new THREE.InstancedMesh(G,mat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=true;m.userData.keep=1;OW.group.add(m);return m;}
function wbldMeshes(){if(WBLD.meshes&&WBLD.group===OW.group&&WBLD.ringMesh&&WBLD.ringMesh.parent===OW.group)return;wbldShapes();wbldRing();WBLD.group=OW.group;WBLD.meshes=[];
  for(let i=0;i<WBLD.N;i++)WBLD.meshes.push({});/* (slot[lv+pal]: made when first wanted) */
  const rm=new THREE.InstancedMesh(WBLD.ringGeo,WBLD.ringMat,512);rm.count=0;rm.frustumCulled=false;rm.renderOrder=1;rm.userData.keep=1;OW.group.add(rm);WBLD.ringMesh=rm;WBLD.dirty=true;}
/* the mesh of a shape at a level in a palette, with room for n (made anew, bigger, when it has not) */
function wbldFit(i,lv,grey,n){const slot=WBLD.meshes[i],key=lv+(grey?'g':'b');let m=slot[key];if(m&&m.instanceMatrix.count>=n)return m;
  const cap=Math.max(n,m?m.instanceMatrix.count*2:16),G=lv===5?WBLD.shapes[i]:wbldLod(lv,i);if(m){OW.group.remove(m);m.dispose&&m.dispose();}
  return slot[key]=wbldMk(G,wbldMaterial(grey),cap,lv>3);}
function wbldView(f){if(!OW.group)return;wbldMeshes();if(!WBLD.dirty&&Math.hypot(f.x-WBLD.cx,f.z-WBLD.cz)<12)return;WBLD.dirty=false;WBLD.cx=f.x;WBLD.cz=f.z;WBLD.stats.builds++;
  const per=new Map(),all=[];/* (key: shape, level, palette) */
  for(const t of WT.tiles.values()){const r=t.rocks;if(!r||!r.list)continue;for(const b of r.list){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>WROCK.R+60||(b.sc<.5&&d>260))continue;
    const lv=d<WBLD.l5?5:d<WBLD.near?4:3,k=b.si+'|'+lv+'|'+(b.d[3]>.5?1:0);let L=per.get(k);if(!L)per.set(k,L=[]);L.push(b);all.push(b);}}
  let ni=0,nn=0;const seen=new Set();
  for(const [k,L] of per){const [si,lv,gr]=k.split('|').map(Number),m=wbldFit(si,lv,gr,L.length),A=m.instanceMatrix.array,C=m.instanceColor.array;seen.add(m);
    L.forEach((b,j)=>{A.set(b.M,j*16);C[j*3]=b.d[0];C[j*3+1]=(b.d[1]+20)/60;C[j*3+2]=b.d[2];});m.count=L.length;m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;ni+=L.length;if(lv>3)nn+=L.length;}
  for(const slot of WBLD.meshes)for(const key in slot){const m=slot[key];if(!seen.has(m)&&m.count){m.count=0;}}
  /* the contact rings: of the boulders within the near distance, flat on the ground's slope */
  {let rm=WBLD.ringMesh;const L=all.filter(b=>Math.hypot(b.x-f.x,b.z-f.z)<WBLD.near*1.6);if(rm.instanceMatrix.count<L.length){const nm=new THREE.InstancedMesh(WBLD.ringGeo,WBLD.ringMat,L.length*2);nm.frustumCulled=false;nm.renderOrder=1;nm.userData.keep=1;OW.group.remove(rm);OW.group.add(nm);rm=WBLD.ringMesh=nm;}
    const M=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),sv=new THREE.Vector3();
    L.forEach((b,j)=>{q.setFromUnitVectors(up,v.set(b.nx,b.ny,b.nz));const s=b.rw*1.35;M.compose(sv.set(b.x,b.h+.04,b.z),q,new THREE.Vector3(s,1,s));rm.setMatrixAt(j,M);});rm.count=L.length;rm.instanceMatrix.needsUpdate=true;}
  WBLD.stats.inst=ni;WBLD.stats.near=nn;}
function wbldReset(){WBLD.meshes=null;WBLD.group=null;WBLD.ringMesh=null;WBLD.dirty=true;WBLD.cx=WBLD.cz=1e9;}

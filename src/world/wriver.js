/* =====================================================================================================
   RIVERS AND STREAMS (src/world/wriver.js, v48; river look 5): the water of every stream drawn as a ribbon along its own curve. The ground's chunks no
   longer draw a stream's water (wtBuild leaves out cells that are all stream); lakes and the elderglade's water stay theirs, and a ribbon stops where a
   lake or the world's water takes over (where the hydrology says the water there stands still), so two surfaces never lie on top of each other.
   - River look (HANDOFF 3.8): where the water is nearly level (wrbGentle: rivBank's channel and banks, wrbank.js) the ribbon is the mockup's
     (WRL.waterRibbon: across the widest wobble, half width + 2.6 m, 25 columns, a section a metre; aFlow down the curve, aSpd = clamp(2.8 / half
     width, .55, 1.7)) at the stream's own water level, in the mockup's water (wwater.js). A stream's pieces meet section to section: the section at
     a joint is the same from both sides (the same point, width, level and direction - the curve's points a section away on either side of it).
     Beyond WRV.near a cell's ribbons are lighter: 5 columns, a section every 4 m (the surface is flat across: the same water).
   - Where it falls (rapids, falls - waterfalls are not the river look's, D5) the old ribbon and water stay: three vertices across, white water.
   The ribbons are built per 256 m cell (every stream belongs to the cell its curve starts in) within reach of the ground chunks that carve the
   channels (512 m x WT.K + 320 m), a couple of cells a frame, again when a cell crosses WRV.near, and dropped beyond. Pure functions of the world.
   ===================================================================================================== */
const _wrvO={h:0,wl:0,fx:0,fz:0};
/* a stream's water from its start to its end: where still water takes over at either end it stops; then by runs of its 24 pieces, the mockup's ribbon
   where the water is nearly level, the old one where it falls */
function wrvRibbon(s,ox,oz,pos,aD,idx,nw,lod){const P=s.pts,n=s.n,H=wgHydroIn(s.x0,s.z0,s.x1,s.z1),c=wgCtx(s.x0,s.z0,s.x1,s.z1,0);
  let k0=0,k1=n;/* (where still water takes over at either end) */
  const still=k=>{const x=P[k*2],z=P[k*2+1];wgHydroApply(x,z,wgH0(x,z,null,c),H,_wrvO);return _wrvO.wl>-1e8&&_wrvO.fx*_wrvO.fx+_wrvO.fz*_wrvO.fz<.25;};
  while(k0<n&&still(k0))k0++;if(k0>=n)return;if(k0>0)k0--;
  for(let k=k0+1;k<=n;k++)if(still(k)){k1=k;break;}
  if(k1-k0<1)return;
  if(!nw){wrvOld(s,k0,k1,ox,oz,pos,aD,idx);return;}
  const cum=wrbCum(s),gentle=k=>wrbGentle(Math.abs(s.wl[k+1]-s.wl[k])/((cum[k+1]-cum[k])||1e-9))>.5;
  let k=k0;while(k<k1){const g=gentle(k);let e=k+1;while(e<k1&&gentle(e)===g)e++;if(g)wrvNew(s,k,e,ox,oz,nw,lod);else wrvOld(s,k,e,ox,oz,pos,aD,idx);k=e;}}
/* the old ribbon over pieces k0..k1: three vertices across at every point of its curve (edge, middle, edge), at its water level */
function wrvOld(s,k0,k1,ox,oz,pos,aD,idx){const P=s.pts,n=s.n,b0=pos.length/3;
  for(let k=k0;k<=k1;k++){const ka=Math.max(0,k-1),kb=Math.min(n,k+1);let tx=P[kb*2]-P[ka*2],tz=P[kb*2+1]-P[ka*2+1];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
    const hw=s.hw+(s.hwQ-s.hw)*k/n+WG_MG*.85,/* (over the channel and most of its shallow wet margin: the water fades out over the margin, the bank starts beyond) */x=P[k*2],z=P[k*2+1],y=s.wl[k],ds=Math.hypot(P[kb*2]-P[ka*2],P[kb*2+1]-P[ka*2+1])||1,sp=.55+.45*Math.min(1,Math.abs(s.wl[ka]-s.wl[kb])/ds*25);
    for(const u of[-1,0,1]){pos.push(x-tz*hw*u-ox,y,z+tx*hw*u-oz);aD.push(u?0:s.dep*.9+.3,tx*sp,tz*sp);}}
  for(let k=0;k<k1-k0;k++){const r0=b0+k*3,r1=r0+3;idx.push(r0,r0+1,r1,r0+1,r1+1,r1,r0+1,r0+2,r1+1,r0+2,r1+2,r1+1);/* (facing up) */}}
/* a stream's point at m metres along its curve: x, z, the hydrology's half width and water level there (as wrbNear and wrsCurve have them) */
function wrvAt(s,m){const P=s.pts,n=s.n,c=wrbCum(s);let k=0;while(k<n-1&&c[k+1]<m)k++;const t=Math.min(1,Math.max(0,(m-c[k])/((c[k+1]-c[k])||1e-9)));
  return[P[k*2]+(P[k*2+2]-P[k*2])*t,P[k*2+1]+(P[k*2+3]-P[k*2+1])*t,s.hw+(s.hwQ-s.hw)*((k+t)/n),s.wl[k]+(s.wl[k+1]-s.wl[k])*t];}
/* the main stream coming into a stream piece (the upstream neighbour with most water, as wrbS0 follows it) */
function wrvUp(s){const p=s.p;let up=null,ua=-1;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const u=wgHyd(p.i+di,p.j+dj);if(wgDown(u)===wgKey(p.i,p.j)){const a=wgAcc(u);if(a>ua){ua=a;up=u;}}}return up&&wgSeg(up);}
/* the mockup's ribbon over pieces ka..kb: sections at the metres along it (every st), its ends exact; the end sections' directions from the points a section
   beyond (in this piece, or the next / the main previous piece at a joint) - those points' own sections are left out */
function wrvNew(s,ka,kb,ox,oz,nw,lod){const cum=wrbCum(s),L=cum[s.n],m0=cum[ka],m1=cum[kb],st=lod?1:4,C=lod?25:5,ms=[m0];
  for(let m=Math.floor(m0/st)*st+st;m<m1-1e-6;m+=st)ms.push(m);ms.push(m1);if(ms.length<2)return;
  const pts=ms.map(m=>wrvAt(s,m));let pre=null,post=null;
  if(m0>1e-6)pre=wrvAt(s,Math.max(0,m0-st));else{const up=wrvUp(s);if(up){const cu=wrbCum(up);pre=wrvAt(up,Math.max(0,cu[up.n]-st));}}
  if(m1<L-1e-6)post=wrvAt(s,Math.min(L,m1+st));else{const dn=s.q&&wgSeg(s.q);if(dn)post=wrvAt(dn,Math.min(wrbCum(dn)[dn.n],st));}
  const A=[...(pre?[pre]:[]),...pts,...(post?[post]:[])],off=pre?1:0,j0=off,j1=A.length-(post?1:0),s0=wrbS0(s.p);
  const at=j=>Math.max(0,Math.min(ms.length-1,j-off));
  const g=WRL.waterRibbon({RIV:A.map(q=>[q[0],q[1]]),C,ext:false,rivHalf:(z,j)=>wrbHalf(pts[at(j)][2],s0+ms[at(j)]),WLat:j=>pts[at(j)][3]});
  const pa=g.getAttribute('position').array,fa=g.getAttribute('aFlow').array,sa=g.getAttribute('aSpd').array,b0=nw.P.length/3;
  for(let j=j0;j<j1;j++)for(let q=0;q<C;q++){const v=j*C+q;nw.P.push(pa[v*3]-ox,pa[v*3+1],pa[v*3+2]-oz);nw.F.push(fa[v*2],fa[v*2+1]);nw.S.push(sa[v]);}
  for(let j=0;j<j1-j0-1;j++)for(let q=0;q<C-1;q++){const a=b0+j*C+q,b=a+C;nw.I.push(a,b,a+1,a+1,b,b+1);}
  g.dispose();}
const WRV={on:false,group:null,cells:new Map(),cs:256,t:0,near:420,stats:{built:0,ms:0}};
function wrvInit(group){WRV.group=group;WRV.on=true;}
function wrvReset(){for(const c of WRV.cells.values())wrvDrop(c);WRV.cells.clear();WRV.on=false;}
function wrvDrop(c){if(!c)return;for(const m of[c.mesh,c.wmesh])if(m){if(m.parent)m.parent.remove(m);m.geometry.dispose();}}
const wrvRange=()=>512*WT.K+320;
/* per frame (from wtUpdate): the cells within reach built (two a frame, or all at once when forced) - again when one crosses WRV.near - the others dropped */
function wrvUpdate(cam,force){if(!WRV.on||!WG.on)return;const now=performance.now();if(!force&&now-WRV.t<200)return;WRV.t=now;const R=wrvRange(),cs=WRV.cs,cx=cam.x,cz=cam.z;
  const a0=Math.floor((cx-R)/cs),a1=Math.floor((cx+R)/cs),b0=Math.floor((cz-R)/cs),b1=Math.floor((cz+R)/cs),want=new Set();let built=0;
  for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){const dx=Math.max(0,Math.abs(cx-(a+.5)*cs)-cs/2),dz=Math.max(0,Math.abs(cz-(b+.5)*cs)-cs/2),d2=dx*dx+dz*dz;if(d2>R*R)continue;
    const k=a+','+b,c0=WRV.cells.get(k),lod=d2<WRV.near*WRV.near?1:0;want.add(k);if(c0&&(c0.lod===lod||(c0.lod===1&&d2<(WRV.near+60)*(WRV.near+60))))continue;/* (a near cell stays near 60 m further: no rebuilding back and forth) */
    if(!force&&built>=2)continue;const c=wrvBuild(a,b,lod);if(c0)wrvDrop(c0);WRV.cells.set(k,c);if(c.mesh)WRV.group.add(c.mesh);if(c.wmesh)WRV.group.add(c.wmesh);built++;}
  for(const [k,c] of WRV.cells)if(!want.has(k)){wrvDrop(c);WRV.cells.delete(k);}}
/* one cell: the ribbons of the streams that start in it, merged into one mesh of each water */
function wrvBuild(a,b,lod){const T0=performance.now(),cs=WRV.cs,HC=WG_CFG.hydroCell,x0=a*cs,z0=b*cs,pos=[],aD=[],idx=[],nw=typeof WRL!=='undefined'&&typeof wwMaterial==='function'?{P:[],F:[],S:[],I:[]}:null;
  for(let j=Math.floor(z0/HC)-1;j<=Math.floor((z0+cs)/HC)+1;j++)for(let i=Math.floor(x0/HC)-1;i<=Math.floor((x0+cs)/HC)+1;i++){const p=wgHyd(i,j);if(p.x<x0||p.x>=x0+cs||p.z<z0||p.z>=z0+cs)continue;
    const s=wgSeg(p);if(s)wrvRibbon(s,x0,z0,pos,aD,idx,nw,lod);}
  const c={a,b,lod,mesh:null,wmesh:null,bb:[x0,z0,x0+cs,z0+cs]};
  if(idx.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aD',new THREE.Float32BufferAttribute(aD,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
    const m=new THREE.Mesh(g,wtWaterMat());m.position.set(x0,0,z0);m.renderOrder=2;m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();c.mesh=m;}
  if(nw&&nw.I.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(nw.P,3));g.setAttribute('aFlow',new THREE.Float32BufferAttribute(nw.F,2));g.setAttribute('aSpd',new THREE.Float32BufferAttribute(nw.S,1));
    g.setIndex(nw.I);g.computeBoundingSphere();const m=new THREE.Mesh(g,wwMaterial());m.position.set(x0,0,z0);m.renderOrder=5;m.matrixAutoUpdate=false;m.updateMatrix();c.wmesh=m;
    let bx0=1e9,bz0=1e9,bx1=-1e9,bz1=-1e9;for(let v=0;v<nw.P.length;v+=3){const x=nw.P[v]+x0,z=nw.P[v+2]+z0;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(z<bz0)bz0=z;if(z>bz1)bz1=z;}c.bb=[bx0,bz0,bx1,bz1];}
  WRV.stats.built++;WRV.stats.ms+=performance.now()-T0;return c;}

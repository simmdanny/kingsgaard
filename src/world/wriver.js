/* =====================================================================================================
   RIVERS AND STREAMS (src/world/wriver.js, v48): the water of every stream drawn as a ribbon along its own curve - smooth banks instead of the
   ground lattice's staircase, deepest (and darkest) along the middle and fading to nothing at both edges, its flow running down the curve (the
   water material's streaks), steep where the stream falls (white water). The ground's chunks no longer draw a stream's water (wtBuild leaves out
   cells that are all stream); lakes and the elderglade's water stay theirs, and a ribbon stops where a lake or the world's water takes over
   (where the hydrology says the water there stands still), so two surfaces never lie on top of each other.
   The ribbons are built per 256 m cell (every stream belongs to the cell its curve starts in) within reach of the ground chunks that carve the
   channels (512 m x WT.K + 320 m), a couple of cells a frame, and dropped beyond. Pure functions of the world: the same ribbons every time.
   ===================================================================================================== */
const WRV={on:false,group:null,cells:new Map(),cs:256,t:0,stats:{built:0,ms:0}};
function wrvInit(group){WRV.group=group;WRV.on=true;}
function wrvReset(){for(const c of WRV.cells.values())wrvDrop(c);WRV.cells.clear();WRV.on=false;}
function wrvDrop(c){if(c&&c.mesh){if(c.mesh.parent)c.mesh.parent.remove(c.mesh);c.mesh.geometry.dispose();}}
const wrvRange=()=>512*WT.K+320;
/* per frame (from wtUpdate): the cells within reach built (two a frame, or all at once when forced), the others dropped */
function wrvUpdate(cam,force){if(!WRV.on||!WG.on)return;const now=performance.now();if(!force&&now-WRV.t<200)return;WRV.t=now;const R=wrvRange(),cs=WRV.cs,cx=cam.x,cz=cam.z;
  const a0=Math.floor((cx-R)/cs),a1=Math.floor((cx+R)/cs),b0=Math.floor((cz-R)/cs),b1=Math.floor((cz+R)/cs),want=new Set();let built=0;
  for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){const dx=Math.max(0,Math.abs(cx-(a+.5)*cs)-cs/2),dz=Math.max(0,Math.abs(cz-(b+.5)*cs)-cs/2);if(dx*dx+dz*dz>R*R)continue;
    const k=a+','+b;want.add(k);if(!WRV.cells.has(k)){if(!force&&built>=2)continue;const c=wrvBuild(a,b);WRV.cells.set(k,c);if(c.mesh)WRV.group.add(c.mesh);built++;}}
  for(const [k,c] of WRV.cells)if(!want.has(k)){wrvDrop(c);WRV.cells.delete(k);}}
/* one cell: the ribbons of the streams that start in it, merged into one mesh */
function wrvBuild(a,b){const T0=performance.now(),cs=WRV.cs,HC=WG_CFG.hydroCell,x0=a*cs,z0=b*cs,pos=[],aD=[],idx=[];
  for(let j=Math.floor(z0/HC)-1;j<=Math.floor((z0+cs)/HC)+1;j++)for(let i=Math.floor(x0/HC)-1;i<=Math.floor((x0+cs)/HC)+1;i++){const p=wgHyd(i,j);if(p.x<x0||p.x>=x0+cs||p.z<z0||p.z>=z0+cs)continue;
    const s=wgSeg(p);if(s)wrvRibbon(s,x0,z0,pos,aD,idx);}
  const c={a,b,mesh:null};
  if(idx.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aD',new THREE.Float32BufferAttribute(aD,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
    const m=new THREE.Mesh(g,wtWaterMat());m.position.set(x0,0,z0);m.renderOrder=2;m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();c.mesh=m;}
  WRV.stats.built++;WRV.stats.ms+=performance.now()-T0;return c;}
/* a stream's ribbon: three vertices across at every point of its curve (edge, middle, edge), at its water level; where the water there stands still
   (a lake or the world's water has it) the ribbon ends - it reaches the first such point, so it meets the still water at its own level */
const _wrvO={h:0,wl:0,fx:0,fz:0};
function wrvRibbon(s,ox,oz,pos,aD,idx){const P=s.pts,n=s.n,H=wgHydroIn(s.x0,s.z0,s.x1,s.z1),c=wgCtx(s.x0,s.z0,s.x1,s.z1,0);
  let k0=0,k1=n;/* (where still water takes over at either end) */
  const still=k=>{const x=P[k*2],z=P[k*2+1];wgHydroApply(x,z,wgH0(x,z,null,c),H,_wrvO);return _wrvO.wl>-1e8&&_wrvO.fx*_wrvO.fx+_wrvO.fz*_wrvO.fz<.25;};
  while(k0<n&&still(k0))k0++;if(k0>=n)return;if(k0>0)k0--;
  for(let k=k0+1;k<=n;k++)if(still(k)){k1=k;break;}
  if(k1-k0<1)return;const b0=pos.length/3;
  for(let k=k0;k<=k1;k++){const ka=Math.max(0,k-1),kb=Math.min(n,k+1);let tx=P[kb*2]-P[ka*2],tz=P[kb*2+1]-P[ka*2+1];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
    const hw=s.hw+(s.hwQ-s.hw)*k/n+WG_MG*.85,/* (over the channel and most of its shallow wet margin: the water fades out over the margin, the bank starts beyond) */x=P[k*2],z=P[k*2+1],y=s.wl[k],ds=Math.hypot(P[kb*2]-P[ka*2],P[kb*2+1]-P[ka*2+1])||1,sp=.55+.45*Math.min(1,Math.abs(s.wl[ka]-s.wl[kb])/ds*25);
    for(const u of[-1,0,1]){pos.push(x-tz*hw*u-ox,y,z+tx*hw*u-oz);aD.push(u?0:s.dep*.9+.3,tx*sp,tz*sp);}}
  for(let k=0;k<k1-k0;k++){const r0=b0+k*3,r1=r0+3;idx.push(r0,r0+1,r1,r0+1,r1+1,r1,r0+1,r0+2,r1+1,r0+2,r1+2,r1+1);/* (facing up) */}}

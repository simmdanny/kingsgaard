/* =====================================================================================================
   TRAILS (src/world/wtrail.js, world look 3): a road between two hamlets (both of its villages tier 1 or 2: tiny or small; never a road to the keep)
   is a worn dirt trail, not a drawn strip - a mask the ground's material reads (wterrain.js, its WT_GLSL_COLOR): the distance to the trail's middle
   against its half width (wgTrailHW, wgen.js: 0.8 m, 0.6-1.4 times along it with the road's own noise), the edge broken by noise over a band of
   45 % of the width. The generator dips the ground 9 cm under it (wgStampApply), so the trail is walked in as it is seen.
   - The trails' segments in a hash of 16 m cells (wtpAddRoad as the roads are found, WS.onRoad); wtPathAt(x,z): how far outside the trail's edge a
     point is (negative on it; 99 far from any) - the one thing props ask (boulders, the grass).
   - For the material a window of 512 m round the camera, 0.5 m a texel (WTP.tex: the distance to the nearest trail's middle up to 3 m, and its half
     width there), made again when the camera has gone 96 m from its middle or a trail has come.
   ===================================================================================================== */
const WTP={N:1024,res:.5,R:3,cell:16,x0:0,z0:0,cx:1e9,cz:1e9,dirty:false,segs:new Map(),road:new Map(),n:0,tex:null,data:null,uO:{value:null},uT:{value:null},stats:{fills:0,ms:0,roads:0}};
function wtpInit(){if(WTP.tex)return;const N=WTP.N;WTP.data=new Uint8Array(N*N*4).fill(255);const t=new THREE.DataTexture(WTP.data,N,N,THREE.RGBAFormat);t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.needsUpdate=true;WTP.tex=t;WTP.uT.value=t;WTP.uO.value=new THREE.Vector4(0,0,N*WTP.res,0);}
function wtpReset(){WTP.segs.clear();WTP.road.clear();WTP.n=0;WTP.cx=WTP.cz=1e9;WTP.dirty=false;if(WTP.uO.value)WTP.uO.value.w=0;}
/* a road found: a trail's segments into the hash; a road's points into its own hash (4 m cells), and the trails along it go - where a trail shares its way
   with a road (to the keep, between bigger villages) the road is drawn, as the generator leaves the dip out there (wgStampApply) */
const wtpNearRoad=(x,z)=>{for(let cz=Math.floor((z-3)/4);cz<=Math.floor((z+3)/4);cz++)for(let cx=Math.floor((x-3)/4);cx<=Math.floor((x+3)/4);cx++){const L=WTP.road.get(cx+','+cz);if(L)for(const q of L)if((q[0]-x)*(q[0]-x)+(q[1]-z)*(q[1]-z)<9)return true;}return false;};
function wtpAddRoad(r){if(!r)return;const p=r.pts,C=WTP.cell;
  if(!r.trail){for(const q of p){const k=Math.floor(q[0]/4)+','+Math.floor(q[1]/4);let L=WTP.road.get(k);if(!L)WTP.road.set(k,L=[]);L.push(q);}
    if(WTP.n){const cells=new Set();for(const q of p)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)cells.add(Math.floor(q[0]/C+dx*.25)+','+Math.floor(q[1]/C+dz*.25));
      for(const key of cells){const L=WTP.segs.get(key);if(!L)continue;const L2=L.filter(s=>!(wtpNearRoad(s[0],s[1])&&wtpNearRoad(s[2],s[3])));if(L2.length!==L.length){WTP.dirty=true;if(L2.length)WTP.segs.set(key,L2);else WTP.segs.delete(key);}}}return;}
  WTP.stats.roads++;
  for(let k=0;k+1<p.length;k++){const a=p[k],b=p[k+1];if(wtpNearRoad(a[0],a[1])&&wtpNearRoad(b[0],b[1]))continue;const s=[a[0],a[1],b[0],b[1],wgTrailHW(k,r.sd),wgTrailHW(k+1,r.sd)];
    for(let cz=Math.floor((Math.min(a[1],b[1])-2)/C);cz<=Math.floor((Math.max(a[1],b[1])+2)/C);cz++)for(let cx=Math.floor((Math.min(a[0],b[0])-2)/C);cx<=Math.floor((Math.max(a[0],b[0])+2)/C);cx++){
      const key=cx+','+cz;let L=WTP.segs.get(key);if(!L)WTP.segs.set(key,L=[]);L.push(s);}WTP.n++;}
  WTP.dirty=true;}
/* the distance from a point to a segment and the half width there: out[0], out[1] */
function wtpSeg(s,x,z,out){const ux=s[2]-s[0],uz=s[3]-s[1],l2=ux*ux+uz*uz,t=l2>0?Math.max(0,Math.min(1,((x-s[0])*ux+(z-s[1])*uz)/l2)):0,ex=x-s[0]-ux*t,ez=z-s[1]-uz*t;out[0]=Math.sqrt(ex*ex+ez*ez);out[1]=s[4]+(s[5]-s[4])*t;return out;}
const _wtpO=[0,0];
/* how far outside a trail's edge (negative: on it); 99 with no trail within a few metres (pathMask and pathHalfAt in one: the props' keep-out) */
function wtPathAt(x,z){if(!WTP.n)return 99;const C=WTP.cell,L=WTP.segs.get(Math.floor(x/C)+','+Math.floor(z/C));if(!L)return 99;let o=99;for(const s of L){wtpSeg(s,x,z,_wtpO);const v=_wtpO[0]-_wtpO[1];if(v<o)o=v;}return o;}
/* per frame: the material's window round the camera */
function wtpUpdate(cx,cz){if(!WTP.n){if(WTP.uO.value)WTP.uO.value.w=0;return;}wtpInit();if(!WTP.dirty&&Math.abs(cx-WTP.cx)<96&&Math.abs(cz-WTP.cz)<96)return;
  const T0=performance.now(),N=WTP.N,r=WTP.res,S=N*r,x0=Math.round(cx/64)*64-S/2,z0=Math.round(cz/64)*64-S/2,D=WTP.data,R=WTP.R,C=WTP.cell;D.fill(255);
  const seen=new Set();for(let gz=Math.floor((z0-R)/C);gz<=Math.floor((z0+S+R)/C);gz++)for(let gx=Math.floor((x0-R)/C);gx<=Math.floor((x0+S+R)/C);gx++){const L=WTP.segs.get(gx+','+gz);if(!L)continue;
    for(const s of L){if(seen.has(s))continue;seen.add(s);
      const i0=Math.max(0,Math.floor((Math.min(s[0],s[2])-R-x0)/r)),i1=Math.min(N-1,Math.ceil((Math.max(s[0],s[2])+R-x0)/r)),k0=Math.max(0,Math.floor((Math.min(s[1],s[3])-R-z0)/r)),k1=Math.min(N-1,Math.ceil((Math.max(s[1],s[3])+R-z0)/r));
      for(let k=k0;k<=k1;k++)for(let i=i0;i<=i1;i++){wtpSeg(s,x0+(i+.5)*r,z0+(k+.5)*r,_wtpO);if(_wtpO[0]>=R)continue;const v=Math.round(_wtpO[0]/R*254),q=(k*N+i)*4;if(v<D[q]){D[q]=v;D[q+1]=Math.round(Math.max(0,Math.min(1,(_wtpO[1]-.48)/.64))*255);}}}}
  WTP.tex.needsUpdate=true;WTP.uO.value.set(x0,z0,S,1);WTP.cx=cx;WTP.cz=cz;WTP.dirty=false;WTP.stats.fills++;WTP.stats.ms=performance.now()-T0;}

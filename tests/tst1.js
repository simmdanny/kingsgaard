(function(){
const out=[];
function check(seed){
  const t0=performance.now();owEnter();buildOpenWorld(seed);const bt=Math.round(performance.now()-t0);
  const r={seed,ms:bt,v:OW.villages.length,c:OW.caves.length,roads:OW.roads.length,props:OW.props.length};
  /* 1 footprint overlaps */
  let ov=0,minGap=1e9;for(let i=0;i<OW.villages.length;i++)for(let j=i+1;j<OW.villages.length;j++){const a=OW.villages[i],b=OW.villages[j],g=Math.hypot(a.x-b.x,a.z-b.z)-a.fr-b.fr;minGap=Math.min(minGap,g);if(g<0)ov++;}
  r.vOverlap=ov;r.minVGap=Math.round(minGap);
  /* keep / cave separation */
  let kv=1e9,cv=1e9,cc=1e9,ck=1e9;OW.villages.forEach(v=>{kv=Math.min(kv,Math.hypot(v.x-OW.keep.x,v.z-OW.keep.z)-v.fr);OW.caves.forEach(c=>{cv=Math.min(cv,Math.hypot(v.x-c.x,v.z-c.z)-v.fr)})});
  OW.caves.forEach((a,i)=>{ck=Math.min(ck,Math.hypot(a.x-OW.keep.x,a.z-OW.keep.z));OW.caves.forEach((b,j)=>{if(j>i)cc=Math.min(cc,Math.hypot(a.x-b.x,a.z-b.z))})});
  r.keepToVillageEdge=Math.round(kv);r.caveToVillageEdge=Math.round(cv);r.minCaveGap=Math.round(cc);r.minCaveKeep=Math.round(ck);
  /* 2 roads: every village and cave connected to the keep */
  r.villageNoRoad=OW.villages.filter(v=>!v.keepRoad).length;r.caveRoutes=OW.caves.map(c=>Math.round(c.keepRoute.len)).join('/');
  /* 3 road alignment through each village square: distance of the road from the square centre and heading error */
  let maxOff=0,maxAng=0;OW.villages.forEach(v=>{if(!v.keepRoad||!v.sqr)return;const p=v.keepRoad;let best=1e9;p.forEach(q=>{best=Math.min(best,Math.hypot(q[0]-v.sqr.x,q[1]-v.sqr.z))});
    /* distance from road polyline to the street axis at the first 25 units */
    const ca=v.sqr.ca,sa=v.sqr.sa;let off=0;p.forEach(q=>{const dx=q[0]-v.x,dz=q[1]-v.z,u=dx*ca+dz*sa,w=-dx*sa+dz*ca;if(u<0&&u>-18&&Math.hypot(dx,dz)<40)off=Math.max(off,Math.abs(w));});maxOff=Math.max(maxOff,off);});
  r.roadOffAxis=+maxOff.toFixed(2);
  /* 4 square flatness: height range over the square + 3 units */
  let flat=0;OW.villages.forEach(v=>{const sq=v.sqr;if(!sq)return;let lo=1e9,hi=-1e9;const R0=(sq.circle?sq.r:Math.max(sq.a,sq.b)/2)+3;for(let a=-R0;a<=R0;a+=1.5)for(let b=-R0;b<=R0;b+=1.5){const h=owH(sq.x+a,sq.z+b);lo=Math.min(lo,h);hi=Math.max(hi,h);}flat=Math.max(flat,hi-lo);});
  r.squareHeightRange=+flat.toFixed(2);
  /* 5 height steps along every road (per 1.6 unit segment) */
  let step=0;OW.roads.forEach(rd=>{for(let i=1;i<rd.pts.length;i++){const d=Math.abs(owH(rd.pts[i][0],rd.pts[i][1])-owH(rd.pts[i-1][0],rd.pts[i-1][1]));step=Math.max(step,d);}});r.maxRoadStep=+step.toFixed(2);
  /* 6 buildings: overlaps, count, hall/tavern coverage */
  let n=0,bov=0,L=0,Lh=0,M=0,Mt=0;OW.villages.forEach(v=>{n+=v.buildings.length;const B=v.buildings.filter(b=>b.ob);for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++)if(owObbHit(B[i].ob,B[j].ob,0))bov++;
    if(v.size==='large'){L++;if(v.buildings.some(b=>b.type==='hall'))Lh++}if(v.size==='medium'){M++;if(v.buildings.some(b=>b.type==='tavern'))Mt++}});
  r.buildings=n;r.buildingOverlaps=bov;r.largeHall=Lh+'/'+L;r.medTavern=Mt+'/'+M;
  /* 7 villages inside the playable area */
  r.outside=OW.villages.filter(v=>Math.abs(v.x)+v.fr>OW.half||Math.abs(v.z)+v.fr>OW.half).length;
  /* 8 buildings sit on ground / not on roads */
  let onRoad=0;OW.villages.forEach(v=>v.buildings.forEach(b=>{if(b.ob&&owNearRoad(b.x,b.z,Math.max(b.ob.hw,b.ob.hd)*.55))onRoad++;}));r.buildingsOnRoad=onRoad;
  return r;}
const seeds=window.__seeds||[555,1,2,3];
for(const s of seeds)out.push(JSON.stringify(check(s)));
return out.join('\n');})()

(function(){
/* Parts that are built into a building but stand outside its footprint at floor height (benches, barrels, crates, forge posts, lean-to posts, annexes): their lowest face is at the level of the floor, half a metre above the foundation base, so they hang
   in the air over terrain that is at the foundation level. For every building the vertices of its meshes that lie at floor height (local y within a few cm of the floor) and outside the foundation rectangle are checked: a ray from just above the
   vertex straight down must meet an upward-facing surface within 6 cm (a deck, a plinth, a foundation top: the part stands on something); a part that has nothing under it is counted as hanging, with its height over the terrain. Returns a JSON
   summary by building type and tier. Needs int-lib.js (I.setup). */
const I=window.__iw,sum={bld:0,withFloat:0,byType:{},ex:[]},Y0=OW_FH,rc=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
for(const v of OW.villages)for(const b of v.buildings){const A=b.arch,r0=A&&A.rect0;if(!r0)continue;sum.bld++;const c=Math.cos(b.rot),s=Math.sin(b.rot),BS=b.BSc,m=.09;b.g.updateMatrixWorld(true);
  const objs=['f','w','x','r','s'].map(k=>b.meshes[k]).filter(Boolean);objs.forEach(o=>o.updateMatrixWorld(true));const seen=new Set();let fl=0,worst=0;
  for(const k of['x','w','r']){const mesh=b.meshes[k];if(!mesh)continue;const P=mesh.geometry.attributes.position.array;for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];if(y<Y0-.005||y>Y0+.03)continue;
    if(x>=r0.x0-m&&x<=r0.x1+m&&z>=r0.z0-m&&z<=r0.z1+m)continue;const key=Math.round(x*12)+','+Math.round(z*12);if(seen.has(key))continue;seen.add(key);
    const wx=b.x+(x*c+z*s)*BS,wz=b.z+(-x*s+z*c)*BS,wy=b.hi+y*BS,g=owH(wx,wz),gap=wy-g;if(gap<=.15)continue;
    rc.set(new THREE.Vector3(wx,wy+.03,wz),down);rc.near=0;rc.far=.5;const hit=rc.intersectObjects(objs,false).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.5);
    if(hit&&hit.distance<=.06)continue;fl++;worst=Math.max(worst,gap);}}
  if(fl>2){sum.withFloat++;const key='T'+v.tier+' '+b.type;const o=sum.byType[key]||(sum.byType[key]={n:0,worst:0});o.n++;o.worst=Math.max(o.worst,+worst.toFixed(2));if(sum.ex.length<6)sum.ex.push(key+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' '+fl+' places up to '+worst.toFixed(2)+' m above the ground');}}
return JSON.stringify(sum);
})()

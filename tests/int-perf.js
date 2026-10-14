(function(){
/* Cost of the interior system: planning, meshing, per-frame upkeep, unloading. */
const I=window.__iw,out=[];I.setup(11);const list=OWI.list.slice();
const now=()=>performance.now(),stat=a=>{a.sort((x,y)=>x-y);return 'avg '+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2)+' ms, median '+a[a.length>>1].toFixed(2)+', max '+a[a.length-1].toFixed(2);};
const tp=[],tm=[],verts=[];
for(const b of list){let t=now();owiEnsurePlan(b);tp.push(now()-t);t=now();owiBuildMesh(b);tm.push(now()-t);let v=0;for(const g of b.ic.geos)v+=g.attributes.position.count;verts.push(v);}
out.push('buildings '+list.length+' | plan: '+stat(tp)+' | mesh: '+stat(tm)+' | vertices per interior: '+stat(verts).replace(/ ms/g,''));
const gBefore=renderer.info.memory.geometries;for(const b of list)owiFreeMesh(b);out.push('geometries before unloading all '+gBefore+', after '+renderer.info.memory.geometries);
/* upkeep per frame with the hero in a village */
const v=OW.villages.find(q=>q.buildings.some(b=>b.enter));const hb=v.buildings.find(b=>b.enter);const g=I.ground(hb,3);I.tele(g[0],g[1]);I.settle(hb);
for(let i=0;i<20;i++){heroUpdate(1/60);owiTick(1/60);}
const ticks=[];for(let i=0;i<300;i++){const t=now();owiTick(1/60);ticks.push(now()-t);}out.push('owiTick per frame: '+stat(ticks));
const hu=[];for(let i=0;i<300;i++){TPC.keys.add('KeyW');TPC.yaw+=.02;const t=now();heroUpdate(1/60);hu.push(now()-t);}TPC.keys.clear();out.push('heroUpdate per frame while walking: '+stat(hu));
let loaded=0;for(const b of OWI.list)if(b.ic&&b.ic.grp)loaded++;out.push('interiors loaded around the hero: '+loaded+' of '+OWI.list.length);
const fr=[];for(let i=0;i<30;i++){const t=now();renderer.render(scene,camera);fr.push(now()-t);}out.push('renderer.render (CPU side): '+stat(fr)+' | draw calls '+renderer.info.render.calls+', triangles '+renderer.info.render.triangles);
return out.join('\n');})()

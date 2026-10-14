(function(){
/* Prints the generated plan of one building: rooms, walls, stairs, items, and the walkability map of any floor that needed repair. */
const want=window.__want||'tavern',seed=window.__seed||11,nth=window.__nth||0;
meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
OWI.dbg=true;const bs=OWI.list.filter(b=>b.type===want);const b=bs[nth];if(!b)return 'none';
const ic=owiEnsurePlan(b),P=ic.P,f2=v=>+v.toFixed(2);let o='type '+b.type+' tier '+P.tier+' floors '+P.fl+' door u='+f2(P.door.u)+' Q0='+JSON.stringify(P.st[0].Q,(k,v)=>typeof v==='number'?f2(v):v)+'\n';
P.floors.forEach(F=>{o+='--- floor '+F.i+' proof '+JSON.stringify(Object.assign({},F.proof,{dump:undefined}))+' firstWhy='+F.firstWhy+'\n';
  o+='rooms: '+F.rooms.map(r=>r.id+':'+r.kind+JSON.stringify(r.rects.map(q=>[q.xa,q.xb,q.za,q.zb].map(f2)))).join(' ')+'\n';
  o+='walls: '+F.walls.map(w=>w.ax+f2(w.p)+'['+f2(w.a)+','+f2(w.b)+'] doors '+w.doors.map(d=>f2(d.c)).join('/')).join('; ')+'\n';
  o+='stairs: '+JSON.stringify(P.stairs.map(f=>({x0:f2(f.x0),x1:f2(f.x1),z0:f2(f.z0),z1:f2(f.z1),from:f.from,to:f.to,dir:f.dir})))+'\n';
  o+='items: '+F.items.filter(i=>!i.deco).map(i=>i.kind+'@'+f2(i.x)+','+f2(i.z)).join(' ')+'\n';
  if(F.firstFail)o+='FIRST FAIL MAP:\n'+F.firstFail;});
P.log.forEach(l=>o+=l+'\n');
return o;})()

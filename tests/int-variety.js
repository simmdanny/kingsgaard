(function(){
/* How different are the floor plans of houses that share an exterior archetype (the same type and tier)? A plan's signature is its floors, its rooms (kind and size to the half metre) and its partitions
   (axis and place to a quarter metre). Run after __iw.setup. window.__novar = true plans with the old fixed layouts, for comparison. */
const I=window.__iw,out=[],groups={};OWI.novar=!!window.__novar;
for(const b of OWI.list){const ic=owiEnsurePlan(b),P=ic.P;if(b.ic.P.kind==='tunnel')continue;ic.P=P;
  const sig=P.floors.map(F=>F.rooms.map(r=>r.kind+':'+r.rects.map(q=>[q.xb-q.xa,q.zb-q.za].map(v=>Math.round(v*2)/2).join('x')).join('+')).sort().join(',')+'|'+F.walls.map(w=>w.ax+Math.round(w.p*4)/4+'/'+Math.round(((w.a+w.b)/2)*4)/4).sort().join(',')).join('||');
  /* the arrangement alone: which room lies where (front / middle / back, left / middle / right of the floor), whatever its size */
  const arr=P.floors.map(F=>{const Q=F.Q,w=Q.xb-Q.xa,d=Q.zb-Q.za;return F.rooms.map(r=>{const q=r.rects[0],cx=((q.xa+q.xb)/2-Q.xa)/w,cz=((q.za+q.zb)/2-Q.za)/d;return r.kind+'@'+Math.min(2,Math.floor(cx*3))+Math.min(2,Math.floor(cz*3));}).sort().join(',');}).join('||');
  const k=b.type+' t'+P.tier;(groups[k]||(groups[k]={n:0,sigs:new Map(),kinds:new Map(),arr:new Map()})).n++;const g=groups[k];g.sigs.set(sig,(g.sigs.get(sig)||0)+1);g.arr.set(arr,(g.arr.get(arr)||0)+1);
  const rk=P.floors.map(F=>F.rooms.map(r=>r.kind).sort().join('+')).join('/');g.kinds.set(rk,(g.kinds.get(rk)||0)+1);}
let tot=0,dist=0;const rows=[];for(const k in groups){const g=groups[k];if(g.n<6)continue;tot+=g.n;dist+=g.sigs.size;const top=Math.max(...g.sigs.values());rows.push(k+': '+g.n+' houses, '+g.arr.size+' arrangements, '+g.sigs.size+' distinct plans ('+Math.round(100*g.sigs.size/g.n)+'%), most common used by '+top+', '+g.kinds.size+' room combinations');}
OWI.novar=false;
return 'groups with 6+ houses: '+rows.length+', houses '+tot+', distinct plans '+dist+' ('+Math.round(100*dist/Math.max(1,tot))+'%)\n'+rows.join('\n');})()

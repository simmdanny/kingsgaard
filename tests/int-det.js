(function(){
/* Determinism and variety: the same world gives the same interiors, before and after an unload, and no two buildings are copies. */
const I=window.__iw,out=[];
const sig=b=>{const P=owiEnsurePlan(b).P;return P.floors.map(F=>F.rooms.map(r=>r.id+r.kind).join(',')+'|'+F.walls.map(w=>w.ax+w.p.toFixed(2)+w.doors.map(d=>d.c.toFixed(2)).join('/')).join(',')+'|'+F.items.map(i=>i.kind+i.x.toFixed(2)+','+i.z.toFixed(2)+','+i.rot.toFixed(2)).join(';')).join('##');};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const keyOf=b=>b.type+'@'+b.x.toFixed(1)+','+b.z.toFixed(1);
const world=seed=>{I.setup(seed);const m={};for(const b of OWI.list)m[keyOf(b)]=hash(sig(b));return m;};
const A=world(11),B=world(11),C=world(23);
let same=0,diff=0;for(const k in A){if(B[k]===A[k])same++;else diff++;}
out.push('same world twice: '+same+' identical, '+diff+' different');
/* unload and reload inside one world */
I.setup(11);let re=0,reBad=0;for(const b of OWI.list.slice(0,60)){const h0=hash(sig(b));const g=I.ground(b,3);I.tele(g[0],g[1]);I.settle(b);owiFreeMesh(b);b.ic=null;const h1=hash(sig(b));if(h0===h1)re++;else reBad++;}
out.push('unload/reload: '+re+' identical, '+reBad+' different');
/* other seeds give other houses */
let shared=0;for(const k in C)if(A[k]!==undefined&&A[k]===C[k])shared++;out.push('same position and same plan in seed 11 and 23: '+shared);
/* variety within one world, by type */
I.setup(11);const byType={};for(const b of OWI.list){(byType[b.type]=byType[b.type]||[]).push(hash(sig(b)));}
for(const t in byType){const a=byType[t];out.push(t+': '+a.length+' buildings, '+new Set(a).size+' different interiors');}
return out.join('\n');})()

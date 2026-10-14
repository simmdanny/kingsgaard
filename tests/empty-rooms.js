(function(){
/* Audit of the furnishing: every room of every furnished building (all floors) and how many pieces stand in it. A room is "empty" with no piece at all, "bare" with nothing but flat rugs and wall decorations.
   Needs int-lib.js (I.setup). Returns a JSON summary with the worst rooms. */
const I=window.__iw;const cnt={rooms:0,empty:0,bare:0,byKind:{},emptyBy:{},samples:[]};const flat=k=>/^rug|^deco_/.test(k);
const list=OWI.reg.slice();let nb=0;
for(const b of list){if(!b.ic)owiEnsurePlan(b);const P=b.ic&&b.ic.P;if(!P)continue;nb++;
  for(const F of P.floors){for(const room of F.rooms){const its=F.items.filter(it=>it.room===room.id);const real=its.filter(it=>!flat(it.kind)&&!it.deco);
    const area=room.rects.reduce((a,q)=>a+(q.xb-q.xa)*(q.zb-q.za),0);cnt.rooms++;cnt.byKind[room.kind]=(cnt.byKind[room.kind]||0)+1;
    const e=its.length===0,bare=real.length===0&&!e;if(e)cnt.empty++;if(bare)cnt.bare++;
    if(e||bare){const k=(e?'E:':'B:')+room.kind+'/'+b.type;cnt.emptyBy[k]=(cnt.emptyBy[k]||0)+1;if(cnt.samples.length<14)cnt.samples.push(k+' T'+P.tier+' fl'+F.i+' a='+area.toFixed(1)+' @'+b.x.toFixed(0)+','+b.z.toFixed(0));}}}}
cnt.buildings=nb;return JSON.stringify(cnt);
})()

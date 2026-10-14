(function(){
/* One staircase per floor (geo.js owiStairVis): the hero sees the flights of his own floor (the one going up and the one arriving from below), never those of other floors; the flight he is on is always drawn;
   outside, every flight is drawn. Walks the real controller up and down every flight of several houses with 2-4 floors. Needs int-lib.js. Returns a JSON summary. */
const I=window.__iw,out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const H=heroU,step=(n)=>{for(let i=0;i<n;i++){heroUpdate(1/30);owiTick(1/30);owFrame();}};
const cands=I.list().filter(b=>b.enter&&!b.tunnel&&b.arch.leaf);const multi=[];
for(const b of cands){if(!b.ic)owiEnsurePlan(b);if(b.ic&&b.ic.P&&b.ic.P.stairs.length>=1)multi.push(b);}
const byN={};for(const b of multi){const k=b.ic.P.stairs.length;(byN[k]=byN[k]||[]).push(b);}
out.push('houses with n flights: '+Object.keys(byN).map(k=>k+':'+byN[k].length).join(' '));
const sample=[];for(const k of Object.keys(byN).sort())for(let i=0;i<Math.min(3,byN[k].length);i++)sample.push(byN[k][Math.floor(i*byN[k].length/Math.min(3,byN[k].length))]);
const vis=b=>b.ic.flights.map(q=>q.mesh.visible?1:0).join('');
const want=(P,lv)=>P.stairs.map(f=>(f.from===lv||f.to===lv)?1:0).join('');
let flightsWalked=0,frames=0,badFrame=0,wrong=0;
for(const b of sample){const q0=I.ground(b,5);I.tele(q0[0],q0[1]);I.settle(b);step(10);const P=b.ic.P,tag=b.type+' T'+b.v.tier+' '+P.stairs.length+'fl';
  ok(b.ic.flights.length===P.stairs.length&&P.stairs.every((f,i)=>f.id===i),tag+': every flight has its own mesh and an id');
  ok(vis(b)==='1'.repeat(P.stairs.length)||OWI.cb===b,tag+': hero outside: '+vis(b));
  /* walk up flight by flight, starting each on its lower floor */
  for(const f of P.stairs){const s=Math.sign(f.zt-f.zb)||1,xs=(f.x0+f.x1)/2;
    OWI.cb=b;OWI.lv=f.from;OWI.in=true;owiCut(b,true);
    const a=owiL2W(b,xs,f.zb-s*.55);I.tele(a[0],a[1]);step(6);
    let wv=want(P,f.from);if(vis(b)!==wv){wrong++;out.push('FAIL '+tag+' floor '+f.from+' before flight '+f.id+': drawn '+vis(b)+' want '+wv);}
    const top=owiL2W(b,xs,f.zt+s*.7);let t=0,seenLv=new Set();I.hook=dt=>{frames++;const l=owiW2L(b,H.x,H.z),onF=l[0]>=f.x0-.02&&l[0]<=f.x1+.02&&l[1]>=Math.min(f.zb,f.zt)-.02&&l[1]<=Math.max(f.zb,f.zt)+.02;seenLv.add(OWI.lv);
      if(onF&&!ic_vis(b,f)){badFrame++;}if(OWI.cb===b&&OWI.in){const w=want(P,OWI.lv);if(vis(b)!==w){badFrame++;}}};
    const r=I.walkTo(top[0],top[1],{maxT:9});I.hook=null;flightsWalked++;
    ok(r.ok&&OWI.lv===f.to,tag+' flight '+f.id+' ('+f.from+'->'+f.to+') walked up, now on floor '+OWI.lv);
    step(6);wv=want(P,OWI.lv);if(vis(b)!==wv){wrong++;out.push('FAIL '+tag+' on floor '+OWI.lv+': drawn '+vis(b)+' want '+wv);}
    ok(seenLv.has(f.from)&&seenLv.has(f.to),tag+' flight '+f.id+': the floor changed on the flight');}
  /* and down again */
  for(const f of P.stairs.slice().reverse()){const s=Math.sign(f.zt-f.zb)||1,xs=(f.x0+f.x1)/2;OWI.lv=f.to;const a=owiL2W(b,xs,f.zt+s*.6);I.tele(a[0],a[1]);step(6);
    const bot=owiL2W(b,xs,f.zb-s*.7);I.hook=dt=>{frames++;if(OWI.cb===b&&OWI.in){const w=want(P,OWI.lv);if(vis(b)!==w)badFrame++;}};const r=I.walkTo(bot[0],bot[1],{maxT:9});I.hook=null;flightsWalked++;
    ok(r.ok&&OWI.lv===f.from,tag+' flight '+f.id+' walked down, now on floor '+OWI.lv);}
  /* leaving shows every flight again */
  const q1=I.ground(b,8);I.tele(q1[0],q1[1]);step(40);ok(vis(b)==='1'.repeat(P.stairs.length),tag+': after leaving every flight is drawn again ('+vis(b)+')');
}
function ic_vis(b,f){return b.ic.flights[f.id].mesh.visible;}
ok(badFrame===0,'no frame drew a wrong set of flights or hid the flight being walked on ('+frames+' frames, '+flightsWalked+' flights, '+badFrame+' wrong)');
ok(wrong===0,'at rest on every floor exactly the flights of that floor are drawn ('+wrong+' wrong)');
res.out=out.filter(l=>l.startsWith('FAIL')||l.startsWith('houses')||out.length<60);return JSON.stringify(res);
})()

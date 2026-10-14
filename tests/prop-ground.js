(function(){
/* Ground contact of every prop of the library (props.js) on flat ground: the lowest point of each is within a few cm of the ground (the wash line's poles are buried by design), nothing is far above it,
   every prop has parts, and the tallest point is plausible for the object. Repeats at many places so every shape variant (they come from a hash of the place) is met. Returns PASS/FAIL lines. */
const out=[],res={pass:0,fail:0};const ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);return c;};
const loc=(x,z,rot,lx,lz)=>[x+Math.cos(rot)*lx+Math.sin(rot)*lz,z-Math.sin(rot)*lx+Math.cos(rot)*lz];
const kinds=['barrel','crate','sacks','hay','bench','trough','cart','board','signpost','bollard','planter','anvil','stump','bucket','basket','firewood','pottery','bin','wheelbarrow','tools'];
const maxH={barrel:.8,crate:1.0,sacks:.65,hay:1.0,bench:1.0,trough:.5,cart:1.2,board:2.2,signpost:2.4,bollard:.9,planter:.9,laundry:2.4,anvil:.8,stump:1.1,bucket:.45,basket:.8,firewood:.65,pottery:.6,bin:.9,wheelbarrow:.7,tools:1.7};
const bad={},stat={};const tot={};
for(const k of kinds){let n=0,variants=new Set();for(let i=0;i<60;i++){const x=10+i*3.7,z=-20+i*5.3,rot=i*.37;const kb=kitBuilder(),R=mulberry(i+3);const lib=owPropLib({P:kb.P,PY:kb.PY,R,Yf:()=>0,loc});
    const before=Object.keys(kb.B).length;lib[k](x,z,rot);if(!kb.B.d||!kb.B.d.length){(bad[k]=bad[k]||[]).push('no parts at '+i);continue;}
    const g=mergeParts(kb.B.d);g.computeBoundingBox();const bb=g.boundingBox;variants.add(kb.B.d.length);n++;
    const lo=bb.min.y,hi=bb.max.y;g.dispose();
    const pole=k==='board'||k==='signpost'||k==='bollard',lowOK=pole?(lo>=-.25&&lo<=.06):(lo>=-.06&&lo<=.06);
    if(!lowOK)(bad[k]=bad[k]||[]).push('lowest point '+lo.toFixed(3)+' at '+i);
    if(hi>maxH[k]+.01)(bad[k]=bad[k]||[]).push('tallest '+hi.toFixed(2)+' > '+maxH[k]);
    if(hi<.15)(bad[k]=bad[k]||[]).push('tiny '+hi.toFixed(2));}
  tot[k]=n+' places, '+variants.size+' different part counts';}
for(const k of kinds)ok(!bad[k],k+': grounded, plausible height ('+tot[k]+')'+(bad[k]?' '+bad[k].slice(0,3).join('; '):''));
res.out=out;return JSON.stringify(res);
})()

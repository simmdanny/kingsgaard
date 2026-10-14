(function(){
/* How many numbers of the settlement stream each village of a seed uses, and which kinds of building it holds: run in two builds and compare (a change that makes a village draw a different number of values re-rolls every village after it, and with that the saved worlds of players). window.__rt = {seed} */
const seed=(window.__rt&&window.__rt.seed)||11;
if(!window.__rtPatched){window.__rtPatched=true;const _m=mulberry;mulberry=function(a){const f=_m(a),g=function(){g.n++;return f();};g.n=0;return g;};
  const _b=owBuildVillage;owBuildVillage=function(v,i,R){(window.__rtLog=window.__rtLog||[]).push(R.n);return _b(v,i,R);};}
window.__rtLog=[];
meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;
const starts=window.__rtLog.slice();
return JSON.stringify({starts,used:starts.map((s,i)=>i?s-starts[i-1]:0).slice(1),types:OW.villages.map(v=>{const c={};v.buildings.forEach(b=>c[b.type]=(c[b.type]||0)+1);return c;})});})()

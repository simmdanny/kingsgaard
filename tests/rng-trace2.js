(function(){
/* Per building: the number of settlement-stream draws its construction takes (type, draws), for one village of one seed. Run in two builds and compare. window.__rt = {seed, village} */
const seed=(window.__rt&&window.__rt.seed)||11,vi=(window.__rt&&window.__rt.village)||4;
if(!window.__rt2Patched){window.__rt2Patched=true;const _m=mulberry;mulberry=function(a){const f=_m(a),g=function(){g.n++;return f();};g.n=0;return g;};
  const _b=owBuildVillage;owBuildVillage=function(v,i,R){window.__rtCur=i;return _b(v,i,R);};
  const _mk=owMakeBuilding;owMakeBuilding=function(v,type,x,z,rot,R,pl){const n0=R.n,r=_mk(v,type,x,z,rot,R,pl);if(window.__rtCur===window.__rtV)(window.__rtOut=window.__rtOut||[]).push(type+':'+(R.n-n0)+'@'+Math.round(x)+','+Math.round(z));return r;};}
window.__rtV=vi;window.__rtOut=[];window.__rtCur=-1;
meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;
return JSON.stringify(window.__rtOut);})()

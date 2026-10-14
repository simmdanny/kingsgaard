(function(){
/* The settlements of a seed as a list of signatures (type and rounded position of every building, the number of draws the settlement stream made for each village): run in two builds and compare the output.
   A change that makes a village draw another number of values re-rolls every village after it, and with that the saved worlds of players. window.__ws = {seeds:[3,11]} */
const seeds=(window.__ws&&window.__ws.seeds)||[3];const out={};
if(!window.__wsPatched){window.__wsPatched=true;const _m=mulberry;mulberry=function(a){const f=_m(a),g=function(){g.n++;return f();};g.n=0;return g;};
  const _b=owBuildVillage;owBuildVillage=function(v,i,R){(window.__wsLog=window.__wsLog||[]).push(R.n);return _b(v,i,R);};
  const _bs=owBuildVillages;owBuildVillages=function(R){const r=_bs(R);(window.__wsLog=window.__wsLog||[]).push(R.n);return r;};}
for(const seed of seeds){window.__wsLog=[];meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();
  const L=window.__wsLog.slice();
  out[seed]=OW.villages.map((v,vi)=>v.name+' t'+v.tier+' draws'+(L[vi+1]-L[vi])+' '+v.buildings.map(b=>b.type+'@'+Math.round(b.x)+','+Math.round(b.z)).join(' '));}
return JSON.stringify(out);})()

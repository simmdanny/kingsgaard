(async function(){
/* The player's character in the world (a --dev build, int-lib.js, ls-shot.js, the screenshot server): for each look of window.__pcg.looks the hero is spawned with it in the world of seed __pcg.seed and drawn from behind
   and from the front, standing, at the height of a stride and knocked out (sitting), as name_<i>_<pose>.jpg. The storage keys are saved first and put back at the end (nothing here writes a save on purpose).
   window.__pcg = {seed, looks:[cfg...], name, dist, yaw}  ->  'shots n' */
const o=window.__pcg||{},I=window.__iw,keys=['kingsgaard.run','kingsgaard.slots','kingsgaard.meta'],bk={};for(const k of keys)bk[k]=localStorage.getItem(k);
const pc0=PC,eq0=meta.equipped;let n=0;
try{I.setup(o.seed||5);meta.dayT=o.t==null?600:o.t;
  for(let i=0;i<o.looks.length;i++){PC=pcClean(o.looks[i]);meta.owned.pc=true;meta.equipped='pc';HB.pc.n=PC.name;owSpawnHero();
    const x=heroU.x,z=heroU.z;
    for(const pose of(o.poses||['stand','walk','sit'])){for(const side of o.sides||['back','front']){
      camSet('tp');TPC.yaw=(side==='front'?Math.PI:0)+(heroU.g.rotation.y||0)+(o.yaw||.5);TPC.pitch=.18;TPC.dist=o.dist||2.6;
      for(let f=0;f<8;f++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+f/30);owFrame();}
      heroU.walk=pose==='walk'?1:0;heroU.wph=Math.PI/2;heroU.sitA=pose==='sit'?1:0;heroU.anim=null;heroU.rs={};animHero(heroU,0,0);
      tpcApply();await window.__sh((o.name||'pcg')+'_'+i+'_'+pose+'_'+side);n++;}}}}
finally{for(const k of keys){if(bk[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,bk[k]);}PC=pc0;meta.equipped=eq0;}
return 'shots '+n;})()

(async function(){
/* Task K in the world (a --dev build, int-lib.js, ls-shot.js, the screenshot server): the character is spawned in the open world and driven with the keys of the third-person controller (frames stepped by hand):
   standing, walking (W), running (keys ShiftLeft), sprinting (keys Alt), stopping, turning, with the bow and the sword (X), drawn and put away (R), knocked out; screenshots as name_<step>.jpg; the saves are put back at the end.
   window.__kg = {seed, look, name, plan:[{label, frames, keys:[...], yaw (camera), dist, draw, sw (switch weapon), ko, shot}]}  ->  {shots, log} */
const o=window.__kg||{},I=window.__iw,keys=['kingsgaard.run','kingsgaard.slots','kingsgaard.meta'],bk={};for(const k of keys)bk[k]=localStorage.getItem(k);
const pc0=PC,eq0=meta.equipped,w0=meta.pcw;let n=0;const log=[];
const step=(dt,t)=>{heroUpdate(dt);owiTick(dt);anim(dt,t);owFrame();};
try{I.setup(o.seed||5);meta.dayT=o.t==null?600:o.t;meta.pcw=o.weapon||'bow';
  PC=pcClean(o.look||pcDefaults('m','Test'));meta.owned.pc=true;meta.equipped='pc';HB.pc.n=PC.name;owSpawnHero();camSet('tp');TPC.pitch=.16;TPC.dist=o.dist||3.2;
  let T=performance.now()/1000;const yaw0=heroU.g.rotation.y||0;
  for(const s of o.plan||[]){if(s.sw)pcSwitchWeapon();if(s.draw!=null)heroU.pcDraw=s.draw;if(s.ko)koHero();
    TPC.keys.clear();for(const k of s.keys||[])TPC.keys.add(k);if(s.yaw!=null)TPC.yaw=yaw0+s.yaw;if(s.dist)TPC.dist=s.dist;
    for(let f=0;f<(s.frames||1);f++){T+=1/60;step(1/60,T);if(s.turn)TPC.yaw+=s.turn/60;}
    TPC.keys.clear();const R=heroU.mdl.userData.pcRig,st=R&&R.st;log.push(s.label+': spd '+(st?st.spd.toFixed(2):'?')+' drawn '+(st?st.drawn:'?')+' w '+pcWeapon()+' melee '+heroU.melee+' pos '+heroU.x.toFixed(2)+','+heroU.z.toFixed(2));
    if(s.shot!==false){tpcApply();await window.__sh((o.name||'kg')+'_'+n+'_'+s.label.replace(/\W+/g,'_'));n++;}}}
finally{for(const k of keys){if(bk[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,bk[k]);}PC=pc0;meta.equipped=eq0;meta.pcw=w0;TPC.keys.clear();}
return{shots:n,log};})()

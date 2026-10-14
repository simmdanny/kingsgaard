(function(){
/* The streamed world in the game (a --dev build; int-lib.js and ls-shot.js first, the screenshot server on 8766).
   __wl.setup(seed)               a world built round the keep, the hero spawned (timings returned)
   __wl.go(x,z,{yaw,pitch,dist,t,name,fly:[y]})  the hero put there, the world streamed round it, frames stepped, a screenshot (name.jpg) if a name is given
   __wl.walk(dx,dz,secs)          the hero walked by the keys in a direction for some seconds (frames stepped by hand), the streaming counted
   __wl.stats()                   what is loaded */
const I=window.__iw,W=window.__wl={};
const step=(n,dt)=>{const T=performance.now()/1000;for(let i=0;i<n;i++){heroUpdate(dt||1/30);owiTick(dt||1/30);anim(dt||1/30,T+i/30);owFrame();owView();}};
W.setup=function(seed){const t0=performance.now();I.setup(seed);return{ms:Math.round(performance.now()-t0),t0:Math.round(WSTR.t0),...W.stats()};};
W.stats=function(){return{villages:OW.villages.map(v=>v.name+'/'+v.size),sites:WS.sites.size,roads:WS.stats.roads,jobs:WS.jobs.length,tiles:WT.tiles.size,chunks:WT.chunks.size,shown:WT.shown.size,
  vb:WSTR.stats.vb,vms:Math.round(WSTR.stats.vms),shifts:WSTR.stats.shifts,win:[WSTR.cx,WSTR.cz],ft:+(OW._ft||0).toFixed(1),h0:WG.stats.h0};};
W.go=async function(x,z,o){o=o||{};I.tele(x,z);if(OWI.cb)owiLeave();if(o.t!=null)meta.dayT=o.t;OW.focus={x,z};
  for(let k=0;k<(o.settle||40);k++){wstFrame();if(!WS.jobs.length&&k>3)break;}
  camSet('tp');TPC.yaw=o.yaw||0;TPC.pitch=o.pitch==null?.2:o.pitch;TPC.dist=o.dist||7;step(8);wtUpdate(camera,true);owgView(x,z,true);step(8);
  /* let the workers finish what this view needs (their replies arrive between tasks) */
  for(let k=0;k<(o.wait||60);k++){if(o.fly){flyEnter();FLY.pos.set(x+(o.fly[1]||0),owH(x,z)+o.fly[0],z+(o.fly[2]||0));FLY.yaw=o.yaw||0;FLY.pitch=o.pitch||0;flyApply();}else tpcApply();owView();wtUpdate(camera,false);if(!WT.asked.size&&!WT.ready.size&&k>2)break;await new Promise(r=>setTimeout(r,50));}
  if(o.fly){flyEnter();FLY.pos.set(x+(o.fly[1]||0),owH(x,z)+o.fly[0],z+(o.fly[2]||0));FLY.yaw=o.yaw||0;FLY.pitch=o.pitch||0;flyApply();wtUpdate(camera,true);owView(true);}
  else{tpcApply();owView(true);}
  let r=null;if(o.name)r=await window.__sh(o.name);if(o.fly)flyExit();return{shot:o.name,r,h:+owH(x,z).toFixed(2),...W.stats()};};
W.walk=async function(yaw,secs,o){o=o||{};camSet('tp');TPC.yaw=yaw;TPC.keys.clear();TPC.keys.add('KeyW');if(o.run)TPC.keys.add('ShiftLeft');const n=Math.round(secs*30),x0=heroU.x,z0=heroU.z;let worst=0;
  for(let i=0;i<n;i++){const t=performance.now();step(1);const d=performance.now()-t;if(d>worst)worst=d;}TPC.keys.clear();return{moved:+Math.hypot(heroU.x-x0,heroU.z-z0).toFixed(1),worstMs:Math.round(worst),...W.stats()};};
})();

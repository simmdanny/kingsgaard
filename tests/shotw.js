(function(){
window.__wsetup=function(seed){meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=20;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();meta.shadows=true;applyShadows();meta.sd=300;};
window.__ws=function(name,x,y,z,tx,ty,tz){FLY.on=true;const dx=tx-x,dy=ty-y,dz=tz-z;FLY.pos.set(x,y,z);FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));
 for(let i=0;i<(window.__wsF||5);i++){flyApply();update(.033);dayStep(.033);owSkyUpdate(.033);owLampUpdate(.033);updFx(.033);owFrame();owView(true);applyCam&&applyCam();renderer.render(scene,camera);}
 return fetch('http://localhost:8766/'+name+'.jpg',{method:'POST',body:renderer.domElement.toDataURL('image/jpeg',.85)}).then(r=>r.status);};})();

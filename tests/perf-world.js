(function(){
/* Reproducible render measurements: the same world, the same camera poses, day and night. gl.finish() makes the number include the GPU, not only the CPU side. */
const P=window.__pw={};
const nowT=()=>performance.now();
P.setup=function(seed){meta.world='open';resetRun();buildMap(seed);MAP.fresh=false;startWave=1;wave=0;gold=500;lives=99;nextQ=buildWave(1);state='playing';showOverlay(null);owSpawnHero();if(typeof gmHide==='function')gmHide();TPC.keys.clear();return OW.villages.map((v,i)=>i+':'+v.name+' t'+v.tier+' b'+v.buildings.length).join(' | ');};
/* a pose: world x,z, eye height above ground, look-at x,z and height */
P.pose=function(x,z,h,tx,tz,th,dayT){FLY.on=true;if(dayT!=null)meta.dayT=dayT;const y=owH(x,z)+h;FLY.pos.set(x,y,z);const dx=tx-x,dz=tz-z,ty=owH(tx,tz)+th;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(ty-y,Math.hypot(dx,dz));
  heroU.x=x;heroU.z=z;for(let i=0;i<14;i++){flyApply();update(.033);dayStep(.033);owSkyUpdate(.033);owLampUpdate(.033);updFx(.033);owFrame();owView(true);if(window.applyCam)applyCam();if(typeof owiTick==='function'){OWI.tScan=-9;owiTick(.1);}renderer.render(scene,camera);}};
P.measure=function(n){n=n||60;const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),t=[],c=[],g=[];for(let i=0;i<6;i++){renderer.render(scene,camera);}gl.finish();
  for(let i=0;i<n;i++){const q=ext?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const a=nowT();renderer.render(scene,camera);const b=nowT();if(q)gl.endQuery(ext.TIME_ELAPSED_EXT);gl.finish();const d=nowT();t.push(d-a);c.push(b-a);
    if(q){let tries=0;while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)&&tries++<2000){}const dis=gl.getParameter(ext.GPU_DISJOINT_EXT);if(!dis)g.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}}
  t.sort((x,y)=>x-y);c.sort((x,y)=>x-y);g.sort((x,y)=>x-y);const i=renderer.info,lo=Math.floor(n*.8),tm=t.slice(0,lo).reduce((s,v)=>s+v,0)/lo;
  return{ms:+tm.toFixed(2),med:+t[n>>1].toFixed(2),cpu:+c[n>>1].toFixed(2),gpu:g.length?+g[g.length>>1].toFixed(2):null,p95:+t[Math.floor(n*.95)].toFixed(2),calls:i.render.calls,tris:i.render.triangles,pts:i.render.points,geos:i.memory.geometries,progs:i.programs.length};};
/* GPU time per render from timer queries (their results only exist after the JS task yields, so this is async: await it). */
P.gpu=async function(n){n=n||30;const gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),res=[],cpu=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<n;i++){const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const a=performance.now();renderer.render(scene,camera);cpu.push(performance.now()-a);gl.endQuery(ext.TIME_ELAPSED_EXT);await sleep(6);
    let tries=0;while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)&&tries++<60)await sleep(3);if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)&&!gl.getParameter(ext.GPU_DISJOINT_EXT))res.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
  res.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);return{n:res.length,gpuMed:res.length?+res[res.length>>1].toFixed(2):null,gpuMin:res.length?+res[0].toFixed(2):null,cpuMed:+cpu[cpu.length>>1].toFixed(2),calls:renderer.info.render.calls,tris:renderer.info.render.triangles};};
/* what is the cost made of? switch things off one at a time and measure */
P.breakdown=function(n){const out={};out.all=P.measure(n);
  const sh=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;scene.traverse(o=>{if(o.material)o.material.needsUpdate=false;});out.noShadowMap=P.measure(n);renderer.shadowMap.enabled=sh;
  const L=OWLT.pool||[],iv=L.map(l=>l.intensity);L.forEach(l=>{l.visible=false;});out.noPointLights=P.measure(n);L.forEach(l=>{l.visible=true;});
  const ht=OWLT.halos.map(h=>h.visible);OWLT.halos.forEach(h=>{h.visible=false;});out.noHalos=P.measure(n);OWLT.halos.forEach((h,i)=>{h.visible=ht[i];});
  return out;};
P.lights=function(){let pl=0,dl=0,sl=0,shadowCasters=0;scene.traverse(o=>{if(o.isPointLight)pl++;if(o.isDirectionalLight){dl++;if(o.castShadow)shadowCasters++;}if(o.isSpotLight)sl++;});return{point:pl,dir:dl,spot:sl,shadowDirs:shadowCasters};};
P.counts=function(){let meshes=0,vis=0,tr=0,inst=0,tris=0;scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isLine){meshes++;if(o.visible)vis++;if(o.material&&o.material.transparent)tr++;if(o.isInstancedMesh)inst++;}});return{objects:meshes,visible:vis,transparent:tr,instanced:inst};};
})();

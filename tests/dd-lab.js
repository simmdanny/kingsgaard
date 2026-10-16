(function(){
/* Detail distance lab (a --dev build; needs perf-world.js loaded first, and the screenshot server on 8766 for shots).
   window.__dd.setup(seed, rd, dd)      a world, Render distance rd, Detail distance dd, mid-morning
   window.__dd.pose(x,z,h,tx,tz,th)     the free camera at x,z (h over the ground) looking at tx,tz (th over the ground there)
   window.__dd.run(frames)              drives that many frames in the background (the game's own loop pauses while the pane is hidden); __dd.st = {n, done, err}
   window.__dd.shot(name)               draws and uploads name.jpg
   window.__dd.stats()                  the far grass, the stones, the frame's draw calls and triangles
   window.__dd.gpu(n)                   the GPU's time a frame (ms, median of n) - EXT_disjoint_timer_query_webgl2 */
const D=window.__dd={st:{n:0,done:true}};
const ev=s=>__kk.ev(s);
D.frame=n=>{for(let i=0;i<n;i++)ev('flyApply();update(.033);dayStep(.033);owSkyUpdate(.033);owFrame();owView(true);if(window.applyCam)applyCam();renderer.render(scene,camera);');};
D.setup=(seed,rd,dd)=>{const r=ev('__pw.setup('+(seed||1)+')');ev('setRd('+(rd||170)+');setDd('+(dd||200)+');meta.dayT=0.3*1800');return r;};
D.pose=(x,z,h,tx,tz,th)=>ev('__pw.pose('+[x,z,h,tx,tz,th].map(v=>'('+v+')').join(',')+')');
D.run=frames=>{D.st={n:0,done:false};const step=()=>{try{D.frame(4);D.st.n+=4;}catch(e){D.st.err=String(e.stack||e);D.st.done=true;return;}if(D.st.n<frames)setTimeout(step,0);else D.st.done=true;};step();return 'running';};
D.shot=name=>{ev('renderer.render(scene,camera)');const c=ev('renderer.domElement');return fetch('http://localhost:8766/'+name+'.jpg',{method:'POST',body:c.toDataURL('image/jpeg',.85)}).then(r=>r.status);};
D.stats=()=>ev(`(function(){const F=GRS.F;let fi=0,fc=0;for(const c of F.cells.values())if(c.mesh&&c.mesh.visible){fi+=c.mesh.count;fc++;}
  const L={};let st=0,sb=0;for(const r of WRK.tiles.values()){L[r.lod]=(L[r.lod]||0)+1;st+=r.tris;sb+=r.blocks;}renderer.render(scene,camera);
  return {farR:F.R,farCells:F.cells.size,farShown:fc,farDrawnMax:fi,farBaked:F.stats.inst,stoneTiles:L,stoneTris:st,stoneBlocks:sb,clR:WRK.clR,calls:renderer.info.render.calls,tris:renderer.info.render.triangles};})()`);
D.gpu=n=>{n=n||30;const gl=ev('renderer.getContext()'),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)return -1;const qs=[];
  for(let i=0;i<n;i++){const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);ev('renderer.render(scene,camera)');gl.endQuery(ext.TIME_ELAPSED_EXT);qs.push(q);}gl.finish();
  return new Promise(res=>{const poll=()=>{if(!qs.every(q=>gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)))return setTimeout(poll,20);const t=qs.map(q=>gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6).sort((a,b)=>a-b);res(+t[t.length>>1].toFixed(2));};poll();});};
return 'dd-lab ready';})();
(function(){
/* __dd.walk(x,z,dirx,dirz,frames,speed): the free camera moves along the ground (3.5 m up, looking ahead) speed m/s at 30 frames a second; the CPU time of every
   frame's work before drawing, of the drawing (rt: it waits on the graphics card) and of the grass in it (near + far, grsView) is kept. __dd.wst = {n, done, ms:[...], grass:[...]}; __dd.wsum() -> median, 99th percentile, worst */
const D=window.__dd,ev=s=>__kk.ev(s);
D.walk=(x,z,dx,dz,frames,speed)=>{const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;speed=speed||6;D.wst={n:0,done:false,ms:[],grass:[],rt:[]};
  ev('window.__gT=0;if(!window.__gW){window.__gW=grsView;grsView=function(f){const t=performance.now();window.__gW(f);window.__gT+=performance.now()-t;};}');
  const step=()=>{try{const tk=performance.now();while(D.wst.n<frames&&performance.now()-tk<400){const i=D.wst.n,px=x+dx*speed*i/30,pz=z+dz*speed*i/30;ev('__gT=0');const t=performance.now();
      ev(`(function(){const y=owH(${px},${pz})+3.5;FLY.on=true;FLY.pos.set(${px},y,${pz});FLY.yaw=Math.atan2(${dx},${dz});FLY.pitch=-.08;heroU.x=${px};heroU.z=${pz};flyApply();update(1/30);dayStep(1/30);owFrame();owView();if(window.applyCam)applyCam();})()`);
      D.wst.ms.push(performance.now()-t);const t2=performance.now();ev('renderer.render(scene,camera)');D.wst.rt.push(performance.now()-t2);D.wst.grass.push(ev('__gT'));D.wst.n++;}}catch(e){D.wst.err=String(e.stack||e);D.wst.done=true;return;}
    if(D.wst.n<frames)setTimeout(step,0);else D.wst.done=true;};step();return 'walking';};
D.wsum=()=>{const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return +s[Math.min(s.length-1,Math.floor(s.length*p))].toFixed(1);};const W=D.wst;const tot=W.ms.map((v,i)=>v+(W.rt[i]||0));return {n:W.n,frame:[q(W.ms,.5),q(W.ms,.99),q(W.ms,1)],draw:[q(W.rt,.5),q(W.rt,.99),q(W.rt,1)],total:[q(tot,.5),q(tot,.95),q(tot,.99),q(tot,1)],grass:[q(W.grass,.5),q(W.grass,.99),q(W.grass,1)],over33:W.ms.filter(v=>v>33).length,hitch100:tot.filter(v=>v>100).length};};
})();
(function(){
/* __dd.shot2(name): the same shot at devicePixelRatio 2 (antialiased as the game runs), the renderer put back after; __dd.cam(name,x,z,h,tx,tz,th) poses and remembers a
   camera (localStorage 'ddCams'), __dd.camGo(name) poses it again - before/after shots from the same cameras */
const D=window.__dd,ev=s=>__kk.ev(s);
D.shot2=name=>{const r=ev('renderer'),c=r.domElement,w=c.clientWidth||c.width,h=c.clientHeight||c.height,p0=r.getPixelRatio();r.setPixelRatio(2);r.setSize(w,h,false);
  ev('if(typeof wwDepth==="function"&&OW.group)wwDepth();renderer.render(scene,camera)');/* (river look: the water's depth pass at this size first) */const url=c.toDataURL('image/jpeg',.9);r.setPixelRatio(p0);r.setSize(w,h,false);ev('renderer.render(scene,camera)');
  return fetch('http://localhost:8766/'+name+'.jpg',{method:'POST',body:url}).then(x=>x.status);};
const load=()=>{try{return JSON.parse(localStorage.getItem('ddCams')||'{}');}catch(e){return {};}};
D.cam=(name,x,z,h,tx,tz,th)=>{const C=load();C[name]=[x,z,h,tx,tz,th];try{localStorage.setItem('ddCams',JSON.stringify(C));}catch(e){}D.pose(x,z,h,tx,tz,th);return C[name];};
D.camGo=name=>{const c=load()[name];if(!c)throw new Error('no camera '+name);D.pose(...c);return c;};
D.cams=()=>load();
})();
(function(){
/* __dd.shotCam(cam, tag, frames, dayT): pose a saved camera, let the world stream (frames), daylight (the game's anim sets the light and fog colours), shot at dpr 2 -> tag_cam.jpg */
const D=window.__dd,ev=s=>__kk.ev(s);
D.shotCam=async(cam,tag,frames,dayT)=>{ev('meta.dayT='+(dayT==null?540:dayT));D.camGo(cam);D.run(frames||240);while(!D.st.done)await new Promise(r=>setTimeout(r,400));
  for(let i=0;i<6;i++){D.frame(1);ev('anim(.033,performance.now()/1000);flyApply();if(window.applyCam)applyCam();');}return D.shot2(tag+'_'+cam);};
})();
(function(){
/* __dd.cliffT(tag, cam): pose a saved camera, stream, then force every cliff sheet in range to be built now (wrkView force) and shoot at dpr 2 at mid-morning
   -> [ms to build, WCL stats, stone triangles]; window.__ct holds the result when it is done (for a caller that polls) */
const D=window.__dd,ev=s=>__kk.ev(s);
D.cliffT=async(tag,cam,dayT)=>{window.__ct=null;D.camGo(cam);D.run(40);while(!D.st.done)await new Promise(r=>setTimeout(r,300));const t=performance.now();
  ev('wrkView(camera.position,true)');const res=[Math.round(performance.now()-t),ev('[WCL.stats.built,Math.round(WCL.stats.ms),WCL.stats.stones]'),ev('(function(){let s=0;for(const r of WRK.tiles.values())s+=r.tris||0;return s;})()')];
  ev('meta.dayT='+(dayT==null?540:dayT));D.camGo(cam);for(let i=0;i<4;i++){D.frame(1);ev('anim(.033,performance.now()/1000);flyApply();if(window.applyCam)applyCam();');}
  if(tag)await D.shot2(tag+'_'+cam);window.__ct=res;return res;};
})();
(function(){
/* __dd.at(px,py,pz,tx,ty,tz): the free camera at a point looking at a point (world coordinates); __dd.shotAt(tag, p, t): stream there, build the cliffs now, shot */
const D=window.__dd,ev=s=>__kk.ev(s);
D.at=(px,py,pz,tx,ty,tz)=>ev(`(function(){const dx=${tx-px},dy=${ty-py},dz=${tz-pz};FLY.on=true;FLY.pos.set(${px},${py},${pz});FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));heroU.x=${px};heroU.z=${pz};flyApply();if(window.applyCam)applyCam();})()`);
D.shotAt=async(tag,p,t,dayT)=>{D.at(...p,...t);D.run(40);while(!D.st.done)await new Promise(r=>setTimeout(r,300));ev('wrkView(camera.position,true)');ev('meta.dayT='+(dayT==null?540:dayT));
  for(let i=0;i<4;i++){D.frame(1);ev('anim(.033,performance.now()/1000)');D.at(...p,...t);}return D.shot2(tag);};
})();
(function(){
/* __dd.hit(sx,sy,what): what's under a screen point (0..1): 'cliff' sheets (default) or 'ground' chunks -> [x,y,z,dist,nx,ny,nz] */
const D=window.__dd,ev=s=>__kk.ev(s);
D.hit=(sx,sy,what)=>ev(`(function(){const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(${sx}*2-1,1-${sy}*2),camera);const ms=[];
  if('${what||'cliff'}'==='cliff'){for(const r of WRK.tiles.values())if(r.mesh)ms.push(r.mesh);}else for(const ch of WT.chunks.values())if(ch.on)ms.push(ch.mesh);
  const h=rc.intersectObjects(ms,false)[0];if(!h)return null;const p=h.point,n=h.face.normal;return [+p.x.toFixed(1),+p.y.toFixed(1),+p.z.toFixed(1),+h.distance.toFixed(0),+n.x.toFixed(2),+n.y.toFixed(2),+n.z.toFixed(2)];})()`);
})();

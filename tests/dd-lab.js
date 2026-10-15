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
  return {farR:F.R,farCells:F.cells.size,farShown:fc,farDrawnMax:fi,farBaked:F.stats.inst,stoneTiles:L,stoneTris:st,stoneBlocks:sb,full:WRK.full,calls:renderer.info.render.calls,tris:renderer.info.render.triangles};})()`);
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

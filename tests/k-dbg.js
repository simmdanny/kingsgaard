(function(){
/* Debug pictures of the character: window.__kdbg(cfg, {name, views, size, tint(mesh) -> colour|null, pose(rig)}) renders the figure (no kit) in the head-lab views with chosen meshes tinted, uploads name.jpg. */
window.__kdbg=async function(cfg,o){o=o||{};const S=pcStage(),size=o.size||300,views=o.views||['front','side'],V={front:{yaw:0,d:.2,ty:.33},side:{yaw:Math.PI/2,d:.2,ty:.33},q34:{yaw:.72,d:.2,ty:.33},back34:{yaw:2.45,d:.22,ty:.33},
  bfront:{yaw:0,d:.98,ty:.18},bside:{yaw:Math.PI/2,d:.98,ty:.18},b34:{yaw:.72,d:.98,ty:.18},bback:{yaw:Math.PI,d:.98,ty:.18},bust:{yaw:.4,d:.42,ty:.29},legs:{yaw:.5,d:.5,ty:.09},knee:{yaw:Math.PI/2,d:.35,ty:.1},arm:{yaw:.9,d:.4,ty:.22}};
  const cv=document.createElement('canvas');cv.width=views.length*size;cv.height=size;const cx=cv.getContext('2d');
  const rt=new THREE.WebGLRenderTarget(size,size),px=new Uint8Array(size*size*4),tc=document.createElement('canvas');tc.width=tc.height=size;const tx=tc.getContext('2d');
  const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;
  const m=heroModel('pc',Object.assign({},cfg,{_nokit:o.kit?false:true}));S.tpivot.add(m);S.tpivot.visible=true;
  if(o.tint)m.traverse(q=>{if(q.isMesh){const c=o.tint(q);if(c!=null){q.material=q.material.clone();q.material.color.setHex(c);}}});
  if(o.pose)o.pose(m.userData.pcRig,m);
  for(let i=0;i<(o.settle||0);i++){m.updateMatrixWorld(true);pcPhys(m,1/60);}
  views.forEach((vn,vi)=>{const v=V[vn];S.tpivot.rotation.y=v.yaw;S.cam.aspect=1;S.cam.position.set(0,v.ty+v.d*.05,v.d);S.cam.lookAt(0,v.ty,0);S.cam.updateProjectionMatrix();
    S.r.setRenderTarget(rt);S.r.setClearColor(0x8c9097,1);S.r.clear();S.r.render(S.sc,S.cam);S.r.readRenderTargetPixels(rt,0,0,size,size,px);S.r.setRenderTarget(null);
    const id=tx.createImageData(size,size);for(let y=0;y<size;y++)id.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);tx.putImageData(id,0,0);cx.drawImage(tc,vi*size,0);});
  S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;rt.dispose();
  return fetch('http://localhost:8766/'+(o.name||'kdbg')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.92)}).then(r=>r.status);};
/* spring test: the figure turns or moves (motion(i, pivot, model) for each 1/60 s step) and pictures are taken at the given steps (shots: [{at, view}]) */
window.__kphys=async function(cfg,o){const S=pcStage(),size=o.size||240,V={side:{yaw:Math.PI/2,d:.5,ty:.27},back:{yaw:Math.PI,d:.5,ty:.27},q34:{yaw:.72,d:.5,ty:.27},front:{yaw:0,d:.5,ty:.27},body:{yaw:Math.PI/2,d:.98,ty:.18},body34:{yaw:2.3,d:.98,ty:.18}};
  const shots=o.shots,cv=document.createElement('canvas');cv.width=shots.length*size;cv.height=size;const cx=cv.getContext('2d');
  const rt=new THREE.WebGLRenderTarget(size,size),px=new Uint8Array(size*size*4),tc=document.createElement('canvas');tc.width=tc.height=size;const tx=tc.getContext('2d');
  const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;const holder=new THREE.Group();S.tpivot.add(holder);
  const m=heroModel('pc',Object.assign({},cfg,{_nokit:!o.kit}));holder.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=0;
  const last=Math.max(...shots.map(q=>q.at));let si=0;const info=[];
  for(let i=0;i<=last;i++){if(o.motion)o.motion(i,holder,m);holder.updateMatrixWorld(true);pcPhys(m,1/60,i===0);
    while(si<shots.length&&shots[si].at===i){const q=shots[si],v=V[q.view||'side'],cam=S.cam;cam.aspect=1;const a=v.yaw,d=v.d;cam.position.set(Math.sin(a)*d,v.ty+d*.05,Math.cos(a)*d);cam.lookAt(0,v.ty,0);cam.updateProjectionMatrix();
      S.r.setRenderTarget(rt);S.r.setClearColor(0x8c9097,1);S.r.clear();S.r.render(S.sc,cam);S.r.readRenderTargetPixels(rt,0,0,size,size,px);S.r.setRenderTarget(null);
      const id=tx.createImageData(size,size);for(let y=0;y<size;y++)id.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);tx.putImageData(id,0,0);cx.drawImage(tc,si*size,0);
      cx.fillStyle='#111';cx.font='11px sans-serif';cx.fillText(String(q.label||q.at),si*size+4,size-6);si++;}
    if(o.probe)info.push(o.probe(i,m));}
  S.tpivot.remove(holder);pcDispose(m);S.tpivot.visible=false;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;rt.dispose();
  const st=await fetch('http://localhost:8766/'+(o.name||'kphys')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.92)}).then(r=>r.status);return{st,info:info.filter(Boolean).slice(0,40)};};
/* animation test: the figure (with its controller) is moved by motion(i, holder, unit) each 1/60 s; pictures at shots [{at, view, label}]; unit: what the controller reads (anim, sitA, pcDraw) */
window.__kanim=async function(cfg,o){const S=pcStage(),size=o.size||220,V={side:{yaw:Math.PI/2,d:.98,ty:.18},front:{yaw:0,d:.98,ty:.18},q34:{yaw:.72,d:.98,ty:.18},back:{yaw:Math.PI,d:.98,ty:.18},b34:{yaw:2.4,d:.98,ty:.18},sidec:{yaw:Math.PI/2,d:.55,ty:.2},legs:{yaw:Math.PI/2,d:.45,ty:.1},bust:{yaw:.6,d:.45,ty:.27}};
  const shots=o.shots,cols=o.cols||shots.length,rows=Math.ceil(shots.length/cols),cv=document.createElement('canvas');cv.width=cols*size;cv.height=rows*size;const cx=cv.getContext('2d');
  const rt=new THREE.WebGLRenderTarget(size,size),px=new Uint8Array(size*size*4),tc=document.createElement('canvas');tc.width=tc.height=size;const tx=tc.getContext('2d');
  const dv=S.dais.visible;S.dais.visible=!!o.floor;S.pivot.visible=false;const holder=new THREE.Group();S.tpivot.add(holder);
  const m=heroModel('pc',Object.assign({},cfg,{_nokit:!o.kit}));holder.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=0;const ctl=m.userData.rig.ctl,unit=o.unit||{};
  const last=Math.max(...shots.map(q=>q.at));let si=0;const info=[];
  for(let i=0;i<=last;i++){if(o.motion)o.motion(i,holder,unit);holder.updateMatrixWorld(true);ctl(unit,1/60,i/60);if(unit.anim){unit.anim.t+=1/60;if(unit.anim.t>=unit.anim.d)unit.anim=o.loopAnim?Object.assign({},unit.anim,{t:0}):null;}
    while(si<shots.length&&shots[si].at===i){const q=shots[si],v=V[q.view||'side'],cam=S.cam;cam.aspect=1;const a=v.yaw,d=v.d,hp=holder.position;cam.position.set(hp.x+Math.sin(a)*d,v.ty+d*.05,hp.z+Math.cos(a)*d);cam.lookAt(hp.x,v.ty,hp.z);cam.updateProjectionMatrix();
      if(o.floor)S.dais.position.set(hp.x,-.015,hp.z);
      S.r.setRenderTarget(rt);S.r.setClearColor(0x8c9097,1);S.r.clear();S.r.render(S.sc,cam);S.r.readRenderTargetPixels(rt,0,0,size,size,px);S.r.setRenderTarget(null);
      const id=tx.createImageData(size,size);for(let y=0;y<size;y++)id.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);tx.putImageData(id,0,0);cx.drawImage(tc,(si%cols)*size,Math.floor(si/cols)*size);
      cx.fillStyle='#111';cx.font='11px sans-serif';cx.fillText(String(q.label||q.at),(si%cols)*size+4,Math.floor(si/cols)*size+size-6);si++;}
    if(o.probe)info.push(o.probe(i,m,unit));}
  S.tpivot.remove(holder);pcDispose(m);S.tpivot.visible=false;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;S.dais.position.set(0,-.015,0);rt.dispose();
  const st=await fetch('http://localhost:8766/'+(o.name||'kanim')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.status);return{st,info:info.filter(Boolean).slice(0,60)};};
})();

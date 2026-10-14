(function(){
/* Body lab (Task M): the figure in its bind pose without the kit, for checking the body against the body reference.
   window.__silh({cfg, yaw, res, y0, y1, step}) -> rows [{y, segs:[[a,b]...]}] of the silhouette (orthographic), a/b along the screen's right (yaw 0: x; yaw pi: -x; yaw -pi/2: z), figure units.
   window.__bodyShots({cfg, views:[{yaw, el, ty, h, label}], size, name, wire}) -> uploads name.jpg: the views side by side (wire: the triangle edges drawn over). */
const mk=(cfg,bind)=>{const S=pcStage(),m=heroModel('pc',Object.assign({gender:'m'},cfg||{},{_nokit:true}));S.tpivot.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=0;
  if(bind)m.traverse(b=>{if(b.isBone)b.rotation.set(0,0,0);});m.updateMatrixWorld(true);return{S,m};};
/* the reference's light: a strong key from above the camera's left, a soft fill, the sky dimmed (restored after) */
const refLight=(S,on,cam)=>{if(on){S._lt=[];S.sc.traverse(q=>{if(q.isLight&&q!==S._key&&q!==S._fill)S._lt.push([q,q.intensity,q.position?q.position.clone():null]);});for(const[q]of S._lt){if(q.isHemisphereLight)q.intensity=.2;else if(q.isDirectionalLight)q.intensity=0;else if(q.isAmbientLight)q.intensity*=.5;}
    if(!S._key){S._key=new THREE.DirectionalLight(0xfff4e8,.9);S._fill=new THREE.DirectionalLight(0xdfe6ff,.12);S.sc.add(S._key,S._key.target,S._fill,S._fill.target);}S._key.visible=S._fill.visible=true;}
  else{if(S._lt)for(const[q,i]of S._lt)q.intensity=i;if(S._key)S._key.visible=S._fill.visible=false;}
  if(on&&cam){const f=cam.getWorldDirection(new THREE.Vector3()),r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize(),c=new THREE.Vector3(0,.19,0);
    S._key.position.copy(c).addScaledVector(f,-1).addScaledVector(r,-1.1).add(new THREE.Vector3(0,.8,0));S._key.target.position.copy(c);S._fill.position.copy(c).addScaledVector(f,-1).addScaledVector(r,.9).add(new THREE.Vector3(0,-.2,0));S._fill.target.position.copy(c);
    S._key.updateMatrixWorld();S._key.target.updateMatrixWorld();S._fill.updateMatrixWorld();S._fill.target.updateMatrixWorld();}};
const done=(S,m,dv)=>{S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;};
const shoot=(S,cam,w,h,clear)=>{const rt=new THREE.WebGLRenderTarget(w,h),px=new Uint8Array(w*h*4);S.r.setRenderTarget(rt);S.r.setClearColor(clear==null?0x000000:clear,clear==null?0:1);S.r.clear();S.r.render(S.sc,cam);S.r.readRenderTargetPixels(rt,0,0,w,h,px);S.r.setRenderTarget(null);rt.dispose();
  const o=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)o.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);return o;};
const ortho=(yaw,el,cx,cy,hw,hh)=>{const cam=new THREE.OrthographicCamera(-hw,hw,hh,-hh,.01,10),d=new THREE.Vector3(Math.sin(yaw)*Math.cos(el),Math.sin(el),Math.cos(yaw)*Math.cos(el)),A=new THREE.Vector3(0,cy,0);
  cam.position.copy(A).addScaledVector(d,3);cam.up.set(0,1,0);cam.lookAt(A);if(cx){const r=new THREE.Vector3().crossVectors(cam.getWorldDirection(new THREE.Vector3()),cam.up).normalize();cam.position.addScaledVector(r,cx);}cam.updateMatrixWorld(true);return cam;};
window.__silh=function(o){o=o||{};const{S,m}=mk(o.cfg),dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;const res=o.res||2600,y0=o.y0==null?0:o.y0,y1=o.y1==null?.38:o.y1,hw=.1,H=Math.round((y1-y0)*res),W=Math.round(2*hw*res);
  const cam=ortho(o.yaw||0,0,0,(y0+y1)/2,hw,(y1-y0)/2),px=shoot(S,cam,W,H);done(S,m,dv);const out=[],step=o.step||.004;
  for(let y=y0+step/2;y<y1;y+=step){const r=Math.round((y1-y)*res);if(r<0||r>=H)continue;const segs=[];let s=-1;for(let x=0;x<W;x++){const a=px[(r*W+x)*4+3]>8;if(a&&s<0)s=x;if(!a&&s>=0){segs.push([s,x-1]);s=-1;}}if(s>=0)segs.push([s,W-1]);
    out.push({y:+y.toFixed(4),segs:segs.map(q=>[+(q[0]/res-hw).toFixed(4),+(q[1]/res-hw).toFixed(4)])});}
  return out;};
window.__silhTxt=function(o){return __silh(o).map(r=>r.y.toFixed(4)+' | '+r.segs.map(q=>q[0].toFixed(4)+'..'+q[1].toFixed(4)).join('  ')).join('\n');};
/* edges of the triangles of every visible mesh drawn as lines (for the topology) */
const wireOf=m=>{const g=new THREE.Group();m.updateMatrixWorld(true);m.traverse(q=>{if(!q.isMesh||!q.visible)return;let geo=q.geometry;if(q.isSkinnedMesh){/* bind pose: the positions as they are */}
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,1),new THREE.LineBasicMaterial({color:0x101010,transparent:true,opacity:.55,depthTest:true}));e.matrixAutoUpdate=false;e.matrix.copy(q.matrixWorld);g.add(e);});return g;};
window.__bodyShots=async function(o){o=o||{};const{S,m}=mk(o.cfg,o.bind||o.wire),dv=S.dais.visible;
  /* boneColor: every skinned vertex coloured by the bone that moves it most (thighs red, shins orange, pelvis/spine green, chest blue, the rest grey) */
  if(o.boneColor)m.traverse(q=>{if(!q.isSkinnedMesh)return;const g=q.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,bones=q.skeleton.bones,n=si.count,col=new Float32Array(n*3);
    for(let i=0;i<n;i++){let bi=0,bw=-1;for(let c=0;c<4;c++){const w=sw.array[i*4+c];if(w>bw){bw=w;bi=si.array[i*4+c];}}const nm=bones[bi].name;
      const c=/^thigh/.test(nm)?[.9,.15,.15]:/^shin|^foot|^toe/.test(nm)?[.95,.6,.1]:/^root|^spine/.test(nm)?[.2,.8,.25]:/^chest/.test(nm)?[.25,.4,.95]:[.6,.6,.6];col.set(c,i*3);}
    g.setAttribute('color',new THREE.BufferAttribute(col,3));q.material=q.material.clone();q.material.vertexColors=true;q.material.color.setHex(0xffffff);if(q.material.emissive)q.material.emissive.setHex(0x222222);q.material.needsUpdate=true;});if(o.pose){m.traverse(b=>{if(b.isBone&&o.pose[b.name])b.rotation.set(...o.pose[b.name]);});m.updateMatrixWorld(true);}if(o.mark)m.traverse(q=>{if(q.isMesh&&q.material&&q.material.color&&q.material.color.getHex()===o.mark){q.material=q.material.clone();q.material.color.setHex(0x00ff00);q.material.emissive&&q.material.emissive.setHex(0x00aa00);}});S.dais.visible=false;S.pivot.visible=false;const sz=o.size||420,views=o.views||[{yaw:0,label:'front'},{yaw:Math.PI/2,label:'side'},{yaw:Math.PI,label:'back'},{yaw:-.8,label:'3/4'}];
  let W=null;if(o.wire){W=wireOf(m);S.sc.add(W);}
  const cv=document.createElement('canvas');cv.width=views.length*sz;cv.height=Math.round(sz*(o.aspect||2))+18;const cx=cv.getContext('2d');cx.fillStyle='#2c3038';cx.fillRect(0,0,cv.width,cv.height);
  views.forEach((v,i)=>{const h=v.h||o.h||.4,ty=v.ty==null?(o.ty==null?.19:o.ty):v.ty,ww=sz,hh=Math.round(sz*(o.aspect||2)),cam=ortho(v.yaw||0,v.el||0,v.cx||0,ty,h/2/(hh/ww),h/2);
    if(o.light)refLight(S,true,cam);const px=shoot(S,cam,ww,hh,0x2c3038),id=new ImageData(px,ww,hh);if(o.light)refLight(S,false);cx.putImageData(id,i*sz,0);cx.fillStyle='#ddd';cx.font='13px sans-serif';cx.fillText(v.label||String(v.yaw),i*sz+6,hh+14);});
  if(W){S.sc.remove(W);W.traverse(q=>{if(q.geometry)q.geometry.dispose();});}
  done(S,m,dv);return fetch('http://localhost:8766/'+(o.name||'body')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.92)}).then(r=>r.text());};
/* poses of the controller: frames [{label, v (speed, figure units/s), t (seconds simulated), anim:{k, f (0..1)}, draw (weapon out), weapon ('bow'|'sword'), yaw, el, ty, h, cx}] -> uploads name.jpg */
window.__poseShots=async function(o){o=o||{};const fr=o.frames||[],sz=o.size||300,asp=o.aspect||1.6;const cv=document.createElement('canvas');cv.width=fr.length*sz;cv.height=Math.round(sz*asp)+18;const cx=cv.getContext('2d');cx.fillStyle='#2c3038';cx.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<fr.length;i++){const f=fr[i],S=pcStage(),m=heroModel('pc',Object.assign({gender:'m'},o.cfg||{},f.cfg||{}));S.tpivot.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=0;S.tpivot.position.set(0,0,0);const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;
    if(o.green){const skin=PCX_SKIN[(o.cfg&&o.cfg.skin)==null?1:o.cfg.skin].c;m.traverse(q=>{if(q.isMesh&&q.material&&q.material.color&&q.material.color.getHex()===skin){q.material=q.material.clone();q.material.color.setHex(0x00ff00);if(q.material.emissive)q.material.emissive.setHex(0x00cc00);}});}
    const R=m.userData.pcRig;if(f.weapon)R.weapon=()=>f.weapon;const ctl=R.ctl||(R.ctl=pcCtl(m)),dt=1/60,N=Math.round((f.t||1.2)/dt),sc=m.scale.x;let z=0;
    for(let k=0;k<N;k++){z+=(f.v||0)*dt*sc;S.tpivot.position.z=z;S.tpivot.updateMatrixWorld(true);const u={};if(f.draw&&k===0)u.pcDraw=true;if(f.anim){const d=.6,tt=Math.min(1,(f.anim.f||.5)*(k/(N-1)));u.anim={k:f.anim.k,t:tt*d,d};}ctl(u,dt);}
    S.tpivot.position.set(0,0,0);S.tpivot.updateMatrixWorld(true);m.updateMatrixWorld(true);
    const h=f.h||o.h||.4,ty=f.ty==null?(o.ty==null?.19:o.ty):f.ty,hh=Math.round(sz*asp),cam=ortho(f.yaw||0,f.el||0,f.cx||0,ty,h/2/(hh/sz),h/2);
    if(o.light)refLight(S,true,cam);const px=shoot(S,cam,sz,hh,0x2c3038);if(o.light)refLight(S,false);cx.putImageData(new ImageData(px,sz,hh),i*sz,0);cx.fillStyle='#ddd';cx.font='12px sans-serif';cx.fillText(f.label||'',i*sz+5,hh+13);
    done(S,m,dv);}
  return fetch('http://localhost:8766/'+(o.name||'poses')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.92)}).then(r=>r.text());};
/* the poke-through sheet: each configuration in a few views with the skin painted green (any green where cloth should be is skin showing through) -> name.jpg */
window.__greenSheet=async function(o){const list=o.list,views=o.views||[0,Math.PI/2,Math.PI,-.8],sz=o.size||180,asp=o.aspect||2.1,cv=document.createElement('canvas');cv.width=views.length*sz*Math.min(list.length,o.cols||2);
  const cols=o.cols||2,rows=Math.ceil(list.length/cols),hh=Math.round(sz*asp);cv.height=rows*(hh+16);const cx=cv.getContext('2d');cx.fillStyle='#2c3038';cx.fillRect(0,0,cv.width,cv.height);
  for(let n=0;n<list.length;n++){const c=list[n],{S,m}=mk(c,o.bind!==false),dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;const skin=PCX_SKIN[c.skin==null?1:c.skin].c;
    m.traverse(q=>{if(q.isMesh&&q.material&&q.material.color&&(q.material.color.getHex()===skin)){q.material=q.material.clone();q.material.color.setHex(0x00ff00);if(q.material.emissive)q.material.emissive.setHex(0x00cc00);}});
    const x0=(n%cols)*views.length*sz,y0=Math.floor(n/cols)*(hh+16);
    views.forEach((yaw,i)=>{const h=o.h||.4,ty=o.ty==null?.19:o.ty,cam=ortho(yaw,0,0,ty,h/2/(hh/sz),h/2);const px=shoot(S,cam,sz,hh,0x2c3038);cx.putImageData(new ImageData(px,sz,hh),x0+i*sz,y0);});
    cx.fillStyle='#ddd';cx.font='11px sans-serif';cx.fillText([c.gender,c.top1,c.top2,c.bottoms,c.shoes,c.acc||''].join(' '),x0+4,y0+hh+12);done(S,m,dv);}
  return fetch('http://localhost:8766/'+(o.name||'green')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.text());};
})();

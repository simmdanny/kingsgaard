(function(){
/* The villagers' lab: every template in a row on open ground of the loaded world (the game's own lights, sky and shadows), seen from the front, a side, the back or three quarters, by day or night.
   Needs a world (perf-world.js setup). window.__vl.show({view:'front'|'side'|'back'|'q34', t: meta.dayT, d: distance, only: [template indices], walk: phase, colors: k}) */
const L=window.__vl=window.__vl||{};
L.spot=function(){if(L.at)return L.at;const v=OW.villages[0];for(let r=30;r<200;r+=6)for(let a=0;a<6.28;a+=.35){const x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;
  let ok=true;for(let k=-8;k<=8&&ok;k+=2)for(let j=-4;j<=4&&ok;j+=2)if(!owFreeFor(x+k,z+j,1))ok=false;if(!ok)continue;const h=[-8,0,8].map(k=>owH(x+k,z));if(Math.max(...h)-Math.min(...h)>.6)continue;return L.at={x,z};}
  return L.at={x:v.x+40,z:v.z};};
L.build=function(o){o=o||{};if(L.grp){scene.remove(L.grp);}const s=L.spot(),g=new THREE.Group();L.grp=g;L.figs=[];const only=o.only||VIL_T.map((t,i)=>i),k=o.colors||0;
  only.forEach((ti,j)=>{const t=VIL_T[ti],F=t[0]==='f',h=q=>owHash2(ti*31+q*7+k*101,q*13+k*17),pk=(a,q)=>a[Math.floor(h(q)*a.length)];
    const base=[pk(PCX_SKIN,3).c,pk(PCX_HAIRC,4).c,pk([0x8a5a3a,0x5a7a9a,0x9a8a4a,0x7a4a5a,0x6a8a5a,0xa06a3a],8),pk(VIL_C2,5),pk(F?VIL_CBF:VIL_CB,6),pk(VIL_CS,7),pk([0x7a5a30,0x4a4a4a,0x9a3a2a],9)];
    const V=vilFigure(ti,base),x=s.x+(j-(only.length-1)/2)*(o.gap||1.1);V.g.scale.setScalar(2.78);V.g.position.set(x,owH(x,s.z),s.z);g.add(V.g);L.figs.push(V);});
  scene.add(g);return only.length;};
/* a pose of the rig: walk = the walk's phase (0..1, villager.js vilWalk) or null standing; mode carry / work as owVillagerStep does */
L.pose=function(ph,mode,spd){for(const p of L.figs){if(ph==null){p.wk=0;vilAnim(p,0,0,0,{carry:mode==='carry',work:mode==='work'});}else{p.wk=1;p.gph=((ph%1)+1)%1;vilAnim(p,0,spd||1.0,0,{carry:mode==='carry',work:mode==='work'});}}};/* (villager.js vilAnim: legs, feet, hips, chest, head, arms) */
/* a filmstrip sheet: a row per template, a column per phase of the walk; view side | q34 | front; uploaded as name.jpg */
L.strip=async function(o){o=o||{};const only=o.only||[0,1,4,5,6,7],n=o.n||6,W0=renderer.domElement.width,H0=renderer.domElement.height,cw=Math.round(H0*.34),ch=Math.round(H0*.62);
  const cv=document.createElement('canvas');cv.width=cw*n;cv.height=ch*only.length;const c2=cv.getContext('2d');
  for(let r=0;r<only.length;r++){L.build({only:[only[r]],colors:o.colors||0});const s=L.spot(),view=o.view||'side',yaw={front:0,side:Math.PI/2,back:Math.PI,q34:Math.PI/4}[view],d=o.d||3;
    for(let k=0;k<n;k++){L.pose(k/n,null);for(const p of L.figs)p.g.rotation.y=0;window.__pw.pose(s.x+Math.sin(yaw)*d,s.z+Math.cos(yaw)*d,.75,s.x,s.z,.62,600);for(const p of L.figs)p.g.rotation.y=0;L.pose(k/n,null);
      const hv=heroU&&heroU.g.visible;if(heroU)heroU.g.visible=false;/* (__pw.pose stands the hero where the camera is) */renderer.render(scene,camera);if(heroU)heroU.g.visible=hv;c2.drawImage(renderer.domElement,(W0-cw)/2,(H0-ch)/2,cw,ch,k*cw,r*ch,cw,ch);c2.fillStyle='#fff';c2.font='12px sans-serif';c2.fillText(VIL_T[only[r]][5]+'/'+VIL_T[only[r]][3]+' '+(k/n).toFixed(2),k*cw+4,r*ch+14);}}
  return (await fetch('http://localhost:8766/'+(o.name||'vl_strip')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.86)})).status;};
L.show=function(o){o=o||{};if(!L.grp||o.rebuild)L.build(o);const s=L.spot(),d=o.d||6,n=L.figs.length,view=o.view||'front';const yaw={front:0,side:Math.PI/2,back:Math.PI,q34:Math.PI/4,sideL:-Math.PI/2}[view];
  for(const p of L.figs)p.g.rotation.y=o.rot||0;L.pose(o.walk,o.mode);
  const cx=s.x+(o.cx||0),cz=s.z,ex=cx+Math.sin(yaw)*d,ez=cz+Math.cos(yaw)*d;window.__pw.pose(ex,ez,o.h||.9,cx,cz,o.th||.75,o.t==null?600:o.t);
  /* the villagers of the world out of the way */
  for(const v of OW.villages)for(const p of v.villagers)p.g.visible=false;renderer.render(scene,camera);return n;};
L.clear=function(){if(L.grp)scene.remove(L.grp);L.grp=null;};
})();
(function(){
/* pictures: views [{view, t, d, h, th, walk, mode, cx}] rendered with a camera of our own (fov 28) into one sheet shown over the page (window.__vl.sheet(views, {cols, w, h})); __vl.unsheet() removes it */
const L=window.__vl;
L.sheet=function(views,o){o=o||{};const cols=o.cols||views.length,W=o.w||400,H=o.h||520,rows=Math.ceil(views.length/cols),cv=document.createElement('canvas');cv.width=W*cols;cv.height=H*rows;const cx2=cv.getContext('2d');
  const cam=new THREE.PerspectiveCamera(o.fov||28,W/H,.05,2000),sz=new THREE.Vector2();renderer.getSize(sz);const pr=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(W,H,false);
  const s=L.spot();views.forEach((vw,i)=>{L.show(vw);const yaw={front:0,side:Math.PI/2,back:Math.PI,q34:Math.PI/4,sideL:-Math.PI/2,q34b:Math.PI*.75}[vw.view||'front'],d=vw.d||5,x0=s.x+(vw.cx||0),z0=s.z;
    const gy=owH(x0,z0);cam.position.set(x0+Math.sin(yaw)*d,gy+(vw.h||.75),z0+Math.cos(yaw)*d);cam.lookAt(x0,gy+(vw.th||.65),z0);cam.updateMatrixWorld();
    for(const v of OW.villages)for(const p of v.villagers)p.g.visible=false;renderer.render(scene,cam);cx2.drawImage(renderer.domElement,0,0,W,H,(i%cols)*W,Math.floor(i/cols)*H,W,H);
    cx2.fillStyle='#fff';cx2.font='14px sans-serif';cx2.fillText((vw.view||'front')+' t'+(vw.t==null?600:vw.t)+(vw.label?' '+vw.label:''),(i%cols)*W+6,Math.floor(i/cols)*H+16);});
  renderer.setPixelRatio(pr);renderer.setSize(sz.x,sz.y,false);
  L.unsheet();const img=document.createElement('img');img.id='vlSheet';img.src=cv.toDataURL('image/png');const k=Math.min((o.vw||800)/cv.width,(o.vh||600)/cv.height);img.style.cssText='position:fixed;left:0;top:0;width:'+Math.floor(cv.width*k)+'px;height:'+Math.floor(cv.height*k)+'px;max-width:none;z-index:99999;background:#222';document.body.appendChild(img);return cv.width+'x'+cv.height;};
L.unsheet=function(){const e=document.getElementById('vlSheet');if(e)e.remove();};
})();
(function(){
/* the reduction side by side: template ti at full detail (left) and as baked (right): __vl.cmp(ti) then __vl.sheet(...) with cx -0.55 / +0.55 */
const L=window.__vl;
L.cmp=function(ti,colors){const keep=VIL_TPL[ti],tri=VIL_TRI;delete VIL_TPL[ti];VIL_TRI=1e9;const full=vilTemplate(ti);VIL_TRI=tri;VIL_TPL[ti]=keep||vilTemplate(ti);
  if(L.grp)scene.remove(L.grp);const s=L.spot(),g=new THREE.Group();L.grp=g;L.figs=[];const t=VIL_T[ti],F=t[0]==='f',k=colors||0,h=q=>owHash2(ti*31+q*7+k*101,q*13+k*17),pk=(a,q)=>a[Math.floor(h(q)*a.length)];
  const base=[pk(PCX_SKIN,3).c,pk(PCX_HAIRC,4).c,pk([0x8a5a3a,0x5a7a9a,0x9a8a4a,0x7a4a5a,0x6a8a5a,0xa06a3a],8),pk(VIL_C2,5),pk(F?VIL_CBF:VIL_CB,6),pk(VIL_CS,7),pk([0x7a5a30,0x4a4a4a,0x9a3a2a],9)];
  [full,VIL_TPL[ti]].forEach((T,j)=>{VIL_TPL[ti]=T;const V=vilFigure(ti,base),x=s.x+(j-.5)*1.1;V.g.scale.setScalar(2.78);V.g.position.set(x,owH(x,s.z),s.z);g.add(V.g);L.figs.push(V);});
  VIL_TPL[ti]=keep||VIL_TPL[ti];scene.add(g);return [full.tris,VIL_TPL[ti].tris];};
})();
(function(){
/* the hero beside the villagers (the same scale as in the world, HS): __vl.hero(cfg, cx) adds the player's character of the look cfg (default: PC) to the row at the offset cx */
const L=window.__vl;
L.hero=function(cfg,cx){const s=L.spot(),g=heroModel('pc',Object.assign({},cfg||PC,{_nokit:true}));const r=new THREE.Group();r.add(g);r.scale.setScalar(HS);const x=s.x+(cx||0);r.position.set(x,owH(x,s.z),s.z);(L.grp||scene).add(r);
  r.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return r;};
})();

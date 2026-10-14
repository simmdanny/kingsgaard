(function(){
/* Multi-view fitting: the head drawn with an orthographic camera that orbits a point of the head (head units) at yaw (0: in front of the face, +pi/2: on his left, the face pointing to the picture's left) and
   elevation el (+ above, - below), px pixels per head unit, the point placed at pixel at=[x,y] of a reference picture (dist/refvN.png ...); its edges (cyan) laid over the reference's (red).
   window.__refFit({ref, cfg, yaw, el, px, anchor:[x,y,z], at:[x,y], name, scale}) -> uploads name.jpg: [reference | overlay | render] */
window.__refFit=async function(o){const S=pcStage(),Y=PCL.y,U=Y.U*(o.hs||(o.cfg&&o.cfg.gender==='f'?1:.9074)),sc=o.scale||2;/* (his head is drawn 1.1 times the figure's unit) */
  /* crop: [x0, y0, w, h] of a big reference (at stays in the full picture's pixels) */
  const bm=await createImageBitmap(await (await fetch(o.ref+'?'+Date.now())).blob()),cr=o.crop||[0,0,bm.width,bm.height],W=cr[2],H=cr[3],c0=document.createElement('canvas');c0.width=W;c0.height=H;c0.getContext('2d').drawImage(bm,cr[0],cr[1],W,H,0,0,W,H);
  o=Object.assign({},o,{at:[o.at[0]-cr[0],o.at[1]-cr[1]]});
  const m=heroModel('pc',Object.assign({},o.cfg||{gender:'m'},{_nokit:true}));S.tpivot.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=0;const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;m.updateMatrixWorld(true);
  /* headOnly: only the head (what hangs on the head bone, and the skinned head and hair) - the references are a bust; refLight: the reference's light (a warm bounce from below, more fill) */
  if(o.headOnly){const keep=new Set();m.traverse(q=>{if(q.isBone&&/head/i.test(q.name))q.traverse(c=>keep.add(c));});m.traverse(q=>{if(q.isMesh&&!keep.has(q)&&!(q.material&&q.material.vertexColors))q.visible=false;});}
  const LS=[];if(o.refLight)S.sc.traverse(q=>{if(q.isHemisphereLight){LS.push([q,q.intensity,q.groundColor.getHex(),q.color.getHex()]);q.intensity=.85;q.groundColor.setHex(0xd2906a);q.color.setHex(0xfff4ea);}else if(q.isDirectionalLight){LS.push([q,q.intensity]);q.intensity*=.75;}});
  const an=o.anchor||[0,0,0],A=new THREE.Vector3(an[0]*U,Y.hc+an[1]*U,an[2]*U),yaw=o.yaw||0,el=o.el||0,dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(el),Math.sin(el),Math.cos(yaw)*Math.cos(el));
  const k=U/o.px,ix=o.at[0],iy=o.at[1];let cam;
  if(o.fov){/* a perspective camera: px per head unit at the anchor's distance; the anchor placed at 'at' by a view offset */const t=Math.tan(o.fov*Math.PI/360),dist=H/(t*o.px/U);
    cam=new THREE.PerspectiveCamera(o.fov,W/H,.001,10);cam.position.copy(A).addScaledVector(dir,dist);cam.up.set(0,1,0);cam.lookAt(A);cam.setViewOffset(2*W,2*H,W-ix,H-iy,W,H);cam.updateProjectionMatrix();}
  else{cam=new THREE.OrthographicCamera(-ix*k,(W-ix)*k,iy*k,-(H-iy)*k,.01,10);cam.position.copy(A).addScaledVector(dir,3);cam.up.set(0,1,0);cam.lookAt(A);}
  const w=W*sc,h=H*sc,rt=new THREE.WebGLRenderTarget(w,h),px=new Uint8Array(w*h*4);S.r.setRenderTarget(rt);S.r.setClearColor(0x2c2c2c,1);S.r.clear();S.r.render(S.sc,cam);S.r.readRenderTargetPixels(rt,0,0,w,h,px);S.r.setRenderTarget(null);
  for(const L of LS){L[0].intensity=L[1];if(L.length>2){L[0].groundColor.setHex(L[2]);L[0].color.setHex(L[3]);}}
  S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;rt.dispose();
  const mine=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)mine.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);
  const rc=document.createElement('canvas');rc.width=w;rc.height=h;const rg=rc.getContext('2d');rg.imageSmoothingEnabled=true;rg.drawImage(c0,0,0,w,h);const ref=rg.getImageData(0,0,w,h).data;
  const edges=d=>{const L=new Float32Array(w*h),E=new Float32Array(w*h);for(let i=0;i<w*h;i++)L[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=L[i-w+1]+2*L[i+1]+L[i+w+1]-L[i-w-1]-2*L[i-1]-L[i+w-1],gy=L[i+w-1]+2*L[i+w]+L[i+w+1]-L[i-w-1]-2*L[i-w]-L[i-w+1];E[i]=Math.hypot(gx,gy);}return E;};
  const Er=edges(ref),Em=edges(mine),cv=document.createElement('canvas');cv.width=w*3+20;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
  const put=(d,x)=>{const id=cx.createImageData(w,h);id.data.set(d);cx.putImageData(id,x,0);};put(ref,0);put(mine,2*w+20);
  const ov=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){const g=(.3*ref[i*4]+.59*ref[i*4+1]+.11*ref[i*4+2])*.45+40,a=Math.min(1,Math.max(0,(Er[i]-14)/30)),b=Math.min(1,Math.max(0,(Em[i]-14)/30));
    ov[i*4]=Math.min(255,g*(1-a)*(1-b)+255*a);ov[i*4+1]=Math.min(255,g*(1-a)*(1-b)+230*b);ov[i*4+2]=Math.min(255,g*(1-a)*(1-b)+255*b);ov[i*4+3]=255;}
  put(ov,w+10);return fetch('http://localhost:8766/'+(o.name||'reffit')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.status);};
})();

(function(){
/* The reference overlay: the head drawn with an orthographic camera in the view and at the scale of the reference picture (dist/ref2.webp: the male head turned by th to its left, 253 px per head unit, the hair
   top at y 160, the axis of the neck at x 1335), its edges laid over the reference's edges. window.__refOv({cfg, th, name, x0, y0, w, h, el}) -> uploads name.jpg: [reference | overlay | render]. */
window.__refOv=async function(o){o=o||{};const S=pcStage(),th=o.th==null?.19:o.th,x0=o.x0||1080,y0=o.y0||140,w=o.w||560,h=o.h||800,PX=253,AX=1335,HT=160,HU=1.25;
  if(!window.__refCv){const bm=await createImageBitmap(await (await fetch('ref2.webp?'+Date.now())).blob());const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);window.__refCv=c;}
  const W2=.027/PX,Y=PCL.y,m=heroModel('pc',Object.assign({},o.cfg||{gender:'m'},{_nokit:true}));S.tpivot.add(m);S.tpivot.visible=true;S.tpivot.rotation.y=th;const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;
  m.updateMatrixWorld(true);
  /* the camera: x of the picture -> world x (the neck's axis at AX, after the turn), y -> world y (head units from the hair top) */
  const zc=-.12*Y.U,axX=zc*Math.sin(th),wx=px=>(px-AX)*W2+axX,wy=py=>Y.hc+Y.U*(HU-(py-HT)/PX);
  const cam=new THREE.OrthographicCamera(wx(x0),wx(x0+w),wy(y0),wy(y0+h),.01,10);cam.position.set(0,0,3);cam.lookAt(0,0,0);
  if(o.el){cam.position.set(0,3*Math.sin(o.el),3*Math.cos(o.el));cam.lookAt(0,0,0);}
  const rt=new THREE.WebGLRenderTarget(w,h),px=new Uint8Array(w*h*4);S.r.setRenderTarget(rt);S.r.setClearColor(0x2c2c2c,1);S.r.clear();S.r.render(S.sc,cam);S.r.readRenderTargetPixels(rt,0,0,w,h,px);S.r.setRenderTarget(null);
  S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;S.tpivot.rotation.y=0;S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;rt.dispose();
  const mine=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)mine.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);
  const ref=window.__refCv.getContext('2d').getImageData(x0,y0,w,h).data;
  const edges=d=>{const L=new Float32Array(w*h),E=new Float32Array(w*h);for(let i=0;i<w*h;i++)L[i]=.3*d[i*4]+.59*d[i*4+1]+.11*d[i*4+2];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=L[i-w+1]+2*L[i+1]+L[i+w+1]-L[i-w-1]-2*L[i-1]-L[i+w-1],gy=L[i+w-1]+2*L[i+w]+L[i+w+1]-L[i-w-1]-2*L[i-w]-L[i-w+1];E[i]=Math.hypot(gx,gy);}return E;};
  const Er=edges(ref),Em=edges(mine),cv=document.createElement('canvas');cv.width=w*3+20;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
  const put=(d,x)=>{const id=cx.createImageData(w,h);id.data.set(d);cx.putImageData(id,x,0);};put(ref,0);put(mine,2*w+20);
  const ov=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){const g=(.3*ref[i*4]+.59*ref[i*4+1]+.11*ref[i*4+2])*.45+40,a=Math.min(1,Math.max(0,(Er[i]-12)/30)),b=Math.min(1,Math.max(0,(Em[i]-12)/30));
    ov[i*4]=Math.min(255,g*(1-a)*(1-b)+255*a);ov[i*4+1]=Math.min(255,g*(1-a)*(1-b)+230*b);ov[i*4+2]=Math.min(255,g*(1-a)*(1-b)+255*b);ov[i*4+3]=255;}
  put(ov,w+10);cx.strokeStyle='rgba(255,255,0,.35)';for(let yy=Math.ceil(y0/50)*50;yy<y0+h;yy+=50){cx.beginPath();cx.moveTo(w+10,yy-y0);cx.lineTo(2*w+10,yy-y0);cx.stroke();}
  return fetch('http://localhost:8766/'+(o.name||'refov')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.9)}).then(r=>r.status);};
})();

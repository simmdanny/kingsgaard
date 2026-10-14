(function(){
/* A sheet of furniture variants on a grid in front of the camera, one row per kind, one column per variant seed, at a tier (window.__ft, default 3): window.__furn(kind, tier, name) uploads a screenshot. */
window.__furn=function(kinds,tier,name,cols){cols=cols||8;const old=scene.getObjectByName('furnSheet');if(old){scene.remove(old);}
  const kb=kitBuilder(),R0=mulberry(77);let row=0;const pos=[];const g=new THREE.Group();g.name='furnSheet';
  kinds.forEach((k,ri)=>{const spec=OWI_ITEM[k]||OWI_ITEM[k.replace(/[SLWX]+$/,'')]||{w:1,d:.6};for(let c=0;c<cols;c++){const it={kind:k,spec,x:c*(Math.max(spec.w,.9)+.35),z:-ri*(Math.max(spec.d,.8)+.55),rot:0,seed:1000+c*37+ri*101,tier,ceil:2.4,bk:window.__fbk||'',rk:window.__frk||''};owiAddItem(kb,it,0);}});
  const geo=mergeParts((kb.B.a||[]).concat(kb.B.c||[])),gg=kb.B.g?mergeParts(kb.B.g):null;const mat=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:5});const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;g.add(m);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshPhongMaterial({color:0x7a5a38}));fl.rotation.x=-Math.PI/2;fl.position.set(8,-.01,-4);fl.receiveShadow=true;g.add(fl);
  const v=OW.villages[0];const ox=v.x+120,oz=v.z+120,oy=owH(ox,oz)+30;g.position.set(ox,oy,oz);scene.add(g);g.updateMatrixWorld(true);
  FLY.on=true;FLY.pos.set(ox+cols*.55,oy+1.6+kinds.length*.55,oz+3.4+kinds.length*.5);const tx=ox+cols*.55,tz=oz-kinds.length*.5;FLY.yaw=Math.PI;FLY.pitch=-.5;heroU.x=ox;heroU.z=oz;
  for(let i=0;i<6;i++){flyApply();dayStep(.033);anim(.033,i*.033);owFrame();}renderer.render(scene,camera);
  return window.__sh(name);};
return 'ok';})()

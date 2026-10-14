(function(){
/* A sheet of the outdoor props of the library (props.js), one row per kind and one column per place (the shapes come from a hash of the place): window.__prop(kinds, cols, name, camScale) renders them in front of the free camera. */
window.__prop=function(kinds,cols,name,sc){cols=cols||8;sc=sc||1;const old=scene.getObjectByName('propSheet');if(old)scene.remove(old);
  const kb=kitBuilder(),R0=mulberry(5),loc=(x,z,rot,lx,lz)=>[x+Math.cos(rot)*lx+Math.sin(rot)*lz,z-Math.sin(rot)*lx+Math.cos(rot)*lz];const lib=owPropLib({P:kb.P,PY:kb.PY,R:R0,Yf:()=>0,loc});
  kinds.forEach((k,ri)=>{for(let c=0;c<cols;c++){lib[k](c*(k==='laundry'?4:k==='cart'||k==='board'?2.2:1.6)+hh(c,ri),-ri*(k==='laundry'?1.5:2.2)+hh(ri,c),c*.3);}});
  function hh(a,b){return(owHash2(a*7+1,b*13+3)-.5)*.4;}
  const g=new THREE.Group();g.name='propSheet';const m=new THREE.Mesh(mergeParts(kb.B.d),VCMAT);m.castShadow=true;m.receiveShadow=true;g.add(m);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshPhongMaterial({color:0x6a8a3e}));fl.rotation.x=-Math.PI/2;fl.position.set(8,-.01,-4);fl.receiveShadow=true;g.add(fl);
  const v=OW.villages[0];const ox=v.x+120,oz=v.z+120,oy=owH(ox,oz)+30;g.position.set(ox,oy,oz);scene.add(g);g.updateMatrixWorld(true);
  FLY.on=true;FLY.pos.set(ox+cols*.8,oy+(2.2+kinds.length*.7)*sc,oz+(4+kinds.length*1.0)*sc);FLY.yaw=Math.PI;FLY.pitch=-.5;heroU.x=ox;heroU.z=oz;
  for(let i=0;i<6;i++){flyApply();dayStep(.033);anim(.033,i*.033);owFrame();}renderer.render(scene,camera);return 'ok '+kb.B.d.length+' parts';};
return 'ok';})()

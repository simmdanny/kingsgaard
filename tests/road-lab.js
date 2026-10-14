(function(){
/* The city roads' lab (roadstones.js). Needs a world (perf-world.js setup).
   __rl.view([{x,z,h, tx,tz,th, t, fov, label}], {w,h,cols}): pictures with cameras of our own (the stones of the tiles round each camera are built first), shown as one sheet over the page; __rl.unsheet().
   __rl.at(rid, s, l): the point of a path; __rl.stats(village): stones, triangles and build time of the tiles of a village; __rl.check(village): overlaps between stones of different paths. */
const L=window.__rl={};
L.at=(rid,s,l)=>{const P=owrPath(rid),o=[0,0];owrAt(P,s,l||0,o);return o;};
L.view=function(vs,o){o=o||{};const W=o.w||800,H=o.h||600,cols=o.cols||1,rows=Math.ceil(vs.length/cols),cv=document.createElement('canvas');cv.width=W*cols;cv.height=H*rows;const c2=cv.getContext('2d');
  const sz=new THREE.Vector2();renderer.getSize(sz);const pr=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(W,H,false);
  vs.forEach((v,i)=>{window.__pw.pose(v.x,v.z,v.h,v.tx,v.tz,v.th,v.t==null?600:v.t);OW.focus={x:v.x,z:v.z};owgView(v.x,v.z,true);if(L.hook)L.hook(v);const cam=new THREE.PerspectiveCamera(v.fov||50,W/H,.05,3000);
    cam.position.set(v.x,owH(v.x,v.z)+v.h,v.z);cam.lookAt(v.tx,owH(v.tx,v.tz)+v.th,v.tz);cam.updateMatrixWorld();renderer.render(scene,cam);c2.drawImage(renderer.domElement,0,0,W,H,(i%cols)*W,Math.floor(i/cols)*H,W,H);
    if(v.label){c2.fillStyle='#fff';c2.font='14px sans-serif';c2.fillText(v.label,(i%cols)*W+6,Math.floor(i/cols)*H+16);}});
  renderer.setPixelRatio(pr);renderer.setSize(sz.x,sz.y,false);L.unsheet();const img=document.createElement('img');img.id='rlSheet';img.src=cv.toDataURL('image/png');
  const k=Math.min((o.vw||innerWidth)/cv.width,(o.vh||innerHeight)/cv.height);img.style.cssText='position:fixed;left:0;top:0;width:'+Math.floor(cv.width*k)+'px;height:'+Math.floor(cv.height*k)+'px;max-width:none;z-index:99999;background:#222';document.body.appendChild(img);return cv.width+'x'+cv.height;};
L.unsheet=()=>{const e=document.getElementById('rlSheet');if(e)e.remove();};
L.tiles=v=>[...OW.G.tiles.values()].filter(t=>Math.hypot(t.cx-v.x,t.cz-v.z)<v.rad+40);
L.stats=function(v){let n=0,ms=0,stones=0,tris=0,trisFar=0,verts=0,mx=0;for(const t of L.tiles(v)){if(t.state===0)owgBuildTile(t);if(t.state!==1||!t.segs)continue;
    if(t.stone){OW.group.remove(t.stone);t.stone.geometry.dispose();t.stone=null;}const a=performance.now();owrBuildTile(t);t.stoneDone=true;t.stoneLod=-1;const d=performance.now()-a;if(!t.stone)continue;n++;ms+=d;mx=Math.max(mx,d);stones+=t.stoneN;
    const g=t.stone.geometry;tris+=g.userData.n0/3;trisFar+=g.userData.n1/3;verts+=g.attributes.position.count;}
  return{tiles:n,ms:+ms.toFixed(0),maxTileMs:+mx.toFixed(1),avgTileMs:+(ms/Math.max(1,n)).toFixed(1),stones,trisFull:Math.round(tris),trisTops:Math.round(trisFar),verts};};
})();
(function(){
/* the hero standing at (x, z) facing yaw (for scale in the pictures) */
const L=window.__rl;
L.hero=function(x,z,yaw){const H=heroU;if(!H)return;H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.dest=null;H.rcTo=null;H.badT=0;H.okX=null;H.g.position.set(x,owH(x,z),z);if(yaw!=null)H.g.rotation.y=yaw;};
})();
(function(){
/* a villager figure standing at (x, z) for scale (removed with __rl.figs(null)) */
const L=window.__rl;L._figs=[];
L.fig=function(x,z,yaw,ti){const V=vilFigure(ti==null?0:ti,[PCX_SKIN[1].c,PCX_HAIRC[2].c,0x5a7a9a,VIL_C2[0],VIL_CB[0],VIL_CS[0],0x7a5a30]);V.g.scale.setScalar(2.78);V.g.position.set(x,owH(x,z),z);V.g.rotation.y=yaw||0;scene.add(V.g);L._figs.push(V.g);return V;};
L.figs=function(){for(const g of L._figs)scene.remove(g);L._figs=[];};
})();

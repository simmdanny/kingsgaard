(function(){
/* The head-design preview: heads on a neutral grey ground, one fixed light set, a close camera, in the same views (front, three quarters, profile, three quarters from behind, and the whole figure at about the size
   it has in play). window.__headLab(rows, {name, size, views, ty}) -> uploads name.jpg (screenshot server on 8766); rows: [{cfg, label}]. The configurations are drawn without the bow and quiver. */
const VIEWS={eyes:{yaw:.0,d:.075,ty:.335},eyes34:{yaw:.6,d:.085,ty:.335},front:{yaw:0,d:.22,ty:.34},q34:{yaw:.72,d:.22,ty:.34},side:{yaw:Math.PI/2,d:.22,ty:.34},back34:{yaw:2.45,d:.24,ty:.34},game:{yaw:.5,d:1.15,ty:.2},bfront:{yaw:0,d:.98,ty:.18},b34:{yaw:.72,d:.98,ty:.18},bside:{yaw:Math.PI/2,d:.98,ty:.18},bback:{yaw:Math.PI,d:.98,ty:.18},bust:{yaw:.4,d:.42,ty:.3},bustf:{yaw:0,d:.42,ty:.3},busts:{yaw:Math.PI/2,d:.42,ty:.3},legs:{yaw:.5,d:.5,ty:.09},top:{yaw:.4,d:.22,ty:.34,el:1.1},under:{yaw:.5,d:.2,ty:.33,el:-.5},bald:{yaw:.72,d:.22,ty:.34},sideL:{yaw:-Math.PI/2,d:.24,ty:.33},q34L:{yaw:-1.15,d:.24,ty:.33}};
window.__headLab=async function(rows,o){o=o||{};const S=pcStage(),size=o.size||240,views=o.views||['front','q34','side','back34','game'],ty=o.ty||.33,LH=16;
  const cv=document.createElement('canvas');cv.width=views.length*size;cv.height=rows.length*(size+LH);const cx=cv.getContext('2d');cx.fillStyle='#8c9097';cx.fillRect(0,0,cv.width,cv.height);
  const rt=new THREE.WebGLRenderTarget(size,size),px=new Uint8Array(size*size*4),tc=document.createElement('canvas');tc.width=tc.height=size;const tx=tc.getContext('2d');
  const dv=S.dais.visible;S.dais.visible=false;S.pivot.visible=false;
  rows.forEach((row,ri)=>{const m=heroModel('pc',Object.assign({},row.cfg,{_nokit:true}));if(o.post)o.post(m,row);S.tpivot.add(m);S.tpivot.visible=true;
    views.forEach((vn,vi)=>{const v=VIEWS[vn],t=v.ty||ty;S.tpivot.rotation.y=v.yaw;S.cam.aspect=1;if(v.el!=null)S.cam.position.set(0,t+v.d*Math.sin(v.el),v.d*Math.cos(v.el));else S.cam.position.set(0,t+v.d*(v.d>.5?.16:.05),v.d);S.cam.lookAt(0,t,0);S.cam.updateProjectionMatrix();
      S.r.setRenderTarget(rt);S.r.setClearColor(0x8c9097,1);S.r.clear();S.r.render(S.sc,S.cam);S.r.readRenderTargetPixels(rt,0,0,size,size,px);S.r.setRenderTarget(null);
      const id=tx.createImageData(size,size);for(let y=0;y<size;y++)id.data.set(px.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);tx.putImageData(id,0,0);
      const x=vi*size,y=ri*(size+LH);cx.drawImage(tc,x,y);if(vi===0){cx.fillStyle='#111';cx.font='12px sans-serif';cx.fillText(String(row.label||''),x+4,y+size+12);}});
    S.tpivot.remove(m);pcDispose(m);S.tpivot.visible=false;});
  S.r.setClearColor(0x000000,0);S.pivot.visible=true;S.dais.visible=dv;rt.dispose();
  return fetch('http://localhost:8766/'+(o.name||'headlab')+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.92)}).then(r=>r.status);};
})();

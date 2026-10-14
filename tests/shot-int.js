(function(){
/* Screenshots of the orbit camera inside a building: window.__si(spec) with {type, idx, lv, yaw, pitch, dist, name, at:[fx,fz] (fractions of the floor)} -> uploads name.jpg to the screenshot server (8766). Needs int-lib.js. */
const I=window.__iw;
window.__sh=function(n){renderer.render(scene,camera);return fetch('http://localhost:8766/'+n+'.jpg',{method:'POST',body:renderer.domElement.toDataURL('image/jpeg',.82)}).then(r=>r.status);};
window.__si=function(o){const L=I.list(o.type).filter(b=>b.enter&&b.arch.leaf&&!b.tunnel),b=L[o.idx||0];{const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);owdSet(b,true,{instant:true,dir:1});
  const P=b.ic.P,F=P.floors[o.lv||0],Q=F.Q,fx=(o.at&&o.at[0])!=null?o.at[0]:.5,fz=(o.at&&o.at[1])!=null?o.at[1]:.5,w=owiL2W(b,Q.xa+(Q.xb-Q.xa)*fx,Q.za+(Q.zb-Q.za)*fz);I.tele(w[0],w[1]);
  if(o.lv){for(const f of P.stairs){}}
  for(let i=0;i<30;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);}
  if(camMode()!=='tp')camSet('tp');TPC.yaw=o.yaw||0;TPC.pitch=o.pitch==null?.45:o.pitch;TPC.dist=o.dist||6;
  for(let k=0;k<60;k++){heroUpdate(1/30);owiTick(1/30);owFrame();}owView(true);tpcApply();
  return window.__sh(o.name||'si').then(s=>b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' lv'+OWI.lv+' in'+OWI.in+' top '+b.topPlane.constant.toFixed(1)+' cut '+b.cutPlane.constant.toFixed(1)+' cam '+b.camPlane.constant.toFixed(1)+' '+s);};
return 'ok';})()

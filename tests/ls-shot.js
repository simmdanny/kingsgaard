(function(){
/* Screenshots of the lighting in a room. Needs int-lib.js (I.setup first) and the screenshot server (8766).
   window.__ls.go({type, idx | at:[x,z], lv, room (kind), at2:[lx,lz] (local metres), mode:'fp'|'tp', yaw, pitch, dist, t (meta.dayT), name, noshot})
   -> places the hero in that room on that floor, sets the time of day, lets the lights settle, draws, uploads name.jpg. Returns a description. */
const I=window.__iw,L=window.__ls={};
window.__sh=window.__sh||function(n){renderer.render(scene,camera);return fetch('http://localhost:8766/'+n+'.jpg',{method:'POST',body:renderer.domElement.toDataURL('image/jpeg',.85)}).then(r=>r.status);};
L.find=(type,fn)=>OWI.list.filter(b=>(!type||b.type===type)&&b.arch&&b.arch.leaf&&!b.tunnel&&(!fn||fn(b)));
L.step=(n)=>{for(let i=0;i<(n||30);i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}};
/* the way the hero's movement enters a house (walk.js owiHeroY): the shadow proxy goes off, the real meshes cast, the batched mesh gives way */
L.enter=(b,lv)=>{if(OWI.cb!==b){if(OWI.cb)owiLeave();OWI.cb=b;OWI.lv=0;OWI.in=false;owBldRefresh(b);owiCastOn(b,true);}OWI.lv=lv||0;OWI.in=true;heroU.oyT=null;};
/* every room of every house with the windows that belong to it: [{b, lv, room, area, wins:[{face,w,h}], dirs:[...]}] (a window belongs to the room when it is on an outer wall within 0.4 m of the room's rectangle) */
L.rooms=function(fn){const out=[];for(const b of OWI.list){if(!b.arch||!b.arch.leaf||b.tunnel)continue;owiEnsurePlan(b);const P=b.ic.P;if(!P||!P.floors)continue;
  for(const F of P.floors){for(const room of F.rooms){const wins=[];let area=0;for(const q of room.rects){area+=(q.xb-q.xa)*(q.zb-q.za);}
    for(const w of P.wins){if(w.st!==F.i)continue;for(const q of room.rects){const Q=F.Q;let hit=false;
      if(w.wall==='zb')hit=Math.abs(q.zb-Q.zb)<.4&&w.b>q.xa&&w.a<q.xb;else if(w.wall==='za')hit=Math.abs(q.za-Q.za)<.4&&w.b>q.xa&&w.a<q.xb;else if(w.wall==='xa')hit=Math.abs(q.xa-Q.xa)<.4&&w.b>q.za&&w.a<q.zb;else hit=Math.abs(q.xb-Q.xb)<.4&&w.b>q.za&&w.a<q.zb;
      if(hit){wins.push({face:w.wall,w:+(w.b-w.a).toFixed(2),h:+(w.y1-w.y0).toFixed(2)});break;}}}
    if(P.door&&F.i===0&&room.rects.some(q=>Math.abs(q.zb-F.Q.zb)<.4&&P.door.u>q.xa&&P.door.u<q.xb))wins.push({face:'door',w:+P.door.w.toFixed(2),h:+P.door.h.toFixed(2)});
    const r={b,lv:F.i,room,area:+area.toFixed(1),wins};if(!fn||fn(r))out.push(r);}}}
  return out;};
L.go=async function(o){
  let b=o.b;if(!b){if(o.at){b=OWI.list.find(q=>Math.abs(q.x-o.at[0])<2&&Math.abs(q.z-o.at[1])<2);}else b=(o.list||L.find(o.type))[o.idx||0];}
  if(!b)return 'no building';
  {const q=I.ground(b,4);I.tele(q[0],q[1]);}I.settle(b);owiEnsurePlan(b);const P=b.ic.P;owdSet&&0;
  const lv=o.lv||0,F=P.floors[lv];let room=null;if(o.room)room=F.rooms.find(r=>r.kind===o.room)||null;if(!room)room=F.rooms.slice().sort((a,c)=>{const ar=r=>r.rects.reduce((s,q)=>s+(q.xb-q.xa)*(q.zb-q.za),0);return ar(c)-ar(a);})[0];
  const rc=room.rects.slice().sort((a,c)=>(c.xb-c.xa)*(c.zb-c.za)-(a.xb-a.xa)*(a.zb-a.za))[0];
  /* the free place (no collider, 0.35 m clear) of the room nearest to its middle */
  const spot=()=>{const cx=(rc.xa+rc.xb)/2,cz=(rc.za+rc.zb)/2;let best=null,bd=1e9;for(let x=rc.xa+.3;x<=rc.xb-.3;x+=.2)for(let z=rc.za+.3;z<=rc.zb-.3;z+=.2){if(b.ic.col&&owiHit(b.ic.col,x,z,1<<lv,OWI.RAD+.1))continue;if(P.stairs.some(f=>x>f.x0-.7&&x<f.x1+.7&&z>Math.min(f.z0,f.z1)-.7&&z<Math.max(f.z0,f.z1)+.7))continue;const d=Math.hypot(x-cx,z-cz);if(d<bd){bd=d;best=[x,z];}}return best||[cx,cz];};
  const sp=o.at2?o.at2:spot(),lx=sp[0],lz=sp[1],w=owiL2W(b,lx,lz);
  if(o.t!=null)meta.dayT=o.t;
  I.tele(w[0],w[1]);L.enter(b,lv);
  for(let i=0;i<40;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);}
  camSet(o.mode||'tp');TPC.yaw=o.yaw||0;TPC.pitch=o.pitch==null?(o.mode==='fp'?-.05:.5):o.pitch;TPC.dist=o.dist||5;
  L.step(o.settle||40);owView(true);tpcApply();
  const d=b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)+' lv'+OWI.lv+' in'+OWI.in+' room '+room.id+':'+room.kind+' local '+lx.toFixed(1)+','+lz.toFixed(1)+' t='+meta.dayT;
  if(o.noshot)return d;const s=await window.__sh(o.name||'ls');return d+' '+s;};
/* the brightness of the floor at a point of a house, as drawn: the camera hangs 1.4 m over it and looks straight down, the mean of the centre of the picture. The hero stands there (his model is hidden), so the lights that follow him follow the probe.
   L.probe(b, lv, lx, lz, {t, frames}) -> {r,g,b,lum} */
L.probe=function(b,lv,lx,lz,o){o=o||{};if(o.t!=null)meta.dayT=o.t;const w=owiL2W(b,lx,lz);
  I.tele(w[0],w[1]);L.enter(b,lv);owiCut(b,true);
  for(let i=0;i<(o.frames||36);i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  owiAnim(5);const gv=heroU.g.visible;heroU.g.visible=false;const P=b.ic.P,y=b.hi+P.floors[lv].y;FLY.on=true;camera.fov=28;camera.updateProjectionMatrix();camera.position.set(w[0],y+(o.h||1.4),w[1]);camera.up.set(0,0,-1);camera.lookAt(w[0],y,w[1]);camera.updateMatrixWorld();
  renderer.render(scene,camera);if(o.shot)window.__sh(o.shot);const gl=renderer.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=Math.max(8,Math.floor(Math.min(W,H)*.1)),x0=Math.floor(W/2-n/2),y0=Math.floor(H/2-n/2),buf=new Uint8Array(n*n*4);gl.readPixels(x0,y0,n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  let sr=0,sg=0,sb=0,k=0;for(let i=0;i<buf.length;i+=4){sr+=buf[i];sg+=buf[i+1];sb+=buf[i+2];k++;}FLY.on=false;camera.up.set(0,1,0);heroU.g.visible=gv;
  const r=sr/k,g=sg/k,bl=sb/k;return{r:+r.toFixed(1),g:+g.toFixed(1),b:+bl.toFixed(1),lum:+(.2126*r+.7152*g+.0722*bl).toFixed(1)};};
return 'ok';})()

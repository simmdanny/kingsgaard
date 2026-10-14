(async function(){
/* The light of the houses, measured on the picture (the brightness of the floor under a camera that looks straight down, ls-shot.js L.probe), seed 3. Needs int-lib.js and ls-shot.js (I.setup(3) first).
   window.__lt = {pass, fail, out:[...], data:{}} */
const I=window.__iw,L=window.__ls,R=window.__lt={pass:0,fail:0,out:[],data:{}};
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
const find=(x,z,type)=>OWI.list.find(q=>(!type||q.type===type)&&Math.abs(q.x-x)<2&&Math.abs(q.z-z)<2);
/* a free place of the floor near (lx,lz): no collider, 0.35 m clear, not on the stairs */
const free=(b,lv,lx,lz,rect)=>{owiEnsurePlan(b);const P=b.ic.P;let best=null,bd=1e9;for(const clear of[.7,.1]){for(let x=rect.xa+.3;x<=rect.xb-.3;x+=.15)for(let z=rect.za+.3;z<=rect.zb-.3;z+=.15){if(b.ic.col&&owiHit(b.ic.col,x,z,1<<lv,OWI.RAD+.1))continue;if(P.stairs.some(f=>x>f.x0-clear&&x<f.x1+clear&&z>Math.min(f.z0,f.z1)-clear&&z<Math.max(f.z0,f.z1)+clear))continue;const d=Math.hypot(x-lx,z-lz);if(d<bd){bd=d;best=[x,z];}}if(best)break;}return best||[(rect.xa+rect.xb)/2,(rect.za+rect.zb)/2];};
const big=r=>r.rects.slice().sort((a,c)=>(c.xb-c.xa)*(c.zb-c.za)-(a.xb-a.xa)*(a.zb-a.za))[0];
const day=560;
/* 1. a room with no window is darker than a room with windows (the same floor planks: bedrooms and studies of the upper floors), by day */
{const rs=L.rooms(x=>x.lv>0&&(x.room.kind==='bedroom'||x.room.kind==='study')&&x.area>3),dark=rs.filter(x=>x.wins.length===0),lit=rs.filter(x=>x.wins.length>=2);
  const m=(arr)=>{const v=[];for(const x of arr.slice(0,6)){const q=big(x.room),pt=free(x.b,x.lv,(q.xa+q.xb)/2,(q.za+q.zb)/2,q);if(pt)v.push(L.probe(x.b,x.lv,pt[0],pt[1],{t:day,frames:24}).lum);}return v.length?v.reduce((a,c)=>a+c,0)/v.length:0;};
  const d=m(dark),l=m(lit);R.data.windowless={rooms:dark.length,lit:lit.length,darkMean:+d.toFixed(1),litMean:+l.toFixed(1)};
  ok(dark.length>0&&d<l*.85,'noon: the floor of rooms without a window ('+d.toFixed(1)+', '+Math.min(6,dark.length)+' rooms) is darker than the floor of rooms with windows ('+l.toFixed(1)+')');}
/* 2, 3, 5, 6. one big room: near the windows and far from them; a corner and the middle; sun on the windows and not; the door open and shut */
{const b=find(165,-149,'tavern');owiEnsurePlan(b);const P=b.ic.P,F=P.floors[0],room=F.rooms.find(r=>r.kind==='common'),q=big(room),Q=F.Q;
  const near=free(b,0,(q.xa+q.xb)/2,Q.zb-.9,q),far=free(b,0,(q.xa+q.xb)/2,Q.za+.9,q),mid=free(b,0,(q.xa+q.xb)/2,(q.za+q.zb)/2,q),corner=free(b,0,q.xa+.3,q.za+.3,q);
  const sunFront=100,sunBack=1100;
  const aN=L.probe(b,0,near[0],near[1],{t:sunFront}),aN2=L.probe(b,0,near[0],near[1],{t:sunBack}),aF=L.probe(b,0,far[0],far[1],{t:day}),aM=L.probe(b,0,mid[0],mid[1],{t:day}),aC=L.probe(b,0,corner[0],corner[1],{t:day});
  R.data.tavern={nearSunFront:aN.lum,nearSunBack:aN2.lum,far:aF.lum,mid:aM.lum,corner:aC.lum};
  ok(aN.lum>aN2.lum*1.08,'the floor by the front windows is brighter when the sun shines on them ('+aN.lum+') than when it shines on the back of the house ('+aN2.lum+')');
  const nW=L.probe(b,0,near[0],near[1],{t:day}),fW=L.probe(b,0,far[0],far[1],{t:day});
  ok(nW.lum!==fW.lum&&Math.abs(nW.lum-fW.lum)>1,'the light falls off across the room (near the windows '+nW.lum+', far '+fW.lum+')');
  /* the corner of the floor is not darker in the picture alone (a window may be next to it): the grid says so (below) */
  /* the front door: shut, then open (the door lets daylight in) */
  const dr=free(b,0,P.door.u,Q.zb-1.2,q);owdSet(b,false,{instant:true});const cl=L.probe(b,0,dr[0],dr[1],{t:day});owdSet(b,true,{instant:true});const op=L.probe(b,0,dr[0],dr[1],{t:day,frames:60});owdSet(b,false,{instant:true});
  R.data.door={shut:cl.lum,open:op.lum};ok(op.lum>cl.lum*1.03,'the floor behind the front door is brighter with the door open ('+op.lum+') than shut ('+cl.lum+')');}
/* 4. the baked ambient occlusion: the cells at a wall or next to a piece of furniture are darker than the open floor (the grid of 40 houses) */
{let nearW=0,nW=0,open=0,nO=0;for(const b of OWI.list.filter(q=>q.arch&&q.arch.leaf&&!q.tunnel).slice(0,40)){owiEnsurePlan(b);owlmInit(b);const lm=owlmBake(b),B=lm.tb.image.data,P=b.ic.P;
  P.floors.forEach((F,fi)=>{const Q=F.Q;for(let j=0;j<lm.TH;j++)for(let i=0;i<lm.W1;i++){const o=(j*lm.TW+fi*(lm.W1+1)+i)*4;if(B[o+1]<30)continue;const x=lm.X0+(i+.5)*lm.cs,z=lm.Z0+(j+.5)*lm.cs,dw=Math.min(x-Q.xa,Q.xb-x,z-Q.za,Q.zb-z),ao=(B[o+1]/255-.1)/.9;if(dw<.35){nearW+=ao;nW++;}else if(dw>1.1){open+=ao;nO++;}}});lm.ta.dispose();lm.tb.dispose();}
  R.data.ao={atWalls:+(nearW/nW).toFixed(2),openFloor:+(open/nO).toFixed(2)};ok(nW>0&&nearW/nW<open/nO*.85,'the cells at the walls are darker than the open floor in the grid ('+(nearW/nW).toFixed(2)+' against '+(open/nO).toFixed(2)+')');}
/* 7. a fire lights what is near it more than what is far from it (night, nobody home): in the room of the fire, 0.9 m from it and as far from it as the room allows (3 m or more) */
{let b=null,it=null,hr=null;for(const q of OWI.list){if(!q.arch||!q.arch.leaf||q.tunnel||q.ic&&q.ic.lit)continue;owiEnsurePlan(q);const F=q.ic.P.floors[0],fires=F.items.filter(i=>OWIL_SRC[i.kind]&&OWIL_SRC[i.kind].fire);if(fires.length!==1)continue;const r=F.rooms.find(r=>r.id===fires[0].room);if(r){const rc=big(r);if(Math.max(rc.xb-rc.xa,rc.zb-rc.za)>5.5){b=q;it=fires[0];hr=r;break;}}}
  if(b){const s=OWIL_SRC[it.kind],rc=big(hr),px=it.x+Math.sin(it.rot)*(s.f+.9),pz=it.z+Math.cos(it.rot)*(s.f+.9),near=free(b,0,px,pz,rc);let far=null,fd=0;for(let x=rc.xa+.4;x<=rc.xb-.4;x+=.3)for(let z=rc.za+.4;z<=rc.zb-.4;z+=.3){const d=Math.hypot(x-it.x,z-it.z);if(d>fd&&!(b.ic.col&&owiHit(b.ic.col,x,z,1,OWI.RAD+.1))){fd=d;far=[x,z];}}
    const a=L.probe(b,0,near[0],near[1],{t:1500,frames:90}),c=L.probe(b,0,far[0],far[1],{t:1500,frames:90});R.data.fire={building:b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0),nearFire:a.lum,far:c.lum,farDist:+fd.toFixed(1)};
    ok(a.lum>c.lum*1.25,'night: the floor 0.9 m from the fire ('+a.lum+') is brighter than the floor '+fd.toFixed(1)+' m away in the same room ('+c.lum+')');}else ok(false,'no unlit house with one fire in a long room');}
/* 8. the fire does not light the floor above it, nor the ground outside the wall */
{const b=find(191,-106,'hall');owiEnsurePlan(b);const P=b.ic.P,it=P.floors[0].items.find(it=>it.kind==='hearth'),s=OWIL_SRC.hearth;
  L.probe(b,0,it.x+Math.sin(it.rot)*1.1,it.z+Math.cos(it.rot)*1.1,{t:1500,frames:90});const cur=OWIL.cur;
  const w=owiL2W(b,it.x,it.z),read=(pos,look,up)=>{FLY.on=true;camera.fov=45;camera.updateProjectionMatrix();camera.position.set(...pos);camera.up.set(...up);camera.lookAt(...look);camera.updateMatrixWorld();OWIL.l.shadow.needsUpdate=true;renderer.render(scene,camera);const gl=renderer.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=Math.floor(Math.min(W,H)*.3),buf=new Uint8Array(n*n*4);gl.readPixels(Math.floor(W/2-n/2),Math.floor(H/2-n/2),n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);let t=0,k=0;for(let i=0;i<buf.length;i+=4){t+=.2126*buf[i]+.7152*buf[i+1]+.0722*buf[i+2];k++;}FLY.on=false;camera.up.set(0,1,0);return t/k;};
  const both=(pos,look,up)=>{const l=OWIL.l;l.visible=true;l.intensity=Math.max(1,OWIL.base);OWIL.cur=cur;const on=read(pos,look,up);l.intensity=0;l.visible=false;const off=read(pos,look,up);return{on:+on.toFixed(1),off:+off.toFixed(1)};};
  const F1=P.floors[1],Qx=P.floors[0].Q;owiCut(b,true);OWI.lv=1;owiCut(b,true);owiAnim(5);
  const up=both([w[0],b.hi+F1.y+2.4,w[1]],[w[0],b.hi+F1.y,w[1]],[0,0,-1]);
  const cp=owiL2W(b,Qx.xa-2.2,it.z);OWI.lv=0;owiCut(b,true);owiAnim(5);const out=both([cp[0],b.hi+4.5,cp[1]],[cp[0],b.hi-.5,cp[1]],[0,0,-1]);
  R.data.leaks={floorAbove:up,groundOutside:out};
  ok(Math.abs(up.on-up.off)<=up.off*.02+.5,'the fire on the ground floor does not light the floor above it (on '+up.on+', off '+up.off+')');
  ok(Math.abs(out.on-out.off)<=out.off*.02+.5,'the fire does not light the ground outside the wall (on '+out.on+', off '+out.off+')');}
/* 9. a street lamp outside does not light the inside of a house through its wall or its window */
{let hit=null;for(const l of OW.lamps||[]){const b=OWI.list.find(q=>q.arch&&q.arch.leaf&&!q.tunnel&&Math.hypot(q.x-l.x,q.z-l.z)<q.r+2.5);if(b){hit={b,l};break;}}
  if(hit){const{b,l}=hit;owiEnsurePlan(b);const P=b.ic.P,F=P.floors[0],q=big(F.rooms[0]),pt=free(b,0,(q.xa+q.xb)/2,(q.za+q.zb)/2,q);
    meta.dayT=1500;I.tele(l.x,l.z+1.5);L.leave&&L.leave();for(let i=0;i<90;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
    const w=owiL2W(b,pt[0],pt[1]),y=b.hi+F.y,read=()=>{FLY.on=true;camera.fov=28;camera.updateProjectionMatrix();camera.position.set(w[0],y+1.4,w[1]);camera.up.set(0,0,-1);camera.lookAt(w[0],y,w[1]);camera.updateMatrixWorld();renderer.render(scene,camera);const gl=renderer.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=40,buf=new Uint8Array(n*n*4);gl.readPixels(Math.floor(W/2-n/2),Math.floor(H/2-n/2),n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);let t=0,k=0;for(let i=0;i<buf.length;i+=4){t+=.2126*buf[i]+.7152*buf[i+1]+.0722*buf[i+2];k++;}FLY.on=false;camera.up.set(0,1,0);return t/k;};
    const on=read(),inten=(OWLT.slots||[]).map(s=>s.l.intensity);(OWLT.slots||[]).forEach(s=>s.l.intensity=0);const off=read();(OWLT.slots||[]).forEach((s,i)=>s.l.intensity=inten[i]);
    R.data.lamp={on:+on.toFixed(1),off:+off.toFixed(1),building:b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0)};ok(Math.abs(on-off)<=off*.08+.5,'the street lamps next to a house light its floor only a little, through the windows, not through the walls (with the lamps '+on.toFixed(1)+', without '+off.toFixed(1)+')');}
  else ok(false,'no house next to a street lamp');}
return JSON.stringify(R);})()

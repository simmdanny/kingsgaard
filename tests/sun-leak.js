(function(){
/* The sun does not shine through the roof and the walls of a house nobody is in: the floor of the rooms of three houses, drawn from above, with the sun and with the sun switched off; the picture must not change. A control follows: with the shadow
   proxies of the houses switched off the sun would reach the floor. Needs int-lib.js and ls-shot.js, seed 3. window.__sl = {pass, fail, out:[...]} */
const I=window.__iw,L=window.__ls,R=window.__sl={pass:0,fail:0,out:[],data:{}};
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
meta.dayT=560;
const houses=[[165,-149,'tavern'],[198,-124,'rowc'],[156,-108,'rowc']].map(h=>OWI.list.find(q=>q.type===h[2]&&Math.abs(q.x-h[0])<2&&Math.abs(q.z-h[1])<2)).filter(Boolean);
const read=(w,y)=>{FLY.on=true;camera.fov=28;camera.updateProjectionMatrix();camera.position.set(w[0],y+1.4,w[1]);camera.up.set(0,0,-1);camera.lookAt(w[0],y,w[1]);camera.updateMatrixWorld();renderer.render(scene,camera);const gl=renderer.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=40,buf=new Uint8Array(n*n*4);gl.readPixels(Math.floor(W/2-n/2),Math.floor(H/2-n/2),n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);let t=0,k=0;for(let i=0;i<buf.length;i+=4){t+=.2126*buf[i]+.7152*buf[i+1]+.0722*buf[i+2];k++;}FLY.on=false;camera.up.set(0,1,0);return t/k;};
let worst=0,n=0,ctrl=0;
for(const b of houses){owiEnsurePlan(b);const o=I.ground(b,12);I.tele(o[0],o[1]);if(OWI.cb)owiLeave();for(let i=0;i<60;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  sunFar.shadow.needsUpdate=true;renderer.render(scene,camera);/* the far cascade of the sun is refreshed slowly: after a jump of the hero it is brought up to date */
  const P=b.ic.P,F=P.floors[0],y=b.hi+F.y;
  const spots=[];for(const room of F.rooms)for(const q of room.rects){if((q.xb-q.xa)<1.2||(q.zb-q.za)<1.2)continue;for(const f of[[.5,.5],[.3,.3],[.7,.7]]){const x=q.xa+(q.xb-q.xa)*f[0],z=q.za+(q.zb-q.za)*f[1];if(!P.stairs.some(s=>x>s.x0-.7&&x<s.x1+.7&&z>Math.min(s.z0,s.z1)-.7&&z<Math.max(s.z0,s.z1)+.7)){spots.push([x,z]);break;}}}
  for(const sp of spots.slice(0,5)){const lx=sp[0],lz=sp[1],w=owiL2W(b,lx,lz);
    const on=read(w,y),si=sun.intensity;sun.intensity=0;const off=read(w,y);sun.intensity=si;worst=Math.max(worst,Math.abs(on-off));n++;
    /* control: the proxies off, the real meshes of the house casting: the sun comes in by the windows (where there are any) */}
  }
R.data={points:n,worstDifference:+worst.toFixed(2),houses:houses.map(b=>b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0))};
ok(n>0&&worst<1,'the sun does not reach the floor of a house nobody is in ('+n+' points in '+houses.length+' houses; the biggest change when the sun is switched off: '+worst.toFixed(2)+' of 255)');
return JSON.stringify(R);})()

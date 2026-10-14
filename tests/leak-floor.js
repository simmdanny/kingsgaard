(async function(){
/* Light leaks between the storeys: a fire (the point light of the interiors, interior/light.js) on the ground floor must not light the floor above it. The point light is put on the ground floor source at night, the hero is moved upstairs without
   the light being re-picked, the camera looks straight down at the floor above the source, and the mean brightness of the picture is read with the light on and with it off. Needs int-lib.js and ls-shot.js (I.setup first).
   window.__lf = {on, off, ratio, building} */
const I=window.__iw,L=window.__ls,out=window.__lf={};
const b=OWI.list.filter(q=>q.arch&&q.arch.leaf&&!q.tunnel&&q.type==='tavern'||q.type==='cot'||q.type==='hall'||q.type==='stonecottage').find(q=>{owiEnsurePlan(q);const P=q.ic.P;return P.fl>1&&P.floors[0].items.some(it=>OWIL_SRC[it.kind]&&OWIL_SRC[it.kind].fire);});
if(!b)return 'no house with a fire and an upper floor';
const P=b.ic.P,F0=P.floors[0],it=F0.items.find(it=>OWIL_SRC[it.kind]&&OWIL_SRC[it.kind].fire),s=OWIL_SRC[it.kind];
meta.dayT=1500;
const go=async()=>L.go({b,lv:0,at2:[it.x+Math.sin(it.rot)*1.1,it.z+Math.cos(it.rot)*1.1],mode:'tp',t:1500,noshot:true,settle:60});
const r0=await go();
for(let i=0;i<80;i++){OWI.tScan=-9;heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
const cur=OWIL.cur;out.picked=cur?cur.key:null;if(!cur)return JSON.stringify(Object.assign(out,{err:'no light picked',r0}));
/* upstairs, light kept where it is */
const w=owiL2W(b,it.x+Math.sin(it.rot)*s.f,it.z+Math.cos(it.rot)*s.f),F1=P.floors[1];
L.enter(b,1);owiCut(b,true);owiAnim(5);
const read=()=>{renderer.render(scene,camera);const gl=renderer.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,x0=Math.floor(W*.3),y0=Math.floor(H*.3),w2=Math.floor(W*.4),h2=Math.floor(H*.4),buf=new Uint8Array(w2*h2*4);gl.readPixels(x0,y0,w2,h2,gl.RGBA,gl.UNSIGNED_BYTE,buf);let sr=0,sg=0,sb=0,n=0;for(let i=0;i<buf.length;i+=4){sr+=buf[i];sg+=buf[i+1];sb+=buf[i+2];n++;}return[sr/n,sg/n,sb/n];};
const place=()=>{camera.position.set(w[0],b.hi+F1.y+2.4,w[1]);camera.up.set(0,0,-1);camera.lookAt(w[0],b.hi+F1.y,w[1]);camera.updateMatrixWorld();};
FLY.on=true;FLY.pos.copy(camera.position);
const L0=OWIL.l.intensity;OWIL.l.shadow.needsUpdate=true;
const hold=()=>{OWIL.cur=cur;OWIL.drop=false;OWIL.l.visible=true;};
hold();camera.fov=60;camera.updateProjectionMatrix();
place();const on=read(),on2=(()=>{OWIL.l.shadow.needsUpdate=true;place();return read();})();
OWIL.l.intensity=0;OWIL.l.visible=false;place();const off=read();
out.on=on2.map(v=>+v.toFixed(1));out.off=off.map(v=>+v.toFixed(1));out.gain=+((on2[0]-off[0])).toFixed(2);out.building=b.type+'@'+b.x.toFixed(0)+','+b.z.toFixed(0);out.fire=it.kind;out.L0=+L0.toFixed(2);
FLY.on=false;camera.up.set(0,1,0);
return JSON.stringify(out);})()

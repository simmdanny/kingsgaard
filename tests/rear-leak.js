(async function(){
/* Does a lantern in front of a house light its back? For houses with a lantern in front (within 8 m) and a free view of the rear, at night, the picture is read at four places: the front wall, the front ground, the rear wall and the rear ground
   (a camera 1.5 m off the surface looks at it, the hero is hidden). Each place is read with everything on and with parts of the lamp light switched off (the ground pools, the real lamp lights, the halos), so the share of each part in the rear
   shows. Needs int-lib.js and ls-shot.js (I.setup first). Options window.__rlo = {n (pairs, 6), t (dayT, 1500)}. window.__rl = {pairs:[{b, lamp, front:{wall,ground}, rear:{wall,ground}, off:{...}}], mean...} */
const I=window.__iw,L=window.__ls,o=Object.assign({n:6,t:1500},window.__rlo||{}),R=window.__rl={pairs:[]};
const rc=new THREE.Raycaster(),gl=renderer.getContext();
const bs=OW.villages.flatMap(v=>v.buildings).filter(b=>b.arch&&b.arch.rect0&&!(b.pl&&b.pl.open)&&!b.tunnel);
const read=(p,nrm)=>{const cam=[p[0]+nrm[0]*1.6,p[1]+nrm[1]*1.6,p[2]+nrm[2]*1.6];camera.position.set(cam[0],cam[1],cam[2]);camera.up.set(0,nrm[1]>.5?0:1,nrm[1]>.5?-1:0);camera.lookAt(p[0],p[1],p[2]);camera.fov=26;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  renderer.render(scene,camera);const W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=Math.max(8,Math.floor(Math.min(W,H)*.08)),buf=new Uint8Array(n*n*4);gl.readPixels(Math.floor(W/2-n/2),Math.floor(H/2-n/2),n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);let s=0,k=0;for(let i=0;i<buf.length;i+=4){s+=.2126*buf[i]+.7152*buf[i+1]+.0722*buf[i+2];k++;}return +(s/k).toFixed(1);};
const seen=(p,nrm)=>{const from=new THREE.Vector3(p[0]+nrm[0]*1.6,p[1]+nrm[1]*1.6,p[2]+nrm[2]*1.6),d=new THREE.Vector3(p[0],p[1],p[2]).sub(from);const len=d.length();rc.set(from,d.normalize());rc.far=len+.4;const h=rc.intersectObjects(OW.group.children,true).filter(q=>q.object.material&&q.object.material.visible!==false&&!q.object.material.transparent);return h.length&&Math.abs(h[0].distance-len)<.6;};
meta.dayT=o.t;
let n=0;const done=new Set();
for(const l of OW.lamps){if(n>=o.n)break;if((l.s||1)<1)continue;let best=null,bd=1e9;for(const b of bs){const d=Math.hypot(b.x-l.x,b.z-l.z);if(d<bd){bd=d;best=b;}}if(!best||bd>8||done.has(best))continue;
  const b=best,A=b.arch,S=A.scale||b.BSc,r=A.rect0,lp=owiW2L(b,l.x,l.z);if(lp[1]<r.z1*S+.5||Math.abs(lp[0])>8)continue;
  const dirW=(lx,lz)=>{const a=owiL2W(b,0,0),c=owiL2W(b,lx,lz);return[c[0]-a[0],c[1]-a[1]];};const nf=dirW(0,1),nr=dirW(0,-1);
  const wf=owiL2W(b,0,r.z1*S),wr=owiL2W(b,0,r.z0*S),gf=owiL2W(b,0,r.z1*S+3.5),gr=owiL2W(b,0,r.z0*S-3.5),yw=b.hi+1.9,yg=owH(gf[0],gf[1]),yg2=owH(gr[0],gr[1]);
  const P={fw:[[wf[0],yw,wf[1]],[nf[0],0,nf[1]]],fg:[[gf[0],yg,gf[1]],[0,1,0]],rw:[[wr[0],yw,wr[1]],[nr[0],0,nr[1]]],rg:[[gr[0],yg2,gr[1]],[0,1,0]]};
  if(!seen(...P.rw)||!seen(...P.rg)||!seen(...P.fw)||!seen(...P.fg))continue;
  done.add(b);n++;
  /* the hero stands by the lantern, so that the lamp lights of the pool belong to it */
  I.tele(l.x+1.5,l.z+1.5);camSet('tp');for(let i=0;i<50;i++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  const gv=heroU.g.visible;heroU.g.visible=false;FLY.on=true;
  const take=()=>({fw:read(...P.fw),fg:read(...P.fg),rw:read(...P.rw),rg:read(...P.rg)});
  const all=take();
  const pools=OWLT.pools.map(p=>p.visible),halos=OWLT.halos.map(h=>h.visible),ints=OWLT.slots.map(s=>s.l.intensity);
  OWLT.pools.forEach(p=>p.visible=false);const noPool=take();OWLT.pools.forEach((p,i)=>p.visible=pools[i]);
  OWLT.slots.forEach(s=>s.l.intensity=0);const noLights=take();OWLT.slots.forEach((s,i)=>s.l.intensity=ints[i]);
  OWLT.pools.forEach(p=>p.visible=false);OWLT.slots.forEach(s=>s.l.intensity=0);const neither=take();OWLT.pools.forEach((p,i)=>p.visible=pools[i]);OWLT.slots.forEach((s,i)=>s.l.intensity=ints[i]);
  /* which lights: only the shadow lights, only the plain ones */
  OWLT.slots.forEach(s=>{if(!s.sh)s.l.intensity=0;});const onlyShadow=take();OWLT.slots.forEach((s,i)=>s.l.intensity=ints[i]);
  OWLT.slots.forEach(s=>{if(s.sh)s.l.intensity=0;});const onlyPlain=take();OWLT.slots.forEach((s,i)=>s.l.intensity=ints[i]);
  FLY.on=false;camera.up.set(0,1,0);heroU.g.visible=gv;
  R.pairs.push({b:b.type+'@'+Math.round(b.x)+','+Math.round(b.z),lamp:[+l.x.toFixed(0),+l.z.toFixed(0)],d:+bd.toFixed(1),all,noPool,noLights,neither,onlyShadow,onlyPlain});}
const avg=k=>{const r={};for(const q of['fw','fg','rw','rg'])r[q]=+(R.pairs.reduce((s,p)=>s+p[k][q],0)/Math.max(1,R.pairs.length)).toFixed(1);return r;};
R.mean={all:avg('all'),noPool:avg('noPool'),noLights:avg('noLights'),neither:avg('neither'),onlyShadow:avg('onlyShadow'),onlyPlain:avg('onlyPlain')};
return JSON.stringify(R);})()

(async function(){
/* The fall-off of one lantern with distance, and the combined light of a post with three lanterns. At night, on open ground round an isolated lantern (no building within 30 m), the brightness of the ground as drawn (a camera 1.6 m over the
   spot looks straight down; the hero is hidden) at several distances from the foot of the post, with the lantern's lights on and off; what the lights add is the difference. Needs int-lib.js and ls-shot.js (I.setup(3) first).
   window.__lf2 = {pass, fail, out:[...], data:{...}} */
const I=window.__iw,R=window.__lf2={pass:0,fail:0,out:[],data:{}},gl=renderer.getContext();
const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
meta.dayT=1500;
const bs=OW.villages.flatMap(v=>v.buildings);
const read=(x,z)=>{const y=owH(x,z);camera.position.set(x,y+1.6,z);camera.up.set(0,0,-1);camera.lookAt(x,y,z);camera.fov=22;camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.render(scene,camera);
  const W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,n=Math.max(8,Math.floor(Math.min(W,H)*.06)),buf=new Uint8Array(n*n*4);gl.readPixels(Math.floor(W/2-n/2),Math.floor(H/2-n/2),n,n,gl.RGBA,gl.UNSIGNED_BYTE,buf);let s=0,k=0;for(let i=0;i<buf.length;i+=4){s+=.2126*buf[i]+.7152*buf[i+1]+.0722*buf[i+2];k++;}return s/k;};
const lampsAt=(l)=>OW.lamps.filter(q=>q.post===l.post);
const cand=(wantN)=>{let best=null,bs0=-1;for(const l of OW.lamps){if(l.pool===false||(l.s||1)<1)continue;const ls=lampsAt(l);if(ls.length!==wantN)continue;let m=1e9;for(const b of bs)m=Math.min(m,Math.hypot(b.x-l.x,b.z-l.z)-b.r);for(const q of OW.lamps)if(q.post!==l.post)m=Math.min(m,Math.hypot(q.x-l.x,q.z-l.z)*.8);if(m>bs0){bs0=m;best=l;}}return bs0>=9?best:null;};
const measure=(l,dirs)=>{const rows=[];I.tele(l.x+1.2,l.z+1.2);camSet('tp');for(let i=0;i<90;i++){heroUpdate(1/30);owiTick(1/30);anim(1/30,performance.now()/1000+i/30);owFrame();}
  const gv=heroU.g.visible;heroU.g.visible=false;FLY.on=true;const D=[1.5,3,5,8,12,17,22],ints=OWLT.slots.map(s=>s.l.intensity),pools=OWLT.pools.map(p=>p.visible);
  for(const d of D){let on=0,off=0,m=0;for(const a of dirs){const x=l.x+Math.cos(a)*d,z=l.z+Math.sin(a)*d;on+=read(x,z);m++;}
    OWLT.slots.forEach(s=>s.l.intensity=0);OWLT.pools.forEach(p=>p.visible=false);for(const a of dirs){const x=l.x+Math.cos(a)*d,z=l.z+Math.sin(a)*d;off+=read(x,z);}OWLT.slots.forEach((s,i)=>s.l.intensity=ints[i]);OWLT.pools.forEach((p,i)=>p.visible=pools[i]);
    rows.push({d,on:+(on/m).toFixed(1),off:+(off/m).toFixed(1),add:+((on-off)/m).toFixed(1)});}
  FLY.on=false;camera.up.set(0,1,0);heroU.g.visible=gv;return rows;};
const clearDirs=l=>{const out=[];for(let a=0;a<6.28;a+=.35){let okd=true;for(const d of [1.5,3,5,8,12,17,22]){const x=l.x+Math.cos(a)*d,z=l.z+Math.sin(a)*d;if(bs.some(b=>Math.hypot(b.x-x,b.z-z)<b.r+2.5)||OW.lamps.some(q=>q.post!==l.post&&Math.hypot(q.x-x,q.z-z)<8)){okd=false;break;}}if(okd)out.push(a);}return out.slice(0,4);};
const one=cand(1),three=cand(3);
if(one){const dirs=clearDirs(one);if(!dirs.length)R.out.push('(no clear direction round the lantern)');const rows=dirs.length?measure(one,dirs):null;if(rows){R.data.single=rows;const add=rows.map(r=>r.add);
  ok(add.every((v,i)=>i===0||v<=add[i-1]+.8),'one lantern: the light it adds falls with the distance ('+rows.map(r=>r.d+' m: '+r.add).join(', ')+')');
  ok(add[1]>=2.5*Math.max(.5,add[4]),'near ground ('+add[1]+' at 3 m) is several times brighter than far ground ('+add[4]+' at 12 m): not an even pool');
  ok(rows[rows.length-1].on>rows[rows.length-1].off*.9&&rows[rows.length-1].on>=5,'and the far ground is not black ('+rows[rows.length-1].on+' at 22 m)');}
}else R.out.push('(no isolated single lantern in this world)');
if(three){const dirs3=clearDirs(three),rows=dirs3.length?measure(three,dirs3):null;if(rows){R.data.triple=rows;
  const s=R.data.single||[];ok(rows[2].add<=1.9*Math.max(1,(s[2]||{add:rows[2].add}).add)+1,'three lanterns on a post do not make it a flood: at 5 m '+rows[2].add+' against '+(s[2]?s[2].add:'-')+' for one lantern');
  ok(rows[0].on<235,'near the post nothing is burnt out ('+rows[0].on+' of 255 at 1.5 m)');}
}else R.out.push('(no isolated three-lantern post in this world)');
return JSON.stringify(R);})()

(function(){
/* Casts scrolls through the real aimed pipeline (aimFor -> fireScroll) in a prepared situation and reports what happened: errors, the aim, where the effects ended up.
   Needs int-lib.js (window.__iw) and a fresh world per call (it sets one up). Options window.__as:
     spells: [...]            which scrolls (default: all)
     aim:    'enemy'|'ground'|'hill'|'wall'|'sky'     the situation
     secs:   seconds of game time to run after the cast
     seed:   world seed (3)
   The result is one line per spell. "gdev" is how far the lowest point of the new effects lies below the ground at the target (negative = buried), "top" how high they reach above it,
   "dxz" the horizontal distance of the effects' middle from the target. */
/* a screenshot of the game canvas (plus the aim dot) posted to the local upload server (scratchpad/upsrv.py, port 8766): window.__shot(name, width) */
window.__shot=window.__shot||async function(name,w){w=w||900;if(typeof SDP!=='undefined'&&SDP.n>0&&SDP.mat){sdpRender();}else renderer.render(scene,camera);const src=renderer.domElement,h=Math.round(src.height*w/src.width),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(src,0,0,w,h);
  const d=document.getElementById('aimDot');if(d&&d.style.display!=='none'){x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=1.5;x.beginPath();x.arc(w/2,h/2,2.2,0,6.283);x.fill();x.stroke();}
  const r=await fetch('http://127.0.0.1:8766/'+name+'.jpg',{method:'POST',body:c.toDataURL('image/jpeg',.82)});return r.status;};
const I=window.__iw,o=Object.assign({spells:Object.keys(SPELLS_S),aim:'ground',secs:3,seed:3,reuse:false},window.__as||{});
if(!o.reuse||!window.__asReady){I.setup(o.seed);window.__asReady=true;}
const H=heroU,v=OW.villages[0],out=[];
const errs=[];const ce=console.error;console.error=function(){errs.push(Array.from(arguments).map(a=>a&&a.message||String(a)).join(' ').slice(0,160));};
const clearAll=()=>{for(const e of fx.slice()){try{scene.remove(e.o);}catch(_){}}fx.length=0;PSA.list.length=0;PSN.list.length=0;SMK.list.length=0;SMKA.list.length=0;try{resetCine();}catch(_){}cineLock=0;worldSlow=1;slowT=0;vigTarget=0;darkTarget=0;};
const mk=(type,x,z,y)=>{spawnEnemy({type},1);const e=enemies[enemies.length-1];e.spd=0;e.x=x;e.z=z;e.y=y==null?owH(x,z):y;e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();e.g.visible=true;e.hp=e.maxHp=1e7;e.pin=[e.x,e.y,e.z];return e;};
const pinAll=()=>{for(const e of enemies){if(e.pin&&!e.dead){e.x=e.pin[0];e.y=e.pin[1];e.z=e.pin[2];e.g.position.set(e.x,0,e.z);e.b.position.y=e.y;e.g.updateMatrix();}}};meta.scrAuto=false;window.__asMk=mk;
const place=(x,z)=>{H.x=x;H.z=z;H.hx=x;H.hz=z;H.oyT=null;H.g.position.set(x,owH(x,z),z);H._ga=H.g.position.y;for(let i=0;i<4;i++){OWI.tScan=-9;owiTick(.1);}};
const cam=(yaw,pitch)=>{FLY.on=false;TPC.on=true;TPC.yaw=yaw;TPC.pitch=pitch;for(let i=0;i<2;i++){owFrame();tpcApply();}};
/* find the pitch that makes the dot hit the ground about d metres from the hero */
const pitchFor=(d)=>{let best=.3,bd=1e9;for(let p=-.14;p<=1.2;p+=.02){TPC.pitch=p;tpcApply();const A=aimResolve(H,60);const e=Math.abs(Math.hypot(A.gx-H.x,A.gz-H.z)-d);if(A.kind==='ground'&&e<bd){bd=e;best=p;}}return best;};
function scenario(){clearAll();for(const e of enemies.slice())removeEnemy(e);enemies.length=0;let tgt=null;
  if(o.aim==='enemy'||o.aim==='ground'||o.aim==='wall'){place(v.sqr.x,v.sqr.z);}
  if(o.aim==='enemy'){cam(0,.08);camera.updateMatrixWorld();AIM.rc.setFromCamera(AIM.c0,camera);const ro=AIM.rc.ray.origin,rd=AIM.rc.ray.direction,t=Math.hypot(ro.x-H.x,ro.z-H.z)+7;
    for(let k=-1;k<=1;k++){const e=mk(k?'soldier':'knight',ro.x+rd.x*t-rd.z*k*1.1,ro.z+rd.z*t+rd.x*k*1.1);if(!k)tgt=e;}}
  else if(o.aim==='ground'){cam(0,.3);const p=pitchFor(9);cam(0,p);}
  else if(o.aim==='wall'){/* face the nearest building across the square */let best=null,bd=1e9;for(const b of v.buildings){const d=Math.hypot(b.x-H.x,b.z-H.z);if(d>9&&d<bd){bd=d;best=b;}}
    const yaw=Math.atan2(H.x-best.x,H.z-best.z);cam(yaw,-.02);}
  else if(o.aim==='hill'){/* a hillside: the steepest ground within 140 m of the village that is not a building */let bp=null,bs=0;for(let a=0;a<360;a+=10)for(let d=60;d<=260;d+=15){const x=v.x+Math.cos(a/57.3)*d,z=v.z+Math.sin(a/57.3)*d,s=owSlope(x,z),h=owH(x,z);if(h>5&&s>.35&&s<1.2&&owCanStand(x,z)&&s>bs){bs=s;bp=[x,z,a];}}
    if(!bp)return null;place(bp[0],bp[1]);/* look uphill */const gx=bp[0],gz=bp[1];let bestYaw=0,bh=-1e9;for(let y=0;y<6.28;y+=.3){const h=owH(gx+Math.sin(y)*9,gz+Math.cos(y)*9);if(h>bh){bh=h;bestYaw=y;}}cam(bestYaw+Math.PI,.2);const p=pitchFor(8);cam(bestYaw+Math.PI,p);}
  else if(o.aim==='hillenemy'){/* on a hillside with an enemy standing on the slope ahead */let bp=null,bs=0;for(let a=0;a<360;a+=10)for(let d=60;d<=260;d+=15){const x=v.x+Math.cos(a/57.3)*d,z=v.z+Math.sin(a/57.3)*d,sl=owSlope(x,z),h=owH(x,z);if(h>8&&sl>.2&&sl<.5&&owCanStand(x,z)&&sl>bs){bs=sl;bp=[x,z];}}
    if(!bp)return null;place(bp[0],bp[1]);let bestYaw=0,bh=-1e9;for(let y=0;y<6.28;y+=.3){const h=owH(bp[0]+Math.sin(y)*9,bp[1]+Math.cos(y)*9);if(h>bh){bh=h;bestYaw=y;}}
    const yaw=bestYaw+Math.PI,ex=H.x-Math.sin(yaw)*9,ez=H.z-Math.cos(yaw)*9,e=mk('soldier',ex,ez);tgt=e;
    /* the free camera 3 m behind and above the hero, looking at the enemy: the dot is on it */FLY.on=true;const bx=H.x+Math.sin(yaw)*3,bz=H.z+Math.cos(yaw)*3,by=H.g.position.y+2.2;FLY.pos.set(bx,by,bz);const dx=e.x-bx,dz=e.z-bz,dy=e.y+e.hitY*.5-by;FLY.yaw=Math.atan2(dx,dz);FLY.pitch=Math.atan2(dy,Math.hypot(dx,dz));flyApply();camera.updateMatrixWorld();}
  else if(o.aim==='sky'){place(v.sqr.x,v.sqr.z);FLY.on=true;FLY.pos.set(H.x,owH(H.x,H.z)+4,H.z);FLY.yaw=0;FLY.pitch=1.2;flyApply();camera.updateMatrixWorld();}
  return tgt;}
/* a running record of what the cast put in the world, sampled every frame */
function sampler(n0,T){const R={miny:1e9,maxy:-1e9,near:1e9,n:0,nan:false,cx:0,cz:0,cn:0};
  const f=function(){const ch=scene.children;for(let i=n0;i<ch.length;i++){const ob=ch[i];if(!ob.visible)continue;const b=new THREE.Box3().setFromObject(ob);if(!isFinite(b.min.y)||b.isEmpty()){if(!isFinite(ob.position.y))R.nan=true;continue;}
      const c=b.getCenter(new THREE.Vector3());if(Math.hypot(c.x-T[0],c.z-T[2])>(window.__asR||8)||Math.hypot(c.x-T[0],c.z-T[2])>Math.hypot(c.x-H.x,c.z-H.z))continue;if(b.min.y<R.miny){R.lowObj=ob.type+'/'+ob.children.length+'@'+ob.position.x.toFixed(1)+','+ob.position.y.toFixed(1)+','+ob.position.z.toFixed(1)+' gS'+(ob.userData&&ob.userData.gShifted?1:0);}R.miny=Math.min(R.miny,b.min.y);R.maxy=Math.max(R.maxy,b.max.y);R.n=Math.max(R.n,ch.length-n0);R.cx+=c.x;R.cz+=c.z;R.cn++;
      /* closest an effect object's own origin comes to the target (projectiles) */
      const p=ob.position;if(ob.children.length||ob.isMesh){R.near=Math.min(R.near,Math.hypot(p.x-T[0],p.y-T[1],p.z-T[2]));}}
    for(const S of [PSA,PSN,SMK,SMKA]){for(const q of S.list){if(!isFinite(q.x)||!isFinite(q.y)||!isFinite(q.z)){R.nan=true;continue;}if(Math.hypot(q.x-T[0],q.z-T[2])>(window.__asR||8)||Math.hypot(q.x-T[0],q.z-T[2])>Math.hypot(q.x-H.x,q.z-H.z))continue;R.miny=Math.min(R.miny,q.y);R.maxy=Math.max(R.maxy,q.y);R.cx+=q.x;R.cz+=q.z;R.cn++;R.near=Math.min(R.near,Math.hypot(q.x-T[0],q.y-T[1],q.z-T[2]));}}};f.get=()=>R;return f;}
for(const k of o.spells){
  errs.length=0;const tgt=scenario();if(o.aim==='hill'&&!tgt&&!window.__hillOk){}
  meta.spells[k]=meta.spells[k]||{lvl:1};H.scd={};H.gcd=0;H.ko=0;H.anim=null;
  const s=tStats(H),A=aimFor(H,k,s);if(!A){out.push(k+': no aim (not available)');continue;}
  const n0=scene.children.length,nfx=fx.length,t0=performance.now();let ex=null;const T0=A.gnd?[A.list[0].x,A.list[0].y,A.list[0].z]:[A.x,A.y,A.z],samp=sampler(n0,T0),hp0=A.enemy?A.enemy.hp:0;
  try{fireScroll(H,k,s,A.list,A);}catch(e){ex=e.message;}
  /* run the world */let crashed=null;try{for(let i=0;i<o.secs*30;i++){update(1/30);pinAll();updFx(1/30);dayStep(1/30);owFrame();if(!FLY.on)tpcApply();samp();}}catch(e){crashed=e.message+' @'+((e.stack||'').split('\n')[1]||'').trim().slice(0,90);}
  const gyT=A.gnd?A.list[0].gy:A.gy,B=samp.R||null;
  out.push(k+' ['+A.cat+'] '+A.kind+(A.blocked?' blocked':'')+(A.far?' far':'')+' tgt['+(A.gnd?'ground ':'')+T0.map(v=>v.toFixed(1))+']'
    +' | low '+(samp.get().miny<1e8?(samp.get().miny-gyT).toFixed(2):'-')+' high '+(samp.get().maxy>-1e8?(samp.get().maxy-gyT).toFixed(1):'-')+' nearest '+(samp.get().near<1e8?samp.get().near.toFixed(2):'-')+' mid-dxz '+(samp.get().cn?Math.hypot(samp.get().cx/samp.get().cn-T0[0],samp.get().cz/samp.get().cn-T0[2]).toFixed(1):'-')+(A.enemy&&A.enemy.hp<hp0?' HIT':'')+(samp.get().nan?' NaN!':'')+(window.__asDbg?' LOW='+samp.get().lowObj:'')+' n '+samp.get().n+(ex?' EXC '+ex:'')+(crashed?' CRASH '+crashed:'')+(errs.length?' ERR '+errs.slice(0,2).join(' | '):''));
  H.anim=null;}
console.error=ce;
return out.join('\n');})()

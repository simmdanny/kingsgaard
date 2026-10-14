(function(){
/* The sword's animations in play: the hold at rest, a left click's swing, the guard it leaves the hero in, back down 5 s after the fight, every swing ending in a guard, walking with
   the sword at rest and in a fight, the hero's own attacks, the idles. Needs a started world with the player's character (int-lib.js / wl-lib.js). Returns PASS/FAIL lines. */
const out=[],res={pass:0,fail:0},ok=(c,m)=>{res[c?'pass':'fail']++;out.push((c?'PASS ':'FAIL ')+m);};
const H=heroU,g=H.mdl,R=g.userData.pcRig,st=R.st,B=R.B,K=R.kit;let T=900;window.__fz=false;const cull0=window.__pcCull;window.__pcCull=false;/* (the figure is posed wherever the camera looks) */
const step=(n,dt)=>{dt=dt||1/30;for(let i=0;i<n;i++){T+=dt;heroUpdate(dt);owiTick(dt);anim(dt,T);}};
const S=()=>st.sp,finite=()=>{for(const k of['upperR','foreR','handR','upperL','foreL','spine','chest','neck','head','root']){const q=B[k].quaternion;if(![q.x,q.y,q.z,q.w].every(Number.isFinite))return k;}return null;};
/* the blade's direction in the chest's frame */
const blade=()=>{g.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(g.matrixWorld).invert(),dq=o=>{const q=new THREE.Quaternion();new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld).decompose(new THREE.Vector3(),q,new THREE.Vector3());return q;};
  return new THREE.Vector3(0,1,0).applyQuaternion(dq(K.sword)).applyQuaternion(dq(B.chest).invert());};
TPC.keys.clear();H.anim=null;H.pend=null;H.dest=null;hotSelect(0);st.drawn=false;step(90);
/* ---- at rest ---- */
{const b=blade();ok(H.pcHeld&&!st.drawn&&K.sword.visible&&!K.swordHip.visible,'at rest the sword is in the hand (no fight)');ok(b.z>.6&&b.y<-.2,'at rest the blade points forward and down ('+b.toArray().map(v=>v.toFixed(2))+')');
  ok(S().c<.05,'at rest no guard is held');}
/* ---- a left click: a swing, a fight, a guard ---- */
{let a=0;while(H.anim&&a++<200)step(1);const r=pcSwing();ok(r&&H.anim&&PCSW[H.anim.k],'pcSwing() starts one of the ten swings ('+(H.anim&&H.anim.k)+')');const k1=H.anim&&H.anim.k;
  step(2);ok(pcSwing()===false,'a second click while the swing is young does nothing');
  let mx=0;for(let i=0;i<40;i++){step(1);mx=Math.max(mx,S().sw);}ok(st.drawn&&mx>.95,'the swing is played (the sword layer took it) and the fight begins');
  let a2=0;while(H.anim&&a2++<120)step(1);step(30);ok(st.drawn&&S().c>.9&&!H.anim,'after the swing the hero holds a guard (guard '+S().gi+')');
  step(90);ok(st.drawn,'3 s later still in the fight');step(75);ok(!st.drawn,'5 s after the last of the fight the guard is left');step(60);ok(S().c<.1,'and the sword is back down');
  const kinds=new Set([k1]);for(let i=0;i<12;i++){let a3=0;while(H.anim&&a3++<200)step(1);pcSwing();kinds.add(H.anim&&H.anim.k);}ok(kinds.size>=6,'clicks give different swings ('+kinds.size+' kinds in 13)');let a4=0;while(H.anim&&a4++<200)step(1);}
/* ---- every swing from rest and from a guard: ends in a guard, nothing breaks ---- */
{let bad=[],nan=null;for(const k of PCSW_K){for(const from of['rest','guard']){st.drawn=from==='guard';st.lastFight=st.t;step(40);H.anim={k,t:0,d:PCSW[k].dur};
    let mn=1e9;for(let i=0;i<Math.ceil(PCSW[k].dur*30)+2;i++){step(1);const n=finite();if(n&&!nan)nan=k+' '+n;}step(25);if(!(st.drawn&&S().c>.85&&!H.anim))bad.push(k+'/'+from);}}
  ok(!bad.length,'all ten swings end in a guard, from rest and from a guard'+(bad.length?' (not: '+bad.join(' ')+')':''));ok(!nan,'no bone is ever NaN'+(nan?' ('+nan+')':''));}
/* ---- each guard and idle reaches its pose ---- */
{st.drawn=true;st.lastFight=st.t+1e5;const s=S();let far=[];for(let i=0;i<PCSG.length;i++){s.gi=i;s.gT=1e9;step(45);const b=blade(),d=PCSG[i].d;if(b.dot(d)<.97)far.push(i+':'+b.dot(d).toFixed(2));}
  ok(!far.length,'the five guards hold their blades as drawn'+(far.length?' ('+far.join(' ')+')':''));st.lastFight=st.t-10;step(80);
  let idl=[];for(const i of[1,2]){s.ii=i;s.iT=1e9;step(60);const b=blade(),d=PCSI[i].d;if(b.dot(d)<.9)idl.push(i+':'+b.dot(d).toFixed(2));}s.ii=0;s.iT=8;step(60);
  ok(!idl.length,'the idles at rest hold their blades as drawn'+(idl.length?' ('+idl.join(' ')+')':''));}
/* ---- standing at rest the idles come by themselves ---- */
{const s=S();s.ii=0;s.iT=.1;const seen=new Set();for(let i=0;i<30*40;i++){step(1);if(s.iw[1]>.5)seen.add(1);if(s.iw[2]>.5)seen.add(2);}ok(seen.size>=1,'standing still, the idles take turns by themselves (seen: '+[...seen].join(',')+' in 40 s)');s.ii=0;step(60);}
/* ---- walking: at rest the arm swings with the blade forward and down; in a fight the guard is held ---- */
{const x0=H.x,z0=H.z;camSet('tp');TPC.yaw=0;TPC.keys.add('KeyW');const ys=[];let low=0;for(let i=0;i<60;i++){step(1);ys.push(B.upperR.rotation.x);const b=blade();if(b.y<-.05)low++;}TPC.keys.clear();step(40);
  const sw=Math.max(...ys)-Math.min(...ys);ok(Math.hypot(H.x-x0,H.z-z0)>.5&&sw>.08,'walking at rest the sword arm swings ('+sw.toFixed(2)+')');ok(low>50,'and the blade stays forward and down ('+low+'/60 frames)');
  pcSwing();let a=0;while(H.anim&&a++<100)step(1);TPC.keys.add('KeyW');let held=0;for(let i=0;i<60;i++){step(1);if(S().c>.85&&st.drawn)held++;}TPC.keys.clear();ok(held>55,'walking in a fight the guard is held ('+held+'/60)');step(20);}
/* ---- the hero's own attacks use the swings ---- */
ok(heroCls('pc').v===PCSW_K&&PCSW_K.every(k=>REL[k]===PCSW[k].hit),'the hero\'s own attacks are the ten swings, each striking at its moment');
/* ---- the left click ---- */
{let a=0;while(H.anim&&a++<200)step(1);H.anim=null;const cv=renderer.domElement,ev=new PointerEvent('pointerdown',{button:0,pointerType:'mouse',bubbles:true,cancelable:true});const ok1=!cv.dispatchEvent(ev);
  ok(ok1&&H.anim&&PCSW[H.anim.k],'a left click on the world swings (and is not passed on to selection)');let a2=0;while(H.anim&&a2++<100)step(1);
  hotSelect(1);step(30);H.anim=null;const ev2=new PointerEvent('pointerdown',{button:0,pointerType:'mouse',bubbles:true,cancelable:true});cv.dispatchEvent(ev2);ok(!H.anim,'with empty hands a click does not swing');hotSelect(0);step(30);}
/* ---- cost ---- */
{const t0=performance.now();for(let i=0;i<120;i++){T+=1/30;anim(1/30,T);}const ms=(performance.now()-t0)/120;ok(ms<8,'anim() with the sword layer: '+ms.toFixed(2)+' ms a frame');}
window.__pcCull=cull0;return JSON.stringify(res)+'\n'+out.join('\n');})()

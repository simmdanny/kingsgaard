(function(){
/* The gait lab (a --dev build, int-lib.js, vil-lab.js for an open spot, the screenshot server on 8766): the character in the open world, driven by the keys of the third-person controller
   (W walks, Shift runs, Alt sprints), frame by frame at a fixed step.
   window.__gl.setup({seed, look, g:'m'|'f'})                   the world and the character, on open flat ground
   window.__gl.strip({pace, n, name, warm, view, d, wpn, draw})  a filmstrip of n frames over one stride (both steps), from the side; uploaded as name.jpg
   window.__gl.slip({pace, secs, turn})                          while each foot is down: how far its contact point moves in the world (the toes while on them, the heel while on it, the ankle while flat) and how far
                                                                 the leg misses its foot (the IK's reach) - in world units; plus the speed, the strides a second and the stride length
   window.__gl.run(plan)                                         steps of {keys, frames, turn}: a log of the speed and the gait weights */
const G=window.__gl={},I=window.__iw,DT=1/120,KS=['kingsgaard.run','kingsgaard.slots','kingsgaard.meta'];
const step=(dt)=>{G.T=(G.T||performance.now()/1000)+dt;heroUpdate(dt);owiTick(dt);anim(dt,G.T);owFrame();};
const rig=()=>heroU.mdl.userData.pcRig;
G.setup=function(o){o=o||{};if(!G.bk){G.bk={};for(const k of KS)G.bk[k]=localStorage.getItem(k);}
  I.setup(o.seed||3);meta.dayT=o.t==null?600:o.t;meta.pcw=o.weapon||'bow';G.pc0=G.pc0||PC;
  PC=pcClean(o.look||pcDefaults(o.g||'m','Test'));meta.owned.pc=true;meta.equipped='pc';HB.pc.n=PC.name;owSpawnHero();camSet('tp');TPC.keys.clear();
  /* a clear, flat lane 50 long along +x (the sprint covers it in 8 s) */
  const v0=OW.villages[0];let best=null;for(let r=40;r<260&&!best;r+=7)for(let a=0;a<6.28&&!best;a+=.3){const x=v0.x+Math.cos(a)*r,z=v0.z+Math.sin(a)*r;let ok=true;
    for(let k=0;k<=52&&ok;k+=1.5)for(const j of[-1.5,0,1.5])if(!owFreeFor(x+k,z+j,1)||!owCanStand(x+k,z+j))ok=false;if(!ok)continue;const h=[0,13,26,39,52].map(k=>owH(x+k,z));if(Math.max(...h)-Math.min(...h)>.5)continue;best={x,z};}
  G.at=best||{x:v0.x+60,z:v0.z};I.tele(G.at.x,G.at.z);heroU.g.rotation.y=Math.PI/2;heroU.face=Math.PI/2;TPC.yaw=-Math.PI/2;
  for(let i=0;i<90;i++)step(DT);G.contacts();return 'hero at '+heroU.x.toFixed(1)+','+heroU.z.toFixed(1);};
/* the heel's and the ball's points on the ground, in each foot bone's own frame (taken standing, feet flat) */
G.contacts=function(){const R=rig(),st=R.st,FL=R.L.foot[0],hz=-.0145*(FL/.06),bz=FL*.5,AH=PCL.y.ankle;heroU.mdl.updateMatrixWorld(true);G.heel=[];G.ball=[];
  for(let i=0;i<2;i++){const fb=R.B['foot'+(i?'R':'L')],inv=new THREE.Matrix4().copy(fb.matrixWorld).invert(),a=st.ank[i],t=st.toe[i]+(st.fyx[i]||0),sn=Math.sin(t),cs=Math.cos(t);
    G.heel.push(new THREE.Vector3(a.x+sn*hz,a.y-AH,a.z+cs*hz).applyMatrix4(heroU.mdl.matrixWorld).applyMatrix4(inv));G.ball.push(new THREE.Vector3(a.x+sn*bz,a.y-AH,a.z+cs*bz).applyMatrix4(heroU.mdl.matrixWorld).applyMatrix4(inv));}};
G.restore=function(){if(!G.bk)return;for(const k of KS){if(G.bk[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,G.bk[k]);}if(G.pc0)PC=G.pc0;TPC.keys.clear();G.bk=null;};
/* the keys of a pace (camera behind the hero, so W runs along +x) */
G.keys=function(pace){TPC.keys.clear();TPC.keys.add('KeyW');if(pace==='run')TPC.keys.add('ShiftLeft');if(pace==='sprint')TPC.keys.add('Alt');};
G.back=function(){I.tele(G.at.x,G.at.z);heroU.g.rotation.y=Math.PI/2;heroU.face=Math.PI/2;TPC.yaw=-Math.PI/2;heroU.tpV=0;};
G.cam=function(o){const H=heroU,d=o.d||2.6,y=owH(H.x,H.z),yaw={side:0,q34:-.6,front:Math.PI/2,back:-Math.PI/2}[o.view||'side'];
  camera.position.set(H.x+Math.sin(yaw)*0+Math.sin(yaw)*d,y+(o.h||.62),H.z+Math.cos(yaw)*d);camera.up.set(0,1,0);camera.lookAt(H.x,y+.56,H.z);camera.updateMatrixWorld();camera.updateProjectionMatrix();};
G.strip=async function(o){o=o||{};const n=o.n||8,W0=renderer.domElement.width,H0=renderer.domElement.height,cw=Math.round(H0*.42),ch=Math.round(H0*.86);
  G.back();if(o.draw!=null)heroU.pcDraw=o.draw;G.keys(o.pace||'walk');for(let i=0;i<(o.warm||240);i++)step(DT);
  const st=rig().st,cv=document.createElement('canvas');cv.width=cw*n;cv.height=ch+18;const c2=cv.getContext('2d');c2.fillStyle='#222';c2.fillRect(0,0,cv.width,cv.height);
  /* the frames: wherever the phase passes k/n */
  let k=0,last=st.ph,guard=0;const want=[];for(let j=0;j<n;j++)want.push(j/n);
  while(st.ph>.02&&guard++<400)step(DT);last=st.ph;
  while(k<n&&guard++<4000){if(st.ph>=want[k]||(k===0)){G.cam(o);renderer.render(scene,camera);c2.drawImage(renderer.domElement,(W0-cw)/2,(H0-ch)/2-H0*.02,cw,ch,k*cw,0,cw,ch);
      c2.fillStyle='#fff';c2.font='12px sans-serif';c2.fillText((o.pace||'walk')+' '+(st.ph).toFixed(2)+(k===0?'  v='+(heroU.tpV||0).toFixed(2)+'/s':''),k*cw+4,ch+13);k++;}
    step(DT);}
  TPC.keys.clear();for(let i=0;i<90;i++)step(DT);
  const r=await fetch('http://localhost:8766/'+(o.name||'gl_'+(o.pace||'walk'))+'.jpg',{method:'POST',body:cv.toDataURL('image/jpeg',.88)});return r.status;};
/* the contact point of a foot: the toes' joint while on the toes, the heel while on it, else the ankle (all on the ground) */
G.slip=function(o){o=o||{};G.back();G.keys(o.pace||'walk');const R=rig(),st=R.st,B=R.B,v=new THREE.Vector3(),out={pace:o.pace||'walk',slip:[0,0],miss:0,steps:[0,0]},start=[null,null],kind=[null,null];
  for(let i=0;i<(o.warm||180);i++)step(DT);let x0=heroU.x,z0=heroU.z,t0=0,ph0=st.ph,cyc=0;
  for(let f=0;f<(o.secs||4)/DT;f++){if(o.turn)TPC.yaw+=o.turn*DT;step(DT);t0+=DT;
    for(let i=0;i<2;i++){const F=st.ft[i],s=i?'R':'L',p=st.mp[i];if(F.s!==0){start[i]=null;continue;}
      const k=p<-.03?'toe':p>.03?'heel':'flat';
      const fb=B['foot'+s];v.copy(k==='toe'?G.ball[i]:G.heel[i]).applyMatrix4(fb.matrixWorld);if(k==='flat')v.lerp(PCA_V[7].copy(G.ball[i]).applyMatrix4(fb.matrixWorld),.5);
      if(start[i]===null||kind[i]!==k){start[i]=v.clone();kind[i]=k;if(k!=='flat')out.steps[i]++;continue;}
      {const d=Math.hypot(v.x-start[i].x,v.z-start[i].z);out.slip[i]=Math.max(out.slip[i],d);out.gap=Math.max(out.gap||0,Math.abs(v.y-owH(v.x,v.z)));}
      /* the leg's miss: the ankle the IK reached against the ankle it was asked for */
      B['foot'+s].getWorldPosition(v);const tg=st.ank[i].clone().applyMatrix4(heroU.mdl.matrixWorld);out.miss=Math.max(out.miss,v.distanceTo(tg));}
    if(st.ph<ph0)cyc++;ph0=st.ph;}
  const dist=Math.hypot(heroU.x-x0,heroU.z-z0);out.speed=+(dist/t0).toFixed(3);out.cyclesPerSec=+(cyc/t0).toFixed(3);out.stride=+(dist/Math.max(1,cyc)).toFixed(3);
  out.slip=out.slip.map(q=>+q.toFixed(4));out.miss=+out.miss.toFixed(4);out.gw=Object.entries(st.gw).map(([a,b])=>a+' '+b.toFixed(2)).join(', ');TPC.keys.clear();for(let i=0;i<90;i++)step(DT);return out;};
/* one frame at a phase of the stride: {pace, ph, view, d, h, ty (look-at height), name} */
G.snap=async function(o){o=o||{};G.back();G.keys(o.pace||'walk');for(let i=0;i<(o.warm||240);i++)step(DT);const st=rig().st;let g=0;while(Math.abs(((st.ph-(o.ph||0))%1+1.5)%1-.5)>.006&&g++<2000)step(DT/4);
  G.cam(o);camera.lookAt(heroU.x,owH(heroU.x,heroU.z)+(o.ty==null?.4:o.ty),heroU.z);camera.updateMatrixWorld();renderer.render(scene,camera);
  const r=await fetch('http://localhost:8766/'+(o.name||'gl_snap')+'.jpg',{method:'POST',body:renderer.domElement.toDataURL('image/jpeg',.88)});TPC.keys.clear();for(let i=0;i<60;i++)step(DT);return r.status;};
/* the hero out of the way (for the villagers' lab) */
G.away=function(){I.tele(G.at.x+60,G.at.z+60);};
G.run=function(plan){const log=[],st=rig().st;for(const s of plan){TPC.keys.clear();for(const k of s.keys||[])TPC.keys.add(k);for(let f=0;f<(s.frames||1);f++){if(s.turn)TPC.yaw+=s.turn*DT;step(DT);
      if(s.every&&f%s.every===0)log.push((s.label||'')+' f'+f+' v '+(heroU.tpV||0).toFixed(2)+' spd '+st.spd.toFixed(3)+' gw '+st.gw.walk.toFixed(2)+'/'+st.gw.run.toFixed(2)+'/'+st.gw.sprint.toFixed(2)+' drop '+st.drop.toFixed(4));}
    log.push((s.label||'')+' end v '+(heroU.tpV||0).toFixed(2)+' spd '+st.spd.toFixed(3)+' wm '+st.wm.toFixed(2)+' gw '+st.gw.walk.toFixed(2)+'/'+st.gw.run.toFixed(2)+'/'+st.gw.sprint.toFixed(2));}
  TPC.keys.clear();return log;};
})()

(async function(){
/* The touch controls (src/touch.js) in play, on a touch device (the browser pane's mobile emulation: pointer coarse, no hover). Needs int-lib.js and a started world (__iw.setup).
   Fingers are synthetic pointer events (pointerType 'touch') on the canvas; frames are stepped by hand through the game's own frame(). Results: window.__tt = {pass, fail, out:[...]}.
   On a PC (flyPC() true) it checks only that the controls stay off: no stick, touches left to the game's own handlers. */
const R=window.__tt={pass:0,fail:0,out:[],done:false};const ok=(c,m)=>{R[c?'pass':'fail']++;R.out.push((c?'PASS ':'FAIL ')+m);return c;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),cv=renderer.domElement;let T=performance.now();
const F=n=>{for(let i=0;i<n;i++){T+=33;frame(T);}};
const P=(type,id,x,y)=>{const e=new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y,isPrimary:false,button:type==='pointermove'?-1:0,buttons:type==='pointerup'||type==='pointercancel'?0:1});cv.dispatchEvent(e);return e;};
const H=heroU,fwd=()=>({x:-Math.sin(TPC.yaw),z:-Math.cos(TPC.yaw)}),rgt=()=>({x:Math.cos(TPC.yaw),z:-Math.sin(TPC.yaw)});
const moved=(fn,n)=>{const x0=H.x,z0=H.z;fn();F(n);const dx=H.x-x0,dz=H.z-z0,d=Math.hypot(dx,dz)||1e-9;return{d,dx:dx/d,dz:dz/d};};
const camState=()=>JSON.stringify([CAM.px,CAM.pz,CAM.zoom,CAM.yaw,PTR.size]);
try{
  F(3);
  if(!owTouch()){/* a PC: nothing of this may switch on */
    ok(TCH.el.style.display!=='block'&&!TCH.shown,'a PC shows no stick');const y0=TPC.yaw;P('pointerdown',41,60,300);P('pointermove',41,90,280);P('pointerup',41,90,280);F(2);
    ok(!TCH.stick&&!TPC.joy&&TCH.cams.size===0&&TPC.yaw===y0,'a PC leaves touches to the game (no stick, no camera turn from them)');R.done=true;return;}
  ok(TPC.on&&tpcCam()&&camMode()==='tp','a touch device plays the hero in third person (TPC.on, mode tp)');
  ok(TCH.shown&&TCH.el.style.display==='block','the stick shows');
  {const f=fwd(),hf={x:Math.sin(H.faceA!=null?H.faceA:H.face),z:Math.cos(H.faceA!=null?H.faceA:H.face)};R.spawnDot=+(f.x*hf.x+f.z*hf.z).toFixed(2);}
  const Z=TCH.zone,home=TCH.home;ok(Z&&home.x<innerWidth*.3&&home.y>innerHeight*.45,'the stick rests at the bottom left ('+Math.round(home.x)+','+Math.round(home.y)+')');
  /* a thumb down on the left: the stick comes to it, nothing moves yet */
  const c0=camState();const tx=Math.min(Z.x1,Z.x0+40),ty=Math.max(Z.y0,Z.y1-40);P('pointerdown',1,tx,ty);
  ok(TCH.stick&&Math.abs(TCH.stick.cx-tx)<1&&Math.abs(TCH.stick.cy-ty)<1&&!TPC.joy,'the stick comes under the thumb and does not move the hero until the thumb moves');
  /* a short push: a walk, away from the camera */
  let m=moved(()=>P('pointermove',1,tx,ty-20),40);const f=fwd();
  ok(TPC.joy&&TPC.joy.pace==='walk','a short push walks');ok(m.d>.5&&m.dx*f.x+m.dz*f.z>.9,'up on the stick walks away from the camera ('+m.d.toFixed(2)+' m, dot '+(m.dx*f.x+m.dz*f.z).toFixed(2)+')');
  ok(Math.abs((H.tpV||0)-TPC_PACE.walk)<.35,'at a walk\'s pace ('+(H.tpV||0).toFixed(2)+' m/s)');
  /* to the ring: a run */
  P('pointermove',1,tx,ty-42);F(45);ok(TPC.joy.pace==='run'&&Math.abs(H.tpV-TPC_PACE.run)<.6,'a push to the ring runs ('+H.tpV.toFixed(2)+' m/s)');
  ok(TCH.el.classList.contains('run'),'the ring lights up for a run');
  /* sideways: to the camera's right */
  m=moved(()=>P('pointermove',1,tx+42,ty),45);const r=rgt();ok(m.dx*r.x+m.dz*r.z>.8,'right on the stick goes to the camera\'s right (dot '+(m.dx*r.x+m.dz*r.z).toFixed(2)+')');
  /* past the ring: a sprint, and the stick follows the thumb */
  P('pointermove',1,tx,ty-72);await sleep(260);P('pointermove',1,tx,ty-74);F(60);
  ok(TPC.joy.pace==='sprint'&&TCH.el.classList.contains('sprint')&&H.tpV>TPC_PACE.run+1,'past the ring for a moment sprints ('+H.tpV.toFixed(2)+' m/s)');
  P('pointermove',1,tx,ty-140);ok(TCH.stick.cy<ty-30,'a thumb that slides on drags the stick after it');
  /* let go: the hero eases to a stop, the stick goes home */
  P('pointerup',1,tx,ty-140);ok(!TCH.stick&&!TPC.joy,'letting go of the stick');F(60);ok((H.tpV||0)<.05,'the hero comes to a stop ('+(H.tpV||0).toFixed(3)+')');
  {const q=(TCH.base.style.transform.match(/-?[\d.]+/g)||[]).map(Number);ok(Math.abs(q[0]-home.x)<.2&&Math.abs(q[1]-home.y)<.2,'the stick is back at its place ('+TCH.base.style.transform+')');}
  ok(camState()===c0,'the tactical camera\'s handlers got none of it (CAM and its pointers untouched)');
  /* a finger on the right turns the camera */
  const y0=TPC.yaw,p0=TPC.pitch,cx=innerWidth*.75,cy=innerHeight*.45;P('pointerdown',2,cx,cy);for(let i=1;i<=8;i++)P('pointermove',2,cx-i*12,cy);P('pointerup',2,cx-96,cy);
  ok(TPC.yaw>y0+.3,'a drag to the left turns the camera ('+(TPC.yaw-y0).toFixed(2)+' rad)');ok(sheet.hidden,'a drag is not a tap');
  P('pointerdown',3,cx,cy);for(let i=1;i<=10;i++)P('pointermove',3,cx,cy+i*60);P('pointerup',3,cx,cy+600);ok(TPC.pitch<=1.25+1e-9&&TPC.pitch>p0,'a drag down tilts the camera, as far as the limit ('+TPC.pitch.toFixed(2)+')');
  P('pointerdown',3,cx,cy);for(let i=1;i<=10;i++)P('pointermove',3,cx,cy-i*60);P('pointerup',3,cx,cy-600);ok(TPC.pitch>=-.15-1e-9,'and up, as far as the other limit ('+TPC.pitch.toFixed(2)+')');TPC.pitch=.38;
  /* two fingers pinch */
  /* (both fingers right of the stick's part of the screen, which on a phone held upright is nearly half of it) */const px=Math.max(cx,TCH.zone.w+100);
  const d0=TPC.dist;P('pointerdown',4,px-30,cy);P('pointerdown',5,px+30,cy);for(let i=1;i<=6;i++){P('pointermove',4,px-30-i*10,cy);P('pointermove',5,px+30+i*10,cy);}P('pointerup',4,px-90,cy);P('pointerup',5,px+90,cy);
  ok(TPC.dist<d0*.6,'spreading two fingers brings the camera nearer ('+d0.toFixed(2)+' -> '+TPC.dist.toFixed(2)+')');
  const d1=TPC.dist;P('pointerdown',4,px-90,cy);P('pointerdown',5,px+90,cy);for(let i=1;i<=8;i++){P('pointermove',4,px-90+i*10,cy);P('pointermove',5,px+90-i*10,cy);}P('pointerup',4,px-10,cy);P('pointerup',5,px+10,cy);
  ok(TPC.dist>d1*2&&TPC.dist<=16,'pinching takes it further, within the limit ('+TPC.dist.toFixed(2)+')');TPC.dist=5.4;
  /* the stick and a camera finger at once */
  const y1=TPC.yaw;P('pointerdown',6,tx,ty);P('pointermove',6,tx,ty-42);P('pointerdown',7,cx,cy);P('pointermove',7,cx+60,cy);F(10);
  ok(TPC.joy&&TPC.joy.pace==='run'&&TPC.yaw<y1-.2&&H.tpV>.5,'walking with the stick while another finger turns the camera');
  P('pointercancel',6,tx,ty-42);ok(!TCH.stick&&!TPC.joy,'a cancelled touch lets go of the stick');P('pointerup',7,cx+60,cy);F(40);
  /* a tap on the hero opens its window; the controls hide while it is open and come back after */
  {const v=new THREE.Vector3(H.x,H.g.position.y+.7,H.z).project(camera),rc=cv.getBoundingClientRect(),sx=(v.x+1)/2*rc.width+rc.left,sy=(1-v.y)/2*rc.height+rc.top;
    P('pointerdown',8,sx,sy);P('pointerup',8,sx,sy);ok(!sheet.hidden&&sel===heroU,'a tap on the hero opens its window');F(2);
    ok(!TCH.shown&&TCH.el.style.display==='none','the stick hides while a window is open');
    const yy=TPC.yaw;P('pointerdown',9,cx,cy);P('pointermove',9,cx-80,cy);P('pointerup',9,cx-80,cy);ok(TPC.yaw===yy,'with a window open the fingers are left to the window and the game (no turn)');
    closeSheet();F(2);ok(TCH.shown,'the stick is back when the window is closed');}
  const c1=camState();/* (with the window open the drag above went to the game's own handlers, as it should) */
  /* the camera button: behind the hero again */
  TPC.yaw=1.3;camReset();{const f2=fwd(),hf={x:Math.sin(H.face),z:Math.cos(H.face)};ok(f2.x*hf.x+f2.z*hf.z>.99,'the camera button puts the camera behind the hero');}
  /* a quick tap on the left (where the stick is) is still a tap */
  {TPC.yaw=0;F(3);const v=new THREE.Vector3(H.x,H.g.position.y+.7,H.z).project(camera),rc=cv.getBoundingClientRect(),sx=(v.x+1)/2*rc.width+rc.left,sy=(1-v.y)/2*rc.height+rc.top,w0=TCH.zone.w;
    const L0=tchLayout;tchLayout=function(){L0();TCH.zone.w=sx+20;};/* (the hero, seen in the middle, is counted in the stick's part of the screen for this) */
    P('pointerdown',10,sx,sy);const st=!!TCH.stick;P('pointerup',10,sx,sy);ok(st&&!sheet.hidden,'a quick tap where the stick comes is still a tap (the hero\'s window opens)');closeSheet();F(2);tchLayout=L0;tchLayout();}
  ok(camState()===c1,'the tactical camera\'s handlers never saw a finger while the controls were live');
}catch(e){ok(false,'threw: '+(e&&e.stack||e));}
R.done=true;})();

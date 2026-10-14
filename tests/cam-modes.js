(function(){
/* Camera modes (V) and the mouse mode (G). Needs int-lib.js and a started open world (__iw.setup). Real key events on window.
   Result: window.__cam = {fails:[...], log:[...]} */
const R=window.__cam={fails:[],log:[]};const F=(c,m)=>{if(!c){R.fails.push(m);}};
const key=(code,type)=>window.dispatchEvent(new KeyboardEvent(type||'keydown',{code,key:code,bubbles:true,cancelable:true}));
const tap=c=>{key(c,'keydown');key(c,'keyup');};
const cv=renderer.domElement;let lockReq=0,lockExit=0;
const oReq=cv.requestPointerLock,oExit=document.exitPointerLock;
cv.requestPointerLock=function(){lockReq++;return Promise.resolve();};document.exitPointerLock=function(){lockExit++;};
const H=heroU;
for(let i=0;i<5;i++)__iw.frame(1/30);
F(typeof camMode==='function','camMode missing');F(flyPC(),'flyPC false in this browser (cannot test keys)');
const snap=()=>({x:H.x,z:H.z,f:H.face,y:H.g.position.y});
const same=(a,b)=>Math.abs(a.x-b.x)<1e-9&&Math.abs(a.z-b.z)<1e-9&&Math.abs(a.f-b.f)<1e-9&&Math.abs(a.y-b.y)<1e-9;
const s0=snap();R.log.push('start '+camMode());F(camMode()==='tp','default mode is not third person: '+camMode());
const seq=[];
for(let i=0;i<7;i++){tap('KeyV');__iw.frame(1/30);seq.push(camMode());
  F(same(s0,snap()),'hero moved/turned by V at step '+i);
  const m=camMode();
  F(H.g.visible===true,'hero group hidden in '+m);
  F((H.mdl.visible===false)===(m==='fp'),'hero model visibility wrong in '+m+': '+H.mdl.visible);
  F(!!OWI.cutOn===(m==='tp'),'cutOn wrong in '+m);
  if(m==='fp'){const e=H.g.position.y+H._tl*.92;F(Math.abs(camera.position.y-e)<1e-6&&Math.abs(camera.position.x-H.x)<1e-6&&Math.abs(camera.position.z-H.z)<1e-6,'fp camera not at the eye '+camera.position.toArray().map(v=>+v.toFixed(2)));}
  if(m==='tp'){F(Math.hypot(camera.position.x-H.x,camera.position.z-H.z)>2,'tp camera not behind the hero');}
  if(m==='fc'){F(FLY.on&&!TPC.fp,'fc flags');}
  F(!(FLY.on&&TPC.fp),'both fly and fp');}
R.log.push('sequence '+seq.join('>'));
F(seq.join('>')==='fc>fp>tp>fc>fp>tp>fc','V sequence: '+seq.join('>'));
/* leave in tp */
while(camMode()!=='tp'){tap('KeyV');__iw.frame(1/30);}
/* the view heading goes on from the free camera into first person */
tap('KeyV');__iw.frame(1/30);FLY.yaw=1.1;FLY.pitch=.2;flyApply();__iw.frame(1/30);const d0=camera.getWorldDirection(new THREE.Vector3());tap('KeyV');__iw.frame(1/30);
const d1=camera.getWorldDirection(new THREE.Vector3());F(camMode()==='fp','not fp');
F(Math.abs(Math.atan2(d0.x,d0.z)-Math.atan2(d1.x,d1.z))<1e-6,'heading jumps between fc and fp: '+Math.atan2(d0.x,d0.z).toFixed(3)+' -> '+Math.atan2(d1.x,d1.z).toFixed(3));
/* first person: W walks where the camera looks */
const a={x:H.x,z:H.z};TPC.keys.add('KeyW');for(let i=0;i<30;i++){heroUpdate(1/30);__iw.frame(1/30);}TPC.keys.clear();
const mv=[H.x-a.x,H.z-a.z],ml=Math.hypot(mv[0],mv[1]);const dl=Math.hypot(d1.x,d1.z);
if(ml>.3){F((mv[0]*d1.x+mv[1]*d1.z)/(ml*dl)>.97,'W does not walk along the view in fp: '+((mv[0]*d1.x+mv[1]*d1.z)/(ml*dl)).toFixed(3));}else R.log.push('hero did not move in fp (blocked?) '+ml.toFixed(2));
/* pitch limit and mouse */
TPC.look=true;const mm=(dx,dy)=>document.dispatchEvent(Object.assign(new MouseEvent('mousemove',{bubbles:true}),{}));
{const ev=new MouseEvent('mousemove',{movementX:0,movementY:100000});document.dispatchEvent(ev);}
F(TPC.pitch<=1.45+1e-9&&TPC.pitch>=-1.45-1e-9,'fp pitch out of range '+TPC.pitch);
{const ev=new MouseEvent('mousemove',{movementX:0,movementY:-100000});document.dispatchEvent(ev);}
F(TPC.pitch>=-1.45-1e-9&&TPC.pitch<=1.45+1e-9,'fp pitch out of range (up) '+TPC.pitch);
TPC.look=false;TPC.pitch=0;
/* G: the mouse mode. F does not touch it. */
lockReq=0;lockExit=0;tap('KeyF');F(lockReq===0&&lockExit===0,'F toggled the mouse mode');
tap('KeyG');F(lockReq===1,'G did not ask for pointer lock in fp ('+lockReq+')');
tap('KeyG');F(lockReq===2,'G (second press, lock not granted in this harness) did not ask again');
/* a V with the lock held keeps the lock: simulate the lock being on */
Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>cv});
lockReq=0;lockExit=0;tap('KeyG');F(lockExit===1&&lockReq===0,'G did not release the lock ('+lockExit+','+lockReq+')');
document.dispatchEvent(new Event('pointerlockchange'));F(TPC.look===true,'TPC.look not synced with the lock in fp');
lockReq=0;lockExit=0;tap('KeyV');__iw.frame(1/30);F(camMode()==='tp'&&lockExit===0&&TPC.look===true,'V dropped the lock tp: '+camMode()+' exit '+lockExit+' look '+TPC.look);
tap('KeyV');__iw.frame(1/30);F(camMode()==='fc'&&lockExit===0&&FLY.look===true&&TPC.look===false,'V dropped the lock fc: '+camMode()+' exit '+lockExit+' fly.look '+FLY.look+' tpc.look '+TPC.look);
tap('KeyV');__iw.frame(1/30);F(camMode()==='fp'&&lockExit===0&&TPC.look===true&&FLY.look===false,'V dropped the lock fp: '+camMode()+' exit '+lockExit);
delete document.pointerLockElement;document.dispatchEvent(new Event('pointerlockchange'));F(TPC.look===false&&FLY.look===false,'flags stay after the lock is gone');
/* the keys wait when a window is open */
{const c0=camMode();paused=true;tap('KeyV');F(camMode()===c0,'V works while paused');lockReq=0;tap('KeyG');F(lockReq===0,'G works while paused');paused=false;}
{const c0=camMode();const sh=document.getElementById('home');sh.hidden=false;tap('KeyV');F(camMode()===c0,'V works with the hub open');sh.hidden=true;}
/* back to third person for whoever comes next */
while(camMode()!=='tp'){tap('KeyV');__iw.frame(1/30);}
F(H.mdl.visible===true,'model hidden in tp');
cv.requestPointerLock=oReq;document.exitPointerLock=oExit;
return R.fails.length?('FAIL '+R.fails.join(' | ')):('OK '+R.log.join(' ; '));})()

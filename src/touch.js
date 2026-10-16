/* =====================================================================================================================
   TOUCH CONTROLS (phones and tablets: a device without a mouse, flyPC() false). In the open world the hero is always played in third person there, as on a PC
   (owFrame turns TPC on for owTouch() too), and the screen is the controller:
     - the stick on the left walks the hero. It rests at the bottom left; a thumb put down anywhere in the left part of the screen brings it there (it floats, as in
       mobile action games) and it follows a thumb that slides on past it. A short push walks, a push to the ring runs, past the ring sprints (the gait paces of the
       keyboard: tpcPace). The way is relative to the camera: up on the stick is away from the camera, as W is.
     - a finger anywhere else turns the camera round the hero (left and right, up and down); two fingers pinch it nearer or further (TPC.dist).
     - a tap that does not move is a tap as before (buildings, the hero, chests, lore stones: kingsgaard.html tap).
   The fingers on the screen are taken here, before the game's own touch handlers (those drive the tactical camera, which third person does not use).
   ===================================================================================================================== */
const TCH={coarse:false,stick:null,cams:new Map(),pinch:null,el:null,base:null,knob:null,dir:null,shown:false,home:{x:0,y:0},zone:null,R:50,t0:0,hint:0,ret:0};
{const q=()=>{try{TCH.coarse=matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints||0)>0;}catch(e){TCH.coarse=false;}};q();try{matchMedia('(pointer:coarse)').addEventListener('change',q);}catch(e){}}
/* a touch device (no fine pointer that hovers): the hero in third person with the touch controls */
const owTouch=()=>TCH.coarse&&!flyPC();
/* the controls are live: the hero is played in third person and no window (pause, a sheet, the hub, the inventory) covers the game */
const tchLive=()=>owTouch()&&tpcCam()&&!uiBlocksKeys()&&!placing&&!CAM.gal&&!(typeof GM!=='undefined'&&GM.open);

/* ---- the stick ---- */
(function(){const st=document.createElement('style');
  st.textContent='#tStick{position:fixed;left:0;top:0;width:0;height:0;z-index:6;pointer-events:none;display:none}'+
    '#tStick .ts-base{position:absolute;left:0;top:0;width:100px;height:100px;margin:-50px 0 0 -50px;border-radius:50%;opacity:.5;'+
      'background:radial-gradient(circle at 50% 50%,rgba(20,14,8,.06) 0 46%,rgba(20,14,8,.34) 47% 62%,rgba(20,14,8,.18) 63% 100%);'+
      'box-shadow:inset 0 0 0 1.5px rgba(232,200,120,.55),inset 0 0 0 7px rgba(255,236,190,.05),0 2px 14px rgba(0,0,0,.28);transition:opacity .25s}'+
    '#tStick .ts-base::before{content:"";position:absolute;inset:16px;border-radius:50%;border:1px dashed rgba(232,200,120,.22)}'+
    '#tStick .ts-dir{position:absolute;inset:-10px;border-radius:50%;opacity:0;transition:opacity .15s;'+
      'background:conic-gradient(from calc(var(--a,0deg) - 52deg),rgba(255,214,120,0) 0deg,rgba(255,220,140,1) 52deg,rgba(255,214,120,0) 104deg,rgba(255,214,120,0) 360deg);'+
      '-webkit-mask:radial-gradient(circle,transparent 0 52.5px,#000 53.5px 57px,transparent 58px);mask:radial-gradient(circle,transparent 0 52.5px,#000 53.5px 57px,transparent 58px)}'+
    '#tStick .ts-knob{position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;'+
      'background:radial-gradient(circle at 38% 32%,#fff6dc 0,#efd9a2 30%,#c99a47 72%,#8d6427 100%);'+
      'box-shadow:0 3px 8px rgba(0,0,0,.45),inset 0 -2px 4px rgba(90,56,16,.45),inset 0 1px 1px rgba(255,255,255,.7);transition:box-shadow .2s}'+
    '#tStick .ts-knob::after{content:"";position:absolute;inset:11px;border-radius:50%;box-shadow:inset 0 1px 2px rgba(90,56,16,.5);background:radial-gradient(circle at 50% 40%,rgba(255,250,235,.55),rgba(255,250,235,0) 70%)}'+
    '#tStick.on .ts-base{opacity:1}#tStick.on .ts-dir{opacity:1;filter:drop-shadow(0 0 3px rgba(255,200,100,.8))}'+
    '#tStick.run .ts-base{box-shadow:inset 0 0 0 2px rgba(255,214,120,.85),inset 0 0 0 7px rgba(255,236,190,.08),0 2px 14px rgba(0,0,0,.28)}'+
    '#tStick.sprint .ts-base{box-shadow:inset 0 0 0 2px rgba(255,190,90,1),0 0 18px rgba(255,170,60,.55),0 2px 14px rgba(0,0,0,.28)}'+
    '#tStick.sprint .ts-knob{box-shadow:0 0 14px rgba(255,190,90,.9),0 3px 8px rgba(0,0,0,.45),inset 0 -2px 4px rgba(90,56,16,.45),inset 0 1px 1px rgba(255,255,255,.7)}'+
    '#tStick.back .ts-base,#tStick.back .ts-knob{transition:transform .18s ease-out,opacity .25s}';
  document.head.appendChild(st);
  const el=document.createElement('div');el.id='tStick';el.setAttribute('aria-hidden','true');el.innerHTML='<div class="ts-base"><i class="ts-dir"></i><div class="ts-knob"></div></div>';document.body.appendChild(el);
  TCH.el=el;TCH.base=el.firstChild;TCH.dir=TCH.base.firstChild;TCH.knob=TCH.base.lastChild;})();
/* where the stick rests and where a thumb may bring it: the left part of the screen between the bar at the top and the bar at the bottom (and the edges of a notch) */
function tchLayout(){const W0=innerWidth,H0=innerHeight,R=TCH.R,rc=s=>{const e=document.querySelector(s);if(!e||e.hidden)return null;const b=e.getBoundingClientRect();return b.width&&b.height?b:null;};
  const hud=rc('#hud'),bar=rc('#bar'),top=hud?hud.bottom:0;let bot=H0;if(bar&&bar.top>H0*.5)bot=bar.top;
  const sl=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tch-sl'))||0;
  const x0=sl+R+14,x1=Math.max(x0,W0*.42),y0=top+R+12,y1=Math.max(y0,bot-R-14);
  TCH.zone={x0,x1,y0,y1,top,bot,w:W0*.46};TCH.home={x:x0+8,y:y1-6};}
(function(){/* the left edge of the safe area (a phone held sideways with the notch on the left) */const d=document.documentElement;d.style.setProperty('--tch-sl','0px');
  const p=document.createElement('div');p.style.cssText='position:fixed;left:0;top:0;width:env(safe-area-inset-left,0px);height:0;visibility:hidden;pointer-events:none';document.body.appendChild(p);
  const upd=()=>{d.style.setProperty('--tch-sl',p.getBoundingClientRect().width+'px');tchLayout();};addEventListener('resize',upd);addEventListener('orientationchange',()=>setTimeout(upd,200));upd();})();
const tchPlace=(x,y)=>{TCH.base.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';};
const tchKnob=(x,y)=>{TCH.knob.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';};
/* the stick let go: the knob springs back, the stick goes home, the hero eases to a stop (tpcHeroMove) */
function tchRelease(){TCH.stick=null;TPC.joy=null;const E=TCH.el;E.classList.remove('on','run','sprint');E.classList.add('back');tchKnob(0,0);tchPlace(TCH.home.x,TCH.home.y);clearTimeout(TCH.ret);TCH.ret=setTimeout(()=>E.classList.remove('back'),220);}
/* the thumb moved: the stick's push (0 at the middle, 1 at the ring) and the way it points give the hero's way and pace */
function tchStick(x,y){const S=TCH.stick,R=TCH.R;let dx=x-S.cx,dy=y-S.cy,d=Math.hypot(dx,dy);
  /* a thumb that slides on past the ring drags the stick after it (the stick stays under the thumb) */
  const fol=R*1.55;if(d>fol){const k=(d-fol)/d;S.cx+=dx*k;S.cy+=dy*k;const z=TCH.zone;S.cx=clamp(S.cx,R+4,innerWidth-R-4);S.cy=clamp(S.cy,(z?z.top:0)+R+4,innerHeight-R-4);tchPlace(S.cx,S.cy);dx=x-S.cx;dy=y-S.cy;d=Math.hypot(dx,dy);}
  const m=d/R,kd=Math.min(d,R*.8);tchKnob(d>0?dx/d*kd:0,d>0?dy/d*kd:0);
  const E=TCH.el;if(m<.16){TPC.joy=null;E.classList.remove('run','sprint');TCH.dir.style.opacity='0';return;}
  /* past the ring for a moment: a sprint; at the ring: a run; nearer the middle: a walk */
  const now=performance.now();if(m>1.28){if(!S.out)S.out=now;}else S.out=0;
  const pace=S.out&&now-S.out>200?'sprint':m>.62?'run':'walk';
  TPC.joy={r:dx/d,f:-dy/d,pace};E.classList.toggle('run',pace==='run');E.classList.toggle('sprint',pace==='sprint');
  TCH.dir.style.opacity='';TCH.dir.style.setProperty('--a',(Math.atan2(dx,-dy)*180/Math.PI).toFixed(1)+'deg');}
/* ---- the camera: one finger turns it, two pinch it ---- */
const TCH_TURN=2.7;/* radians turned by a drag across the shorter side of the screen */
function tchTurn(dx,dy){const k=TCH_TURN/Math.max(280,Math.min(innerWidth,innerHeight))*owSens();TPC.yaw-=dx*k;TPC.pitch=clamp(TPC.pitch+dy*k*.7,-.15,1.25);}
function tchPinchStart(){const P=[...TCH.cams.values()];if(P.length<2){TCH.pinch=null;return;}const a=P[0],b=P[1];TCH.pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};}

/* ---- the fingers: taken before the game's own touch handlers while the controls are live ---- */
(function(){const cv=renderer.domElement,mine=e=>e.pointerType!=='mouse'&&e.target===cv&&tchLive();
  const take=e=>{e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();};
  window.addEventListener('pointerdown',e=>{if(!mine(e))return;take(e);tchLayout();const z=TCH.zone,x=e.clientX,y=e.clientY;
    if(!TCH.stick&&z&&x<z.w&&y>z.top&&y<z.bot){/* a thumb on the left: the stick comes to it, its middle under the thumb (nothing moves until the thumb does) */
      const cx=clamp(x,z.x0,z.x1),cy=clamp(y,z.y0,z.y1);TCH.stick={id:e.pointerId,cx,cy,out:0,x0:x,y0:y,t0:performance.now(),moved:false};
      const E=TCH.el;E.classList.remove('back');clearTimeout(TCH.ret);E.classList.add('on');tchPlace(cx,cy);tchStick(x,y);return;}
    TCH.cams.set(e.pointerId,{x,y,x0:x,y0:y,t0:performance.now(),moved:false});tchPinchStart();},true);
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')return;
    if(TCH.stick&&e.pointerId===TCH.stick.id){take(e);if(!tchLive()){tchRelease();return;}const S=TCH.stick;if(Math.hypot(e.clientX-S.x0,e.clientY-S.y0)>10)S.moved=true;tchStick(e.clientX,e.clientY);return;}
    const c=TCH.cams.get(e.pointerId);if(!c)return;take(e);const x=e.clientX,y=e.clientY;if(Math.hypot(x-c.x0,y-c.y0)>10)c.moved=true;
    if(!tchLive()){c.x=x;c.y=y;return;}
    if(TCH.pinch&&TCH.cams.size>=2){c.x=x;c.y=y;const P=[...TCH.cams.values()],a=P[0],b=P[1],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,p=TCH.pinch;
      TPC.dist=clamp(TPC.dist*p.d/d,2.4,16);tchTurn(mx-p.mx,my-p.my);p.d=d;p.mx=mx;p.my=my;tpcApply();return;}
    tchTurn(x-c.x,y-c.y);c.x=x;c.y=y;tpcApply();},true);
  const end=e=>{if(e.pointerType==='mouse')return;
    if(TCH.stick&&e.pointerId===TCH.stick.id){take(e);const S=TCH.stick;tchRelease();
      /* a quick tap on the left that never moved is a tap as anywhere else (a building, a chest there) */if(e.type==='pointerup'&&!S.moved&&performance.now()-S.t0<300&&tchLive())tap(e.clientX,e.clientY);return;}
    const c=TCH.cams.get(e.pointerId);if(!c)return;take(e);TCH.cams.delete(e.pointerId);const was=TCH.pinch;tchPinchStart();
    /* a tap: one finger, not moved, short, and no pinch going on */
    if(e.type==='pointerup'&&!c.moved&&!was&&performance.now()-c.t0<450&&tchLive())tap(e.clientX,e.clientY);};
  window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
  /* (Safari on a phone scrolls or zooms the page on a touch move unless the touch event itself is stopped; pointer events alone do not stop it) */
  const tm=e=>{if(tchLive()&&e.cancelable)e.preventDefault();};cv.addEventListener('touchstart',tm,{passive:false});cv.addEventListener('touchmove',tm,{passive:false});
  addEventListener('resize',()=>{if(TCH.shown&&!TCH.stick){tchLayout();tchPlace(TCH.home.x,TCH.home.y);}});})();
/* every frame (kingsgaard.html frame): the controls show while they are live; a window that opens over the game lets go of everything */
function tchFrame(){const live=tchLive();if(live===TCH.shown)return;TCH.shown=live;TCH.el.style.display=live?'block':'none';
  if(live){tchLayout();if(!TCH.stick)tchPlace(TCH.home.x,TCH.home.y);if(!TCH.hint){TCH.hint=1;TCH.t0=performance.now();}/* (the hint shows once, the first time the controls come up) */}
  else{if(TCH.stick)tchRelease();TCH.cams.clear();TCH.pinch=null;TPC.joy=null;}}

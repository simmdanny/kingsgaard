/* =====================================================================================================================
   KINGSGAARD INTERIORS (9/9): the front door of a house you can enter.

   A door starts closed. On a PC the F key opens and closes the one door the hero is standing at (a prompt says which); on a touch screen
   the door opens by itself when the hero comes up to it and shuts behind them. The leaf hangs on a hinge at one jamb and swings through a quarter turn:
     - opened from outside it swings INTO the house (the plan keeps that corner free: the 'door' strip in place.js),
     - opened from inside it swings OUT over the steps, away from the hero, when nothing is there; otherwise into the house when the hero is not in the way.
   Everything is measured from the same few numbers (owdG, owdPose): the hinge pin stands at the corner of the leaf on the side it swings towards, 6 mm inside the jamb, so the hinge edge only ever
   moves away from the frame whatever the angle, and a leaf that stands open lies along the line of the jamb, never in the doorway or in the wall.
   Collision follows the state: one box fills the doorway while the door is shut or moving, and a thin box along the open leaf takes its place once it stands open.
   The dynamic leaf (a pivot with its own small mesh) exists only for a door that is not shut; a shut door is the static leaf that the village batches merge.
   ===================================================================================================================== */
const OWD={t:.5,swing:Math.PI/2,range:2.3,tgt:null,hint:'',busy:new Set(),open:new Set(),el:null,tFar:0,auto:new Set()};
OWD.reset=function(){OWD.tgt=null;OWD.busy.clear();OWD.open.clear();OWD.auto.clear();if(OWD.el)OWD.el.style.display='none';};
const owdLeaf=b=>b&&b.arch&&b.arch.leaf&&!b.tunnel&&b.enter?b.arch.leaf:null;
const owdEase=a=>a*a*(3-2*a);

/* the numbers of one door, in the building's drawing units (the leaf mesh) and in metres (colliders) */
function owdG(b){return b.dg||(b.dg=owdGeo(b.arch.leaf,b.BSc,b.arch.leaf.hs));}
/* the same numbers for the leaf lf hung on the jamb hs (+1: the jamb at +x), at the building scale BS (owiHinge weighs both jambs before the building has its leaf) */
function owdGeo(lf,BS,hs){const th=.035,gap=.006,ax=-hs,Ll=lf.w-2*gap,xp=lf.u+hs*(lf.w/2-gap),zc=lf.z1-OW_T+.0275;
  /* The leaf is a board Ll long and th thick that lies shut in the middle of the wall's thickness (zc), 6 mm short of both jambs (that is also clear of the frame beams, which start 5 mm inside the opening).
     xp: the hinge pin's place along the wall, at the hinge jamb. ax: the way the leaf points along the wall (away from the hinge). */
  return{lf,BS,th,hs,ax,Ll,xp,zc,hh:lf.h-.012,xpm:xp*BS,zcm:zc*BS,Rm:Ll*BS,tm:th*BS,um:lf.u*BS,wm:lf.w*BS};}
/* Where the pin, the pivot and the leaf are for a swing dir (+1 into the house, -1 out of it) turned through theta. The pin stands at the corner of the leaf on the side it swings towards
   (the inner face for an inward door, the outer face for an outward one): from there the hinge edge only ever moves away from the jamb, so it can never go into the frame whatever the angle. */
function owdPose(g,dir,theta){const sz=dir*(g.hs>0?-1:1);return{px:g.xp,pz:g.zc-dir*g.th/2,rot:(g.hs>0?Math.PI:0)+g.ax*dir*theta,cz:sz*g.th/2};}
/* a point of the leaf (lx along it from the pin, lz across it from its middle plane) in the building's frame, drawing units */
function owdPt(g,dir,theta,lx,lz){const p=owdPose(g,dir,theta),c=Math.cos(p.rot),s=Math.sin(p.rot),z=lz+p.cz;return[p.px+lx*c+z*s,p.pz-lx*s+z*c];}
/* the leaf: a plank board, a handle on each face, two strap hinges. world = shut, in the building's frame; otherwise on its own axis, the pin at the origin and the board's middle plane at z = 0 */
function owdParts(kl,g,world){const lf=g.lf,yc=lf.y0+lf.h/2,dark=0x2a2a2a,at=(lx,lz)=>world?owdPt(g,1,0,lx,lz):[lx,lz];
  let q=at(g.Ll/2,0);kl.P('d',box(g.Ll,g.hh,g.th),lf.col,q[0],yc,q[1]);
  for(const s of[-1,1]){q=at(g.Ll-.07,s*(g.th/2+.012));kl.P('d',box(.025,.025,.03),dark,q[0],lf.y0+lf.h*.45,q[1]);
    for(const f of[.18,.8]){q=at(.055,s*(g.th/2+.004));kl.P('d',box(.11,.03,.008),dark,q[0],lf.y0+lf.h*f,q[1]);}}}
function owdEnsure(b){const d=b.dr;if(d.pv)return;const g=owdG(b),kl=kitBuilder();owdParts(kl,g,false);
  const m=new THREE.Mesh(mergeParts(kl.B.d),b.mats.w);m.castShadow=true;m.receiveShadow=true;m.layers.enable(OWIL_LAYER);const pv=new THREE.Group();pv.add(m);pv.visible=false;b.gi.add(pv);d.pv=pv;d.pm=m;}
function owdFree(b){const d=b.dr;if(d&&d.pv){b.gi.remove(d.pv);if(d.pm)d.pm.geometry.dispose();}b.dr=null;OWD.busy.delete(b);OWD.open.delete(b);OWD.auto.delete(b);if(OWD.tgt===b)OWD.tgt=null;}
function owdGet(b,mk){if(b.dr)return b.dr;if(!mk||!owdLeaf(b))return null;return b.dr={a:0,t:0,dir:1,pv:null,pm:null,mv:false};}

/* ---- colliders: the doorway box (slot A) and the open leaf (slot B) are the last two boxes of the building's list ---- */
/* (the front door is on the ground floor: its boxes are on that level only - with OWI_ALL they stood on every floor, an invisible wall above the door upstairs) */
function owdAddCol(b,c,g0,g1,zb,z1){if(b.tunnel||!b.arch.leaf)return;c.dA=c.n;c.add(g0,g1,zb,z1,OWI_GND);c.dB=c.n;c.add(g1-.02,g1,zb,z1,0);}
/* the box round the leaf standing open (a quarter turn), in metres */
function owdOpenBox(g,dir){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const lx of[0,g.Ll])for(const lz of[-g.th/2,g.th/2]){const p=owdPt(g,dir,OWD.swing,lx,lz),x=p[0]*g.BS,z=p[1]*g.BS;x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}return[x0,x1,z0,z1];}
function owdSyncCol(b){const c=b.ic&&b.ic.col,d=b.dr;if(!c||c.dA==null)return;const open=!!d&&d.a>=1&&d.t===1;
  c.mk[c.dA]=open?0:OWI_GND;
  if(open){const q=owdOpenBox(owdG(b),d.dir);c.x0[c.dB]=q[0];c.x1[c.dB]=q[1];c.z0[c.dB]=q[2];c.z1[c.dB]=q[3];c.mk[c.dB]=OWI_GND;}
  else c.mk[c.dB]=0;}

/* ---- the pose, and what has to follow it ---- */
function owdApply(b){const d=b.dr;if(!d)return;const g=owdG(b),mv=d.a>.0005;
  if(mv&&!d.pv)owdEnsure(b);
  if(d.pv){const p=owdPose(g,d.dir,owdEase(d.a)*OWD.swing),wy=b.meshes.w?b.meshes.w.scale.y:1;d.pv.position.set(p.px,0,p.pz);d.pv.rotation.y=p.rot;d.pm.position.set(0,0,p.cz);d.pv.visible=mv&&wy>.9;d.pv.scale.y=wy;}
  if(mv!==d.mv){d.mv=mv;owBldRefresh(b);}
  if(d.a!==d.la){d.la=d.a;if(typeof owLampShadowDirty==='function')owLampShadowDirty(b.x,b.z,10);/* the lamps near the door draw their shadows again: an open door lets their light in, a shut one stops it */}
  owdSyncCol(b);}
function owdHeld(b){return !!(b.dr&&b.dr.mv);}

/* ---- is there room? ---- */
/* a point of the building's own colliders (not its door boxes), of a neighbour's, or of the world (trees, rocks, stalls) */
function owdBlockedAt(b,lx,lz,r){const c=b.ic&&b.ic.col;if(c){const n=c.n,X0=c.x0,X1=c.x1,Z0=c.z0,Z1=c.z1,M=c.mk;
    for(let i=0;i<n;i++){if(i===c.dA||i===c.dB||!(M[i]&1))continue;const dx=lx<X0[i]?X0[i]-lx:lx>X1[i]?lx-X1[i]:0,dz=lz<Z0[i]?Z0[i]-lz:lz>Z1[i]?lz-Z1[i]:0;if(dx*dx+dz*dz<r*r)return true;}}
  const w=owiL2W(b,lx,lz);
  for(const q of OWI.near){if(q===b||!q.ic||!q.ic.col)continue;const l=owiW2L(q,w[0],w[1]);if(owiKind(q.enter,l)&&owiHit(q.ic.col,l[0],l[1],1,r))return true;}
  if(!owiKind(b.enter,[lx,lz])){const a=owCell(w[0],w[1]);if(a.r>=0&&a.c>=0&&a.r<H&&a.c<W&&grid[a.r][a.c]===2)return true;}
  return false;}
/* the swept quarter disc of the leaf swinging in direction dir (+1 into the house, -1 out of it) is free of anything solid */
function owdSweepFree(b,dir){const g=owdG(b),r=.02;
  for(let k=1;k<=6;k++){const th=k/6*OWD.swing;
    for(const s of[.35,.65,1])for(const lz of[-g.th/2,0,g.th/2]){const p=owdPt(g,dir,th,s*g.Ll,lz);if(owdBlockedAt(b,p[0]*g.BS,p[1]*g.BS,r))return false;}}
  return true;}
/* is the hero (a circle) in the swept disc, or standing in the doorway? */
function owdHeroIn(b,dir,doorway){const H=heroU;if(!H)return false;const l=owiW2L(b,H.x,H.z),g=owdG(b),r=OWI.RAD+.03;
  if(doorway){const g0=g.um-g.wm/2,g1=g.um+g.wm/2,zb=g.zcm-.0275*g.BS,z1=zb+OW_T*g.BS;return l[0]>g0-r&&l[0]<g1+r&&l[1]>zb-r&&l[1]<z1+r;}
  const px=g.xpm,pz=(g.zc-dir*g.th/2)*g.BS,dx=g.ax*(l[0]-px),dz=-dir*(l[1]-pz);return dx>-r&&dz>-r&&Math.hypot(dx,dz)<g.Rm+r;}
const owdHeroOutside=b=>{const H=heroU,l=owiW2L(b,H.x,H.z),g=owdG(b);return l[1]>g.zcm;};

/* ---- opening and closing ---- */
/* returns '' when it worked, or a short reason */
function owdSet(b,open,opt){opt=opt||{};const d=owdGet(b,true);if(!d)return 'no door';const inst=!!opt.instant;
  if(open){
    if(opt.dir)d.dir=opt.dir;
    else if(!inst&&d.a===0&&d.t===0){/* a door at rest: choose the swing (one that is moving keeps the one it has) */
      if(heroU&&owdHeroOutside(b)){if(!owdSweepFree(b,1))return 'Something is in the way';d.dir=1;}
      else{if(owdSweepFree(b,-1))d.dir=-1;else if(owdSweepFree(b,1)&&!owdHeroIn(b,1))d.dir=1;else return 'Something is in the way';}}
    d.t=1;OWD.open.add(b);}
  else{if(!inst&&d.t===1&&heroU&&owdHeroIn(b,d.dir,true))return 'Something is in the way';if(!inst&&d.t===1&&typeof vilInDoor==='function'&&vilInDoor(b))return 'Someone is in the way';d.t=0;OWD.open.delete(b);}
  if(inst){d.a=d.t;OWD.busy.delete(b);}else if(d.a!==d.t)OWD.busy.add(b);
  owdApply(b);return '';}
/* the state of every door of the building to what the plan stored in the save (0 shut, 1 open inwards, 2 open outwards) */
const owdSaveOf=b=>b.dr&&b.dr.t===1?(b.dr.dir>0?1:2):0;
function owdLoad(b,v){if(!v||!owdLeaf(b))return;owdSet(b,true,{instant:true,dir:v===2?-1:1});}

/* ---- which door does the hero mean? ---- */
function owdReach(b){const H=heroU,d=b.dr||owdGet(b,true);if(!d||!b.ic||!b.ic.col||!owiLive(b))return null;const g=owdG(b),l=owiW2L(b,H.x,H.z),zm=g.zcm,P=b.ic.P;
  const fy=b.hi+P.st[0].y;if(Math.abs(H.g.position.y-fy)>1.7)return null;
  const dx=l[0]-g.um,dz=l[1]-zm;if(Math.abs(dx)>g.wm/2+.9||dz<-1.9||dz>2.2)return null;
  const dist=Math.hypot(dx,dz);if(dist>OWD.range)return null;
  /* nothing solid between the hero and the door: a wall of this house or of a neighbour is not looked through */
  const sx=l[0],sz=l[1];
  for(let k=1;k<=7;k++){const t=k/8;if(owdBlockedAt(b,sx+(g.um-sx)*t,sz+(zm-sz)*t,.02))return null;}
  /* the way the camera looks decides between two doors */
  const f=tpcCam()?{x:-Math.sin(TPC.yaw),z:-Math.cos(TPC.yaw)}:null,w0=owiL2W(b,g.um,zm);let face=0;if(f){const vx=w0[0]-H.x,vz=w0[1]-H.z,vl=Math.hypot(vx,vz)||1;face=Math.max(0,(vx*f.x+vz*f.z)/vl);}
  return{b,dist,score:dist-1.1*face};}
function owdTarget(){const H=heroU;let best=null;
  if(H&&OW.on&&!CAM.gal&&state==='playing'){for(const b of OWI.near){if(!owdLeaf(b))continue;const q=owdReach(b);if(q&&(!best||q.score<best.score))best=q;}
    /* keep the door that is already chosen unless another is clearly better (no flicker between two) */
    if(best&&OWD.tgt&&OWD.tgt!==best.b){const o=owdReach(OWD.tgt);if(o&&o.score<best.score+.45)best=o;}}
  OWD.tgt=best?best.b:null;return OWD.tgt;}

/* ---- the key, the prompt, the touch-screen automatic door ---- */
function owdUse(){const b=OWD.tgt;if(!b)return false;const d=owdGet(b,true);if(!d)return false;const why=d.t?owdSet(b,false):owdSet(b,true);if(why&&typeof toast==='function')toast(why);return true;}
function owdPrompt(){if(!OWD.el){const el=document.createElement('div');el.id='doorPrompt';el.style.cssText='position:fixed;left:50%;top:62%;transform:translateX(-50%);z-index:30;padding:5px 12px;border-radius:9px;background:#000b;border:1px solid #ffffff30;color:#fff;font:700 13px system-ui,sans-serif;letter-spacing:.03em;pointer-events:none;display:none;white-space:nowrap';document.body.appendChild(el);OWD.el=el;}
  const b=OWD.tgt,ok=b&&flyPC()&&camMode()!=='fc'&&!uiBlocksKeys(),txt=ok?(b.dr&&b.dr.t?'F \u2014 Close Door':'F \u2014 Open Door'):'';
  if(txt!==OWD.hint){OWD.hint=txt;OWD.el.textContent=txt;OWD.el.style.display=txt?'block':'none';}}
function owdTick(dt){
  for(const b of OWD.busy){const d=b.dr;if(!d){OWD.busy.delete(b);continue;}const s=dt/OWD.t;d.a=d.t?Math.min(1,d.a+s):Math.max(0,d.a-s);if(d.a===d.t)OWD.busy.delete(b);owdApply(b);}
  owdTarget();owdPrompt();
  if(!flyPC()&&OWD.tgt){const b=OWD.tgt,d=b.dr;if(d&&!d.t&&d.a===0&&!OWD.auto.has(b)){OWD.auto.add(b);owdSet(b,true);}}
  /* a door the touch screen opened shuts again when the hero has gone a few steps away from it */
  if(OWD.auto.size){const H=heroU;for(const b of OWD.auto){const d=b.dr;if(!d||!d.t){OWD.auto.delete(b);continue;}const l=owiW2L(b,H.x,H.z),g=owdG(b);if(Math.hypot(l[0]-g.um,l[1]-g.zcm)>3.4&&!owdHeroIn(b,d.dir,true)){OWD.auto.delete(b);owdSet(b,false);}}}
  /* a door nobody is near shuts by itself (and its building goes back to the village's batched mesh) */
  if(OWD.open.size&&OWI.t-OWD.tFar>2){OWD.tFar=OWI.t;const H=heroU,cx=camera.position.x,cz=camera.position.z;for(const b of OWD.open){if(Math.hypot(b.x-H.x,b.z-H.z)>80&&Math.hypot(b.x-cx,b.z-cz)>80)owdSet(b,false,{instant:true});}}}
window.addEventListener('keydown',e=>{if(e.code!=='KeyF'||e.repeat||e.ctrlKey||e.metaKey||altMod(e)||!flyPC()||CAM.gal||flyEditable(e.target)||uiBlocksKeys()||camMode()==='fc')return;if(OWD.tgt){e.preventDefault();owdUse();}});

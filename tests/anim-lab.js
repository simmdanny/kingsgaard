(function(){
/* The sword's animations, looked at: the hero frozen in a hold, a guard or a frame of a swing, seen by the free camera from any side. Needs a started world (int-lib.js / wl-lib.js).
   __al.cam(deg, dist, h, aimH)    the camera on a circle round the hero (deg 0: in front of it, 90: its sword side), at height h, aimed at height aimH
   __al.rest() / __al.idle(i) / __al.guard(i)   the hold at rest, idle i (1: shoulder, 2: looking along the edge), guard i (0-4); settled
   __al.swing(k, frac)            swing k (one of PCSW_K) played from its start to frac of it
   __al.shot()                    renders (the screenshot is taken by the caller)
   __al.state()                   what the rig is doing */
const A=window.__al={},H=()=>heroU,R=()=>heroU.mdl.userData.pcRig;let T=500,CAMA=[0,1.4,.75,.62];
const step=(n,dt)=>{dt=dt||1/30;for(let i=0;i<n;i++){T+=dt;heroUpdate(dt);anim(dt,T);}};
A.cam=function(deg,dist,h,aimH){CAMA=[deg,dist==null?1.4:dist,h==null?.75:h,aimH==null?.62:aimH];return A.shot();};
A.shot=function(){const h=H(),[deg,dist,hh,ah]=CAMA;h.mdl.updateMatrixWorld(true);const e=h.mdl.matrixWorld.elements,fl=Math.hypot(e[8],e[10])||1,rl=Math.hypot(e[0],e[2])||1,r=deg*Math.PI/180;
  /* (the model's own forward (+z) and sword side (+x)) */const dx=(e[8]/fl)*Math.cos(r)+(e[0]/rl)*Math.sin(r),dz=(e[10]/fl)*Math.cos(r)+(e[2]/rl)*Math.sin(r),x=h.x+dx*dist,z=h.z+dz*dist,y=h.g.position.y+hh,ty=h.g.position.y+ah;
  flyEnter();FLY.pos.set(x,y,z);FLY.yaw=Math.atan2(h.x-x,h.z-z);FLY.pitch=Math.atan2(ty-y,Math.hypot(h.x-x,h.z-z));
  for(let i=0;i<2;i++){flyApply();owFrame();owView(true);camera.position.set(x,y,z);camera.up.set(0,1,0);camera.lookAt(h.x,ty,h.z);camera.updateMatrixWorld();renderer.render(scene,camera);}return A.state();};
const base=()=>{window.__fz=false;const h=H();h.pcHeld=true;h.anim=null;h.pend=null;TPC.keys.clear();h.dest=null;hotSelect&&hotSelect(0);};
A.rest=function(){base();const st=R().st;st.drawn=false;step(60);const S=st.sp;S.ii=0;S.iT=1e9;S.iw=[1,0,0];step(30);return A.shot();};
A.idle=function(i){base();const st=R().st;st.drawn=false;step(40);const S=st.sp;S.ii=i;S.iT=1e9;step(60);return A.shot();};
A.guard=function(i){base();const st=R().st;st.drawn=true;st.lastFight=st.t+1e6;step(5);const S=st.sp;S.gi=i;S.gT=1e9;step(45);return A.shot();};
A.swing=function(k,frac){base();const h=H(),st=R().st;st.drawn=true;st.lastFight=st.t+1e6;step(30);const S=st.sp;S.gT=1e9;const d=PCSW[k].dur;h.anim={k,t:0,d};h.face=h.g.rotation.y;
  const n=Math.max(1,Math.round(frac*d*60));for(let i=0;i<n;i++){T+=1/60;anim(1/60,T);if(h.anim)h.anim.t=Math.min(d*frac,h.anim.t);}
  /* (held there: the page's own frames - a screenshot runs one - keep the swing where it is) */h.pend=null;window.__fz=true;return A.shot();};
A.state=function(){const st=R().st,S=st.sp||{};return{drawn:st.drawn,held:H().pcHeld,c:+(S.c||0).toFixed(2),sw:+(S.sw||0).toFixed(2),gi:S.gi,ii:S.ii,iw:(S.iw||[]).map(v=>+v.toFixed(2)),anim:H().anim&&H().anim.k,swordVis:R().kit.sword.visible,hipVis:R().kit.swordHip.visible};};
})();

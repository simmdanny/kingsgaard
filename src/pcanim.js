/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (5): how it moves.

   pcCtl(g) makes the animation controller of a figure (pcm.js): each frame it reads how the figure actually moves through the world (the speed, the turning, the acceleration of its parent: the walking hero's group or
   the preview's pivot) and what it is doing (the attack or spell it plays, a knock-out, the weapon it holds), and poses the skeleton:
     - the gait: a phase that advances with the distance walked; each foot is planted for part of the cycle (the stance: it moves back under the body exactly as fast as the body moves on, so it stays where it was put)
       and swung forward for the rest, landing on the heel and leaving from the toes; three gaits by speed - walk, run, sprint (PCG), each its own way of moving, blended while the speed changes - and the foot on the ground is held where it was put in the world; two-bone IK puts each leg on its foot
       with the knee forward;
     - the body over it: the pelvis rises and falls, sways over the foot that carries it, turns with the leg that swings and drops on the free side; the chest turns against the pelvis, the arms swing against the legs,
       the head keeps looking ahead and leads into turns; the body leans with speed and acceleration and banks into curves; it settles when it stops;
     - idle: breathing, a slow shift of the weight from foot to foot, the head looking about; turning on the spot takes little steps;
     - stances: empty hands, the bow, the sword (blended), the weapon drawn and put away (the bow onto the back, the sword into its scabbard); the attacks and spells of the game (POSES) are laid over the upper body
       while the legs go on walking. The sword in the hand (t.pcHeld: its hotbar slot is selected) is posed by pcsword.js: a relaxed hold at rest, guards in a fight, the swings.
   The spring bones (hair, cloth) run after the pose (pcPhys). A figure out of sight is not animated.
   ===================================================================================================================== */
const PCA_V=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],PCA_Q=[new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion()];
const PCA_M=new THREE.Matrix4(),PCA_E=new THREE.Euler(),PCA_X=new THREE.Vector3(1,0,0);
/* the stances of the arms: [upper arm x, z, forearm x] for the left and the right arm, and the pose an attack starts from */
const PCA_ST={none:{L:[.05,-.13,-.2],R:[.05,.13,-.2]},bow:{L:[-.22,-.16,-.42],R:[.04,.14,-.24]},sword:{L:[-.08,-.2,-.5],R:[-.42,.16,-.86]}};
/* the sword's own cuts (offsets from PCA_ATK.sword, as POSES): an overhead chop, a horizontal slash, a rising cut; the body turns and leans into each */
const PCA_SW={
  chop:k=>{const u=SMS(k,0,.42)*(1-SMS(k,.42,.56)),d=SMS(k,.42,.56)*(1-SMS(k,.72,1));return{rx:-2.1*u+.15*d,rz:.1*u-.05*d,ex:-1.0*u+.55*d,lx:-.7*u+.3*d,lz:.1*u,lex:-.4*u,bx:-.08*u+.22*d,y:-.012*d,ry:.12*u-.1*d,wx:-.6*u+.5*d};},
  slash:k=>{const u=SMS(k,0,.4)*(1-SMS(k,.4,.56)),d=SMS(k,.4,.56)*(1-SMS(k,.74,1));return{rx:-.75*u-.75*d,rz:1.05*u-.55*d,ex:-.55*u+.45*d,ry:.55*u-.6*d,lx:-.35*u-.2*d,lz:.3*u,bx:.05*d,y:-.006*d,wx:.3*u-.2*d};},
  upper:k=>{const u=SMS(k,0,.42)*(1-SMS(k,.42,.58)),d=SMS(k,.42,.58)*(1-SMS(k,.74,1));return{rx:.6*u-2.0*d,rz:.35*u-.15*d,ex:-.5*u+.4*d,bx:.14*u-.1*d,y:-.016*u+.008*d,ry:.25*u-.2*d,lx:-.3*u-.4*d,wx:.5*u-.6*d};}};
const PCA_ATK={bow:{L:[-1.05,-.2,-.25],R:[-.35,.1,-.9]},sword:{L:[-.3,-.25,-.6],R:[-.55,.12,-.7]},none:{L:[-.5,-.2,-.4],R:[-.5,.2,-.4]}};
/* a rotation from a basis: the bone's -y along dir, its +z towards fwd (made perpendicular) */
function pcaBasis(dir,fwd,q){const Yb=PCA_V[5].copy(dir).negate(),Zb=PCA_V[6].copy(fwd).addScaledVector(Yb,-fwd.dot(Yb));if(Zb.lengthSq()<1e-10)Zb.set(0,0,1);Zb.normalize();const Xb=PCA_V[7].crossVectors(Yb,Zb).normalize();
  PCA_M.makeBasis(Xb,Yb,Zb);return q.setFromRotationMatrix(PCA_M);}
/* the three gaits. Lengths are in leg lengths (thigh + shin), so both figures move alike; u is the speed in leg lengths a second.
     f0 + f1*u: strides a second (a stride: both steps) - the stride is what the speed leaves, so the feet always cover the ground the body covers;
     duty: the share of a stride a foot is on the ground (a walk always has one foot down, a run and a sprint fly between steps);
     ahead: where a foot lands, as a share of the ground it covers while it is down (a walk reaches out, a sprint lands under the body and pushes far back);
     the walk's arms (v36): arm .26 (was .4), armF .06 (a little behind the body), elF -.1 (the elbow bends less as the arm comes forward), armX .015 - the hands stay by the body: at most 0.17-0.22 leg lengths ahead of
       the shoulder (were 0.35-0.42), 0.26-0.29 behind;
     tof: how late in its stance (a share of it) a leg stretched to its length may leave the ground early: the walk keeps its foot down to the end (.88) - with .55 the leg was straight under the hip
       at mid-stance and lifted there, so the feet never got behind the body and the walk was all in front of it (landing 0.38 leg lengths ahead, leaving 0.00); now they land 0.30 ahead
       and leave 0.41 behind as the heel rolls up (roll .5, pOff -.65), the pelvis riding over the foot;
     lift / kick / drive / driveY: the swing - the foot's clearance, the heel kicked up behind, the knee driven up and forward in front;  k0 / k1: how much of the body's speed the foot still moves back
       (against the hip) as it leaves the ground and as it lands (the foot comes through at once after its push; it is pulled back as it lands, so it meets the ground nearly at the ground's speed);
     pL / pFl / pOff / roll: the foot on the ground (toes up +) when it lands, when it carries, when it leaves; roll: when the heel comes up;  pK / pM: the foot in the air (kicked back, cocked in front);
     bob / drop: the pelvis (up over the foot +, lowered); sway / yaw / tilt: the pelvis from side to side, turning with the legs, dropping on the free side; lean: the body forward; chest: the chest against the pelvis;
     arm / armF / el / elF / elB / armOut / armX: the arms (swing, forward bias, elbow, more elbow in front, the elbow opening behind, out from the body, across the body in front);
     flex: the spine giving under each landing;  surge: the body slowing a little as it rises over the leg and gaining as it falls onto the next (a walk);  lead: the pelvis carried forward over the feet (the body leads and the legs follow it, they do not walk out in front of it);
     w: the feet nearer the line they run on (-) or apart (+) */
const PCG={
  walk:  {f0:.8, f1:.18, duty:.6, ahead:.42,lift:.05,kick:.02, drive:0,  driveY:0,  k0:.32,k1:.32,pL:.3,  pFl:0,   pOff:-.65,roll:.5, pK:-.35,pM:.12,bob:.016,drop:-.006,sway:.03, yaw:.1, tilt:.065,lean:.055,chest:1.7, arm:.26,armF:.06, el:-.22, elF:-.1, armOut:0,  w:.002,elB:.08,armX:.015,flex:0,lead:.025,surge:.012,tof:.88},
  run:   {f0:1.32,f1:.035,duty:.28,ahead:.29,lift:.06,kick:.42,drive:.06,driveY:.14,k0:.12,k1:.45,pL:.06, pFl:0,   pOff:-.7, roll:.42,pK:-.75,pM:.2, bob:-.03,drop:.06, sway:.01, yaw:.15,tilt:.03, lean:.2,  chest:1.3, arm:.6, armF:-.1, el:-1.4, elF:-.25,armOut:.1, w:-.002,elB:.32,armX:.12,flex:.035,lead:.09,surge:0,tof:.55},
  sprint:{f0:1.95,f1:.03, duty:.21,ahead:.27,lift:.07,kick:.62,drive:.12,driveY:.24,k0:.08,k1:.55,pL:-.24,pFl:-.14,pOff:-.85,roll:.3, pK:-.8, pM:.3, bob:-.04,drop:.06, sway:.006,yaw:.2, tilt:.025,lean:.34,chest:1.3, arm:1.2,armF:-.25,el:-1.45,elF:-.4,armOut:.08,w:-.0045,elB:.38,armX:.1,flex:.045,lead:.12,surge:0,tof:.55}};
const PCG_K=Object.keys(PCG.walk);
/* variety: no two strides alike. A figure has its own way of moving (base: set once), a 'mood' over it that changes every 5-12 s (how much the arms swing, how bent the elbows, how high
   the feet, the lean, how much the hips and the chest turn, the bob, the cadence, the arms out from the body), a little change with every stride (and a slight difference between the arms),
   and while walking the head now and then glances aside (less and more rarely in a run; never in a sprint, a fight or standing still). Everything is eased, so nothing jumps; the feet still keep
   to the ground (the cadence changes the stride, and the stride is what the speed leaves). */
const PCV_KEYS=['arm','el','lift','lean','pel','bob','chest','cad','out','asym','af','hunch','roll','ht','gy','gp'];
function pcVarInit(){const r=Math.random,base={arm:.9+.2*r(),el:(r()-.5)*.16,lift:.92+.16*r(),lean:(r()-.5)*.03,pel:.85+.3*r(),bob:.9+.2*r(),chest:.88+.24*r(),cad:.97+.06*r(),out:(r()-.4)*.04,
    asym:(r()-.5)*.08,af:(r()-.5)*.1,hunch:(r()-.5)*.05,roll:(r()-.5)*.02,ht:(r()-.5)*.04,gy:0,gp:0};
  return{base,c:Object.assign({},base),mood:Object.assign({},base),tgt:Object.assign({},base),moodT:2+3*r(),phPrev:0,glT:2+3*r(),glOn:0,glY:0,glP:0};}
function pcVarStep(V,ph,wm,dt,GW,gs,busy){const r=Math.random,B=V.base,M=V.mood,T=V.tgt,wW=GW.walk/gs,moving=wm>.3,pm=(a,b)=>a+(b-a)*r();
  /* the mood: every 4-10 s - the arms (their swing, how bent, how high they are carried, how far out), the feet, the lean and the stoop, the hips and the chest, the bob, the cadence, a lean
     to one side, a tilt of the head */
  if((V.moodT-=dt)<=0){V.moodT=pm(4,10);M.arm=B.arm*pm(.75,1.3);M.el=B.el+pm(-.2,.16);M.lift=B.lift*pm(.8,1.22);M.lean=B.lean+pm(-.035,.05);M.pel=B.pel*pm(.7,1.35);M.bob=B.bob*pm(.8,1.25);
    M.chest=B.chest*pm(.8,1.3);M.cad=B.cad*pm(.95,1.05);M.out=B.out+pm(-.03,.06);M.asym=B.asym+pm(-.08,.08);M.af=B.af+pm(-.16,.12);M.hunch=B.hunch+pm(-.05,.07);M.roll=B.roll+pm(-.035,.035);M.ht=B.ht+pm(-.06,.06);}
  /* each stride: a little different */
  if(ph<V.phPrev-.5){T.arm=M.arm*pm(.9,1.1);T.el=M.el+pm(-.05,.05);T.lift=M.lift*pm(.92,1.08);T.lean=M.lean+pm(-.012,.012);T.pel=M.pel*pm(.9,1.1);T.bob=M.bob*pm(.92,1.08);T.chest=M.chest*pm(.92,1.08);
    T.cad=M.cad*pm(.985,1.015);T.out=M.out;T.asym=M.asym+pm(-.1,.1);T.af=M.af+pm(-.04,.04);T.hunch=M.hunch;T.roll=M.roll+pm(-.01,.01);T.ht=M.ht;}
  V.phPrev=ph;
  /* glances: now and then while walking (looking aside, sometimes down at the way), rarely and less in a run; never in a sprint, a fight or standing still */
  if(V.glOn>0){V.glOn-=dt;if(V.glOn<=0){V.glY=0;V.glP=0;V.glT=(wW>.5?pm(3,8):pm(9,16));}}
  else if(moving&&!busy&&(V.glT-=dt)<=0){if(GW.sprint/gs<.3){const k=wW>.5?1:.45;V.glY=(r()<.5?-1:1)*pm(.25,.65)*k;V.glP=(r()<.35?pm(.07,.15):pm(-.04,.03))*k;V.glOn=pm(.7,1.8);}else V.glT=3;}
  if(!moving||busy){V.glY=0;V.glP=0;V.glOn=0;}
  T.gy=V.glY;T.gp=V.glP;
  const k=1-Math.exp(-3*dt),kg=1-Math.exp(-5*dt);for(const n of PCV_KEYS)V.c[n]+=(T[n]-V.c[n])*(n==='gy'||n==='gp'?kg:k);return V.c;}
function pcCtl(g){const R=g.userData.pcRig,B=R.B,L=R.L,Y=PCL.y,L1=L.th,L2=L.sn,hx=L.hipX;
  const st={init:false,last:new THREE.Vector3(),lyaw:0,spd:0,vf:0,vs:0,yr:0,acc:0,ph:0,wm:0,lean:0,leanV:0,bank:0,turnT:0,stepT:[-1,-1],stepFrom:[null,null],idleYaw:0,
    fl:[null,null],fy:[0,0],stp:[null,null],lastStep:-9,sw:{none:1,bow:0,sword:0},drawn:false,lastFight:-99,ps:{},atkW:0,t:0,vis:true,feet:[new THREE.Vector3(-hx-.003,0,.004),new THREE.Vector3(hx+.003,0,.004)],sitW:0,gw:{walk:1,run:0,sprint:0},P:{},pvs:0,pvf:0,drop:0,ft:null};
  R.st=st;
  const rest={root:B.root.position.clone()};
  const qRoot=new THREE.Quaternion(),qTh=new THREE.Quaternion(),qSh=new THREE.Quaternion(),qFt=new THREE.Quaternion(),qInv=new THREE.Quaternion();
  const hipL=new THREE.Vector3(),ank=new THREE.Vector3(),pole=new THREE.Vector3(),dir=new THREE.Vector3(),pp=new THREE.Vector3(),knee=new THREE.Vector3();
  const setE=(b,x,y,z)=>b.rotation.set(x,y,z);
  /* the leg i (0 left, 1 right) to the ankle target a (figure units, the frame of the model), the foot pitched p (toes up +), toes bent tb */
  const leg=(i,a,p,tb)=>{const s=i?'R':'L',th=B['thigh'+s],sh=B['shin'+s],ft=B['foot'+s],to=B['toe'+s];
    hipL.copy(th.position).applyQuaternion(qRoot).add(B.root.position);dir.copy(a).sub(hipL);let d=dir.length();const dl=Math.min(Math.max(d,.02),L1+L2-.0004);dir.divideScalar(d||1);
    pole.set(i?.12:-.12,0,1).normalize();pp.copy(pole).addScaledVector(dir,-pole.dot(dir));if(pp.lengthSq()<1e-8)pp.set(0,0,1);pp.normalize();
    const ca=Math.min(1,Math.max(-1,(L1*L1+dl*dl-L2*L2)/(2*L1*dl))),sa=Math.sqrt(1-ca*ca);
    const tdir=PCA_V[0].copy(dir).multiplyScalar(ca).addScaledVector(pp,sa);knee.copy(hipL).addScaledVector(tdir,L1);
    const sdir=PCA_V[1].copy(hipL).addScaledVector(dir,dl).sub(knee).normalize();
    pcaBasis(tdir,pp,qTh);pcaBasis(sdir,pp,qSh);
    qInv.copy(qRoot).invert();th.quaternion.copy(qInv).multiply(qTh);
    qInv.copy(qTh).invert();sh.quaternion.copy(qInv).multiply(qSh);
    PCA_E.set(-p,st.toe[i]+(st.fyx[i]||0),0,'YXZ');qFt.setFromEuler(PCA_E);qInv.copy(qSh).invert();ft.quaternion.copy(qInv).multiply(qFt);
    to.rotation.set(tb,0,0);};
  /* the ankle over a foot that touches the ground at its heel (p > 0) or its toes (p < 0) */
  const FL=L.foot[0],heelZ=-.0145*(FL/.06),ballZ=FL*.5,AH=Y.ankle;
  /* (the heel and the ball lie along the foot, which may be turned from the body by fy: a planted foot keeps its own direction while the body turns) */
  const ankleAt=(x,z,p,lift,o,fy)=>{const c=Math.cos(fy||0),s=Math.sin(fy||0);if(p===0)return o.set(x,AH+lift,z);const k=p>0?heelZ:ballZ;o.set(0,AH,-k).applyAxisAngle(PCA_X,-p);const d=o.z+k;o.x=x+s*d;o.y+=lift;o.z=z+c*d;return o;};
  st.toe=[-.08,.08];st.fyx=[0,0];const mInv=new THREE.Matrix4();
  const smooth=(cur,tgt,rate,dt)=>cur+(tgt-cur)*(1-Math.exp(-rate*dt));
  /* the controller: t is the unit (the walking hero, or {} in the preview) */
  return function(t,dt,rt){t=t||{};dt=Math.min(.1,Math.max(0,dt||0));st.t+=dt;
    const par=g.parent;if(!par)return;par.updateMatrixWorld(true);
    /* out of sight: nothing to do (the camera of the game decides) */
    if(typeof camera!=='undefined'&&t.isHero&&window.__pcCull!==false){const pw=PCA_V[2].setFromMatrixPosition(par.matrixWorld);const fr=R.frus||(R.frus=new THREE.Frustum()),mm=R.frm||(R.frm=new THREE.Matrix4());
      mm.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);fr.setFromProjectionMatrix(mm);const vis=fr.intersectsSphere(R.sph||(R.sph=new THREE.Sphere(pw,1.6)));R.sph.center.copy(pw);if(!vis){st.vis=false;st.init=false;return;}st.vis=true;}
    /* how the figure moves: in figure units (the model's scale) */
    const ws=PCA_V[3];g.matrixWorld.decompose(PCA_V[4],PCA_Q[0],ws);const sc=ws.x||1,me=par.matrixWorld.elements,yaw=Math.atan2(me[8],me[10]),pos=PCA_V[2].setFromMatrixPosition(par.matrixWorld);
    if(!st.init||pos.distanceTo(st.last)>sc*1.5){st.last.copy(pos);st.lyaw=yaw;st.init=true;if(st.ft)st.ft[0].ok=st.ft[1].ok=false;}
    const vx=(pos.x-st.last.x)/sc/Math.max(dt,1e-4),vz=(pos.z-st.last.z)/sc/Math.max(dt,1e-4),fw=[Math.sin(yaw),Math.cos(yaw)];st.last.copy(pos);
    const yr=dt>0?pcWrap(yaw-st.lyaw)/dt:0;st.lyaw=yaw;
    const sp=dt>0?Math.hypot(vx,vz):0,prev=st.spd;st.spd=smooth(st.spd,Math.min(4,sp),9,dt);st.vf=smooth(st.vf,vx*fw[0]+vz*fw[1],9,dt);st.vs=smooth(st.vs,vx*fw[1]-vz*fw[0],9,dt);st.pvs=smooth(st.pvs,vx*fw[1]-vz*fw[0],20,dt);st.pvf=smooth(st.pvf,vx*fw[0]+vz*fw[1],20,dt);
    st.yr=smooth(st.yr,Math.max(-8,Math.min(8,yr)),6,dt);st.acc=smooth(st.acc,dt>0?(st.spd-prev)/dt:0,5,dt);
    const v=st.spd,moving=v>.05;st.wm=smooth(st.wm,moving?1:0,moving?7:5,dt);const wm=st.wm;
    /* the gait: walk, run or sprint by speed (each its own way of moving, PCG; blended while the speed changes from one to the next) */
    const Lg=L1+L2,u=v/Lg,gT=pcSm(3,4.2,u),gS=pcSm(8.2,9.8,u),GW=st.gw;GW.walk=smooth(GW.walk,1-gT,6,dt);GW.run=smooth(GW.run,gT*(1-gS),6,dt);GW.sprint=smooth(GW.sprint,gT*gS,6,dt);
    const gsum=GW.walk+GW.run+GW.sprint||1,P=st.P;for(const k of PCG_K)P[k]=(PCG.walk[k]*GW.walk+PCG.run[k]*GW.run+PCG.sprint[k]*GW.sprint)/gsum;
    /* (the strides a second of each gait; a walk getting going from standing takes slower, shorter steps than its pace - a power curve below it, so the first steps take a moment) */
    const fg=g=>PCG[g].f0+PCG[g].f1*u,fW=Math.max(.42,Math.min(fg('walk'),1.16*Math.pow(Math.max(0,u)/2,.4)));
    /* in a long skirt (or a skirt, a long coat) a run and a sprint take shorter, quicker strides with less knee drive - as anyone does who runs in one */
    const hem=(R.hem||0)/2*(GW.run+GW.sprint)/gsum;if(hem>0){P.driveY*=1-.8*hem;P.drive*=1-.8*hem;P.kick*=1-.4*hem;}
    /* (variety: the figure's own way, its mood and this stride - pcVarStep) */
    const VC=pcVarStep(st.vr||(st.vr=pcVarInit()),st.ph,st.wm,dt,GW,gsum,!!t.anim||st.drawn||!!t.preview);
    {const wW=GW.walk/gsum;P.arm*=1+(VC.arm-1)*(1-.5*wW);P.armF+=(VC.af<0?VC.af*(1-.75*wW):VC.af)*Math.min(1,u/1.5);}/* (the walk's arms: their variety half as wide, and hardly ever carried forward - they swing by the body) */P.el+=VC.el;P.lift*=VC.lift;P.kick*=VC.lift;P.driveY*=VC.lift;P.lean+=VC.lean;P.yaw*=VC.pel;P.tilt*=VC.pel;P.sway*=VC.pel;P.bob*=VC.bob;P.chest*=VC.chest;P.armOut+=VC.out;
    const f=(GW.walk*fW+(GW.run*fg('run')+GW.sprint*fg('sprint'))*(1+.25*hem))/gsum*VC.cad,S=v/f,duty=P.duty,run=(GW.run+GW.sprint)/gsum;
    if(moving||wm>.02)st.ph=(st.ph+f*dt*Math.max(.25,wm))%1;
    const ph=st.ph,TAU=2*Math.PI;
    /* what it is doing: the attack or spell, the weapon */
    const A=t.anim||null,wk=R.weapon?R.weapon():'bow';let pose=null,kf=0;if(A&&POSES){kf=Math.min(1,A.t/Math.max(.01,A.d));pose=PCSW[A.k]?null:(wk==='sword'&&PCA_SW[A.k]?PCA_SW[A.k]:POSES[A.k]||POSES.swing)(kf);}/* (a swing of the sword's own: pcsword.js) */
    if(A){st.drawn=true;st.lastFight=st.t;}if(t.pcDraw!=null){st.drawn=!!t.pcDraw;t.pcDraw=null;st.lastFight=st.t;}
    if(st.drawn&&!A&&st.t-st.lastFight>5)st.drawn=false;/* (5 s after the last of a fight the weapon goes back down) */
    const want=st.drawn?wk:'none';for(const k in st.sw)st.sw[k]=smooth(st.sw[k],k===want?1:0,9,dt);
    st.atkW=smooth(st.atkW,A&&!PCSW[A.k]?1:0,A?14:7,dt);
    /* the old smoothing of the attack poses (ANIM_AMP), as the other heroes */
    const PS=st.ps,fa=dt>0?1-Math.exp(-dt*9):1;for(const q of ANIM_KEYS){const tv=(pose&&pose[q]||0)*(wk==='sword'&&A&&PCA_SW[A.k]?1:ANIM_AMP);PS[q]=(PS[q]||0)+(tv-(PS[q]||0))*fa;}
    /* the knock-out: sitting down */
    const sit=t.sitA||0;
    /* ---- the pelvis ---- */
    const c1=Math.cos(TAU*(ph-duty/2)),c2=Math.cos(2*TAU*(ph-duty/2)),uk=Math.min(1,u/1.5);
    /* up and down: a walk vaults over its leg (highest over the foot), a run and a sprint sink into it (lowest over the foot, highest in flight); where a leg cannot reach its foot the pelvis comes down more (below) */
    const bob=wm*Lg*(P.bob*c2-P.drop);
    const sway=-wm*P.sway*Lg*c1,yawP=wm*P.yaw*Math.cos(TAU*ph)*uk,rollP=-wm*P.tilt*c1*uk;
    /* lean: with the gait and acceleration (a spring, so it settles), banking into turns */
    const leanT=P.lean*wm*Math.min(1,u/2)+.05*Math.max(-3,Math.min(3,st.acc));/* (into the speed as it picks up, back against it as it stops) *//* (forward: +x) */
    st.leanV+=((leanT-st.lean)*60-st.leanV*11)*dt;st.lean+=st.leanV*dt;
    st.bank=smooth(st.bank,Math.max(-.22,Math.min(.22,-st.yr*v*.06)),6,dt);
    /* idle: breathing, the weight from foot to foot, the head looking about */
    const iw=1-wm,br=Math.sin(TAU*.24*st.t),wsft=Math.sin(TAU*.065*st.t+.7),look=Math.sin(TAU*.05*st.t)*.7+Math.sin(TAU*.11*st.t+1.3)*.3;
    /* (pz: the pelvis carried forward over the feet, with the gait - the body goes first and the legs follow under it) */
    const px=sway+iw*.0032*wsft,py=bob-iw*.0006*(1+wsft*wsft)+PS.y+(st.sp?st.sp.y:0),pz=wm*Lg*(P.lead*Math.min(1,u/1.2)-P.surge*Math.sin(2*TAU*(ph-duty/2)));
    B.root.position.set(rest.root.x+px,rest.root.y+py-sit*.112,rest.root.z+pz+sit*.012);
    PCA_E.set(st.lean*.55+sit*.18,yawP+PS.ry*.3,rollP+st.bank*.6+iw*.018*wsft,'YXZ');qRoot.setFromEuler(PCA_E);B.root.quaternion.copy(qRoot);
    /* ---- the legs ----
       A foot on the ground is held where it was put, in the world: it cannot slide, whatever the body does (speeding up, slowing down, turning, a wall). A foot in the air goes, against the hip, from where it left
       the ground to where it lands - ahead of the hip by the gait's share of its stance, along the way the body is going (a curve that leaves and lands moving back as a real foot does, k0/k1). The stance
       is the speed's share of the stride, so every step covers exactly the ground the body covers, at every speed. */
    g.updateMatrixWorld(true);mInv.copy(g.matrixWorld).invert();
    const fwid=hx+P.w,SL=S*duty,ah=P.ahead,sv=Math.hypot(st.pvs,st.pvf),dvx=sv>1e-4?st.pvs/sv:0,dvz=sv>1e-4?st.pvf/sv:1;
    const FT=st.ft||(st.ft=[0,1].map(()=>({ok:false,s:0,A:new THREE.Vector3(),ay:0,uL:0,L0:new THREE.Vector3(),fy0:0,pu:0,P:new THREE.Vector3(),fyx:0})));
    const ANK=st.ank||(st.ank=[new THREE.Vector3(),new THREE.Vector3()]),MP=st.mp||(st.mp=[0,0]),TB=st.tb||(st.tb=[0,0]),CW=st.cw||(st.cw=[0,0]);
    /* the foot's pitch in the air (left the ground on its toes, kicked back, cocked in front, set for landing) and on it (landing, carrying, rolling onto the toes) */
    const swP=w=>w<.3?P.pOff+(P.pK-P.pOff)*pcSm(0,.3,w):w<.65?P.pK+(P.pM-P.pK)*pcSm(.3,.65,w):P.pM+(P.pL-P.pM)*pcSm(.65,1,w);
    const stP=s=>P.pL+(P.pFl-P.pL)*pcSm(0,.18,s)+(P.pOff-P.pFl)*pcSm(P.roll,1,s);
    /* the swing's height (clearance + the heel kicked up behind + the knee driven up in front) and its reach forward in front */
    const swY=w=>Lg*(P.lift*Math.pow(Math.sin(Math.PI*w),.9)+P.kick*Math.pow(Math.sin(Math.PI*Math.min(1,w/.62)),1.6)+P.driveY*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,(w-.3)/.7))),1.2));
    const swD=w=>Lg*P.drive*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,(w-.4)/.6))),1.5);
    /* (the curve: Hermite from a to b over the swing, leaving and landing with the tangents m0, m1 along the way) */
    const herm=(w,a,b,m0,m1)=>{const w2=w*w,w3=w2*w;return a*(2*w3-3*w2+1)+b*(3*w2-2*w3)+m0*(w3-2*w2+w)+m1*(w3-w2);};
    for(let i=0;i<2;i++){const sd=i?1:-1,u0=(ph+(i?.5:0))%1,F=FT[i];let mx,mz,my=0,p=0,tb=0,fyx=0,cw=1;
      if(t.preview){/* the creator's preview stands on a turning pivot, not on the ground: the feet as the phase says */
        if(u0<duty){const s=u0/duty;mz=SL*(ah-s);p=stP(s);}else{const w=(u0-duty)/(1-duty),vT=v*(1-duty)/f;mz=herm(w,SL*(ah-1),SL*ah,-P.k0*vT,-P.k1*vT)+swD(w);my=swY(w);p=swP(w);}
        mx=sd*fwid;tb=p<0?-p*.9:0;}
      else{
        if(!F.ok){F.ok=true;F.s=0;F.A.set(sd*(hx+.003),0,.004).applyMatrix4(g.matrixWorld);F.ay=yaw;F.pu=u0;F.fyx=0;}
        /* it leaves the ground when its share of the stride on the ground is over, and lands when its stride begins again */
        /* (it leaves from where it stands now, and lands where it was drawn last: in the world, so a frame of the body's travel never moves it) */
        if(F.s===0&&u0>=duty&&u0>=F.pu-.5){const q=PCA_V[3].copy(F.A).applyMatrix4(mInv);F.s=1;F.uL=u0;F.L0.set(q.x,0,q.z);F.fy0=F.fyx;}
        else if(F.s===1&&u0<F.pu-.5){F.s=0;F.A.set(F.P.x,0,F.P.z).applyMatrix4(st.mPrev||g.matrixWorld);F.ay=(st.yPrev==null?yaw:st.yPrev)+F.fyx;}
        F.pu=u0;
        if(F.s===0){const q=PCA_V[3].copy(F.A).applyMatrix4(mInv);mx=q.x;mz=q.z;fyx=Math.max(-.9,Math.min(.9,pcWrap(F.ay-yaw)));p=stP(Math.min(1,u0/duty));tb=p<0?-p*.9:0;
          /* (the body has gone where the leg cannot follow - a jump of the hero, a sharp turn: the foot goes) */
          if(Math.hypot(mx-sd*fwid,mz)>Lg*1.05){F.s=1;F.uL=Math.min(u0,.97);F.L0.set(mx,0,mz);F.fy0=fyx;}
          /* (late in the stance a leg stretched to its length leaves the ground - a push-off ends where the leg is straight - rather than pulling the pelvis down after it) */
          else if(u0>duty*P.tof&&wm>.5){ankleAt(mx,mz,p,0,PCA_V[6],st.toe[i]+fyx);hipL.copy(B['thigh'+(i?'R':'L')].position).applyQuaternion(qRoot).add(B.root.position);/* (from the pelvis as the gait sets it, not as a stretched leg has pulled it down) */
            if(PCA_V[6].distanceTo(hipL)>Lg*.9965){F.s=1;F.uL=Math.min(u0,.97);F.L0.set(mx,0,mz);F.fy0=fyx;}}}
        if(F.s===1){const uL=F.uL,w=Math.min(1,Math.max(0,(u0-uL)/Math.max(1e-3,1-uL))),vT=v*(1-uL)/f,m0=-P.k0*vT,m1=-P.k1*vT,d=swD(w),e=w*w*(3-2*w);
          mx=herm(w,F.L0.x,sd*fwid+dvx*ah*SL,m0*dvx,m1*dvx)+dvx*d;mz=herm(w,F.L0.z,dvz*ah*SL,m0*dvz,m1*dvz)+dvz*d;my=swY(w);p=swP(w);tb=Math.max(0,-p)*.5;fyx=F.fy0*(1-e);cw=w<.62?0:1-pcSm(0,.08*Lg,my);}}/* (a foot in the air counts for the pelvis only as it comes down to land - smoothly, by its height; a foot leaving the ground never pulls it) */
      /* idle: the feet stay where they were put (locked to the ground); when the body has turned away from them or they are not where they should stand, a little step puts them back, one foot at a time */
      const ix=sd*(hx+.003),iz=.004;let mp=p;
      if(t.preview){mx=ix*(1-wm)+mx*wm;mz=iz*(1-wm)+mz*wm;my*=wm;mp*=wm;}
      else if(wm<.35&&sit<.05){const lk=1-pcSm(.12,.35,wm);let lf=fyx;
        if(!st.fl[i]){st.fl[i]=PCA_V[4].set(mx,0,mz).applyMatrix4(g.matrixWorld).clone();st.fy[i]=yaw+fyx;}
        const loc=PCA_V[3].copy(st.fl[i]).applyMatrix4(mInv);let lx=loc.x,lz=loc.z,ly=0;const S2=st.stp[i];
        if(S2){const s=Math.min(1,(st.t-S2.t0)/.26),e=s*s*(3-2*s);lx=S2.x+(ix-S2.x)*e;lz=S2.z+(iz-S2.z)*e;ly=.017*Math.sin(Math.PI*s);lf=pcWrap(S2.y-yaw)*(1-e);
          if(s>=1){st.fl[i]=PCA_V[4].set(ix,0,iz).applyMatrix4(g.matrixWorld).clone();st.fy[i]=yaw;st.stp[i]=null;lf=0;}}
        else{const off=Math.hypot(lx-ix,lz-iz),dy=Math.abs(pcWrap(yaw-st.fy[i])),oth=st.stp[1-i];lf=pcWrap(st.fy[i]-yaw);
          const need=off>.022||dy>.42,mine=off+dy*.05,their=st.fl[1-i]?(Math.hypot(PCA_V[5].copy(st.fl[1-i]).applyMatrix4(mInv).x+sd*(hx+.003),PCA_V[5].z-iz)+Math.abs(pcWrap(yaw-st.fy[1-i]))*.05):0;
          if(need&&!oth&&st.t-st.lastStep>.14&&mine>=their*.9){st.stp[i]={t0:st.t,x:lx,z:lz,y:st.fy[i]};st.lastStep=st.t;}}
        mx+=(lx-mx)*lk;mz+=(lz-mz)*lk;my+=(ly-my)*lk;mp*=1-lk;tb*=1-lk;fyx+=(lf-fyx)*lk;
        /* (locked: the gait starts again from where the feet stand) */
        if(lk>.999){F.s=0;F.A.set(mx,0,mz).applyMatrix4(g.matrixWorld);F.ay=yaw+fyx;F.pu=u0;}}
      else{st.fl[i]=null;st.stp[i]=null;}
      F.P.set(mx,my,mz);F.fyx=fyx;st.fyx[i]=fyx;
      /* the ground under the foot (t.ground: the game's height at a point of the world - the stones of a street, a step, a slope): the foot is raised or lowered to it from the ground under the
         body (the figure's own floor), so a foot never sinks into a step or floats over a dip; where the ground falls away the pelvis comes down by the legs' reach, below */
      if(t.ground&&!t.preview){let gw=-1e9;const cyF=Math.cos(st.toe[i]+fyx),syF=Math.sin(st.toe[i]+fyx);for(const fz of[heelZ,0,ballZ]){const w=PCA_V[7].set(mx+syF*fz,0,mz+cyF*fz).applyMatrix4(g.matrixWorld),q=t.ground(w.x,w.z);if(q!=null&&isFinite(q)&&q>gw)gw=q;}/* (heel, ankle, ball: across the edge of a step the foot stands on the higher tread) */if(gw>-1e8){const e=g.matrixWorld.elements,sw=Math.hypot(e[4],e[5],e[6])||1;
        const off=Math.max(-.3*Lg,Math.min(.5*Lg,(gw-e[13])/sw)),G0=st.gOff||(st.gOff=[0,0]);G0[i]=st.gInit?G0[i]+(off-G0[i])*Math.min(1,dt*30):off;my+=G0[i]*(1-sit);}}
      ankleAt(mx,mz,mp,my,ANK[i],st.toe[i]+fyx);
      /* knocked out: the feet out in front of the hips */
      if(sit>.002){ANK[i].lerp(PCA_V[4].set(sd*(hx+.012),Y.ankle,.105),sit);}
      MP[i]=mp*(1-sit);TB[i]=tb*(1-sit);CW[i]=cw;}
    st.gInit=true;
    /* the legs' reach: where a foot on the ground is further than the leg can reach, the pelvis comes down (a walk dips between its steps; a long stride sinks into it) */
    /* (smoothly: a soft minimum of the two legs - no corner where the weight goes from one foot to the other - followed by a stiff spring, so the pelvis is never jerked down) */
    if(st.drop0==null)st.drop0=st.drop;const nd=[0,0];if(sit<.002){const Lr=Lg*.9965;/* (99.65%: a knee of about 9 degrees - at 99% every planted knee was held at 16 or more and the walk crouched) */for(let i=0;i<2;i++){if(CW[i]<=0)continue;hipL.copy(B['thigh'+(i?'R':'L')].position).applyQuaternion(qRoot).add(B.root.position);
      const dx=ANK[i].x-hipL.x,dz=ANK[i].z-hipL.z,h2=Lr*Lr-dx*dx-dz*dz,ym=ANK[i].y+(h2>0?Math.sqrt(h2):0);nd[i]=Math.max(-.2*Lg,Math.min(0,(ym-hipL.y)*Math.min(1,CW[i])));}}
    /* (a polynomial soft minimum: the minimum itself wherever the two legs' needs differ by more than kq, rounded only where they cross - no extra drop while one foot carries) */
    const kq=.008*Lg,mn=Math.min(nd[0],nd[1]),hq=Math.max(kq-Math.abs(nd[0]-nd[1]),0)/kq,need=Math.max(-.16*Lg,mn-hq*hq*kq*.25*Math.min(1,-mn/kq));/* (rounded only where both legs need it) */
    {const n=Math.max(1,Math.ceil(dt/.008)),h=dt/n;let dv=st.dropV||0;for(let k=0;k<n;k++){dv+=((need-st.drop)*3600-dv*120)*h;st.drop+=dv*h;}st.dropV=dv;}if(st.drop>0){st.drop=0;st.dropV=Math.min(0,st.dropV);}{const tl=need+.0008*Lg;if(tl<st.drop){st.dropV=dt>0?Math.min(0,(tl-st.drop0)/dt):0;st.drop=tl;}}st.drop0=st.drop;/* (never more than the legs' slack above what they need - the spring keeps it smooth, the slack (the reach is taken at 99.65%, the leg reaches 99.76%) keeps the feet on the ground) */B.root.position.y+=st.drop;
    for(let i=0;i<2;i++)leg(i,ANK[i],MP[i],TB[i]);
    (st.mPrev||(st.mPrev=new THREE.Matrix4())).copy(g.matrixWorld);st.yPrev=yaw;
    /* ---- the spine, chest, neck, head ---- */
    const cy=-yawP*P.chest,cr=-rollP*.8,fx=wm*P.flex*c2;/* (fx: the spine giving under each landing) */
    setE(B.spine,st.lean*.2+fx+VC.hunch*.6*wm+PS.bx*.5-.004*br*iw-sit*.12,cy*.45+PS.ry*.35,cr*.5);
    setE(B.chest,st.lean*.25+VC.hunch*.4*wm+PS.bx*.5-.012*br*iw-sit*.06,cy*.55+PS.ry*.35,cr*.5+VC.roll*wm);
    const lead=Math.max(-.4,Math.min(.4,st.yr*.11)),hy=-(yawP+cy+PS.ry*1.0)*.85+lead+iw*.09*look*(1-st.atkW)+VC.gy*(1-st.atkW);
    setE(B.neck,(-st.lean*.5)-fx*.6-VC.hunch*.7*wm+iw*.01*br,hy*.4,-st.bank*.2);setE(B.head,(-st.lean*.45)+.02*Math.sin(TAU*.17*st.t)*iw-PS.bx*.3+sit*.15+VC.gp*(1-st.atkW),hy*.6,-st.bank*.25+VC.ht*wm);
    /* ---- the arms ---- */
    const sw=st.sw,amp=wm*P.arm*Math.min(1,.4+u/3),arm=Math.cos(TAU*ph),el=wm*P.el,af=wm*P.armF,ef=wm*P.elF,ao=wm*P.armOut;
    const base=(side,k)=>{let x=0,z=0,e=0;for(const n in sw){const s0=PCA_ST[n][side];x+=s0[0]*sw[n];z+=s0[1]*sw[n];e+=s0[2]*sw[n];}const a=PCA_ATK[wk===('none')?'none':wk][side],w=st.atkW;return[x+(a[0]-x)*w,z+(a[1]-z)*w,e+(a[2]-e)*w];};
    const bL=base('L'),bR=base('R'),swL=1-.65*(sw.bow),swR=1-.6*(sw.sword),aw=1-st.atkW;
    const eb=wm*P.elB,ax=wm*P.armX;/* (the elbow opens as the arm goes back; in front the hand comes a little across the body) */
    setE(B.upperL,bL[0]+(af+amp*(1+VC.asym)*arm)*swL*aw+PS.lx+sit*.4,0,bL[1]-PS.lz-.02*br*iw-ao+ax*Math.max(0,-arm)*swL*aw-sit*.25);B.foreL.rotation.set(bL[2]+(el+ef*Math.max(0,-arm)+eb*Math.max(0,arm))*swL*aw+PS.lex,0,0);
    setE(B.upperR,bR[0]+(af-amp*(1-VC.asym)*arm)*swR*aw+PS.rx+sit*.4,0,bR[1]+PS.rz+.02*br*iw+ao-ax*Math.max(0,arm)*swR*aw+sit*.25);B.foreR.rotation.set(bR[2]+(el+ef*Math.max(0,arm)+eb*Math.max(0,-arm))*swR*aw+PS.ex,0,0);
    setE(B.clavL,0,0,-.01*br*iw);setE(B.clavR,0,0,.01*br*iw);
    setE(B.handL,-.08-.12*run*wm,0,0);setE(B.handR,-.08-.12*run*wm,0,0);
    /* ---- the sword in the hand: its hold, guards and swings (pcsword.js) ---- */
    pcSwordPose(g,R,st,t,A,kf,dt,{iw,wm,run});
    /* ---- the weapon and the hands ---- */
    const K=R.kit||{},bowIn=sw.bow>.5,swordIn=t.pcHeld!=null?!!t.pcHeld:sw.sword>.5,isBow=wk==='bow';/* (the sword is in the hand while its hotbar slot is selected, fighting or not) */
    if(K.bow)K.bow.visible=isBow&&bowIn;if(K.bowBack)K.bowBack.visible=isBow&&!bowIn;if(K.quiver)K.quiver.visible=isBow;
    if(K.arrow)K.arrow.visible=isBow&&bowIn&&!!A&&/^bow/.test(A.k)&&kf<(REL[A.k]||.6)+.02;
    if(K.sword){K.sword.visible=!isBow&&swordIn;K.sword.rotation.x=(K.sword.userData.bx||0)+PS.wx*.6;}if(K.swordHip)K.swordHip.visible=!isBow&&!swordIn;if(K.scab)K.scab.visible=!isBow;
    const H=R.hands;if(H){const fist=run*wm>.5,gL=(isBow&&bowIn)||fist,gR=(!isBow&&swordIn)||(K.arrow&&K.arrow.visible)||fist;H.L.grip.visible=gL;H.L.open.visible=!gL;H.R.grip.visible=gR;H.R.open.visible=!gR;}
    g.updateMatrixWorld(true);
    if(st.vis)pcPhys(g,dt);};}

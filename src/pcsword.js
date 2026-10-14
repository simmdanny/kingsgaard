/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (6): the sword in the hand.

   pcSwordPose(g, R, st, t, A, kf, dt, m) runs inside the controller (pcanim.js), after the arms have their stance and before the kit is shown:
     - held at rest (no fight for 5 s): the arm hangs and swings as if the hand were empty; the hand holds the sword with the blade forward and down.
       Standing still, the figure now and then rests the blade on its shoulder or lifts it to look along the edge (PCSI: three idles);
     - in a fight (a swing, a foe held): the sword comes up into a guard (PCSG: five guards, one chosen as the fight begins and another now and then), breathing in it;
     - a swing (A.k one of PCSW: ten): the grip follows the swing's path (keys: where the grip is, where the blade points, where its edge faces, how the body turns,
       leans and sinks, where the off hand is), from wherever the sword was when the swing began into the guard it ends in.
   Positions are in the chest's frame (x: the sword side, y: up, z: forward) from the sword shoulder, in arm lengths; directions in the same frame.
   The arm reaches the grip by two-bone IK (the elbow out, down and back, rising out to the side with the hand); the hand turns the blade as the key says, the forearm taking most of
   the twist. The sink goes to the pelvis before the legs are set (pcanim.js reads st.sp.y), so the feet stay on the ground.
   ===================================================================================================================== */
const pcsV=a=>new THREE.Vector3(a[0],a[1],a[2]);
/* one pose: g grip, d blade, e edge, ry turn (+: the sword shoulder back), bx lean (+: forward), y sink (figure units), L off-hand arm [upper x, z, forearm x] offsets, hd head [pitch (+: down), yaw (+: to the sword side)] */
const pcsP=(g,d,e,o)=>Object.assign({g:pcsV(g),d:pcsV(d).normalize(),e:pcsV(e),ry:0,bx:0,y:0,L:[0,0,0],hd:[0,0]},o||{});
/* the five guards of a fight (the body from the sword shoulder, in arm lengths: the navel about -.55 down, the hip -.8, the top of the head +.45, the middle of the body -.34 across) */
const PCSG=[
  /* the middle guard: the grip before the navel, the point up at the eyes of the foe */
  pcsP([-.22,-.5,.48],[-.1,.5,.86],[0,-1,0],{ry:.14,bx:.06,y:-.004,L:[-.25,-.1,-.45]}),
  /* the high guard: the grip by the shoulder, the blade up and a little back, ready to fall */
  pcsP([.12,.08,.2],[.08,.9,-.4],[0,0,1],{ry:.3,bx:.02,y:-.003,L:[-.45,-.12,-.75]}),
  /* the hanging guard: the grip high before the face, the blade slanting down across the body */
  pcsP([-.05,.16,.6],[-.62,-.5,.6],[0,1,0],{ry:-.12,bx:.08,y:-.005,L:[-.3,-.05,-.5],hd:[.06,0]}),
  /* the low guard: the grip low before the hip, the point low and forward */
  pcsP([-.12,-.76,.42],[-.05,-.45,.89],[0,-1,0],{ry:.08,bx:.1,y:-.006,L:[-.18,-.18,-.35]}),
  /* the ox: the grip beside the head, the point straight at the foe's face */
  pcsP([.15,.22,.3],[-.05,-.12,.99],[0,1,0],{ry:.22,bx:.04,y:-.004,L:[-.4,-.15,-.85]})];
/* the idles at rest (0: the hanging hold - the arm's own stance; 1: the blade on the shoulder; 2: lifted to look along the edge, turning it) */
const PCSI=[null,
  pcsP([-.02,-.1,.3],[.05,.6,-.8],[0,.8,.6]),
  pcsP([-.25,-.25,.55],[-.1,.95,.25],[-1,0,0],{bx:.03,hd:[-.05,-.15]})];
/* the blade of the hanging hold: forward and down, the edge down */
const PCS_REST_D=pcsV([.08,-.5,.86]).normalize(),PCS_REST_E=pcsV([0,-1,0]);
/* the ten swings: [k, pose] keys between the start (where the sword was) and the guard it ends in; dur in s, hit: the share of it at which it strikes */
const PCSW={
  /* the overhead chop: up behind the head, over and down through the middle */
  swOver:{dur:.78,hit:.55,keys:[[.3,pcsP([.02,.62,-.05],[.02,.3,-.95],[0,1,0],{ry:.12,bx:-.12,L:[-.5,-.1,-.6],hd:[-.08,0]})],
    [.45,pcsP([0,.45,.45],[0,.8,.6],[0,.6,-.8],{ry:.05,bx:.05,L:[-.3,-.1,-.5]})],
    [.56,pcsP([-.12,-.35,.82],[-.05,-.3,.95],[0,-1,0],{ry:-.06,bx:.28,y:-.012,L:[-.1,-.15,-.3]})],
    [.72,pcsP([-.1,-.75,.5],[.05,-.85,.5],[0,-.5,-.85],{ry:-.04,bx:.3,y:-.012,L:[-.1,-.2,-.3]})]]},
  /* the forehand slash: wound up out to the sword side and back, flat across to the other side */
  swSlash:{dur:.72,hit:.55,keys:[[.3,pcsP([.7,-.1,-.1],[.6,.12,-.78],[0,0,1],{ry:.5,bx:.02,L:[-.4,-.3,-.8]})],
    [.47,pcsP([.5,-.2,.6],[.5,.05,.86],[-.8,0,.5],{ry:.2,bx:.08,L:[-.25,-.25,-.6]})],
    [.57,pcsP([-.15,-.3,.82],[-.5,0,.86],[-1,0,-.5],{ry:-.25,bx:.14,y:-.006,L:[-.1,-.35,-.4]})],
    [.72,pcsP([-.6,-.32,.4],[-.95,-.05,-.2],[-.2,0,-1],{ry:-.45,bx:.12,y:-.006,L:[0,-.45,-.3]})]]},
  /* the backhand slash: wound up at the other shoulder, flat across to the sword side */
  swBack:{dur:.72,hit:.55,keys:[[.3,pcsP([-.55,-.05,.2],[-.55,.15,-.82],[0,0,1],{ry:-.5,bx:.02,L:[0,0,-.3]})],
    [.47,pcsP([-.4,-.2,.7],[-.45,.05,.89],[.8,0,.5],{ry:-.2,bx:.08,L:[-.2,-.1,-.5]})],
    [.57,pcsP([.2,-.3,.8],[.5,0,.86],[1,0,-.5],{ry:.22,bx:.12,y:-.006,L:[-.35,-.25,-.7]})],
    [.72,pcsP([.72,-.32,.28],[.95,-.05,-.25],[.2,0,-1],{ry:.45,bx:.1,y:-.006,L:[-.45,-.35,-.85]})]]},
  /* the falling cut from the sword shoulder down across to the other hip */
  swDiagR:{dur:.74,hit:.53,keys:[[.3,pcsP([.35,.4,-.05],[.32,.75,-.58],[-.3,.55,.6],{ry:.38,bx:-.06,L:[-.45,-.2,-.7]})],
    [.45,pcsP([.22,.12,.6],[.1,.62,.78],[-.6,-.3,.5],{ry:.18,bx:.06,L:[-.3,-.2,-.6]})],
    [.55,pcsP([-.08,-.38,.78],[-.42,-.3,.86],[-.6,-.8,0],{ry:-.15,bx:.22,y:-.01,L:[-.1,-.3,-.4]})],
    [.72,pcsP([-.45,-.72,.35],[-.7,-.6,.25],[-.3,-.4,-.85],{ry:-.38,bx:.24,y:-.01,L:[0,-.35,-.3]})]]},
  /* the falling cut from the other shoulder down across to the sword side's hip */
  swDiagL:{dur:.74,hit:.53,keys:[[.3,pcsP([-.4,.36,.08],[-.42,.7,-.55],[.3,.55,.6],{ry:-.38,bx:-.04,L:[-.1,0,-.4]})],
    [.45,pcsP([-.25,.08,.65],[-.12,.62,.78],[.6,-.3,.5],{ry:-.15,bx:.06,L:[-.2,-.1,-.5]})],
    [.55,pcsP([.08,-.38,.78],[.42,-.3,.86],[.6,-.8,0],{ry:.15,bx:.2,y:-.01,L:[-.35,-.25,-.7]})],
    [.72,pcsP([.5,-.72,.3],[.7,-.62,.25],[.3,-.4,-.85],{ry:.36,bx:.22,y:-.01,L:[-.45,-.3,-.8]})]]},
  /* the rising cut: from low at the other side up through the middle to high on the sword side */
  swRise:{dur:.72,hit:.5,keys:[[.3,pcsP([-.35,-.75,.25],[-.5,-.7,.5],[.4,-.6,-.7],{ry:-.32,bx:.22,y:-.01,L:[0,-.1,-.3]})],
    [.47,pcsP([.08,-.42,.72],[.15,.4,.9],[.3,.9,-.4],{ry:.05,bx:.1,y:-.004,L:[-.25,-.2,-.5]})],
    [.6,pcsP([.4,.3,.38],[.45,.82,-.2],[.2,.3,.95],{ry:.35,bx:-.06,L:[-.5,-.3,-.8],hd:[-.1,0]})],
    [.74,pcsP([.35,.2,.2],[.35,.8,-.45],[0,.4,.9],{ry:.3,bx:-.03,L:[-.45,-.3,-.75]})]]},
  /* the thrust: drawn back by the hip, then straight out */
  swThrust:{dur:.64,hit:.5,keys:[[.32,pcsP([.3,-.62,-.15],[.02,.04,1],[0,-1,0],{ry:.4,bx:-.02,L:[-.5,-.25,-.9]})],
    [.5,pcsP([-.02,-.3,.88],[-.05,0,1],[0,-1,0],{ry:-.18,bx:.32,y:-.012,L:[.25,-.35,-.2]})],
    [.66,pcsP([-.02,-.32,.84],[-.05,0,1],[0,-1,0],{ry:-.16,bx:.3,y:-.012,L:[.25,-.35,-.2]})]]},
  /* the whirl: the blade circled flat over the head, then a slash across */
  swWhirl:{dur:.98,hit:.74,keys:[[.22,pcsP([.05,.62,.05],[.6,.05,.8],[.8,0,-.6],{ry:.1,bx:-.08,L:[-.4,-.2,-.6],hd:[-.1,0]})],
    [.36,pcsP([-.05,.66,0],[-.8,.05,.6],[.6,0,.8],{ry:-.1,bx:-.08,L:[-.4,-.2,-.6],hd:[-.1,0]})],
    [.5,pcsP([.1,.64,-.05],[-.3,.05,-.95],[-.95,0,.3],{ry:.15,bx:-.08,L:[-.4,-.2,-.6],hd:[-.1,0]})],
    [.62,pcsP([.66,-.08,0],[.7,.08,-.7],[0,0,1],{ry:.5,bx:0,L:[-.4,-.3,-.8]})],
    [.76,pcsP([-.12,-.3,.82],[-.55,0,.84],[-1,0,-.6],{ry:-.28,bx:.14,y:-.008,L:[-.1,-.35,-.4]})],
    [.88,pcsP([-.6,-.34,.38],[-.95,-.05,-.2],[-.2,0,-1],{ry:-.46,bx:.12,y:-.008,L:[0,-.45,-.3]})]]},
  /* the lunge: drawn back, then a deep low thrust with the whole body behind it */
  swLunge:{dur:.82,hit:.55,keys:[[.3,pcsP([.25,-.62,-.1],[0,-.05,1],[0,-1,0],{ry:.35,bx:.02,y:-.004,L:[-.5,-.25,-.9]})],
    [.55,pcsP([0,-.55,.75],[-.04,-.28,.96],[0,-1,0],{ry:-.15,bx:.48,y:-.024,L:[.45,-.4,-.15],hd:[-.2,0]})],
    [.72,pcsP([0,-.55,.72],[-.04,-.26,.97],[0,-1,0],{ry:-.15,bx:.46,y:-.024,L:[.45,-.4,-.15],hd:[-.2,0]})]]},
  /* the double cut: a forehand slash and straight back with a backhand one */
  swDouble:{dur:.98,hit:.4,keys:[[.18,pcsP([.68,-.12,-.08],[.6,.12,-.78],[0,0,1],{ry:.45,L:[-.4,-.3,-.8]})],
    [.34,pcsP([-.12,-.28,.82],[-.5,0,.86],[-1,0,-.5],{ry:-.22,bx:.12,y:-.006,L:[-.1,-.35,-.4]})],
    [.46,pcsP([-.55,-.2,.32],[-.85,.1,-.4],[0,0,1],{ry:-.45,bx:.06,y:-.004,L:[0,-.4,-.3]})],
    [.62,pcsP([.2,-.3,.8],[.5,0,.86],[1,0,-.5],{ry:.22,bx:.14,y:-.006,L:[-.35,-.25,-.7]})],
    [.78,pcsP([.7,-.32,.28],[.95,-.05,-.25],[.2,0,-1],{ry:.45,bx:.1,y:-.006,L:[-.45,-.35,-.85]})]]}};
const PCSW_K=Object.keys(PCSW);
/* the elbow: out, down and back, rising out to the side as the grip rises above the shoulder */
const PCS_POLE_LO=pcsV([.5,-.75,-.45]).normalize(),PCS_POLE_HI=pcsV([.9,.05,-.45]).normalize();

/* a pose between a and b (s: 0..1), into o */
function pcsMix(a,b,s,o){o.g.copy(a.g).lerp(b.g,s);o.d.copy(a.d).lerp(b.d,s).normalize();o.e.copy(a.e).lerp(b.e,s);
  o.ry=a.ry+(b.ry-a.ry)*s;o.bx=a.bx+(b.bx-a.bx)*s;o.y=a.y+(b.y-a.y)*s;for(let i=0;i<3;i++)o.L[i]=a.L[i]+(b.L[i]-a.L[i])*s;for(let i=0;i<2;i++)o.hd[i]=a.hd[i]+(b.hd[i]-a.hd[i])*s;return o;}
/* where a swing is at k: the grip on a Catmull-Rom curve through the keys (the arc, not the chord), the rest eased from key to key */
function pcsSwingAt(S,k,start,end,o){const K=S.keys,ks=[0],ps=[start];for(const q of K){ks.push(q[0]);ps.push(q[1]);}ks.push(1);ps.push(end);let i=0;while(i<ks.length-2&&k>ks[i+1])i++;
  const u=Math.min(1,Math.max(0,(k-ks[i])/Math.max(1e-4,ks[i+1]-ks[i]))),e=u*u*(3-2*u),a=ps[i],b=ps[i+1],p0=ps[Math.max(0,i-1)],p3=ps[Math.min(ps.length-1,i+2)];
  pcsMix(a,b,e,o);const t2=e*e,t3=t2*e;
  o.g.set(0,0,0).addScaledVector(p0.g,-.5*t3+t2-.5*e).addScaledVector(a.g,1.5*t3-2.5*t2+1).addScaledVector(b.g,-1.5*t3+2*t2+.5*e).addScaledVector(p3.g,.5*t3-.5*t2);return o;}
/* the scratch of one figure */
function pcsScratch(){const v=()=>new THREE.Vector3(),q=()=>new THREE.Quaternion(),P=()=>pcsP([0,0,0],[0,0,1],[0,1,0]);
  return{c:0,sw:0,y:0,gi:0,gT:0,ii:0,iT:6,iw:[1,0,0],swA:null,fighting:false,s0:P(),cur:pcsP([0,-1,.2],[0,0,1],[0,-1,0]),out:P(),gp:P(),ip:P(),
    m:new THREE.Matrix4(),m2:new THREE.Matrix4(),sc:v(),qc:q(),qp:q(),qu:q(),qf:q(),qh:q(),qs:q(),qsl:q(),qt:q(),ql:q(),
    Sh:v(),Ef:v(),Wf:v(),W:v(),D:v(),E:v(),Gw:v(),off:v(),dir:v(),pole:v(),own:v(),u:v(),El:v(),f:v(),bend:v(),bx:v(),by:v(),bz:v(),y1:v(),eu:new THREE.Euler()};}
/* a bone's world rotation (and position) in the figure's frame */
function pcsInG(S,g,b,q,p){S.m.copy(g.matrixWorld).invert().multiply(b.matrixWorld);S.m.decompose(p||S.sc,q,S.sc);return q;}
/* a rotation whose +y is d and +x is e (made perpendicular) */
function pcsBasisYX(S,d,e,q){const Y=S.by.copy(d).normalize(),X=S.bx.copy(e).addScaledVector(Y,-e.dot(Y));if(X.lengthSq()<1e-8){X.set(1,0,0).addScaledVector(Y,-Y.x);}X.normalize();
  const Z=S.bz.crossVectors(X,Y).normalize();S.m2.makeBasis(X,Y,Z);return q.setFromRotationMatrix(S.m2);}

function pcSwordPose(g,R,st,t,A,kf,dt,m){const B=R.B,K=R.kit||{},sw=K.sword;
  const held=t.pcHeld!=null?!!t.pcHeld:!!(st.sw&&st.sw.sword>.5),S=st.sp||(st.sp=pcsScratch());
  if(!held||!sw||!B.upperR||t.preview){S.c=0;S.sw=0;S.y=0;S.swA=null;S.fighting=false;return;}
  if(t.pcFight){st.drawn=true;st.lastFight=st.t;}
  const sm=(a,b,r)=>a+(b-a)*(1-Math.exp(-r*dt)),rnd=Math.random,tt=st.t;
  /* the fight and its guard: a guard as the fight begins, another now and then while it lasts */
  const fight=!!st.drawn;if(fight&&!S.fighting){S.gi=Math.floor(rnd()*PCSG.length);S.gT=6+rnd()*6;}S.fighting=fight;
  if(fight&&!A&&(S.gT-=dt)<=0){let n;do{n=Math.floor(rnd()*PCSG.length);}while(n===S.gi);S.gi=n;S.gT=6+rnd()*6;}
  const isSw=!!(A&&PCSW[A.k]);S.c=sm(S.c,fight||isSw?1:0,fight||isSw?8:2.5);S.sw=isSw?Math.min(1,S.sw+dt*16):sm(S.sw,0,10);
  /* the idles at rest: mostly the hanging hold; standing still, now and then the shoulder or a look along the edge */
  const still=m.iw>.85&&!fight&&!isSw;S.iT-=dt;if(S.iT<=0){if(S.ii===0&&still){S.ii=1+Math.floor(rnd()*2);S.iT=4+rnd()*3;}else{S.ii=0;S.iT=7+rnd()*7;}}if(!still&&S.ii){S.ii=0;S.iT=4+rnd()*4;}
  for(let i=0;i<3;i++)S.iw[i]=sm(S.iw[i],i===S.ii?1:0,3);
  /* the guard, breathing */
  const gp=pcsMix(PCSG[S.gi],PCSG[S.gi],0,S.gp);gp.g.y+=.025*Math.sin(tt*1.6);gp.g.x+=.012*Math.sin(tt*.9+1.1);gp.g.z+=.015*Math.sin(tt*1.15+.4);gp.d.x+=.03*Math.sin(tt*1.3);gp.d.normalize();gp.ry+=.03*Math.sin(tt*.7);
  /* the idle lifted to look: the edge turned slowly in the hand */
  const ix=S.iw[2]>S.iw[1]?2:1,ip=pcsMix(PCSI[ix],PCSI[ix],0,S.ip);if(ix===2)ip.e.applyAxisAngle(ip.d,.55*Math.sin(tt*1.1));
  /* the swing: from where the sword was when it began, into the guard */
  let tgt;
  if(isSw){if(S.swA!==A){S.swA=A;pcsMix(S.cur,S.cur,0,S.s0);}tgt=pcsSwingAt(PCSW[A.k],kf,S.s0,gp,S.out);}
  else{S.swA=null;tgt=pcsMix(gp,gp,0,S.out);}
  const wB=Math.max(S.c,S.sw),idleL=(S.iw[1]+S.iw[2])*(1-wB);
  /* ---- the body with it: the turn, the lean (the sink: the pelvis, next frame), the head kept on the foe ---- */
  const ry=tgt.ry*wB,bx=tgt.bx*wB+ip.bx*idleL,hp=tgt.hd[0]*wB+ip.hd[0]*idleL,hy=tgt.hd[1]*wB+ip.hd[1]*idleL;S.y=tgt.y*wB;
  if(ry||bx||hp||hy){B.spine.rotation.y+=ry*.45;B.chest.rotation.y+=ry*.55;B.spine.rotation.x+=bx*.45;B.chest.rotation.x+=bx*.35;
    B.neck.rotation.y-=ry*.45;B.head.rotation.y+=hy-ry*.4;B.neck.rotation.x-=bx*.3;B.head.rotation.x+=hp-bx*.2;}
  /* ---- the off hand ---- */
  if(wB>.001){B.upperL.rotation.x+=tgt.L[0]*wB;B.upperL.rotation.z+=tgt.L[1]*wB;B.foreL.rotation.x+=tgt.L[2]*wB;}
  /* (the controller set this frame's spine, chest and arms after its last update of the matrices: bring them up to date before reading them) */
  B.root.updateMatrixWorld(true);
  /* ---- the sword arm ---- */
  const qc=pcsInG(S,g,B.chest,S.qc),qp=pcsInG(S,g,B.upperR.parent,S.qp),Sh=S.Sh,Ef=S.Ef,Wf=S.Wf;pcsInG(S,g,B.upperR,S.qu,Sh);pcsInG(S,g,B.foreR,S.qf,Ef);pcsInG(S,g,B.handR,S.qh,Wf);
  const L1=Sh.distanceTo(Ef),L2=Ef.distanceTo(Wf),La=L1+L2+.024;
  /* the blade and its edge wanted: at rest the hanging hold (the arm as it is) or an idle, in a fight the guard or the swing */
  const ikW=Math.max(wB,idleL),D=S.D,E=S.E;let Gc;
  if(wB>=idleL){D.copy(PCS_REST_D).lerp(tgt.d,wB).normalize();E.copy(PCS_REST_E).lerp(tgt.e,wB);Gc=tgt.g;}
  else{D.copy(PCS_REST_D).lerp(ip.d,idleL).normalize();E.copy(PCS_REST_E).lerp(ip.e,idleL);Gc=ip.g;}
  D.applyQuaternion(qc);E.applyQuaternion(qc);
  const qs=pcsBasisYX(S,D,E,S.qs),qsl=S.qsl.setFromEuler(S.eu.set(sw.userData.bx||0,0,0)),qh=S.qh.copy(qs).multiply(S.ql.copy(qsl).invert());/* (the hand's rotation that holds the sword so) */
  /* where the wrist goes: the grip's place less the sword's offset in the hand */
  const W=S.W.copy(Wf),qf=S.qf;
  if(ikW>.001){const Gw=S.Gw.copy(Gc).multiplyScalar(La).applyQuaternion(qc).add(Sh);Gw.sub(S.off.copy(sw.position).applyQuaternion(qh));W.lerp(Gw,ikW);
    /* the two bones, the elbow towards the pole (from the arm's own elbow at rest to the guard's pole) */
    const dir=S.dir.copy(W).sub(Sh);let d=dir.length();dir.divideScalar(d||1);d=Math.min(Math.max(d,Math.abs(L1-L2)+1e-4),L1+L2-1e-4);
    const hi=Math.min(1,Math.max(0,(W.y-Sh.y)/(L1+L2)+.3)),pole=S.pole.copy(PCS_POLE_LO).lerp(PCS_POLE_HI,hi).normalize().applyQuaternion(qc);
    pole.lerp(S.own.copy(Ef).sub(Sh).normalize(),1-ikW);pole.addScaledVector(dir,-pole.dot(dir));if(pole.lengthSq()<1e-8)pole.set(0,0,-1);pole.normalize();
    const ca=Math.min(1,Math.max(-1,(L1*L1+d*d-L2*L2)/(2*L1*d))),sa=Math.sqrt(1-ca*ca),u=S.u.copy(dir).multiplyScalar(ca).addScaledVector(pole,sa),El=S.El.copy(Sh).addScaledVector(u,L1);
    const f=S.f.copy(Sh).addScaledVector(dir,d).sub(El).normalize(),bend=S.bend.copy(f).addScaledVector(u,-f.dot(u));if(bend.lengthSq()<1e-8)bend.copy(pole).negate();
    const qu=pcaBasis(u,bend,S.qu);B.upperR.quaternion.copy(S.ql.copy(qp).invert().multiply(qu));
    const th=Math.acos(Math.min(1,Math.max(-1,u.dot(f))));B.foreR.quaternion.setFromAxisAngle(PCA_X,-th);qf.copy(qu).multiply(B.foreR.quaternion);}
  /* the hand turns the blade; the forearm takes most of the twist (about its own length), the wrist the rest */
  {const ql=S.ql.copy(qf).invert().multiply(qh),tw=2*Math.atan2(ql.y,ql.w),qt=S.qt.setFromAxisAngle(S.y1.set(0,1,0),tw*.7);
    B.foreR.quaternion.multiply(qt);qf.multiply(qt);B.handR.quaternion.copy(S.ql.copy(qf).invert().multiply(qh));}
  sw.rotation.x=sw.userData.bx||0;B.upperR.updateMatrixWorld(true);
  /* where the sword is now, in the chest's frame (a swing that begins starts from here) */
  {const qi=S.ql.copy(qc).invert(),c=S.cur;c.d.set(0,1,0).applyQuaternion(qs).applyQuaternion(qi);c.e.set(1,0,0).applyQuaternion(qs).applyQuaternion(qi);
    c.g.copy(sw.position).applyQuaternion(qh).add(W).sub(Sh).applyQuaternion(qi).divideScalar(La);c.ry=ry;c.bx=bx;c.y=S.y;for(let i=0;i<3;i++)c.L[i]=tgt.L[i]*wB;c.hd[0]=hp;c.hd[1]=hy;}}

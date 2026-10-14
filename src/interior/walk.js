/* =====================================================================================================================
   KINGSGAARD INTERIORS (7/8): walking. Colliders from the generated layout, the hero's zone / floor / stair state, heights,
   the cutaway of the building being explored, and loading / unloading of interiors.
   One rule runs through it: walls and furniture are boxes in the building frame, so a rotated building needs no special case.
   ===================================================================================================================== */
OWI.on=false;OWI.near=[];OWI.cb=null;OWI.lv=0;OWI.in=false;OWI.t=0;OWI.tScan=-9;OWI.anim=new Set();
const OWI_ALL=255,OWI_GND=1;
const owiLive=b=>!b.ruined&&b.hp>b.maxHp*.3;

/* ---- plan and colliders, built the first time a hero comes near ---- */
/* is somebody home (a light behind the windows at night)? the same answer as ic.lit, without the plan (the seed and the kind of the building) */
function owiLitOf(b){return((owiSeed(b)>>>9)%100)<owiLitPct({kind:OWI.kindOf(b.type,b.pl)});}
function owiLitPct(P){return P.kind==='tavern'||P.kind==='scroll'||P.kind==='hall'?100:P.kind==='forge'||P.kind==='carpenter'||P.kind==='merchant'?72:P.kind==='hut'?42:55;}
function owiEnsurePlan(b){if(b.ic)return b.ic;const P=owiMakePlan(b),ic={P,col:null,grp:null,geos:null,mats:null,mesh:null};b.ic=ic;if(b.enter){ic.col=owiBuildCol(b,P);owdSyncCol(b);}ic.lit=((P.seed>>>9)%100)<owiLitPct(P);return ic;}
function owiBuildCol(b,P){if(b.pl&&b.pl.open)return owpBuildCol(b,P);const BS=P.BS,T=P.T,e=b.enter,A=b.arch,r0=A.rect0,c=owiColList(),L=.07*BS,Q0=P.st[0].Q,tw=P.door.w/2;
  if(b.tunnel){/* two solid masses either side of the passage, from the front wall to the back wall */
    c.add(Q0.xa-T,-tw,Q0.za-T,Q0.zb+T,OWI_ALL);c.add(tw,Q0.xb+T,Q0.za-T,Q0.zb+T,OWI_ALL);}
  else P.st.forEach((s,i)=>{const Q=s.Q,m=1<<i,x0=Q.xa-T,x1=Q.xb+T,z0=Q.za-T,z1=Q.zb+T;/* outer walls of every storey; the ground floor has the doorway */
    c.add(x0,Q.xa,z0,z1,m);c.add(Q.xb,x1,z0,z1,m);c.add(Q.xa,Q.xb,z0,Q.za,m);
    if(i===0&&!(b.pl&&b.pl.solid&&!b.arch.leaf)){const g0=P.door.u-P.door.w/2,g1=P.door.u+P.door.w/2;c.add(Q.xa,g0,Q.zb,z1,m);c.add(g1,Q.xb,Q.zb,z1,m);}else c.add(Q.xa,Q.xb,Q.zb,z1,m);/* a solid building has no doorway */});
  /* Everything outside the walls below is on the ground floor only (OWI_GND): the upper floors of a jettied house reach out over the ledge and the steps, and a walker up there must not meet them.
     The foundation ledge round the building is solid from outside; at each entrance the steps lead up over it */
  const lx0=r0.x0*BS,lx1=r0.x1*BS,fx0=lx0-(A.party&&A.party.l?0:L),fx1=lx1+(A.party&&A.party.r?0:L),fz0=r0.z0*BS-L,fz1=r0.z1*BS+L;
  if(lx0-fx0>.001)c.add(fx0,lx0,fz0,fz1,OWI_GND);if(fx1-lx1>.001)c.add(lx1,fx1,fz0,fz1,OWI_GND);
  for(const nd of e.ends){const gw=Math.min(nd.spec.width,(r0.x1-r0.x0)*BS-.1),u=nd.u,s=nd.sgn,za=s>0?r0.z1*BS:fz0,zb=s>0?fz1:r0.z0*BS;
    c.add(lx0,u-gw/2,za,zb,OWI_GND);c.add(u+gw/2,lx1,za,zb,OWI_GND);
    /* cheek walls along the steps keep a walker on them */
    const zlo=Math.min(nd.zL,nd.zF+s*nd.spec.run),zhi=Math.max(nd.zL,nd.zF+s*nd.spec.run);
    for(const sx of[-1,1]){const xa=u+sx*nd.spec.width/2,xb=u+sx*(nd.spec.width/2+(nd.spec.wing||.2));c.add(Math.min(xa,xb),Math.max(xa,xb),zlo-.001,zhi+.001,OWI_GND);}}
  if(!b.tunnel)c.add(lx0,lx1,fz0,r0.z0*BS,OWI_GND);/* the back of a house is closed */
  /* porch posts (the roof above is high enough to walk under) */
  if(A.porch)for(const sx of[-1,1]){const px=A.porch.u*BS+sx*.25*BS,pz=A.porch.z*BS,h=.045*BS/2+.01;c.add(px-h,px+h,pz-h,pz+h,OWI_GND);}
  /* partitions with their doorways, furniture, stairs */
  for(const F of P.floors){const m=1<<F.i,PT=OWI.PT;
    for(const w of F.walls){const pc=owiWallPieces(w,9);for(const[a,b2]of pc.runs){if(w.ax==='x')c.add(a,b2,w.p-PT/2,w.p+PT/2,m);else c.add(w.p-PT/2,w.p+PT/2,a,b2,m);}}
    for(const it of F.items){if(it.deco||it.spec.flat)continue;const sh=it.spec.small?.02:.03;c.add(it.x-it.ax/2+sh,it.x+it.ax/2-sh,it.z-it.az/2+sh,it.z+it.az/2-sh,m);}}
  for(const f of P.stairs){const m=(1<<f.from)|(1<<f.to),z0=f.z0,z1=f.z1,sd=.07,botHigh=f.zb>f.zt;
    c.add(f.x0-sd,f.x0,z0,z1,m);c.add(f.x1,f.x1+sd,z0,z1,m);
    /* the closed end at the top (seen from below) and at the bottom (seen from the floor above) */
    if(botHigh){c.add(f.x0,f.x1,z0-sd,z0,1<<f.from);c.add(f.x0,f.x1,z1,z1+sd,1<<f.to);}else{c.add(f.x0,f.x1,z1,z1+sd,1<<f.from);c.add(f.x0,f.x1,z0-sd,z0,1<<f.to);}}
  if(!b.tunnel&&A.leaf){const g0=P.door.u-P.door.w/2,g1=P.door.u+P.door.w/2;owdAddCol(b,c,g0,g1,Q0.zb,Q0.zb+T);}/* the door: slots A (doorway) and B (open leaf), kept in step with the door by owdSyncCol */
  const col=c.fin();{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<col.n;i++){x0=Math.min(x0,col.x0[i]);x1=Math.max(x1,col.x1[i]);z0=Math.min(z0,col.z0[i]);z1=Math.max(z1,col.z1[i]);}col.bb={x0,x1,z0,z1};}/* where any of its boxes can be */
  return col;}

/* ---- what a position belongs to: the footprint (1), the steps (2) or the carved approach (3) of a loaded building. Zones of neighbours can overlap. ---- */
function owiZonesAt(x,z){const out=[];for(const b of OWI.near){const l=owiW2L(b,x,z),k=owiKind(b.enter,l);if(k)out.push({b,lx:l[0],lz:l[1],k});}return out;}
/* the zone a point belongs to: the most specific one (inside a footprint before steps before the approach); where two buildings' zones overlap equally (row houses share their approaches), the one the hero is in already wins, so the
   building it belongs to does not flip back and forth as it walks along a terrace */
function owiZoneAt(x,z,pref){let best=null;for(const b of OWI.near){const l=owiW2L(b,x,z),k=owiKind(b.enter,l);if(k&&(!best||k<best.k||(k===best.k&&b===pref)))best={b,lx:l[0],lz:l[1],k};}return best;}
const owiLvOf=b=>1<<(b===OWI.cb?OWI.lv:0);
/* ---- the hero's movement: ONE resolver for the colliders of loaded buildings and for the occupancy grid ----
   Two models describe what is solid. Outdoors it is the occupancy grid (cells of 1 m; a house paints its footprint, a tree its cell); round a loaded building it is that building's boxes
   (walls, ledge, steps, cheek walls, furniture, stair sides). They overlap and they do not agree: a house's ledge reaches into cells the grid calls free, and the cells beside a wall are
   blocked although the boxes leave room. A hero that was moved by one model into a place the other forbids had no way out (every step from there was refused): that was the "stuck in a hitbox" bug.
   So there is one rule. A position is VALID when
     - no box of any loaded building overlaps the hero's circle, and the buildings' boxes count wherever they are (the zones, and the vicinity of every box, padded by the hero's radius), and
     - the ground allows it: inside a footprint (kind 1) the building decides; on its steps or approach (kinds 2, 3) only cells that belong to something else stop the hero (owiFgOk);
       anywhere else the occupancy grid decides (owCanStand).
   The hero only ever goes from a valid place to a valid place (the full move, else a slide along an axis; boxes push the circle along walls), so a collision can never leave it where every way out is refused.
   If it nevertheless stands somewhere invalid (a spawn, an eviction, a building that loads over it), its own moves are accepted wherever they reach valid ground, and owiRecover glides it to the nearest valid place. */
function owiColZones(x,z){const out=[],pad=OWI.RAD+.1;for(const b of OWI.near){const l=owiW2L(b,x,z),k=owiKind(b.enter,l);
  if(k)out.push({b,lx:l[0],lz:l[1],k});else{const q=b.ic&&b.ic.col&&b.ic.col.bb;if(q&&l[0]>q.x0-pad&&l[0]<q.x1+pad&&l[1]>q.z0-pad&&l[1]<q.z1+pad)out.push({b,lx:l[0],lz:l[1],k:0});}}return out;}
function owiValid(x,z,zs){zs=zs||owiColZones(x,z);let own=false,sec=false;
  for(const q of zs){if(owiHit(q.b.ic.col,q.lx,q.lz,owiLvOf(q.b),OWI.RAD))return false;if(q.k===1)own=true;else if(q.k>1)sec=true;}
  if(own)return true;if(sec)return owiFgOk(zs,x,z);return owCanStand(x,z);}
/* push a point out of the boxes of every building whose zone or vicinity it is in (a few passes, so that two buildings' boxes are both respected) */
function owiResolve(x,z,zs){let px=x,pz=z;for(let pass=0;pass<3;pass++){let moved=false;
  for(const q of zs){const l=owiW2L(q.b,px,pz),p=owiPush(q.b.ic.col,l[0],l[1],owiLvOf(q.b),OWI.RAD+.0005);if(p[0]!==l[0]||p[1]!==l[1]){const w=owiL2W(q.b,p[0],p[1]);px=w[0];pz=w[1];moved=true;}}
  if(!moved)break;zs=owiColZones(px,pz);}return[px,pz];}
/* the valid place the hero would stand at after wanting (tx,tz), or null */
function owiPlaceAt(tx,tz){let zs=owiColZones(tx,tz),p=[tx,tz];if(zs.length){p=owiResolve(tx,tz,zs);zs=owiColZones(p[0],p[1]);}return owiValid(p[0],p[1],zs)?p:null;}
function owiMove(H,nx,nz){let x=H.x,z=H.z;const dx=nx-x,dz=nz-z,len=Math.hypot(dx,dz);if(len<1e-9)return[x,z];
  const n=Math.max(1,Math.ceil(len/.1));
  for(let i=0;i<n;i++){const tx=x+dx/n,tz=z+dz/n;
    let p=owiPlaceAt(tx,tz);if(!p)p=owiPlaceAt(tx,z);if(!p)p=owiPlaceAt(x,tz);
    if(!p)break;x=p[0];z=p[1];}
  if(x===H.x&&z===H.z&&!owiValid(H.x,H.z)){/* standing where no rule allows and no move of its own reaches valid ground: the way out leads towards the nearest valid place */
    const t=owiRecoverTarget(H);if(t){const d=Math.hypot(t[0]-H.x,t[1]-H.z),k=Math.min(1,len/Math.max(d,1e-6));x=H.x+(t[0]-H.x)*k;z=H.z+(t[1]-H.z)*k;OWI.stats.recov=(OWI.stats.recov||0)+1;}}
  return[x,z];}
/* the nearest valid place: where the hero last stood validly if that is close, otherwise the nearest valid point on rings round it. Nothing is found beyond RECOVER_R. */
const OWI_RECOVER_R=4;
function owiRecoverTarget(H){if(H.okX!=null&&Math.hypot(H.okX-H.x,H.okZ-H.z)<6&&owiValid(H.okX,H.okZ))return[H.okX,H.okZ];
  for(let r=.2;r<=OWI_RECOVER_R+1e-6;r+=.2){const n=Math.max(8,Math.ceil(6.2832*r/.2));for(let i=0;i<n;i++){const a=i/n*6.2832,px=H.x+Math.cos(a)*r,pz=H.z+Math.sin(a)*r;if(owiValid(px,pz))return[px,pz];}}
  return null;}
/* the fallback: a hero that stands on invalid ground for more than a moment (it checks ten times a second, and normal moves usually free it within that time) is glided to the nearest valid place at walking pace.
   It keeps its state and its camera; only x and z change; nothing is found beyond OWI_RECOVER_R, and then the hero is left alone and the search is retried after a second. */
function owiRecover(H,dt){if(!OWI.on)return;
  if(H.rcTo){const dx=H.rcTo[0]-H.x,dz=H.rcTo[1]-H.z,d=Math.hypot(dx,dz),sp=2.6*dt;if(d<=sp){H.x=H.rcTo[0];H.z=H.rcTo[1];H.rcTo=null;H.okX=H.x;H.okZ=H.z;H.badT=0;if(!H.melee)owHeroCell(H);}else{H.x+=dx/d*sp;H.z+=dz/d*sp;}return;}
  H.rcT=(H.rcT||0)-dt;if(H.rcT>0)return;H.rcT=.1;
  if(owiValid(H.x,H.z)){H.okX=H.x;H.okZ=H.z;H.badT=0;return;}
  H.badT=(H.badT||0)+.1;if(H.badT<.4)return;
  const t=owiRecoverTarget(H);if(t){H.rcTo=t;OWI.stats.recov=(OWI.stats.recov||0)+1;}else{H.badT=-.9;OWI.stats.recovFail=(OWI.stats.recovFail||0)+1;}}

/* ---- height under the hero, floor level, stairs, and the cutaway state ---- */
const owiSmooth=(H,t,dt)=>{if(H.oyT==null){H.oyT=t;H.oyO=0;H.oyX=H.x;H.oyZ=H.z;}const d=t-H.oyT,mv=Math.hypot(H.x-H.oyX,H.z-H.oyZ);
  if(Math.abs(d)>.035+.6*mv)H.oyO-=d;/* a jump in the surface (a riser, a threshold): carry the difference and let it die away */
  H.oyT=t;H.oyX=H.x;H.oyZ=H.z;H.oyO*=Math.exp(-dt*16);if(Math.abs(H.oyO)<.0008)H.oyO=0;return t+H.oyO;};
function owiLeave(){const o=OWI.cb;if(o){owiCut(o,false);if(o.camPlane){o.camPlane.normal.set(0,1,0);o.camPlane.constant=1e5;}}OWI.cb=null;OWI.lv=0;OWI.in=false;if(o){owBldRefresh(o);owiStairVis(o);owiCastOn(o,false);}}
/* The cutaway of the house the hero is in, three clips:
     - the interior (floors, partitions, furniture): everything above a plane OWI.CUT over the floor the hero walks on (cutPlane), so a partition between the camera and the hero is only shoulder high;
     - the outside of the house (walls, roof, upper storeys, glass): everything above the ceiling of the storey the hero is on (topPlane), so the roof and the storeys above are gone but the walls of this storey stay;
     - and the part of those outer walls on the camera's side of the hero (camPlane, a vertical plane through the hero, turned with the camera), because that is the wall between the camera and the hero.
   The floor, the far walls and every neighbouring building stay exactly as they are. The stairs are not clipped by any of it (they have a mesh of their own, see geo.js): the flight is above the plane for most of its length
   while the hero climbs its lower half, and clipped steps ahead looked like a staircase that vanishes. Only used for the orbit camera (OWI.cutOn): in first person and in the free camera nothing is cut. */
const owiCeilY=(b,P,lv)=>{const F=P.floors[lv];return b.hi+F.y+F.h-(lv<P.floors.length-1?OWI_SLAB:0)-.01;};
function owiCut(b,inside){const P=b.ic&&b.ic.P,on=!!(inside&&P&&OWI.cutOn);b.cutTarget=on?b.hi+P.floors[OWI.lv].y+OWI.CUT:b.topCut;b.topTarget=on?owiCeilY(b,P,OWI.lv):b.topCut;b.camOn=on;OWI.anim.add(b);}
/* the vertical plane follows the camera's heading (TPC.yaw: the camera stands at hero + (sin yaw, cos yaw) * distance) */
function owiCamPlane(){const b=OWI.cb;if(!b||!b.camPlane)return;
  if(b.camOn&&OWI.in&&tpcCam()&&b.topCur<b.topCut-.5){const nx=Math.sin(TPC.yaw),nz=Math.cos(TPC.yaw),H=heroU;b.camPlane.normal.set(-nx,0,-nz);b.camPlane.constant=nx*H.x+nz*H.z+.2;}
  else{b.camPlane.normal.set(0,1,0);b.camPlane.constant=1e5;}}
/* the floor at a point (lx, lz) of building b, on its level lv, as owiHeroY finds it for the hero - but for any point and without changing anything (the feet: kingsgaard.html owFootY) */
function owiFloorY(b,lx,lz,lv,x,z){const P=b.ic.P,e=b.enter;
  for(const f of P.stairs){if(lv!==f.from&&lv!==f.to)continue;if(lx>=f.x0-.02&&lx<=f.x1+.02&&lz>=f.z0-.001&&lz<=f.z1+.001){const t=clamp((lz-f.zb)/(f.zt-f.zb),0,1);return b.hi+f.y0+f.riser+t*(f.y1-f.y0-f.riser);}}
  if(lv>0)return b.hi+P.floors[lv].y+.02;const F0=P.floors[0],Q0=F0.Q;if(lx>=Q0.xa&&lx<=Q0.xb&&lz>=Q0.za&&lz<=Q0.zb)return b.hi+F0.y+.015;
  for(const nd of e.ends){const S=nd.spec,s=nd.sgn;if(Math.abs(lx-nd.u)>S.width/2+.001)continue;const o=(lz-nd.zF)*s;if(o<=0&&(lz-(s>0?Q0.zb:Q0.za))*s>=0)return b.hi+F0.y;if(o>0&&o<S.run)return b.hi+F0.y-(Math.floor(o/S.tread)+1)*S.r;}
  return owWalkY(x,z);}
function owiHeroY(H,dt){const terr=OW.on?owWalkY(H.x,H.z):gy(H.x,H.z);/* (out of doors: the ground, or the top of the paving stones) */
  if(!OWI.on||!OWI.near.length){if(OWI.cb)owiLeave();return owiSmooth(H,terr,dt);}
  const zn=owiZoneAt(H.x,H.z,OWI.cb);if(!zn){if(OWI.cb)owiLeave();return owiSmooth(H,terr,dt);}
  const b=zn.b,P=b.ic.P,e=b.enter,S=e.spec,lx=zn.lx,lz=zn.lz;
  if(OWI.cb!==b){if(OWI.cb)owiLeave();OWI.cb=b;OWI.lv=0;OWI.in=false;owBldRefresh(b);owiCastOn(b,true);}
  let y=null;
  for(const f of P.stairs){if(OWI.lv!==f.from&&OWI.lv!==f.to)continue;if(lx>=f.x0-.02&&lx<=f.x1+.02&&lz>=f.z0-.001&&lz<=f.z1+.001){const t=clamp((lz-f.zb)/(f.zt-f.zb),0,1);OWI.lv=t<.5?f.from:f.to;y=b.hi+f.y0+f.riser+t*(f.y1-f.y0-f.riser);break;}}
  const F0=P.floors[0],Q0=F0.Q,zlf=e.ends[0].zL,zlb=b.tunnel?e.ends[1].zL:Q0.za-P.T;
  if(y==null){
    if(OWI.lv>0)y=b.hi+P.floors[OWI.lv].y+.02;
    else if(lx>=Q0.xa&&lx<=Q0.xb&&lz>=Q0.za&&lz<=Q0.zb)y=b.hi+F0.y+.015;
    else{y=terr;for(const nd of e.ends){const S=nd.spec,s=nd.sgn;if(Math.abs(lx-nd.u)>S.width/2+.001)continue;const o=(lz-nd.zF)*s;
      if(o<=0&&(lz-(s>0?Q0.zb:Q0.za))*s>=0){y=b.hi+F0.y;break;}/* the doorway and the ledge in front of it */
      if(o>0&&o<S.run){const k=Math.floor(o/S.tread)+1;y=b.hi+F0.y-k*S.r;break;}}}}
  /* inside the building: past the doorway (with some hysteresis) or on an upper floor */
  const inX=lx>=Q0.xa-.05&&lx<=Q0.xb+.05;
  const inside=OWI.lv>0||(inX&&(OWI.in?(lz<zlf+.02&&lz>zlb-.02):(lz<Q0.zb-.25&&lz>Q0.za+.25)));/* (out again as soon as the hero has left the doorway: with 30 cm past the outer face the house stayed cut away while the hero stood on its ledge or top step) *//* a pavilion too: standing under its roof the third-person camera would look at the roof, so the roof is cut away like a house's (its posts, platform and goods stay) */
  if(inside!==OWI.in){OWI.in=inside;owiCut(b,inside);}else if(inside&&b.cutLv!==OWI.lv)owiCut(b,true);
  b.cutLv=inside?OWI.lv:-1;owiStairVis(b);
  return owiSmooth(H,y,dt);}

/* ---- the cutaway: everything of the building above a plane is clipped, the plane glides ---- */
function owiAnim(dt){if(!OWI.anim.size)return;for(const b of OWI.anim){const d=b.cutTarget-b.cutCur,d2=b.topTarget-b.topCur,k=1-Math.exp(-dt*9);let done=true;if(Math.abs(d)<.015)b.cutCur=b.cutTarget;else{b.cutCur+=d*k;done=false;}if(Math.abs(d2)<.015)b.topCur=b.topTarget;else{b.topCur+=d2*k;done=false;}
    if(done)OWI.anim.delete(b);b.cutPlane.constant=b.cutCur>=b.topCut-.01?1e5:b.cutCur;b.topPlane.constant=b.topCur>=b.topCut-.01?1e5:b.topCur;b.roofPlane.constant=b.topCur>=b.topCut-.01?1e5:Math.min(b.topCur,b.roofLo);}}

/* ---- loading, unloading and the per-frame housekeeping ---- */
/* every furnished building is in OWI.reg; those that can be entered are also in OWI.list. Furnished buildings that cannot be entered have no colliders and no cutaway,
   only their interior, seen through the windows. */
function owiRegister(b,enterable){OWI.reg.push(b);OWI.on=true;if(!enterable)return;
  b.cutPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1e5);b.topPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1e5);b.camPlane=new THREE.Plane(new THREE.Vector3(0,1,0),1e5);b.roofPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1e5);
  /* The roof is cut by a plane of its own, below the lowest point of the roof mesh. The plane of the storey (topPlane) is the ceiling of the hero's storey, which is the top of the walls; the eaves of the roof hang below
     the top of the walls (up to 60 cm in 383 of 498 houses of a sample world), so with that plane a rim of roof stayed round the cut-away house, running through the tops of its walls. */
  if(b.meshes.r){const rm=b.meshes.r;let lo=null;Object.defineProperty(b,'roofLo',{configurable:true,enumerable:true,get(){if(lo==null){const rg=rm.geometry;rg.computeBoundingBox();lo=b.hi+rg.boundingBox.min.y*b.BSc-.02;}return lo;},set(x){lo=x;}});}else b.roofLo=1e5;/* (upgrade 12: when the cutaway first needs it - reading the roof's bounds here made every house merge its roof, tiles and all, while the village was being built: wstLazyParts) */
  for(const k in b.mats){const m=b.mats[k];m.clippingPlanes=[k==='r'?b.roofPlane:b.topPlane,b.camPlane];m.clipShadows=false;/* the cutaway is a view: the clipped roof and upper storeys still shade the room */}
  if(b.meshes.g){const gm=owGlassPatch(OW_GLASS.clone());gm.clippingPlanes=[b.topPlane,b.camPlane];b.glassMat=gm;}
  const A=b.arch,BSc=b.BSc;b.topCut=b.hi+(A.roof.ridgeY+.8)*BSc+2;b.cutCur=b.cutTarget=b.topCur=b.topTarget=b.topCut;b.camOn=false;b.cutLv=-1;OWI.list.push(b);}
function owiReset(){owilReset();owlmReset();for(const b of OWI.reg)owiFreeMesh(b);OWD.reset();OWI.reg=[];OWI.list=[];OWI.near=[];OWI.cb=null;OWI.lv=0;OWI.in=false;OWI.anim.clear();OWI.on=false;OWI.night=-1;}
/* a hero that is in a building that stops being a building (ruin, fire) is moved to the foot of its steps */
function owiEvict(b){const e=b.enter,w=owiL2W(b,e.u,e.zF+e.spec.run+1.1);if(heroU){heroU.x=w[0];heroU.z=w[1];}owiLeave();}
function owiTick(dt){if(!OWI.on)return;OWI.t+=dt;owiAnim(dt);owiCamPlane();owdTick(dt);owilTick(dt);owlmTick(dt);
  /* the warm night glow follows the day cycle */
  if(Math.abs(OWLT.n-OWI.night)>.01){OWI.night=OWLT.n;for(const b of OWI.reg)if(b.ic&&b.ic.grp)owiGlowOne(b);}
  if(OWI.t-OWI.tScan<.1)return;OWI.tScan=OWI.t;
  const H=heroU,tp=tpcCam()&&H,cx=camera.position.x,cz=camera.position.z,hx=tp?H.x:cx,hz=tp?H.z:cz,near=[],cand=[],L2=OWI.LOAD*OWI.LOAD,U2=OWI.UNLOAD*OWI.UNLOAD;
  for(const b of OWI.reg){const dh=(b.x-hx)**2+(b.z-hz)**2,d2=Math.min(dh,(b.x-cx)**2+(b.z-cz)**2),live=owiLive(b);
    if(!live){if(b===OWI.cb)owiEvict(b);if(b.ic&&b.ic.grp)owiFreeMesh(b);continue;}
    if(d2<L2)cand.push([d2,b,dh]);
    else if(d2>U2&&b.ic&&b.ic.grp&&b!==OWI.cb)owiFreeMesh(b);}
  cand.sort((a,c)=>a[0]-c[0]);const t0=performance.now();let n=0;
  for(const[d2,b,dh]of cand){if((!b.ic||!b.ic.grp)&&(n<2||performance.now()-t0<2.5)&&n<6){if(!b.ic)owiEnsurePlan(b);if(!b.ic.grp)owiBuildMesh(b);n++;}
    if(b.enter&&b.ic&&dh<(b.r+30)*(b.r+30))near.push(b);}
  OWI.near=near;}

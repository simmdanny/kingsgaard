/* =====================================================================================================================
   CAMERA-DIRECTED AIMING
   The little dot in the middle of the screen is where the hero aims. A cast is aimed in four steps, all made at the moment the player casts:
     1. a ray leaves the CAMERA through the centre of the viewport (the same point the dot marks, THREE.Raycaster with NDC (0, 0));
     2. the first thing it meets is the aim point: an enemy, the terrain, a building, a city wall, or, if none is met within AIM.maxRange, a point far along the ray (the sky);
        what lies between the camera and the hero is skipped, so a wall behind the hero's back is not an obstacle to aiming past it;
     3. the aim point is brought within the hero's reach (AIM.reach), and the line from the hero's staff to it is checked against the solids (terrain, buildings, walls): if something stands in the way,
        the shot ends there, as it would for an arrow, and no enemy behind it is aimed at;
     4. the spell goes from ITS OWN origin (the staff, the hand: each cast function already starts there) to that point. The camera only chooses the point, so a camera that is
        behind and above the hero does not make the shot miss what the dot covers.
   The result is turned into the one thing every cast function already understands: a target (an enemy, or an invisible marker standing at the point, with a height of its own). Spells that strike a place
   get a marker on the ground there (the terrain height under the aim point; a wall or a roof is resolved to the ground in front of it; the sky to the ground a little way off), and the effect is lifted to that
   ground by AIM.withGround. Spells that are not aimed at anything (the hero's own domains, the folding of the enemy road) keep the targets they always had.
   Aiming exists on a PC (hover + fine pointer) in the open world, in the third-person hero camera and in the free camera. Touch devices keep their orbit camera and their automatic casting.
   ===================================================================================================================== */
const AIM={
  reach:30,         /* the farthest a cast is aimed from the hero, metres */
  maxRange:160,     /* how far the camera ray looks for a surface or an enemy */
  assist:.4,        /* an enemy counts as hit when the ray passes this close to its body (a small enemy far away is otherwise hard to hit) */
  c0:new THREE.Vector2(0,0),rc:new THREE.Raycaster(),ray:new THREE.Ray(),
  o:new THREE.Vector3(),d:new THREE.Vector3(),tip:new THREE.Vector3(),p:new THREE.Vector3(),
  res:{kind:'sky',t:0,x:0,y:0,z:0,nx:0,ny:1,nz:0,enemy:null,gx:0,gz:0},
  dot:null,on:false,ko:false,last:null,n:0};
/* spells that must not be lifted by the cast (none at present: chronostasis and shatter, which lift themselves when not aimed, leave it to the aim when aimed) */
const AIM_OWN_GROUND=new Set();
/* spell categories (see aimFor): what each scroll does with the aim */
const AIM_CAT={
  lightbolt:'bolt',emberbolt:'bolt',riftfang:'bolt',hexspark:'bolt',gravebind:'bolt',beam:'bolt',
  judgment:'slash',verdict:'slash',
  wither:'ground',grasp:'ground',graveburst:'ground',lantern:'ground',chronostasis:'ground',deflect:'ground',stormcloud:'ground',cataclysm:'ground',voidfall:'ground',shatter:'ground',compress:'ground',vael:'ground',
  darkpulse:'self',bloodneedles:'self',bloodcurse:'self',citadel:'self',singularity:'self',pulsar:'self',expanse:'self',purgatory:'self',eclipse:'self',stormcaller:'self',loop:'self'};

/* ---------------------------------------------------------------- the dot */
(function(){const st=document.createElement('style');
  st.textContent='#aimDot{position:fixed;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 0 4px 1px rgba(0,0,0,.45);pointer-events:none;z-index:4;display:none}';
  document.head.appendChild(st);const d=document.createElement('div');d.id='aimDot';d.setAttribute('aria-hidden','true');document.body.appendChild(d);AIM.dot=d;})();
/* is aiming a thing in this state of the game: the open world, a PC, the hero camera or the free camera */
const aimAvailable=()=>!!(OW.on&&state==='playing'&&heroU&&!CAM.gal&&flyPC()&&(tpcCam()||FLY.on));
const AIM_HOME=$('#home'),AIM_OVER=$('#over');
/* the dot is shown while aiming is available and no window covers the game. It never takes the pointer: Free Mouse clicks go through it to the interface underneath. */
function aimDotUpdate(){const want=aimAvailable()&&!paused&&AIM_HOME.hidden&&AIM_OVER.hidden&&sheet.hidden&&!placing;
  if(want!==AIM.on){AIM.on=want;AIM.dot.style.display=want?'block':'none';}
  if(want){const ko=heroU.ko>0;if(ko!==AIM.ko){AIM.ko=ko;AIM.dot.style.opacity=ko?'.35':'1';}}}

/* ---------------------------------------------------------------- what the ray can meet */
/* a building as a few boxes in its own frame (metres, y from its foundation), made once: one box for every storey and one for the roof */
function aimBoxes(b){if(b._aim)return b._aim;const out=[],A=b.arch,S=A?(A.scale||b.BSc):b.BSc;
  if(A&&A.storeys&&A.storeys.length){let si=0;for(const st of A.storeys){const r=st.rect;/* the lowest box reaches down through the foundation (a stone base from the highest ground to the ground below) */out.push({x0:r.x0*S,x1:r.x1*S,z0:r.z0*S,z1:r.z1*S,y0:si++?(st.floorY||0)*S:-3,y1:(st.floorY+st.h)*S,k:'w'});}
    const top=A.storeys[A.storeys.length-1].rect,rf=A.roof;if(rf&&rf.ridgeY!=null){const by=(rf.baseY!=null?rf.baseY:A.storeys[A.storeys.length-1].floorY+A.storeys[A.storeys.length-1].h);
      out.push({x0:top.x0*S-.2,x1:top.x1*S+.2,z0:top.z0*S-.2,z1:top.z1*S+.2,y0:by*S,y1:(by+(rf.ridgeY-by)*.72)*S,k:'r'});}}
  else{const h={well:1.2,stall:2.6,market:2.8,windmill:9,guard:7,shrine:3.2}[b.type]||3,r=Math.max(.5,(b.r||1.5)*.7);out.push({x0:-r,x1:r,z0:-r,z1:r,y0:0,y1:h,k:'w'});}
  return b._aim=out;}
/* ray against the boxes of one building: the entry distance, or Infinity; n receives the normal in world axes */
function aimBld(b,ox,oy,oz,dx,dy,dz,tMin,tMax,n){const c=Math.cos(b.rot),s=Math.sin(b.rot),px=ox-b.x,pz=oz-b.z,
  lox=px*c-pz*s,loz=px*s+pz*c,loy=oy-b.hi,ldx=dx*c-dz*s,ldz=dx*s+dz*c;
  let best=Infinity,bn=0,bnz=0,bny=0,wy=1,roof=true;{const M=b.meshes;if(M){if(M.w)wy=M.w.scale.y;if(M.r&&M.r.visible===false)roof=false;}}
  for(const q of aimBoxes(b))if(lox>q.x0&&lox<q.x1&&loz>q.z0&&loz<q.z1&&loy>q.y0&&loy<q.y1)return Infinity;/* the origin is inside it (the hero is indoors): its walls are not in the way */
  for(const q of aimBoxes(b)){if(q.k==='r'&&!roof)continue;const y1=q.k==='w'?q.y0+(q.y1-q.y0)*wy:q.y1;
    let t0=tMin,t1=Math.min(tMax,best),nx=0,ny=0,nz=0,ok=true;
    const sl=(o,d,lo,hi,ax)=>{if(Math.abs(d)<1e-9){if(o<lo||o>hi)ok=false;return;}let a=(lo-o)/d,bb=(hi-o)/d,sg=-1;if(a>bb){const q2=a;a=bb;bb=q2;sg=1;}
      if(a>t0){t0=a;nx=ny=nz=0;if(ax===0)nx=sg;else if(ax===1)ny=sg;else nz=sg;}if(bb<t1)t1=bb;if(t0>t1)ok=false;};
    sl(lox,ldx,q.x0,q.x1,0);if(ok)sl(loy,dy,q.y0,y1,1);if(ok)sl(loz,ldz,q.z0,q.z1,2);
    if(ok&&t0>=tMin&&t0<best){best=t0;bn=nx;bny=ny;bnz=nz;}}
  if(best<Infinity){/* the normal back to world axes (the frame is a rotation about y) */n.x=bn*c+bnz*s;n.y=bny;n.z=-bn*s+bnz*c;}return best;}
/* the wall round a city: segments of its outline, open at the gates */
function aimWall(v,ox,oy,oz,dx,dy,dz,tMin,tMax,n){const P=v.wallPts,w=v.walls;if(!P||!w)return Infinity;let best=Infinity;const N=P.length,half=1.0;
  for(let i=0;i<N;i++){const a=P[i],b2=P[(i+1)%N],ex=b2[0]-a[0],ez=b2[1]-a[1],L=Math.hypot(ex,ez)||1,ux=ex/L,uz=ez/L,nx=-uz,nz=ux;
    const den=dx*nx+dz*nz;if(Math.abs(den)<1e-9)continue;
    for(const off of[-half,half]){const t=((a[0]+nx*off-ox)*nx+(a[1]+nz*off-oz)*nz)/den;if(t<tMin||t>=Math.min(tMax,best))continue;
      const x=ox+dx*t,z=oz+dz*t,u=(x-a[0])*ux+(z-a[1])*uz;if(u<-half||u>L+half)continue;
      const gy=owH(x,z);if(oy+dy*t>gy+w.height||oy+dy*t<gy-.5)continue;
      let gate=false;for(const g of w.gates)if(Math.hypot(x-g.x,z-g.z)<g.w/2+.4){gate=true;break;}if(gate)continue;
      best=t;n.x=nx*(den>0?-1:1);n.y=0;n.z=nz*(den>0?-1:1);}}
  return best;}
/* the nearest enemy the ray passes through: a column of three spheres up its body, widened by the aim assist */
function aimEnemy(ox,oy,oz,dx,dy,dz,tMin,tMax){let best=Infinity,hit=null;
  for(const e of enemies){if(e.dead||!e.g||!e.g.visible)continue;const h=e.hitY||.8,r=Math.max(.26,h*.28)+AIM.assist;
    for(let k=0;k<3;k++){const cy=e.y+h*(.25+.25*k),px=e.x-ox,py=cy-oy,pz=e.z-oz,b=px*dx+py*dy+pz*dz,c=px*px+py*py+pz*pz-r*r,disc=b*b-c;
      if(disc<0)continue;const t=b-Math.sqrt(disc),tt=t>=tMin?t:(b+Math.sqrt(disc)>=tMin?Math.max(tMin,b):Infinity);if(tt<best&&tt<=tMax){best=tt;hit=e;}}}
  AIM.hitE=hit;return best;}
/* the first thing along a ray (origin, direction, distance window). Fills AIM.res: kind ground / bld / wall / enemy / sky, the point, the normal and the enemy.
   solidsOnly leaves enemies out (the line of fire). */
function aimCast(ox,oy,oz,dx,dy,dz,tMin,tMax,solidsOnly){const R=AIM.res,n=R;R.kind='sky';R.t=tMax;R.enemy=null;R.nx=0;R.ny=1;R.nz=0;R.b=null;let tb=tMax;
  {const r=AIM.ray;r.origin.set(ox,oy,oz);r.direction.set(dx,dy,dz);if(owRayGround(r,AIM.p)){const t=Math.max(0,(AIM.p.x-ox)*dx+(AIM.p.y-oy)*dy+(AIM.p.z-oz)*dz);if(t>=tMin&&t<tb){tb=t;R.kind='ground';R.nx=0;R.ny=1;R.nz=0;}}}
  const nn={x:0,y:1,z:0};
  for(const v of OW.villages){const cx=v.x-ox,cz=v.z-oz,rr=(v.rad||12)+16,tc=cx*dx+cz*dz,dxz=Math.hypot(dx,dz);
    /* the village's circle on the ground against the ray's shadow on it */
    if(dxz>1e-6){const tt=tc/(dxz*dxz),px=cx-dx*tt,pz=cz-dz*tt;if(px*px+pz*pz>rr*rr)continue;}else if(cx*cx+cz*cz>rr*rr)continue;
    for(const b of v.buildings){const pdx=b.x-ox,pdz=b.z-oz;if(dxz>1e-6){const tt=(pdx*dx+pdz*dz)/(dxz*dxz),px=pdx-dx*tt,pz=pdz-dz*tt;if(px*px+pz*pz>(b.r+3)*(b.r+3))continue;}
      const t=aimBld(b,ox,oy,oz,dx,dy,dz,tMin,tb,nn);if(t<tb){tb=t;R.kind='bld';R.nx=nn.x;R.ny=nn.y;R.nz=nn.z;R.b=b;}}
    if(v.walls){const t=aimWall(v,ox,oy,oz,dx,dy,dz,tMin,tb,nn);if(t<tb){tb=t;R.kind='wall';R.nx=nn.x;R.ny=nn.y;R.nz=nn.z;R.b=null;}}}
  if(!solidsOnly){const t=aimEnemy(ox,oy,oz,dx,dy,dz,tMin,tb);if(t<tb){tb=t;R.kind='enemy';R.enemy=AIM.hitE;}}
  R.t=tb;R.x=ox+dx*tb;R.y=oy+dy*tb;R.z=oz+dz*tb;return R.kind;}

/* ---------------------------------------------------------------- the aim */
/* the staff / hand of the caster: where its spells start */
function aimOrigin(t,v){let ok=false;try{vTip(t,v);ok=isFinite(v.x)&&isFinite(v.y)&&isFinite(v.z);}catch(e){}if(!ok)v.set(t.x,(t.topY||1)+.05,t.z);return v;}
/* an invisible target: a spell that wants an enemy to fly to, or a place to strike, gets one of these. It has a position and a height, no health a spell can take, and is in no list of enemies. */
function aimMarker(x,y,z,gy){return{aim:true,fake:true,x,z,y,gy:gy==null?y:gy,hitY:0,topY:1,r:.3,type:'marker',hp:1e9,maxHp:1e9,armor:0,res:{},spd:0,fly:false,flying:false,g:null,heldT:0,statuses:{},dead:false,slow:0,slowT:0,stunT:0,vuln:0,shield:0,dist:null,route:null,boss:false};}
/* the aim of the camera now, brought to the caster: {kind, x,y,z (the point the spell flies to), gx,gy,gz (the ground at it), enemy, blocked, dist (from the staff), dirx,diry,dirz (staff to the point), facing (the hero's yaw)} */
function aimResolve(t,reach){camera.updateMatrixWorld();const rc=AIM.rc;rc.setFromCamera(AIM.c0,camera);const ro=rc.ray.origin,rd=rc.ray.direction;
  const H=t.g?t.g.position:{x:t.x,y:0,z:t.z},tp=aimOrigin(t,AIM.tip);
  /* in the hero camera the camera stands behind the hero: whatever is nearer than the hero is not an aim target */
  const tMin=tpcCam()?Math.max(0,Math.hypot(ro.x-t.x,ro.y-(H.y+1),ro.z-t.z)-.6):0;
  const kind=aimCast(ro.x,ro.y,ro.z,rd.x,rd.y,rd.z,tMin,AIM.maxRange,false),R=AIM.res;
  const A={kind,x:R.x,y:R.y,z:R.z,enemy:R.enemy,blocked:false,cam:{x:ro.x,y:ro.y,z:ro.z,dx:rd.x,dy:rd.y,dz:rd.z},hit:{nx:R.nx,ny:R.ny,nz:R.nz,b:R.b}};
  const flat=Math.hypot(rd.x,rd.z)||1;
  /* the sky: a point far along the ray, within the caster's reach */
  if(kind==='sky'){A.x=ro.x+rd.x*Math.min(AIM.maxRange,reach*3);A.y=ro.y+rd.y*Math.min(AIM.maxRange,reach*3);A.z=ro.z+rd.z*Math.min(AIM.maxRange,reach*3);}
  if(kind==='enemy'){const e=R.enemy;A.x=e.x;A.y=e.y+(e.hitY||.6)*.5;A.z=e.z;}
  /* from the staff to the point; kept within reach */
  let dx=A.x-tp.x,dy=A.y-tp.y,dz=A.z-tp.z,len=Math.hypot(dx,dy,dz);
  if(len<.5){dx=rd.x;dy=rd.y;dz=rd.z;len=1;A.x=tp.x+dx*.5;A.y=tp.y+dy*.5;A.z=tp.z+dz*.5;}
  if(len>reach){const k=reach/len;A.x=tp.x+dx*k;A.y=tp.y+dy*k;A.z=tp.z+dz*k;dx*=k;dy*=k;dz*=k;len=reach;A.enemy=null;A.far=true;if(A.kind==='enemy')A.kind='far';/* an enemy out of reach is not a target */}
  /* the line of fire: terrain, buildings and walls between the staff and the point */
  {const ux=dx/len,uy=dy/len,uz=dz/len,k2=aimCast(tp.x,tp.y,tp.z,ux,uy,uz,.35,len-.15,true);
    if(k2!=='sky'){A.x=R.x;A.y=R.y;A.z=R.z;A.blocked=true;A.enemy=null;A.kind=k2;dx=A.x-tp.x;dy=A.y-tp.y;dz=A.z-tp.z;len=Math.hypot(dx,dy,dz)||1;A.hit={nx:R.nx,ny:R.ny,nz:R.nz,b:R.b};}}
  A.dist=len;A.dirx=dx/len;A.diry=dy/len;A.dirz=dz/len;A.tip={x:tp.x,y:tp.y,z:tp.z};
  /* the ground at the point (area spells): a wall or a roof is resolved to the ground in front of it, the sky to the ground a little way off, an enemy to the ground it stands on */
  let gx=A.x,gz=A.z;
  if(A.kind==='enemy'){gx=A.enemy.x;gz=A.enemy.z;}
  else if(A.kind==='bld'||A.kind==='wall'){/* step out of the structure: along the surface normal, or back towards the viewer when it faces up, until the ground is what lies below */
    let sx=A.hit.nx,sz=A.hit.nz;const nl=Math.hypot(sx,sz);if(nl>.3){sx/=nl;sz/=nl;}else{sx=-rd.x/flat;sz=-rd.z/flat;}
    gx=A.x+sx*.6;gz=A.z+sz*.6;const yHit=A.y;
    for(let i=0;i<40;i++){aimCast(gx,yHit+.5,gz,0,-1,0,0,80,true);if(AIM.res.kind!=='bld'&&AIM.res.kind!=='wall')break;gx+=sx*.5;gz+=sz*.5;}}
  else if(A.kind==='sky'||A.far){/* the ground along the hero's aim direction, not past its reach */
    const hx=A.x-t.x,hz=A.z-t.z,hl=Math.hypot(hx,hz)||1,d=Math.min(hl,reach*.8);gx=t.x+hx/hl*d;gz=t.z+hz/hl*d;}
  /* never farther than the reach, measured on the ground */
  {const hx=gx-t.x,hz=gz-t.z,hl=Math.hypot(hx,hz);if(hl>reach){gx=t.x+hx/hl*reach;gz=t.z+hz/hl*reach;}}
  A.gx=gx;A.gz=gz;A.gy=owH(gx,gz);
  /* the way the hero turns: towards the point, or with the camera when the point is straight above or below it */
  const hx=A.x-t.x,hz=A.z-t.z;A.facing=Math.hypot(hx,hz)>1?Math.atan2(hx,hz):Math.atan2(rd.x,rd.z);
  AIM.last=A;AIM.n++;return A;}
/* the targets a manual cast of scroll k is made with; null when this is not an aimed cast (touch, the classic board, an AI-cast spell).
   bolt: the enemy under the dot, or a marker at the point; ground: a marker on the ground at the point; self: the hero's own spells keep their enemies and ground the hero is standing on. */
function aimFor(t,k,s){if(t!==heroU||!aimAvailable())return null;const cat=AIM_CAT[k]||'self',reach=Math.max(AIM.reach,(s&&s.range)||0),A=aimResolve(t,reach);A.k=k;A.cat=cat;
  if(cat==='bolt'||cat==='slash'){A.list=[A.enemy||aimMarker(A.x,A.y,A.z,A.gy)];}
  else if(cat==='ground'){A.list=[aimMarker(A.gx,A.gy,A.gz,A.gy)];A.gnd=true;}
  else{const near=s?sortTargets(t,inRange(t,s)):[];A.list=near.length?near:[aimMarker(A.gx,A.gy,A.gz,A.gy)];}
  return A;}
/* the targets again, at the moment a delayed cast (the great spells open with a short ritual) takes effect: the same aim, with an enemy that has died since replaced by a marker where it was */
function aimRefresh(A){return A.list.map(e=>(e.aim||!e.dead)?e:aimMarker(e.x,e.y+(e.hitY||0)*.5,e.z,owH(e.x,e.z)));}

/* ---------------------------------------------------------------- ground effects follow the terrain */
/* The effects of the spells were made for a flat board: a rune, a cloud, a column of light stands at height 0. In the open world the ground is elsewhere. While an aimed ground spell is cast, and for the life of
   the effects it starts, GL (kingsgaard.html) holds the height of the ground under the target: whatever those effects create (their root objects, particles, flashes, bursts) is raised by it when it lies nearer the
   target than the hero. What belongs to the hero (the flash at the staff) stays where it was. castScrollNow sets it up; gLift, emit, flash, burst, updFx and gShift apply it. */

/* =====================================================================================================================
   KINGSGAARD VILLAGERS AT HOME (vilhome.js, after vilnav.js)
   Every villager has a bed in its own village - one of the beds the furnishing put in the houses, or, where a hamlet has
   more people than beds, a bedroll on the floor of a house - and goes to it at nightfall: home to its front door (vilnav's
   ways), in, shuts the door, through the rooms and up the stairs (vilHRoute: a grid over the house's own colliders, the
   flights as the hero climbs them), sits on the bed, lies back and sleeps till morning; then it gets up and goes out again.
   Each night a tenth of a village's villagers stay up and wander its streets instead - a different few every night.
   Nothing here draws from the world's random stream (world-sig): the beds are given out from the places the villagers were
   made at and the houses' own plans, so a villager has the same bed every time the world is loaded.
   ===================================================================================================================== */
const VILH={BED:[1110,1210],WAKE:[40,160],WANDER:.1,CS:.12,R:.21,FAR:75,ROLL:{w:.7,d:1.8,mat:.07},tok:0,tt:-1,
  stats:{plans:0,grids:0,routes:0,noRoute:0,noBed:0,floor:0,ms:0}};
/* the houses where a bedroll may be laid when a village has more people than beds (beyond the houses that have beds) */
const VILH_DW=new Set(['hut','cot','stonecottage','carpenter','smith','town','timberhouse','stonehouse','rowh','rowt']);
/* the last resort, where a hamlet's houses are full: farmhands bed down in the storehouse */
const VILH_DW2=new Set(['storage']);
/* buildings that never have a bed (their plans are not made to look for one) */
const VILH_NOBED=new Set(['rowc','stall','shed','stable','storage','market','smith','carpenter']);

/* ---- the clock: the game's day is DAYC.T (1800 s) long, the sun sets at DAYC.day (1200) ---- */
const vilHT=()=>typeof meta.dayT==='number'?meta.dayT:180;
/* which night it is: the evening of day N and the small hours of day N+1 are night N */
const vilHNightId=()=>{const t=vilHT();return t>=900?(meta.dayN|0):(meta.dayN|0)-1;};
/* a villager's own: its index, when it goes to bed and when it gets up (from a hash of the village and the villager: the same every time) */
function vilHPer(v,p){if(p.vh)return p.vh;const vi=v.id!=null?v.id:OW.villages.indexOf(v),i=v.villagers.indexOf(p);
  return p.vh={vi,i,bedT:VILH.BED[0]+(VILH.BED[1]-VILH.BED[0])*owHash2(vi*977+i*31+5,7717),wakeT:VILH.WAKE[0]+(VILH.WAKE[1]-VILH.WAKE[0])*owHash2(vi*613+i*53+11,3191),slot:null};}
function vilHBedtime(v,p){const h=vilHPer(v,p),t=vilHT();return t>=h.bedT||t<h.wakeT;}
/* the villagers who stay up tonight: a tenth of the village (the fraction carried by a hash of the night, so over the nights it comes to a tenth), a different few each night */
function vilHWanderer(v,p){const N=vilHNightId();if(!v.vhW||v.vhW.n!==N){const vi=vilHPer(v,p).vi,n=v.villagers.length,k=Math.floor(n*VILH.WANDER+owHash2(N*7+vi*131,4243));
    const ord=v.villagers.map((q,i)=>[owHash2(N*977+i*31+vi*7,9533),q]).sort((a,b)=>a[0]-b[0]);v.vhW={n:N,set:new Set(ord.slice(0,k).map(o=>o[1]))};}
  return v.vhW.set.has(p);}
/* should this villager be at home in bed now? (one without a bed - none, if the furnishing gave enough - stays up) */
const vilHHome=(v,p)=>vilHBedtime(v,p)&&!vilHWanderer(v,p)&&!!(p.vh&&p.vh.slot);
/* a villager staying up at night does not call on houses */
const vilHUp=(v,p)=>vilHBedtime(v,p)&&!vilHHome(v,p);

/* ---- the beds ---- */
/* the beds of a house in a fixed order (floors, then the order the furnishing placed them): a single bed or a pallet is one place, a double bed two (its halves) */
function vilHBeds(b){const ic=b.ic;if(ic.vb)return ic.vb;const out=[];
  ic.P.floors.forEach((F,lv)=>{for(const it of F.items){if(it.kind==='bed1'||it.kind==='pallet')out.push({b,lv,it,side:0,p:null});else if(it.kind==='bed2'){out.push({b,lv,it,side:-1,p:null});out.push({b,lv,it,side:1,p:null});}}});
  return ic.vb=out;}
/* the shape of a sleeping place in the house's frame: c its middle line's centre, h towards the head, s to its right, hw half its width, d its length, mat the height of the mattress over the floor */
function vilHGeo(sl){if(sl.g)return sl.g;let x,z,rot,w,d,kind;if(sl.it){({x,z,rot}=sl.it);w=sl.it.spec.w;d=sl.it.spec.d;kind=sl.it.kind;}else{({x,z,rot}=sl.f);w=VILH.ROLL.w;d=VILH.ROLL.d;kind='roll';}
  const hx=-Math.sin(rot),hz=-Math.cos(rot),sx=Math.cos(rot),sz=-Math.sin(rot),off=sl.side?sl.side*w/4:0;
  return sl.g={cx:x+sx*off,cz:z+sz*off,bx:x,bz:z,hx,hz,sx,sz,hw:sl.side?w/4:w/2,w,d,kind};}
/* the mattress over the floor (furniture4.js draws four kinds of bed: rope .39, box .45, post .46; the pallet .1; the bedroll .07) - the kind is known once the bed has been drawn (it.bv).
   The sleeper's back rests on it (the line of its joints 8 cm over it), its own covers over it (vilHCover) */
function vilHMat(sl){const g=vilHGeo(sl);if(g.kind==='roll')return .07;if(g.kind==='pallet')return .1;const v=sl.it.bv;return v===1?.39:v===2||v===3?.46:.45;}

/* ---- giving out the beds (a few houses' plans a frame: making a plan costs 3-20 ms) ---- */
/* each villager in the order they were made takes a free bed in the house nearest the place it was made at; when the village has no bed left, a bedroll in the nearest house that is lived in */
function vilHAssign(v,tt){const A=v.vhA||(v.vhA={i:0,done:false});if(A.done)return true;if(tt<(VILH.planT||0)-1)VILH.planT=0;/* (a new game starts the clock again) */const t0=performance.now();
  if(!A.C)A.C=v.buildings.filter(b=>b.enter&&owdLeaf(b)&&OWI.list.indexOf(b)>=0);
  while(A.i<v.villagers.length){if(performance.now()-t0>1.2)return false;const p=v.villagers[A.i],h=vilHPer(v,p);
    if(!A.ord){const hx=p.hx==null?p.x:p.hx,hz=p.hz==null?p.z:p.hz;A.ord=A.C.map(b=>[Math.hypot(b.x-hx,b.z-hz),b]).sort((a,c)=>a[0]-c[0]).map(o=>o[1]);A.k=0;A.pass=0;}
    let got=null;
    for(;A.k<A.ord.length;A.k++){const b=A.ord[A.k];if(!owiLive(b))continue;
      if(A.pass===0&&VILH_NOBED.has(b.type))continue;
      /* (a plan costs 3-28 ms: one every quarter second of game time at most, and none while the frames are slow - the game's own owiTick plans the houses round the hero at the same pace) */
      /* (by day the plans are left to the game, which makes them round the hero anyway; from 110 s before the first bedtime and through the night (a village come near at night too) they are made here.
         The beds come out the same either way: the order of the villagers and of the houses decides, not when a plan was made) */
      if(!b.ic){const t=vilHT();if(!(t>=VILH.BED[0]-110||t<VILH.WAKE[1]))return false;if(VILH.tok>0||tt<(VILH.planT||0)||(OW._ft||16)>24)return false;VILH.tok++;owiEnsurePlan(b);VILH.planT=tt+.25;VILH.stats.plans++;return false;}
      if(!vilDoor(v,b))continue;
      if(A.pass===0){if(!vilHBeds(b).some(s=>!s.p))continue;if(!vilHReach(b))return false;const s=vilHBeds(b).find(s=>!s.p&&vilHSides(s).length);if(s){got=s;break;}}
      else if(A.pass===1?(vilHBeds(b).length||VILH_DW.has(b.type)):VILH_DW2.has(b.type)){const ic=b.ic;ic.vf=ic.vf||[];if(ic.vf.length>=2)continue;
        if(!vilHReach(b))return false;if(!ic.occ&&VILH.tok>0)return false;if(!ic.occ)VILH.tok++;const f=vilHFloor(b);if(f){got={b,lv:0,it:null,f,side:0,p:null};ic.vf.push(got);VILH.stats.floor++;break;}}}
    if(!got&&A.pass<2){A.pass++;A.k=0;continue;}
    if(got){got.p=p;h.slot=got;}else VILH.stats.noBed++;
    A.i++;A.ord=null;}
  A.done=true;return true;}

/* ---- a bedroll on the floor: where a strip 1.8 x .7 m is clear of everything (a fine grid of the floor's colliders and a summed-area table), out of the way in from the door and off the stairs, along a wall, far from the door ---- */
function vilHFloor(b){const ic=b.ic,P=ic.P,Q=P.st[0].Q,col=ic.col,cs=.1;
  if(!ic.occ){const x0=Q.xa,z0=Q.za,nx=Math.max(1,Math.floor((Q.xb-Q.xa)/cs)),nz=Math.max(1,Math.floor((Q.zb-Q.za)/cs)),S=new Int32Array((nx+1)*(nz+1));
    for(let k=0;k<nz;k++){let row=0;for(let j=0;j<nx;j++){const x=x0+(j+.5)*cs,z=z0+(k+.5)*cs;let bad=owiHit(col,x,z,1,.05)?1:0;
        if(!bad)for(const f of P.stairs)if(f.from===0&&x>f.x0-.3&&x<f.x1+.3&&z>f.z0-.3&&z<f.z1+.3){bad=1;break;}
        row+=bad;S[(k+1)*(nx+1)+j+1]=S[k*(nx+1)+j+1]+row;}}
    ic.occ={x0,z0,nx,nz,cs,S};}
  const O=ic.occ,{x0,z0,nx,nz,S}=O,D=P.door,used=ic.vf||[],R=VILH.ROLL;
  const sum=(j0,k0,j1,k1)=>S[k1*(nx+1)+j1]-S[k0*(nx+1)+j1]-S[k1*(nx+1)+j0]+S[k0*(nx+1)+j0];
  let best=null;
  for(const along of[0,1]){const ax=along?R.d:R.w,az=along?R.w:R.d,cw=Math.round(ax/cs),ch=Math.round(az/cs);
    for(let k=0;k+ch<=nz;k++)for(let j=0;j+cw<=nx;j++){if(sum(j,k,j+cw,k+ch))continue;
      const xa=x0+j*cs,xb=xa+ax,za=z0+k*cs,zb=za+az,cx=(xa+xb)/2,cz=(za+zb)/2;
      if(xb>D.u-D.w/2-.2&&xa<D.u+D.w/2+.2&&zb>Q.zb-1.3)continue;/* (the way in from the door: the doorway and 20 cm either side, as for a pallet) */
      if(used.some(u=>Math.abs(u.f.x-cx)<(ax+(u.f.ax||R.w))/2+.15&&Math.abs(u.f.z-cz)<(az+(u.f.az||R.d))/2+.15))continue;
      /* the side it is reached from: free for a villager, inside the house */
      const sides=along?[[cx,za-.35],[cx,zb+.35]]:[[xa-.35,cz],[xb+.35,cz]],G0=ic.vg&&ic.vg[0],M0=ic.vr&&ic.vr[0];
      if(!sides.some(q=>{if(q[0]<Q.xa+.2||q[0]>Q.xb-.2||q[1]<Q.za+.2||q[1]>Q.zb-.2||owiHit(col,q[0],q[1],1,VILH.R))return false;if(!M0)return true;const i=vilHCell(G0,q[0],q[1]);return i>=0&&!!M0[i];}))continue;
      const wall=Math.min(xa-Q.xa,Q.xb-xb,za-Q.za,Q.zb-zb),sc=-wall*3+Math.hypot(cx-D.u,cz-Q.zb)*.5;
      if(!best||sc>best.sc){/* the head to the nearer end wall */const rot=along?((cx-Q.xa)<(Q.xb-cx)?Math.PI/2:-Math.PI/2):((cz-Q.za)<(Q.zb-cz)?0:Math.PI);best={x:cx,z:cz,rot,ax,az,sc};}}}
  return best?{x:best.x,z:best.z,rot:best.rot,ax:best.ax,az:best.az}:null;}

/* ---- the way inside a house: a grid per floor over the house's colliders (the walking circle VILH.R), the flights kept out of it (they are climbed as the hero climbs them) ---- */
function vilHGrid(b,lv){const ic=b.ic,G=ic.vg||(ic.vg=[]);if(G[lv])return G[lv];const P=ic.P,Q=P.st[lv].Q,cs=VILH.CS,x0=Q.xa-.1,z0=Q.za-.1,nx=Math.ceil((Q.xb-Q.xa+.2)/cs)+1,nz=Math.ceil((Q.zb-Q.za+.2)/cs)+1,col=ic.col,m=1<<lv,free=new Uint8Array(nx*nz);
  /* (the boxes are laid on the grid one by one - a cell within VILH.R of a box is taken, as owiHit would say - rather than every cell asking every box: 7000 cells x 200 boxes was 5-10 ms) */
  for(let k=0;k<nz;k++)for(let j=0;j<nx;j++){const x=x0+j*cs,z=z0+k*cs;free[k*nx+j]=(x<Q.xa+.05||x>Q.xb-.05||z<Q.za+.05||z>Q.zb-.05)?0:1;}
  const R=VILH.R;for(let i=0;i<col.n;i++){if(!(col.mk[i]&m))continue;const bx0=col.x0[i],bx1=col.x1[i],bz0=col.z0[i],bz1=col.z1[i];
    const j0=Math.max(0,Math.ceil((bx0-R-x0)/cs)),j1=Math.min(nx-1,Math.floor((bx1+R-x0)/cs)),k0=Math.max(0,Math.ceil((bz0-R-z0)/cs)),k1=Math.min(nz-1,Math.floor((bz1+R-z0)/cs));
    for(let k=k0;k<=k1;k++){const z=z0+k*cs,dz=z<bz0?bz0-z:z>bz1?z-bz1:0;for(let j=j0;j<=j1;j++){const x=x0+j*cs,dx=x<bx0?bx0-x:x>bx1?x-bx1:0;if(dx*dx+dz*dz<R*R)free[k*nx+j]=0;}}}
  for(const f of P.stairs){if(lv!==f.from&&lv!==f.to)continue;for(let k=0;k<nz;k++){const z=z0+k*cs;if(z<=f.z0-.06||z>=f.z1+.06)continue;for(let j=0;j<nx;j++){const x=x0+j*cs;if(x>f.x0-.06&&x<f.x1+.06)free[k*nx+j]=0;}}}
  VILH.stats.grids++;return G[lv]={x0,z0,nx,nz,cs,free,lv};}
/* breadth-first over the grid (8 ways, a corner only past two free cells), then pulled straight (only the corners stay); a, c points in the house's frame */
function vilHPath(b,lv,a,c){const g=vilHGrid(b,lv),{x0,z0,nx,nz,cs,free}=g,col=b.ic.col,m=1<<lv,R=VILH.R;
  const near=(x,z)=>{const j0=Math.round((x-x0)/cs),k0=Math.round((z-z0)/cs);let best=-1,bd=1e9;for(let k=Math.max(0,k0-6);k<=Math.min(nz-1,k0+6);k++)for(let j=Math.max(0,j0-6);j<=Math.min(nx-1,j0+6);j++){if(!free[k*nx+j])continue;const d=(j-j0)**2+(k-k0)**2;if(d<bd){bd=d;best=k*nx+j;}}return best;};
  const s=near(a[0],a[1]),t=near(c[0],c[1]);if(s<0||t<0)return null;
  const prev=new Int32Array(nx*nz).fill(-2);prev[s]=-1;const q=[s];
  for(let h=0;h<q.length;h++){const i=q[h];if(i===t)break;const j=i%nx,k=(i-j)/nx;
    for(let dk=-1;dk<=1;dk++)for(let dj=-1;dj<=1;dj++){if(!dj&&!dk)continue;const J=j+dj,K=k+dk;if(J<0||K<0||J>=nx||K>=nz)continue;const id=K*nx+J;if(prev[id]!==-2||!free[id])continue;
      if(dj&&dk&&(!free[k*nx+J]||!free[K*nx+j]))continue;prev[id]=i;q.push(id);}}
  if(prev[t]===-2)return null;const cells=[];for(let i=t;i!==-1;i=prev[i]){const j=i%nx;cells.push([x0+j*cs,z0+(i-j)/nx*cs]);}cells.reverse();
  const los=(p,r)=>{const d=Math.hypot(r[0]-p[0],r[1]-p[1]),n=Math.max(1,Math.ceil(d/.04));for(let i=1;i<=n;i++){if(owiHit(col,p[0]+(r[0]-p[0])*i/n,p[1]+(r[1]-p[1])*i/n,m,R-.015))return false;}return true;};
  /* (between two cells the grid answers: every sample's four cells free - the colliders were laid on it with the walking radius already) */
  const losG=(p,r)=>{const d=Math.hypot(r[0]-p[0],r[1]-p[1]),n=Math.max(1,Math.ceil(d/.04));for(let i=0;i<=n;i++){const x=(p[0]+(r[0]-p[0])*i/n-x0)/cs,z=(p[1]+(r[1]-p[1])*i/n-z0)/cs,j=Math.floor(x+1e-6),k=Math.floor(z+1e-6);
      if(j<0||k<0||j>=nx||k>=nz)return false;const j2=Math.min(nx-1,j+(x-j>1e-6?1:0)),k2=Math.min(nz-1,k+(z-k>1e-6?1:0));if(!free[k*nx+j]||!free[k*nx+j2]||!free[k2*nx+j]||!free[k2*nx+j2])return false;}return true;};
  /* the real ends where they can be walked to straight from the grid */
  const pts=cells.slice();if(los(a,pts[0])||Math.hypot(a[0]-pts[0][0],a[1]-pts[0][1])<.1)pts[0]=a;else pts.unshift(a);const endIn=los(pts[pts.length-1],c);if(endIn)pts.push(c);
  const ok=(i,k)=>(i===0&&pts[0]===a)||(k===pts.length-1&&endIn)?los(pts[i],pts[k]):losG(pts[i],pts[k]);
  const out=[pts[0]];let i=0;while(i<pts.length-1){let k=pts.length-1;while(k>i+1&&!ok(i,k))k--;out.push(pts[k]);i=k;}return out;}
/* the nearest free cell of a grid to a point (within 6 cells), or -1 */
function vilHCell(g,x,z){const{x0,z0,nx,nz,cs,free}=g,j0=Math.round((x-x0)/cs),k0=Math.round((z-z0)/cs);let best=-1,bd=1e9;for(let k=Math.max(0,k0-6);k<=Math.min(nz-1,k0+6);k++)for(let j=Math.max(0,j0-6);j<=Math.min(nx-1,j0+6);j++){if(!free[k*nx+j])continue;const d=(j-j0)**2+(k-k0)**2;if(d<bd){bd=d;best=k*nx+j;}}return best;}
/* the cells of each floor a villager can reach from the front door (the ground floor from the spot inside the door, each floor above from the top of a flight whose foot is reached), or null while the
   grids are still being made (one a frame). A bed none of whose sides is among them is not given out (the furniture can close a bed in) */
function vilHReach(b){const ic=b.ic;if(ic.vr)return ic.vr;const P=ic.P,n=P.floors.length,G=ic.vg||(ic.vg=[]);if(!b.vd||!b.vd.ok)return null;
  for(let lv=0;lv<n;lv++)if(!G[lv]){if(VILH.tok>0)return null;VILH.tok++;vilHGrid(b,lv);return null;}
  const R=[],fill=(lv,from)=>{const g=G[lv],{nx,nz,free}=g,M=R[lv]||(R[lv]=new Uint8Array(nx*nz)),s0=vilHCell(g,from[0],from[1]);if(s0<0||M[s0])return;M[s0]=1;const q=[s0];
    for(let h=0;h<q.length;h++){const i=q[h],j=i%nx,k=(i-j)/nx;for(let dk=-1;dk<=1;dk++)for(let dj=-1;dj<=1;dj++){if(!dj&&!dk)continue;const J=j+dj,K=k+dk;if(J<0||K<0||J>=nx||K>=nz)continue;const id=K*nx+J;if(M[id]||!free[id])continue;if(dj&&dk&&(!free[k*nx+J]||!free[K*nx+j]))continue;M[id]=1;q.push(id);}}};
  fill(0,b.vd.I);
  for(let lv=0;lv<n-1;lv++)for(const f of P.stairs){if(f.from!==lv||!R[lv])continue;const xc=(f.x0+f.x1)/2,sg=Math.sign(f.zt-f.zb),i=vilHCell(G[lv],xc,f.zb-sg*.45);if(i>=0&&R[lv][i])fill(f.to,[xc,f.zt+sg*.45]);}
  return ic.vr=R;}
/* from (la, a) to (lb, c): the floors' ways and the flights between them, as steps of the door script ({to, lv}; st on a flight) */
function vilHRoute(b,la,a,lb,c){const P=b.ic.P,out=[];let lv=la,cur=a;VILH.stats.routes++;
  for(let guard=0;lv!==lb&&guard<6;guard++){const up=lb>lv,f=P.stairs.find(f=>up?f.from===lv:f.to===lv);if(!f)return null;
    const xc=(f.x0+f.x1)/2,sg=Math.sign(f.zt-f.zb),mouth=[xc,f.zb-sg*.45],top=[xc,f.zt+sg*.45];
    const p=vilHPath(b,lv,cur,up?mouth:top);if(!p)return null;for(const q of p.slice(1))out.push({to:q,lv});
    if(up){out.push({to:[xc,f.zb-sg*.1],lv},{to:[xc,f.zt],lv:f.to,st:1},{to:top,lv:f.to});cur=top;lv=f.to;}
    else{out.push({to:[xc,f.zt],lv},{to:[xc,f.zb-sg*.1],lv:f.from,st:1},{to:mouth,lv:f.from});cur=mouth;lv=f.from;}}
  if(lv!==lb)return null;const p=vilHPath(b,lv,cur,c);if(!p)return null;for(const q of p.slice(1))out.push({to:q,lv});return out;}
/* the level a villager walking inside is on (as owiHeroY: on a flight, the lower floor until half way up) */
function vilHLv(b,lx,lz,lv){const P=b.ic&&b.ic.P;if(!P)return lv;for(const f of P.stairs){if(lv!==f.from&&lv!==f.to)continue;if(lx>=f.x0-.02&&lx<=f.x1+.02&&lz>=f.z0-.001&&lz<=f.z1+.001){const t=(lz-f.zb)/(f.zt-f.zb);return t<.5?f.from:f.to;}}return lv;}
/* where a villager stands to get into its bed: beside it at the hips (its own side of a double bed first), the other side, else at the foot - the first of them that is free and on the grid
   (vilHSides: all of them that are, for the route to try in turn; the one it used is kept for getting up) */
function vilHSide(sl,p){if(p&&p.vhSide&&p.vhSide.sl===sl)return p.vhSide.q;const L=vilHSides(sl);return L.length?L[0]:null;}
function vilHSides(sl){const g=vilHGeo(sl),b=sl.b,col=b.ic.col,m=1<<sl.lv,hip=vilHHip(sl);
  /* (from the place's middle line: its own edge is hw away, the far edge of a double bed's half 3w/4; a bedroll is reached from either side) */
  const sd0=sl.side||1,near=g.hw+(sl.it?.36:.33),far=(sl.side?3*g.w/4:g.hw)+(sl.it?.36:.33);
  const cand=[[hip[0]+g.sx*sd0*near,hip[1]+g.sz*sd0*near],[hip[0]-g.sx*sd0*far,hip[1]-g.sz*sd0*far],[g.cx-g.hx*(g.d/2+.38),g.cz-g.hz*(g.d/2+.38)]];
  const G=vilHGrid(b,sl.lv),M=b.ic.vr&&b.ic.vr[sl.lv],out=[];for(const q of cand){if(owiHit(col,q[0],q[1],m,VILH.R-.02))continue;const j=Math.round((q[0]-G.x0)/G.cs),k=Math.round((q[1]-G.z0)/G.cs);if(j<0||k<0||j>=G.nx||k>=G.nz)continue;
    if(b.ic.vr){const i=vilHCell(G,q[0],q[1]);if(!M||i<0||!M[i])continue;}out.push(q);}
  return out;}
/* the hips of a villager lying in the place (its head a little short of the head end) */
const vilHHead=sl=>sl.it?.22:.12;/* (the head on the middle of its pillow: furniture4.js lays a bed's .29 from the head end, a bedroll's .2) */
function vilHHip(sl){const g=vilHGeo(sl),L=vilHDims().L,hh=vilHDims().hip,a=g.d/2-vilHHead(sl)-(L-hh);return[g.cx+g.hx*a,g.cz+g.hz*a];}
/* the figure's height and the height of its hips over its feet, and how far its back is behind the line of its joints (from the villager template, else the old figure's) */
function vilHDims(){if(VILH.dims)return VILH.dims;let L=1.5,hip=.78,back=.1;for(const k in VIL_TPL){const T=VIL_TPL[k];if(!T||!T.geo||!T.geo.boundingBox)continue;const bb=T.geo.boundingBox,sc=2.78;L=bb.max.y*sc;hip=T.rest[0][1]*sc;back=Math.max(.06,Math.min(.16,-bb.min.z*sc*.8));break;}
  return VILH.dims={L,hip,back};}

/* ---- the evening and the morning ---- */
/* the far side of the world: nobody sees the door, so it is not swung (a door far from the hero is shut by owdTick anyway) */
const vilHFar=b=>{const H=heroU,cx=camera.position.x,cz=camera.position.z;return Math.min(H?Math.hypot(b.x-H.x,b.z-H.z):1e9,Math.hypot(b.x-cx,b.z-cz))>VILH.FAR;};
/* send a villager home (vilDecide asks first): to the front of its house; a long way in a big town in hops of 25 m (the search is capped) */
function vilHGo(v,p,keep){if(!vilHHome(v,p))return false;const sl=p.vh.slot,b=sl.b,d=vilDoor(v,b);if(!d)return false;
  if(p.vb)vilRelease(p);p.job='home';p.carry=false;p.hop=keep?(p.hop||0):0;p.tx=d.Aw[0];p.tz=d.Aw[1];p.mode='plan';return true;}
/* no way found to the front of the house (a long one, beyond the search's cap): a hop 25 m towards it */
function vilHHop(v,p){if(p.job!=='home'||(p.hop||0)>12)return false;const d=p.vh.slot.b.vd;if(!d)return false;const dx=d.Aw[0]-p.x,dz=d.Aw[1]-p.z,L=Math.hypot(dx,dz);if(L<3)return false;
  const k=Math.min(1,25/L),q=vilSnap(v,p.x+dx*k,p.z+dz*k,6);if(!q)return false;p.hop=(p.hop||0)+1;p.tx=q[0];p.tz=q[1];p.mode='plan';p.hopTo=true;return true;}
/* at the front of the house: in, and to bed */
function vilHIn(v,p){const sl=p.vh.slot,b=sl.b,d=b.vd;if(!d||!d.ok)return false;vilHClaim(p,b);
  p.ds={b,k:0,t:0,op:false,home:true,q:[{to:d.Fo},{to:d.D},{act:'open'},{to:d.I,inB:true,lv:0,door:1},{act:'shut'},{act:'route',dest:'bed'},{act:'lie'},{act:'sleep'},{act:'rise'},{act:'route',dest:'door'},{act:'open'},{to:d.D,inB:false,lv:0,door:1},{to:d.Fo},{act:'shutFar'},{to:d.A},{act:'done'}]};
  p.mode='door';p.lv=0;return true;}
/* the villagers going in and out of a house (vilInDoor: no door is shut on any of them) */
function vilHClaim(p,b){(b.vIn||(b.vIn=new Set())).add(p);}
function vilHRelease(p){if(p.ds&&p.ds.b&&p.ds.b.vIn)p.ds.b.vIn.delete(p);if(p.inB&&p.inB.vIn)p.inB.vIn.delete(p);}
/* the steps of the door script that are this file's (true when handled) */
function vilHAct(v,p,s,st,dt){const b=s.b,next=()=>{s.k++;s.t=0;s.tTry=0;};
  if(st.act==='route'){if(st.q){next();return true;}
    const sl=p.vh&&p.vh.slot;if(!sl||sl.b!==b){s.q.splice(s.k,1);return true;}
    {/* the grids of the floors on the way, one a frame for all the villages together (each 1-3 ms; the route itself is cheap) */const G=b.ic.vg||[],top=Math.max(p.lv||0,st.dest==='bed'?sl.lv:0);for(let lv=0;lv<=top;lv++)if(!G[lv]){if(VILH.tok>0)return true;VILH.tok++;vilHGrid(b,lv);return true;}}
    const here=owiW2L(b,p.x,p.z);let R=null;
    if(st.dest==='bed'){for(const q of vilHSides(sl)){R=vilHRoute(b,p.lv||0,here,sl.lv,q);if(R){p.vhSide={sl,q};R.push({act:'face',sl});break;}}}
    else R=vilHRoute(b,p.lv||0,here,0,b.vd.I);
    if(!R){VILH.stats.noRoute++;/* no way to the bed: it sleeps where it stands (on the ground floor, by the door, sitting it out), or goes out */
      if(st.dest==='bed'){s.q.splice(s.k,1);const i=s.q.findIndex(q=>q.act==='lie');if(i>=0)s.q.splice(i,1,{act:'stay',t:1e9,night:true});const j=s.q.findIndex(q=>q.act==='rise');if(j>=0)s.q.splice(j,1);}else{s.q.splice(s.k,1);}return true;}
    st.q=true;s.q.splice(s.k+1,0,...R);next();return true;}
  if(st.act==='face'){const g=vilHGeo(st.sl),hip=vilHHip(st.sl),w=owiL2W(b,hip[0],hip[1]);p.yaw=lerpAng(p.yaw,Math.atan2(w[0]-p.x,w[1]-p.z),1-Math.exp(-8*dt));if(s.t>.35)next();return true;}
  if(st.act==='lie'){p.lieS=p.vh.slot;p.lieK=Math.min(2,(p.lieK||0)+dt/(p.lieK<1?.9:1.1));if(p.lieK>=2){p.lieK=2;next();}return true;}
  if(st.act==='sleep'){if(!vilHBedtime(v,p))next();return true;}
  if(st.act==='rise'){p.lieK=Math.max(0,(p.lieK||0)-dt/(p.lieK>1?1.1:.9));if(p.lieK<=0){p.lieK=0;p.lieS=null;const sd=vilHSide(p.vh.slot,p);if(sd){const w=owiL2W(b,sd[0],sd[1]);p.x=w[0];p.z=w[1];}p.yawP=p.yaw;next();}return true;}
  if(st.act==='stay'&&st.night){if(!vilHBedtime(v,p))next();else{if(st.yaw==null)st.yaw=b.rot+Math.PI+(Math.random()-.5)*2.2;p.yaw=lerpAng(p.yaw,st.yaw,1-Math.exp(-3*dt));}return true;}
  return false;}
/* put a villager straight into its bed (the village has just come near at night, or the game was loaded at night: nobody saw it walk home) */
function vilHPutInBed(v,p){const sl=p.vh.slot,b=sl.b;if(!b.vd||!b.vd.ok||!owiLive(b))return false;vilRelease(p);vilHClaim(p,b);
  /* (the place it gets up from: one the way to the door is known from) */let side=null;for(const q of vilHSides(sl))if(vilHRoute(b,sl.lv,q,0,b.vd.I)){side=q;break;}if(!side)return false;p.vhSide={sl,q:side};const w=owiL2W(b,side[0],side[1]),d=b.vd;p.x=w[0];p.z=w[1];p.lv=sl.lv;p.inB=b;p.y=null;p.vel=0;p.velA=0;p.spd=0;p.path=null;p.job='home';p.lieS=sl;p.lieK=2;
  p.ds={b,k:0,t:0,op:false,home:true,q:[{act:'sleep'},{act:'rise'},{act:'route',dest:'door'},{act:'open'},{to:d.D,inB:false,lv:0,door:1},{to:d.Fo},{act:'shutFar'},{to:d.A},{act:'done'}]};p.mode='door';return true;}
/* every frame, for each villager: bedtime breaks off what it is doing (not a door it is in the middle of: a call cut short); a village that was not watched puts its sleepers straight to bed */
function vilHTick(v,p,dt,jump){if(!p.vh||!p.vh.slot)return;const home=vilHHome(v,p);
  if(home){if(jump&&!(p.ds&&p.ds.home)){vilHPutInBed(v,p);return;}
    if(p.ds&&!p.ds.home){const st=p.ds.q[p.ds.k];if(st&&st.act==='stay'&&st.t>2)st.t=Math.min(st.t,p.ds.t+1);return;}
    if(p.job!=='home'&&(p.mode==='idle'||p.mode==='walk'||p.mode==='plan')&&!p.carry)vilHGo(v,p);}}
/* is the villager drawn? (inside a house whose rooms are not built - far off - it would stand in nothing behind the glass; above the hero's floor in the house the hero is in, the cutaway takes that floor away) */
function vilHShown(p){const b=p.inB;if(!b)return true;if(!b.ic||!b.ic.grp)return false;if(OWI.in&&OWI.cb===b&&(p.lv||0)>OWI.lv)return false;return true;}

/* ---- lying down: stand at the side -> sit on the bed (hips on the mattress, legs along it, facing its foot) -> lie back (the hips stay, the head goes to the pillow) ---- */
const _vhQ0=new THREE.Quaternion(),_vhQ1=new THREE.Quaternion(),_vhQ2=new THREE.Quaternion(),_vhM=new THREE.Matrix4(),_vhV=new THREE.Vector3(),_vhY=new THREE.Vector3(0,1,0),_vhX=new THREE.Vector3(),_vhH=new THREE.Vector3(),_vhZ=new THREE.Vector3();
function vilHPose(v,p,dt,tt){const sl=p.lieS,b=sl.b,g=vilHGeo(sl),Dm=vilHDims(),k=p.lieK,sc=p.g.scale.x||2.78,P=b.ic.P,fy=b.hi+P.floors[sl.lv].y,mat=vilHMat(sl);
  const c=Math.cos(b.rot),s=Math.sin(b.rot),hx=g.hx*c+g.hz*s,hz=-g.hx*s+g.hz*c;/* (the head's way in the world) */
  const hip=vilHHip(sl),hw=owiL2W(b,hip[0],hip[1]),hy=fy+mat+.08;
  /* the three poses' turns: standing (facing the bed), sitting (upright, facing the foot), lying (up = to the head, front = up) */
  _vhQ0.setFromAxisAngle(_vhY,p.yaw);_vhQ1.setFromAxisAngle(_vhY,Math.atan2(-hx,-hz));
  _vhX.set(-hz,0,hx);_vhH.set(hx,0,hz);_vhZ.set(0,1,0);_vhM.makeBasis(_vhX,_vhH,_vhZ);_vhQ2.setFromRotationMatrix(_vhM);
  const sm=x=>x*x*(3-2*x),e1=sm(Math.min(1,k)),e2=sm(Math.max(0,k-1)),hipL=p.T&&p.T.rest?p.T.rest[0]:[0,Dm.hip/sc,0];
  const q=p.g.quaternion;if(k<=1)q.copy(_vhQ0).slerp(_vhQ1,e1);else q.copy(_vhQ1).slerp(_vhQ2,e2);
  /* the hips: from over the feet where it stands to the place on the mattress (a little lift on the way), then they stay */
  const sy=p.y==null?fy:p.y,h0x=p.x,h0y=sy+Dm.hip,h0z=p.z;let Hx,Hy,Hz;if(k<=1){Hx=h0x+(hw[0]-h0x)*e1;Hz=h0z+(hw[1]-h0z)*e1;Hy=h0y+(hy-h0y)*e1+.06*Math.sin(Math.PI*e1);}else{Hx=hw[0];Hy=hy;Hz=hw[1];}
  _vhV.set(hipL[0]*sc,hipL[1]*sc,hipL[2]*sc).applyQuaternion(q);p.g.position.set(Hx-_vhV.x,Hy-_vhV.y,Hz-_vhV.z);
  /* the body: legs forward to sit (thighs up to the hips' level), straight again lying; hands by the hips, then along the body; the head on the pillow; breathing */
  if(!p.T||!p.T.leg)return;const R=p.T.rest,sit=k<=1?e1:1-e2,ly=e2,br=Math.sin(tt*1.1+(p.vk?p.vk.ip:0));
  p.body.position.set(R[0][0],R[0][1],R[0][2]);p.body.rotation.set(0,0,0);
  if(p.legL.rotation.order!=='ZYX')p.legL.rotation.order=p.legR.rotation.order='ZYX';
  const th=-1.5*sit-.06*ly,kn=.08*sit+.12*ly;p.legL.rotation.set(th,0,.03*ly);p.legR.rotation.set(th,0,-.03*ly);p.shinL.rotation.x=kn;p.shinR.rotation.x=kn*.8;p.footL.rotation.x=.95*ly-.15*sit;p.footR.rotation.x=.9*ly-.15*sit;/* (lying, the toes fall forward along the bed) */
  const pl=.2;/* (a double bed's two pillows lie side by side, furniture4.js; the head lies in its pillow, not propped over it: vilHCover) */p.chest.rotation.set(.12*sit+(pl+.015*br)*ly,0,0);p.head.rotation.set(.1*sit+.22*ly,.15*ly*Math.sin((p.vh?p.vh.i:0)*2.1),0);/* (the shoulders and head propped on the pillow) */
  p.armL.rotation.set(.25*sit+.05*ly,0,.12+.06*ly);p.armR.rotation.set(.25*sit+.05*ly,0,-.12-.06*ly);p.foreL.rotation.set(-.35*sit-.18*ly,0,0);p.foreR.rotation.set(-.35*sit-.25*ly,0,0);
  p.wk=0;p.dropS=null;if(p._a){p._a[0]=null;p._a[1]=null;}}
/* one asleep on a bedroll stops the hero like a post (a bed's own collider does that for a bed): three circles along the body */
function vilHBlock(p){const sl=p.lieS;if(!sl||sl.it||(p.lieK||0)<1.5)return;const H=heroU;if(!H||!OW.on||H.dead||!OWI.in||OWI.cb!==sl.b||OWI.lv!==sl.lv)return;
  const b=sl.b,g=vilHGeo(sl),l=owiW2L(b,H.x,H.z),m=(OWI.RAD||.27)+.26;
  for(const t of[-.6,0,.55]){const cx=g.cx+g.hx*t,cz=g.cz+g.hz*t;let dx=l[0]-cx,dz=l[1]-cz,d=Math.hypot(dx,dz);if(d>=m)continue;if(d<1e-3){dx=g.sx;dz=g.sz;d=1;}
    const nx=cx+dx/d*m,nz=cz+dz/d*m,w=owiL2W(b,nx,nz);if(owiValid(w[0],w[1])){H.x=w[0];H.z=w[1];l[0]=nx;l[1]=nz;}}}
/* ---- a sleeper's own covers ----
   When a villager lies still in its place (lieK 2), the made bedding of its bed - or of its half of a double bed, or the bedroll's own blanket and pillow - is put away (vilHBedSync, vilHRollBed) and its own covers
   lie over it: a blanket over the body from just under the chin to past the feet, falling over the sides of the mattress (not between the halves of a double bed) and over the foot where the bed has no footboard,
   the sheet turned down over its top edge; and its pillow, pressed in where the head lies (it rises to meet a head propped higher, and the head sinks into it). Both are shaped from where the body really is: the
   skinned vertices of its figure, read once it lies still, laid on a 5 cm grid over the place (the highest point of the body in each cell), the blanket a rolling dome over them. They are built in the house's frame
   with the house's furniture material (the light grid is found from the vertices' own positions, lightmap.js vLp), in the house's interior group. One is made in a frame at most (a few ms); until then the made
   bedding stays and the sleeper lies on it. */
const VILHC={cs:.05,t:.022,R:.32,band:.13,last:0,stats:{made:0,ms:0}};
const _vhcV=new THREE.Vector3();
function vilHCover(v,p,sl,on){const b=sl&&sl.b,ic=b&&b.ic,grp=ic&&ic.grp,c=p.vhCov;
  if(!(on&&grp&&(p.lieK||0)>=1.97&&p.g.visible)){if(c)c.visible=false;vilHRollBed(p,true);return;}
  const key=(sl.it?sl.it.bc+':'+sl.it.bv:'r')+':'+vilHMat(sl)+':'+p.g.scale.x.toFixed(3)+':'+(sl.side||0);
  if(c&&c.parent===grp&&c.userData.sl===sl&&c.userData.key===key){c.visible=true;vilHRollBed(p,false);vilHBedHook(b);return;}
  const now=performance.now();if(now-VILHC.last<12)return;VILHC.last=now;/* (one a frame at most) */
  if(c){if(c.parent)c.parent.remove(c);c.geometry.dispose();c.material.dispose();p.vhCov=null;}
  const t0=performance.now(),m=vilHCoverMake(p,sl);VILHC.stats.made++;VILHC.stats.ms+=performance.now()-t0;if(!m)return;
  m.userData.sl=sl;m.userData.key=key;grp.add(m);p.vhCov=m;(ic.vcov||(ic.vcov=new Set())).add(m);vilHRollBed(p,false);vilHBedHook(b);}
/* a bedroll's own blanket and pillow are put away while the covers lie over its sleeper */
function vilHRollBed(p,show){const r=p.vhRoll;if(r&&r.children.length>2){r.children[1].visible=show;r.children[2].visible=show;}}
/* the furniture mesh of a house hides the made bedding of every place whose sleeper's covers are out - checked as it is drawn, since vilnav.js puts a cover away with its villager */
function vilHBedHook(b){const fm=b.ic&&b.ic.fmesh;if(fm&&fm.userData.bedB!==b){fm.userData.bedB=b;fm.onBeforeRender=vilHBedSync;}}
function vilHBedSync(){const b=this.userData.bedB,ic=b&&b.ic;if(!ic||ic.fmesh!==this)return;const BR=ic.bedR;let sig='';const hid=[];
  if(ic.vcov)for(const c of ic.vcov){if(c.parent!==ic.grp){ic.vcov.delete(c);continue;}if(!c.visible)continue;const sl=c.userData.sl,t=sl&&sl.it&&BR&&BR.get(sl.it),r=t&&t[sl.side||0];if(r){hid.push(r);sig+=r[0]+',';}}
  if(sig===(this.userData.bedSig||''))return;this.userData.bedSig=sig;const at=this.geometry.attributes.aE;if(!at||!BR)return;const A=at.array;
  for(const t of BR.values())for(const k in t){const r=t[k];for(let i=0;i<r.length;i+=2)A.fill(0,r[i],r[i]+r[i+1]);}
  for(const r of hid)for(let i=0;i<r.length;i+=2)A.fill(-1,r[i],r[i]+r[i+1]);at.needsUpdate=true;}
/* the covers of one sleeper: one mesh (the blanket and the pillow), or null for a figure without a skinned mesh (the old box figures keep the made bedding) */
function vilHCoverMake(p,sl){const b=sl.b,P=b.ic.P,F=P.floors[sl.lv],it=sl.it,o=it||sl.f,g=vilHGeo(sl);
  let sk=null;p.g.traverse(q=>{if(q.isSkinnedMesh&&(!sk||q.geometry.attributes.position.count>sk.geometry.attributes.position.count))sk=q;});if(!sk||!p.head)return null;
  /* the place in its own frame: x across, z from its head end (-d/2) to its foot, y over its mattress (as the furniture draws it) */
  const cr=Math.cos(o.rot),sr=Math.sin(o.rot),W=g.w,D=g.d,y0=F.y+vilHMat(sl),toL=V=>{const l=owiW2L(b,V.x,V.z),dx=l[0]-o.x,dz=l[1]-o.z;return[dx*cr-dz*sr,V.y-b.hi-y0,dx*sr+dz*cr];};
  /* the body: every skinned vertex where it lies now */
  p.g.updateMatrixWorld(true);const n=sk.geometry.attributes.position.count,X=new Float32Array(n),Y=new Float32Array(n),Z=new Float32Array(n);
  for(let i=0;i<n;i++){sk.boneTransform(i,_vhcV);_vhcV.applyMatrix4(sk.matrixWorld);const q=toL(_vhcV);X[i]=q[0];Y[i]=q[1];Z[i]=q[2];}
  p.head.getWorldPosition(_vhcV);const hz=toL(_vhcV)[2];/* (the head's joint: the top of the neck) */
  const kind=it?it.kind:'roll',dbl=kind==='bed2',side=sl.side||0,bv=it?it.bv:-1,mw=kind==='pallet'||kind==='roll'?W:W-.1;
  const xa=dbl&&side>0?0:-mw/2,xb=dbl&&side<0?0:mw/2,footboard=(kind==='bed1'||dbl)&&bv!==1,drop=kind==='roll'?.05:kind==='pallet'?.06:bv===1?.1:.12;
  const sL=!(dbl&&side>0),sR=!(dbl&&side<0),sF=!footboard,zTop=Math.max(-D/2+.3,hz+.05),zEnd=D/2-(footboard?.085:kind==='bed1'||dbl?.06:.02);
  /* the highest point of the body over each cell of the blanket's reach, then the blanket: a rolling dome over it, softened once, never under what it covers */
  const cs=VILHC.cs,nx=Math.max(3,Math.ceil((xb-xa)/cs)+1),nz=Math.max(3,Math.ceil((zEnd-zTop)/cs)+1),dx=(xb-xa)/(nx-1),dz=(zEnd-zTop)/(nz-1),H=new Float32Array(nx*nz).fill(-1);
  for(let i=0;i<n;i++){if(Z[i]<zTop-.05)continue;const ci=Math.max(0,Math.min(nx-1,Math.round((X[i]-xa)/dx))),cj=Math.max(0,Math.min(nz-1,Math.round((Z[i]-zTop)/dz))),k=cj*nx+ci;if(Y[i]>H[k])H[k]=Y[i];}
  const base=.024,t=VILHC.t,rc=Math.ceil(VILHC.R/cs),S=new Float32Array(nx*nz);
  S.fill(base);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const h=H[j*nx+i];if(h<0)continue;/* (each cell the body reaches spreads its dome round it) */
    for(let jj=Math.max(0,j-rc);jj<=Math.min(nz-1,j+rc);jj++)for(let ii=Math.max(0,i-rc);ii<=Math.min(nx-1,i+rc);ii++){const d=Math.hypot((ii-i)*dx,(jj-j)*dz),q=h+t+.012-(d<=.04?0:(d-.04)*.9),k=jj*nx+ii;if(q>S[k])S[k]=q;}}
  const T=new Float32Array(nx*nz);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let a=0,w=0;for(let jj=j-1;jj<=j+1;jj++)for(let ii=i-1;ii<=i+1;ii++){if(ii<0||jj<0||ii>=nx||jj>=nz)continue;a+=S[jj*nx+ii];w++;}const k=j*nx+i;T[k]=Math.max(a/w,H[k]+t+.006,base);}
  /* the blanket's grid: the falls over the sides and the foot, a rolled top edge, the sheet turned down over it (a strip of linen, 4 mm proud) */
  const cols=[],rows=[];if(sL)cols.push([xa-.02,-1,0],[xa-.012,-2,0]);for(let i=0;i<nx;i++)cols.push([xa+i*dx,0,i]);if(sR)cols.push([xb+.012,-2,nx-1],[xb+.02,-1,nx-1]);
  rows.push([zTop-.016,-3,0]);for(let j=0;j<nz;j++)rows.push([zTop+j*dz,0,j]);if(sF)rows.push([zEnd+.012,-2,nz-1],[zEnd+.02,-1,nz-1]);
  const top=(ci,rj)=>{const c=cols[ci],r=rows[rj];let y=T[r[2]*nx+c[2]];if(r[0]<zTop+VILHC.band)y+=.004;const yc=c[1]===-1?-drop:c[1]===-2?y-.03:y,yr=r[1]===-1?-drop:r[1]===-2?y-.03:r[1]===-3?y-.018:y;return[c[0],Math.min(yc,yr),r[0]];};
  const B=owbShellRaw(cols.length,rows.length,top,t);
  const bc=it&&it.bc!=null?it.bc:[0x7a4a3a,0x4a5a6a,0x5a6a3a,0x6a4a5a][Math.floor(owHash2(b.x*3|0,b.z*5|0)*4)],lin=it&&it.pc!=null?it.pc:0xe0d4b4,NB=cols.length*rows.length;
  const bcol=B.V.map((q,k)=>{const rj=Math.floor((k%NB)/cols.length);return rows[rj][0]<zTop+VILHC.band?lin:bc;});
  /* the pillow: where the place's own pillow lies, a dome pressed in under the head (the head's vertices make the hollow: each a little bowl round its lowest point) */
  const pw=kind==='pallet'||kind==='roll'?W-.2:dbl?mw/2-(bv===1?.16:.14):W-(bv===1?.32:.26),pd=kind==='pallet'?.3:kind==='roll'?.26:.36,ph=kind==='pallet'?.09:kind==='roll'?.07:bv===1?.1:.13;
  const pcx=(xa+xb)/2,pcz=Math.max(-D/2+(kind==='roll'||kind==='pallet'?.02:.085)+pd/2,hz-.05),hx=[],hy=[],hzz=[];let low=1e9;/* (centred under the head: the bed's own pillow is put away meanwhile) */
  for(let i=0;i<n;i++){if(Z[i]>hz+.02||Y[i]<-.03)continue;if(Math.abs(X[i]-pcx)>pw/2+.04||Math.abs(Z[i]-pcz)>pd/2+.04)continue;hx.push(X[i]);hy.push(Y[i]);hzz.push(Z[i]);if(Y[i]<low)low=Y[i];}
  const ph2=hx.length?Math.min(.24,Math.max(ph,low+.04)):ph,px=11,pz=9;
  const ptop=(i,j)=>{const u=i/(px-1)*2-1,w=j/(pz-1)*2-1,e=Math.sqrt(Math.max(0,(1-Math.pow(Math.abs(u),3))*(1-Math.pow(Math.abs(w),3)))),x=pcx+u*pw/2,z=pcz+w*pd/2;const dm=ph2*(.3+.7*e);let c=1e9;
    for(let k=0;k<hx.length;k++){const q=hy[k]-.004+6*((hx[k]-x)*(hx[k]-x)+(hzz[k]-z)*(hzz[k]-z));if(q<c)c=q;}
    /* pressed in where the head lies, and pushed up into a lip round the hollow */const y=c<dm?c:dm+.022*e*Math.max(0,1-(c-dm)/.06);return[x,Math.max(.02,y)+.002,z];};
  const PL=owbShellRaw(px,pz,ptop,(i,j)=>{const u=i/(px-1)*2-1,w=j/(pz-1)*2-1;return[pcx+u*(pw/2-.02),.002,pcz+w*(pd/2-.02)];});
  const pcol=it?(dbl&&side>0&&it.pc2!=null?it.pc2:lin):0xd8c898;
  /* one geometry in the house's frame */
  const V=B.V.concat(PL.V),I=B.I.concat(PL.I.map(k=>k+B.V.length)),pos=new Float32Array(V.length*3),col=new Float32Array(V.length*3),C=new THREE.Color();
  V.forEach((q,k)=>{pos[k*3]=o.x+q[0]*cr+q[2]*sr;pos[k*3+1]=y0+q[1];pos[k*3+2]=o.z-q[0]*sr+q[2]*cr;C.setHex(k<B.V.length?bcol[k]:pcol);col[k*3]=C.r;col[k*3+1]=C.g;col[k*3+2]=C.b;});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('aE',new THREE.BufferAttribute(new Float32Array(V.length),1));geo.setIndex(I);geo.computeVertexNormals();geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,owiMaterial(b));m.castShadow=false;m.receiveShadow=true;return m;}
/* the bedroll of a villager who sleeps on the floor: out while it lies on it */
function vilHRoll(v,p){const sl=p.lieS||(p.vh&&p.vh.slot),k=p.lieK||0,vis=p.g.visible&&!!p.lieS;vilHCover(v,p,sl,vis&&k>1.7);const on=!!(vis&&!p.lieS.it&&k>.3);
  if(!on){if(p.vhRoll)p.vhRoll.visible=false;return;}
  if(!p.vhRoll){const r=VILH.ROLL,g=new THREE.Group(),h=owHash2(sl.b.x*3|0,sl.b.z*5|0);const mat=new THREE.Mesh(box(r.w,.05,r.d),new THREE.MeshLambertMaterial({color:0xb89a58}));mat.position.y=.025;g.add(mat);
    const bl=new THREE.Mesh(box(r.w-.04,.04,r.d*.5),new THREE.MeshLambertMaterial({color:[0x7a4a3a,0x4a5a6a,0x5a6a3a,0x6a4a5a][Math.floor(h*4)]}));bl.position.set(0,.07,r.d*.18);g.add(bl);
    const pw=new THREE.Mesh(box(r.w-.2,.06,.26),new THREE.MeshLambertMaterial({color:0xd8c898}));pw.position.set(0,.065,-r.d/2+.2);g.add(pw);g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});v.g.add(g);p.vhRoll=g;}
  const g=vilHGeo(sl),b=sl.b,w=owiL2W(b,g.cx,g.cz);p.vhRoll.position.set(w[0],b.hi+b.ic.P.floors[0].y+.004,w[1]);p.vhRoll.rotation.set(0,sl.f.rot+b.rot,0);p.vhRoll.visible=true;}

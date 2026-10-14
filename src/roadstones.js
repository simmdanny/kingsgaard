/* ---------- city roads: individual paving stones (environment upgrade 01) ----------
   The streets, lanes and roads of the settlements (the paths the ground network marks `city`: the towns and cities, and the heart of a village as far as it is paved) are paved with real
   stones instead of a pattern painted on the ground.
   Every stone is a small convex slab of its own (about 0.38 by 0.23 m: OWR.LEN, OWR.DEPTH): a flat top a little tilted and raised in the middle, 2 cm above its bed, a chamfer all round down to
   the bed, and a joint to its neighbours where the bed shows (the ground tile under the stones is lowered 2 cm and turns into dark sand and mortar, OW_GGLSL; the stones' tops are where the
   painted road was, so feet stand on them as before). The stones are laid in courses across the road, by the distance along the path (`s`) and the distance from its
   middle (`l`), so the pattern follows every bend and never starts again at the joint of two segments: the depth of each course, the length of each stone and the offset of each course against
   the last (a running bond) come from a hash of the path and the course, so no two stretches repeat. The corners of every stone are moved a little, its height and tilt vary by millimetres and
   its colour by a few per cent (a few are darker or warmer, the edges are a touch lighter where they are worn). Paths with curbs have an edge course of long darker stones along each side.
   Where paths meet, one is laid through and the other stops at its edge: a street before a road before a lane, then the wider path, then the older one; the stones of the one that stops are cut
   along the edge of the other (and a curbed path leaves out its edge course in the mouth of the other), so nothing overlaps and nothing is left open. The stones end at the squares (they keep
   their own paving) and where the paving of the road ends (a clean course across, beyond it the road as it was).
   The stones are visual only: walking, the grid and the generator never see them, and nothing here draws from the world's random stream.
   Cost: one merged mesh per ground tile (32 m) for the tiles within OWR.GEO m of the focus, baked OWR.MS milliseconds a frame, the nearest tile first (owrBake is a generator; all at once when
   the view is forced), drawn with the material of the settlements (owrMat: VCMAT's program) right after the ground tiles, shadows received but not cast. Within OWR.NEAR m every stone has its
   chamfer and its raised middle (12 triangles for a rectangle), beyond that only its top (2): the two are index ranges of one geometry. A ground tile knows whether its stones are built (the
   sign of its aSt, owrMark): under built stones its bed is sand and mortar, elsewhere (far away, or not baked yet) it paints the stones (gSett, the same courses), so no street is ever bare.
   Where a path lies deep inside another that goes through (the roads that run along the streets), its stones are not even made (the stretch of each course inside the other, per course). */
const OWR={GEO:64,NEAR:30,MS:3,job:null,G:null,DEPTH:.23,LEN:.38,JOINT:.021,BEV:.029,EW:.24,ELEN:.62,RING:.023,TOP:.043,PV:.45,PV0:.2,PVF:.62,cache:new Map(),
  PAL:[0x8c867d,0x938c82,0x877f74,0x958b7d,0x8e8a84,0x9a9083,0x837d74,0x8f8577],EPAL:[0x7a756b,0x726d63,0x807a6e,0x767064]};
const owrH=(rid,k,s)=>owHash2(rid*7919+s*104729,k*131+s*7);
/* ---- upgrade 12: some streets of a city have a pavement and sand before the houses (OWSW). The street is drawn OWSW.cut m narrower than it is (the grid, the plots and everything
   else see the same street): cobbles down the middle, a course of big flat slabs along each side (its edge course, OWSW.pave wide, slabs about OWSW.elen long, lighter and clean),
   and beyond them sand up to the fronts of the houses (the segments' sx: owgBuildTile draws the sand to w+sx, the grass keeps off it). Which streets: kingsgaard.html addS. ---- */
const OWSW={on:true,p:.42,cut:.5,pave:.5,elen:.85};
function owgSand(rid,sx){const S=OW.G.paths.get(rid);if(S)for(const g of S)g.sx=sx;}
const owrEW=B=>B.curb?(B.sw?OWSW.pave:OWR.EW):0;
const owrRank=k=>k===1?3:k===0?2:1;
/* a segment that gets stones (environment upgrade 06: every paved path, a street, road, lane or footpath of any settlement, not only the towns' streets; where its paving fades below OWR.PVF the
   stones thin out and weather, down to OWR.PV0, so the stones run out into the sand instead of stopping at a line with painted paving beyond) */
const owrStoneable=g=>OWR.old?g.city&&g.kind<=2&&Math.max(g.pa,g.pb)>=OWR.PV:g.kind<=3&&Math.max(g.pa,g.pb)>=OWR.PV0;/* (OWR.old: the streets of upgrade 01 only, for comparison) */
/* a path's layout: its segments in order, the normals at their joints (so the courses fan round a bend instead of folding), the courses and the edge stones */
function owrPath(rid){if(OWR.G!==OW.G){OWR.cache.clear();OWR.G=OW.G;OWR.job=null;}let P=OWR.cache.get(rid);if(P)return P;const S=OW.G.paths.get(rid);if(!S||!S.length)return null;const n=S.length,N=new Float32Array((n+1)*2);
  for(let i=0;i<=n;i++){let x=0,z=0;for(const j of[i-1,i])if(j>=0&&j<n){x+=S[j].uz;z-=S[j].ux;}const l=Math.hypot(x,z)||1;N[i*2]=x/l;N[i*2+1]=z/l;}
  const L=S[n-1].s0+S[n-1].len,w0=S[0].wa,w1=S[n-1].wb;let wm=0;for(const g of S)if(Math.max(g.pa,g.pb)>=OWR.PV0)wm=Math.max(wm,g.wa,g.wb);
  /* courses: boundaries along the path (from a stone's width before its start to beyond its end) and the offset of each course's joints */
  const cs=[-w0],off=[];let o=owrH(rid,0,1)*OWR.LEN;
  for(let k=0;cs[k]<L+w1;k++){cs.push(cs[k]+OWR.DEPTH*(.88+.24*owrH(rid,k,2)));off.push(o);o=(o+OWR.LEN*(.5+(owrH(rid,k,3)-.5)*.36))%OWR.LEN;}
  /* the edge course of a curbed path: long stones along each side */
  const es=[[],[]];const EL=S[0].sx?OWSW.elen:OWR.ELEN;if(S[0].curb)for(let sd=0;sd<2;sd++){let s=-w0-owrH(rid,sd,4)*EL;es[sd].push(s);for(let k=0;s<L+w1;k++){s+=EL*(.85+.3*owrH(rid,k,5+sd));es[sd].push(s);}}
  P={rid,S,n,N,L,cs,off,es,curb:!!S[0].curb,sw:!!S[0].sx,kind:S[0].kind,rank:owrRank(S[0].kind),wm};OWR.cache.set(rid,P);return P;}
function owrSeg(P,s){const S=P.S;let lo=0,hi=P.n-1;while(lo<hi){const m=(lo+hi+1)>>1;if(S[m].s0<=s)lo=m;else hi=m-1;}return lo;}
/* the point at (s, l) of a path (beyond its ends: on the line of its first or last segment) */
function owrAt(P,s,l,o){const i=owrSeg(P,s),g=P.S[i],tc=Math.min(1,Math.max(0,(s-g.s0)/g.len)),N=P.N;let nx=N[i*2]+(N[i*2+2]-N[i*2])*tc,nz=N[i*2+1]+(N[i*2+3]-N[i*2+1])*tc;const nl=Math.hypot(nx,nz)||1;
  o[0]=g.ax+g.ux*(s-g.s0)+nx/nl*l;o[1]=g.az+g.uz*(s-g.s0)+nz/nl*l;return o;}
/* the frame of a path at s: the point on its middle line and the unit normal ([x, z, nx, nz]) */
function owrFrame(P,s,o){const i=owrSeg(P,s),g=P.S[i],tc=Math.min(1,Math.max(0,(s-g.s0)/g.len)),N=P.N;let nx=N[i*2]+(N[i*2+2]-N[i*2])*tc,nz=N[i*2+1]+(N[i*2+3]-N[i*2+1])*tc;const nl=Math.hypot(nx,nz)||1;
  o[0]=g.ax+g.ux*(s-g.s0);o[1]=g.az+g.uz*(s-g.s0);o[2]=nx/nl;o[3]=nz/nl;return o;}
function owrW(P,s){s=Math.min(P.L,Math.max(0,s));const g=P.S[owrSeg(P,s)],t=Math.min(1,Math.max(0,(s-g.s0)/g.len));return g.wa+(g.wb-g.wa)*t;}
function owrPv(P,s){s=Math.min(P.L,Math.max(0,s));const g=P.S[owrSeg(P,s)],t=Math.min(1,Math.max(0,(s-g.s0)/g.len));return g.pa+(g.pb-g.pa)*t;}
/* does path B (rank, width, number) go through where it meets path P? */
function owrDom(B,P){return B.rank>P.rank||(B.rank===P.rank&&(B.wm>P.wm+.01||(Math.abs(B.wm-P.wm)<=.01&&B.rid<P.rid)));}
/* keep the part of a convex polygon where nx*x + nz*z >= c */
function owrClip(poly,nx,nz,c){const out=[],n=poly.length;for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n],da=nx*a[0]+nz*a[1]-c,db=nx*b[0]+nz*b[1]-c;if(da>=0)out.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;}
function owrArea(p){let A=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];A+=a[0]*b[1]-b[0]*a[1];}return A/2;}
/* the top of a stone: the polygon moved in by b along every edge (null where that does not leave a sound polygon) */
function owrInset(poly,b){const n=poly.length,A=owrArea(poly),sg=A>0?1:-1,L=[];
  for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n];let ex=q[0]-p[0],ez=q[1]-p[1];const el=Math.hypot(ex,ez);if(el<1e-4)return null;ex/=el;ez/=el;const nx=-ez*sg,nz=ex*sg;L.push([nx,nz,nx*p[0]+nz*p[1]+b]);}
  const out=[];for(let i=0;i<n;i++){const a=L[(i+n-1)%n],c=L[i],det=a[0]*c[1]-a[1]*c[0];if(Math.abs(det)<1e-9)return null;out.push([(a[2]*c[1]-a[1]*c[2])/det,(a[0]*c[2]-a[2]*c[0])/det]);}
  const A2=owrArea(out);if(A2*A<=0||Math.abs(A2)<Math.abs(A)*.12)return null;for(const p of out)for(const l of L)if(l[0]*p[0]+l[1]*p[1]<l[2]-1e-6)return null;return out;}
/* the signed distance to the edge of a square (as the ground tiles draw it) */
function owrSqD(sq,x,z){const dx=x-sq.x,dz=z-sq.z;if(sq.circle)return Math.hypot(dx,dz)-sq.r;const u=Math.abs(dx*sq.ca+dz*sq.sa)-(sq.a/2-1.5),w2=Math.abs(-dx*sq.sa+dz*sq.ca)-(sq.b/2-1.5);
  return Math.hypot(Math.max(u,0),Math.max(w2,0))+Math.min(Math.max(u,w2),0)-1.5;}
/* the city paths of a tile that reach a point: for each path its nearest segment, the distance across it and its half width there */
/* (a 4 m grid over the tile of its paved city segments, so a stone looks only at the segments near it) */
function owrIndex(t){const T=OW.G.T,C=4,x0=t.tx*T-4,z0=t.tz*T-4,n=Math.ceil((T+8)/C),B=Array.from({length:n*n},()=>[]);
  for(const g of t.segs){if(!owrStoneable(g))continue;const i0=Math.max(0,Math.floor((g.x0-x0)/C)),i1=Math.min(n-1,Math.floor((g.x1-x0)/C)),j0=Math.max(0,Math.floor((g.z0-z0)/C)),j1=Math.min(n-1,Math.floor((g.z1-z0)/C));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)B[j*n+i].push(g);}
  return{x0,z0,C,n,B};}
function owrCell(t,x,z){const X=t._ix,i=Math.floor((x-X.x0)/X.C),j=Math.floor((z-X.z0)/X.C);return i<0||j<0||i>=X.n||j>=X.n?[]:X.B[j*X.n+i];}
function owrNear(list,x,z,pad,out){out.length=0;
  for(const g of list){if(x<g.x0-pad||x>g.x1+pad||z<g.z0-pad||z>g.z1+pad)continue;
    const tt=((x-g.ax)*g.dx+(z-g.az)*g.dz)*g.il2,tc=Math.min(1,Math.max(0,tt)),ex=x-(g.ax+g.dx*tc),ez=z-(g.az+g.dz*tc),dd=Math.hypot(ex,ez),w=g.wa+(g.wb-g.wa)*tc;if(dd>w+pad)continue;
    if(g.pa+(g.pb-g.pa)*tc<OWR.PV0)continue;let e=null;for(const q of out)if(q.g.rid===g.rid){e=q;break;}if(e&&e.dd<=dd)continue;
    if(!e){e=out.pool[out.length]||(out.pool[out.length]={});out.push(e);}e.g=g;e.tt=tt;e.tc=tc;e.dd=dd;e.w=w;}return out;}
/* cut a stone of path P (centre cx, cz) against the paths that go through it, its own ends and the squares; null if too little is left */
const _owrN=[];_owrN.pool=[];const _owrW=[];_owrW.pool=[];
function owrCut(poly,list,sqs,P,cx,cz,edge,ux,uz){const J2=OWR.JOINT*.5;
  for(const e of owrNear(list,cx,cz,.9,_owrN)){const g=e.g;if(g.rid===P.rid)continue;const B=g._P||(g._P=owrPath(g.rid));if(!B)continue;const par=Math.abs(g.ux*ux+g.uz*uz)>.8;
    /* P goes through: an edge stone of P in the mouth of a path that comes in across it is left out (that path's stones fill the mouth); a path along P lies under P */
    if(!owrDom(B,P)){if(edge&&!par&&e.dd<e.w-.05)return null;continue;}
    /* (a path lying under another along it - a road on a street - does not count where it is covered: the street is what P meets) */
    let sub=false;for(const f of _owrN){if(f===e||f.g.rid===P.rid||f.dd>=f.w)continue;const C=f.g._P||(f.g._P=owrPath(f.g.rid));if(C&&Math.abs(f.g.ux*g.ux+f.g.uz*g.uz)>.8&&owrDom(C,B)){sub=true;break;}}if(sub)continue;
    /* B goes through: P stops at B's edge (at the inner side of B's edge course where P comes in across it) */
    const cw=(B.curb&&!par?e.w-owrEW(B):e.w)+J2;
    if((e.tt<0&&g.pi===0)||(e.tt>1&&g.pi===B.n-1)){/* the end of the other path: round */const ex=e.tt<0?g.ax:g.ax+g.dx,ez=e.tt<0?g.az:g.az+g.dz;let dx=cx-ex,dz=cz-ez;const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;poly=owrClip(poly,dx,dz,dx*ex+dz*ez+cw);}
    else{const nx=g.uz,nz=-g.ux,lat=(cx-g.ax)*nx+(cz-g.az)*nz,sg=lat<0?-1:1;poly=owrClip(poly,sg*nx,sg*nz,sg*(nx*g.ax+nz*g.az)+cw);}
    if(poly.length<3)return null;}
  /* its own ends (a path that ends in the open ends round; only the stones at the end - the half plane beyond it also holds the rest of a path that turns back, e.g. every road to the keep gate) */
  for(const end of[0,1]){const g=P.S[end?P.n-1:0],ex=end?g.ax+g.dx:g.ax,ez=end?g.az+g.dz:g.az,w=end?g.wb:g.wa,vx=end?g.ux:-g.ux,vz=end?g.uz:-g.uz;if((cx-ex)*vx+(cz-ez)*vz<0)continue;
    let dx=cx-ex,dz=cz-ez;const dl=Math.hypot(dx,dz);if(dl<1e-6||dl>w+1.5)continue;dx/=dl;dz/=dl;poly=owrClip(poly,-dx,-dz,-(dx*ex+dz*ez)-w+J2);if(poly.length<3)return null;}
  for(const sq of sqs){const d=owrSqD(sq,cx,cz);if(d>1)continue;if(d<-1)return null;const gx=(owrSqD(sq,cx+.05,cz)-owrSqD(sq,cx-.05,cz))/.1,gz=(owrSqD(sq,cx,cz+.05)-owrSqD(sq,cx,cz-.05))/.1,gl=Math.hypot(gx,gz)||1;
    poly=owrClip(poly,gx/gl,gz/gl,(gx*cx+gz*cz)/gl-d+J2);if(poly.length<3)return null;}
  /* (points closer than a centimetre are one) */
  const q=[];for(const p of poly){const l=q[q.length-1];if(!l||Math.hypot(p[0]-l[0],p[1]-l[1])>.01)q.push(p);}if(q.length>2&&Math.hypot(q[0][0]-q[q.length-1][0],q[0][1]-q[q.length-1][1])<=.01)q.pop();
  return q.length>=3&&Math.abs(owrArea(q))>=.012?q:null;}
/* ---- the paved squares in stones (environment upgrade 06) ----
   The squares are paved with real stones too, after the designs the ground shader paints on them (the painting stays for the squares far away, as for the streets): the courtyards
   in big flagstones with patches of cobbles, the ring of cobbles round the well of a village square (thinning out to its edge), the flagstone field of a town square framed by a
   band of large blocks with a ring of cobbles round its landmark, and the great square of a city in cobbles framed by blocks, with rings of big blocks and flagstones round its
   landmark. Cobbles (about 0.54 m) and flagstones (about 1.9 m) are the cells of a jittered grid (each the part of the plane nearer its seed than any other seed: a convex polygon),
   the blocks (1.15 by 0.56 m, big ones 1.9 by 0.93 m) are laid in rows along the square in a running bond. A stone belongs to the region its seed (or its middle) lies in and is cut
   along the edge of that region (the band, the rings, the square's own edge) with a joint, so the regions meet in a clean line; every stone has the chamfer and raised middle of the
   street stones (emit), its own shade, and a little moss towards the edge of the square. Nothing here draws from the world's random stream. */
const OWQ={on:true,CB:.54,FL:1.92,RL:1.15,RD:.56,J:.012,FPAL:[0x9b9184,0x928a7e,0xa1978a,0x8d867b,0x968e83,0x9f9488]};
const owqPaved=sq=>OWQ.on&&!!sq&&(!!sq.rect||(sq.sty||0)>=1);
/* the square of a big town (tier 4 and 5): small cobbles all over, no band, no rings round the well (the user's wish; the ground tiles paint it the same, owgBuildTile) */
const OWQ_BIG=new WeakMap();
function owqBig(sq){if(!sq||sq.rect)return false;let b=OWQ_BIG.get(sq);if(b===undefined){b=false;for(const v of OW.villages)if(v.sqr===sq){b=(v.tier||0)>=4;break;}OWQ_BIG.set(sq,b);}return b;}
const owqH=(a,b,s)=>owHash2(a*7919+s*104729+13,b*131+s*7+29);
/* what a square is paved with at a point, as the ground shader paints it: 0 nothing (earth), 1 cobbles, 2 flagstones, 3 blocks, 4 big blocks (a ring round the landmark) */
function owqKind(sq,x,z){const sd=owrSqD(sq,x,z);if(sd>0)return 0;const depth=-sd,pc=sq.patch,dL=pc?Math.hypot(x-pc.x,z-pc.z):1e9,sty=sq.sty||0;
  if(sq.rect)return 2;if(owqBig(sq))return 1;if(sty===1)return pc&&dL<pc.r?1:0;
  if(sty===2)return depth<1.5?3:dL<5.4?1:2;
  if(sty>=3)return depth<2.1?3:dL<8.7?(Math.floor(dL/1.45)%2?2:4):1;return 0;}
/* the edges a stone of a kind is cut along (f <= 0 inside; f a distance): the square's edge, the inner edge of the band, the rings round the landmark */
function owqCons(sq,kind,ring){const L=[p=>owrSqD(sq,p[0],p[1])],sty=sq.sty||0,pc=sq.patch,dl=p=>Math.hypot(p[0]-pc.x,p[1]-pc.z);if(sq.rect||owqBig(sq))return L;
  if(sty>=2){const b=sty===2?1.5:2.1;L.push(kind===3?p=>-owrSqD(sq,p[0],p[1])-b:p=>owrSqD(sq,p[0],p[1])+b);}
  if(pc){if(sty===1)L.push(p=>dl(p)-pc.r);
    else if(sty===2){if(kind===1)L.push(p=>dl(p)-5.4);else if(kind===2)L.push(p=>5.4-dl(p));}
    else if(kind===1)L.push(p=>8.7-dl(p));else if(kind===2||kind===4){L.push(p=>ring*1.45-dl(p));L.push(p=>dl(p)-(ring+1)*1.45);}}
  return L;}
/* cut a convex polygon along each edge it crosses (the edge taken as the straight line through the nearest point to its middle), a joint J short of it */
function owqClip(poly,cons,cx,cz,J){for(const f of cons){let out=false;for(const p of poly)if(f(p)>-J){out=true;break;}if(!out)continue;
    const c=[cx,cz],fc=f(c),e=.05,gx=(f([cx+e,cz])-f([cx-e,cz]))/(2*e),gz=(f([cx,cz+e])-f([cx,cz-e]))/(2*e),gl=Math.hypot(gx,gz)||1,nx=gx/gl,nz=gz/gl;
    poly=owrClip(poly,-nx,-nz,-(nx*cx+nz*cz)+(J+fc)/gl);if(poly.length<3)return null;}return poly;}
/* the cell of a seed of a jittered grid (cell size c, a stream of its own by salt): the part of a box round it nearer to it than to its 24 neighbours */
const owqSeed=(i,j,c,salt,o)=>{o[0]=(i+.15+.7*owqH(i,j,salt))*c;o[1]=(j+.15+.7*owqH(i,j,salt+1))*c;return o;};
function owqCell(i,j,c,salt){const s0=owqSeed(i,j,c,salt,[0,0]),n=[0,0];let poly=[[s0[0]-c*1.3,s0[1]-c*1.3],[s0[0]+c*1.3,s0[1]-c*1.3],[s0[0]+c*1.3,s0[1]+c*1.3],[s0[0]-c*1.3,s0[1]+c*1.3]];
  for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){if(!di&&!dj)continue;owqSeed(i+di,j+dj,c,salt,n);const ax=s0[0]-n[0],az=s0[1]-n[1];poly=owrClip(poly,ax,az,ax*(s0[0]+n[0])/2+az*(s0[1]+n[1])/2);if(poly.length<3)return null;}
  return{s:s0,poly};}
const owqCen=p=>{let x=0,z=0;for(const q of p){x+=q[0];z+=q[1];}return[x/p.length,z/p.length];};
/* the geometry of a tile: vertices, colours, the full index (chamfers and raised middles) and the far one (tops only) */
function* owrBake(t){t._ix=owrIndex(t);let nc=0;const T=OW.G.T,x0=t.tx*T,z0=t.tz*T,X=[],C=[],I0=[],I1=[],o=[0,0],cc=new THREE.Color(),PV=OWR.PV;let ns=0;
  /* the tops of the stones, on a grid of 20 cm (a margin of 1.2 m round the tile: a big stone of the tile reaches over its edge): what one walks on (owWalkY) - the stones stand 4-5 cm proud of the ground */
  const SR=.2,SM=1.2,SN=Math.ceil((T+2*SM)/SR),SH=new Float32Array(SN*SN).fill(-1e9),sox=x0-SM,soz=z0-SM;
  let cr=0,cg=0,cb=0;
  const put=(x,y,z,k)=>{X.push(x,y,z);C.push(Math.min(255,cr*k*255)|0,Math.min(255,cg*k*255)|0,Math.min(255,cb*k*255)|0);};
  const tri=(I,a,bb,c)=>{const ax=X[bb*3]-X[a*3],az=X[bb*3+2]-X[a*3+2],bx=X[c*3]-X[a*3],bz=X[c*3+2]-X[a*3+2];if(az*bx-ax*bz>0)I.push(a,bb,c);else I.push(a,c,bb);};
  const emit=(poly,h,col,edge,wr)=>{const n=poly.length;let cx=0,cz=0;for(const p of poly){cx+=p[0]/n;cz+=p[1]/n;}
    const h0=owH(cx,cz),gx=(owH(cx+.3,cz)-h0)/.3,gz=(owH(cx,cz+.3)-h0)/.3,tx=(h(5)-.5)*.03,tz=(h(6)-.5)*.03,dh=(h(4)-.5)*.01,top=owrInset(poly,OWR.BEV)||owrInset(poly,OWR.BEV*.5),b=X.length/3;
    {let ax=1e9,az=1e9,bx=-1e9,bz=-1e9;for(const p of poly){ax=Math.min(ax,p[0]);bx=Math.max(bx,p[0]);az=Math.min(az,p[1]);bz=Math.max(bz,p[1]);}const sg=owrArea(poly)>0?1:-1;
      for(let j=Math.max(0,Math.floor((az-soz)/SR));j<=Math.min(SN-1,Math.floor((bz-soz)/SR));j++)for(let i=Math.max(0,Math.floor((ax-sox)/SR));i<=Math.min(SN-1,Math.floor((bx-sox)/SR));i++){
        const px=sox+(i+.5)*SR,pz=soz+(j+.5)*SR;let ins=true;for(let k=0;k<n&&ins;k++){const a=poly[k],q=poly[(k+1)%n];if(sg*((q[0]-a[0])*(pz-a[1])-(q[1]-a[1])*(px-a[0]))<0)ins=false;}
        if(ins){const hy=h0+gx*(px-cx)+gz*(pz-cz)+OWR.TOP+dh,k=j*SN+i;if(hy>SH[k])SH[k]=hy;}}}
    cc.setHex(col);const br=(edge?.92:.9)+.17*h(7);cr=cc.r*br;cg=cc.g*br;cb=cc.b*br;const dc=h(8);if(dc<.05){cr=cr*.8+.05;cg=cg*.78+.04;cb=cb*.72+.02;}else if(dc<.09){cr*=1.07;cg*=1.04;cb*=.98;}
    /* (by the grass: mossy and dirty, more on some stones than others) */
    if(wr>0){const mo=h(12),k=wr*(.55+.45*mo);cr=cr+(.33-cr)*k*.55;cg=cg+(.42-cg)*k*.5;cb=cb+(.19-cb)*k*.6;const dk=1-.14*wr*(1-mo);cr*=dk;cg*=dk;cb*=dk;}
    if(top){/* chamfer ring (outer at the bed, inner at the top), the top in a fan round a middle raised by a few millimetres */
      for(const p of poly)put(p[0],h0+gx*(p[0]-cx)+gz*(p[1]-cz)+OWR.RING,p[1],1.04);
      for(const p of top)put(p[0],h0+(gx+tx)*(p[0]-cx)+(gz+tz)*(p[1]-cz)+OWR.TOP+dh,p[1],1);
      put(cx,h0+OWR.TOP+dh+.003,cz,.97+.06*h(9));const tb=b+n,mc=b+2*n;
      for(let i=0;i<n;i++){const j=(i+1)%n;tri(I0,b+i,b+j,tb+j);tri(I0,b+i,tb+j,tb+i);tri(I0,mc,tb+i,tb+j);}
      for(let i=1;i<n-1;i++)tri(I1,tb,tb+i,tb+i+1);}
    else{/* too small for a chamfer: a flat slab */
      for(const p of poly)put(p[0],h0+gx*(p[0]-cx)+gz*(p[1]-cz)+OWR.TOP+dh,p[1],1);for(let i=1;i<n-1;i++){tri(I0,b,b+i,b+i+1);tri(I1,b,b+i,b+i+1);}}
    ns++;};
  const inT=(x,z)=>x>=x0&&x<x0+T&&z>=z0&&z<z0+T;
  /* how worn by the grass a stone is: near the edge of its road (e: its distance from it), where the ground beyond the edge (ox, oz) is open - no other paved road, no square, no wall -
     and in patches (the edge of a street is mossy here and clean there) */
  const wearAt=(e,cx,cz,ox,oz,list)=>{if(e>.75)return 0;for(const f of owrNear(list,ox,oz,0,_owrW))if(f.dd<f.w)return 0;for(const q of t.sqs)if(owrSqD(q,ox,oz)<.3)return 0;
    const c=owCell(ox,oz);if(c.r<0||c.c<0||c.r>=H||c.c>=W||grid[c.r][c.c]===2)return 0;const n=.5+.5*Math.sin(cx*1.3+cz*.7)*Math.sin(cx*.41-cz*1.1);return(1-SMS(e,0,.75))*SMS(n+.25*owHash2(Math.floor(cx*2.3),Math.floor(cz*2.3)),.15,.65);};
  /* a point of a course: between the frames at its two edges (u 0..1 along it, l across) */
  const F0=[0,0,0,0],F1=[0,0,0,0],pt=(u,l)=>{let nx=F0[2]+(F1[2]-F0[2])*u,nz=F0[3]+(F1[3]-F0[3])*u;const nl=Math.hypot(nx,nz)||1;return[F0[0]+(F1[0]-F0[0])*u+nx/nl*l,F0[1]+(F1[1]-F0[1])*u+nz/nl*l];};
  const rids=new Map();for(const g of t.segs)if(owrStoneable(g)){const r=rids.get(g.rid);if(!r)rids.set(g.rid,{s0:g.s0,s1:g.s0+g.len});else{r.s0=Math.min(r.s0,g.s0);r.s1=Math.max(r.s1,g.s0+g.len);}}
  const seen=new Set(),cand=[],near=[];near.pool=[];
  for(const[rid,r]of rids){const P=owrPath(rid);if(!P)continue;const smin=r.s0-2,smax=r.s1+2,EW=owrEW(P),cs=P.cs;
    let k=0,lo=0,hi=cs.length-2;while(lo<hi){const m=(lo+hi)>>1;if(cs[m+1]<smin)lo=m+1;else hi=m;}k=lo;
    for(;k<cs.length-1&&cs[k]<smax;k++){if((++nc&3)===0)yield;const sa=cs[k],sb=cs[k+1],sm=(sa+sb)/2,D=sb-sa,pvC=owrPv(P,sm);if(pvC<(OWR.old?OWR.PV:OWR.PV0))continue;const keep=OWR.old?1:SMS(pvC,OWR.PV0,OWR.PVF);
      const ia=owrW(P,sa)-EW,ib=owrW(P,sb)-EW,Wm=Math.max(ia,ib);if(Wm<.15)continue;
      owrFrame(P,sa,F0);owrFrame(P,sb,F1);const c0=pt(.5,0),gd=P.S[owrSeg(P,sm)];
      /* the paths that can reach the course (from the grid cells under it) */
      cand.length=0;seen.clear();const R=Wm+EW+.6;for(const f of[-1,-.5,0,.5,1]){const q=pt(.5,f*R);for(const g of owrCell(t,q[0],q[1])){if(g.rid===rid||seen.has(g))continue;seen.add(g);cand.push(g);}}
      /* where the course lies deep inside a path that goes through (a road on a street, a crossing), no stones are made: the stretch of the course line inside that path's band, less a margin
         (the edges of the band, its edge course and the curve of the path are left to owrCut, stone by stone) */
      const cov=[];if(cand.length){const mx=c0[0],mz=c0[1],Nx=(F0[2]+F1[2])/2,Nz=(F0[3]+F1[3])/2,Nl=Math.hypot(Nx,Nz)||1;
        for(const e of owrNear(cand,mx,mz,Wm+EW+1,near)){const B=e.g._P||(e.g._P=owrPath(e.g.rid));if(!B||!owrDom(B,P))continue;
          /* (a path with another along it that goes through - a road on a street - is left to owrCut: where it lies under the other it does not count) */
          let under=false;for(const f of near){if(f===e||Math.abs(f.g.ux*e.g.ux+f.g.uz*e.g.uz)<=.8)continue;const C=f.g._P||(f.g._P=owrPath(f.g.rid));if(C&&owrDom(C,B)){under=true;break;}}if(under)continue;const g=e.g,w=e.w-.6-owrEW(B);if(w<=.05)continue;
          const nx=g.uz,nz=-g.ux,dn=(Nx*nx+Nz*nz)/Nl,d0=(mx-g.ax)*nx+(mz-g.az)*nz,du=(Nx*g.ux+Nz*g.uz)/Nl,sB=g.s0+(mx-g.ax)*g.ux+(mz-g.az)*g.uz,m=.6;let lo=-1e9,hi=1e9;
          if(Math.abs(dn)<1e-6){if(Math.abs(d0)>w)continue;}else{const l1=(-w-d0)/dn,l2=(w-d0)/dn;lo=Math.min(l1,l2);hi=Math.max(l1,l2);}
          if(Math.abs(du)<1e-6){if(sB<m||sB>B.L-m)continue;}else{const l1=(m-sB)/du,l2=(B.L-m-sB)/du;lo=Math.max(lo,Math.min(l1,l2));hi=Math.min(hi,Math.max(l1,l2));}
          lo=Math.max(lo,-Wm-EW-1);hi=Math.min(hi,Wm+EW+1);if(hi<=lo)continue;
          /* (only where B is paved and as wide at both ends of the stretch) */
          let ok=true;for(const l of[lo,hi]){const s2=sB+l*du;if(owrPv(B,s2)<PV||owrW(B,s2)<e.w-.1){ok=false;break;}}if(ok)cov.push([lo,hi]);}
        if(!OWR.noSkip&&cov.some(c=>c[0]<=-Wm-EW&&c[1]>=Wm+EW))continue;}
      /* the joints of the course across the road: stones of varied length, the narrow pieces at the edges joined to their neighbours */
      const br=[];let l=-Wm-P.off[k],j=0;while(l<Wm){const L=OWR.LEN*(.82+.36*owrH(rid,k*64+j,11));br.push(l);l+=L;j++;}br.push(l);
      const B2=[-Wm];for(let i=1;i<br.length-1;i++)if(br[i]-B2[B2.length-1]>.12&&Wm-br[i]>.12)B2.push(br[i]);B2.push(Wm);
      for(let i=0;i<B2.length-1;i++){const h=q=>owrH(rid,k*64+i,20+q),J=OWR.JOINT*(.8+.4*h(0))*.5,ju=J/D,la=B2[i],lb=B2[i+1];
        /* corners moved a little (the outermost stones follow the edge where the road widens) */
        const poly=[pt(ju+(h(2)-.5)*.03/D,i===0?-ia+J:la+J+(h(3)-.5)*.03),pt(1-ju+(h(4)-.5)*.03/D,i===0?-ib+J:la+J+(h(5)-.5)*.03),
          pt(1-ju+(h(6)-.5)*.03/D,i===B2.length-2?ib-J:lb-J+(h(7)-.5)*.03),pt(ju+(h(8)-.5)*.03/D,i===B2.length-2?ia-J:lb-J+(h(9)-.5)*.03)];
        let cx=0,cz=0;for(const p of poly){cx+=p[0]/4;cz+=p[1]/4;}if(!inT(cx,cz))continue;if(!OWR.noSkip&&cov.some(c=>c[0]<=la&&c[1]>=lb))continue;
        /* (where the paving fades the stones thin out: more of them are missing the lower it is, the edges first) */
        if(keep<.999&&h(31)*(1+.6*Math.max(Math.abs(la),Math.abs(lb))/Math.max(Wm,.3))>keep*1.3)continue;
        const cut=owrCut(poly,cand,t.sqs,P,cx,cz,false,gd.ux,gd.uz);if(!cut)continue;
        const lo=Math.max(Math.abs(la),Math.abs(lb)),sgn=Math.abs(lb)>Math.abs(la)?1:-1,Wf=Math.max(ia,ib)+EW,op=pt(.5,sgn*(Wf+.6));
        emit(cut,q=>h(10+q),OWR.PAL[Math.floor(h(1)*OWR.PAL.length)],false,P.sw?(1-keep)*.85:Math.max(wearAt(Wf-lo,cx,cz,op[0],op[1],cand),(1-keep)*.85));}}
    /* the edge courses */
    if(P.curb)for(let sd=0;sd<2;sd++){const E=P.es[sd],sg=sd?1:-1;let a=0,b2=E.length-2;while(a<b2){const m=(a+b2)>>1;if(E[m+1]<smin)a=m+1;else b2=m;}
      for(let k2=a;k2<E.length-1&&E[k2]<smax;k2++){const sa=E[k2],sb=E[k2+1],sm=(sa+sb)/2;if(owrPv(P,sm)<PV)continue;const h=q=>owrH(rid,k2*2+sd,40+q),J=OWR.JOINT*(.8+.4*h(0))*.5;
        const wa=owrW(P,sa),wb=owrW(P,sb),poly=[];for(const[s,ll]of[[sa+J,sg*(wa-EW+J)],[sb-J,sg*(wb-EW+J)],[sb-J,sg*(wb-J)],[sa+J,sg*(wa-J)]]){owrAt(P,s,ll,o);poly.push([o[0],o[1]]);}
        let cx=0,cz=0;for(const p of poly){cx+=p[0]/4;cz+=p[1]/4;}if(!inT(cx,cz))continue;const gd=P.S[owrSeg(P,sm)];
        cand.length=0;for(const g of owrCell(t,cx,cz))if(g.rid!==rid)cand.push(g);const cut=owrCut(poly,cand,t.sqs,P,cx,cz,true,gd.ux,gd.uz);
        if(cut){owrAt(P,sm,sg*((wa+wb)/2+.6),o);emit(cut,h,P.sw?OWQ.FPAL[Math.floor(h(1)*OWQ.FPAL.length)]:OWR.EPAL[Math.floor(h(1)*OWR.EPAL.length)],true,P.sw?0:wearAt(0,cx,cz,o[0],o[1],cand));}/* (a pavement: big lighter slabs, clean - sand beyond them, not grass) */}}}
  /* the paved squares (environment upgrade 06) */
  for(const sq of(t.sqs||[])){if(!owqPaved(sq))continue;const R0=(sq.circle?sq.r:Math.hypot(sq.a,sq.b)/2)+.5,bx0=Math.max(x0,sq.x-R0),bx1=Math.min(x0+T,sq.x+R0),bz0=Math.max(z0,sq.z-R0),bz1=Math.min(z0+T,sq.z+R0);if(bx0>=bx1||bz0>=bz1)continue;
    const sid=Math.round(sq.x*7+sq.z*13),sty=sq.sty||0,pc=sq.patch,J=OWQ.J,ca=sq.ca!=null?sq.ca:1,sa=sq.sa!=null?sq.sa:0;
    /* a stone: cut along the edges of its region, its joints, the moss towards the edge of the square, and the cobbles of a village square thinning out to the edge of their ring */
    const lay=(poly,cx,cz,kind,ring,col,hs,dens)=>{const h=q=>owqH(hs,sid,q);if(dens<1&&h(9)>dens*1.15)return;poly=owqClip(poly,owqCons(sq,kind,ring),cx,cz,J);if(!poly)return;
      const top=owrInset(poly,J);if(!top||Math.abs(owrArea(top))<.012)return;const c=owqCen(top),dE=-owrSqD(sq,c[0],c[1]),mo=.5+.5*Math.sin(c[0]*.9+c[1]*.6)*Math.sin(c[0]*.37-c[1]*.81);
      emit(top,h,col,false,Math.max(dE<1.4?owqGrass(sq,c[0],c[1],dE)*(1-SMS(dE,.1,1.4))*(.42+.25*mo):0,1-Math.min(1,dens)));};
    /* is the ground just beyond the square's edge, out from (x, z), grass? (no path - paved or earth -, no other square, no building or wall) */
    const owqGrass=(sq,x,z,dE)=>{const e=.05,gx=(owrSqD(sq,x+e,z)-owrSqD(sq,x-e,z))/(2*e),gz=(owrSqD(sq,x,z+e)-owrSqD(sq,x,z-e))/(2*e),gl=Math.hypot(gx,gz)||1,ox=x+gx/gl*(dE+.7),oz=z+gz/gl*(dE+.7);
      for(const g of t.segs){if(ox<g.x0||ox>g.x1||oz<g.z0||oz>g.z1)continue;const tt=Math.max(0,Math.min(1,((ox-g.ax)*g.dx+(oz-g.az)*g.dz)*g.il2)),w=g.wa+(g.wb-g.wa)*tt;if(Math.hypot(ox-(g.ax+g.dx*tt),oz-(g.az+g.dz*tt))<w+.2)return 0;}
      for(const q of t.sqs)if(q!==sq&&owrSqD(q,ox,oz)<.3)return 0;const cl=owCell(ox,oz);if(cl.r<0||cl.c<0||cl.r>=H||cl.c>=W||grid[cl.r][cl.c]===2)return 0;return 1;};
    /* cobbles and flagstones: the cells of their grids, each laid by the region its seed lies in */
    for(const[kind,cs,salt]of[[1,OWQ.CB,31],[2,OWQ.FL,57]]){const i0=Math.floor(bx0/cs)-1,i1=Math.floor(bx1/cs)+1,j0=Math.floor(bz0/cs)-1,j1=Math.floor(bz1/cs)+1,sd0=[0,0];
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if((++nc&15)===0)yield;owqSeed(i,j,cs,salt,sd0);const sx=sd0[0],sz=sd0[1];if(!inT(sx,sz))continue;const kd=owqKind(sq,sx,sz);if(kd!==kind)continue;
        const cell=owqCell(i,j,cs,salt);if(!cell)continue;const ring=pc?Math.floor(Math.hypot(sx-pc.x,sz-pc.z)/1.45):0,hs=i*977+j*31+kind*7;
        if(kind===2&&sq.rect&&(.5+.5*Math.sin(sx*.21+sz*.17)*Math.sin(sx*.13-sz*.23))>.74){/* a patch of cobbles in a courtyard: the flagstone's place paved in cobbles, cut to it */
          const fp=owqClip(cell.poly,owqCons(sq,2,0),sx,sz,J);if(!fp)continue;const fb=[1e9,1e9,-1e9,-1e9];for(const q of fp){fb[0]=Math.min(fb[0],q[0]);fb[1]=Math.min(fb[1],q[1]);fb[2]=Math.max(fb[2],q[0]);fb[3]=Math.max(fb[3],q[1]);}
          const A=owrArea(fp),sgA=A>0?1:-1,c2=[0,0];
          for(let jj=Math.floor(fb[1]/OWQ.CB)-1;jj<=Math.floor(fb[3]/OWQ.CB)+1;jj++)for(let ii=Math.floor(fb[0]/OWQ.CB)-1;ii<=Math.floor(fb[2]/OWQ.CB)+1;ii++){owqSeed(ii,jj,OWQ.CB,77,c2);
            let inside=true;for(let k=0;k<fp.length;k++){const a=fp[k],b=fp[(k+1)%fp.length];if(sgA*((b[0]-a[0])*(c2[1]-a[1])-(b[1]-a[1])*(c2[0]-a[0]))<0){inside=false;break;}}if(!inside)continue;
            const cc=owqCell(ii,jj,OWQ.CB,77);if(!cc)continue;let cp=cc.poly;for(let k=0;k<fp.length&&cp;k++){const a=fp[k],b=fp[(k+1)%fp.length];let nx=-(b[1]-a[1])*sgA,nz=(b[0]-a[0])*sgA;const nl=Math.hypot(nx,nz)||1;nx/=nl;nz/=nl;cp=owrClip(cp,nx,nz,nx*a[0]+nz*a[1]+J);if(cp.length<3)cp=null;}
            if(cp)lay(cp,c2[0],c2[1],2,0,OWR.PAL[Math.floor(owqH(ii,jj,5)*OWR.PAL.length)],ii*577+jj*43,1);}
          continue;}
        const dens=kind===1&&sty===1&&pc?1-SMS(Math.hypot(sx-pc.x,sz-pc.z),pc.r*.55,pc.r):1,pal=kind===1?OWR.PAL:OWQ.FPAL;
        lay(cell.poly,sx,sz,kind,ring,pal[Math.floor(owqH(i,j,salt+3)*pal.length)],hs,dens);}}
    /* the blocks: rows along the square (u across, v along its axis), a running bond; big blocks in the rings round a city square's landmark */
    if(!sq.rect&&sty>=2&&!owqBig(sq))for(const kind of[3,4]){if(kind===4&&(sty<3||!pc))continue;const RL=kind===3?OWQ.RL:OWQ.RL/.6,RD=kind===3?OWQ.RD:OWQ.RD/.6;
      let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const[x,z]of[[bx0,bz0],[bx1,bz0],[bx1,bz1],[bx0,bz1]]){const dx=x-sq.x,dz=z-sq.z,u=dx*ca+dz*sa,v=-dx*sa+dz*ca;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
      const W=(u,v)=>[sq.x+u*ca-v*sa,sq.z+u*sa+v*ca];
      for(let r=Math.floor(v0/RD)-1;r<=Math.floor(v1/RD)+1;r++){const of=((r&1)*.5+owqH(r,kind,11)*.25)*RL;
        for(let c=Math.floor((u0-of)/RL)-1;c<=Math.floor((u1-of)/RL)+1;c++){if((++nc&15)===0)yield;const ua=c*RL+of,ub=ua+RL,va=r*RD,vb=va+RD,m=W((ua+ub)/2,(va+vb)/2);if(!inT(m[0],m[1]))continue;
          if(owqKind(sq,m[0],m[1])!==kind)continue;const hs=r*313+c*17+kind*5,jt=q=>(owqH(hs,sid,q)-.5)*.024;
          const poly=[W(ua+jt(1),va+jt(2)),W(ub+jt(3),va+jt(4)),W(ub+jt(5),vb+jt(6)),W(ua+jt(7),vb+jt(8))];
          lay(poly,m[0],m[1],kind,pc?Math.floor(Math.hypot(m[0]-pc.x,m[1]-pc.z)/1.45):0,OWR.PAL[Math.floor(owqH(hs,sid,12)*OWR.PAL.length)],hs,1);}}}}
  t._ix=null;if(!ns){t.stone=null;t.stoneN=0;t.sh=null;owrMark(t);return;}yield;
  const nv=X.length/3,g=new THREE.BufferGeometry(),I=new(nv>65535?Uint32Array:Uint16Array)(I0.length+I1.length);I.set(I0);I.set(I1,I0.length);
  const N=new Int8Array(nv*3);for(let i=0;i<nv;i++)N[i*3+1]=127;const XP=new Float32Array(X),CP=new Uint8Array(C);yield;
  g.setAttribute('position',new THREE.BufferAttribute(XP,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3,true));g.setAttribute('color',new THREE.BufferAttribute(CP,3,true));
  g.setIndex(new THREE.BufferAttribute(I,1));g.userData={n0:I0.length,n1:I1.length};g.computeBoundingSphere();
  const m=new THREE.Mesh(g,owrMat());m.receiveShadow=true;m.castShadow=false;m.renderOrder=-2;OW.group.add(m);t.stone=m;t.stoneN=ns;t.stoneLod=-1;t.sh={ox:sox,oz:soz,res:SR,n:SN,h:SH};owrMark(t);}
/* ---- the drawn road network: paths that run side by side become one ----
   Roads from different villages often share a corridor and were drawn as two or three bands a metre or two apart, overlapping into a ragged braid. When the ground network is laid
   (owgFinish), each road is drawn after the streets and the roads before it, and where it runs within a few metres of one of them and nearly along it, its drawn line is pulled onto
   that line where it is within OWM.D0 m (a pull part of the way would leave two bands overlapping, so it is all or nothing: short gaps in such a stretch are closed, short
   touches dropped, and the pull eased along the road over OWM.K points each side - up to OWM.D1 m off - so it joins and leaves the other in a gentle curve, a clean fork). Visual only: the road
   of the world (OW.roads: routes, props, the generator) keeps its points; only the copy the ground tiles, the stones and the grass use is moved. */
const OWM={D0:5.5,D1:10,K:6,C:8,G:null,h:null};
function owmAdd(ax,az,bx,bz){const C=OWM.C,i0=Math.floor((Math.min(ax,bx)-OWM.D1)/C),i1=Math.floor((Math.max(ax,bx)+OWM.D1)/C),j0=Math.floor((Math.min(az,bz)-OWM.D1)/C),j1=Math.floor((Math.max(az,bz)+OWM.D1)/C),sg=[ax,az,bx,bz];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=i+','+j;let L=OWM.h.get(k);if(!L)OWM.h.set(k,L=[]);L.push(sg);}}
function owgMerge(pts){const G=OW.G;if(!G||pts.length<3)return pts;if(OWM.G!==G){OWM.G=G;OWM.h=new Map();for(const S of G.paths.values())if(S[0].kind<=2)for(const g of S)owmAdd(g.ax,g.az,g.ax+g.dx,g.az+g.dz);}
  const n=pts.length,off=new Float32Array(n*2),wt=new Float32Array(n),C=OWM.C;
  for(let i=0;i<n;i++){const q=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let ux=b[0]-a[0],uz=b[1]-a[1];const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;
    const L=OWM.h.get(Math.floor(q[0]/C)+','+Math.floor(q[1]/C));if(!L)continue;let bd=1e9,bx=0,bz=0;
    for(const g of L){const dx=g[2]-g[0],dz=g[3]-g[1],l2=dx*dx+dz*dz;if(l2<1e-6)continue;const l=Math.sqrt(l2);if(Math.abs((dx*ux+dz*uz)/l)<.75)continue;
      const t=Math.max(0,Math.min(1,((q[0]-g[0])*dx+(q[1]-g[1])*dz)/l2)),px=g[0]+dx*t,pz=g[1]+dz*t,d=Math.hypot(px-q[0],pz-q[1]);if(d<bd){bd=d;bx=px;bz=pz;}}
    if(bd<OWM.D1){wt[i]=bd<OWM.D0?1:-1;off[i*2]=bx-q[0];off[i*2+1]=bz-q[1];}}
  /* (wt: 1 within D0, -1 within D1, 0 beyond; gaps of up to 2K points between two stretches are closed while the other line is near, stretches under 4 points are dropped) */
  const K=OWM.K;for(let i=0;i<n;){if(wt[i]<=0){i++;continue;}let j=i;while(j<n&&wt[j]>0)j++;let g=j;while(g<n&&wt[g]<0)g++;if(g<n&&g>j&&wt[g]>0&&g-j<=2*K){for(let k=j;k<g;k++)wt[k]=1;}else i=j;}
  for(let i=0;i<n;){if(wt[i]<=0){i++;continue;}let j=i;while(j<n&&wt[j]>0)j++;if(j-i<4)for(let k=i;k<j;k++)wt[k]=-1;i=j;}
  const out=new Array(n);for(let i=0;i<n;i++){const q=pts[i];if(wt[i]===0){out[i]=q;continue;}let s=0,c=0;for(let k=-K;k<=K;k++){const j=i+k;if(j<0||j>=n)continue;const f=1-Math.abs(k)/(K+1);s+=(wt[j]>0?1:0)*f;c+=f;}
    const w=SMS(s/c,0,1);out[i]=[q[0]+off[i*2]*w,q[1]+off[i*2+1]*w];}
  for(let i=0;i<n-1;i++)owmAdd(out[i][0],out[i][1],out[i+1][0],out[i+1][1]);
  return out;}
/* a whole tile at once (a forced view, the tests) */
function owrBuildTile(t){if(OWR.job&&OWR.job.t===t)OWR.job=null;const it=owrBake(t);while(!it.next().done);}
/* the bed of a ground tile is sand and mortar under stones that are built, and the stones painted where they are not (aSt: + built, - not) */
function owrMark(t){if(!t.mesh)return;const a=t.mesh.geometry.attributes.aSt;if(!a)return;const k=t.stone?1:-1,A=a.array;let ch=false;for(let i=0;i<A.length;i++){const v=Math.abs(A[i])*k;if(v!==A[i]){A[i]=v;ch=true;}}if(ch)a.needsUpdate=true;}
/* the stones' material: the settlements' one (VCMAT, the same program), drawn with the see-through things right after the ground tiles (renderOrder -3), which do not write depth and are pulled
   forward (polygonOffset): drawn before them, the stones were painted over by their own bed wherever the street was seen at a low angle */
let OWR_MAT=null;
function owrMat(){return OWR_MAT||(OWR_MAT=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:4,transparent:true,depthWrite:true}));}
/* the stones of the tiles near the focus (called by owgView): baked a few milliseconds a frame (OWR.MS), the nearest tile first, all at once when the view is forced; the near ones with chamfers,
   dropped when far */
function owrView(fx,fz,force){const G=OW.G;if(!G)return;if(OWR.G!==G){OWR.cache.clear();OWR.G=G;OWR.job=null;}const T=G.T,want=[];
  for(const t of G.tiles.values()){if(t.state!==1||!t.segs)continue;if(t.city===undefined)t.city=t.segs.some(owrStoneable)||(t.sqs||[]).some(owqPaved);if(!t.city)continue;
    const d=Math.hypot(Math.max(0,Math.abs(t.cx-fx)-T/2),Math.max(0,Math.abs(t.cz-fz)-T/2));
    if(d>OWR.GEO+24){if(t.stone){OW.group.remove(t.stone);t.stone.geometry.dispose();t.stone=null;t.sh=null;owrMark(t);}if(OWR.job&&OWR.job.t===t)OWR.job=null;t.stoneDone=false;continue;}
    if(d>OWR.GEO){if(t.stone)t.stone.visible=false;continue;}
    if(!t.stoneDone)want.push([d,t]);
    if(!t.stone)continue;t.stone.visible=!!(t.mesh&&t.mesh.visible);const lod=d<OWR.NEAR?0:1;
    if(t.stoneLod!==lod){t.stoneLod=lod;const g=t.stone.geometry,u=g.userData;g.setDrawRange(lod?u.n0:0,lod?u.n1:u.n0);}}
  if(!want.length)return;want.sort((a,b)=>a[0]-b[0]);
  if(force){for(const[,t]of want){owrBuildTile(t);t.stoneDone=true;}return;}
  const t0=performance.now();
  while(performance.now()-t0<OWR.MS){if(!OWR.job){const w=want.find(q=>!q[1].stoneDone);if(!w)break;OWR.job={t:w[1],it:owrBake(w[1])};}
    if(OWR.job.it.next().done){OWR.job.t.stoneDone=true;OWR.job=null;}}}

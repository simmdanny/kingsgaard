/* ---------- villagers find their way: round houses, fences, props, the hero and each other, and in and out of the doors of houses ----------
   What is solid. The occupancy grid (1 m cells) holds most of it, but coarsely: a lamp post or a barrel can stand in a cell the grid calls free, a fence is only its posts, and a
   house paints the cells whose centres lie in its footprint. So while a village is built it also records the solid things themselves (vilSolid: the footprints of the buildings,
   the steps up to the doors, fences, palisades, gardens, barrels, crates, lamps, the town's props). Recording only: the grid and the world's stream are exactly as before.
   A villager stands only where its circle is clear of all of them, of every solid cell of the grid under it and of the trees and rocks (vilFree).
   The way. A* over the grid's cells near the village (a cell is walkable when a circle at its centre is free: worked out when first asked, then remembered), then pulled straight
   wherever the way between two points of it is clear (vilPath). At most one search per village per frame; the others wait their turn.
   On the way. Each step must land on free ground (else the villager slides or asks for a new way); others ahead slow it and it steps round them; the hero and the villagers
   push each other apart instead of passing through. A villager that makes no headway for a while gives up and thinks of something else.
   Doors. Now and then a villager visits a house that can be entered: it walks to the foot of the steps, climbs them, opens the door (it swings in, as the hero's does), goes in,
   shuts the door behind it if it was the one that opened it, stays a while (it can be seen through the windows, and inside when the hero comes in), then opens the door, comes
   out and shuts it again. A door the hero opened is left open. A door is never shut on anyone: owdSet asks vilInDoor. */
const VILN={DEC:.4,R:.3,RW:.2,S:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[.7,-.7],[-.7,.7],[-.7,-.7]],stats:{search:0,fail:0,ms:0,doors:0,stuck:0}};
function vilSolid(v,k,a,b,c,d,e){if(!v)return;const L=v.vsol||(v.vsol=[]);
  if(k===0)L.push({k,x:a,z:b,r:c,x0:a-c,x1:a+c,z0:b-c,z1:b+c});
  else if(k===1){/* a box: centre (a,b), half sizes c (across) and d (deep), turned by e like a building (local u = dx*cos - dz*sin, w = dx*sin + dz*cos) */
    const cs=Math.cos(e),sn=Math.sin(e),ex=Math.abs(cs)*c+Math.abs(sn)*d,ez=Math.abs(sn)*c+Math.abs(cs)*d;L.push({k,x:a,z:b,hw:c,hd:d,cs,sn,x0:a-ex,x1:a+ex,z0:b-ez,z1:b+ez});}
  else L.push({k:2,ax:a,az:b,bx:c,bz:d,r:e,x0:Math.min(a,c)-e,x1:Math.max(a,c)+e,z0:Math.min(b,d)-e,z1:Math.max(b,d)+e});/* a fence: from (a,b) to (c,d), e its half thickness */}
/* a box in a building's own frame (lx0..lx1 across, lz0..lz1 deep), as a solid of its village */
function vilSolidLocal(v,b,lx0,lx1,lz0,lz1){const c=owiL2W(b,(lx0+lx1)/2,(lz0+lz1)/2);vilSolid(v,1,c[0],c[1],(lx1-lx0)/2,(lz1-lz0)/2,b.rot);}
/* the walking map of a village: the cells round it, their solids in 2 m buckets (trees and rocks too, so nothing is looked up by name while walking).
   It is built in stages, a few ms a frame (vilNavFill): the village's solids into the buckets, the trees and rocks, every cell, then the regions. Until it is ready the villagers wait, unseen. */
function vilNav(v){if(v.nav)return v.nav;const m=v.rad+12,c0=owCell(v.x-m,v.z-m),c1=owCell(v.x+m,v.z+m),C0=Math.max(1,c0.c),R0=Math.max(1,c0.r),C1=Math.min(W-2,c1.c),R1=Math.min(H-2,c1.r),nc=Math.max(1,C1-C0+1),nr=Math.max(1,R1-R0+1),n=nc*nr;
  return v.nav={C0,R0,nc,nr,n,m,B:new Map(),walk:null,searched:false,stage:0,si:0,pk:null,fillI:0,ready:false,comp:null,main:0};}
function vilPut(N,s){for(let ix=Math.floor(s.x0/2);ix<=Math.floor(s.x1/2);ix++)for(let iz=Math.floor(s.z0/2);iz<=Math.floor(s.z1/2);iz++){const k=ix*4096+iz;let a=N.B.get(k);if(!a)N.B.set(k,a=[]);a.push(s);}}
/* the map is worked out a little every frame (ms at most); at the end its walkable cells are split into the regions that join up, and villagers keep to the biggest one
   (a fenced yard or the gap behind two houses can be a pocket with no way out: nobody is put there and nobody is sent there) */
function vilNavFill(v,N,ms){const t0=performance.now(),late=()=>performance.now()-t0>ms;
  if(N.stage===0){const L=v.vsol||[];while(N.si<L.length){vilPut(N,L[N.si++]);if((N.si&31)===0&&late())return false;}N.stage=1;
    const m=N.m;N.pk=[];for(let ix=Math.floor((v.x-m-2)/4);ix<=Math.floor((v.x+m+2)/4);ix++)for(let iz=Math.floor((v.z-m-2)/4);iz<=Math.floor((v.z+m+2)/4);iz++)N.pk.push(ix,iz);N.si=0;if(late())return false;}
  if(N.stage===1){const G=OW.propGrid;while(G&&N.si<N.pk.length){const L=G.get(N.pk[N.si]+','+N.pk[N.si+1]);N.si+=2;if(L)for(const p of L)vilPut(N,{k:0,x:p.x,z:p.z,r:p.r,p,x0:p.x-p.r,x1:p.x+p.r,z0:p.z-p.r,z1:p.z+p.r});if((N.si&63)===0&&late())return false;}
    N.stage=2;N.pk=null;const n=N.n;N.walk=new Int8Array(n).fill(-1);N.thin=new Int8Array(n).fill(-1);N.open=new Int8Array(n).fill(-1);N.eR=new Int8Array(n);N.eD=new Int8Array(n);N.eDR=new Int8Array(n);N.eDL=new Int8Array(n);N.fillI=0;if(late())return false;}
  if(N.stage===2){while(N.fillI<N.n){vilCell(v,N,N.fillI++);if((N.fillI&63)===0&&late())return false;}N.stage=3;N.fillI=0;if(late())return false;}
  if(N.stage===3){const nc=N.nc,wk=N.walk;while(N.fillI<N.n){const i=N.fillI++;if(wk[i]===1){const c=i%nc,R=c<nc-1&&wk[i+1]===1,D=i+nc<N.n&&wk[i+nc]===1,L=c>0&&wk[i-1]===1;if(R)vilEdge(v,N,i,i+1);if(D)vilEdge(v,N,i,i+nc);
      if(R&&D&&wk[i+nc+1]===1)vilEdge(v,N,i,i+nc+1);if(L&&D&&wk[i+nc-1]===1)vilEdge(v,N,i,i+nc-1);}if((N.fillI&7)===0&&late())return false;}N.stage=4;/* (the clock every 8 cells: near houses a cell's edges each look along their line - vilOpen - and 64 cells between two looks at the clock came to 100 ms) */if(late())return false;}
  /* stage 4: the regions, by flood fill along the edges (a few ms a frame like the rest) */
  if(!N.comp){const nc=N.nc,n=N.n,wk=N.walk,eR=N.eR,eD=N.eD;if(!N.cmp){N.cmp=new Int32Array(n);N.cq=new Int32Array(n);N.ch=0;N.ct=0;N.cid=0;N.ci0=0;N.ccnt=0;N.cbest=0;N.cbestN=0;}
    const comp=N.cmp,q=N.cq;let k=0;
    for(;;){if(N.ch<N.ct){const i=q[N.ch++];N.ccnt++;const c=i%nc,id=N.cid;
        if(c>0&&!comp[i-1]&&wk[i-1]===1&&eR[i-1]===1){comp[i-1]=id;q[N.ct++]=i-1;}if(c<nc-1&&!comp[i+1]&&wk[i+1]===1&&eR[i]===1){comp[i+1]=id;q[N.ct++]=i+1;}
        if(i>=nc&&!comp[i-nc]&&wk[i-nc]===1&&eD[i-nc]===1){comp[i-nc]=id;q[N.ct++]=i-nc;}if(i+nc<n&&!comp[i+nc]&&wk[i+nc]===1&&eD[i]===1){comp[i+nc]=id;q[N.ct++]=i+nc;}
        if((++k&1023)===0&&late())return false;continue;}
      if(N.cid&&N.ccnt>N.cbestN){N.cbestN=N.ccnt;N.cbest=N.cid;}N.ccnt=0;
      while(N.ci0<n&&(comp[N.ci0]||wk[N.ci0]!==1))N.ci0++;if(N.ci0>=n)break;
      N.cid++;N.ch=0;N.ct=0;comp[N.ci0]=N.cid;q[N.ct++]=N.ci0;}
    N.comp=comp;N.main=N.cbest;N.cq=null;}
  N.ready=true;return true;}
/* is a circle of radius r at (x, z) clear of everything solid? */
function vilFree(v,x,z,r){const N=v.nav||vilNav(v);/* (before the map's stage 1 is done only the grid and the solids that are in already count: nothing asks before it is ready) */
  for(const o of VILN.S){const c=Math.round((x+o[0]*r)/TS+OX),rr=Math.round((z+o[1]*r)/TS+OZ);if(c<1||rr<1||c>=W-1||rr>=H-1||grid[rr][c]===2)return false;}
  const ix0=Math.floor((x-r)/2),ix1=Math.floor((x+r)/2),iz0=Math.floor((z-r)/2),iz1=Math.floor((z+r)/2);
  for(let ix=ix0;ix<=ix1;ix++)for(let iz=iz0;iz<=iz1;iz++){const L=N.B.get(ix*4096+iz);if(!L)continue;
    for(const s of L){if(x<s.x0-r||x>s.x1+r||z<s.z0-r||z>s.z1+r)continue;
      if(s.k===0){if(s.p&&!s.p.alive)continue;const dx=x-s.x,dz=z-s.z,q=s.r+r;if(dx*dx+dz*dz<q*q)return false;}
      else if(s.k===1){const dx=x-s.x,dz=z-s.z,u=dx*s.cs-dz*s.sn,w=dx*s.sn+dz*s.cs;if(Math.abs(u)<s.hw+r&&Math.abs(w)<s.hd+r)return false;}
      else{const ex=s.bx-s.ax,ez=s.bz-s.az,L2=ex*ex+ez*ez||1,t=Math.max(0,Math.min(1,((x-s.ax)*ex+(z-s.az)*ez)/L2)),qx=s.ax+ex*t-x,qz=s.az+ez*t-z,q=s.r+r;if(qx*qx+qz*qz<q*q)return false;}}}
  return true;}
const vilI=(N,c,r)=>{c-=N.C0;r-=N.R0;return c<0||r<0||c>=N.nc||r>=N.nr?-1:r*N.nc+c;};
function vilCell(v,N,i){let w=N.walk[i];if(w<0){const p=tw(N.C0+i%N.nc,N.R0+(i/N.nc|0));w=N.walk[i]=vilFree(v,p.x,p.z,VILN.R)?1:0;}return w;}
/* is something thin near a cell (within .95 m of its centre: a fence, a palisade, a post, a barrel, a garden bed)? Only there can the way between two free cells be shut. */
function vilThin(v,N,i){let t=N.thin[i];if(t>=0)return t;const p=tw(N.C0+i%N.nc,N.R0+(i/N.nc|0)),x=p.x,z=p.z,R=.95;t=0;
  for(let ix=Math.floor((x-R)/2);ix<=Math.floor((x+R)/2)&&!t;ix++)for(let iz=Math.floor((z-R)/2);iz<=Math.floor((z+R)/2)&&!t;iz++){const L=N.B.get(ix*4096+iz);if(!L)continue;
    for(const s of L){if(x<s.x0-R||x>s.x1+R||z<s.z0-R||z>s.z1+R)continue;let d;
      if(s.k===0){if(s.r>=.6||(s.p&&!s.p.alive))continue;d=Math.hypot(x-s.x,z-s.z)-s.r;}
      else if(s.k===1){if(Math.min(s.hw,s.hd)>=.6)continue;const dx=x-s.x,dz=z-s.z,u=Math.max(0,Math.abs(dx*s.cs-dz*s.sn)-s.hw),w=Math.max(0,Math.abs(dx*s.sn+dz*s.cs)-s.hd);d=Math.hypot(u,w);}
      else{const ex=s.bx-s.ax,ez=s.bz-s.az,L2=ex*ex+ez*ez||1,tt=Math.max(0,Math.min(1,((x-s.ax)*ex+(z-s.az)*ez)/L2));d=Math.hypot(s.ax+ex*tt-x,s.az+ez*tt-z)-s.r;}
      if(d<R){t=1;break;}}}
  return N.thin[i]=t;}
/* can a villager go straight from cell i to its neighbour j? (remembered: 1 yes, 2 no) */
/* nothing solid within .75 m of a cell's middle: a step from it to another such cell (1 m, or 1.41 m across) keeps at least .25 m from everything - no need to look along it. Cells only need .3 m (vilCell): the corner of a house could stand on the line between two of them, and villagers walked into it */
function vilOpen(v,N,i){let t=N.open[i];if(t<0){const p=tw(N.C0+i%N.nc,N.R0+(i/N.nc|0));t=N.open[i]=vilFree(v,p.x,p.z,.75)?1:0;}return t;}
function vilEdge(v,N,i,j){const nc=N.nc,d=j-i;let A,k;if(d===1){A=N.eR;k=i;}else if(d===-1){A=N.eR;k=j;}else if(d===nc){A=N.eD;k=i;}else if(d===-nc){A=N.eD;k=j;}
  else if(d===nc+1){A=N.eDR;k=i;}else if(d===-nc-1){A=N.eDR;k=j;}else if(d===nc-1){A=N.eDL;k=i;}else{A=N.eDL;k=j;}
  let e=A[k];if(e)return e===1;
  if(vilOpen(v,N,i)&&vilOpen(v,N,j)&&!vilThin(v,N,i)&&!vilThin(v,N,j))e=1;else{const a=vilXZ(N,i),b=vilXZ(N,j);e=vilLOS(v,a[0],a[1],b[0],b[1],VILN.RW+.01,.1)?1:2;}/* (samples 10 cm apart, radius +1 cm: nothing reaches into the walking circle between two of them) */
  A[k]=e;return e===1;}
/* the walkable cell of the main region nearest to (x, z), within a few rings, or -1; with los, only a cell that (x, z) sees in a straight line */
function vilNear(v,N,x,z,maxR,los){const c0=Math.round(x/TS+OX),r0=Math.round(z/TS+OZ),C=[];maxR=maxR==null?4:maxR;
  for(let rad=0;rad<=maxR;rad++){const n0=C.length;for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){if(Math.max(Math.abs(dr),Math.abs(dc))!==rad)continue;const i=vilI(N,c0+dc,r0+dr);
      if(i<0||!vilCell(v,N,i)||(N.comp&&N.comp[i]!==N.main))continue;const p=tw(c0+dc,r0+dr);C.push([(p.x-x)**2+(p.z-z)**2,i,p.x,p.z]);}
    if(C.length>n0&&rad>=1){C.sort((a,b)=>a[0]-b[0]);if(!los)return C[0][1];for(const q of C)if(vilLOS(v,x,z,q[2],q[3],VILN.RW))return q[1];}}
  if(C.length&&!los){C.sort((a,b)=>a[0]-b[0]);return C[0][1];}return -1;}
const vilXZ=(N,i)=>{const p=tw(N.C0+i%N.nc,N.R0+(i/N.nc|0));return[p.x,p.z];};
/* a free place near (x, z): the point itself when a villager fits there, else the centre of the nearest walkable cell */
function vilSnap(v,x,z,maxR){const N=vilNav(v),i0=vilI(N,Math.round(x/TS+OX),Math.round(z/TS+OZ));if(i0>=0&&N.comp&&N.comp[i0]===N.main&&vilFree(v,x,z,VILN.R))return[x,z];const i=vilNear(v,N,x,z,maxR);return i<0?null:vilXZ(N,i);}
/* A* from cell s to cell t over 8 neighbours (a diagonal only where both cells beside it are walkable); cells beside something solid cost a little more, so the way keeps off walls.
   It stops after maxE cells or ms milliseconds (null). */
/* (the search's scratch arrays are shared by all villages and grow to the biggest map) */
function vilScratch(n){let S=VILN.scr;if(!S||S.n<n){S=VILN.scr={n,g:new Float32Array(n),f:new Float32Array(n),par:new Int32Array(n),seen:new Uint32Array(n),cl:new Uint32Array(n),heap:new Int32Array(n*2+16),stamp:0};}return S;}
function vilAStar(v,N,s,t,maxE,ms){const S=vilScratch(N.n),nc=N.nc,n=N.n,st=++S.stamp,G=S.g,F=S.f,PAR=S.par,SEEN=S.seen,CL=S.cl,HP=S.heap,WK=N.walk,cap=HP.length-1,tc=t%nc,tr=t/nc|0,t0=performance.now();let hn=0,e=0;
  const h=i=>{const dx=Math.abs(i%nc-tc),dr=Math.abs((i/nc|0)-tr);return dx+dr-.5858*Math.min(dx,dr);};
  const push=i=>{if(hn>=cap)return;let k=++hn;while(k>1){const pk=k>>1;if(F[HP[pk]]<=F[i])break;HP[k]=HP[pk];k=pk;}HP[k]=i;};
  const pop=()=>{const top=HP[1],last=HP[hn--];let k=1;for(;;){let c=k*2;if(c>hn)break;if(c<hn&&F[HP[c+1]]<F[HP[c]])c++;if(F[HP[c]]>=F[last])break;HP[k]=HP[c];k=c;}HP[k]=last;return top;};
  const rel=(i,j,w)=>{if(CL[j]===st)return;const g=G[i]+w;if(SEEN[j]===st&&g>=G[j])return;SEEN[j]=st;G[j]=g;F[j]=g+h(j);PAR[j]=i;push(j);};
  G[s]=0;F[s]=h(s);SEEN[s]=st;PAR[s]=-1;push(s);
  while(hn>0){const i=pop();if(CL[i]===st)continue;CL[i]=st;if(i===t)break;if(++e>maxE||((e&63)===0&&performance.now()-t0>ms))return null;
    const c=i%nc,L=c>0&&WK[i-1]===1,R=c<nc-1&&WK[i+1]===1,U=i>=nc&&WK[i-nc]===1,D=i+nc<n&&WK[i+nc]===1,pen=L&&R&&U&&D?0:.45;
    if(L&&vilEdge(v,N,i,i-1))rel(i,i-1,1+pen);if(R&&vilEdge(v,N,i,i+1))rel(i,i+1,1+pen);if(U&&vilEdge(v,N,i,i-nc))rel(i,i-nc,1+pen);if(D&&vilEdge(v,N,i,i+nc))rel(i,i+nc,1+pen);
    if(L&&U&&WK[i-nc-1]===1&&vilEdge(v,N,i,i-nc-1))rel(i,i-nc-1,1.4142+pen);if(R&&U&&WK[i-nc+1]===1&&vilEdge(v,N,i,i-nc+1))rel(i,i-nc+1,1.4142+pen);
    if(L&&D&&WK[i+nc-1]===1&&vilEdge(v,N,i,i+nc-1))rel(i,i+nc-1,1.4142+pen);if(R&&D&&WK[i+nc+1]===1&&vilEdge(v,N,i,i+nc+1))rel(i,i+nc+1,1.4142+pen);}
  if(CL[t]!==st)return null;const out=[];for(let i=t;i>=0;i=PAR[i])out.push(vilXZ(N,i));out.reverse();return out;}
/* is the straight way from a to b clear for a circle of radius r? */
function vilLOS(v,ax,az,bx,bz,r,st){const d=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.ceil(d/(st||.2)));for(let k=1;k<=n;k++){const t=k/n;if(!vilFree(v,ax+(bx-ax)*t,az+(bz-az)*t,r))return false;}return true;}
/* pull a path of cell centres straight: from each corner, as far ahead as the way is clear */
function vilPull(v,P){if(P.length<3)return P;const out=[P[0]],r=VILN.RW+.04;let a=0,k=2;
  while(k<P.length){if(Math.hypot(P[k][0]-P[a][0],P[k][1]-P[a][1])<12&&vilLOS(v,P[a][0],P[a][1],P[k][0],P[k][1],r)){k++;continue;}a=k-1;out.push(P[a]);k=a+2;}/* (a straight run of at most 12 m: the tests stay short) */
  out.push(P[P.length-1]);return out;}
/* the way from (sx, sz) to (tx, tz), smoothed, or null */
function vilPath(v,sx,sz,tx,tz){const t0=performance.now();VILN.stats.search++;
  try{if(Math.hypot(tx-sx,tz-sz)<14&&vilLOS(v,sx,sz,tx,tz,VILN.RW+.04))return[[sx,sz],[tx,tz]];
    const N=vilNav(v),si=vilNear(v,N,sx,sz,3,true),ti=vilNear(v,N,tx,tz,3);if(si<0||ti<0){VILN.stats.fail++;return null;}
    if(N.comp&&N.comp[si]!==N.comp[ti]){VILN.stats.fail++;return null;}const P=vilAStar(v,N,si,ti,9000,4);if(!P){VILN.stats.fail++;return null;}
    P.unshift([sx,sz]);const e=P[P.length-1];if((e[0]!==tx||e[1]!==tz)&&vilFree(v,tx,tz,VILN.RW)&&vilLOS(v,e[0],e[1],tx,tz,VILN.RW+.005,.05))P.push([tx,tz]);/* (samples 5 cm apart: at 20 cm a corner reached 2.7 cm into the line between two of them, and a villager walked into it) */return vilPull(v,P);}
  finally{VILN.stats.ms+=performance.now()-t0;}}

/* ---- doors ---- */
/* the places of one house's door visit, in the house's frame: A in front (free ground, where the path ends), Fo the foot of the steps, D on the ledge before the door, I inside
   (clear of furniture, of the stairs and of the swing of the leaf). null when the house will not do. */
function vilDoor(v,b){if(!owdLeaf(b)||!owiLive(b))return null;const nd=b.enter.ends&&b.enter.ends[0];if(!nd||nd.sgn<=0)return null;
  /* only a house whose plan is made already: the game makes the plans of the houses near the hero (owiTick); making one costs 20-40 ms, too much for a villager's whim */
  const ic=b.ic;if(!ic||!ic.col||!ic.P)return null;if(b.vd&&b.vd.ic===ic)return b.vd.ok?b.vd:null;
  const P=ic.P,S=nd.spec,Q=P.floors[0].Q,g=owdG(b),u=g.um,fail=()=>{b.vd={ic,ok:false};return null;};
  let I=null;
  find:for(const dz of[1.35,1.6,1.15,1.9])for(const dx of[0,.35,-.35,.6,-.6]){const lx=u+dx,lz=Q.zb-dz;if(lx<Q.xa+.35||lx>Q.xb-.35||lz<Q.za+.35)continue;
    if(owiHit(ic.col,lx,lz,1,.32))continue;if(P.stairs.some(f=>lx>f.x0-.4&&lx<f.x1+.4&&lz>f.z0-.4&&lz<f.z1+.4))continue;if(Math.hypot(lx-g.xpm,lz-g.zcm)<g.Rm+.4)continue;I=[lx,lz];break find;}
  if(!I)return fail();
  for(let k=0;k<=8;k++){const t=k/8,lx=u+(I[0]-u)*t,lz=Q.zb-.3+(I[1]-Q.zb+.3)*t;if(owiHit(ic.col,lx,lz,1,.2))return fail();}
  const zE=Math.max(nd.E?nd.E.z1:0,nd.zF+S.run+.3),D=[u,g.zcm+.5],Fo=[u,nd.zF+S.run+.25];
  /* A: past the steps and past the footprint the villagers keep off (b.vfront), on the carved approach */
  const z0=Math.max(zE+.55,(b.vfront||0)+.65);let A=null;for(const o of[0,.4,.8,1.3]){const w=owiL2W(b,u,z0+o);if(!vilFree(v,w[0],w[1],VILN.R))continue;const N=vilNav(v),i=vilNear(v,N,w[0],w[1],1);if(i<0)continue;const c=vilXZ(N,i);if(!vilLOS(v,c[0],c[1],w[0],w[1],VILN.RW))continue;A=[u,z0+o];break;}
  if(!A)return fail();const Aw=owiL2W(b,A[0],A[1]);
  return b.vd={ic,ok:true,A,Aw,Fo,D,I,u};}
/* the height to stand at, at (lx, lz) of a house (as the hero's: the floor, the ledge before the door, the treads, else the ground) */
function vilDoorY(b,lx,lz){const P=b.ic.P,F0=P.floors[0],Q=F0.Q,y0=b.hi+F0.y;
  if(lx>=Q.xa&&lx<=Q.xb&&lz>=Q.za&&lz<=Q.zb)return y0;
  for(const nd of b.enter.ends){const S=nd.spec,s=nd.sgn;if(Math.abs(lx-nd.u)>S.width/2+.001)continue;const o=(lz-nd.zF)*s;
    if(o<=0&&(lz-(s>0?Q.zb:Q.za))*s>=0)return y0;if(o>0&&o<S.run)return y0-(Math.floor(o/S.tread)+1)*S.r;}
  const w=owiL2W(b,lx,lz);return owWalkY(w[0],w[1]);}
/* is a villager in the doorway of b or in the swing of its leaf? (a door is not shut on it) */
function vilInDoor(b){if(!b||!b.dr)return false;if(b.vBy&&vilInDoor1(b,b.vBy))return true;if(b.vIn)for(const p of b.vIn)if(vilInDoor1(b,p))return true;return false;}/* (the caller of a visit, and the people of the house going home or out: vilhome.js) */
function vilInDoor1(b,p){if(!p.ds||(p.lv||0)>0)return false;const g=owdG(b),l=owiW2L(b,p.x,p.z),Q=b.ic&&b.ic.P&&b.ic.P.floors[0].Q,zIn=Q?Q.zb:g.zcm-.1;
  if(Math.abs(l[0]-g.um)<g.wm/2+.3&&l[1]>zIn-.5&&l[1]<g.zcm+.45)return true;/* in the doorway */
  return Math.hypot(l[0]-g.xpm,l[1]-g.zcm)<g.Rm+.3&&(l[1]-g.zcm)*(b.dr.dir>0?-1:1)>-.3;/* in the swing of the leaf */}
/* houses near a villager that it could visit */
function vilPickDoor(v,p){const C=[],H=heroU,cx=camera.position.x,cz=camera.position.z;for(const b of v.buildings){if(b.vBy||!owdLeaf(b)||!owiLive(b))continue;const d=Math.hypot(b.x-p.x,b.z-p.z);if(d>32)continue;
    if(Math.min(H?Math.hypot(b.x-H.x,b.z-H.z):1e9,Math.hypot(b.x-cx,b.z-cz))>60)continue;C.push([d+Math.random()*12,b]);}
  C.sort((a,c)=>a[0]-c[0]);for(let k=0;k<Math.min(3,C.length);k++){const b=C[k][1],d=vilDoor(v,b);if(d)return b;}return null;}
function vilRelease(p){vilHRelease(p);if(p.vb&&p.vb.vBy===p)p.vb.vBy=null;p.vb=null;p.ds=null;p.inB=null;p.lieK=0;p.lieS=null;p.lv=0;}

/* ---- the brain ---- */
function vilGo(v,p,x,z,maxR){const q=vilSnap(v,x,z,maxR==null?5:maxR);if(!q){p.mode='idle';p.wait=.5+Math.random();if(p.job==='visit')vilRelease(p);p.job=null;p.carry=false;return false;}p.tx=q[0];p.tz=q[1];p.mode='plan';return true;}
function vilDecide(v,p){if(vilHGo(v,p))return true;/* (bedtime: home - vilhome.js) */if(p.vb)vilRelease(p);p.job=null;p.carry=false;
  if(v.repairB&&Math.random()<.7){p.job='fetch';return vilGo(v,p,v.x+(Math.random()-.5)*7,v.z+(Math.random()-.5)*7);}
  const r=Math.random();
  if(r<.3&&!vilHUp(v,p)){/* (not at night: the few who stay up wander the streets) */const b=vilPickDoor(v,p);if(b){p.job='visit';p.vb=b;b.vBy=p;p.tx=b.vd.Aw[0];p.tz=b.vd.Aw[1];p.mode='plan';return true;}/* (A was checked: free, and joined to the main region) */}
  const big=v.rad>34,S=big?v.spots.filter(s=>Math.hypot(s.x-p.x,s.z-p.z)<30):v.spots;
  if(r<.78&&S.length){const s=S[Math.floor(Math.random()*S.length)];return vilGo(v,p,s.x+(Math.random()-.5)*1.5,s.z+(Math.random()-.5)*1.5);}
  const a=Math.random()*6.283;if(big){const rr=6+Math.random()*20;let x=p.x+Math.cos(a)*rr,z=p.z+Math.sin(a)*rr;const dv=Math.hypot(x-v.x,z-v.z);if(dv>v.rad*.9){x=v.x+(x-v.x)*v.rad*.9/dv;z=v.z+(z-v.z)*v.rad*.9/dv;}return vilGo(v,p,x,z);}
  const rr=Math.random()*v.rad*.45;return vilGo(v,p,v.x+Math.cos(a)*rr,v.z+Math.sin(a)*rr);}
function vilArrive(v,p){p.path=null;
  if(p.job==='home'){if(p.hopTo){p.hopTo=false;if(vilHGo(v,p,true))return;}else{const d=p.vh&&p.vh.slot&&p.vh.slot.b.vd;if(d&&vilHHome(v,p)&&Math.hypot(d.Aw[0]-p.x,d.Aw[1]-p.z)<.4&&vilHIn(v,p))return;}p.job=null;p.mode='idle';p.wait=.5+Math.random();return;}
  if(p.job==='fetch'&&v.repairB){p.carry=true;p.job='carry';const b=v.repairB;vilGo(v,p,b.x+Math.sin(b.rot)*b.r*.8+(Math.random()-.5)*1.5,b.z+Math.cos(b.rot)*b.r*.8+(Math.random()-.5)*1.5,6);return;}
  if(p.job==='carry'){p.mode='work';p.wait=2.5+Math.random()*2.5;return;}
  if(p.job==='visit'&&p.vb&&p.vb.vBy===p&&vilDoor(v,p.vb)&&Math.hypot(p.vb.vd.Aw[0]-p.x,p.vb.vd.Aw[1]-p.z)<.3){vilDoorIn(p,p.vb);return;}
  if(p.job==='visit')vilRelease(p);p.mode='idle';p.wait=1+Math.random()*4;p.job=null;p.carry=false;}
/* the door script: a list of steps, each a place to walk to (in the house's frame) or a thing to do */
function vilDoorIn(p,b){const d=b.vd;p.ds={b,k:0,t:0,op:false,q:[{to:d.Fo},{to:d.D},{act:'open'},{to:d.I,inB:true,door:1},{act:'shut'},{act:'stay',t:6+Math.random()*16},{act:'open'},{to:d.D,inB:false,door:1},{to:d.Fo},{act:'shutFar'},{to:d.A},{act:'done'}]};p.mode='door';VILN.stats.doors++;}
/* the hero, as something to keep clear of (null when there is none, or when one of the two is in a house and the other is not in the same one) */
function vilHeroNear(p){const H=heroU;if(!H||!OW.on||H.dead||(p.lieK||0)>0)return null;const hin=OWI.in?OWI.cb:null;if((p.inB||null)!==hin)return null;if(hin&&(p.lv||0)!==OWI.lv)return null;return H;}
function vilDoorStep(v,p,dt,tt){const s=p.ds,b=s.b;
  if(!owiLive(b)||!b.ic||!b.ic.P||!b.vd||!b.vd.ok){/* the house burnt or fell: out to the front */const w=b.vd&&b.vd.Aw||[p.x,p.z];p.x=w[0];p.z=w[1];vilRelease(p);p.mode='idle';p.wait=1;p.job=null;p.y=null;return 0;}
  const st=s.q[s.k];if(!st){vilRelease(p);p.mode='idle';p.wait=1+Math.random()*3;p.job=null;return 0;}
  const next=()=>{s.k++;s.t=0;s.tTry=0;};s.t+=dt;
  /* through the doorway with the door shut (someone else of the house shut it after this one found it open): open it first */
  if(st.door&&!s.ghost&&b.dr&&b.dr.t!==1&&b.dr.a<.9&&!vilHFar(b)){s.q.splice(s.k,0,{act:'open'});s.t=0;return 0;}
  if(st.to){const w=owiL2W(b,st.to[0],st.to[1]),dx=w[0]-p.x,dz=w[1]-p.z,d=Math.hypot(dx,dz);
    if(d<.05){p.x=w[0];p.z=w[1];if(st.inB!=null)p.inB=st.inB?b:null;if(st.lv!=null)p.lv=st.lv;next();return 0;}
    /* the hero in the way (on the steps, in the doorway, just inside): wait */
    const H=heroU&&OW.on&&!heroU.dead&&!(OWI.cb===b&&OWI.in&&OWI.lv!==(p.lv||0))?heroU:null;/* (the hero on another floor of the house is not in the way) */
    if(H){const hx=H.x-p.x,hz=H.z-p.z,hd=Math.hypot(hx,hz);if(hd<.95&&(hx*dx+hz*dz)>0){p.yaw=lerpAng(p.yaw,Math.atan2(dx,dz),1-Math.exp(-6*dt));s.hb=(s.hb||0)+dt;
        /* still in the way after a few seconds: on the way in, a villager already inside stays where it is, one still outside turns back; on the way out it waits */
        if(s.hb>3.5&&s.k<5){s.hb=0;const l=owiW2L(b,p.x,p.z),Q=b.ic.P.floors[0].Q;
          if(p.inB||(l[1]<Q.zb-.45&&l[0]>Q.xa+.3&&l[0]<Q.xb-.3&&!owiHit(b.ic.col,l[0],l[1],1,.28))){p.inB=b;s.k=4;s.t=0;}else{s.q=[{to:b.vd.Fo},{act:'shutFar'},{to:b.vd.A},{act:'done'}];s.k=0;s.t=0;}}
        return 0;}}
    s.hb=0;
    const nx=s.q[s.k+1],stopAfter=!nx||!nx.to,sp=Math.min(d/dt,vilAcc(p,.85*vilVk(p).spd*(st.st?.6:1),dt),stopAfter?vilStopCap(p,d):1e9);p.ahead=0;/* (slower on a flight of stairs) */
    p.yaw=lerpAng(p.yaw,Math.atan2(dx,dz),1-Math.exp(-9*dt));p.x+=dx/d*sp*dt;p.z+=dz/d*sp*dt;if(p.inB&&b.ic.P.stairs.length){const l=owiW2L(b,p.x,p.z);p.lv=vilHLv(b,l[0],l[1],p.lv||0);}return sp;}
  const dr=b.dr;
  if(st.act&&vilHAct(v,p,s,st,dt))return 0;/* (going to bed, sleeping, getting up: vilhome.js) */
  if(st.act==='open'&&!(dr&&dr.t===1)&&vilHFar(b)){s.ghost=true;next();return 0;}/* (far from the hero and the camera nobody sees the door: it is not swung - owdTick would shut it again) */
  if(st.act==='shut'&&s.ghost){s.ghost=false;next();return 0;}
  if(st.act==='open'){const g=owdG(b),fw=owiL2W(b,g.um,g.zcm);p.yaw=lerpAng(p.yaw,Math.atan2(fw[0]-p.x,fw[1]-p.z),1-Math.exp(-6*dt));
    if(dr&&dr.t===1){if(dr.a>=.97)next();return 0;}
    if(s.t>.35&&!(heroU&&owdHeroIn(b,1,false))){if(owdSet(b,true,{dir:1})==='')s.op=true;}
    if(s.t>8&&!p.inB){/* it would not open: give up and go back down */s.q=[{to:b.vd.Fo},{act:'shutFar'},{to:b.vd.A},{act:'done'}];s.k=0;s.t=0;}
    return 0;}
  if(st.act==='shut'){if(!s.op||!dr||dr.t!==1){s.op=false;next();return 0;}if(s.t<.5)return 0;
    /* (a try every .4 s; someone in the doorway - the hero, or this villager left standing in it - and after 5 s the door is left open) */
    if(s.t-(s.tTry||0)>=.4){s.tTry=s.t;if(owdSet(b,false)===''){s.op=false;s.tTry=0;next();return 0;}}if(s.t>5){s.op=false;s.tTry=0;next();}return 0;}
  if(st.act==='stay'){if(st.yaw==null)st.yaw=b.rot+Math.PI+(Math.random()-.5)*2.2;p.yaw=lerpAng(p.yaw,st.yaw,1-Math.exp(-3*dt));if(s.t>st.t)next();return 0;}
  if(st.act==='shutFar'){if(s.op&&dr&&dr.t===1)(v.dq||(v.dq=[])).push({b,p,t:tt+.3,until:tt+8});s.op=false;next();return 0;}
  if(st.act==='done'){const w=b.vd.Aw;p.x=w[0];p.z=w[1];vilRelease(p);p.mode='idle';p.wait=1+Math.random()*3;p.job=null;return 0;}
  next();return 0;}
/* doors waiting to be shut behind a villager that came out (the hero may be standing in one) */
function vilDoorQueue(v,tt){if(!v.dq||!v.dq.length)return;for(let i=v.dq.length-1;i>=0;i--){const q=v.dq[i];if(tt<q.t)continue;const d=q.b.dr;
  if(!d||d.t!==1||(q.b.vBy&&q.b.vBy!==q.p)||tt>q.until){v.dq.splice(i,1);continue;}/* (another villager has the house now: it sees to the door) */if(owdSet(q.b,false)==='')v.dq.splice(i,1);else q.t=tt+.5;}}

/* the speed a villager really moves at: a critically damped spring towards the speed it wants (it takes a second or so to get into its stride and slows down as it stops, as the hero does) */
/* coming to a stop: never faster than a gentle, even deceleration (VILN.DEC w/s^2) allows over the ground that is left, so the speed eases out to nothing exactly at the spot - not a stop from a walk */
function vilStopCap(p,d){const c=Math.sqrt(2*VILN.DEC*Math.max(0,d-.005));if((p.vel||0)>c){p.vel=c;p.velA=Math.min(0,p.velA||0);}return c;}
function vilAcc(p,vt,dt){let v=p.vel||0,a=p.velA||0;const w=vt>v?2.8:4,n=Math.max(1,Math.ceil(dt/.016)),h=dt/n;for(let k=0;k<n;k++){a+=(w*w*(vt-v)-2*w*a)*h;v+=a*h;}if(v<0){v=0;a=Math.max(0,a);}p.vel=v;p.velA=a;return v;}
/* ---- one frame of a village's villagers ---- */
function vilTick(v,dt,tt){const att=v.under||(tt-v.lastAttack<7),N=vilNav(v);N.searched=false;N.stamp2=((N.stamp2|0)+1)&1023;if(VILH.tt!==tt){VILH.tt=tt;VILH.tok=0;}
  if(!N.ready&&!vilNavFill(v,N,1.5)){for(const p of v.villagers)p.g.visible=false;return;}
  vilDoorQueue(v,tt);const H=heroU&&OW.on&&!heroU.dead?heroU:null;
  /* the beds (vilhome.js): given out a little at a time; a village that was not being run (just come near, or the game just loaded) puts its sleepers straight to bed once they have beds */
  const asg=vilHAssign(v,tt);if(v.vhT==null||tt-v.vhT>3)v.vhJ=true;v.vhT=tt;const jump=!!(v.vhJ&&asg);if(jump)v.vhJ=false;
  const vis=[];for(const p of v.villagers){p.g.visible=v.near&&!att;if(p.g.visible)vis.push(p);}
  vis.forEach((p,idx)=>{
    if(!p.nav0){p.nav0=true;p.idx=idx;p.yaw=p.g.rotation.y;const q=vilSnap(v,p.x,p.z,6);if(q){p.x=q[0];p.z=q[1];}p.spd=0;}
    if(v.vhJ&&!p.ds&&vilHBedtime(v,p)&&!vilHWanderer(v,p)){p.hold=true;return;}p.hold=false;/* (no bed known yet: it waits unseen - it will be put to bed) */
    vilHTick(v,p,dt,jump);
    let mv=0;
    if(p.mode==='walk'&&!p.path)p.mode='idle';
    /* a safety net: one found standing in something solid (outside a door visit) for half a second is put on the nearest free spot */
    if(!p.ds&&((idx+N.stamp2)&7)===0){if(!vilFree(v,p.x,p.z,.12)){p.badT=(p.badT||0)+dt*8;if(p.badT>.5){const q=vilSnap(v,p.x,p.z,4);if(q){p.x=q[0];p.z=q[1];p.y=null;if(p.mode==='walk')p.mode='plan';}p.badT=0;}}else p.badT=0;}
    if(p.mode==='idle'){p.wait-=dt;if(p.wait<=0)vilDecide(v,p);}
    if(p.mode==='plan'){if(!N.searched){N.searched=true;const P=vilPath(v,p.x,p.z,p.tx,p.tz);if(P){p.path=P;p.pi=1;p.mode='walk';p.dmin=null;if(!p.keepStk){p.stuck=0;p.px0=p.x;p.pz0=p.z;}p.keepStk=false;}
        else if(p.job==='home'&&vilHHop(v,p)){}/* (a long way home: in hops) */else{if(p.job==='visit')vilRelease(p);p.mode='idle';p.wait=.4+Math.random()*1.5;p.job=null;p.carry=false;p.keepStk=false;p.br=0;}}}
    if(p.mode==='walk')mv=vilFollow(v,p,dt,vis,H);
    else if(p.mode==='work'){p.wait-=dt;if(p.wait<=0){p.mode='idle';p.wait=.5;p.carry=false;p.job=null;}}
    else if(p.mode==='door')mv=vilDoorStep(v,p,dt,tt);
    if(mv<1e-3){p.vel=0;p.velA=0;p.ahead=0;}p.spd=(p.spd||0)+(mv-(p.spd||0))*(1-Math.exp(-(mv>p.spd?14:10)*dt));/* (the walk is matched to the ground really covered) */
  });
  /* nobody passes through anybody: the hero pushes villagers aside, villagers standing on each other step apart */
  for(const p of vis){if(p.hold)continue;if((p.lieK||0)>0){vilHBlock(p);continue;}/* (one asleep on the floor stops the hero like a post) */if((p.mode==='door'&&!p.inB)||(p.ds&&p.ds.home))continue;const h=vilHeroNear(p);
    if(h){let dx=p.x-h.x,dz=p.z-h.z,d=Math.hypot(dx,dz);const m=(OWI.RAD||.27)+.25;if(d<m){if(d<1e-3){dx=Math.sin(p.yaw||0);dz=Math.cos(p.yaw||0);d=1;}const k=(m-d)/d;
      /* the villager steps aside (straight away from the hero, else to one side or the other); one with nowhere to go stops the hero instead, like a post */
      if(!vilNudge(v,p,dx*k,dz*k,true)&&TPC.on){const nx=h.x-dx*k,nz=h.z-dz*k;if(OWI.on?owiValid(nx,nz):owCanStand(nx,nz)){h.x=nx;h.z=nz;}}}}
    for(const o of vis){if(o===p||o.hold||(o.inB||null)!==(p.inB||null)||(o.mode==='door'&&!o.inB)||(o.lieK||0)>0||(o.lv||0)!==(p.lv||0))continue;let dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz);if(d<.5){if(d<1e-3){const an=(p.idx||0)*2.4;dx=Math.sin(an)*1e-3;dz=Math.cos(an)*1e-3;d=1e-3;}/* (two sent to the very same spot) */const k=(.5-d)/d*.5;vilNudge(v,p,dx*k,dz*k);}}}
  for(const p of vis){if(p.hold){p.g.visible=false;continue;}vilPose(v,p,dt,tt);p.g.visible=vilHShown(p);vilHRoll(v,p);}
  for(const p of v.villagers){if(p.vhRoll&&!p.g.visible)p.vhRoll.visible=false;if(p.vhCov&&!p.g.visible)p.vhCov.visible=false;}}
/* move a villager by (dx, dz) if it lands on free ground (inside a house: clear of its colliders) */
function vilNudge(v,p,dx,dz,side){const ok=(nx,nz)=>{if(p.inB){const b=p.inB,lv=p.lv||0,col=b.ic&&b.ic.col,Q=b.ic&&b.ic.P.st[lv]&&b.ic.P.st[lv].Q,l=owiW2L(b,nx,nz);return !(!col||!Q||owiHit(col,l[0],l[1],1<<lv,.25)||l[0]<Q.xa+.25||l[0]>Q.xb-.25||l[1]<Q.za+.25||l[1]>Q.zb-.25);}
    return vilFree(v,nx,nz,VILN.RW)||!vilFree(v,p.x,p.z,VILN.RW);};
  /* (with side: also turned by 50 and 90 degrees either way, so a villager against a wall slides along it) */
  for(const a of side?[0,.87,-.87,1.57,-1.57]:[0]){const c=Math.cos(a),s=Math.sin(a),ex=dx*c-dz*s,ez=dx*s+dz*c;if(ok(p.x+ex,p.z+ez)){p.x+=ex;p.z+=ez;return true;}}
  return false;}
/* walking a path: towards the next corner, round others, never onto anything solid */
function vilFollow(v,p,dt,vis,H){const P=p.path;let wp=P[p.pi];
  while(p.pi<P.length-1){const dw=Math.hypot(wp[0]-p.x,wp[1]-p.z);if(dw<.02||(dw<.6&&vilLOS(v,p.x,p.z,P[p.pi+1][0],P[p.pi+1][1],VILN.RW+.04))){p.pi++;/* (+.04: samples 20 cm apart, as vilPull - a corner between two samples with the bare radius froze villagers against it; .02, not .1: the next leg was checked from the waypoint, and a villager setting off 10 cm beside it walked into the corner of a step) */wp=P[p.pi];}else break;}
  const dx=wp[0]-p.x,dz=wp[1]-p.z,d=Math.hypot(dx,dz),last=p.pi===P.length-1;
  if(last&&d<.015){p.x=wp[0];p.z=wp[1];vilArrive(v,p);return 0;}
  const ux=dx/d,uz=dz/d,hd=Math.atan2(ux,uz),err=Math.abs(pcWrap(hd-p.yaw));p.yaw=lerpAng(p.yaw,hd,1-Math.exp(-7*dt));
  /* others ahead: slow down, and step round them on the side away from them */
  let k=1,lat=0;const px=uz,pz=-ux;
  const look=(ox,oz,rad)=>{const rx=ox-p.x,rz=oz-p.z,dd=Math.hypot(rx,rz);if(dd>1.7)return;const ah=rx*ux+rz*uz,sd=rx*px+rz*pz;if(ah<=0||Math.abs(sd)>.45+rad)return;
    k=Math.min(k,Math.max(0,(dd-.5-rad)/.7));lat+=(sd>.03?-1:sd<-.03?1:(p.idx%2?1:-1))*.55*(1-dd/1.7);};
  for(const o of vis)if(o!==p&&(o.inB||null)===(p.inB||null))look(o.x,o.z,0);
  const h=vilHeroNear(p);if(h)look(h.x,h.z,.1);
  p.ahead=pcWrap(hd-p.yaw);/* (the head looks where the way turns) */
  if(last&&d<.45&&k<.35&&(p.vel||0)<.2){vilArrive(v,p);return 0;}/* (someone stands on the last few centimetres - the hero, another villager: stop here, short of the spot, rather than creep up to it and give up as stuck) */
  let sp=vilAcc(p,vilVk(p).spd*k*Math.max(.25,Math.cos(Math.min(err,1.5))),dt);if(last)sp=Math.min(sp,vilStopCap(p,d));
  const step=Math.min(d,sp*dt);let nx=p.x+ux*step+px*lat*dt,nz=p.z+uz*step+pz*lat*dt;
  const okHere=vilFree(v,p.x,p.z,VILN.RW);
  if(okHere&&!vilFree(v,nx,nz,VILN.RW)){nx=p.x+ux*step;nz=p.z+uz*step;if(!vilFree(v,nx,nz,VILN.RW)){if(vilFree(v,nx,p.z,VILN.RW))nz=p.z;else if(vilFree(v,p.x,nz,VILN.RW))nx=p.x;else{nx=p.x;nz=p.z;}}}
  const moved=Math.hypot(nx-p.x,nz-p.z);p.x=nx;p.z=nz;
  /* walled in on the way (a corner, a crate, after stepping round someone): no walking on the spot - the speed is what it covers, so it sets off gently again; close to the end it stops there, else a new way from here (twice, then the stuck rule below) */
  if(step>1e-4&&moved<.2*step){p.vel=Math.min(p.vel||0,moved/dt);p.velA=Math.min(0,p.velA||0);p.blk=(p.blk||0)+dt;
    if(last&&d<.35){p.blk=0;vilArrive(v,p);return 0;}if(p.blk>.4&&(p.br||0)<2){p.blk=0;p.br=(p.br||0)+1;p.mode='plan';p.keepStk=true;}}else p.blk=0;
  /* no headway for a while: a new way to the same place, then something else */
  p.stuck=(p.stuck||0)+dt;if(Math.hypot(p.x-p.px0,p.z-p.pz0)>.5){p.stuck=0;p.px0=p.x;p.pz0=p.z;p.tries=0;p.br=0;}
  if(last){if(d<(p.dmin==null?1e9:p.dmin)-.05){p.dmin=d;p.stuck=0;}}else p.dmin=null;/* (on the last half metre a villager cannot cover .5 m: getting closer to the spot counts - slowly, round someone crossing its way, is not stuck) */
  if(p.stuck>(k<.2?5:2.5)){p.stuck=0;p.px0=p.x;p.pz0=p.z;VILN.stats.stuck++;p.tries=(p.tries||0)+1;
    if(p.tries<2){p.mode='plan';}else{p.tries=0;if(p.job==='visit')vilRelease(p);p.mode='idle';p.wait=.5+Math.random()*2;p.job=null;p.carry=false;}}
  return moved/dt;}
/* the figure: the walk and the rest of the body (villager.js vilAnim), height and facing */
function vilPose(v,p,dt,tt){p.plank.visible=!!p.carry;
  if((p.lieK||0)>0&&p.lieS&&p.lieS.b.ic){vilHPose(v,p,dt,tt);return;}/* (sitting down on the bed, lying, getting up: vilhome.js) */
  if(p.mode==='work'&&v.repairB){const b=v.repairB;p.yaw=lerpAng(p.yaw,Math.atan2(b.x-p.x,b.z-p.z),1-Math.exp(-6*dt));}
  const db=p.ds&&p.ds.b.ic&&p.ds.b.ic.P?p.ds.b:null,gr=db?(x,z)=>{const l=owiW2L(db,x,z);return owiFloorY(db,l[0],l[1],p.lv||0,x,z);}:owWalkY;/* (the ground under each foot: on the steps of a house its treads) */
  vilAnim(p,dt,p.spd,tt,{carry:!!p.carry,work:p.mode==='work'&&!!v.repairB,hero:vilHeroNear(p),ahead:p.mode==='walk'?p.ahead||0:0,ground:gr});
  let ty;if(p.ds&&p.ds.b.ic&&p.ds.b.ic.P){const l=owiW2L(p.ds.b,p.x,p.z);ty=owiFloorY(p.ds.b,l[0],l[1],p.lv||0,p.x,p.z);}else ty=owWalkY(p.x,p.z);/* (owiFloorY: the floor the villager is on, the flights, the ledge and the steps in front, else the ground) */
  p.y=p.y==null||Math.abs(ty-p.y)>1.5?ty:p.y+(ty-p.y)*(1-Math.exp(-14*dt));
  p.g.position.set(p.x,p.y,p.z);p.g.rotation.set(0,p.yaw,0);}

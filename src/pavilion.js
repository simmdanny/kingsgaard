/* =====================================================================================================================
   KINGSGAARD PAVILIONS: the covered market stalls and the market hall of the squares, as structures you can walk into.
   A pavilion is a raised platform (stone from Tier 3 on, timber below), reached by steps in the middle of its front, with timber posts, tie beams and a roof, a counter along the back, tables at the sides and the goods of one
   trade on them. It has no walls: the hero walks up the steps, stands on the platform and moves between the posts and counters; only the posts, the counters and the edge of the platform are solid, so there is free floor between them,
   and the roof is high enough to walk under. It goes through the pipeline of the enterable buildings (steps, zones, colliders, heights: interior/*.js with `pl.open`) and has no interior mesh; in third person the roof is cut away while the hero stands under it (like a house's), so that the camera sees him, and comes back when he leaves.
   The same number of random draws as the old stall and market hall builds are made (five), so the generation of a world is not disturbed; everything else comes from the plan and from those draws. The stall's PLAN is the old stall's (placement, lot, scale); its own size is pw, pd, ph.
   Units are the building's own (metres = units * BSc).
   ===================================================================================================================== */
function owPavilion(P,R,o){
  const mk=o.pk==='market',W=o.pw||o.w,D=o.pd||o.d,t=o.tier||3,Y0=OW_FH,H=mk?(o.h||.58)+.04:(o.ph||.6),EH=Y0+H,rn=[R(),R(),R(),R(),R()],pk=(r,a)=>a[Math.floor(r*a.length)%a.length],tint=owTintHex;
  const kind=Math.floor(rn[0]*5);/* 0 greengrocer, 1 draper, 2 potter, 3 ironmonger, 4 bookseller */
  const wood=t<=2?0x6a4a2c:t===3?0x5a3d22:0x4a3220,wood2=tint(wood,1.3),dark=tint(wood,.7),stone=t>=3?0x8f8a7f:0x7a756c,mat=t<=2?'thatch':t===3?'shingle':'tile',roofCol=t<=2?0xb89a50:t===3?0x6a4a38:0xa84e3a;
  const clothA=pk(rn[1],[0xb83a30,0x3a6ab0,0xd8a020,0x3a8a50,0x8a4a8a]),clothB=0xf0e8d6,goodsC=[pk(rn[2],[0xc8402a,0xd8a830,0x6a9a3a,0xb06a30]),pk(rn[3],[0xc8402a,0xd8a830,0x6a9a3a,0xb06a30]),pk(rn[4],[0x3a6ab0,0xb83a30,0x8a4a8a,0xd8a020])];
  const posts=[],boxes=[],hp=.045;/* the solid parts, in units: [x0,x1,z0,z1] */
  const xf=W/2,zf=D/2;
  /* ---- the platform: a stone (or plank) base from the ground up to floor level, a trim board along the edge ---- */
  P('f',box(W+.12,Y0,D+.12),stone,0,Y0/2,0);
  if(t>=3){for(const sx of[-1,1])P('x',box(.03,.02,D+.14),tint(stone,1.12),sx*(xf+.06),Y0+.01,0);P('x',box(W+.12,.02,.03),tint(stone,1.12),0,Y0+.01,-zf-.06);}
  else{for(const sz of[-1,1])P('x',box(W+.14,.02,.03),wood2,0,Y0+.01,sz*(zf+.06));P('x',box(.03,.02,D+.14),wood2,-xf-.06,Y0+.01,0);P('x',box(.03,.02,D+.14),wood2,xf+.06,Y0+.01,0);}
  /* planks on the floor, running across the platform */
  for(let k=0;k<Math.round(D/.1);k++){const z=-zf+(k+.5)*D/Math.round(D/.1);P('x',box(W,.004,D/Math.round(D/.1)-.006),k%2?tint(wood,1.1):tint(wood,.95),0,Y0+.002,z);}
  /* ---- posts and beams ---- */
  const postAt=(x,z)=>{posts.push([x-hp,x+hp,z-hp,z+hp]);P('w',box(.05,H,.05),wood,x,Y0+H/2,z);P('x',box(.07,.025,.07),stone,x,Y0+.012,z);/* a stone foot */
    if(t>=4){P('x',box(.07,.03,.07),wood2,x,EH-.05,z);P('x',box(.06,.02,.06),wood2,x,Y0+.05,z);}};
  const front=[],back=[];
  if(mk){const n=Math.max(3,Math.round(W/.46));for(let i=0;i<=n;i++){const x=-xf+.05+(W-.1)*i/n;back.push(x);if(Math.abs(x)>.24)front.push(x);}}
  else{back.push(-xf+.05,xf-.05);front.push(-xf+.05,xf-.05);}
  for(const x of back)postAt(x,-zf+.05);for(const x of front)postAt(x,zf-.05);
  for(const sz of[-1,1])P('w',box(W+.06,.05,.06),dark,0,EH-.025,sz*(zf-.05));/* the plates along the long sides */
  const nt=mk?Math.max(2,back.length-1):2;for(let i=0;i<nt;i++){const x=nt===2?(i?xf-.05:-xf+.05):back[i];P('w',box(.06,.05,D),dark,x,EH-.075,0);}/* tie beams across, under the plates */
  for(const[x,sx]of[[-xf+.05,1],[xf-.05,-1]])for(const sz of[-1,1]){/* knee braces at the corner posts */P('x',box(.15,.03,.03),wood2,x+sx*.07,EH-.1,sz*(zf-.05),0,0,sx*.78);}
  /* ---- the roof (the same slabs as a house's, with ridge cap, fascia and barge boards) ---- */
  const rm=ROOFM[mat],oR={roofKind:'gable',maxRise:.42,noFill:true,beamCol:wood,fillCol:wood,roofMat:mat},rf=owRoof3(P,oR,EH,{x0:-xf,x1:xf,z0:-zf,z1:zf},rm,'x',roofCol,'w',{});
  if(h3VT(o)&&H3.on&&H3T.on)h3Roof3(P,Object.assign({},oR,{roofCol,w:W,d:D,h:H}),EH,{x0:-xf,x1:xf,z0:-zf,z1:zf},rm,'x',{},[]);/* (environment upgrade 08: the slabs dressed in shingles, hut3d.js) */
  for(let i=0;i<Math.round(W/.18);i++){const x=-xf+(i+.5)*W/Math.round(W/.18);P('r',box(.025,.035,D*.9),tint(wood,.85),x,EH+.012,0,0,0,0);}/* rafters under the slabs, seen from the platform */
  /* a cloth valance hangs from the front eave (a stall) or a plain fascia board does (the hall) */
  if(!mk){const ns=Math.round(W/.1);for(let i=0;i<ns;i++)P('x',box(W/ns-.004,.1,.012),i%2?clothB:clothA,-xf+(i+.5)*W/ns,EH-.14,zf+rm.ov+.0);}
  /* ---- the counter along the back, a shelf over it, tables at the sides ---- */
  const cz=-zf+.12,cw=W-.18;
  P('w',box(cw,.28,.14),wood,0,Y0+.14,cz);P('x',box(cw+.02,.025,.17),wood2,0,Y0+.292,cz);P('x',box(cw-.04,.02,.1),dark,0,Y0+.08,cz+.074);boxes.push([-cw/2,cw/2,cz-.07,cz+.07]);
  for(const sy of[.5,.64])P('x',box(cw,.02,.1),wood2,0,Y0+sy,-zf+.07);for(const x of[-cw/2+.03,0,cw/2-.03])P('x',box(.025,.2,.025),wood,x,Y0+.58,-zf+.07);
  const tableW=mk?.3:.16,tz0=-zf+.3,tz1=mk?zf-.35:zf-.4;
  const tables=mk?[[-xf*.66,0],[xf*.66,0]]:[[-xf+.14,1],[xf-.14,-1]];
  for(const[tx]of tables){const w=tableW;P('w',box(w,.24,tz1-tz0),wood,tx,Y0+.12,(tz0+tz1)/2);P('x',box(w+.02,.02,tz1-tz0+.02),wood2,tx,Y0+.25,(tz0+tz1)/2);boxes.push([tx-w/2,tx+w/2,tz0,tz1]);}
  /* ---- the goods of the trade ---- */
  const topY=Y0+.302;
  const at=(i,n,a,b)=>a+(b-a)*(i+.5)/n;
  if(kind===0){/* greengrocer: open crates of fruit and vegetables, a basket, a scale */
    for(let i=0;i<5;i++){const x=at(i,5,-cw/2,cw/2);P('x',box(.12,.07,.1),wood2,x,topY+.036,cz);for(let k=0;k<3;k++)P('x',ico(.03,0),goodsC[(i+k)%3],x-.03+k*.03,topY+.085,cz+(k%2)*.02);}
    for(const[tx]of tables)for(let i=0;i<3;i++)P('x',cyl(.04,.05,.05,8),i%2?0xc8a050:0xb08a40,tx,Y0+.28,at(i,3,tz0,tz1));
    P('x',cyl(.045,.035,.06,8),0xc8a050,xf-.2,topY+.03,cz);}
  else if(kind===1){/* draper: bolts of cloth lying and standing, a length hanging from the plate */
    for(let i=0;i<6;i++){const x=at(i,6,-cw/2,cw/2);P('x',cyl(.022,.022,.14,8),[clothA,0x3a6ab0,0xd8a020,0x3a8a50,0xb83a30,0x8a4a8a][i%6],x,topY+.026,cz,0,0,Math.PI/2);}
    for(let i=0;i<4;i++)P('x',box(.012,.18,.1),[0xb83a30,0x3a6ab0,0xd8a020,0x3a8a50][i],at(i,4,-cw/2,cw/2),Y0+.68,-zf+.07);
    P('x',box(.2,.28,.012),clothA,xf-.2,EH-.24,-zf+.12);for(const[tx]of tables)for(let i=0;i<3;i++)P('x',box(.14,.025,.1),[0xe8dcc0,0x3a6ab0,0xb83a30][i],tx,Y0+.265+i*.025,at(i,3,tz0,tz1));}
  else if(kind===2){/* potter: rows of jars and bowls on the counter and the shelves */
    for(let i=0;i<7;i++){const x=at(i,7,-cw/2,cw/2);P('x',ico(.035,0),[0xb86a44,0x8a4a30,0xc89a60][i%3],x,topY+.04,cz,0,0,0,1,1.15,1);P('x',cyl(.02,.03,.03,8),0x7a4a30,x,topY+.07,cz);}
    for(const sy of[.5,.64])for(let i=0;i<5;i++)P('x',cyl(.03,.035,.07,8),[0xb86a44,0x8a4a30,0x6a5a4a][(i+Math.round(sy*10))%3],at(i,5,-cw/2,cw/2),Y0+sy+.045,-zf+.07);
    for(const[tx]of tables)for(let i=0;i<3;i++)P('x',cyl(.04,.05,.08,8),[0xa85a3a,0x9a8a74][i%2],tx,Y0+.29,at(i,3,tz0,tz1));}
  else if(kind===3){/* ironmonger: tools hung from the back rail, a barrel of nails and a stack of horseshoes, a coil of rope */
    for(let i=0;i<6;i++){const x=at(i,6,-cw/2,cw/2);P('x',box(.012,.16,.012),wood2,x,Y0+.72,-zf+.065);P('x',box(.05,.025,.02),0x6a6a72,x,Y0+.62,-zf+.065);}
    for(let i=0;i<4;i++)P('x',cyl(.03,.03,.012,8),0x4a4a52,at(i,4,-cw/2+.1,cw/2-.1),topY+.012+(i%2)*.012,cz,Math.PI/2,0,0);
    for(const[tx]of tables){P('x',cyl(.05,.045,.1,8),0x6a4426,tx,Y0+.31,tz0+.1);P('x',cyl(.05,.05,.03,8),0xc8a070,tx,Y0+.28,tz1-.1);}
    P('x',cyl(.06,.06,.04,10),0xb8a070,xf-.2,topY+.02,cz);}
  else{/* bookseller: books lying and standing, rolled scrolls on the shelves, a reading slope on a table */
    for(let i=0;i<8;i++){const x=at(i,8,-cw/2,cw/2);P('x',box(.03,.1+((i*5)%3)*.02,.07),[0x7a2a2a,0x2a4a6a,0x3a5a3a,0x6a4a2a,0x8a7a4a,0x5a3a5a][i%6],x,topY+.06,cz);}
    for(const sy of[.5,.64])for(let i=0;i<5;i++)P('x',cyl(.015,.015,.09,6),[0xe9dcb4,0xdccb9a,0xefe3c4][(i+Math.round(sy*7))%3],at(i,5,-cw/2,cw/2),Y0+sy+.02,-zf+.07,0,0,Math.PI/2);
    for(const[tx]of tables)for(let i=0;i<3;i++)P('x',box(.14,.025+(i%2)*.01,.1),[0x7a2a2a,0x2a4a6a,0x3a5a3a][i],tx,Y0+.265,at(i,3,tz0,tz1));}
  /* storage on the platform: a barrel and a crate against the back posts (they are on the platform, not on the ground) */
  P('x',cyl(.065,.07,.18,8),0x6a4426,-xf+.14,Y0+.09,-zf+.3);P('x',box(.12,.12,.12),0x8a6a3c,xf-.14,Y0+.06,-zf+.3);
  /* a hanging sign at the front, a lantern from the middle tie beam */
  const sx0=xf-.02;P('x',box(.03,.03,.22),wood2,sx0,EH-.12,zf+.1);P('x',box(.2,.14,.02),tint(wood,1.1),sx0,EH-.22,zf+.2);P('x',box(.16,.02,.022),clothA,sx0,EH-.29,zf+.2);
  P('x',box(.012,.1,.012),0x2a2a2a,0,EH-.13,0);P('x',box(.05,.07,.05),0x2a2a2a,0,EH-.2,0);P('x',box(.035,.05,.035),0xffc060,0,EH-.2,0);
  const stepW=mk?2.4:1.5,BSc=o.bs||OW_BS;
  const rect={x0:-xf,x1:xf,z0:-zf,z1:zf};
  const meta={ver:1,W,D,wallT:OW_T,slabT:OW_FT,groundY:Y0,storeys:[{i:0,floorY:Y0,ceilY:EH,h:H,rect}],doors:[{face:'front',u:0,w:(stepW-.7)/BSc,h:H,y0:Y0,storey:0,kind:'main'}],windows:[],stairs:[],partitions:[],party:{l:false,r:false,ownL:false,ownR:false},shared:{},rect0:rect,
    roof:{kind:'gable',axis:'x',baseY:EH,ridgeY:EH+rf.rise,rise:rf.rise,mat},chimney:null,tier:t,layers:{foundation:'f',ground:'w',upper:'u',roof:'r',details:'x'},doorU:0,doorSolid:{u:0,w:(stepW-.7)/BSc,h:H,y0:Y0},open:true,pav:{posts,boxes}};
  return{arch:meta,doorU:0,Y1:EH,rise:rf.rise,chim:null};}
/* the colliders of a pavilion, in its own frame (metres): the edge of the platform (open where the steps come up), the cheek walls along the steps, the posts, the counters and the tables */
function owpBuildCol(b,P){const BS=P.BS,A=b.arch,r0=A.rect0,e=b.enter,c=owiColList(),L=.07*BS,lx0=r0.x0*BS,lx1=r0.x1*BS,lz0=r0.z0*BS,lz1=r0.z1*BS;
  c.add(lx0-L,lx0,lz0-L,lz1+L,OWI_GND);c.add(lx1,lx1+L,lz0-L,lz1+L,OWI_GND);c.add(lx0,lx1,lz0-L,lz0,OWI_GND);
  for(const nd of e.ends){const gw=Math.min(nd.spec.width,(lx1-lx0)-.1),u=nd.u,s=nd.sgn;c.add(lx0,u-gw/2,lz1,lz1+L,OWI_GND);c.add(u+gw/2,lx1,lz1,lz1+L,OWI_GND);
    const zlo=Math.min(nd.zL,nd.zF+s*nd.spec.run),zhi=Math.max(nd.zL,nd.zF+s*nd.spec.run);for(const sx of[-1,1]){const xa=u+sx*nd.spec.width/2,xb=u+sx*(nd.spec.width/2+.2);c.add(Math.min(xa,xb),Math.max(xa,xb),zlo-.001,zhi+.001,OWI_GND);}}
  for(const q of A.pav.posts)c.add(q[0]*BS,q[1]*BS,q[2]*BS,q[3]*BS,OWI_GND);for(const q of A.pav.boxes)c.add(q[0]*BS,q[1]*BS,q[2]*BS,q[3]*BS,OWI_GND);
  const col=c.fin();{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<col.n;i++){x0=Math.min(x0,col.x0[i]);x1=Math.max(x1,col.x1[i]);z0=Math.min(z0,col.z0[i]);z1=Math.max(z1,col.z1[i]);}col.bb={x0,x1,z0,z1};}return col;}

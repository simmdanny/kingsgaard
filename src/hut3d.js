/* =====================================================================================================================
   TIER-1 BUILDINGS IN DEPTH (environment upgrade 05)
   The huts, sheds, storage buildings and barns of a rural hamlet (o.tier 1, all built by owArch) get modelled depth in the style of the paving stones and the grass,
   instead of flat painted boxes:
   - plank walls of lapped boards (each a board of its own, tilted so its lower edge stands out and throws a line of shadow, its own shade of weathered wood),
     chamfered corner posts, a sill beam and a top plate; stone walls of single raised stones in courses;
   - a plinth of raised stones round the foundation;
   - thatch in overlapping courses (a thick, slightly ragged eave, darker and weathered low down), a rolled ridge held by liggers (the zigzag of spars);
     shingle roofs of single staggered shingles;
   - board-and-batten gables, plank shutters standing open beside the windows, a heavier door frame, the crude chimney a stack of stones.
   Everything is drawn from a stream of its own per building (h3Seed: from the plan's sizes and colours), never from the village stream R, so the world (world-sig) and the
   plans (doors, windows, stairs, colliders, interiors) stay exactly as they were; the parts go into the same layers as the surfaces they dress ('w', 'u', 'r', 'f'),
   so the cutaway of an explored house and the merged settlement meshes treat them like the rest. Units are owArch's local units (1 = OW_BS = 3.6 m).
   ===================================================================================================================== */
const H3={on:true,BH:.062,BT:.01,TILT:.12,CW:.13,TC:.03};
function h3Seed(o){let h=2166136261;for(const v of[o.w,o.d,o.h||0,o.sh||0,o.wallCol||0,o.roofCol||0,o.stoneCol||0])h=Math.imul(h^(Math.round(v*1e4)|0),16777619);return h>>>0;}
const h3R=(o,salt)=>mulberry((h3Seed(o)^Math.imul(salt|0,0x9E3779B1))>>>0);
/* a part placed with a quaternion (P takes Euler angles in the XYZ order) */
const _h3e=new THREE.Euler(),_h3q=new THREE.Quaternion(),_h3a=new THREE.Quaternion(),_h3v=new THREE.Vector3();
function h3PQ(P,key,geo,col,x,y,z,q,sx,sy,sz){if(P.q){P.q(key,geo,col,x,y,z,q,sx,sy,sz);return;}/* (upgrade 12: straight in, kitBuilder) */_h3e.setFromQuaternion(q,'XYZ');P(key,geo,col,x,y,z,_h3e.x,_h3e.y,_h3e.z,sx,sy,sz);}
/* yaw about y, then (in the part's own frame) pitch about x and roll about z */
function h3Q(yaw,pitch,roll){_h3q.setFromAxisAngle(_h3v.set(0,1,0),yaw||0);if(pitch){_h3a.setFromAxisAngle(_h3v.set(1,0,0),pitch);_h3q.multiply(_h3a);}if(roll){_h3a.setFromAxisAngle(_h3v.set(0,0,1),roll);_h3q.multiply(_h3a);}return _h3q;}
/* a raised stone: x and y -.5...5, z 0 (the wall) ... 1 (its face), the face a smaller rectangle joined to the wall by four sloping sides (a chamfered block; 10 triangles, no back) */
let _h3stone=null;
function h3Stone(){if(_h3stone)return _h3stone;const a=.5,b=.3,q=[];
  const O=[[-a,-a],[a,-a],[a,a],[-a,a]],I=[[-b,-b],[b,-b],[b,b],[-b,b]];
  const quad=(p0,p1,p2,p3)=>{q.push(...p0,...p1,...p2,...p0,...p2,...p3);};
  for(let i=0;i<4;i++){const j=(i+1)%4;quad([O[i][0],O[i][1],0],[O[j][0],O[j][1],0],[I[j][0],I[j][1],1],[I[i][0],I[i][1],1]);}
  quad([I[0][0],I[0][1],1],[I[1][0],I[1][1],1],[I[2][0],I[2][1],1],[I[3][0],I[3][1],1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q,3));return _h3stone=g;}
/* a part lying on the roof: a unit box without its underside (10 triangles) */
let _h3slab=null;
function h3Slab(){if(_h3slab)return _h3slab;const g=new THREE.BoxGeometry(1,1,1).toNonIndexed(),a=g.attributes.position.array,n=g.attributes.normal.array,q=[];for(let i=0;i<a.length;i+=9){if(n[i+1]<-.5)continue;for(let k=0;k<9;k++)q.push(a[i+k]);}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(q,3));return _h3slab=o;}
/* a lapped board: a unit box without its back (against the wall) and its top (under the board above): 8 triangles */
let _h3board=null;
function h3Board(){if(_h3board)return _h3board;const q=[],quad=(p0,p1,p2,p3)=>{q.push(...p0,...p1,...p2,...p0,...p2,...p3);},h=.5;
  quad([-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]);/* front */quad([-h,-h,-h],[h,-h,-h],[h,-h,h],[-h,-h,h]);/* bottom */quad([h,-h,h],[h,-h,-h],[h,h,-h],[h,h,h]);/* right */quad([-h,-h,-h],[-h,-h,h],[-h,h,h],[-h,h,-h]);/* left */
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q,3));return _h3board=g;}
let _h3tube=null;const h3Tube=()=>_h3tube||(_h3tube=new THREE.CylinderGeometry(1,1,1,8,1,true).rotateY(Math.PI/8));
/* the free stretches of a face for a band from ya to yb (openings cut it with a margin m) */
function h3Spans(L,ops,ya,yb,tA,tB,m){const out=[];let cur=-L/2+tA;for(const op of ops){if(yb<op.y0-m||ya>op.y1+m)continue;if(op.u-op.w/2-m>cur+.02)out.push([cur,op.u-op.w/2-m]);cur=Math.max(cur,op.u+op.w/2+m);}if(L/2-tB>cur+.02)out.push([cur,L/2-tB]);return out;}
const h3Tint=(c,k)=>owTintHex(c,k);
/* ---- plank walls: lapped boards, a sill beam and a top plate (the corner posts are drawn once per corner, by h3Corners) ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Planks(...a){const d0=OWDET;OWDET=1;try{return h3Planks_(...a);}finally{OWDET=d0;}}
function h3Planks_(P,key,o,xf,ops,y0,y1,tr,f,i){const R=h3R(o,11+i*7+f.charCodeAt(0)),bh=H3.BH,bt=H3.BT,a=H3.TILT,L=xf.L,ca=Math.cos(a),sa=Math.sin(a),ends=.035;
  const base=o.wallCol,beam=o.beamCol||0x4a3220;
  /* the sill beam along the foot of the wall (not across a door) and the plate under the eaves */
  for(const sp of h3Spans(L,ops,y0,y0+.05,ends,ends,.02))owFB(P,key,h3Tint(beam,.95),xf,(sp[0]+sp[1])/2,y0+.025,sp[1]-sp[0],.05,.045,0);
  owFB(P,key,beam,xf,0,y1-.03,L-2*ends+.01,.045,.04,0);
  for(let yt=y1-.055;yt-bh>y0+.045;yt-=bh*.9){const yc=yt-bh/2*ca;
    for(const sp of h3Spans(L,ops,yt-bh,yt,ends,ends,.032)){const len=sp[1]-sp[0];if(len<.04)continue;
      /* a long run is two or three boards butted end to end */
      const nB=Math.max(1,Math.round(len/(.85+R()*.4)));let u0=sp[0];
      for(let k=0;k<nB;k++){const u1=k===nB-1?sp[1]:u0+len/nB*(.8+R()*.4),bl=u1-u0-.004,uc=(u0+u1)/2;u0=u1;
        const kk=.84+R()*.3,col=R()<.07?h3Tint(base,.7):h3Tint(base,kk),out=bt/2*ca+bh/2*sa;
        h3PQ(P,key,h3Board(),col,xf.X(uc,out),yc,xf.Z(uc,out),h3Q(xf.ry,-a,(R()-.5)*.012),bl,bh,bt);}}}}
/* the corner posts of a plank storey: octagonal (a chamfered square), standing a little proud of both faces */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Corners(...a){const d0=OWDET;OWDET=1;try{return h3Corners_(...a);}finally{OWDET=d0;}}
function h3Corners_(P,key,o,r,y0,y1){const ph=y1-y0,beam=o.beamCol||0x4a3220;for(const[x,z]of[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]]){const dx=Math.sign(x),dz=Math.sign(z);P(key,cyl(.036,.038,ph,8),h3Tint(beam,.92),x+dx*.004,y0+ph/2,z+dz*.004,0,Math.PI/8,0);}}
/* ---- stone walls: courses of single raised stones (the wall behind them shows in the joints as mortar) ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Masonry(...a){const d0=OWDET;OWDET=1;try{return h3Masonry_(...a);}finally{OWDET=d0;}}
function h3Masonry_(P,key,o,xf,ops,y0,y1,tr,f,i,mcol){const R=h3R(o,31+i*7+f.charCodeAt(0)),L=xf.L,G=h3Stone();
  let y=y0+.004,row=0;while(y<y1-.03){const ch=Math.min(y1-y-.004,.075+R()*.035);if(ch<.035)break;const yc=y+ch/2;
    for(const sp of h3Spans(L,ops,y,y+ch,0,0,.03)){let u=sp[0]+(row%2?R()*.05:0);
      while(u<sp[1]-.02){let sl=Math.min(sp[1]-u,.12+R()*.11);if(sp[1]-u-sl<.05)sl=sp[1]-u;if(sl<.025)break;const dep=.012+R()*.012,kk=.82+R()*.3,col=R()<.08?h3Tint(mcol,.72):h3Tint(mcol,kk);
        h3PQ(P,key,G,col,xf.X(u+sl/2,-.002),yc,xf.Z(u+sl/2,-.002),h3Q(xf.ry,(R()-.5)*.08,(R()-.5)*.08),sl-.012,ch-.012,dep);u+=sl;}}
    y+=ch;row++;}}
/* ---- the plinth: one or two courses of raised stones on each face of the foundation (kept above y = 0: owDeepenFoundation stretches what lies at the foot) ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Plinth(...a){const d0=OWDET;OWDET=1;try{return h3Plinth_(...a);}finally{OWDET=d0;}}
function h3Plinth_(P,o,fx0,fx1,D,doorU,doorW,big){const R=h3R(o,5),G=h3Stone(),H=OW_FH,zf=D/2+.07,col0=o.stoneCol;
  const faces=[{ry:0,L:fx1-fx0,X:(u,e)=>(fx0+fx1)/2+u,Z:(u,e)=>zf+e,front:true},{ry:Math.PI,L:fx1-fx0,X:(u,e)=>(fx0+fx1)/2-u,Z:(u,e)=>-zf-e},{ry:Math.PI/2,L:D+.14,X:(u,e)=>fx1+e,Z:(u,e)=>-u,side:'r'},{ry:-Math.PI/2,L:D+.14,X:(u,e)=>fx0-e,Z:(u,e)=>u,side:'l'}];
  for(const F of faces){if(F.side&&o.party&&o.party[F.side])continue;/* (upgrade 11: not against a neighbour - its foundation is there, and where it stands lower the stones stuck into its room) */let y=.006,row=0;const nC=2;for(let c=0;c<nC;c++){const ch=(H-.008)/nC;let u=-F.L/2+(row%2?.02+R()*.04:0);
      while(u<F.L/2-.02){let sl=Math.min(F.L/2-u,big?.2+R()*.12:.13+R()*.1);if(F.L/2-u-sl<.05)sl=F.L/2-u;if(sl<.03)break;const uc=u+sl/2;u+=sl;if(F.front&&doorU!=null&&Math.abs(uc-doorU)<doorW/2+.14)continue;
        const dep=.014+R()*.012,col=R()<.1?h3Tint(col0,.74):h3Tint(col0,.84+R()*.28);h3PQ(P,'f',G,col,F.X(uc,-.002),y+ch/2,F.Z(uc,-.002),h3Q(F.ry,(R()-.5)*.08,(R()-.5)*.06),sl-.012,ch-.01,dep);}
      y+=ch;row++;}}}
/* ---- windows: a timber lintel and plank shutters standing open beside the frame ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Window(...a){const d0=OWDET;OWDET=1;try{return h3Window_(...a);}finally{OWDET=d0;}}
function h3Window_(P,key,o,xf,op,ops,f,i){const R=h3R(o,51+Math.round(op.u*100)+i*13+f.charCodeAt(0)),yc=(op.y0+op.y1)/2,h=op.y1-op.y0,beam=o.beamCol||0x4a3220;
  owFB(P,key,h3Tint(beam,.9),xf,op.u,op.y1+.045,op.w+.13,.04,.05,0);
  if(o.noShutters)return;const sw=op.w*.5+.012,scol=h3Tint(o.wallCol,.8);
  for(const s of[-1,1]){const hu=op.u+s*(op.w/2+.032);/* the hinge line, just outside the frame */if(ops.some(d2=>d2!==op&&Math.abs(hu+s*sw-d2.u)<d2.w/2+.05))continue;
    if(Math.abs(hu+s*sw)>xf.L/2-.04)continue;
    /* the shutter stands open, swung out about its hinge by a: its boards run from the hinge away from the window (along s on the face) and out from the wall */
    const a=.5+R()*.5,ca=Math.cos(a),sa=Math.sin(a),q=h3Q(xf.ry-s*a,0,0),nx=-s*sa,nz=ca,at=(lu,d)=>[hu+s*lu*ca+nx*d,lu*sa+.012+nz*d],nB=3;
    for(let k=0;k<nB;k++){const p=at((k+.5)/nB*sw,0);h3PQ(P,key,box(sw/nB-.004,h+.02,.014),h3Tint(scol,.88+R()*.2),xf.X(p[0],p[1]),yc,xf.Z(p[0],p[1]),q);}
    /* two ledges and the brace between them, on the face of the shutter */
    for(const ly of[-.3,.3]){const p=at(sw/2,.012);h3PQ(P,key,box(sw*.9,.022,.01),h3Tint(scol,.78),xf.X(p[0],p[1]),yc+ly*h,xf.Z(p[0],p[1]),q);}
    {const p=at(sw/2,.013);h3PQ(P,key,box(Math.hypot(sw*.8,h*.6),.02,.01),h3Tint(scol,.78),xf.X(p[0],p[1]),yc,xf.Z(p[0],p[1]),h3Q(xf.ry-s*a,0,s*Math.atan2(h*.6,sw*.8)));}}}
/* ---- doors: a heavier frame (posts with a chamfer, a lintel that runs past them); a door that is part of the wall (not the swinging leaf) gets its planks, ledges and straps ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Door(...a){const d0=OWDET;OWDET=1;try{return h3Door_(...a);}finally{OWDET=d0;}}
function h3Door_(P,key,o,xf,op,f,i,leaf,noLin){const yc=(op.y0+op.y1)/2,h=op.y1-op.y0,dw=op.w,beam=o.beamCol||0x4a3220;
  for(const s of[-1,1]){const u=op.u+s*(dw/2+.03);P(key,cyl(.03,.032,h+.05,8),h3Tint(beam,.9),xf.X(u,.026),op.y0+(h+.05)/2,xf.Z(u,.026),0,xf.ry+Math.PI/8,0);}
  if(!noLin)owFB(P,key,h3Tint(beam,.85),xf,op.u,op.y1+.04,dw+.22,.065,.075,0);/* (not under a stone arch) */
  if(leaf)return;const dc=o.doorCol||0x4a3018,n=Math.max(3,Math.round(dw/.07));
  for(let k=1;k<n;k++)owFB(P,key,h3Tint(dc,.7),xf,op.u-dw/2+k*dw/n,yc,.008,h-.03,.006,-OW_T+.044);
  for(const ly of[.22,.78]){owFB(P,key,h3Tint(dc,.85),xf,op.u,op.y0+ly*h,dw-.04,.035,.014,-OW_T+.044);owFB(P,key,0x2e2a26,xf,op.u-dw*.18,op.y0+ly*h,dw*.62,.016,.008,-OW_T+.058);}}
/* ---- the crude chimney: a stack of stones ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Chimney(...a){const d0=OWDET;OWDET=1;try{return h3Chimney_(...a);}finally{OWDET=d0;}}
function h3Chimney_(P,o,cx,cz,csz,cbot,ctop){const R=h3R(o,71),G=h3Stone(),c0=o.stoneCol;let y=cbot+.004,row=0;
  while(y<ctop-.02){const ch=Math.min(ctop-y,.065+R()*.03);if(ch<.025)break;
    for(let fz=0;fz<4;fz++){const ry=fz*Math.PI/2,W=row%2?[.25,.5,.25]:[.5,.5];let t0=0;for(const wf of W){const sl=csz*wf,uc=-csz/2+t0*csz+sl/2;t0+=wf;
        const ox=Math.sin(ry),oz=Math.cos(ry),tx=Math.cos(ry),tz=-Math.sin(ry),col=h3Tint(c0,.8+R()*.32);
        h3PQ(P,'r',G,col,cx+ox*(csz/2-.002)+tx*uc,y+ch/2,cz+oz*(csz/2-.002)+tz*uc,h3Q(ry,(R()-.5)*.1,(R()-.5)*.1),sl-.01,ch-.01,.012+R()*.012);}}
    y+=ch;row++;}}
/* ---- the roof: the slopes as owRoof3 lays them (the same overhangs), dressed in courses of thatch or single shingles; gables in boards and battens ---- */
function h3RoofSlopes(o,rect,rm,axis,party){const x0=rect.x0,x1=rect.x1,z0=rect.z0,z1=rect.z1,span=axis==='x'?z1-z0:x1-x0,s2=span/2,len=axis==='x'?x1-x0:z1-z0,rise=clamp(rm.p*s2,.2,o.maxRise||.95),pl_=!!party.l,pr_=!!party.r;
  const sideOv=sd=>axis==='x'?rm.ov:(sd>0?(pr_?0:rm.ov):(pl_?0:rm.ov)),endA=axis==='x'?(pl_?0:rm.ovE):rm.ovE,endB=axis==='x'?(pr_?0:rm.ovE):rm.ovE,lenR=len+endA+endB,c0=axis==='x'?x0:z0,cAxis=c0-endA+lenR/2;
  const sides=[];for(const sd of[1,-1]){const ov=sideOv(sd),hs=s2+ov;let segs;if(o.roofKind==='gambrel'){const xk=hs*.55,yk=rise*.62,tt=(hs-s2)/(hs-xk),drop=yk*tt/(1-tt);segs=[[hs,-drop,xk,yk],[xk,yk,0,rise]];}else{const drop=rise*ov/s2;segs=[[hs,-drop,0,rise]];}sides.push({sd,segs});}
  return{sides,rise,lenR,cAxis,xc:(x0+x1)/2,zc:(z0+z1)/2,s2,span};}
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Roof(...a){const d0=OWDET;OWDET=1;try{return h3Roof_(...a);}finally{OWDET=d0;}}
function h3Roof_(P,o,Y1,rect,rm,axis,party){if(!rm||o.roofKind==='hip')return;const S=h3RoofSlopes(o,rect,rm,axis,party),thatch=o.roofMat==='thatch',R=h3R(o,91),col0=o.roofCol;
  const put=(sd,lat,yy,a,geo,col,alongLen,roll,sx,sy,sz)=>{/* a part on the slope: lat across (out from the ridge line), a along the roof's axis; tilted to the slope (the angle of the slope less the lift) */
    /* (as owRoof3: axis x, the part's z runs down the slope, turned about x; axis z, its x runs down the slope, turned about z; a roll turns it about the slope's normal) */
    if(axis==='x')_h3q.setFromAxisAngle(_h3v.set(1,0,0),sd*a);else _h3q.setFromAxisAngle(_h3v.set(0,0,1),-sd*a);
    if(roll){_h3a.setFromAxisAngle(_h3v.set(0,1,0),roll);_h3q.multiply(_h3a);}
    if(axis==='x')h3PQ(P,'r',geo,col,alongLen,Y1+yy,S.zc+sd*lat,_h3q,sx,sy,sz);else h3PQ(P,'r',geo,col,S.xc+sd*lat,Y1+yy,alongLen,_h3q,sx,sy,sz);};
  for(const side of S.sides){const sd=side.sd;
    for(const sg of side.segs){const dx=sg[0]-sg[2],dy=sg[3]-sg[1],Ls=Math.hypot(dx,dy),phi=Math.atan2(dy,dx),vl=-dx/Ls,vy=dy/Ls,nl=vy,ny=-vl;/* along the slope (eave -> top) and its outward normal, in (lat, y) */
      if(thatch){const K=Math.max(2,Math.round(Ls/H3.CW)),cwk=Ls/K,tc=H3.TC,first=sg===side.segs[0],aA=S.cAxis-S.lenR/2+.01,aB=S.cAxis+S.lenR/2-.01,G=h3Tube();
        /* thick courses, each ending at its foot in a rounded lip of straw (in lengths a little thicker or thinner, lower or higher: a soft, uneven line); darker and weathered low down */
        for(let k=0;k<K;k++){const s0=k*cwk,shade=.8+.2*(k/(K-1)),wk=cwk*1.15,eave=k===0&&first,lip=eave?tc*1.25:tc;
          {const sMid=s0+wk/2,lat=sg[0]+vl*sMid+nl*tc*.4,yy=sg[1]+vy*sMid+ny*tc*.4;put(sd,lat,yy,phi,h3Slab(),h3Tint(col0,shade*.94),S.cAxis,0,axis==='x'?aB-aA:wk,tc*.8,axis==='x'?wk:aB-aA);}
          let a0=aA;while(a0<aB-.01){const sl=Math.min(aB-a0,.16+R()*.12),rr=lip*(.82+R()*.36),sOff=s0+rr*.7+(R()-.5)*.012,lat=sg[0]+vl*sOff+nl*rr*.85,yy=sg[1]+vy*sOff+ny*rr*.85,c=h3Tint(col0,shade*(.98+R()*.12));
            if(axis==='x')P('r',G,c,a0+sl/2,Y1+yy,S.zc+sd*lat,0,0,Math.PI/2,rr,sl+.012,rr);else P('r',G,c,S.xc+sd*lat,Y1+yy,a0+sl/2,Math.PI/2,0,0,rr,sl+.012,rr);a0+=sl;}}
        /* the verges: a rolled edge down each gable end, over the ends of the courses */
        for(const end of[-1,1]){if(axis==='x'&&(end<0?!!party.l:!!party.r))continue;const ae=S.cAxis+end*(S.lenR/2-.012),rv=.058,lat=(sg[0]+sg[2])/2+nl*tc*.9,yy=(sg[1]+sg[3])/2+ny*tc*.9,vc=h3Tint(col0,.86);
          if(axis==='x')P('r',G,vc,ae,Y1+yy,S.zc+sd*lat,Math.atan2(sd*vl,vy),0,0,rv,Ls+.08,rv);else P('r',G,vc,S.xc+sd*lat,Y1+yy,ae,0,0,Math.atan2(-sd*vl,vy),rv,Ls+.08,rv);}}
      else{/* shingles: courses of single shingles, every other course shifted by half a shingle */const cw=.11,sw=.14,tc=.016,K=Math.max(2,Math.round(Ls/cw)),cwk=Ls/K;
        for(let k=0;k<K;k++){const wk=cwk*1.75,dl=Math.atan2(tc*1.4,wk),sMid=k*cwk+wk/2,lat=sg[0]+vl*sMid+nl*tc*.6,yy=sg[1]+vy*sMid+ny*tc*.6;let a0=S.cAxis-S.lenR/2+(k%2?sw/2:0)-(k%2?sw:0);const aEnd=S.cAxis+S.lenR/2;
          while(a0<aEnd-.01){const lo=Math.max(a0,S.cAxis-S.lenR/2),hi=Math.min(a0+sw,aEnd);a0+=sw;if(hi-lo<.02)continue;const sl=hi-lo-.006,ext=(R()-.5)*.016,col=R()<.06?h3Tint(col0,.7):h3Tint(col0,.82+R()*.3);
            put(sd,lat-vl*ext*.5,yy-vy*ext*.5,phi-dl,h3Slab(),col,(lo+hi)/2,(R()-.5)*.05,axis==='x'?sl:wk+ext,tc,axis==='x'?wk+ext:sl);}}}}}
  /* the ridge: a rolled bundle held down by liggers (thatch) */
  if(thatch){const top=S.sides[0].segs[S.sides[0].segs.length-1],rr=.075,rl=S.lenR+.1,ry=S.rise+.02,rc=h3Tint(col0,.8);
    if(axis==='x')P('r',cyl(rr,rr,rl,8),rc,S.cAxis,Y1+ry,S.zc,0,0,Math.PI/2);else P('r',cyl(rr,rr,rl,8),rc,S.xc,Y1+ry,S.cAxis,Math.PI/2,0,0);
    const dx=top[0]-top[2],dy=top[3]-top[1],Ls=Math.hypot(dx,dy),phi=Math.atan2(dy,dx),vl=-dx/Ls,vy=dy/Ls,nl=vy,ny=-vl,band=.16,lig=h3Tint(col0,.55);
    for(const sd of[1,-1]){/* the block-cut band below the ridge and the spars across it */const sMid=Ls-band/2,lat=top[0]+vl*sMid+nl*(H3.TC*1.6),yy=top[1]+vy*sMid+ny*(H3.TC*1.6);
      put(sd,lat,yy,phi,axis==='x'?box(S.lenR+.04,.03,band):box(band,.03,S.lenR+.04),h3Tint(col0,.9),S.cAxis,0);
      const nZ=Math.max(3,Math.round(S.lenR/.16)),step=(S.lenR)/nZ;
      for(const fr of[.15,.85]){const s1=Ls-band*fr,l1=top[0]+vl*s1+nl*(H3.TC*1.6+.018),y1=top[1]+vy*s1+ny*(H3.TC*1.6+.018);put(sd,l1,y1,phi,axis==='x'?box(S.lenR+.04,.012,.014):box(.014,.012,S.lenR+.04),lig,S.cAxis,0);}
      for(let k=0;k<nZ;k++){const a0=S.cAxis-S.lenR/2+(k+.5)*step,lat2=top[0]+vl*(Ls-band/2)+nl*(H3.TC*1.6+.02),y2=top[1]+vy*(Ls-band/2)+ny*(H3.TC*1.6+.02);
        put(sd,lat2,y2,phi,axis==='x'?box(.012,.01,Math.hypot(band*.7,step*.5)):box(Math.hypot(band*.7,step*.5),.01,.012),lig,a0,(k%2?1:-1)*Math.atan2(step*.5,band*.7));}}}
  /* the gables (where the roof ends in a wall, not against a neighbour): boards standing side by side, a batten over every joint */
  if(o.noFill)return;const fill=o.fillCol||o.wallCol,top=S.sides[0].segs,dv=Math.max(...top.map(sg=>{const dx=Math.abs(sg[0]-sg[2]),dy=sg[3]-sg[1];return rm.t*Math.hypot(dx,dy)/dx;}))+.006;/* (the underside of the slab, as owRoof3's gable fill) */
  const hAt=u=>{const x=Math.abs(u);/* the height of the gable at a distance x from its middle, under the slope(s) of the sd>0 side */let best=0;for(const sg of top){const xa=Math.min(sg[0],S.s2),xb=sg[2];if(x>xa||x<xb)continue;const t=(x-xb)/((sg[0])-xb||1),ya=sg[3],yb=sg[1];best=Math.max(best,ya+(yb-ya)*t);}return best-dv-.012;};
  for(const end of[0,1]){const pl_=!!party.l,pr_=!!party.r;if(axis==='x'&&(end?pr_:pl_))continue;const f=axis==='x'?(end?'right':'left'):(end?'front':'back'),xf=owFaceXf(f,rect),L=Math.min(xf.L,S.span)-.02,Rg=h3R(o,111+end),n=Math.max(4,Math.round(L/.075)),bw=L/n;
    for(let k=0;k<n;k++){const u=-L/2+(k+.5)*bw,hh=hAt(u);if(hh<.03)continue;const col=h3Tint(fill,.84+Rg()*.26);owFB(P,'r',col,xf,u,Y1+hh/2,bw-.004,hh,.01,0);
      if(k>0){const hj=hAt(u-bw/2);if(hj>.03)owFB(P,'r',h3Tint(fill,.72),xf,u-bw/2,Y1+hj/2,.016,hj,.01,.01);}}
    owFB(P,'r',h3Tint(o.beamCol||0x4a3220,.95),xf,0,Y1+.02,L+.02,.04,.03,.01);}}
/* ---- the inside of the outer walls (environment upgrade 07): the furnished houses of tiers 1 and 2 get finished rooms ----
   The inner face of an outer wall was the back of the wall panel, one flat colour (and darker on a tier-1 house, where the panel is the joints of the boards outside). Now, storey by storey and face by face,
   between the inner faces of the walls either side and around every opening: boards (a plank house), limewashed stones on a dark bed (a stone storey), or the plaster with its timbers showing (a timber or
   plaster house: posts at the bays and a rail); then on every wall a skirting board, a plate under the ceiling (under the floor above on a lower storey), trims at the ends of the face, and a frame round every
   window (jambs, a lintel, a sill) and door. These parts are part of the walls (the same layer: the cutaway, the light grid of the interior and the merged meshes treat them as the walls), and nothing stands
   further into the room than 2.5 cm: the furniture keeps 3 cm off the walls (owiPlace) and the wall pieces hang at the wall, so no piece passes through them. Every surface keeps a distance of its own from the
   wall (boards 0.5-1.6 cm, skirting 2.0, rail 2.15, frames 2.25-2.3, posts 2.35, plate 2.45, sills 2.5), so no two faces lie in one plane (no flicker), and nothing is drawn from the village stream.
   The front door's jambs stand 5.4 cm clear of its opening: the leaf, opened inwards, reaches a few centimetres past the edge of the opening on its hinge side. */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Lining(...a){const d0=OWDET;OWDET=1;try{return h3Lining_(...a);}finally{OWDET=d0;}}
function h3Lining_(P,key,o,xf,ops,y0,y1,f,i,style,wcol,fl,td){const BS=OW_BS*(o.sc||1),M=1/BS,T=OW_T,TD=td==null?OW_T:td,/* (TD: the wall behind the lining - 0 for a party wall the neighbour built; T: the front and back walls at the ends of the face) */L=xf.L,R=h3R(o,201+i*7+f.charCodeAt(0)),cm=v=>v*.01*M,yaw=xf.ry+Math.PI,
    top=i<fl-1?y1-.165*M:y1,beam=o.beamCol||0x4a3220,e=.004*M,lim=L/2-T-.005*M,
    box_=(col,u,y,sw,sh,front)=>{const sd=cm(front-.1),out=-TD-cm(.1)-sd;P(key,h3NB(1),col,xf.X(u,out+sd/2),y,xf.Z(u,out+sd/2),0,xf.ry,0,sw,sh,sd);};/* (its back left out) *//* a box whose face stands front cm off the wall (its back 1 mm off it) */
  /* the fronts (cm off the wall): boards 1.5/1.6, stones 1.85-2.4, skirting 2.1, rail 2.2, jambs 2.3, lintels 2.35, posts and trims 2.4, plate 2.45, sills 2.5 (all under the 3 cm the furniture keeps) */
  const fw=.07*M,fd=.08*M,dOff=.054*M,sillH=.045*M,lintH=.085*M,skH=.1175*M,plH=.1*M;/* (the skirting 2.5 mm lower than a partition's, which runs into it: their tops are not one plane) */
  /* the openings with their frames (for the spans of boards, stones, rails); a frame never reaches past the end of its face */
  const fr=ops.map(op=>{const win=op.type==='win',jw=win?fw:fd,off=win?0:dOff,w2=op.w/2,a=Math.max(-lim,op.u-w2-off-jw),b=Math.min(lim,op.u+w2+off+jw);
    return{op,win,a,b,ia:op.u-w2-off,ib:op.u+w2+off,y0:win?op.y0-sillH:op.y0,y1:op.y1+lintH};});
  const holes=fr.map(q=>({u:(q.a+q.b)/2,w:q.b-q.a,y0:q.y0-(q.win?0:.01*M),y1:q.y1}));
  /* the surface */
  if(style==='masonry'){const G=h3Stone(),mort=h3Tint(wcol,.5),lw=c=>{const r=(c>>16&255),g=(c>>8&255),b=(c&255);return(Math.round(r*.5+220*.5)<<16)|(Math.round(g*.5+211*.5)<<8)|Math.round(b*.5+191*.5);};
    let y=y0+skH+e,row=0;while(y<top-plH-.02*M){const ch=Math.min(top-plH-e-y,(.25+R()*.07)*M);if(ch<.08*M)break;
      for(const sp of h3Spans(L,holes,y,y+ch,T,T,.005*M)){box_(mort,(sp[0]+sp[1])/2,y+ch/2,sp[1]-sp[0],ch,.9);let u=sp[0]+(row%2?R()*.12*M:0);
        while(u<sp[1]-.03*M){let sl=Math.min(sp[1]-u,(.3+R()*.22)*M);if(sp[1]-u-sl<.12*M)sl=sp[1]-u;if(sl<.06*M)break;const dep=.9+R()*.55,c=h3Tint(lw(wcol),.88+R()*.2),uc=u+sl/2;
          h3PQ(P,key,G,c,xf.X(uc,-TD-cm(.95)),y+ch/2,xf.Z(uc,-TD-cm(.95)),h3Q(yaw,(R()-.5)*.02,(R()-.5)*.02),sl-.012*M,ch-.012*M,cm(dep));u+=sl;}}
      y+=ch;row++;}}
  else if(style==='plank'){const bh=.17*M,base=h3Tint(o.wallCol||0x8a6a44,1.12),Bd=h3Board();
    for(let yt=top-plH+.005*M;yt-bh>y0+skH-.04*M;yt-=bh){const yc=yt-bh/2;
      for(const sp of h3Spans(L,holes,yt-bh,yt,T,T,.004*M)){const len=sp[1]-sp[0];if(len<.04*M)continue;const nB=Math.max(1,Math.round(len/((1.6+R()*.8)*M)));let u0=sp[0];
        for(let k=0;k<nB;k++){const u1=k===nB-1?sp[1]:u0+len/nB*(.85+R()*.3),uc=(u0+u1)/2,bl=u1-u0-.004*M,th=R()<.5?1.0:1.1;u0=u1;
          h3PQ(P,key,Bd,h3Tint(base,.87+R()*.26),xf.X(uc,-TD-cm(.5)-cm(th)/2),yc,xf.Z(uc,-TD-cm(.5)-cm(th)/2),h3Q(yaw,0,0),bl,bh-.004*M,cm(th));}}}}
  else if(style==='render'){/* (tier 3, upgrade 08: a stone or brick storey plastered inside: a sheet 0.2-0.8 mm off the wall, behind every other part of the lining (their backs are
     1 mm off it, so none passes through it), cut round the openings and their frames like the boards) */
    const rc=h3Tint(0xe4dac6,.95+R()*.06),ya=y0+e,yb=top-e,rb=(u,y,sw,sh)=>{const sd=cm(.06),out=-TD-cm(.02)-sd;P(key,h3NB(1),rc,xf.X(u,out+sd/2),y,xf.Z(u,out+sd/2),0,xf.ry,0,sw,sh,sd);};
    for(const sp of h3Spans(L,holes,ya,yb,T,T,0))rb((sp[0]+sp[1])/2,(ya+yb)/2,sp[1]-sp[0],yb-ya);
    for(const h of holes){const a=Math.max(h.u-h.w/2,-L/2+T),b=Math.min(h.u+h.w/2,L/2-T);if(b-a<.01*M)continue;if(h.y0-ya>.01*M)rb((a+b)/2,(ya+h.y0)/2,b-a,h.y0-ya);if(yb-h.y1>.01*M)rb((a+b)/2,(h.y1+yb)/2,b-a,yb-h.y1);}
    const ry=y0+1.0*M;for(const sp of h3Spans(L,holes,ry-.04*M,ry+.04*M,T,T,0))box_(h3Tint(beam,1.05),(sp[0]+sp[1])/2,ry,sp[1]-sp[0],.08*M,2.2);}
  /* the timbers of a timber or plaster wall: posts at the bays, clear of the openings, and a rail at a metre; uprights end a few mm inside the plate and the skirting (no face shared with them) */
  const up=(col,u,w,front)=>box_(col,u,(y0+top)/2,w,top-y0-2*e,front);
  if(style==='timber'||style==='plaster'){const span=L-2*T,n=Math.max(1,Math.round(span/(1.25*M))),pw=.1*M;
    for(let k=1;k<n;k++){const u=-L/2+T+k*span/n;if(holes.some(h=>Math.abs(h.u-u)<h.w/2+pw/2+.02*M))continue;up(h3Tint(beam,.95),u,pw,2.4);}
    const ry=y0+1.0*M;for(const sp of h3Spans(L,holes,ry-.04*M,ry+.04*M,T,T,0))box_(h3Tint(beam,1.05),(sp[0]+sp[1])/2,ry,sp[1]-sp[0],.08*M,2.2);}
  /* trims at the ends of the face (the corners of the room), not on stone */
  if(style!=='masonry'&&style!=='render')for(const s of[-1,1])up(h3Tint(beam,.9),s*(L/2-T-.04*M),.08*M,2.4);
  /* the skirting (not across a door) and the plate under the ceiling */
  for(const sp of h3Spans(L,holes,y0,y0+skH,T,T,0))box_(h3Tint(beam,.85),(sp[0]+sp[1])/2,y0+skH/2,sp[1]-sp[0],skH,2.1);
  for(const sp of h3Spans(L,holes,top-plH,top,T,T,0))box_(beam,(sp[0]+sp[1])/2,top-plH/2,sp[1]-sp[0],plH,2.45);
  /* a frame round every window and door: jambs (ending a few mm inside the lintel and the sill), a lintel, a sill */
  for(const q of fr){const op=q.op,fc=h3Tint(beam,1.08);if(!(q.win||op.type==='door'||op.type==='bdoor'))continue;
    const ja=[q.a,q.ia],jb=[q.ib,q.b],jy0=q.y0+e,jy1=q.y1-e;
    for(const[a,b]of[ja,jb])if(b-a>.01*M)box_(fc,(a+b)/2,(jy0+jy1)/2,b-a,jy1-jy0,2.3);
    box_(fc,(q.a+q.b)/2,op.y1+lintH/2,q.b-q.a,lintH,2.35);
    if(q.win)box_(h3Tint(beam,1.15),(q.a+q.b)/2,op.y0-sillH/2,Math.min(q.b-q.a+.04*M,2*lim-Math.abs(q.a+q.b)),sillH,2.5);}}
/* =====================================================================================================================
   TIER-3 (AND TIER-2) BUILDINGS IN DEPTH (environment upgrades 08 and 10)
   (upgrade 10: the buildings of tier-2 villages too - cottages, stone cottages, storage houses, the tavern, the carpenter, the smith, the stable, sheds, barns, the scroll
   merchant, and the well; switch H3T.t2. A stone storey of a tier-2 house keeps its limewashed stones inside (upgrade 07); tier 3 plasters it. A plastered storey of either
   tier shows its frame: h3Plaster3, switch H3T.pl.)
   Every building of a tier-3 village that owArch builds (o.vt = the village's tier, set by owMakeBuilding: town houses, timber houses, the tavern, the merchant, the hall, the carpenter,
   the cottages among them, storage houses, stables, sheds, barns; a tier-1 hut keeps its own treatment) is modelled in depth like the tier-1 buildings:
   - roofs of single tiles (rounded, in columns; half-round tiles along the ridge and the hips), slates or shingles, in courses up every face of a gable, gambrel or hipped roof
     (cut along the hips under a hip cap, none where a dormer stands; a fascia under the eaves of a hipped roof); thatch as on the tier-1 roofs;
   - stone storeys of single raised stones between dressed quoins (long and short in turn, wrapping each corner), the gables of a stone house in stones too; brick storeys with the same
     quoins, a dentil course under the eaves and a flat arch of wedge-shaped bricks with a keystone over every window; plank walls of lapped boards (as tier 1); timber frames whose
     timbers each have a shade of their own, the ends of the joists under a jetty, framed gables (tie beam, king and queen posts, collar);
   - a plinth of raised stones, plank shutters (three boards, two ledges), heavier door frames; the inside of the outer walls finished as in the tier-1/2 houses (h3Lining).
   Nothing is drawn from the village stream R (world-sig) and nothing of the plan changes (doors, windows, stairs, colliders, interiors); every part keeps a depth of its own off the
   surface it dresses, so no two faces lie in one plane.
   ===================================================================================================================== */
const H3T={on:true,t2:true,pl:true,t4:true,pw:true,cap:true,t5:true,wx:true,br:true};
/* the village tiers whose buildings are modelled in depth by this module (a tier-1 hut keeps its own treatment, upgrade 05) */
const h3VT=o=>!!o&&(o.vt===3||(o.vt===2&&H3T.t2)||(o.vt===4&&H3T.t4)||(o.vt===5&&H3T.t5));
const h3T3=o=>H3.on&&H3T.on&&h3VT(o)&&o.tier!==1;
/* a part on a roof face: x along the eave, y up the slope, z out of the face (n = the face's outward horizontal, phi its pitch), then tilted about x and turned about z */
const _h3m=new THREE.Matrix4(),_h3bx=new THREE.Vector3(),_h3by=new THREE.Vector3(),_h3bz=new THREE.Vector3(),_h3qf=new THREE.Quaternion();
function h3FaceQ(nx,nz,phi,tilt,roll){const c=Math.cos(phi),s=Math.sin(phi);_h3bx.set(nz,0,-nx);_h3by.set(-nx*c,s,-nz*c);_h3bz.set(nx*s,c,nz*s);_h3m.makeBasis(_h3bx,_h3by,_h3bz);_h3qf.setFromRotationMatrix(_h3m);
  if(tilt){_h3a.setFromAxisAngle(_h3v.set(1,0,0),tilt);_h3qf.multiply(_h3a);}if(roll){_h3a.setFromAxisAngle(_h3v.set(0,0,1),roll);_h3qf.multiply(_h3a);}return _h3qf;}
function h3BasisQ(X,Y,Z){_h3m.makeBasis(X,Y,Z);return _h3qf.setFromRotationMatrix(_h3m);}
/* a unit box without its back (the face at z = +.5 for s = 1, at z = -.5 for s = -1): a part that lies against a wall, where that face never shows (10 triangles) */
const _h3nb={};
function h3NB(s){if(_h3nb[s])return _h3nb[s];const g=new THREE.BoxGeometry(1,1,1).toNonIndexed(),a=g.attributes.position.array,n=g.attributes.normal.array,q=[];
  for(let i=0;i<a.length;i+=9){if(n[i+2]*s>.5)continue;for(let k=0;k<9;k++)q.push(a[i+k]);}const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(q,3));return _h3nb[s]=o;}
/* a rounded tile: half a tube of three facets along y (-.5 ... .5), x -.5 ... .5, its back on z = 0, its crown at z = .87, closed at its lower end (9 triangles) */
let _h3tile=null;
function h3TileGeo(){if(_h3tile)return _h3tile;const pr=[];for(let k=0;k<=3;k++){const t=-Math.PI/2+k*Math.PI/3;pr.push([Math.sin(t)*.5,Math.cos(t)]);}const q=[];
  for(let k=0;k<3;k++){const a=pr[k],b=pr[k+1];q.push(a[0],-.5,a[1],b[0],-.5,b[1],b[0],.5,b[1],a[0],-.5,a[1],b[0],.5,b[1],a[0],.5,a[1]);q.push(0,-.5,0,b[0],-.5,b[1],a[0],-.5,a[1]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q,3));return _h3tile=g;}
/* ---- the faces of a roof as owRoof3 lays it: E a point of the eave line on the top of the slab, (tx, tz) along the eave, (nx, nz) the outward horizontal, phi the pitch, Ls the length up
   the slope, lim(s) the stretch of the eave coordinate a that the face covers at a distance s up the slope (cut along the hips), hm the margin kept from a hip ---- */
function h3RoofFaces(o,Y1,rect,rm,axis,party){const xc=(rect.x0+rect.x1)/2,zc=(rect.z0+rect.z1)/2,ax=axis==='x',span=ax?rect.z1-rect.z0:rect.x1-rect.x0,len=ax?rect.x1-rect.x0:rect.z1-rect.z0,s2=span/2,
    rise=clamp(rm.p*s2,.2,o.maxRise||.95),hip=o.roofKind==='hip'&&!party.l&&!party.r,F=[];
  const mk=(nx,nz,E,dx,dy,lim,top,hm)=>{F.push({nx,nz,tx:Math.abs(nz),tz:Math.abs(nx),E,Ls:Math.hypot(dx,dy),phi:Math.atan2(dy,dx),lim,top,hm:hm||0});};
  if(hip){/* (owHipGeo: eaves at +-hx along the ridge and +-hz across it, the ridge from -Lr to Lr; turned by 90 degrees for axis z, which is the same roof mirrored) */
    const ov=rm.ov,hx=len/2+ov,hz=s2+ov,drop=rise*ov/s2,Lr=Math.max(0,hx-hz),runE=hx-Lr,ph=Math.atan2(rise+drop,hz),phE=Math.atan2(rise+drop,runE);
    for(const sd of[1,-1]){
      mk(ax?0:sd,ax?sd:0,ax?[xc,Y1-drop,zc+sd*hz]:[xc+sd*hz,Y1-drop,zc],hz,rise+drop,s=>{const h=hx-(hx-Lr)*clamp(s*Math.cos(ph)/hz,0,1);return[-h,h];},'ridge',.022);
      mk(ax?sd:0,ax?0:sd,ax?[xc+sd*hx,Y1-drop,zc]:[xc,Y1-drop,zc+sd*hx],runE,rise+drop,s=>{const h=hz*(1-clamp(s*Math.cos(phE)/runE,0,1));return[-h,h];},'apex',.022);}
    return{F,rise,hip:{hx,hz,drop,Lr,ph,phE},xc,zc,ax};}
  const S=h3RoofSlopes(o,rect,rm,axis,party),aC=ax?xc:zc,lo=S.cAxis-S.lenR/2-aC,hi=S.cAxis+S.lenR/2-aC;
  for(const side of S.sides){const sd=side.sd;side.segs.forEach((sg,j)=>mk(ax?0:sd,ax?sd:0,ax?[xc,Y1+sg[1],zc+sd*sg[0]]:[xc+sd*sg[0],Y1+sg[1],zc],sg[0]-sg[2],sg[3]-sg[1],()=>[lo,hi],j===side.segs.length-1?'ridge':'knee'));}
  return{F,rise:S.rise,hip:null,xc,zc,ax,S,lo,hi};}
/* a point of a face: a along the eave, s up the slope, d out of it */
const h3FP=(F,a,s,d)=>{const c=Math.cos(F.phi),sn=Math.sin(F.phi),h=-s*c+d*sn;return[F.E[0]+a*F.tx+F.nx*h,F.E[1]+s*sn+d*c,F.E[2]+a*F.tz+F.nz*h];};
/* the courses: cw the depth of a course, sw the width of a tile, slate or shingle, thk its thickness, ov how far it reaches up under the course above, lift how far its lower edge stands
   off the face (it lies on the one below), stag every other course shifted by half */
const H3K={tile:{cw:.112,sw:.092,thk:.03,ov:1.3,lift:.02,stag:0},slate:{cw:.088,sw:.135,thk:.011,ov:1.6,lift:.011,stag:1},shingle:{cw:.095,sw:.13,thk:.016,ov:1.55,lift:.016,stag:1}};
function h3Cover(P,F,kind,col0,R,holes){const K_=H3K[kind],G=kind==='tile'?h3TileGeo():h3Board(),s0F=-.015,sMax=F.top==='ridge'?F.Ls-.04/Math.cos(F.phi):F.Ls,len=sMax-s0F;if(len<.05)return;
  /* (the first course reaches 1.5 cm past the eave; the last stops under the ridge cap, at a knee, or where the hips meet) */
  const K=Math.max(2,Math.round(len/K_.cw)),ck=len/K,el=ck*K_.ov,full=F.lim(0);
  for(let k=0;k<K;k++){const s0=s0F+k*ck,e=Math.min(el,sMax-s0);if(e<.03)continue;const sm=s0+e/2,dl=Math.atan2(K_.lift,e),L=F.lim(Math.max(0,sm)),a0=L[0]+F.hm,a1=L[1]-F.hm;if(a1-a0<.03)continue;
    let a=full[0]-(K_.stag&&k%2?K_.sw/2:0);
    while(a<a1-.004){const w=kind==='shingle'?K_.sw*(.7+R()*.6):K_.sw,lo=Math.max(a,a0),hi=Math.min(a+w,a1);a+=w;if(hi-lo<.025)continue;
      if(holes&&holes.some(h=>hi>h.a0&&lo<h.a1&&s0+e>h.s0&&s0<h.s1))continue;
      const am=(lo+hi)/2,r=R(),col=r<.06?h3Tint(col0,.72):r>.975?h3Tint(col0,1.15):h3Tint(col0,.85+R()*.25);
      if(kind==='tile'){const p=h3FP(F,am,sm,K_.lift/2);h3PQ(P,'r',G,col,p[0],p[1],p[2],h3FaceQ(F.nx,F.nz,F.phi,-dl,0),hi-lo-.006,e,K_.thk);}
      else{const p=h3FP(F,am,sm,K_.lift/2+K_.thk/2);h3PQ(P,'r',G,col,p[0],p[1],p[2],h3FaceQ(F.nx,F.nz,F.phi,-dl,(R()-.5)*.03),hi-lo-.005,e,K_.thk);}}}}
/* a ridge or a hip from C along X (Y its up, Z = X x Y), L long: half-round tiles, each lying on the one below, or a cap of boards / lead */
function h3Ridge(P,kind,col0,C,X,Y,Z,L,R,lift0){const q=h3BasisQ(Z,X,Y).clone();
  if(kind==='tile'){const tl=.12,n=Math.max(1,Math.round(L/(tl*.82))),st=L/n,dl=Math.atan2(.014,tl);_h3a.setFromAxisAngle(_h3v.set(1,0,0),-dl);q.multiply(_h3a);
    for(let k=0;k<n;k++){const t=(k+.5)*st,p=C.clone().addScaledVector(X,t).addScaledVector(Y,lift0+.007);h3PQ(P,'r',h3TileGeo(),h3Tint(col0,.76+R()*.16),p.x,p.y,p.z,q,.125,tl,.06);}}
  else{const p=C.clone().addScaledVector(X,L/2).addScaledVector(Y,lift0+.016);h3PQ(P,'r',box(1,1,1),h3Tint(col0,.72),p.x,p.y,p.z,q,.08,L+.01,.032);}}
/* the roof of a tier-3 building: called after owRoof3 and the dormers (dorm: the x of each dormer on the front slope) */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Roof3(...a){const d0=OWDET;OWDET=1;try{return h3Roof3_(...a);}finally{OWDET=d0;}}
function h3Roof3_(P,o,Y1,rect,rm,axis,party,dorm){if(!rm)return;const mat=o.roofMat,hipK=o.roofKind==='hip'&&!party.l&&!party.r;
  if(mat==='thatch'){if(!hipK)h3Roof(P,o,Y1,rect,rm,axis,party);return;}
  const RF=h3RoofFaces(o,Y1,rect,rm,axis,party),kind=mat==='tile'?'tile':mat==='slate'?'slate':'shingle',R=h3R(o,401),col0=o.roofCol,holes=[];
  /* no tiles under a dormer (owDormer's front wall, cheeks and roof, with a margin) */
  if(dorm&&dorm.length&&RF.ax){const s2=(rect.z1-rect.z0)/2,zd=.6*s2,yb=RF.rise*.4-.02,zb=s2*(1-(yb+.3)/RF.rise)-.04,hs=s2+rm.ov,F0=RF.F.find(F=>F.nz>.5&&F.top==='ridge');
    if(F0){const c=Math.cos(F0.phi);for(const u of dorm)holes.push({a0:u-RF.xc-.2,a1:u-RF.xc+.2,s0:(hs-zd)/c-.03,s1:(hs-zb)/c+.08});}}
  for(const F of RF.F)h3Cover(P,F,kind,col0,R,F.nz>.5&&RF.ax?holes:null);
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  if(RF.hip){const H=RF.hip,ax=RF.ax,W_=(A,y,T)=>ax?V(RF.xc+A,Y1+y,RF.zc+T):V(RF.xc+T,Y1+y,RF.zc+A),dk=o.beamCol||0x4a3220,fy=Y1-H.drop-.012;
    /* (the fascia under the eaves and the underside are owRoof3's now, for every hipped roof) */
    /* the hips: from each corner of the eaves to the end of the ridge, the cap's up between the normals of the two faces that meet there */
    for(const ea of[-1,1])for(const et of[-1,1]){const C=W_(ea*H.hx,-H.drop,et*H.hz),X=W_(ea*H.Lr,RF.rise,0).sub(C),Lh=X.length();X.multiplyScalar(1/Lh);
      const nL=ax?V(0,Math.cos(H.ph),et*Math.sin(H.ph)):V(et*Math.sin(H.ph),Math.cos(H.ph),0),nE=ax?V(ea*Math.sin(H.phE),Math.cos(H.phE),0):V(0,Math.cos(H.phE),ea*Math.sin(H.phE)),Y=nL.add(nE);
      Y.addScaledVector(X,-Y.dot(X)).normalize();h3Ridge(P,kind,col0,C,X,Y,V().crossVectors(X,Y),Lh,R,.004);}
    if(kind==='tile'&&H.Lr>.06){const X=ax?V(1,0,0):V(0,0,1);h3Ridge(P,kind,col0,W_(-H.Lr,RF.rise+.002,0),X,V(0,1,0),V().crossVectors(X,V(0,1,0)),2*H.Lr,R,0);}}
  else if(kind==='tile'){/* half-round ridge tiles over the ridge cap */const X=RF.ax?V(1,0,0):V(0,0,1),a0=RF.lo-.01,C=RF.ax?V(RF.xc+a0,Y1+RF.rise+.002,RF.zc):V(RF.xc,Y1+RF.rise+.002,RF.zc+a0);
    h3Ridge(P,kind,col0,C,X,V(0,1,0),V().crossVectors(X,V(0,1,0)),RF.hi-RF.lo+.02,R,0);}
  if(!RF.hip)h3Gable3(P,o,Y1,rect,rm,axis,party,RF);}
/* owRoof3 for a tier-3 stone house: its gables are dressed in stones (h3Gable3), so the gable behind them takes the mortar's colour, as the walls do */
function h3RoofT(P,o,Y1,top,rm,axis,topKey,party,T3){if(!T3||o.style!=='stone')return owRoof3(P,o,Y1,top,rm,axis,o.roofCol,topKey,party);const fc=o.fillCol;o.fillCol=owTintHex(fc,.62);try{return owRoof3(P,o,Y1,top,rm,axis,o.roofCol,topKey,party);}finally{o.fillCol=fc;}}
/* ---- the gables of a tier-3 house: framed (timber) or in stones (stone) ---- */
function h3Gable3(P,o,Y1,rect,rm,axis,party,RF){if(o.noFill)return;const stone=o.style==='stone',tim=o.style==='timber';if(!stone&&!tim)return;
  const S=RF.S,top=S.sides[0].segs,dv=Math.max(...top.map(sg=>{const dx=Math.abs(sg[0]-sg[2]),dy=sg[3]-sg[1];return rm.t*Math.hypot(dx,dy)/dx;}))+.006;
  const hAt=u=>{const x=Math.abs(u);let best=0;for(const sg of top){const xa=Math.min(sg[0],S.s2),xb=sg[2];if(x>xa||x<xb)continue;const t=(x-xb)/((sg[0])-xb||1);best=Math.max(best,sg[3]+(sg[1]-sg[3])*t);}return best-dv-.012;};
  const uMax=h=>{let u=0;while(u<S.s2&&hAt(u+.005)>=h)u+=.005;return u;};/* how far from the middle the gable is at least h high */
  const R=h3R(o,431),G=h3Stone(),beam=o.beamCol||0x4a3220,bc=()=>R()<.1?h3Tint(beam,.78):h3Tint(beam,.88+R()*.22);
  for(const end of[0,1]){if(axis==='x'&&(end?party.r:party.l))continue;const f=axis==='x'?(end?'right':'left'):(end?'front':'back'),xf=owFaceXf(f,rect);
    /* the attic window of a gable-front house (owArch: axis z, front) */
    const aw=(axis==='z'&&f==='front'&&o.atticWin&&(rect.x1-rect.x0)>.6)?{a:-.14,b:.14,y0:Y1+RF.rise*.28-.16,y1:Y1+RF.rise*.28+.16}:null,inAw=(a,b,ya,yb)=>!!aw&&b>aw.a&&a<aw.b&&yb>aw.y0&&ya<aw.y1;
    if(tim){const H0=hAt(0);if(H0<.2)continue;const tie=uMax(.07),qu=tie*.5,hc=H0*.55,col=uMax(hc+.03)-.01;
      owFB(P,'r',bc(),xf,0,Y1+.03,2*tie,.05,.04,0);
      if(!inAw(-.03,.03,Y1+.055,Y1+H0))owFB(P,'r',bc(),xf,0,Y1+.055+(H0-.055)/2,.05,H0-.055,.034,0);
      for(const s of[-1,1]){const hq=hAt(qu);if(hq>.1)owFB(P,'r',bc(),xf,s*qu,Y1+.055+(hq-.055)/2,.045,hq-.055,.034,0);}
      if(col>.08&&!inAw(-col,col,Y1+hc-.025,Y1+hc+.025))owFB(P,'r',bc(),xf,0,Y1+hc,2*col,.045,.04,0);}
    else{let y=Y1+.004,row=0;while(true){const ch=.106,w=uMax(y+ch-Y1+.004);if(w<.06)break;
        for(const sp of h3SpansH(-w,w,aw?[{a:aw.a,b:aw.b,y0:aw.y0,y1:aw.y1}]:[],y,y+ch))h3StoneRow(P,'r',xf,G,R,o.stoneCol,sp[0],sp[1],y+ch/2,ch,row);y+=ch;row++;}}}}
/* the free stretches of [a, b] for a course from ya to yb, round the holes h = {a, b, y0, y1} */
function h3SpansH(a,b,hs,ya,yb){const cut=hs.filter(h=>ya<h.y1&&yb>h.y0).sort((p,q)=>p.a-q.a),out=[];let cur=a;for(const h of cut){if(h.a>cur)out.push([cur,Math.min(h.a,b)]);cur=Math.max(cur,h.b);if(cur>=b)break;}if(b>cur)out.push([cur,b]);return out.filter(s=>s[1]-s[0]>.03);}
/* one course of raised stones from ua to ub (every other course starts with a short stone: the joints are bonded) */
function h3StoneRow(P,key,xf,G,R,mcol,ua,ub,yc,ch,row){let u=ua,first=true;
  while(u<ub-.02){let sl=first&&row%2?.09+R()*.07:.18+R()*.15;first=false;if(ub-u-sl<.07)sl=ub-u;if(sl<.03)break;const dep=.012+R()*.01,r=R(),col=r<.08?h3Tint(mcol,.74):h3Tint(mcol,.84+R()*.26);
    h3PQ(P,key,G,col,xf.X(u+sl/2,-.002),yc,xf.Z(u+sl/2,-.002),h3Q(xf.ry,(R()-.5)*.06,(R()-.5)*.06),sl-.012,ch-.012,dep);u+=sl;}}
/* the openings of a stone or brick face with the margins their frames, sills, lintels and arches need */
function h3Holes3(o,ops,y1){return ops.map(op=>{const d=op.type==='door'||op.type==='bdoor',arch=op.type==='door'&&o.archDoor?Math.max(0,Math.min(op.w/2+.07,y1-op.y1-.12)):0,pas=op.type==='passage'?Math.max(0,Math.min((op.w/2+.05)*.55,y1-op.y1-.1)):0,
    mx=d?.075:op.type==='win'?.034:.08;return{a:op.u-op.w/2-mx,b:op.u+op.w/2+mx,y0:op.y0-(op.type==='win'?.045:op.type==='shop'?.06:0)-.004,y1:op.y1+(arch?.07+arch:pas?.06+pas:op.type==='win'?.062:.065)};});}
/* ---- a stone or brick storey of a tier-3 building: dressed quoins at the corners (long and short in turn, the other way round on the next face, so they wrap the corner), raised stones
   between them (stone), or a dentil course under the eaves (brick); the band between storeys as before ---- */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Walls3(...a){const d0=OWDET;OWDET=1;try{return h3Walls3_(...a);}finally{OWDET=d0;}}
function h3Walls3_(P,key,o,xf,ops,y0,y1,f,i,mcol,brick,topF){const R=h3R(o,331+i*7+f.charCodeAt(0)),L=xf.L,G=h3Stone(),side=f==='left'||f==='right',party=o.party||{},axis=o.axis||'x';
  if(i>0&&!side)owFB(P,key,o.stoneCol,xf,0,y0,L+.02,.045,.045,0);
  const pt=e=>{const lft=f==='front'?e<0:f==='back'?e>0:null;return lft!==null&&(lft?!!party.l:!!party.r);};/* an end of the front or the back against a neighbour */
  const nC=Math.max(3,Math.round((y1-y0-.008)/.106)),ch=(y1-y0-.008)/nC,hs=h3Holes3(o,ops,y1);
  for(let c=0;c<nC;c++){const ya=y0+.004+c*ch,yb=ya+ch,yc=(ya+yb)/2,ql=(c+(side?1:0))%2===0?.17:.1;let fa=-L/2,fb=L/2;
    for(const e of[-1,1]){if(pt(e))continue;if(hs.some(h=>ya<h.y1&&yb>h.y0&&(e<0?h.a<-L/2+ql+.02:h.b>L/2-ql-.02)))continue;
      const len=ql+(side?0:.028);owFB(P,key,h3Tint(o.stoneCol,1.06+R()*.1),xf,e*(L/2-ql+len/2),yc,len,ch-.008,.028,0);if(e<0)fa=-L/2+ql+.006;else fb=L/2-ql-.006;}
    if(!brick)for(const sp of h3SpansH(fa,fb,hs,ya,yb))h3StoneRow(P,key,xf,G,R,mcol,sp[0],sp[1],yc,ch,c);}
  if(brick&&topF){const hipK=o.roofKind==='hip'&&!party.l&&!party.r;if(hipK||(axis==='x'?!side:side)){/* the dentils, under the soffit and clear of the quoins */
    const n=Math.floor((L-.44)/.055);for(let k=0;k<=n;k++){const u=-n*.0275+k*.055;h3PQ(P,key,h3Board(),h3Tint(mcol,.86+((k*37)%5)*.04),xf.X(u,.013),y1-.13,xf.Z(u,.013),h3Q(xf.ry,0,0),.028,.03,.026);}}}}
/* a flat arch over a window in a brick wall: seven wedge-shaped bricks fanning out, the keystone in stone */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3JackArch(...a){const d0=OWDET;OWDET=1;try{return h3JackArch_(...a);}finally{OWDET=d0;}}
function h3JackArch_(P,key,o,xf,op,mcol){const n=7,wv=(op.w+.064)/n,y=op.y1+.03,h=.062;
  for(let k=0;k<n;k++){const t=k-(n-1)/2,ks=t===0;owFB(P,key,ks?h3Tint(o.stoneCol,1.1):h3Tint(mcol,.8+((k*37)%7)*.03),xf,op.u+t*wv,y+(ks?.012:0)+h/2,wv-.006,h+(ks?.024:0),ks?.026:.018,0,-t*.075);}}
/* a plank shutter: three boards side by side, two ledges across them */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Shutter3(...a){const d0=OWDET;OWDET=1;try{return h3Shutter3_(...a);}finally{OWDET=d0;}}
function h3Shutter3_(P,key,o,xf,su,yc,h){const c=o.shutCol,bw=.07/3,G=h3NB(-1),put=(col,u,y,sw,sh,sd,out)=>P(key,G,col,xf.X(u,out+sd/2),y,xf.Z(u,out+sd/2),0,xf.ry,0,sw,sh,sd);/* (backs against the wall left out) */
  for(let k=0;k<3;k++)put(h3Tint(c,[.94,1.06,.98][k]),su-.035+bw*(k+.5),yc,bw-.003,h,[.026,.03,.028][k],.004);
  for(const ly of[-.3,.3])put(h3Tint(c,.8),su,yc+ly*h,.064,.022,.008,.0335);}
/* the ends of the joists under a jetty: on the face of the storey below, out past the face of the one above (under its jetty beam) */
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3Joists3(...a){const d0=OWDET;OWDET=1;try{return h3Joists3_(...a);}finally{OWDET=d0;}}
function h3Joists3_(P,o,xf,y,jet){const L=xf.L,n=Math.max(2,Math.round((L-.12)/.13)),c=o.beamCol||0x4a3220;
  for(let k=0;k<=n;k++)owFB(P,'u',h3Tint(c,.85+((k*53)%9)*.03),xf,-L/2+.06+k*(L-.12)/n,y-.0415,.034,.034,jet+.026,0);}
/* ---- a plastered storey (upgrade 10; H3T.pl): the frame under the render shows at the foot of the wall and under the eaves - a sill beam along the foot (not where a jetty
   beam runs) and a plate under the eaves of the top storey. Both end 3 mm inside the corner posts and are shallower than them (no face of theirs in one plane with a post's), and
   stop clear of every opening with its frame, shutters, sill and flower box, lintel or arch, balcony, shop front and sign, passage, and of the porch and the lantern ---- */
function h3Plaster3(P,key,o,xf,ops,y0,y1,topF,bc,noSill,doorU){const L=xf.L,ends=.022,hs=[];
  for(const op of ops){const w2=op.w/2;
    if(op.type==='win')hs.push({a:op.u-w2-.1,b:op.u+w2+.1,y0:op.y0-.11,y1:op.y1+.08});
    else if(op.type==='door'||op.type==='bdoor'){hs.push({a:op.u-w2-.02,b:op.u+w2+.02,y0:op.y0-.01,y1:op.y1});hs.push({a:op.u-w2-.12,b:op.u+w2+.12,y0:op.y1-.02,y1:op.y1+(o.archDoor?.3:.09)});
      if(op.type==='bdoor')hs.push({a:op.u-w2-.14,b:op.u+w2+.14,y0:op.y0-.04,y1:op.y0+.25});}
    else if(op.type==='shop'){hs.push({a:op.u-w2-.07,b:op.u+w2+.07,y0:op.y0-.08,y1:op.y1+.24});if(o.sign)hs.push({a:op.u+w2-.1,b:op.u+w2+.2,y0:op.y0,y1:op.y1+.24});}
    else if(op.type==='passage')hs.push({a:op.u-w2-.08,b:op.u+w2+.08,y0:op.y0-.01,y1:op.y1+.32});}
  if(doorU!=null){if(o.porch)hs.push({a:doorU-.34,b:doorU+.34,y0:y0,y1:y0+.75});if(o.lantern)hs.push({a:doorU+.2,b:doorU+.32,y0:y0+.4,y1:y0+.64});}
  if(!noSill)for(const sp of h3SpansH(-L/2+ends,L/2-ends,hs,y0,y0+.054))owFB(P,key,bc(),xf,(sp[0]+sp[1])/2,y0+.028,sp[1]-sp[0],.052,.03,0);
  if(topF)for(const sp of h3SpansH(-L/2+ends,L/2-ends,hs,y1-.13,y1-.078))owFB(P,key,bc(),xf,(sp[0]+sp[1])/2,y1-.104,sp[1]-sp[0],.05,.03,0);}
/* ---- the top of a party wall (upgrade 11; H3T.cap). A terrace gives the wall between two houses to the taller plan (pl.topY), before either stands on the ground; on a slope
   the other one can end up taller, and the strip of its side above the owner's wall had no wall at all (a hole into its top storey, seen from the street). Once the whole
   world is built (before the village blocks are merged) the owner's wall is carried up to the neighbour's top: a box like the party wall (owArch), 2 mm back from the
   boundary (the owner's gable fill is in that plane), appended to the owner's own layer so that the blocks, the cutaway and the light grid treat it as the wall. ---- */
function owPartyCaps(){if(!H3T.cap)return 0;let n=0;const top=b=>{const S=b.arch.storeys;return b.hi+S[S.length-1].ceilY*b.BSc;};
  for(const v of OW.villages)for(const O of v.buildings){const A=O.arch,pl=O.pl;if(!A||!pl||!pl.nbr||!A.party)continue;
    for(const sd of['l','r']){if(!A.party[sd]||!(sd==='l'?A.party.ownL:A.party.ownR))continue;const N=pl.nbr[sd]&&pl.nbr[sd].bld;if(!N||!N.arch||!N.arch.storeys)continue;
      const d=top(N)-top(O);if(!(d>.004))continue;const S=A.storeys[A.storeys.length-1],i=A.storeys.length-1,key=i?'u':'w',m=O.meshes[key];if(!m)continue;
      const mas=pl.style==='stone'||pl.style==='brick'||(i===0&&!!(pl.base||pl.lowStone)),bk=pl.style==='brick'||(i===0&&pl.base==='brick'),col=mas?(bk?(pl.brickCol||0x9a5a44):pl.stoneCol):pl.wallCol;
      const xf=owFaceXf(sd==='l'?'left':'right',S.rect),h=d/O.BSc,kb=kitBuilder();owFB(kb.P,key,col,xf,0,S.ceilY+h/2,xf.L-2*OW_T,h,OW_T-.002/O.BSc,-OW_T);
      const add=mergeParts(kb.B[key]),g0=m.geometry,out=new THREE.BufferGeometry(),ud=g0.userData||{},cut=ud.nb!=null?ud.nb*3:g0.attributes.position.array.length;/* (in at the end of the parts drawn always - upgrade 12's level of detail) */
      for(const at of['position','normal','color']){const a=g0.attributes[at].array,b2=add.attributes[at].array,c=new Float32Array(a.length+b2.length);c.set(a.subarray(0,cut),0);c.set(b2,cut);c.set(a.subarray(cut),cut+b2.length);out.setAttribute(at,new THREE.BufferAttribute(c,3));}
      if(ud.nb!=null){out.userData.nf=ud.nf;out.userData.nb=ud.nb+add.attributes.position.count;out.setDrawRange(ud.nf||0,Infinity);}out.computeBoundingSphere();m.geometry=out;g0.dispose();add.dispose();n++;}}
  return n;}
/* ---- weathered render (upgrade 12; H3T.wx): the white infill of a timber or plastered storey is not one flat white. Every piece of panel owPanel lays (between openings,
   under and over each of them) is laid the same, but its outer face is a small grid whose corners carry their own shade (mergeParts: geo.__vc multiplies the part's colour
   per vertex), so the render darkens where it meets the frames and timbers (a band of about 25 cm), at the foot of the storey (splash and damp, about 40 cm), in a stain that
   runs down about 60 cm from under every window sill, a little under the eaves, and in faint patches (a hash of the corner's place); the shades run into the colour of the
   wall, so there is no seam. The stains are a little warmer than the wall (less blue). The face is the panel's own face, not a sheet over it: nothing lies in one plane. ---- */
function h3WShade(s){return[1-.85*s,1-.95*s,1-1.12*s];}
const _h3WQ=[0,1,2,0,2,3],_h3WI=[0,1,1,0],_h3WJ=[0,0,1,1];
function h3WFace(U,V,S){/* the face z=+.5 of a unit box: U, V the grid lines (-.5 ... .5), S(i,j) the shade at line U[i], V[j]; two triangles a cell, facing +z.
     Not a BufferGeometry: what mergeParts reads of a part (its triangles flattened, __ni, and the colour of each vertex, __vc) and nothing else - a village is built while
     the player walks, and a geometry object a piece of wall cost more than the piece (wstVillage) */
  const nu=U.length,nv=V.length,sh=new Float32Array(nu*nv*3);for(let b=0;b<nv;b++)for(let a=0;a<nu;a++){const s=S(a,b),k=(b*nu+a)*3;sh[k]=1-.85*s;sh[k+1]=1-.95*s;sh[k+2]=1-1.12*s;}
  const p=new Float32Array((nu-1)*(nv-1)*18),c=new Float32Array(p.length);let o=0;
  for(let j=0;j<nv-1;j++)for(let i=0;i<nu-1;i++)for(let t=0;t<6;t++){const q=_h3WQ[t],a=i+_h3WI[q],b=j+_h3WJ[q],k=(b*nu+a)*3;p[o]=U[a];p[o+1]=V[b];p[o+2]=.5;c[o]=sh[k];c[o+1]=sh[k+1];c[o+2]=sh[k+2];o+=3;}
  return{__ni:p,__vc:c};}
/* (environment upgrade 12: what this makes is dressing - drawn near, left out far away) */
function h3PanelW(...a){const d0=OWDET;OWDET=1;try{return h3PanelW_(...a);}finally{OWDET=d0;}}
function h3PanelW_(P,key,col,xf,y0,y1,ops,tA,tB,o,i,f,topF){const BS=OW_BS*(o.sc||1),M=1/BS,eB=.25*M,dB=.4*M,wB=.6*M,R=h3R(o,501+i*7+f.charCodeAt(0)),amt=.8+R()*.45;
  const nz=(u,y)=>{const h=Math.sin(u*12.9898*BS+y*78.233*BS+f.charCodeAt(0)*3.1+i*1.7)*43758.5453;return(h-Math.floor(h)-.5)*.05;};
  const put=(ua,ub,ya,yb,kind,op)=>{if(!(ub-ua>.004&&yb-ya>.004))return;const sw=ub-ua,sh=yb-ya,uc=(ua+ub)/2,yc=(ya+yb)/2;
    /* the grid lines across (u) and up (y): the edges, the bands in from them */
    const eu=Math.min(eB,sw*.35),U=sw>2.2*eu&&sw>.05?[-.5,-.5+eu/sw,.5-eu/sw,.5]:[-.5,.5];
    const bot=ya<=y0+1e-6,drip=kind==='under'&&op&&op.type==='win',topE=drip?Math.min(wB,sh*.8):Math.min(eB,sh*.35),botE=bot?Math.min(dB,sh*.45):Math.min(eB,sh*.35);
    const V=sh>botE+topE+.004?[-.5,-.5+botE/sh,.5-topE/sh,.5]:[-.5,.5];
    const S=(a,b)=>{const u=uc+U[a]*sw,y=yc+V[b]*sh,onU=a===0||a===U.length-1,onB=b===0,onT=b===V.length-1;let s=0;
      if(onU)s+=.06;if(onT&&!drip)s+=.05;if(onB&&!bot)s+=.04;
      if(bot&&onB)s+=.13;
      if(drip&&onT&&!onU)s+=.13;/* (the stain only on the inner corners: the sides of the piece match the pieces beside it, there is no seam) */
      if(topF&&onT&&y>=y1-1e-6)s+=.03;
      s=Math.max(0,s*amt+nz(u,y));return Math.min(.24,s);};
    const g=h3WFace(U,V,S);
    P(key,h3NB(1),col,xf.X(uc,-OW_T/2),yc,xf.Z(uc,-OW_T/2),0,xf.ry,0,sw,sh,OW_T);
    P(key,g,col,xf.X(uc,-OW_T/2),yc,xf.Z(uc,-OW_T/2),0,xf.ry,0,sw,sh,OW_T);};
  let cur=-xf.L/2+tA;const end=xf.L/2-tB;
  for(const op of ops){put(cur,op.u-op.w/2,y0,y1,'full',null);put(op.u-op.w/2,op.u+op.w/2,y0,op.y0,'under',op);put(op.u-op.w/2,op.u+op.w/2,op.y1,y1,'over',op);cur=op.u+op.w/2;}put(cur,end,y0,y1,'full',null);}
/* the timbers of a tier-3 frame: each its own shade of weathered wood */
/* ---- bridge houses (upgrade 12; H3T.br). Now and then a city (tier 5) has a house that spans a street: a storey of the city's own kind (the same weathered walls, framed windows,
   shutters and tiled roof as its neighbours, owArch with the party walls on both ends) carried on a stone arch, and the street runs on through the passage beneath (a barrel vault,
   voussoirs with a keystone, ashlar spandrels, piers against the two houses). It is found once the whole world is built (before the blocks are merged): two row houses at the end of
   their rows, turned the same way, with their free side walls facing each other across a street and their fronts in one line. The passage stays clear of every window and door in
   those walls (it takes the front strip of the gap, 1.9 to 3 m deep), of lamps, props and other buildings, and the bridge has to fit inside the outline of both walls: under the eaves
   of a house that turns its eaves to the street, inside the gable of one that turns its gable, and nothing of either house (a roof edge, a sign, a sill) may reach into it. The choice
   is a hash of the place: nothing draws from the world's random stream, and the bridge is not one of the village's buildings (no index; saved worlds load as before).
   v.bridges keeps each one: its frame, its parts and the boxes that shorten the camera's boom (tpcBoom) so the camera never ends up inside it. ---- */
const H3B={max:2,minGap:3,maxGap:8.6,minD:1.9,maxD:3,rec:.12,yS:2.25,sh:.6};
function h3BrFrame(x,z,rot){return{x,z,rot,c:Math.cos(rot),s:Math.sin(rot)};}
const h3BrL=(F,wx,wz)=>[(wx-F.x)*F.c-(wz-F.z)*F.s,(wx-F.x)*F.s+(wz-F.z)*F.c];
const h3BrW=(F,lx,lz)=>[F.x+lx*F.c+lz*F.s,F.z-lx*F.s+lz*F.c];
/* the pairs of houses a bridge could join, each with its frame and its depth */
function h3BrCands(v){const out=[],L=v.buildings.filter(b=>b.row&&b.arch&&b.pl&&b.def&&b.def.res&&!b.pl.passage&&b.arch.storeys&&b.arch.roof);
  for(const A of L)for(const B of L){if(A===B||Math.abs(Math.sin(A.rot-B.rot))>.02||Math.cos(A.rot-B.rot)<0)continue;
    const rot=A.rot,c=Math.cos(rot),s=Math.sin(rot),SA=A.BSc,SB=B.BSc,pa=A.x*c-A.z*s+A.arch.W*SA/2,pb=B.x*c-B.z*s-B.arch.W*SB/2,gap=pb-pa;
    if(gap<H3B.minGap||gap>H3B.maxGap||A.arch.party.r||B.arch.party.l)continue;
    const fa=A.x*s+A.z*c+A.arch.D*SA/2,fb=B.x*s+B.z*c+B.arch.D*SB/2;if(Math.abs(fa-fb)>.3)continue;const f0=Math.min(fa,fb);
    /* the openings in the two walls: how far behind the fronts each begins (its shutters too) and its heights */
    const ops=[];let st=1e9;for(const[H,face,sg,fH]of[[A,'right',1,fa],[B,'left',-1,fb]]){const S=H.BSc,D2=H.arch.D/2;
      for(const op of H.arch.windows.concat(H.arch.doors)){if(op.face!==face)continue;const d=(D2+sg*op.u-op.w/2-.11)*S-(fH-f0);ops.push({d,y0:H.hi+op.y0*S,y1:H.hi+op.y1*S});if(d<st)st=d;}}
    const Db0=Math.min(H3B.maxD,st-H3B.rec-.1);if(Db0<H3B.minD)continue;
    const sR=(pa+pb)/2;
    out.push({A,B,rot,c,s,gap,sR,f0,ops,Db0,h:owHash2(Math.round(sR*7)+311,Math.round(f0*7)-97)});}
  return out.sort((p,q)=>p.h-q.h);}
/* how many vertices of the village's meshes lie inside the bridge (E: the box round it in its frame, [x0,x1,y0,y1,z0,z1], metres, y in the world; inZ(lx, y, lz): inside its shape) */
function h3BrHits(v,F,E,inZ){let n=0;const cx=(E[0]+E[1])/2,cz=(E[4]+E[5])/2,w=h3BrW(F,cx,cz),er=Math.hypot(E[1]-E[0],E[5]-E[4])/2,sp=new THREE.Sphere();
  v.g.traverseVisible(me=>{if(!me.isMesh||me.isInstancedMesh||n)return;const g=me.geometry,pa=g&&g.attributes&&g.attributes.position;if(!pa)return;if(!g.boundingSphere)g.computeBoundingSphere();
    sp.copy(g.boundingSphere).applyMatrix4(me.matrixWorld);if(Math.hypot(sp.center.x-w[0],sp.center.z-w[1])>sp.radius+er||sp.center.y+sp.radius<E[2]||sp.center.y-sp.radius>E[3])return;
    const e=me.matrixWorld.elements,a=pa.array;for(let i=0;i<a.length;i+=3){const x=a[i],y=a[i+1],z=a[i+2],wy=e[1]*x+e[5]*y+e[9]*z+e[13];if(wy<E[2]||wy>E[3])continue;
      const wx=e[0]*x+e[4]*y+e[8]*z+e[12],wz=e[2]*x+e[6]*y+e[10]*z+e[14],dx=wx-F.x,dz=wz-F.z,lx=dx*F.c-dz*F.s,lz=dx*F.s+dz*F.c;if(lx>E[0]&&lx<E[1]&&lz>E[4]&&lz<E[5]&&(!inZ||inZ(lx,wy,lz))){n++;return;}}});
  return n;}
/* the outline of a house's side wall at a depth of the bridge: the top of the wall under its eaves, or the gable */
function h3BrOutline(H,F,lz){const A=H.arch,S=H.BSc,T=A.storeys[A.storeys.length-1].rect,rf=A.roof,pF=F.x*F.s+F.z*F.c+lz,zH=(pF-(H.x*F.s+H.z*F.c))/S;
  let y;if(rf.axis==='z'||rf.kind==='hip'){const rmH=ROOFM[rf.mat]||ROOFM.tile,s2=(rf.axis==='z'?T.x1-T.x0:T.z1-T.z0)/2;y=rf.baseY-rf.rise*rmH.ov/Math.max(.1,s2)-.06;}else{const zc=(T.z0+T.z1)/2,s2=(T.z1-T.z0)/2;y=rf.baseY+rf.rise*Math.max(0,1-Math.abs(zH-zc)/s2)-.07;}
  return H.hi+y*S;}
/* every check for one pair; the heights of the bridge if it fits, null if not */
function h3BrFit(v,C){const{A,B,gap,rot,c,s,sR,f0}=C,BS=OW_BS,src=[A.pl,B.pl].find(p=>p.style==='plaster'||p.style==='timber')||A.pl,rm=ROOFM[src.roofMat]||ROOFM.tile,ov=rm.ov*BS;
  const fr=Db=>{const sF=f0-H3B.rec-Db/2;return h3BrFrame(c*sR+s*sF,-s*sR+c*sF,rot);};
  let F=fr(C.Db0),gMax=-1e9,gMin=1e9;for(let i=0;i<=4;i++)for(let j=0;j<=3;j++){const p=h3BrW(F,(-.5+i/4)*(gap-.3),(-.5+j/3)*C.Db0),h=owH(p[0],p[1]);gMax=Math.max(gMax,h);gMin=Math.min(gMin,h);}
  const ra=clamp(.16*gap,.7,1.15),rw=.085,yS=gMax+H3B.yS,yC=yS+ra,base=yC+rw*BS+.03,floorY=base+OW_FH*BS,wallTop=floorY+H3B.sh*BS;
  /* the depth: an opening at the height of the eaves keeps clear of them too */
  let Db=C.Db0;for(const q of C.ops)if(q.y1>wallTop-.65&&q.y0<wallTop+.35)Db=Math.min(Db,q.d-H3B.rec-.1-ov-.05);if(Db<H3B.minD)return null;
  F=fr(Db);C.Db=Db;C.F=F;const rr=clamp(rm.p*Db/BS/2,.2,.95)*BS,ridge=wallTop+rr;
  /* inside both walls' outlines */
  for(const H of[A,B])for(let k=-2;k<=2;k++){const lz=k/2*Db/2,bt=wallTop+rr*(1-Math.abs(lz)/(Db/2))+.14;if(bt>h3BrOutline(H,F,lz))return null;}
  /* no lamp, no prop, no other building in the passage; the street goes through it */
  for(const l of OW.lamps||[]){if(Math.abs(l.x-F.x)>gap+4||Math.abs(l.z-F.z)>gap+4)continue;const q=h3BrL(F,l.x,l.z);if(Math.abs(q[0])<gap/2+.3&&Math.abs(q[1])<Db/2+.3)return null;}/* (one in front of it is fine: its post and lantern are in the check of the shape below) */
  let nRoad=0,nAll=0;for(let lx=-gap/2+.4;lx<=gap/2-.4;lx+=.3)for(let lz=-Db/2;lz<=Db/2+1e-6;lz+=.3){const p=h3BrW(F,lx,lz),cc=owCell(p[0],p[1]);if(!grid[cc.r])return null;const g=grid[cc.r][cc.c];nAll++;if(g===1)nRoad++;/* (a prop on the street is fine: a tall one is in the check of the shape) */
    for(const b of v.buildings)if(b!==A&&b!==B&&b.ob&&owObbIn(b.ob,p[0],p[1],.3))return null;}
  if(nRoad<nAll*.5)return null;
  /* nothing of the houses or of anything else reaches into it (the walls themselves and what lies on them excepted: 16 cm). Its shape: the body up to the roof with its tiles (and 8 cm),
     the voussoirs and spandrel stones proud of the faces, the deck band with its plinth stones, the eaves */
  const hz=Db/2,inZ=(lx,y,lz)=>{const a=Math.abs(lz);return(a<=hz+.03&&y>=yS-.15&&y<=wallTop+rr*Math.max(0,1-a/hz)+.22)||(a<=hz+.13&&y>=yS-.15&&y<=base)||(a<=hz+.32&&y>=base-.05&&y<=floorY+.05)||(a<=hz+ov+.05&&y>=wallTop-.55&&y<=wallTop+.3);};
  if(h3BrHits(v,F,[-gap/2+.16,gap/2-.16,yS-.15,ridge+.3,-hz-ov-.05,hz+ov+.05],inZ))return null;
  return{src,rm,gMax,gMin,ra,rw,yS,yC,base,floorY,wallTop,ridge};}
function h3BrBuild(v,C,K){const{A,B,gap,Db,F}=C,BS=OW_BS,W=gap/BS,D=Db/BS,R=mulberry((Math.imul(Math.round(F.x*13),73856093)^Math.imul(Math.round(F.z*13),19349663)^0x2b1d)>>>0),src=K.src;
  const plas=src.style==='plaster'||src.style==='timber';
  const o={type:'bridge',w:W,d:D,floors:1,sh:H3B.sh,shs:[H3B.sh],party:{l:true,r:true},partyOwn:{},row:true,jetty:false,style:plas?src.style:'plaster',
    wallCol:plas?src.wallCol:owJit(owPick(R,OWP.plaster),R,.08),beamCol:src.beamCol,stoneCol:src.stoneCol,brickCol:src.brickCol,roofMat:src.roofMat,roofCol:src.roofCol,shutCol:src.shutCol,doorCol:src.doorCol,
    shutters:true,noDoor:true,windows:{front:1,back:1,left:0,right:0},winS:src.winS||1,axis:'x',roofKind:'gable',tier:5,vt:5,sc:1,noFill:true,maxRise:.95};o.fillCol=o.wallCol;
  const kb=kitBuilder(),P=kb.P,d0=OWDET;OWDET=0;
  try{owArch(P,R,o);
    /* the arch, in the same frame: y 0 is the foot of the deck (the foundation band of the storey), the springing and the crown below it */
    const yS=(K.yS-K.base)/BS,ra=K.ra/BS,rw=K.rw,yG=(K.gMin-K.base)/BS-.06,sc=o.stoneCol,G=h3Stone(),th=.055,NP=24;
    const arc=[];for(let k=0;k<=NP;k++){const t=Math.PI*k/NP;arc.push([W/2*Math.cos(t),yS+ra*Math.sin(t)]);}
    const sg=owPolyGeo([[-W/2,0],[W/2,0]].concat(arc),th);
    for(const sd of[1,-1])P('a',sg,h3Tint(sc,.94),0,0,sd*(D/2-.004-th/2));
    /* the barrel vault: a course of stone across the passage per facet of the arch */
    {const M=18;for(let k=0;k<M;k++){const t0=Math.PI*k/M,t1=Math.PI*(k+1)/M,x0=W/2*Math.cos(t0),y0=yS+ra*Math.sin(t0),x1=W/2*Math.cos(t1),y1=yS+ra*Math.sin(t1),dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy),tv=.04;
      P('a',box(l+.006,tv,D-.012),h3Tint(sc,k%2?.78:.86),(x0+x1)/2+dy/l*tv/2,(y0+y1)/2-dx/l*tv/2,0,0,0,Math.atan2(dy,dx));}}
    /* the piers against the two houses, from below the ground up to the springing, and an impost course on them */
    for(const sd of[-1,1]){const pw=.1;P('a',box(pw,yS-yG,D),h3Tint(sc,.9),sd*(W/2-pw/2),(yS+yG)/2,0);P('a',box(pw+.03,.045,D+.03),h3Tint(sc,1.06),sd*(W/2-(pw+.03)/2),yS-.0225,0);}
    /* the dressing (near only): voussoirs and a keystone round both faces of the arch, ashlar on the spandrels and the piers */
    OWDET=1;
    for(const fz of[1,-1]){const xf=owFaceXf(fz>0?'front':'back',{x0:-W/2,x1:W/2,z0:-D/2+.004,z1:D/2-.004}),a=W/2+rw/2,b=ra+rw/2,per=Math.PI*Math.sqrt((a*a+b*b)/2);let Kn=Math.max(9,Math.round(per/.15));if(Kn%2===0)Kn++;
      for(let k=0;k<Kn;k++){const t=Math.PI*(k+.5)/Kn,ks=k===(Kn-1)/2,ux=Math.cos(t)/a,uy=Math.sin(t)/b,ul=Math.hypot(ux,uy),nx=ux/ul,ny=uy/ul,len=ks?rw*1.45:rw*(k%2?1:1.2),sh=(len-rw)/2,u=a*Math.cos(t)+nx*sh,y=yS+b*Math.sin(t)+ny*sh;/* (in the face's own u: the arch is symmetric, so the back face is the same) */
        owFB(P,'a',ks?h3Tint(sc,1.1):h3Tint(sc,.86+((k*37)%7)*.035),xf,u,y,per/Kn-.008,len,ks?.035:.025,0,Math.atan2(ny,nx)-Math.PI/2);}
      const nC=Math.max(2,Math.round(-yS/.072)),ch=(-yS-.006)/nC,ae=W/2+rw,be=ra+rw;
      for(let c2=0;c2<nC;c2++){const ya=yS+c2*ch,yc=ya+ch/2,q=(ya-yS)/be,xi=q<1?ae*Math.sqrt(1-q*q)+.012:0,xo=W/2-.11;
        if(xi<=0)h3StoneRow(P,'a',xf,G,R,sc,-xo,xo,yc,ch,c2);else if(xo-xi>.05){h3StoneRow(P,'a',xf,G,R,sc,xi,xo,yc,ch,c2);h3StoneRow(P,'a',xf,G,R,sc,-xo,-xi,yc,ch,c2+1);}}}
    for(const sd of[-1,1]){const xf=owFaceXf(sd>0?'left':'right',sd>0?{x0:W/2-.1,x1:W/2,z0:-D/2,z1:D/2}:{x0:-W/2,x1:-W/2+.1,z0:-D/2,z1:D/2}),nC=Math.max(3,Math.round((yS-.045-yG)/.08)),ch=(yS-.045-yG)/nC;
      for(let c2=0;c2<nC;c2++)h3StoneRow(P,'a',xf,G,R,sc,-D/2+.01,D/2-.01,yG+(c2+.5)*ch,ch,c2);}
  }finally{OWDET=d0;}
  const parts=[];for(const k of['f','w','u','r','a'])if(kb.B[k])for(const p of kb.B[k])parts.push(p);if(!parts.length)return null;
  const geo=mergeParts(parts),u=geo.userData;if(u&&u.nb!=null)geo.setDrawRange(u.nf||0,Infinity);
  const g=new THREE.Group(),gi=new THREE.Group();g.position.set(F.x,K.base,F.z);g.rotation.y=F.rot;gi.scale.setScalar(BS);g.add(gi);
  const m=new THREE.Mesh(geo,VCMAT);m.castShadow=true;m.receiveShadow=true;gi.add(m);
  if(kb.B.g){const mg=new THREE.Mesh(mergeParts(kb.B.g),OW_GLASS_FARLIT);gi.add(mg);}
  owStaticCaster(g);v.g.add(g);g.updateMatrixWorld(true);
  const hg=gap/2,hd=Db/2;
  return{x:F.x,z:F.z,rot:F.rot,F,gap,Db,g,m,near:true,a:v.buildings.indexOf(A),b:v.buildings.indexOf(B),yS:K.yS,yC:K.yC,base:K.base,ridge:K.ridge,
    boxes:[[-hg,K.yC-.05,-hd-.15,hg,K.ridge+.3,hd+.15],[-hg,K.yS+K.ra*.5,-hd,-hg+gap*.2,K.yC,hd],[hg-gap*.2,K.yS+K.ra*.5,-hd,hg,K.yC,hd]]};}
/* one pair tried for a village: fitted and built if it can be (and not within 30 m of a bridge it has, nor on a house that carries one) */
function h3BrTry(v,C){const x0=C.c*C.sR+C.s*C.f0,z0=-C.s*C.sR+C.c*C.f0;
  if(v.bridges.some(q=>Math.hypot(q.x-x0,q.z-z0)<30||q.a===v.buildings.indexOf(C.A)||q.b===v.buildings.indexOf(C.B)))return null;
  const K=h3BrFit(v,C);if(!K)return null;const br=h3BrBuild(v,C,K);if(br)v.bridges.push(br);return br;}
const h3BrWant=v=>Math.min(H3B.max,owHash2(Math.round(v.x)+17,Math.round(v.z)-5)<.5?2:1);
/* every city of the world at once (a world built in one go: owBuildVillages) */
function owBridges(){if(!H3T.br)return 0;let n=0;
  for(const v of OW.villages){if(v.tier!==5||!v.g)continue;v.bridges=[];v.g.updateMatrixWorld(true);const want=h3BrWant(v);
    for(const C of h3BrCands(v)){if(v.bridges.length>=want)break;if(h3BrTry(v,C))n++;}}
  return n;}
/* the streamed world (wstVillage): a city's bridges are fitted after it is built, a pair a frame (owBridgesStep from wstFrame), once the geometries its build left to be
   merged lazily are made (wstLazyParts) - the check reads the meshes round each place, and doing it in the build would merge them all there */
function owBridgesQueue(v){if(!H3T.br||v.tier!==5)return;v.bridges=[];v._brQ={C:null,i:0};}
function owBridgesStep(){if(typeof WLZ!=='undefined'&&WLZ.q&&WLZ.q.length)return;
  for(const v of OW.villages){const Q=v._brQ;if(!Q)continue;if(!v.g){v._brQ=null;continue;}
    if(!Q.C){Q.C=h3BrCands(v);return;}
    if(Q.i>=Q.C.length||v.bridges.length>=h3BrWant(v)){v._brQ=null;continue;}
    v.g.updateMatrixWorld(true);h3BrTry(v,Q.C[Q.i++]);return;}}
/* the camera's boom against the bridges of a village (tpcBoom): the same slab test as for a house, in the bridge's frame */
function h3BrBoom(v,tx,ty,tz,dx,dy,dz,d,best){for(const br of v.bridges){const F=br.F,ox=tx-F.x,oz=tz-F.z;if(ox*ox+oz*oz>(br.gap+d+4)*(br.gap+d+4))continue;
    const o=[ox*F.c-oz*F.s,ty,ox*F.s+oz*F.c],q=[dx*F.c-dz*F.s,dy,dx*F.s+dz*F.c];
    for(const bx of br.boxes){const lo=[bx[0]-.3,bx[1]-.2,bx[2]-.3],hi=[bx[3]+.3,bx[4],bx[5]+.3];let t0=-1e9,t1=1e9,ok=true;
      for(let k=0;k<3&&ok;k++){if(Math.abs(q[k])<1e-9){if(o[k]<lo[k]||o[k]>hi[k])ok=false;}else{let a=(lo[k]-o[k])/q[k],e=(hi[k]-o[k])/q[k];if(a>e){const t=a;a=e;e=t;}if(a>t0)t0=a;if(e<t1)t1=e;if(t0>t1)ok=false;}}
      if(!ok||t1<=0)continue;if(t0<=0){if(t1>=d)best=Math.min(best,TPC_MIN);}else if(t0<best)best=t0;}}
  return best;}
const h3Wood=(o,i,f)=>{const R=h3R(o,301+i*7+f.charCodeAt(0)),c=o.beamCol||0x4a3220;return()=>{const r=R();return r<.1?h3Tint(c,.78):h3Tint(c,.88+R()*.22);};};
/* ---- the legacy buildings of a tier-3 village (owLegacy): the well in raised stones under a coping, the windmill's cap in shingles over a foundation of stones ---- */
/* stones round a frustum of n facets (three.js cylinder: the vertices at angles k*2pi/n from +z, radius ra at ya ... rb at yb), nc courses, every other one shifted */
function h3Ring(P,key,R,col,n,ya,yb,ra,rb,nc,G){const ch=(yb-ya)/nc,ap=Math.cos(Math.PI/n),lean=Math.atan2(ra-rb,yb-ya);
  for(let c=0;c<nc;c++){const yc=ya+(c+.5)*ch,rr=(ra+(rb-ra)*(c+.5)/nc)*ap,fw=2*rr*Math.tan(Math.PI/n);
    for(let k=0;k<n;k++){const th=(k+.5)*2*Math.PI/n,sx=Math.sin(th),cz=Math.cos(th),parts=(k+c)%2===0?[.5,.5]:[1];let t0=-.5;
      for(const pf of parts){const uc=(t0+pf/2)*fw;t0+=pf;const kk=R(),cc=kk<.08?h3Tint(col,.74):h3Tint(col,.84+R()*.26);
        h3PQ(P,key,G,cc,sx*(rr-.002)+cz*uc,yc,cz*(rr-.002)-sx*uc,h3Q(th,-lean+(R()-.5)*.05,(R()-.5)*.05),pf*fw-.01,ch-.01,.012+R()*.008);}}}}
const H3L={
  well(P,o){const R=h3R({w:o.w||.8,d:o.d||.8,h:.34,wallCol:0x8a857b},621),G=h3Stone();h3Ring(P,'w',R,0x8a857b,10,.092,.428,.3,.28,4,G);
    /* the coping: a stone on each facet of the top (clear of the water, 2 mm above the wall's top) */
    for(let k=0;k<10;k++){const th=(k+.5)*Math.PI/5,rr=.25,fw=2*.28*Math.sin(Math.PI/10);P('w',box(fw+.012,.034,.09),h3Tint(0x8a857b,1.05+R()*.1),Math.sin(th)*rr,.432+.017,Math.cos(th)*rr,0,th,0);}},
  windmill(P,o){const R=h3R({w:o.w||1.1,d:o.d||1.1,h:1.4,roofCol:0x7a3a2a},631);h3Ring(P,'f',R,0x7a756c,8,.006,.118,.64,.58,1,h3Stone());
    /* the cap (cone .45 x .5 at y 1.78, 8 facets): shingles up each facet, a cap of boards down each edge */
    const n=8,Rb=.45,y0=1.53,Hc=.5,ap=Rb*Math.cos(Math.PI/n),hw=Rb*Math.sin(Math.PI/n),Ls=Math.hypot(ap,Hc),phi=Math.atan2(Hc,ap),col=0x7a3a2a;
    for(let k=0;k<n;k++){const th=(k+.5)*2*Math.PI/n,nx=Math.sin(th),nz=Math.cos(th);
      h3Cover(P,{nx,nz,tx:nz,tz:-nx,E:[nx*ap,y0,nz*ap],Ls,phi,lim:s=>{const h=hw*(1-clamp(s/Ls,0,1));return[-h,h];},top:'apex',hm:.012},'shingle',col,R,null);}
    const V=(x,y,z)=>new THREE.Vector3(x,y,z),A=V(0,y0+Hc,0);
    for(let k=0;k<n;k++){const th=k*2*Math.PI/n,C=V(Math.sin(th)*Rb,y0,Math.cos(th)*Rb),X=A.clone().sub(C),L=X.length();X.multiplyScalar(1/L);
      const t1=th-Math.PI/n,t2=th+Math.PI/n,Y=V(Math.sin(t1)*Math.sin(phi)+Math.sin(t2)*Math.sin(phi),2*Math.cos(phi),Math.cos(t1)*Math.sin(phi)+Math.cos(t2)*Math.sin(phi));
      Y.addScaledVector(X,-Y.dot(X)).normalize();h3Ridge(P,'shingle',col,C,X,Y,V().crossVectors(X,Y),L,R,.004);}}};
/* =====================================================================================================================
   ENTRANCE STEPS IN DEPTH (environment upgrade 09)
   The steps up to every entrance (owiEntranceMesh: houses, the solid buildings' shut doors, the passages) are modelled in depth, in one of three kinds chosen per building from a hash of
   where it stands (owiSeed: never the world's stream, so the world and the saves stay the same), weighted so that a street shows variety rather than a jumble:
   - 'stone' (the most): every tread two or three dressed blocks of the house's stone, each with a nosing 3 cm proud that throws a line of shadow over a set-back riser; cheek walls
     of coursed rubble in raised stones with a capstone on every step;
   - 'timber' (some; more often at timber and plank houses and in the small villages): two plank treads and a riser board to every step between stringers, a railing of posts with
     caps, a handrail and a mid rail;
   - 'fine' (few; more often in the towns and at stone and brick houses): long slabs of pale dressed stone with rounded nosings, cheek walls of ashlar under a sloped coping, piers at
     both ends with a cap and a stone ball, an urn of greenery on the lower piers.
   A grand entrance (a large building) is built in the fine manner with its landing and its large piers.
   Everything keeps to the footprint that the walking and the colliders use (owiStepY, walk.js): tread k over its 40 cm with its top k risers under the floor (the stones a few mm
   over it, as the old nosings were), the cheek strips either side of the treads; so the steps are walked exactly as before.
   ===================================================================================================================== */
const H3S={on:true,W:{stone:.6,timber:.28,fine:.1}};
function h3StepKind(b,nd){const S=nd.spec;if(S.grand)return'grand';if(S.n<2)return'stone';const p=b.pl||{},t=p.vt||p.tier||3,st=p.style||'';
  let ws=H3S.W.stone,wt=H3S.W.timber,wf=H3S.W.fine;
  if(st==='plank'||st==='timber'||t<=2)wt*=1.6;if(st==='stone'||st==='brick'||t>=4){wt*=.25;wf*=1.2;}if(t<=1)wf*=.25;
  const h=Math.imul((typeof owiSeed==='function'?owiSeed(b):0)^0x2c1b3c6d,2654435761)>>>0,x=(h%100003)/100003*(ws+wt+wf);
  return x<ws?'stone':x<ws+wt?'timber':'fine';}
function h3Steps(kb,b,nd,yF){const S=nd.spec,kind=h3StepKind(b,nd),w=S.width,u=nd.u,s=nd.sgn,n=S.n,T=S.tread,r=S.r,run=S.run,bot=S.gEnd-b.hi-.7,wing=S.wing||.2,
    Lz=Math.abs(nd.zF-nd.zL),gnd=yF-n*r,hc=S.grand?.5:.34,R=mulberry(((typeof owiSeed==='function'?owiSeed(b):0)^Math.imul(s>0?7:11,0x9E3779B1))>>>0),UB=box(1,1,1),
    zOf=o=>nd.zF+s*o,tp=k=>yF-k*r,sl=n>1?Math.atan2((n-1)*r,run):0,line=o=>yF-o*Math.tan(sl),
    B=(col,xa,xb,ya,yb,oa,ob)=>{if(xb-xa<1e-4||yb-ya<1e-4||ob-oa<1e-4)return;kb.P('a',UB,col,(xa+xb)/2,(ya+yb)/2,zOf((oa+ob)/2),0,0,0,xb-xa,yb-ya,ob-oa);},
    /* a part along the slope: centred at o, height y, across x; length along the slope, h across it */
    SL=(col,x,o,y,wx,h,len)=>kb.P('a',UB,col,x,y,zOf(o),s*sl,0,0,wx,h,len);
  b.stepKind=kind;
  if(kind==='stone'){const sc=(b.pl&&b.pl.stoneCol)||0x8f8a7f,G=h3Stone();
    for(let k=1;k<n;k++){const t=tp(k),oa=(k-1)*T,ob=k*T,m=w>1.9?3:2,cuts=[-w/2];for(let j=1;j<m;j++)cuts.push(-w/2+w*j/m+(R()-.5)*.16);cuts.push(w/2);
      for(let j=0;j<m;j++){const xa=u+cuts[j],xb=u+cuts[j+1],c=h3Tint(sc,1.04+R()*.16);
        B(h3Tint(sc,.78+R()*.08),xa+.003,xb-.003,bot,t-.046,oa+.002,ob-.016-R()*.006);/* the riser block, set back under the nosing */
        B(R()<.08?h3Tint(c,.85):c,xa+.0035,xb-.0035,t-.046,t+.006+R()*.004,oa+.004,ob+.03+(R()-.5)*.014);}}/* the tread stone, its nosing 2.3-3.7 cm proud (laid by hand) */
    for(const sx of[-1,1]){const xi=u+sx*w/2,xo=u+sx*(w/2+wing),xa=Math.min(xi,xo),xb=Math.max(xi,xo);
      for(let k=0;k<n;k++){const oa=k?(k-1)*T:-Lz+.004,ob=k?k*T:0,top=yF-k*r+hc;
        B(h3Tint(sc,.9+R()*.06),xa,xb,bot,top-.06,oa,ob);/* the wall */
        B(h3Tint(sc,1.1+R()*.1),xa-.025,xb+.025,top-.06,top+R()*.006,oa-(k?.012:0),ob+.012);/* its capstone */
        /* the outer face in raised stones, course by course down to the ground there */
        const gw=owiL2W(b,xo,zOf((oa+ob)/2)),gk=Math.max(gnd,Math.min(top-.2,owH(gw[0],gw[1])-b.hi));
        let y=top-.064,row=0;while(y-gk>.05){const ch=Math.min(y-gk+.04,.17+R()*.07);let o=oa,first=true;
          while(o<ob-.03){let ls=first&&row%2?.14+R()*.08:.26+R()*.16;first=false;if(ob-o-ls<.08)ls=ob-o;const oc=o+ls/2;o+=ls;
            h3PQ(P0(kb),'a',G,h3Tint(sc,.82+R()*.26),xo+sx*-.002,y-ch/2,zOf(oc),h3Q(sx*Math.PI/2,(R()-.5)*.06,(R()-.5)*.06),ls-.012,ch-.012,.014+R()*.01);}
          y-=ch;row++;}}
      /* the end of the lowest wall, towards the street */
      {const top=yF-(n-1)*r+hc,o=n>1?run:0,gw=owiL2W(b,(xa+xb)/2,zOf(o)),gk=Math.max(gnd,Math.min(top-.2,owH(gw[0],gw[1])-b.hi));let y=top-.064;while(y-gk>.05){const ch=Math.min(y-gk+.04,.17+R()*.07);
        h3PQ(P0(kb),'a',G,h3Tint(sc,.82+R()*.26),(xa+xb)/2,y-ch/2,zOf(o-.002),h3Q(s>0?0:Math.PI,(R()-.5)*.06,(R()-.5)*.06),wing-.016,ch-.012,.014+R()*.01);y-=ch;}}}
    return true;}
  if(kind==='timber'){const wd=(b.pl&&b.pl.beamCol)||0x5a3d22,pc=h3Tint(wd,1.4),dk=0x3a3026,rc=h3Tint(wd,1.15);
    for(let k=1;k<n;k++){const t=tp(k),oa=(k-1)*T,ob=k*T;
      B(dk,u-w/2+.005,u+w/2-.005,bot,t-.05,oa+.002,ob-.045);/* the dark space under the steps */
      B(h3Tint(pc,.82+R()*.12),u-w/2+.002,u+w/2-.002,k===n-1?gnd-.14:t-r-.1,t-.046,ob-.04,ob-.012);/* the riser board */
      for(let j=0;j<2;j++){const pa=(j?oa+(T+.02)/2:oa-.008)+.004,pb=j?ob+.024:oa+(T+.02)/2-.004;B(h3Tint(pc,.9+R()*.22),u-w/2+.004,u+w/2-.004,t-.046,t+.006+R()*.003,pa,pb);}}/* two plank treads */
    const oT=-.045,oB=run-.05,posts=[oT,oB];if(run>1.3)posts.push(run/2);
    for(const sx of[-1,1]){const xs=u+sx*(w/2+.025),xp=u+sx*(w/2+.05);
      /* the stringer: a board along the slope just outside the treads, from the ledge to the ground */
      {const o0=-Lz+.03,o1=run+.04,oc=(o0+o1)/2;SL(h3Tint(wd,1.05),xs,oc,line(oc),.05,.26,(o1-o0)/Math.cos(sl));}
      /* posts with caps, a handrail and a mid rail */
      for(const o of posts){const yb=o<=0?yF-.02:gnd-.25,yt=line(Math.max(0,o))+.95;B(h3Tint(wd,.95+R()*.1),xp-.0425,xp+.0425,yb,yt,o-.0425,o+.0425);
        B(h3Tint(wd,.8),xp-.06,xp+.06,yt,yt+.03,o-.06,o+.06);kb.P('a',cone(.055,.06,4),h3Tint(wd,.8),xp,yt+.06,zOf(o),0,Math.PI/4,0);}
      const oc=(oT+oB)/2,len=(oB-oT)/Math.cos(sl)+.08;SL(rc,xp,oc,line(oc)+.9,.065,.05,len);SL(h3Tint(wd,1.05),xp,oc,line(oc)+.46,.04,.035,len-.04);}
    return true;}
  /* 'fine' and 'grand': pale dressed stone */
  const lc=S.grand?0xb5ad9e:0xbfb7a7,ac=S.grand?0xa29b8e:0xafa797,cyl1=cyl(1,1,1,8),nose=(t,ob,xa,xb,col)=>kb.P('a',cyl1,col,(xa+xb)/2,t+.006-.035,zOf(ob+.005),0,0,Math.PI/2,.035,xb-xa,.035);
  if(S.grand){/* the landing: a slab at floor level between the door and the first step, its edge rounded like the treads */
    B(h3Tint(lc,.84),u-w/2,u+w/2,bot,yF-.07,-Lz+.004,-.03);B(lc,u-w/2-.02,u+w/2+.02,yF-.064,yF+.006,-Lz+.004,.005);nose(yF,0,u-w/2-.02,u+w/2+.02,lc);}
  for(let k=1;k<n;k++){const t=tp(k),oa=(k-1)*T,ob=k*T,m=w>2.4?2:1;
    B(h3Tint(lc,.84),u-w/2+.002,u+w/2-.002,bot,t-.064,oa+.002,ob-.02);/* the riser, set back */
    for(let j=0;j<m;j++){const xa=u-w/2+j*w/m+(j?.003:0),xb=u-w/2+(j+1)*w/m-(j<m-1?.003:0),c=h3Tint(lc,.95+R()*.1);B(c,xa,xb,t-.064,t+.006,oa+.004,ob+.005);nose(t,ob,xa,xb,c);}}
  const ballR=S.grand?.14:.085;
  for(const sx of[-1,1]){const xi=u+sx*w/2,xo=u+sx*(w/2+wing),xa=Math.min(xi,xo),xb=Math.max(xi,xo),xm=(xa+xb)/2,hTop=yF+hc,hBot=yF-(n-1)*r+hc;
    /* the wall: one block of ashlar under a sloped coping (a flat one along the ledge) */
    if(n>1){const pts=[[-Lz+.004,bot],[run,bot],[run,hBot-.07],[0,hTop-.07],[-Lz+.004,hTop-.07]];kb.P('a',owPolyGeo(pts,wing),h3Tint(ac,.97),xm,0,nd.zF,0,s>0?-Math.PI/2:Math.PI/2,0);
      SL(h3Tint(ac,1.12),xm,run/2,line(run/2)+hc-.036,wing+.05,.07,run/Math.cos(sl)+.03);}
    else B(h3Tint(ac,.97),xa,xb,bot,hTop-.07,-Lz+.004,0);
    B(h3Tint(ac,1.12),xa-.025,xb+.025,hTop-.072,hTop-.002,-Lz+.004,.012);
    /* piers at both ends: a cap and a stone ball (the large posts of a grand entrance) */
    const pier=(oa,ob,top,urn)=>{const pw=S.grand?wing+.16:wing+.06,cw=pw+.06,hh=S.grand?.55:.18;B(h3Tint(ac,1.02),xm-pw/2,xm+pw/2,bot,top+hh,oa,ob);
      B(h3Tint(lc,1.05),xm-cw/2,xm+cw/2,top+hh,top+hh+.06,oa-.03,ob+.03);
      if(urn){kb.P('a',cyl(.075,.055,.12,8),0x9a5638,xm,top+hh+.12,zOf((oa+ob)/2));kb.P('a',dod(.1),R()<.5?0x4a7a3a:0x5a8a40,xm,top+hh+.25,zOf((oa+ob)/2),R(),R(),R());}
      else kb.P('a',oct(ballR),h3Tint(lc,1.08),xm,top+hh+.06+ballR,zOf((oa+ob)/2));};
    const pl=S.grand?Math.min(.5,Lz-.02):Math.min(.26,Lz-.008);pier(-Lz+.004,-Lz+.004+pl,hTop,false);
    if(n>1){const pb=S.grand?.42:.26;pier(run-pb,run,hBot,!S.grand&&R()<.6);}}
  return true;}
const P0=kb=>kb.P;

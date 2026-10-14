/* =====================================================================================================================
   KINGSGAARD INTERIORS (6/8): the shell of an interior (floors, partitions, stairs, rails), the entrance steps, and mesh loading.
   Everything is written in the building frame in metres: x right, z towards the front door, y up from the building origin (the foundation base).
   ===================================================================================================================== */
const OWI_SLAB=.16;   /* thickness of an upper floor */
/* a rectangle with rectangular holes cut out of it */
function owiSub(r,holes){let out=[{xa:r.xa,xb:r.xb,za:r.za,zb:r.zb}];
  for(const h of holes){const nx=[];for(const q of out){if(h.x1<=q.xa||h.x0>=q.xb||h.z1<=q.za||h.z0>=q.zb){nx.push(q);continue;}
    if(h.x0>q.xa)nx.push({xa:q.xa,xb:h.x0,za:q.za,zb:q.zb});if(h.x1<q.xb)nx.push({xa:h.x1,xb:q.xb,za:q.za,zb:q.zb});
    const xa=Math.max(q.xa,h.x0),xb=Math.min(q.xb,h.x1);if(h.z0>q.za)nx.push({xa,xb,za:q.za,zb:h.z0});if(h.z1<q.zb)nx.push({xa,xb,za:h.z1,zb:q.zb});}out=nx;}
  return out.filter(q=>q.xb-q.xa>.01&&q.zb-q.za>.01);}
/* the holes a floor has (one per flight that arrives on it) */
const owiHoles=(P,i)=>P.stairs.filter(f=>f.to===i).map(f=>({x0:f.x0-.02,x1:f.x1+.02,z0:f.z0-.02,z1:f.z1+.02}));
/* the pieces of a partition wall: full-height runs between its doorways, and a lintel over every doorway */
function owiWallPieces(w,hp){const ds=w.doors.slice().sort((a,b)=>a.c-b.c),out=[],lint=[];let cur=w.a;
  for(const d of ds){const a=d.c-d.w/2,b=d.c+d.w/2;if(a>cur+.005)out.push([cur,a]);lint.push([a,b,d.h]);cur=b;}if(w.b>cur+.005)out.push([cur,w.b]);return{runs:out,lint};}

function owiFloorCover(kb,P,F,R,wood,stone){/* floor surface over every room of a storey */
  const y=F.y,holes=owiHoles(P,F.i),tier=P.tier;
  for(const room of F.rooms){const flags=room.kind==='kitchen'||room.kind==='pantry'||room.kind==='workshop'||room.kind==='tunnel';
    for(const q0 of room.rects)for(const q of owiSub(q0,holes)){const w=q.xb-q.xa,d=q.zb-q.za;
      if(P.kind==='hut'||(tier<=1&&F.i===0)){/* wide rough boards (upgrade 07) over a dark bed that shows in the gaps; the bed's top lies a centimetre under the boards' (no shared face); the colours come from a hash, not R */
        kb.P('a',box(w,.02,d),0x4a3c2c,(q.xa+q.xb)/2,y+.01,(q.za+q.zb)/2);{const nb=Math.max(1,Math.round(w/.3)),bw=w/nb;for(let k=0;k<nb;k++){const hh=owHash2(((P.seed>>>3)%10007)+k*31+F.i*7,Math.round(q.xa*10)+Math.round(q.za*10)*3),c=owTintHex(wood,.78+hh*.24);
          kb.P('a',box(bw-.016,.026,d-.01),c,q.xa+(k+.5)*bw,y+.017,(q.za+q.zb)/2);}}
        for(let k=0;k<3;k++)kb.P('a',box(.5+R()*.4,.012,.3+R()*.3),0xb89a58,q.xa+.4+R()*(w-.8),y+.034,q.za+.4+R()*(d-.8),0,R()*3,0);continue;}
      if(flags&&F.i===0){/* flagstones */
        kb.P('a',box(w,.03,d),0x5a564e,(q.xa+q.xb)/2,y+.015,(q.za+q.zb)/2);
        const nx=Math.max(1,Math.round(w/.55)),nz=Math.max(1,Math.round(d/.55)),tw=w/nx,td=d/nz;
        for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)kb.P('a',box(tw-.05,.012,td-.05),owiPickC(R,OWI_STONE),q.xa+(i+.5)*tw,y+.034,q.za+(j+.5)*td);continue;}
      /* planks, running along z in boards about 22 cm wide */
      const n=Math.max(1,Math.round(w/.22)),bw=w/n,base=wood;
      for(let i=0;i<n;i++){const k=1+(R()-.5)*.16,c=Math.min(255,(base>>16&255)*k)<<16|Math.min(255,(base>>8&255)*k)<<8|Math.min(255,(base&255)*k);kb.P('a',box(bw-.012,.03,d),c,q.xa+(i+.5)*bw,y+.015,(q.za+q.zb)/2);}}}}

/* The ceiling of the top floor. The floors below have the slab of the floor above as theirs (with the stairwell cut out); the top floor had nothing: you looked into the underside of the roof, with its slabs crossing the tops of the walls.
   Every room gets its own ceiling from the plan (its rectangle, widened by half a partition so that no gap is left over a partition wall, and cut off at the outer walls so that nothing reaches outside the house):
   boards under exposed joists in a plain house, plaster with a crown moulding in a better one (tier 4 and up). It lies at the top of the walls, below the roof, so the roof stays what it was from outside.
   It uses no random numbers (the colours come from the plan's seed), so everything else in the interior is exactly as it was. */
/* the underside of the ceiling of a floor, measured from the floor (m), at its lowest piece over most of the room: the top floor under the roof (the middle of a coved ceiling, or the whole of a flat one), the others under the slab above */
const owiCeilH=(ic,P,F)=>F.i<P.floors.length-1?F.h-OWI_SLAB-(P.tier>=4?.05:0):(ic.rs&&ic.rs.coved?F.h-.07:F.h-(ic.dip||0)-.05)-(P.tier<=3?.1:0);
/* the same at one point of the plan (the ceiling is lower near the eaves walls of a coved roof) */
const owiCeilAt=(ic,P,F,x,z)=>{const h=owiCeilH(ic,P,F);if(F.i<P.floors.length-1||!ic.rs||!ic.rs.coved)return h;const rs=ic.rs,s=rs.axis==='x'?z:x;return Math.min(h,F.h+owiRoofU(rs,s)-.045);};
/* The ceiling. The floors below the top one have the slab of the floor above as theirs (with the stairwell cut out; better houses line it with plaster), the top floor had nothing: you looked into the underside of the roof,
   with its slabs crossing the tops of the walls. Every room gets its own ceiling from the plan (its rectangle, widened by half a partition so that no gap is left over a partition wall, and cut off at the outer walls so
   that nothing reaches outside the house): boards under exposed ties in a plain house, plaster in a better one (tier 4 and up). Under a gable roof the boards are flat over the middle of the room and follow the underside of the roof
   (a few cm below it) near the eaves walls, so the room keeps its height; under other roofs the ceiling lies flat under the lowest point of the roof. No random numbers are used (the colours come from the plan's seed). */
function owiBuildCeiling(kb,P,F,plaster,wood,frame,ic){const top=P.floors.length-1,upper=F.i<top,dip=ic.dip||0,rs=ic.rs,coved=!upper&&rs&&rs.coved,Y1=F.y+F.h,y=Y1-(upper?OWI_SLAB:coved?.02:dip),t=.05,Q=F.Q,e=OWI.PT/2,tier=P.tier,plain=tier<=3,tint=(c,k)=>(Math.min(255,(c>>16&255)*k)|0)<<16|(Math.min(255,(c>>8&255)*k)|0)<<8|(Math.min(255,(c&255)*k)|0);
  if(upper&&plain)return;/* the underside of the floor above (dark timber, with the stairwell cut out) is the ceiling of the lower floors of a plain house */
  const cc=plain?tint(wood,.82):tint(plaster,.97),holes=upper?owiHoles(P,F.i+1):[];
  for(const room of F.rooms){if(room.kind==='tunnel')continue;for(const q of room.rects){const x0=Math.max(Q.xa,q.xa-e),x1=Math.min(Q.xb,q.xb+e),z0=Math.max(Q.za,q.za-e),z1=Math.min(Q.zb,q.zb+e);if(x1-x0<.05||z1-z0<.05)continue;
    for(const pc of owiSub({xa:x0,xb:x1,za:z0,zb:z1},holes)){const w=pc.xb-pc.xa,d=pc.zb-pc.za,cx=(pc.xa+pc.xb)/2,cz=(pc.za+pc.zb)/2;
      if(coved){/* flat in the middle, along the underside of the roof near the eaves */
        const ax=rs.axis==='x',sa=ax?pc.za:pc.xa,sb=ax?pc.zb:pc.xb,ca=ax?pc.xa:pc.za,cb=ax?pc.xb:pc.zb,zf=Math.max(0,rs.s2-(rs.dip-.02)/rs.tan),fa=Math.max(sa,rs.c-zf),fb=Math.min(sb,rs.c+zf),phi=Math.atan(rs.tan);
        if(fb-fa>.01){const sm=(fa+fb)/2,cm=(ca+cb)/2;if(ax)kb.P('a',box(cb-ca,t,fb-fa),cc,cm,Y1-.045,sm);else kb.P('a',box(fb-fa,t,cb-ca),cc,sm,Y1-.045,cm);}
        for(const sd of[-1,1]){const a0=sd>0?Math.max(sa,rs.c+zf):sa,a1=sd>0?sb:Math.min(sb,rs.c-zf);if(a1-a0<.01)continue;const um=(owiRoofU(rs,a0)+owiRoofU(rs,a1))/2,Ls=(a1-a0)/Math.cos(phi),yy=Y1+um-.024,rot=ax?(sd>0?phi:-phi):(sd>0?-phi:phi);
          if(ax)kb.P('a',box(cb-ca,.035,Ls),cc,(ca+cb)/2,yy,(a0+a1)/2,rot,0,0);else kb.P('a',box(Ls,.035,cb-ca),cc,(a0+a1)/2,yy,(ca+cb)/2,0,0,rot);}
        if(plain&&fb-fa>.01){const len=cb-ca,n=Math.max(1,Math.round(len/.8));for(let k=0;k<n;k++){const u=ca+(k+.5)/n*len;if(ax)kb.P('a',box(.1,.1,(sb-sa)-.02),frame,u,Y1-.045-.075,(sa+sb)/2);else kb.P('a',box((sb-sa)-.02,.1,.1),frame,(sa+sb)/2,Y1-.045-.075,u);}}
        continue;}
      kb.P('a',box(w,t,d),cc,cx,y-t/2,cz);
      if(plain){/* joists across the shorter span, a hand wide, every 80 cm or so */
        const alongZ=d<=w,span=alongZ?d:w,len=alongZ?w:d,n=Math.max(1,Math.round(len/.8));
        for(let k=0;k<n;k++){const u=(k+.5)/n*len;if(alongZ)kb.P('a',box(.1,.1,span-.02),frame,pc.xa+u,y-t-.05,cz);else kb.P('a',box(span-.02,.1,.1),frame,cx,y-t-.05,pc.za+u);}}
      else{/* a crown moulding along the outer walls */
        const c2=tint(plaster,.9);if(Math.abs(pc.xa-Q.xa)<.02)kb.P('a',box(.05,.07,d-.04),c2,pc.xa+.025,y-t-.035,cz);if(Math.abs(pc.xb-Q.xb)<.02)kb.P('a',box(.05,.07,d-.04),c2,pc.xb-.025,y-t-.035,cz);
        if(Math.abs(pc.za-Q.za)<.02)kb.P('a',box(w-.04,.07,.05),c2,cx,y-t-.035,pc.za+.025);if(Math.abs(pc.zb-Q.zb)<.02)kb.P('a',box(w-.04,.07,.05),c2,cx,y-t-.035,pc.zb-.025);}}}}}

function owiBuildPartitions(kb,P,F,R,plaster,frame,dip){const y=F.y+.005,top=P.floors.length-1,hp=F.h-(F.i<top?OWI_SLAB:(dip||0))-.025;/* (5 mm above the floor level: their bottom faces were in one plane with the foundation's or the slab's top, and showed through the cutaway) */
  for(const w of F.walls){const pc=owiWallPieces(w,hp),PT=OWI.PT;
    for(const[a,b]of pc.runs){if(w.ax==='x')kb.P('p',box(b-a,hp,PT),plaster,(a+b)/2,y+hp/2,w.p);else kb.P('p',box(PT,hp,b-a),plaster,w.p,y+hp/2,(a+b)/2);}
    for(const[a,b,dh]of pc.lint){const lh=hp-dh;if(lh>.03){if(w.ax==='x')kb.P('p',box(b-a,lh,PT),plaster,(a+b)/2,y+dh+lh/2,w.p);else kb.P('p',box(PT,lh,b-a),plaster,w.p,y+dh+lh/2,(a+b)/2);}
      /* a timber frame round the doorway */
      if(w.ax==='x'){for(const s of[a,b])kb.P('p',box(.1,dh,PT+.06),frame,s,y+dh/2,w.p);kb.P('p',box(b-a+.1,.1,PT+.06),frame,(a+b)/2,y+dh+.05,w.p);}
      else{for(const s of[a,b])kb.P('p',box(PT+.06,dh,.1),frame,w.p,y+dh/2,s);kb.P('p',box(PT+.06,.1,b-a+.1),frame,w.p,y+dh+.05,(a+b)/2);}}
    /* a skirting board along both faces keeps the plaster from looking like cardboard */
    for(const[a,b]of pc.runs){const L=b-a;if(w.ax==='x')for(const s of[-1,1])kb.P('p',box(L,.12,.025),frame,(a+b)/2,y+.06,w.p+s*(PT/2+.012));else for(const s of[-1,1])kb.P('p',box(.025,.12,L),frame,w.p+s*(PT/2+.012),y+.06,(a+b)/2);}}}

function owiBuildStairs(kb,P,R,wood,dark){
  /* The steps, their treads and the hand rail of each flight go into a layer of their own ('s0', 's1', ...: the index of the flight in P.stairs), so every flight is a mesh of its own that the cutaway plane does not touch
     and that can be shown or hidden by itself (owiStairVis): a flight belongs to the two floors it joins (f.from, f.to), and only the flights of the floor the hero is on are drawn. */
  P.stairs.forEach((f,fi)=>{const Ls='s'+fi;const n=f.n,run=Math.abs(f.zt-f.zb),L=run/(n-1),sw=f.x1-f.x0,xc=(f.x0+f.x1)/2,s=Math.sign(f.zt-f.zb)||1;
    for(let k=0;k<n-1;k++){const top=(k+1)*f.riser,zc=f.zb+s*(k+.5)*L,col=owiPickC(R,[wood,0x7a5736,0x6b4a2c]);
      kb.P(Ls,box(sw,top,L+.004),col,xc,f.y0+top/2,zc);kb.P(Ls,box(sw+.02,.035,L+.03),0x8a6a44,xc,f.y0+top+.002,zc+s*.01);}
    /* the open side gets a handrail; the other side runs along the wall */
    const Lr='r'+fi,openSide=P.col.s>0?-1:1,xr=openSide<0?f.x0+.03:f.x1-.03,za=f.zb,zb=f.zt,ya=f.y0+f.riser+.9,yb=f.y1+.9,dz=zb-za,dy=yb-ya,Ln=Math.hypot(dz,dy);
    kb.P(Lr,box(.06,.05,Ln),dark,xr,(ya+yb)/2,(za+zb)/2,Math.atan2(-dy,dz),0,0);
    const np=Math.max(2,Math.round(run/.5));for(let k=0;k<=np;k++){const t=k/np,zz=za+dz*t,yt=ya+dy*t,yb2=f.y0+f.riser+(f.y1-f.y0-f.riser)*t;kb.P(Lr,box(.045,yt-yb2,.045),dark,xr,(yt+yb2)/2,zz);}});}
/* the flights that touch a floor: those that leave it upwards (from === lv) and the one that arrives on it from below (to === lv, seen through the opening in the floor) */
const owiFlightsAt=(P,lv)=>P.stairs.filter(f=>f.from===lv||f.to===lv);
/* Which flights are drawn. The hero in a house (or on its entrance steps) sees the flights of his own floor only: the one going up from it and the one arriving from below. A flight belongs to two floors, so the
   one he is walking on is always among them, whichever of the two he is counted on (lv changes half way up). A house the hero is not in shows all its flights (every flight stands in its own storey, behind walls). */
function owiStairVis(b){const ic=b.ic;if(!ic||!ic.flights)return;const lv=OWI.cb===b?OWI.lv:-1;if(ic.stLv===lv)return;ic.stLv=lv;
  for(const q of ic.flights){const v=lv<0||q.f.from===lv||q.f.to===lv;q.mesh.visible=v;if(q.rail)q.rail.visible=v;}}

function owiBuildRails(kb,P,F,dark){/* the opening in an upper floor is fenced on three sides; the fourth is where the stair arrives */
  for(const f of P.stairs){if(f.to!==F.i)continue;const y=F.y,h=.95,x0=f.x0-.02,x1=f.x1+.02,z0=f.z0-.02,z1=f.z1+.02;
    const botIsHigh=f.zb>f.zt,zBot=botIsHigh?z1:z0;
    const post=(x,z)=>kb.P('a',box(.07,h,.07),dark,x,y+h/2,z),bar=(xa,za,xb,zb2)=>{const L=Math.hypot(xb-xa,zb2-za),a=Math.atan2(xb-xa,zb2-za);kb.P('a',box(.05,.05,L),dark,(xa+xb)/2,y+h,(za+zb2)/2,0,a,0);kb.P('a',box(.04,.04,L),dark,(xa+xb)/2,y+h*.5,(za+zb2)/2,0,a,0);};
    const np=Math.max(1,Math.round((z1-z0)/.6));for(let k=0;k<=np;k++){const z=z0+(z1-z0)*k/np;post(x0,z);post(x1,z);}
    post(x0,zBot);post(x1,zBot);bar(x0,z0,x0,z1);bar(x1,z0,x1,z1);bar(x0,zBot,x1,zBot);}}

/* the whole interior, built on demand as two merged meshes (lit and glowing) */
function owiBuildMesh(b){const ic=b.ic,P=ic.P,kb=kitBuilder();owlmInit(b);ic.rs=P.kind==='tunnel'?null:owiRoofShape(b.arch);ic.dip=ic.rs?ic.rs.dip+.02:0;const R=mulberry((P.seed^0x2545f491)>>>0),pl=b.pl||{};
  const plasterC=[0xe2d6b8,0xd8c9a6,0xe8dcc0,0xd0c19a][P.seed&3],wood=[0x8a6a44,0x7a5a38,0x9a7a52,0x6b4a2c][(P.seed>>2)&3],frame=0x4a3220,dark=0x3a2a1c,stairWood=0x7a5a38;
  P.floors.forEach(F=>{const i=F.i;
    if(i>0){/* the floor itself: a slab with the stairwell cut out, seen from below as a ceiling */
      for(const q of owiSub(F.Q,owiHoles(P,i))){kb.P('a',box(q.xb-q.xa,OWI_SLAB,q.zb-q.za),0x6a4a2c,(q.xa+q.xb)/2,F.y-OWI_SLAB/2,(q.za+q.zb)/2);kb.P('z',box(q.xb-q.xa,OWI_SLAB,q.zb-q.za),0x6a4a2c,(q.xa+q.xb)/2,F.y-OWI_SLAB/2,(q.za+q.zb)/2);}}
    owiFloorCover(kb,P,F,R,wood);owiBuildPartitions(kb,P,F,R,plasterC,frame,ic.rs&&ic.rs.coved?.02:ic.dip);owiBuildRails(kb,P,F,dark);if(P.kind!=='tunnel')owiBuildCeiling(kb,P,F,plasterC,wood,frame,ic);
    F.items.forEach(it=>{it.ceil=owiCeilAt(ic,P,F,it.x,it.z);it.tier=P.tier;it.lod=ic.lod|0;it.bk=P.kind;const rm=F.rooms.find(r=>r.id===it.room);it.rk=rm?rm.kind:'';owiAddItem(kb,it,F.y+.03);});});
  owiBuildStairs(kb,P,R,stairWood,dark);
  if(P.kind==='tunnel'){/* the passage: stone walls either side, a plank ceiling carrying the floors above, a lantern half way */
    const F=P.floors[0],tw=P.door.w/2,Q=F.Q,h=F.h,zc=(Q.za+Q.zb)/2,len=Q.zb-Q.za;
    for(const sx of[-1,1])kb.P('a',box(.16,h-.16,len),owiPickC(R,OWI_STONE),sx*(tw+.08),F.y+(h-.16)/2,zc);
    kb.P('a',box(2*tw+.32,.16,len),0x5a3d22,0,F.y+h-.08,zc);
    for(let k=0;k<Math.floor(len/1.1);k++)kb.P('a',box(2*tw+.32,.12,.14),0x3a2a1c,0,F.y+h-.22,Q.za+.55+k*1.1);
    kb.P('a',box(.05,.26,.05),0x2a2a2a,-(tw-.05),F.y+1.75,zc);kb.P('g',box(.14,.2,.14),0xffc860,-(tw-.1),F.y+1.5,zc);}
  const geo=owiJoin(kb.B.a?mergeParts(kb.B.a):null,kb.B.g?mergeParts(kb.B.g):null),mat=owiMaterial(b);
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=false;mesh.receiveShadow=true;mesh.name='interior';
  const grp=new THREE.Group();grp.name='interior';grp.add(mesh);ic.mats=[mat];ic.geos=[geo];
  ic.flights=[];ic.stLv=null;
  if(P.stairs.length){/* the stairs: the same material without the clipping plane, one mesh per flight */const sm=owiMaterial(b,true),sgp=new THREE.Group();sgp.name='stairs';ic.mats.push(sm);
    /* the hand rail of a flight is cut away at the height of the cutaway (the same plane as the room's partitions and furniture), so a rail that climbs to the next floor does not stand in the air over the room; the steps stay */
    const rm=owiMaterial(b,false,false,true);ic.mats.push(rm);
    P.stairs.forEach((f,fi)=>{const parts=kb.B['s'+fi];if(!parts)return;const sg=owiJoin(mergeParts(parts),null),sh=new THREE.Mesh(sg,sm);sh.castShadow=false;sh.receiveShadow=true;sh.name='flight'+fi;sh.userData.flight=fi;sgp.add(sh);ic.geos.push(sg);const q={f,mesh:sh,rail:null};ic.flights.push(q);
      const rp=kb.B['r'+fi];if(rp){const rg=owiJoin(mergeParts(rp),null),rh=new THREE.Mesh(rg,rm);rh.castShadow=false;rh.receiveShadow=true;rh.name='rail'+fi;sgp.add(rh);ic.geos.push(rg);q.rail=rh;}});
    grp.add(sgp);ic.stairMesh=sgp;}
  /* The cutaway only changes what the eye sees; the light does not care about it (clipShadows is off for everything that casts): the furniture and the partition walls cast their whole shadow, and the roof and the upper
     storeys that the cutaway clips (walls and roof, see owiRegister) go on shading the room, so sunlight reaches a floor through the windows and doorways and nowhere else. */
  if(kb.B.c){/* the furniture: lit parts of every piece that stands on the floor, casting shadows */const cg=owiJoin(mergeParts(kb.B.c),null),cm=owiMaterial(b,false,false,true),ch=new THREE.Mesh(cg,cm);ch.castShadow=true;ch.receiveShadow=true;ch.name='furniture';ch.layers.enable(OWIL_LAYER);grp.add(ch);ic.mats.push(cm);ic.geos.push(cg);ic.fmesh=ch;}
  /* where the made bedding of each bed lies in the furniture mesh: vertex ranges [start, count, ...] by bed and side (0, or -1 / 1 the halves of a double bed); vilhome.js hides it under a sleeper's own covers (aE -1) */
  ic.bedR=null;if(kb.B.c){let o=0;const R=new Map();for(const q of kb.B.c){const n=q.geo.__ni.length/3;if(q.tag){const t=R.get(q.tag.it)||{};(t[q.tag.side]||(t[q.tag.side]=[])).push(o,n);R.set(q.tag.it,t);}o+=n;}if(R.size)ic.bedR=R;}
  if(kb.B.p){/* the partition walls: clipped like the rest of the interior, and also where they stand between the camera and the hero */const pg=owiJoin(mergeParts(kb.B.p),null),pm=owiMaterial(b,false,true,true),ph=new THREE.Mesh(pg,pm);ph.castShadow=true;ph.receiveShadow=true;ph.name='partitions';ph.layers.enable(OWIL_LAYER);grp.add(ph);ic.mats.push(pm);ic.geos.push(pg);ic.pmesh=ph;}
  if(kb.B.z){/* the floors between the storeys cast a shadow for the point light of the room (a fire does not light the floor above through its floor) and are not drawn */const zg=mergeParts(kb.B.z),zm=new THREE.Mesh(zg,OWLM_SLABMAT);zm.layers.set(OWIL_LAYER);zm.castShadow=true;zm.receiveShadow=false;zm.frustumCulled=false;zm.name='slabs';grp.add(zm);ic.geos.push(zg);ic.slab=zm;}
  ic.mesh=mesh;ic.grp=grp;b.g.add(grp);OWI.stats.builds++;owiGlowOne(b);owGlassMode(b,true);owiStairVis(b);owiCastOn(b,OWI.cb===b);}
/* lit and glowing parts share one geometry (and so one draw call): aE = 1 marks the parts that shine by themselves */
function owiJoin(a,g){const na=a?a.attributes.position.count:0,ng=g?g.attributes.position.count:0,n=na+ng,pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3),em=new Float32Array(n);
  if(a){pos.set(a.attributes.position.array,0);nor.set(a.attributes.normal.array,0);col.set(a.attributes.color.array,0);a.dispose();}
  if(g){pos.set(g.attributes.position.array,na*3);nor.set(g.attributes.normal.array,na*3);col.set(g.attributes.color.array,na*3);em.fill(1,na,n);g.dispose();}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.BufferAttribute(pos,3));o.setAttribute('normal',new THREE.BufferAttribute(nor,3));o.setAttribute('color',new THREE.BufferAttribute(col,3));o.setAttribute('aE',new THREE.BufferAttribute(em,1));o.computeBoundingSphere();return o;}
/* the interior's material: the world's vertex-coloured material, two-sided so that the cut edges show, clipped by the building's own plane when it can be entered,
   plus a warm self-lighting term (night, when somebody is home) and the glowing parts */
function owiMaterial(b,noClip,part,full){const m=VCMAT.clone(),lmu=owlmInit(b);m.side=THREE.DoubleSide;if(b.cutPlane&&!noClip){m.clippingPlanes=part?[b.cutPlane,b.camPlane]:[b.cutPlane];m.clipShadows=!full;}
  m.defines={USE_LM:''};m.onBeforeCompile=sh=>owlmPatch(sh,lmu,true);
  m.customProgramCacheKey=()=>noClip?'owiints':part?'owiintp':'owiint';return m;}
/* at night a lived-in house glows warmly behind its windows; which houses are lived in is part of the plan, so it is stable */
function owiGlowOne(b){/* the warm light of a lived-in house at night is part of the light grid now (lightmap.js) */}

/* only the house the hero is in shades its furniture: every other house is closed by its shadow proxy, so its furniture could not be seen in the sun's map, and the sun's pass would draw it for nothing */
function owiCastOn(b,on){const ic=b&&b.ic;if(!ic||!ic.grp)return;if(ic.fmesh)ic.fmesh.castShadow=on;if(ic.pmesh)ic.pmesh.castShadow=on;}
function owiFreeMesh(b){const ic=b.ic;if(!ic||!ic.grp)return;owlmFree(b);b.g.remove(ic.grp);ic.geos.forEach(g=>g.dispose());ic.mats.forEach(m=>m.dispose());ic.grp=null;ic.geos=null;ic.mats=null;ic.mesh=null;OWI.stats.frees++;owGlassMode(b,false);}

/* ---- the entrance: steps and cheek walls, built at world creation because they belong to the exterior ---- */
function owiEntranceMesh(b){const e=b.enter,kb=kitBuilder(),yF=OW_FH*b.BSc,col=0x8f8a7f,col2=0x7a756c;
  for(const nd of e.ends){if(typeof H3S!=='undefined'&&H3.on&&H3S.on&&h3Steps(kb,b,nd,yF))continue;/* (environment upgrade 09: the steps in depth, hut3d.js) */const S=nd.spec,w=S.width,u=nd.u,s=nd.sgn,bot=S.gEnd-b.hi-.7,wing=S.wing||.2,grand=!!S.grand,hc=grand?.5:.34,tc=grand?0xa39d90:col,wc=grand?0x8a857b:col2;
    /* the landing of a large building: a stone slab at floor level between the door and the first step, its edge dressed like the treads */
    if(grand){const len=Math.abs(nd.zF-nd.zL)+.02,zc=(nd.zF+nd.zL)/2;kb.P('a',box(w,yF-bot,len),tc,u,(yF+bot)/2,zc);kb.P('a',box(w+.06,.04,len+.04),0xaaa498,u,yF-.012,zc);}
    for(let k=1;k<S.n;k++){const top=yF-k*S.r,zc=nd.zF+s*((k-1)*S.tread+S.tread/2);
      kb.P('a',box(w,top-bot,S.tread+.02),tc,u,(top+bot)/2,zc);kb.P('a',box(w+.04,.03,S.tread+.04),grand?0xaaa498:0xa09a8e,u,top-.005,zc);}
    /* cheek walls: low stone walls that follow the steps and keep a walker on them (a large building: wing walls with a cap, a post with a stone ball at both ends) */
    for(const sx of[-1,1]){const xw=u+sx*(w/2+wing/2);
      for(let k=0;k<S.n;k++){const top=yF-k*S.r+hc;
        if(k===0){const len=grand?Math.abs(nd.zF-nd.zL)+.02:.26;kb.P('a',box(wing,top-bot,len),wc,xw,(top+bot)/2,(nd.zF+nd.zL)/2);if(grand)kb.P('a',box(wing+.08,.06,len+.04),0x9a948a,xw,top+.02,(nd.zF+nd.zL)/2);continue;}
        const zc=nd.zF+s*((k-1)*S.tread+S.tread/2);kb.P('a',box(wing,top-bot,S.tread+.02),wc,xw,(top+bot)/2,zc);kb.P('a',box(wing+(grand?.08:.06),.05,S.tread+.04),0x9a948a,xw,top+.02,zc);}
      if(grand){/* a post with a cap and a ball at the foot of the wing and at the door end of it */
        const zf=nd.zF+s*(S.run-S.tread/2),topF=yF-(S.n-1)*S.r+hc,zd=(nd.zF+nd.zL)/2+s*0,topD=yF+hc;
        for(const[zz,tp]of[[zf+s*.05,topF],[nd.zL+s*.2,topD]]){kb.P('a',box(wing+.16,.55,wing+.16),0x948f84,xw,tp+.2,zz);kb.P('a',box(wing+.22,.07,wing+.22),0xa39d90,xw,tp+.5,zz);kb.P('a',oct(.14),0xa39d90,xw,tp+.66,zz);}}}}
  const sg=mergeParts(kb.B.a);sg.userData.metres=true;const m=new THREE.Mesh(sg,VCMAT);m.castShadow=true;m.receiveShadow=true;b.g.add(m);b.meshes.s=m;}

/* the door leaf of an enterable house, shut: one small mesh in the building's frame (the village batches take it with the rest). A door that is open or moving is drawn by its own pivot (door.js).
   The jamb it hangs on is settled first (plan.js owiHinge), so that the batched leaf, the pivot and the plan all use the same one. */
function owiLeafMesh(b){owiHinge(b);const g=owdG(b),kl=kitBuilder();owdParts(kl,g,true);
  const lm=new THREE.Mesh(mergeParts(kl.B.d),b.mats.w);lm.castShadow=true;lm.receiveShadow=true;lm.layers.enable(OWIL_LAYER);
  if(b.meshes.d){b.gi.remove(b.meshes.d);b.meshes.d.geometry.dispose();}
  b.gi.add(lm);b.meshes.d=lm;}

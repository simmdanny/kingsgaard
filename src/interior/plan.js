/* =====================================================================================================================
   KINGSGAARD INTERIORS (2/5): the floor-plan generator.

   Order of work, always the same:   1. read the building (footprint, door, windows, stairs) from its architecture record
                                      2. reserve what must stay free (the way in, the stairs, door swings)
                                      3. cut the floor into rooms with partitions and give every partition a doorway
                                      4. furnish room by room, each item tested against walls, windows, reserved zones and other items
                                      5. prove walkability with a flood fill that uses the hero's real radius; items that block a route are dropped
   Everything is seeded (world seed + building position + type), so a building keeps its plan for ever.
   ===================================================================================================================== */
/* item footprints in metres: w along the item's x, d along its z; the front of an item faces +z. res = space that must stay clear in front of it. */
const OWI_ITEM={
  bed1:{w:1.0,d:2.0,res:.5,low:1},bed2:{w:1.55,d:2.0,res:.5,low:1},pallet:{w:.8,d:1.9,res:.4,low:1},
  table:{w:1.3,d:.8,res:0},tableS:{w:.95,d:.7,res:0},tableL:{w:2.2,d:.9,res:0},tableXL:{w:2.8,d:.95,res:0},desk:{w:1.3,d:.7,res:.5},
  chair:{w:.42,d:.42,res:0,small:1},stool:{w:.38,d:.38,res:0,small:1},bench:{w:1.35,d:.38,res:0,small:1},benchL:{w:2.0,d:.38,res:0,small:1},
  chest:{w:.9,d:.5,res:.55,low:1},chestS:{w:.65,d:.45,res:.5,low:1},shelf:{w:1.3,d:.38,res:.6,tall:1},shelfW:{w:1.8,d:.38,res:.6,tall:1},cupboard:{w:.9,d:.52,res:.6,tall:1},wardrobe:{w:1.1,d:.58,res:.65,tall:1},
  barrel:{w:.62,d:.62,res:0},crate:{w:.52,d:.52,res:0},sacks:{w:.8,d:.55,res:0,low:1},
  hearth:{w:1.7,d:.62,res:.9,tall:1},hearthS:{w:1.2,d:.5,res:.8,tall:1},firepit:{w:1.0,d:1.0,res:.6,low:1},stove:{w:1.1,d:.72,res:.8,tall:1},
  worktable:{w:1.5,d:.75,res:.45},wheel:{w:.7,d:.62,res:.4},kegrack:{w:1.5,d:.55,res:.5,tall:1},
  rack:{w:1.3,d:.6,res:.6,low:1},cubby:{w:1.7,d:.38,res:.6,tall:1},orb:{w:.55,d:.55,res:0},lectern:{w:.6,d:.55,res:.4},
  rug:{w:2.0,d:1.4,res:0,flat:1},rugL:{w:2.8,d:1.8,res:0,flat:1},rugS:{w:1.3,d:.9,res:0,flat:1}
};
const owiSz=(spec,rot)=>{const q=Math.abs(Math.round(rot/(Math.PI/2)))%2;return q?{ax:spec.d,az:spec.w}:{ax:spec.w,az:spec.d};};

/* ---------- reading the building ---------- */
function owiRead(b){
  const A=b.arch,BS=A.scale||OW_BS,T=OW_T*BS,P={b,A,BS,T,type:b.type,kind:OWI.kindOf(b.type,b.pl),tier:A.tier||(b.pl&&b.pl.tier)||3,seed:owiSeed(b)};P.R=mulberry(P.seed);
  /* a party wall that the neighbour built lies outside this building's own rectangle: the room reaches right up to it */
  const pw=A.party||{},tl=pw.l&&!pw.ownL?0:T,tr=pw.r&&!pw.ownR?0:T;
  P.st=A.storeys.map(s=>({i:s.i,y:s.floorY*BS,ceil:s.ceilY*BS,h:s.h*BS,Q:{xa:s.rect.x0*BS+tl,xb:s.rect.x1*BS-tr,za:s.rect.z0*BS+T,zb:s.rect.z1*BS-T}}));
  const dm=b.tunnel?A.doors.find(d=>d.kind==='passage'&&d.face==='front'):A.doors.find(d=>d.kind==='main'&&d.storey===0);P.door={u:dm.u*BS,w:dm.w*BS,h:dm.h*BS};
  P.door.z=P.st[0].Q.zb;P.hingeSide=1;
  P.hasShop=A.windows.some(w=>w.shop&&w.storey===0);const rd0=A.doors.find(d=>d.kind==='rear'&&d.storey===0);P.rear=rd0?{u:-rd0.u*BS,w:rd0.w*BS}:null;
  P.wins=A.windows.filter(w=>!w.attic&&!w.shop).map(w=>{const u=w.u*BS,hw=w.w*BS/2+.12;let face=w.face,run;
    if(face==='front')run={wall:'zb',a:u-hw,b:u+hw};else if(face==='back')run={wall:'za',a:-u-hw,b:-u+hw};else if(face==='left')run={wall:'xa',a:u-hw,b:u+hw};else run={wall:'xb',a:-u-hw,b:-u+hw};
    return Object.assign({st:w.storey,y0:w.y0*BS,y1:w.y1*BS},run);});
  /* the shop window of a trade house is a window too */
  A.windows.filter(w=>w.shop&&w.storey===0).forEach(w=>{const u=w.u*BS,hw=w.w*BS/2+.12;P.wins.push({st:0,y0:w.y0*BS,y1:w.y1*BS,wall:'zb',a:u-hw,b:u+hw});});
  /* stairs, in metres. Only flights the architecture could really fit are used; a floor with no way up is not generated.
     A narrow house (a row house is 3 to 4 m wide inside) cannot spare the 1.05 m the architecture drew for the stair strip and still have rooms beside it: it gets the same flights OWI.NARROW (92 cm) wide (still a stair a
     walker and a rail fit on) before it is given up. */
  const flights=(sw2)=>{const fl=[];for(const q of A.stairs){if(!q.feasible)break;const s=Math.sign(q.x)||1,sw=sw2||q.width*BS;let x=q.x*BS;
      if(sw2){/* the lane (0: against the wall, 1: beside it) is in the architecture's x; the same lane at the new width */const lane=Math.max(0,Math.round(((A.W/2-OW_T-q.width/2-.02)-Math.abs(q.x))/(q.width+.02)));x=s*(A.W/2*BS-T-sw/2-.02-lane*(sw+.02));}
      let zb=q.zBottom*BS,zt=q.zTop*BS;const y0=P.st[q.from].y,y1=P.st[q.to].y;
      /* the architecture leaves a metre in front of the first step; a house that is too shallow for that gives up part of it (down to OWI.STAIRFRONT, which is still room for a walker to come up to the first step) so that the walker arriving at the top has room to stand and turn */
      {const Qf=P.st[q.from].Q,zbn=zt<zb?Qf.zb-OWI.STAIRFRONT:Qf.za+OWI.STAIRFRONT;if(zt<zb?zbn>zb:zbn<zb){const sh=zbn-zb;zb+=sh;zt+=sh;}}
      /* and when the top is still too tight, a steeper flight (riser up to 21 cm, tread down to 22 cm) takes less floor */
      let nn=q.risers,tr=q.treadWorld;const Qt=P.st[q.to].Q,clearOf=z=>z<zb?z-Qt.za:Qt.zb-z;
      if(clearOf(zt)<.72){let got=false;for(const[rs,t2]of[[.19,.25],[.2,.235],[.21,.22]]){const n2=Math.max(2,Math.ceil((y1-y0)/rs-1e-9)),ru=(n2-1)*t2,z2=zt<zb?zb-ru:zb+ru;if(n2<=nn&&clearOf(z2)>=.72){zt=z2;nn=n2;tr=t2;got=true;break;}}if(!got)break;}
      fl.push({id:fl.length,from:q.from,to:q.to,x0:x-sw/2,x1:x+sw/2,z0:Math.min(zb,zt),z1:Math.max(zb,zt),zb,zt,dir:Math.sign(zt-zb)||q.dir,n:nn,riser:(y1-y0)/nn,tread:tr,y0,y1,sw});}
    return fl;};
  const bay=(fl)=>{if(!fl.length)return null;const s=Math.sign(fl[0].x0+fl[0].x1)||1,Q=P.st[0].Q,land=.95;let cx;if(s>0)cx=Math.min(...fl.map(f=>f.x0))-land;else cx=Math.max(...fl.map(f=>f.x1))+land;return{s,x:cx,mw:s>0?cx-Q.xa:Q.xb-cx};};
  /* the most floors the width allows, at the drawn stair width first and then at the narrow one */
  P.fl=1;P.stairs=[];P.col=null;{const all=[flights(0),flights(OWI.NARROW)];let done=false;
    for(let k=Math.max(all[0].length,all[1].length);k>=1&&!done;k--)for(let v=0;v<2&&!done;v++){const fl=all[v].slice(0,k);if(fl.length<k)continue;const cb=bay(fl);
      if(cb&&cb.mw>=OWI.MINBESIDE){P.stairs=fl;P.fl=1+k;P.col={s:cb.s,x:cb.x};P.narrowStairs=v===1;done=true;}}}
  if(b.tunnel){P.fl=1;P.stairs=[];P.col=null;}/* a passage has no upper floor to visit */
  return P;}

/* ---------- planning state helpers ---------- */
const owiRect=(xa,xb,za,zb)=>({xa,xb,za,zb});
const owiOv=(a,b,pad)=>{pad=pad||0;return a.x0<b.x1+pad&&a.x1>b.x0-pad&&a.z0<b.z1+pad&&a.z1>b.z0-pad;};
const owiBox=(r)=>({x0:r.xa,x1:r.xb,z0:r.za,z1:r.zb});
function owiRoomAt(F,x,z){for(const r of F.rooms)for(const q of r.rects)if(x>=q.xa&&x<=q.xb&&z>=q.za&&z<=q.zb)return r;return null;}

/* ---------- the layout: rooms and partitions for one storey ---------- */
/* The floor plan is chosen from the building's own seed but from a stream of its own (P.RL), so that choosing a plan never disturbs the random numbers the furnishing draws; the same building always gets the same plan.
   Houses of one exterior archetype differ in: which room is at the front, whether the floor is cut front to back or side to side, how deep and how wide the rooms are, how many bedrooms there are upstairs and
   whether one of them is a study. The walls, the stair bay, the doors and the windows stay where the architecture put them. */
const owiRLS=P=>P.RL||(P.RL=mulberry((P.seed^0x7f4a7c15)>>>0));
function owiPickV(RL,list){if(OWI.novar){for(const q of list)if(q[1]>0)return q[0];}let tot=0;for(const q of list)tot+=q[1];let r=RL()*tot;for(const q of list){if(r<q[1])return q[0];r-=q[1];}return list[0][0];}
/* a front-to-back partition of the ground floor and the front doorway: the partition keeps out of the door opening (and the leaf standing open in it) */
function owiOffDoor(P,xs,a,b){const d=P.door,m=d.w/2+OWI.PT/2+.1;if(Math.abs(xs-d.u)>=m)return xs;const ok=x=>x-a>=1.5&&b-x>=1.5,s1=xs>=d.u?d.u+m:d.u-m,s2=xs>=d.u?d.u-m:d.u+m;return ok(s1)?s1:ok(s2)?s2:xs;}
function owiLayout(P,i){const R=P.R,Q=P.st[i].Q,PT=OWI.PT,col=P.col,kind=P.kind,F={i,y:P.st[i].y,h:P.st[i].h,Q,rooms:[],walls:[],res:[],items:[],doorways:[]};
  const W_=(ax,p,a,b,dcs)=>{F.walls.push({ax,p,a,b,doors:dcs.map(c=>({c,w:OWI.PW,h:OWI.DH}))});};
  const room=(id,k,rects)=>{const r={id,kind:k,rects};F.rooms.push(r);return r;};
  /* M is the part of the floor beside the stair bay; C is the bay itself (open to the hall below, a landing above) */
  let M=Q,C=null;
  if(col){if(col.s>0){M=owiRect(Q.xa,col.x-(i?PT/2:0),Q.za,Q.zb);C=owiRect(col.x+(i?PT/2:0),Q.xb,Q.za,Q.zb);}else{M=owiRect(col.x+(i?PT/2:0),Q.xb,Q.za,Q.zb);C=owiRect(Q.xa,col.x-(i?PT/2:0),Q.za,Q.zb);}}
  F.M=M;F.C=C;const mw=M.xb-M.xa,md=M.zb-M.za;
  /* a doorway sits on the side of its wall that is away from the entrance, so that the way to it does not cross the way in */
  const away=(a,b)=>{const m=(a+b)/2,span=b-a,off=Math.min(span/2-.75,Math.max(.35,span*.28));return P.door.u>m?m-off:m+off;};
  const hallRects=(rects)=>C?rects.concat([C]):rects;
  if(i===0){
    if(kind==='hut'){room('main','main',[Q]);}
    else if(kind==='cottage'){
      const RL=owiRLS(P),bd=clamp(md*(.36+RL()*.1),1.8,2.2),vs=owiPickV(RL,[['back',!C&&md>=3.3&&mw>=2.6?.55:0],['side',!C&&mw>=4.4&&md>=3.0?.25:0],['one',1]]);
      if(vs==='back'){const zs=M.za+bd+PT/2;W_('x',zs,Q.xa,Q.xb,[away(Q.xa,Q.xb)]);room('bed','bedroom',[owiRect(Q.xa,Q.xb,Q.za,zs-PT/2)]);room('hall','hall',[owiRect(Q.xa,Q.xb,zs+PT/2,Q.zb)]);}
      else if(vs==='side'){/* the bedroom is a room of its own beside the hall, behind a doorway in the side partition (the door of the house is at the front, so the doorway is towards the back) */
        const bw=clamp(mw*(.36+RL()*.08),1.9,2.8),left=P.door.u>(Q.xa+Q.xb)/2,xs=owiOffDoor(P,left?Q.xa+bw:Q.xb-bw,Q.xa,Q.xb),dz=Q.za+clamp(md*.4,1.0,md-1.6);W_('z',xs,Q.za,Q.zb,[dz]);
        room('bed','bedroom',[left?owiRect(Q.xa,xs-PT/2,Q.za,Q.zb):owiRect(xs+PT/2,Q.xb,Q.za,Q.zb)]);room('hall','hall',[left?owiRect(xs+PT/2,Q.xb,Q.za,Q.zb):owiRect(Q.xa,xs-PT/2,Q.za,Q.zb)]);}
      else room('hall','hall',hallRects([M]));}
    else if(kind==='house'||kind==='large'){
      const big=kind==='large',RL=owiRLS(P),vs=owiPickV(RL,[['x',1],['xf',md>=4.7&&mw>=2.6?.5:0],['z',mw>=4.6&&md>=3.4?.45:0]]),minMd=big?4.4:4.1,minMw=big?3.2:2.6;
      if(vs==='x'&&md>=minMd&&mw>=minMw){const kd=clamp(md*(big?.34+RL()*.1:.34+RL()*.1),big?2.1:1.9,big?2.9:2.5),zs=M.za+kd+PT/2;
        if(big&&mw>=5.0){const xs=M.xa+mw*(.5+RL()*.15);W_('x',zs,M.xa,M.xb,[(M.xa+xs)/2,(xs+M.xb)/2]);W_('z',xs,M.za,zs-PT/2,[]);
          room('kit','kitchen',[owiRect(M.xa,xs-PT/2,M.za,zs-PT/2)]);room('pantry','pantry',[owiRect(xs+PT/2,M.xb,M.za,zs-PT/2)]);}
        else{W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);room('kit','kitchen',[owiRect(M.xa,M.xb,M.za,zs-PT/2)]);}
        room('hall','hall',hallRects([owiRect(M.xa,M.xb,zs+PT/2,M.zb)]));}
      else if(vs==='xf'){/* the working room is the one you enter, the hall is at the back */
        const kd=clamp(md*(.34+RL()*.1),big?2.1:1.9,big?2.9:2.5),zs=M.zb-kd-PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);
        room('kit','kitchen',[owiRect(M.xa,M.xb,zs+PT/2,M.zb)]);room('hall','hall',hallRects([owiRect(M.xa,M.xb,M.za,zs-PT/2)]));}
      else if(vs==='z'){/* cut side to side: the kitchen takes the outer side, the hall lies against the stair bay */
        const kw=clamp(mw*(.38+RL()*.1),2.2,3.4),left=C?C.xa>M.xa:RL()<.5,xs=owiOffDoor(P,left?M.xb-kw:M.xa+kw,M.xa,M.xb),dz=M.za+clamp(md*.4,1.0,md-1.6);W_('z',xs,M.za,M.zb,[dz]);
        /* left: the bay is on the left, so the kitchen is on the right (and the other way round) */
        room('kit','kitchen',[left?owiRect(xs+PT/2,M.xb,M.za,M.zb):owiRect(M.xa,xs-PT/2,M.za,M.zb)]);room('hall','hall',hallRects([left?owiRect(M.xa,xs-PT/2,M.za,M.zb):owiRect(xs+PT/2,M.xb,M.za,M.zb)]));}
      else room('hall','hall',hallRects([M]));}
    else if(kind==='tavern'){
      if(mw>=4.6&&md>=3.4){const left=col?col.s>0:R()<.5,kw=clamp(mw*.36,2.3,3.3),kd=clamp(md*.56,2.3,3.1),zk=M.za+kd+PT/2,wx=left?M.xa+kw:M.xb-kw;
        /* the kitchen fills the back corner on the side away from the stairs. Its only door is in its side wall, into the service strip behind the bar. */
        W_('z',wx,M.za,zk+PT/2,[M.za+.85]);
        W_('x',zk,left?M.xa:wx-PT/2,left?wx+PT/2:M.xb,[]);
        room('kit','kitchen',[left?owiRect(M.xa,wx-PT/2,M.za,zk-PT/2):owiRect(wx+PT/2,M.xb,M.za,zk-PT/2)]);
        const rest=left?[owiRect(wx+PT/2,M.xb,M.za,M.zb),owiRect(M.xa,wx+PT/2,zk+PT/2,M.zb)]:[owiRect(M.xa,wx-PT/2,M.za,M.zb),owiRect(wx-PT/2,M.xb,zk+PT/2,M.zb)];
        room('common','common',hallRects(rest));F.kitLeft=left;F.kitWall=wx;}
      else room('common','common',hallRects([M]));}
    else if(kind==='scroll'){
      if(P.tier>=3&&md>=3.7&&mw>=2.6&&!C){const bd=clamp(md*.34,1.7,2.2),zs=M.za+bd+PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);room('work','workshop',[owiRect(M.xa,M.xb,M.za,zs-PT/2)]);room('shop','shop',[owiRect(M.xa,M.xb,zs+PT/2,M.zb)]);}
      else room('shop','shop',hallRects([M]));}
    else if(kind==='row'||kind==='merchant'){
      /* a narrow town house, or a merchant's house: a shop (or hall) at the front, a room behind, the stair bay on one side */
      const shop=P.hasShop||kind==='merchant';
      if(shop&&md>=3.2&&mw>=1.8){const sd=clamp(md*(kind==='merchant'?.62:.56),2.0,4.2),zs=M.zb-sd-PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);
        room('back',kind==='merchant'?'pantry':'kitchen',[owiRect(M.xa,M.xb,M.za,zs-PT/2)]);room('shop','shopG',hallRects([owiRect(M.xa,M.xb,zs+PT/2,M.zb)]));}
      else if(md>=4.2&&mw>=2.4){const RL=owiRLS(P),kd=clamp(md*(.34+RL()*.1),1.9,2.6),front=md>=4.8&&RL()<.35;
        if(front){const zs=M.zb-kd-PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);room('kit','kitchen',[owiRect(M.xa,M.xb,zs+PT/2,M.zb)]);room('hall','hall',hallRects([owiRect(M.xa,M.xb,M.za,zs-PT/2)]));}
        else{const zs=M.za+kd+PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb)]);room('kit','kitchen',[owiRect(M.xa,M.xb,M.za,zs-PT/2)]);room('hall','hall',hallRects([owiRect(M.xa,M.xb,zs+PT/2,M.zb)]));}}
      else room('hall','hall',hallRects([M]));}
    else if(kind==='forge')room('forge','forgeRoom',hallRects([M]));
    else if(kind==='carpenter')room('shop','carpRoom',hallRects([M]));
    else if(kind==='storage')room('store','storeroom',hallRects([M]));
    else if(kind==='hall'){if(md>=5.0&&mw>=4.4){const kd=clamp(md*.34,1.9,2.6),zs=M.za+kd+PT/2;W_('x',zs,M.xa,M.xb,[away(M.xa,M.xb),M.xa+mw*.78]);
        room('kit','kitchen',[owiRect(M.xa,M.xb,M.za,zs-PT/2)]);room('hall','greatHall',hallRects([owiRect(M.xa,M.xb,zs+PT/2,M.zb)]));}
      else room('hall','greatHall',hallRects([M]));}
    else if(OWI.custom[kind]&&OWI.custom[kind].layout)OWI.custom[kind].layout(P,F,{W_,room,away,hallRects,M,C,mw,md,Q,PT,R,owiRect});
    else room('hall','hall',[Q]);
  }else{
    /* upper floor: the bay is a landing, the rest is divided along z into bedrooms; every bedroom has its own doorway onto the landing */
    room('landing','landing',[C]);
    const RL=owiRLS(P),NV=!!OWI.novar;let nr=(kind==='tavern'||kind==='large'||kind==='hall')?(md>=6.2?3:md>=4.0?2:1):(md>=4.4?2:1);if(!NV){if(nr===2&&md>=6.0&&RL()<.4)nr=3;else if(nr===2&&md<5.2&&RL()<.3)nr=1;}
    const zs=[];for(let k=0;k<=nr;k++){let z=M.za+md*k/nr;if(k>0&&k<nr&&!NV)z+=(RL()-.5)*Math.min(.9,md/nr*.3);zs.push(z);}
    /* a room is never shallower than 1.9 m */for(let k=1;k<nr;k++){zs[k]=Math.max(zs[k],zs[k-1]+1.9+PT);}for(let k=nr-1;k>=1;k--){zs[k]=Math.min(zs[k],zs[k+1]-1.9-PT);}
    const study=!NV&&P.tier>=3&&nr>=2&&kind!=='hall'&&RL()<.35,studyAt=RL()<.5?0:nr-1;
    const doors=[];for(let k=0;k<nr;k++){const za=k?zs[k]+PT/2:zs[k],zb=k<nr-1?zs[k+1]-PT/2:zs[k+1];room('r'+(k+1),kind==='hall'&&k===0?'council':(study&&k===studyAt)?'study':'bedroom',[owiRect(M.xa,M.xb,za,zb)]);if(k<nr-1)W_('x',zs[k+1],M.xa,M.xb,[]);
      /* the doorway is placed away from the top of the stairs so that nobody has to squeeze past the landing opening */
      doors.push((za+zb)/2);}
    W_('z',col.x,Q.za,Q.zb,doors);F.landing=C;}
  return F;}

/* ---------- the front door's leaf standing open ---------- */
/* Opened inwards, the leaf stands along its hinge jamb a door's width into the room (door.js). The architecture hangs it on the jamb towards the nearer corner, or on the other one when the open leaf would stand on
   the foot of the stairs (kingsgaard.html owLeafHinge), without knowing the rooms: a partition close behind the door with its doorway on the hinge side left less than a walker's width between the leaf's end and the
   partition, and with the door open that room could not be reached (seed 11, a cottage at 294,176). So the plan proves its ground floor walkable with the open leaf as one more obstacle (P.leafBox, owiProve), and the
   jamb is chosen with the layout: when the ground floor (partitions, doorways, stairs, no furniture yet) cannot be walked round the leaf on the architecture's jamb but can on the other, the door hangs on the other.
   That is decided once, when the building is made (geo.js owiLeafMesh), because the shut leaf is part of the village's batched mesh. The layout is the one owiMakePlan makes later, from the building's own
   seed and its own streams: nothing here draws from the village's stream, so the world and the saves stay the same. */
function owiLeafBox(P,hs){const lf=P.A&&P.A.leaf;return lf&&!P.b.tunnel?owdOpenBox(owdGeo(lf,P.BS,hs),1):null;}
/* The proof costs about a millisecond, too much for every house of a world while it is made. Most leaves stand free: no partition, flight or back wall comes within the width the proof needs to pass
   (2 x (RAD + 5 cm) and a grid cell), so the leaf cannot cut the floor in two and the proof is not needed. (A side wall close beside the leaf only closes off a strip that holds nothing to reach:
   a flight is wider than the strip, and a partition or a room in it would come close to the leaf.) */
function owiLeafFree(P,F,q){const D=2*(OWI.RAD+.05)+.16,PT=OWI.PT,far=(x0,x1,z0,z1)=>{const dx=Math.max(0,x0-q[1],q[0]-x1),dz=Math.max(0,z0-q[3],q[2]-z1);return dx*dx+dz*dz>=D*D;};
  if(q[2]-F.Q.za<D)return false;
  for(const w of F.walls){const ds=w.doors.slice().sort((a,c)=>a.c-c.c);let cur=w.a;const segs=[];for(const d of ds){segs.push([cur,d.c-d.w/2]);cur=d.c+d.w/2;}segs.push([cur,w.b]);
    for(const[a,c]of segs){if(c-a<1e-3)continue;if(w.ax==='x'?!far(a,c,w.p-PT/2,w.p+PT/2):!far(w.p-PT/2,w.p+PT/2,a,c))return false;}}
  for(const f of P.stairs)if(f.from===F.i&&!far(f.x0-.07,f.x1+.07,f.z0,f.z1))return false;
  return true;}
function owiHinge(b){const lf=b.arch&&b.arch.leaf;if(!lf||lf.hc)return;lf.hc=1;
  if(b.tunnel||(b.pl&&(b.pl.solid||b.pl.open)&&!OWI.types[b.type]))return;/* (no rooms: owiTunnelPlan, owiSolidPlan) */
  try{const P=owiRead(b),F=owiLayout(P,0);
    const ok=hs=>{const q=owiLeafBox(P,hs);for(const f of P.stairs)if(f.from===0&&q[0]<f.x1+.05&&q[1]>f.x0-.05&&q[2]<f.z1+.05&&q[3]>f.z0-.05)return false;/* (never standing on a flight) */
      if(owiLeafFree(P,F,q))return true;P.leafBox=q;F.pk=undefined;return owiProve(P,F).ok;};
    if(!ok(lf.hs)&&ok(-lf.hs)){lf.hs=-lf.hs;OWI.stats.rehung=(OWI.stats.rehung||0)+1;}}
  catch(e){OWI.stats.hingeErr=(OWI.stats.hingeErr||0)+1;}/* this runs while the world is made: a building whose plan cannot be read keeps the architecture's jamb rather than stopping the world */}

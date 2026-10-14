/* =====================================================================================================================
   KINGSGAARD INTERIORS (4/5): furnishing rules, the walkability proof and plan assembly.
   Furniture is chosen per room from what the room is for and how much space it has; anything that does not fit is simply not placed.
   ===================================================================================================================== */
OWI_ITEM.counter={w:3,d:.62,res:.9,tall:0};
const owiPut=(S,room,kind,p,opt)=>(p==null||S.R()<p)?owiPlace(S,room,kind,opt):null;
function owiRug(S,room,tbl,kind){const sp=OWI_ITEM[kind];const it={kind,spec:Object.assign({},sp),x:tbl.x,z:tbl.z,rot:tbl.rot,ax:owiFoot(tbl.x,tbl.z,tbl.rot,sp).ax,az:owiFoot(tbl.x,tbl.z,tbl.rot,sp).az,room:room.id,seed:Math.floor(S.R()*1e9)};
  const fp=owiFoot(it.x,it.z,it.rot,sp);if(!owiInRoom(room,fp))return null;for(const r of S.F.res)if((r.tag==='door'||r.tag==='stair'||r.tag==='hole'||r.tag==='gate'||r.tag==='doorway')&&owiOv(fp,r,0))return null;S.F.items.push(it);return it;}
function owiHearth(S,room,big){const P=S.P,Q=room.rects[0];const cx=P.A.chimney?P.A.chimney[0]*P.BS:null;
  const opt={wall:['za','xa','xb','zb'],near:cx!=null?[cx,Q.za,.5]:[(Q.xa+Q.xb)/2,Q.za,.2],req:true,tag:'hearth',ignore:null,score:c=>(c.rot===0?.6:0)};
  const it=owiPlace(S,room,big?'hearth':'hearthS',opt)||owiPlace(S,room,'firepit',{center:true,margin:.6,req:true,tag:'hearth'});if(it)S.hearth=it;return it;}
function owiTableSet(S,room,tk,seats,seatKinds,opt){const t=owiPlace(S,room,tk,Object.assign({center:true,margin:.55,pad:.5,rots:[0,Math.PI/2]},opt||{}));if(t){owiSeat(S,room,t,seatKinds,seats);}return t;}

/* a straw pallet with its long side against a wall: placed as a piece 1.9 wide and .8 deep (back to the wall, the clear strip along its open side), then turned a quarter so that it is drawn
   and collides as the pallet it is - the footprint is the same either way. The head goes to the end nearer the back of the room. */
function owiPallet(S,room,opt){const sp=OWI_ITEM.pallet,F=S.F,D=S.P.door,Q=S.P.st[0].Q,lane={x0:D.u-D.w/2-.15,x1:D.u+D.w/2+.15,z0:Q.zb-1.5,z1:Q.zb,tag:'lane'};
  /* (the way in kept for a pallet is the doorway and 15 cm either side, not the door's whole 1.56 m: a hut 3 m across left .75 m beside it, narrower than any pallet; the proof still checks every route) */
  F.res.push(lane);let it;try{it=owiPlace(S,room,'pallet',Object.assign({wall:['za','xa','xb'],tag:'bed',windowsBlock:false,dim:{w:sp.d,d:sp.w},ignore:['door'],pad:.12},opt||{}));}finally{const i=F.res.indexOf(lane);if(i>=0)F.res.splice(i,1);}if(!it)return null;
  const along=Math.abs(Math.round(it.rot/(Math.PI/2)))%2===0;/* back to za/zb: the pallet runs along x; back to xa/xb: along z */
  /* (the head is the piece's -z: at rot r it points to (-sin r, -cos r). Along x the head goes to the nearer side wall (rot pi/2: to -x); along z to -z, the back) */
  const q=room.rects[0];it.spec=Object.assign({},sp);it.rot=!along?0:(it.x-q.xa)<(q.xb-it.x)?Math.PI/2:-Math.PI/2;return it;}
function owiFurnishRoom(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,k=room.kind,bk=P.kind,t=P.tier,Qr=room.rects[0],D=P.door,cen=[(Qr.xa+Qr.xb)/2,(Qr.za+Qr.zb)/2];
  {const cu=OWI.custom[bk];if(cu&&cu.furnish&&cu.furnish(S,room))return;}
  if(k==='shopG'){owiGoods(S,room);return;}if(k==='forgeRoom'){owiForge(S,room);return;}if(k==='carpRoom'){owiCarp(S,room);return;}if(k==='storeroom'){owiStoreroom(S,room);return;}if(k==='greatHall'){owiGreatHall(S,room);return;}if(k==='council'){owiCouncil(S,room);return;}
  const areaOf=rs=>rs.reduce((a,q)=>a+(q.xb-q.xa)*(q.zb-q.za),0),area=areaOf(room.rects);
  const farDoor=[D.u,P.st[0].Q.zb,1.1];
  const bedSet=(single)=>{const bk2=area>=9&&!single?'bed2':(Qr.xb-Qr.xa>=2.4&&Qr.zb-Qr.za>=2.4&&!single?'bed2':'bed1');const b=owiPlace(S,room,t===1?'pallet':bk2,{wall:['za','xa','xb','zb'],far:farDoor,req:true,tag:'bed',windowsBlock:false});
    if(b){owiPut(S,room,'chestS',.85,{near:[b.x,b.z,2],wall:['za','xa','xb','zb'],tag:'chest'});}return b;};
  if(k==='main'){/* the single room of a hut */
    owiHearth(S,room,false);{/* the people of the hut sleep on straw pallets: two where the room has space for them, else one (the villagers have a bed each - vilhome.js). A pallet lies along a wall
       (owiPallet): head to the wall, 1.9 m long, it reached into the way in from the door of a hut 3 m across and found no place in most huts */
      const b=owiPallet(S,room,{far:farDoor,req:true})||owiPlace(S,room,'pallet',{wall:['za','xa','xb','zb'],far:farDoor,req:true,tag:'bed',windowsBlock:false});
      if(b){owiPallet(S,room,{far:[b.x,b.z,.8]});owiPut(S,room,'chestS',.6,{near:[b.x,b.z,2],wall:['za','xa','xb','zb'],tag:'chest'});}}const tb=owiTableSet(S,room,'tableS',2,['stool'],{near:S.hearth?[S.hearth.x,S.hearth.z,.6]:null});
    owiPut(S,room,'chest',.6,{tag:'chest'});owiPut(S,room,'barrel',.75,{});owiPut(S,room,'sacks',.45,{});owiPut(S,room,'shelf',.4,{});owiDeco(S,room,1,['herbs','plates']);return;}
  if(k==='hall'&&(bk==='cottage'||bk==='house'||bk==='large'||bk==='row')){
    const big=bk!=='cottage';owiHearth(S,room,true);
    /* a house without a bedroom of its own sleeps in the hall (the bed goes in before the table and the rest: placed last it seldom found room, and most cottages had no bed) */if(!P.stairs.length&&!F.rooms.some(r=>r.kind==='bedroom'))bedSet(false);
    const tk=bk==='large'?'tableXL':(bk==='house'||area>16)?'tableL':'table',nseat=bk==='large'?(pr(.5)?4:6):bk==='house'?4:3,sk=t>=3?['chair','chair','bench']:['stool','chair'];
    const tb=owiTableSet(S,room,tk,nseat,sk,{near:S.hearth?[S.hearth.x,S.hearth.z,.5]:null,far:farDoor.concat([]).slice(0,2).concat([.2])});
    if(tb&&t>=2&&pr(.6))owiRug(S,room,tb,tb.ax>2.4||bk==='large'?'rugL':'rug');
    owiPut(S,room,'cupboard',.8,{tag:'cupboard'});if(big)owiPut(S,room,'cupboard',.55,{});
    owiPut(S,room,'shelf',.65,{});if(big)owiPut(S,room,bk==='large'?'shelfW':'shelf',.5,{});
    owiPut(S,room,'chest',.6,{});owiPut(S,room,'barrel',.55,{});if(big)owiPut(S,room,'barrel',.3,{});
    if(t>=2)owiPut(S,room,'wheel',.35,{});if(bk==='house'&&t>=3)owiPut(S,room,'desk',.3,{});
    owiDeco(S,room,bk==='large'?3:2,t>=3?['tapestry','plates','herbs','map','wreath','books']:['herbs','plates','wreath']);return;}
  if(k==='bedroom'){
    const guest=bk==='tavern'||(bk==='cottage'&&false),bw=Qr.xb-Qr.xa,bd=Qr.zb-Qr.za;
    const b1=owiPlace(S,room,(!guest&&bw>=2.3&&bd>=2.3&&(room.id==='r1'||room.id==='bed'))?'bed2':'bed1',{wall:['za','xa','xb','zb'],far:[D.u,Qr.zb,.6],req:true,tag:'bed'});
    if(b1){owiPut(S,room,'chestS',.9,{near:[b1.x,b1.z,2],wall:['za','xa','xb','zb'],tag:'chest'});
      if(bw*bd>=8&&pr(.55))owiPlace(S,room,'bed1',{wall:['za','xa','xb','zb'],far:[b1.x,b1.z,.4],tag:'bed'});}
    if(!guest){owiPut(S,room,t>=3?'wardrobe':'cupboard',.8,{});owiPut(S,room,'shelf',.5,{});owiPut(S,room,'tableS',.4,{wall:['za','xa','xb','zb'],windowsBlock:false});owiPut(S,room,'stool',.4,{wall:false,center:true,margin:.4});}
    else{owiPut(S,room,'stool',.6,{center:true,margin:.4});owiPut(S,room,'barrel',.2,{});}
    owiDeco(S,room,1,['plates','herbs','tapestry','wreath']);return;}
  if(k==='kitchen'||k==='pantry'){
    if(k==='kitchen'){owiPlace(S,room,'stove',{wall:['za','xa','xb'],req:true,tag:'stove'});const wt=owiPlace(S,room,'worktable',{center:true,margin:.5,pad:.5,rots:[0,Math.PI/2]});if(wt&&pr(.7))owiSeat(S,room,wt,['stool'],1);
      owiPut(S,room,bk==='tavern'?'shelfW':'shelf',.9,{});owiPut(S,room,'cupboard',.7,{});owiPut(S,room,'barrel',.9,{});owiPut(S,room,'barrel',.5,{});owiPut(S,room,'crate',.7,{});owiPut(S,room,'sacks',.6,{});if(bk==='tavern')owiPut(S,room,'kegrack',.7,{});}
    else{owiPut(S,room,'shelfW',.95,{});owiPut(S,room,'shelf',.8,{});owiPut(S,room,'shelf',.5,{});owiPut(S,room,'barrel',.95,{});owiPut(S,room,'barrel',.8,{});owiPut(S,room,'crate',.9,{});owiPut(S,room,'crate',.6,{});owiPut(S,room,'sacks',.8,{});}
    owiDeco(S,room,k==='kitchen'?2:1,k==='kitchen'?['herbs','plates','pots']:['herbs','plates']);return;}
  if(k==='study'){/* a room to read, write and keep accounts in: a desk by the window side, a chair, shelves, a chest and a lamp-lit corner */
    owiPlace(S,room,'desk',{wall:['za','xa','xb','zb'],far:[D.u,Qr.zb,.6],req:true,tag:'desk'});owiPut(S,room,'chair',.9,{wall:false,center:true,margin:.45});owiPut(S,room,'shelfW',.9,{});owiPut(S,room,'shelf',.75,{});owiPut(S,room,'cupboard',.5,{});owiPut(S,room,'chest',.7,{});
    if(t>=4)owiPut(S,room,'lectern',.6,{});if(t>=2)owiPlace(S,room,'rugS',{center:true,margin:.5,jit:.3,pad:.2});owiDeco(S,room,2,['map','tapestry','plates']);return;}
  if(k==='landing'){owiPut(S,room,'chest',.6,{wall:['za','zb','xa','xb']});owiPut(S,room,'bench',.4,{});owiPut(S,room,'shelf',.35,{});owiDeco(S,room,1,['tapestry','plates']);return;}
  if(k==='common'){owiTavern(S,room);return;}
  if(k==='shop'){owiShop(S,room);return;}
  if(k==='workshop'){owiWorkshop(S,room);return;}
}
/* a counter that runs out from a side wall: tries a few depths and both ends, keeps the first place that leaves every route open */
function owiCounter(S,room,len,zmin,anchors,tag){const P=S.P,F=S.F,q=room.rects[0],spec=Object.assign({},OWI_ITEM.counter,{w:len,h:1.05});
  for(const dz of[0,.12,.25,.4,.55])for(const lf of anchors){const x=lf?q.xa+len/2+.01:q.xb-len/2-.01,z=zmin+dz,fp=owiFoot(x,z,0,spec);
    if(!owiInRoom(room,fp))continue;let bad=false;for(const r of F.res)if(r.tag!=='front'&&owiOv(fp,r,0)){bad=true;break;}if(bad)continue;
    for(const o of F.items)if(!o.spec.flat&&!o.deco&&owiOv(fp,owiItemBox(o),.05)){bad=true;break;}if(bad)continue;
    const it={kind:'counter',spec,x,z,rot:0,ax:len,az:spec.d,room:room.id,req:true,tag,seed:Math.floor(S.R()*1e9),left:lf};F.items.push(it);
    const fr=Object.assign(owiFront(x,z,0,spec),{tag:'front',of:it});F.res.push(fr);it.fr=fr;
    if(!S.baseOk||owiProve(P,F).ok)return it;F.items.pop();F.res.pop();}
  return null;}
/* stools along the customers' side of a counter */
function owiBarStools(S,room,bar,n){const F=S.F,sp=OWI_ITEM.stool,z=bar.z+bar.az/2+.4;let put=0;
  for(let k=0;k<n;k++){const x=bar.x-bar.ax/2+.5+k*(bar.ax-1.0)/Math.max(1,n-1),fp=owiFoot(x,z,0,sp);if(!owiInRoom(room,fp))continue;let bad=false;
    for(const r of F.res)if(r.tag!=='front'&&owiOv(fp,r,0)){bad=true;break;}if(bad)continue;
    F.items.push({kind:'stool',spec:Object.assign({},sp),x,z,rot:0,ax:fp.ax,az:fp.az,room:room.id,seat:true,seed:Math.floor(S.R()*1e9)});
    if(S.baseOk&&!owiProve(S.P,F).ok){F.items.pop();continue;}put++;}
  return put;}
function owiTavern(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0],t=P.tier,wq=q.xb-q.xa,hasK=!!F.kitWall;
  /* the bar: a counter running out from the kitchen wall with a service strip behind it that the kitchen door opens into; shelves and kegs on the wall behind */
  const kw=hasK?F.walls.find(w=>w.ax==='z'&&w.p===F.kitWall):null,kc=kw&&kw.doors.length?kw.doors[0].c:null,len=clamp(wq*.6,2.2,3.8),left=hasK?F.kitLeft:pr(.5);
  const zmin=Math.max(q.za+1.25+.31,kc!=null?kc+1.06:0);
  const bar=owiCounter(S,room,len,zmin,hasK?[left]:[left,!left],'bar');
  if(bar){const xs=bar.x;
    owiPlace(S,room,'shelfW',{wall:'za',near:[xs,q.za,1.2],tag:'shelf'});owiPlace(S,room,'shelfW',{wall:'za',near:[xs+(bar.left?.9:-.9),q.za,1.2],tag:'shelf'});
    owiPut(S,room,'kegrack',.85,{wall:'za',near:[xs+(bar.left?-.9:.9),q.za,1.2],tag:'kegs'});
    owiPut(S,room,'barrel',.9,{wall:['za'],near:[xs,q.za,.8]});owiPut(S,room,'barrel',.7,{wall:['za'],near:[xs,q.za,.8]});
    owiBarStools(S,room,bar,Math.max(2,Math.min(5,Math.floor(bar.ax/.85))));}
  owiHearth(S,room,true);
  /* the dining tables: as many as the room carries comfortably */
  const area=room.rects.reduce((a,r)=>a+(r.xb-r.xa)*(r.zb-r.za),0),nt=clamp(Math.floor(area/9),2,5),far=bar?[bar.x,bar.z,.35]:[(q.xa+q.xb)/2,q.za,.35];
  for(let k=0;k<nt;k++){const big=pr(.55),t1=owiPlace(S,room,big?'tableL':'table',{center:true,margin:.7,pad:.62,rots:[0,Math.PI/2],jit:1.2,far});
    if(t1)owiSeat(S,room,t1,big?['benchL','benchL']:['stool','chair','bench'],big?2:4);}
  owiPut(S,room,'barrel',.5,{wall:['xa','xb','zb']});owiPut(S,room,'chest',.35,{});owiPut(S,room,'shelf',.5,{wall:['xa','xb','zb']});
  owiDeco(S,room,3,['antlers','plates','tapestry','herbs']);}
function owiShop(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0],t=P.tier,hasWork=F.rooms.some(r=>r.kind==='workshop'),wq=q.xb-q.xa;
  /* the counter runs out from the side wall nearest the workshop door (so that the door opens into the staff side); the gap at its far end is the way round */
  const wd=hasWork?F.walls.find(w=>w.ax==='x'&&w.doors.length):null,dcx=wd?wd.doors[0].c:null,len=clamp(wq-1.3,1.6,4.2),left=dcx!=null?dcx<(q.xa+q.xb)/2:pr(.5);
  const zmin=q.za+(hasWork?1.0:1.45)+.33,bar=owiCounter(S,room,len,zmin,dcx!=null?[left]:[left,!left],'counter');
  const bx=bar?bar.x:(q.xa+q.xb)/2,bz=bar?bar.z:q.za+1.5;
  /* behind the counter: wall shelving with scrolls, storage and a writing table; the workshop (when there is one) takes the rest */
  owiPlace(S,room,'cubby',{wall:'za',near:[bx,q.za,1.2],req:true,tag:'cubby'});
  if(!hasWork){owiPut(S,room,'cubby',.8,{wall:'za',near:[bx+(bar&&bar.left?1.8:-1.8),q.za,1.2]});owiPlace(S,room,'worktable',{wall:['xa','xb'],near:[bar&&bar.left?q.xb:q.xa,q.za+.9,.4],dim:{w:1.3},tag:'work'});owiPut(S,room,'chest',.85,{wall:['za','xa','xb']});owiPut(S,room,'chest',.55,{wall:['za','xa','xb']});owiPut(S,room,'barrel',.4,{wall:['za','xa','xb']});}
  else{owiPut(S,room,'cubby',.7,{wall:['xa','xb'],near:[bar&&bar.left?q.xa:q.xb,q.za+.9,.6]});}
  /* the customers' side: display racks along the walls, a rug in front of the counter, an orb on a stand */
  owiPlace(S,room,'rack',{wall:['xa','xb'],near:[q.xa,q.zb-2.0,.4],tag:'rack'});owiPlace(S,room,'rack',{wall:['xa','xb'],near:[q.xb,q.zb-2.0,.4],tag:'rack'});
  owiPut(S,room,'rack',.7,{wall:['zb'],tag:'rack'});owiPut(S,room,'cubby',.5,{wall:['xa','xb'],near:[bar&&bar.left?q.xb:q.xa,q.zb-1.0,.5]});
  if(t>=2)owiPlace(S,room,'rugS',{center:true,margin:.5,near:[bx,bz+1.3,.6],jit:.3,pad:.2});
  if(t>=3)owiPut(S,room,'orb',.7,{wall:['zb','xa','xb'],tag:'orb'});
  owiDeco(S,room,2,['tapestry','map']);}
function owiWorkshop(S,room){const R=S.R,pr=p=>R()<p;owiPlace(S,room,'worktable',{wall:['za','xa','xb'],req:true,tag:'work'});owiPut(S,room,'cubby',.8,{wall:['za','xa','xb']});owiPut(S,room,'chest',.9,{});owiPut(S,room,'chest',.6,{});owiPut(S,room,'barrel',.6,{});owiPut(S,room,'shelf',.5,{});owiPut(S,room,'orb',.5,{center:true,margin:.5});owiDeco(S,room,1,['map','tapestry']);}
/* bedrooms over a scroll shop are the scribe's quarters: a bed, a desk, shelves of scrolls */
function owiQuarters(S,room){const P=S.P,R=S.R,pr=p=>R()<p,D=P.door,Qr=room.rects[0];
  const b=owiPlace(S,room,'bed1',{wall:['za','xa','xb','zb'],far:[D.u,Qr.zb,.6],req:true,tag:'bed'});if(b)owiPut(S,room,'chestS',.8,{near:[b.x,b.z,2],tag:'chest'});
  owiPlace(S,room,'desk',{wall:['za','xa','xb','zb'],tag:'desk'});owiPut(S,room,'cubby',.8,{});owiPut(S,room,'shelf',.7,{});owiPut(S,room,'stool',.8,{center:true,margin:.4});owiDeco(S,room,1,['map','tapestry']);}

/* ---------- the walkability proof ---------- */
function owiProve(P,F){const cs=.12,rad=OWI.RAD+.05,Q=F.Q,nx=Math.ceil((Q.xb-Q.xa)/cs)+1,nz=Math.ceil((Q.zb-Q.za)/cs)+1,PT=OWI.PT;
  const blocked=new Uint8Array(nx*nz),ix=x=>Math.round((x-Q.xa)/cs),iz=z=>Math.round((z-Q.za)/cs);
  const rectBlock=(x0,x1,z0,z1)=>{const a=Math.max(0,ix(x0-rad)),b=Math.min(nx-1,ix(x1+rad)),c=Math.max(0,iz(z0-rad)),d=Math.min(nz-1,iz(z1+rad));for(let k=c;k<=d;k++)for(let j=a;j<=b;j++){const x=Q.xa+j*cs,z=Q.za+k*cs;if(x>x0-rad+1e-6&&x<x1+rad-1e-6&&z>z0-rad+1e-6&&z<z1+rad-1e-6)blocked[k*nx+j]=1;}};
  /* the room edge itself */
  for(let k=0;k<nz;k++)for(let j=0;j<nx;j++){const x=Q.xa+j*cs,z=Q.za+k*cs;if(x<Q.xa+rad-1e-6||x>Q.xb-rad+1e-6||z<Q.za+rad-1e-6||z>Q.zb-rad+1e-6)blocked[k*nx+j]=1;}
  /* partitions with their doorway gaps */
  for(const w of F.walls){const segs=[],ds=w.doors.slice().sort((a,b)=>a.c-b.c);let cur=w.a;for(const d of ds){segs.push([cur,d.c-d.w/2]);cur=d.c+d.w/2;}segs.push([cur,w.b]);
    for(const[a,b]of segs){if(b-a<1e-3)continue;if(w.ax==='x')rectBlock(a,b,w.p-PT/2,w.p+PT/2);else rectBlock(w.p-PT/2,w.p+PT/2,a,b);}}
  /* the front door's leaf standing open (plan.js owiLeafBox): every room and stair has to be reached with the door open too */
  if(F.i===0&&P.leafBox){const q=P.leafBox;rectBlock(q[0],q[1],q[2],q[3]);}
  /* solid items */
  for(const it of F.items){if(it.deco||it.spec.flat)continue;rectBlock(it.x-it.ax/2,it.x+it.ax/2,it.z-it.az/2,it.z+it.az/2);}
  /* the stair holes and the stairs themselves are not floor */
  for(const f of P.stairs){if(F.i===f.to||F.i===f.from)rectBlock(f.x0,f.x1,f.z0,f.z1);}
  const free=(x,z)=>{const j=ix(x),k=iz(z);return j>=0&&k>=0&&j<nx&&k<nz&&!blocked[k*nx+j];};
  const near=(x,z,r)=>{r=r||.7;let best=null,bd=1e9;for(let a=-Math.ceil(r/cs);a<=Math.ceil(r/cs);a++)for(let c=-Math.ceil(r/cs);c<=Math.ceil(r/cs);c++){const X=x+c*cs,Z=z+a*cs;if(!free(X,Z))continue;const d=a*a+c*c;if(d<bd){bd=d;best=[X,Z];}}return best;};
  /* where the walking starts and what has to be reachable */
  const starts=[],targets=[];let seen=null;
  const dump=()=>{let o='';for(let k=0;k<nz;k++){let row='';for(let j=0;j<nx;j++){const id=k*nx+j;let ch=blocked[id]?'#':(seen&&seen[id]?'.':'o');
      for(const s of starts)if(ix(s[0])===j&&iz(s[1])===k)ch='S';for(const t of targets)if(ix(t[0])===j&&iz(t[1])===k)ch=(seen&&seen[id])?'T':'X';row+=ch;}o+=row+'\n';}return o;};
  const fail=(why,extra)=>Object.assign({ok:false,why},extra||{},OWI.dbg?{dump:dump()}:{});
  if(F.i===0){const s=near(P.door.u,Q.zb-.45,.6);if(s)starts.push(s);}
  for(const f of P.stairs){if(F.i===f.to){const z=f.dir<0?f.zt-.35:f.zt+.35;const s=near((f.x0+f.x1)/2,z,.8);if(s)starts.push(s);}
    if(F.i===f.from){const z=f.dir<0?f.zb+.5:f.zb-.5,s=near((f.x0+f.x1)/2,z,.8);if(s)targets.push(s);}}
  if(!starts.length)return fail('no start');
  for(const r of F.rooms){let best=null,bd=-1;for(const q of r.rects){const s=near((q.xa+q.xb)/2,(q.za+q.zb)/2,Math.max(q.xb-q.xa,q.zb-q.za)/2);if(s){const d=Math.min(q.xb-q.xa,q.zb-q.za);if(d>bd){bd=d;best=s;}}}if(best)targets.push(best);else return fail('room '+r.id+' has no free floor');}
  for(const w of F.walls)for(const d of w.doors){const a=w.ax==='x'?near(d.c,w.p-.75,.5):near(w.p-.75,d.c,.5),b=w.ax==='x'?near(d.c,w.p+.75,.5):near(w.p+.75,d.c,.5);if(!a||!b)return fail('doorway blocked');targets.push(a,b);}
  seen=new Uint8Array(nx*nz);const q=[];for(const s of starts){const k=iz(s[1])*nx+ix(s[0]);seen[k]=1;q.push(k);}
  for(let h=0;h<q.length;h++){const k=q[h],j=k%nx,r=(k-j)/nx;for(const[dj,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const J=j+dj,Rr=r+dr;if(J<0||Rr<0||J>=nx||Rr>=nz)continue;const kk=Rr*nx+J;if(seen[kk]||blocked[kk])continue;seen[kk]=1;q.push(kk);}}
  for(const t of targets){if(!seen[iz(t[1])*nx+ix(t[0])])return fail('unreachable',{at:t});}
  /* no room may be cut into dead pockets: most of its free floor has to be connected to the way in */
  /* The pockets of the empty layout (floor enclosed by stairwells and walls, narrower than a walker) are part of the architecture, not the furniture's doing: the first proof of a
     floor, made before anything stands in it, records them, and later proofs only count the pockets that are new. */
  const first=F.pk===undefined&&!F.items.length;if(first)F.pk={};
  for(const r of F.rooms){let tot=0,got=0;for(const q of r.rects)for(let k=iz(q.za);k<=iz(q.zb);k++)for(let j=ix(q.xa);j<=ix(q.xb);j++){if(j<0||k<0||j>=nx||k>=nz)continue;const id=k*nx+j;if(blocked[id])continue;tot++;if(seen[id])got++;}
    if(first){F.pk[r.id]=tot-got;if(tot>0&&got<tot*.5)return fail('room '+r.id+' is mostly cut off ('+got+'/'+tot+')');}const old=(F.pk&&F.pk[r.id])||0;
    if(tot>0&&got<tot*.88&&tot-got-old>6)return fail('room '+r.id+' is cut into pockets ('+got+'/'+tot+', '+old+' by the architecture)');}
  return{ok:true,cells:q.length,free:blocked.reduce((a,b)=>a+(b?0:1),0)};}

/* ---------- assembling a whole plan ---------- */
/* the plan of a passage through a row of houses: one long room between the two openings, nothing else */
function owiTunnelPlan(b){const P=owiRead(b),Q=P.st[0].Q,tw=P.door.w/2;P.floors=[];P.log=[];OWI.stats.plans++;P.hingeSide=1;
  const F={i:0,y:P.st[0].y,h:P.st[0].h,Q,rooms:[{id:'tunnel',kind:'tunnel',rects:[owiRect(-tw,tw,Q.za,Q.zb)]}],walls:[],res:[],items:[],doorways:[],M:Q,C:null,proof:{ok:true}};P.floors.push(F);P.fl=1;return P;}
/* Under a gable roof the ceiling of the top floor follows the underside of the roof near the eaves walls (geo.js owiBuildCeiling). Tall pieces (shelves, cupboards, wardrobes, fireplaces) may not stand where that ceiling is lower than
   2 m: strips along the eaves walls of the top floor, as wide as the slope needs, are kept free of them. */
function owiLowZones(P,F){const rs=owiRoofShape(P.A);if(!rs||!rs.coved)return[];const Q=F.Q,lim=2.0,d=(lim+.05-F.h+rs.dip)/rs.tan;if(d<=.1)return[];/* a strip of a few centimetres (the piece would touch the slope by a hair) is not worth moving furniture for: it changed the arrangement of small rooms */const out=[];
  if(rs.axis==='x'){const a=rs.c-rs.s2,b2=rs.c+rs.s2;out.push({x0:Q.xa-1,x1:Q.xb+1,z0:a-1,z1:a+d},{x0:Q.xa-1,x1:Q.xb+1,z0:b2-d,z1:b2+1});}else{const a=rs.c-rs.s2,b2=rs.c+rs.s2;out.push({x0:a-1,x1:a+d,z0:Q.za-1,z1:Q.zb+1},{x0:b2-d,x1:b2+1,z0:Q.za-1,z1:Q.zb+1});}
  return out;}
/* the plan of a solid building (a shed, a stable): one storey, no rooms, nothing in it. It exists so that the steps up to its door, the foundation ledge and the walls are boxes the hero cannot walk through, and the steps
   carry him up to the door like those of a house; the door itself stays shut (the front wall has no doorway). */
function owiSolidPlan(b){const P=owiRead(b);P.kind='solid';P.solid=true;P.stairs=[];P.fl=1;P.log=[];P.hingeSide=1;OWI.stats.plans++;
  P.floors=[{i:0,y:P.st[0].y,h:P.st[0].h,Q:P.st[0].Q,rooms:[],walls:[],res:[],items:[],doorways:[],proof:{ok:true},low:[]}];return P;}
function owiMakePlan(b){if(b.tunnel)return owiTunnelPlan(b);if(b.pl&&(b.pl.solid||b.pl.open)&&!OWI.types[b.type])return owiSolidPlan(b);const P=owiRead(b),A=P.A,BS=P.BS;P.A=A;P.floors=[];P.log=[];OWI.stats.plans++;
  /* the open door leaf stands along the jamb the building hangs it on (plan.js owiHinge, chosen with this layout when the building was made) */owiHinge(b);P.hingeSide=A.leaf?A.leaf.hs:1;P.leafBox=owiLeafBox(P,P.hingeSide);
  for(let i=0;i<P.fl;i++){const F=owiLayout(P,i);F.low=i===P.fl-1?owiLowZones(P,F):[];owiReserve(P,F);const S={P,F,R:P.R,hearth:null};{let b0=owiProve(P,F);
      /* a ground floor that cannot be walked round the open leaf on either jamb is proved with the door shut, as before (furniture could not mend it, and without a proof every piece would go unchecked) */
      if(!b0.ok&&i===0&&P.leafBox){P.leafBox=null;F.pk=undefined;P.log.push('floor 0 cannot be walked round the open front door ('+b0.why+'): proved with the door shut');b0=owiProve(P,F);}
      S.baseOk=b0.ok;if(!b0.ok){F.baseWhy=b0.why;P.log.push('floor '+i+' layout is not walkable before furnishing: '+b0.why);}}
    const order=F.rooms.slice().sort((a,c)=>(a.kind==='landing')-(c.kind==='landing'));
    /* the room with the most floor is furnished first, so that its big pieces get the best places */
    order.sort((a,c)=>{const ar=r=>r.rects.reduce((s,q)=>s+(q.xb-q.xa)*(q.zb-q.za),0);return ar(c)-ar(a);});
    for(const r of order){if(i>0&&P.kind==='scroll'&&r.kind==='bedroom')owiQuarters(S,r);else owiFurnishRoom(S,r);}
    /* prove it: every doorway, every room and every stair gate must be reachable by a body of the hero's size. Items that block a route are removed, optional ones first. */
    let guard=0,res=owiProve(P,F);while(!res.ok&&guard++<40){if(res.dump&&!F.firstFail){F.firstFail=res.dump;F.firstWhy=res.why;}const cand=F.items.filter(it=>!it.deco&&!it.spec.flat&&!it.req).pop()||F.items.filter(it=>!it.deco&&!it.spec.flat).pop();if(!cand)break;F.items.splice(F.items.indexOf(cand),1);P.log.push('dropped '+cand.kind+' on floor '+i+' ('+res.why+')');res=owiProve(P,F);}
    /* rooms that the primary rules left with no piece at all get a fitting set (fallback.js); what the proof cannot take is removed again, newest first */
    if(owiFallback(S,F).length||F.items.some(it=>it.fb)){res=owiProve(P,F);guard=0;while(!res.ok&&guard++<40){const c=F.items.filter(it=>it.fb&&!it.deco).pop();if(!c)break;F.items.splice(F.items.indexOf(c),1);P.log.push('dropped fallback '+c.kind+' on floor '+i+' ('+res.why+')');res=owiProve(P,F);}}
    F.proof=res;P.floors.push(F);}
  /* pieces the shape of the building cannot take are never forced in: a stair that leads to no usable room is not kept */
  P.fl=P.floors.length;return P;}

/* =====================================================================================================================
   KINGSGAARD INTERIORS (4b/8): furnishing for the rooms of trades and halls: a goods shop, a forge, a carpenter's shop, a storeroom, a great hall, a council chamber.
   Same rules as every other room: pieces are placed by owiPlace / owiSeat / owiCounter / owiDeco, which keep every route open and leave out what does not fit.
   ===================================================================================================================== */
function owiGoods(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0],t=P.tier,wq=q.xb-q.xa,merch=P.kind==='merchant',hasBack=F.rooms.some(r=>r.id==='back');
  /* the counter runs out from the side wall nearest the door to the back room; the strip behind it is the staff side */
  const wd=hasBack?F.walls.find(w=>w.ax==='x'&&w.doors.length):null,dcx=wd?wd.doors[0].c:null,len=clamp(wq-1.2,1.4,3.6),left=dcx!=null?dcx<(q.xa+q.xb)/2:pr(.5);
  const zmin=q.za+(hasBack?1.0:1.4)+.33,bar=owiCounter(S,room,len,zmin,dcx!=null?[left]:[left,!left],'counter'),bx=bar?bar.x:(q.xa+q.xb)/2,bz=bar?bar.z:q.za+1.5;
  owiPlace(S,room,'shelfW',{wall:'za',near:[bx,q.za,1.2],tag:'shelf'});owiPut(S,room,'shelf',.8,{wall:'za',near:[bx+(bar&&bar.left?1.5:-1.5),q.za,1.2]});
  if(!hasBack){owiPut(S,room,'crateStack',.9,{wall:['za','xa','xb']});owiPut(S,room,'barrel',.9,{wall:['za','xa','xb']});owiPut(S,room,'sacks',.6,{wall:['za','xa','xb']});}
  /* the customers' side */
  const far=bar&&bar.left?q.xb:q.xa;
  if(merch||t>=4)owiPut(S,room,'bolts',.9,{wall:['xa','xb'],near:[far,q.zb-1.4,.5],tag:'bolts'});
  owiPut(S,room,'crateStack',.7,{wall:['xa','xb','zb'],near:[far,q.zb-.8,.4]});owiPut(S,room,'barrel',.8,{wall:['xa','xb','zb']});owiPut(S,room,'basket',.7,{wall:['xa','xb','zb']});owiPut(S,room,'sacks',.5,{wall:['xa','xb','zb']});
  if(t>=3)owiPlace(S,room,'rugS',{center:true,margin:.45,near:[bx,bz+1.2,.6],jit:.3,pad:.2});
  owiDeco(S,room,merch?3:2,merch||t>=4?['banner','tapestry','sconce']:['herbs','plates']);}
function owiForge(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0],cx=P.A.chimney?P.A.chimney[0]*P.BS:(q.xa+q.xb)/2;
  const fg=owiPlace(S,room,'forge',{wall:['za','xa','xb'],near:[cx,q.za,1.5],req:true,tag:'forge'});
  /* the anvil stands where the smith can swing: a metre in front of the forge, the quench trough beside it */
  const an=owiPlace(S,room,'anvil',{center:true,margin:.9,pad:.5,near:fg?[fg.x,fg.z+(fg.rot===0?1.5:0),1]:null,rots:[0,Math.PI/2],req:true,tag:'anvil'});
  if(an)owiPlace(S,room,'trough',{center:true,margin:.7,pad:.45,near:[an.x+.9,an.z,1],tag:'trough'});else owiPlace(S,room,'trough',{wall:['za','xa','xb','zb']});
  owiPlace(S,room,'worktable',{wall:['za','xa','xb'],tag:'work'});owiPut(S,room,'wrack',.9,{wall:['za','xa','xb'],tag:'wrack'});owiPut(S,room,'coalBin',.9,{near:fg?[fg.x,fg.z,1]:null});
  owiPut(S,room,'barrel',.8,{wall:['za','xa','xb','zb']});owiPut(S,room,'crate',.6,{wall:['za','xa','xb','zb']});owiPut(S,room,'shelf',.5,{wall:['za','xa','xb']});owiPut(S,room,'chest',.35,{wall:['za','xa','xb']});
  owiDeco(S,room,1,['shield','plates']);}
function owiCarp(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0];
  const n=owiPlace(S,room,'worktable',{center:true,margin:.8,pad:.7,rots:[0,Math.PI/2],req:true,tag:'work'});if(pr(.7))owiPlace(S,room,'worktable',{center:true,margin:.8,pad:.7,rots:[0,Math.PI/2],far:n?[n.x,n.z,.5]:null,tag:'work'});
  owiPlace(S,room,'plankStack',{wall:['za','xa','xb','zb'],req:true,tag:'planks'});owiPut(S,room,'plankStack',.8,{wall:['za','xa','xb','zb']});
  owiPut(S,room,'sawhorse',.9,{center:true,margin:.7,pad:.5});owiPut(S,room,'sawhorse',.5,{center:true,margin:.7,pad:.5});
  owiPut(S,room,'shelf',.85,{wall:['za','xa','xb']});owiPut(S,room,'wrack',.5,{wall:['za','xa','xb']});owiPut(S,room,'barrel',.7,{wall:['za','xa','xb','zb']});owiPut(S,room,'crate',.7,{wall:['za','xa','xb','zb']});owiPut(S,room,'basket',.5,{wall:['za','xa','xb','zb']});
  owiDeco(S,room,1,['plates']);}
function owiStoreroom(S,room){const R=S.R,pr=p=>R()<p;
  owiPlace(S,room,'crateStack',{wall:['za','xa','xb','zb'],req:true});owiPut(S,room,'crateStack',.7,{wall:['za','xa','xb','zb']});owiPut(S,room,'shelfW',.8,{wall:['za','xa','xb']});owiPut(S,room,'shelf',.6,{wall:['za','xa','xb']});
  for(let k=0;k<3;k++)owiPut(S,room,'barrel',.8-k*.2,{wall:['za','xa','xb','zb']});owiPut(S,room,'crate',.8,{wall:['za','xa','xb','zb']});owiPut(S,room,'sacks',.8,{wall:['za','xa','xb','zb']});owiPut(S,room,'basket',.6,{wall:['za','xa','xb','zb']});owiPut(S,room,'chest',.4,{wall:['za','xa','xb']});}
function owiGreatHall(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0],t=P.tier,wq=q.xb-q.xa,md=q.zb-q.za;
  owiHearth(S,room,true);
  /* long tables with benches down the hall, a lord's seat at the far end */
  const nt=wq>7?2:1,tbs=[];for(let k=0;k<nt;k++){const tb=owiPlace(S,room,'tableXL',{center:true,margin:.9,pad:.9,rots:[0],jit:.5,far:tbs.length?[tbs[0].x,tbs[0].z,.8]:null,req:k===0,tag:'long'});if(tb){tbs.push(tb);owiSeat(S,room,tb,['benchL','benchL'],2);}}
  owiPut(S,room,'throne',.9,{wall:['za'],near:[(q.xa+q.xb)/2,q.za,1.5],tag:'throne'});
  if(tbs.length)owiRug(S,room,tbs[0],'rugL');
  owiPut(S,room,'barrel',.8,{wall:['xa','xb','zb']});owiPut(S,room,'chest',.6,{wall:['xa','xb','zb']});owiPut(S,room,'cupboard',.5,{wall:['za','xa','xb']});owiPut(S,room,'basket',.4,{wall:['xa','xb','zb']});
  owiDeco(S,room,5,['banner','shield','tapestry','sconce','antlers']);}
function owiCouncil(S,room){const P=S.P,F=S.F,R=S.R,pr=p=>R()<p,q=room.rects[0];
  const tb=owiPlace(S,room,'tableXL',{center:true,margin:.85,pad:.8,rots:[0,Math.PI/2],req:true,tag:'council'});if(tb)owiSeat(S,room,tb,['chair','chair'],6);
  owiPut(S,room,'shelfW',.9,{wall:['za','xa','xb','zb']});owiPut(S,room,'shelf',.7,{wall:['za','xa','xb','zb']});owiPut(S,room,'desk',.5,{wall:['za','xa','xb','zb']});owiPut(S,room,'chest',.7,{wall:['za','xa','xb','zb']});
  owiDeco(S,room,3,['banner','map','tapestry','sconce']);}

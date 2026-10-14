/* =====================================================================================================================
   KINGSGAARD INTERIORS (4b/8): the fallback furnishing. The primary rules (furnish.js) place what a room is for and drop anything that does not fit; in narrow rooms (the upper floors of a row house are
   often one metre wide) or when the proof of walkability removes a piece, a room could be left with nothing. After the primary pass and its proof, every room that is meant to be furnished and holds no
   piece at all (flat rugs and wall hangings do not count) gets a modest, fitting set, chosen from what the room is for, its size and the wealth of the house, from a random stream of its own (P.RF) so that the
   furnishing of the other rooms is exactly what it was. Pieces that the proof cannot take are removed again, newest first.
   ===================================================================================================================== */
/* kind lists per purpose: [kind, weight, least tier, greatest tier]; small rooms take the pieces that need the least floor */
const OWI_FB={
  sleep:[['chestS',1,1,5],['stool',.8,1,5],['shelf',.8,1,5],['basket',.9,1,5],['sacks',.5,1,2],['cupboard',.8,2,5],['wardrobe',1,3,5],['tableS',.7,2,5],['rack',.4,1,3],['barrel',.35,1,2],['chair',.6,3,5],['bench',.5,2,5],['cradle',.3,1,3]],
  work:[['desk',1,3,5],['chair',.8,3,5],['shelfW',.9,3,5],['shelf',.9,1,5],['chest',.7,1,5],['lectern',.5,4,5],['cupboard',.6,2,5],['stool',.6,1,3],['basket',.4,1,5],['tableS',.7,1,5]],
  landing:[['bench',.9,2,5],['chest',.9,1,5],['shelf',.7,1,5],['cupboard',.7,3,5],['stool',.7,1,5],['basket',.8,1,5],['chair',.5,3,5],['barrel',.4,1,3],['lectern',.3,4,5],['chestS',.7,1,5]],
  cook:[['worktable',.8,1,5],['shelf',.9,1,5],['barrel',.8,1,5],['crate',.7,1,5],['sacks',.7,1,5],['basket',.8,1,5],['stool',.6,1,5],['cupboard',.6,2,5],['trough',.4,1,3]],
  store:[['crate',1,1,5],['crateStack',.6,2,5],['barrel',.9,1,5],['sacks',.9,1,5],['shelf',.8,1,5],['bolts',.4,3,5],['rack',.5,1,5],['basket',.7,1,5],['chest',.6,1,5]],
  shop:[['shelf',1,1,5],['shelfW',.8,3,5],['crate',.8,1,5],['barrel',.7,1,5],['chest',.7,1,5],['basket',.6,1,5],['bolts',.4,3,5],['rack',.5,1,5],['sacks',.5,1,5]],
  work2:[['worktable',1,1,5],['sawhorse',.6,1,5],['crate',.7,1,5],['barrel',.7,1,5],['rack',.7,1,5],['shelf',.7,1,5],['sacks',.4,1,5],['anvil',.2,2,5]],
  tavern:[['table',1,1,5],['stool',1,1,5],['bench',.8,1,5],['barrel',.9,1,5],['kegrack',.5,2,5],['chest',.4,1,5],['shelf',.5,1,5]],
  living:[['chest',.9,1,5],['stool',.8,1,5],['shelf',.8,1,5],['cupboard',.8,1,5],['barrel',.5,1,5],['basket',.7,1,5],['sacks',.4,1,3],['chair',.6,2,5],['tableS',.8,1,5],['bench',.6,1,5]],
  hall:[['tableL',1,3,5],['table',1,1,5],['bench',.8,1,5],['chair',.6,3,5],['cupboard',.9,1,5],['chest',.8,1,5],['shelfW',.6,3,5],['barrel',.6,1,5]]};
const OWI_FB_DECO={sleep:['plates','herbs','wreath','tapestry'],work:['map','tapestry','plates','books'],landing:['tapestry','plates','wreath','herbs'],cook:['herbs','plates','pots'],store:['herbs','plates'],shop:['plates','wreath','herbs'],
  work2:['plates','herbs'],tavern:['plates','antlers','herbs'],living:['herbs','plates','wreath','tapestry'],hall:['tapestry','plates','map','wreath']};
const owiFbPurpose=(room,P)=>{const k=room.kind;if(k==='bedroom')return'sleep';if(k==='study'||k==='council')return'work';if(k==='landing')return'landing';if(k==='kitchen'||k==='pantry')return'cook';
  if(k==='storeroom')return'store';if(k==='shop'||k==='shopG')return'shop';if(k==='workshop'||k==='forgeRoom'||k==='carpRoom')return'work2';if(k==='common')return'tavern';if(k==='hall'||k==='greatHall')return'hall';return'living';};
const owiRoomArea=room=>room.rects.reduce((a,q)=>a+(q.xb-q.xa)*(q.zb-q.za),0);
/* a piece that counts as furnishing: not a flat rug, not a wall hanging */
const owiReal=it=>!it.deco&&!(it.spec&&it.spec.flat);
function owiFallback(S,F){const P=S.P,t=P.tier,added=[];if(!P.RF)P.RF=mulberry((P.seed^0x51ed270b)>>>0);const RF=P.RF,S2={P,F,R:RF,hearth:S.hearth,baseOk:S.baseOk};
  for(const room of F.rooms){if(room.kind==='tunnel')continue;if(F.items.some(it=>it.room===room.id&&owiReal(it)))continue;
    const area=owiRoomArea(room),pu=owiFbPurpose(room,P);let want=area<2.4?1:area<5?2:area<9?3:area<16?4:5;if(room.kind==='landing')want=Math.min(want,area<5?1:2);
    /* weighted choice without replacement among the kinds that suit the tier; the order is the order of trying */
    let pool=OWI_FB[pu].filter(q=>t>=q[2]&&t<=q[3]),order=[];while(pool.length){let tot=0;for(const q of pool)tot+=q[1];let r=RF()*tot,i=0;for(;i<pool.length-1;i++){if(r<pool[i][1])break;r-=pool[i][1];}order.push(pool[i][0]);pool=pool.filter((_,j)=>j!==i);}
    /* a closet one metre wide has a doorway whose reserved strip (a metre each side of the wall) covers all of its floor: while it is furnished the strip stays half a metre deep from then on (the proof of walkability
       still has to pass, so the door stays reachable) */
    const relax=[];if(area<3.6)for(const r of F.res){if(r.tag!=='doorway'||!room.rects.some(q=>r.x1>q.xa&&r.x0<q.xb&&r.z1>q.za&&r.z0<q.zb))continue;const dx=r.x1-r.x0,dz=r.z1-r.z0;
      if(Math.abs(dx-2)<1e-4){relax.push([r,r.x0,r.x1,r.z0,r.z1]);const c=(r.x0+r.x1)/2;r.x0=c-.5;r.x1=c+.5;}else if(Math.abs(dz-2)<1e-4){relax.push([r,r.x0,r.x1,r.z0,r.z1]);const c=(r.z0+r.z1)/2;r.z0=c-.5;r.z1=c+.5;}}
    /* in a narrow room a piece may not be thicker than what leaves a walker's width (about 60 cm) free beside it, or the far end of the room becomes a pocket the hero cannot enter */
    {const rr=room.rects.length===1?room.rects[0]:null,m=rr?Math.min(rr.xb-rr.xa,rr.zb-rr.za):9;if(m<1.6)order=order.filter(k=>{const sp=OWI_ITEM[k];return sp&&Math.min(sp.w,sp.d)<=m-.58+1e-6;});}
    let got=0;const tryKind=k=>{const spec=OWI_ITEM[k];if(!spec)return null;const opts=[{wall:null,pad:.2,tag:'fb'},{wall:false,center:true,margin:.35,pad:.2,tag:'fb'}];
      for(const o of opts){if(o.center&&!spec.small&&!spec.low)continue;const it=owiPlace(S2,room,k,o);if(it){it.fb=true;it.req=false;added.push(it);return it;}}return null;};
    for(const k of order){if(got>=want)break;if(tryKind(k))got++;}
    /* nothing fitted (a sliver of a room, a doorway on both sides): a hanging at least, so that the room does not read as unfinished */
    if(!got){owiDeco(S2,room,area<2.4?1:2,OWI_FB_DECO[pu]);for(const it of F.items)if(it.deco&&it.room===room.id)it.fb=true;}
    else if(area>=7){owiDeco(S2,room,1,OWI_FB_DECO[pu]);}
    for(const q of relax)q[0].relaxed=true;}
  return added;}

/* =====================================================================================================================
   KINGSGAARD INTERIORS (5b/8): more furniture (workshops, a forge, a goods shop, a hall) and the handcrafted chests.
   Same conventions as furniture.js: origin at the middle of the footprint on the floor, +z is the front, y up, metres. a = the part adder.
   `it.lod` is 1 for an interior that is far away: fine detail (rivets, scratches, small clutter) is left out there.
   ===================================================================================================================== */
Object.assign(OWI_ITEM,{
  anvil:{w:.66,d:.46,res:.8},forge:{w:1.6,d:1.0,res:1.0,tall:1},trough:{w:.95,d:.42,res:.4,low:1},wrack:{w:1.3,d:.32,res:.6,tall:1},
  plankStack:{w:1.7,d:.6,res:.3,low:1},sawhorse:{w:1.0,d:.4,res:.4,low:1},bolts:{w:1.3,d:.45,res:.6,tall:1},crateStack:{w:.7,d:.6,res:0},
  basket:{w:.42,d:.42,res:0,small:1},throne:{w:.72,d:.62,res:.5},coalBin:{w:.85,d:.6,res:.3,low:1},loom:{w:1.2,d:.9,res:.6},cradle:{w:.5,d:.9,res:.4,low:1}});
const owiKeep=(it,v)=>!(it&&it.lod)||v;/* keep a fine detail only near the player */
Object.assign(OWI_MESH,{
  anvil(a,w,d,R,it){const st=owiPickC(R,OWI_WOOD);a('a',cyl(.21,.24,.5,9),st,0,.25,0);a('a',box(.5,.16,.22),OWI_IRON,0,.58,0);a('a',box(.62,.1,.2),0x3a3a40,0,.71,0);a('a',cone(.09,.22,6),OWI_IRON,-.4,.7,0,0,0,Math.PI/2);a('a',box(.1,.04,.1),0x5a5a62,.1,.77,0);},
  forge(a,w,d,R,it){const st=owiPickC(R,OWI_STONE),H=Math.min(2.6,((it&&it.ceil)||2.6)-.1);a('a',box(w,.86,d),st,0,.43,0);a('a',box(w+.06,.07,d+.06),0x5a5650,0,.89,0);
    a('a',box(w-.5,.12,d-.3),0x1c1816,0,.95,.02);a('g',box(w-.7,.04,d-.5),0xff6a1a,0,.98,.02);a('g',cone(.14,.3,5),0xffa030,-.2,1.1,.02);a('g',cone(.1,.24,5),0xffd070,.2,1.07,0);
    a('a',box(w-.2,H-.95,d-.35),st,0,.95+(H-.95)/2,-.12);a('a',box(w-.1,.18,d-.1),0x6a665e,0,1.9,-.04);
    a('a',box(.34,.28,.5),0x5a3d22,w/2+.28,.8,.1);a('a',cone(.14,.4,6),0x3a2a1c,w/2+.55,.82,.1,0,0,-Math.PI/2);
    if(owiKeep(it,1)){a('a',cyl(.012,.012,.7,4),OWI_IRON,-w/2+.2,1.35,d/2+.02,0,0,.2);a('a',cyl(.012,.012,.7,4),OWI_IRON,-w/2+.3,1.35,d/2+.02,0,0,-.2);}},
  trough(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.34,d),wd,0,.17,0);a('a',box(w-.1,.02,d-.1),0x4a7a9a,0,.33,0);a('a',box(.06,.4,d),owiPickC(R,OWI_DARK),-w/2+.1,.2,0);a('a',box(.06,.4,d),owiPickC(R,OWI_DARK),w/2-.1,.2,0);},
  wrack(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,1.3,.04),wd,0,1.05,-d/2+.02);for(const sx of[-1,1])a('a',box(.06,1.7,.06),wd,sx*(w/2-.03),.85,-d/2+.05);a('a',box(w,.06,.12),wd,0,.55,-d/2+.08);a('a',box(w,.06,.12),wd,0,1.15,-d/2+.08);
    const n=owiKeep(it,1)?4:2;for(let k=0;k<n;k++){const x=-w/2+.22+k*(w-.44)/Math.max(1,n-1);a('a',box(.045,.8,.012),0xb0b4ba,x,.9,-d/2+.1);a('a',box(.2,.03,.03),0x4a3220,x,.5,-d/2+.1);a('a',box(.04,.18,.04),0x3a2a1c,x,.4,-d/2+.1);}
    if(owiKeep(it,1)){a('a',cyl(.014,.014,1.7,5),0x6a4a2a,w/2-.12,1.0,-d/2+.12,.05,0,.05);a('a',cone(.03,.12,5),0xb0b4ba,w/2-.1,1.88,-d/2+.12);}},
  plankStack(a,w,d,R,it){const wd=owiPickC(R,[0xb89a64,0xc8aa74,0xa88a58]);for(let k=0;k<6;k++){a('a',box(w-(k%2)*.1,.05,d-.04),wd,(R()-.5)*.05,.025+k*.07,0,0,(R()-.5)*.04,0);if(k%2===0)for(const sx of[-.5,.5])a('a',box(.05,.025,d),0x6a4a2a,sx*(w/2-.2),.06+k*.07,0);}},
  sawhorse(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.07,.12),wd,0,.78,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.06,.8,.06),wd,sx*(w/2-.1),.4,sz*.14,sz*.2,0,0);a('a',box(.4,.02,.2),0xc8aa74,.1,.82,0,0,.3,0);},
  bolts(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD),h=1.7;for(const sx of[-1,1])a('a',box(.05,h,d),wd,sx*(w/2-.025),h/2,0);a('a',box(w,h,.03),owiPickC(R,OWI_DARK),0,h/2,-d/2+.015);
    for(let r=0;r<4;r++){const y=.1+r*.42;a('a',box(w-.04,.035,d),wd,0,y,0);if(r<3)for(let k=0;k<4;k++){const x=-w/2+.22+k*(w-.44)/3;a('a',cyl(.09,.09,d-.08,8),owiPickC(R,OWI_CLOTH.concat(OWI_LINEN)),x,y+.11,0,Math.PI/2,0,0);}}},
  crateStack(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);for(const[x,y,s]of[[-.14,0,.4],[.16,0,.36],[0,.4,.38]]){a('a',box(s,s,s),wd,x,y+s/2,(R()-.5)*.04,0,(R()-.5)*.3,0);a('a',box(s+.02,.035,s+.02),owiPickC(R,OWI_DARK),x,y+s*.25,0);a('a',box(s+.02,.035,s+.02),owiPickC(R,OWI_DARK),x,y+s*.75,0);}},
  basket(a,w,d,R,it){const c=owiPickC(R,[0xb89a58,0xa88a4a,0xc8aa6a]);a('a',cyl(.2,.15,.3,10),c,0,.15,0);a('a',cyl(.2,.2,.03,10),0x8a6a3a,0,.31,0);if(owiKeep(it,1)){a('a',cyl(.015,.015,.4,4),0x8a6a3a,0,.4,0,0,0,Math.PI/2);}if(R()<.6)a('a',ico(.12,0),owiPickC(R,[0xcc5a3a,0xd8a830,0x7a9a3a,0xe8dcc0]),0,.35,0);},
  throne(a,w,d,R,it){const wd=owiPickC(R,OWI_DARK);a('a',box(w,.08,d),wd,0,.5,0);a('a',box(w,.9,.08),wd,0,.95,-d/2+.04);for(const sx of[-1,1]){a('a',box(.07,.28,d),wd,sx*(w/2-.035),.66,0);a('a',box(.08,.5,.08),wd,sx*(w/2-.04),.25,d/2-.06);a('a',box(.08,.5,.08),wd,sx*(w/2-.04),.25,-d/2+.06);}a('a',box(w-.1,.05,d-.1),owiPickC(R,OWI_CLOTH),0,.56,0);a('a',box(.26,.18,.03),0xc8a030,0,1.3,-d/2+.06);},
  coalBin(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.44,d),wd,0,.22,0);a('a',box(w-.1,.04,d-.1),0x1a1a1c,0,.44,0);for(let k=0;k<5;k++)a('a',ico(.09,0),0x24242a,(R()-.5)*(w-.3),.5,(R()-.5)*(d-.3),R(),R(),R());},
  loom(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);for(const sx of[-1,1]){a('a',box(.07,1.5,.07),wd,sx*(w/2-.04),.75,-.1);a('a',box(.07,.7,.07),wd,sx*(w/2-.04),.35,.3);}a('a',box(w,.07,.07),wd,0,1.45,-.1);a('a',box(w,.07,.07),wd,0,.7,-.1);a('a',box(w-.2,.7,.02),owiPickC(R,OWI_CLOTH),0,1.05,-.1);a('a',box(w,.05,.5),wd,0,.5,.25);},
  cradle(a,w,d,R,it){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.05,d),wd,0,.12,0);a('a',box(.04,.3,d),wd,-w/2+.02,.27,0);a('a',box(.04,.3,d),wd,w/2-.02,.27,0);a('a',box(w,.3,.04),wd,0,.27,d/2-.02);a('a',box(w,.4,.04),wd,0,.32,-d/2+.02);a('a',box(w-.1,.1,d-.2),0xe6dcc4,0,.2,0);
    for(const sx of[-1,1]){a('a',box(.04,.04,d+.1),wd,sx*(w/2-.02),.02,0);for(const sz of[-1,1])a('a',box(.04,.1,.04),wd,sx*(w/2-.02),.07,sz*(d/2-.12));}},
  deco_banner(a,w,d,R,it){const c=owiPickC(R,OWI_CLOTH);a('a',box(.5,1.4,.02),c,0,1.35,0);a('a',box(.54,.04,.03),0xc8a030,0,2.07,.005);a('a',box(.2,.2,.03),0xe0c060,0,1.5,.01,0,0,.785);a('a',cone(.25,.2,4),c,0,.55,.005,Math.PI,0,0);},
  deco_sconce(a,w,d,R,it){a('a',box(.06,.2,.04),0x2a2a2a,0,1.7,.02);a('a',cyl(.04,.03,.12,6),0x4a3220,0,1.86,.08);a('g',cone(.045,.12,5),0xffb040,0,1.98,.08);},
  deco_shield(a,w,d,R,it){a('a',box(.44,.54,.03),owiPickC(R,OWI_CLOTH),0,1.5,0);a('a',box(.1,.54,.035),0xc8a030,0,1.5,.005);a('a',box(.44,.1,.035),0xc8a030,0,1.5,.005);a('a',cone(.22,.18,4),owiPickC(R,OWI_CLOTH),0,1.1,.005,Math.PI,0,0);}
});
Object.assign(OWI_ITEM,{deco_banner:{w:.5,d:.04},deco_sconce:{w:.2,d:.1},deco_shield:{w:.44,d:.04}});

/* ---------------- chests ----------------
   Three kinds, chosen by the building's wealth and the item's own seed: 0 a worn board chest with a rope-and-strap look, 1 a plain ironbound chest, 2 a rich chest with brass.
   Every board is its own part with its own tone; the lid has a visible seam, thickness and a rounded top; hinges, a hasp and a lock sit on the outside; corner straps,
   rivets and a few scratches are added near the player only. */
function owiChestParts(a,w,d,R,it,kind,lod,aL,hh){aL=aL||a;/* aL receives the parts of the lid: the interior chest is one solid, the world chest's lid swings */
  const tone=owiPickC(R,kind===2?[0x4a2f1c,0x55361f,0x3e2917]:kind===0?[0x7a5a38,0x8a6a44,0x6b4d2e]:[0x6b4a2c,0x7a5736,0x5e3f25]),dark=kind===2?0x2c1c10:0x3f2b1a,iron=kind===2?0xb08a3a:0x2c2c30,brass=0xc8a030;
  const jit=c=>{const k=1+(R()-.5)*.14;return(Math.min(255,(c>>16&255)*k)<<16)|(Math.min(255,(c>>8&255)*k)<<8)|Math.min(255,(c&255)*k);};
  const h=hh||(kind===2?.56:.46),bh=h*.7,lh=h-bh,nb=kind===0?3:4,bd=bh/nb;
  a('a',box(w-.02,.04,d-.02),dark,0,.02+.03,0);/* base plinth */
  for(const sz of[-1,1])for(let i=0;i<nb;i++){a('a',box(w-.1,bd-.006,.035),jit(tone),0,.06+(i+.5)*(bd-.01),sz*(d/2-.0175)+(R()-.5)*.004);}/* front and back boards */
  for(const sx of[-1,1])for(let i=0;i<nb;i++)a('a',box(.035,bd-.006,d-.1),jit(tone),sx*(w/2-.0175),.06+(i+.5)*(bd-.01),(R()-.5)*.004);/* side boards */
  for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.055,bh,.055),dark,sx*(w/2-.0275),.06+bh/2-.01,sz*(d/2-.0275));/* corner posts */
  for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.06,.05,.06),dark,sx*(w/2-.03),.025,sz*(d/2-.03));/* feet */
  /* the lid: a seam, a thick frame and rounded boards */
  const ly=.06+bh-.01;a('a',box(w+.012,.014,d+.012),0x120c08,0,ly,0);/* dark seam between body and lid */
  aL('a',box(w+.02,lh*.5,d+.02),jit(tone),0,ly+.007+lh*.25,0);
  const rt=lod?2:3,hk=(lh*.55)/(d/2);for(let i=0;i<rt;i++){const k=i-(rt-1)/2;aL('a',cyl(d/2,d/2,(w-.02)/rt-.004,8,1),jit(tone),(k*(w-.02)/rt),ly+lh*.5,0,0,0,Math.PI/2,hk,1,1);}/* a half-round lid: the cylinder's axis lies along the chest */
  for(const sx of[-1,1])aL('a',box(.04,lh*.55,d+.025),dark,sx*(w/2),ly+lh*.28,0);/* lid end rails */
  /* hardware */
  const band=(x)=>{aL('a',box(.045,.01,d+.03),iron,x,ly+lh*.55+.03,0);a('a',box(.045,ly-.06,.012),iron,x,.06+(ly-.06)/2,d/2+.012);aL('a',box(.045,lh*.45,.012),iron,x,ly+lh*.225,d/2+.012);};
  if(kind>=1){band(-w*.3);band(w*.3);}else{aL('a',box(.03,.012,d+.02),iron,-w*.3,ly+lh*.55+.03,0);aL('a',box(.03,.012,d+.02),iron,w*.3,ly+lh*.55+.03,0);}
  for(const sx of[-1,1]){a('a',box(.07,ly-.06-.02,.02),iron,sx*(w*.34),.06+(ly-.08)/2,-d/2-.012);aL('a',box(.07,lh*.55,.02),iron,sx*(w*.34),ly+lh*.3,-d/2-.012);a('a',cyl(.014,.014,.08,5),iron,sx*(w*.34),ly,-d/2-.025,0,0,Math.PI/2);}/* hinges at the back: a leaf on the body, a leaf on the lid and the pin between */
  aL('a',box(.1,lh*.55+.05,.012),kind===2?brass:iron,0,ly-.02+(lh*.55+.05)/2-.02,d/2+.016);/* hasp plate, on the lid */
  a('a',box(.055,.07,.03),kind===2?0xe0b840:0x4a4a52,0,.06+bh*.62,d/2+.03);/* lock */
  a('a',box(.015,.025,.036),0x14100c,0,.06+bh*.62,d/2+.035);
  if(!lod){
    const nr=kind===2?9:kind===1?6:3;for(let i=0;i<nr;i++){const bx=(i%2?-1:1)*(w*.3),y=.06+bh*(.15+.7*((i*37%9)/9));a('a',box(.014,.014,.012),kind===2?brass:0x1a1a1e,bx,y,d/2+.02);}
    for(let i=0;i<(kind===0?4:2);i++)a('a',box(.1+R()*.14,.004,.003),0x8a6a44,(R()-.5)*(w-.2),.12+R()*bh*.7,d/2+.019+0,0,0,(R()-.5)*.5);/* scratches */
    if(kind===2){for(const sx of[-1,1])for(const sz of[-1,1])aL('a',box(.09,Math.min(.09,lh*.8),.012),brass,sx*(w/2-.03),ly+lh*.3,sz*(d/2+.006));aL('a',box(w*.5,.012,.012),brass,0,ly+lh*.5,d/2+.03);}
    if(kind===0&&R()<.6)a('a',box(.14,.012,.012),0x2a1c10,w*.2,.06+bh*.4,d/2+.019,0,0,.3);}
  return{ly,bh,lh,h};}
Object.assign(OWI_MESH,{
  chest(a,w,d,R,it){owiChestParts(a,w,d,R,it,owiChestKind(it,R),it&&it.lod);},
  chestS(a,w,d,R,it){owiChestParts(a,w,d,R,it,owiChestKind(it,R,1),it&&it.lod);}});
/* which chest a house gets: poor homes worn boards, towns plain ironbound, cities now and then a rich one */
function owiChestKind(it,R,small){const t=(it&&it.tier)||2,x=R();if(t>=4)return x<.4?2:1;if(t===3)return x<.15?2:x<.75?1:0;return x<.18?1:0;}

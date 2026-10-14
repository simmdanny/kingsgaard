/* =====================================================================================================================
   KINGSGAARD INTERIORS (5b/8): furniture variants.
   The pieces of furniture.js drawn one way each are redrawn here in several constructions. A piece chooses its variant from its own seed (the plan gave it one), weighted by the wealth of the house:
   it.tier 1-2 is a worn farm or village home (trestles, rope beds, three-legged stools), 3 a comfortable town house, 4-5 a prosperous one (turned and carved work, post beds, panelled cupboards).
   Variants differ in how they are made (legs, stretchers, aprons, backs, lids, doors), not only in colour; they share the footprint the plan reserved, rest on the floor, and use the same wood, dark, iron and
   cloth palettes, so a room's pieces look related. Every variant is a handful of boxes and cylinders (no tiny parts): the whole library stays as cheap as before.
   ===================================================================================================================== */
const owiVar=(R,w)=>{let t=0;for(const x of w)t+=x;let r=R()*t;for(let i=0;i<w.length;i++){if(r<w[i])return i;r-=w[i];}return 0;};
const owiPoor=it=>((it&&it.tier)||2)<=2,owiRich=it=>((it&&it.tier)||2)>=4;
/* a small share of pieces is a pale, a dark or a weathered wood of its own: the same family of browns, a little apart */
const owiWear=(R,c)=>{const k=.9+R()*.18;return(Math.min(255,(c>>16&255)*k)<<16)|(Math.min(255,(c>>8&255)*k)<<8)|Math.min(255,(c&255)*k);};
Object.assign(OWI_MESH,{
  table(a,w,d,R,it){const v=owiVar(R,[1.1,1,owiPoor(it)?.3:1,owiPoor(it)?.1:owiRich(it)?1.4:.7]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK),h=.76;
    if(v===0){/* a board top on two trestles with a stretcher: the table of a farm or an inn, taken apart for the night */
      a('a',box(w,.05,d),wd,0,h,0);for(const sx of[-1,1]){a('a',box(.07,h-.03,d*.78),dk,sx*(w/2-.24),(h-.03)/2,0);a('a',box(.1,.05,d*.85),dk,sx*(w/2-.24),.025,0);}a('a',box(w-.48,.05,.05),wd,0,.32,0);}
    else if(v===1){/* planks laid side by side, held by breadboard ends, on four turned legs */
      const n=Math.max(3,Math.round(d/.2)),bw=d/n;for(let k=0;k<n;k++)a('a',box(w-.12,.05,bw-.006),k%2?wd:owiWear(R,wd),0,h,-d/2+(k+.5)*bw);for(const sx of[-1,1])a('a',box(.07,.06,d),dk,sx*(w/2-.035),h-.005,0);
      for(const sx of[-1,1])for(const sz of[-1,1]){a('a',cyl(.04,.05,h-.04,6),wd,sx*(w/2-.11),(h-.04)/2,sz*(d/2-.1));a('a',cyl(.06,.06,.05,6),wd,sx*(w/2-.11),.28,sz*(d/2-.1));}}
    else if(v===2){/* an apron table: a frame under the top, square legs, a stretcher */
      a('a',box(w,.06,d),wd,0,h,0);a('a',box(w-.1,.1,.04),dk,0,h-.1,d/2-.08);a('a',box(w-.1,.1,.04),dk,0,h-.1,-d/2+.08);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.07,h,.07),wd,sx*(w/2-.07),h/2,sz*(d/2-.07));a('a',box(w-.2,.05,.05),wd,0,.3,0);}
    else{/* a good table: a thick top, carved legs on feet, a runner of cloth */
      a('a',box(w,.07,d),wd,0,h,0);a('a',box(w+.04,.025,d+.04),dk,0,h-.045,0);for(const sx of[-1,1])for(const sz of[-1,1]){a('a',box(.1,.07,.1),dk,sx*(w/2-.09),.035,sz*(d/2-.09));a('a',cyl(.045,.056,h-.1,7),wd,sx*(w/2-.09),.07+(h-.1)/2,sz*(d/2-.09));}
      a('a',box(w*.7,.012,d*.42),owiPickC(R,OWI_CLOTH),0,h+.04,0);}
    if(R()<.7)a('a',cyl(.09,.07,.04,8),owiPickC(R,[0xb8a888,0x8a8a8a]),(R()-.5)*(w-.6),h+.05,(R()-.5)*(d-.3));
    if(R()<.5){const cx=(R()-.5)*(w-.6);a('a',cyl(.025,.025,.1,6),0xe8dcb0,cx,h+.08,0);a('g',cone(.018,.04,5),0xffc060,cx,h+.15,0);}
    if(w>1.9&&R()<.7)a('a',cyl(.1,.08,.07,8),0xa88a5a,(R()-.5)*(w-.9),h+.07,(R()-.5)*(d-.3));},
  chair(a,w,d,R,it){const v=owiVar(R,[1,1,owiPoor(it)?.3:1,owiPoor(it)?0:owiRich(it)?1.2:.5]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK);
    a('a',box(w,.05,d),wd,0,.46,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.045,.46,.045),wd,sx*(w/2-.03),.23,sz*(d/2-.03));
    if(v===0){a('a',box(w,.4,.04),wd,0,.7,-d/2+.02);}
    else if(v===1){/* a ladder back: two slats between the rear posts */
      for(const sx of[-1,1])a('a',box(.045,.5,.045),wd,sx*(w/2-.03),.72,-d/2+.03);for(const y of[.62,.8])a('a',box(w-.04,.07,.03),wd,0,y,-d/2+.03);a('a',box(w-.1,.04,.03),dk,0,.55,-d/2+.03);}
    else if(v===2){/* a spindle back */
      for(const sx of[-1,1])a('a',box(.045,.5,.045),wd,sx*(w/2-.03),.72,-d/2+.03);a('a',box(w,.05,.04),wd,0,.95,-d/2+.03);for(let k=0;k<4;k++)a('a',cyl(.014,.014,.4,5),wd,-w/2+.1+k*(w-.2)/3,.72,-d/2+.03);}
    else{/* an armchair: arms, a cushion and a high back */
      a('a',box(w,.62,.05),wd,0,.78,-d/2+.025);for(const sx of[-1,1]){a('a',box(.05,.05,d*.8),wd,sx*(w/2-.025),.7,.04);a('a',box(.045,.24,.045),wd,sx*(w/2-.025),.58,d/2-.08);}a('a',box(w-.1,.07,d-.1),owiPickC(R,OWI_CLOTH),0,.52,.01);}},
  stool(a,w,d,R,it){const v=owiVar(R,[1,.8,owiPoor(it)?.6:.2,owiPoor(it)?0:.6]),wd=owiWear(R,owiPickC(R,OWI_WOOD));
    if(v===0){a('a',cyl(w/2,w/2,.05,8),wd,0,.44,0);for(let k=0;k<3;k++){const an=k*2.094;a('a',box(.045,.44,.045),wd,Math.cos(an)*w*.28,.22,Math.sin(an)*w*.28);}}
    else if(v===1){a('a',box(w,.05,d),wd,0,.44,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.045,.44,.045),wd,sx*(w/2-.04),.22,sz*(d/2-.04));a('a',box(w-.1,.03,.03),wd,0,.2,d/2-.04);a('a',box(w-.1,.03,.03),wd,0,.2,-d/2+.04);}
    else if(v===2){/* a low milking stool: a thick round seat on three splayed legs */
      a('a',cyl(w*.46,w*.46,.07,8),wd,0,.3,0);for(let k=0;k<3;k++){const an=k*2.094;a('a',cyl(.025,.03,.28,5),wd,Math.cos(an)*w*.3,.14,Math.sin(an)*w*.3,Math.sin(an)*.15,0,-Math.cos(an)*.15);}}
    else{/* a cushioned stool on turned legs */
      a('a',cyl(w/2,w/2,.04,8),wd,0,.42,0);a('a',cyl(w/2-.02,w/2-.02,.07,8),owiPickC(R,OWI_CLOTH),0,.47,0);for(let k=0;k<4;k++){const an=k*1.571+.78;a('a',cyl(.025,.035,.4,6),wd,Math.cos(an)*w*.3,.2,Math.sin(an)*w*.3);}a('a',cyl(w*.3,w*.3,.025,8),wd,0,.2,0);}},
  bench(a,w,d,R,it){const v=owiVar(R,[1,1,owiPoor(it)?.2:.8]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK);
    a('a',box(w,.05,d),wd,0,.44,0);
    if(v===0){for(const sx of[-1,1])a('a',box(.06,.42,d-.06),wd,sx*(w/2-.12),.21,0);}
    else if(v===1){for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.06,.42,.06),wd,sx*(w/2-.1),.21,sz*(d/2-.06));a('a',box(w-.3,.04,.04),dk,0,.2,0);}
    else{/* a settle: end boards, and a back to lean on */
      for(const sx of[-1,1]){a('a',box(.06,.44,d),wd,sx*(w/2-.03),.22,0);a('a',box(.06,.5,.05),wd,sx*(w/2-.03),.69,-d/2+.03);}a('a',box(w-.1,.4,.04),dk,0,.68,-d/2+.03);a('a',box(w-.1,.05,.05),wd,0,.9,-d/2+.03);}},
  bed1(a,w,d,R,it){const v=owiVar(R,[1,owiPoor(it)?1:.2,owiPoor(it)?0:.9,owiRich(it)?.9:.1]);if(it)it.bv=v;/* (the kind of bed drawn: the villager who sleeps in it lies on its mattress - vilhome.js vilHMat) */const wd=owiWear(R,owiPickC(R,OWI_WOOD)),lin=owiPickC(R,OWI_LINEN),bl=owiPickC(R,OWI_CLOTH),dk=owiPickC(R,OWI_DARK);if(it)it.bc=bl;/* (and its blanket's colour: the cover over a sleeper) */
    if(v===1){/* a rope bed: a low frame, a straw tick, one blanket folded across */
      a('a',box(w,.14,d),wd,0,.2,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.08,.14,.08),wd,sx*(w/2-.04),.07,sz*(d/2-.04));a('a',box(w-.1,.12,d-.12),0xcdb26a,0,.33,0);a('a',box(w,.4,.06),wd,0,.4,-d/2+.03);
      a('a',box(w-.16,.07,d*.45),bl,0,.43,d*.2);a('a',box(w-.3,.08,.3),lin,0,.42,-d/2+.26);return;}
    if(v===2||v===3){/* a post bed: four posts with finials, a carved headboard, a footboard; with curtains round it in a rich house */
      a('a',box(w,.2,d),wd,0,.22,0);a('a',box(w-.08,.14,d-.14),0xd8c898,0,.39,.02);for(const sx of[-1,1])for(const sz of[-1,1]){a('a',box(.08,1.5,.08),wd,sx*(w/2-.04),.75,sz*(d/2-.04));a('a',oct(.05),dk,sx*(w/2-.04),1.55,sz*(d/2-.04));}
      a('a',box(w,.6,.07),dk,0,.8,-d/2+.035);a('a',box(w,.3,.06),wd,0,.4,d/2-.03);a('a',box(w-.16,.1,.34),lin,0,.5,-d/2+.3);a('a',box(w-.1,.07,d*.55),bl,0,.48,d*.17);
      if(v===3){a('a',box(w,.05,d),owiPickC(R,OWI_CLOTH),0,1.5,0);for(const sx of[-1,1])a('a',box(.03,.9,d-.1),owiPickC(R,OWI_CLOTH),sx*(w/2-.02),1.0,0);}return;}
    a('a',box(w,.22,d),wd,0,.2,0);a('a',box(w-.08,.14,d-.16),0xd8c898,0,.38,.02);
    a('a',box(w,.78,.07),wd,0,.52,-d/2+.035);a('a',box(w,.4,.06),wd,0,.32,d/2-.03);
    for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.08,.12,.08),wd,sx*(w/2-.04),.06,sz*(d/2-.04));
    a('a',box(w-.16,.1,.34),lin,0,.5,-d/2+.3);a('a',box(w-.1,.07,d*.55),bl,0,.48,d*.17);a('a',box(w-.1,.05,.18),owiPickC(R,OWI_LINEN),0,.46,-d*.07);},
  chest(a,w,d,R,it){const v=owiVar(R,[1,1,owiPoor(it)?.4:1,owiPoor(it)?0:1]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK);
    if(v===0){a('a',box(w,.4,d),wd,0,.2,0);a('a',box(w+.02,.12,d+.02),wd,0,.46,0);a('a',box(w-.1,.05,d-.1),wd,0,.54,0);for(const sx of[-.28,.28])a('a',box(.05,.5,d+.03),OWI_IRON,sx*w,.26,0);a('a',box(.07,.1,.03),0xc8a030,0,.4,d/2+.012);}
    else if(v===1){/* a plain plank chest with iron corners and a hasp */
      a('a',box(w,.42,d),wd,0,.21,0);a('a',box(w+.02,.08,d+.02),dk,0,.46,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.07,.46,.07),OWI_IRON,sx*(w/2-.02),.23,sz*(d/2-.02));a('a',box(.08,.14,.03),OWI_IRON,0,.4,d/2+.012);}
    else if(v===2){/* a domed lid (three steps), iron bands and a brass lock plate */
      a('a',box(w,.36,d),wd,0,.18,0);a('a',box(w+.02,.1,d+.02),wd,0,.41,0);a('a',box(w-.08,.08,d-.06),wd,0,.5,0);a('a',box(w-.2,.06,d-.16),wd,0,.57,0);for(const sx of[-.3,.3])a('a',box(.05,.6,d+.03),OWI_IRON,sx*w,.3,0);a('a',box(.09,.12,.03),0xc8a030,0,.38,d/2+.012);}
    else{/* a travelling trunk: leather straps, studs and handles, feet at the corners */
      a('a',box(w,.4,d),owiPickC(R,[0x6a4a2c,0x5a3a22,0x7a5a3a]),0,.22,0);a('a',box(w+.02,.1,d+.02),dk,0,.49,0);for(const sx of[-.3,.3])a('a',box(.05,.5,d+.03),0x3a2418,sx*w,.27,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.06,.05,.06),0xc8a030,sx*(w/2-.03),.03,sz*(d/2-.03));a('a',box(.08,.1,.03),0xc8a030,0,.42,d/2+.012);for(const sx of[-1,1])a('a',box(.03,.12,.05),OWI_IRON,sx*(w/2+.01),.35,0);}},
  cupboard(a,w,d,R,it){const v=owiVar(R,[1,.8,owiPoor(it)?.2:.9,owiPoor(it)?.2:.6]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK),h=1.75;
    a('a',box(w,h,d-.04),wd,0,h/2,-.02);a('a',box(w+.06,.06,d),dk,0,h+.03,0);
    if(v===0){for(const s of[-1,1])a('a',box(w/2-.04,h-.3,.03),dk,s*w/4,h/2+.05,d/2-.005);a('a',box(.03,.12,.03),0xc8a030,-.05,h/2,d/2+.015);a('a',box(.03,.12,.03),0xc8a030,.05,h/2,d/2+.015);}
    else if(v===1){/* panelled doors: a frame with an inset panel, iron strap hinges, a ring pull */
      for(const s of[-1,1]){a('a',box(w/2-.04,h-.3,.03),dk,s*w/4,h/2+.05,d/2-.005);a('a',box(w/2-.16,h-.5,.02),wd,s*w/4,h/2+.05,d/2+.012);a('a',box(w/2-.08,.04,.03),OWI_IRON,s*w/4,h-.5,d/2+.015);a('a',box(w/2-.08,.04,.03),OWI_IRON,s*w/4,.45,d/2+.015);}a('a',cyl(.025,.025,.02,6),OWI_IRON,-.05,h/2,d/2+.025,Math.PI/2,0,0);a('a',cyl(.025,.025,.02,6),OWI_IRON,.05,h/2,d/2+.025,Math.PI/2,0,0);}
    else if(v===2){/* a dresser: open shelves above with crockery, two doors below */
      a('a',box(w-.04,.04,d),dk,0,.84,0);for(const s of[-1,1])a('a',box(w/2-.04,.72,.03),dk,s*w/4,.46,d/2-.005);a('a',box(.03,.1,.03),0xc8a030,-.05,.5,d/2+.015);a('a',box(.03,.1,.03),0xc8a030,.05,.5,d/2+.015);
      for(const y of[1.12,1.42]){a('a',box(w-.1,.03,d-.1),wd,0,y,.02);for(let k=0;k<3;k++)a('a',cyl(.07,.06,.04,8),owiPickC(R,[0xe8e0d0,0x8a9ab0,0xc88a5a]),-w/3+k*w/3,y+.04,.05,Math.PI/2,0,0);}}
    else{/* a tall narrow press with one door, iron bands and a cornice */
      a('a',box(w-.08,h-.2,.03),dk,0,h/2,d/2-.005);for(const y of[.35,h-.4])a('a',box(w-.04,.05,.03),OWI_IRON,0,y,d/2+.015);a('a',box(.04,.14,.03),0xc8a030,w/2-.12,h/2,d/2+.02);a('a',box(w+.1,.08,d+.04),wd,0,h+.08,0);}},
  shelf(a,w,d,R,it){const v=owiVar(R,[1,1,owiPoor(it)?.2:.7]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),h=1.8;
    for(const sx of[-1,1])a('a',box(.05,h,d),wd,sx*(w/2-.025),h/2,0);a('a',box(w,h,.03),owiPickC(R,OWI_DARK),0,h/2,-d/2+.015);
    for(let k=0;k<5;k++){const y=.15+k*.4;a('a',box(w-.04,.04,d),wd,0,y,0);if(k<4)owiShelfStuff(a,R,w-.12,d,y+.02,1+Math.floor(R()*3));}
    if(v===1){a('a',box(w,.07,d+.02),wd,0,h+.03,0);}
    else if(v===2){/* a cornice and a plinth, and a rail across the second shelf to keep jars from falling */
      a('a',box(w+.06,.08,d+.04),owiPickC(R,OWI_DARK),0,h+.04,0);a('a',box(w,.1,d),owiPickC(R,OWI_DARK),0,.05,0);a('a',box(w-.1,.03,.02),wd,0,.74,d/2-.01);}},
  barrel(a,w,d,R,it){const v=owiVar(R,[1.2,.8,.7]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),r=w/2;
    a('a',cyl(r*.92,r*.92,.82,10),wd,0,.41,0);a('a',cyl(r,r,.5,10),wd,0,.41,0);for(const y of[.14,.68])a('a',cyl(r*.95,r*.95,.04,10),OWI_IRON,0,y,0);a('a',cyl(r*.97,r*.97,.04,10),OWI_IRON,0,.41,0);
    if(v===0)a('a',cyl(r*.86,r*.86,.03,10),0x4a321f,0,.84,0);
    else if(v===1){/* the lid lifted aside, a ladle hung on the rim */
      a('a',cyl(r*.8,r*.8,.04,10),0x2a1c10,0,.82,0);a('a',cyl(r*.7,r*.7,.03,10),0x4a321f,r*.5,.9,r*.3,.35,0,0);a('a',cyl(.012,.012,.3,4),OWI_IRON,r*.9,.9,0,0,0,.6);}
    else{/* a spigot low on the front and a stand of two blocks */
      a('a',cyl(r*.86,r*.86,.03,10),0x4a321f,0,.84,0);a('a',box(.05,.05,.1),0xc8a030,0,.22,r+.03);}},
  crate(a,w,d,R,it){const v=owiVar(R,[1.2,.9]),wd=owiWear(R,owiPickC(R,OWI_WOOD));
    a('a',box(w,w,d),wd,0,w/2,0);for(let k=0;k<3;k++)a('a',box(w+.02,.04,d+.02),owiPickC(R,OWI_DARK),0,.1+k*.17,0);for(const sx of[-1,1])a('a',box(.04,w+.02,d+.02),owiPickC(R,OWI_DARK),sx*(w/2-.03),w/2,0);
    if(v===1){/* open, with apples, turnips or cabbages in it */const c=owiPickC(R,[0xc84a3a,0xd8c860,0x6a9a4a,0xb8a0c0]);for(let k=0;k<4;k++)a('a',ico(.1,0),c,-w/4+(k%2)*w/2,w+.04,-d/4+(k>>1)*d/2,0,R()*3,0);}},
  rug(a,w,d,R,it){const v=owiVar(R,[1,1,owiPoor(it)?.1:.9,owiPoor(it)?.3:.6]),c=owiPickC(R,OWI_CLOTH),c2=owiPickC(R,[0xd8c890,0x2a2a3a,0xe8dcc0]),c3=owiPickC(R,OWI_CLOTH);
    if(v===0){a('a',box(w,.014,d),c,0,.008,0);a('a',box(w-.18,.018,d-.18),c2,0,.01,0);a('a',box(w-.4,.02,d-.4),c,0,.012,0);}
    else if(v===1){/* stripes across, with a fringe at both ends */
      const n=Math.max(3,Math.round(d/.22));for(let k=0;k<n;k++)a('a',box(w,.014+(k%2)*.002,d/n-.004),k%3===0?c2:k%2?c:c3,0,.008,-d/2+(k+.5)*d/n);for(const sz of[-1,1])a('a',box(w,.012,.06),0xe8dcc0,0,.007,sz*(d/2+.02));}
    else if(v===2){/* a medallion: a border, a field and a diamond in the middle */
      a('a',box(w,.014,d),c,0,.008,0);a('a',box(w-.14,.018,d-.14),c2,0,.01,0);a('a',box(Math.min(w,d)*.55,.022,Math.min(w,d)*.55),c3,0,.012,0,0,.785,0);a('a',box(Math.min(w,d)*.24,.026,Math.min(w,d)*.24),c,0,.014,0,0,.785,0);}
    else{/* a plain wool mat with a dark edge */
      a('a',box(w,.016,d),owiPickC(R,[0x5a4a3a,0x3a3a44,0x6a5a4a]),0,.009,0);a('a',box(w-.12,.02,d-.12),c2,0,.011,0);}}
,
  bed2(a,w,d,R,it){OWI_MESH.bed1(a,w,d,R,it);a('a',box(w/2-.16,.035,.3),owiPickC(R,OWI_LINEN),-w/4+.06,.565,-d/2+.3);},/* (the second pillow lies on the first at the head - it lay half a metre down the bed, where the second sleeper's chest is) */
  wardrobe(a,w,d,R,it){OWI_MESH.cupboard(a,w,d,R,it);a('a',box(w+.1,.1,d+.04),owiPickC(R,OWI_DARK),0,1.9,0);}
,
  /* small things for the walls: a rail of pots and pans, a shelf of books, a wreath of dried flowers */
  deco_pots(a,w,d,R){a('a',box(.82,.03,.03),0x3f2b1a,0,1.78,.03);for(let k=0;k<3;k++){const x=-.28+k*.28;a('a',cyl(.014,.014,.1,4),OWI_IRON,x,1.72,.03);
    if(k===1){a('a',cyl(.11,.1,.14,8),0x4a4a50,x,1.55,.08);a('a',box(.16,.02,.02),OWI_IRON,x+.13,1.6,.07,0,0,.2);}else{a('a',cyl(.11,.11,.025,10),0x3a3a40,x,1.55,.06,Math.PI/2,0,0);a('a',box(.03,.025,.22),OWI_IRON,x,1.4,.07);}}},
  deco_books(a,w,d,R){a('a',box(.8,.03,.16),owiPickC(R,OWI_WOOD),0,1.5,.08);for(const sx of[-1,1])a('a',box(.03,.12,.14),owiPickC(R,OWI_DARK),sx*.34,1.44,.07);
    let x=-.34;while(x<.3){const bw=.04+R()*.04,bh=.14+R()*.1;a('a',box(bw,bh,.11),owiPickC(R,[0x7a2a2a,0x2a4a6a,0x3a5a3a,0x6a4a2a,0x8a7a4a,0x5a3a5a]),x+bw/2,1.515+bh/2,.08);x+=bw+.006;}},
  deco_wreath(a,w,d,R){const c=owiPickC(R,[0x6a8a3a,0x8a9a3a,0xa8884a]);for(let k=0;k<9;k++){const an=k/9*6.283;a('a',ico(.045,0),k%3===0?owiPickC(R,[0xd84a5a,0xe8c040,0xe8e0f0]):c,Math.cos(an)*.16,1.65+Math.sin(an)*.16,.04);}a('a',box(.05,.12,.02),owiPickC(R,OWI_RIB),0,1.45,.04);}
});

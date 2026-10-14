/* =====================================================================================================================
   KINGSGAARD INTERIORS (5/8): furniture meshes.
   Every piece is drawn in its own frame: origin at the middle of its footprint on the floor, +z is the front, y is up, units are metres.
   The caller puts the piece where the plan says; the footprint (w x d) that the plan reserved is also the size drawn here.
   Parts go into two merged meshes: 'a' (lit, vertex coloured) and 'g' (unlit glow: fire, candles, the scroll merchant's orb).
   ===================================================================================================================== */
const OWI_WOOD=[0x6b4a2c,0x7a5736,0x5e3f25,0x8a6540,0x74523a],OWI_DARK=[0x3f2b1a,0x4a321f,0x35241a],OWI_IRON=0x2c2c30,OWI_STONE=[0x8a857b,0x7a756c,0x948e84];
const OWI_CLOTH=[0x9a3a2a,0x3a5a8a,0x4a7a4a,0xb08a3a,0x7a4a6a,0xc8b890],OWI_LINEN=[0xe6dcc4,0xd8cdb0,0xcdbf9c],OWI_PARCH=[0xe9dcb4,0xdccb9a,0xefe3c4,0xd8c890],OWI_RIB=[0xb02a24,0x2a4a8a,0x3a7a4a,0xc8a030];
const owiPickC=(R,a)=>a[Math.floor(R()*a.length)%a.length];
function owiShelfStuff(a,R,w,d,y,n){/* jars, books, bowls and loaves on a shelf board whose top is at height y */
  for(let k=0;k<n;k++){const x=-w/2+.12+R()*(w-.24),t=R();
    if(t<.3)a('a',box(.05+R()*.05,.15+R()*.06,.14),owiPickC(R,[0x7a2a2a,0x2a4a6a,0x3a5a3a,0x6a4a2a,0x8a7a4a]),x,y+.09,0);
    else if(t<.55)a('a',cyl(.06,.055,.13,8),owiPickC(R,[0xa88a5a,0x8a6a4a,0x6a8a8a]),x,y+.07,0);
    else if(t<.75)a('a',cyl(.09,.06,.07,8),owiPickC(R,[0x9a6a3a,0xb8a888,0x7a8a8a]),x,y+.04,0);
    else a('a',ico(.07,0),0xc8a060,x,y+.06,R()*.1-.05,0,0,0,1.2,.8,1);}}
const OWI_MESH={
  bed1(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),lin=owiPickC(R,OWI_LINEN),bl=owiPickC(R,OWI_CLOTH);
    a('a',box(w,.22,d),wd,0,.2,0);a('a',box(w-.08,.14,d-.16),0xd8c898,0,.38,.02);
    a('a',box(w,.78,.07),wd,0,.52,-d/2+.035);a('a',box(w,.4,.06),wd,0,.32,d/2-.03);
    for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.08,.12,.08),wd,sx*(w/2-.04),.06,sz*(d/2-.04));
    a('a',box(w-.16,.1,.34),lin,0,.5,-d/2+.3);a('a',box(w-.1,.07,d*.55),bl,0,.48,d*.17);a('a',box(w-.1,.05,.18),owiPickC(R,OWI_LINEN),0,.46,-d*.07);},
  bed2(a,w,d,R){OWI_MESH.bed1(a,w,d,R);a('a',box(w/2-.14,.1,.32),owiPickC(R,OWI_LINEN),-w/4+.06,.52,-d/2+.5);},
  pallet(a,w,d,R,it){const bc=owiPickC(R,OWI_CLOTH);if(it)it.bc=bc;/* (the blanket's colour: the cover over a sleeper, vilhome.js) */a('a',box(w,.1,d),0xb89a58,0,.05,0);a('a',box(w-.1,.07,d*.4),bc,0,.12,d*.2);a('a',box(w-.2,.07,.3),0xd8c898,0,.12,-d/2+.3);},
  table(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=.76;a('a',box(w,.06,d),wd,0,h,0);
    for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.07,h,.07),wd,sx*(w/2-.07),h/2,sz*(d/2-.07));
    a('a',box(w-.2,.05,.05),wd,0,.3,0);
    if(R()<.7)a('a',cyl(.09,.07,.04,8),owiPickC(R,[0xb8a888,0x8a8a8a]),(R()-.5)*(w-.6),h+.05,(R()-.5)*(d-.3));
    if(R()<.5){const cx=(R()-.5)*(w-.6);a('a',cyl(.025,.025,.1,6),0xe8dcb0,cx,h+.08,0);a('g',cone(.018,.04,5),0xffc060,cx,h+.15,0);}
    if(w>1.9&&R()<.7)a('a',cyl(.1,.08,.07,8),0xa88a5a,(R()-.5)*(w-.9),h+.07,(R()-.5)*(d-.3));},
  desk(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=.76;a('a',box(w,.05,d),wd,0,h,0);a('a',box(.45,h-.05,d-.06),wd,-w/2+.25,(h-.05)/2,0);a('a',box(.06,h-.05,d-.1),wd,w/2-.06,(h-.05)/2,0);
    a('a',box(.3,.025,.21),0xe8dcc0,.1,h+.04,.05,0,.2,0);a('a',cyl(.025,.02,.06,6),0x1a1a2a,-.1,h+.06,-.12);},
  chair(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.05,d),wd,0,.46,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.045,.46,.045),wd,sx*(w/2-.03),.23,sz*(d/2-.03));a('a',box(w,.4,.04),wd,0,.7,-d/2+.02);},
  stool(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',cyl(w/2,w/2,.05,8),wd,0,.44,0);for(let k=0;k<3;k++){const an=k*2.094;a('a',box(.045,.44,.045),wd,Math.cos(an)*w*.28,.22,Math.sin(an)*w*.28);}},
  bench(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.05,d),wd,0,.44,0);for(const sx of[-1,1])a('a',box(.06,.42,d-.06),wd,sx*(w/2-.12),.21,0);},
  chest(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,.4,d),wd,0,.2,0);a('a',box(w+.02,.12,d+.02),wd,0,.46,0);a('a',box(w-.1,.05,d-.1),wd,0,.54,0);for(const sx of[-.28,.28])a('a',box(.05,.5,d+.03),OWI_IRON,sx*w,.26,0);a('a',box(.07,.1,.03),0xc8a030,0,.4,d/2+.012);},
  shelf(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=1.8;for(const sx of[-1,1])a('a',box(.05,h,d),wd,sx*(w/2-.025),h/2,0);a('a',box(w,h,.03),owiPickC(R,OWI_DARK),0,h/2,-d/2+.015);
    for(let k=0;k<5;k++){const y=.15+k*.4;a('a',box(w-.04,.04,d),wd,0,y,0);if(k<4)owiShelfStuff(a,R,w-.12,d,y+.02,1+Math.floor(R()*3));}},
  cupboard(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=1.75;a('a',box(w,h,d-.04),wd,0,h/2,-.02);a('a',box(w+.06,.06,d),owiPickC(R,OWI_DARK),0,h+.03,0);a('a',box(w/2-.04,h-.3,.03),owiPickC(R,OWI_DARK),-w/4,h/2+.05,d/2-.005);a('a',box(w/2-.04,h-.3,.03),owiPickC(R,OWI_DARK),w/4,h/2+.05,d/2-.005);a('a',box(.03,.12,.03),0xc8a030,-.05,h/2,d/2+.015);a('a',box(.03,.12,.03),0xc8a030,.05,h/2,d/2+.015);},
  wardrobe(a,w,d,R){OWI_MESH.cupboard(a,w,d,R);a('a',box(w+.1,.1,d+.04),owiPickC(R,OWI_DARK),0,1.9,0);},
  barrel(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),r=w/2;a('a',cyl(r*.92,r*.92,.82,10),wd,0,.41,0);a('a',cyl(r,r,.5,10),wd,0,.41,0);for(const y of[.14,.68])a('a',cyl(r*.95,r*.95,.04,10),OWI_IRON,0,y,0);a('a',cyl(r*.97,r*.97,.04,10),OWI_IRON,0,.41,0);a('a',cyl(r*.86,r*.86,.03,10),0x4a321f,0,.84,0);},
  crate(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',box(w,w,d),wd,0,w/2,0);for(let k=0;k<3;k++)a('a',box(w+.02,.04,d+.02),owiPickC(R,OWI_DARK),0,.1+k*.17,0);for(const sx of[-1,1])a('a',box(.04,w+.02,d+.02),owiPickC(R,OWI_DARK),sx*(w/2-.03),w/2,0);},
  sacks(a,w,d,R){for(let k=0;k<3;k++)a('a',ico(.26,0),owiPickC(R,[0xcdbf9c,0xb8a47a,0xd8cdb0]),-w/2+.28+k*.26,.23+(k===1?.17:0),(R()-.5)*.1,R()*.4,R()*3,0,1,.8,.85);},
  hearth(a,w,d,R,it){const st=owiPickC(R,OWI_STONE),H=Math.min(2.6,((it&&it.ceil)||2.6)-.15);a('a',box(w,.12,d),st,0,.06,0);for(const sx of[-1,1])a('a',box(.34,1.2,d),st,sx*(w/2-.17),.72,0);a('a',box(w,.22,d+.08),0x6a665e,0,1.38,0);a('a',box(w-.2,H-1.4,d-.14),st,0,1.4+(H-1.4)/2,-.04);
    a('a',box(w-.64,1.08,d-.1),0x1c1816,0,.66,-.04);a('a',box(w-.7,.1,d-.2),0x2a2420,0,.17,-.03);
    a('a',cyl(.025,.025,w-.8,6),OWI_IRON,0,1.0,.03,0,0,Math.PI/2);a('a',box(.3,.2,.2),OWI_IRON,.15,.82,.03);
    for(let k=0;k<3;k++)a('a',cyl(.05,.05,w*.4,6),0x4a3220,(k-1)*.14,.24+k*.02,0,0,0,Math.PI/2+(k-1)*.12);
    a('g',cone(.2,.42,6),0xff7a20,-.1,.45,-.02);a('g',cone(.16,.32,6),0xffb040,.12,.4,0);a('g',cone(.1,.24,5),0xffe080,0,.4,.04);},
  hearthS(a,w,d,R,it){OWI_MESH.hearth(a,w,d,R,it);},
  firepit(a,w,d,R){for(let k=0;k<10;k++){const an=k/10*6.283;a('a',box(.2,.14,.16),owiPickC(R,OWI_STONE),Math.cos(an)*.42,.07,Math.sin(an)*.42,0,-an,0);}
    for(let k=0;k<3;k++)a('a',cyl(.04,.04,.55,5),0x4a3220,0,.27,0,(k-1)*.35,k*2,0);a('g',cone(.2,.4,6),0xff7a20,0,.32,0);a('g',cone(.12,.3,5),0xffd070,0,.3,.03);
    for(let k=0;k<3;k++){const an=k*2.094;a('a',cyl(.018,.018,1.1,5),OWI_IRON,Math.cos(an)*.2,.66,Math.sin(an)*.2,Math.sin(an)*.42,0,-Math.cos(an)*.42);}a('a',cyl(.16,.14,.18,8),OWI_IRON,0,.76,0);},
  stove(a,w,d,R){const st=owiPickC(R,OWI_STONE);a('a',box(w,.8,d),st,0,.4,0);a('a',box(w+.04,.06,d+.04),OWI_IRON,0,.83,0);a('a',box(w*.5,.45,.04),0x1c1816,-.15,.4,d/2+.005);a('g',cone(.08,.2,5),0xff8a30,-.15,.25,d/2-.04);
    a('a',cyl(.14,.12,.18,8),OWI_IRON,-.25,.95,0);a('a',cyl(.11,.1,.14,8),0x8a5a2a,.2,.93,.05);a('a',cyl(.07,.07,1.3,6),OWI_IRON,w/2-.15,1.5,-d/2+.12);a('a',box(.3,.2,.2),st,w/2-.15,2.3,-d/2+.1);},
  worktable(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=.82;a('a',box(w,.08,d),wd,0,h,0);for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.09,h,.09),wd,sx*(w/2-.08),h/2,sz*(d/2-.08));a('a',box(w-.2,.06,d-.2),owiPickC(R,OWI_DARK),0,.28,0);
    a('a',box(.34,.02,.24),0xe8dcc0,-.3,h+.05,.05,0,.15,0);a('a',cyl(.04,.035,.09,6),0x1a1a2a,.1,h+.09,-.18);a('a',cyl(.012,.012,.2,4),0xf0f0e8,.12,h+.2,-.18,.3,0,.3);
    a('a',cyl(.11,.08,.09,8),0x8a8a8a,.5,h+.09,.1);a('a',box(.18,.06,.1),0x8a5a2a,.28,h+.07,.2,0,.5,0);a('a',cyl(.025,.025,.3,6),0xc8c8c8,-.55,h+.06,-.15,0,0,Math.PI/2);},
  wheel(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);a('a',box(.5,.06,.55),wd,0,.45,0);for(const sx of[-1,1])a('a',box(.05,.5,.05),wd,sx*.2,.25,0,0,0,sx*.2);
    a('a',cyl(.3,.3,.04,14),wd,0,.72,-.08,Math.PI/2,0,0);a('a',cyl(.26,.26,.05,14),0x4a321f,0,.72,-.08,Math.PI/2,0,0);a('a',cyl(.04,.04,.1,6),OWI_IRON,0,.72,-.08,Math.PI/2,0,0);a('a',cyl(.025,.025,.5,5),wd,.1,.9,.2,.3,0,0);a('a',ico(.1,0),0xe8e0d0,.1,1.1,.25,0,0,0,1,1,1.4);},
  kegrack(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=1.5;for(const sx of[-1,1])a('a',box(.06,h,d),wd,sx*(w/2-.03),h/2,0);
    for(let r=0;r<3;r++){const y=.08+r*.5;a('a',box(w,.05,d),wd,0,y,0);if(r<2)for(let k=0;k<3;k++){const x=-w/2+.28+k*(w-.56)/2;
      a('a',cyl(.19,.19,.42,10),owiPickC(R,[0x6b4a2c,0x7a5736]),x,y+.22,0,Math.PI/2,0,0);a('a',cyl(.19,.19,.04,10),OWI_IRON,x,y+.22,d/2-.07,Math.PI/2,0,0);a('a',box(.04,.04,.06),0xc8a030,x,y+.2,d/2+.03);}}},
  rack(a,w,d,R){const wd=owiPickC(R,OWI_WOOD);for(const sx of[-1,1])a('a',box(.06,.85,d),wd,sx*(w/2-.03),.42,0);
    for(let r=0;r<3;r++){const y=.18+r*.26,dd=d-r*.14;a('a',box(w-.04,.04,dd),wd,0,y,-d/2+dd/2);
      for(let k=0;k<6;k++){const x=-w/2+.14+k*(w-.28)/5;a('a',cyl(.034,.034,.34,8),owiPickC(R,OWI_PARCH),x,y+.06,-d/2+dd/2+.02,Math.PI/2,0,0);a('a',cyl(.038,.038,.025,8),owiPickC(R,OWI_RIB),x,y+.06,-d/2+dd/2+.2,Math.PI/2,0,0);}}},
  cubby(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=2.0,cols=4,rows=5,cw=(w-.08)/cols,ch=(h-.08)/rows;a('a',box(w,h,.03),owiPickC(R,OWI_DARK),0,h/2,-d/2+.015);
    for(let i=0;i<=cols;i++)a('a',box(.03,h,d),wd,-w/2+.02+i*cw,h/2,0);for(let j=0;j<=rows;j++)a('a',box(w,.03,d),wd,0,.02+j*ch,0);
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){if(R()<.18)continue;const n=1+Math.floor(R()*2);for(let q=0;q<n;q++){const x=-w/2+.02+(i+.5)*cw+(q-.5*(n-1))*.07,y=.04+j*ch+.07;a('a',cyl(.03,.03,d-.08,7),owiPickC(R,OWI_PARCH),x,y,0,Math.PI/2,0,0);a('a',cyl(.034,.034,.02,7),owiPickC(R,OWI_RIB),x,y,d/2-.05,Math.PI/2,0,0);}}},
  orb(a,w,d,R){const st=owiPickC(R,OWI_STONE);a('a',cyl(.2,.26,.12,8),st,0,.06,0);a('a',cyl(.09,.14,.9,8),st,0,.57,0);a('a',cyl(.2,.1,.1,8),st,0,1.07,0);a('g',ico(.14,1),owiPickC(R,[0x8ab8ff,0xb08aff,0x8affd8]),0,1.26,0);a('g',oct(.2),0x6a8aff,0,1.26,0,0,.6,0,.7,.7,.7);},
  counter(a,w,d,R){const wd=owiPickC(R,OWI_WOOD),h=1.04;a('a',box(w,h-.06,d-.06),owiPickC(R,OWI_DARK),0,(h-.06)/2,-.01);a('a',box(w+.1,.07,d+.1),wd,0,h-.03,0);
    for(let k=0;k<Math.floor(w/.6);k++)a('a',box(.5,h-.35,.03),wd,-w/2+.35+k*.6,(h-.1)/2+.05,d/2-.02);
    const props=[x=>a('a',cyl(.1,.1,.18,8),0x8a6a4a,x,h+.1,0),x=>a('a',box(.34,.025,.24),0xe8dcc0,x,h+.04,0,0,R()-.5,0),
      x=>{a('a',box(.04,.03,.2),OWI_IRON,x,h+.07,0);a('a',box(.2,.02,.03),OWI_IRON,x,h+.12,0);a('a',cyl(.06,.05,.012,8),0xc8a030,x-.1,h+.06,0);a('a',cyl(.06,.05,.012,8),0xc8a030,x+.1,h+.06,0);},
      x=>{a('a',cyl(.03,.03,.1,6),0xe8dcb0,x,h+.09,0);a('g',cone(.02,.05,5),0xffc060,x,h+.17,0);},x=>a('a',cyl(.05,.04,.12,6),0x4a8a5a,x,h+.1,0)];
    const n=Math.min(5,Math.floor(w/.7));for(let k=0;k<n;k++)props[Math.floor(R()*props.length)](-w/2+.35+k*(w-.7)/Math.max(1,n-1));},
  rug(a,w,d,R){const c=owiPickC(R,OWI_CLOTH),c2=owiPickC(R,[0xd8c890,0x2a2a3a,0xe8dcc0]);a('a',box(w,.014,d),c,0,.008,0);a('a',box(w-.18,.018,d-.18),c2,0,.01,0);a('a',box(w-.4,.02,d-.4),c,0,.012,0);},
  deco_tapestry(a,w,d,R){const c=owiPickC(R,OWI_CLOTH);a('a',box(.62,1.1,.025),c,0,1.45,0);a('a',box(.52,.04,.03),0xc8a030,0,1.5,.005);a('a',box(.14,.14,.03),0xe0c060,0,1.2,.008,0,0,.785);a('a',cyl(.025,.025,.74,6),0x3f2b1a,0,2.02,.02,0,0,Math.PI/2);},
  deco_plates(a,w,d,R){a('a',box(.9,.04,.12),owiPickC(R,OWI_WOOD),0,1.55,.05);for(let k=0;k<3;k++)a('a',cyl(.12,.12,.025,10),owiPickC(R,[0xe8e0d0,0x8a9ab0,0xc88a5a]),-.28+k*.28,1.74,.03,Math.PI/2,0,0);},
  deco_herbs(a,w,d,R){a('a',box(.7,.03,.03),0x3f2b1a,0,1.85,.015);for(let k=0;k<6;k++){const x=-.28+k*.11;a('a',cone(.05,.34,5),owiPickC(R,[0x6a8a3a,0x8a9a3a,0xa8884a,0x7a6a3a]),x,1.66,.03,3.14,0,0);}},
  deco_map(a,w,d,R){a('a',box(.78,.56,.02),0xd8c890,0,1.45,0);a('a',box(.82,.04,.03),0x3f2b1a,0,1.74,0);a('a',box(.82,.04,.03),0x3f2b1a,0,1.16,0);a('a',box(.26,.18,.025),0x7a9a6a,-.15,1.5,.01);a('a',box(.18,.14,.025),0x8aaac8,.2,1.4,.01);},
  deco_antlers(a,w,d,R){a('a',box(.34,.28,.05),0x6b4a2c,0,1.8,0);for(const s of[-1,1]){a('a',cyl(.018,.018,.44,5),0xe0d6bc,s*.22,2.0,.1,0,0,s*.7);a('a',cyl(.014,.014,.26,5),0xe0d6bc,s*.34,2.1,.1,0,0,s*.2);a('a',cyl(.014,.014,.22,5),0xe0d6bc,s*.14,2.08,.1,0,0,-s*.4);}}
};
/* put one furniture piece into a kit builder (keys 'a' and 'g'); y0 is the floor height in the building frame */
const owiCasts=it=>!it.deco&&!(it.spec&&it.spec.flat)&&!/^deco_/.test(it.kind);
/* Two boxes of a piece of furniture that join (a leg under a seat, a board against a post, a plinth under a body) very often have a face in the same plane: the two are drawn on top of each other where they overlap, and the pixels flicker between
   them (z-fighting). While a piece is built, the planes of the faces of its axis-aligned boxes are written down (axis, which way the face looks, where it is); when a box has a face in a plane that an earlier box already has, that face is moved
   inwards by 0.6 mm for every box that has been there (never more than 4 % of the box): of two faces that were in one plane the later one is behind the earlier. The boxes keep overlapping at their joints; nothing is cut open. Boxes that are turned by something
   other than a quarter turn, and every other kind of part, are left as they are. */
function owiDeFight(planes,P,x,y,z,ry){const q=Math.round((ry||0)/(Math.PI/2)),odd=Math.abs(q)%2===1;if(Math.abs((ry||0)-q*Math.PI/2)>1e-3)return null;
  const he=[(odd?P.depth:P.width)/2,P.height/2,(odd?P.width:P.depth)/2],c=[x,y,z],lo=[],hi=[];
  for(let a=0;a<3;a++){lo[a]=c[a]-he[a];hi[a]=c[a]+he[a];}
  for(let a=0;a<3;a++){const mx=Math.max(.0004,Math.min(.04*(hi[a]-lo[a]),.02));
    for(const sg of[1,-1]){const pos=sg>0?hi[a]:lo[a],kk=Math.round(pos*4000),pre=a*2+(sg>0?1:0)+':',key=pre+kk,n=(planes.get(key)||0)+(planes.get(pre+(kk-1))||0)+(planes.get(pre+(kk+1))||0);planes.set(key,(planes.get(key)||0)+1);if(n){const d=Math.min(mx,.0006*n);if(sg>0)hi[a]-=d;else lo[a]+=d;}}}
  const nc=[0,1,2].map(a=>(lo[a]+hi[a])/2),ne=[0,1,2].map(a=>(hi[a]-lo[a])/2);
  /* back to the box's own axes: scale factors against its size and the new centre */
  const sw=(odd?ne[2]:ne[0])*2/P.width,sh=ne[1]*2/P.height,sd=(odd?ne[0]:ne[2])*2/P.depth;return{x:nc[0],y:nc[1],z:nc[2],sx:sw,sy:sh,sz:sd};}
function owiAddItem(kb,it,y0){const m=new THREE.Matrix4().compose(new THREE.Vector3(it.x,y0,it.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),it.rot),new THREE.Vector3(1,1,1)),e=new THREE.Euler(),q=new THREE.Quaternion(),v=new THREE.Vector3(),s=new THREE.Vector3(),pm=new THREE.Matrix4();
  /* furniture that stands on the floor casts shadows: its lit parts go to layer 'c' (a mesh of their own that casts, geo.js); rugs, wall hangings and the glowing parts stay in the interior mesh */
  const cast=owiCasts(it);
  const planes=new Map();const a=(key,geo,col,x,y,z,rx,ry,rz,sx,sy,sz)=>{let tag=null;if(key[0]==='b'){/* the made bedding of a bed or of a half of a double bed (furniture4.js): drawn as the bed is, and remembered (geo.js ic.bedR) so that a sleeper's own covers can take its place */tag={it,side:key==='bL'?-1:key==='bR'?1:0};key='a';}if(cast&&key==='a')key='c';if(geo.type==='BoxGeometry'&&sx==null&&sy==null&&sz==null&&!rx&&!rz){const f=owiDeFight(planes,geo.parameters,x||0,y||0,z||0,ry||0);if(f){x=f.x;y=f.y;z=f.z;sx=f.sx;sy=f.sy;sz=f.sz;}}e.set(rx||0,ry||0,rz||0);q.setFromEuler(e);v.set(x||0,y||0,z||0);s.set(sx||1,sy==null?(sx||1):sy,sz==null?(sx||1):sz);pm.compose(v,q,s);(kb.B[key]||(kb.B[key]=[])).push({geo,col,m:new THREE.Matrix4().multiplyMatrices(m,pm),tag});};
  const f=OWI_MESH[it.kind]||OWI_MESH[it.kind.replace(/[SLWX]+$/,'')];if(!f)return false;
  const R=mulberry(it.seed|0),sp=it.spec;f(a,sp.w,sp.d,R,it);return true;}

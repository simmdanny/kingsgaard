/* =====================================================================================================================
   KINGSGAARD INTERIORS (5c/8): wardrobes, tables and fireplaces, drawn with their construction.
   Same conventions as furniture.js (origin at the middle of the footprint on the floor, +z is the front, y up, metres, `a` = the part adder) and the same palettes; the pieces here replace the plainer ones.
   What a piece is made for decides how it is made: it.bk is the kind of building and it.rk the kind of room it stands in (set where the interior is built), it.tier the wealth of the house.
   Everything is boxes and a few cylinders: boards with seams between them, frames with panels let into them, hinges and handles of iron, stone in courses with mortar between them.
   ===================================================================================================================== */
/* a board top: boards (grain along x) laid side by side, each its own shade, with a dark gap between them showing the frame below; a few scratches and a wear stain on top. y is the middle of the top, t its thickness */
function owiBoardTop(a,w,d,y,t,R,wd,it,opt){opt=opt||{};const n=Math.max(2,Math.round(d/(opt.bw||.19))),bw=d/n;
  a('a',box(w-.02,t-.012,d-.02),0x2a1a10,0,y-.004,0);
  for(let k=0;k<n;k++)a('a',box(w,t,bw-.007),owiWear(R,wd),0,y,-d/2+(k+.5)*bw);
  if(owiKeep(it,!(it&&it.lod))){const dk=owiWear(R,0x3a2818);for(let k=0;k<(opt.scr==null?4:opt.scr);k++)a('a',box(.08+R()*.2,.003,.01+R()*.008),dk,(R()-.5)*(w-.4),y+t/2+.0012,(R()-.5)*(d-.15),0,R()*3.1,0);
    if(R()<(opt.stain==null?.5:opt.stain))a('a',cyl(.05+R()*.05,.05+R()*.05,.003,8),0x3a2a1c,(R()-.5)*(w-.4),y+t/2+.0015,(R()-.5)*(d-.2));}}
/* an iron strap with a nail head at each end: lies on the face of a door or a lid */
function owiStrap(a,len,x,y,z,vertical,col){const c=col||OWI_IRON;if(vertical){a('a',box(.026,len,.008),c,x,y,z);a('a',box(.04,.04,.01),c,x,y+len/2,z);}else{a('a',box(len,.026,.008),c,x,y,z);a('a',box(.04,.04,.01),c,x+len/2-.01,y,z);}}
Object.assign(OWI_MESH,{
  /* ---------------------------------------------------------------- wardrobes: a plinth on feet, a carcass with a back and a top board, two doors, hinges and pulls */
  wardrobe(a,w,d,R,it){const poor=owiPoor(it),rich=owiRich(it),v=owiVar(R,[1,rich?1.3:.5,poor?.1:.7]),wd=owiWear(R,owiPickC(R,OWI_WOOD)),wd2=owiWear(R,wd),dk=owiPickC(R,OWI_DARK),
      H=Math.min(1.78+R()*.28+(rich?.1:0),((it&&it.ceil)||2.6)-.3),fy=.09,pl=.04,dc=d-.05,Zf=d/2-.05,tb=.05,bodyH=H-fy-tb,open=v===2,keep=owiKeep(it,true);/* Zf: the front of the carcass; the doors are .05 thick in front of it */
    /* four feet and a plinth board between them */
    for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.07,fy+.01,.07),dk,sx*(w/2-.05),(fy+.01)/2,sz*(d/2-.07));
    a('a',box(w-.16,.07,.03),dk,0,.055,Zf-.01);
    /* the carcass: two side panels (a seam in each), a back, a bottom board, a top board that overhangs a little */
    for(const sx of[-1,1]){a('a',box(pl,bodyH,dc),wd,sx*(w/2-pl/2),fy+bodyH/2,-.025);if(keep)a('a',box(.006,bodyH-.04,.02),0x2a1a10,sx*(w/2+.001),fy+bodyH/2,.02);}
    a('a',box(w-2*pl+.004,bodyH,.03),dk,0,fy+bodyH/2,-d/2+.015);a('a',box(w-2*pl,.035,dc-.03),wd2,0,fy+.0175,-.04);
    if(!open)a('a',box(w-2*pl,bodyH-.04,dc-.06),0x24180f,0,fy+bodyH/2+.02,-.045);/* the dark inside, seen through any gap */
    a('a',box(w+.02,tb,d+.01),wd2,0,H-tb/2,0);
    if(v===1||rich){a('a',box(w+.0,.05,.03),dk,0,H-tb-.025,Zf+.02);a('a',box(w-.06,.035,.03),dk,0,H-tb-.07,Zf+.02);}/* a cornice under the top */
    const dw=(w-2*pl-.012)/2,dh=bodyH-.03,dy=fy+bodyH/2;
    const door=(sgn,swung)=>{const cx=sgn*(dw/2+.003);let X=cx,Z=0,rot=0,box2=(ww,hh,tt,x,y,z,c)=>a('a',box(ww,hh,tt),c,cx+x,dy+y,Zf+z);
      if(swung){/* swung out about its outer edge: a plain plank door held by two ledges; the hinge is at the outer end */
        const th=1.2,hx=sgn*(w/2-pl-.004),dirx=-sgn*Math.cos(th),dirz=Math.sin(th),ph=Math.atan2(-dirz,dirx),cxs=hx+dirx*dw/2,czs=Zf+.0175+dirz*dw/2;
        a('a',box(dw,dh,.035),wd,cxs,dy,czs,0,ph,0);a('a',box(dw-.05,.07,.014),dk,cxs+dirx*0,dy+dh*.3,czs,0,ph,0);a('a',box(dw-.05,.07,.014),dk,cxs,dy-dh*.3,czs,0,ph,0);return;}
      if(v===1){/* a frame with two raised panels let into it */
        box2(dw,dh,.03,0,0,.015,dk);for(const[oy,hh]of[[-dh*.2,dh*.52],[dh*.33,dh*.24]])box2(dw-.12,hh,.02,0,oy,.04,wd2);
        box2(.04,dh*.94,.03,sgn*(dw/2-.025),0,.045,wd);box2(.04,dh*.94,.03,-sgn*(dw/2-.025),0,.045,wd);box2(dw-.06,.05,.03,0,dh/2-.035,.045,wd);box2(dw-.06,.06,.03,0,-dh/2+.045,.045,wd);box2(dw-.06,.04,.03,0,dh*.1,.045,wd);
        for(const oy of[.3,-.3])a('a',box(.022,.07,.008),0xc8a030,sgn*(w/2-pl-.006),dy+dh*oy,Zf+.052);}
      else{/* three boards with a seam between them, two ledges across, two strap hinges */
        const n=3,bw=dw/n;for(let k=0;k<n;k++)box2(bw-.004,dh,.035,-dw/2+(k+.5)*bw,0,.0175,k===1?wd2:wd);
        for(const fy2 of[.2,.78])box2(dw-.05,.07,.014,0,-dh/2+dh*fy2,.042,dk);
        for(const fy2 of[.2,.78])owiStrap(a,dw*.8,cx-sgn*.03,dy-dh/2+dh*fy2,Zf+.053,false);}
      /* the pull at the meeting stile: an iron ring on a plate (plain), a turned knob on a rose (better) */
      const hx=sgn*.04,hy=dy+.02;
      if(v!==1){a('a',box(.045,.1,.012),OWI_IRON,hx,hy,Zf+.054);a('a',cyl(.018,.018,.012,6),OWI_IRON,hx,hy-.05,Zf+.066,Math.PI/2,0,0);}
      else{a('a',cyl(.04,.04,.008,8),0xb89028,hx,hy,Zf+.054,Math.PI/2,0,0);a('a',cyl(.022,.016,.03,6),0xc8a030,hx,hy,Zf+.07,Math.PI/2,0,0);}
      if(keep)a('a',box(.1,.2,.004),0x3a2818,sgn*.075,hy,Zf+(v===1?.0525:.0515));/* the dark of a hand: the wood is worn round the pull */};
    door(-1,false);door(1,open);
    a('a',box(.006,bodyH-.04,.012),0x1a1008,0,fy+bodyH/2,Zf+.03);/* the gap between the doors */
    if(open){/* the inside: two shelves on the right, a rail with hanging cloth on the left */
      for(const y of[.38,.7])a('a',box(w/2-pl-.01,.025,dc-.08),wd2,w/4-.005,fy+bodyH*y,-.04);
      a('a',cyl(.014,.014,w/2-pl-.04,5),OWI_IRON,-w/4+.005,fy+bodyH-.12,-.04,0,0,Math.PI/2);
      for(let k=0;k<3;k++){const c=owiPickC(R,OWI_CLOTH);a('a',box(.1,bodyH*.55,.035),c,-w/2+pl+.08+k*.11,fy+bodyH-.12-bodyH*.275,-.04+(k%2)*.02);}
      for(const y of[.38,.7])a('a',box(.2,.07,.12),owiPickC(R,OWI_LINEN),w/4+.05,fy+bodyH*y+.05,-.06);}
    /* a small drawer under the doors of a better wardrobe */
    if(rich&&bodyH>1.5){a('a',box(w-2*pl-.04,.14,.03),wd2,0,fy+.1,Zf+.015);a('a',cyl(.014,.014,.02,6),0xc8a030,0,fy+.1,Zf+.04,Math.PI/2,0,0);}},
  /* ---------------------------------------------------------------- tables: made for what they are used for */
  table(a,w,d,R,it){const poor=owiPoor(it),rich=owiRich(it),bk=(it&&it.bk)||'',rk=(it&&it.rk)||'',h=.76,wd=owiWear(R,owiPickC(R,OWI_WOOD)),dk=owiPickC(R,OWI_DARK);
    const work=/kitchen|pantry|workshop|forgeRoom|carpRoom|storeroom/.test(rk),inn=bk==='tavern'||rk==='common',side=rk==='bedroom'||rk==='study'||(w<=1.0&&d<=.72);
    let v;if(work)v=owiVar(R,[0,0,0,1,0,0]);else if(inn)v=owiVar(R,[0,1,0,0,0,0]);else if(side)v=owiVar(R,[0,0,1,0,.5,0]);else v=owiVar(R,[poor?1:.4,.7,.3,0,rich?.6:.2,rich?1.4:.5]);
    if(v===0){/* trestle table: boards on two trestles, a stretcher through the legs with its wedges showing */
      owiBoardTop(a,w,d,h,.045,R,wd,it);for(const sx of[-1,1]){const x=sx*(w/2-.26);a('a',box(.07,h-.03,.07),dk,x-.1*sx,(h-.03)/2,-d*.3,0,0,sx*.08);a('a',box(.07,h-.03,.07),dk,x-.1*sx,(h-.03)/2,d*.3,0,0,sx*.08);a('a',box(.09,.06,d*.78),dk,x,h-.06,0);a('a',box(.09,.05,d*.8),dk,x-.1*sx,.04,0);}
      a('a',box(w-.4,.05,.06),wd,0,.3,0);for(const sx of[-1,1])a('a',box(.05,.12,.02),dk,sx*(w/2-.26)-.1*sx,.3,.05);}
    else if(v===1){/* an inn table: a thick top on two A-frames with a long stretcher; seen from the end the legs splay */
      owiBoardTop(a,w,d,h,.055,R,wd,it,{bw:.24});for(const sx of[-1,1]){const x=sx*(w/2-.3);for(const sz of[-1,1])a('a',box(.075,h-.03,.075),dk,x,(h-.03)/2,sz*(d/2-.12),0,0,0);a('a',box(.085,.09,d-.1),dk,x,h-.09,0);a('a',box(.07,.05,d-.12),dk,x,.22,0);}
      a('a',box(w-.55,.07,.05),wd,0,.26,0);for(const sx of[-1,1])a('a',box(.03,.12,.07),0xb89a68,sx*(w/2-.3)+sx*.09,.26,0);/* wedges through the tenons */}
    else if(v===2){/* a small table of a bedroom: a thin top, an apron with a drawer, four turned legs */
      a('a',box(w,.04,d),wd,0,h-.02,0);a('a',box(w+.02,.012,d+.02),dk,0,h-.046,0);a('a',box(w-.1,.11,d-.1),dk,0,h-.1,0);a('a',box(w*.4,.09,.025),owiWear(R,wd),0,h-.1,d/2-.04);a('a',cyl(.014,.014,.02,6),0xc8a030,0,h-.1,d/2-.02,Math.PI/2,0,0);
      for(const sx of[-1,1])for(const sz of[-1,1]){a('a',cyl(.025,.04,h-.14,7),wd,sx*(w/2-.07),(h-.14)/2,sz*(d/2-.07));a('a',cyl(.045,.045,.03,7),dk,sx*(w/2-.07),.3,sz*(d/2-.07));}
      if(R()<.6)a('a',cyl(.07,.06,.09,8),owiPickC(R,[0xa88a5a,0x8a8a8a,0xb8a888]),(R()-.5)*(w-.3),h+.045,(R()-.5)*(d-.2));if(R()<.5){a('a',cyl(.022,.022,.1,6),0xe8dcb0,(R()-.5)*(w-.3),h+.05,0);a('g',cone(.016,.04,5),0xffc060,(R()-.5)*(w-.3),h+.12,0);}}
    else if(v===3){/* a work table: heavy planks, stout square legs, an apron, a low shelf and a stretcher; marked by knives */
      const t=.075,hw=.82;owiBoardTop(a,w,d,hw,t,R,wd,it,{bw:.21,scr:7,stain:.9});for(const sx of[-1,1])for(const sz of[-1,1])a('a',box(.1,hw-t/2,.1),dk,sx*(w/2-.08),(hw-t/2)/2,sz*(d/2-.08));
      a('a',box(w-.2,.1,.04),dk,0,hw-.1,d/2-.08);a('a',box(w-.2,.1,.04),dk,0,hw-.1,-d/2+.08);for(const sx of[-1,1])a('a',box(.04,.1,d-.2),dk,sx*(w/2-.08),hw-.1,0);
      a('a',box(w-.2,.04,d-.16),wd,0,.26,0);a('a',box(w-.2,.05,.05),dk,0,.18,0);for(const sx of[-1,1])a('a',box(.1,.1,.04),OWI_IRON,sx*(w/2-.08),hw-.07,d/2-.06);}
    else if(v===4){/* a round table on a turned pedestal with three feet */
      const r=Math.min(w,d)/2;a('a',cyl(r,r,.05,10),wd,0,h,0);a('a',cyl(r*1.02,r*1.02,.02,10),dk,0,h-.035,0);a('a',cyl(.07,.1,.5,8),wd,0,.3,0);a('a',cyl(.11,.07,.09,8),dk,0,.58,0);a('a',cyl(.08,.08,.18,8),wd,0,h-.12,0);
      for(let k=0;k<3;k++){const an=k*2.094;a('a',box(.07,.06,r*.9),dk,Math.sin(an)*r*.38,.03,Math.cos(an)*r*.38,0,an,0);a('a',box(.05,.05,.12),wd,Math.sin(an)*r*.78,.045,Math.cos(an)*r*.78,0,an,0);}
      if(R()<.7)a('a',cyl(.08,.065,.1,8),owiPickC(R,[0xb8a888,0x8a8a8a]),(R()-.5)*r,h+.075,(R()-.5)*r);}
    else{/* a good table: a thick top with a moulded edge, an apron with carved blocks, turned legs on feet, a stretcher, a cloth runner with a border and a jug */
      const t=.07;owiBoardTop(a,w,d,h,t,R,wd,it,{bw:.26,scr:2,stain:.2});a('a',box(w+.04,.025,d+.04),dk,0,h-t/2-.012,0);a('a',box(w-.16,.12,.035),wd,0,h-.12,d/2-.1);a('a',box(w-.16,.12,.035),wd,0,h-.12,-d/2+.1);
      for(const sx of[-1,1])a('a',box(.035,.12,d-.2),wd,sx*(w/2-.1),h-.12,0);
      for(let k=0;k<Math.max(2,Math.round((w-.3)/.28));k++){const n=Math.max(2,Math.round((w-.3)/.28)),x=-(w-.3)/2+k*(w-.3)/(n-1);a('a',box(.07,.07,.01),dk,x,h-.12,d/2-.08);}
      for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*(w/2-.09),z=sz*(d/2-.09);a('a',box(.11,.07,.11),dk,x,.035,z);a('a',cyl(.04,.055,h-.2,7),wd,x,.07+(h-.2)/2,z);a('a',box(.1,.1,.1),dk,x,h-.17,z);}
      a('a',box(w-.3,.045,.05),wd,0,.22,0);
      const c=owiPickC(R,OWI_CLOTH);a('a',box(w*.75,.01,d*.44),c,0,h+t/2+.005,0);a('a',box(w*.75+.02,.012,.025),0xe8c050,0,h+t/2+.006,d*.22);a('a',box(w*.75+.02,.012,.025),0xe8c050,0,h+t/2+.006,-d*.22);
      a('a',cyl(.05,.07,.18,8),0xb8a888,(R()-.5)*w*.4,h+t/2+.1,0);a('a',cyl(.04,.04,.08,6),0xa8a8a8,(R()-.5)*w*.4+.2,h+t/2+.045,.05);}
    if(owiKeep(it,true)&&v!==3&&v!==5){if(R()<.65)a('a',cyl(.09,.07,.04,8),owiPickC(R,[0xb8a888,0x8a8a8a,0xa88a5a]),(R()-.5)*(w-.6),h+.06,(R()-.5)*(d-.3));
      if(R()<.4&&v!==2){const cx=(R()-.5)*(w-.6);a('a',cyl(.025,.025,.1,6),0xe8dcb0,cx,h+.08,0);a('g',cone(.018,.04,5),0xffc060,cx,h+.15,0);}}},
  /* the work table of a kitchen or a workshop (its own kind): the same heavy construction with tools on it */
  worktable(a,w,d,R,it){OWI_MESH.table(a,w,d,R,Object.assign({},it||{},{rk:'workshop'}));const h=.82;
    a('a',box(.34,.02,.24),0xe8dcc0,-.3,h+.05,.05,0,.15,0);a('a',cyl(.04,.035,.09,6),0x1a1a2a,.1,h+.09,-.18);a('a',cyl(.012,.012,.2,4),0xf0f0e8,.12,h+.2,-.18,.3,0,.3);
    a('a',cyl(.11,.08,.09,8),0x8a8a8a,.5,h+.09,.1);a('a',box(.18,.06,.1),0x8a5a2a,.28,h+.07,.2,0,.5,0);a('a',cyl(.025,.025,.3,6),0xc8c8c8,-.55,h+.06,-.15,0,0,Math.PI/2);},
  /* ---------------------------------------------------------------- fireplaces: a hearth slab, jambs in courses, a lintel, a breast that narrows into the flue, a sooted firebox, andirons, logs, a crane and a pot */
  hearth(a,w,d,R,it){const t=(it&&it.tier)||3,poor=t<=2,rich=t>=4,H=Math.min(2.75,((it&&it.ceil)||2.6)-.02),v=owiVar(R,[poor?1.3:.5,1,rich?1.2:.3]),
      st=owiPickC(R,OWI_STONE),brick=v===2&&R()<.6,oh=poor?.92:1.02,jw=v===0?.4:.34,ow=w-2*jw,mort=0x4a4640;
    const blk=()=>brick?owiWear(R,owiPickC(R,[0x9a5a44,0x8a4e3a,0xa6644a,0x7a4a38])):owiWear(R,st);
    /* the hearth slab reaches out in front of the firebox */
    a('a',box(w+.04,.07,d+.2),owiWear(R,st),0,.035,.1);a('a',box(ow,.03,d-.1),0x2a2420,0,.085,-.04);
    /* jambs: five courses each, the joints running the other way in every other course, dark mortar between and behind */
    for(const sx of[-1,1]){const x=sx*(w/2-jw/2);a('a',box(jw-.07,oh,d-.12),mort,x,.07+oh/2,-.04);/* (it stands back from every face of the courses: 2 cm in from the sides and the back, 10 cm from the front, so that no face of it shares a plane with theirs) */
      const nc=poor?4:5,ch=oh/nc;for(let k=0;k<nc;k++){const off=(k%2?.03:-.03)*sx,bw=jw-(k%2?.05:0);a('a',box(bw,ch-.014,d),blk(),x+off*.5,.07+(k+.5)*ch,0);}}
    /* the lintel: an oak beam in a plain house, stone with a keystone in a better one; and the mantel shelf of a good fireplace */
    const ly=.07+oh+.1;
    if(v===0){a('a',box(w+.06,.22,d+.06),owiPickC(R,OWI_DARK),0,ly,0.01);for(const sx of[-1,1])a('a',box(.05,.05,.03),0x6a5a40,sx*(w/2-.12),ly,d/2+.04);}
    else{a('a',box(w,.2,d+.04),owiWear(R,st),0,ly,.02);if(v===2){a('a',box(.2,.26,.05),owiWear(R,st),0,ly+.02,d/2+.04);for(const sx of[-1,1])a('a',box(.13,.2,.045),owiWear(R,st),sx*.27,ly,d/2+.037);}}
    if(v>=1){a('a',box(w+.18,.06,d+.14),v===2?0x4a3220:owiWear(R,st),0,ly+.134,.06);/* (4 mm clear of the lintel's top: no face in one plane with it) */if(v===2)for(const sx of[-1,1])a('a',box(.1,.14,.1),owiWear(R,st),sx*(w/2-.02),ly-.06,d/2+.0);}
    /* the breast: wide above the lintel, then a narrower column to the ceiling, with the joints of its courses drawn on the face */
    const by=ly+(v>=1?.168:.114),bh=Math.min(.55,H-by-.3);a('a',box(w-.04,bh,d-.04),owiWear(R,st),0,by+bh/2,-.02);/* (each piece of the chimney breast starts a few mm above the one below it) */
    a('a',box(w-.3,H-by-bh-.006,d-.14),owiWear(R,st),0,by+bh+.006+(H-by-bh-.006)/2,-.05);a('a',box(w-.18,.07,d-.1),owiWear(R,st),0,by+bh+.038,-.015);
    if(owiKeep(it,true)){for(let k=0;k<5;k++){const y=by+(k+1)*(H-by)/6;if(y>by+bh-.03&&y<by+bh+.1)continue;/* not on the shoulder */const bw2=y<by+bh?w-.04:w-.3;a('a',box(bw2,.012,.006),mort,0,y,y<by+bh?d/2-.04:d/2-.1);}}
    /* soot above the opening and on the back */
    a('a',box(ow+.1,.34,.006),0x1a1612,0,.07+oh+.02,d/2+(v===0?.044:.03));a('a',box(ow-.03,oh-.06,.035),0x14110e,0,.07+oh/2,-d/2+.055);a('a',box(ow-.28,oh*.72,.03),0x2c2926,0,.07+oh*.4,-d/2+.11,-.1,0,0);
    for(const sx of[-1,1])a('a',box(.03,oh*.9,d-.16),0x1c1814,sx*(ow/2-.015),.07+oh/2,-.03);
    /* andirons, logs, ash and fire */
    for(const sx of[-1,1]){a('a',box(.035,.3,.035),OWI_IRON,sx*ow*.3,.25,.04);a('a',box(.03,.03,d*.6),OWI_IRON,sx*ow*.3,.1,-.02);a('a',cyl(.025,.025,.03,6),OWI_IRON,sx*ow*.3,.41,.04);}
    a('a',box(ow*.62,.02,d*.5),0x6e6a66,0,.1,-.04);
    a('a',cyl(.05,.05,ow*.62,6),0x4a3220,0,.3,.04,0,0,Math.PI/2);a('a',cyl(.05,.045,ow*.55,6),0x3f2b1a,.04,.37,-.04,0,.1,Math.PI/2);a('a',cyl(.055,.05,ow*.6,6),0x4a3220,-.02,.16,-.06,0,-.08,Math.PI/2);a('a',cyl(.04,.04,ow*.4,6),0x5a3d22,.1,.2,.1,0,.5,Math.PI/2);
    a('g',box(ow*.5,.015,d*.36),0xff5a10,0,.115,-.04);
    a('g',cone(.2,.42,6),0xff7a20,-.1,.52,-.02);a('g',cone(.16,.32,6),0xffb040,.12,.47,0);a('g',cone(.1,.24,5),0xffe080,0,.46,.04);
    /* the crane: a post at the jamb, an arm over the fire, a chain and a pot */
    if(v>=1||R()<.5){const cx=-(ow/2-.05);a('a',cyl(.014,.014,oh*.9,5),OWI_IRON,cx,.07+oh*.45,d/2-.1);a('a',box(ow*.6,.022,.022),OWI_IRON,cx+ow*.3,.07+oh*.82,d/2-.1);a('a',cyl(.008,.008,.24,4),OWI_IRON,cx+ow*.52,.07+oh*.82-.12,d/2-.1);
      a('a',cyl(.13,.1,.17,8),0x2a2a2e,cx+ow*.52,.07+oh*.82-.3,d/2-.1);a('a',cyl(.135,.135,.02,8),0x34343a,cx+ow*.52,.07+oh*.82-.215,d/2-.1);}
    /* fire irons leaning at the right jamb */
    if(owiKeep(it,true)&&w>1.3){a('a',cyl(.01,.01,.7,4),OWI_IRON,w/2-.1,.4,d/2+.0,.12,0,0);a('a',box(.07,.02,.12),OWI_IRON,w/2-.13,.07,d/2+.07);}},
  hearthS(a,w,d,R,it){OWI_MESH.hearth(a,w,d,R,it);},
  /* a fire pit of a one-room house: a ring of stones, an ash bed, logs laid like the spokes of a wheel, a tripod and a pot */
  firepit(a,w,d,R,it){const n=12,r=.43;for(let k=0;k<n;k++){const an=k/n*6.283,s=.14+R()*.07;a('a',box(.2+R()*.06,s,.16),owiWear(R,owiPickC(R,OWI_STONE)),Math.cos(an)*r,s/2,Math.sin(an)*r,0,-an,0);}
    a('a',cyl(.38,.38,.03,12),0x5e5a56,0,.02,0);a('a',cyl(.3,.3,.01,10),0x2a2624,0,.04,0);
    for(let k=0;k<4;k++){const an=k*1.571+.3;a('a',cyl(.04,.035,.5,5),0x4a3220,Math.cos(an)*.12,.1,Math.sin(an)*.12,0,-an,Math.PI/2-.2);}
    a('g',cone(.2,.4,6),0xff7a20,0,.32,0);a('g',cone(.12,.3,5),0xffd070,0,.3,.03);a('g',cyl(.2,.2,.012,8),0xff5a10,0,.07,0);
    for(let k=0;k<3;k++){const an=k*2.094;a('a',cyl(.018,.018,1.1,5),OWI_IRON,Math.cos(an)*.22,.62,Math.sin(an)*.22,Math.sin(an)*.42,0,-Math.cos(an)*.42);}
    a('a',cyl(.16,.14,.2,8),0x2a2a2e,0,.74,0);a('a',cyl(.165,.165,.022,8),0x34343a,0,.84,0);a('a',cyl(.008,.008,.2,4),OWI_IRON,0,.95,0);},
  /* the iron range of a kitchen: a firebox with a door that shows the fire, four hot plates, an oven, a rail with cloths, a pipe that bends into the wall; a kettle and a pot stand on it */
  stove(a,w,d,R,it){const st=owiWear(R,owiPickC(R,OWI_STONE)),H=Math.min(2.5,((it&&it.ceil)||2.6)-.04);
    a('a',box(w,.1,d),st,0,.05,0);a('a',box(w-.04,.74,d-.04),0x2e2c2a,0,.47,0);a('a',box(w+.04,.06,d+.04),OWI_IRON,0,.86,0);
    for(const[x,z]of[[-.28,-.12],[-.28,.14],[.1,-.12],[.1,.14]])a('a',cyl(.09,.09,.012,10),0x1a1a1c,x,.896,z);
    a('a',box(.36,.34,.03),0x1c1a18,-.28,.48,d/2+.005);a('g',box(.22,.14,.01),0xff7a20,-.28,.42,d/2+.022);a('a',box(.3,.02,.04),0x3a3836,-.28,.67,d/2+.03);
    a('a',box(.36,.3,.03),0x24221f,.2,.46,d/2+.005);a('a',cyl(.012,.012,.2,5),OWI_IRON,.2,.62,d/2+.04,0,0,Math.PI/2);
    a('a',box(w-.06,.03,.03),OWI_IRON,0,.12,d/2+.0);for(const sx of[-1,1])a('a',box(.03,.12,.03),OWI_IRON,sx*(w/2-.08),.06,d/2-.05);
    a('a',cyl(.13,.1,.17,8),0x2a2a2e,-.28,.99,.14);a('a',cyl(.095,.07,.14,8),0x8a5a2a,.1,.97,-.12);a('a',cyl(.012,.012,.2,5),OWI_IRON,.1,1.09,-.12,0,0,Math.PI/2);
    a('a',box(.025,.28,.025),OWI_IRON,w/2-.02,1.04,d/2-.1);a('a',box(.34,.02,.02),OWI_IRON,w/2-.18,1.18,d/2-.1);/* (the rail is a little thinner than the post it hangs on: no shared faces) */for(const x of[.12,.22,.32])a('a',box(.05,.14,.01),owiPickC(R,OWI_CLOTH),w/2-x-.05,1.1,d/2-.1);
    const px=w/2-.17,pz=-d/2+.13;a('a',cyl(.07,.07,H-.9,7),0x2a2a2e,px,.9+(H-.9-.34)/2,pz,0,0,0,1,1,1);
    a('a',box(.32,.2,.2),st,px+.02,H-.12,pz-.01);a('a',cyl(.065,.065,.34,7),0x2a2a2e,px,.9+.17,pz);}
});
/* the furniture of the interior gets what it needs to be made for its use: the kind of building and of room it stands in (geo.js sets it) */
/* ---------------------------------------------------------------- beds in depth, and their bedding
   Soft things are closed shells over a grid (owbShell): a mattress with rounded edges, a plump pillow, a made blanket that lies over the mattress and falls over its sides and foot, with the sheet turned down over
   its top edge. The made bedding is drawn as part 'b' (a bed's own) or 'bL' / 'bR' (a half of a double bed): the furniture mesh keeps where its vertices lie (geo.js ic.bedR), so the bedding of a place someone
   sleeps in can be hidden while their own covers lie over them (vilhome.js vilHCover). The first draws of a bed's stream are those of the plain beds before (its kind, the wood, the linen, the blanket, the dark
   wood), so every bed keeps its kind and its colours; the mattress tops stay where the sleepers lie on them (rope .39, box .45, post .46, pallet .1: vilHMat). */
/* a closed shell from a grid: top(i,j) -> [x,y,z] with x growing with i and z with j (the top faces up); bot: a thickness (the top moved in along its normal) or bot(i,j) -> [x,y,z]. Returns {V, I} */
function owbShellRaw(nx,nz,top,bot){const T=[],Bv=[],I=[],N=nx*nz,id=(i,j)=>j*nx+i;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)T.push(top(i,j));
  const at=(i,j)=>T[Math.max(0,Math.min(nz-1,j))*nx+Math.max(0,Math.min(nx-1,i))];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){if(typeof bot==='function'){Bv.push(bot(i,j));continue;}
    const a=at(i-1,j),b=at(i+1,j),c=at(i,j-1),d=at(i,j+1),ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-c[0],vy=d[1]-c[1],vz=d[2]-c[2];
    const n0=vy*uz-vz*uy,n1=vz*ux-vx*uz,n2=vx*uy-vy*ux,l=Math.hypot(n0,n1,n2)||1,p=T[id(i,j)];Bv.push([p[0]-n0/l*bot,p[1]-n1/l*bot,p[2]-n2/l*bot]);}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=id(i,j),b=id(i,j+1),c=id(i+1,j),d=id(i+1,j+1);I.push(a,b,c,c,b,d,a+N,c+N,b+N,c+N,d+N,b+N);}
  const V=T.concat(Bv),ring=[];for(let i=0;i<nx-1;i++)ring.push(id(i,0));for(let j=0;j<nz-1;j++)ring.push(id(nx-1,j));for(let i=nx-1;i>0;i--)ring.push(id(i,nz-1));for(let j=nz-1;j>0;j--)ring.push(id(0,j));
  let cx=0,cy=0,cz=0;for(const p of V){cx+=p[0];cy+=p[1];cz+=p[2];}cx/=V.length;cy/=V.length;cz/=V.length;
  /* the rim: each quad turned to face away from the middle of the shell */
  for(let k=0;k<ring.length;k++){const t0=ring[k],t1=ring[(k+1)%ring.length],b0=t0+N,b1=t1+N,P0=V[t0],P1=V[t1],P2=V[b1],ux=P1[0]-P0[0],uy=P1[1]-P0[1],uz=P1[2]-P0[2],vx=P2[0]-P0[0],vy=P2[1]-P0[1],vz=P2[2]-P0[2];
    const n0=uy*vz-uz*vy,n1=uz*vx-ux*vz,n2=ux*vy-uy*vx,m0=(P0[0]+P1[0])/2-cx,m1=(P0[1]+P1[1])/2-cy,m2=(P0[2]+P1[2])/2-cz;
    if(n0*m0+n1*m1+n2*m2>=0)I.push(t0,t1,b1,t0,b1,b0);else I.push(t0,b1,t1,t0,b0,b1);}
  return{V,I};}
function owbGeo(S){const g=new THREE.BufferGeometry(),a=new Float32Array(S.V.length*3);S.V.forEach((p,i)=>{a[i*3]=p[0];a[i*3+1]=p[1];a[i*3+2]=p[2];});g.setAttribute('position',new THREE.BufferAttribute(a,3));g.setIndex(S.I);return g;}
const owbR3=v=>Math.round(v*1000)/1000;
/* a pillow: a dome with soft edges over w x d, h high, on its bottom (y 0) */
function owbPillow(w,d,h){return gget(`owbP${owbR3(w)},${owbR3(d)},${owbR3(h)}`,()=>{const nx=9,nz=7;
  return owbGeo(owbShellRaw(nx,nz,(i,j)=>{const u=i/(nx-1)*2-1,v=j/(nz-1)*2-1,e=Math.sqrt(Math.max(0,(1-Math.pow(Math.abs(u),3))*(1-Math.pow(Math.abs(v),3))));return[u*w/2,h*(.3+.7*e),v*d/2];},
    (i,j)=>{const u=i/(nx-1)*2-1,v=j/(nz-1)*2-1;return[u*(w/2-.02),0,v*(d/2-.02)];}));});}
/* a mattress or a straw tick: flat on top, its edges rounded over a radius r, a little crown, lumps (a tick of straw) */
function owbMattress(w,d,h,r,lump){return gget(`owbM${owbR3(w)},${owbR3(d)},${owbR3(h)},${owbR3(r)},${lump||0}`,()=>{
  const fx=[0,.3,1],X=[],Z=[];/* (the columns: the edge, the round of the edge, then the flat) */
  const prof=(L,n)=>{const o=[-L/2,-L/2+r*.3,-L/2+r];for(let k=1;k<n;k++)o.push(-L/2+r+(L-2*r)*k/n);o.push(L/2-r*.3,L/2);return o;},hp=[h-r*.75,h-r*.2,h];
  const xs=prof(w,4),zs=prof(d,8),hx=k=>k===0||k===xs.length-1?0:k===1||k===xs.length-2?1:2,hz=k=>k===0||k===zs.length-1?0:k===1||k===zs.length-2?1:2;
  return owbGeo(owbShellRaw(xs.length,zs.length,(i,j)=>{const e=Math.min(hx(i),hz(j));let y=hp[e];if(e===2){y+=.008*(1-Math.pow(xs[i]/(w/2),2));if(lump)y+=lump*Math.sin(i*2.3+j*1.7)*Math.cos(j*2.9-i);}return[xs[i],y,zs[j]];},
    (i,j)=>[xs[i]*(1-.02/w),0,zs[j]*(1-.02/d)]));});}
/* a made blanket over a mattress whose top is y0, across xa..xb and from z0 (its top edge) to z1 (the foot): it falls over each side flagged in sides [left, right, foot] by drop; t thick.
   band > 0: the sheet turned down over its top edge instead (a strip of linen band long, lying 5 mm over the blanket) */
function owbBlanket(xa,xb,z0,z1,y0,drop,t,sides,band){return gget(`owbB${[xa,xb,z0,z1,y0,drop,t,band||0].map(owbR3).join(',')},${sides.join('')}`,()=>{
  const L=sides[0],Rt=sides[1],Ft=sides[2],lift=band?.011:0,ze=band?Math.min(z1,z0+band):z1;
  const xs=[],ys=[];if(L){xs.push(xa-.028,xa-.026,xa-.016,xa-.004);ys.push(-drop,-.045,-.014,-.002);}for(let k=0;k<=6;k++){xs.push(xa+.012+(xb-xa-.024)*k/6);ys.push(0);}if(Rt){xs.push(xb+.004,xb+.016,xb+.026,xb+.028);ys.push(-.002,-.014,-.045,-drop);}
  if(!L){xs[0]=xa;}if(!Rt){xs[xs.length-1]=xb;}
  const zs=[],zy=[];zs.push(z0);zy.push(-.006);for(let k=1;k<=8;k++){zs.push(z0+(ze-z0)*k/8);zy.push(0);}if(Ft&&!band){zs.push(ze+.004,ze+.016,ze+.026,ze+.028);zy.push(-.002,-.014,-.045,-drop);}
  return owbGeo(owbShellRaw(xs.length,zs.length,(i,j)=>{const y=Math.min(ys[i],zy[j]),ix=ys[i]===0&&zy[j]===0;return[xs[i],y0+t+lift+y+(ix?.007*Math.sin(xs[i]*7.3+zs[j]*3.1)+.005*Math.cos(zs[j]*10.7-xs[i]*2.3):0),zs[j]];},t));});}
const OWBED={
  /* the made bedding of one place: its blanket, the turned-down sheet, its pillow. key: 'b' a bed's own, 'bL'/'bR' a half of a double bed */
  bedding(a,key,xa,xb,z0,z1,y0,drop,sides,bl,lin,pc,pw,pd,ph,pz,thr){a(key,owbBlanket(xa,xb,z0,z1,y0,drop,.034,sides,0),bl,0,0,0);a(key,owbBlanket(xa,xb,z0-.02,z1,y0,drop,.034,sides,.14),lin,0,0,0);
    if(thr!=null)a(key,owbBlanket(xa,xb,z1-.42,z1,y0+.036,drop-.02,.03,sides,0),thr,0,0,0);/* (a folded throw across the foot) */
    a(key,owbPillow(pw,pd,ph),pc,(xa+xb)/2,y0+.002,pz);},
  /* a turned post: a square foot, a shaft with rings, a block at the top and a finial */
  post(a,x,z,h,wd,dk,it){a('a',box(.09,.3,.09),wd,x,.15,z);a('a',cyl(.033,.037,h-.42,8),wd,x,.3+(h-.42)/2,z);a('a',box(.075,.09,.075),wd,x,h-.075,z);a('a',oct(.05),dk,x,h+.02,z);
    if(owiKeep(it,true))for(const y of[.33,.3+(h-.42)*.35,h-.14])a('a',cyl(.046,.046,.025,8),dk,x,y,z);}};
OWI_MESH.bed1=function(a,w,d,R,it){const v=owiVar(R,[1,owiPoor(it)?1:.2,owiPoor(it)?0:.9,owiRich(it)?.9:.1]);if(it)it.bv=v;/* (the kind of bed drawn: the villager who sleeps in it lies on its mattress - vilhome.js vilHMat) */
  const wd=owiWear(R,owiPickC(R,OWI_WOOD)),lin=owiPickC(R,OWI_LINEN),bl=owiPickC(R,OWI_CLOTH),dk=owiPickC(R,OWI_DARK),dbl=!!(it&&it.kind==='bed2');if(it){it.bc=bl;it.pc=lin;}/* (its blanket's and its pillow's colours: a sleeper's own covers, vilhome.js) */
  const pc2=dbl?owiPickC(R,OWI_LINEN):lin;if(it)it.pc2=pc2;/* (a double bed's second pillow) */
  const thr=R()<.45?owiPickC(R,OWI_CLOTH):null,mw=w-.1,foot=v!==1;/* (a throw folded across the foot of some beds) *//* (the rope bed has no footboard: its blanket falls over the foot) */
  const made=(y0,z0,drop,pw,ph)=>{const z1=d/2-(foot?.085:.06);
    if(!dbl)OWBED.bedding(a,'b',-mw/2,mw/2,z0,z1,y0,drop,[1,1,!foot?1:0],bl,lin,lin,pw,.36,ph,-d/2+.29,thr);
    else{OWBED.bedding(a,'bL',-mw/2,0,z0,z1,y0,drop,[1,0,!foot?1:0],bl,lin,lin,mw/2-.14,.36,ph,-d/2+.29,thr);OWBED.bedding(a,'bR',0,mw/2,z0,z1,y0,drop,[0,1,!foot?1:0],bl,lin,pc2,mw/2-.14,.36,ph,-d/2+.29,thr);}};
  if(v===1){/* a rope bed: a low frame on short posts, rope pegs along the rails, a lumpy straw tick, a plank at the head */
    for(const sx of[-1,1])a('a',box(.07,.13,d),wd,sx*(w/2-.035),.2,0);for(const sz of[-1,1])a('a',box(w-.14,.13,.07),wd,0,.2,sz*(d/2-.035));
    for(const sx of[-1,1])for(const sz of[-1,1]){a('a',box(.08,.32,.08),wd,sx*(w/2-.04),.16,sz*(d/2-.04));a('a',ico(.035,0),dk,sx*(w/2-.04),.345,sz*(d/2-.04));}
    if(owiKeep(it,true))for(const sx of[-1,1])for(let k=1;k<10;k++)a('a',cyl(.011,.011,.035,5),dk,sx*(w/2-.035),.282,-d/2+k*d/10);
    a('a',owbMattress(w-.1,d-.12,.13,.04,.006),0xcdb26a,0,.26,0);
    a('a',box(w,.34,.05),wd,0,.42,-d/2+.025);a('a',box(w+.02,.045,.07),dk,0,.61,-d/2+.03);
    made(.39,-d/2+.56,.1,dbl?mw/2-.16:w-.32,.1);return;}
  if(v===2||v===3){/* a post bed: four turned posts with finials, a headboard of three sunk panels under a crested rail, a panelled footboard; a canopy with a valance and gathered curtains in a rich house */
    for(const sx of[-1,1])a('a',box(.07,.18,d-.12),wd,sx*(w/2-.04),.24,0);a('a',box(w-.12,.18,.07),wd,0,.24,d/2-.06);
    for(const sx of[-1,1])for(const sz of[-1,1])OWBED.post(a,sx*(w/2-.045),sz*(d/2-.045),1.5,wd,dk,it);
    a('a',box(w-.1,.62,.05),dk,0,.8,-d/2+.04);for(let k=0;k<3;k++)a('a',box((w-.3)/3,.36,.02),wd,-(w-.3)/3+k*(w-.3)/3,.8,-d/2+.074);
    a('a',box(w-.06,.09,.08),wd,0,1.15,-d/2+.045);a('a',box(.34,.08,.06),wd,0,1.22,-d/2+.045);a('a',box(w-.12,.05,.07),wd,0,.49,-d/2+.045);
    a('a',box(w-.1,.32,.05),wd,0,.44,d/2-.04);a('a',box(w-.3,.18,.02),dk,0,.44,d/2-.074+.004);a('a',box(w-.06,.05,.07),dk,0,.62,d/2-.045);
    a('a',owbMattress(w-.1,d-.16,.14,.05),0xd8c898,0,.32,0);
    if(v===3){const cl=owiPickC(R,OWI_CLOTH),tr=owiPickC(R,[0xc8a030,0xd8c890,0x3a2a1a]);
      a('a',box(w-.02,.03,d-.02),cl,0,1.535,0);for(const sx of[-1,1]){a('a',box(.02,.16,d+.02),cl,sx*(w/2+.005),1.45,0);a('a',box(.022,.025,d+.03),tr,sx*(w/2+.006),1.37,0);}
      for(const sz of[-1,1]){a('a',box(w+.03,.16,.02),cl,0,1.45,sz*(d/2+.005));a('a',box(w+.04,.025,.022),tr,0,1.37,sz*(d/2+.006));}
      /* the curtains, gathered in folds and tied back at the four posts */
      for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*(w/2-.03),z=sz*(d/2-.09);
        /* (four folds over the tie, spreading towards the canopy, three under it falling loose; the band) */
        for(let k=0;k<4;k++)a('a',cyl(.017,.022,.5,6),cl,x-sx*k*.006,1.2,z-sz*(.02+k*.045));for(let k=0;k<3;k++)a('a',cyl(.022,.03,.42,6),cl,x-sx*k*.006,.74,z-sz*(.02+k*.035));
        a('a',box(.05,.035,.17),tr,x-sx*.005,.96,z-sz*.07);}}
    made(.46,-d/2+.56,.12,dbl?mw/2-.14:w-.26,.13);return;}
  /* a box bed: rails on turned feet, a headboard with posts, finials, a rail and three panels, a lower footboard the same */
  for(const sx of[-1,1])a('a',box(.07,.2,d-.1),wd,sx*(w/2-.035),.21,0);
  for(const sx of[-1,1])for(const sz of[-1,1])a('a',cyl(.045,.038,.12,8),dk,sx*(w/2-.05),.06,sz*(d/2-.05));
  for(const sz of[-1,1]){const h=sz<0?.95:.62,z=sz*(d/2-.04);for(const sx of[-1,1]){a('a',box(.08,h,.08),wd,sx*(w/2-.04),h/2,z);a('a',ico(.045,1),dk,sx*(w/2-.04),h+.04,z);}
    a('a',box(w-.04,.08,.075),wd,0,h-.1,z);a('a',box(w-.16,h-.42,.035),dk,0,.2+(h-.42)/2+.06,z+sz*.005);a('a',box(w-.12,.06,.07),wd,0,.3,z);
    if(sz<0)for(const sx of[-1,1])a('a',box(.05,h-.44,.05),wd,sx*w/6,.2+(h-.42)/2+.06,z);}
  a('a',owbMattress(w-.1,d-.18,.15,.05),0xd8c898,0,.3,0);
  made(.45,-d/2+.56,.12,dbl?mw/2-.14:w-.26,.13);};
OWI_MESH.bed2=function(a,w,d,R,it){OWI_MESH.bed1(a,w,d,R,it);};/* (a double bed draws its two halves' bedding: bed1 knows it from it.kind) */
OWI_MESH.pallet=function(a,w,d,R,it){const bc=owiPickC(R,OWI_CLOTH);if(it){it.bc=bc;it.pc=0xd8c898;}/* (the blanket's colour: a sleeper's own covers, vilhome.js) */
  a('a',owbMattress(w,d,.1,.035,.007),0xb89a58,0,0,0);OWBED.bedding(a,'b',-w/2,w/2,-d/2+.5,d/2-.02,.1,.06,[1,1,1],bc,0xe0d4b4,0xd8c898,w-.2,.3,.09,-d/2+.26);};

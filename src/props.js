/* =====================================================================================================================
   KINGSGAARD PROP LIBRARY (the small things that stand about houses and streets): barrels, crates, buckets, baskets, sacks, bales, benches, troughs, carts, wheelbarrows, boards, signposts, bollards, planters,
   washing lines, anvils, stumps, firewood, pottery, bins, tools. owTownDress (kingsgaard.html) takes the table from here.
   Every prop is a handful of boxes and short cylinders in the village's merged 'd' layer, built from what the thing is made of: staves with hoops, boards with seams, wicker in courses, cloth gathered at a neck.
   The shape variants (open or closed, lying or standing, full or empty, plain or damaged) and the wood tones come from a hash of the place (hh), NOT from the world's random stream R: the same prop in the same
   place is the same every time, and the stream that generates the world is consumed exactly as before (the few R() calls that the old props made are kept, in the same places, for that reason).
   E = {P, PY, R, Yf, loc}: P adds a part to the layer, PY the same with a tilt about the part's own x axis, R is the world stream, Yf the lowest ground under a footprint, loc turns a local offset into a world position.
   ===================================================================================================================== */
function owPropLib(E){const{P,PY,R,Yf,loc}=E,hh=(x,z,k)=>owHash2(Math.round(x*7.3)+k*131,Math.round(z*5.9)-k*71),pick=(h,a)=>a[Math.floor(h*a.length)%a.length];
  const WD=[0x6a4426,0x74502e,0x5e3c22,0x7a5634,0x6a4a2c],WL=[0x8a6a3c,0x9a7a46,0x7e5e34,0x866238],WK=[0x4a2c18,0x3f2b1a,0x54341c],IR=0x3a3a3e,IR2=0x2c2c30,ROPE=0xb8a070,CLOTH=[0xc8b88a,0xb8a47a,0xd0c4a0,0xa89870],STONE=[0x8a867c,0x7a766e,0x96928a];
  const tint=(c,k)=>{const r=Math.min(255,Math.max(0,(c>>16&255)*k))|0,g=Math.min(255,Math.max(0,(c>>8&255)*k))|0,b=Math.min(255,Math.max(0,(c&255)*k))|0;return r<<16|g<<8|b;};
  /* a frame of reference at (x,z) turned by rot with its floor at y: o(lx,ly,lz,geometry,colour,tilt,extra yaw) puts a part there */
  const F=(x,z,rot,y)=>(lx,ly,lz,g,c,rz,yw,rx,sc)=>{const q=loc(x,z,rot,lx,lz);if(rx)PY('d',g,c,q[0],y+ly,q[1],rot+(yw||0),-rx);else if(sc)P('d',g,c,q[0],y+ly,q[1],0,rot+(yw||0),rz||0,sc[0],sc[1],sc[2]);else P('d',g,c,q[0],y+ly,q[1],0,rot+(yw||0),rz||0);};
  /* a ring of n boxes round an axis (a rim, a hoop of boards): radius r, box (w, h, d) with d the thickness */
  const ring=(o,n,r,y,w,h,d,c,off)=>{for(let k=0;k<n;k++){const a=k/n*6.2832+(off||0);o(Math.sin(a)*r,y,Math.cos(a)*r,box(w,h,d),typeof c==='function'?c(k):c,0,a);}};
  /* a stave of a barrel or a bucket: a board leaning with the profile, set at radius rm, turned to face outwards */
  const stave=(x,z,rot,y,a,rm,len,w,th,lean,c)=>{const q=loc(x,z,rot,Math.sin(a)*rm,Math.cos(a)*rm);PY('d',box(w,len,th),c,q[0],y,q[1],rot+a,-lean);};/* lean > 0: the top leans outwards */
  /* round things are built with many sides (the ground view of the village is flat shaded, so a ring of 20 reads as round where a ring of 9 reads as a gem): a sphere and a turned profile (radius, height) */
  const sph=(r,ws,hs)=>gget(`s${r3(r)},${ws},${hs}`,()=>new THREE.SphereGeometry(r,ws||16,hs||10));
  const lathe=(key,pts,seg)=>gget(`l${key},${seg}`,()=>new THREE.LatheGeometry(pts.map(q=>new THREE.Vector2(q[0],q[1])),seg||16));
  const lib={
    /* a stave barrel: a body that swells in the middle (four frusta), staves on it, hoops of iron or of split hazel, a head with a bung; open with water or apples, shut, or lying on its side */
    barrel(x,z,rot){const y=Yf(x,z,.3,.3,0),h0=hh(x,z,1),h1=hh(x,z,2),col=pick(h1,WD),stv=tint(col,1.08),open=h0<.22,lying=h0>.9,hoop=h1<.5?IR:0x7a5a30,o=F(x,z,0,y);
      if(lying){/* a barrel on its side, chocked with a wedge */
        const rz=Math.PI/2,ax=rot+(hh(x,z,3)-.5)*1.4,q=(lx,ly,g,c,r)=>{const p=loc(x,z,ax,lx,0);P('d',g,c,p[0],y+ly,p[1],0,ax,r||0);};
        for(const[lx,rr]of[[-.2,.255],[-.07,.29],[.07,.29],[.2,.255]])q(lx,.29,cyl(rr,rr,.14,18),col,rz);for(const lx of[-.26,.26])q(lx,.29,cyl(.26,.26,.035,18),hoop,rz);q(0,.29,cyl(.3,.3,.035,18),hoop,rz);
        q(-.3,.29,cyl(.235,.235,.02,18),tint(col,1.25),rz);q(.3,.29,cyl(.235,.235,.02,18),tint(col,1.25),rz);const w=loc(x,z,ax,0,.34);P('d',box(.1,.08,.14),0x5a3d22,w[0],y+.04,w[1],0,ax,0);return;}
      o(0,.32,0,cyl(.26,.26,.62,18),tint(col,.5));/* the dark inside, seen between the staves */
      /* thirty-six staves in two halves that lean towards each other: the barrel swells from .25 at its ends to .30 in the middle; alternate boards in a lighter wood */
      for(let k=0;k<18;k++){const a=k/18*6.2832+.17,c=k%2?stv:tint(col,.94);stave(x,z,rot,y+.17,a,.278,.33,.105,.03,.15,c);stave(x,z,rot,y+.47,a,.278,.33,.105,.03,-.15,c);}
      for(const[hy,hr,hw]of[[.07,.26,.04],[.2,.285,.035],[.44,.285,.035],[.57,.26,.04]])o(0,hy,0,cyl(hr+.04,hr+.04,hw,20),hoop);
      if(open){o(0,.615,0,cyl(.262,.262,.03,20),tint(col,.9));o(0,.628,0,cyl(.225,.225,.02,20),h0<.1?0x4a7aaa:0x9a3a2a);if(h0>=.1)for(let k=0;k<5;k++)o(Math.sin(k*1.3)*.1,.66,Math.cos(k*1.3)*.1,ico(.06,0),pick(hh(x,z,10+k),[0xc84a3a,0xd8a83a,0xa8c04a]));}
      else{o(0,.645,0,cyl(.25,.25,.03,20),tint(col,1.22));o(.07,.662,.05,cyl(.03,.03,.02,10),0x3a2410);for(const sx of[-1,1])o(sx*.15,.664,0,box(.05,.012,.12),tint(col,.8));}},
    /* a crate of boards: three boards to a side with a hair of gap, four corner posts, a lid of slats (shut, ajar or off) with something in it, one board missing when it is old; a crate on top as before */
    crate(x,z,rot){const y=Yf(x,z,.3,.3,rot),o=F(x,z,rot,y),h0=hh(x,z,4),h1=hh(x,z,5),col=pick(h1,WL),dk=pick(h0,WK),damaged=h0>.86,st=h0<.3?0:h0<.62?1:2;/* 0 shut, 1 open with a load, 2 slats half off */
      for(const sz of[-1,1]){for(let k=0;k<3;k++)if(!(damaged&&sz>0&&k===1))o(0,.09+k*.16,sz*.265,box(.5,.145,.025),k%2?tint(col,.93):col);}
      for(const sx of[-1,1])for(let k=0;k<3;k++)o(sx*.265,.09+k*.16,0,box(.025,.145,.5),k%2?col:tint(col,.93));
      for(const sx of[-1,1])for(const sz of[-1,1])o(sx*.265,.25,sz*.265,box(.05,.5,.05),dk);
      o(0,.02,0,box(.5,.03,.5),dk);for(const sz of[-1,1])o(0,.05,sz*.285,box(.55,.04,.02),tint(dk,1.2));
      if(st===0){for(let k=0;k<4;k++)o(0,.515,-.21+k*.14,box(.55,.03,.115),k%2?tint(col,.9):col);for(const sx of[-1,1])o(sx*.2,.54,0,box(.05,.03,.55),dk);}
      else if(st===1){o(0,.505,0,box(.46,.02,.46),0x3a2a1a);for(let k=0;k<5;k++)o(Math.sin(k*2.1+h0*9)*.14,.56,Math.cos(k*1.7+h0*5)*.14,ico(.085,0),pick(hh(x,z,20+k),[0xc84a3a,0xd8a83a,0xa8c04a,0xb89a60]),0,k);}
      else{for(let k=0;k<2;k++)o(0,.515,-.2+k*.14,box(.55,.03,.115),col);o(.05,.54,.15,box(.5,.03,.115),tint(col,.9),.35,.5);}
      if(R()<.5){const q=loc(x,z,rot,.04,-.03);P('d',box(.4,.4,.4),0x9a7a46,q[0],y+.72,q[1],0,rot+.5,0);P('d',box(.42,.04,.42),0x6a4a2c,q[0],y+.54,q[1],0,rot+.5,0);for(const s of[-1,1]){const q2=loc(q[0],q[1],rot+.5,s*.205,0);P('d',box(.04,.4,.42),0x6a4a2c,q2[0],y+.72,q2[1],0,rot+.5,0);}}},
    /* sacks: soft bodies that sag at the bottom and gather at a tied neck, with a seam, a puckered mouth and a cord */
    sacks(x,z,rot){const y=Yf(x,z,.5,.25,rot);for(let k=0;k<3;k++){const q=loc(x,z,rot,(k-1)*.3,(k%2)*.12),h0=hh(q[0],q[1],6+k),c=pick(h0,CLOTH),yy=y,lean=(h0-.5)*.3;
      /* one turned body: it sags round the bottom, gathers at the neck and ends in a puckered mouth */
      P('d',lathe('sack',[[0,0],[.09,0],[.16,.02],[.195,.08],[.2,.16],[.18,.25],[.135,.33],[.09,.39],[.062,.43],[.076,.45],[.092,.48],[.074,.52],[.03,.545],[0,.545]],14),c,q[0],yy,q[1],0,rot+k,lean*.6);
      P('d',cyl(.058,.058,.022,10),ROPE,q[0]+lean*-.12,yy+.435,q[1],0,rot+k,lean);P('d',box(.012,.3,.012),tint(c,.7),q[0]+.17*Math.cos(rot+k),yy+.22,q[1]-.17*Math.sin(rot+k),0,rot+k,lean);}},
    /* a bale of hay: tied with two bands of twine, straw sticking out of the cut ends; a second on top as before */
    hay(x,z,rot){const y=Yf(x,z,.55,.3,rot),o=F(x,z,rot,y);o(0,.25,0,box(1.0,.5,.55),0xd4b45a);for(const sx of[-.28,.28]){o(sx,.25,0,box(.035,.52,.57),0x8a6a30);}
      for(let k=0;k<6;k++)o(-.48+k*.19,.505,(hh(x,z,30+k)-.5)*.3,box(.16,.02,.5),pick(hh(x,z,40+k),[0xe0c068,0xc8a850,0xd8b85c]));
      for(let k=0;k<5;k++)o(.5,.12+k*.09,(hh(x,z,50+k)-.5)*.4,cyl(.012,.008,.12,4),0xe8c870,0,0);
      if(R()<.55){const q=loc(x,z,rot,.1,.02);P('d',box(.9,.45,.5),0xcaa850,q[0],y+.72,q[1],0,rot+.12,0);for(const s of[-.26,.26]){const q2=loc(q[0],q[1],rot+.12,s,0);P('d',box(.035,.47,.52),0x8a6a30,q2[0],y+.72,q2[1],0,rot+.12,0);}}},
    /* a bench: a thick seat of two boards, a back of two rails, splayed end frames with a stretcher between them and pegs */
    bench(x,z,rot){const y=Yf(x,z,.72,.2,rot),o=F(x,z,rot,y),h0=hh(x,z,7),c=pick(h0,WL),d2=pick(h0,WD);
      o(0,.46,-.08,box(1.4,.06,.17),c);o(0,.46,.1,box(1.4,.06,.17),tint(c,.93));o(0,.43,0,box(1.3,.04,.1),d2);
      for(const s of[-1,1]){o(s*.58,.22,.02,box(.06,.45,.32),d2);o(s*.58,.45,.0,box(.09,.05,.38),tint(d2,1.15));o(s*.58,.62,-.15,box(.06,.4,.05),d2);o(s*.6,.07,0,box(.08,.05,.4),d2);}
      o(0,.28,.0,box(1.1,.05,.06),d2);if(h0>.35){o(0,.6,-.17,box(1.3,.11,.04),c);o(0,.78,-.17,box(1.3,.09,.04),tint(c,.93));}
      for(const s of[-.48,.48])o(s,.495,.1,cyl(.012,.012,.02,5),0x2a1a10);},
    /* a water trough: a dugout with thick walls, water in it, an end board, two trestles and a cross brace */
    trough(x,z,rot){const y=Yf(x,z,.62,.25,rot),o=F(x,z,rot,y),h0=hh(x,z,8),c=pick(h0,WD);
      o(0,.26,-.2,box(1.2,.28,.07),c);o(0,.26,.2,box(1.2,.28,.07),tint(c,.93));for(const s of[-1,1])o(s*.6,.26,0,box(.07,.28,.46),tint(c,.88));o(0,.14,0,box(1.12,.05,.4),tint(c,.8));
      o(0,.405,-.2,box(1.24,.03,.09),tint(c,1.15));o(0,.405,.2,box(1.24,.03,.09),tint(c,1.15));o(0,.34,0,box(1.08,.03,.34),0x4a7aaa);
      for(const s of[-.42,.42]){o(s,.1,-.17,box(.07,.2,.07),WK[0]);o(s,.1,.17,box(.07,.2,.07),WK[0]);o(s,.05,0,box(.07,.05,.4),WK[0]);}},
    /* a farm cart: a bed of boards with side rails, a tailboard, an axle on two spoked wheels with iron tyres, two shafts; sacks, crates or hay on it */
    cart(x,z,rot){const y=Yf(x,z,.62,.95,rot),o=F(x,z,rot,y),h0=hh(x,z,9),c=pick(h0,WL),d2=pick(h0,WD);
      for(let k=0;k<5;k++)o(-.34+k*.17,.62,0,box(.16,.06,1.6),k%2?c:tint(c,.92));for(const s of[-.34,0,.34])o(s,.56,-.2,box(.07,.07,1.3),d2);
      for(const s of[-1,1]){o(s*.44,.74,-.0,box(.05,.07,1.6),d2);o(s*.44,.84,0,box(.05,.07,1.6),tint(d2,1.1));for(const zz of[-.75,-.25,.25,.75])o(s*.44,.76,zz,box(.05,.22,.05),d2);}
      o(0,.72,-.8,box(.9,.2,.05),c);o(0,.82,.78,box(.9,.12,.04),tint(c,.9));
      o(0,.38,.1,cyl(.05,.05,1.3,6),IR2,Math.PI/2);
      for(const s of[-1,1]){const wx=s*.6;o(wx,.38,.1,cyl(.08,.08,.1,8),IR2,Math.PI/2);o(wx,.38,.1,cyl(.045,.045,.14,6),d2,Math.PI/2);
        for(let k=0;k<12;k++){const a=k/12*6.2832;o(wx,.38+Math.cos(a)*.345,.1+Math.sin(a)*.345,box(.07,.05,.22),k%2?c:tint(c,.9),0,0,a);o(wx+s*.04,.38+Math.cos(a)*.35,.1+Math.sin(a)*.35,box(.025,.05,.23),IR2,0,0,a);}
        for(let k=0;k<4;k++){const a=k*.785+.2;o(wx,.38+Math.cos(a)*.0,.1+Math.sin(a)*.0,box(.05,.66,.04),d2,0,0,a);}}
      for(const s of[-1,1])o(s*.3,.5,1.3,box(.06,.06,1.1),d2);o(0,.52,1.8,box(.7,.05,.05),d2);
      if(R()<.6){o(-.1,.82,.2,box(.45,.4,.45),0x9a7a46);o(-.1,.62,.2,box(.47,.05,.47),0x6a4a2c);o(.2,.82,-.3,box(.4,.35,.4),0x8a6a3c);}else{o(0,.8,0,box(.8,.22,1.3),0xd4b45a);for(let k=0;k<4;k++)o(-.3+k*.2,.92,(hh(x,z,60+k)-.5)*.8,box(.18,.04,.5),0xe0c068);}},
    /* the notice board of a square: two posts with caps, a roofed frame, boards with notices pinned on, a seal in red wax */
    board(x,z,rot){const y=Yf(x,z,.62,.1,rot),o=F(x,z,rot,y);for(const s of[-1,1]){o(s*.62,.8,0,box(.1,2.0,.1),0x5a3d22);o(s*.62,1.83,0,box(.14,.05,.14),0x4a3220);o(s*.62,.05,0,box(.18,.1,.18),0x8a867c);}
      o(0,1.35,0,box(1.3,.8,.06),0x7a5a34);o(0,1.35,.035,box(1.22,.72,.01),0x8a6a40);o(0,1.78,.0,box(1.5,.06,.34),0x4a3a2a);o(0,1.82,.0,box(1.5,.05,.2),0x5a4a38,0,0);o(0,.99,.04,box(1.3,.06,.1),0x5a3d22);
      for(let k=0;k<5;k++)o(-.46+k*.23,1.2+(k%2)*.3,.05,box(.18,.24+(k%3)*.04,.012),k%2?0xe8dcb8:0xefe6d0);o(.2,1.5,.058,box(.07,.07,.01),0xb02a24);o(-.2,1.24,.058,box(.07,.07,.01),0xb02a24);},
    /* a signpost: a squared post on a mound of stones with a cap, two boards pointed at the end, a bracket, lines of lettering */
    signpost(x,z,rot){const y=Yf(x,z,.1,.1,rot),o=F(x,z,rot,y);o(0,.9,0,box(.12,2.2,.12),0x5a3d22);o(0,2.03,0,box(.17,.07,.17),0x4a3220);o(0,2.08,0,cone(.1,.12,4),0x4a3220,0,.785);
      for(let k=0;k<5;k++){const a=k*1.3;o(Math.sin(a)*.17,.06,Math.cos(a)*.17,dod(.1),pick(hh(x,z,70+k),STONE));}
      for(const[ox,oy,len,col,sg]of[[.34,1.7,.8,0x7a5a34,1],[-.3,1.38,.8,0x6a4a2c,-1]]){o(ox,oy,.09,box(len,.2,.04),col);o(ox+sg*(len/2+.03),oy,.09,box(.12,.2,.04),col,.0,0.785);o(ox+sg*(len/2+.03),oy,.09,box(.1,.14,.042),col);
        for(const dy of[.04,-.04])o(ox-sg*.04,oy+dy,.115,box(len*.55,.025,.01),0x2a1a10);o(ox-sg*(len/2-.04),oy,.0,box(.05,.07,.12),IR2);}},
    /* a stone bollard with a worn cap and an iron band and ring */
    bollard(x,z){const y=Yf(x,z,.19,.19,0),o=F(x,z,0,y);o(0,.275,0,cyl(.15,.19,.85,8),pick(hh(x,z,11),STONE));o(0,.72,0,cyl(.19,.16,.08,8),0x9a968c);o(0,.52,0,cyl(.2,.2,.05,8),IR);o(.0,.64,.17,box(.04,.1,.04),IR);o(.0,.58,.2,cyl(.03,.03,.04,6),IR,Math.PI/2);},
    /* a planter: boards with iron bands, soil, and plants that differ from one to the next (herbs, flowers, a small shrub) */
    planter(x,z,rot){const y=Yf(x,z,.5,.25,rot),o=F(x,z,rot,y),h0=hh(x,z,12),c=pick(h0,WD);
      for(const sz of[-1,1])for(let k=0;k<3;k++)o(0,.07+k*.12,sz*.215,box(.95,.115,.03),k%2?c:tint(c,.9));for(const sx of[-1,1])o(sx*.47,.21,0,box(.03,.38,.45),tint(c,.85));
      for(const sx of[-.3,.3])for(const sz of[-1,1])o(sx,.21,sz*.235,box(.04,.4,.02),IR);o(0,.1,0,box(.9,.04,.4),WK[0]);o(0,.36,0,box(.88,.1,.38),0x4a3220);
      const kind=h0<.34?0:h0<.67?1:2;for(let k=0;k<3;k++){const px=(k-1)*.3;
        if(kind===0){for(let j=0;j<5;j++)o(px+Math.sin(j*1.9)*.08,.5,Math.cos(j*2.3)*.07,cone(.05,.2,5),0x5a8a38,(j-2)*.25);o(px,.55,0,ico(.09,1),0x6a9a42);}
        else if(kind===1){o(px,.5,0,ico(.17,1),0x4a7a38,0,k);for(let j=0;j<3;j++)o(px+(j-1)*.07,.63+(j%2)*.04,(j-1)*.05,box(.06,.06,.06),pick(hh(x,z,80+k*3+j),[0xd84a5a,0xe8c040,0xe8e0f0,0xb06ad0]));}
        else{o(px,.44,0,cyl(.02,.03,.18,5),0x5a3d22);o(px,.62,0,ico(.17,1),0x4a7a38,0,k);o(px+.08,.66,.05,ico(.1,1),0x6a9a42);}}},
    /* a washing line: two poles each buried in its own ground, a line, shirts with sleeves and sheets that hang from it */
    laundry(x,z,rot){const q1=loc(x,z,rot,-1.6,0),q2=loc(x,z,rot,1.6,0),g1=owH(q1[0],q1[1]),g2=owH(q2[0],q2[1]),top=Math.max(g1,g2)+1.85;
      for(const[q,g]of[[q1,g1],[q2,g2]]){const b=g-.2,h=top+.1-b;P('d',box(.08,h,.08),0x5a3d22,q[0],b+h/2,q[1],0,rot,0);P('d',box(.2,.04,.04),0x5a3d22,q[0],top+.05,q[1],0,rot,0);P('d',cone(.14,.12,6),pick(hh(q[0],q[1],13),STONE),q[0],g+.02,q[1]);}
      P('d',box(3.2,.02,.02),0xc8c0a8,x,top-.03,z,0,rot,0);const cols=[0xe8e0d0,0x6a8ab0,0xb06a4a,0xe8e0d0,0x8aaa6a];
      for(let k=0;k<5;k++){const q=loc(x,z,rot,-1.2+k*.6,0),sh=k%2===0;P('d',box(sh?.34:.46,sh?.5:.58-.04*(k%3),.02),cols[k],q[0],top-.3,q[1],0,rot,0);
        if(sh)for(const s of[-1,1]){const a=loc(q[0],q[1],rot,s*.22,0);P('d',box(.14,.12,.02),cols[k],a[0],top-.12,a[1],0,rot,s*.5);}
        P('d',box(.025,.04,.025),0x5a3d22,q[0]-.1*Math.cos(rot),top-.04,q[1]+.1*Math.sin(rot),0,rot,0);}},
    /* an anvil on a block: base, waist, face, horn and heel, with a hammer on the block, tongs and a tub of water */
    anvil(x,z,rot){const y=Yf(x,z,.28,.28,rot),o=F(x,z,rot,y);o(0,.2,0,cyl(.25,.28,.4,8),0x5a3d22);o(0,.41,0,cyl(.26,.25,.03,8),0x4a3220);
      o(0,.5,0,box(.3,.1,.17),0x2a2a30);o(0,.58,0,box(.2,.08,.15),0x2a2a30);o(0,.67,0,box(.48,.09,.18),0x34343a);o(.34,.67,0,cone(.06,.2,5),0x34343a,-Math.PI/2);o(-.28,.66,0,box(.1,.07,.14),0x34343a);o(0,.725,0,box(.46,.012,.15),0x5a5a62);
      o(.0,.44,.2,box(.3,.04,.04),0x5a3d22,0,.5);o(-.04,.46,.22,box(.08,.07,.07),IR2,0,.5);o(.22,.44,-.12,box(.34,.015,.03),IR2,0,-.7);
      const t=loc(x,z,rot,.7,.5);P('d',cyl(.2,.17,.3,8),0x5a3d22,t[0],y+.15,t[1]);P('d',cyl(.17,.17,.02,8),0x3a5a7a,t[0],y+.29,t[1]);for(const h of[.08,.24])P('d',cyl(.205,.205,.025,8),IR,t[0],y+h,t[1]);},
    /* a chopping block: a stump with rings on its top, flared roots, split kindling around it and an axe in it */
    stump(x,z){const y=Yf(x,z,.26,.26,0),o=F(x,z,0,y),h0=hh(x,z,14);o(0,.2,0,cyl(.22,.26,.4,9),0x6a4a2c);o(0,.41,0,cyl(.2,.2,.02,9),0x9a7a50);o(0,.415,0,cyl(.13,.13,.014,9),0x8a6a40);o(0,.418,0,cyl(.06,.06,.012,9),0x7a5a34);
      for(let k=0;k<4;k++){const a=k*1.6+h0*3;o(Math.sin(a)*.25,.05,Math.cos(a)*.25,box(.1,.1,.18),0x6a4a2c,0,a);}
      if(h0>.3){o(.05,.55,0,box(.04,.34,.03),0x5a3d22,.25);o(-.04,.7,0,box(.14,.1,.03),IR,.25);}
      for(let k=0;k<3;k++)o(.4+Math.sin(k*2)*.12,.04,Math.cos(k*2.4)*.2,box(.06,.06,.3),pick(hh(x,z,90+k),WL),0,k);},
    /* a bucket: staves, a base, two iron hoops, a rope handle on two ears, water or nothing in it; standing, or tipped over */
    bucket(x,z){const y=Yf(x,z,.2,.2,0),h0=hh(x,z,15),o=F(x,z,0,y),c=pick(h0,WD);
      if(h0>.88){const ax=hh(x,z,16)*6;const q=(lx,ly,g,col,r)=>{const p=loc(x,z,ax,lx,0);P('d',g,col,p[0],y+ly,p[1],0,ax,r||0);};q(0,.14,cyl(.17,.13,.3,16),c,Math.PI/2);q(.13,.14,cyl(.15,.15,.03,16),WK[0],Math.PI/2);q(-.1,.14,cyl(.19,.19,.03,16),IR,Math.PI/2);return;}
      o(0,.14,0,cyl(.16,.13,.27,16),0x2a1a10);for(let k=0;k<14;k++){const a=k/14*6.2832+.2;stave(x,z,0,y+.14,a,.158,.28,.077,.02,.14,k%2?tint(c,1.1):tint(c,.95));}
      o(0,.03,0,cyl(.15,.14,.03,16),WK[0]);for(const hy of[.06,.22])o(0,hy,0,cyl(.15+hy*.1,.15+hy*.1,.025,16),IR);
      if(h0<.5)o(0,.26,0,cyl(.16,.16,.01,16),0x4a7aaa);for(const s of[-1,1])o(s*.18,.25,0,box(.025,.04,.04),IR);
      for(let k=0;k<12;k++){const a0=k/12*3.1416,a1=(k+1)/12*3.1416,x0=Math.cos(a0)*.18,y0=.27+Math.sin(a0)*.15,x1=Math.cos(a1)*.18,y1=.27+Math.sin(a1)*.15,dx=x1-x0,dy=y1-y0;o((x0+x1)/2,(y0+y1)/2,0,cyl(.012,.012,Math.hypot(dx,dy)+.012,5),ROPE,Math.atan2(dx,dy)*-1+0);}},
    /* a basket of wicker: a base, courses of weave in two tones, a rim, two handles; apples, bread, cabbages or nothing */
    basket(x,z){const y=Yf(x,z,.25,.25,0),h0=hh(x,z,17),o=F(x,z,0,y),c=pick(h0,[0xb8924a,0xa8823e,0xc8a258]),d2=tint(c,.8);
      o(0,.02,0,cyl(.19,.19,.04,16),d2);for(let k=0;k<5;k++)o(0,.07+k*.065,0,cyl(.2+k*.012,.19+k*.012,.065,16),k%2?c:d2);
      o(0,.4,0,cyl(.255,.255,.04,16),tint(c,1.1));o(0,.33,0,cyl(.215,.215,.012,16),0x4a3a22);
      const kind=h0<.3?0:h0<.55?1:h0<.8?2:3;if(kind===0)for(let k=0;k<5;k++)o(Math.sin(k*1.7)*.09,.4,Math.cos(k*2.1)*.09,ico(.075,0),pick(hh(x,z,100+k),[0xc84a3a,0xd8a83a,0xa8c04a]));
      else if(kind===1)for(let k=0;k<3;k++)o((k-1)*.1,.4,(k%2)*.05,box(.2,.07,.09),0xc89a52,0,k*.6);
      else if(kind===2)for(let k=0;k<3;k++)o(Math.sin(k*2.1)*.09,.42,Math.cos(k*2.1)*.09,ico(.1,1),0x6a9a42,0,k);
      for(let k=0;k<12;k++){const a0=k/12*3.1416,a1=(k+1)/12*3.1416,x0=Math.cos(a0)*.24,y0=.42+Math.sin(a0)*.28,x1=Math.cos(a1)*.24,y1=.42+Math.sin(a1)*.28,dx=x1-x0,dy=y1-y0;o((x0+x1)/2,(y0+y1)/2,0,cyl(.02,.02,Math.hypot(dx,dy)+.02,6),d2,Math.atan2(dx,dy)*-1);}},
    /* a log pile: rows of split logs with their pale ends showing, a stake at each end, a few on the ground, a chopping block with an axe */
    firewood(x,z,rot){const y=Yf(x,z,.8,.35,rot),o=F(x,z,rot,y),h0=hh(x,z,18),rows=h0<.4?2:3;
      for(const s of[-1,1])o(s*.62,.3,0,box(.06,.6,.06),WK[0]);
      for(let r=0;r<rows;r++){const n=r===0?7:r===1?6:5;for(let k=0;k<n;k++){const px=-.45+(r%2?.07:0)+k*.15,col=pick(hh(x,z,130+r*9+k),WD);o(px,.08+r*.145,0,cyl(.065,.065,.55,7),col,Math.PI/2,Math.PI/2);o(px,.08+r*.145,.28,cyl(.058,.058,.014,7),0xb8945a,Math.PI/2,Math.PI/2);o(px,.08+r*.145,-.28,cyl(.058,.058,.014,7),0xa8844a,Math.PI/2,Math.PI/2);}}
      for(let k=0;k<3;k++)o(-.3+k*.3,.04,.45+hh(x,z,150+k)*.12,cyl(.05,.05,.4,6),pick(hh(x,z,160+k),WD),Math.PI/2,Math.PI/2+k*.3);},
    /* pottery: a big jar on its side-rings, a bellied pot with a rim and a narrow neck, a jug with a handle; terracotta, glazed brown or grey stoneware, one or two together */
    pottery(x,z){const y=Yf(x,z,.3,.3,0),h0=hh(x,z,19),o=F(x,z,0,y),c=pick(h0,[0xb86a44,0xa85a3a,0x6a5a4a,0x9a8a74,0x8a4a30]),g=tint(c,.8),n=h0<.45?1:2;
      /* turned profiles (radius, height) of the three pots, 18 sides: a big jar with a belly and a collar, a round pot with a short neck, a jug with a handle; the glaze colour is the foot and the lip */
      const JAR=[[0,0],[.12,0],[.14,.04],[.19,.12],[.232,.21],[.225,.29],[.17,.37],[.125,.43],[.115,.49],[.15,.5],[.15,.54],[.105,.54],[.1,.51],[0,.51]],
        POT=[[0,0],[.09,0],[.105,.03],[.15,.09],[.18,.17],[.16,.25],[.1,.31],[.075,.34],[.078,.4],[.1,.41],[.1,.44],[.065,.44],[0,.42]],
        JUG=[[0,0],[.075,0],[.09,.04],[.115,.1],[.12,.17],[.095,.23],[.055,.28],[.05,.32],[.068,.34],[.068,.37],[.04,.37],[0,.35]];
      for(let k=0;k<n;k++){const ox=k?.34:0,oz=k?.1:0,kind=k?(hh(x,z,170)<.5?1:2):(h0<.33?0:h0<.66?1:2);
        if(kind===0){o(ox,0,oz,lathe('jar',JAR,18),c);o(ox,.015,oz,cyl(.13,.125,.03,18),g);o(ox,.525,oz,cyl(.152,.152,.02,18),g);for(const s of[-1,1])o(ox+s*.215,.3,oz,box(.04,.14,.05),g,0,0.0);}
        else if(kind===1){o(ox,0,oz,lathe('pot',POT,18),c);o(ox,.015,oz,cyl(.095,.09,.03,18),g);o(ox,.435,oz,cyl(.102,.102,.02,18),g);for(const s of[-1,1])o(ox+s*.17,.2,oz,box(.04,.12,.04),g);}
        else{o(ox,0,oz,lathe('jug',JUG,18),c);o(ox,.015,oz,cyl(.078,.074,.03,18),g);o(ox,.36,oz,cyl(.07,.07,.02,18),g);const HP=[[.055,.31],[.12,.305],[.165,.245],[.155,.175],[.118,.13]];for(let j=0;j<4;j++){const x0=HP[j][0],y0=HP[j][1],x1=HP[j+1][0],y1=HP[j+1][1];o(ox+(x0+x1)/2,(y0+y1)/2,oz,cyl(.015,.015,Math.hypot(x1-x0,y1-y0)+.015,5),g,-Math.atan2(x1-x0,y1-y0));}}}},
    /* a waste bin: a plank box with a hinged lid half open, rags and a fish head hanging out; or an old barrel with a lid beside it; scraps on the ground */
    bin(x,z,rot){const y=Yf(x,z,.38,.3,rot),o=F(x,z,rot,y),h0=hh(x,z,21),c=pick(h0,WD);
      if(h0<.5){for(const sz of[-1,1])for(let k=0;k<4;k++)o(0,.08+k*.12,sz*.26,box(.66,.11,.025),k%2?c:tint(c,.9));for(const sx of[-1,1])for(let k=0;k<4;k++)o(sx*.33,.08+k*.12,0,box(.025,.11,.52),k%2?tint(c,.9):c);
        for(const sx of[-1,1])for(const sz of[-1,1])o(sx*.33,.26,sz*.26,box(.05,.52,.05),WK[0]);o(0,.03,0,box(.62,.03,.5),WK[0]);o(0,.52,-.27,box(.7,.03,.06),WK[0]);
        o(0,.62,.12,box(.7,.03,.5),tint(c,1.1),-.9);for(const k of[-.2,.2])o(k,.58,.0,box(.04,.04,.2),IR2);o(.05,.42,.0,box(.3,.14,.3),pick(hh(x,z,22),[0xb09a7a,0x8a8a6a,0x9a6a5a]));o(-.12,.44,.08,ico(.07,0),0x6a8a3a);}
      else{o(0,.25,0,cyl(.26,.23,.5,9),c);for(const hy of[.1,.4])o(0,hy,0,cyl(.255+hy*.02,.255+hy*.02,.035,9),IR);o(0,.22,0,cyl(.268,.268,.02,9),WK[0]);o(0,.52,0,cyl(.2,.2,.04,9),0x2a2018);for(let k=0;k<4;k++)o(Math.sin(k*1.9)*.1,.55,Math.cos(k*2.3)*.1,box(.12,.06,.1),pick(hh(x,z,200+k),[0xb09a7a,0x8a6a5a,0x9a9a7a]),0,k);
        const l=loc(x,z,rot,.42,.1);P('d',cyl(.26,.26,.03,9),WK[1],l[0],y+.015,l[1]);}},
    /* tools: a rake, a hoe and a pitchfork standing in the ground against a pole (or a stump), the way they are left at the end of a day */
    tools(x,z,rot){const y=Yf(x,z,.3,.3,rot),o=F(x,z,rot,y),h0=hh(x,z,23);o(0,.55,0,box(.09,1.1,.09),0x5a3d22);o(0,1.12,0,box(.12,.04,.12),0x4a3220);
      o(.12,.62,.1,box(.035,1.3,.035),0x8a6a40,0,0);o(.12,1.28,.1,box(.3,.04,.03),IR,0,0);for(let k=0;k<5;k++)o(.12-.12+k*.06,1.2,.1,box(.012,.1,.012),IR);
      o(-.1,.66,.1,box(.035,1.4,.035),0x7a5a34,.05);o(-.1,1.35,.1,box(.03,.03,.2),IR,0,0);o(-.1,1.3,.2,box(.025,.09,.18),IR,.6);
      if(h0>.5){o(.0,.9,-.12,box(.035,1.5,.035),0x8a6a40,-.08);for(const s of[-.06,0,.06])o(s,1.58,-.14,box(.012,.2,.012),IR);o(0,1.5,-.14,box(.16,.02,.02),IR);}
      o(.28,.04,.2,box(.28,.06,.1),0x5a3d22,0,.5);o(.3,.075,.2,box(.14,.03,.08),IR2,0,.5);},
    /* a wheelbarrow: a tapering tray of boards, two handles with grips, two legs, an iron-shod wheel on a fork, a load of earth or turnips */
    wheelbarrow(x,z,rot){const y=Yf(x,z,.4,.8,rot),o=F(x,z,rot,y),h0=hh(x,z,24),c=pick(h0,WL),d2=pick(h0,WD);
      for(const sz of[-1,1])o(sz*.26,.4,.0,box(.03,.2,.8),c,0,0);o(0,.3,-.4,box(.5,.2,.03),c);o(0,.38,.4,box(.4,.14,.03),tint(c,.9));for(let k=0;k<3;k++)o(0,.25,-.28+k*.28,box(.46,.025,.26),k%2?c:tint(c,.9));
      for(const s of[-1,1]){o(s*.22,.38,-.2,box(.04,.04,1.4),d2,0,0);o(s*.22,.38,-.95,cyl(.028,.028,.2,6),d2,Math.PI/2,Math.PI/2);o(s*.28,.2,-.55,box(.04,.4,.04),d2);o(s*.1,.24,.78,box(.03,.34,.03),d2,0,0);}
      o(0,.2,.74,cyl(.2,.2,.07,10),IR2,Math.PI/2);o(0,.2,.74,cyl(.17,.17,.08,10),d2,Math.PI/2);o(0,.2,.74,cyl(.04,.04,.12,6),IR,Math.PI/2);
      if(h0>.3)for(let k=0;k<6;k++)o(Math.sin(k*2.3)*.12,.4,-.2+(k%3)*.2,ico(.09,0),h0<.65?0x6a4a2a:0xd8c8e0,0,k);}};
  /* a stack of sawn boards laid crosswise on bearers, with a sawhorse beside it and a board across it */
  lib.lumber=(x,z,rot)=>{const y=Yf(x,z,.9,.45,rot),o=F(x,z,rot,y),h0=hh(x,z,33),c=pick(h0,WL);
    for(const s of[-1,1])o(s*.35,.03,0,box(.1,.06,.55),WK[0]);
    for(let r=0;r<5;r++)for(let k=0;k<(r%2?3:4);k++)o(-.5+k*.33+(r%2?.16:0),.09+r*.065,0,box(.28,.055,.6),k%2?tint(c,.92):c,0,r*.01);
    for(const sz of[-1,1]){o(.82,.28,sz*.2,box(.05,.56,.05),WD[0],0,0,sz*.25);o(.82,.28,sz*.2,box(.05,.56,.05),WD[0],0,0,-sz*.25);}
    o(.82,.5,0,box(.07,.07,.5),WD[1]);o(.82,.56,.0,box(.06,.04,1.1),tint(c,1.05),0,.3);o(.82,.4,0,box(.04,.04,.45),WD[2],0,0);};
  /* ---- the stands of the Scroll Merchant: standing on the ground in front of the shop (Yf), not hung on its wall. One build for each tier of settlement; t = the tier ---- */
  const PAR=[0xe9dcb4,0xdccb9a,0xefe3c4,0xd8c890],RIB=[0xb02a24,0x2a4a8a,0x3a7a4a,0xc8a030],GOLD=0xc8a030;
  /* a rolled scroll lying along local x (yaw turns it) with its ribbon, a roller knob at each end; lengths differ a little so that no two end faces lie in one plane */
  const scrollOn=(o,lx,ly,lz,len,yaw,k)=>{const L=len+((k*5)%3-1)*.05;o(lx,ly,lz,cyl(.07,.07,L,8),PAR[k%4],Math.PI/2,yaw);o(lx,ly,lz,cyl(.078,.078,.07,8),RIB[k%4],Math.PI/2,yaw);for(const sg of[-1,1]){const q=[Math.cos(yaw||0)*sg*(L/2+.02),-Math.sin(yaw||0)*sg*(L/2+.02)];o(lx+q[0],ly,lz+q[1],cyl(.03,.03,.04,6),0x6a4a2a,Math.PI/2,yaw);}};
  lib.scrollStand=(x,z,rot,t)=>{t=t||3;const y=Yf(x,z,.9,.5,rot),o=F(x,z,rot,y),h0=hh(x,z,31),wd=pick(h0,WD),wl=pick(h0,WL);
    if(t<=1){/* a hawker's barrel with scrolls standing in it, a crate of rolls beside it and a board on a post */
      lib.barrel(x,z,rot);for(let k=0;k<6;k++){const a=k*1.05,r=k%2?.1:.05;o(Math.sin(a)*r,.78+((k*3)%4)*.03,Math.cos(a)*r,cyl(.034,.034,.5+((k*3)%4)*.05,6),PAR[k%4],((k%3)-1)*.08);o(Math.sin(a)*r,1.0+((k*3)%4)*.05,Math.cos(a)*r,cyl(.04,.04,.05,6),RIB[k%4]);}
      o(.75,.22,.1,box(.5,.44,.4),wl);for(const hy of[.09,.3])o(.75,hy,.1,box(.52,.05,.42),pick(hh(x,z,32),WK));for(let k=0;k<3;k++)scrollOn(o,.75,.46+k*.0,.0+k*.12,.36,0,k);
      o(-.8,.7,.0,box(.08,1.4,.08),0x5a3d22);o(-.8,1.3,.04,box(.5,.26,.04),wd);o(-.8,1.3,.07,cyl(.06,.06,.3,8),PAR[0],Math.PI/2);o(-.8,1.3,.07,cyl(.066,.066,.05,8),RIB[1],Math.PI/2);}
    else if(t===2){/* a slanted rack on an A-frame, four scrolls on it, a basket and a tub */
      for(const s of[-1,1]){o(s*.4,.45,-.15,box(.06,.9,.06),wd,0,0);o(s*.4,.3,.25,box(.06,.62,.06),wd,.0,0);o(s*.4,.04,.05,box(.06,.06,.6),wd);}
      for(let k=0;k<3;k++)o(0,.58-k*.03,-.1+k*.18,box(.9,.04,.17),k%2?wl:tint(wl,.93),0,0,-.36);o(0,.5,.4,box(.9,.05,.05),wd);
      for(let k=0;k<3;k++)scrollOn(o,0,.7,-.05+k*.15,.62,0,k);scrollOn(o,0,.78,.04,.62,0,3);
      lib.basket(x+Math.cos(rot)*.85,z-Math.sin(rot)*.85,0);lib.bucket(x-Math.cos(rot)*.8,z+Math.sin(rot)*.8);}
    else if(t===3){/* a stall with a striped awning: a counter with a stretcher, back shelves on two posts, scrolls and books, a crate underneath */
      for(const s of[-1,1])for(const sz of[-1,1])o(s*.62,.4,sz*.22,box(.07,.8,.07),wd);o(0,.83,0,box(1.4,.06,.58),wl);o(0,.855,0,box(1.44,.02,.62),tint(wl,.85));for(const s of[-1,1])o(s*.62,.2,0,box(.05,.05,.44),wd);o(0,.18,0,box(1.2,.05,.05),wd);
      for(const s of[-1,1]){o(s*.66,1.0,-.3,box(.07,2.0,.07),wd);o(s*.66,2.0,-.0,box(.07,.07,.7),wd);}o(0,2.0,.32,box(1.4,.07,.07),wd);o(0,1.35,-.3,box(1.3,.04,.2),wl);o(0,1.75,-.3,box(1.3,.04,.2),wl);
      for(let k=0;k<5;k++){scrollOn(o,-.52+k*.26,1.45,-.3,.2,Math.PI/2,k);scrollOn(o,-.52+k*.26,1.85,-.3,.2,Math.PI/2,k+2);}
      for(let k=0;k<4;k++)scrollOn(o,-.45+k*.3,.93,.0,.42,.0,k);for(let k=0;k<3;k++)o(.4+k*.0,.88+k*.065,.12,box(.34,.06,.24),RIB[k],0,k*.3);
      for(let k=0;k<7;k++)o(-.64+k*.215,2.1,.0,box(.2,.025,.78),k%2?0x2a4a8a:0xf0e8d6,0,0,.18);for(let k=0;k<7;k++)o(-.64+k*.215,2.0+(k%2)*.0,.38,box(.2,.1,.025),k%2?0x2a4a8a:0xf0e8d6);
      o(-.4,.14,-.02,box(.5,.28,.4),wl);o(.3,.14,-.0,box(.5,.28,.4),tint(wl,.9));}
    else if(t===4){/* a stone plinth with a sloped lectern top, open scrolls and a chained book, a planter either side */
      o(0,.15,0,box(.8,.3,.6),pick(h0,STONE));o(0,.5,0,box(.6,.4,.46),tint(pick(h0,STONE),1.06));o(0,.74,0,box(.7,.07,.54),tint(pick(h0,STONE),1.12));o(0,.84,0,box(.62,.04,.44),wd,0,0,-.0);
      o(0,.96,0,box(.62,.03,.4),wl,0,0,.4);for(let k=0;k<3;k++)scrollOn(o,0,.99+k*.012,.04-k*.1,.4,0,k);o(.2,.97,.12,box(.2,.05,.15),RIB[2]);o(.14,1.0,.1,box(.02,.02,.14),0xb8b8c0);
      lib.planter(x+Math.cos(rot)*1.15,z-Math.sin(rot)*1.15,rot);lib.planter(x-Math.cos(rot)*1.15,z+Math.sin(rot)*1.15,rot);}
    else{/* a gilded lectern on a stepped plinth, a stone urn of scrolls, banners on two poles, a hanging lantern */
      o(0,.1,0,box(1.0,.2,.76),pick(h0,STONE));o(0,.4,0,box(.7,.4,.5),tint(pick(h0,STONE),1.08));o(0,.64,0,box(.8,.08,.6),GOLD);o(0,.7,0,box(.74,.04,.54),pick(h0,STONE));
      o(0,.86,0,box(.66,.03,.42),0x5a3d22,0,0,.42);for(let k=0;k<4;k++)scrollOn(o,0,.9+k*.012,.04-k*.09,.44,0,k);o(.22,.92,.14,box(.24,.05,.17),RIB[0]);o(.22,.95,.14,box(.2,.01,.13),GOLD);
      const ux=-1.25;o(ux,.07,0,cyl(.28,.32,.14,10),pick(h0,STONE));o(ux,.3,0,cyl(.2,.14,.32,10),tint(pick(h0,STONE),1.08));o(ux,.52,0,cyl(.28,.2,.12,10),pick(h0,STONE));o(ux,.58,0,cyl(.3,.3,.04,10),GOLD);
      for(let k=0;k<6;k++)o(ux+(k-2.5)*.07,.85+((k*3)%4)*.04,((k*7)%3-1)*.06,cyl(.034,.034,.5+((k*3)%5)*.04,6),PAR[k%4],((k%3)-1)*.07);
      for(const s of[-1,1]){o(s*1.55,1.1,-.25,box(.07,2.2,.07),0x3a2a1d);o(s*1.55,2.18,-.25,cyl(.045,.045,.1,6),GOLD);o(s*1.55+s*.16,1.62,-.25,box(.28,.9,.025),s>0?0x2a4a8a:0xb02a24);o(s*1.55+s*.16,1.2,-.25,box(.28,.06,.03),GOLD);o(s*1.55,1.95,-.25,box(.5,.04,.04),0x3a2a1d);}}};
  return lib;}

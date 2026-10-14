/* =====================================================================================================
   THE WORLD GENERATOR (src/world/wgen.js): an infinite landscape as a pure function of (seed, x, z).
   Nothing here depends on the order in which places are asked for, so the world can be generated round the player as it walks
   and comes out the same every time, whichever way it was reached.

   Layers, each built only from the ones above it:
   0. THE BIOME - the grasslands: the whole land stands well above the water (wgBase, 30-95 m) and rolls in vast hills (wgHills: broad valleys with
        level floors between rounded hills a few hundred metres to a kilometre and a half across, up to about 200 m high). Only the elderglade lies low.
   1. REGIONS of the biome - a soft Voronoi of 4 km cells (domain-warped borders; a region is at least about 3 x 3 km, and neighbours of one kind
        make one bigger region), each one kind of land, after the reference pictures:
        1 the highlands (tall jagged snowy spires in ranges, on the hills), 2 the floating plateau (tablelands: plateaus with sheer cliffs, pillars,
        gorges and sinkholes, on lower hills), 3 the elderglade (lowland at the water level, flooded into lakes and islands, craggy peaks, the great
        stone rings). (Weight 0 - the meadows of the first version - is no region now; it keeps its place in the weights.)
        Foliage styles (forests, fields) will be a layer on the regions.
   2. H0 - the land itself: each kind of region has its own height function, blended by the region weights.
   3. HYDROLOGY - a jittered 96 m lattice of macro heights: every point drains to its lowest neighbour (pits become lakes); the size of
        a stream comes from how many points drain into it (counted upstream to 40 steps); the water level along a stream is a running
        minimum of the ground, so a stream that reaches a cliff falls over it. Streams carve their channels, lakes their basins.
   4. SETTLEMENTS AND ROADS (wsite.js / wroad.js) - flatten the ground and smooth it under the roads.
   The world's water level for the ring lakes is WG_CFG.WL (0).
   ===================================================================================================== */
const WG_CFG={res:2,tile:128,regionCell:4000,regionBand:520,regionWarp:650,gladeK:.74,WL:0,hydroCell:96,accDepth:40,accCap:2500,
  streamAcc:5,riverAcc:16,segN:24,maxHalfW:7.5};
/* the version of the generator: a save keeps it (owSave gv), and a save made by another version gets fresh villages (its villages were other villages) */
const WG_VER=5;
const WG_T={HIGH:1,PLATEAU:2,GLADE:3};
const WG={on:false,seed:0,N:null,reg:new Map(),hyd:new Map(),seg:new Map(),lake:new Map(),feat:new Map(),stats:{h0:0}};
function wgInit(seed){WG.seed=seed|0;WG.N=[];for(let i=0;i<20;i++)WG.N.push(wnSimplex(((seed|0)*7919+i*104729+13)|0));
  WG.par=null;WG_LB.m.clear();WG.reg.clear();WG.hyd.clear();WG.seg.clear();WG.lake.clear();WG.feat.clear();WG.on=true;}
const wgKey=(i,j)=>(i+32768)*65536+(j+32768);
const wgHyp=(a,b,c)=>c===undefined?Math.sqrt(a*a+b*b):Math.sqrt(a*a+b*b+c*c);

/* ---------- 1. regions ---------- */
/* cell (a,b) has its site within a quarter of a cell of (a,b) x 4 km, so every region is at least about 3 km across (4 km on average).
   The elderglades stand apart: only the cells of one parity (a = ox and b = oz, mod 2: every other cell each way) may be one, so no two ever touch -
   each elderglade is one region round one site, with one Great Elder Circle (wgGreat). Four in five of those cells are elderglades; an elderglade's
   site keeps near its cell's middle and its region reaches farther than the others (its distances count WG_CFG.gladeK of theirs: about 4.5-5 km
   across, over a quarter of the land); the rest of the land is highlands and floating plateau, about half and half.
   The start is the middle of the highlands' cell (0,0) (the keep stands there, in a valley: the ranges keep back from it, wgMassif), and the four cells
   beside it hold an elderglade, the floating plateau and the highlands (which goes where depends on the seed): every kind is within about 2 km */
function wgPar(){if(WG.par)return WG.par;const s=WG.seed,gi=wnHashI(1,2,s)%4,g=[[0,-1],[1,0],[0,1],[-1,0]][gi];return WG.par={gi,ox:((g[0]%2)+2)%2,oz:((g[1]%2)+2)%2};}
function wgRegCell(a,b){const k=wgKey(a,b);let r=WG.reg.get(k);if(r)return r;const RC=WG_CFG.regionCell,s=WG.seed,T=WG_T,P=wgPar();
  let sx=(a-.25+.5*wnHash(a,b,s+11))*RC,sz=(b-.25+.5*wnHash(a,b,s+12))*RC,type;
  if(a===0&&b===0){sx=0;sz=0;type=T.HIGH;}
  else if(Math.abs(a)+Math.abs(b)===1){const ring=[[0,-1],[1,0],[0,1],[-1,0]],i=(ring.findIndex(q=>q[0]===a&&q[1]===b)-P.gi+4)%4;
    type=[T.GLADE,T.PLATEAU,T.HIGH,wnHash(3,4,s)<.5?T.PLATEAU:T.HIGH][i];}
  else{const el=(((a-P.ox)%2)+2)%2===0&&(((b-P.oz)%2)+2)%2===0;type=el&&wnHash(a,b,s+3)<.8?T.GLADE:wnHash(a,b,s+4)<.53?T.HIGH:T.PLATEAU;}
  if(type===T.GLADE){sx=(a+(wnHash(a,b,s+11)-.5)*.3)*RC;sz=(b+(wnHash(a,b,s+12)-.5)*.3)*RC;}
  r={a,b,sx,sz,type};WG.reg.set(k,r);return r;}
/* the weights of the kinds at a point (out[0..3], summing to 1; out[0] is always 0 now); the borders are warped and about 500 m wide.
   (The ground samples these on a 16 m lattice and interpolates - see wgCtx - they change slowly.) */
const _wgD=new Float64Array(25),_wgTy=new Int8Array(25);
function wgRegions(x,z,out){const N=WG.N,C=WG_CFG,wx=x+C.regionWarp*wnN(N[0],x/3000,z/3000)+C.regionWarp*.35*wnN(N[0],x/1000+7,z/1000-3),wz=z+C.regionWarp*wnN(N[1],x/3000+5.2,z/3000-3.1)+C.regionWarp*.35*wnN(N[1],x/1000-4,z/1000+9);
  const RC=C.regionCell,a0=Math.round(wx/RC),b0=Math.round(wz/RC),P=wgPar(),gk=C.gladeK;let dmin=1e18,n=0;
  /* the cells round the point, and the elderglades one further out (their weighted distance can still be the nearest) */
  for(let b=b0-2;b<=b0+2;b++)for(let a=a0-2;a<=a0+2;a++){const far=Math.abs(a-a0)===2||Math.abs(b-b0)===2;if(far&&!((((a-P.ox)%2)+2)%2===0&&(((b-P.oz)%2)+2)%2===0))continue;
    const r=wgRegCell(a,b);if(far&&r.type!==WG_T.GLADE)continue;let d=wgHyp(wx-r.sx,wz-r.sz);if(r.type===WG_T.GLADE)d*=gk;_wgD[n]=d;_wgTy[n]=r.type;n++;if(d<dmin)dmin=d;}
  out[0]=out[1]=out[2]=out[3]=0;let s=0;const Bw=C.regionBand;
  for(let i=0;i<n;i++){const u=(_wgD[i]-dmin)/Bw;if(u>=1)continue;const w=(1-u)*(1-u);out[_wgTy[i]]+=w;s+=w;}
  out[0]/=s;out[1]/=s;out[2]/=s;out[3]/=s;return out;}
/* ---------- the Great Elder Circle: one in every elderglade (picture 17) ----------
   The landmark of the region: a broad green mountain - five to six and a half times wider than it is tall (0.8-1.1 km out to its foot, 130-210 m high), an irregular
   lobed footprint, long rolling slopes that rise gently from the lakes and steepen a little on the way up, a broad gently domed summit, terraces in some
   sectors, spurs and gullies, outcrops and slabs of rock breaking through the grass - crowned by an enormous upright stone ring, two to three times the
   size of the region's other rings (wfeat.js / wring.js draw it). It stands a few hundred metres off the middle of the region (never on it), in a
   direction of its own, its body in the region's core; the ring faces the middle of the region, more or less. The lakes, the craggy peaks and the
   other rings keep off it. Everything from the region cell's own hashes (salts 600-660). */
function wgGreat(r){if(r.great!==undefined)return r.great;r.great=null;if(r.type!==WG_T.GLADE)return null;const s=WG.seed,H=k=>wnHash(r.a,r.b,s+600+k),W=new Float64Array(4);
  /* the middle of the region: the mean of its core (weight over .85) within 3.6 km of its site */
  let cx=0,cz=0,n=0;for(let j=-18;j<=18;j++)for(let i=-18;i<=18;i++){if(i*i+j*j>324)continue;const x=r.sx+i*200,z=r.sz+j*200;wgRegions(x,z,W);if(W[3]>.85){cx+=x;cz+=z;n++;}}
  if(n){cx/=n;cz/=n;}else{cx=r.sx;cz=r.sz;}
  const G={a:r.a,b:r.b,cx,cz,id:H(0)*97+3,Rb:820+280*H(1),hk:.155+.04*H(2),s0:.25+.07*H(3),e:1+.32*H(4),phi:H(5)*Math.PI,kS:2.5+2*H(6),tD:24+16*H(7),tA:.35+.4*H(8),R:205+60*H(9)};
  G.Hs=G.Rb*G.hk;G.th=G.R*(.105+.03*H(10));G.sink=G.R*(.17+.08*H(11));
  /* where: 380-700 m off the middle, the first of ten directions (its own, then round by the golden angle) that keeps the mountain's body in the core
     of the region and most of its foot in the region; if none does, the mountain is made smaller */
  const fit=(x,z,Rb)=>{let m=1;for(let k=0;k<12;k++){const an=k/12*6.2832,c=Math.cos(an),q=Math.sin(an);wgRegions(x+c*Rb*.72,z+q*Rb*.72,W);m=Math.min(m,W[3]-.95);wgRegions(x+c*Rb*1.05,z+q*Rb*1.05,W);m=Math.min(m,W[3]-.6);}return m;};
  const d=380+320*H(12),t0=H(13)*6.2832;let best=null;
  for(const sc of[1,.88,.76,.66]){if(best&&best.m>=0)break;for(let k=0;k<10;k++){const t=t0+k*2.39996,x=cx+Math.cos(t)*d,z=cz+Math.sin(t)*d,m=fit(x,z,G.Rb*sc*G.e);if(!best||m>best.m)best={x,z,sc,m};if(m>=0)break;}}
  G.x=best.x;G.z=best.z;G.fitM=best.m;G.Rb*=best.sc;G.Hs=G.Rb*G.hk;G.cp=Math.cos(G.phi);G.sp=Math.sin(G.phi);G.bd=G.Rb*G.e*1.3+130;
  /* the ring faces the middle of the region, give or take a third of a right angle (its face W = (-sin yaw, cos yaw)) */
  {const dx=cx-G.x,dz=cz-G.z,l=Math.hypot(dx,dz)||1;G.yaw=Math.atan2(-dx/l,dz/l)+(H(14)-.5)*1.1;}
  /* rock breaking through the slopes: crags (steep, angular, a flat grassy top) and slabs (low and broad), none on the summit */
  G.outs=[];const no=16+Math.floor(14*H(15));
  for(let k=0;k<no;k++){const h=k2=>wnHash(r.a*31+k,r.b*17-k,s+640+k2),an=h(0)*6.2832,u=.1+.74*h(1),slab=h(2)<.35,ct=Math.cos(an),st=Math.sin(an),q=G.s0+(1-G.s0)*u,rr=q*wgMtnR(G,ct,st);
    const lu=ct*G.e*rr,lv=st*rr,x=G.x+lu*G.cp-lv*G.sp,z=G.z+lu*G.sp+lv*G.cp,mid=4*u*(1-u),Rx=slab?26+26*h(3):10+16*h(3),Ry=Rx*(.5+.45*h(4)),Hc=slab?3.5+4.5*h(5):(8+18*h(5))*(.55+.45*mid),ro=h(6)*Math.PI;
    G.outs.push({x,z,Rx,Ry,H:Hc,k:slab?3.2:1.7,ca:Math.cos(ro),sa:Math.sin(ro),r2:Math.pow(Math.max(Rx,Ry)*1.27,2)});}
  /* the two peaks holding the ring: the right one taller, the left one lower (two mountains merged, each side of the ring rising out of the top of one) */
  {const HeR=G.R*(.55+.2*H(20)),HeL=HeR*(.55+.2*H(30));G.crags=[wgCragPrep(G,1,HeR,k=>H(20+k),r.a,r.b,s,670,628),wgCragPrep(G,-1,HeL,k=>H(30+k),r.a,r.b,s,690,648)];}
  return r.great=G;}
/* the peaks under the ring's two sides (picture 17; the right is +(cos yaw, sin yaw), seen from the face W): two mountains merged to hold the ring, the
   right one taller; the whole lower part of each side of the ring is buried in a craggy peak and the ring rises out of its top. Each side (wgCragPrep,
   G.crags[0] the right, [1] the left) is built alike, measured outwards along its own side; what follows says right for either. Two parts, both over the mountain's own ground:
   - the cover (wgCragCover): it buries the stone of the ring's lower right quarter - its inner edge, its outer edge, its front and back (the tube's
     radius taken generously, G.th * WG_CTH) - up to He over the summit, where the ring comes out; on the inside of the ring it follows the inner
     edge down to the ring's bottom (rock high up where that edge is steep, grass lower), across the ring it falls in steep rocky flanks that ease into grassy skirts, outwards it
     ends just past the stone, where the body's crown and grassy ramp go on;
   - the foothills (wgCragHill): one or two lower mountains merged against each peak's front and back flanks, lobed into spurs, smooth grass,
     a small rocky crown - the pedestal is a massif of several hills (each kept clear of the ring's middle);
   - the swell (wgCragSwell): the summit rising low and broad towards the peak from far to the front, back and outside, so the peak grows out of
     the mountain instead of standing on its flat top (not into the ring);
   - the body (wgCragBase): a peak whose apex stands at the ring, higher than He: steep crown round the apex (rock all round), a sheer side towards
     the ring's middle, a long concave grassy ramp outwards whose own slope stays under the walking limit (OW_CFG.slopeMax2), ribs and gullies down
     the stony faces, and spires beside where the ring comes out, a few lower crags round them and small rocky knobs off the grassy ridge.
   The ring's contacts (wring.js wrContact) find the stone coming out at the tops, and its earth and bushes go there. Its own hashes (the right:
   salts 620-629, swell 628, spires and knobs 670-681; the left: 630-639, 648, 690-701; foothills 710-717 and 730-737). The ring's middle is untouched (the summit's height there is the ring's height, wfGreat). */
const WG_CTH=1.5,WG_CRK=.4,WG_CRD=.2;
/* one side's peak: sd = 1 the right (+(cos yaw, sin yaw)), -1 the left; He where the ring comes out of its top; Hk(k) its hashes (0-9); ps, pw the
   salts of its spires and knobs and of its swell. Everything below is measured outwards from the ring's middle along its own side (C.ga, C.gs). */
function wgCragPrep(G,sd,He,Hk,a,b,s,ps,pw){const R=G.R,c0=R-G.sink,ca=sd*Math.cos(G.yaw),sa=sd*Math.sin(G.yaw),thE=G.th*WG_CTH,H=k=>Hk(k-20);
  /* where the ring comes out (He over the summit, on the ring's own curve, xe from its middle); the apex at the ring, higher */
  const xe=Math.sqrt(Math.max(0,R*R-(He-c0)*(He-c0))),Hp=He+R*(.14+.08*H(21))*(sd>0?1:.8),ua=xe+R*.05*H(22),ro=G.yaw+(sd>0?0:Math.PI)-sd*(.25+.35*H(23));/* (turned so its stony side looks a little towards the ring's front, W) */
  const hc=wgMtn(G,G.x,G.z,0);/* (the summit at the ring's middle: G.crags is not set yet) */
  const C={sd,x:G.x+ca*ua,z:G.z+sa*ua,ca:Math.cos(ro),sa:Math.sin(ro),H:Hp,Li:Hp*(.4+.12*H(24)),Lo:Hp*(2.9+.55*H(25)),Lv:Hp*(.7+.25*H(26)),id:3+H(27)*50,pins:[],
    gx:G.x,gz:G.z,ga:ca,gs:sa,c0,He,hc,thE,rin:R-thE,sOut:Math.sqrt(Math.max(0,(R+thE)*(R+thE)-(c0-He)*(c0-He))),tw:thE+4};
  C.ex=(He+40)/.55+20;C.r2=Math.pow(Math.max(C.Lo*1.3,C.Lv*1.3,1.1*Math.hypot(Math.max(ua+40,C.sOut+200-ua),C.tw*1.25+C.ex)),2);/* (both the body and the cover's reach) */
  /* the swell: the summit itself rises towards the peak (low and broad, gentle everywhere), so the peak grows out of the mountain rather than standing
     on its flat top; it reaches far to the front, the back and outwards, but not into the ring (its stony inner side keeps its height, the summit's
     drainage under the ring stays as it was, the ring's middle and left foot are untouched) */
  C.Hw=Hp*(.28+.08*wnHash(a,b,s+pw));C.Lwo=C.Lo*1.3;C.Lwv=C.Lv*2.7;C.Lwi=ua*1.1;C.R=R;
  /* spires and crags, placed in the ring's own frame (s along it from its middle, t across it): the tallest beside where the ring comes out, outside
     it; the others round it, in front of and behind the stone and down its inner side; their feet sunk into the peak */
  const pin=(pa,pt,Hh,sl,an,el,sink)=>{const px=G.x+pa*ca-pt*sa,pz=G.z+pa*sa+pt*ca,m=wgMtn(G,px,pz,0),bs=wnSmax(m+wgCragBase(C,px,pz)+wgCragSwell(C,px,pz),wgCragCover(C,px,pz),24);
    C.pins.push({x:px,z:pz,b:bs-Hh*sink,H:Hh*(1+sink),sl,ca:Math.cos(an),sa:Math.sin(an),ik:1,k:1/(el*el),pw:1.15,r2:Math.pow(Hh*(1+sink)/sl/el*1.2,2)});};
  const np=6+Math.floor(4*H(28));for(let k=0;k<np;k++){const h=k2=>wnHash(a*13+k,b*29-k,s+ps+k2);let ps2,pt,Hh;
    if(k===0){ps2=xe+thE+10+25*h(0);pt=(h(1)-.5)*thE;Hh=Hp*(.24+.12*h(2));}
    else if(k<4){ps2=xe+(h(0)-.4)*thE*1.6;pt=(h(1)<.5?-1:1)*(thE+8+30*h(5));Hh=Hp*(.1+.14*h(2));}/* (in front of and behind the stone) */
    else{ps2=xe-thE-10-60*h(0);pt=(h(1)-.5)*thE*1.4;Hh=Hp*(.06+.08*h(2));}/* (lower, down its inner side) */
    pin(ps2,pt,Hh,k===0?3+h(3):2.4+1.6*h(3),h(4)*Math.PI,.5+.4*h(5),.55);}
  const at=(pu,pv)=>[C.x+pu*C.ca-pv*C.sa,C.z+pu*C.sa+pv*C.ca];
  const nk=2+Math.floor(3*H(29));for(let k=0;k<nk;k++){const h=k2=>wnHash(a*17+k,b*23-k,s+ps+6+k2),[px,pz]=at(C.Lo*(.12+.3*h(0)),(h(1)<.5?-1:1)*(.38+.25*h(2))*C.Lv);/* (off the ridge: its line stays a grassy way up) */
    const dx=px-G.x,dz=pz-G.z;pin(dx*ca+dz*sa,-dx*sa+dz*ca,Hp*(.03+.035*wnHash(a*17+k,b*23-k,s+ps+11)),1.5+.5*h(3),h(4)*Math.PI,.55+.35*h(5),.5);}
  /* foothills: one or two lower mountains merged against the peak's front and back flanks (never before the ring's opening), so the pedestal is a
     massif of several hills: lobed into spurs and gullies, smooth grass on their slopes (walkable), a small rocky crown */
  C.hills=[];const nh=sd>0?2:1+(wnHash(a,b,s+ps+40)<.5?1:0);for(let k=0;k<nh;k++){const h=k2=>wnHash(a*7+k,b*11-k,s+ps+41+k2),side=k===0?1:-1,
      hs=xe+R*(-.1+.5*h(0))+(k?R*.25:0),ht=side*C.Lv*(1.3+.6*h(1)),Hf=Hp*(sd>0?.38+.17*h(2):.45+.2*h(2)),an=h(3)*Math.PI;
    const e=1.15+.35*h(5),D=Math.hypot(hs,ht),L=Math.min(Hf*(3.2+.6*h(4)),(D-R*.35)/(e*1.25));/* (its footprint keeps clear of the ring's middle: the ring's height stays) */
    if(L>40)C.hills.push({x:G.x+hs*ca-ht*sa,z:G.z+hs*sa+ht*ca,H:Math.min(Hf,L/3.2),L,e,ca:Math.cos(an),sa:Math.sin(an),id:7+40*h(6)});}
  for(const F of C.hills){const r=Math.hypot(F.x-C.x,F.z-C.z)+F.L*F.e*1.35;if(r*r>C.r2)C.r2=r*r;}
  return C;}
/* the body (over the mountain's ground): its distance from the apex in its own lengths (short inwards, long outwards, middling across), its outline
   lobed by the true direction (by the stretched one a step across the long ridge would turn the lobes fast and make its sides steep); a steep crown
   (the top two fifths of its height, within a fifth of its lengths), under it a sheer inner side and a concave walkable ramp outwards */
function wgCragBase(C,x,z){const dx=x-C.x,dz=z-C.z,u=dx*C.ca+dz*C.sa,v=-dx*C.sa+dz*C.ca,Lu=u>0?C.Lo:C.Li,nu=u/Lu,nv=v/C.Lv;let d=Math.sqrt(nu*nu+nv*nv)+1e-6;
  if(d>1.4)return 0;/* (the lobes bring its edge in by at most about a quarter: nothing out here) */
  const N=WG.N[13],cu=nu/d,g=wnS(cu,-.35,.45),r=Math.hypot(u,v)+1e-6,ru=u/r,rv=v/r;
  d*=1+(.18-.08*g)*wnN(N,ru*1.2+C.id,rv*1.2)+.05*wnN(N,ru*2.9-C.id,rv*2.9);if(d>=1)return 0;
  const cr=d<WG_CRD?Math.pow(1-d/WG_CRD,1.3):0;return C.H*((1-WG_CRK)*Math.pow(1-d,1.3+.4*g)+WG_CRK*cr);}
/* a foothill (over the mountain's ground): a lobed, a little stretched mound - its lobes give it spurs and gullies - its
   profile concave and walkable (steepest at the top, 1.3 H / L), a small steep crown (rock) */
const WG_FK=.22,WG_FD=.16;
function wgCragHill(F,x,z){const dx=x-F.x,dz=z-F.z,u=dx*F.ca+dz*F.sa,v=-dx*F.sa+dz*F.ca,r=Math.hypot(u,v)+1e-6;let d=Math.hypot(u/F.e,v)/F.L;if(d>1.3)return 0;
  const N=WG.N[18];d*=1+.14*wnN(N,u/r*1.6+F.id,v/r*1.6)+.06*wnN(N,u/r*3.7-F.id,v/r*3.7);if(d>=1)return 0;
  return F.H*((1-WG_FK)*Math.pow(1-d,1.7)+WG_FK*(d<WG_FD?Math.pow(1-d/WG_FD,1.3):0));}
/* the swell under the peak (over the mountain's ground): an ellipse round the apex in the peak's frame, its profile (1 - q^2)^2 (flat at the top and
   at its edge, steepest at 1.5 Hw / L: gentle), faded out along the ring before it reaches inside the ring */
function wgCragSwell(C,x,z){const dx=x-C.x,dz=z-C.z,u=dx*C.ca+dz*C.sa,v=-dx*C.sa+dz*C.ca,lu=u>0?C.Lwo:C.Lwi,q2=(u*u)/(lu*lu)+(v*v)/(C.Lwv*C.Lwv);if(q2>=1)return 0;
  const sg=(x-C.gx)*C.ga+(z-C.gz)*C.gs,f=(1-q2)*(1-q2)*wnS(sg,C.R*.4,C.R*.8);return f>0?C.Hw*f*(1+.15*wnN(WG.N[17],x/240+C.id,z/240)):0;}
/* the cover: the height (over the water, as wgMtn's) that buries the ring's lower right at a point, or -1e9 off it. Along the ring (s): the inner
   edge's height while it is under He, He + a margin over the stone where the ring goes up through the top, ending just past its outer edge (the body goes on from there);
   across it (t): a top as wide as the stone, then steep rocky sides; its edges wander so it is no straight cut */
const _wgCv={rk:1};/* (the last cover worked out: how rocky it is there - its grassy skirts 0) */
function wgCragCover(C,x,z){const dx=x-C.gx,dz=z-C.gz,s=dx*C.ga+dz*C.gs,t=-dx*C.gs+dz*C.ga;if(s<-40||s>C.sOut+200||Math.abs(t)>C.tw*1.25+C.ex)return -1e9;/* (C.ex: as far as its skirts can reach over the summit) */
  const N=WG.N,ri=C.rin,ss=Math.max(0,s);let y=ss<ri?Math.min(C.He,C.c0-Math.sqrt(ri*ri-ss*ss)):C.He;
  if(s<C.R*.25)y-=C.R*.25-s;/* (nothing to bury near the ring's middle - its bottom is sunk in the summit - and the seam with the ground must not lift it there) */
  y+=3+.015*C.He*wnN(N[16],s/120+C.id,t/120);_wgCv.rk=1;if(s>C.sOut)y-=(s-C.sOut)*1.3;/* (past the stone there is nothing to bury: the body's crown and grassy ramp go on from there) */
  /* (its front and back: a steep rocky upper flank, then a gentler grassy skirt, so seen from the front it is rock above and grass below) */
  const tw=C.tw*(1+.22*wnN(N[15],s/70-C.id,C.id)),ex=Math.abs(t)-tw;if(ex>0){const k1=1.05+.35*wnN(N[14],s/90+C.id,t>0?3:-3),e0=Math.max(4,y*(.42+.1*wnN(N[16],s/60-C.id,t>0?5:-5)))/k1,e1=Math.min(ex,e0);y-=e1*k1+Math.max(0,ex-e1)*.55;_wgCv.rk=1-wnS(ex-e0,0,12);}/* (rock down the top ~45 % of its height) */
  return C.hc+y;}
/* the peak at a point over the mountain's height hm there: swell, body and cover, ribs and gullies down the stony faces, soft shoulders on the grassy side,
   the spires and crags */
function wgCragApply(C,hm,x,z,det){const dx=x-C.x,dz=z-C.z;if(dx*dx+dz*dz>C.r2)return hm;let hb=wgCragBase(C,x,z);
  const N=WG.N,u=dx*C.ca+dz*C.sa,v=-dx*C.sa+dz*C.ca;
  if(hb>.01){const Lu=u>0?C.Lo:C.Li,cu=u/Lu/(Math.hypot(u/Lu,v/C.Lv)+1e-6),inner=1-wnS(cu,-.2,.6),up=wnS(hb/C.H,.08,.55);
    if(!det||det<90)hb+=inner*up*C.H*.1*(wnRidged(N[9],v/48+C.id,u/120,2,2.2,.5,1,2)-.45);/* (buttresses) */
    if(!det||det<35)hb+=inner*up*C.H*.05*(wnRidged(N[10],v/17-C.id,u/55,2,2.1,.5,1,2)-.45);/* (ribs and gullies) */
    if(!det||det<150)hb+=(1-inner)*wnS(hb/C.H,0,.3)*C.H*.02*wnN(N[16],x/150+C.id,z/150);/* (shoulders and hollows on the grassy side) */
}
  /* (the body and the foothills merged as one mass: a 4-norm of their heights - exactly the one where the other is nothing, a soft union where both
     stand - so no step at the edge of either) */
  let un=Math.pow(Math.max(0,hb),4);for(const F of C.hills){const fh=wgCragHill(F,x,z);if(fh>0)un+=fh*fh*fh*fh;}
  let h=hm+wgCragSwell(C,x,z)+Math.pow(un,.25);
  const cv=wgCragCover(C,x,z);if(cv>h-24){let c=cv;if((!det||det<35)&&cv>h)c+=Math.min(cv-h,30)*.12*_wgCv.rk*(wnRidged(N[10],x/19+C.id,z/19,2,2.1,.5,1,2)-.45);h=wnSmax(h,c,24);}/* (ribs on its rock only: its grassy skirts stay smooth) *//* (a wide seam: the flanks run into the ground in a curve, no crease) */
  for(const p of C.pins){const px=x-p.x,pz=z-p.z;if(px*px+pz*pz>p.r2)continue;const a=px*p.ca+pz*p.sa,b=pz*p.ca-px*p.sa,q=Math.sqrt(a*a*p.ik+b*b*p.k)*p.sl/p.H;if(q>=1)continue;
    let ph=p.b+p.H*Math.pow(1-q,p.pw);if(!det||det<30)ph+=p.H*.05*wnN(N[9],a/7+p.x*.01,b/7);h=wnSmax(h,ph,6);}
  return h;}
/* whether the peak shapes a point (the checks measure the mountain without it) */
function wgCragIn(C,x,z){return wgCragBase(C,x,z)>0||wgCragCover(C,x,z)>C.hc-5||C.hills.some(F=>wgCragHill(F,x,z)>0);}
/* the mountain's radius in a direction (the lobes of its footprint), and its height over the water level at a point (0 off it) */
function wgMtnR(G,ct,st){const N=WG.N[13],id=G.id;return G.Rb*(1+.14*wnN(N,ct*1.3+id,st*1.3)+.06*wnN(N,ct*3.1-id,st*3.1+id));}
function wgMtn(G,x,z,det){const dx=x-G.x,dz=z-G.z;if(dx*dx+dz*dz>G.bd*G.bd)return 0;const N=WG.N,id=G.id;
  const wx=dx+90*wnN(N[19],x/1300+id,z/1300),wz=dz+90*wnN(N[19],x/1300-id,z/1300+3.3),u=wx*G.cp+wz*G.sp,v=-wx*G.sp+wz*G.cp,r=Math.sqrt(u*u/(G.e*G.e)+v*v)+1e-6,ct=u/G.e/r,st=v/r;
  const q=r/wgMtnR(G,ct,st);if(q>=1)return 0;
  /* the profile: a broad summit that falls 6 % to its edge, then the slopes: gentle at the top, steepest a little below the middle, long and soft at the foot */
  let h,sl=0;if(q<G.s0){const t=q/G.s0;h=G.Hs*(1-.06*t*t);}else{const t=(q-G.s0)/(1-G.s0);h=G.Hs*.94*Math.pow(1-t,1.6)*(1+1.6*t);sl=4*t*(1-t);}
  const fade=1-wnS(q,.82,1);
  /* terraces in some sectors (benches and short steeper risers), spurs and gullies down the slopes, the ground rolling */
  const tau=sl*G.tA*wnS(wnN(N[17],ct*1.1+id*1.7,st*1.1-id),-.1,.5);if(tau>.01){const f=h/G.tD,fi=Math.floor(f);h+=tau*(G.tD*(fi+wnS(f-fi,.3,.7))-h);}
  if(!det||det<120)h+=sl*G.Hs*.03*wnN(N[18],ct*G.kS*.6+q*1.1+id,st*G.kS*.6-q*.8);/* (soft spurs and hollows, not ribs) */
  if(!det||det<260)h+=fade*(2.5+5*sl)*wnN(N[16],x/260+id,z/260);
  /* (near the pedestal the grass is smooth: its own shapes are larger) */
  let pq=0;if(G.crags)for(const C of G.crags){const ex=x-C.x,ez=z-C.z,rr=C.Lo*1.1;pq=Math.max(pq,1-wnS(ex*ex+ez*ez,rr*rr*.36,rr*rr));}
  if(!det||det<110)h+=fade*1.5*(.4+sl)*(1-.85*pq)*wnN(N[15],x/110-id,z/110);
  /* (outcrops: rounded and lobed - a sculpted dome with steep curved sides for a crag, a low broad hump with soft edges for a slab) */
  for(const O of G.outs){const ox=x-O.x,oz=z-O.z;if(ox*ox+oz*oz>O.r2)continue;const a=(ox*O.ca+oz*O.sa)/O.Rx,b=(-ox*O.sa+oz*O.ca)/O.Ry,rr=Math.sqrt(a*a+b*b)+1e-6;
    const dd=rr*(1+.18*wnN(N[14],a/rr*1.4+O.x*.01,b/rr*1.4)+.07*wnN(N[14],a/rr*3.3-O.z*.01,b/rr*3.3));if(dd>=1)continue;h+=O.k>2?O.H*Math.pow(1-dd*dd*dd,1.5):O.H*Math.pow(1-dd*dd,1.35);}
  /* the peaks under the ring's two sides */
  if(G.crags)for(const C of G.crags)h=wgCragApply(C,h,x,z,det);
  return h;}
/* the Great Elder Circle nearest a point (or null) */
function wgGreatNear(x,z){const RC=WG_CFG.regionCell,a0=Math.round(x/RC),b0=Math.round(z/RC);let best=null,bd=1e18;
  for(let b=b0-2;b<=b0+2;b++)for(let a=a0-2;a<=a0+2;a++){const G=wgGreat(wgRegCell(a,b));if(!G)continue;const d=Math.hypot(x-G.x,z-G.z);if(d<bd){bd=d;best=G;}}return best;}
/* how far a point is inside the great mountain's footprint: < 1 on it (a rough measure: the footprint's mean radius, stretched along its long axis) */
function wgGreatQ(G,x,z){const dx=x-G.x,dz=z-G.z,u=dx*G.cp+dz*G.sp,v=-dx*G.sp+dz*G.cp;return Math.sqrt(u*u/(G.e*G.e)+v*v)/G.Rb;}

/* the grasslands stand high: the slow rise and fall of the whole land (the floors of its valleys; every kind but the elderglade stands on it), and the
   forest overlay (it shades the ground now, and will hold the trees) */
function wgBase(x,z){const N=WG.N[2];return 62+22*wnN(N,x/5200,z/5200)+9*wnN(N,x/1900+3,z/1900-7);}
function wgForest(x,z){const N=WG.N[14];return wnS(wnN(N,x/1100+50,z/1100-20)*.5+.5+.12*wnN(N,x/280-9,z/280+3),.5,.64);}
/* the hills of the grasslands: how big they are here (a slow field: downs to great hills) and how their pattern is warped (so the valleys wind) - both
   slow, on the lattice (wgCtx) - and the hills themselves, sampled at every point (their shapes are too fine for the lattice): a fractal sum of three
   octaves from 2.8 km down, the big one leading (so the slopes stay long: a hill a kilometre or more across rises 100-250 m, mostly under 20 degrees),
   its lowest quarter cut off into broad valley floors (where streams wander, villages and roads find room), the rest rising in a soft concave foot;
   and over all of it low swells (6 m over 400 m on the hills, half that on the floors, a little finer on them), so no floor is dead level.
   W: the fields of the point (wgFields). */
function wgHillA(x,z){const N=WG.N[19];return 95+120*wnS(wnN(N,x/4600,z/4600)*.5+.5+.15*wnN(N,x/1700-8,z/1700+5),.25,.8);}
const WG_HN=1/(1+.3+.09);
function wgHills(x,z,W,c){const N=WG.N[3],wx=x+W[7],wz=z+W[8],no=wgOct(c,2800,3,2.15);let s=0,a=1,f=1/2800;
  for(let o=0;o<no;o++){s+=a*wnN(N,wx*f+o*17.3,wz*f-o*9.1);a*=.3;f*=2.15;}/* (normalised by all three octaves, so far chunks that leave out the last ones match) */
  const u=(s*WG_HN+.3)/.72,N4=WG.N[4];let h=u>0?W[6]*Math.pow(u,1.15):0;const sw=.5+.5*wnS(u,0,.3);
  if(!c.det||c.det<420)h+=6*sw*wnN(N4,x/420,z/420);if(!c.det||c.det<150)h+=2.1*sw*wnN(N4,x/150+9,z/150-3);return h;}
/* the hills at a single point (its own fields) */
const _wgHW=new Float64Array(9);
function wgHillsAt(x,z){const N=WG.N[19],W=_wgHW;W[6]=wgHillA(x,z);W[7]=200*wnN(N,x/2300+17,z/2300-4);W[8]=200*wnN(N,x/2300-9,z/2300+21);return wgHills(x,z,W,{det:0});}

/* ---------- the sampling context ----------
   Everything that changes slowly (the region weights, the base, the forest, the size and warp of the hills) is computed on a global 16 m lattice and
   interpolated, and the features (needles, pillars, sinkholes, craggy peaks) that reach into a rectangle are listed once for it; a point gets the same
   value from any context that covers it, so chunks of any size agree. det: the shortest wavelength worth computing (far chunks leave out detail they
   cannot show). */
const WG_FC=16,WG_NF=9;
/* the lattice's fields are kept in blocks of 32 x 32 points once worked out (512 m: the ground's tiles and chunks, the hydrology's blocks, the streams,
   the sites, the roads all ask for overlapping rectangles - each point was worked out again by every one of them); the same numbers, the least recently
   used blocks let go past WG_LB.max */
const WG_LB={m:new Map(),max:700,n:32};
function wgLatBlock(bi,bj){const k=wgKey(bi,bj),M=WG_LB.m;let F=M.get(k);if(F){M.delete(k);M.set(k,F);return F;}
  const n=WG_LB.n,NF=WG_NF,C=WG_FC,W=new Float64Array(4),N19=WG.N[19];F=new Float32Array(n*n*NF);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(bi*n+i)*C,z=(bj*n+j)*C,q=(j*n+i)*NF;wgRegions(x,z,W);F[q]=W[0];F[q+1]=W[1];F[q+2]=W[2];F[q+3]=W[3];F[q+4]=wgBase(x,z);F[q+5]=wgForest(x,z);
    F[q+6]=wgHillA(x,z);F[q+7]=200*wnN(N19,x/2300+17,z/2300-4);F[q+8]=200*wnN(N19,x/2300-9,z/2300+21);}
  M.set(k,F);if(M.size>WG_LB.max)M.delete(M.keys().next().value);return F;}
function wgCtx(x0,z0,x1,z1,det){const C=WG_FC,NF=WG_NF,i0=Math.floor(x0/C)-1,i1=Math.floor(x1/C)+2,j0=Math.floor(z0/C)-1,j1=Math.floor(z1/C)+2,nx=i1-i0+1,nz=j1-j0+1,M=nx*nz;
  const F=new Float32Array(M*NF),LN=WG_LB.n;let mx=[0,0,0,0];
  for(let j=0;j<nz;j++){const gj=j0+j,bj=Math.floor(gj/LN),rj=gj-bj*LN;let bi=-1e9,B=null;
    for(let i=0;i<nx;i++){const gi=i0+i,bi2=Math.floor(gi/LN);if(bi2!==bi){bi=bi2;B=wgLatBlock(bi,bj);}const qb=(rj*LN+gi-bi*LN)*NF,q=(j*nx+i)*NF;
      for(let t=0;t<NF;t++)F[q+t]=B[qb+t];for(let t=0;t<4;t++)if(F[q+t]>mx[t])mx[t]=F[q+t];}}
  const c={x0,z0,x1,z1,i0,j0,nx,nz,F,mx,det:det||0,horns:[],pillars:[],sinks:[],crags:[]};
  /* (rmax: the farthest a feature reaches from its cell - every feature that can touch the rectangle must be listed, or two chunks disagree) */
  const scan=(CS,salt,prob,rmax,make,list)=>{const a0=Math.floor((x0-rmax)/CS),a1=Math.floor((x1+rmax)/CS),b0=Math.floor((z0-rmax)/CS),b1=Math.floor((z1+rmax)/CS);
    for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){if(wnHash(a,b,WG.seed+salt)>prob)continue;const f=make(a,b);if(f.x+f.r<x0||f.x-f.r>x1||f.z+f.r<z0||f.z-f.r>z1)continue;list.push(f);}};
  const s=WG.seed;
  /* spires: a horn peak in most cells of a 230 m grid - an anisotropic cone, its height from the massif mask (ranges of high peaks, valleys between);
     a few are needles, far taller and steeper, fluted */
  if(mx[1]>0)scan(230,71,.9,760,(a,b)=>{const x=(a+.15+.7*wnHash(a,b,s+72))*230,z=(b+.15+.7*wnHash(a,b,s+73))*230,env=wgMassif(x,z),h=wnHash(a,b,s+75),th=wnHash(a,b,s+76)*Math.PI,k=1+.9*wnHash(a,b,s+77);
      const nd=wnHash(a,b,s+78)<.07&&env>.55;let H=env*(70+400*Math.pow(h,1.5)),sl=1+.75*wnHash(a,b,s+74);if(nd){H=380+330*h;sl=3.2+1.4*wnHash(a,b,s+79);}
      if(!nd)sl*=1.18;const pw=nd?1.05:H<130?1.55:1.25;return{x,z,H,sl,pw,ca:Math.cos(th),sa:Math.sin(th),k,ik:1/k,r:H<20?0:H/sl*Math.sqrt(k)*1.25+30,nd,id:a*13.1+b*7.7};},c.horns);
  if(mx[2]>0){/* pillars stand where the land is just below the next tier (by a cliff: broken off it) or in a gorge */
    scan(210,81,.55,60,(a,b)=>{const x=(a+.2+.6*wnHash(a,b,s+82))*210,z=(b+.2+.6*wnHash(a,b,s+83))*210,t=wgTierT(x,z),f=t-Math.floor(t),Rp=8+18*wnHash(a,b,s+84);
      if(!(f>.5&&f<.97)&&!(t<.6))return{x,z,r:-1e9};return{x,z,Rp,r:Rp*2.2,top:Math.floor(t)+1.15+.85*wnHash(a,b,s+85),id:a*5.3+b*3.1};},c.pillars);
    scan(390,91,.3,40,(a,b)=>{const Rs=14+20*wnHash(a,b,s+94),x=(a+.25+.5*wnHash(a,b,s+92))*390,z=(b+.25+.5*wnHash(a,b,s+93))*390,k=.55+.4*wnHash(a,b,s+95),N=WG.N,ti=Math.floor(wgTierT(x,z)),dL=78+28*wnN(N[12],x/3200,z/3200);
      return{x,z,Rs,r:Rs*1.1,k,a,b,pool:wgBase(x,z)+WG_TBH*wgHillsAt(x,z)+2+(ti-k)*dL+2.2,ti};},c.sinks);}
  /* the Great Elder Circles whose mountains reach into the rectangle */
  c.greats=[];if(mx[3]>0){const RC=WG_CFG.regionCell;for(let b=Math.ceil((z0-5800)/RC);b<=Math.floor((z1+5800)/RC);b++)for(let a=Math.ceil((x0-5800)/RC);a<=Math.floor((x1+5800)/RC);a++){const G=wgGreat(wgRegCell(a,b));
      if(G&&G.x+G.bd>x0&&G.x-G.bd<x1&&G.z+G.bd>z0&&G.z-G.bd<z1)c.greats.push(G);}}
  /* the elderglade's rocky hills: clusters of rounded knolls - steep curved rock sides, grassy domed tops (none on or close by the great mountain: it
     must stand clear) */
  if(mx[3]>0)scan(430,101,.4,900,(a,b)=>{const x=(a+.25+.5*wnHash(a,b,s+102))*430,z=(b+.25+.5*wnHash(a,b,s+103))*430,H=50+140*Math.pow(wnHash(a,b,s+105),1.3),n=4+Math.floor(wnHash(a,b,s+106)*5),L=[];
      {const G=wgGreatNear(x,z);if(G&&wgGreatQ(G,x,z)<1.12+(H*4.2+60)/G.Rb*.5)return{x,z,r:-1e9,L,H};}
      for(let q=0;q<n;q++){const an=wnHash(a,b,s+110+q)*6.283,rr=q?(.25+.6*wnHash(a,b,s+120+q))*H*1.1:0,hq=q?H*(.3+.5*wnHash(a,b,s+130+q)):H,sl=.9+.6*wnHash(a,b,s+140+q),th=wnHash(a,b,s+150+q)*3.14,k=1+.7*wnHash(a,b,s+160+q);
        L.push({x:x+Math.cos(an)*rr,z:z+Math.sin(an)*rr,H:hq,sl:sl*.52,pw:1.7+.5*wnHash(a,b,s+170+q),ca:Math.cos(th),sa:Math.sin(th),k,ik:1/k,id:wnHash(a,b,s+180+q)*40});}
      return{x,z,r:H*4.2+60,L,H};},c.crags);
  return c;}
/* the slow fields at a point, interpolated from the context's lattice: out = [w0,w1,w2,w3,base,forest,hill size,hill warp x,hill warp z] */
function wgFields(c,x,z,out){const C=WG_FC,NF=WG_NF,fx=x/C-c.i0,fz=z/C-c.j0,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,nx=c.nx,F=c.F,q=(j*nx+i)*NF,q1=q+NF,q2=q+nx*NF,q3=q2+NF;
  for(let t=0;t<NF;t++){const a=F[q+t],b=F[q1+t],d=F[q2+t],e=F[q3+t];out[t]=(a+(b-a)*u)+((d+(e-d)*u)-(a+(b-a)*u))*v;}return out;}
/* octave counts that leave out wavelengths shorter than the context's detail (w0: the first octave's wavelength) */
const wgOct=(c,w0,oct,lac)=>{if(!c.det)return oct;let n=0,w=w0;while(n<oct&&w>=c.det){n++;w/=lac;}return Math.max(1,n);};

/* ---------- 2. the land of each kind ---------- */
/* the highlands (picture 13): horn peaks - anisotropic cones whose intersections are knife-edge ridges and cols - in ranges (the massif mask), on the
   hills of the grasslands; the valleys between them rise in a concave curve into the mountains (glacial U-valleys), the faces broken by ribs and
   gullies (ridged noise in proportion to the height), and here and there a needle far taller than its neighbours, fluted. The ranges keep a
   kilometre or so back from the start (the keep stands in a valley among the hills, the mountains all round). */
function wgMassif(x,z){const N=WG.N[8];return wnS(wnN(N,x/1600,z/1600)*.5+.5+.2*wnN(N,x/560+9,z/560-4),.28,.62)*wnS(Math.sqrt(x*x+z*z),650,1500);}
function wgCone(L,x,z,m,k0){for(const p of L){const dx=x-p.x,dz=z-p.z,u=dx*p.ca+dz*p.sa,v=dz*p.ca-dx*p.sa,d=Math.sqrt(u*u*p.ik+v*v*p.k),q=d*p.sl/p.H;if(q>=1)continue;const h=p.H*Math.pow(1-q,p.pw||1);if(h>m-k0)m=wnSmax(m,h,k0);}return m;}
function wgSpires(x,z,B,o,c){const N=WG.N,fl=B+4+2.5*wnN(N[5],x/210,z/210)+.8*wnN(N[5],x/53+3,z/53);
  const wx=x+55*wnN(N[7],x/320,z/320),wz=z+55*wnN(N[7],x/320+11,z/320+3);
  let m=-30;for(const p of c.horns){if(p.r<=0)continue;const dx=wx-p.x,dz=wz-p.z;if(dx*dx+dz*dz>p.r*p.r)continue;const u=dx*p.ca+dz*p.sa,v=dz*p.ca-dx*p.sa;let d=Math.sqrt(u*u*p.ik+v*v*p.k);
    if(p.nd){const an=Math.atan2(dz,dx),ca=Math.cos(an),sa=Math.sin(an);d*=1+.16*wnN(N[9],ca*1.9+p.id,sa*1.9-p.id)+.08*wnN(N[9],ca*6.1-p.id,sa*6.1+p.id);}
    const q=d*p.sl/p.H;if(q>=1.25)continue;const h=q<1?p.H*Math.pow(1-q,p.pw):p.H*(1-q)*.5;if(h>m-14)m=wnSmax(m,h,p.nd?6:14);}
  /* the faces: ribs and gullies, deeper the higher the face */
  if(m>3){const r1=wnRidged(N[6],wx/120,wz/120,wgOct(c,120,3,2.1),2.1,.55,1,2),r2=(!c.det||c.det<34)?wnRidged(N[11],x/34,z/34,2,2.2,.5,1,2):.45;m+=Math.min(m,300)*(.16*(r1-.42)*wnS(m,6,90)+.05*(r2-.45));}
  /* the valley floor and its concave rise into the mountains */
  if(m<0)m=0;else if(m<24)m=m*m/48;else m-=12;
  if(o){o.mtn=m;o.fl=fl;}return fl+m;}
/* tablelands (pictures 14-16): plateaus in tiers, every tier a level top ending in a sheer cliff (its width in metres is the same everywhere:
   the slope of the tier field is measured), a concave talus apron at the foot of every cliff, narrow gorges cut down through the tiers,
   pillars standing by the cliffs and in the gorges, sinkholes in the tops; the valley floors roll gently */
function wgTierT(x,z){const N=WG.N,wx=x+200*wnN(N[10],x/900,z/900)+70*wnN(N[10],x/260+3,z/260),wz=z+200*wnN(N[10],x/900+7.7,z/900-2.3)+70*wnN(N[10],x/260-6,z/260+2);
  const P=wnFbm(N[9],wx/860,wz/860,4,2,.5);let t=(P*.62+.5)*3.2+.15*wnN(N[11],x/310,z/310);
  /* gorges: wide chasms with stepped walls (the tiers go on down their sides); some reach the valley floor, most cut a tier or two */
  const cn=Math.abs(wnN(N[13],wx/1150+31,wz/1150-17)),gd=.55+.45*wnS(wnN(N[13],x/2400-7,z/2400+5),-.2,.4);t*=1-gd+gd*wnS(cn,.035,.15);return t<0?0:t;}
function wgTable(x,z,B,o,c){const N=WG.N,fl=B+2+2.6*wnN(N[11],x/150,z/150)+1.2*wnN(N[11],x/47+5,z/47);
  const t=wgTierT(x,z),e=2.5,g=Math.max(1e-4,Math.sqrt((wgTierT(x+e,z)-t)**2+(wgTierT(x,z+e)-t)**2)/e),dL=78+28*wnN(N[12],x/3200,z/3200);
  const ti=Math.floor(t),f=t-ti,wm=8.5+3.5*wnN(N[14],x/90,z/90),w=Math.min(.45,wm*g);let r=0;if(f>1-w){const u=(f-(1-w))/w;r=u*u*(1.15-.15*u);}
  let h=fl+(ti+r)*dL;
  /* the talus at the foot of the next cliff up (the distance to it is what is left of the tier, over the slope of the field) */
  if(f<=1-w){const dist=(1-w-f)/g;h+=dL*.2*Math.exp(-dist/13)*(.75+.25*wnN(N[15],x/23,z/23));}
  const top=ti>=1||r>.9;if(!c.det||c.det<45)h+=(top?1.2:.6)*wnN(N[14],x/45,z/45);if(!c.det||c.det<13)h+=.35*wnN(N[15],x/13,z/13);
  let pl=-1e9;for(const p of c.pillars){if(p.r<0)continue;const dx=x-p.x,dz=z-p.z,rr=Math.sqrt(dx*dx+dz*dz);if(rr>p.r)continue;
    const an=Math.atan2(dz,dx),id=p.id,re=rr*(1+.13*wnN(N[9],Math.cos(an)*1.6+id,Math.sin(an)*1.6)+.06*wnN(N[9],Math.cos(an)*4.1-id,Math.sin(an)*4.1)),Hp=p.top*dL,Rp=p.Rp;
    const prof=1-wnS(re,Rp*.88,Rp*1.03),tal=Math.max(0,1-(re-Rp)/(Rp*1.1)),hp=fl+Hp*prof+dL*.25*tal*tal+(prof>.5?1.2*wnN(N[14],x/14,z/14):0);if(hp>pl)pl=hp;}
  if(pl>h)h=wnSmax(h,pl,3);
  if(ti>=1)for(const s of c.sinks){const rr=Math.hypot(x-s.x,z-s.z);if(rr>s.r)continue;const an=Math.atan2(z-s.z,x-s.x),re=rr*(1+.1*wnN(N[9],Math.cos(an)*2+s.a,Math.sin(an)*2+s.b)),k=1-wnS(re,s.Rs*.8,s.Rs);h-=s.k*dL*k;if(o&&s.ti>=1&&k>0)o.sink=s.pool;}
  if(o){o.fl=fl;o.tier=ti+r;o.dL=dL;}return h;}
/* ring lakes (picture 12): low land flooded to the world's water level - wide lakes, islands of every size, long turquoise shallows - and
   craggy island mountains (clusters of steep horn peaks) */
function wgLakes(x,z,B,o,c){const N=WG.N,WL=WG_CFG.WL,wx=x+150*wnN(N[16],x/700,z/700),wz=z+150*wnN(N[16],x/700+9,z/700-4);
  const a=wnFbm(N[12],wx/520,wz/520,wgOct(c,520,5,2.1),2.1,.52)-.02+.05*wnN(N[17],x/2000,z/2000);let h=WL+34*a;
  if(h>WL){h=WL+(h-WL)*.8;if(!c.det||c.det<60)h+=1.3*wnN(N[13],x/60,z/60)*wnS(h-WL,0,3);if(!c.det||c.det<17)h+=.3*wnN(N[15],x/17,z/17);}else h=WL-8*(1-Math.exp((h-WL)/12));/* (deep water levels off at about 8 m; long shallow shelves by the shores) */
  let pk=-30;for(const g of c.crags){if(g.r<0)continue;const dx=x-g.x,dz=z-g.z;if(dx*dx+dz*dz>g.r*g.r)continue;pk=wgKnoll(g.L,wx*.3+x*.7,wz*.3+z*.7,pk,14);}
  if(pk>0){if(!c.det||c.det<90)pk+=Math.min(pk,120)*.07*wnN(N[18],x/90,z/90);h=wnSmax(h,WL+pk-1,10);}/* (the knoll's own foot is soft: no toe) */
  /* the great mountain rises out of the lakes and the low land */
  for(const G of c.greats){const m=wgMtn(G,x,z,c.det);if(m>.01)h=wnSmax(h,WL-1+m,6);}
  if(o)o.isl=h-WL;return h;}
/* a rounded knoll (the elderglade's rocky hills): its outline lobed (no two alike, no straight edge), its profile a dome - flat on top, steepest part
   way down, soft at the foot (a smoothstep: steepest half way) - so the rock shows on curved sides, never in a straight cut or a band round the foot */
function wgKnoll(L,x,z,m,k0){const N=WG.N[14];for(const p of L){const dx=x-p.x,dz=z-p.z,u=dx*p.ca+dz*p.sa,v=dz*p.ca-dx*p.sa,d0=Math.sqrt(u*u*p.ik+v*v*p.k)+1e-6;if(d0*p.sl>=p.H*1.35)continue;/* (the lobes bring the edge in by at most 24 %) */
    const d=d0*(1+.2*wnN(N,u/d0*1.1+p.id,v/d0*1.1)+.04*wnN(N,u/d0*2-p.id,v/d0*2)),q=d*p.sl/p.H;if(q>=1)continue;
    const g=Math.pow(q,1+.3*wnN(N,u/d0*.5+p.id*.7,v/d0*.5-p.id)),h=p.H*(1-g*g*(3-2*g));if(h>m-k0)m=wnSmax(m,h,k0);}return m;}/* (the steepest part at another height on each side: rock in patches, never a band) */
/* H0: the land of every kind, blended by the region weights. The highlands and the plateau stand on the grasslands (the base and its hills: the
   plateau's hills are lower, WG_TBH, under its tiers); the elderglade lies at the water level, so the land falls to it across the border */
const _wgW=new Float64Array(9),WG_TBH=.5;
function wgH0(x,z,o,c){const W=wgFields(c,x,z,_wgW),B=W[4];let h=0;
  const hl=W[1]>1e-4||W[2]>1e-4?wgHills(x,z,W,c):0;
  if(W[1]>1e-4)h+=W[1]*wgSpires(x,z,B+hl,o,c);if(W[2]>1e-4)h+=W[2]*wgTable(x,z,B+WG_TBH*hl,o,c);if(W[3]>1e-4)h+=W[3]*wgLakes(x,z,B,o,c);
  const ws=W[1]+W[2]+W[3];if(ws>0&&Math.abs(ws-1)>1e-6)h/=ws;
  if(o){o.w0=W[0];o.w1=W[1];o.w2=W[2];o.w3=W[3];o.F=W[5];o.hl=hl;}WG.stats.h0++;return h;}
/* a single point (makes a small context for it) */
function wgH0At(x,z,o){return wgH0(x,z,o,wgCtx(x-1,z-1,x+1,z+1,0));}

/* ---------- 3. hydrology ---------- */
/* a lattice point: its place (jittered in its cell) and the height of the land there */
function wgHyd(i,j){const k=wgKey(i,j);let p=WG.hyd.get(k);if(p)return p;wgHydBlock(Math.floor(i/8),Math.floor(j/8));return WG.hyd.get(k);}
function wgHydBlock(bi,bj){const HC=WG_CFG.hydroCell,s=WG.seed,c=wgCtx(bi*8*HC,bj*8*HC,(bi+1)*8*HC,(bj+1)*8*HC,0);
  for(let j=bj*8;j<bj*8+8;j++)for(let i=bi*8;i<bi*8+8;i++){const x=(i+.22+.56*wnHash(i,j,s+201))*HC,z=(j+.22+.56*wnHash(i,j,s+202))*HC;WG.hyd.set(wgKey(i,j),{i,j,x,z,h:wgH0(x,z,null,c),dn:-2,acc:-1,lake:null,seg:undefined});}}
/* where a point drains: its lowest neighbour lower than itself (-1: none, a pit) */
function wgDown(p){if(p.dn!==-2)return p.dn;let best=-1,bh=p.h;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const q=wgHyd(p.i+di,p.j+dj);
    const hh=q.h+(di&&dj?.0:0);if(hh<bh-.01){bh=hh;best=wgKey(q.i,q.j);}}p.dn=best;return best;}
/* how many points drain through a point, counted up its streams to accDepth steps (a breadth-first walk up the drainage tree) */
function wgAcc(p){if(p.acc>=0)return p.acc;const C=WG_CFG,me=wgKey(p.i,p.j);let fr=[p],n=1,depth=0;const seen=new Set([me]);
  while(fr.length&&depth<C.accDepth&&n<C.accCap){const nx=[];for(const q of fr){for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const u=wgHyd(q.i+di,q.j+dj),ku=wgKey(u.i,u.j);
          if(seen.has(ku))continue;if(wgDown(u)===wgKey(q.i,q.j)){seen.add(ku);nx.push(u);n++;}}}fr=nx;depth++;}
  p.acc=n;return n;}
/* the water of the lake region and of every stream decides where streams flow on: a stream reaching the world's water ends there */
function wgStreamAcc(p,W2){/* fewer points make a stream in the tablelands and the spires (their streams fall over the cliffs) */return WG_CFG.streamAcc*(1-.55*W2);}
/* the stream that leaves a point (null if none): a curve from the point to the one it drains into, its half width, depth, and its water level along it */
function wgSeg(p){if(p.seg!==undefined)return p.seg;p.seg=null;const dn=wgDown(p);if(dn<0)return null;const C=WG_CFG,WL=C.WL;
  if(p.h<WL+.4)return null;/* already in the lake region's water */
  const acc=wgAcc(p),RW=wgRegions(p.x,p.z,new Float64Array(4));if(acc<WG_CFG.streamAcc*(1+.5*RW[1]-.55*RW[2]))return null;/* (the highlands keep their streams for the valleys among their hills; the plateau has many small ones, which fall over the cliffs) */
  const q=WG.hyd.get(dn);
  /* the main stream coming in (the upstream neighbour with most water) and where the next one goes, for a smooth curve through the points */
  let up=null,ua=-1;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const u=wgHyd(p.i+di,p.j+dj);if(wgDown(u)===wgKey(p.i,p.j)){const a=wgAcc(u);if(a>ua){ua=a;up=u;}}}
  const qd=wgDown(q),nn=qd>=0?WG.hyd.get(qd):null;
  const P0=up?[up.x,up.z]:[2*p.x-q.x,2*p.z-q.z],P1=[p.x,p.z],P2=[q.x,q.z],P3=nn?[nn.x,nn.z]:[2*q.x-p.x,2*q.z-p.z];
  const n=C.segN,pts=new Float64Array((n+1)*2),dx=P2[0]-P1[0],dz=P2[1]-P1[1],L=wgHyp(dx,dz),px=-dz/L,pz=dx/L,N=WG.N[15],sd=wnHash(p.i,p.j,WG.seed+211)*50;
  for(let k=0;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;let x=.5*((2*P1[0])+(-P0[0]+P2[0])*t+(2*P0[0]-5*P1[0]+4*P2[0]-P3[0])*t2+(-P0[0]+3*P1[0]-3*P2[0]+P3[0])*t3),
      z=.5*((2*P1[1])+(-P0[1]+P2[1])*t+(2*P0[1]-5*P1[1]+4*P2[1]-P3[1])*t2+(-P0[1]+3*P1[1]-3*P2[1]+P3[1])*t3);
    const mo=Math.sin(Math.PI*t)*L*.13*wnN(N,sd+t*2.3,sd*.7);x+=px*mo;z+=pz*mo;pts[k*2]=x;pts[k*2+1]=z;}
  /* size from the water it carries: a stream 1-3 m wide, a river up to 15 m */
  const accQ=Math.max(acc,wgAcc(q)),hw=Math.min(C.maxHalfW,.55+.42*Math.sqrt(acc)),hwQ=Math.min(C.maxHalfW,.55+.42*Math.sqrt(accQ)),dep=.35+.16*Math.sqrt(acc),fb=.35+.06*Math.sqrt(acc);
  /* the water level: the ground along the curve less a freeboard, never rising (a running minimum), from this point's level down to the next one's */
  const sc=wgCtx(Math.min(P1[0],P2[0])-60,Math.min(P1[1],P2[1])-60,Math.max(P1[0],P2[0])+60,Math.max(P1[1],P2[1])+60,0),Wp=p.h-fb,fbQ=.35+.06*Math.sqrt(wgAcc(q)),lq=wgLake(q),Wq=lq?Math.max(q.h-fbQ,Math.min(lq.lev,Wp)):q.h-fbQ,wl=new Float32Array(n+1);let run=Wp;
  const G0=new Float32Array(n+1);for(let k=0;k<=n;k++){const g=wgH0(pts[k*2],pts[k*2+1],null,sc)-fb;G0[k]=g;if(g<run)run=g;wl[k]=Math.max(Wq,Math.min(Wp,run));}
  for(let k=Math.floor(n*.8);k<=n;k++){const t=(k-n*.8)/(n*.2);wl[k]=Math.max(Wq,wl[k]+(Wq-wl[k])*wnS(t,0,1));}
  /* how far the land along it stands over its water (where it cuts through higher ground it carves a valley: wgHydroApply) */
  let cut=0;for(let k=0;k<=n;k++){const c=G0[k]+fb-wl[k];if(c>cut)cut=c;}const vw=Math.min(150,cut/WG_VS);
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let k=0;k<=n;k++){x0=Math.min(x0,pts[k*2]);x1=Math.max(x1,pts[k*2]);z0=Math.min(z0,pts[k*2+1]);z1=Math.max(z1,pts[k*2+1]);}
  const hwM=Math.max(hw,hwQ),band=hwM+WG_MG+Math.max(6,hwM*1.6+4)+6+vw;/* (as wide as it gets at its end) */
  /* a capsule round its chord (the curve strays from the chord by the meander): points outside it are passed over without the full nearest-point search */
  const ax=pts[0],az=pts[1],bx=pts[n*2],bz=pts[n*2+1],cl2=(bx-ax)*(bx-ax)+(bz-az)*(bz-az)||1e-9;let dev=0;for(let k=0;k<=n;k++){const t=Math.max(0,Math.min(1,((pts[k*2]-ax)*(bx-ax)+(pts[k*2+1]-az)*(bz-az))/cl2)),ex=ax+(bx-ax)*t-pts[k*2],ez=az+(bz-az)*t-pts[k*2+1];dev=Math.max(dev,Math.sqrt(ex*ex+ez*ez));}
  p.seg={p,q,pts,wl,n,hw,hwQ,dep,fb,acc,cut,vw,x0:x0-band,x1:x1+band,z0:z0-band,z1:z1+band,band,end:WL,ax,az,bx,bz,cl2,cap:dev+band+2};return p.seg;}
/* a lake in a pit: its level a little under the lowest rim point, its size from what drains into it. It is dropped where it would reach the world's
   water (the elderglade's lakes) or another lake that is lower (or as low and first by key) - two waters at different levels never meet. */
function wgLake(p){if(p.lake!==null)return p.lake;p.lake=false;const L=wgLakeRaw(p);if(!L)return false;
  for(let dj=-4;dj<=4;dj++)for(let di=-4;di<=4;di++){if(!di&&!dj)continue;const q=wgHyd(p.i+di,p.j+dj),d=Math.hypot(q.x-L.x,q.z-L.z);
    if(q.h<WG_CFG.WL+3&&d<L.R*1.35+70)return false;const c=wgLakeRaw(q);if(!c)continue;
    if(Math.hypot(c.x-L.x,c.z-L.z)<(L.R+c.R)*1.32+70&&(c.lev<L.lev||(c.lev===L.lev&&wgKey(q.i,q.j)>wgKey(p.i,p.j))))return false;}
  /* (the ground round it, between the lattice points too: no low land at the world's water level within its reach) */
  {const c=wgCtx(L.x-L.R*1.5-40,L.z-L.R*1.5-40,L.x+L.R*1.5+40,L.z+L.R*1.5+40,0);for(let k=0;k<24;k++){const an=k/24*6.2832;for(const f of[1.1,1.45])if(wgH0(L.x+Math.cos(an)*L.R*f,L.z+Math.sin(an)*L.R*f,null,c)<WG_CFG.WL+3)return false;}}
  return p.lake=L;}
/* the lake a pit would hold, by its own rules alone (wgLake checks its neighbours) */
function wgLakeRaw(p){if(p.lr!==undefined)return p.lr;p.lr=null;if(wgDown(p)!==-1)return null;const WL=WG_CFG.WL;if(p.h<WL+.5)return null;
  let rim=1e9;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;rim=Math.min(rim,wgHyd(p.i+di,p.j+dj).h);}
  const acc=wgAcc(p),depth=rim-p.h;if(depth<1.6&&acc<12)return null;{const G=wgGreatNear(p.x,p.z);if(G&&wgGreatQ(G,p.x,p.z)<1.02+130/G.Rb)return null;}/* (no tarn on the great mountain) */const RW=wgRegions(p.x,p.z,new Float64Array(4)),mt=.5*RW[1]+RW[2];/* (fewer and smaller in the highlands and on the plateau) */if(wnHash(p.i,p.j,WG.seed+223)>(depth<4?.45:.8)*(1-.55*mt))return null;
  const lev=p.h+Math.min(5,.65*depth)+.2,R=Math.min(115,24+11*Math.sqrt(acc)+depth*2.2)*(1-.45*mt);
  return p.lr={x:p.x,z:p.z,lev,R,dep:1.8+R*.05,id:wnHash(p.i,p.j,WG.seed+221)*100};}
/* the streams and lakes that can touch a rectangle */
function wgHydroIn(x0,z0,x1,z1){const HC=WG_CFG.hydroCell,m=3,/* (three cells round: a stream's valley reaches up to 170 m from its curve) */i0=Math.floor(x0/HC)-m,i1=Math.floor(x1/HC)+m,j0=Math.floor(z0/HC)-m,j1=Math.floor(z1/HC)+m,segs=[],lakes=[];
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const p=wgHyd(i,j),s=wgSeg(p);if(s&&s.x1>=x0&&s.x0<=x1&&s.z1>=z0&&s.z0<=z1)segs.push(s);const l=wgLake(p);if(l&&l.x+l.R+30>=x0&&l.x-l.R-30<=x1&&l.z+l.R+30>=z0&&l.z-l.R-30<=z1)lakes.push(l);}
  return{segs,lakes};}
/* the nearest point of a stream's curve: distance, where along it (0..n) */
function wgSegNear(s,x,z,o){const P=s.pts,n=s.n;let bd=1e18,bk=0,bt=0;
  /* coarse (every fourth point), then the pieces round the nearest coarse one */
  let cd=1e18,ck=0;for(let k=0;k<n;k+=4){const k2=Math.min(n,k+4),ax=P[k*2],az=P[k*2+1],bx=P[k2*2],bz=P[k2*2+1],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1e-9;let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;
    const ex=ax+dx*t-x,ez=az+dz*t-z,d=ex*ex+ez*ez;if(d<cd){cd=d;ck=k;}}
  const k0=Math.max(0,ck-4),k1=Math.min(n,ck+8);
  for(let k=k0;k<k1;k++){const ax=P[k*2],az=P[k*2+1],bx=P[k*2+2],bz=P[k*2+3],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1e-9;let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;
    const ex=ax+dx*t-x,ez=az+dz*t-z,d=ex*ex+ez*ez;if(d<bd){bd=d;bk=k;bt=t;}}
  o.d=Math.sqrt(bd);o.u=bk+bt;const k=bk;o.w=s.wl[k]+(s.wl[k+1]-s.wl[k])*bt;o.hw=s.hw+(s.hwQ-s.hw)*(o.u/n);o.fx=P[k*2+2]-P[k*2];o.fz=P[k*2+3]-P[k*2+1];return o;}
/* streams and lakes applied to a height: lake basins first (with a rim raised where the land round a lake is lower than its water), then the stream
   channels (a stream entering a lake cuts through its rim) and their banks (raised where the land is lower than the water, so water never spills
   where it is drawn), and where a stream runs through higher ground, a valley: the land beside it may stand no higher than its water plus the bank
   plus WG_VS per metre beyond (a soft minimum), so a river cuts through a hill in a valley with sloping sides, never a slot with walls; returns the
   height, the water level there (-1e9: no water) and the direction the water flows in */
const _wgSN={d:0,u:0,w:0,hw:0,fx:0,fz:0},WG_VS=.5,WG_MG=2.2;/* (WG_MG: a shallow wet margin either side of a channel before its bank - wider than the ground's lattice, so the bank never rises through the water) */
function wgHydroApply(x,z,h,H,out){let wl=-1e9,fx=0,fz=0,hc=h;const N17=WG.N[17];
  for(const l of H.lakes){const dx=x-l.x,dz=z-l.z,r0=wgHyp(dx,dz);if(r0>l.R*1.32+34)continue;const an=Math.atan2(dz,dx),
      R=l.R*(1+.22*wnN(N17,Math.cos(an)*1.3+l.id,Math.sin(an)*1.3)+.08*wnN(N17,Math.cos(an)*3.7-l.id,Math.sin(an)*3.7));
    if(r0<R){const b=l.lev-l.dep*(1-Math.pow(r0/R,1.6))-.4;if(b<hc)hc=b;}else if(r0<R+30){const rim=l.lev+.3+(r0-R)*.18;if(hc<rim)hc+=(rim-hc)*(1-wnS(r0,R+14,R+30));}
    if(r0<R+12&&l.lev>wl){wl=l.lev;fx=0;fz=0;}}
  const inLake=wl>-1e8;let chan=1e9,bank=null,near=1e9,vc=1e9;
  for(const s of H.segs){if(x<s.x0||x>s.x1||z<s.z0||z>s.z1)continue;{const t=Math.max(0,Math.min(1,((x-s.ax)*(s.bx-s.ax)+(z-s.az)*(s.bz-s.az))/s.cl2)),ex=s.ax+(s.bx-s.ax)*t-x,ez=s.az+(s.bz-s.az)*t-z;if(ex*ex+ez*ez>s.cap*s.cap)continue;}
    const o=wgSegNear(s,x,z,_wgSN),hw=o.hw,bw=Math.max(6,hw*1.6+4),cw=hw+WG_MG;if(o.d>cw+bw+s.vw)continue;const W=o.w;
    if(o.d<cw){const bed=o.d<hw?W-.12-(s.dep-.12)*(1-(o.d/hw)*(o.d/hw)):W-.12;if(bed<chan)chan=bed;}
    else{if(o.d<=cw+bw){const rel=(o.d-cw)/bw;if(rel<near){near=rel;bank={W,d:o.d,hw:cw,bw,rel};}}
      if(s.vw>0){const cv=W+.25+Math.min(o.d-cw,bw)*.32+Math.max(0,o.d-cw-bw)*WG_VS;if(cv<vc)vc=cv;}}
    if(o.d<cw&&W>wl){wl=W;const fl=wgHyp(o.fx,o.fz)||1;fx=o.fx/fl;fz=o.fz/fl;}}/* (a stream's water just over its channel: its ribbon draws it, wriver.js; the banks stay dry ground) */
  if(chan<1e9)hc=Math.min(hc,chan);
  else{if(vc<hc+4)hc=wnSmin(hc,vc,4);/* (the valley first: the bank below then keeps above the water) */}
  if(chan>=1e9&&bank&&!inLake){const B=bank,t=wnS(B.d,B.hw,B.hw+B.bw),tgt=B.W+.25+(B.d-B.hw)*.32;let hb=tgt+(hc-tgt)*t;
    const lo=B.W+.2-Math.max(0,(B.rel-.6)/.4)*Math.max(0,B.W+.2-hc);if(hb<lo)hb=lo;hc=hb;}
  if(WG_CFG.WL>wl&&hc<WG_CFG.WL+3){wl=WG_CFG.WL;fx=0;fz=0;}
  out.h=hc;out.wl=wl;out.fx=fx;out.fz=fz;out.chan=chan<1e9;return out;}

/* ---------- sampling a grid of the world ----------
   wgGrid samples (n+1)^2 points from (x0,z0) at a spacing, with an apron of one sample all round (so normals and the cavity of points on an edge are the
   same as those of the neighbouring grid: chunks meet without seams). Out: height, water level, flow, normal, and the attributes the ground shader
   needs: A = (spires, tablelands, lakes, forest) weights, B = (snow, cavity, wetness, cliff band). lite: no streams and lakes (far chunks). */
const _wgO={},_wgHo={h:0,wl:0,fx:0,fz:0};
function wgGrid(x0,z0,step,n,lite,st){const m=n+3,M=m*m,hh=new Float32Array(M),wl=new Float32Array(M),fw=new Float32Array(M*2),A=new Float32Array(M*4),Bt=new Float32Array(M*2);
  const pad=60,H=lite>=2?{segs:[],lakes:[]}:lite===1?{segs:[],lakes:wgHydroIn(x0-pad,z0-pad,x0+n*step+pad,z0+n*step+pad).lakes}:wgHydroIn(x0-pad,z0-pad,x0+n*step+pad,z0+n*step+pad);
  const c=wgCtx(x0-step*2,z0-step*2,x0+(n+2)*step,z0+(n+2)*step,step>=8?step*2:0),ST=lite>=1?null:st!==undefined?st:WG.stampsIn?WG.stampsIn(x0-step,z0-step,x0+(n+1)*step,z0+(n+1)*step):null;
  for(let k=0;k<m;k++)for(let i=0;i<m;i++){const x=x0+(i-1)*step,z=z0+(k-1)*step,q=k*m+i,o=_wgO;o.mtn=0;o.tier=0;o.isl=0;o.sink=null;
    const h0=wgH0(x,z,o,c);wgHydroApply(x,z,h0,H,_wgHo);let h=_wgHo.h;if(ST)h=wgStampApply(ST,x,z,h,_wgHo);
    if(o.sink&&o.w2>.95&&o.sink>_wgHo.wl){_wgHo.wl=o.sink;_wgHo.fx=0;_wgHo.fz=0;}/* (a sinkhole's pool) */
    hh[q]=h;wl[q]=_wgHo.wl;fw[q*2]=_wgHo.fx;fw[q*2+1]=_wgHo.fz;A[q*4]=o.w1;A[q*4+1]=o.w2;A[q*4+2]=o.w3;A[q*4+3]=o.F;
    Bt[q*2]=o.w1>0?o.w1*wnS(o.mtn,70,190):0;Bt[q*2+1]=o.w2>0?o.w2*(o.tier-Math.floor(o.tier)):0;}
  const n1=n+1,N1=n1*n1,out={x0,z0,step,n,h:new Float32Array(N1),wl:new Float32Array(N1),fw:new Float32Array(N1*2),nrm:new Float32Array(N1*3),A:new Float32Array(N1*4),B:new Float32Array(N1*4)};
  for(let k=0;k<n1;k++)for(let i=0;i<n1;i++){const q=(k+1)*m+i+1,o=k*n1+i,h=hh[q];out.h[o]=h;out.wl[o]=wl[q];out.fw[o*2]=fw[q*2];out.fw[o*2+1]=fw[q*2+1];
    let nx=hh[q-1]-hh[q+1],nz=hh[q-m]-hh[q+m],ny=2*step;const l=wgHyp(nx,ny,nz);out.nrm[o*3]=nx/l;out.nrm[o*3+1]=ny/l;out.nrm[o*3+2]=nz/l;
    for(let c=0;c<4;c++)out.A[o*4+c]=A[q*4+c];
    const cav=(hh[q-1]+hh[q+1]+hh[q-m]+hh[q+m])*.25-h;/* + in hollows, - on crests (per metre of spacing it is a curvature) */
    const wet=wl[q]>-1e8?wnS(h-wl[q],2.8,.15):0;
    out.B[o*4]=Bt[q*2];out.B[o*4+1]=Math.max(-1,Math.min(1,cav/(step*.6)));out.B[o*4+2]=wet;
    /* a floor for how rocky: near a cliff (the steepest neighbour slope over a couple of samples) the ground is rock, so a cliff never shows the odd
       green triangle where its lattice cells happen to be less steep */
    let smax=0;for(let dk=-1;dk<=1;dk++)for(let di=-1;di<=1;di++){if(!di&&!dk)continue;const q2=q+dk*m+di,dh=Math.abs(hh[q2]-h)/(step*Math.hypot(di,dk));if(dh>smax)smax=dh;}
    out.B[o*4+3]=step<=4?wnS(smax,.95,1.6)*.9:0;}
  return out;}
/* one point of the world (slow: for single queries; the game reads heights from the level-0 tiles) */
/* the land with its streams and lakes, but no settlements or roads (the landmarks stand on it) */
function wgHeightRaw(x,z){const H=wgHydroIn(x-60,z-60,x+60,z+60),o=_wgO;o.mtn=0;o.tier=0;o.isl=0;const h0=wgH0At(x,z,o);wgHydroApply(x,z,h0,H,_wgHo);return _wgHo.h;}
function wgHeightAt(x,z){const H=wgHydroIn(x-60,z-60,x+60,z+60),o=_wgO;o.mtn=0;o.tier=0;o.isl=0;const h0=wgH0At(x,z,o);wgHydroApply(x,z,h0,H,_wgHo);let h=_wgHo.h;
  if(WG.stampsIn){const ST=WG.stampsIn(x-2,z-2,x+2,z+2);if(ST)h=wgStampApply(ST,x,z,h,_wgHo);}return h;}


/* ---------- the stamps of settlements and roads, as plain data (made on the main thread by wsite.js, applied here - by the main thread and by the
   workers alike, so both get the same numbers) ----------
   S = {vs:[x,z,h,VR,...] the villages near, keep:[x,z,h,gateX,gateZ,hApp,keepR] or null, roads:[{p:[x,z,...],h:[...]}], rh:{"tx,tz":[road,point,...]} the road
   points by 8 m cell, in the order the main thread keeps them} */
function wgStampApply(S,x,z,h,ho){const V=S.vs;
  for(let i=0;i<V.length;i+=4){const VR=V[i+3],dx=x-V[i],dz=z-V[i+1],d=Math.sqrt(dx*dx+dz*dz);if(d>=VR*1.3)continue;h+=(V[i+2]-h)*(1-wnS(d,VR*.78,VR*1.3));}
  const K=S.keep;if(K){const dx=x-K[0],dz=z-K[1],d=Math.sqrt(dx*dx+dz*dz);if(d<K[6]+16)h+=(K[2]-h)*(1-wnS(d,K[6],K[6]+16));
    const gz=K[4]-z;if(gz>-4&&gz<52&&Math.abs(x-K[3])<12){const t=wnS(gz/46,0,1),ht=K[2]+(K[5]-K[2])*t,w=1-wnS(Math.abs(x-K[3]),6.5,12);h+=(ht-h)*w;}}
  if(!S.nr||ho.chan)return h;
  let aT=0,aW=0;for(let tz=Math.floor((z-6)/8);tz<=Math.floor((z+6)/8);tz++)for(let tx=Math.floor((x-6)/8);tx<=Math.floor((x+6)/8);tx++){const L=S.rh[tx+','+tz];if(!L)continue;
      for(let i=0;i<L.length;i+=2){const r=S.roads[L[i]],k=L[i+1],dx=r.p[k*2]-x,dz=r.p[k*2+1]-z,d=Math.sqrt(dx*dx+dz*dz);if(d>=5.6)continue;const w=1-wnS(d,2.4,5.6);aT+=r.h[k]*w;aW+=w;}}
  if(aW>0){const W2=Math.min(1,aW);h+=(aT/aW-h)*W2*.92;}return h;}

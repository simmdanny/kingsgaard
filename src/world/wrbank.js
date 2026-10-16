/* =====================================================================================================
   THE RIVER LOOK, THREE-free part (src/world/wrbank.js, river look - tools/mockups/river/HANDOFF.md): the mockup's own code, ported word for word
   (tools/mockups/river/src/), inside WRB so its names (S, h2, fbq2, rivBank, ...) stay the mockup's and never meet the game's. Only where the data
   come from is the game's: the mockup's one hand-made river RIV with one flat level WL is the hydrology's streams (wgen.js, wgSeg), each with its
   own curve, width and water level. Loaded by the main thread and the world workers (wworker.js), so both carve the same channels.
   - The JS noise of the mockup's shapes (h2, vq2, fbq2, ...) and its smoothstep S and random stream mkRng: verbatim.
   - rivBank, the bank at any point (the shore's wobble, a gentle or a cut bank along each side, the levee, the bed): its body verbatim (bankCore);
     makeRivBank wraps it the mockup's way (the parity lab), wrbApply the game's (every stream near the point; the lowest wins).
   - riverAttrs: the ground's per-vertex river values (aWd, aBf), verbatim - with the .3 m limit on aWd.
   Deviations from the mockup are listed in tools/mockups/river/DEVIATIONS.md.
   ===================================================================================================== */
const WRB=(function(){
/* ---- VERBATIM from surface-study.html lines 57-67: noise (JS, for the shapes) ---- */
function h2(i,j){let h=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function h3(i,j,k){return h2(i+Math.imul(k|0,1442695041),j-Math.imul(k|0,40503));}
function vn2(x,y){const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);const a=h2(i,j),b=h2(i+1,j),c=h2(i,j+1),d=h2(i+1,j+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm2(x,y){let s=0,a=.5,f=1;for(let k=0;k<4;k++){s+=a*vn2(x*f+k*17.1,y*f-k*9.3);a*=.5;f*=2.03;}return s/.9375;}
function vq2(x,y){const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*u*(u*(u*6-15)+10);v=v*v*v*(v*(v*6-15)+10);const a=h2(i,j),b=h2(i+1,j),c=h2(i,j+1),d=h2(i+1,j+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbq2(x,y){let s=0,a=.5,f=1;for(let k=0;k<4;k++){const r=.62+k*.9,c=Math.cos(r),sn=Math.sin(r);s+=a*vq2((x*c-y*sn)*f+k*17.1,(x*sn+y*c)*f-k*9.3);a*=.5;f*=2.03;}return s/.9375;}
function vn3(x,y,z){const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);let u=x-i,v=y-j,w=z-k;u=u*u*(3-2*u);v=v*v*(3-2*v);w=w*w*(3-2*w);
  const L=(a,b,t)=>a+(b-a)*t;return L(L(L(h3(i,j,k),h3(i+1,j,k),u),L(h3(i,j+1,k),h3(i+1,j+1,k),u),v),L(L(h3(i,j,k+1),h3(i+1,j,k+1),u),L(h3(i,j+1,k+1),h3(i+1,j+1,k+1),u),v),w);}
function fbm3(x,y,z){let s=0,a=.5,f=1;for(let k=0;k<3;k++){s+=a*vn3(x*f+k*5.3,y*f-k*2.1,z*f+k*7.7);a*=.5;f*=2.07;}return s/.875;}
const S=(e0,e1,x)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
/* ---- VERBATIM from surface-study.html line 410: the mockup's seeded stream ---- */
function mkRng(seed){let x=(seed*9301+49297)%233280;return()=>{x=(x*9301+49297)%233280;return x/233280;};}

/* ---- src/02-river-terrain.js (surface-study.html lines 104-111), rivBank. The body from the shore's wobble on is verbatim (bankCore); what it
   reads is passed in: h (the land there, Hland), rn = rivNear's [distance to the curve, where along it, which side], w (rivHalf), WL (the water
   level) and sz - the coordinate the steepness noise runs along: the mockup's river runs along z, so it is z there; in the game it is the distance
   along the stream's curve (DEVIATIONS.md D1) ---- */
function bankCore(x,z,h,rn,w,WL,sz){
  const e=.95*(fbq2(x*.18+3,z*.18)-.5)*2+.30*(vq2(x*.7,z*.7+5)-.5)*2;const dd=rn[0]-e;/* (the shore pushed in and out) */
  const steep=S(.42,.58,fbq2(sz*.12+rn[2]*13,5.1+rn[2]));const run=.75+2.3*(1-steep),lev=.16+.62*steep+.08*(vq2(x*.5,z*.5)-.5)*2;
  if(dd>w+run+4)return{y:h,face:0,steep,dd,w,run};const top=Math.max(h,WL+lev);
  if(dd<w){const q=Math.max(0,dd)/w;return{y:Math.min(h,WL-.18-1.15*(1-q*q)*(.75+.25*vq2(x*.3,z*.3))),face:0,steep,dd,w,run};}
  if(dd<w+run){const t=(dd-w)/run,sh=S(0,1,t)*(1-steep)+Math.pow(t,.5)*steep;/* (a gentle S, or a cut bank: steep low, rounding over at the lip) */
    return{y:(WL-.18)+(top-(WL-.18))*sh,face:1,steep,dd,w,run};}
  return{y:top+(h-top)*S(w+run,w+run+4,dd),face:0,steep,dd,w,run};}
/* the mockup's rivBank, its data from env: Hland(x,z), inside(x,z) (the mockup's box round its river), rivNear(x,z), rivHalf(z,rn), WL(rn), along(z,rn) */
function makeRivBank(env){const Hland=env.Hland,inside=env.inside,rivNear=env.rivNear;
  return function rivBank(x,z){const h=Hland(x,z);if(!inside(x,z))return{y:h,face:0,steep:0,dd:99,w:1,run:1};const rn=rivNear(x,z),w=env.rivHalf(z,rn);
    return bankCore(x,z,h,rn,w,env.WL(rn),env.along(z,rn));};}
/* ---- src/04-ground-river-attributes.js (surface-study.html line 624): a ground vertex's river values - aWd (the water level over the ground; -9 beyond
   the bank: the .3 m limit keeps the bed's colour off low meadow) and aBf (how much of the earth face this is) ---- */
function riverAttrs(bk,h,WL){return[bk.dd<bk.w+bk.run+.3?WL-h:-9,bk.face*(.25+.75*bk.steep)];}

return{h2,h3,vn2,fbm2,vq2,fbq2,vn3,fbm3,S,mkRng,bankCore,makeRivBank,riverAttrs};})();

/* =====================================================================================================
   The game's plumbing for rivBank: the streams of the hydrology (wgen.js).
   - The distance along a stream's curve (for the steepness and width noise, which run along the river): a segment's own arc length plus where its
     stream began - up the main stream coming in (the upstream neighbour with most water, as wgSeg chooses it), point by point (cached).
   - The width: the hydrology's own (wgSeg: hw to hwQ along the segment) times the mockup's noise factor 1 + 0.62 (fbq2(s .035 + 11, 3.3) - .5) 2
     (HANDOFF 3.3).
   - A stream that falls (its water level dropping faster than 2-5 cm a metre, rapids and falls) keeps the old channel - waterfalls are not this
     look's (HANDOFF: not in this handoff): the weight wrbGentle.
   ===================================================================================================== */
/* a segment's arc length to each of its points (cached on the segment) */
function wrbCum(s){if(s.cum)return s.cum;const P=s.pts,n=s.n,c=new Float64Array(n+1);for(let k=1;k<=n;k++)c[k]=c[k-1]+Math.hypot(P[k*2]-P[k*2-2],P[k*2+1]-P[k*2-1]);return s.cum=c;}
/* where along its stream a hydrology point's segment begins (m): the main stream coming in, back to where the stream begins (iteratively, cached) */
function wrbS0(p){if(p.s0!==undefined)return p.s0;const chain=[];let c=p;
  while(c&&c.s0===undefined&&chain.length<4000){chain.push(c);let up=null,ua=-1;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const u=wgHyd(c.i+di,c.j+dj);if(wgDown(u)===wgKey(c.i,c.j)){const a=wgAcc(u);if(a>ua){ua=a;up=u;}}}
    c=up&&wgSeg(up)?up:null;}
  let s=c&&c.s0!==undefined?c.s0+wrbCum(wgSeg(c))[WG_CFG.segN]:0;for(let i=chain.length-1;i>=0;i--){chain[i].s0=s;const sg=wgSeg(chain[i]);if(sg)s+=wrbCum(sg)[sg.n];}return p.s0;}
/* the nearest point of a segment's curve, as rivNear gives it: o.rn = [distance, where along it (0..n), which side], o.W its water level there, o.hw the
   hydrology's half width, o.s the distance along the stream, o.g how fast the water falls there (m a metre), o.fx/fz the way it flows */
const _wrbN={rn:[0,0,1],W:0,hw:0,s:0,g:0,fx:0,fz:0};
function wrbNear(s,x,z,o){const P=s.pts,n=s.n;let bd=1e18,bk=0,bt=0;
  let cd=1e18,ck=0;for(let k=0;k<n;k+=4){const k2=Math.min(n,k+4),ax=P[k*2],az=P[k*2+1],dx=P[k2*2]-ax,dz=P[k2*2+1]-az,L2=dx*dx+dz*dz||1e-9;let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;
    const ex=ax+dx*t-x,ez=az+dz*t-z,d=ex*ex+ez*ez;if(d<cd){cd=d;ck=k;}}
  const k0=Math.max(0,ck-4),k1=Math.min(n,ck+8);
  for(let k=k0;k<k1;k++){const ax=P[k*2],az=P[k*2+1],dx=P[k*2+2]-ax,dz=P[k*2+3]-az,L2=dx*dx+dz*dz||1e-9;let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;
    const ex=ax+dx*t-x,ez=az+dz*t-z,d=ex*ex+ez*ez;if(d<bd){bd=d;bk=k;bt=t;}}
  const ax=P[bk*2],az=P[bk*2+1],dx=P[bk*2+2]-ax,dz=P[bk*2+3]-az,ex=x-ax-dx*bt,ez=z-az-dz*bt,c=wrbCum(s),L=Math.hypot(dx,dz)||1e-9;
  o.rn[0]=Math.sqrt(bd);o.rn[1]=bk+bt;o.rn[2]=Math.sign(dx*ez-dz*ex)||1;/* (as rivNear: the side the point is on) */
  o.W=s.wl[bk]+(s.wl[bk+1]-s.wl[bk])*bt;o.hw=s.hw+(s.hwQ-s.hw)*((bk+bt)/n);o.s=wrbS0(s.p)+c[bk]+(c[bk+1]-c[bk])*bt;o.g=Math.abs(s.wl[bk+1]-s.wl[bk])/L;o.fx=dx/L;o.fz=dz/L;return o;}
/* gentle (1) to falling (0): rivBank's channel where the water is nearly level, the old one where it drops (rapids, falls) */
const wrbGentle=g=>1-WRB.S(.02,.05,g);
/* the half width rivBank gets: the hydrology's, times the mockup's noise along the river (HANDOFF 3.3) */
const wrbHalf=(hw,s)=>hw*(1+.62*(WRB.fbq2(s*.035+11,3.3)-.5)*2);
/* how far from a curve rivBank can reach (the widest wobble, the longest run, the 4 m fade): beyond it a stream changes nothing */
const wrbReach=hw=>hw*1.62+3.05+4+1.25+.5;
/* the same from the nearest point wgSegNear found (o: d, u, w, hw): rn, the water level, the hydrology's half width, the distance along the stream,
   how fast the water falls, the way it flows - without a second search */
function wrbFrom(s,o,x,z,r){const P=s.pts,n=s.n,k=Math.min(n-1,Math.floor(o.u)),t=o.u-k,ax=P[k*2],az=P[k*2+1],dx=P[k*2+2]-ax,dz=P[k*2+3]-az,ex=x-ax-dx*t,ez=z-az-dz*t,c=wrbCum(s),L=Math.hypot(dx,dz)||1e-9;
  r.rn[0]=o.d;r.rn[1]=o.u;r.rn[2]=Math.sign(dx*ez-dz*ex)||1;r.W=o.w;r.hw=o.hw;r.s=wrbS0(s.p)+c[k]+(c[k+1]-c[k])*t;r.g=Math.abs(s.wl[k+1]-s.wl[k])/L;r.fx=dx/L;r.fz=dz/L;return r;}

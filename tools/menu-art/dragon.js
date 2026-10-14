'use strict';
/* =============================================================================================
   The dragon. Everything is authored in a head-local frame: the snout tip is (0,0), the skull is at x = 1 (head length = 1), y points down.
   DRG places that frame on the picture. Shapes are Catmull-Rom splines through hand-placed points.
   ============================================================================================= */
const DRG={ox:1385,oy:470,L:500,A:-.12};
const dt=(lx,ly)=>{const c=Math.cos(DRG.A),s=Math.sin(DRG.A);return[DRG.ox+(lx*c-ly*s)*DRG.L,DRG.oy+(lx*s+ly*c)*DRG.L];};
/* a smooth closed or open curve through points (Catmull-Rom converted to cubic Beziers) */
function spline(g,pts,closed,tension){const n=pts.length,t=(tension==null?.5:tension)/3*2;
  const P=i=>closed?pts[(i+n)%n]:pts[clamp(i,0,n-1)];
  g.moveTo(pts[0][0],pts[0][1]);const last=closed?n:n-1;
  for(let i=0;i<last;i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);
    g.bezierCurveTo(p1[0]+(p2[0]-p0[0])*t/2*1.5,p1[1]+(p2[1]-p0[1])*t/2*1.5,p2[0]-(p3[0]-p1[0])*t/2*1.5,p2[1]-(p3[1]-p1[1])*t/2*1.5,p2[0],p2[1]);}
  if(closed)g.closePath();}
const W2=pts=>pts.map(p=>dt(p[0],p[1]));
/* --- head parts (local coordinates) --- */
const HINGE=[.74,.47],JAW=-.15;
const rotJ=p=>{const dx=p[0]-HINGE[0],dy=p[1]-HINGE[1],c=Math.cos(JAW),sn=Math.sin(JAW);return[HINGE[0]+dx*c-dy*sn,HINGE[1]+dx*sn+dy*c];};
const LOWER0=[[.026,.338],[.12,.362],[.22,.384],[.32,.404],[.42,.424],[.52,.440],[.62,.452],[.70,.462],[.78,.52],[.72,.575],[.60,.572],[.48,.552],[.36,.52],[.24,.48],[.12,.435],[.045,.39],[0,.362]];
const UPTOP=[[0,.262],[.010,.218],[.046,.192],[.064,.168],[.102,.182],[.172,.176],[.262,.158],[.342,.128],[.410,.078],[.458,.022],[.52,.004],[.585,.020],[.655,.060],[.725,.092],[.80,.150],[.90,.215],[.985,.30]];
const UPUND=[[.99,.46],[.91,.52],[.80,.50],[.70,.44],[.60,.395],[.50,.362],[.40,.340],[.30,.326],[.20,.312],[.10,.302],[.034,.294]];
const DH={
  upper:UPTOP.concat(UPUND),
  lower:LOWER0.map(rotJ),
  hornA:[[.585,.030],[.65,-.030],[.73,-.115],[.83,-.185],[.95,-.230],[1.08,-.226],[1.19,-.19],[1.08,-.158],[.97,-.135],[.88,-.082],[.82,-.005],[.785,.075],[.74,.110]],
  hornB:[[.76,.100],[.84,.052],[.94,.030],[1.07,.046],[1.20,.105],[1.07,.130],[.97,.130],[.90,.172],[.86,.214]],
  brow:[[.40,.07],[.46,.016],[.55,.0],[.62,.04],[.57,.082],[.50,.092],[.44,.098]],
  eye:[[.470,.108],[.506,.090],[.55,.098],[.51,.120]],
  nostril:[[.052,.190],[.082,.186],[.078,.205],[.056,.208]]
};
const polyY=(pts,x)=>{for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if((x-a[0])*(x-b[0])<=0&&a[0]!==b[0]){const t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}}return pts[pts.length-1][1];};
const UND_ASC=UPUND.slice().reverse().filter(p=>p[0]<=.8),LOW_TOP=LOWER0.slice(0,8).map(rotJ);
const yUpper=x=>polyY(UND_ASC,x),yLower=x=>polyY(LOW_TOP,x);
function drawTeeth(g){
  const up=[[.05,.105,.016],[.15,.058,.013],[.23,.07,.014],[.31,.052,.012],[.39,.058,.012],[.47,.044,.011],[.55,.04,.011]],lo=[[.07,.098,.016],[.17,.06,.013],[.25,.066,.013],[.33,.05,.012],[.41,.052,.012],[.49,.04,.011],[.57,.036,.011]];
  for(const[x,h,w]of up){const y=yUpper(x);g.beginPath();const a=dt(x-w,y-.006),b=dt(x+w*.2,y+h),c=dt(x+w,y-.006);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.closePath();g.fill();}
  for(const[x,h,w]of lo){const y=yLower(x);g.beginPath();const a=dt(x-w,y+.006),b=dt(x-w*.2,y-h),c=dt(x+w,y+.006);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.closePath();g.fill();}}
/* the neck: a thick curved band leaving the back of the skull toward the lower right, with dorsal spines on its outer edge */
const NECK={c:[[.90,.36],[1.08,.42],[1.26,.66],[1.40,1.08],[1.46,1.62],[1.46,2.3]],w:[.42,.44,.50,.64,.80,.98]};
function neckPoly(){const P=NECK.c.map(p=>dt(p[0],p[1])),Wd=NECK.w.map(w=>w*DRG.L),top=[],bot=[];
  /* sample a smooth curve through the centreline */
  const samples=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];for(let k=0;k<12;k++){const t=k/12,t2=t*t,t3=t2*t;
    const x=.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),y=.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);samples.push([x,y,lerp(Wd[i],Wd[i+1],t)]);}}
  samples.push([P[P.length-1][0],P[P.length-1][1],Wd[Wd.length-1]]);
  for(let i=0;i<samples.length;i++){const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;const nx=-ty,ny=tx,w=samples[i][2]/2;
    top.push([samples[i][0]+nx*w,samples[i][1]+ny*w]);bot.push([samples[i][0]-nx*w,samples[i][1]-ny*w]);}
  return{top,bot,samples};}
function drawNeck(g){const{top,bot}=neckPoly();g.beginPath();g.moveTo(top[0][0],top[0][1]);for(const p of top)g.lineTo(p[0],p[1]);for(let i=bot.length-1;i>=0;i--)g.lineTo(bot[i][0],bot[i][1]);g.closePath();g.fill();}
function drawSpines(g){const{top,bot,samples}=neckPoly();/* spines along whichever edge faces up and right: the 'top' side has normal (-ty,tx) */
  for(let i=16;i<samples.length-4;i+=4){const a=top[i],b=top[Math.min(top.length-1,i+2)],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1,nx=-ty/l,ny=tx/l;const h=(26+30*Math.sin(i*.6+1)**2)*(DRG.L/575)*(1+.5*i/samples.length);
    g.beginPath();g.moveTo(a[0]-tx/l*7,a[1]-ty/l*7);g.lineTo(a[0]+nx*h-tx/l*h*.7,a[1]+ny*h-ty/l*h*.7);g.lineTo(a[0]+tx/l*10,a[1]+ty/l*10);g.closePath();g.fill();}}
function drawHead(g,which){
  const sp=pts=>{g.beginPath();spline(g,W2(pts),true,.55);g.fill();};
  if(!which||which==='hornB')sp(DH.hornB);
  if(!which||which==='hornA')sp(DH.hornA);
  if(!which||which==='upper')sp(DH.upper);
  if(!which||which==='lower')sp(DH.lower);
  if(!which||which==='teeth')drawTeeth(g);}
function DRAGON_DEBUG(g){drawNeck(g);drawSpines(g);drawHead(g);
  /* mouth gap, eye, nostril in the background colour so the structure can be judged */
  g.fillStyle='#1a2238';g.beginPath();spline(g,W2(DH.nostril),true);g.fill();g.fillStyle='#ffc060';g.beginPath();spline(g,W2(DH.eye),true);g.fill();}

/* ---------- wings ---------- */
const WING_NEAR={S:[1830,800],E:[1585,372],Wr:[1352,150],B:[1930,900],tips:[[900,-24],[960,196],[1110,376],[1300,520]],claw:[1334,128]};
const WING_FAR={S:[1900,760],E:[1930,330],Wr:[1850,-60],B:[1930,880],tips:[[1470,-70],[1560,170],[1680,330],[1780,470]],claw:[1840,-80]};
function wingPath(g,Wg,inset){const P=[Wg.S,Wg.E,Wg.Wr].concat(Wg.tips,[Wg.B]);g.beginPath();g.moveTo(Wg.S[0],Wg.S[1]);g.lineTo(Wg.E[0],Wg.E[1]);g.lineTo(Wg.Wr[0],Wg.Wr[1]);
  /* from the wrist out to the first finger tip, then scalloped trailing edge between tips back to the body */
  g.lineTo(Wg.tips[0][0],Wg.tips[0][1]);
  for(let i=0;i<Wg.tips.length-1;i++){const a=Wg.tips[i],b=Wg.tips[i+1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,cx=mx+(Wg.Wr[0]-mx)*.36,cy=my+(Wg.Wr[1]-my)*.36;g.quadraticCurveTo(cx,cy,b[0],b[1]);}
  const a=Wg.tips[Wg.tips.length-1],b=Wg.B,mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;g.quadraticCurveTo(mx+(Wg.Wr[0]-mx)*.3,my+(Wg.Wr[1]-my)*.3,b[0],b[1]);g.closePath();}
function bone(g,a,b,w0,w1){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;g.beginPath();g.moveTo(a[0]+nx*w0/2,a[1]+ny*w0/2);g.lineTo(b[0]+nx*w1/2,b[1]+ny*w1/2);g.lineTo(b[0]-nx*w1/2,b[1]-ny*w1/2);g.lineTo(a[0]-nx*w0/2,a[1]-ny*w0/2);g.closePath();g.fill();}
function drawWingBones(g,Wg,k){bone(g,Wg.S,Wg.E,34*k,22*k);bone(g,Wg.E,Wg.Wr,22*k,15*k);
  Wg.tips.forEach((t,i)=>{bone(g,Wg.Wr,t,13*k,3*k);});
  /* the thumb claw at the wrist */
  g.beginPath();g.moveTo(Wg.claw[0]-10*k,Wg.claw[1]+14*k);g.lineTo(Wg.claw[0]-52*k,Wg.claw[1]-40*k);g.lineTo(Wg.claw[0]+8*k,Wg.claw[1]-8*k);g.closePath();g.fill();}
/* ---------- foreleg gripping a broken wall ---------- */
const LEG={pts:[[1960,830],[1850,900],[1720,968],[1600,1006],[1520,1018]],w:[170,120,86,62,48]};
function legPoly(){const out=[],top=[],bot=[];const P=LEG.pts,Wd=LEG.w;const smp=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];for(let k=0;k<10;k++){const t=k/10,t2=t*t,t3=t2*t;smp.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),lerp(Wd[i],Wd[i+1],t)]);}}
  smp.push([P[P.length-1][0],P[P.length-1][1],Wd[Wd.length-1]]);
  for(let i=0;i<smp.length;i++){const a=smp[Math.max(0,i-1)],b=smp[Math.min(smp.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;const nx=-ty,ny=tx,w=smp[i][2]/2;top.push([smp[i][0]+nx*w,smp[i][1]+ny*w]);bot.push([smp[i][0]-nx*w,smp[i][1]-ny*w]);}
  return{top,bot,smp};}
function drawLeg(g){const{top,bot}=legPoly();g.beginPath();g.moveTo(top[0][0],top[0][1]);for(const p of top)g.lineTo(p[0],p[1]);for(let i=bot.length-1;i>=0;i--)g.lineTo(bot[i][0],bot[i][1]);g.closePath();g.fill();
  /* the hand: a heavy palm and four long hooked claws curling over the wall's edge */
  const hx=1520,hy=1018;g.beginPath();g.ellipse(hx-6,hy+4,44,34,-.2,0,6.283);g.fill();
  const cl=[[-118,24,-70,-36],[-104,60,-60,0],[-70,86,-30,40],[-26,96,10,60]];
  for(const[dx,dy,cx,cy]of cl){g.beginPath();g.moveTo(hx-30+cx*.2,hy-6+cy*.1);g.quadraticCurveTo(hx+cx-10,hy+cy-34,hx+dx,hy+dy);g.quadraticCurveTo(hx+cx+14,hy+cy-4,hx-14+cx*.2,hy+26+cy*.2);g.closePath();g.fill();}}
function drawBody(g){g.beginPath();g.moveTo(1960,640);g.lineTo(1800,700);g.lineTo(1700,780);g.lineTo(1660,880);g.lineTo(1700,960);g.lineTo(1960,1100);g.closePath();g.fill();}

/* =============================== shading: height-map lighting from the singularity =============================== */
function scalePat(x,y,sx,sy,seed){ /* staggered overlapping scales: a crescent of shadow under each row's upper edge, no dots */
  const row=Math.floor(y/sy),off=(row&1)?sx/2:0,cx=Math.floor((x+off)/sx),u=(x+off)/sx-cx-.5,v=y/sy-row;
  const id=hashf(cx*7.13+row*3.7+seed),edge=Math.abs(u)*2,curve=v-.22*edge*edge;
  const sh=.74+.5*sstep(0,.85,curve)-.34*(1-sstep(0,.16,curve))-.12*sstep(.7,1,edge);
  return[sh*(.9+.2*id),sstep(.7,1,edge),id];}
function hashf(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);}
function shade(m,o){
  const rad=o.r||14,H0=blur(m,rad,2);let hs=o.hs||26;const ex=o.extra||null;
  const alb=o.alb||[.05,.06,.11],gain=o.lit==null?1:o.lit,rimG=o.rim==null?1:o.rim,tint=o.tint||[.62,.74,1.0],st=Math.max(1,Math.round(1.6*S));
  for(let y=st;y<H-st;y++)for(let x=st;x<W-st;x++){const i=y*W+x,a=m[i];if(a<=.004)continue;
    const u=x/S,v=y/S,L=lightAt(u,v);
    let hx=(H0[i+st]-H0[i-st])*hs/(2*st/S),hy=(H0[i+st*W]-H0[i-st*W])*hs/(2*st/S);
    let sc=1,se=0;
    if(o.scale){const p=scalePat(u,v,o.scale.sx,o.scale.sy,o.scale.seed||0);sc=lerp(1,p[0],o.scale.amp||1);se=p[1];
      /* scales also bend the normal a little so highlights catch their lower rims */
      hy+=(p[2]-.5)*.0+(se-.3)*(o.scale.bump||.22)*(L.dy>0?-1:1);hx+=(se-.3)*(o.scale.bump||.22)*(L.dx>0?-1:1)*.6;}
    if(ex){hx+=(ex[i+st]-ex[i-st])*(o.exs||1)/(2*st/S);hy+=(ex[i+st*W]-ex[i-st*W])*(o.exs||1)/(2*st/S);}
    const nl=Math.hypot(hx,hy,1),nx=-hx/nl,ny=-hy/nl,nz=1/nl;
    const el=.42,lx=L.dx*Math.cos(el),ly=L.dy*Math.cos(el),lz=Math.sin(el);
    const dif=Math.max(0,nx*lx+ny*ly+nz*lz),wrap=Math.max(0,(nx*lx+ny*ly+nz*lz)*.5+.5);
    const sky=.06+.05*(1-nz);                         /* ambient from the sky */
    const k=L.k*gain,rim=Math.pow(1-nz,2.2)*(.35+.65*Math.max(0,nx*L.dx+ny*L.dy+.15))*rimG*(.35+k*1.6);
    const spec=Math.pow(Math.max(0,nx*(lx*.5)+ny*(ly*.5)+nz*(lz*.5+.5)),(o.shin||18))*(o.spec||.0)*k*sc;
    const lit=(Math.pow(dif,1.35)*1.0+wrap*.05)*k*sc*(1-se*.3);
    let r=alb[0]*(sky*3+1)*sc+tint[0]*(lit*.62+rim*.42+spec),g=alb[1]*(sky*3+1)*sc+tint[1]*(lit*.62+rim*.42+spec),b=alb[2]*(sky*3+1)*sc+tint[2]*(lit*.62+rim*.42+spec);
    if(o.post){const c=o.post(u,v,[r,g,b],nx,ny,nz,L);r=c[0];g=c[1];b=c[2];}
    const al=a*(o.alpha==null?1:o.alpha),kk=i*3;SCN[kk]=SCN[kk]*(1-al)+r*al;SCN[kk+1]=SCN[kk+1]*(1-al)+g*al;SCN[kk+2]=SCN[kk+2]*(1-al)+b*al;}}
/* the wing membrane is thin: it is dark where nothing shines through, and glows along the bones and near the light */
function shadeMembrane(m,bones,Wg,o){
  const bb=blur(bones,3,2),vein=blur(bones,9,2);
  for(let i=0;i<N;i++){const a=m[i];if(a<=.004)continue;const x=i%W,y=(i/W)|0,u=x/S,v=y/S,L=lightAt(u,v),k=kk3(i);
    const tex=.8+.4*fbm(u*.02+Wg.S[0],v*.02,3),dist=Math.hypot(u-Wg.Wr[0],v-Wg.Wr[1]);
    const thru=L.k*(o.thru||1.1)*(.55+.45*fbm(u*.011,v*.011+3,3));       /* light through the skin */
    const edge=1-a;                                                         /* thinner at the very edge */
    let r=.04*tex+.26*thru*.7+vein[i]*.10*L.k*3+bb[i]*.5*(.3+L.k*2.2),gg=.043*tex+.29*thru*.74+vein[i]*.12*L.k*3+bb[i]*.55*(.3+L.k*2.2),b=.075*tex+.42*thru+vein[i]*.17*L.k*3+bb[i]*.72*(.3+L.k*2.2);
    /* pale rim on the trailing edge, brighter on the side facing the light */
    const xp=Math.min(W-1,x+Math.round(3*S)),xm=Math.max(0,x-Math.round(3*S)),yp=Math.min(H-1,y+Math.round(3*S)),ym=Math.max(0,y-Math.round(3*S));
    const gx=m[y*W+xp]-m[y*W+xm],gy=m[yp*W+x]-m[ym*W+x],rimv=Math.max(0,-(gx*L.dx+gy*L.dy))*1.8*(.3+L.k*2.4);
    r+=rimv*.5;gg+=rimv*.65;b+=rimv*1.0;
    const al=a*(o.alpha==null?.96:o.alpha);SCN[k]=SCN[k]*(1-al)+r*al;SCN[k+1]=SCN[k+1]*(1-al)+gg*al;SCN[k+2]=SCN[k+2]*(1-al)+b*al;}}
const kk3=i=>i*3;
function stageDragon(){
  const t=performance.now();
  const farM=mask(g=>{wingPath(g,WING_FAR);g.fill();},.8),farB=mask(g=>{drawWingBones(g,WING_FAR,.8);},.6);
  shadeMembrane(farM,farB,WING_FAR,{alpha:.9,thru:.8});
  shade(farB,{r:5,hs:14,alb:[.03,.04,.08],lit:.7,rim:.9});
  lap('far wing');
  const nearM=mask(g=>{wingPath(g,WING_NEAR);g.fill();},.8),nearB=mask(g=>{drawWingBones(g,WING_NEAR,1);},.6);
  shadeMembrane(nearM,nearB,WING_NEAR,{alpha:.95,thru:1.25});
  shade(nearB,{r:6,hs:18,alb:[.035,.045,.09],lit:.9,rim:1.1});
  lap('near wing');
  /* the body: neck, shoulder, foreleg, claws and the horn behind the head */
  const bodyM=mask(g=>{drawBody(g);drawNeck(g);drawSpines(g);drawLeg(g);},.8);
  shade(bodyM,{r:22,hs:44,alb:[.032,.04,.075],lit:.62,rim:1.0,scale:{sx:40,sy:30,amp:.16,seed:3,bump:.12},spec:.3,shin:16,post:(u,v,c)=>{const f=1-.55*sstep(1450,1920,u)*sstep(560,1000,v)-.35*sstep(780,1080,v);return[c[0]*f,c[1]*f,c[2]*f];}});
  lap('body');
  const hornM=mask(g=>{drawHead(g,'hornB');drawHead(g,'hornA');},.8);
  shade(hornM,{r:6,hs:20,alb:[.05,.05,.075],lit:1.0,rim:1.5,spec:.4,shin:10});
  /* the mouth: a dark cavity with a faint, deep ember at the back of the throat */
  const mouthM=mask(g=>{g.beginPath();const up=UND_ASC.filter(p=>p[0]<=.74).map(p=>dt(p[0],p[1]-.01)),lo=LOW_TOP.map(p=>dt(p[0],p[1]+.01));g.moveTo(up[0][0],up[0][1]);for(const p of up)g.lineTo(p[0],p[1]);for(let i=lo.length-1;i>=0;i--)g.lineTo(lo[i][0],lo[i][1]);g.closePath();g.fill();},.8);
  over(mouthM,(u,v,i)=>{const lx=((u-DRG.ox)/DRG.L),glow=Math.exp(-Math.pow((lx-.62)/.2,2));return[.012+glow*.09,.012+glow*.03,.02+glow*.01];});
  const headM=mask(g=>{drawHead(g,'upper');drawHead(g,'lower');},.8);
  /* extra relief for the skull: the brow, the cheek and the jaw line stand proud */
  const brow=mask(g=>{g.beginPath();spline(g,W2(DH.brow),true);g.fill();},6),cheek=mask(g=>{g.beginPath();const c=dt(.78,.32);g.ellipse(c[0],c[1],70,52,-.3,0,6.283);g.fill();},16);
  const ex=F1();for(let i=0;i<N;i++)ex[i]=brow[i]*22*S+cheek[i]*14*S;
  shade(headM,{r:13,hs:36,alb:[.038,.046,.085],lit:1.3,rim:2.0,scale:{sx:20,sy:14,amp:.26,seed:9,bump:.16},extra:ex,exs:1,spec:.5,shin:12});
  lap('head');
  const teethM=mask(g=>{drawTeeth(g);},.4);
  over(teethM,(u,v,i,a)=>{const L=lightAt(u,v);const k=.18+L.k*.9;return[.5*k,.52*k,.55*k];});
  /* the eye: a hot amber slit under a heavy brow, with a soft halo */
  const eyeM=mask(g=>{g.beginPath();spline(g,W2(DH.eye),true);g.fill();},1.2),eyeG=blur(eyeM,10,3);
  over(eyeM,(u,v)=>[1.0,.78,.38]);
  for(let i=0;i<N;i++){const a=eyeG[i];if(a<.003)continue;const k=i*3;SCN[k]+=a*1.5;SCN[k+1]+=a*.95;SCN[k+2]+=a*.32;}
  const nos=mask(g=>{g.beginPath();spline(g,W2(DH.nostril),true);g.fill();},.8);over(nos,()=>[.01,.01,.02]);
  lap('dragon done '+Math.round(performance.now()-t)+'ms');}

'use strict';
/* =============================================================================================
   Kingsgaard menu illustration, painted by code.
   No image-generation model is available in this workflow, so the picture is built procedurally:
   layered noise skies and mountains, hand-authored Bezier silhouettes for the ruin, the dragon and the mage,
   height-map lighting from the singularity, a real point-mass gravitational-lensing remap of everything behind
   the black hole, an accretion ring, infalling debris, and a painterly (Kuwahara) finish.
   Every coordinate is written for a 1920x1080 reference frame and scaled by ART.S.   Run: render.html?scale=2
   ============================================================================================= */
const ART={S:+(new URLSearchParams(location.search).get('scale')||1),W:1920,H:1080,seed:11};
const W=ART.W*ART.S,H=ART.H*ART.S,S=ART.S,N=W*H;
const log=m=>{document.getElementById('log').textContent+=m+' | ';};
const t0=performance.now(),lap=n=>log(n+' '+Math.round(performance.now()-t0)+'ms');
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/* ---------- gradient noise ---------- */
const PERM=(()=>{const R=mulberry(ART.seed),a=[];for(let i=0;i<256;i++)a.push(i);for(let i=255;i>0;i--){const j=Math.floor(R()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}const p=new Uint8Array(512);for(let i=0;i<512;i++)p[i]=a[i&255];return p;})();
const GR=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function noise(x,y){const X=Math.floor(x),Y=Math.floor(y);x-=X;y-=Y;const xi=X&255,yi=Y&255,u=x*x*x*(x*(x*6-15)+10),v=y*y*y*(y*(y*6-15)+10);
  const aa=PERM[PERM[xi]+yi],ab=PERM[PERM[xi]+yi+1],ba=PERM[PERM[xi+1]+yi],bb=PERM[PERM[xi+1]+yi+1];
  const g=(h,dx,dy)=>{const q=GR[h&7];return q[0]*dx+q[1]*dy;};
  const x1=g(aa,x,y)+u*(g(ba,x-1,y)-g(aa,x,y)),x2=g(ab,x,y-1)+u*(g(bb,x-1,y-1)-g(ab,x,y-1));return(x1+v*(x2-x1))*.9;}
function fbm(x,y,o){let a=1,f=1,s=0,n=0;for(let i=0;i<o;i++){s+=a*noise(x*f+i*17.3,y*f-i*9.1);n+=a;a*=.5;f*=2.03;}return s/n;}
function ridged(x,y,o){let a=1,f=1,s=0,n=0;for(let i=0;i<o;i++){s+=a*(1-Math.abs(noise(x*f+i*5.7,y*f+i*3.3)));n+=a;a*=.5;f*=2.1;}return s/n;}
/* ---------- buffers ---------- */
const F3=()=>new Float32Array(N*3),F1=()=>new Float32Array(N);
const HOLE={x:1155,y:500};               /* the singularity, reference pixels */
let SCN=F3();                             /* the scene being built (linear-ish RGB, 0..1+) */
/* ---------- mask helper: draw vector shapes at full resolution, read back an alpha field ---------- */
const mcv=document.createElement('canvas');mcv.width=W;mcv.height=H;const mcx=mcv.getContext('2d',{willReadFrequently:true});
function mask(fn,blur){mcx.setTransform(1,0,0,1,0,0);mcx.clearRect(0,0,W,H);mcx.fillStyle='#000';mcx.fillRect(0,0,W,H);mcx.setTransform(S,0,0,S,0,0);mcx.fillStyle='#fff';mcx.strokeStyle='#fff';mcx.lineJoin='round';mcx.lineCap='round';fn(mcx);
  mcx.setTransform(1,0,0,1,0,0);const d=mcx.getImageData(0,0,W,H).data,m=F1();for(let i=0;i<N;i++)m[i]=d[i*4]/255;return blur?boxBlur(m,blur*S,2):m;}
/* separable box blur (running sums), repeated for a smooth approximation of a gaussian */
function boxPass(src,r){const tmp=F1(),out=F1(),inv=1/(2*r+1);
  for(let y=0;y<H;y++){const o=y*W;let s=0;for(let x=-r;x<=r;x++)s+=src[o+clamp(x,0,W-1)];for(let x=0;x<W;x++){tmp[o+x]=s*inv;s+=src[o+Math.min(W-1,x+r+1)]-src[o+Math.max(0,x-r)];}}
  for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=tmp[clamp(y,0,H-1)*W+x];for(let y=0;y<H;y++){out[y*W+x]=s*inv;s+=tmp[Math.min(H-1,y+r+1)*W+x]-tmp[Math.max(0,y-r)*W+x];}}
  return out;}
function boxBlur(src,r,passes){r=Math.round(r);if(r<1)return src;let a=src;for(let p=0;p<(passes||2);p++)a=boxPass(a,r);return a;}
function blur(src,r,p){return boxBlur(src,r*S,p||2);}
/* composite a coloured layer (colour function per pixel) with alpha onto SCN */
function over(alpha,colFn){for(let i=0;i<N;i++){const a=alpha[i];if(a<=0.002)continue;const x=i%W,y=(i/W)|0,c=colFn(x/S,y/S,i,a);const k=i*3;SCN[k]=SCN[k]*(1-a)+c[0]*a;SCN[k+1]=SCN[k+1]*(1-a)+c[1]*a;SCN[k+2]=SCN[k+2]*(1-a)+c[2]*a;}}
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const hexc=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
/* ---------- the light of the singularity, as seen by anything on the canvas ---------- */
function lightAt(u,v){const dx=HOLE.x-u,dy=HOLE.y-v,d=Math.hypot(dx,dy)+1;return{dx:dx/d,dy:dy/d,d,k:1/(1+Math.pow(d/520,1.6))};}

/* =============================== STAGE 1: sky, clouds, mountains, mist =============================== */
const SIDE=u=>.34+.66*sstep(250,1050,u);           /* the left third stays dark and quiet for the menu */
function stageSky(){
  const D=F1();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,i=y*W+x;
    let c=fbm(u*.0016+4,v*.0038,5);c=c*1.35+.12-(v/1080)*.3;D[i]=sstep(-.12,.42,c);}
  const Ds=blur(D,5,2);lap('clouds');
  const top=hexc(0x04060c),mid=hexc(0x0a1124),low=hexc(0x1b2750),hor=hexc(0x4a5f9a),glowc=hexc(0xa9c0f2);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,i=y*W+x,k=i*3,t=clamp(v/790,0,1);
    let c=t<.45?mixc(top,mid,t/.45):t<.8?mixc(mid,low,(t-.45)/.35):mixc(low,hor,(t-.8)/.2);
    const L=lightAt(u,v),gl=Math.exp(-Math.pow(L.d/820,2)),gl2=Math.exp(-Math.pow(L.d/300,2)),gl3=Math.exp(-Math.pow(L.d/110,2));
    c=mixc(c,glowc,gl*.38+gl2*.3+gl3*.4);
    const d=Ds[i],cl=mixc(c,hexc(0x060a15),.74);
    let col=mixc(c,cl,d*.9);
    const xp=Math.min(W-1,x+6*S),xm=Math.max(0,x-6*S),yp=Math.min(H-1,y+6*S),ym=Math.max(0,y-6*S),gx=Ds[y*W+xp]-Ds[y*W+xm],gy=Ds[yp*W+x]-Ds[ym*W+x];
    const lit=Math.max(0,-(gx*L.dx+gy*L.dy))*3.2*(.4+d)*L.k;
    col=[col[0]+lit*.5,col[1]+lit*.66,col[2]+lit*1.0];
    const sd=SIDE(u);SCN[k]=col[0]*sd;SCN[k+1]=col[1]*sd;SCN[k+2]=col[2]*sd;}
  lap('sky');}
function lerpArr(a,u){const i=clamp(Math.floor(u),0,a.length-2),f=clamp(u-i,0,1);return a[i]*(1-f)+a[i+1]*f;}
/* jagged ridge by recursive midpoint displacement: sharp peaks, long slopes */
function ridgeLine(seed,base,amp,rough){const n=2049,r=new Float32Array(n),R=mulberry(seed*977+5);r[0]=0;r[n-1]=0;let step=n-1,sc=1;
  while(step>1){const half=step/2;for(let i=half;i<n;i+=step){r[i]=(r[i-half]+r[i+half])/2+(R()-.5)*2*sc*Math.pow(R(),.6);}step=half;sc*=rough;}
  let mn=1e9,mx=-1e9;for(let i=0;i<n;i++){mn=Math.min(mn,r[i]);mx=Math.max(mx,r[i]);}
  const out=new Float32Array(Math.ceil(ART.W)+2);for(let x=0;x<out.length;x++){const f=x/ART.W*(n-1),i=Math.min(n-2,Math.floor(f)),t=f-i,h=(r[i]*(1-t)+r[i+1]*t-mn)/(mx-mn);out[x]=base-amp*h;}
  for(let p=0;p<3;p++){const o=out.slice();for(let x=0;x<out.length;x++){let q=0;for(let k=-3;k<=3;k++)q+=o[clamp(x+k,0,out.length-1)];out[x]=q/7;}}return out;}
function stageMountains(){
  const layers=[{seed:3,base:690,amp:230,r:.58,col:0x232f58,far:1},{seed:8,base:735,amp:200,r:.56,col:0x152040,far:.7},{seed:15,base:790,amp:150,r:.55,col:0x0a1226,far:.4}];
  const fogc=hexc(0x4a5f9a);
  for(const Ly of layers){const rl=ridgeLine(Ly.seed,Ly.base,Ly.amp,Ly.r),cb=hexc(Ly.col);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,top=lerpArr(rl,u);if(v<top)continue;const i=y*W+x,k=i*3,d=v-top,L=lightAt(u,v);
      const tex=.88+.24*fbm(u*.006+Ly.seed,v*.02,3);
      let c=[cb[0]*tex,cb[1]*tex,cb[2]*tex];
      /* rim light on the crest and on slopes that face the singularity */
      const sl=(lerpArr(rl,u+3)-lerpArr(rl,u-3))/6;const face=clamp(-sl*Math.sign(HOLE.x-u)*.9+.15,0,1);
      const crest=Math.exp(-d/6)*(.35+.65*face)*L.k*1.1;
      c=[c[0]+crest*.45,c[1]+crest*.6,c[2]+crest*.95];
      /* the foot of each ridge sinks into lit mist */
      const fg=Math.pow(clamp(d/(Ly.amp*.9),0,1),1.6)*.85*Ly.far+.06;
      c=mixc(c,[fogc[0]*.55,fogc[1]*.6,fogc[2]*.75],fg*(.4+.6*sstep(0,1,fbm(u*.004,v*.01+Ly.seed,3)+.5)));
      const sd=SIDE(u);SCN[k]=c[0]*sd;SCN[k+1]=c[1]*sd;SCN[k+2]=c[2]*sd;}}
  lap('mountains');}

/* a ruined citadel on a crag in the haze behind the combatants (faint on the left where the menu sits) */
function stageRuin(){
  const m=mask(g=>{
    g.translate(820,360);g.scale(.42,.42);
    g.beginPath();g.moveTo(450,800);for(let x=450;x<=1260;x+=10){const t=(x-450)/810,env=Math.pow(Math.sin(Math.PI*clamp(t,0,1)),.8),y=800-env*(230+50*Math.sin(t*5))+(fbm(x*.03,3.3,3))*40;g.lineTo(x,y);}g.lineTo(1260,810);g.closePath();g.fill();
    const wall=(x,y,w,h)=>{g.fillRect(x,y,w,h);for(let i=0;i<w;i+=18)g.fillRect(x+i,y-10,11,11);};
    const tower=(x,y,w,h,kind)=>{g.fillRect(x,y,w,h);if(kind===0){for(let i=0;i<w-4;i+=w/4)g.fillRect(x+i,y-12,w/6,13);}else if(kind===1){g.beginPath();g.moveTo(x-7,y);g.lineTo(x+w/2,y-w*1.25);g.lineTo(x+w+7,y);g.closePath();g.fill();}else{g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.2,y-18);g.lineTo(x+w*.38,y+8);g.lineTo(x+w*.6,y-28);g.lineTo(x+w*.82,y-6);g.lineTo(x+w,y-14);g.lineTo(x+w,y+2);g.closePath();g.fill();}};
    wall(600,600,330,60);wall(740,548,170,60);
    tower(680,455,56,190,1);tower(752,405,64,230,2);tower(836,372,50,190,0);tower(892,335,60,260,1);tower(958,420,46,170,2);tower(570,520,44,140,1);tower(1012,512,66,130,0);tower(1076,592,38,100,2);tower(1130,640,30,70,1);
    g.beginPath();g.moveTo(1100,700);g.quadraticCurveTo(1176,610,1244,706);g.lineTo(1212,706);g.quadraticCurveTo(1176,650,1132,706);g.closePath();g.fill();
  },1.2);
  /* edge light: a thin rim on the side facing the singularity, from the mask gradient */
  for(let i=0;i<N;i++){const a=m[i];if(a<=.01)continue;const x=i%W,y=(i/W)|0,u=x/S,v=y/S,k=i*3,L=lightAt(u,v);
    const e=Math.max(0,m[i]-(m[Math.min(N-1,i+Math.round(4*S*Math.sign(L.dx||1)))]||0)),rim=clamp(e*2.2,0,1)*L.k*1.6;
    const tex=.9+.2*fbm(u*.02,v*.03,3),sd=SIDE(u)*(.55+.45*sstep(300,1000,u)),low=1-sstep(655,725,v)*.8;
    let c=[.045*tex+rim*.35,.06*tex+rim*.5,.12*tex+rim*.85];const f=a*(.55+.45*sstep(300,1000,u))*low;
    c=[c[0]*SIDE(u),c[1]*SIDE(u),c[2]*SIDE(u)];SCN[k]=SCN[k]*(1-f)+c[0]*f;SCN[k+1]=SCN[k+1]*(1-f)+c[1]*f;SCN[k+2]=SCN[k+2]*(1-f)+c[2]*f;}
  lap('ruin');}

function stageFarGround(){
  const m=mask(g=>{g.beginPath();g.moveTo(0,850);g.bezierCurveTo(300,830,520,876,760,856);g.bezierCurveTo(960,840,1120,884,1320,866);g.bezierCurveTo(1560,850,1760,880,1920,860);g.lineTo(1920,1080);g.lineTo(0,1080);g.closePath();g.fill();},1.2);
  over(m,(u,v)=>{const t=clamp((v-850)/230,0,1),n=.85+.3*fbm(u*.01,v*.016,4),L=lightAt(u,v);const c=mixc(hexc(0x111830),hexc(0x03050a),t);
    const sd=SIDE(u);return[(c[0]*n+L.k*.05*(1-t))*sd,(c[1]*n+L.k*.07*(1-t))*sd,(c[2]*n+L.k*.13*(1-t))*sd];});
  for(let y=Math.floor(720*S);y<Math.floor(990*S);y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,i=y*W+x,k=i*3,band=Math.exp(-Math.pow((v-858)/70,2)),n=sstep(-.1,.55,fbm(u*.0034+9,v*.012,5)+.2);const a=band*n*.5,L=lightAt(u,v),sd=SIDE(u);
    const c=[(.17+L.k*.26)*sd,(.2+L.k*.32)*sd,(.36+L.k*.46)*sd];SCN[k]=SCN[k]*(1-a)+c[0]*a;SCN[k+1]=SCN[k+1]*(1-a)+c[1]*a;SCN[k+2]=SCN[k+2]*(1-a)+c[2]*a;}
  lap('ground');}

/* ---------- preview helper: write SCN to the visible canvas and upload a JPEG ---------- */
function present(buf,name,gamma){const cv=document.getElementById('out');cv.width=W;cv.height=H;const g=cv.getContext('2d'),id=g.createImageData(W,H),d=id.data,ga=gamma||1;
  for(let i=0;i<N;i++){const k=i*3;d[i*4]=Math.pow(clamp(buf[k],0,1),ga)*255;d[i*4+1]=Math.pow(clamp(buf[k+1],0,1),ga)*255;d[i*4+2]=Math.pow(clamp(buf[k+2],0,1),ga)*255;d[i*4+3]=255;}
  g.putImageData(id,0,0);return cv;}
async function upload(cv,name,q){const url=cv.toDataURL('image/jpeg',q||.9);const r=await fetch('http://localhost:8766/'+name+'.jpg',{method:'POST',body:url});return r.status;}

/* =============================== STAGE: the singularity =============================== */
ART.thE=135;ART.rs=62;
function bilin(src,x,y,out){x=clamp(x,0,W-1.001);y=clamp(y,0,H-1.001);const x0=x|0,y0=y|0,fx=x-x0,fy=y-y0,i=(y0*W+x0)*3,j=i+W*3;
  for(let c=0;c<3;c++)out[c]=(src[i+c]*(1-fx)+src[i+3+c]*fx)*(1-fy)+(src[j+c]*(1-fx)+src[j+3+c]*fx)*fy;}
function stageLens(){
  const src=SCN.slice(),cx=HOLE.x*S,cy=HOLE.y*S,thE=ART.thE*S,rs=ART.rs*S,out=[0,0,0],reach=thE*7;
  const x0=Math.max(0,Math.floor(cx-reach)),x1=Math.min(W-1,Math.ceil(cx+reach)),y0=Math.max(0,Math.floor(cy-reach)),y1=Math.min(H-1,Math.ceil(cy+reach));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy)||.01;if(r>reach)continue;
    const env=1/(1+Math.pow(r/(thE*3.4),3)),beta=r-thE*thE/r*env;
    bilin(src,cx+dx/r*beta,cy+dy/r*beta,out);const k=(y*W+x)*3;SCN[k]=out[0];SCN[k+1]=out[1];SCN[k+2]=out[2];}
  lap('lens');}
/* the visible parts of the singularity: shadow, photon ring, the lensed far side of the disc over and under it, the thin flat disc crossing in front */
let HOLEMASK=null;
function stageHole(){
  HOLEMASK=F1();
  const cx=HOLE.x*S,cy=HOLE.y*S,thE=ART.thE*S,rs=ART.rs*S,tau=-.17,ct=Math.cos(-tau),st=Math.sin(-tau),R0=rs*1.55,R1=rs*5.2;
  const hot=[.86,.93,1.0],mid=[.62,.74,1.0],cool=[.48,.42,.9];
  const temp=t=>t<.5?mixc(hot,mid,t*2):mixc(mid,cool,(t-.5)*2);
  const reach=thE*3.6,x0=Math.max(0,Math.floor(cx-reach)),x1=Math.min(W-1,Math.ceil(cx+reach)),y0=Math.max(0,Math.floor(cy-reach)),y1=Math.min(H-1,Math.ceil(cy+reach));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy)||.01,k=(y*W+x)*3;
    let ar=0,ag=0,ab=0,hideAmt=0;
    /* the event-horizon shadow */
    const sh=sstep(rs*.985,rs*1.02,r);SCN[k]*=sh;SCN[k+1]*=sh;SCN[k+2]*=sh;
    const phi=Math.atan2(dy,dx),turb=.72+.5*fbm(phi*6+r*.03/S,r*.012/S+3,3);
    /* photon ring */
    const pr=Math.exp(-Math.pow((r-rs*1.05)/(rs*.05),2));ar+=pr*2.4*.9;ag+=pr*2.4*.97;ab+=pr*2.4;
    /* lensed far side of the disc: thick above and below, thin at the sides */
    if(r>rs*1.0&&r<rs*3.2){const vw=Math.pow(Math.abs(Math.sin(phi)),1.1),fall=Math.pow(rs*1.05/r,2.3),band=sstep(rs*1.0,rs*1.12,r)*(1-sstep(rs*(1.4+1.5*vw),rs*(2.0+1.2*vw),r));
      const I=fall*vw*band*1.5*turb,c=temp(clamp((r-rs)/(rs*1.8),0,1));ar+=I*c[0];ag+=I*c[1];ab+=I*c[2];}
    /* the flat disc, tilted a little, brighter on the approaching (left) side */
    {const X=dx*ct-dy*st,Y=dx*st+dy*ct,Yp=Y/.15,R=Math.hypot(X,Yp);
      if(R>R0*.9&&R<R1*1.1){const inband=sstep(R0*.92,R0*1.15,R)*(1-sstep(R1*.7,R1*1.05,R)),behind=Y<0&&r<rs*1.06;
        if(!behind){const dop=.55+.9*clamp(.5-X/(R*2),0,1)*1.1,I=Math.pow(R0/R,2.1)*inband*dop*1.45*(.7+.6*fbm(R*.05/S,Math.atan2(Yp,X)*3,3)),c=temp(clamp((R-R0)/(R1-R0),0,1));
          const front=Y>0?1:.85;ar+=I*c[0]*front;ag+=I*c[1]*front;ab+=I*c[2]*front;
          if(Y>0&&r<rs*1.04){/* in front of the shadow the disc hides it */const hide=clamp(I*2,0,1);hideAmt=hide;SCN[k]=SCN[k]*(1-hide);SCN[k+1]*=(1-hide);SCN[k+2]*=(1-hide);}}}}
    /* a faint secondary Einstein ring and the halo */
    const er=Math.exp(-Math.pow((r-thE*1.02)/(thE*.03),2))*.5,halo=Math.exp(-Math.pow(r/(thE*1.55),2))*.28;
    ar+=er*.6+halo*.45;ag+=er*.75+halo*.6;ab+=er*1.0+halo*1.0;
    SCN[k]+=ar;SCN[k+1]+=ag;SCN[k+2]+=ab;HOLEMASK[y*W+x]=(1-sh)*(1-hideAmt);}
  lap('hole');}
/* after the bloom: the void itself stays truly black */
function stageVoid(){if(!HOLEMASK)return;for(let i=0;i<N;i++){const m=HOLEMASK[i];if(m<.01)continue;const f=1-.95*m,k=i*3;SCN[k]*=f;SCN[k+1]*=f;SCN[k+2]*=f;}}

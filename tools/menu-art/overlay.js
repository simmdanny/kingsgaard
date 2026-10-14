'use strict';
/* =============================== light, debris, atmosphere, and the painterly finish =============================== */
function newCanvas(){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.setTransform(S,0,0,S,0,0);return{c,g};}
function addCanvas(cv,gain,mode){/* mode 'add' adds RGB; mode 'over' composites straight RGBA */
  const d=cv.c.getContext('2d').getImageData(0,0,W,H).data;
  for(let i=0;i<N;i++){const k=i*3,j=i*4;if(mode==='over'){const a=d[j+3]/255;if(a<.004)continue;SCN[k]=SCN[k]*(1-a)+d[j]/255*gain*a;SCN[k+1]=SCN[k+1]*(1-a)+d[j+1]/255*gain*a;SCN[k+2]=SCN[k+2]*(1-a)+d[j+2]/255*gain*a;}
    else{const al=d[j+3]/255*gain;SCN[k]+=d[j]/255*al;SCN[k+1]+=d[j+1]/255*al;SCN[k+2]+=d[j+2]/255*al;}}}
function spiralPt(th0,r,r0,twist,tilt){const th=th0+twist*Math.log(r0/r),x=Math.cos(th)*r,y=Math.sin(th)*r*.46,c=Math.cos(tilt),s=Math.sin(tilt);return[HOLE.x+x*c-y*s,HOLE.y+x*s+y*c];}
function stageOverlay(){
  const R=mulberry(2024),thE=ART.thE,rs=ART.rs;
  /* ---------- 1. things that are not light: the debris of a ruined world falling into the void ---------- */
  const dc=newCanvas(),dg=dc.g;
  const frags=[];for(let i=0;i<120;i++){const r0=thE*(1.35+Math.pow(R(),1.5)*3.9),th=R()*6.283,tilt=-.17;const p=spiralPt(th,r0,r0,0,tilt),sz=2+Math.pow(R(),2.8)*15;frags.push({x:p[0],y:p[1],sz,rot:R()*6.283,st:R()<.4?1+R()*2.4:1,sd:R()*100,r0});}
  frags.sort((a,b)=>a.sz-b.sz);
  for(const f of frags){const L=lightAt(f.x,f.y),dx=HOLE.x-f.x,dy=HOLE.y-f.y,dl=Math.hypot(dx,dy)||1,ux=dx/dl,uy=dy/dl;
    const n=5+Math.floor(f.sd%3),pts=[];for(let k=0;k<n;k++){const a=k/n*6.283+.4*Math.sin(f.sd+k),rr=f.sz*(.65+.5*((Math.sin(f.sd*3+k*7.1)+1)/2));pts.push([Math.cos(a)*rr*f.st,Math.sin(a)*rr]);}
    dg.save();dg.translate(f.x,f.y);dg.rotate(f.rot);
    dg.beginPath();dg.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<n;k++)dg.lineTo(pts[k][0],pts[k][1]);dg.closePath();dg.fillStyle='rgb(9,12,24)';dg.fill();
    dg.save();dg.clip();dg.rotate(-f.rot);const o=f.sz*.55;dg.translate(ux*o,uy*o);dg.rotate(f.rot);dg.beginPath();dg.moveTo(pts[0][0]-ux*f.sz,pts[0][1]-uy*f.sz);for(let k=1;k<n;k++)dg.lineTo(pts[k][0]-ux*f.sz,pts[k][1]-uy*f.sz);dg.closePath();
    dg.lineWidth=f.sz*.3;dg.strokeStyle='rgba('+Math.round(95+60*Math.min(1,L.k*1.6))+','+Math.round(120+60*Math.min(1,L.k*1.6))+','+Math.round(190+40*Math.min(1,L.k*1.6))+','+Math.min(.6,.2+L.k*.8)+')';dg.stroke();dg.restore();dg.restore();}
  addCanvas(dc,1,'over');lap('debris');
  /* ---------- 2. light: streams falling inward, the spell, the staff, motes ---------- */
  const lc=newCanvas(),g=lc.g;g.globalCompositeOperation='lighter';g.lineCap='round';
  /* infalling streams: logarithmic spirals that tighten and brighten as they approach */
  for(let i=0;i<190;i++){const r0=thE*(1.5+Math.pow(R(),1.3)*4.6),th0=R()*6.283,tw=1.1+R()*1.6,len=.55+R()*.4,tilt=-.17,steps=46,w=.5+R()*1.5,hue=R();let prev=null;
    for(let s=0;s<=steps;s++){const t=s/steps,r=lerp(r0,rs*1.15,Math.pow(t,1.2)*len),p=spiralPt(th0,r,r0,tw,tilt);
      if(prev){const al=Math.pow(t,1.6)*(.05+.6*Math.exp(-(r0-thE)/(thE*3)))*(s>steps-3?.5:1);g.strokeStyle='rgba('+(hue<.5?'190,215,255':'225,205,255')+','+al+')';g.lineWidth=w*(.4+t*1.1);g.beginPath();g.moveTo(prev[0],prev[1]);g.lineTo(p[0],p[1]);g.stroke();}prev=p;}}
  /* motes: little points of light on the same orbits */
  for(let i=0;i<260;i++){const r0=thE*(1.3+R()*5.2),th=R()*6.283,p=spiralPt(th,r0,r0,0,-.17),a=.15+R()*.55*Math.exp(-(r0-thE)/(thE*3.4));g.fillStyle='rgba(210,225,255,'+a+')';g.beginPath();g.arc(p[0],p[1],.5+R()*1.5,0,6.283);g.fill();}
  /* the spell: filaments of pale gold and silver run from the mage's hand into the singularity, and a slim ring of runes turns round the hand */
  const hand=[MAGE_DX+1118,532],tgt=[HOLE.x-rs*.9,HOLE.y+rs*.2];
  for(let k=0;k<5;k++){const off=(k-2)*6,wob=R()*10;g.strokeStyle=k===2?'rgba(255,245,215,.95)':k%2?'rgba(210,225,255,.55)':'rgba(255,225,160,.5)';g.lineWidth=k===2?2.4:1.1;g.shadowColor='rgba(220,230,255,.9)';g.shadowBlur=14*S;
    g.beginPath();g.moveTo(hand[0]+8,hand[1]+off*.2);g.bezierCurveTo(hand[0]+(tgt[0]-hand[0])*.35,hand[1]+off-14-wob,hand[0]+(tgt[0]-hand[0])*.7,tgt[1]+off*.8+10,tgt[0],tgt[1]+off*.1);g.stroke();}
  g.shadowBlur=0;
  const hc=[MAGE_DX+1128,534];
  for(const[rr,al,lw,dash]of[[34,.8,1.6,0],[52,.5,1.1,1],[74,.28,1,1]]){g.save();g.translate(hc[0],hc[1]);g.rotate(-.5);g.scale(.62,1);g.strokeStyle='rgba(255,226,160,'+al+')';g.lineWidth=lw;g.shadowColor='rgba(255,220,150,.8)';g.shadowBlur=10*S;
    if(dash)g.setLineDash([rr*.7,rr*.5,rr*.15,rr*.5]);g.beginPath();g.arc(0,0,rr,0,6.283);g.stroke();g.setLineDash([]);
    for(let t=0;t<12;t++){const a=t/12*6.283;g.beginPath();g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);g.lineTo(Math.cos(a)*(rr+(t%3?4:8)),Math.sin(a)*(rr+(t%3?4:8)));g.stroke();}g.restore();}
  /* the orb on the staff: a soft pale-gold light, the one warm note in the picture */
  const orb=[MAGE_DX+785,440];
  const og=g.createRadialGradient(orb[0],orb[1],0,orb[0],orb[1],70);og.addColorStop(0,'rgba(255,248,225,.95)');og.addColorStop(.15,'rgba(255,226,160,.6)');og.addColorStop(.5,'rgba(230,190,110,.16)');og.addColorStop(1,'rgba(200,160,90,0)');g.fillStyle=og;g.beginPath();g.arc(orb[0],orb[1],70,0,6.283);g.fill();
  /* a handful of golden sparks lifting from the hand and the orb */
  for(let i=0;i<46;i++){const src=i%3?hc:orb,a=R()*6.283,d=8+R()*70,x=src[0]+Math.cos(a)*d,y=src[1]+Math.sin(a)*d*.8-R()*20;g.fillStyle='rgba(255,'+Math.round(210+R()*40)+',150,'+(.25+R()*.6)+')';g.beginPath();g.arc(x,y,.5+R()*1.5,0,6.283);g.fill();}
  /* faint rays out of the singularity through the dust */
  for(let i=0;i<46;i++){const a=R()*6.283,len=380+R()*820,wd=.01+R()*.03;const gr=g.createLinearGradient(HOLE.x,HOLE.y,HOLE.x+Math.cos(a)*len,HOLE.y+Math.sin(a)*len);gr.addColorStop(0,'rgba(150,180,255,'+(.035+R()*.04)+')');gr.addColorStop(1,'rgba(150,180,255,0)');g.fillStyle=gr;g.beginPath();g.moveTo(HOLE.x,HOLE.y);g.lineTo(HOLE.x+Math.cos(a-wd)*len,HOLE.y+Math.sin(a-wd)*len);g.lineTo(HOLE.x+Math.cos(a+wd)*len,HOLE.y+Math.sin(a+wd)*len);g.closePath();g.fill();}
  addCanvas(lc,1,'add');lap('light');}
/* low mist in front of everything, lit from the void, and drifting ash */
function stageMist(){
  const Rr=mulberry(77);
  for(let y=Math.floor(880*S);y<H;y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,k=(y*W+x)*3,band=Math.exp(-Math.pow((v-985)/60,2)),n=sstep(-.05,.6,fbm(u*.0042+31,v*.011,5)+.2),L=lightAt(u,v),a=band*n*.38,sd=SIDE(u);
    const c=[(.1+L.k*.3)*sd,(.12+L.k*.38)*sd,(.22+L.k*.55)*sd];SCN[k]=SCN[k]*(1-a)+c[0]*a;SCN[k+1]=SCN[k+1]*(1-a)+c[1]*a;SCN[k+2]=SCN[k+2]*(1-a)+c[2]*a;}
  const ac=newCanvas(),g=ac.g;
  for(let i=0;i<520;i++){const x=Rr()*1920,y=Rr()*1080,L=lightAt(x,y),sz=.6+Math.pow(Rr(),3)*3.2,warm=Rr()<.25;const a=(.1+Rr()*.5)*(.35+L.k*1.6)*(.4+.6*SIDE(x));
    g.fillStyle=warm?'rgba(255,205,140,'+a*.8+')':'rgba(170,185,215,'+a+')';g.beginPath();g.arc(x,y,sz,0,6.283);g.fill();}
  addCanvas(ac,1,'add');lap('mist');}
/* bloom: bright things bleed into their surroundings */
function stageBloom(){
  const lum=F1();for(let i=0;i<N;i++){const k=i*3,l=Math.max(SCN[k],SCN[k+1],SCN[k+2]);lum[i]=Math.max(0,l-.95);}
  const b1=blur(lum,10,2),b2=blur(lum,34,2),b3=blur(lum,100,2);
  for(let i=0;i<N;i++){const k=i*3,a=b1[i]*.55+b2[i]*.7+b3[i]*.9;SCN[k]+=a*.6;SCN[k+1]+=a*.74;SCN[k+2]+=a*1.0;}
  lap('bloom');}
/* Kuwahara filter: flattens detail into brush-sized patches of colour while keeping edges, the heart of the painted look */
function kuwahara(r){
  const src=SCN,out=F3();const W1=W+1;
  const I=[new Float64Array(W1*(H+1)),new Float64Array(W1*(H+1)),new Float64Array(W1*(H+1)),new Float64Array(W1*(H+1))];
  for(let y=0;y<H;y++){let sr=0,sg=0,sb=0,sl=0;for(let x=0;x<W;x++){const k=(y*W+x)*3,R=src[k],G=src[k+1],B=src[k+2],l=.3*R+.59*G+.11*B;sr+=R;sg+=G;sb+=B;sl+=l*l;const j=(y+1)*W1+x+1,up=y*W1+x+1;I[0][j]=I[0][up]+sr;I[1][j]=I[1][up]+sg;I[2][j]=I[2][up]+sb;I[3][j]=I[3][up]+sl;}}
  const box=(A,x0,y0,x1,y1)=>A[(y1+1)*W1+x1+1]-A[y0*W1+x1+1]-A[(y1+1)*W1+x0]+A[y0*W1+x0];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let bestV=1e30,br=0,bg=0,bb=0;
    for(let q=0;q<4;q++){const x0=q&1?x:x-r,x1=q&1?x+r:x,y0=q&2?y:y-r,y1=q&2?y+r:y;const cx0=Math.max(0,x0),cx1=Math.min(W-1,x1),cy0=Math.max(0,y0),cy1=Math.min(H-1,y1),n=(cx1-cx0+1)*(cy1-cy0+1);
      const mr=box(I[0],cx0,cy0,cx1,cy1)/n,mg=box(I[1],cx0,cy0,cx1,cy1)/n,mb=box(I[2],cx0,cy0,cx1,cy1)/n,ml=.3*mr+.59*mg+.11*mb,v=box(I[3],cx0,cy0,cx1,cy1)/n-ml*ml;
      if(v<bestV){bestV=v;br=mr;bg=mg;bb=mb;}}
    const k=(y*W+x)*3;out[k]=br;out[k+1]=bg;out[k+2]=bb;}
  SCN=out;lap('painted');}
/* canvas grain, brush-stroke streaks, grading */
function stageFinish(){
  const Rr=mulberry(5);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/S,v=y/S,k=(y*W+x)*3;
    const ang=fbm(u*.004,v*.004,2)*3.1,cs=Math.cos(ang),sn=Math.sin(ang),s=fbm((u*cs+v*sn)*.012,(-u*sn+v*cs)*.18,3),grain=(Rr()-.5)*.028;
    const lum=.3*SCN[k]+.59*SCN[k+1]+.11*SCN[k+2],brush=1+s*.16*(1-Math.min(1,lum*2.2))+(fbm(u*.8,v*.8,2))*.03;
    let r=SCN[k]*brush,g=SCN[k+1]*brush,b=SCN[k+2]*brush;
    const sh=1-sstep(0,.35,lum);r+=-.004*sh;g+=.002*sh;b+=.014*sh;
    const vg=1-.55*Math.pow(Math.hypot((u-1000)/1150,(v-520)/720),2.4);
    r=(r+grain)*vg;g=(g+grain)*vg;b=(b+grain)*vg;
    const tm=c=>c<=0?0:1-Math.exp(-c*1.35);SCN[k]=tm(r);SCN[k+1]=tm(g);SCN[k+2]=tm(b);}
  lap('finish');}

/* a pale veil of lit mist behind the figure so that his dark outline reads */
function stageBacklight(){
  for(let y=Math.floor(420*S);y<Math.floor(990*S);y++)for(let x=Math.floor(380*S);x<Math.floor(1250*S);x++){const u=x/S,v=y/S,k=(y*W+x)*3,d=Math.hypot((u-820)/300,(v-760)/330),a=Math.exp(-d*d*1.3)*.5*(.7+.5*sstep(-.1,.5,fbm(u*.006,v*.009+5,4)));
    SCN[k]+=a*.2;SCN[k+1]+=a*.27;SCN[k+2]+=a*.47;}
  lap('backlight');}

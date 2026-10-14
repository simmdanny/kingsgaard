'use strict';
/* =============================================================================================
   The mage, seen from behind and a little to the side: a hooded figure in a long cloak, right arm stretched toward the singularity,
   left hand planted on a tall staff. The cloth is dragged toward the void. All coordinates are reference pixels (1920x1080).
   ============================================================================================= */
const MG={x:862,feet:934};
const MP={
  cloak:[[818,566],[800,592],[784,650],[770,730],[758,810],[746,880],[738,930],[766,940],[800,928],[834,942],[870,930],[904,944],[938,930],[972,936],[1010,918],[1056,894],[1112,880],[1056,872],[1002,872],[968,840],[954,770],[946,690],[940,626],[930,584],[900,560],[850,552]],
  ribbon:[[968,862],[1030,846],[1100,834],[1176,824],[1230,826],[1176,834],[1108,848],[1044,868],[990,884]],
  ribbon2:[[952,900],[1010,892],[1070,890],[1132,900],[1180,918],[1126,910],[1068,906],[1010,908],[966,914]],
  hood:[[818,548],[818,508],[838,470],[868,456],[896,470],[912,504],[914,548],[896,566],[850,568]],
  sleeve:[[914,586],[950,574],[1000,566],[1044,556],[1066,552],[1070,566],[1052,586],[1010,600],[966,620],[930,634]],
  hand:[[1060,550],[1080,540],[1100,532],[1118,528],[1112,540],[1126,546],[1112,552],[1106,562],[1086,566],[1066,566]],
  armL:[[826,580],[808,600],[792,640],[786,670],[800,676],[814,640],[832,606]]
};
function mageShape(g,name){g.beginPath();spline(g,MP[name],true,.5);g.fill();}
function drawMage(g,which){
  if(!which||which==='ribbon'){mageShape(g,'ribbon');}
  if(!which||which==='cloak')mageShape(g,'cloak');
  if(!which||which==='hood')mageShape(g,'hood');
  if(!which||which==='sleeve')mageShape(g,'sleeve');
  if(!which||which==='hand'){g.beginPath();g.ellipse(1084,550,19,12,-.38,0,6.283);g.fill();const f=[[[1096,543],[1132,520],6,2.6],[[1098,548],[1138,536],6,2.4],[[1097,553],[1134,550],5.6,2.4],[[1094,558],[1124,562],5,2.2]];for(const[a,b,w0,w1]of f)bone(g,a,b,w0,w1);bone(g,[1086,558],[1106,578],7,3);}
  if(!which||which==='armL')mageShape(g,'armL');
  if(!which||which==='staff'){g.fillRect(780,452,10,494);g.beginPath();g.arc(785,438,17,0,6.283);g.fill();}
  if(!which||which==='boots'){g.fillRect(808,930,52,16);g.fillRect(912,932,54,14);}}
function MAGE_DEBUG(g){drawMage(g);}

/* =============================== shading the mage =============================== */
const MAGE_DX=-70;
const mm=(fn,b)=>mask(g=>{g.translate(MAGE_DX,0);fn(g);},b);
/* long vertical folds of heavy cloth: height added to the cloak so the lighting finds creases */
function foldRelief(m,amp){const e=F1();for(let i=0;i<N;i++){if(m[i]<.01)continue;const x=(i%W)/S,y=((i/W)|0)/S;
  const warp=4.2*noise(y*.0032,x*.0042),f=Math.sin(x*.052+warp)*.62+Math.sin(x*.128+3*noise(y*.0065+9,x*.01))*.24+noise(x*.032,y*.021)*.55+noise(x*.09,y*.05+3)*.18;
  e[i]=f*amp*S*(.45+.55*Math.min(1,(y-560)/150))*m[i];}return e;}
function stageMage(){
  const t=performance.now(),px=u=>u+MAGE_DX;
  /* shadow of the figure on the ledge is added later with the ledge; here: cloth pulled toward the void */
  const ribM=mm(g=>drawMage(g,'ribbon'),1.2);
  shade(ribM,{r:5,hs:10,alb:[.03,.034,.07],lit:.8,rim:1.4,alpha:.92});
  const cloakM=mm(g=>drawMage(g,'cloak'),1.0),ex=foldRelief(cloakM,4.2);
  const sigil=mm(g=>{g.lineWidth=2.2;g.strokeStyle='#fff';g.fillStyle='#fff';const cx=858,cy=700;
    for(const r of[58,46,26]){g.beginPath();g.arc(cx,cy,r,0,6.283);g.stroke();}
    for(let k=0;k<12;k++){const a=k/12*6.283;g.beginPath();g.moveTo(cx+Math.cos(a)*26,cy+Math.sin(a)*26);g.lineTo(cx+Math.cos(a)*(k%2?46:58),cy+Math.sin(a)*(k%2?46:58));g.stroke();}
    for(let k=0;k<8;k++){const a=k*.7854+.3927;g.beginPath();g.moveTo(cx+Math.cos(a-.12)*14,cy+Math.sin(a-.12)*14);g.lineTo(cx+Math.cos(a)*40,cy+Math.sin(a)*40);g.lineTo(cx+Math.cos(a+.12)*14,cy+Math.sin(a+.12)*14);g.closePath();g.stroke();}
    g.beginPath();g.arc(cx,cy,6,0,6.283);g.fill();
    /* a narrow band of embroidery down the middle of the back */
    g.lineWidth=1.6;g.beginPath();g.moveTo(cx,cy+60);g.lineTo(cx-3,880);g.stroke();for(let y=770;y<900;y+=22){g.beginPath();g.moveTo(cx-10,y);g.lineTo(cx,y+10);g.lineTo(cx+10,y);g.stroke();}},.7);
  const hemBand=F1();for(let y=0;y<H-12*S;y++)for(let x=0;x<W;x++){const i=y*W+x,a=cloakM[i];if(a<.02)continue;const b=cloakM[i+Math.round(8*S)*W];hemBand[i]=a*(1-b);}
  const hemB=blur(hemBand,1.2,2);
  shade(cloakM,{r:15,hs:38,alb:[.034,.04,.082],lit:1.05,rim:2.4,extra:ex,exs:1,spec:.25,shin:9,
    post:(u,v,c,nx,ny,nz,L)=>{const i=Math.round(v*S)*W+Math.round(u*S),gs=sigil[i]||0,hb=hemB[i]||0,k=.55+L.k*1.4;
      /* pale gold and silver embroidery, warmer where the hole's light finds it */
      c[0]+=gs*(.44+.4*k)+hb*.5*(.6+k);c[1]+=gs*(.37+.34*k)+hb*.4*(.6+k);c[2]+=gs*(.21+.18*k)+hb*.24*(.6+k);return c;}});
  const hoodM=mm(g=>drawMage(g,'hood'),.9),exH=foldRelief(hoodM,3);
  shade(hoodM,{r:9,hs:30,alb:[.036,.042,.085],lit:1.15,rim:2.6,extra:exH,exs:.8,spec:.2});
  const slM=mm(g=>drawMage(g,'sleeve'),.9),exS=foldRelief(slM,2.6);
  shade(slM,{r:8,hs:24,alb:[.04,.046,.09],lit:1.2,rim:2.6,extra:exS,exs:.8,spec:.25});
  const alM=mm(g=>drawMage(g,'armL'),.8);shade(alM,{r:4,hs:12,alb:[.035,.04,.08],lit:.9,rim:1.3});
  const bootM=mm(g=>drawMage(g,'boots'),.8);shade(bootM,{r:3,hs:8,alb:[.02,.02,.04],lit:.6,rim:.8});
  /* the hand: pale, catching the light of the singularity and of the spell it holds */
  const handM=mm(g=>drawMage(g,'hand'),.7);
  over(handM,(u,v)=>{const L=lightAt(u,v);return[.62+L.k*.4,.6+L.k*.4,.62+L.k*.46];});
  /* the staff: a dark shaft with a rim and a pale-gold orb of light on top */
  const staffM=mm(g=>{g.fillRect(780,452,10,494);g.beginPath();g.moveTo(777,452);g.lineTo(783,418);g.lineTo(789,452);g.fill();g.beginPath();g.arc(785,446,9,0,6.283);g.fill();},.8);shade(staffM,{r:3,hs:8,alb:[.04,.035,.04],lit:.8,rim:1.6});
  lap('mage '+Math.round(performance.now()-t)+'ms');}

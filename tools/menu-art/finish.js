'use strict';
function stageWall(){
  /* the broken wall the dragon grips (drawn before the dragon so its claws close over the edge) */
  const m=mask(g=>{g.beginPath();g.moveTo(1290,1090);g.lineTo(1296,1010);g.lineTo(1330,996);g.lineTo(1352,968);g.lineTo(1396,974);g.lineTo(1428,990);g.lineTo(1470,982);g.lineTo(1520,1000);g.lineTo(1580,990);g.lineTo(1650,1010);g.lineTo(1730,998);g.lineTo(1800,1014);g.lineTo(1930,1004);g.lineTo(1930,1090);g.closePath();g.fill();},1.2);
  const ex=F1();for(let i=0;i<N;i++){if(m[i]<.01)continue;const u=(i%W)/S,v=((i/W)|0)/S;/* masonry courses */const row=Math.floor(v/26),off=(row&1)*24,c=((u+off)%48)/48,rr=(v%26)/26;const j=Math.min(c,1-c,rr,1-rr)<.04?-1:0;ex[i]=(j*1.2+.5*fbm(u*.05,v*.05,3))*S*m[i];}
  shade(m,{r:5,hs:14,alb:[.05,.058,.09],lit:.9,rim:1.1,extra:ex,exs:1});
  lap('wall');}
function stageLedge(){
  const m=mask(g=>{g.beginPath();g.moveTo(-30,1030);g.lineTo(60,1004);g.lineTo(200,990);g.lineTo(340,982);g.lineTo(470,960);g.lineTo(560,948);g.lineTo(640,942);g.lineTo(760,938);g.lineTo(900,936);g.lineTo(1020,940);g.lineTo(1110,946);g.lineTo(1170,954);g.lineTo(1196,972);g.lineTo(1186,994);g.lineTo(1214,1016);g.lineTo(1200,1040);g.lineTo(1250,1072);g.lineTo(1290,1090);g.lineTo(-30,1090);g.closePath();g.fill();},1.0);
  const ex=F1();for(let i=0;i<N;i++){if(m[i]<.01)continue;const u=(i%W)/S,v=((i/W)|0)/S,n=fbm(u*.012,v*.04,4),slab=Math.abs(Math.sin(u*.021+fbm(u*.004,v*.01,2)*2)*Math.sin(v*.07+u*.003));ex[i]=(n*7+(slab<.05?-3:0))*S*m[i];}
  shade(m,{r:10,hs:30,alb:[.036,.042,.07],lit:1.1,rim:1.5,extra:ex,exs:1,spec:.55,shin:7});
  lap('ledge');}
async function ART_MAIN(){
  const stage=new URLSearchParams(location.search).get('stage')||'all';if(stage==='none')return;
  if(stage==='head'){const cv=document.getElementById('out');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.fillStyle='#1a2238';g.fillRect(0,0,W,H);g.setTransform(S,0,0,S,0,0);g.fillStyle='#e8ecf8';g.strokeStyle='#e8ecf8';g.globalAlpha=.55;wingPath(g,WING_FAR);g.fill();g.globalAlpha=.8;wingPath(g,WING_NEAR);g.fill();g.globalAlpha=1;drawWingBones(g,WING_NEAR,1);drawWingBones(g,WING_FAR,.8);drawBody(g);drawLeg(g);DRAGON_DEBUG(g);g.save();g.translate(-70,0);MAGE_DEBUG(g);g.restore();log('uploaded '+await upload(cv,'art_head',.9));return;}
  stageSky();stageMountains();stageRuin();stageFarGround();stageWall();stageDragon();stageLens();stageHole();stageBacklight();stageLedge();stageMage();stageOverlay();stageMist();stageBloom();stageVoid();kuwahara(Math.max(2,Math.round(2.6*S)));stageFinish();
  const cv=present(SCN,'bg',1);const nm=S>=2?'art_final':'art_bg';log('uploaded '+await upload(cv,nm,S>=2?.9:.82));
}

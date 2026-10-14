/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (3): the model, on the skeleton of pc2.js.

   pcAssemble(K, cfg) builds the figure of a configuration: the skinned body and clothes, the hands, the head with its face and hair, the accessory, the archer's kit and the spring chains of whatever hangs loose.
   Every part is made in the bind pose and placed by Q in a frame: TOR (the torso), ARM(side), LEG(side), FOOT(side) and the frames of the hanging garments carry skinned parts (each frame brings the weights of its
   region), a real object (a bone, a group on a bone) takes rigid parts. Arms, legs, hands and shoes are made for the right side and mirrored for the left.
   K: what heroModel lends: {g, G, ARMS, LEGS, HOLD, WP}; cfg._nokit leaves the bow, the arrow and the quiver off (the pictures of the creator).
   ===================================================================================================================== */
function pcAssemble(K,cfg){
  const nokit=!!(cfg&&cfg._nokit),bare=!!(cfg&&cfg._bare),c=pcClean(cfg),F=c.gender==='f',g=K.g,gk=F?'f':'m',Y=PCL.y,LL=PCL[gk];
  /* (bare: the body alone, for checking it - skin for the base layer and the hips, no outer layer, bare feet) */
  if(bare)Object.assign(c,{top1:'undershirt',top2:'none',bottoms:'bare',shoes:'bare',acc:'none'});
  const SK=PCX_SKIN[c.skin].c,HC=PCX_HAIRC[c.hairC].c,C1=PCX_CLOTH[c.top1C].c,C2=PCX_CLOTH[c.top2C].c,CB=PCX_CLOTH[c.botC].c,CS=PCX_CLOTH[c.shoeC].c;
  const leather=0x6e4527,dleather=0x4a2e19,steel=0xa7adb5,gold=0xe2b04a,wood=0x7a4f2a,white=0xf2ece0;
  const T1=pcItem('top1',c.top1),T2=pcItem('top2',c.top2),BT=c.bottoms,SH=c.shoes,AC=c.acc,HR=c.hair;
  const HPm=Object.assign({},PCHB[gk],pcItem('head',c.head).p);HPm.rn*=F?1.12:1.16;/* (a plain straight neck: about half the width of the face; hers slimmer) */
  const SKL=pcSkeleton(F),BN=SKL.B;g.add(SKL.root);g.updateMatrixWorld(true);
  /* his head: drawn at .91 of the unit of the figure (so that with his body after the body reference he is about seven heads tall, the head a touch larger than the reference's); hers - his sculpted head made feminine (pcHeadLPM F) - at .92, her chin where it was (about 6.8 heads) */
  /* (and its middle, HCM, placed in the built layout so that after his lift (pcRemapY) the chin sits where the body reference has it; drawn a little forward of the head bone (HZG) so that his neck, behind the middle of his head, rises from the middle of the top of the torso) */
  const HSc=F?.92:.9074,HU=Y.U*HSc,HCM=F?.3293:.325;let HZG=0;
  const hkey=c.head+gk+k5(HPm.rn)+'lp3',S3=PCHD[hkey]||(PCHD[hkey]=pcHeadLP(HPm,F)),T3n=[0,0,0],neckAt=(y,ph)=>{S3((y-HCM)/HU,ph,T3n);return[T3n[0]*HU,T3n[2]*HU+HZG];};
  HZG=-.0012-S3.zn*HU;
  const B=pcBody2(F,HPm.rn*HSc,neckAt,hkey),bk=hkey,O=.0045,fr=ph=>Math.abs(pcWrap(ph)),gs=(a,s)=>Math.exp(-(a/s)*(a/s));
  const hasT2=c.top2!=='none'&&c.top2!=='cloak',sl1=T1.sl,sl2=hasT2?(T2.sl||'none'):'none',skirt=BT==='skirt'||BT==='longskirt';
  const leaT2=c.top2==='jerkin',k1=c.top1==='sweater'?'knit':'cloth',k2=leaT2?'leather':c.top2==='coat'||c.top2==='jacket'||c.top2==='cloak'?'wool':'cloth',kB=BT==='trousers'||BT==='loose'?'denim':'cloth';
  const mC1=bare?PM(SK,'skin'):PM(C1,k1),mC2=PM(C2,k2),mC2d=PM(C2,k2,true),mCB=bare?PM(SK,'skin'):PM(CB,kB),mSK=PM(SK,'skin'),mHC=PM(HC,'hair',true),mHCs=PM(HC,'hair');
  const mLea=PM(dleather,'leather'),mGold=PM(gold,'metal'),mCS=PM(CS,'leather'),mH2=PM(pcDark(C2,.12),leaT2?'leather':'cloth'),mHB=PM(pcDark(CB,.18),'cloth'),ball=pcBall(),soft=pcSEG(.55,.55),boxy=pcSEG(.35,.35);
  /* ---- frames ---- */
  const parts=[],wT=pcWTorso(F),wA=pcWArm(F),wL=pcWLeg(F),wF=pcWFoot(F),M4=()=>new THREE.Matrix4(),TOR={vp:1,M:M4(),w:wT};
  const side=(x,y,sd,w)=>({vp:1,M:M4().makeTranslation(x,y,0).multiply(M4().makeScale(sd,1,1)),w});
  /* (a leg's and a foot's clothes follow their own leg, wherever they reach: wide trousers cross the middle, and the side of a point there must not choose the other leg) */
  const ARM=sd=>side(sd*LL.shX,Y.sh,sd,wA),LEG=sd=>side(sd*LL.hipX,Y.hip,sd,(x,y,z)=>wL(sd,y,z)),FOOT=sd=>side(sd*LL.hipX,Y.ankle,sd,(x,y,z)=>wF(sd,y,z));
  const mloc=M4(),eul=new THREE.Euler(),qq=new THREE.Quaternion(),va=new THREE.Vector3(),vb=new THREE.Vector3();
  const Q=(geo,mat,par,x,y,z,rx,ry,rz,sx,sy,sz)=>{par=par||TOR;eul.set(rx||0,ry||0,rz||0);qq.setFromEuler(eul);if(sx==null)vb.set(1,1,1);else vb.set(sx,sy==null?sx:sy,sz==null?sx:sz);va.set(x||0,y||0,z||0);
    if(par.vp){const p={geo,mat,m:par.M.clone().multiply(mloc.compose(va,qq,vb)),w:par.w};parts.push(p);return p;}
    const m=new THREE.Mesh(geo,mat);m.position.copy(va);m.quaternion.copy(qq);m.scale.copy(vb);m.castShadow=true;m.receiveShadow=true;par.add(m);return m;};
  const G=(par,x,y,z,rx,ry,rz)=>{const q=new THREE.Group();q.position.set(x||0,y||0,z||0);q.rotation.set(rx||0,ry||0,rz||0);(par||g).add(q);return q;};
  /* a group on a bone whose frame is the figure's in the bind pose (rigid parts placed in figure units) */
  const onBone=n=>{const p=new THREE.Vector3().setFromMatrixPosition(BN[n].matrixWorld);return G(BN[n],-p.x,-p.y,-p.z);};
  const B3=[0,0,0],bs=(y,ph,off)=>{B.S(y,ph,off,B3);return B3.slice();};
  /* the sculpts of the arm and the leg (pcbody.js): their skin and sleeves and trouser legs below, and what must keep clear of them (the colliders of the springs, the skirts) */
  const invB=pcRemapInv(F),ryB=pcRemapY(F),AL=pcLimbLP(F?PCBA_F:PCBA_M,invB,Y.sh,ryB?ryB(Y.sh):Y.sh),AT=AL.lys[0],AW=AL.lys[AL.lys.length-1],AE=-LL.up;
  const LG=pcLimbLP(F?PCBL_F:PCBL_M,y=>y,Y.hip,Y.hip),LA=-LL.th-LL.sn,LGB=LG.lys[LG.lys.length-1];
  /* a ring (the rolled edge of a hem or a cuff) round y: radius r or [rx, rz], tube t */
  const ring=(key,r,y,t,mat,par,nu)=>Q(pcTube('rg'+key,4,nu||12,s=>{const a=s*2*Math.PI,rx=Array.isArray(r)?r[0]:r,rz=Array.isArray(r)?r[1]:r;return[Math.sin(a)*rx,y,Math.cos(a)*rz];},()=>t),mat,par);
  /* a line along the torso (a seam, an edge) */
  const line=(key,p,t,mat,n)=>Q(pcTube('ln'+key,4,Math.max(4,Math.round((n||12)/3)),p,()=>t),mat);

  /* ---- the hips (the bottoms; under a skirt its lining) ---- */
  const YB=Y.belt;
  /* (under the hip joints the band lies on the trouser legs: let out by as much as they are, so the hips and the legs of the trousers are one surface) */
  const pelO=BT==='trousers'?.002:BT==='fitted'?.0011:BT==='shorts'?.0024:BT==='loose'?.004:0;
  Q(pcShell2(B,'pel'+BT+bk,()=>.15,()=>YB,0,(v,ph)=>pelO*(1-pcSm(Y.hip-.002,Y.hip+.009,.15+(YB-.15)*v)),16,4),mCB);
  /* (low-poly: no stitched lines on the hips) */

  /* ---- the base layer (Top 1): the torso is the garment, the skin above its neckline ---- */
  const nb=ph=>.2915+.0035*pcSm(0,1.6,fr(ph))+.0012*pcSm(1.6,Math.PI,fr(ph));/* the base of the neck: lowest in front */
  let topY=nb;
  if(c.top1==='shirt')topY=ph=>nb(ph)-.025*gs(fr(ph),.3);
  else if(c.top1==='undershirt')topY=ph=>nb(ph)-.032*gs(fr(ph),.62)-.02*gs(fr(ph)-Math.PI,.6);
  else if(c.top1==='blouse')topY=ph=>nb(ph)-.02*gs(fr(ph),.95);
  else if(c.top1==='tunic')topY=ph=>nb(ph)-.017*gs(fr(ph),.2);
  else if(c.top1==='tee')topY=ph=>nb(ph)-.0035*gs(fr(ph),1);
  const t1b=c.top1==='sweater'?.19:YB,tk='t1'+c.top1+bk,mT1e=PM(pcDark(C1,.12),'cloth');
  /* a tucked top blouses a little over the belt (soft folds round the waist) */
  const tuck=c.top1==='shirt'||c.top1==='tee'||c.top1==='undershirt'||c.top1==='blouse',blo=(v,ph)=>{if(!tuck)return 0;const y=t1b+(topY(ph)-t1b)*v;return .0009*pcSm(t1b+.001,t1b+.006,y)*(1-pcSm(t1b+.007,t1b+.02,y))*(.5+.5*Math.sin(ph*7+1.3));};
  Q(pcShell2(B,tk,()=>t1b,topY,0,blo,14,8),mC1);
  Q(pcShell2(B,tk+'s',topY,()=>.303,0,0,17,3),mSK);
  const nline=(key,off,t,mat)=>line(key,s=>{const ph=s*2*Math.PI;return bs(topY(ph)-t*.3,ph,off);},t,mat,64);
  /* the seams over the shoulders */
  const seams=()=>{};/* (low-poly: no shoulder seams) */
  if(c.top1==='shirt'){nline('shv'+bk,.0006,.0009,mT1e);seams('shs'+bk,.0004,mT1e);
    Q(pcShell2(B,'scol'+bk,ph=>.2848+.0035*pcSm(1.2,Math.PI,fr(ph)),ph=>.2972+.0016*pcSm(1.2,Math.PI,fr(ph)),.34,(v,ph)=>.0013+.0036*v*v,14,2),PM(pcLite(C1,.08),'cloth',true));
    Q(pcGrid('plk'+bk,1,5,(u,v,o)=>{const y=YB+(topY(0)-.0015-YB)*v;B.S(y,(u-.5)*.075,.0006,o);},'axis'),PM(pcDark(C1,.035),'cloth'));
    for(let i=0;i<4;i++){const y=topY(0)-.0075-i*.016;if(y<YB+.005)break;const p=bs(y,0,.0011);Q(pcBead(),PM(pcDark(C1,.35),'cloth'),TOR,p[0],p[1],p[2],0,0,0,.0016,.0016,.0007);}}
  else if(c.top1==='tee'){nline('teeb'+bk,.0009,.0014,mT1e);seams('tes'+bk,.0004,mT1e);}
  else if(c.top1==='undershirt'&&!bare)nline('unb'+bk,.0005,.0008,mT1e);
  else if(c.top1==='blouse'){Q(pcTube('frill'+bk,4,32,t=>{const ph=t*2*Math.PI;return bs(topY(ph)+.0006,ph,.0016);},t=>.0019*(1+.45*Math.sin(t*Math.PI*40))),PM(pcLite(C1,.18),'cloth'));
    for(let i=0;i<3;i++)for(const sd of[-1,1]){const y=topY(0)-.004-i*.0085,a=bs(y,sd*.075,.0011),b=bs(y-.0068,-sd*.075,.0011);Q(pcTube('lace'+i+sd+bk,4,2,t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t+.0005*Math.sin(t*Math.PI)],()=>.0006),PM(pcDark(C1,.45),'cloth'));}}
  else if(c.top1==='tunic'){nline('tub'+bk,.0006,.0009,mT1e);seams('tus'+bk,.0004,mT1e);}
  else if(c.top1==='sweater'){if(AC!=='hood')Q(pcTube('turt'+bk,5,20,t=>{const ph=t*2*Math.PI;return bs(.2955,ph,.0042);},t=>.0056+.0003*Math.sin(t*Math.PI*30)),PM(pcDark(C1,.06),'cloth'));
    Q(pcShell2(B,'swh'+bk,()=>.1885,()=>.2045,0,(v,ph)=>.0016+.0005*Math.sin(ph*48),23,1),PM(pcDark(C1,.1),'cloth'));}
  /* a buckle: a gold frame round the leather */
  const buckle=(y,off)=>{const p=bs(y,0,off);Q(boxy,mGold,TOR,p[0],p[1],p[2]+.0003,0,0,0,.0052,.006,.0011);Q(boxy,mLea,TOR,p[0],p[1],p[2]+.0007,0,0,0,.0034,.0042,.0009);};
  if(c.top1==='tunic'){Q(pcShell2(B,'tubelt'+bk,()=>.2035,()=>.2135,0,.0038,17,1),mLea);buckle(.2085,.0052);}
  if(!skirt&&!bare&&c.top1!=='tunic'&&c.top1!=='sweater'&&c.top2!=='hoodie'){Q(pcShell2(B,'belt'+bk,()=>YB-.005,()=>YB+.0055,0,.0022,17,1),mLea);buckle(YB+.0002,.0034);}

  /* ---- the outer layer (Top 2): the same surface O further out, open in the middle of the front when the garment is open ---- */
  let outOff=.0012;
  const outer=(key,yb,yt,gap,mat,hem)=>{Q(pcShell2(B,key+bk,yb,yt,gap,O,14,7),mat);if(hem!==false)Q(pcShell2(B,key+'h'+bk,yb,ph=>yb(ph)+.0065,gap,O+.0012,17,1),mH2);outOff=O+.0015;};
  /* the facing of an opening: a narrow raised strip along each edge (the cloth's thickness) */
  const facing=(key,yb,yt,gap,w,off,mat)=>{for(const sd of[-1,1])Q(pcGrid('fc'+key+sd+bk,2,7,(u,v,o)=>{const gp=typeof gap==='function'?gap(v):gap,y0=yb(gp),y1=yt(gp),y=y0+(y1-y0)*v,ph=sd*(gp+u*w);B.S(y,ph,off,o);},'axis'),mat);};
  if(c.top2==='jacket'||c.top2==='coat'){const coat=c.top2==='coat',gp=v=>(coat?.13:.17)+.24*pcSm(.35,1,v),yt=ph=>nb(ph)+.0025-.056*gs(fr(ph),.5),yb=()=>coat?.196:.184;
    outer(c.top2,yb,yt,gp,mC2d);facing(c.top2+'f',yb,yt,gp,.1,O+.001,PM(pcDark(C2,.1),'cloth'));
    /* lapels folded back */for(const sd of[-1,1])Q(pcGrid('lap'+c.top2+sd+bk,2,4,(u,v,o)=>{const vv=.5+.5*v,gq=gp(vv),y=yb()+(yt(gq)-yb())*vv,ph=sd*(gq+u*(.26+.2*v));B.S(y,ph,O+.002+.001*u,o);},'axis'),PM(pcLite(C2,.07),'cloth'));
    Q(pcShell2(B,c.top2+'col'+bk,()=>.2842,()=>.2985,1.05,(v,ph)=>O+.0016+.0055*v,14,2),PM(pcLite(C2,.04),'cloth',true));
    for(const sd of[-1,1]){const p=bs(.1925,sd*.85,O+.0016);Q(boxy,PM(pcDark(C2,.18),'cloth'),TOR,p[0],p[1],p[2],0,sd*.85,0,.0105,.0026,.0016);}
    seams(c.top2+'sm'+bk,O+.0004,mH2);
    if(coat)for(let i=0;i<3;i++){const p=bs(.262-i*.0165,.205,O+.0017);Q(pcBead(),mGold,TOR,p[0],p[1],p[2],0,0,0,.0023,.0023,.0012);}}
  else if(c.top2==='vest'){/* (over the shoulders up to the base of the neck: the arm and its sleeve cover the edge round the armhole) */const yt=ph=>nb(ph)+.002-.058*gs(fr(ph),.5),yb=ph=>.187-.0065*gs(fr(ph),.3);
    outer('vest',yb,yt,.03,mC2d);facing('vestf',yb,yt,.03,.07,O+.001,PM(pcDark(C2,.12),'cloth'));for(let i=0;i<4;i++){const p=bs(.255-i*.0165,.05,O+.0015);Q(pcBead(),mGold,TOR,p[0],p[1],p[2],0,0,0,.0021,.0021,.0011);}}
  else if(c.top2==='hoodie'){outer('hood',()=>.192,ph=>nb(ph)+.002,0,mC2,false);Q(pcShell2(B,'hoodhem'+bk,()=>.186,()=>.1985,0,(v,ph)=>O+.0015+.0004*Math.sin(ph*44),23,1),PM(pcDark(C2,.1),'cloth'));
    {const p=bs(.212,0,O+.0016);Q(soft,PM(pcDark(C2,.07),'cloth'),TOR,0,.212,p[2]-.0007,-.06,0,0,.025,.0125,.002);}
    for(const sd of[-1,1]){const a=bs(.284,sd*.17,O+.0012);Q(pcTube('dstr'+sd+bk,4,4,t=>[a[0]+sd*.0008*t,a[1]-.024*t,a[2]+.003+.0016*Math.sin(t*3)],()=>.00085),PM(white,'cloth'));}
    if(HR!=='long'&&HR!=='braid'&&HR!=='ponytail')Q(pcTube('hdn'+bk,5,14,t=>{const ph=Math.PI+(t-.5)*2.6,p=bs(.2905,ph,O+.0075);return[p[0],p[1]+.0035-.0045*Math.cos((t-.5)*Math.PI),p[2]];},t=>.0088*Math.sin(Math.PI*(.06+.88*t))+.0018),mC2);}
  else if(c.top2==='openshirt'){const yb=()=>.184,yt=ph=>nb(ph)+.002;outer('opsh',yb,yt,.3,mC2d);facing('opshf',yb,yt,.3,.08,O+.001,PM(pcLite(C2,.06),'cloth'));
    Q(pcShell2(B,'opcol'+bk,()=>.2842,()=>.2985,.42,(v,ph)=>O+.0015+.0048*v,14,2),PM(pcLite(C2,.1),'cloth',true));}
  else if(c.top2==='jerkin'){const yt=ph=>nb(ph)+.002-.034*gs(fr(ph),.45),yb=()=>.184;outer('jerk',yb,yt,0,mC2d);
    for(let i=0;i<4;i++){const y=.268-i*.0155;for(const sd of[-1,1]){const a=bs(y,sd*.1,O+.0013),b=bs(y-.0105,-sd*.1,O+.0013);Q(pcTube('jl'+i+sd+bk,4,2,t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t+.0007*Math.sin(t*Math.PI)],()=>.0008),PM(pcDark(C2,.55),'leather'));}}
    for(let i=0;i<3;i++)for(const sd of[-1,1]){const p=bs(.26-i*.026,sd*.55,O+.0013);Q(pcBead(),PM(steel,'metal'),TOR,p[0],p[1],p[2],0,0,0,.0019);}}

  /* ---- what hangs loose: garments on chains of spring bones, pushed out of spheres on the body ---- */
  const springs=[],COL={},col=(n,b,o,r)=>{COL[n]={b:BN[b],o:new THREE.Vector3(...o),r};};
  col('pelvis','root',[0,-.006,-.004],.036);col('waist','spine',[0,0,-.003],.031);col('back','chest',[0,.008,-.006],.033);col('neck','neck',[0,.008,-.002],.0135);
  const lgR=ly=>Math.max(...LG.ext(ly)),agR=ly=>Math.max(...AL.ext(ly));
  /* (the margins cover the cloth sagging between two chains as well as its thickness) */
  for(const s of['L','R']){col('th1'+s,'thigh'+s,[0,-.03,0],lgR(-.03)+.0058);col('th2'+s,'thigh'+s,[0,-.064,.001],lgR(-.064)+.0054);col('kn'+s,'shin'+s,[0,0,.002],lgR(-.082)+.0054);
    col('sh1'+s,'shin'+s,[0,-.03,-.002],lgR(-.112)+.0052);col('sh2'+s,'shin'+s,[0,-.062,-.001],lgR(-.144)+.005);col('arm'+s,'upper'+s,[0,-.004,0],agR(-.004)+.0035);}
  const cols=names=>names.map(n=>COL[n]).filter(Boolean);
  const LEGC=['th1L','th1R','th2L','th2R','knL','knR','sh1L','sh1R','sh2L','sh2R'];
  /* a hanging garment: radius rad(y, ph) round the azimuths ph0..ph1, from yT down to yBot; chains at the azimuths az (links at the heights ys) from bone par */
  /* the direction of the torso's surface at the parameter ph (its sections are superellipses: ph is not quite the angle), at the height y (below the hips: of the hips) */
  const HY=.183,hdir=(y,ph)=>{const p=bs(Math.max(y,HY),ph,0),cz=B.cz(Math.max(y,HY)),l=Math.hypot(p[0],p[2]-cz)||1;return[p[0]/l,(p[2]-cz)/l];};
  const hangG=(key,yT,yBot,ph0,ph1,rad,nu,nv)=>pcGrid('hg'+key,nu,nv,(u,v,o)=>{const ph=ph0+(ph1-ph0)*u,y=yT+(yBot-yT)*v,r=rad(y,ph),d=hdir(y,ph);o[0]=r*d[0];o[1]=y;o[2]=B.cz(y)+r*d[1];},'axis');
  const chains=(name,par,az,ys,yBot,rad,sp)=>az.map((a,i)=>{const pts=ys.concat([yBot]).map(y=>{const r=rad(y,a),d=hdir(y,a);return[r*d[0],y,B.cz(y)+r*d[1]];}),bones=pcChain(SKL,name+i+'_',par,pts);
    springs.push(pcSpring(bones,sp));return{a:Math.atan2(pts[pts.length-1][0],pts[pts.length-1][2]-B.cz(yBot)),ys,names:bones.map(b=>b.name)};});
  /* below the hips a garment carries the section of the hips down, flaring and in folds; env: the garments under it (it stays outside them) */
  const envs=[];
  /* how far the legs reach in the direction of the parameter ph at a height (both thighs' sections: the farthest of their points along that direction from the middle of the hips) */
  const LS=[0,0,0],legSup=(y,ph)=>{const ly=y-Y.hip,d=hdir(y,ph),cz=B.cz(HY);let m=0;for(const sd of[-1,1])for(let k=0;k<8;k++){LG.at(ly,k,0,LS);m=Math.max(m,sd*(LL.hipX+LS[0])*d[0]+(LS[2]-cz)*d[1]);}return m;};
  const hipR=(base,flare,yh,fold,nf)=>{const inner=envs.slice();return(y,ph)=>{const t=Math.max(0,Math.min(1,(HY-y)/(HY-yh)));let r=B.R(Math.max(y,HY),ph,base)*(1+flare*Math.pow(t,1.15))+fold*t*Math.sin(ph*nf);
    if(y<HY)r=Math.max(r,legSup(y,ph)+base+.003);const gap=.0032+.0026*pcSm(HY+.004,HY-.008,y);/* (a little over the one under at the waist, where the layers above lie close; more where they hang free) */
    for(const f of inner)r=Math.max(r,f(y,ph)+gap);return r;};};
  /* the cloth over a thigh goes along with it (a share of the thigh's weight: most low down and right over the leg, less behind it), so a striding leg carries the skirt instead of passing through it */
  /* (cloth over the legs goes with them: from just under the belt (as fast as the body under it does), over the whole front of each thigh - a thigh driven up in a run lifts the cloth over it, it never comes through it - and, below the
     knee, with the shin too (a long skirt over a striding leg); cloth between the legs follows both, as it hangs between them) */
  /* (front to back without a step - a step at the side seam would open the cloth there as the thigh lifts; wider towards the outside of the leg, where no other leg pulls) */
  const withThighs=(w,k0)=>(x,y,z)=>{const r=w(x,y,z),kf=1,kb=k0*.22,h=pcSm(Y.hip+.007,Y.hip-.013,y)*(kb+(kf-kb)*pcSm(-.04,.01,z));/* (the back of the cloth mostly hangs free on its springs: carried forward by a thigh driven up, it would sink into the seat behind) */if(h<1e-4)return r;const q=.5*pcSm(Y.knee+.006,Y.knee-.03,y);
    /* (over the thigh itself - its width, .016 to the outside of its middle and .006 to the inside - the cloth goes with it entirely; it falls off beyond, slowly outside, quickly towards the other leg; the two thighs'
       shares are laid on together, so the cloth between the legs follows both alike) */
    const lat=xs=>{const d=Math.abs(x-xs),out=(x-xs)*xs>0,e=Math.max(0,d-(out?.016:.006));return Math.max(0,1-e/(out?.09:.04));};/* (towards the other leg the full share ends sooner and fades over more: a gentle change into the middle, where the cloth is shared) */let kL=h*lat(-LL.hipX),kR=h*lat(LL.hipX);const T=kL+kR;if(T>1){kL/=T;kR/=T;}
    const kt=kL+kR;if(kt<1e-4)return r;for(const n in r)r[n]*=1-kt;const add=(b,k)=>{if(k>1e-6)r[b]=(r[b]||0)+k;};add('thighL',kL*(1-q));add('shinL',kL*q);add('thighR',kR*(1-q));add('shinR',kR*q);return r;};
  const RING8=[-.75,-.5,-.25,0,.25,.5,.75,1].map(k=>k*Math.PI),RING12=Array.from({length:12},(_,i)=>(i-5)/6*Math.PI);
  /* (a garment that hangs over another - a tunic over a skirt, a coat over either - hangs on the same chains with the same share of the thighs, so the one under never shows through) */
  let hangCh=null,hangK=0;
  if(skirt){const long=BT==='longskirt',y0=c.top1==='tunic'?.2:.207,y1=long?.03:.088,rad=hipR(c.top1==='tunic'?.0005:.0025,long?.42:.24,y1,long?.0034:.0028,long?10:9),ys=long?[HY,.134,.083]:[HY,.136];
    const ch=chains('sk','root',RING12,ys,y1,rad,{stiff:long?.15:.2,drag:.2,grav:.01,max:1.45,col:cols(LEGC)}),w=withThighs(pcWChains(ch,wT),long?.66:.7),SKV={vp:1,M:M4(),w};hangCh=ch;hangK=long?.66:.7;
    Q(hangG('sk'+BT+bk+k5(y0)+c.top1+'_'+envs.length,y0,y1,0,2*Math.PI,rad,48,long?26:16),PM(CB,'cloth',true),SKV);
    Q(hangG('skh'+BT+bk+c.top1+'_'+envs.length,y1+.0075,y1,0,2*Math.PI,(y,ph)=>rad(y,ph)+.0011,16,1),PM(pcDark(CB,.22),'cloth'),SKV);
    if(c.top1!=='tunic')Q(pcShell2(B,'skb'+bk,()=>.1995,()=>.2105,0,.0034,17,1),PM(pcDark(CB,.25),'cloth'));
    envs.push(rad);}
  if(c.top1==='tunic'){const y1=.127,rad=hipR(Math.max(.0035,pelO+.0016),.16,y1,.0026,10),/* (clear of the trousers under it: loose ones stand out at the hips) */ch=hangCh||chains('tu','root',RING12,[HY,.156],y1,rad,{stiff:.22,drag:.24,grav:.01,max:1.45,col:cols(LEGC)}),SKV={vp:1,M:M4(),w:withThighs(pcWChains(ch,wT),hangCh?hangK:.72)};if(!hangCh){hangCh=ch;hangK=.72;}
    Q(hangG('tu'+bk+BT+'_'+envs.length,.205,y1,0,2*Math.PI,rad,24,8),PM(C1,'cloth',true),SKV);Q(hangG('tuh'+bk+BT+'_'+envs.length,y1+.0065,y1,0,2*Math.PI,(y,ph)=>rad(y,ph)+.0011,16,1),mT1e,SKV);envs.push(rad);}
  if(c.top2==='coat'){const y1=.086,gp=.17,rad=hipR(O+.0016,.3,y1,.003,7),az=[.5,1.3,2.2,Math.PI,-2.2,-1.3,-.5],ch=hangCh||chains('ct','root',az,[HY,.135],y1,rad,{stiff:.14,drag:.17,grav:.012,max:1.25,col:cols(LEGC)}),SKV={vp:1,M:M4(),w:withThighs(pcWChains(ch,wT,!hangCh),hangCh?hangK:.45)};
    Q(hangG('ct'+bk+BT+c.top1+'_'+envs.length,.199,y1,gp,2*Math.PI-gp,rad,14,5),mC2d,SKV);Q(hangG('cth'+bk+BT+c.top1+'_'+envs.length,y1+.007,y1,gp,2*Math.PI-gp,(y,ph)=>rad(y,ph)+.0011,14,1),mH2,SKV);envs.push(rad);}
  /* the cloak hangs from the shoulders and flares behind the legs; a roll along its top, cords to a clasp */
  let capeR=null;
  if(c.top2==='cloak'){const yT=.287,yB=.045,span=1.25,rT=B.R(yT,Math.PI,.004)+.004,rB=.07,cr=y=>y>yT?0:rT+(rB-rT)*Math.pow((yT-y)/(yT-yB),1.3);capeR=cr;
    const rad=(y,ph)=>Math.max(cr(y),y>.15?B.R(y,ph,.006)+.004:0)*(1+.035*Math.pow(Math.max(0,(yT-y)/(yT-yB)),1.2)*Math.sin((ph-Math.PI)/span*Math.PI*3.5));
    const az=[Math.PI-span,Math.PI-span/2,Math.PI,-Math.PI+span/2,-Math.PI+span],ch=chains('cl','chest',az,[.24,.175,.11],yB,rad,{stiff:.07,drag:.14,grav:.03,max:1.15,col:cols(['back','waist','pelvis'].concat(LEGC))});
    const SKV={vp:1,M:M4(),w:pcWChains(ch,wT,true)};
    Q(hangG('cape'+bk,yT,yB,Math.PI-span,Math.PI+span,rad,10,7),PM(C2,k2,true),SKV);
    Q(pcTube('caper'+bk,5,14,t=>{const ph=Math.PI+(t-.5)*2*span,r=rT+.002;return[r*Math.sin(ph),yT+.0015,B.cz(yT)+r*Math.cos(ph)];},()=>.003),PM(pcDark(C2,.1),'cloth'));
    for(const sd of[-1,1]){const ph0=Math.PI+sd*span;Q(pcTube('cord'+sd+bk,4,5,t=>{const ph=ph0+(sd*.25-ph0)*t,r=rT+.002+(B.R(.289,sd*.25,.004)-rT)*t;return[r*Math.sin(ph),.2885-.004*t,B.cz(.289)+r*Math.cos(ph)];},()=>.001),mGold);}
    {const p=bs(.2865,0,.0052);Q(pcRev('clasp',[[.0001,-.0014],[.0047,-.0009],[.0051,.0003],[.0026,.0014],[.0001,.0016]],16),mGold,TOR,0,p[1],p[2],Math.PI/2,0,0);}}
  /* the outermost back and chest, for what lies on them (hair, quiver, pendant, scarf) */
  const backOut=(y,ph)=>{const yy=Math.min(.298,Math.max(.16,y));let r=B.R(yy,ph,outOff+(c.top2==='hoodie'&&!(HR==='long'||HR==='braid'||HR==='ponytail')&&y>.282?.016:0));if(capeR&&Math.abs(pcWrap(ph-Math.PI))<1.25)r=Math.max(r,capeR(y)+.004);return r;};

  /* ---- the arms (made for the right one, mirrored for the left): the skin where it shows, the sleeves of the base layer, the sleeves of the outer layer over them - tubes on the arm's sculpt (pcbody.js) ---- */
  /* creases on the inside of the elbow of a sleeve (k: the column round the arm, 0 in front) */
  const crease=(ly,k,a)=>a*gs(ly-AE,.008)*Math.max(0,Math.cos(k*Math.PI/4));
  /* a rolled edge round a limb at ly (off(k): its offset), tube t */
  const ringOn=(L,key,ly,off,t,mat,par)=>Q(pcTube('rgl'+key,4,8,s=>{const k=Math.round(s*8),o=[0,0,0];L.at(ly,k,typeof off==='function'?off(k):off,o);return o;},()=>t),mat,par);
  const ak='a'+gk,outLong=sl2==='long',rolled=sl2==='rolled',baseLong=sl1==='long';
  const skinFrom=outLong||baseLong?AW+.012:rolled?-.056:sl1==='short'||sl1==='puff'?-.022:1;
  for(const sd of[-1,1]){const A=ARM(sd);
    if(skinFrom>=1)Q(pcLimbTube(ak+'sk',AL,AT,AW-.001,0,0,.0015),mSK,A);
    else Q(pcLimbTube(ak+'sk'+k5(skinFrom),AL,skinFrom,AW-.001,0,null,.0015),mSK,A);
    if(baseLong&&!outLong){const sw=c.top1==='sweater';Q(pcLimbTube(ak+'s1l',AL,AT,AW+.007,(l,k)=>.0018+.0006*pcSm(-.05,AW,l)+crease(l,k,.0005),.0012,null),mC1,A);
      Q(pcLimbTube(ak+'cf1'+(sw?1:0),AL,AW+.0125,AW+.0055,sw?.0031:.0028,null,null),mT1e,A);ringOn(AL,ak+'cr1'+(sw?1:0),AW+.0055,sw?.0031:.0028,.0009,mT1e,A);}
    if(sl1==='short'&&!outLong&&!rolled){Q(pcLimbTube(ak+'s1s',AL,AT,-.032,l=>.0019+.0007*pcSm(-.01,-.032,l),.0012,null),mC1,A);ringOn(AL,ak+'s1h',-.032,.0026,.0012,mT1e,A);}
    if(sl1==='puff'&&!outLong&&!rolled){Q(pcLimbTube(ak+'s1p',AL,AT,-.034,l=>.0015+.0062*Math.sin(Math.PI*Math.min(1,Math.max(0,(AT-l)/(AT+.034)))),.0015,null),mC1,A);
      ringOn(AL,ak+'pff',-.034,.0021,.0018,PM(pcLite(C1,.15),'cloth'),A);}
    if(outLong){Q(pcLimbTube(ak+'s2l'+c.top2,AL,AT,AW+.008,(l,k)=>.0044+.0014*pcSm(-.05,AW,l)+crease(l,k,.0007),.002,null),mC2,A);
      Q(pcLimbTube(ak+'cf2'+c.top2,AL,AW+.016,AW+.0065,.0058,null,null),mH2,A);ringOn(AL,ak+'cr2'+c.top2,AW+.0065,.0058,.0012,mH2,A);}
    if(rolled){Q(pcLimbTube(ak+'s2r',AL,AT,-.066,(l,k)=>.0042+crease(l,k,.0004),.002,null),mC2,A);ringOn(AL,ak+'s2rr',-.067,.0062,.0032,PM(pcLite(C2,.06),'cloth'),A);}
    if(c.top2==='jerkin'){const mP=PM(pcDark(C2,.12),'leather',true);Q(pcLimbTube(ak+'paul',AL,AT,-.024,.0054,.0025,null),mP,A);ringOn(AL,ak+'paur',-.024,.0054,.0011,mP,A);
      for(const k of[1,2,3]){const o=[0,0,0];AL.at(-.012,k,.0058,o);Q(pcBead(),PM(steel,'metal'),A,o[0],o[1],o[2],0,0,0,.0012);}}}

  /* ---- the hands (rigid, on their bones): relaxed, or closed round a grip; made for the right hand (the palm towards the body, the thumb forward, the fingers down): a palm, three-jointed fingers, a thumb ---- */
  const HD=LL.hand,hk=HD[0]/.039,hands={},HWz=F?.93:(HD[1]/HD[0])/.42;
  for(const sd of[-1,1]){const s=sd<0?'L':'R',hb=BN['hand'+s];hands[s]={};
    for(const grip of[0,1]){const hg2=G(hb);hg2.scale.x=sd;Q(pcHandGeo(gk,grip,HWz),mSK,hg2,0,0,0,0,0,0,HD[0]);hands[s][grip?'grip':'open']=hg2;hg2.visible=nokit?!grip:!!grip;}}

  /* ---- the legs (made for the right one, mirrored): the skin where it shows, the trouser legs - tubes on the leg's sculpt ---- */
  /* creases behind the knee and at the front of the hip of a trouser leg */
  const kneeW=(ly,k)=>{const c0=Math.cos(k*Math.PI/4);return .0004*gs(ly+.084,.01)*(.4+.6*Math.max(0,-c0))+.0003*gs(ly+.01,.008)*Math.max(0,c0);};
  const lk='l'+gk,tucked=SH==='tallboots'||(SH==='boots'&&(BT==='fitted'||BT==='shorts'||skirt)),hemY=LA+(tucked?.012:.004),legSkinFrom=skirt||BT==='bare'?1:BT==='shorts'?-.084:-.148;
  /* trousers fall straight from the hip (a cone round the leg), never inside the leg; loose ones wider and flared */
  /* (at the top they follow the leg into the hips, the fall begins below) */
  const trO=(ly,k)=>{const s=LL.leg[0]+.0019+(LL.leg[8]+.0062-LL.leg[0]-.0019)*Math.min(1,ly/hemY);return Math.max(.0019,(s-LG.rad(ly,k))*pcSm(.002,-.03,ly));};
  const loO=(ly,k)=>{const w=(.0205+.0045*pcSm(-.1,hemY-.004,ly))*(F?.96:1)+.0007*Math.sin(k*Math.PI/4*7)*pcSm(-.04,hemY,ly);return Math.max(.004,(w-LG.rad(ly,k))*pcSm(.002,-.03,ly));};
  /* what is on the leg at a height (under the shaft of a boot) */
  const legOff=(ly,k)=>BT==='trousers'?trO(ly,k):BT==='loose'?loO(ly,k):BT==='fitted'?.0011:BT==='shorts'&&ly>-.09?.0024:0;
  for(const sd of[-1,1]){const Lg=LEG(sd);
    if(cfg&&cfg._nolegs){}/* (the lab: the hips without the legs) */
    else if(legSkinFrom>=1)Q(pcLimbTube(lk+'sk',LG,0,LGB,0,.006,null),mSK,Lg);
    else Q(pcLimbTube(lk+'sk'+k5(legSkinFrom),LG,legSkinFrom,LGB,0,null,null),mSK,Lg);
    if(BT==='trousers'){Q(pcLimbTube(lk+'tr'+k5(hemY),LG,0,hemY,(l,k)=>trO(l,k)+kneeW(l,k),.011,null),mCB,Lg);
      Q(pcLimbTube(lk+'trc'+k5(hemY),LG,hemY+.007,hemY,(l,k)=>trO(hemY,k)+.0007,null,null),mHB,Lg);ringOn(LG,lk+'trr'+k5(hemY),hemY,k=>trO(hemY,k)+.0007,.0009,mHB,Lg);}
    else if(BT==='fitted'){Q(pcLimbTube(lk+'fi'+k5(hemY),LG,0,hemY,(l,k)=>.0011+kneeW(l,k)*.6,.011,null),mCB,Lg);
      Q(pcLimbTube(lk+'fib',LG,-.067,-.073,.0018,null,null),mHB,Lg);}
    else if(BT==='loose'){const h=hemY-.004;Q(pcLimbTube(lk+'lo'+k5(h),LG,0,h,(l,k)=>loO(l,k)+kneeW(l,k),.011,null),mCB,Lg);
      Q(pcLimbTube(lk+'loc'+k5(h),LG,h+.008,h,(l,k)=>loO(h,k)+.0007,null,null),mHB,Lg);ringOn(LG,lk+'lor'+k5(h),h,k=>loO(h,k)+.0007,.001,mHB,Lg);}
    else if(BT==='shorts'){const h=-.09;Q(pcLimbTube(lk+'so',LG,0,h,(l,k)=>.0024+.001*pcSm(-.05,h,l)+kneeW(l,k)*.5,.011,null),mCB,Lg);ringOn(LG,lk+'sor',h,.0034,.0011,mHB,Lg);}}

  /* ---- the feet and the shoes (the frame of the foot: the ankle at 0, the ground at -Y.ankle, the toes towards +z): the foot's sculpt; a shoe is the foot let out by its leather, on a sole ---- */
  const gy=-Y.ankle,FTX=F?.9:1,FTZ=F?.93:1,FTH=F?.92:1;
  /* the foot's section at z (between its sections), scaled: 8 points [x, y] */
  const footAt=z=>{const S=PCF_M;let i=0;while(i<S.length-2&&S[i+1][0]*FTZ<z)i++;const a=S[i],b=S[i+1],t=Math.min(1,Math.max(0,(z-a[0]*FTZ)/((b[0]-a[0])*FTZ)));return a[1].map((p,k)=>[(p[0]+(b[1][k][0]-p[0])*t)*FTX,gy+(p[1]+(b[1][k][1]-p[1])*t)*FTH]);};
  /* a shoe's upper: each point of the foot moved out from the middle of its section by t; the sole's points onto the sole */
  const shoeSecs=pointed=>pointed?PCF_M.concat([[.0475,[[.0018,.0062],[.0034,.0048],[.0038,.003],[.0026,.0018],[-.0036,.0018],[-.0052,.003],[-.0048,.0052],[-.0016,.0066]]]]):PCF_M;
  const shoeTips=pointed=>pointed?[PCF_TIP[0],[.0565,-.0008,.0085]]:PCF_TIP;
  const upper=(key,t,soleT,pointed)=>pcFootGeo('up'+key+gk+k5(t),shoeSecs(pointed),shoeTips(pointed),FTX,FTZ,FTH,gy,(i,k,q)=>{const ring=shoeSecs(pointed)[i][1];let cx=0,ch=0;for(const p of ring){cx+=p[0]*FTX/8;ch+=(gy+p[1]*FTH)/8;}
    const dx=q[0]-cx,dh=q[1]-ch,l=Math.hypot(dx,dh)||1;const o=[cx+dx*(1+t/l),ch+dh*(1+t/l),q[2]];if(k===3||k===4)o[1]=gy+soleT-.0004;return o;});
  /* the sole: a slab along the outline of the foot, from the ground to soleT */
  const soleG=(key,t,soleT,pointed)=>{const S=shoeSecs(pointed).map(([z,ring])=>{let xo=-1,xi=1;for(const p of ring){xo=Math.max(xo,p[0]);xi=Math.min(xi,p[0]);}xo=xo*FTX+t+.0007;xi=xi*FTX-t-.0007;
      return[z,[[xo-.0006,soleT],[xo,soleT*.6],[xo,soleT*.2],[xo-.0006,0],[xi+.0006,0],[xi,soleT*.2],[xi,soleT*.6],[xi+.0006,soleT]].map(p=>[p[0]/FTX,p[1]/FTH])];});
    const tp=shoeTips(pointed);return pcFootGeo('so'+key+gk+k5(t),S,[[tp[0][0]-.0012/FTZ,0,soleT*.5/FTH],[tp[1][0]+.0012/FTZ,tp[1][1],soleT*.5/FTH]],FTX,FTZ,FTH,gy);};
  const mSole=PM(pcDark(CS,.45),'leather');
  for(const sd of[-1,1]){const FR=FOOT(sd),Lg=LEG(sd);
    if(SH==='bare')Q(pcFootGeo('ft'+gk,PCF_M,PCF_TIP,FTX,FTZ,FTH,gy),mSK,FR);
    else if(SH==='sandals'){const sT=.0022;Q(pcFootGeo('ftl'+gk,PCF_M,PCF_TIP,FTX,FTZ,FTH,gy+sT),mSK,FR);Q(soleG('sd',.0002,sT,false),mCS,FR);
      /* two straps over the foot (its section at z let out a little), one round the ankle */
      for(const z of[.031,.008]){const zz=z*FTZ,R=footAt(zz);Q(pcTube('strap'+gk+k5(z),4,6,t=>{const p=R[[2,1,0,7,6,5][Math.round(t*5)]];const k=Math.round(t*5);return[p[0]*(1+.06),p[1]+sT+(k===0||k===5?-.0012:.0008),zz];},()=>.0011),mCS,FR);}
      ringOn(LG,'sdank'+gk,LA+.012,.0011,.0012,mCS,Lg);}
    else{const pointed=SH==='pointed',t=.0013,sT=.0034;Q(upper(SH,t,sT,pointed),mCS,FR);Q(soleG(SH,t,sT,pointed),mSole,FR);
      if(SH==='shoes'){const R=footAt(.012*FTZ);Q(pcTube('tng'+gk,4,4,s=>{const p=R[[1,0,7,6][Math.min(3,Math.round(s*3))]];return[p[0]*.8,p[1]+t+.0006,.012*FTZ];},()=>.0016),PM(pcLite(CS,.12),'leather'),FR);
        for(let i=0;i<2;i++){const z=(.006+i*.0068)*FTZ,R2=footAt(z),pa=R2[0],pb=R2[7];Q(pcTube('lc'+i+gk,4,1,s=>[pa[0]+(pb[0]-pa[0])*s,Math.max(pa[1],pb[1])+t+.0009,z+.0012*(s-.5)],()=>.00045),PM(pcLite(CS,.3),'cloth'),FR);}}
      if(SH==='boots'||SH==='tallboots'){/* the shaft over whatever is on the leg (it goes into the boot when tucked; loose trousers fall over ankle boots) */
        const tall=SH==='tallboots',top=tall?-.094:-.134,sO=(l,k)=>(tucked?legOff(l,k):0)+.0021+(tall?.0012*pcSm(top-.02,top,l):0);
        if(tucked){Q(pcLimbTube('boot'+gk+BT+(tall?1:0),LG,top,LA-.002,sO,null,null),mCS,Lg);/* (down into the shoe: no gap at the heel) */
          if(tall){Q(pcLimbTube('btc'+gk+BT,LG,top+.001,top-.011,(l,k)=>sO(top,k)+.0016,null,null),PM(pcLite(CS,.1),'leather',true),Lg);ringOn(LG,'btrt'+gk+BT,top-.011,k=>sO(top,k)+.0016,.0011,PM(pcLite(CS,.1),'leather'),Lg);}
          else ringOn(LG,'btra'+gk+BT,top,k=>sO(top,k),.0012,PM(pcDark(CS,.15),'leather'),Lg);}}}}

  /* ---- the head: the low-poly sculpt of the chosen shape with its neck (pclp.js), the features on its planes; the hair fitted to the same surface ---- */
  const KH=HU/.0345,hg=G(BN.head,0,0,HZG),U=.0345,HCY=(HCM-Y.head)/KH,TOPY=1.098;hg.scale.setScalar(KH);/* (the head is drawn in its own units, scaled down onto the head bone) */
  /* the head and neck are skinned: the head above the jaw and outside the neck, the neck below it, the chest at its base (the same rule as the torso: pcNeckK) */
  const wHead=(x,y,z,lx,ly,lz)=>{const n=pcNeckK(y),d=Math.hypot(lx,(lz-(S3.zN==null?S3.zn:S3.zN))/(S3.rz||1)),h=Math.max(pcSm(HPm.rn*1.08,HPm.rn*1.45,d)*pcSm(-1.62,-1.32,ly),pcSm(-1.45,-.8,ly)),w={chest:1-n};if(n>0){w.neck=n*(1-h);w.head=n*h;}return w;};
  const T3=[0,0,0],hu=(x,y,z,o)=>(o||new THREE.Vector3()).set(x*U,HCY+y*U,z*U);
  const headP=(y,ph,o)=>{S3(y,ph,T3);return o.set(T3[0]*U,HCY+T3[1]*U,T3[2]*U);};
  const hA=new THREE.Vector3(),hB=new THREE.Vector3(),hC=new THREE.Vector3(),hD=new THREE.Vector3();
  const nA=new THREE.Vector3(),nB=new THREE.Vector3(),nC=new THREE.Vector3(),nD=new THREE.Vector3();/* (its own scratch vectors: the hair keeps positions in hA..hD) */
  const headN=(y,ph,o)=>{const e=.04;headP(Math.min(TOPY,y+e),ph,nA);headP(y-e,ph,nB);nA.sub(nB);headP(y,ph+e,nC);headP(y,ph-e,nD);nC.sub(nD);o.copy(nC).cross(nA).normalize();headP(y,ph,nD);nD.y-=HCY;if(o.dot(nD)<0)o.negate();return o;};
  const headAt=(y,ph,off)=>{const p=headP(y,ph,new THREE.Vector3());if(off){const n=headN(y,ph,new THREE.Vector3());p.addScaledVector(n,off);}return p;};
  /* the azimuth at which the face reaches the side distance x at a height y (for features placed by x) */
  const phX=(y,x)=>{let a=0,b=1.5;for(let i=0;i<18;i++){const m=(a+b)/2;S3(y,m,T3);if(T3[0]<x)a=m;else b=m;}return(a+b)/2;};
  parts.push({geo:pcHeadLPGeo(hkey,S3),mat:PM(SK,'skinV'),m:M4().makeTranslation(0,Y.head,HZG).multiply(M4().makeScale(KH,KH,KH)).multiply(M4().makeTranslation(0,HCY,0)).multiply(M4().makeScale(U,U,U)),w:wHead});
  /* hair (first: the ears hide under a bob or long hair, a hat sits on it) */
  const S0=PCHS[HR],hat=AC==='hat'||AC==='cap',hood=AC==='hood',hlF=S0?pcSpline(PCHA,S0.hl):null;
  /* his crop on his sculpted head is one cap of its own (pclp.js): whatever sits on the hair sits on it */
  const CAP=HR==='crop'&&S3.M&&!hood?(S3.cap||(S3.cap=pcCapLP(S3))):null,capV=new THREE.Vector3();
  const fringe=ph=>S0&&S0.fr?gs(pcWrap(ph-.35),.55):S0&&S0.chop?gs(pcWrap(ph),.7)*.9:0,thick=(v,a,y,ph)=>{if(!S0||CAP)return 0;let t=S0.T*(S0.sides?S0.sides+((S0.top||1)-S0.sides)*pcSm(.25,.85,y):1);if(S0.quiff&&!hat)t+=S0.quiff*gs(y-.95,.18)*Math.pow(Math.max(0,Math.cos(a*.8)),1.5);if(S0.flare)t+=S0.flare*pcSm(.55,1,v)*pcSm(.6,1.2,a);
    return S0.hang?t:t+(-.0009-t)*pcSm(.7,1,v)*(1-fringe(ph||0));};
  const YWI=.05,hairPt=(y,ph,t,o)=>{if(CAP&&CAP.at(y,ph,capV)){o.set(capV.x*U,HCY+capV.y*U,capV.z*U);hB.set(capV.x,0,capV.z+.12).normalize();return o.addScaledVector(hB,t);}
    if(S0&&S0.hang&&y<YWI){headP(YWI,ph,hA);headN(YWI,ph,hB);hB.y=0;hB.normalize();headP(y,ph,hC);o.set(hA.x,hC.y,hA.z).addScaledVector(hB,t);return o;}
    headP(y,ph,o);headN(y,ph,hB);return o.addScaledVector(hB,t);};
  const hairV=new THREE.Vector3();
  if(CAP)Q(CAP.geo,PM(HC,'hair',true),hg,0,HCY,0,0,0,0,U);
  else if(S0&&!hood){const hkk=HR+hkey+(hat?'h':'');col('head','head',[0,.019*HSc,-.004*HSc],.0272*HSc);
    const HX=pcHairBuild({hs:hg,HS:S3,Q,G,HR,S0,hlF,thick,fringe,hairPt,headN,headP,HCY,U,TOPY,hat,hood,fr,gs,hkk,HC,SK,skel:SKL,parts,Y,KH,backOut,backR:(y,ph)=>(backOut(Y.head+KH*y,ph)-HZG*Math.cos(ph))/KH+.006,HZG,mLea,F,cols:cols(['head','neck','back','armL','armR'])});
    for(const s of HX.springs)springs.push(s);}
  /* the face: black bead eyes, flat brows, a wedge of a nose, a small mouth, flat ears (pclp.js) */
  const FX=pcFaceLP({hs:hg,Q,G,U,F,P:HPm,S:S3,SK,HC,hu,headAt,headN,phX,earsHidden:(S0&&S0.hang)||hood||!!CAP,hkey}),eyeC=FX.eyeC,earX=FX.earX,er=HPm.er;
  /* ---- the accessory (one) ---- */
  const ringAt=(y,off)=>{let rx=0,rz=0,cz=0;const pts=[];for(let i=0;i<16;i++){const ph=i/16*2*Math.PI,p=S0&&!hood?hairPt(y,ph,thick(.4,fr(ph),y)+off,new THREE.Vector3()):headAt(y,ph,off);pts.push(p);}
    const zF=pts[0].z,zB=pts[8].z;cz=(zF+zB)/2;for(const p of pts){rx=Math.max(rx,Math.abs(p.x));rz=Math.max(rz,Math.abs(p.z-cz));}return{rx,rz,cz,y:pts[0].y};};
  const onHair=(y,ph,off)=>S0&&!hood?hairPt(y,ph,thick(.4,fr(ph),y)+.0016+off,new THREE.Vector3()):headAt(y,ph,off);
  if(AC==='glasses'){const rim=PM(0x2a2420,'metal');for(const sd of[-1,1]){const C=eyeC[sd<0?0:1],p=C.clone().add(new THREE.Vector3(0,0,.065*U)),rr=.165*U;
      Q(pcTube('rim'+k5(rr),4,13,t=>{const a=t*2*Math.PI;return[Math.cos(a)*rr,Math.sin(a)*rr*.86,0];},()=>.022*U),rim,hg,p.x,p.y,p.z);
      const e=p.clone().add(new THREE.Vector3(sd*rr,0,0));Q(pcTube('tmp'+HR+hkey+sd,4,4,t=>{if(t===0)return[e.x,e.y,e.z];const a=sd*(.95+t*.58),q=onHair(S3.eyeY+.1,a,.0008);return[q.x,q.y,q.z];},()=>.02*U),rim,hg);}
    {const L=eyeC[0],R=eyeC[1],zz=L.z+.065*U,rr=.165*U;Q(pcTube('bridge'+hkey,4,4,t=>[L.x+rr+(R.x-L.x-2*rr)*t,L.y+.012*U+.03*U*Math.sin(Math.PI*t),zz+.02*U],()=>.018*U),rim,hg);}}
  else if(AC==='hat'){const R0=ringAt(.66,.0015),y=R0.y,s=R0.rz/R0.rx,r=R0.rx+.002,felt=PM(0x4f3d2c,'felt'),hg2=G(hg,0,y,R0.cz,-.06);
    Q(pcRev('crown'+k5(r),[[r,-.002],[r*1.0,.011],[r*.95,.023],[r*.86,.032],[r*.6,.037],[0,.0385]],28),felt,hg2,0,0,0,0,0,0,1,1,s);
    Q(pcRev('brim'+k5(r),[[r*.9,-.002],[r+.011,-.0024],[r+.019,-.0013],[r+.0215,.0014],[r+.0202,.0032],[r+.016,.0018],[r*.98,.002]],32),felt,hg2,0,0,0,0,0,0,1,1,.94);
    Q(pcRev('hband'+k5(r),[[r+.0012,.002],[r+.0012,.0078],[r*.96,.0088]],28),PM(0x8c2a2a,'cloth'),hg2,0,0,0,0,0,0,1,1,s);}
  else if(AC==='cap'){const R0=ringAt(.72,.0012),r=R0.rx+.0015,s=R0.rz/R0.rx,cg=G(hg,0,R0.y-.002,R0.cz,-.18),fc=PM(0x2f5e2a,'felt');
    Q(pcRev('ccap'+k5(r),[[r,-.003],[r*1.01,.005],[r*.92,.016],[r*.66,.027],[r*.36,.035],[r*.12,.041],[0,.043]],28),fc,cg,0,0,-.005,-.3,0,0,1,1,s*1.06);
    Q(pcTube('cbrim'+k5(r)+k5(s),5,16,t=>{const a=t*2*Math.PI;return[Math.sin(a)*(r+.0012),-.002+.003*Math.max(0,Math.cos(a)),Math.cos(a)*(r+.0012)*s*1.06];},()=>.003),PM(pcDark(0x2f5e2a,.12),'felt'),cg);
    Q(pcTube('feather'+k5(r),4,7,t=>[r*1.02+.003*t,.008+.046*t-.012*t*t,-.004-.027*t],t=>[.0015,.0056*Math.sin(Math.PI*(.06+.9*t))+.0004]),PM(0xc9302c,'cloth'),cg);}
  else if(AC==='hood'){const hc=hasT2||c.top2==='cloak'?C2:pcMix(C1,0x3a3a2a,.4),hm=PM(hc,'cloth',true);
    Q(pcGrid('hoodsh'+hkey,20,11,(u,v,o)=>{const y=TOPY-(TOPY+1.36)*v,open=1.12*Math.sqrt(Math.max(0,1-((y+.34)/.92)**2)),ph=open+u*(2*Math.PI-2*open),p=headAt(Math.max(-1.3,y),ph,.0075+.0045*v+(y<-1.3?.002:0));
      const tipD=new THREE.Vector3(0,.55,-.84),dd=p.clone().setY(p.y-HCY).normalize(),k=Math.pow(Math.max(0,dd.dot(tipD)),5);o[0]=p.x;o[1]=p.y-HCY+tipD.y*.017*k;o[2]=p.z+tipD.z*.017*k;},'point'),hm,hg,0,HCY,0);
    /* the cowl: a band round the base of the neck lying on the shoulders, over whatever is worn there (open in front) */
    Q(pcShell2(B,'cowl'+bk+k5(outOff),ph=>nb(ph)-.017,ph=>nb(ph)+.004,.8,(v,ph)=>outOff+.0024+.0042*(1-v)),hm);}
  else if(AC==='circlet'){const band=PM(gold,'metal'),yc=t=>.5+.14*(1-Math.cos(t))/2;Q(pcGrid('circ'+HR+hkey,24,2,(u,v,o)=>{const ph=u*2*Math.PI,y=yc(ph)+.07*(v-.5),p=S0&&!hood?hairPt(y,ph,thick(.4,fr(ph),y)+.0026,hairV):headAt(y,ph,.0011);o[0]=p.x;o[1]=p.y;o[2]=p.z;},'axis'),band,hg);
    const p=S0?hairPt(.5,0,thick(.4,0,.5)+.0028,new THREE.Vector3()):headAt(.5,0,.0028);const gm=Q(new THREE.OctahedronGeometry(.0046,0),PM(0x7fd0ff,'gem'),hg,p.x,p.y,p.z);gm.scale.set(1,1.3,.6);}
  else if(AC==='earrings'){for(const sd of[-1,1]){const ey=S3.earY-.34,p=S0&&S0.hang?hairPt(ey,sd*Math.PI/2,thick(.7,Math.PI/2,ey)+.0018,new THREE.Vector3()):CAP?hairPt(ey,sd*Math.PI/2,.0016,new THREE.Vector3()):hu(sd*(earX/U+.06),ey,-.1);
      Q(pcTube('hoop',4,9,t=>{const a=t*2*Math.PI;return[0,-Math.cos(a)*.003,Math.sin(a)*.003];},()=>.0006),mGold,hg,p.x+sd*.0006,p.y-.0034,p.z);Q(pcBead(),PM(0x7fd0ff,'gem'),hg,p.x+sd*.0006,p.y-.0084,p.z,0,0,0,.0021);}}
  else if(AC==='eyepatch'){const C=eyeC[1],pa=Q(soft,PM(0x1e1813,'leather'),hg,C.x,C.y+.004*U,C.z+.03*U,0,0,0,.2*U,.16*U,.05*U);
    Q(pcGrid('strap'+HR+hkey,24,2,(u,v,o)=>{const ph=u*2*Math.PI,y=S3.eyeY+.4-.36*gs(pcWrap(ph-.35),.6)+.27*gs(pcWrap(ph+.85),.55)+.05*(v-.5),q=S0&&!hood?hairPt(y,ph,thick(.4,fr(ph),y)+.0024,hairV):headAt(y,ph,.0009);o[0]=q.x;o[1]=q.y;o[2]=q.z;},'axis'),PM(0x1e1813,'leather'),hg);}
  else if(AC==='pendant'){const chain=PM(gold,'metal'),open=!hasT2||c.top2==='jacket'||c.top2==='coat'||c.top2==='openshirt',cO=open?.0016:outOff+.001,oF=ph=>cO+(outOff+.001-cO)*pcSm(.22,.36,fr(ph));
    Q(pcTube('chain'+bk+k5(outOff)+(open?1:0),4,22,t=>{const ph=Math.PI+t*2*Math.PI,f=Math.max(0,Math.cos(ph)),y=nb(ph)+.0005-.032*Math.pow(f,3);return bs(y,ph,oF(ph));},()=>.0007),chain);
    const p=bs(nb(0)-.0335,0,cO+.0018);Q(new THREE.OctahedronGeometry(.0048,0),PM(0x7fd0ff,'gem'),TOR,0,p[1]-.0012,p[2]+.0009,0,0,0,1,1.35,.55);
    Q(pcTube('bail'+k5(p[1]),4,4,t=>{const a=t*2*Math.PI;return[Math.sin(a)*.0018,p[1]+.0042+Math.cos(a)*.0018,p[2]];},()=>.0005),chain);}
  else if(AC==='scarf'){const sc=PM(0x9a2a2a,'cloth');Q(pcTube('scarf'+bk+k5(outOff),5,20,t=>{const ph=t*2*Math.PI,p=bs(.2935,ph,outOff*.35+.0046);return[p[0],p[1]+.001*Math.sin(ph*3),p[2]];},t=>.0047*(1+.12*Math.sin(t*Math.PI*10))),sc);
    for(const[k,x0,y0,len]of[[0,-.011,.288,.05],[1,-.002,.286,.041]])Q(pcTube('stail'+k+bk+k5(outOff),4,4,t=>{const y=y0-len*t,p=bs(Math.max(.2,y),-.25+k*.18,outOff+.0036+k*.0024);return[x0+.0032*t,y,p[2]+.0016*t];},t=>[.0052*(1-.2*t),.0016]),k?PM(pcDark(0x9a2a2a,.1),'cloth'):sc);}

  /* ---- the archer's kit: the bow in the left hand, an arrow in the right (both on the hand bones, across the grip), the quiver on the back (outside the outermost layer and the hair) ---- */
  const kit={};
  if(!nokit){const gx=.0047*hk,gy2=-.0225*hk;
    const bw=G(BN.handL,gx,gy2,0,Math.PI/2,0,0);kit.bow=bw;
    Q(pcTube('bow',4,11,t=>{const y=(t-.5)*.192;return[0,y,-.004-.03*Math.pow(y/.096,2)];},t=>.0026+.0028*Math.pow(1-Math.abs(2*t-1),.7)),PM(wood,'leather'),bw);
    Q(pcCapG(.0062,.0062,.024,12),PM(leather,'leather'),bw,0,.012,-.004);Q(pcTube('bstr',4,1,t=>[0,(t-.5)*.188,-.033],()=>.0007),PM(white,'cloth'),bw);
    const ag=G(BN.handR,-gx,gy2,0,Math.PI/2+.25,0,0);kit.arrow=ag;
    Q(pcCapG(.0019,.0019,.1,8),PM(wood,'leather'),ag,0,.05,0);Q(pcRev('ahead',[[.0001,.05],[.0038,.057],[.0001,.068]],10),PM(steel,'metal'),ag);
    for(const s of[0,1])Q(soft,PM(s?white:0xc9302c,'cloth'),ag,0,-.042,0,0,s*Math.PI/2,0,.005,.0085,.0006);
    const qa=Math.PI-.55,qy=.252,hb=HR==='long'?backOut(qy,qa)+.009:backOut(qy,qa),qr=hb+.015,q=G(onBone('chest'),qr*Math.sin(qa),qy,qr*Math.cos(qa),.28,0,-.22);q.scale.setScalar(.64);kit.quiver=q;
    Q(pcRev('quiv',[[.0001,-.058],[.017,-.06],[.021,-.05],[.022,.03],[.0225,.058],[.019,.058]],18),PM(dleather,'leather',true),q);Q(pcTube('qrim',5,11,t=>{const a=t*2*Math.PI;return[Math.sin(a)*.0228,.056,Math.cos(a)*.0228];},()=>.0026),mGold,q);
    Q(pcTube('qband',5,11,t=>{const a=t*2*Math.PI;return[Math.sin(a)*.0222,-.04,Math.cos(a)*.0222];},()=>.0022),mGold,q);
    for(let k=0;k<4;k++){Q(pcCapG(.0019,.0019,.05,6),PM(wood,'leather'),q,-.01+k*.0068,.095,(k%2)*.004-.002);Q(soft,PM(k%2?white:0xc9302c,'cloth'),q,-.01+k*.0068,.093,(k%2)*.004-.002,0,0,0,.0045,.0095,.0007);}
    /* the bow slung across the back (when it is put away): from the left shoulder down to the right hip */
    {const by=.229,br=backOut(by,Math.PI)+(HR==='long'?.016:.012),bb=G(onBone('chest'),0,by,-br,0,0,.7);/* (the upper tip over the shoulder, below the jaw: never beside the face) */kit.bowBack=bb;bb.visible=false;
      Q(pcTube('bow',4,11,t=>{const y=(t-.5)*.192;return[0,y,-.004-.03*Math.pow(y/.096,2)];},t=>.0026+.0028*Math.pow(1-Math.abs(2*t-1),.7)),PM(wood,'leather'),bb,0,0,0,0,Math.PI,0);
      Q(pcTube('bstr',4,1,t=>[0,(t-.5)*.188,-.033],()=>.0007),PM(white,'cloth'),bb,0,0,0,0,Math.PI,0);}
    /* the sword: in the right hand when drawn, in its scabbard at the left hip when not */
    const mBl=PM(0xd4dbe2,'blade'),mGrip=PM(dleather,'leather'),sword=par=>{Q(pcTube('blade',4,4,t=>[0,.011+.095*t,0],t=>[.0034*(1-Math.pow(t,3))+.0002,.0009*(1-t)+.0002]),mBl,par);
      Q(boxy,mGold,par,0,.0105,0,0,0,0,.0115,.0017,.0028);Q(pcCapG(.0024,.0022,.018,8),mGrip,par,0,.0095,0);Q(ball,mGold,par,0,-.0112,0,0,0,0,.0034);};
    const sg=G(BN.handR,-gx,gy2,0,Math.PI/2-.75,0,0);sg.userData.bx=Math.PI/2-.75;sword(sg);kit.sword=sg;sg.visible=false;
    const hip=onBone('root'),sc=G(hip,-.046,.197,-.004,.42,0,.16);kit.scab=sc;sc.visible=false;
    Q(pcTube('scab',4,4,t=>[0,-.004-.108*t,0],t=>[.0046*(1-.3*t),.0026*(1-.2*t)]),PM(pcDark(dleather,.1),'leather'),sc);Q(pcTube('scabm',4,4,t=>{const a=t*2*Math.PI;return[Math.sin(a)*.0048,-.004,Math.cos(a)*.0028];},()=>.0009),mGold,sc);
    const sh=G(sc,0,-.0035,0,Math.PI,0,0);sword(sh);kit.swordHip=sh;sh.visible=false;}

  /* ---- skin it, pose it ---- */
  const RY=pcRemapY(F);if(RY)pcRemapSkel(SKL,RY);/* (his proportions: the lift of pc2.js) */
  const SKN=pcSkinBuild(parts,SKL,g,RY);
  const pose=(n,x,y,z)=>BN[n].rotation.set(x,y,z);
  if(nokit){pose('upperL',.04,0,-.13);pose('upperR',.04,0,.13);pose('foreL',-.2,0,0);pose('foreR',-.2,0,0);}
  else{pose('upperL',-1.05,0,-.2);pose('foreL',-.25,0,0);pose('upperR',-.35,0,.1);pose('foreR',-.9,0,0);}
  hg.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry.boundingSphere==null)o.geometry.computeBoundingSphere();if(o.isMesh&&o.geometry.boundingSphere.radius*Math.max(o.scale.x,o.scale.y,o.scale.z)<.0045)o.castShadow=false;});
  pcMerge(g);
  K.ARMS.R={sh:BN.upperR,el:BN.foreR,hd:BN.handR};K.ARMS.L={sh:BN.upperL,el:BN.foreL,hd:BN.handL};K.LEGS.L=BN.thighL;K.LEGS.R=BN.thighR;
  /* (hem: what the legs stride in - a long skirt 2, a skirt, a tunic or a long coat 1: the gait shortens its knee drive and its stride for it, pcanim.js) */
  g.userData.pcRig={B:BN,skel:SKL,skin:SKN,springs,inertia:.3,F,hands,kit,cols:COL,L:LL,weapon:pcWeapon,hem:BT==='longskirt'?2:BT==='skirt'||c.top2==='coat'||c.top1==='tunic'?1:0};
  if(F)g.scale.setScalar(.97);
  return{c};}

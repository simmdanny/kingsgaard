/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (4): hair, low-poly.

   A hairstyle is a few sculpted masses: a low-poly base mass close to the head out to the hairline (thick where the style has volume, hanging straight below the widest part of the head for a bob or long hair)
   and the clumps laid over it - angular ridges (a triangular section that narrows to a point) that follow the flow of the style and shape its silhouette: a fringe swept over the brow, clumps down the crown and
   the sides, over the back, round to a tie. Each style lists its clumps (pcHairSpec); each clump has its own shade, so the masses read. Flat shaded, like the rest of the figure.
   Only what hangs loose moves (the ends of a bob, long hair, a tail, a braid): skinned to a few chains of spring bones on the head (pcSpring), restrained and quick to settle; short styles are rigid.
   Head units as in pcm.js (the head's own group, U = .0345, scaled onto the head bone).
   ===================================================================================================================== */
/* the clumps of a style: {y0, ph0 (the root), dy, dph (the direction: per unit of length, dph at unit radius), len, w (half width), h (ridge height), lift (the tip off the mass), arch, k0 (the root's depth in the mass), tint};
   tie: the point (y, pi) a tied style is gathered to */
function pcHairSpec(HR,hl,rnd,hat){const L=[],add=o=>L.push(Object.assign({dph:0,lift:.0004,arch:.0005,k0:.7,w:.2,h:.06,tint:.94+.1*rnd()},o));
  const R0=y=>y>.15?Math.sqrt(Math.max(.05,1-((y-.15)/.96)**2)):1,TOPY=1.098;
  const toTie=(y,ph,yT,o)=>{if(Math.abs(ph)<.6){add(Object.assign({y0:y,ph0:ph,dy:1,dph:0,len:(TOPY-y)+(TOPY-yT)-.08,lift:0,arch:.0011},o));return;}
    const dph=pcWrap(Math.PI-ph),dy=yT-y,R=R0(y),l=Math.hypot(dy,dph*R);if(l<.2)return;add(Object.assign({y0:y,ph0:ph,dy:dy/l,dph:dph*R/l,len:l*.92,lift:0,arch:.0009},o));};
  const ring=(y,phs,o)=>{for(const ph of phs)if(!(hat&&y>.55))add(Object.assign({y0:y,ph0:ph},typeof o==='function'?o(ph):o));};
  if(HR==='crop'){/* short, swept a little to his right: a fringe over the brow, clumps down the crown, the sides and the back */
    ring(1.0,[-.5,-.05,.42],ph=>({dy:-1,dph:.38,len:.4,w:.3,h:.085,lift:.0012,arch:.0008,k0:.8}));
    ring(1.08,[1.0,1.9,2.8,-2.3,-1.4],{dy:-1,len:.5,w:.3,h:.075,k0:.8});
    ring(.66,[1.32,-1.32],ph=>({dy:-1,dph:-Math.sign(ph)*.25,len:.42,w:.26,h:.06,k0:.8}));
    ring(.66,[2.15,2.75,-2.75,-2.15],{dy:-1,len:1.15,w:.3,h:.065,lift:.0005,k0:.8});}
  else if(HR==='messy'){ring(.97,[-.7,-.3,.1,.5],ph=>({dy:-1,dph:(rnd()-.5)*.9,len:.45,w:.2,h:.085,lift:.0028,arch:.0008}));ring(1.06,[.2,-.5,.9],{dy:.5,dph:.3,len:.28,w:.18,h:.09,lift:.003});
    ring(1.05,[1.3,2.1,2.8,-2.5,-1.7],ph=>({dy:-1,dph:(rnd()-.5)*.6,len:.5,w:.22,h:.08,lift:.0022}));ring(.6,[1.3,1.8,2.4,2.9,-2.9,-2.4,-1.8,-1.3],ph=>({dy:-1,dph:(rnd()-.5)*.5,len:.6,w:.2,h:.065,lift:.0016}));}
  else if(HR==='swept'){ring(.74,[-.75,-.37,0,.37,.75],{dy:1,len:.62,w:.21,h:.09,arch:.0018,lift:.0006});ring(.62,[1.2,1.65,-1.2,-1.65],ph=>({dy:.3,dph:Math.sign(ph)*1,len:.42,w:.19,h:.06}));
    ring(.98,[2.2,2.8,-2.8,-2.2],{dy:-1,len:1.3,w:.23,h:.065});}
  else if(HR==='spiky'){ring(1.0,[-.6,-.2,.2,.6,1.2,-1.2,2,-2,2.7,-2.7],ph=>({dy:-.25,dph:(rnd()-.5)*.3,len:.3,w:.16,h:.1,lift:.0045,arch:.0006}));ring(.6,[1.3,1.9,2.5,-2.5,-1.9,-1.3,Math.PI],{dy:-1,len:.55,w:.2,h:.055});}
  else if(HR==='pixie'){/* short, a long fringe swept across the brow to her right, a tapered nape */
    ring(.92,[-.78,-.5,-.22],ph=>({dy:-.55,dph:1,len:.62,w:.2,h:.065,lift:.0012,arch:.0008}));ring(1.06,[.6,1.4,2.2,3.0,-2.4,-1.6,-.6],{dy:-1,len:.52,w:.23,h:.07});
    ring(.62,[1.3,1.8,-1.3,-1.8],ph=>({dy:-1,dph:-Math.sign(ph)*.2,len:.5,w:.19,h:.055}));ring(.6,[2.4,2.9,-2.9,-2.4],{dy:-1,len:1.15,w:.2,h:.055});}
  else if(HR==='ponytail'||HR==='braid'||HR==='bun'){const yT=HR==='bun'?.8:HR==='braid'?-.2:-.06;
    for(const ph of[-.56,-.19,.19,.56])toTie(hl(ph)+.015,ph,yT,{w:.27,h:.042,k0:.35});for(const ph of[.98,1.38,-.98,-1.38])toTie(hl(ph)+.015,ph,yT,{w:.24,h:.04,k0:.35});for(const ph of[2.2,-2.2])toTie(.95,ph,yT,{w:.22,h:.04});
    if(HR!=='bun'&&!hat)add({y0:.92,ph0:-.42,dy:-.6,dph:1,len:.5,w:.17,h:.05,lift:.0012,arch:.0006});}
  else if(HR==='medium'||HR==='long'){/* the masses hang from the crown: a fringe to the brows, the sides and back down to the ends */
    const fy=HR==='long'?.29:.31;ring(1.0,[-.6,-.2,.2,.6],ph=>({dy:-1,dph:ph*.1,len:1.0-fy-.03*Math.abs(ph),w:.2,h:.06,lift:.0006}));
    for(const ph of[1.0,1.45,1.9,2.4,2.85,-2.85,-2.4,-1.9,-1.45,-1.0])add({y0:1.0,ph0:ph,dy:-1,len:1.0-hl(ph)+.02,w:.22,h:.06,lift:.0004,arch:.0008});}
  return L;}
/* X: what pcAssemble lends (hs, Q, G, HR, S0, hlF, thick, fringe, hairPt, headN, headP, HCY, U, TOPY, hat, hood, fr, gs, hkk, HC, SK, skel, parts, Y, KH, backOut, backR, mLea, F, cols) -> {springs} */
function pcHairBuild(X){const{hs,Q,HR,S0,hlF,thick,hairPt,headN,HCY,U,TOPY,hat,fr,hkk}=X,out={springs:[]};if(!S0)return out;
  const YWI=.05,hang=!!S0.hang,mat=PM(HR==='buzz'?pcMix(X.HC,X.SK,.35):X.HC,'hair',true),hl=a=>hlF(Math.abs(a));
  const hairN=(y,ph,o)=>{if(hang&&y<YWI){headN(YWI,ph,o);o.y=0;return o.normalize();}return headN(y,ph,o);};
  const vOf=(y,a)=>Math.max(0,Math.min(1,(TOPY-y)/Math.max(.05,TOPY-hlF(a)))),capT=(y,ph)=>{const a=fr(ph);return thick(vOf(y,a),a,y,ph);};
  let seed=0;for(const ch of HR)seed=(seed*31+ch.charCodeAt(0))%2147483647;seed=seed||7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const Mhs=new THREE.Matrix4().makeTranslation(0,X.Y.head,X.HZG||0).multiply(new THREE.Matrix4().makeScale(X.KH,X.KH,X.KH));let wHair=null;
  const put=(geo,y0)=>{if(wHair)X.parts.push({geo,mat,m:Mhs.clone().multiply(new THREE.Matrix4().makeTranslation(0,y0||0,0)),w:wHair});else Q(geo,mat,hs,0,y0||0,0);};
  const toFig=p=>{const q=p.clone().applyMatrix4(Mhs);return[q.x,q.y,q.z];};
  const chainsAt=(name,list,sp)=>list.map((c,i)=>{const bones=pcChain(X.skel,name+i+'_','head',c.pts.map(toFig));out.springs.push(pcSpring(bones,Object.assign({col:X.cols},sp)));
    return{a:c.a,names:bones.map(b=>b.name),ys:c.pts.slice(0,-1).map(p=>toFig(p)[1]),band:.004};});
  const headW=()=>({head:1});
  /* ---- what hangs loose: the ends of a bob or of long hair on a few chains (only below the widest part of the head) ---- */
  if(hang&&!X.hood){const az=HR==='long'?[1.2,2.0,Math.PI,-2.0,-1.2]:[1.1,1.9,Math.PI,-1.9,-1.1],L=[];
    for(const a of az){const yb=hl(a),pts=[],n=HR==='long'?3:2;for(let k=0;k<=n;k++){const y=YWI-(YWI-yb)*(k/n);pts.push(hairPt(y,a,capT(y,a)*.5,new THREE.Vector3()));}L.push({a,pts});}
    if(HR==='long')for(const c of L)if(Math.abs(pcWrap(c.a-Math.PI))<1){const last=c.pts[c.pts.length-1],yE=-.112,y0=last.y;for(let k=1;k<=2;k++){const y=y0+(yE-y0)*k/2,r=X.backR(y,c.a);c.pts.push(new THREE.Vector3(r*Math.sin(c.a),y,r*Math.cos(c.a)));}}
    wHair=pcWChains(chainsAt('hr',L,HR==='long'?{stiff:.14,drag:.26,grav:.025,max:.8}:{stiff:.26,drag:.3,grav:.018,max:.5}),headW,true);}
  /* ---- the base mass: on the rows and columns of the head itself (an offset of its planes, so no plane of the head comes through it), clipped at the hairline; a bob or long hair hangs on straight below the widest part ---- */
  {const GR=pcHeadGrid(X.HS),cols=GR.cols,W=cols.length,noms=GR.noms,pos=[],col=[],idx=[],V=new THREE.Vector3(),nn=new THREE.Vector3();
    const rowsY=noms.filter(y=>y>(hang?YWI:-1.2));if(hang)rowsY.push(YWI);const nr=rowsY.length,nh=hang?4:0;
    for(let r=0;r<nr+nh;r++)for(let i=0;i<W;i++){const ph=cols[i],a=fr(ph),yl=hlF(a)-(S0.fr||0)*X.fringe(ph),y=r<nr?Math.max(rowsY[r],yl):yl<YWI?YWI-(YWI-yl)*(r-nr+1)/nh:yl,t=thick(vOf(y,a),a,y,ph);
      if(r>=nr&&yl<YWI){hairPt(y,ph,t,V);V.y-=HCY;}
      else{let j=0;while(j<noms.length-2&&noms[j+1]>y)j++;const k=Math.min(1,Math.max(0,(noms[j]-y)/(noms[j]-noms[j+1]))),P0=GR.P[j][i],P1=GR.P[j+1][i],N0=GR.N[j][i],N1=GR.N[j+1][i];
        nn.set(N0[0]+(N1[0]-N0[0])*k,N0[1]+(N1[1]-N0[1])*k,N0[2]+(N1[2]-N0[2])*k).normalize();V.set((P0[0]+(P1[0]-P0[0])*k)*U,(P0[1]+(P1[1]-P0[1])*k)*U,(P0[2]+(P1[2]-P0[2])*k)*U).addScaledVector(nn,t);}
      pos.push(V.x,V.y,V.z);const c=.82+.06*vOf(y,a);col.push(c,c,c);}
    const mid=(W-1)/2,A=new THREE.Vector3(),B=new THREE.Vector3(),D=new THREE.Vector3(),tri=(a,b,c)=>{A.fromArray(pos,a*3);B.fromArray(pos,b*3).sub(A);D.fromArray(pos,c*3).sub(A);if(B.cross(D).lengthSq()>1e-14)idx.push(a,b,c);};
    for(let j=0;j<nr+nh-1;j++)for(let i=0;i<W-1;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;if(i>=mid){tri(a,c,d);tri(a,d,b);}else{tri(a,c,b);tri(b,c,d);}}
    put(gget('phm'+hkk,()=>pcFix(pcFlatGeo(pos,idx,col),'point')),HCY);}
  if(HR==='buzz')return out;
  /* ---- the clumps ---- */
  const R0=y=>y>.15?Math.sqrt(Math.max(.05,1-((y-.15)/.96)**2)):1;
  pcHairSpec(HR,hl,rnd,hat).forEach((L,li)=>{const n=5,P=[],N=[];let y=L.y0,ph=L.ph0;const pth=[];
    for(let j=0;j<=n;j++){pth.push([y,ph]);const d=L.len/n,yr=y>TOPY?2*TOPY-y:y;y+=L.dy*d;ph+=L.dph*d/Math.max(.3,R0(yr));}
    pth.forEach(([yv,pv],j)=>{const s=j/n;let yy=yv,pp=pv;if(yy>TOPY){yy=2*TOPY-yy;pp+=Math.PI;}const t=capT(yy,pp)*L.k0+L.lift*Math.pow(s,1.3)+L.arch*Math.sin(Math.PI*s);
      P.push(hairPt(yy,pp,t,new THREE.Vector3()));N.push(hairN(yy,pp,new THREE.Vector3()));});
    put(pcRidgeG(hkk+'c'+li,P,N,s=>L.w*U*Math.pow(1-s,.75)*Math.min(1,.55+s*3),s=>L.h*U*Math.pow(1-s,.6)*Math.min(1,.6+s*3),L.tint,true));});
  /* ---- a tail, a braid, a bun ---- */
  if(HR==='ponytail'||HR==='braid'||HR==='bun'){const yT=HR==='bun'?(hat?-99:.8):HR==='braid'?-.2:-.06;
    if(yT>-2){const tp=hairPt(yT,Math.PI,capT(yT,Math.PI)+.0006,new THREE.Vector3()),tn=hairN(yT,Math.PI,new THREE.Vector3());
      Q(pcTube('tie'+hkk,5,8,t=>{const a=t*2*Math.PI,r=HR==='bun'?.0105:.0064,u=new THREE.Vector3(1,0,0),w=tn.clone().cross(u).normalize();return[tp.x+u.x*Math.cos(a)*r+w.x*Math.sin(a)*r,tp.y+u.y*Math.cos(a)*r+w.y*Math.sin(a)*r,tp.z+u.z*Math.cos(a)*r+w.z*Math.sin(a)*r];},()=>.0019),PM(0x4a2e19,'leather'),hs);
      if(HR==='bun'){const bc=tp.clone().addScaledVector(tn,.0105);for(let k=0;k<5;k++){const a0=k/5*2*Math.PI,P=[],N=[];for(let j=0;j<=4;j++){const a=a0+j*.9,yy=-.008+.016*j/4;const c=new THREE.Vector3(bc.x+Math.sin(a)*.012,bc.y+yy,bc.z+Math.cos(a)*.0115);P.push(c);N.push(c.clone().sub(bc).normalize());}
          put(pcRidgeG('bun'+hkk+k,P,N,s=>.0072*(1-.5*s),s=>.0042*(1-.4*s),.9+.1*rnd(),false));}
        put(gget('pbc'+hkk,()=>{const g=pcSEG(.7,.7).clone();g.scale(.0135,.012,.0128);g.translate(bc.x,bc.y,bc.z);return g;}));}
      else{const pts=[],zz=y=>-((X.backOut(X.Y.head+X.KH*y,Math.PI)+(X.HZG||0))/X.KH+.011),len=.12*(HR==='braid'?1.05:.85);
        for(let j=0;j<=12;j++){const t=j/12,y=tp.y-len*t;pts.push(new THREE.Vector3(0,y,Math.min(tp.z-.006*t,zz(y)-(HR==='ponytail'?.003:0))));}
        const at=t=>{const f=t*12,i=Math.min(11,Math.floor(f)),k=f-i;return pts[i].clone().lerp(pts[i+1],k);};
        const cps=[0,.33,.66,1].map(t=>at(t)),ch=chainsAt(HR==='braid'?'br':'pt',[{a:Math.PI,pts:cps}],HR==='braid'?{stiff:.12,drag:.24,grav:.035,max:.9}:{stiff:.1,drag:.22,grav:.035,max:1.0});
        wHair=pcWChains(ch,headW);
        if(HR==='ponytail'){const rad=t=>.0085*Math.sin(Math.PI*(.2+.78*t))+.0012*(1-t)+.0006;
          for(let k=0;k<4;k++){const a0=k/4*2*Math.PI+.4,P=[],N=[];for(let j=0;j<=5;j++){const t=j/5,c=at(t),d=new THREE.Vector3(Math.cos(a0+t*.6),0,Math.sin(a0+t*.6)*.8-.2).normalize();P.push(c.clone().addScaledVector(d,rad(t)*.45));N.push(d);}
            put(pcRidgeG('pt'+hkk+k,P,N,s=>rad(s)*.95*Math.min(1,.5+s*5),s=>rad(s)*.7,.9+.12*rnd(),false));}}
        else for(let k=0;k<6;k++){const t0=.03+k*.155,sd=k%2?1:-1,P=[],N=[];for(let j=0;j<=3;j++){const t=t0+.17*j/3,c=at(t);c.x+=sd*(.0042-.0084*j/3)*(1-k*.07);P.push(c);N.push(new THREE.Vector3(sd*.4,0,-1).normalize());}
          put(pcRidgeG('br'+hkk+k,P,N,s=>(.0068-k*.0004)*(1-.35*s),s=>(.0052-k*.0003)*(1-.3*s),.9+.1*rnd(),false));}}}}
  /* ---- long hair down the back: wide masses over the outermost layer of the back ---- */
  if(HR==='long'&&!X.hood){const span=.75,y0=HCY-.45*U,y1=-.112,hA=new THREE.Vector3();
    for(let k=0;k<7;k++){const ph0=Math.PI+(k/6-.5)*2*span,P=[],N=[];for(let j=0;j<=4;j++){const s=j/4,y=y0+(y1-y0)*s,ph=ph0;X.headP(-.45,ph,hA);const rb=X.backR(y,ph),rh=Math.hypot(hA.x,hA.z)*.96,kk=pcSm(0,.35,s),r=rh+(Math.max(rh*1.04,rb)-rh)*kk+.0014;
        P.push(new THREE.Vector3(r*Math.sin(ph),y,r*Math.cos(ph)));N.push(new THREE.Vector3(Math.sin(ph),0,Math.cos(ph)));}
      put(pcRidgeG('lb'+hkk+k,P,N,s=>.0118*(s<.75?1:1-(s-.75)*2.6),s=>.0035*(1-.5*s),.9+.1*rnd(),false));}}
  return out;}

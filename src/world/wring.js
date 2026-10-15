/* =====================================================================================================
   THE STONE RINGS OF THE ELDERGLADE (src/world/wring.js): each ring its own - whole or broken, upright or leaning, bare or taken back by the land.
   wfeat.js keeps where a ring stands (wfSite: its place, size and facing, and the cells wsite.js and wstream.js close round it, are unchanged);
   this file only draws it: wfMesh hands a ring to wrMesh.
   - Whole rings (about a third), broken rings (about two in five: the top has broken off) and ruins (about a quarter: only two stumps stand, a fifth
     to four fifths of its height, among three to five fallen pieces and big broken blocks). Broken: What stands is the lower part, about a half ring, and its two horns end at
     different heights, each in a rough slanted break (pulled out unevenly along the ring, closed by a rough cap). One to three of the pieces that
     fell lie half sunk beside it, with rubble round its feet.
   - Overgrowth, from a little moss to wholly taken back: moss on the stone (aA.w, which the ground material reads as a ring's moss: it takes what
     faces up first and creeps down the sides in patches, more near the ground and the water), earth heaped where the stone goes into the ground
     (the land's own grass and colours on it), bushes and small trees on the top and on the breaks, bushes and tall grass round the feet, reeds where
     a foot stands in shallow water, vines hanging from the underside.
   - Size and shape: the thickness varies (three quarters to one and a quarter of wfSite's); some rings are sunk deep, so only an arch shows; some
     lean; some have a small ring beside them, leaning away or nearly fallen, half buried.
   - The stone takes the light of the cliffs' blocks (aB.w = 1 marks it for the material, as in wrock.js): darker underneath, on the inside, near the
     ground and in the hollows (aB.y), with a tint of its own that wanders along the ring (aB.z).
   - The Great Elder Circle of each elderglade (wfeat.js wfGreat, kind 'great'): always whole, upright, thick and heavily overgrown, with more bushes and
     small trees on it, grass and flowers along its top and creepers winding along its curve; its stone uses the landmark material (f.mat) that shows
     through the haze. Its own hashes (salts 400-451).
   - wrFeet: where a ring's stone meets the ground (its contacts, as laid out here), for the grid (wstream.js closes the cells there).
   Cosmetic only: nothing here touches the world's generation, the props or the saves. Every choice comes from the ring's own hashes
   (salts 330-351 on its cell) or streams seeded by them; the ground comes from wgHeightRaw. Two levels of detail, as before (the far one from 7 R).
   ===================================================================================================== */
const WR={vmat:null,ico:[],job:null,budget:3,stats:{n:0,ms:0,max:0}};
function wrVMat(){return WR.vmat||(WR.vmat=typeof VCMAT!=='undefined'?VCMAT:new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:4}));}
/* the overgrowth of a Great Elder Circle (its trees, bushes, vines, creepers, grass and flowers) shows through the haze as its stone does: the same look
   as wrVMat with WD_SEE (wdepth.js), sharing the stone's own uSee (f.mat.userData.see: the height of its foot, its size), so both fade alike. One a circle. */
function wrVMatSee(f){if(f.vmat)return f.vmat;const m=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:4}),u=f.mat.userData.see;m.defines={WD_SEE:1};
  m.onBeforeCompile=sh=>{sh.uniforms.uSee={value:u};sh.uniforms.uZen={value:WD.zen};sh.fragmentShader='uniform vec2 uSee;\nuniform vec3 uZen;\n'+sh.fragmentShader;};m.customProgramCacheKey=()=>'wrvcsee2';return f.vmat=m;}
const _wrC=new THREE.Color();

/* ---------- a ring's character (its cell's own hashes) ---------- */
function wrVar(f){if(f.wr)return f.wr;const s=WG.seed,H=k=>wnHash(f.a,f.b,s+330+k),R=f.R,v={};
  if(f.kind==='great'){/* the Great Elder Circle: whole, upright (a hair off), thick, heavily overgrown */const Hg=k=>wnHash(f.a,f.b,s+400+k);
    v.ov=.8+.17*Hg(1);v.brk=false;v.sink=f.sink;v.lean=(Hg(8)-.5)*.05;v.thK=.92+.2*Hg(11);v.th=f.th*v.thK;v.tint=Hg(12);v.comp=false;v.great=true;v.seed=wnHashI(f.a,f.b,s+451);return f.wr=v;}
  const q=H(0);v.ov=q<.28?.08+.22*H(1):q<.66?.36+.3*H(1):.72+.28*H(1);/* how far the land has taken it back */
  /* a third stand whole, two in five are broken (the top gone), a quarter are ruined to their stumps */
  const qb=H(2);v.brk=qb<.68;v.ruin=qb<.26;
  v.sink=!v.brk&&H(6)<.24?R*(.56+.3*H(7)):f.sink;/* (sunk deep: only an arch shows) */
  v.lean=f.tilt+(H(8)<.36?(H(9)<.5?-1:1)*(.07+.16*H(10)):0);
  v.thK=.76+.5*H(11);v.th=f.th*v.thK;v.tint=H(12);
  /* the breaks: angles above the horizontal, one horn lower than the other (never below where it comes out of level ground) */
  if(v.brk){let hi=.16+.6*H(3),lo=Math.max(-.3,hi-.3-.45*H(4));
    if(v.ruin){/* ruined: two stumps a fifth to four fifths of its height, the lower one sometimes nearly gone */hi=-.95+.75*H(3);lo=Math.max(-1.35,hi-.2-.5*H(4));}
    if(H(5)<.5){v.eR=hi;v.eL=lo;}else{v.eR=lo;v.eL=hi;}v.bs=H(15);}
  v.comp=R>58&&H(13)<.4;v.seed=wnHashI(f.a,f.b,s+351);return f.wr=v;}

/* the ground at a point: its height, its water and the land's attributes there (kept while a ring is laid out) */
function wrG(L,x,z){const k=Math.round(x)*131071+Math.round(z);let g=L.G.get(k);if(g)return g;const h=wgHeightRaw(x,z),o=_wgO;
  g={h,wl:_wgHo.wl,A:[o.w1||0,o.w2||0,o.w3||0,o.F||0]};L.G.set(k,g);return g;}
/* a ring's frame: centre C, the circle in U (across, level) and V (up, leaning by lean), W its face */
function wrUp(cx,cy,cz,yaw,lean){const ca=Math.cos(yaw),sa=Math.sin(yaw),ct=Math.cos(lean),st=Math.sin(lean);return {C:[cx,cy,cz],U:[ca,0,sa],V:[-sa*st,ct,ca*st],W:[-sa*ct,-st,ca*ct]};}
function wrAt(F,R,a,o){const c=Math.cos(a)*R,s=Math.sin(a)*R;o[0]=F.C[0]+c*F.U[0]+s*F.V[0];o[1]=F.C[1]+c*F.U[1]+s*F.V[1];o[2]=F.C[2]+c*F.U[2]+s*F.V[2];return o;}
/* where the centre line comes out of the ground, going up from the lowest point (-pi/2) towards aEnd; null if it never goes in or never comes out */
function wrContact(L,F,R,aEnd){const p=[0,0,0],a0=-Math.PI/2,up=a=>{wrAt(F,R,a,p);return p[1]-wrG(L,p[0],p[2]).h;};
  if(up(a0)>0)return null;let prev=a0;
  for(let k=1;k<=16;k++){const a=a0+(aEnd-a0)*k/16;if(up(a)>0){let lo=prev,hi=a;for(let q=0;q<4;q++){const m=(lo+hi)/2;if(up(m)>0)hi=m;else lo=m;}
      wrAt(F,R,hi,p);const g=wrG(L,p[0],p[2]);return {a:hi,x:p[0],z:p[2],h:g.h,wl:g.wl,wet:g.wl>g.h+.25};}prev=a;}
  return null;}
/* a point on a tube's surface at angle a, on its most upward side (k > 0) or its most downward (k < 0); o[3..5]: that side's direction */
function wrSurf(F,R,a,thF,k,o){const c=Math.cos(a),s=Math.sin(a),rx=c*F.U[0]+s*F.V[0],ry=c*F.U[1]+s*F.V[1],rz=c*F.U[2]+s*F.V[2],ph=Math.atan2(F.W[1],ry)+(k<0?Math.PI:0),
    cp=Math.cos(ph),sp=Math.sin(ph),dx=rx*cp+F.W[0]*sp,dy=ry*cp+F.W[1]*sp,dz=rz*cp+F.W[2]*sp,t=thF(a)*.86;
  wrAt(F,R,a,o);o[0]+=dx*t;o[1]+=dy*t;o[2]+=dz*t;o[3]=dx;o[4]=dy;o[5]=dz;return o;}
const wrTint=(ti,X,Y,Z,R)=>Math.min(1,Math.max(0,ti+.32*wnN(WG.N[13],X/(R*.3+6)+Y*.011,Z/(R*.3+6)-Y*.013)));

/* ---------- the stone: a tube along a circle ----------
   Frame F, radius R, from angle a0 to a1 (a0 < a1; o.closed: the whole circle); thickness o.thF(a); rough as the rings always were (ridged noise
   in 3D, scales o.ns1 / o.ns2). An open end is a break: its edge pulled along the ring by uneven amounts and slanted, closed by a rough cap.
   Per vertex: moss o.mo(x,y,z,height over the ground,thickness), the light (underneath, inside, near the ground o.gh(x,z), in the hollows), a tint. */
function wrTube(S,F,R,a0,a1,o){const N=WG.N,lod=o.lod,closed=!!o.closed,nA=o.nA,nS=o.nS,cols=closed?nA:nA+1,b0=S.pos.length/3,rg=wnRng(o.seed),U=F.U,V=F.V,W=F.W,C=F.C,sd=o.seed%9973;
  const K0=[rg()-.5,rg()-.5],K1=[rg()-.5,rg()-.5],jag=[];for(let j=0;j<nS;j++)jag.push(rg());
  const step=R*(a1-a0)/nA,n1=o.ns1,n2=o.ns2;
  for(let i=0;i<cols;i++){let t=i/nA;if(closed||(i>0&&i<nA))t+=(wnHash(i,sd,7771)-.5)*.5/nA;/* (its sections a little uneven: cut stone, not a grid) */
    const ang=a0+(a1-a0)*t,c=Math.cos(ang),s=Math.sin(ang),rx=c*U[0]+s*V[0],ry=c*U[1]+s*V[1],rz=c*U[2]+s*V[2],tx=-s*U[0]+c*V[0],ty=-s*U[1]+c*V[1],tz=-s*U[2]+c*V[2];
    const cx=C[0]+R*rx,cy=C[1]+R*ry,cz=C[2]+R*rz,th=o.thF(ang),end=closed?0:i===0?-1:i===nA?1:0;
    for(let j=0;j<nS;j++){const ph=(j+(wnHash(i*31+j,sd,7772)-.5)*.45)/nS*6.2832,cp=Math.cos(ph),sp=Math.sin(ph),dx=rx*cp+W[0]*sp,dy=ry*cp+W[1]*sp,dz=rz*cp+W[2]*sp;
      let X=cx+dx*th,Y=cy+dy*th,Z=cz+dz*th;
      const dsp=th*(.32*(wnRidged(N[18],(X+Y*.7)/n1,(Z-Y*.5)/n1,lod?1:3,2.1,.5,1,2)-.45)+(lod?0:.12*wnN(N[19],(X-Y)/n2,(Z+Y)/n2)));
      X+=dx*dsp;Y+=dy*dsp;Z+=dz*dsp;
      if(end){const k=end<0?K0:K1,e=Math.max(-.42*step,Math.min(.45*th,th*(.55*(cp*k[0]+sp*k[1])+.3*(jag[j]-.5))))*end;X+=tx*e;Y+=ty*e;Z+=tz*e;}/* (the break: slanted, its edge uneven) */
      const hy=Y-o.gh(X,Z),under=.36*wnS(dy,-.15,-.75),inner=.2*wnS(-cp,.1,.85),low=.5*(1-wnS(hy,0,th*1.4)),hol=.3*Math.min(1,Math.max(0,-dsp/(th*.09)));
      S.pos.push(X,Y,Z);S.aA.push(0,0,1,o.mo(X,Y,Z,hy,th)*(end?.5:1));S.aB.push(0,.5+.5*Math.min(.9,1-(1-under)*(1-inner)*(1-low)*(1-hol)),wrTint(o.ti,X,Y,Z,R),1);S.aW.push(-1e4);}}
  for(let i=0;i<nA;i++)for(let j=0;j<nS;j++){const i2=closed?(i+1)%nA:i+1,j2=(j+1)%nS,a=b0+i*nS+j,b=b0+i2*nS+j,c=b0+i*nS+j2,d=b0+i2*nS+j2;S.idx.push(a,b,c,b,d,c);}
  /* the breaks' caps: a ring of points half way in, each pulled in or out along the ring, then the middle, a little proud or sunk - rough, not cut */
  if(!closed)for(const e of[0,nA]){const r0=b0+e*nS,sg=e?1:-1,ang=e?a1:a0,c=Math.cos(ang),s=Math.sin(ang),tx=-s*U[0]+c*V[0],ty=-s*U[1]+c*V[1],tz=-s*U[2]+c*V[2],th=o.thF(ang);
    let mx=0,my=0,mz=0;for(let j=0;j<nS;j++){mx+=S.pos[(r0+j)*3];my+=S.pos[(r0+j)*3+1];mz+=S.pos[(r0+j)*3+2];}mx/=nS;my/=nS;mz/=nS;
    const mo=o.mo(mx,my,mz,99,th)*.3,r1=S.pos.length/3,put=(X,Y,Z)=>{S.pos.push(X,Y,Z);S.aA.push(0,0,1,mo);S.aB.push(0,.6,wrTint(o.ti,X,Y,Z,R),1);S.aW.push(-1e4);};
    for(let j=0;j<nS;j++){const q=(r0+j)*3,u=(rg()-.5)*th*.55*sg,k=.48+.12*rg();put(mx+(S.pos[q]-mx)*k+tx*u,my+(S.pos[q+1]-my)*k+ty*u,mz+(S.pos[q+2]-mz)*k+tz*u);}
    const u=(rg()-.35)*th*.4*sg,cc=S.pos.length/3;put(mx+tx*u,my+ty*u,mz+tz*u);
    for(let j=0;j<nS;j++){const j2=(j+1)%nS,a=r0+j,b=r0+j2,c2=r1+j,d=r1+j2;if(e)S.idx.push(a,b,c2,b,d,c2,c2,d,cc);else S.idx.push(a,c2,b,b,c2,d,c2,cc,d);}}}

/* ---------- earth heaped where stone goes into the land ----------
   An oval mound (radii a along (ux,uz), b across, height hm) on the ground, its edge sunk into it; the land's own attributes (its grass and colours
   there), a little darker by the stone. The ground under it is a 4 x 4 lattice of samples (the same for both levels of detail). */
function wrBermPrep(L,x,z,ux,uz,a,b,hm,sd){const n=3,G=[];for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const lx=(i/n*2-1)*a,lz=(j/n*2-1)*b;G.push(wrG(L,x+lx*ux-lz*uz,z+lx*uz+lz*ux).h);}
  const g0=wrG(L,x,z),N=WG.N,ph=(sd%997)*.37;
  const gAt=(lx,lz)=>{const fi=Math.min(n-1e-6,Math.max(0,(lx/a+1)*n/2)),fj=Math.min(n-1e-6,Math.max(0,(lz/b+1)*n/2)),i=fi|0,j=fj|0,u=fi-i,w=fj-j,q=j*(n+1)+i;
    return (G[q]*(1-u)+G[q+1]*u)*(1-w)+(G[q+n+1]*(1-u)+G[q+n+2]*u)*w;};
  const hL=(lx,lz)=>{const r=Math.hypot(lx/a,lz/b);return gAt(lx,lz)+(r<1?hm*Math.pow(1-r*r,1.5)*(1+.22*wnN(N[15],lx/(a*.6)+ph,lz/(b*.6)-ph)):0)-.5*Math.pow(Math.min(1,r),3);};
  return {x,z,ux,uz,a,b,hm,sd,A:g0.A,wl:g0.wl>-1e8?g0.wl:-1e4,hL,kx:0,kz:0};}
function wrBerm(S,B,lod){const K=lod?3:6,M=lod?10:18,b0=S.pos.length/3,N=WG.N,ph=(B.sd%997)*.37;
  const put=(lx,lz,r)=>{S.pos.push(B.x+lx*B.ux-lz*B.uz,B.hL(lx,lz),B.z+lx*B.uz+lz*B.ux);S.aA.push(B.A[0],B.A[1],B.A[2],B.A[3]);S.aB.push(0,.5+.5*.16*(1-r),0,0);S.aW.push(B.wl);};
  put(0,0,0);
  for(let k=1;k<=K;k++){const r=k/K;for(let m=0;m<M;m++){const t=m/M*6.2832,rr=r*(1+(k<K?.1*wnN(N[15],Math.cos(t)*1.7+ph,Math.sin(t)*1.7-ph):0));put(Math.cos(t)*B.a*rr,Math.sin(t)*B.b*rr,r);}}
  for(let m=0;m<M;m++)S.idx.push(b0,b0+1+(m+1)%M,b0+1+m);
  for(let k=1;k<K;k++){const r0=b0+1+(k-1)*M,r1=b0+1+k*M;for(let m=0;m<M;m++){const m2=(m+1)%M,a=r0+m,b=r0+m2,c=r1+m,d=r1+m2;S.idx.push(a,b,c,b,d,c);}}}

/* rubble: a chiselled stone (wrock.js wrkShape), tipped a little, its lower part darker, with the ring's moss */
function wrStone(S,x,y,z,sz,mo,ti,lod,sd){const rg=wnRng(sd),w=sz*(1+.5*rg()),h=sz*(.55+.4*rg()),d=sz*(.85+.5*rg());if(!WRK.N)WRK.N=wnSimplex(424242);
  const sh=wrkShape(rg,w,h,d,{det:lod?0:1,cuts:5+Math.floor(rg()*3),up:1,rough:.08,box:.5}),yaw=rg()*6.2832,tl=(rg()-.5)*.6,cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tl),st=Math.sin(tl),b0=S.pos.length/3,ylo=-.55*h/2;
  for(let i=0;i<sh.length;i+=3){const px=sh[i]*ct-sh[i+1]*st,py=sh[i]*st+sh[i+1]*ct,pz=sh[i+2],hf=Math.min(1,Math.max(0,(sh[i+1]-ylo)/(h/2-ylo)));
    S.pos.push(x+px*cy-pz*sy,y+py,z+px*sy+pz*cy);S.aA.push(0,0,1,mo);S.aB.push(0,.5+.5*.55*Math.pow(1-hf,1.6),ti,1);S.aW.push(-1e4);S.idx.push(b0+i/3);}}

/* ---------- what grows on it (flat-shaded vertex colours, the foliage's own material) ---------- */
/* a leafy blob: an icosahedron squashed by sq, its corners nudged (three shapes made once per detail), each face its own shade, darker underneath */
function wrBlobTpl(det,j){const k=det*3+j;if(WR.ico[k])return WR.ico[k];const P=new THREE.IcosahedronGeometry(1,det).attributes.position.array,Q=new Float32Array(P.length);
  for(let q=0;q<P.length;q+=3){const s=1+.2*(wnHash(Math.round(P[q]*61)*977+Math.round(P[q+1]*61),Math.round(P[q+2]*61)+j*7,7782)-.5);Q[q]=P[q]*s;Q[q+1]=P[q+1]*s;Q[q+2]=P[q+2]*s;}
  return WR.ico[k]=Q;}
function wrBlob(Vg,x,y,z,r,sq,hex,det,sd){const P=wrBlobTpl(det,sd%3),c=_wrC.setHex(hex),cr=c.r,cg=c.g,cb=c.b,yaw=(sd%628)*.01,cy=Math.cos(yaw)*r,sy=Math.sin(yaw)*r,ry=r*sq,Pp=Vg.pos,Cl=Vg.col;
  for(let i=0;i<P.length;i+=9){const k=.88+.24*wnHash(i,sd,7781);
    for(let q=i;q<i+9;q+=3){const px=P[q],py=P[q+1],pz=P[q+2],sh=k*(py<-.2?.72:py<.3?.9:1.06);Pp.push(x+px*cy-pz*sy,y+py*ry,z+px*sy+pz*cy);Cl.push(cr*sh,cg*sh,cb*sh);}}}
/* a tapered n-sided trunk from p0 to p1 */
function wrCyl(Vg,p0,p1,r0,r1,n,hex,sd){const c=_wrC.setHex(hex),cr=c.r,cg=c.g,cb=c.b,ax=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],l=Math.hypot(ax[0],ax[1],ax[2])||1;ax[0]/=l;ax[1]/=l;ax[2]/=l;
  const b=Math.abs(ax[1])<.9?[0,1,0]:[1,0,0],e1=[ax[1]*b[2]-ax[2]*b[1],ax[2]*b[0]-ax[0]*b[2],ax[0]*b[1]-ax[1]*b[0]],el=Math.hypot(e1[0],e1[1],e1[2]);e1[0]/=el;e1[1]/=el;e1[2]/=el;
  const e2=[ax[1]*e1[2]-ax[2]*e1[1],ax[2]*e1[0]-ax[0]*e1[2],ax[0]*e1[1]-ax[1]*e1[0]],pt=(p,r,t)=>{const c=Math.cos(t)*r,s=Math.sin(t)*r;return [p[0]+c*e1[0]+s*e2[0],p[1]+c*e1[1]+s*e2[1],p[2]+c*e1[2]+s*e2[2]];};
  for(let k=0;k<n;k++){const t0=k/n*6.2832,t1=(k+1)/n*6.2832,A=pt(p0,r0,t0),B=pt(p0,r0,t1),Cq=pt(p1,r1,t0),D=pt(p1,r1,t1),sh=.8+.2*Math.cos(t0+sd%7);
    for(const P of[A,B,Cq,B,D,Cq]){Vg.pos.push(P[0],P[1],P[2]);Vg.col.push(cr*sh,cg*sh,cb*sh);}}}
const WR_LEAF=[0x3f7a2c,0x4f8a34,0x376a28,0x467f30,0x5a9a3a,0x2f6226];
function wrBush(Vg,x,y,z,r,sd,lod,bloom){const rg=wnRng(sd),n=lod?1+(r>2.2?1:0):2+Math.floor(rg()*3);
  for(let k=0;k<n;k++){const a=rg()*6.283,d=k?r*(.45+.35*rg()):0,rr=k?r*(.5+.3*rg()):r;wrBlob(Vg,x+Math.cos(a)*d,y+rr*.25-(k?.1*r:0),z+Math.sin(a)*d,rr,.72,WR_LEAF[(sd+k*3)%6],lod?0:rr>2.4?1:0,(sd*7+k)%100003);}
  if(bloom&&!lod){const bc=[0xf2f2ee,0xe8d84a,0xd8506a,0xb06ad0][sd%4];for(let k=0;k<6;k++){const a=rg()*6.283,e=rg()*.9;
    wrBlob(Vg,x+Math.cos(a)*r*.78*Math.cos(e),y+r*.25+r*.62*Math.sin(e),z+Math.sin(a)*r*.78*Math.cos(e),r*.09+.1,1,bc,0,(sd*11+k)%100003);}}}
/* a small tree: a trunk along (ax,ay,az) and a crown of blobs */
function wrTree(Vg,x,y,z,ax,ay,az,H,sd,lod){const rg=wnRng(sd),l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;const top=[x+ax*H*.62,y+ay*H*.62,z+az*H*.62],cr=H*(.26+.06*rg());
  wrCyl(Vg,[x-ax*H*.1,y-ay*H*.1,z-az*H*.1],top,H*.05,H*.032,lod?4:6,0x5a3d22,sd);
  wrBlob(Vg,top[0]+ax*cr*.4,top[1]+cr*.35,top[2]+az*cr*.4,cr,.8,WR_LEAF[sd%6],lod?0:1,sd%100003);
  if(!lod)for(let k=0;k<2+Math.floor(rg()*2);k++){const a=rg()*6.283,r2=cr*(.55+.2*rg()),bx=top[0]+Math.cos(a)*cr*.75,by=top[1]-cr*.15+rg()*cr*.4,bz=top[2]+Math.sin(a)*cr*.75;
    wrCyl(Vg,[x+ax*H*.38,y+ay*H*.38,z+az*H*.38],[bx,by-r2*.3,bz],H*.022,H*.012,4,0x5a3d22,sd+k);wrBlob(Vg,bx,by,bz,r2,.8,WR_LEAF[(sd+k+1)%6],r2>2.4?1:0,(sd+k+1)%100003);}}
/* a vine hanging from (x,y,z): a thin three-sided strand L long, swaying a little, leafy, dark at the top and lighter at the tip */
function wrVine(Vg,x,y,z,L,w,sd){const rg=wnRng(sd),n=L>18?8:6,ph=rg()*6.28,amp=.25+L*.06,Pp=Vg.pos,Cl=Vg.col,rp=new Float32Array((n+1)*9),cx=new Float32Array(n+1),cz=new Float32Array(n+1),rr=new Float32Array(n+1);
  for(let k=0;k<=n;k++){const t=k/n,X=x+Math.sin(ph+t*2.3)*amp*t,Y=y-L*t,Z=z+Math.cos(ph*1.3+t*1.9)*amp*t,r=w*(1-.6*t)*(.8+.4*rg());cx[k]=X;cz[k]=Z;rr[k]=r;
    for(let q=0;q<3;q++){const a=q*2.0944+k*.7,o=k*9+q*3;rp[o]=X+Math.cos(a)*r;rp[o+1]=Y;rp[o+2]=Z+Math.sin(a)*r;}}
  const v=(o,r,g,b)=>{Pp.push(rp[o],rp[o+1],rp[o+2]);Cl.push(r,g,b);};
  for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n,r0=.17+.18*t0,g0=.35+.25*t0,b0=.14+.09*t0,r1=.17+.18*t1,g1=.35+.25*t1,b1=.14+.09*t1;
    for(let q=0;q<3;q++){const A=k*9+q*3,B=k*9+(q+1)%3*3,C=A+9,D=B+9;v(A,r0,g0,b0);v(B,r0,g0,b0);v(C,r1,g1,b1);v(B,r0,g0,b0);v(D,r1,g1,b1);v(C,r1,g1,b1);}
    if(k&1){const a=rg()*6.283,s=.4+w*1.4,ox=Math.cos(a),oz=Math.sin(a),Y=y-L*t0,bx=cx[k]+ox*rr[k],bz=cz[k]+oz*rr[k],lg=k&2?.5:.56,lr=k&2?.26:.31,lb=k&2?.19:.22;/* (a leaf, both sides) */
      const sx=bx+ox*s*.45-oz*s*.32,sz=bz+oz*s*.45+ox*s*.32,tx=bx+ox*s,tz=bz+oz*s;Pp.push(bx,Y,bz,sx,Y-s*.1,sz,tx,Y-s*.35,tz,bx,Y,bz,tx,Y-s*.35,tz,sx,Y-s*.1,sz);for(let q=0;q<6;q++)Cl.push(lr,lg,lb);}}
  const o=n*9,ty=y-L-w*1.5;for(let q=0;q<3;q++){const A=o+q*3,B=o+(q+1)%3*3;Pp.push(rp[A],rp[A+1],rp[A+2],rp[B],rp[B+1],rp[B+2],cx[n],ty,cz[n]);Cl.push(.35,.6,.23,.35,.6,.23,.35,.6,.23);}}
/* a clump of tall blades (grass round the feet; reeds in the shallows, darker, a few with brown heads) */
function wrTuft(Vg,x,y,z,h,sd,reed){const rg=wnRng(sd),n=5+Math.floor(rg()*4),cb=reed?[.24,.34,.15]:[.2,.36,.12],ct=reed?[.47,.56,.28]:[.5,.66,.24];
  for(let i=0;i<n;i++){const a=rg()*6.283,l=(.15+.5*rg())*h*(reed?.18:.42),bw=(.05+.05*rg())*h*(reed?.4:1)+.03,hh=h*(.6+.45*rg()),bx=x+Math.cos(a)*.12*h,bz=z+Math.sin(a)*.12*h,
      tx=bx+Math.cos(a)*l,tz=bz+Math.sin(a)*l,px=-Math.sin(a)*bw,pz=Math.cos(a)*bw,b1=[bx+px,y-.1,bz+pz],b2=[bx-px,y-.1,bz-pz],tp=[tx,y+hh,tz];
    for(const T of[[b1,b2,tp],[b2,b1,tp]]){Vg.pos.push(...T[0],...T[1],...T[2]);Vg.col.push(...cb,...cb,...ct);}
    if(reed&&rg()<.35){const c=_wrC.setHex(0x6a4a2a);for(let q=0;q<3;q++){const s=(q-1)*.07;Vg.pos.push(tx-.06+s,y+hh-.3,tz,tx+.06+s,y+hh-.3,tz,tx+s,y+hh+.05,tz);Vg.col.push(c.r,c.g,c.b,c.r,c.g,c.b,c.r,c.g,c.b);}}}}

/* ---------- the layout: everything placed, the same for both levels of detail ---------- */
/* the ring's frame and where it meets the ground (the layout's first step; wrFeet uses it alone): it pivots on its foot - its centre R - sink above it,
   along its (leaning) up. What stands of a broken ring is about a half ring: its bottom rests on the ground (or the bed of the water), a little sunk into it */
function wrFrame(f,v,L){const R=f.R,th=v.th,N=WG.N,PI=Math.PI,yaw=f.yaw,ca=Math.cos(yaw),sa=Math.sin(yaw),nx=-sa,nz=ca,ov=v.ov,id=f.id;
  const st=Math.sin(v.lean),ct=Math.cos(v.lean);let up=R-v.sink;
  if(v.brk){const gb=Math.min(wrG(L,f.x,f.z).h,wrG(L,f.x+ca*R*.3,f.z+sa*R*.3).h,wrG(L,f.x-ca*R*.3,f.z-sa*R*.3).h);up=(gb-th*(.15+.5*v.bs)+R*ct-f.y)/ct;}
  const F=L.F=wrUp(f.x+nx*st*up,f.y+ct*up,f.z+nz*st*up,yaw,v.lean);
  L.closed=!v.brk;L.a0=v.brk?-PI-v.eL:-PI/2;L.a1=v.brk?v.eR:1.5*PI;
  L.thF=a=>{const c=Math.cos(a),s=Math.sin(a);let t=th*(1+.28*wnN(N[9],c*1.7+id,s*1.7)+.12*wnN(N[9],c*5.1-id,s*5.1));
    t*=1-.22*wnS(wnN(N[10],c*2.6+id*.7,s*2.6),.45,.85);/* (worn thin in places) */
    if(v.brk)t*=1-.2*(1-wnS(Math.min(a-L.a0,L.a1-a),0,.4));/* (the horns thinner towards their breaks) */return t;};
  L.cR=wrContact(L,F,R,v.brk?v.eR:PI/2);L.cL=wrContact(L,F,R,v.brk?-PI-v.eL:-1.5*PI);
  const gl=L.cL?Math.max(L.cL.h,L.cL.wl):f.y,gr=L.cR?Math.max(L.cR.h,L.cR.wl):f.y;
  L.gh=(X,Z)=>{const t=Math.min(1,Math.max(0,(((X-f.x)*ca+(Z-f.z)*sa)+R)/(2*R)));return gl+(gr-gl)*t;};
  L.mo=(X,Y,Z,hy,t)=>{const np=.5+.5*wnN(N[12],(X+Y*.6)/(R*.45),(Z-Y*.4)/(R*.45)),near=Math.exp(-Math.max(0,hy)/(t*1.7));return Math.min(1,ov*(.4+.78*np)+near*(.15+.55*ov));};
  return L;}
function* wrPrepG(f,v,res){const L={G:new Map()},R=f.R,th=v.th,N=WG.N,PI=Math.PI,yaw=f.yaw,ca=Math.cos(yaw),sa=Math.sin(yaw),nx=-sa,nz=ca,rg=wnRng(v.seed),ov=v.ov,id=f.id;
  wrFrame(f,v,L);const F=L.F;
  yield;
  /* the fallen pieces: arcs of the lost top lying on their sides beside it (or one across its foot), half sunk */
  L.pieces=[];if(v.brk){const miss=PI-v.eL-v.eR,np=v.ruin?3+Math.floor(rg()*3):1+Math.floor(rg()*2.7);
    for(let k=0;k<np;k++){const s=Math.min(.42,Math.max(.16,miss*(.1+.12*rg()))),inPl=k===0&&rg()<.35,side=rg()<.5?-1:1;
      const u=inPl?(rg()-.5)*.5*R:(rg()-.5)*1.1*R,w=inPl?(rg()-.5)*th:side*(th*1.7+R*(.16+.38*rg())),psi=yaw+(rg()-.5)*(inPl?.5:1);
      const mx=f.x+ca*u+nx*w,mz=f.z+sa*u+nz*w,roll=(rg()<.5?-1:1)*(.25+.85*rg()),/* (tipped onto its edge, so its curve shows) */cp=Math.cos(psi),sp=Math.sin(psi),cr=Math.cos(roll),sr=Math.sin(roll);
      const U=[-sp*cr,sr,cp*cr],V=[cp,0,sp],W=[U[1]*V[2]-U[2]*V[1],U[2]*V[0]-U[0]*V[2],U[0]*V[1]-U[1]*V[0]],tp=th*(.78+.3*rg()),e=.15+.4*rg();
      let ys=0;for(const a of[-s/2,0,s/2]){const q=R*(Math.cos(a)-1),r=R*Math.sin(a);ys+=wrG(L,mx+q*U[0]+r*V[0],mz+q*U[2]+r*V[2]).h+tp*e-q*U[1];}
      const my=ys/3,sd=(wnHashI(v.seed,k,353))%1000003;L.pieces.push({F:{C:[mx-R*U[0],my-R*U[1],mz-R*U[2]],U,V,W},a0:-s/2,a1:s/2,th:tp,sd,x:mx,y:my,z:mz,gy:my-tp*e,psi,s});}}
  yield;
  /* earth heaped round the feet and along the pieces; where a foot stands in water a few metres deep the earth rises out of it as a little island */
  L.berms=[];const berm=(x,z,ux,uz,a,b,hm,sd,kx,kz,maxD)=>{const g=wrG(L,x,z),dp=g.wl>-1e8?g.wl-g.h:-1;if(dp>maxD)return null;const w=Math.max(0,dp)*3.4;/* (an island's sides slope gently down to the bed: a steep one shows through the water as a wall) */
    const B=wrBermPrep(L,x,z,ux,uz,a+w,b+w,hm+Math.max(0,dp),sd);B.kx=kx;B.kz=kz;L.berms.push(B);return B;};/* (16 samples a heap) */
  {const cR=L.cR,cL=L.cL,aF=th*2.1+2,hm=th*(.26+.38*ov)+.6,sd=v.seed%1000003,d=cR&&cL?Math.hypot(cR.x-cL.x,cR.z-cL.z)/2:1e9;
    if(d<aF*1.1)berm((cR.x+cL.x)/2,(cR.z+cL.z)/2,ca,sa,d+th*1.5+2,th*1.7+2,hm,sd+1,d+th*.9,th*.8,7);/* (feet close together - the bottom of a half ring: one long heap along it) */
    else for(const c of[cR,cL])if(c)berm(c.x,c.z,ca,sa,aF,th*1.7+2,hm,sd+(c===cR?1:2),th*.95,th*.8,7);}
  for(const p of L.pieces){const ch=R*Math.sin(p.s/2);p.B=berm(p.x,p.z,Math.cos(p.psi),Math.sin(p.psi),ch+p.th*.9,p.th*1.45,p.th*(.2+.25*ov)+.4,p.sd+3,ch,p.th*.85,4);}
  yield;
  /* a small ring beside it, leaning away or nearly fallen, half buried */
  L.comp=null;if(v.comp){const Rs=9+15*rg(),ths=Rs*(.13+.05*rg()),side=rg()<.5?-1:1,u=(rg()-.5)*R*.7,w=side*(th*1.3+Rs*.6+R*.25*rg()),dd=Math.hypot(u,w),lim=R-Rs-6,sc=dd>lim?lim/dd:1;
    const cx=f.x+(ca*u+nx*w)*sc,cz=f.z+(sa*u+nz*w)*sc,g=wrG(L,cx,cz),yw=yaw+(rg()-.5)*1.6,ln=side*(.22+1.05*rg()),sk=Rs*(.22+.35*rg()),brk=rg()<.5;
    const F2=wrUp(cx-Math.sin(yw)*Math.sin(ln)*(Rs-sk),g.h+Math.cos(ln)*(Rs-sk),cz+Math.cos(yw)*Math.sin(ln)*(Rs-sk),yw,ln),cid=rg()*50,co=Math.min(1,ov+.3);
    const c={F:F2,R:Rs,th:ths,closed:!brk,a0:brk?-PI-.6*rg():-PI/2,a1:brk?-.1+.7*rg():1.5*PI,sd:(wnHashI(v.seed,7,354))%1000003,gy:Math.max(g.h,g.wl)};
    c.thF=a=>ths*(1+.25*wnN(N[9],Math.cos(a)*1.7+cid,Math.sin(a)*1.7));c.mo=(X,Y,Z,hy,t)=>Math.min(1,co*(.4+.7*(.5+.5*wnN(N[12],X/(Rs*.5),Z/(Rs*.5)+Y*.03)))+.5*Math.exp(-Math.max(0,hy)/(t*1.5)));
    for(const [k,aE] of[['cR',c.closed?PI/2:c.a1],['cL',c.closed?-1.5*PI:c.a0]]){const q=wrContact(L,F2,Rs,aE);c[k]=q;if(q)berm(q.x,q.z,Math.cos(yw),Math.sin(yw),ths*2.2+1.2,ths*1.9+1.2,ths*(.35+.3*co)+.4,c.sd+(k==='cR'?5:6),ths*.9,ths*.8,3);}
    L.comp=c;}
  yield;
  /* rubble round the feet and the pieces */
  L.rub=[];const rub=(x,z,sz,mo)=>{let y=null;for(const B of L.berms){const lx=(x-B.x)*B.ux+(z-B.z)*B.uz,lz=-(x-B.x)*B.uz+(z-B.z)*B.ux;if(Math.hypot(lx/B.a,lz/B.b)<.9){y=B.hL(lx,lz);break;}}
    L.rub.push({x,y:(y===null?wrG(L,x,z).h:y)-sz*.15,z,sz,mo,sd:(rg()*1e9)|0});};
  for(const c of[L.cR,L.cL])if(c){const n=(v.brk?4:2)+Math.floor(rg()*3);for(let k=0;k<n;k++){const a=rg()*6.283,d=th*(1.1+1.3*rg());rub(c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,th*(.09+.22*rg()*rg())+.5,Math.min(1,ov+.25));}}
  for(const p of L.pieces){const n=2+Math.floor(rg()*4),ch=R*Math.sin(p.s/2);for(let k=0;k<n;k++){const a=rg()*6.283,d=p.th*1.2+ch*rg();rub(p.x+Math.cos(a)*d,p.z+Math.sin(a)*d,p.th*(.1+.22*rg())+.5,Math.min(1,ov+.3));}}
  if(v.brk){const nB=v.ruin?3+Math.floor(rg()*3):1+Math.floor(rg()*2.5);for(let k=0;k<nB;k++){const u=(rg()-.5)*1.2*R,w=(rg()<.5?-1:1)*(th*1.6+R*(.1+.45*rg()));/* (big broken blocks of the top) */
    rub(f.x+ca*u+nx*w,f.z+sa*u+nz*w,th*(.7+.6*rg()),Math.min(1,ov+.2));}}
  yield;
  /* on the stone: bushes where its top faces up, a bush or a small tree on a break, small trees on a whole ring's top, vines from its underside */
  L.bush=[];L.tree=[];L.vine=[];const o=[0,0,0,0,0,0],onS=a=>v.brk&&(a<L.a0||a>L.a1)?(a<L.a0?L.a0+.04:L.a1-.04):a;/* (a broken ring's plants stay on what is left of it: a ruin's arc can be narrow) */
  const nb=Math.round(ov*(3+R*.1)*(v.great?1.5:1));for(let k=0;k<nb;k++){const q=rg(),a=onS(v.brk?(q<.35?L.a1-rg()*.55:q<.7?L.a0+rg()*.55:-PI/2+(rg()-.5)*1.6):PI/2+(rg()-.5)*PI*.9);wrSurf(F,R,a,L.thF,1,o);
    if(o[4]<.35||o[1]<L.gh(o[0],o[2])+.6)continue;/* (where its top faces up, out of the ground and the water) */L.bush.push({x:o[0],y:o[1],z:o[2],r:th*(.15+.2*rg())+1,sd:(rg()*1e9)|0,bl:ov>.7&&rg()<.3});}
  if(v.brk)for(const e of[L.a0,L.a1]){const c=Math.cos(e),s=Math.sin(e),sg=e===L.a1?1:-1,tx=(-s*F.U[0]+c*F.V[0])*sg,ty=(-s*F.U[1]+c*F.V[1])*sg,tz=(-s*F.U[2]+c*F.V[2])*sg;wrAt(F,R,e,o);
    if(ty>.3&&rg()<.35+ov*.6){const x=o[0]+tx*th*.2,y=o[1]+ty*th*.2,z=o[2]+tz*th*.2;
      if(ov>.5&&rg()<.6)L.tree.push({x,y,z,ax:tx*.5,ay:1,az:tz*.5,H:th*(.9+.7*rg())+6,sd:(rg()*1e9)|0});else L.bush.push({x,y,z,r:th*(.24+.18*rg())+1,sd:(rg()*1e9)|0,bl:ov>.6&&rg()<.4});}}
  {let nt=ov>.5?1+(rg()<ov-.3?1:0)+(rg()<ov-.55?1:0)+(R>100&&rg()<.5?1:0):ov>.35&&rg()<.4?1:0;if(v.great)nt+=4+Math.floor(rg()*4);
    for(let k=0;k<nt;k++){const a=onS(v.brk?-PI/2+(rg()-.5)*1.4:PI/2+(rg()-.5)*1.5);wrSurf(F,R,a,L.thF,1,o);if(o[4]<.5||o[1]<L.gh(o[0],o[2])+1)continue;const c=Math.cos(a)*(v.brk?-1:1);
      L.tree.push({x:o[0],y:o[1],z:o[2],ax:o[3]*.35+c*F.U[0]*.25,ay:1,az:o[5]*.35+c*F.U[2]*.25,H:th*(.9+.8*rg())+6,sd:(rg()*1e9)|0});}}
  const nv=Math.round(ov*ov*(3+R*.1));for(let k=0;k<nv;k++){const ac=v.brk?(rg()<.5?L.a1-rg()*.25:L.a0+rg()*.25):PI/2+(rg()-.5)*PI*.78,ns=3+Math.floor(rg()*5);
    for(let q=0;q<ns;q++){const a=onS(ac+(rg()-.5)*Math.min(.25,10/R));wrSurf(F,R,a,L.thF,-1,o);if(o[4]>(v.brk?-.12:-.55))continue;/* (only from what faces down) */
      const len=Math.min(o[1]-L.gh(o[0],o[2])-2,(5+30*rg()*ov)*Math.min(1.5,R/100)*(.6+.4*rg()),v.brk?1.6*(R-th)*Math.sin(a):1e9);
      if(len>2)L.vine.push({x:o[0],y:o[1]+.3,z:o[2],L:len,w:.22+.35*rg()+th*.02,sd:(rg()*1e9)|0});}}
  /* the Great Elder Circle: grass and flowers along its top, creepers winding along its curve */
  L.top=[];L.creep=[];if(v.great){for(let k=0;k<80;k++){const a=PI/2+(rg()-.5)*PI*1.3;wrSurf(F,R,a,L.thF,1,o);if(o[4]<.45||o[1]<L.gh(o[0],o[2])+1)continue;L.top.push({x:o[0],y:o[1],z:o[2],h:1.4+1.8*rg(),sd:(rg()*1e9)|0,fl:rg()<.3});}
    const nc=10+Math.floor(rg()*6);for(let k=0;k<nc;k++)L.creep.push({ac:-PI/2+.8+rg()*(2*PI-1.6),sp:.3+.6*rg(),ph:rg()*6.2832,k:(rg()-.5)*5,w:1.2+1.4*rg(),sd:(rg()*1e9)|0});}
  /* round the feet, on the heaped earth: bushes, tall grass, now and then a small tree; reeds where it goes down into shallow water */
  L.base=[];for(const B of L.berms){const wet=B.wl>-1e3,nb2=1+Math.round(ov*5),nt=4+Math.round(ov*9)+(wet?8:0),tr=ov>.62&&rg()<.5;
    for(let k=0;k<nb2+nt+(tr?1:0);k++){const t=rg()*6.283,r=wet&&k>=nb2&&k<nb2+nt?.55+.45*rg():.35+.6*rg();let lx=Math.cos(t)*B.a*r,lz=Math.sin(t)*B.b*r;
      if(Math.abs(lx)<B.kx&&Math.abs(lz)<B.kz){if(Math.abs(lz)/B.kz>Math.abs(lx)/B.kx)lz=Math.sign(lz||1)*B.kz*(1+.15*rg());else lx=Math.sign(lx||1)*B.kx*(1+.15*rg());}/* (not inside the stone) */
      const x=B.x+lx*B.ux-lz*B.uz,z=B.z+lx*B.uz+lz*B.ux,y=B.hL(lx,lz),sd=(rg()*1e9)|0,r2=rg(),bl=ov>.6&&rg()<.35,H=th*(.35+.3*rg())+3;let kind=k<nb2?'bush':k<nb2+nt?'tuft':'tree';
      if(wet&&y<B.wl+.4){if(kind!=='tuft'||y<B.wl-1.3)continue;kind='reed';}/* (in the water only reeds, and not deep) */
      L.base.push({kind,x,y,z,r:kind==='bush'?th*(.07+.08*r2)+.6:kind==='reed'?Math.max(0,B.wl-y)+1.3+1.1*r2:1.1+1.1*r2,sd,bl,H});}}
  L.G=null;res.L=L;}
/* the layout at once (or what is left of it) */
function wrPrep(f,v){const res={},it=wrPrepG(f,v,res);while(!it.next().done);return res.L;}

/* ---------- one level of detail: the stone (the ground's material) and what grows on it ----------
   A generator that yields between its parts: the near level is built a few milliseconds a frame (wrView), the far one at once (wrBuild). */
function* wrBuildG(f,v,L,lod,res){const S={pos:[],aA:[],aB:[],aW:[],idx:[]},Vg={pos:[],col:[]},R=f.R,th=v.th,N=WG.N,ov=v.ov,PI=Math.PI,ti=.25+.5*v.tint;
  const span=L.a1-L.a0,nA=v.great?(lod?60:112):L.closed?(lod?40:72):Math.max(lod?14:26,Math.round((lod?40:72)*span/(2*PI)*1.2));
  wrTube(S,L.F,R,L.a0,L.a1,{lod,closed:L.closed,nA,nS:v.great?(lod?7:11):lod?6:9,thF:L.thF,mo:L.mo,gh:L.gh,ti,seed:v.seed%1000003+11,ns1:R*.22,ns2:R*.07});yield;
  for(const p of L.pieces){const pm=(X,Y,Z,hy,t)=>Math.min(1,.18+ov*.9+.4*Math.exp(-Math.max(0,hy)/(t*1.3)))*(.75+.25*wnN(N[12],X/(R*.2),Z/(R*.2)));
    wrTube(S,p.F,R,p.a0,p.a1,{lod,nA:lod?4:9,nS:lod?6:8,thF:a=>p.th*(1+.28*wnN(N[9],a*9+p.sd%97,1.3)),mo:pm,gh:()=>p.gy,ti,seed:p.sd,ns1:R*.12,ns2:R*.05});}
  if(L.comp){const c=L.comp,sp=c.a1-c.a0;wrTube(S,c.F,c.R,c.a0,c.a1,{lod,closed:c.closed,nA:c.closed?(lod?18:34):Math.max(lod?8:14,Math.round((lod?18:34)*sp/(2*PI)*1.2)),nS:lod?5:7,
    thF:c.thF,mo:c.mo,gh:()=>c.gy,ti,seed:c.sd,ns1:Math.max(9,c.R*.22),ns2:Math.max(3,c.R*.07)});}
  yield;for(const B of L.berms)wrBerm(S,B,lod);
  for(const r of L.rub){if(lod&&r.sz<th*.2)continue;wrStone(S,r.x,r.y,r.z,r.sz,r.mo,ti,lod,r.sd);}
  yield;let n=0;
  for(const b of L.bush){wrBush(Vg,b.x,b.y,b.z,b.r,b.sd,lod,b.bl);if(++n%8===0)yield;}
  for(const t of L.tree)wrTree(Vg,t.x,t.y,t.z,t.ax,t.ay,t.az,t.H,t.sd,lod);yield;
  for(const b of L.base){if(b.kind==='bush')wrBush(Vg,b.x,b.y,b.z,b.r,b.sd,lod,b.bl);else if(b.kind==='tree')wrTree(Vg,b.x,b.y,b.z,0,1,0,b.H,b.sd,lod);else if(!lod)wrTuft(Vg,b.x,b.y,b.z,b.r,b.sd,b.kind==='reed');if(++n%16===0)yield;}
  if(!lod)for(const q of L.vine){wrVine(Vg,q.x,q.y,q.z,q.L,q.w,q.sd);if(++n%12===0)yield;}
  if(L.top&&!lod)for(const t of L.top){wrTuft(Vg,t.x,t.y,t.z,t.h,t.sd,false);if(t.fl)wrBlob(Vg,t.x,t.y+t.h*.8,t.z,.35,1,[0xf2f2ee,0xe8d84a,0xd8506a,0xb06ad0][t.sd%4],0,t.sd%100003);if(++n%24===0)yield;}
  if(L.creep)for(const c of L.creep){wrCreeper(Vg,L.F,R,L.thF,c,lod);if(++n%4===0)yield;}
  /* the meshes, local to the ring's place */
  const g=new THREE.Group(),ox=f.x,oz=f.z,u8=a=>Uint8Array.from(a,q=>Math.round(Math.min(1,Math.max(0,q))*255));
  {const P=new Float32Array(S.pos.length);for(let i=0;i<P.length;i+=3){P[i]=S.pos[i]-ox;P[i+1]=S.pos[i+1];P[i+2]=S.pos[i+2]-oz;}
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setIndex(S.idx);G.computeVertexNormals();
    G.setAttribute('aA',new THREE.BufferAttribute(u8(S.aA),4,true));G.setAttribute('aB',new THREE.BufferAttribute(u8(S.aB),4,true));G.setAttribute('aW',new THREE.Float32BufferAttribute(S.aW,1));G.computeBoundingSphere();
    const m=new THREE.Mesh(G,f.mat||wtMaterial());m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;/* (wrCull: no far plane) */g.add(m);}
  yield;
  if(Vg.pos.length){const P=new Float32Array(Vg.pos.length);for(let i=0;i<P.length;i+=3){P[i]=Vg.pos[i]-ox;P[i+1]=Vg.pos[i+1];P[i+2]=Vg.pos[i+2]-oz;}
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(P,3));G.setAttribute('color',new THREE.Float32BufferAttribute(Vg.col,3));G.computeVertexNormals();G.computeBoundingSphere();
    const m=new THREE.Mesh(G,f.mat&&f.mat.userData.see?wrVMatSee(f):wrVMat());m.castShadow=!lod;m.receiveShadow=true;m.frustumCulled=false;g.add(m);}
  res.g=g;}
function wrBuild(f,v,L,lod){const res={},it=wrBuildG(f,v,L,lod,res);while(!it.next().done);return res.g;}
/* a ring's mesh (wfMesh): laid out once and its far level built; the near level (7 R and closer) is built by wrView when the camera comes near */
function wrMesh(f){const T0=performance.now(),v=wrVar(f),P=WR.pjob&&WR.pjob.f===f?WR.pjob:null;if(P)WR.pjob=null;
  let L=f.wrP;if(!L&&P){while(!P.it.next().done);L=P.res.L;}if(!L)L=wrPrep(f,v);f.wrP=null;const lod=new THREE.LOD();
  lod.addLevel(wrBuild(f,v,L,1),0);lod.position.set(f.x,0,f.z);lod.autoUpdate=true;f.wrL=L;
  if(v.great)lod.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});/* (seen from farther than the camera's far plane: the depth compression brings it in, the culling would not) */
  const ms=performance.now()-T0;WR.stats.n++;WR.stats.ms+=ms;WR.stats.max=Math.max(WR.stats.max,ms);return lod;}
/* per frame (wfUpdate), WR.budget ms in all: the near level of a ring coming within reach (forced: all of them at once); then the layout of a ring
   that will soon come into view (a little beyond WF.far), so that making its mesh is only its far level. A layout is let go once the near level is in,
   or when its ring is dropped. */
/* every ring (and Great Elder Circle) known, and whether one is still the one its cell holds */
function* wrAll(){yield* WF.list.values();if(WF.great)yield* WF.great.values();}
const wrLive=f=>f.kind==='great'?WF.great.get(wgKey(f.G.a,f.G.b))===f:WF.list.get(wgKey(f.a,f.b))===f;
const wrFar=f=>f.kind==='great'?Math.max(WF.far,Math.min(6200,Math.max(800,WF.far-250)*WF.seeK)):WF.far;/* (never nearer than the other landmarks: a longer render distance shows it at least that far) */
/* every frame: a landmark outside the view hidden - by the terrain's frustum, which has no far plane (_wtFr, wterrain.js wtUpdate, run first): three.js's own
   culling would drop every ring past the camera's 2.1 km far plane, though the depth compression (wdepth.js) draws it out to WF.far */
function wrCull(){if(typeof _wtFr==='undefined')return;const sp=WR.sp||(WR.sp=new THREE.Sphere());for(const f of wrAll()){if(!f||!f.mesh)continue;sp.center.set(f.x,f.y+f.R*.5,f.z);sp.radius=f.R*1.9+60;f.mesh.visible=_wtFr.intersectsSphere(sp);}}
function wrView(cam,force){wrCull();const T0=performance.now();wrNear(cam,force,T0);if(force||performance.now()-T0>WR.budget)return;
  let P=WR.pjob;if(P&&(P.f.mesh||!wrLive(P.f)))P=WR.pjob=null;
  if(!P){let f0=null,d0=1e18;for(const f of wrAll()){if(!f||(f.kind!=='ring'&&f.kind!=='great')||f.mesh)continue;const d=Math.hypot(f.x-cam.x,f.z-cam.z),far=wrFar(f);
      if(f.wrP){if(d>far*1.6+f.R)f.wrP=null;continue;}if(d<far+f.R+900&&d<d0){f0=f;d0=d;}}
    if(!f0)return;const res={};P=WR.pjob={f:f0,res,it:wrPrepG(f0,wrVar(f0),res)};}
  while(performance.now()-T0<WR.budget){if(P.it.next().done){P.f.wrP=P.res.L;WR.pjob=null;return;}}}
function wrNear(cam,force,T0){
  for(;;){let J=WR.job;
    if(J&&(!J.f.mesh||J.f.wrL!==J.L||!wrLive(J.f)))J=WR.job=null;/* (its ring was dropped, or the world reset) */
    if(!J){let f0=null;for(const f of wrAll()){if(!f||!f.wrL)continue;if(!f.mesh){f.wrL=null;continue;}if(Math.hypot(f.x-cam.x,f.z-cam.z)<=f.R*7+350){f0=f;break;}}
      if(!f0)return;const res={};J=WR.job={f:f0,L:f0.wrL,res,it:wrBuildG(f0,f0.wr,f0.wrL,0,res),ms:0};}
    const t1=performance.now();let done=false;for(;;){if(J.it.next().done){done=true;break;}if(!force&&performance.now()-T0>WR.budget)break;}J.ms+=performance.now()-t1;
    if(!done)return;
    const lod=J.f.mesh,g=J.res.g;lod.levels[0].distance=J.f.R*7;lod.addLevel(g,0);g.updateMatrixWorld(true);J.f.wrL=null;WR.job=null;if(J.f.kind==='great')g.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
    WR.stats.nn=(WR.stats.nn||0)+1;WR.stats.nms=(WR.stats.nms||0)+J.ms;WR.stats.nmax=Math.max(WR.stats.nmax||0,J.ms);
    if(!force)return;}}

/* a creeper winding along the curve of the Great Elder Circle: a leafy stem lying on the stone from angle ac - sp/2 to ac + sp/2, turning round the
   stone as it goes (k: how far round per radian), with clumps of leaves along it (the far level: the clumps only, fewer) */
function wrCreeper(Vg,F,R,thF,c,lod){const n=Math.max(6,Math.round(c.sp*R/(lod?12:4.5))),rg=wnRng(c.sd),Pp=Vg.pos,Cl=Vg.col,U=F.U,V=F.V,W=F.W,C=F.C,P=[];
  for(let i=0;i<=n;i++){const a=c.ac+(i/n-.5)*c.sp,ph=c.ph+c.k*(a-c.ac),ca=Math.cos(a),sa=Math.sin(a),rx=ca*U[0]+sa*V[0],ry=ca*U[1]+sa*V[1],rz=ca*U[2]+sa*V[2],cp=Math.cos(ph),sp=Math.sin(ph);
    const nx=rx*cp+W[0]*sp,ny=ry*cp+W[1]*sp,nz=rz*cp+W[2]*sp,t=thF(a)*1.1;P.push([C[0]+R*rx+nx*t,C[1]+R*ry+ny*t,C[2]+R*rz+nz*t,nx,ny,nz]);}
  if(!lod)for(let i=0;i<n;i++){const A=P[i],B=P[i+1],tx=B[0]-A[0],ty=B[1]-A[1],tz=B[2]-A[2];let wx=ty*A[5]-tz*A[4],wy=tz*A[3]-tx*A[5],wz=tx*A[4]-ty*A[3];const l=Math.hypot(wx,wy,wz)||1,w=c.w*(.7+.5*rg())*.4;wx*=w/l;wy*=w/l;wz*=w/l;
    const g=.3+.1*rg(),r0=.16,b0=.12,q=[A[0]-wx,A[1]-wy,A[2]-wz,A[0]+wx,A[1]+wy,A[2]+wz,B[0]+wx,B[1]+wy,B[2]+wz,B[0]-wx,B[1]-wy,B[2]-wz];
    for(const T of[[0,1,2],[0,2,3],[0,2,1],[0,3,2]])for(const k of T){Pp.push(q[k*3],q[k*3+1],q[k*3+2]);Cl.push(r0,g,b0);}}
  /* the leaves: clumps of one to three blobs along it, uneven in size and spacing, a little to either side of the stem */
  for(let i=0;i<=n;i++){if(rg()<(lod?.55:.22))continue;const A=P[i],B=P[Math.min(n,i+1)],tx=B[0]-A[0],ty=B[1]-A[1],tz=B[2]-A[2];let sx=ty*A[5]-tz*A[4],sy=tz*A[3]-tx*A[5],sz=tx*A[4]-ty*A[3];const sl=Math.hypot(sx,sy,sz)||1;sx/=sl;sy/=sl;sz/=sl;
    const nb=lod?1:1+Math.floor(rg()*2.6);for(let k=0;k<nb;k++){const r=c.w*(.7+1.3*rg())*(lod?1.6:1),o=(rg()-.5)*c.w*2.4;wrBlob(Vg,A[0]+sx*o+A[3]*r*.35,A[1]+sy*o+A[4]*r*.35,A[2]+sz*o+A[5]*r*.35,r,.55+.2*rg(),WR_LEAF[(c.sd+i+k)%6],0,(c.sd+i*13+k*7)%100003);}}}
/* where a ring's stone meets the ground: at each foot the point where its middle line goes in, the line of the ring there, and how long the stone's
   footprint is along it (a tube going in slantwise leaves a long oval) - for the grid (wstream.js). Laid out once (the frame of wrPrepG). */
function wrFeet(f){if(f.feet)return f.feet;const v=wrVar(f),L=wrFrame(f,v,{G:new Map()}),th=v.th,ca=Math.cos(f.yaw),sa=Math.sin(f.yaw),out=[];
  for(const c of[L.cR,L.cL]){if(!c)continue;const a=c.a,ty=Math.abs(Math.cos(a)*L.F.V[1]+Math.sin(a)*0),half=Math.min(th*3,th/Math.max(.3,Math.abs(Math.cos(a))));
    out.push({x:c.x,z:c.z,ux:ca,uz:sa,th,half});}
  return f.feet=out;}

/* =====================================================================================================
   TREES (src/trees.js): the deciduous trees of the streamed world, in the stylized low-poly look of the references - round, faceted clumps of
   leaves on slender trunks and boughs that bend, every facet catching the light on its own (flat shading), the clumps darker underneath and
   towards the middle of the crown, a touch lighter on top.
   THE MODELS (trwTemplates): five kinds, each in four variants made from its own seeded stream (TRW.K):
     round  a broadleaf: a straight trunk forking into two to four boughs under a dome of faceted balls;
     oak    spreading: a short thick trunk with a flared foot and roots, four or five long boughs (each with a side branch) under a wide crown;
     tall   an oval crown of stacked balls round a tall straight trunk with short side branches;
     umbr   a slender trunk bent in an S, long rising branches each ending in a broad flat pad with a flat underside (pads at different heights);
     young  a small tree: a thin trunk and two to four small balls.
   Each is made at four levels: near (L0, within TRW.R0: the clumps from the 80-facet ball, bark tubes of 4-7 sides, about 600-1700 triangles),
   middle (L1, out to TRW.RA: the same clumps from the 20-facet ball - the crown keeps its outline, only its facets get bigger - the trunk and
   boughs only, 240-500), the far middle (L3, out to TRW.R1: the clumps merged into two to seven blobs that fill the crown's outline, 3-sided
   boughs, 60-250) and far (L2: the three biggest clumps a fifth bigger over a three-sided trunk that goes from 2.5 m in the ground up into the
   crown, so it never floats where the coarse far terrain lies lower; 50-70). Colours are per vertex; the trees take the sun's light and shadows.
   THE MATERIAL (trwMats): the game's flat-shaded Phong with two additions in the vertex shader: the wind (the canopy sways, the trunk does not:
   aSw, 0 at the foot .. 1 at the top of the crown) and the hand-over between the near trees and the rest: a near tree (an instance of its kind's
   L0) is drawn only within TRW.R0 of the eye, the same tree in its tile's merged L1 mesh only beyond it - both decided per tree from the same
   centre and the same uniforms, so no tree is ever drawn twice or not at all (a collapsed tree is all one point). In the shadow passes the same
   hand-over is made at TRW.RS (40 m) instead: the near trees within it cast their own shadows, every other tree casts through its tile.
   ===================================================================================================== */
const TRW={on:false,owner:null,seed:null,group:null,tpl:null,ico:{},mats:null,K:['round','oak','tall','umbr','young'],V:4,
  /* the eye's uniforms: where it is, the near radius, the time (the wind) */
  U:{uEye:{value:new THREE.Vector3()},uR0:{value:60},uRS:{value:40},uT:{value:0}},
  /* leaf colours of each kind (dark, middle, light) and its bark */
  leaf:{round:[[.29,.45,.17],[.37,.56,.21],[.48,.68,.27]],oak:[[.25,.38,.15],[.32,.47,.19],[.41,.57,.24]],tall:[[.31,.49,.17],[.40,.61,.22],[.52,.73,.29]],
    umbr:[[.27,.38,.15],[.35,.48,.19],[.45,.59,.24]],young:[[.36,.56,.21],[.46,.67,.27],[.57,.77,.33]]},
  bark:{round:[.42,.29,.2],oak:[.36,.25,.17],tall:[.46,.39,.31],umbr:[.43,.3,.21],young:[.45,.33,.22]}};
const trwRnd=(R,a,b)=>a+(b-a)*R();
/* the unit icosphere of a detail, its corners shared (so the jitter of a corner is one for all its faces): {v: xyz, f: three corners a face} */
function trwIco(d){if(TRW.ico[d])return TRW.ico[d];const src=new THREE.IcosahedronGeometry(1,d).attributes.position.array,map=new Map(),v=[],f=[];
  for(let i=0;i<src.length;i+=3){const k=Math.round(src[i]*1e4)+','+Math.round(src[i+1]*1e4)+','+Math.round(src[i+2]*1e4);let j=map.get(k);if(j===undefined){j=v.length/3;map.set(k,j);v.push(src[i],src[i+1],src[i+2]);}f.push(j);}
  return TRW.ico[d]={v:new Float32Array(v),f:new Uint16Array(f)};}
/* ---------- building geometry: positions, colours (0..1), sway weights, triangles ---------- */
function trwGB(){return{p:[],c:[],s:[],i:[]};}
function trwV(g,x,y,z,c,s){g.p.push(x,y,z);g.c.push(c[0],c[1],c[2]);g.s.push(s);return g.p.length/3-1;}
/* a bark tube along pts ([x,y,z] each) with radii rs and n sides, the far end closed in a point; darker low down; sway from sw0 at its start to sw1 at its end */
function trwTube(g,pts,rs,n,bark,sw0,sw1,R){const m=pts.length,base=g.p.length/3,Ns=[],Bs=[];let N=null,T=null;
  for(let k=0;k<m;k++){const a=pts[Math.max(0,k-1)],b=pts[Math.min(m-1,k+1)];let tx=b[0]-a[0],ty=b[1]-a[1],tz=b[2]-a[2];const l=Math.hypot(tx,ty,tz)||1;tx/=l;ty/=l;tz/=l;
    let nx,ny,nz;if(!N){nx=1;ny=0;nz=0;if(Math.abs(tx)>.9){nx=0;nz=1;}}else{nx=N[0];ny=N[1];nz=N[2];}
    const d=nx*tx+ny*ty+nz*tz;nx-=d*tx;ny-=d*ty;nz-=d*tz;const nl=Math.hypot(nx,ny,nz)||1;N=[nx/nl,ny/nl,nz/nl];T=[tx,ty,tz];/* (parallel transport: the frame turns with the tube, never twists) */
    Ns.push(N);Bs.push([ty*N[2]-tz*N[1],tz*N[0]-tx*N[2],tx*N[1]-ty*N[0]]);}
  const tw=R()*6.2832;
  for(let k=0;k<m;k++){const P=pts[k],r=rs[k],Nn=Ns[k],B=Bs[k],sw=sw0+(sw1-sw0)*k/Math.max(1,m-1),sh=.74+.26*Math.min(1,Math.max(0,(P[1]+.3)/3.5));
    for(let j=0;j<n;j++){const a=tw+j/n*6.2832,ca=Math.cos(a),sa=Math.sin(a),jr=r*(1+(R()-.5)*.14),v=.93+R()*.12;
      trwV(g,P[0]+(Nn[0]*ca+B[0]*sa)*jr,P[1]+(Nn[1]*ca+B[1]*sa)*jr,P[2]+(Nn[2]*ca+B[2]*sa)*jr,[bark[0]*sh*v,bark[1]*sh*v,bark[2]*sh*v],sw);}}
  /* the sides (a-b-c, a-c-d face outwards: b is the next corner round the tube, d the next ring) and the tip */
  for(let k=0;k<m-1;k++)for(let j=0;j<n;j++){const a=base+k*n+j,b=base+k*n+(j+1)%n,c=b+n,d=a+n;g.i.push(a,b,c,a,c,d);}
  const L=pts[m-1],rl=rs[m-1],tip=trwV(g,L[0]+T[0]*rl*1.3,L[1]+T[1]*rl*1.3,L[2]+T[2]*rl*1.3,[bark[0]*.9,bark[1]*.9,bark[2]*.9],sw1);
  for(let j=0;j<n;j++)g.i.push(base+(m-1)*n+j,base+(m-1)*n+(j+1)%n,tip);}
/* a clump of leaves: the icosphere of detail det, stretched to rx, ry, rz, its corners jittered, its underside flattened (flat: from how far below
   the middle, as a part of ry); coloured col, darker below and on the side that faces the middle of the crown (cc) */
function trwClump(g,cx,cy,cz,rx,ry,rz,det,col,R,cc,sw,flat){const I=trwIco(det),v=I.v,f=I.f,base=g.p.length/3,yaw=R()*6.2832,cw=Math.cos(yaw),sw2=Math.sin(yaw),jt=det?.12:.08;
  let ox=cx-cc[0],oy=(cy-cc[1])*.6,oz=cz-cc[2];const ol=Math.hypot(ox,oy,oz);if(ol>1e-6){ox/=ol;oy/=ol;oz/=ol;}else{oy=1;}
  for(let i=0;i<v.length;i+=3){const ux=v[i],uy=v[i+1],uz=v[i+2],j=1+(R()-.5)*2*jt;let x=ux*rx*j,y=uy*ry*j,z=uz*rz*j;
    if(flat!=null&&y<-flat*ry)y=-flat*ry+(y+flat*ry)*.22;
    const X=x*cw-z*sw2,Z=x*sw2+z*cw,dn=Math.hypot(X,y,Z)||1,face=(X*ox+y*oy+Z*oz)/dn;
    const s=(.6+.4*Math.min(1,Math.max(0,(uy+.75)/1.5)))*(.84+.16*(face*.5+.5))*(uy>.55?1.05:1)*(.96+R()*.08);
    trwV(g,cx+X,cy+y,cz+Z,[col[0]*s,col[1]*s,col[2]*s],Math.min(1,sw+.12*uy));}
  for(let k=0;k<f.length;k++)g.i.push(base+f[k]);}
/* a bough from S: azimuth az, el from the vertical, len, rising towards its end by bend (a part of len), with a little wiggle; k points */
function trwBough(S,az,el,len,bend,R,k){const dx=Math.sin(el)*Math.cos(az),dy=Math.cos(el),dz=Math.sin(el)*Math.sin(az),out=[];k=k||4;
  for(let i=0;i<k;i++){const t=i/(k-1),w=i&&i<k-1?(R()-.5)*.12*len:0;out.push([S[0]+dx*len*t+w*-dz,S[1]+dy*len*t+bend*len*t*t,S[2]+dz*len*t+w*dx]);}return out;}
const trwTaper=(n,a,b)=>{const o=[];for(let i=0;i<n;i++)o.push(a+(b-a)*i/(n-1));return o;};
/* ---------- the kinds: a plan of tubes (pts, radii, sides, level, sway) and clumps (centre, radii, colour, flat underside) ---------- */
function trwPlan(kind,R){const P={kind,tubes:[],clumps:[]},LS=TRW.leaf[kind],hue=(R()-.5)*.07,lt=1+(R()-.5)*.12,
    L=LS.map(c=>[c[0]*lt*(1+hue),c[1]*lt,c[2]*lt*(1-hue*.6)]),bk=TRW.bark[kind],bv=.92+R()*.16,bark=[bk[0]*bv,bk[1]*bv,bk[2]*bv];P.bark=bark;P.L=L;
  const tube=(pts,rs,n,lv,s0,s1)=>P.tubes.push({pts,rs,n,lv,s0,s1});
  const clump=(c,r,sq,col,flat,lv)=>P.clumps.push({c,r:[r,r*sq,r*(.9+R()*.2)],col,flat,lv:lv||0});
  const shade=(y,y0,y1)=>{const t=(y-y0)/Math.max(.1,y1-y0),q=t+(R()-.5)*.3;return q<.38?L[0]:q<.72?L[1]:L[2];};
  const lean=[(R()-.5)*.7,(R()-.5)*.7];let H,r0,CC,CR;
  if(kind==='round'){H=trwRnd(R,6.8,8.6);r0=trwRnd(R,.2,.27);const Hf=H*trwRnd(R,.38,.47),F=[lean[0],Hf,lean[1]];
    tube([[0,-1.2,0],[0,0,0],[lean[0]*.35,Hf*.5,lean[1]*.35],F],[r0*1.3,r0*1.2,r0,r0*.8],7,0,0,.15);
    CC=[F[0]*1.3,Hf+(H-Hf)*.5,F[2]*1.3];CR=[trwRnd(R,2.4,3.1),(H-Hf)*.5,trwRnd(R,2.4,3.1)];
    const nb=2+Math.floor(R()*2.3),a0=R()*6.2832;
    for(let b=0;b<nb;b++){const az=a0+b*6.2832/nb+(R()-.5)*.6,pts=trwBough(F,az,trwRnd(R,.45,.75),(H-Hf)*trwRnd(R,.55,.72),.28,R);
      tube(pts,trwTaper(4,r0*.62,r0*.2),5,1,.15,.45);const T=pts[3];clump([T[0],T[1]+.3,T[2]],trwRnd(R,1.25,1.6),trwRnd(R,.78,.9),shade(T[1],CC[1]-CR[1],CC[1]+CR[1]),.45);}
    const nf=5+Math.floor(R()*3),rot=R()*6.2832;
    for(let i=0;i<nf;i++){const y=1-(i+.5)/nf*1.45,rr=Math.sqrt(Math.max(0,1-y*y)),a=rot+i*2.39996,p=[CC[0]+Math.cos(a)*rr*CR[0]*.66,CC[1]+y*CR[1]*.6,CC[2]+Math.sin(a)*rr*CR[2]*.66];
      clump(p,trwRnd(R,1.15,1.55),trwRnd(R,.8,.92),shade(p[1],CC[1]-CR[1],CC[1]+CR[1]),.5);}
    clump([CC[0],CC[1]+CR[1]*.62,CC[2]],trwRnd(R,1.2,1.45),.85,L[2],.5);
    for(let t=0,nt=Math.floor(R()*2.2);t<nt;t++){const S=[lean[0]*.6,Hf*trwRnd(R,.62,.86),lean[1]*.6],pts=trwBough(S,R()*6.2832,trwRnd(R,.9,1.2),trwRnd(R,.9,1.3),.2,R,3);
      tube(pts,trwTaper(3,r0*.28,r0*.12),4,2,.2,.4);const T=pts[2];clump(T,trwRnd(R,.5,.7),.85,L[1],.4,2);}}
  else if(kind==='oak'){H=trwRnd(R,7.8,9.8);r0=trwRnd(R,.36,.46);const Hf=H*trwRnd(R,.3,.36),F=[lean[0]*.6,Hf,lean[1]*.6];
    tube([[0,-1.2,0],[0,0,0],[0,.45,0],[F[0]*.5,Hf*.6,F[2]*.5],F],[r0*1.65,r0*1.55,r0*1.15,r0,r0*.88],7,0,0,.12);
    for(let i=0,nr=4,ra=R()*6.2832;i<nr;i++){const a=ra+i*6.2832/nr+(R()-.5)*.5,c=Math.cos(a),s=Math.sin(a);tube([[c*r0*.7,.42,s*r0*.7],[c*r0*1.5,.08,s*r0*1.5],[c*r0*2.3,-.35,s*r0*2.3]],[r0*.42,r0*.3,r0*.14],4,2,0,0);}
    CC=[F[0],Hf+(H-Hf)*.52,F[2]];CR=[trwRnd(R,4.2,5.2),(H-Hf)*.42,trwRnd(R,4.2,5.2)];
    const nb=4+Math.floor(R()*1.6),a0=R()*6.2832;
    for(let b=0;b<nb;b++){const az=a0+b*6.2832/nb+(R()-.5)*.5,len=trwRnd(R,3.6,4.8),pts=trwBough(F,az,trwRnd(R,.78,1.05),len,.34,R);
      tube(pts,trwTaper(4,r0*.6,r0*.18),6,1,.12,.45);const T=pts[3];clump([T[0],T[1]+.35,T[2]],trwRnd(R,1.7,2.15),trwRnd(R,.72,.84),shade(T[1],CC[1]-CR[1],CC[1]+CR[1]),.45);
      const M=pts[2],sp=trwBough(M,az+(R()<.5?-1:1)*trwRnd(R,.5,.8),trwRnd(R,.45,.75),len*.45,.3,R,3);tube(sp,trwTaper(3,r0*.3,r0*.1),4,2,.3,.55);
      const T2=sp[2];clump([T2[0],T2[1]+.3,T2[2]],trwRnd(R,1.3,1.65),trwRnd(R,.75,.86),shade(T2[1],CC[1]-CR[1],CC[1]+CR[1]),.45,1);}
    const nf=6+Math.floor(R()*3),rot=R()*6.2832;
    for(let i=0;i<nf;i++){const y=1-(i+.5)/nf*1.2,rr=Math.sqrt(Math.max(0,1-y*y)),a=rot+i*2.39996,p=[CC[0]+Math.cos(a)*rr*CR[0]*.55,CC[1]+y*CR[1]*.62,CC[2]+Math.sin(a)*rr*CR[2]*.55];
      clump(p,trwRnd(R,1.6,2.05),trwRnd(R,.74,.86),shade(p[1],CC[1]-CR[1],CC[1]+CR[1]),.5);}
    clump([CC[0],CC[1]+CR[1]*.7,CC[2]],trwRnd(R,1.7,2),.8,L[2],.5);}
  else if(kind==='tall'){H=trwRnd(R,10.5,13);r0=trwRnd(R,.24,.3);const l0=lean[0]*.6,l1=lean[1]*.6;
    tube([[0,-1.2,0],[0,0,0],[l0*.2,H*.4,l1*.2],[l0*.4,H*.72,l1*.4],[l0*.5,H*.88,l1*.5]],[r0*1.25,r0*1.15,r0*.85,r0*.55,r0*.3],6,0,0,.3);
    CC=[l0*.4,H*.66,l1*.4];CR=[trwRnd(R,1.9,2.4),H*.3,trwRnd(R,1.9,2.4)];
    const ns=4+Math.floor(R()*3),a0=R()*6.2832;
    for(let b=0;b<ns;b++){const t=.38+.42*b/Math.max(1,ns-1),S=[l0*t*.55,H*t,l1*t*.55],az=a0+b*2.39996,pts=trwBough(S,az,trwRnd(R,.5,.8),trwRnd(R,1.1,1.7),.25,R,3);
      tube(pts,trwTaper(3,r0*.42,r0*.14),4,1,.2,.45);const T=pts[2];clump(T,trwRnd(R,1.0,1.35),trwRnd(R,.85,.95),shade(T[1],CC[1]-CR[1],CC[1]+CR[1]),.5);}
    const nf=5+Math.floor(R()*3),rot=R()*6.2832;
    for(let i=0;i<nf;i++){const t=(i+.5)/nf,y=-.78+1.55*t,rr=Math.sqrt(Math.max(0,1-y*y))*.5,a=rot+i*2.39996,p=[CC[0]+Math.cos(a)*rr*CR[0],CC[1]+y*CR[1],CC[2]+Math.sin(a)*rr*CR[2]];
      clump(p,trwRnd(R,1.1,1.5)*(1-.25*Math.abs(y)),trwRnd(R,.85,.95),shade(p[1],CC[1]-CR[1],CC[1]+CR[1]),.5);}
    clump([CC[0],CC[1]+CR[1]*.88,CC[2]],trwRnd(R,1.0,1.2),.95,L[2],.5);}
  else if(kind==='umbr'){H=trwRnd(R,9,11.5);r0=trwRnd(R,.2,.25);const b0=(R()-.5)*1.4,b1=(R()-.5)*1.4,Hf=H*trwRnd(R,.52,.6),F=[b0*.5,Hf,b1*.5],M=[-b0*.3,H*.4,-b1*.3];
    tube([[0,-1.2,0],[0,0,0],[b0*.6,H*.22,b1*.6],M,F,[F[0]+b0*.2,H*.78,F[2]+b1*.2]],[r0*1.25,r0*1.15,r0,r0*.9,r0*.75,r0*.45],6,0,0,.25);
    const pads=[];const nb=3+Math.floor(R()*1.8),a0=R()*6.2832;
    for(let b=0;b<nb;b++){const S=b===0?M:F,az=a0+b*6.2832/nb+(R()-.5)*.5,len=trwRnd(R,2.6,3.8)*(b===0?.85:1),pts=trwBough(S,az,trwRnd(R,.6,.95),len,.42,R);
      tube(pts,trwTaper(4,r0*.62,r0*.2),5,1,.2,.55);const T=pts[3];pads.push([T[0],T[1]+.35,T[2],trwRnd(R,2.0,2.8)]);}
    const top=[F[0]+b0*.2,H*.8,F[2]+b1*.2];pads.push([top[0],top[1]+.3,top[2],trwRnd(R,2.0,2.6)]);
    let y0=1e9,y1=-1e9;for(const p of pads){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
    for(const p of pads)P.clumps.push({c:[p[0],p[1],p[2]],r:[p[3],p[3]*trwRnd(R,.36,.46),p[3]*trwRnd(R,.85,1.08)],col:shade(p[1],y0-.5,y1+.5),flat:.3,lv:0});
    for(let t=0,nt=1+Math.floor(R()*1.6);t<nt;t++){const S=[b0*.4,H*trwRnd(R,.3,.45),b1*.4],pts=trwBough(S,R()*6.2832,trwRnd(R,.95,1.2),trwRnd(R,1.2,1.7),.3,R,3);
      tube(pts,trwTaper(3,r0*.35,r0*.12),4,2,.25,.5);const T=pts[2];const r=trwRnd(R,1.1,1.5);P.clumps.push({c:[T[0],T[1]+.2,T[2]],r:[r,r*.45,r],col:L[0],flat:.3,lv:1});}
    let sx=0,sy=0,sz=0;for(const p of pads){sx+=p[0];sy+=p[1];sz+=p[2];}CC=[sx/pads.length,sy/pads.length,sz/pads.length];let ex=0;for(const p of pads)ex=Math.max(ex,Math.hypot(p[0]-CC[0],p[2]-CC[2])+p[3]);CR=[ex,(y1-y0)/2+1,ex];}
  else{H=trwRnd(R,3.6,5);r0=trwRnd(R,.08,.12);const l0=lean[0]*.5,l1=lean[1]*.5;
    tube([[0,-1,0],[0,0,0],[l0*.3,H*.4,l1*.3],[l0*.6,H*.7,l1*.6]],[r0*1.25,r0*1.2,r0*.85,r0*.5],5,0,0,.3);
    CC=[l0*.6,H*.74,l1*.6];CR=[1.4,1.2,1.4];clump([CC[0],H*.8,CC[2]],trwRnd(R,.9,1.2),trwRnd(R,.82,.92),L[2],.5);
    for(let i=0,nc=1+Math.floor(R()*2.6),a0=R()*6.2832;i<nc;i++){const a=a0+i*2.2,p=[CC[0]+Math.cos(a)*.55,H*trwRnd(R,.55,.72),CC[2]+Math.sin(a)*.55];clump(p,trwRnd(R,.7,1),trwRnd(R,.82,.92),i?L[0]:L[1],.5);}
    if(R()<.6){const S=[l0*.4,H*.45,l1*.4],pts=trwBough(S,R()*6.2832,trwRnd(R,.8,1.1),trwRnd(R,.6,.9),.25,R,3);tube(pts,trwTaper(3,r0*.5,r0*.2),4,1,.2,.4);clump(pts[2],trwRnd(R,.5,.7),.85,L[1],.4,1);}}
  P.H=H;P.r0=r0;P.CC=CC;P.CR=CR;return P;}
/* the three levels of a plan */
function trwLevels(P,R){const out=[];
  /* L0: every tube (trunk 7, boughs 5-6, twigs 4 sides), every clump from the 80-facet ball */
  {const g=trwGB();for(const t of P.tubes)trwTube(g,t.pts,t.rs,t.n,P.bark,t.s0,t.s1,R);for(const c of P.clumps)trwClump(g,c.c[0],c.c[1],c.c[2],c.r[0],c.r[1],c.r[2],1,c.col,R,P.CC,c.lv?.5:.62,c.flat);out.push(g);}
  /* L1: the trunk and the boughs (4-5 sides), the same clumps (all but the twigs') from the 20-facet ball - the crown keeps its outline, only its facets get bigger */
  {const g=trwGB();for(const t of P.tubes)if(t.lv<=1)trwTube(g,t.pts,t.rs,t.lv?4:5,P.bark,t.s0,t.s1,R);
    for(const c of P.clumps)if(c.lv<=1)trwClump(g,c.c[0],c.c[1],c.c[2],c.r[0]*1.05,c.r[1]*1.05,c.r[2]*1.05,0,c.col,R,P.CC,.62,c.flat);out.push(g);}
  /* L2: a three-sided trunk from 2.5 m in the ground up into the crown (it never floats where the coarse far terrain lies lower); the crown as its three
     biggest clumps from the 20-facet ball, a fifth bigger to make up for the rest (two for a young tree) */
  {const g=trwGB(),T0=P.tubes[0],top=T0.pts[T0.pts.length-1];trwTube(g,[[0,-2.5,0],[top[0],Math.max(top[1],P.CC[1]),top[2]]],[P.r0*1.3,P.r0*.8],3,P.bark,0,0,R);
    const cs=P.clumps.filter(c=>c.lv<=1).sort((a,b)=>b.r[0]*b.r[1]*b.r[2]-a.r[0]*a.r[1]*a.r[2]).slice(0,P.kind==='young'?2:3),k=P.kind==='umbr'?1.1:1.22;
    for(const c of cs)trwClump(g,c.c[0],c.c[1],c.c[2],c.r[0]*k,c.r[1]*(P.kind==='umbr'?1.15:k),c.r[2]*k,0,c.col,R,P.CC,0,c.flat);out.push(g);}
  /* L3 (the far middle, beyond TRW.RA): the trunk and boughs (3 sides), the clumps merged into a few blobs that fill the crown's outline (the two closest
     groups merged until there are as many as the kind keeps): about half of L1 */
  {const g=trwGB();for(const t of P.tubes)if(t.lv<=1)trwTube(g,t.pts,t.rs,3,P.bark,t.s0,t.s1,R);
    const K={round:6,oak:7,tall:5,umbr:5,young:2}[P.kind];let G=P.clumps.filter(c=>c.lv<=1).map(c=>({m:[c],c:c.c.slice(),r:c.r.slice(),v:c.r[0]*c.r[1]*c.r[2],col:c.col.slice(),flat:c.flat}));
    const fit=m=>{let v=0,cx=0,cy=0,cz=0,cr=0,cg=0,cb=0,fl=0;for(const q of m){const w=q.r[0]*q.r[1]*q.r[2];v+=w;cx+=q.c[0]*w;cy+=q.c[1]*w;cz+=q.c[2]*w;cr+=q.col[0]*w;cg+=q.col[1]*w;cb+=q.col[2]*w;fl+=(q.flat||0)*w;}
      const c=[cx/v,cy/v,cz/v],r=[0,0,0];for(const q of m)for(let a=0;a<3;a++)r[a]=Math.max(r[a],Math.abs(q.c[a]-c[a])+q.r[a]*.92);return{m,c,r,v,col:[cr/v,cg/v,cb/v],flat:fl/v};};
    while(G.length>K){let bi=0,bj=1,bd=1e9;for(let i=0;i<G.length;i++)for(let j=i+1;j<G.length;j++){const d=Math.hypot(G[i].c[0]-G[j].c[0],(G[i].c[1]-G[j].c[1])*1.3,G[i].c[2]-G[j].c[2])-(G[i].r[0]+G[j].r[0])*.5;if(d<bd){bd=d;bi=i;bj=j;}}
      const f=fit(G[bi].m.concat(G[bj].m));G.splice(bj,1);G[bi]=f;}
    for(const q of G)trwClump(g,q.c[0],q.c[1],q.c[2],q.r[0],q.r[1],q.r[2],0,q.col,R,P.CC,0,q.flat);out.push(g);}
  return out.map(g=>({p:new Float32Array(g.p),c:Uint8Array.from(g.c,v=>Math.max(0,Math.min(255,Math.round(v*255)))),s:Uint8Array.from(g.s,v=>Math.round(Math.max(0,Math.min(1,v))*255)),i:new Uint16Array(g.i),nv:g.p.length/3,ni:g.i.length}));}
/* the templates: kind k, variant v at TRW.tpl[k*TRW.V+v] - {kind, L:[L0,L1,L2], H, r0 (trunk radius at the foot), cr (the crown's radius), geo (L0 as a geometry)} */
function trwTemplates(){if(TRW.tpl)return TRW.tpl;const out=[];
  for(let k=0;k<TRW.K.length;k++)for(let v=0;v<TRW.V;v++){const R=wnRng(wnHashI(k*31+7,v*17+3,5381)),P=trwPlan(TRW.K[k],R),L=trwLevels(P,R);
    out.push({kind:TRW.K[k],k,v,L,H:P.H,r0:P.r0*(P.kind==='oak'?1.55:1.2),cr:Math.max(P.CR[0],P.CR[2]),geo:null});}
  return TRW.tpl=out;}
/* a level of a template as a three.js geometry (colour and sway normalised bytes) */
function trwGeo(l){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(l.p,3));g.setAttribute('color',new THREE.BufferAttribute(l.c,3,true));
  g.setAttribute('aSw',new THREE.BufferAttribute(l.s,1,true));g.setIndex(new THREE.BufferAttribute(l.i,1));g.computeBoundingSphere();return g;}
/* ---------- the materials ---------- */
const TRW_PARS=`
#ifdef TRW_SWAY
attribute float aSw;
#endif
#ifdef TRW_MID
attribute vec2 aC;
#endif
uniform vec3 uEye;uniform float uR0;uniform float uRS;uniform float uT;
`;
const TRW_VTX=`
#if defined(TRW_NEAR)||defined(TRW_MID)
#ifdef TRW_NEAR
vec2 trC=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xz;
#else
vec2 trC=aC;
#endif
float trD=distance(trC,uEye.xz);
#endif
#ifdef TRW_SWAY
{float trP=dot(trC,vec2(.071,.053)),trS=aSw*aSw;transformed.x+=trS*(.09*sin(uT*1.21+trP)+.035*sin(uT*2.63+trP*2.1));transformed.z+=trS*(.07*cos(uT*1.03+trP*1.3));}
#endif
#ifdef TRW_DEPTH
#ifdef TRW_NEAR
if(trD>uRS)transformed=vec3(0.);
#endif
#ifdef TRW_MID
if(trD<uRS)transformed=vec3(0.);
#endif
#else
#ifdef TRW_NEAR
if(trD>uR0)transformed=vec3(0.);
#endif
#ifdef TRW_MID
if(trD<uR0)transformed=vec3(0.);
#endif
#endif
`;
function trwMats(){if(TRW.mats)return TRW.mats;const U=TRW.U;
  const mk=(defs,depth)=>{const m=depth?new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}):new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:3,specular:0x0b0b0b});
    m.defines=Object.assign({},defs);const key='trw'+Object.keys(defs).join('')+(depth?'D':'');
    m.onBeforeCompile=sh=>{sh.uniforms.uEye=U.uEye;sh.uniforms.uR0=U.uR0;sh.uniforms.uRS=U.uRS;sh.uniforms.uT=U.uT;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+TRW_PARS).replace('#include <begin_vertex>','#include <begin_vertex>\n'+TRW_VTX);};
    m.customProgramCacheKey=()=>key;return m;};
  return TRW.mats={near:mk({TRW_NEAR:1,TRW_SWAY:1}),mid:mk({TRW_MID:1,TRW_SWAY:1}),far:mk({}),nearD:mk({TRW_NEAR:1,TRW_DEPTH:1},true),midD:mk({TRW_MID:1,TRW_DEPTH:1},true)};}
/* =====================================================================================================
   WHERE THEY GROW (trwPlace): a tile of the level-0 lattice (128 m) is 18 x 18 cells of 7.1 m with one try each, at a jittered point, from the
   cell's own seeded stream (nothing is drawn from the world's stream: the world is the same with or without trees). Only the world's own
   functions are read - the slow fields (the forest overlay wgForest, the region weights), the height (wgH0 + the streams and lakes, wgHydroApply)
   on the cell corners for the slope - so a tile's trees are the same whether it is near or 3 km off, made first or last: none pops in or out
   as the player walks. The chance a cell holds a tree: 1.4 % in the open (lone trees), up to 71 % deep in a forest (a tree every 8.5 m or so);
   a little fewer in the highlands and none high on their mountains, a little fewer on the plateau and in the elderglade, fewer as the ground
   steepens (none past a slope of .72 on the cell's corners, nor within 3 m of a drop, nor where the drawn ground under the trunk is steeper
   than 0.7 - 35 degrees, the rock look); none in water (a stream, a lake, a sinkhole's pool, the sea), within 5 m of a stream's channel or on the summit of a Great Elder
   mountain (fewer on its flanks). Every tree is TRW.SC (1.25) times its model, by the scale of the land and the hero. The kind: deep in a forest round, oak and tall trees with young ones (hardly an umbrella), young trees and umbrellas towards the
   edges, the broad umbrellas and oaks standing alone in the open; the elderglade has more round and tall ones, the plateau more umbrellas,
   the highlands a few more young ones; and a slow field makes stands where round, oak or tall trees lead.
   KEPT CLEAR (trwExclude, looked at again whenever villages or roads are added): the keep (72 m) and its approach, every village's ground and
   28 m round it, 6.5 m round every road, and the line where a stone ring or an arch stands. The villages (and the rings, wfSite) round a tile
   are worked out before its trees are kept or dropped - one village a frame (trwSiteMissing; one costs 5-60 ms) - so no tree ever stands
   where a village appears a moment later, whatever was loaded first. Roads are worked out by the game within 1.5 km of the player: a tile
   within TRW.RR (1.2 km) of it waits until the roads round it are known (trwRoadsKnown, from what is cached: it never makes them), so the
   trees near the player are the same on every visit; a far tile uses the roads known so far and is looked at again as more are made (a far
   tree on a road not yet worked out goes when the road is made, a kilometre or more off).
   ===================================================================================================== */
const TRW_N=18,TRW_F=8;/* (a tree: x, z, height, template, scale, turn, rank (which ones the far tiles keep), brightness) */
Object.assign(TRW,{SC:1.25,R0:60,RS:40,RA:120,R1:320,RR:1200,HY:32,MAX:3200,PR:240,
  /* the far tiles: up to this distance keep this part of the trees, each this much bigger (so the land stays as wooded) */
  FAR:[[700,1,1],[1300,.6,1.2],[1e9,.36,1.45]],LV:{low:{r0:45,r1:220,k:.6},medium:{r0:55,r1:270,k:.8},high:{r0:60,r1:320,k:1},ultra:{r0:70,r1:480,k:1}},
  tiles:new Map(),live:new Set(),q:[],near:null,ver:-1,scanAt:null,frame:0,
  stats:{placed:0,placeMs:0,built:0,buildMs:0,trees:0,tris:0,near:0,props:0,cut:0}});
const _trwSN={};
function trwPlace(ti,tk){const S=WG_CFG.tile,n=TRW_N,cs=S/n,x0=ti*S,z0=tk*S,seed=WG.seed|0,t0=performance.now(),n1=n+1;
  const c=wgCtx(x0-cs,z0-cs,x0+S+cs,z0+S+cs,0),H=wgHydroIn(x0,z0,x0+S,z0+S),o={mtn:0,tier:0,isl:0,sink:null},ho={},W=new Float64Array(12),NS=WG.N[14],hc=new Float32Array(n1*n1);
  /* the ground (with the streams' valleys and banks carved) on the cell corners, for the slope */
  const HG=(x,z)=>{o.mtn=0;o.tier=0;o.isl=0;o.sink=null;wgHydroApply(x,z,wgH0(x,z,o,c),H,ho);return ho.h;};
  for(let k=0;k<=n;k++)for(let i=0;i<=n;i++)hc[k*n1+i]=HG(x0+i*cs,z0+k*cs);
  const G=typeof wgGreatNear==='function'?wgGreatNear(x0+S/2,z0+S/2):null,L=[],LH=new Map();/* (LH: the drawn lattice's points already sampled) */
  for(let k=0;k<n;k++)for(let i=0;i<n;i++){const gi=ti*n+i,gk=tk*n+k,R=wnRng(wnHashI(gi,gk,seed+907)),x=x0+(i+.12+.76*R())*cs,z=z0+(k+.12+.76*R())*cs,roll=R();
    if(roll>=.72)continue;/* (no cell's chance is higher) */
    wgFields(c,x,z,W);const w1=W[1],w2=W[2],w3=W[3],f=W[5];let p=.014+.7*f;if(roll>=p)continue;
    const q=k*n1+i,sl=Math.max(Math.abs(hc[q+1]-hc[q]),Math.abs(hc[q+n1]-hc[q]),Math.abs(hc[q+n1+1]-hc[q+1]),Math.abs(hc[q+n1+1]-hc[q+n1]))/cs;if(sl>.72)continue;
    o.mtn=0;o.tier=0;o.isl=0;o.sink=null;const h0=wgH0(x,z,o,c),sink=o.sink&&o.w2>.95?o.sink:-1e9;/* (a sinkhole's pool on the plateau: water, as wgGrid makes it) */
    p*=(1-wnS(sl,.44,.72))*(1-.15*w1)*(1-w1*wnS(o.mtn,25,90))*(1-.1*w2)*(1-.25*w3);
    if(G){const gq=wgGreatQ(G,x,z);if(gq<.5)continue;if(gq<1.05)p*=.4;}
    if(roll>=p)continue;
    wgHydroApply(x,z,h0,H,ho);const h=ho.h;if(ho.chan||ho.wl>h-.9||sink>h-1.6||h<WG_CFG.WL+1.2)continue;/* (a margin: on a steep shore the drawn ground lies up to half a metre lower) */
    /* no tree within 5 m of a stream's channel (its ribbon and the ground's water band reach 2.2 m past it, the drawn 2 m lattice a little more), nor within 3 m of a drop
       the corner lattice misses, nor where the drawn ground under the trunk is steep: the four cells of the drawn ground's 2 m lattice round the trunk, from the same
       function at the same points (a narrow notch or step the 3 m ring steps over is spread over these cells) */
    {let wet=false;for(const sg of H.segs){if(x<sg.x0-14||x>sg.x1+14||z<sg.z0-14||z>sg.z1+14)continue;const o2=wgSegNear(sg,x,z,_trwSN);if(o2.d<o2.hw+5){wet=true;break;}}if(wet)continue;}
    {let steep=false;for(let a=0;a<8&&!steep;a++){const an=a*.7854,hs=HG(x+Math.cos(an)*3,z+Math.sin(an)*3);if(Math.abs(hs-h)>2.16)steep=true;}if(steep)continue;}/* (a drop within 3 m any way: a cliff's edge, a steep bank) */
    {const ci=Math.round((x-x0)/2),ck=Math.round((z-z0)/2),L=[];for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const key=(ck+b)*1000+ci+a;let v=LH.get(key);if(v===undefined){v=HG(x0+(ci+a)*2,z0+(ck+b)*2);LH.set(key,v);}L.push(v);}
      let st=0;for(let b=0;b<2;b++)for(let a=0;a<2;a++){const q=b*3+a,gx=(L[q+1]-L[q]+L[q+4]-L[q+3])/4,gz=(L[q+3]-L[q]+L[q+4]-L[q+1])/4;st=Math.max(st,Math.hypot(gx,gz),Math.abs(L[q+1]-L[q])/2,Math.abs(L[q+3]-L[q])/2,Math.abs(L[q+4]-L[q+1])/2,Math.abs(L[q+4]-L[q+3])/2);}if(st>.7)continue;}/* (rock look: no tree where the drawn ground under it is steeper than 35 degrees - its slope, any way) */
    const st=wnN(NS,x/310+17.3,z/310-8.1)*.5+.5,dom=Math.min(2,Math.floor(st*3)),w=f>.7?[.32,.28,.22,.04,.14]:f>.2?[.3,.18,.12,.12,.28]:[.25,.3,.1,.3,.05];
    w[dom]*=2.4;w[2]*=(1+.5*w3)*(1-.25*w1);w[0]*=1+.3*w3;w[3]*=Math.max(.1,1-.5*w3+.6*w2);w[1]*=1+.2*w2;w[4]*=1+.3*w1;
    let tot=w[0]+w[1]+w[2]+w[3]+w[4],r=R()*tot,kd=0;while(kd<4&&r>=w[kd]){r-=w[kd];kd++;}
    const vr=Math.min(TRW.V-1,Math.floor(R()*TRW.V)),sc=TRW.SC*(kd===4?.8+.45*R():.84+.32*R())*(f<.2?1.08:1),rot=R()*6.2832,rank=R(),br=R();
    L.push(x,z,h,kd*TRW.V+vr,sc,rot,rank,br);}
  /* the tile's tint from its region: the elderglade lusher, the highlands darker, the plateau warmer */
  wgFields(c,x0+S/2,z0+S/2,W);const tint=[1+.04*W[2]-.05*W[3]-.08*W[1],1+.04*W[3]-.06*W[1],1+.06*W[3]-.05*W[2]-.06*W[1]];
  TRW.stats.placed++;TRW.stats.placeMs+=performance.now()-t0;return{n:L.length/TRW_F,a:new Float32Array(L),tint};}
/* kept clear: out[j] = 1 where a tree may not stand (2: cut down, stays so). The villages round the tile are worked out before (trwSiteMissing), so this never depends on what
   was known; the roads are those known (near the player all of them: trwRoadsKnown) */
function trwExclude(T){const a=T.a,n=T.n,F=TRW_F,S=WG_CFG.tile,x0=T.ti*S,z0=T.tk*S,out=T.out&&T.out.length===n?T.out:(T.out=new Uint8Array(n));let prov=false;
  for(let j=0;j<n;j++)if(out[j]!==2)out[j]=0;
  const K=OW.keep;if(K)for(let j=0;j<n;j++){const dx=a[j*F]-K.x,dz=a[j*F+1]-K.z;if(dx*dx+dz*dz<72*72)out[j]=out[j]||1;}
  if(OW.corridor)for(const p of OW.corridor){if(p[0]<x0-12||p[0]>x0+S+12||p[1]<z0-12||p[1]>z0+S+12)continue;for(let j=0;j<n;j++){const dx=a[j*F]-p[0],dz=a[j*F+1]-p[1];if(dx*dx+dz*dz<144)out[j]=out[j]||1;}}
  {const C=WS_CFG.cell,M=200;for(let b=Math.floor((z0-M)/C);b<=Math.floor((z0+S+M)/C);b++)for(let c=Math.floor((x0-M)/C);c<=Math.floor((x0+S+M)/C);c++){const key=wgKey(c,b);
    const s=WS.sites.has(key)?WS.sites.get(key):wsSite(c,b);if(!s)continue;const rr=s.fr+28;if(s.x+rr<x0||s.x-rr>x0+S||s.z+rr<z0||s.z-rr>z0+S)continue;
    for(let j=0;j<n;j++){const dx=a[j*F]-s.x,dz=a[j*F+1]-s.z;if(dx*dx+dz*dz<rr*rr)out[j]=out[j]||1;}}}
  const rh=WS.rh;if(rh&&rh.size){const r=6.5;for(let j=0;j<n;j++){if(out[j])continue;const x=a[j*F],z=a[j*F+1];let hit=false;
    for(let gx=Math.floor((x-r)/8);gx<=Math.floor((x+r)/8)&&!hit;gx++)for(let gz=Math.floor((z-r)/8);gz<=Math.floor((z+r)/8)&&!hit;gz++){const Lq=rh.get(gx+','+gz);if(!Lq)continue;
      for(let q=0;q<Lq.length;q+=2){const p=Lq[q].pts[Lq[q+1]];if((p[0]-x)*(p[0]-x)+(p[1]-z)*(p[1]-z)<r*r){hit=true;break;}}}if(hit)out[j]=1;}}
  {const FC=WF.cell,M=180;for(let b=Math.floor((z0-M)/FC);b<=Math.floor((z0+S+M)/FC);b++)for(let c=Math.floor((x0-M)/FC);c<=Math.floor((x0+S+M)/FC);c++){const f=wfSite(c,b);if(!f)continue;
    const ca=Math.cos(f.yaw),sa=Math.sin(f.yaw),hl=f.R+6,wd=f.th*.6+7;for(let j=0;j<n;j++){if(out[j])continue;const dx=a[j*F]-f.x,dz=a[j*F+1]-f.z,u=dx*ca+dz*sa,v=-dx*sa+dz*ca;if(Math.abs(u)<hl&&Math.abs(v)<wd)out[j]=1;}}}
  let sum=0;for(let j=0;j<n;j++)if(out[j])sum=(sum*31+j+1)|0;T.sum=sum;return prov;}
/* the first village cell within 200 m of a tile not worked out yet, or null */
function trwSiteMissing(T){const S=WG_CFG.tile,x0=T.ti*S,z0=T.tk*S,C=WS_CFG.cell,M=200;
  for(let b=Math.floor((z0-M)/C);b<=Math.floor((z0+S+M)/C);b++)for(let c=Math.floor((x0-M)/C);c<=Math.floor((x0+S+M)/C);c++)if(!WS.sites.has(wgKey(c,b)))return[c,b];return null;}
/* are the roads round a tile all known? (the villages within a cell of it, as wsReady asks, but only from what is cached - it never works anything out) */
function trwRoadsKnown(T){const S=WG_CFG.tile,x0=T.ti*S,z0=T.tk*S,C=WS_CFG.cell,ok=(s,o)=>WS.roads.has(wsEdgeKey(s,o));
  for(let b=Math.floor((z0-C)/C);b<=Math.floor((z0+S+C)/C);b++)for(let c=Math.floor((x0-C)/C);c<=Math.floor((x0+S+C)/C);c++){const key=wgKey(c,b);if(!WS.sites.has(key))return false;const s=WS.sites.get(key);if(!s)continue;
    if(!s.near)return false;for(const o of s.near)if(!ok(s,o))return false;
    for(let db=-1;db<=1;db++)for(let da=-1;da<=1;da++){if(!da&&!db)continue;const k2=wgKey(s.a+da,s.b+db);if(!WS.sites.has(k2))return false;const o=WS.sites.get(k2);if(!o)continue;if(!o.near)return false;if(o.near.includes(s)&&!ok(s,o))return false;}}
  return true;}
/* the height a tree stands at: the drawn ground where its level-0 tile is made, else the world's own function (a few centimetres down) */
function trwY(T,j,wt){const a=T.a,F=TRW_F;return(wt?wtHt(wt,a[j*F],a[j*F+1]):a[j*F+2])-.05;}
/* ---------- the merged mesh of a tile: lod 1 (middle: all its trees, each hidden within R0 of the eye) or 2 (far: class cls keeps the trees ranked below its part, bigger) ---------- */
function trwKeep(lod,cls){if(lod!==2)return 1;const lvk=(TRW.LV[(meta&&meta.fol)||'high']||TRW.LV.high).k;return Math.min(1,TRW.FAR[cls][1]*(cls?lvk:1));}
function trwMesh(T,lod,cls){const tp=trwTemplates(),a=T.a,n=T.n,F=TRW_F,S=WG_CFG.tile,x0=T.ti*S,z0=T.tk*S,
    kp=trwKeep(lod,cls),ks=lod===2?TRW.FAR[cls][2]:1,wt=lod!==2?WT.tiles.get(T.ti+','+T.tk):null,t0=performance.now();
  let nv=0,ni=0;for(let j=0;j<n;j++){if(T.out[j]||a[j*F+6]>=kp)continue;const l=tp[a[j*F+3]].L[lod];nv+=l.nv;ni+=l.ni;}
  T.ex=!!wt;if(!nv)return null;
  const P=new Float32Array(nv*3),C=new Uint8Array(nv*3),SW=lod===1?new Uint8Array(nv):null,AC=lod===1?new Float32Array(nv*2):null,I=nv>65535?new Uint32Array(ni):new Uint16Array(ni),tn=T.tint;
  let v=0,ii=0,y0=1e9,y1=-1e9;
  for(let j=0;j<n;j++){if(T.out[j]||a[j*F+6]>=kp)continue;const q=j*F,x=a[q],z=a[q+1],y=trwY(T,j,wt),l=tp[a[q+3]].L[lod],s=a[q+4]*ks,cr=Math.cos(a[q+5])*s,sr=Math.sin(a[q+5])*s,br=.92+.16*a[q+7],
      mr=tn[0]*br,mg=tn[1]*br,mb=tn[2]*br,lp=l.p,lc=l.c;
    for(let k=0;k<l.nv;k++){const px=lp[k*3],py=lp[k*3+1],pz=lp[k*3+2],o=(v+k)*3,yy=y+py*s;P[o]=x-x0+px*cr+pz*sr;P[o+1]=yy;P[o+2]=z-z0-px*sr+pz*cr;if(yy<y0)y0=yy;if(yy>y1)y1=yy;
      C[o]=Math.min(255,lc[k*3]*mr);C[o+1]=Math.min(255,lc[k*3+1]*mg);C[o+2]=Math.min(255,lc[k*3+2]*mb);}
    if(SW)SW.set(l.s,v);if(AC)for(let k=0;k<l.nv;k++){AC[(v+k)*2]=x;AC[(v+k)*2+1]=z;}
    const li=l.i;for(let k=0;k<l.ni;k++)I[ii+k]=li[k]+v;v+=l.nv;ii+=l.ni;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3,true));
  if(SW){g.setAttribute('aSw',new THREE.BufferAttribute(SW,1,true));g.setAttribute('aC',new THREE.BufferAttribute(AC,2));}g.setIndex(new THREE.BufferAttribute(I,1));
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(S/2,(y0+y1)/2,S/2),Math.hypot(S*.72,(y1-y0)/2+6));
  const M=trwMats(),m=new THREE.Mesh(g,lod===1?M.mid:M.far);if(lod===1)m.customDepthMaterial=M.midD;m.position.set(x0,0,z0);m.matrixAutoUpdate=false;m.updateMatrix();
  m.frustumCulled=lod!==2;m.receiveShadow=true;m.castShadow=false;m.userData.keep=1;m.userData.tris=ni/3;
  TRW.stats.built++;TRW.stats.buildMs+=performance.now()-t0;return m;}
/* =====================================================================================================
   THE VIEW (trwView, every frame from owView): the tiles within the end of the air (owFogEnd, at most TRW.MAX) are placed and given a merged
   mesh - L1 within TRW.RA (120 m), L3 within TRW.R1 (320 m), beyond it L2 in its far class (all the trees out to 700 m, 60 % of them a fifth
   bigger out to 1.3 km, 36 % of them 45 % bigger beyond: the land stays as wooded) - the nearest first, a few milliseconds a frame. A tile keeps
   its level for 32 m past an edge. The Foliage setting moves the bands (low / medium / high / ultra: near 45 / 55 / 60 / 70 m, the far middle
   out to 220 / 270 / 320 / 480 m, the far classes keeping .6 / .8 / 1 / 1 of their part). The far tiles are culled against the view without
   the far plane (wdepth.js draws the far land nearer); the middle ones by three.js too, so a shadow pass draws only those its camera sees.
   The near trees: instanced, a mesh a template and set, gathered whenever the eye has moved 4 m (with 14 m to spare: the shaders decide at
   R0 exactly); those within RS + 8 m in sets that cast shadows (the sharp near cascade), the rest in sets that do not. The middle tiles within
   the far shadow cascade (OW.sd; layer 2, the static casters) cast too.
   Collision: the trunks of the trees within TRW.PR (240 m) of the player are props (OW.props / OW.propGrid, type 'tree', r: the trunk) - the
   hero cannot stand in one (owCanStand: trwBlock), villagers walk round them (vilnav.js), the grass and the ground cover keep off them; a tower
   built on one cuts it down (owClearProps: trwCut).
   ===================================================================================================== */
const _trwM=new THREE.Matrix4(),_trwQ=new THREE.Quaternion(),_trwV=new THREE.Vector3(),_trwS=new THREE.Vector3(),_trwAx=new THREE.Vector3(0,1,0),_trwC=new THREE.Color(),_trwSp=new THREE.Sphere();
function trwReset(){for(const T of TRW.tiles.values()){trwDrop(T);trwUnprop(T);}TRW.tiles.clear();TRW.live.clear();TRW.q=[];
  if(TRW.near){for(const im of TRW.near.ims)if(im){if(im.parent)im.parent.remove(im);im.dispose&&im.dispose();}}TRW.near={ims:[],eye:null,dirty:true};
  if(TRW.group&&TRW.group.parent)TRW.group.parent.remove(TRW.group);TRW.group=new THREE.Group();TRW.group.userData.keep=1;OW.group.add(TRW.group);
  TRW.owner=OW.group;TRW.seed=WG.seed;TRW.ver=-1;TRW.scanAt=null;TRW.on=true;}
function trwDrop(T){if(T.mesh){if(T.mesh.parent)T.mesh.parent.remove(T.mesh);T.mesh.geometry.dispose();T.mesh=null;}TRW.live.delete(T);T.lod=0;}
/* the distance from the eye to a tile (0 inside it) */
function trwDist(T,x,z){const S=WG_CFG.tile,x0=T.ti*S,z0=T.tk*S;return Math.hypot(Math.max(0,x0-x,x-x0-S),Math.max(0,z0-z,z-z0-S));}
/* the level a tile wants at distance d: 1 middle, 2 far; and its far class */
function trwWant(T,d,r1){const ra=Math.min(TRW.RA,r1*.5);let lod=d<ra?1:d<r1?3:2;if(T.lod&&T.lod!==lod){const e=(T.lod===1||lod===1)?ra:r1;if(Math.abs(d-e)<TRW.HY)lod=T.lod;}let cls=0;if(lod===2){while(cls<TRW.FAR.length-1&&d>=TRW.FAR[cls][0])cls++;
    if(T.lod===2&&T.cls!==cls){const e=TRW.FAR[Math.min(T.cls,cls)][0];if(Math.abs(d-e)<TRW.HY)cls=T.cls;}}return[lod,cls];}
function trwView(force){if(!OW.on||!OW.group||!WG.on)return;if(TRW.off){if(TRW.group)TRW.group.visible=false;return;}/* (TRW.off: no trees, for a comparison) */if(TRW.owner!==OW.group||TRW.seed!==WG.seed||!TRW.group)trwReset();
  const cp=camera.position,U=TRW.U,S=WG_CFG.tile,t0=performance.now(),lv=TRW.LV[(meta&&meta.fol)||'high']||TRW.LV.high,r1=lv.r1,Rmax=Math.min(TRW.MAX,owFogEnd()*1.02);
  TRW.R0=lv.r0;U.uEye.value.copy(cp);U.uR0.value=TRW.R0;U.uRS.value=Math.min(TRW.RS,TRW.R0);U.uT.value=t0/1000;TRW.frame++;if(!TRW.group.visible)TRW.group.visible=true;
  /* villages or roads added: every tile is looked at again (only those whose trees change are rebuilt) */
  const ver=WS.sites.size*100003+WS.roads.size;if(ver!==TRW.ver){TRW.ver=ver;for(const T of TRW.tiles.values())if(T.a)T.recheck=true;}
  /* a scan of the tiles round the eye every 8 frames or 24 m: what each wants; the far-off ones dropped */
  const sc=TRW.scanAt;if(force||!sc||TRW.frame%8===0||Math.hypot(sc.x-cp.x,sc.z-cp.z)>24||sc.R!==Rmax||sc.r1!==r1||sc.fol!==(meta&&meta.fol)){TRW.scanAt={x:cp.x,z:cp.z,R:Rmax,r1,fol:meta&&meta.fol};
    const q=[],a0=Math.floor((cp.x-Rmax)/S),a1=Math.floor((cp.x+Rmax)/S),b0=Math.floor((cp.z-Rmax)/S),b1=Math.floor((cp.z+Rmax)/S);
    for(let b=b0;b<=b1;b++)for(let a=a0;a<=a1;a++){const key=a+','+b;let T=TRW.tiles.get(key);const d=Math.hypot(Math.max(0,a*S-cp.x,cp.x-a*S-S),Math.max(0,b*S-cp.z,cp.z-b*S-S));if(d>Rmax)continue;
      if(!T){T={ti:a,tk:b,key,a:null,n:0,out:null,lod:0,cls:0,mesh:null,props:null};TRW.tiles.set(key,T);}
      T.d=d;const w=trwWant(T,d,r1);T.wl=w[0];T.wc=w[1];if(!T.a||T.wait||T.recheck||T.lod!==w[0]||(w[0]===2&&T.cls!==w[1])||T.fol!==(meta&&meta.fol)||(w[0]!==2&&!T.ex&&WT.tiles.has(key)))q.push(T);}
    for(const T of TRW.tiles.values()){const d=trwDist(T,cp.x,cp.z);T.d=d;if(d>Rmax+64&&T.mesh)trwDrop(T);if(d>Rmax+1400)TRW.tiles.delete(T.key);}
    q.sort((p,r)=>p.d-r.d);TRW.q=q;}
  /* the work: the nearest first, a few milliseconds a frame (at least one step) */
  const lim=force?400:3.2;let steps=0;
  let site=false;const fo=OW.focus||cp;
  /* (the time counts for every tile looked at - a tile looked at again with nothing changed too: when roads are added every tile is, two thousand at 3 km -
     but for the first step of a frame, which may go over it up to three times) */
  while(TRW.q.length&&(performance.now()-t0<lim||steps===0&&performance.now()-t0<lim*3)){const T=TRW.q[0];if(!TRW.tiles.has(T.key)||T.d>Rmax){TRW.q.shift();continue;}
    /* the villages round it first (one a frame), then - near the player - the roads round it (the tile waits; the next scan brings it back); far off, the land of a
       village and of the tile waits for its hydrology from the workers (wtHydReady, src/world/wterrain.js: the next scan brings it back) */
    const hw=T.d>600&&typeof wtHydReady==='function';
    if(!T.a||T.recheck||!T.lod){const ms=trwSiteMissing(T);if(ms){if(site)break;if(hw){const C=WS_CFG.cell,x0=ms[0]*C-700,z0=ms[1]*C-700;if(!wtHydReady(x0,z0,x0+C+1400,z0+C+1400)){TRW.q.shift();continue;}}
        wsSite(ms[0],ms[1]);site=true;steps++;continue;}
      const rk=trwRoadsKnown(T);if(!rk&&trwDist(T,fo.x,fo.z)<TRW.RR){T.wait=true;TRW.q.shift();continue;}T.wait=false;if(rk&&T.rf===false)TRW.near.dirty=true;T.rf=rk;}
    if(!T.a){if(hw){const S=WG_CFG.tile;if(!wtHydReady(T.ti*S,T.tk*S,T.ti*S+S,T.tk*S+S)){TRW.q.shift();continue;}}const p=trwPlace(T.ti,T.tk);T.a=p.a;T.n=p.n;T.tint=p.tint;T.out=null;T.prov=trwExclude(T);T.recheck=false;steps++;if(!force&&performance.now()-t0>lim)break;}
    if(T.recheck){const s0=T.sum;T.prov=trwExclude(T);T.recheck=false;if(s0===T.sum&&T.lod===T.wl&&(T.wl!==2||T.cls===T.wc)&&T.fol===(meta&&meta.fol)&&!(T.wl!==2&&!T.ex&&WT.tiles.has(T.key))){TRW.q.shift();continue;}
      if(s0!==T.sum)TRW.near.dirty=true;}
    trwDrop(T);T.lod=T.wl;T.cls=T.wc;T.fol=meta&&meta.fol;T.mesh=trwMesh(T,T.wl,T.wc);if(T.mesh){TRW.group.add(T.mesh);TRW.live.add(T);}if(T.lod===1)TRW.near.dirty=true;TRW.q.shift();steps++;}
  /* every mesh against the view (its own sphere; the far plane left out) and the shadows of the middle tiles */
  const Fr=_owFr.planes,sd=OW.sd||0;let tris=0;
  for(const T of TRW.live){const m=T.mesh;_trwSp.copy(m.geometry.boundingSphere);_trwSp.center.add(m.position);let vis=T.d<=Rmax&&!trwHeld(T,fo);
    if(vis)for(let i=0;i<6;i++){if(i===4)continue;if(Fr[i].distanceToPoint(_trwSp.center)<-_trwSp.radius){vis=false;break;}}
    m.visible=vis;if(vis)tris+=m.userData.tris;const cs=T.lod!==2&&T.d<sd;if(m.castShadow!==cs){m.castShadow=cs;if(cs)m.layers.enable(2);}}
  TRW.stats.tris=tris;
  trwNear(cp);if(force||TRW.frame%10===0)trwProps();}
/* a tile whose trees were kept while the roads round it were not all known is held back (not shown, no near trees, no trunks) within TRW.RR of the player */
const trwHeld=(T,fo)=>T.rf===false&&trwDist(T,fo.x,fo.z)<TRW.RR;
/* the near trees: instanced meshes a template, the trees within R0 + 14 m of the eye, in two sets: those within RS + 8 m cast their own shadows (exactly
   those within RS, by the depth shader), the rest none - their shadows come from their tiles' middle meshes, whose depth shader draws exactly the trees
   beyond RS: every tree casts once, and the sharp near cascade (a box of about 70 m) never draws the far end of the near trees */
function trwNear(cp){const N=TRW.near;if(!N.dirty&&N.eye&&N.r0===TRW.R0&&Math.hypot(N.eye.x-cp.x,N.eye.z-cp.z)<4)return;N.dirty=false;N.eye={x:cp.x,z:cp.z};N.r0=TRW.R0;
  const tp=trwTemplates(),S=WG_CFG.tile,R=TRW.R0+14,RS2=(Math.min(TRW.RS,TRW.R0)+8)*(Math.min(TRW.RS,TRW.R0)+8),lists=[];for(let t=0;t<tp.length*2;t++)lists.push([]);let cnt=0;
  for(let b=Math.floor((cp.z-R)/S);b<=Math.floor((cp.z+R)/S);b++)for(let a=Math.floor((cp.x-R)/S);a<=Math.floor((cp.x+R)/S);a++){const T=TRW.tiles.get(a+','+b);if(!T||!T.a||!T.out||trwHeld(T,OW.focus||cp))continue;
    const A=T.a,F=TRW_F,wt=WT.tiles.get(T.key);for(let j=0;j<T.n;j++){if(T.out[j])continue;const x=A[j*F],z=A[j*F+1],d2=(x-cp.x)*(x-cp.x)+(z-cp.z)*(z-cp.z);if(d2>R*R)continue;lists[A[j*F+3]*2+(d2<RS2?0:1)].push(T,j,wt);cnt++;}}
  for(let u=0;u<lists.length;u++)trwNearSet(N,u,lists[u],tp);
  TRW.stats.near=cnt;}
function trwNearSet(N,u,L,tp){const t=u>>1,cast=!(u&1),M=trwMats(),n=L.length/3;let im=N.ims[u];
  if(n&&(!im||im.userData.cap<n)){if(im){TRW.group.remove(im);im.dispose&&im.dispose();}const cap=Math.max(16,1<<Math.ceil(Math.log2(n)));if(!tp[t].geo)tp[t].geo=trwGeo(tp[t].L[0]);
    im=new THREE.InstancedMesh(tp[t].geo,M.near,cap);im.userData.cap=cap;im.customDepthMaterial=M.nearD;im.castShadow=cast;im.receiveShadow=true;im.frustumCulled=false;if(cast)im.layers.enable(2);im.userData.keep=1;
    im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);TRW.group.add(im);N.ims[u]=im;}
  if(!im)return;im.count=n;
  for(let i=0;i<n;i++){const T=L[i*3],j=L[i*3+1],wt=L[i*3+2],A=T.a,F=TRW_F,q=j*F,s=A[q+4],br=.92+.16*A[q+7];_trwQ.setFromAxisAngle(_trwAx,A[q+5]);_trwV.set(A[q],trwY(T,j,wt),A[q+1]);_trwS.set(s,s,s);
    _trwM.compose(_trwV,_trwQ,_trwS);im.setMatrixAt(i,_trwM);_trwC.setRGB(T.tint[0]*br,T.tint[1]*br,T.tint[2]*br);im.setColorAt(i,_trwC);}
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}
/* ---------- the trunks as props: the tiles within PR of the player ---------- */
function trwProps(){const f=OW.focus||camera.position,S=WG_CFG.tile;if(!OW.propGrid)return;
  for(const T of TRW.tiles.values()){if(!T.a||!T.out)continue;const d=trwDist(T,f.x,f.z),held=trwHeld(T,f);
    if(d<TRW.PR&&!held&&(!T.props||T.psum!==T.sum))trwProp(T);else if((d>TRW.PR+96||held)&&T.props)trwUnprop(T);}}
function trwProp(T){trwUnprop(T);const tp=trwTemplates(),A=T.a,F=TRW_F,out=[];
  for(let j=0;j<T.n;j++){if(T.out[j])continue;const q=j*F,p={type:'tree',x:A[q],z:A[q+1],r:tp[A[q+3]].r0*A[q+4],alive:true,mesh:null,tile:T,j,kill:trwCut};out.push(p);OW.props.push(p);
    const key=Math.floor(p.x/4)+','+Math.floor(p.z/4);(OW.propGrid.get(key)||OW.propGrid.set(key,[]).get(key)).push(p);}
  T.props=out;T.psum=T.sum;TRW.stats.props+=out.length;}
function trwUnprop(T){if(!T.props)return;const P=new Set(T.props);if(OW.props)OW.props=OW.props.filter(p=>!P.has(p));
  if(OW.propGrid)for(const p of T.props){const key=Math.floor(p.x/4)+','+Math.floor(p.z/4),L=OW.propGrid.get(key);if(L){const L2=L.filter(q=>q!==p);if(L2.length)OW.propGrid.set(key,L2);else OW.propGrid.delete(key);}}
  TRW.stats.props-=T.props.length;T.props=null;}
/* is (x,z) inside a trunk (with rad to spare: the hero's own radius)? */
function trwBlock(x,z,rad){const G=OW.propGrid;if(!G||!OW.on)return false;const m=rad+1;
  for(let i=Math.floor((x-m)/4);i<=Math.floor((x+m)/4);i++)for(let j=Math.floor((z-m)/4);j<=Math.floor((z+m)/4);j++){const L=G.get(i+','+j);if(!L)continue;
    for(const p of L)if(p.type==='tree'&&p.alive&&(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z)<(p.r+rad)*(p.r+rad))return true;}return false;}
/* a tree cut down (a tower built on it): gone from its tile for the rest of the visit */
function trwCut(p){const T=p.tile;if(!T||!T.out)return;T.out[p.j]=2;T.recheck=true;TRW.near.dirty=true;TRW.stats.cut++;if(TRW.q.indexOf(T)<0)TRW.q.unshift(T);}

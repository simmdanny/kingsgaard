/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (6): the low-poly head and face.

   The head is a hand-built low-poly sculpt (pcHeadLP): a few rows of control points round the head - the crown, the top of the forehead, the brow, the eyes, the cheekbones, the mouth and the angle of the jaw, the
   line of the jaw from the chin to under the ear, the top of the neck under it, the neck - flat between them and triangulated as mirror images on the two halves. Its planes: a tall skull with a flat forehead, one
   wide flat front plane for the face, the cheeks turned back from it, a V of a jaw to a narrow chin, and under it a plain straight neck. The features are a few simple shapes on the planes (pcFaceLP): small black
   faceted beads for eyes, flat strips of colour for brows, a long wedge of a nose with a small tip, a small mouth, flat ears. Head units as in pcm.js (the head's own group, U = .0345, scaled onto the head bone);
   the same surface carries the hair and the accessories, and its neck is what the top of the torso grows into.
   ===================================================================================================================== */
/* the columns (azimuth parameters of the right half, mirrored): the middle of the face, the edge of its front plane, the cheek, the front of the side, the ear, behind the ear, the back, the middle of the back */
const PCLP_C=[0,.44,.86,1.24,1.6,2.1,2.62,Math.PI];
/* p: the head parameters (temple, cheek, jaw, chinW, chinZ, zf, L, brow, cb, cf, rn - the neck), F: female -> S(y, ph, o), the surface (y: the height in head units - under the jaw the rows slant with the jaw line, so
   there a point lies a little off that height; ph: the azimuth, 0 in front, x to the right), with S.R (the rows: {nom, pts}), S.nm (the rows of the mesh), S.ys (heights on the face, for its length), S.F */
function pcHeadLP(p,F){return pcHeadLPM(p,!!F);}/* (both on the sculpted head: hers made feminine by her numbers and pcHeadLPM's F) */
/* HIS head (and, with F, hers: the same sculpt made feminine - a shorter lower face, a narrower, softer jaw with its angle higher, a finer rounder chin, a rounder forehead), sculpted after the reference (head units; z measured from the axis of the neck, zc behind the middle): a tall skull with a high, flat-fronted forehead, a brow ridge with the brows on it over deep
   sockets, small bead eyes set wide, a broad wedge of a nose (its sides reach the inner corners of the eyes), cheeks that run forward and down to a V crease across the lower face, a broad muzzle and a wide,
   nearly flat-bottomed chin, the angles of the jaw well up under the ears, a plain straight neck. The shapes of the head (pcHeadLP's p) move the same points: temple, cheek, jaw, chinW, chinZ, L, brow, cb, nx, rn.
   Also S.M: the features, from the same numbers (pcFaceLP). */
function pcHeadLPM(p,F){const zc=-.12,rn=p.rn,kT=(p.temple||.99)/.99,kC=(p.cheek||.96)/.96,kJ=(p.jaw||.78)/.78*(F?.88:1),kCh=(p.chinW||.46)/.46*(F?.86:1),dZ=((p.chinZ||.76)-.76)*1.5,kL=(p.L||1)*(F?.93:1),dBr=((p.brow||.035)-.035)*1.6,dCb=((p.cb||.022)-.022)*1.6+((p.cf||0))*.8;
  const ey=.115,ly=y=>y<ey?ey+(y-ey)*kL:y,R=[];
  /* a row: its height (the hair and the neck read it), its 8 points [x, (y,) z from the neck axis]; kx: the widths scaled */
  const row=(nom,pts,kx)=>R.push({nom:ly(nom),pts:pts.map((q,i)=>{const t=q.length===2?[q[0],nom,q[1]]:q,k=typeof kx==='function'?kx(i):(kx||1);return[t[0]*k,ly(t[1]),t[2]+zc];})});
  const mid=i=>i===0?1:i<=4?kC:1;
  /* the crown, the top of the skull, the top of the forehead (the hairline), the top of the brows */
  row(1.1,PCLP_C.map(()=>[0,-.04]));
  row(1,[[0,.56],[.24,.52],[.42,.4],[.53,.16],[.56,-.1],[.49,-.44],[.28,-.64],[0,-.68]],kT);
  const fF=F?.02:0;/* (hers: a rounder forehead) */
  row(.82,[[0,.83+fF],[.33,.79+fF],[.56,.66],[.71,.36],[.75,-.1],[.67,-.56],[.39,-.82],[0,-.87]],kT);
  row(.565,[[0,.92+fF],[.3,.85+fF],[.58,.75],[.76,.38],[.79,-.1],[.71,-.62],[.41,-.89],[0,-.94]],kT);
  row(.43,[[0,.91+dBr],[.3,.85+dBr],[.6,.765+dBr*.6],[.78,.36],[.8,-.1],[.72,-.62],[.42,-.9],[0,-.95]],kT);
  /* the lower edge of the brow ridge (from the root of the nose out to the side of the face), under it the top of the socket, the bottom of the socket (the line under the eyes) */
  row(.26,[[0,F?.845:.9+dBr],[.093,F?.818:.88+dBr],[.648,.64+dBr*.6],[.79,.3],[.8,-.1],[.72,-.62],[.42,-.9],[0,-.95]],i=>i<2?1:(kT+kC)/2);
  row(.2,[[0,F?.84:.9],[.15,F?.685:.64],[.645,.44],[.79,.28],[.8,-.1],[.72,-.61],[.42,-.89],[0,-.94]],i=>i<2?1:(kT+kC)/2);
  /* (hers: the middle of the face behind the nose flat and set back, so only the nose stands out of it) */
  row(.025,[[0,F?.84:.92],[.298,F?.585:.6],[.64,.42],[.79,.26],[.8,-.1],[.72,-.6],[.42,-.87],[0,-.92]],mid);
  /* the cheekbones (the bottom of the bridge), the bottom of the nose: the cheek is one plane from under the eye to the crease, the line from the wing of the nose to the corner of the crease its inner edge */
  row(-.13,[[0,F?.82:.9],[.27,F?.635:.66],[.62+dCb,.42+dCb*.5],[.78+dCb*.5,.2],[.8,-.1],[.71,-.56],[.41,-.84],[0,-.88]],mid);
  row(-.304,[[0,F?.76:.82],[.24,F?.63:.68],[.6,-.31,.42],[.76,.15],[.78,-.12],[.69,-.52],[.39,-.78],[0,-.82]],mid);
  /* the lower face (the reference's four views together): under the nose the muzzle drops nearly straight, a crease runs across the lower face (a V from the angles of the jaw up to the corners at the edge of
     the cheeks and down to the middle of the chin), under it the chin and the jaw turn down to their bottom edge (the chin's corner in front), and under that the jaw runs back, sloping a little down, to the neck;
     the neck stands behind the jaw (its axis zn), its top a slanted ring under the jaw */
  const cw=kCh,zn=zc-.35;
  R.push({nom:ly(-.6),pts:[[0,-.91,F?.675:.73+dZ*.6],[.27*cw,-.78,F?.58:.6+dZ*.4],[.55*kC*(F?.88:1),-.652,F?.43:.42],[.64*kJ*(F?.96:1),F?-.76:-.78,F?.12:.1],[F?.6:.62,-.66,-.18],[.56,-.6,-.5],[.33,-.57,-.64],[0,-.56,-.68]].map(q=>[q[0],ly(q[1]),q[2]+zc])});
  R.push({nom:ly(-.8),pts:[[0,-1.035,.68+dZ],F?[.24*cw,-1.005,.6+dZ*.8]:[.22*cw,-1.0,.6+dZ*.8],F?[.46*cw,-.925,.43]:[.42*cw,-.93,.42],F?[.5*kJ,-.83,.12]:[.52*kJ,-.86,.08],F?[.385,-.78,-.22]:[.48,-.8,-.22],F?[.34,-.74,-.52]:[.4,-.74,-.52],[.24,-.72,-.62],[0,-.72,-.66]].map(q=>[q[0],ly(q[1]),q[2]+zc])});
  const zN=zn+.13,rz=rn*.86;/* (the neck stands under the skull: its back in line with the bottom of the back of the head, as the body reference's; a little less deep than wide) */
  const yn=[-1.14,-1.12,-1.06,-.96,-.88,-.82,-.78,-.78].map(ly);R.push({nom:ly(-.92),pts:PCLP_C.map((c,i)=>[rn*Math.sin(c),yn[i],zN+rz*Math.cos(c)])});
  /* the base of the neck flares at the sides and the back into the trapezius (the torso grows into this surface), so from behind the neck is short and thick, as the body reference has it */
  const tf=[1,1,1.02,1.08,1.15,1.2,1.23,1.24],ring=(y,k)=>({nom:y,pts:PCLP_C.map((c,i)=>{const r=1+(tf[i]-1)*k;return[rn*r*Math.sin(c),y,zN+rz*r*Math.cos(c)];})}),y13=Math.min(-1.5,yn[0]-.18);R.push(ring(y13,1),ring(-1.86,1.35),ring(-2.8,1.35));
  const f=pcLPSurf(R);f.ys=ly;f.F=!!F;f.eyeY=.115;f.earY=-.02;f.zn=zn;f.zN=zN;f.rz=rz/rn;
  /* the features (head units, z absolute): the eyes, the brows (outer end: x, top, bottom; inner end), the nose (the corners of the bridge at the top and at the bottom, the tip, the wings, the inner corners
     of the eyes, the root of the bridge, the point under the tip) - all of them on or just off the planes above */
  const ex=.4*(1+(kT+kC-2)*.3),nx=p.nx||1,P3=(x,y,z)=>[x,ly(y),z+zc];
  /* hers: larger eyes with lashes, thin arched brows set higher, a smaller nose that projects less (the head itself takes her numbers: a softer, narrower jaw, a finer chin, a flatter brow) */
  const fz=F?-.022:0,fs=F?.9:1;/* (hers: his nose, a little narrower, the bridge lower and the tip finer - it reaches down to the lip as his does) */
  f.M={kT,kC,F:!!F,eye:P3(ex,.115,.566),er:F?.102:.091,brow:F?{o:[.555*kT,.468,.428],i:[.125,.39,.352],arch:.032}:{o:[.577*kT,.435,.332],i:[.11,.335,.292]},
    nose:{T:P3(.055*fs,.24,F?.72:.86+dBr+fz),B:P3(.072*nx*fs,-.1,.96+(nx-1)*.2+fz),P:P3(0,-.222,1.0+(nx-1)*.3+fz*.5),N:P3(.085*nx*fs,-.28,.9+(nx-1)*.15+fz),W:P3(.13*nx*fs,-.32,F?.725:.76),E:P3(.16,.02,F?.655:.74),Rt:P3(.08*fs,.25,F?.72:.86+dBr+fz),U:P3(0,-.393,F?.752:.81)}};
  return f;}
/* HIS short hair (the crop on his sculpted head): one low-poly cap after the reference - a flat front wall over the forehead, a V notch in the middle of the fringe, a top that rises at the front, sides
   down over the ears (they hide under it), the back down to the nape. Rows as the head's (8 columns, mirrored; z from the neck axis), every point outside the skull. -> {R, geo (head units),
   at(y, ph, o): the point of the cap at the height y and azimuth ph (head units), false under its edge} */
function pcCapLP(S){const M=S.M,kT=M.kT,zc=-.12,R=[];
  /* (its widths follow the skull's: the temples (kT) above, and lower down the cheeks (kC) at the sides, the back never narrower than the skull's own) */
  const row=(nom,pts)=>R.push({nom,pts:pts.map((q,i)=>{const t=q.length===2?[q[0],nom,q[1]]:q,k=nom>.7||i<=2?kT:i<=4?Math.max(kT,M.kC):Math.max(1,kT);return[t[0]*k,S.ys(t[1]),t[2]+zc];})});
  row(1.255,PCLP_C.map(()=>[0,.12]));
  row(1.2,[[0,.45],[.18,.42],[.32,.32],[.4,.1],[.42,-.12],[.36,-.45],[.2,-.62],[0,-.66]]);
  row(1.1,[[0,.78],[.3,.76],[.5,.6],[.62,.3],[.64,-.12],[.56,-.6],[.32,-.84],[0,-.9]]);
  row(.99,[[0,.9],[.3,.9],[.6,.72],[.69,.36],[.7,-.12],[.62,-.62],[.36,-.9],[0,-.96]]);
  row(.78,[[0,.9],[.3,.9],[.64,.74],[.8,.38],[.82,-.12],[.76,-.68],[.45,-.98],[0,-1.03]]);
  row(.5,[[0,.74,.92],[.25,.64,.955],[.64,.62,.8],[.88,.3,.3],[.92,.3,-.1],[.86,.2,-.72],[.5,.1,-1.02],[0,.1,-1.07]]);
  row(-.2,[[0,.694,.9],[.2,.54,.955],[.6,.565,.8],[.7,-.15,.2],[.84,-.42,-.17],[.68,-.5,-.56],[.4,-.56,-.73],[0,-.58,-.75]]);
  const C=PCLP_C,N=R.length,A=[0,0,0],B=[0,0,0];
  /* the point of a column at the height y (the lowest point of the column when y is under it: k = -1) */
  const colPt=(i,y,o)=>{if(y>=R[0].pts[i][1]){o[0]=R[0].pts[i][0];o[1]=R[0].pts[i][1];o[2]=R[0].pts[i][2];return 1;}
    for(let j=0;j<N-1;j++){const a=R[j].pts[i],b=R[j+1].pts[i];if(y<=a[1]&&y>=b[1]){const k=(a[1]-y)/((a[1]-b[1])||1);o[0]=a[0]+(b[0]-a[0])*k;o[1]=y;o[2]=a[2]+(b[2]-a[2])*k;return 1;}}
    const b=R[N-1].pts[i];o[0]=b[0];o[1]=b[1];o[2]=b[2];return -1;};
  const at=(y,ph,o)=>{let a=pcWrap(ph);const sd=a<0?-1:1;a=Math.abs(a);let i=0;while(i<C.length-2&&C[i+1]<a)i++;const s=(a-C[i])/(C[i+1]-C[i]);
    const ka=colPt(i,y,A),kb=colPt(i+1,y,B),yb=R[N-1].pts[i][1]+(R[N-1].pts[i+1][1]-R[N-1].pts[i][1])*s;if(y<yb||(ka<0&&kb<0))return false;
    o.set((A[0]+(B[0]-A[0])*s)*sd,y,A[2]+(B[2]-A[2])*s);return true;};
  /* the mesh: a few tones row by row and column by column, so the planes read */
  const cols=[];for(let i=C.length-1;i>0;i--)cols.push([i,-1]);for(let i=0;i<C.length;i++)cols.push([i,1]);
  const W=cols.length,pos=[],col=[],idx=[];R.forEach((r,j)=>cols.forEach(([i,sd])=>{const q=r.pts[i];pos.push(q[0]*sd,q[1],q[2]);const k=.9+.05*(j%2)+.03*(i%2);col.push(k,k,k);}));
  const mid=(W-1)/2,P=new THREE.Vector3(),Q1=new THREE.Vector3(),Q2=new THREE.Vector3(),tri=(a,b,c)=>{P.fromArray(pos,a*3);Q1.fromArray(pos,b*3).sub(P);Q2.fromArray(pos,c*3).sub(P);if(Q1.cross(Q2).lengthSq()>1e-12)idx.push(a,b,c);};
  for(let j=0;j<N-1;j++)for(let i=0;i<W-1;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;if(i>=mid){tri(a,c,d);tri(a,d,b);}else{tri(a,c,b);tri(b,c,d);}}
  return{R,at,geo:pcFix(pcFlatGeo(pos,idx,col),'point')};}
/* the surface of a sculpt: flat between the rows, on the same triangles as the mesh (the diagonals run from the middle outwards and down); S.R: the rows, S.nm: the rows of the mesh (the last one only carries the neck on down) */
function pcLPSurf(R){const N=R.length,C=PCLP_C;
  const f=(y,ph,o)=>{let j=0;while(j<N-2&&R[j+1].nom>y)j++;const t=Math.min(1,Math.max(0,(R[j].nom-y)/(R[j].nom-R[j+1].nom)));
    let a=pcWrap(ph);const sd=a<0?-1:1;a=Math.abs(a);let i=0;while(i<C.length-2&&C[i+1]<a)i++;const s=Math.min(1,Math.max(0,(a-C[i])/(C[i+1]-C[i])));
    const P00=R[j].pts[i],P10=R[j].pts[i+1],P01=R[j+1].pts[i],P11=R[j+1].pts[i+1];
    for(let k=0;k<3;k++)o[k]=t>=s?P00[k]+t*(P01[k]-P00[k])+s*(P11[k]-P01[k]):P00[k]+s*(P10[k]-P00[k])+t*(P11[k]-P10[k]);
    o[0]*=sd;return o;};
  f.R=R;f.nm=N-1;return f;}
/* the grid of the head (all its rows, the columns -pi..pi) with vertex normals averaged over the triangles round each point (the base of the hair is laid on it): {cols: [ph], P: rows of [x, y, z], N: rows of [x, y, z]} */
function pcHeadGrid(S){if(S.grid)return S.grid;const C=PCLP_C,R=S.R,cols=[],ci=[];for(let i=C.length-1;i>0;i--){cols.push(-C[i]);ci.push([i,-1]);}for(let i=0;i<C.length;i++){cols.push(C[i]);ci.push([i,1]);}
  const W=cols.length,H=R.length,P=R.map(r=>ci.map(([i,sd])=>[r.pts[i][0]*sd,r.pts[i][1],r.pts[i][2]])),N=R.map(()=>ci.map(()=>[0,0,0])),mid=(W-1)/2;
  const add=(a,b,c)=>{const A=P[a[0]][a[1]],B=P[b[0]][b[1]],Cc=P[c[0]][c[1]],u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[Cc[0]-A[0],Cc[1]-A[1],Cc[2]-A[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    for(const q of[a,b,c]){const m=N[q[0]][q[1]];m[0]+=n[0];m[1]+=n[1];m[2]+=n[2];}};
  for(let j=0;j<H-1;j++)for(let i=0;i<W-1;i++){const a=[j,i],b=[j,i+1],c=[j+1,i],d=[j+1,i+1];if(i>=mid){add(a,c,d);add(a,d,b);}else{add(a,c,b);add(b,c,d);}}
  let sg=0;for(let j=0;j<H;j++){const s=N[j][0],e=N[j][W-1];for(let k=0;k<3;k++){s[k]+=e[k];e[k]=s[k];}/* (the seam behind: one point) */
    N[j].forEach((m,i)=>{let l=Math.hypot(m[0],m[1],m[2]);if(l<1e-9){m[1]=1;l=1;}m[0]/=l;m[1]/=l;m[2]/=l;const q=P[j][i];sg+=m[0]*q[0]+m[1]*q[1]+m[2]*(q[2]+.15);});}
  if(sg<0)for(const r of N)for(const m of r){m[0]=-m[0];m[1]=-m[1];m[2]=-m[2];}/* (outwards) */
  /* the crown: straight up */
  for(const m of N[0]){m[0]=0;m[1]=1;m[2]=0;}
  return S.grid={cols,P,N,noms:R.map(r=>r.nom)};}
/* a flat geometry with its own colour on every triangle: the planes that face down are warmer (the warm light the reference's planes catch under the brows, under the nose and along the jaw); ctr: a point
   inside, to tell which way a triangle faces; base(a, b, c): a brightness of its own (optional) */
function pcWarmGeo(pos,idx,ctr,base){const P=[],C=[],A=new THREE.Vector3(),B=new THREE.Vector3(),D=new THREE.Vector3(),n=new THREE.Vector3(),m=new THREE.Vector3();
  for(let t=0;t<idx.length;t+=3){A.fromArray(pos,idx[t]*3);B.fromArray(pos,idx[t+1]*3);D.fromArray(pos,idx[t+2]*3);n.copy(B).sub(A).cross(m.copy(D).sub(A)).normalize();
    m.copy(A).add(B).add(D).divideScalar(3).sub(ctr);if(n.dot(m)<0)n.negate();
    const c=base?base(idx[t],idx[t+1],idx[t+2]):1,k=Math.min(1,Math.max(0,(-n.y-.2)*1.5));for(const v of[A,B,D]){P.push(v.x,v.y,v.z);C.push(c,c*(1-.06*k),c*(1-.11*k));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(C),3));g.computeVertexNormals();return g;}
/* a flat-shaded geometry from positions and triangles */
function pcFlatGeo(pos,idx,col){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));if(col)g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(col),3));
  g.setIndex(new THREE.BufferAttribute(new(pos.length/3>65535?Uint32Array:Uint16Array)(idx),1));g.computeVertexNormals();return g;}
/* the head and neck mesh: the control points themselves, mirrored, with a warmer tint on the lower face (her cheeks a little more) */
function pcHeadLPGeo(key,S){return gget('phlp'+key,()=>{const C=PCLP_C,R=S.R,cols=[];for(let i=C.length-1;i>0;i--)cols.push([i,-1]);for(let i=0;i<C.length;i++)cols.push([i,1]);
  const W=cols.length,pos=[],col=[],gs=(a,s)=>Math.exp(-(a/s)*(a/s));
  for(let j=0;j<S.nm;j++)for(const[i,sd]of cols){const q=R[j].pts[i];pos.push(q[0]*sd,q[1],q[2]);
    const w=Math.max(0,Math.min(1,q[2]/.5))*pcSm(-.2,-.5,q[1])*pcSm(-1.3,-.9,q[1]),b=S.F?gs(Math.abs(q[0])-.8,.25)*gs(q[1]+.46,.3):0;col.push(1,1-.045*w-.05*b,1-.06*w-.05*b);}
  const idx=[],mid=(W-1)/2,v=(k,o)=>o.set(pos[k*3],pos[k*3+1],pos[k*3+2]),A=new THREE.Vector3(),B=new THREE.Vector3(),D=new THREE.Vector3();
  const tri=(a,b,c)=>{v(a,A);v(b,B);v(c,D);B.sub(A);D.sub(A);if(B.cross(D).lengthSq()>1e-10)idx.push(a,b,c);};
  for(let j=0;j<S.nm-1;j++)for(let i=0;i<W-1;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;if(i>=mid){tri(a,c,d);tri(a,d,b);}else{tri(a,c,b);tri(b,c,d);}}
  if(S.M)return pcWarmGeo(pos,idx,new THREE.Vector3(0,0,-.12));/* (his: a colour per plane) */
  return pcFix(pcFlatGeo(pos,idx,col),'point');});}
/* a ridge (a hair clump): a prism along the points P with a triangular section - its two base edges spread across the surface (B), its ridge raised along the normal N - narrowing to a point at the end */
function pcRidgeG(key,P,N,w,h,tint,root){return gget('prg'+key,()=>{const n=P.length,pos=[],col=[],idx=[],T=new THREE.Vector3(),Bn=new THREE.Vector3(),q=new THREE.Vector3();
  for(let j=0;j<n;j++){T.copy(P[Math.min(n-1,j+1)]).sub(P[Math.max(0,j-1)]).normalize();Bn.crossVectors(T,N[j]).normalize();const s=j/(n-1),ww=w(s),hh=h(s);
    q.copy(P[j]).addScaledVector(Bn,ww);pos.push(q.x,q.y,q.z);q.copy(P[j]).addScaledVector(N[j],hh);pos.push(q.x,q.y,q.z);q.copy(P[j]).addScaledVector(Bn,-ww);pos.push(q.x,q.y,q.z);
    const k=tint*(root?(.88+.12*Math.min(1,s*2.5)):1);for(let r=0;r<3;r++)col.push(k,k,k);}
  for(let j=0;j<n-1;j++){const a=j*3,b=a+3;idx.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2,a+2,b+2,a,a,b+2,b);}
  idx.push(0,1,2);const g=pcFlatGeo(pos,idx,col);return g;});}
/* HIS face (S.M of pcHeadLPM): small black faceted beads for eyes, tapered strips of a darker hair colour for brows (thick at the outer end, slanting down to the nose), the broad wedge of the nose; no mouth */
function pcFaceLPM(X,out){const{hs,Q,U,S,headAt,headN,phX}=X,M=S.M,hu=X.hu,V=()=>new THREE.Vector3();
  const skin=PM(X.SK,'skin',true),bead=PM(0x141110,'bead',true),brow=PM(pcDark(X.HC,.14),'skin',true);
  const faceAt=(x,y,off)=>{const ph=Math.sign(x||1)*phX(y,Math.abs(x));return headAt(y,ph,off*U);};
  /* the eyes */
  const bg=gget('pclpbead2',()=>new THREE.IcosahedronGeometry(1,1));
  for(const sd of[-1,1]){const e=M.eye,c=hu(sd*e[0],e[1],e[2]);out.eyeC.push(c.clone());const m=Q(bg,bead,hs,c.x,c.y,c.z);m.scale.set(M.er*U,M.er*U,M.er*.82*U);}
  /* the brows: sampled along their length on the brow ridge, a top a little off the skin and edges down to it */
  for(const sd of[-1,1]){const o=M.brow.o,ii=M.brow.i,n=8,L=[[],[],[],[]],pos=[],idx=[];
    for(let k=0;k<=n;k++){const t=k/n,x=ii[0]+(o[0]-ii[0])*t,ar=(M.brow.arch||0)*Math.sin(Math.PI*Math.pow(t,.8)),yt=ii[1]+(o[1]-ii[1])*t+ar,yb=ii[2]+(o[2]-ii[2])*t+ar;L[0].push(faceAt(sd*x,S.ys(yt),.016));L[1].push(faceAt(sd*x,S.ys(yb),.016));L[2].push(faceAt(sd*x,S.ys(yt),-.004));L[3].push(faceAt(sd*x,S.ys(yb),-.004));}
    const m=n+1;for(const l of L)for(const q of l)pos.push(q.x,q.y,q.z);
    for(let k=0;k<m-1;k++)idx.push(k,m+k,k+1,k+1,m+k,m+k+1,k,k+1,2*m+k+1,k,2*m+k+1,2*m+k,m+k,3*m+k,3*m+k+1,m+k,3*m+k+1,m+k+1);
    idx.push(0,2*m,3*m,0,3*m,m,m-1,2*m-1,4*m-1,m-1,4*m-1,3*m-1);Q(pcFlatGeo(pos,idx),brow,hs);}
  /* her lashes: a thin dark sweep along the top of each eye, out past its outer corner */
  if(M.F)for(const sd of[-1,1]){const e=M.eye,r=M.er,pos=[],idx=[],n=5;
    for(let k=0;k<=n;k++){const t=k/n,a=Math.PI*(.42+.5*t),x=e[0]-Math.cos(a)*r*(1.06+.2*t),y=e[1]+Math.sin(a)*r*1.04+.02*t*t,w=.014+.022*t;
      const A=faceAt(sd*x,y,.006),B=faceAt(sd*(x+.012*t),y+w,.012);pos.push(A.x,A.y,A.z,B.x,B.y,B.z);}
    for(let k=0;k<n;k++){const a=2*k;idx.push(a,a+1,a+2,a+1,a+3,a+2);}Q(pcFlatGeo(pos,idx),bead,hs);}
  /* the nose: the bridge (a narrow strip from between the brows, straight down and forward to a pointed tip, the most forward point), its sides out to the inner corners of the eyes and the wings, the underside back to the top of the lip */
  {const N=M.nose,P=(q,sd)=>hu(sd*q[0],q[1],q[2]),pts=[],idx=[],id={};
    const put=(nm,q,sd)=>{id[nm]=pts.length/3;const v=P(q,sd);pts.push(v.x,v.y,v.z);};
    for(const[sd,k]of[[-1,'L'],[1,'R']]){put('T'+k,N.T,sd);put('B'+k,N.B,sd);put('N'+k,N.N,sd);put('W'+k,N.W,sd);put('E'+k,N.E,sd);put('Rt'+k,N.Rt,sd);}
    put('U',N.U,1);put('P',N.P,1);const f=(...a)=>a.forEach(n=>idx.push(id[n]));
    f('TL','TR','BR','TL','BR','BL','BL','BR','P');
    for(const k of['L','R'])f('T'+k,'Rt'+k,'E'+k,'T'+k,'E'+k,'B'+k,'B'+k,'E'+k,'W'+k,'B'+k,'W'+k,'N'+k,'B'+k,'N'+k,'P');
    f('P','NL','U','P','U','NR','NL','WL','U','NR','U','WR');
    Q(pcWarmGeo(pts,idx,hu(0,-.1,.35)),PM(X.SK,'skinV',true),hs);}
}
/* the ears: a flat outline with a little thickness and a darker hollow, on the side of the head under the ear's column */
function pcEarsLP(X,out){const{hs,Q,U,headAt}=X,skin=PM(X.SK,'skin',true);
  if(!X.earsHidden)for(const sd of[-1,1]){const p0=headAt(X.S.earY,sd*Math.PI/2,0);out.earX=Math.abs(p0.x);const eg=X.G(hs,p0.x-sd*.001,p0.y,p0.z-.0026,0,sd*-.32,sd*.08);eg.scale.set(sd*U,U,U);
    const O=[[0,.33],[.12,.27],[.17,.08],[.14,-.14],[.06,-.29],[-.03,-.27],[-.05,.05]],pos=[],idx=[],T=.06;
    O.forEach(([u,v])=>pos.push(T,v,u));O.forEach(([u,v])=>pos.push(.004,v*.96,u*.9));const n=O.length;
    pos.push(T+.002,.02,.05);/* the middle */for(let k=0;k<n;k++){idx.push(2*n,k,(k+1)%n);idx.push(k,k+n,(k+1)%n+n,k,(k+1)%n+n,(k+1)%n);}
    Q(pcFlatGeo(pos,idx),skin,eg);
    const H=[[.02,.18],[.1,.14],[.11,0],[.06,-.15],[0,-.1]],hp=[],hi=[];H.forEach(([u,v])=>hp.push(T+.006,v,u));hp.push(T+.002,.03,.05);for(let k=0;k<H.length;k++)hi.push(H.length,k,(k+1)%H.length);
    Q(pcFlatGeo(hp,hi),PM(pcDark(X.SK,.16),'skin',true),eg);}
}
/* the face: X = {hs, Q, G, U, F, P (head params), S (the head surface), SK (skin), HC (hair), headAt, headN, phX, earsHidden, hkey} -> {eyeC, earX} */
function pcFaceLP(X){const{hs,Q,U,F,P,S,headAt,headN,phX}=X,ys=S.ys,out={eyeC:[],earX:0},V=()=>new THREE.Vector3();
  pcFaceLPM(X,out);pcEarsLP(X,out);return out;}

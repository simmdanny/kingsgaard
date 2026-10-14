/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (2b): the body sculpt (Task M).

   The body is modelled as a low-poly sculpt after the body reference: rings of points at the landmarks of the body, joined by flat planes that follow the anatomy - on the torso the chest and the line of the
   pectorals, the ribs, the waist, the shoulder blades and the spine, the hips and the seat; on the arm the deltoid, biceps and triceps, the elbow and the forearm narrowing to a flat wrist; on the leg the thigh,
   the knee, the calf and the ankle; on the foot the heel, the ankle bones, the arch and the ball; hands with a palm, a thumb and three-jointed fingers.
   The torso (pcBody2) keeps its interface: S(y, ph, off, o) is the point of the sculpt at the height y and the parameter ph round it (0 the middle of the front, pi the spine), moved off along the surface's
   normal; the garments are bands of it (pcShell2) laid on the sculpt's own rows and columns, so a shirt shows the planes of the body under it. A limb (pcLimbLP) is rows of eight points round its axis; its skin
   and its sleeves or trouser legs are tubes on the same rows (pcLimbTube).
   His sculpt is written in the heights of the finished figure and carried back into the shared layout by the inverse of his lift (pcRemapInv), where the garments and the weights are made.
   ===================================================================================================================== */
/* the inverse of pcRemapY: a height of the finished figure -> the height in the shared layout */
function pcRemapInv(F){const K=F?PCRY_F:PCRY_M,n=K.length;return y=>{if(y<=K[1][1])return y;for(let i=1;i<n-1;i++){const a=K[i],b=K[i+1];if(y<=b[1])return a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);}return y-(K[n-1][1]-K[n-1][0]);};}

/* ---- the torso ---- */
/* the half-columns (the parameter ph of the points round the body): the middle of the front, the inner chest and the rectus, the nipple line, the outer chest (the front of the armpit), the side,
   the back of the armpit (the lat), the outer shoulder blade, the inner shoulder blade (the long muscles of the back), the spine */
const PCT_C=[0,.38,.78,1.15,1.5,1.85,2.25,2.7,Math.PI];
/* how each quad of the torso is split: alternately, so the planes meet in diamonds and chevrons (not long strips) */
const PCT_FLIP=(r,c)=>(r+c)%2===1;
/* his torso (after the body reference), rows [height in the finished figure, [x, z] per half-column]: the crotch, the fold under the seat, the seat, the hips, the crest of the hips, the waist, the upper
   belly, the lower ribs (the line under the chest), the chest and the bottom of the armpit, the upper chest, the line of the collarbones, the top of the shoulders and the trapezius, the base of the neck
   (where it begins to turn into the neck of the head) and two rows inside the neck */
const PCT_M=[
  [.150,[[0,.0070],[.0040,.0072],[.0075,.0066],[.0100,.0045],[.0110,.0005],[.0105,-.0040],[.0085,-.0075],[.0045,-.0092],[0,-.0094]]],
  [.160,[[0,.0150],[.0050,.0152],[.0090,.0135],[.0140,.0085],[.0300,.0010],[.0280,-.0118],[.0172,-.0150],[.0080,-.0128,.001],[0,-.0110,.003]]],
  [.168,[[0,.0182],[.0085,.0188],[.0160,.0184],[.0250,.0160],[.0395,.0032],[.0365,-.0110,.002],[.0230,-.0200,-.002],[.0085,-.0214],[0,-.0160,.002]]],
  [.177,[[0,.0208],[.0095,.0208],[.0192,.0184],[.0288,.0162],[.0396,.0040],[.0376,-.0105],[.0235,-.0264],[.0090,-.0258],[0,-.0188]]],
  [.188,[[0,.0234],[.0105,.0236],[.0206,.0204],[.0302,.0170],[.0384,.0055],[.0354,-.0100],[.0228,-.0268],[.0092,-.0250],[0,-.0218]]],
  [.200,[[0,.0254],[.0105,.0262],[.0205,.0242,-.002],[.0290,.0175,-.003],[.0335,.0045],[.0322,-.0102],[.0264,-.0204],[.0140,-.0234],[0,-.0218]]],
  [.214,[[0,.0258],[.0105,.0268],[.0205,.0246],[.0276,.0178],[.0306,.0040],[.0298,-.0106],[.0248,-.0206],[.0134,-.0250],[0,-.0232]]],
  [.229,[[0,.0262],[.0105,.0276],[.0198,.0256],[.0264,.0190],[.0288,.0042],[.0285,-.0110],[.0245,-.0220],[.0136,-.0266],[0,-.0250]]],
  [.244,[[0,.0268],[.0110,.0280],[.0208,.0264],[.0272,.0200],[.0298,.0046],[.0298,-.0118],[.0258,-.0232],[.0146,-.0280,.002],[0,-.0260]]],
  [.2575,[[0,.0288,-.004],[.0116,.0318,-.003],[.0232,.0314,-.001],[.0302,.0240,.003],[.0318,.0062],[.0316,-.0114],[.0282,-.0244],[.0156,-.0294],[0,-.0281]]],
  [.2735,[[0,.0284],[.0122,.0304],[.0248,.0296],[.0332,.0226],[.0360,.0068],[.0354,-.0114],[.0302,-.0252],[.0162,-.0306],[0,-.0297]]],
  [.2845,[[0,.0244],[.0122,.0266],[.0256,.0256],[.0362,.0190],[.0422,.0062],[.0410,-.0118],[.0332,-.0242],[.0168,-.0289],[0,-.0300]]],
  [.2955,[[0,.0176],[.0108,.0188],[.0230,.0172],[.0356,.0118],[.0480,.0022],[.0425,-.0102],[.0340,-.0186],[.0178,-.0236],[0,-.0262]]],
  [.3085,[[0,.0130],[.0085,.0132],[.0168,.0110],[.0235,.0064],[.0272,-.0006],[.0258,-.0086],[.0210,-.0150],[.0118,-.0193],[0,-.0207]]],
  [.3155,[[0,.0126],[.0072,.0124],[.0130,.0106],[.0170,.0060],[.0190,-.0005],[.0180,-.0068],[.0152,-.0118],[.0088,-.0150],[0,-.0160]]],
  [.3225,[[0,.0122],[.0068,.0118],[.0118,.0098],[.0145,.0055],[.0155,-.0005],[.0148,-.0062],[.0125,-.0105],[.0070,-.0130],[0,-.0135]]]];
/* hers: the same planes on her proportions - narrower shoulders, a bust of two soft lobes over the line under it, a narrow waist, wider hips and a round seat */
const PCT_F=[
  [.150,[[0,.0068],[.0040,.0070],[.0078,.0064],[.0105,.0044],[.0118,.0005],[.0112,-.0042],[.0090,-.0078],[.0048,-.0095],[0,-.0098]]],
  [.160,[[0,.0148],[.0050,.0150],[.0090,.0134],[.0130,.0086],[.0290,.0012],[.0272,-.0120],[.0172,-.0152],[.0080,-.0130,.001],[0,-.0112,.003]]],
  [.168,[[0,.0180],[.0086,.0184],[.0158,.0170],[.0242,.0160],[.0378,.0032],[.0352,-.0112,.002],[.0228,-.0192,-.002],[.0086,-.0210],[0,-.0163,.002]]],
  [.177,[[0,.0204],[.0096,.0204],[.0186,.0166],[.0278,.0162],[.0386,.0040],[.0366,-.0108],[.0236,-.0262],[.0090,-.0258],[0,-.0192]]],
  [.188,[[0,.0222],[.0105,.0224],[.0204,.0194],[.0292,.0164],[.0378,.0050],[.0350,-.0102],[.0232,-.0270],[.0095,-.0252],[0,-.0218]]],
  [.200,[[0,.0236],[.0100,.0243],[.0195,.0226,-.002],[.0272,.0165,-.003],[.0318,.0042],[.0305,-.0098],[.0248,-.0196],[.0132,-.0226],[0,-.0212]]],
  [.214,[[0,.0228],[.0095,.0236],[.0182,.0218],[.0240,.0158],[.0262,.0036],[.0255,-.0094],[.0215,-.0186],[.0118,-.0226],[0,-.0214]]],
  [.226,[[0,.0228],[.0095,.0237],[.0180,.0222],[.0238,.0164],[.0262,.0038],[.0258,-.0098],[.0220,-.0194],[.0120,-.0234],[0,-.0222]]],
  [.2395,[[0,.0236],[.0100,.0250,-.0015],[.0192,.0250,-.001],[.0255,.0185],[.0278,.0042],[.0278,-.0104],[.0240,-.0204],[.0130,-.0246],[0,-.0234]]],
  [.253,[[0,.0262],[.0108,.0318],[.0215,.0320],[.0282,.0240],[.0298,.0055],[.0292,-.0108],[.0255,-.0220],[.0140,-.0262],[0,-.0248]]],
  [.2678,[[0,.0252],[.0112,.0282],[.0228,.0278],[.0300,.0210],[.0322,.0060],[.0318,-.0108],[.0272,-.0232],[.0146,-.0270],[0,-.0258]]],
  [.2788,[[0,.0222],[.0112,.0240],[.0232,.0232],[.0325,.0172],[.0378,.0055],[.0358,-.0100],[.0288,-.0218],[.0150,-.0258],[0,-.0262]]],
  [.289,[[0,.0160],[.0098,.0170],[.0205,.0156],[.0315,.0106],[.0418,.0022],[.0365,-.0082],[.0288,-.0168],[.0152,-.0214],[0,-.0236]]],
  [.2983,[[0,.0112],[.0075,.0114],[.0148,.0096],[.0205,.0056],[.0232,-.0006],[.0220,-.0072],[.0178,-.0124],[.0102,-.0154],[0,-.0162]]],
  [.3053,[[0,.0106],[.0062,.0105],[.0112,.0090],[.0146,.0050],[.0162,-.0006],[.0154,-.0056],[.0130,-.0092],[.0076,-.0112],[0,-.0116]]],
  [.3120,[[0,.0100],[.0058,.0098],[.0100,.0082],[.0124,.0046],[.0132,-.0006],[.0126,-.0054],[.0106,-.0090],[.0060,-.0112],[0,-.0116]]]];
/* more columns for a sculpt (rows R on the half-columns C): at the parameters ex, each row's point on the line between its neighbours - the shape stays, and where the torso lies on the thighs the new
   points let it follow their corners (the front and the front-outer edge of a thigh fall between the columns of the table) */
function pcAddCols(R,C,ex){const C2=C.concat(ex).sort((a,b)=>a-b);
  for(const row of R){const pts=row.pts;row.pts=C2.map(c=>{const i=C.indexOf(c);if(i>=0)return pts[i].slice();let j=0;while(j<C.length-2&&C[j+1]<c)j++;const f=(c-C[j])/(C[j+1]-C[j]),a=pts[j],b=pts[j+1];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];});}
  return C2;}
/* the torso below the hip joints lies on the thighs: a point of a row under the joints that is inside a thigh, or just outside it, moves straight out from the thigh's axis onto its surface, a hair
   inside it (ins) - there the leg covers the torso, and above it the torso leaves the leg's surface at a shallow angle, so the legs grow out of the hips without an edge (the seat and the front of the crotch,
   clearly outside the thighs, keep their shape) */
function pcHugLegs(R,F,ins){const Y=PCL.y,LG=pcLimbLP(F?PCBL_F:PCBL_M,y=>y,Y.hip,Y.hip),hx=PCL[F?'f':'m'].hipX,o=[0,0,0];
  for(const row of R){const ly=row.nom-Y.hip;if(ly>-.0015)continue;const Q=[];let cx=0,cz=0;
    for(let k=0;k<8;k++){LG.at(ly,k,0,o);Q.push([hx+o[0],o[2]]);cx+=(hx+o[0])/8;cz+=o[2]/8;}
    for(const p of row.pts){const dx=p[0]-cx,dz=p[2]-cz,L=Math.hypot(dx,dz);if(p[0]<=1e-6||L<1e-6)continue;const ux=dx/L,uz=dz/L;let t1=-1;
      for(let k=0;k<8;k++){const a=[Q[k][0]-cx,Q[k][1]-cz],b=[Q[(k+1)%8][0]-cx,Q[(k+1)%8][1]-cz],ex=b[0]-a[0],ez=b[1]-a[1],den=ux*ez-uz*ex;if(Math.abs(den)<1e-12)continue;
        const t=(a[0]*ez-a[1]*ex)/den,sg=(a[0]*uz-a[1]*ux)/den;if(sg>=-1e-9&&sg<=1+1e-9&&t>t1)t1=t;}
      if(t1>0&&L<t1+.0015){const t=t1-ins;p[0]=cx+ux*t;p[2]=cz+uz*t;}}}
  return R;}
/* a sculpt of rows R ({nom: ascending heights, pts: [x, y, z] per half-column}) mirrored about x = 0: the normals of its points (averaged over the planes round them) and the point at (y, ph) on its
   planes (each quad split from (row, col) to (row+1, col+1), as the meshes laid on it) moved off along the normal */
function pcLPBody(R,C,flip){flip=flip||(()=>false);const NR=R.length,NC=C.length,N=R.map(()=>C.map(()=>[0,0,0])),cz=R.map(r=>(r.pts[0][2]+r.pts[NC-1][2])/2);
  const add=(tri,r0)=>{const[a,b,c]=tri.map(q=>R[q[0]].pts[q[1]]),u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const mx=(a[0]+b[0]+c[0])/3,mz=(a[2]+b[2]+c[2])/3-cz[r0];if(n[0]*mx+n[2]*mz<0)n=n.map(q=>-q);for(const q of tri){const m=N[q[0]][q[1]];m[0]+=n[0];m[1]+=n[1];m[2]+=n[2];}};
  for(let r=0;r<NR-1;r++)for(let c=0;c<NC-1;c++){if(flip(r,c)){add([[r,c],[r+1,c],[r,c+1]],r);add([[r,c+1],[r+1,c],[r+1,c+1]],r);}else{add([[r,c],[r+1,c+1],[r,c+1]],r);add([[r,c],[r+1,c],[r+1,c+1]],r);}}
  for(const row of N){row[0][0]=0;row[NC-1][0]=0;for(const m of row){const l=Math.hypot(m[0],m[1],m[2])||1;m[0]/=l;m[1]/=l;m[2]/=l;}}
  const T=[0,0,0];
  const f=(y,ph,off,o)=>{let r=0;while(r<NR-2&&R[r+1].nom<y)r++;const t=Math.min(1,Math.max(0,(y-R[r].nom)/(R[r+1].nom-R[r].nom)));
    let a=pcWrap(ph);const sd=a<0?-1:1;a=Math.abs(a);let c=0;while(c<NC-2&&C[c+1]<a)c++;const s=Math.min(1,Math.max(0,(a-C[c])/(C[c+1]-C[c])));
    const A=R[r].pts[c],B=R[r].pts[c+1],Cc=R[r+1].pts[c],D=R[r+1].pts[c+1],nA=N[r][c],nB=N[r][c+1],nC=N[r+1][c],nD=N[r+1][c+1];let w0,w1,w2,w3;
    if(flip(r,c)){if(s+t<=1){w0=1-s-t;w1=s;w2=t;w3=0;}else{w0=0;w1=1-t;w2=1-s;w3=s+t-1;}}else if(t>=s){w0=1-t;w1=0;w2=t-s;w3=s;}else{w0=1-s;w1=s-t;w2=0;w3=t;}
    for(let k=0;k<3;k++){o[k]=A[k]*w0+B[k]*w1+Cc[k]*w2+D[k]*w3;T[k]=nA[k]*w0+nB[k]*w1+nC[k]*w2+nD[k]*w3;}
    if(off){const l=Math.hypot(T[0],T[1],T[2])||1;for(let k=0;k<3;k++)o[k]+=T[k]/l*off;}o[0]*=sd;return o;};
  f.cz=y=>{let r=0;while(r<NR-2&&R[r+1].nom<y)r++;const t=Math.min(1,Math.max(0,(y-R[r].nom)/(R[r+1].nom-R[r].nom)));return cz[r]+(cz[r+1]-cz[r])*t;};
  /* the row band of a height (for the triangulation of what is laid on it) */
  f.band=y=>{let r=0;while(r<NR-2&&R[r+1].nom<y)r++;return r;};
  f.R=R;f.N=N;f.flip=flip;return f;}
/* a band of a sculpted torso between yb(ph) and yt(ph), round ph in [g(v), 2pi - g(v)] (an opening at the front), at the offset off(v, ph, u): its columns are the sculpt's, its rows the sculpt's rows
   between the edges (each point kept inside the band: where an edge cuts through, the rows above or below it fold onto it), so the band has the very planes of the body */
function pcShellLP(B,key,yb,yt,gap,off){return gget('s3'+key,()=>{const C=B.C,full=C.slice();for(let i=C.length-2;i>=0;i--)full.push(2*Math.PI-C[i]);
  let lo=1,hi=-1;for(const ph of full){lo=Math.min(lo,yb(ph));hi=Math.max(hi,yt(ph));}
  const rows=[lo];for(const r of B.noms)if(r>lo+2e-4&&r<hi-2e-4)rows.push(r);rows.push(hi);
  const W=full.length,H=rows.length,pos=new Float32Array(W*H*3),o=[0,0,0];
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){let ph=full[i];const u=i/(W-1);let a=yb(ph),b=yt(ph),y=Math.min(b,Math.max(a,rows[j])),v=b>a?(y-a)/(b-a):0;
    if(gap){const g=typeof gap==='function'?gap(v):gap,p2=Math.min(2*Math.PI-g,Math.max(g,ph));if(p2!==ph){ph=p2;a=yb(ph);b=yt(ph);y=Math.min(b,Math.max(a,rows[j]));v=b>a?(y-a)/(b-a):0;}}
    B.S(y,ph,typeof off==='function'?off(v,ph,u):off,o);pos[(j*W+i)*3]=o[0];pos[(j*W+i)*3+1]=o[1];pos[(j*W+i)*3+2]=o[2];}
  const NC=C.length,ix=[];for(let j=0;j<H-1;j++){const r=B.band((rows[j]+rows[j+1])/2);for(let i=0;i<W-1;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1,right=(full[i]+full[i+1])/2<Math.PI,hc=right?i:W-2-i;
    if(right!==!!B.flip(r,hc))ix.push(a,b,d,a,d,c);else ix.push(a,b,c,b,d,c);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);return pcFix(g,'axis');});}

/* ---- the limbs ---- */
/* a limb sculpt: rows [ly, dx, dz, r0..r7] - ly down the limb from its top joint (descending), the middle moved by (dx, dz), the radii at the angles k pi/4 round it (0 in front, pi/2 outwards: x+,
   pi behind); written in the finished figure from the joint at the height yf0, carried into the layout (the joint at y0) by inv */
function pcLimbLP(tab,inv,y0,yf0){const rows=tab.map(q=>({ly:inv(yf0+q[0])-y0,c:[q[1],q[2]],r:q.slice(3,11)})),n=rows.length;
  const at=(ly,k,off,o)=>{let i=0;while(i<n-2&&rows[i+1].ly>ly)i++;const A=rows[i],B=rows[i+1],t=Math.min(1,Math.max(0,(A.ly-ly)/(A.ly-B.ly))),kk=((k%8)+8)%8,r=A.r[kk]+(B.r[kk]-A.r[kk])*t+(off||0),a=kk*Math.PI/4;
    o[0]=A.c[0]+(B.c[0]-A.c[0])*t+Math.sin(a)*r;o[1]=ly;o[2]=A.c[1]+(B.c[1]-A.c[1])*t+Math.cos(a)*r;return o;};
  /* the half-widths at a height: [outwards, inwards, in front, behind] (for what is fitted round it) */
  /* the radius at the column k */
  const rad=(ly,k)=>{let i=0;while(i<n-2&&rows[i+1].ly>ly)i++;const A=rows[i],B=rows[i+1],t=Math.min(1,Math.max(0,(A.ly-ly)/(A.ly-B.ly))),kk=((k%8)+8)%8;return A.r[kk]+(B.r[kk]-A.r[kk])*t;};
  const ext=(ly,off)=>{const o=[0,0,0],e=[];for(const k of[2,6,0,4]){at(ly,k,off,o);e.push(k===2||k===6?Math.abs(o[0]):Math.abs(o[2]));}return e;};
  return{rows,at,rad,ext,lys:rows.map(r=>r.ly)};}
/* a tube on a limb sculpt from ly0 down to ly1 (with the sculpt's rows between) at the offset off (a number or (ly, k) -> number); cap0/cap1: the height of a closing point above the top / below the
   bottom (null: open) */
function pcLimbTube(key,L,ly0,ly1,off,cap0,cap1){return gget('plt'+key,()=>{const ls=[ly0];for(const l of L.lys)if(l<ly0-2e-4&&l>ly1+2e-4)ls.push(l);ls.push(ly1);
  const rows=[];if(cap0!=null)rows.push({c:1,ly:ly0+cap0,ref:ly0});for(const l of ls)rows.push({ly:l});if(cap1!=null)rows.push({c:1,ly:ly1-cap1,ref:ly1});
  const W=9,H=rows.length,pos=new Float32Array(W*H*3),o=[0,0,0],of=(ly,k)=>typeof off==='function'?off(ly,k):(off||0);
  rows.forEach((R,j)=>{for(let i=0;i<W;i++){if(R.c){let x=0,z=0;for(let q=0;q<8;q++){L.at(R.ref,q,of(R.ref,q),o);x+=o[0];z+=o[2];}o[0]=x/8;o[1]=R.ly;o[2]=z/8;}else L.at(R.ly,i%8,of(R.ly,i%8),o);
    pos[(j*W+i)*3]=o[0];pos[(j*W+i)*3+1]=o[1];pos[(j*W+i)*3+2]=o[2];}});
  const ix=[];for(let j=0;j<H-1;j++)for(let i=0;i<8;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;ix.push(a,b,d,a,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);return pcFix(g,'axis');});}
/* his arm (the right one: x+ outwards), from the shoulder joint: the top of the deltoid (inside the shoulder), the deltoid at its widest, its lower part, its point on the outside of the arm, the biceps
   and the triceps, above the elbow, the elbow (its point behind), the top of the forearm, the middle of the forearm, its lower part, the wrist (flat: wider front to back) */
const PCBA_M=[
  [.0110,-.0012,0,.0070,.0072,.0078,.0068,.0064,.0052,.0046,.0056],
  [.0070,-.0006,0,.0104,.0108,.0106,.0104,.0100,.0078,.0068,.0082],
  [.0025,0,0,.0124,.0126,.0118,.0122,.0120,.0096,.0086,.0100],
  [-.0060,.0004,0,.0132,.0133,.0124,.0130,.0128,.0104,.0098,.0108],
  [-.0160,.0004,0,.0128,.0127,.0124,.0126,.0127,.0107,.0103,.0109],
  [-.0260,.0002,0,.0124,.0117,.0116,.0116,.0125,.0108,.0106,.0110],
  [-.0340,0,0,.0124,.0111,.0108,.0111,.0125,.0108,.0107,.0111],
  [-.0440,0,0,.0121,.0108,.0105,.0108,.0121,.0106,.0105,.0109],
  [-.0530,0,.0001,.0104,.0101,.0099,.0101,.0109,.0100,.0097,.0099],
  [-.0613,0,0,.0092,.0095,.0099,.0099,.0105,.0101,.0097,.0092],
  [-.0695,0,.0004,.0105,.0112,.0121,.0109,.0098,.0102,.0106,.0104],
  [-.0810,0,.0006,.0096,.0095,.0094,.0092,.0088,.0090,.0093,.0095],
  [-.0935,0,.0006,.0080,.0073,.0070,.0072,.0078,.0072,.0069,.0075],
  [-.1041,0,.0005,.0070,.0060,.0054,.0058,.0068,.0058,.0052,.0060]];
/* his leg (the right one), from the hip joint: the top of the thigh (turned in under the hip, so nothing of it shows above the line where the hip lies on it), that line, the upper thigh, the middle of the thigh, above the knee (the inner bulge), the top of the kneecap, the knee, the top of the calf, the
   calf at its fullest, the lower calf, above the ankle (the tendon behind), the ankle bones */
const PCBL_M=[
  [0,0,.0005,.0144,.0149,.0141,.0147,.0142,.0123,.0110,.0125],
  [-.003,0,.0006,.0184,.0188,.0177,.0186,.0183,.0158,.0142,.0160],
  [-.020,0,.0012,.0212,.0202,.0178,.0198,.0212,.0182,.0168,.0188],
  [-.040,0,.0012,.0202,.0190,.0175,.0180,.0190,.0166,.0157,.0178],
  [-.058,0,.0009,.0175,.0163,.0153,.0152,.0162,.0146,.0153,.0167],
  [-.072,0,.0005,.0148,.0142,.0129,.0130,.0139,.0129,.0131,.0145],
  [-.082,0,0,.0145,.0135,.0122,.0125,.0131,.0127,.0125,.0135],
  [-.092,0,-.0020,.0134,.0129,.0134,.0150,.0174,.0151,.0139,.0127],
  [-.104,0,-.0035,.0112,.0123,.0146,.0162,.0180,.0160,.0146,.0117],
  [-.124,0,-.0035,.0096,.0100,.0109,.0119,.0131,.0115,.0105,.0096],
  [-.144,0,-.0028,.0086,.0084,.0086,.0090,.0096,.0088,.0085,.0084],
  [-.156,0,-.0025,.0090,.0090,.0098,.0092,.0094,.0092,.0096,.0090],
  [-.170,0,-.0020,.0060,.0062,.0066,.0062,.0062,.0062,.0064,.0060]];

/* her arm (from her shoulder joint; her elbow and wrist where her bones are after her lift) and her leg: slimmer, the elbow and the knee narrow, the thighs full at the top, slim ankles */
const PCBA_F=[
  [.0100,-.0011,0,.0060,.0062,.0066,.0058,.0055,.0045,.0040,.0048],
  [.0062,-.0006,0,.0088,.0091,.0089,.0088,.0085,.0067,.0059,.0070],
  [.0022,0,0,.0104,.0106,.0100,.0103,.0101,.0083,.0075,.0085],
  [-.0060,.0003,0,.0110,.0111,.0105,.0109,.0108,.0090,.0085,.0093],
  [-.0170,.0003,0,.0106,.0105,.0104,.0104,.0106,.0092,.0089,.0094],
  [-.0280,.0001,0,.0103,.0097,.0096,.0096,.0104,.0093,.0091,.0095],
  [-.0370,0,0,.0102,.0092,.0089,.0092,.0103,.0092,.0091,.0094],
  [-.0480,0,0,.0099,.0089,.0087,.0089,.0099,.0090,.0089,.0092],
  [-.0575,0,.0001,.0087,.0084,.0083,.0085,.0091,.0084,.0082,.0084],
  [-.0658,0,0,.0078,.0080,.0083,.0083,.0087,.0085,.0082,.0077],
  [-.0745,0,.0004,.0088,.0093,.0100,.0091,.0083,.0086,.0089,.0088],
  [-.0870,0,.0005,.0080,.0079,.0078,.0076,.0073,.0075,.0078,.0079],
  [-.1020,0,.0005,.0066,.0060,.0057,.0059,.0064,.0059,.0057,.0062],
  [-.1158,0,.0004,.0058,.0050,.0046,.0049,.0057,.0049,.0044,.0050]];
const PCBL_F=[
  [0,0,.0005,.0139,.0144,.0141,.0144,.0138,.0122,.0110,.0122],
  [-.003,0,.0006,.0178,.0182,.0176,.0182,.0177,.0156,.0142,.0156],
  [-.020,0,.0012,.0200,.0192,.0178,.0190,.0204,.0176,.0166,.0180],
  [-.040,0,.0012,.0188,.0178,.0168,.0170,.0178,.0158,.0150,.0168],
  [-.058,0,.0009,.0160,.0149,.0141,.0140,.0148,.0135,.0140,.0152],
  [-.072,0,.0005,.0132,.0126,.0114,.0115,.0124,.0115,.0118,.0130],
  [-.082,0,0,.0128,.0120,.0108,.0110,.0116,.0112,.0111,.0120],
  [-.092,0,-.0018,.0118,.0114,.0118,.0130,.0150,.0132,.0122,.0112],
  [-.104,0,-.0030,.0100,.0108,.0126,.0140,.0156,.0140,.0128,.0104],
  [-.124,0,-.0030,.0086,.0089,.0096,.0104,.0114,.0101,.0093,.0086],
  [-.144,0,-.0024,.0076,.0074,.0076,.0079,.0084,.0078,.0075,.0074],
  [-.156,0,-.0022,.0080,.0080,.0087,.0082,.0083,.0082,.0085,.0080],
  [-.170,0,-.0018,.0053,.0055,.0058,.0055,.0055,.0055,.0057,.0053]];

/* ---- the foot ---- */
/* sections across the foot at z (heel to toes; the ankle joint at z 0), rings of eight points [x, height above the ground] from the top outer corner down the outside, along the sole and up the inside:
   the round of the heel, the heel and the tendon, the ankle (the outer ankle bone lower than the inner), the instep, the arch (the inner sole lifted), the ball (the widest), the roots of the toes, the toes
   (the big toe longest) - for his foot 0.056 long; tips: the closing points behind the heel and in front of the toes [z, x, height] */
const PCF_M=[
  [-.0165,[[.0024,.0092],[.0046,.0070],[.0054,.0030],[.0034,0],[-.0034,0],[-.0054,.0030],[-.0046,.0070],[-.0024,.0092]]],
  [-.0120,[[.0036,.0190],[.0066,.0150],[.0074,.0060],[.0054,0],[-.0054,0],[-.0074,.0060],[-.0066,.0150],[-.0036,.0190]]],
  [-.0040,[[.0050,.0300],[.0088,.0215],[.0090,.0068],[.0066,0],[-.0066,0],[-.0086,.0078],[-.0086,.0240],[-.0050,.0300]]],
  [.0060,[[.0050,.0255],[.0094,.0158],[.0097,.0055],[.0076,0],[-.0072,.0012],[-.0089,.0065],[-.0086,.0185],[-.0046,.0262]]],
  [.0165,[[.0056,.0190],[.0106,.0122],[.0112,.0045],[.0091,0],[-.0076,.0022],[-.0099,.0066],[-.0093,.0146],[-.0041,.0194]]],
  [.0270,[[.0060,.0136],[.0118,.0086],[.0122,.0035],[.0100,0],[-.0100,0],[-.0128,.0036],[-.0118,.0096],[-.0045,.0141]]],
  [.0345,[[.0055,.0099],[.0105,.0066],[.0110,.0025],[.0090,0],[-.0095,0],[-.0120,.0028],[-.0110,.0080],[-.0040,.0106]]],
  [.0395,[[.0035,.0060],[.0060,.0040],[.0065,.0018],[.0050,0],[-.0080,0],[-.0098,.0020],[-.0090,.0055],[-.0030,.0068]]]];
const PCF_TIP=[[-.0172,0,.004],[.0412,-.0015,.0035]];
/* a solid along z through rings of eight points (sections [z, ring]) closed by the points tips; fx/fz/fh scale it; gy: the ground; o(i, k, p) may move a point (a shoe round the foot) */
function pcFootGeo(key,secs,tips,fx,fz,fh,gy,o){return gget('pft'+key,()=>{const W=9,rows=[];
  rows.push(Array.from({length:W},()=>[tips[0][1]*fx,gy+tips[0][2]*fh,tips[0][0]*fz]));
  secs.forEach(([z,ring],i)=>rows.push(Array.from({length:W},(_,k)=>{const p=ring[k%8],q=[p[0]*fx,gy+p[1]*fh,z*fz];return o?o(i,k%8,q):q;})));
  rows.push(Array.from({length:W},()=>[tips[1][1]*fx,gy+tips[1][2]*fh,tips[1][0]*fz]));
  const H=rows.length,pos=new Float32Array(W*H*3);rows.forEach((r,j)=>r.forEach((p,i)=>pos.set(p,(j*W+i)*3)));
  const ix=[];for(let j=0;j<H-1;j++)for(let i=0;i<8;i++){const a=j*W+i,b=a+1,c=a+W,d=c+1;ix.push(a,c,d,a,d,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();
  /* outwards: away from the middle line of the foot */let s=0;const n=g.attributes.normal.array;for(let i=0;i<pos.length;i+=3)s+=n[i]*pos[i]+n[i+1]*(pos[i+1]-gy-.008*fh);
  if(s<0){for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}g.setIndex(ix);g.computeVertexNormals();}return g;});}

/* ---- the hands ---- */
/* a low-poly hand for a hand of length 1 (the right hand: the palm towards -x, the back +x, the thumb forward +z, the fingers down -y; the wrist at 0): the palm (wrist, thenar, the lower palm,
   the knuckles), four fingers of three joints and a thumb, each a five-sided tube through its joints; grip: closed round a handle along z at (-.12, -.577). wz: the width (z) */
const PCH_F=[/* [z of the root, half-width, half-thickness, lengths of the three joints, relaxed curl of the three joints, spread] index, middle, ring, little */
  [.150,.053,.044,[.23,.135,.105],[.24,.36,.26],.022],[.050,.055,.045,[.255,.155,.115],[.28,.42,.29],0],[-.053,.051,.043,[.24,.145,.11],[.32,.46,.31],-.02],[-.148,.045,.038,[.185,.11,.095],[.37,.5,.33],-.045]];
function pcHandGeo(key,grip,wz){return gget('phd'+key+(grip?'g':'o')+k5(wz),()=>{const P=[];
  const tri=(a,b,c)=>P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);
  /* a tube through rings (each ring a list of points, the same count), closed at both ends (by the middle of the end rings) */
  const tube=(rings)=>{const n=rings[0].length,ctr=r=>{const m=[0,0,0];for(const p of r){m[0]+=p[0]/n;m[1]+=p[1]/n;m[2]+=p[2]/n;}return m;};
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=rings[j][i],b=rings[j][(i+1)%n],c=rings[j+1][i],d=rings[j+1][(i+1)%n];tri(a,b,d);tri(a,d,c);}
    const c0=ctr(rings[0]),c1=ctr(rings[rings.length-1]);for(let i=0;i<n;i++){tri(c0,rings[0][(i+1)%n],rings[0][i]);tri(c1,rings[rings.length-1][i],rings[rings.length-1][(i+1)%n]);}};
  /* the palm: rings across it [x, z] at y */
  const PR=[[0,[[.125,0],[.10,.12],[0,.16],[-.105,.11],[-.125,0],[-.105,-.11],[0,-.15],[.10,-.11]]],[-.17,[[.085,0],[.07,.165],[-.01,.21],[-.115,.15],[-.09,0],[-.09,-.135],[0,-.18],[.07,-.15]]],
    [-.40,[[.072,0],[.055,.185],[-.005,.215],[-.07,.17],[-.075,0],[-.07,-.155],[0,-.19],[.055,-.17]]],[-.47,[[.066,0],[.05,.19],[0,.21],[-.055,.18],[-.06,0],[-.055,-.16],[0,-.185],[.05,-.17]]]];
  tube(PR.map(([y,r])=>r.map(p=>[p[0],y,p[1]*wz])));
  /* a finger through the joints pts (half-widths hw, half-thicknesses ht at each; us: the direction of the back of the finger at each) */
  const finger=(pts,us,hw,ht)=>{const rings=pts.map((p,j)=>{const d=j<pts.length-1?[pts[j+1][0]-p[0],pts[j+1][1]-p[1],pts[j+1][2]-p[2]]:[p[0]-pts[j-1][0],p[1]-pts[j-1][1],p[2]-pts[j-1][2]];
      const ld=Math.hypot(d[0],d[1],d[2])||1,dn=[d[0]/ld,d[1]/ld,d[2]/ld],u0=us[j],ud=u0[0]*dn[0]+u0[1]*dn[1]+u0[2]*dn[2],u=[u0[0]-ud*dn[0],u0[1]-ud*dn[1],u0[2]-ud*dn[2]],lu=Math.hypot(u[0],u[1],u[2])||1;u[0]/=lu;u[1]/=lu;u[2]/=lu;const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],lv=Math.hypot(v[0],v[1],v[2])||1;v[0]/=lv;v[1]/=lv;v[2]/=lv;const w=hw[j],t=ht[j];
      return[[t,0],[.55*t,w],[-t,.85*w],[-t,-.85*w],[.55*t,-w]].map(([a,b])=>[p[0]+u[0]*a+v[0]*b,p[1]+u[1]*a+v[1]*b,p[2]+u[2]*a+v[2]*b]);});tube(rings);};
  PCH_F.forEach(([z0,hw,ht,L,curl,spr],fi)=>{const cu=grip?[1.15,1.45,.95]:curl,sp=grip?spr*.3:spr,y0=-.455+(fi===3?.03:fi===0?.008:0),z=z0*wz;let th=0;
    const pts=[[0,y0+.04,z],[0,y0,z]],us=[[1,0,0],[1,0,0]];let p=[0,y0,z];
    for(let j=0;j<3;j++){th+=cu[j];const d=[-Math.sin(th),-Math.cos(th)*Math.cos(sp),Math.cos(th)*Math.sin(sp)];p=[p[0]+d[0]*L[j],p[1]+d[1]*L[j],p[2]+d[2]*L[j]];pts.push(p.slice());
      const tt=th+(j<2?cu[j+1]/2:0);us.push([Math.cos(tt),-Math.sin(tt),0]);}
    us[1]=[Math.cos(cu[0]/2),-Math.sin(cu[0]/2),0];
    const kw=[1,1.06,1,.95,.86],kt=[1,1.04,1,.94,.84];finger(pts,us,kw.map(q=>q*hw*wz),kt.map(q=>q*ht));});
  /* the thumb: from inside the palm by its root, forward and towards the palm, its two joints; closed: across the fingers */
  const th=grip?[[-.03,-.06,.12],[-.08,-.2,.22],[-.16,-.31,.2],[-.21,-.40,.12]]:[[-.03,-.07,.12],[-.075,-.22,.24],[-.11,-.34,.29],[-.14,-.44,.305]];
  const tu=grip?[[.3,.2,.93],[.25,.35,.9],[.45,.3,.84],[.6,.2,.77]]:[[.2,-.1,.97],[.55,-.1,.83],[.75,-.15,.64],[.85,-.2,.5]];
  finger(th.map(p=>[p[0],p[1],p[2]*wz]),tu.map(u=>{const l=Math.hypot(u[0],u[1],u[2]);return u.map(q=>q/l);}),[.062,.056,.05,.04].map(q=>q*wz),[.055,.05,.045,.036]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));g.computeVertexNormals();return g;});}

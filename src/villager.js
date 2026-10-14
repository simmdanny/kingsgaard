/* ---------- villagers: the hero's art at a villager's budget ----------
   A villager is made of the same parts as the player's character (src/pc*.js: the low-poly heads, the body sculpt, the garments laid on it, the hair, the hats), so the two look like people of one world.
   The hero's builder is far too heavy for dozens of figures (forty meshes on a skeleton of some forty bones, springs, 15-70 ms a figure), so it only makes a few TEMPLATES (VIL_T: an outfit, a head and a
   hairstyle each), and each template is baked once into one small skinned mesh: every visible part of the figure, posed as the creator shows it (arms a little out, elbows soft), in one geometry
   whose bones are the villager's own thirteen (the hips, the legs, knees and feet, the chest, the head, the upper arms and the forearms) - the weights of the hero's bones are added up into them, so the
   hips, knees, ankles, waist, neck, shoulders and elbows bend softly, a skirt goes with the thigh as far as the hero's skirt does, and the hair and the hat stay on the head. The villagers walk as the hero walks (vilAnim): the phase goes with the ground
   covered, the foot that carries moves back exactly as fast as the villager goes on, the knee bends by two-bone IK, the feet roll heel to toe, the chest turns against the hips, the arms bend.
   Colour: the template is built twice with marker colours in the slots of the look (skin, hair, base layer, outer layer, bottoms, shoes) and every part's colour is solved as a mix of the slots and a
   fixed colour (pcDark, pcLite and pcMix are all such mixes), so a villager gets its own colours by recolouring the vertices (one small colour buffer; position, normal, weights and index are shared by
   every villager of the template). One material for all of them: the hero's flat low-poly shading (PCLOW: wrapped light, the sky light bent up, the soft rim, a little of the colour as light).
   Triangles: the baked figure (4,600-8,700) is reduced to about 3,200 by an edge-collapse simplifier (vilDecimate) and on to 700-900 for the far figure (VIL_FAR m and more, a THREE.LOD on the same
   skeleton: the same points, another index). One draw call a villager.
   The templates are baked while the main menu waits (vilWarm: idle time, one stage at a time); what is not baked yet is baked when the realm is forged; a template the hero's builder cannot give
   (it keeps changing) is left out, and if none can be baked the villagers are the old box figures (vilOld) - the forging of a realm never fails for them.
   Variety comes from a hash of the villager's place (gender, template, skin, hair colour, outer layer, bottoms, shoes) and from what the world's stream drew for it as before (the colour of its top, its
   hat): the stream is drawn exactly as it always was, so the world and the saves are the same. */
const VIL_M=[[0xb47a5a,0x5aaa78,0x785ab4,0xaa648c,0x648caa,0x96a050],[0x78aa8c,0xa0645a,0x5a9696,0x6e8c5a,0xa08c64,0x6464a0]];
/* the templates: [gender, head, hair, top1, top2, bottoms, shoes, accessory] */
const VIL_T=[
  ['m','m_classic','crop','shirt','none','trousers','boots','none'],
  ['m','m_broad','messy','tunic','none','loose','shoes','none'],
  ['m','m_lean','swept','tee','vest','fitted','tallboots','none'],
  ['m','m_soft','buzz','sweater','none','trousers','shoes','none'],
  ['f','f_classic','bun','blouse','none','skirt','shoes','none'],
  ['f','f_heart','braid','tunic','none','longskirt','shoes','none'],
  ['f','f_oval','long','sweater','none','skirt','boots','none'],
  ['f','f_round','ponytail','blouse','vest','longskirt','shoes','none'],
  /* with the wide hat (a villager whose draw gave it a hat) */
  ['m','m_chisel','crop','shirt','vest','trousers','boots','hat'],
  ['m','m_classic','messy','tunic','none','loose','shoes','hat'],
  ['f','f_angular','bun','blouse','none','skirt','shoes','hat'],
  ['f','f_classic','braid','tunic','none','longskirt','shoes','hat']];
const VIL_TPL={};
const VIL_HS=3.45;/* (the scale the villagers are baked at: the hero's before he grew to HS 3.72 - the villagers keep their size) */
/* the hero's bones -> the villager's: 0 body (the hips), 1 legL, 2 legR (the thighs), 3 armL, 4 armR (the upper arms), 5 shinL, 6 shinR, 7 footL, 8 footR (the foot and the toes), 9 chest (the spine,
   the chest and the collarbones), 10 head (the neck and the head), 11 foreL, 12 foreR (the forearm and the hand). A bone the table does not name (the hair's chains, a hat) goes with the nearest of its
   parents that it names. Parents: the legs and the chest hang on the hips, the shins on the thighs, the feet on the shins, the head and the upper arms on the chest, the forearms on the upper arms. */
const VIL_NB=13,VIL_PAR=[-1,0,0,9,9,1,2,5,6,0,9,3,4];
const VIL_BMAP={root:0,thighL:1,thighR:2,upperL:3,upperR:4,shinL:5,shinR:6,footL:7,toeL:7,footR:8,toeR:8,spine:9,chest:9,clavL:9,clavR:9,neck:10,head:10,foreL:11,handL:11,foreR:12,handR:12};
const vilBoneOf=b=>{for(let x=b;x;x=x.parent){const i=VIL_BMAP[x.name];if(i!==undefined)return i;}return 0;};
const vilBone=n=>VIL_BMAP[n]||0;
/* build the hero's figure of a template with the marker colours M in the slots */
function vilHero(t,M){const S=PCX_SKIN[0].c,H=PCX_HAIRC[0].c,C=PCX_CLOTH.slice(0,4).map(o=>o.c),keys=new Set(Object.keys(PCMC));
  PCX_SKIN[0].c=M[0];PCX_HAIRC[0].c=M[1];for(let i=0;i<4;i++)PCX_CLOTH[i].c=M[2+i];
  try{return heroModel('pc',{v:2,name:'Villager',gender:t[0],head:t[1],skin:0,hair:t[2],hairC:0,top1:t[3],top1C:0,top2:t[4],top2C:1,bottoms:t[5],botC:2,shoes:t[6],shoeC:3,acc:t[7],_nokit:true});}
  finally{PCX_SKIN[0].c=S;PCX_HAIRC[0].c=H;for(let i=0;i<4;i++)PCX_CLOTH[i].c=C[i];for(const k of Object.keys(PCMC))if(!keys.has(k))delete PCMC[k];}}
/* every visible part of a built figure in the pose it stands in: positions (figure units), the villager's bone weights, the colour of its material (and its vertex colours) */
/* what hangs from the hips on chains (a skirt, the skirts of a tunic or a coat, a cloak): the hero's springs push it aside as the legs swing; the villager has no springs, so a share of it goes with
   the nearer leg - the thigh from the hip down, the shin too below the knee (a long skirt) - and what hangs in the middle between the legs is shared by both, as cloth hangs between them */
const VIL_HANG=/^(sk|tu|ct|cl)\d/;
function vilParts(g){g.updateMatrixWorld(true);const out=[],v=new THREE.Vector3(),seen=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  const RB=g.userData.pcRig.B,jw=n=>new THREE.Vector3().setFromMatrixPosition(RB[n].matrixWorld),hL=jw('thighL'),hR=jw('thighR'),kL=jw('shinL'),kR=jw('shinR'),hy=(hL.y+hR.y)/2,ky=(kL.y+kR.y)/2;
  const hz=(hL.z+hR.z)/2,hang=(W,o,x,y,z,wc)=>{const h=(hy-y)/Math.max(1e-4,hy-ky),m=wc*(z>hz?.95:.82)*pcSm(0,.6,h);if(m<1e-4)return;const q=.55*pcSm(1.05,1.8,h),t=(x-hL.x)/(hR.x-hL.x),r=pcSm(.2,.8,t);
    W[o]-=m;W[o+1]+=m*(1-q)*(1-r);W[o+2]+=m*(1-q)*r;W[o+5]+=m*q*(1-r);W[o+6]+=m*q*r;};
  g.traverse(o=>{if(!o.isMesh||!seen(o))return;const geo=o.geometry,pa=geo.attributes.position,n=pa.count,P=new Float32Array(n*3),W=new Float32Array(n*VIL_NB),ca=o.material.vertexColors&&geo.attributes.color;
    if(o.isSkinnedMesh){const si=geo.attributes.skinIndex.array,sw=geo.attributes.skinWeight.array,bn=o.skeleton.bones.map(b=>VIL_HANG.test(b.name)?0:vilBoneOf(b)),/* (the hanging chains go to the hips first: hang() shares them out to the legs) */bh=o.skeleton.bones.map(b=>VIL_HANG.test(b.name));
      for(let i=0;i<n;i++){o.boneTransform(i,v);v.applyMatrix4(o.matrixWorld);P[i*3]=v.x;P[i*3+1]=v.y;P[i*3+2]=v.z;let wc=0;for(let k=0;k<4;k++){const w=sw[i*4+k];if(w>0){W[i*VIL_NB+bn[si[i*4+k]]]+=w;if(bh[si[i*4+k]])wc+=w;}}
        if(wc>1e-4)hang(W,i*VIL_NB,v.x,v.y,v.z,wc);}}
    else{let b=o.parent;while(b&&!b.isBone)b=b.parent;const bi=b?vilBoneOf(b):0;
      for(let i=0;i<n;i++){v.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld);P[i*3]=v.x;P[i*3+1]=v.y;P[i*3+2]=v.z;W[i*VIL_NB+bi]=1;}}
    let ix;if(geo.index)ix=Array.from(geo.index.array);else{ix=[];for(let i=0;i<n;i++)ix.push(i);}
    if(o.matrixWorld.determinant()<0&&!o.isSkinnedMesh)for(let i=0;i<ix.length;i+=3){const q=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=q;}
    out.push({P,W,ix,n,col:o.material.color.getHex(),vc:ca?ca.array:null});});
  const rig=g.userData.pcRig.B,jp=n=>new THREE.Vector3().setFromMatrixPosition(rig[n].matrixWorld);
  return{parts:out,joints:{root:jp('root'),spine:jp('spine'),neck:jp('neck'),legL:jp('thighL'),legR:jp('thighR'),armL:jp('upperL'),armR:jp('upperR'),elbowL:jp('foreL'),elbowR:jp('foreR'),handL:jp('handL'),handR:jp('handR'),
    kneeL:jp('shinL'),kneeR:jp('shinR'),ankL:jp('footL'),ankR:jp('footR'),toeL:jp('toeL'),toeR:jp('toeR')}};}
/* a part's colour as a mix of the slots: X = c + sum a_s * slot_s, from the two builds (A and B differ only in the marker colours) */
const vilRGB=x=>[x>>16&255,x>>8&255,x&255];
function vilSolve(xa,xb){const A=vilRGB(xa),B=vilRGB(xb),d=[A[0]-B[0],A[1]-B[1],A[2]-B[2]],D=VIL_M[0].map((m,s)=>{const a=vilRGB(m),b=vilRGB(VIL_M[1][s]);return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];});
  const dot=(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2],res=(a)=>{let r=0;for(let k=0;k<3;k++){let e=d[k];for(const[s,w]of a)e-=w*D[s][k];r=Math.max(r,Math.abs(e));}return r;};
  let best=[],br=res([]);
  if(br>2){for(let s=0;s<6;s++){const w=dot(d,D[s])/dot(D[s],D[s]),a=[[s,w]],r=res(a);if(r<br){br=r;best=a;}}
    if(br>2.5)for(let s=0;s<6;s++)for(let t=s+1;t<6;t++){const a11=dot(D[s],D[s]),a12=dot(D[s],D[t]),a22=dot(D[t],D[t]),b1=dot(d,D[s]),b2=dot(d,D[t]),det=a11*a22-a12*a12;if(Math.abs(det)<1e-6)continue;
      const a=[[s,(b1*a22-b2*a12)/det],[t,(a11*b2-a12*b1)/det]],r=res(a);if(r<br-.5){br=r;best=a;}}}
  const c=A.slice();for(const[s,w]of best){const m=vilRGB(VIL_M[0][s]);for(let k=0;k<3;k++)c[k]-=w*m[k];}
  /* the felt of the wide hat is a fixed colour of the hero's builder: here it is the hat's slot (6) */
  if(!best.length&&xa===0x4f3d2c)return{c:[0,0,0],a:[[6,1]],r:0};
  return{c,a:best,r:br};}
/* fewer triangles: quadric edge collapse (Garland-Heckbert) onto existing vertices, so every point that stays is a point of the hero's sculpt and keeps its weights and colour. P: positions, F: faces
   (indices, changed in place), part: the part of each vertex (an edge never joins two parts, so colours and layers stay apart), w: the weight of each part's error (small parts count more, so a face, a
   finger or an eye is not eaten first), target: the faces to keep, emax: the largest error allowed. The open edges of a part (hems, the rims of hats) are held by planes across them and move only along
   themselves; a collapse that would turn a face over or pinch the surface is refused. Returns the faces that are left. */
function vilDecimate(P,F,part,w,target,emax){const n=P.length/3,m=F.length/3,alive=new Uint8Array(m).fill(1),Q=new Float64Array(n*10);
  /* the faces round each vertex: lists in one array, grown by chaining (head, next) */
  let vfH=new Int32Array(n).fill(-1),vfF=new Int32Array(m*3*2),vfN=new Int32Array(m*3*2),vfC=0;const vfAdd=(v,f)=>{if(vfC>=vfF.length){const a=new Int32Array(vfF.length*2);a.set(vfF);vfF=a;const b=new Int32Array(vfN.length*2);b.set(vfN);vfN=b;}vfF[vfC]=f;vfN[vfC]=vfH[v];vfH[v]=vfC++;};
  const addQ=(v,a,b,c,d,k)=>{const o=v*10;Q[o]+=k*a*a;Q[o+1]+=k*a*b;Q[o+2]+=k*a*c;Q[o+3]+=k*a*d;Q[o+4]+=k*b*b;Q[o+5]+=k*b*c;Q[o+6]+=k*b*d;Q[o+7]+=k*c*c;Q[o+8]+=k*c*d;Q[o+9]+=k*d*d;};
  const nrm=(a,b,c,o)=>{const ux=P[b*3]-P[a*3],uy=P[b*3+1]-P[a*3+1],uz=P[b*3+2]-P[a*3+2],vx=P[c*3]-P[a*3],vy=P[c*3+1]-P[a*3+1],vz=P[c*3+2]-P[a*3+2];o[0]=uy*vz-uz*vy;o[1]=uz*vx-ux*vz;o[2]=ux*vy-uy*vx;return Math.hypot(o[0],o[1],o[2]);};
  const N0=[0,0,0],N1=[0,0,0],ec=new Map(),bnd=new Uint8Array(n);let left=m;
  for(let f=0;f<m;f++){const a=F[f*3],b=F[f*3+1],c=F[f*3+2];if(a===b||b===c||a===c){alive[f]=0;left--;continue;}vfAdd(a,f);vfAdd(b,f);vfAdd(c,f);const L=nrm(a,b,c,N0);if(L<1e-14)continue;
    const nx=N0[0]/L,ny=N0[1]/L,nz=N0[2]/L,d=-(nx*P[a*3]+ny*P[a*3+1]+nz*P[a*3+2]),k=w[part[a]];addQ(a,nx,ny,nz,d,k);addQ(b,nx,ny,nz,d,k);addQ(c,nx,ny,nz,d,k);
    for(let e=0;e<3;e++){const p=F[f*3+e],q=F[f*3+(e+1)%3],key=p<q?p*n+q:q*n+p,o=ec.get(key);if(o!==undefined)ec.set(key,o<0?-o+1:o+1);else ec.set(key,-(f+1));}}
  /* (ec: an edge seen once holds -(its face + 1), an edge seen more often its count + 1 ... a count of 2 or more is never an open edge) */
  const isB=(p,q)=>{const o=ec.get(p<q?p*n+q:q*n+p);return o!==undefined&&o<0;};
  for(const[key,o]of ec)if(o<0){const f=-o-1,p=Math.floor(key/n),q=key-p*n,a=F[f*3],b=F[f*3+1],c=F[f*3+2],L=nrm(a,b,c,N0);if(L<1e-14)continue;const ex=P[q*3]-P[p*3],ey=P[q*3+1]-P[p*3+1],ez=P[q*3+2]-P[p*3+2];
    let cx=ey*N0[2]-ez*N0[1],cy=ez*N0[0]-ex*N0[2],cz=ex*N0[1]-ey*N0[0];const cl=Math.hypot(cx,cy,cz);if(cl<1e-14)continue;cx/=cl;cy/=cl;cz/=cl;const d=-(cx*P[p*3]+cy*P[p*3+1]+cz*P[p*3+2]),k=w[part[p]]*4;
    addQ(p,cx,cy,cz,d,k);addQ(q,cx,cy,cz,d,k);bnd[p]=1;bnd[q]=1;}
  /* the queue: a binary heap in typed arrays */
  let cap=ec.size*4,hC=new Float64Array(cap),hU=new Int32Array(cap),hV=new Int32Array(cap),hS=new Int32Array(cap),hT=new Int32Array(cap),hn=0;
  const st=new Int32Array(n),dead=new Uint8Array(n);
  const swap=(i,j)=>{let t=hC[i];hC[i]=hC[j];hC[j]=t;t=hU[i];hU[i]=hU[j];hU[j]=t;t=hV[i];hV[i]=hV[j];hV[j]=t;t=hS[i];hS[i]=hS[j];hS[j]=t;t=hT[i];hT[i]=hT[j];hT[j]=t;};
  const push=(u,v)=>{if(dead[u]||dead[v]||part[u]!==part[v])return;if(bnd[u]&&!isB(u,v))return;const x=P[v*3],y=P[v*3+1],z=P[v*3+2],dx=x-P[u*3],dy=y-P[u*3+1],dz=z-P[u*3+2];let c=0;
    for(const o of[u*10,v*10])c+=Q[o]*x*x+2*Q[o+1]*x*y+2*Q[o+2]*x*z+2*Q[o+3]*x+Q[o+4]*y*y+2*Q[o+5]*y*z+2*Q[o+6]*y+Q[o+7]*z*z+2*Q[o+8]*z+Q[o+9];
    c=Math.max(0,c)+.002*w[part[u]]*(dx*dx+dy*dy+dz*dz);if(c>emax)return;
    if(hn>=cap){cap*=2;const g=(a,T)=>{const b=new T(cap);b.set(a);return b;};hC=g(hC,Float64Array);hU=g(hU,Int32Array);hV=g(hV,Int32Array);hS=g(hS,Int32Array);hT=g(hT,Int32Array);}
    let i=hn++;hC[i]=c;hU[i]=u;hV[i]=v;hS[i]=st[u];hT[i]=st[v];while(i>0){const j=(i-1)>>1;if(hC[j]<=hC[i])break;swap(i,j);i=j;}};
  const pop=()=>{hn--;if(hn>0){swap(0,hn);let i=0;for(;;){const l=2*i+1,r=l+1;let s=i;if(l<hn&&hC[l]<hC[s])s=l;if(r<hn&&hC[r]<hC[s])s=r;if(s===i)break;swap(i,s);i=s;}}return hn;};
  /* neighbours by tags (no sets): tag a vertex's neighbours with a number, count the other's neighbours that carry it */
  const tag=new Int32Array(n);let tg=0;const NB=[];
  const nbs=(u,out)=>{out.length=0;tg++;for(let e=vfH[u];e>=0;e=vfN[e]){const f=vfF[e];if(!alive[f])continue;for(let k=0;k<3;k++){const x=F[f*3+k];if(x!==u&&tag[x]!==tg){tag[x]=tg;out.push(x);}}}return tg;};
  for(const key of ec.keys()){const p=Math.floor(key/n),q=key-p*n;push(p,q);push(q,p);}
  const Nv=[];
  while(left>target&&hn>0){pop();const u=hU[hn],v=hV[hn];if(dead[u]||dead[v]||st[u]!==hS[hn]||st[v]!==hT[hn])continue;
    /* the link condition: u and v may share only the one or two neighbours of the faces on their edge */
    const tu=nbs(u,NB);if(tag[v]!==tu)continue;let common=0;for(let e=vfH[v];e>=0;e=vfN[e]){const f=vfF[e];if(!alive[f])continue;for(let k=0;k<3;k++){const x=F[f*3+k];if(x!==v&&x!==u&&tag[x]===tu){tag[x]=-1;common++;}}}
    if(common>(isB(u,v)?1:2))continue;
    let ok=true;for(let e=vfH[u];e>=0&&ok;e=vfN[e]){const f=vfF[e];if(!alive[f])continue;const a=F[f*3],b=F[f*3+1],cc=F[f*3+2];if(a===v||b===v||cc===v)continue;const L0=nrm(a,b,cc,N0),L1=nrm(a===u?v:a,b===u?v:b,cc===u?v:cc,N1);
      if(L1<1e-14||(N0[0]*N1[0]+N0[1]*N1[1]+N0[2]*N1[2])<.3*L0*L1)ok=false;}
    if(!ok)continue;
    /* (an open edge that passed through u now runs to v) */
    for(const x of NB)if(x!==v&&isB(u,x)){const key=v<x?v*n+x:x*n+v;if(!ec.has(key))ec.set(key,-1);}
    for(let e=vfH[u];e>=0;e=vfN[e]){const f=vfF[e];if(!alive[f])continue;const o=f*3;if(F[o]===v||F[o+1]===v||F[o+2]===v){alive[f]=0;left--;continue;}for(let k=0;k<3;k++)if(F[o+k]===u)F[o+k]=v;vfAdd(v,f);}
    for(let k=0;k<10;k++)Q[v*10+k]+=Q[u*10+k];dead[u]=1;st[v]++;vfH[u]=-1;
    /* (only the edges at v cost anything new: v's quadric grew) */
    nbs(v,Nv);for(const x of Nv){push(v,x);push(x,v);}}
  const out=[];for(let f=0;f<m;f++)if(alive[f])out.push(F[f*3],F[f*3+1],F[f*3+2]);return out;}
/* a template: built twice, baked into shared arrays, its triangles reduced */
let VIL_TRI=3200,VIL_TRIF=700;const VIL_FAR=24;/* (the faces a template keeps; a let, so the lab can compare) */
/* (a generator: it stops after each stage, a few tens of ms each, so the main menu can bake the templates while it waits, vilWarm; vilTemplate runs it through) */
function* vilBake(ti){const t=VIL_T[ti],job=VIL_JOB[ti];let t0=performance.now();const lap=()=>{job.ms+=performance.now()-t0;};
  const ga=vilHero(t,VIL_M[0]);lap();yield;t0=performance.now();const gb=vilHero(t,VIL_M[1]);lap();yield;t0=performance.now();const A=vilParts(ga),B=vilParts(gb),K=VIL_HS/2.78;
  /* (the two builds must differ in their colours only: the same parts, the same points, the same vertex colours - those are multipliers of the part's colour) */
  if(A.parts.length!==B.parts.length||A.parts.some((p,i)=>p.n!==B.parts[i].n||!p.vc!==!B.parts[i].vc||(p.vc&&p.vc.some((x,k)=>Math.abs(x-B.parts[i].vc[k])>.002))))throw new Error('the two builds differ');
  /* weld: within a part, vertices at one place (with one vertex colour) become one */
  let N0=0,ni=0;for(const p of A.parts){N0+=p.n;ni+=p.ix.length;}
  const P=new Float64Array(N0*3),part=new Int32Array(N0),vcm=new Float32Array(N0*3),W=new Float32Array(N0*VIL_NB),F=new Int32Array(ni),cols=[],wp=[];let nv0=0,fi=0;
  A.parts.forEach((p,pi)=>{cols.push(vilSolve(p.col,B.parts[pi].col));const map=new Int32Array(p.n),keys=new Map();let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;
    for(let i=0;i<p.n;i++){const x=p.P[i*3]*K,y=p.P[i*3+1]*K,z=p.P[i*3+2]*K,c0=p.vc?p.vc[i*3]:1,c1=p.vc?p.vc[i*3+1]:1,c2=p.vc?p.vc[i*3+2]:1;
      if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z;
      const qx=Math.round(x*2e5),qy=Math.round(y*2e5),qz=Math.round(z*2e5),h=((qx*73856093)^(qy*19349663)^(qz*83492791)^Math.round((c0+2*c1+4*c2)*500))|0;let L=keys.get(h),o=-1;
      if(L)for(const j of L)if(Math.round(P[j*3]*2e5)===qx&&Math.round(P[j*3+1]*2e5)===qy&&Math.round(P[j*3+2]*2e5)===qz&&vcm[j*3]===c0&&vcm[j*3+1]===c1&&vcm[j*3+2]===c2){o=j;break;}
      if(o<0){o=nv0++;if(L)L.push(o);else keys.set(h,[o]);P[o*3]=x;P[o*3+1]=y;P[o*3+2]=z;part[o]=pi;vcm[o*3]=c0;vcm[o*3+1]=c1;vcm[o*3+2]=c2;for(let b=0;b<VIL_NB;b++)W[o*VIL_NB+b]=p.W[i*VIL_NB+b];}map[i]=o;}
    for(const q of p.ix)F[fi++]=map[q];
    /* a part's error counts by its size: what is small is drawn with few faces already */
    const D=Math.hypot(x1-x0,y1-y0,z1-z0);wp.push(Math.min(60,(.12/Math.max(.004,D))**2));});
  lap();yield;t0=performance.now();const Fd=vilDecimate(P.subarray(0,nv0*3),F,part,wp,VIL_TRI,1e-5);lap();yield;t0=performance.now();
  /* the far figure (VIL_FAR m and more from the camera): reduced on from the near one, so its points are the near one's and it needs only an index of its own */
  const Ff=vilDecimate(P.subarray(0,nv0*3),Int32Array.from(Fd),part,wp,VIL_TRIF,4e-4);lap();yield;t0=performance.now();
  /* keep the vertices still used */
  const use=new Int32Array(nv0).fill(-1);let nv=0;for(const q of Fd)if(use[q]<0)use[q]=nv++;
  const pos=new Float32Array(nv*3),si=new Uint16Array(nv*4),sw=new Float32Array(nv*4),prt=new Uint16Array(nv),vc=new Float32Array(nv*3),idx=new(nv>65535?Uint32Array:Uint16Array)(Fd.length),wb=new Array(VIL_NB).fill(0),ord=wb.map((x,i)=>i);
  for(let i=0;i<nv0;i++){const o=use[i];if(o<0)continue;for(let k=0;k<3;k++){pos[o*3+k]=P[i*3+k];vc[o*3+k]=vcm[i*3+k];}prt[o]=part[i];
    for(let b=0;b<VIL_NB;b++){wb[b]=W[i*VIL_NB+b];ord[b]=b;}ord.sort((a,b)=>wb[b]-wb[a]);let tw=0;for(let k=0;k<4;k++)tw+=wb[ord[k]];tw=tw||1;for(let k=0;k<4;k++){si[o*4+k]=ord[k];sw[o*4+k]=wb[ord[k]]/tw;}}
  Fd.forEach((q,i)=>{idx[i]=use[q];});const far=new(nv>65535?Uint32Array:Uint16Array)(Ff.length);Ff.forEach((q,i)=>{far[i]=use[q];});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(new THREE.BufferAttribute(idx,1));geo.computeVertexNormals();
  geo.setAttribute('skinIndex',new THREE.BufferAttribute(si,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));geo.computeBoundingSphere();geo.computeBoundingBox();geo.boundingSphere.radius*=1.15;/* (room for the arms raised in work) */
  const J={};for(const k in A.joints)J[k]=A.joints[k].clone().multiplyScalar(K);
  /* the bones of the villager at rest, in the villager's own frame (every bone at the hero's joint, in the order of VIL_BMAP's numbers), and their inverses (shared by every villager of the template) */
  const jv=k=>[J[k].x,J[k].y,J[k].z],rest=[jv('root'),jv('legL'),jv('legR'),jv('armL'),jv('armR'),jv('kneeL'),jv('kneeR'),jv('ankL'),jv('ankR'),jv('spine'),jv('neck'),jv('elbowL'),jv('elbowR')],inv=rest.map(r=>new THREE.Matrix4().makeTranslation(-r[0],-r[1],-r[2]));
  /* the leg in the walk's plane (y, z): the hip, the knee, the ankle at rest - lengths and the angles the thigh and the shin stand at */
  const yz=(a,b)=>Math.hypot(a.y-b.y,a.z-b.z),leg={hy:(J.legL.y+J.legR.y)/2,ay:(J.ankL.y+J.ankR.y)/2,az:(J.ankL.z+J.ankR.z-J.legL.z-J.legR.z)/2,L1:(yz(J.legL,J.kneeL)+yz(J.legR,J.kneeR))/2,L2:(yz(J.kneeL,J.ankL)+yz(J.kneeR,J.ankR))/2,
    t0:Math.atan2((J.kneeL.z+J.kneeR.z-J.legL.z-J.legR.z)/2,(J.legL.y+J.legR.y-J.kneeL.y-J.kneeR.y)/2),s0:Math.atan2((J.ankL.z+J.ankR.z-J.kneeL.z-J.kneeR.z)/2,(J.kneeL.y+J.kneeR.y-J.ankL.y-J.ankR.y)/2)};
  /* the foot: from the ankle to the ball (the heel comes up about it), and to the heel */
  const fb=(yz(J.ankL,J.toeL)+yz(J.ankR,J.toeR))/2,foot={b:fb,h:fb*.45};
  lap();VIL_TPL[ti]={leg,foot,geo,far:new THREE.BufferAttribute(far,1),trisFar:Ff.length/3,part:prt,vcm:vc,cols,rest,inv,J,nv,tris:Fd.length/3,tris0:ni/3,ms:job.ms,res:Math.max(...cols.map(c=>c.r))};}
const VIL_JOB={};
function vilJob(ti){return VIL_JOB[ti]||(VIL_JOB[ti]={ms:0,it:null}),VIL_JOB[ti].it||(VIL_JOB[ti].it=vilBake(ti)),VIL_JOB[ti];}
/* (the hero's builder keeps changing: a template that cannot be baked is left out - never an error in the forging of a realm; vilMake takes another, or the old figure) */
const VIL_BAD={};
function vilTemplate(ti){if(!VIL_TPL[ti]&&!VIL_BAD[ti]){try{const j=vilJob(ti);while(!j.it.next().done);}catch(e){VIL_BAD[ti]=true;console.warn('villager template '+ti+' left out: '+e.message);}delete VIL_JOB[ti];}return VIL_TPL[ti]||null;}
/* while the main menu is open and nothing else happens, one stage at a time in the browser's idle time: the first realm then finds the templates made (what is not made yet is made when it is forged) */
function vilWarm(){let ti=0;const req=()=>{if(window.requestIdleCallback)requestIdleCallback(step,{timeout:3000});else setTimeout(step,80);},step=()=>{while(ti<VIL_T.length&&VIL_TPL[ti])ti++;if(ti>=VIL_T.length)return;
    if(VIL_BAD[ti]){ti++;req();return;}if(!(GM.open&&GM.view==='main'&&!GM.busy)){setTimeout(req,1500);return;}
    const j=vilJob(ti);try{if(j.it.next().done)delete VIL_JOB[ti];}catch(e){VIL_BAD[ti]=true;delete VIL_JOB[ti];console.warn('villager template '+ti+' left out: '+e.message);}req();};setTimeout(req,2500);}
/* the colours of one villager: [skin, hair, top1, top2, bottoms, shoes, hat] -> a colour buffer for the template (cached by colours) */
function vilColors(T,base){const key=base.join(',');T.cc=T.cc||{};if(T.cc[key])return T.cc[key];const B=base.map(vilRGB),pc=T.cols.map(q=>{const o=q.c.slice();for(const[s,w]of q.a)for(let k=0;k<3;k++)o[k]+=w*B[s][k];return o;});
  const n=T.nv,a=new Uint8Array(n*3);for(let i=0;i<n;i++){const c=pc[T.part[i]];for(let k=0;k<3;k++)a[i*3+k]=Math.max(0,Math.min(255,Math.round(c[k]*T.vcm[i*3+k])));}
  return T.cc[key]=new THREE.BufferAttribute(a,3,true);}
/* the villagers' material: the hero's low-poly shading with the colour from the vertices (one program for all of them) */
let VIL_MAT=null;
function vilMat(){if(VIL_MAT)return VIL_MAT;const m=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,specular:0x060606,shininess:3});m.skinning=true;
  m.onBeforeCompile=sh=>{pcRimPatch(sh);sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n\ttotalEmissiveRadiance+=vColor*.045;');};
  m.customProgramCacheKey=()=>'pcrimvil';return VIL_MAT=m;}
/* one villager's figure: g (the group the game places and scales) > body (a bone at the hips) > the legs > the shins > the feet, and body > chest > the head and the upper arms > the forearms; in g a
   THREE.LOD with the near and the far skinned mesh, both on the one skeleton and sharing every buffer but the index */
const VIL_CARRY=[-.95,-.55];/* (the shoulders and the elbows of a villager carrying a plank) */
function vilFigure(ti,base){const T=vilTemplate(ti),g=new THREE.Group(),bones=T.rest.map(()=>new THREE.Bone());
  bones.forEach((b,i)=>{const pi=VIL_PAR[i],r=T.rest[i];if(pi<0){b.position.set(r[0],r[1],r[2]);g.add(b);}else{const q=T.rest[pi];b.position.set(r[0]-q[0],r[1]-q[1],r[2]-q[2]);bones[pi].add(b);}});
  const[body,legL,legR,armL,armR,shinL,shinR,footL,footR,chest,head,foreL,foreR]=bones;
  legL.rotation.order=legR.rotation.order='ZYX';/* (the thigh undoes the hips' turn and drop first, then swings: vilAnim) */
  const skel=new THREE.Skeleton(bones,T.inv),col=vilColors(T,base),I=new THREE.Matrix4(),lod=new THREE.LOD();g.add(lod);
  const mk=idx=>{const geo=new THREE.BufferGeometry();for(const k of['position','normal','skinIndex','skinWeight'])geo.setAttribute(k,T.geo.attributes[k]);geo.setIndex(idx);geo.setAttribute('color',col);
    geo.boundingSphere=T.geo.boundingSphere;geo.boundingBox=T.geo.boundingBox;const m=new THREE.SkinnedMesh(geo,vilMat());m.castShadow=true;m.receiveShadow=true;m.bind(skel,I);return m;};
  const near=mk(T.geo.index);lod.addLevel(near,0);lod.addLevel(mk(T.far),VIL_FAR);
  /* where the plank of a repair lies, in the chest's frame: in the hands of the arms held as vilAnim holds them to carry (the shoulders at VIL_CARRY[0], the elbows bent by VIL_CARRY[1]) */
  const S=T.rest[4],E=T.rest[12],Hd=T.J.handR,C=T.rest[9],rx=(y,z,t)=>[y*Math.cos(t)-z*Math.sin(t),y*Math.sin(t)+z*Math.cos(t)],e1=rx(E[1]-S[1],E[2]-S[2],VIL_CARRY[0]),e2=rx(Hd.y-E[1],Hd.z-E[2],VIL_CARRY[0]+VIL_CARRY[1]);
  return{g,body,legL,legR,armL,armR,shinL,shinR,footL,footR,chest,head,foreL,foreR,mesh:near,lod,T,plank:[S[1]+e1[0]+e2[0]-C[1]+.012,S[2]+e1[1]+e2[1]-C[2]]};}
/* the figure of the villagers before (v15): five meshes of merged boxes - only if no template could be baked */
function vilOld(cloth,hat){const kb=kitBuilder();kb.P('t',box(.1,.17,.07),cloth,0,.26,0);kb.P('t',ico(.055,0),0xe8b894,0,.41,0);if(hat)kb.P('t',cone(.075,.07,6),hat,0,.47,0);
  kb.P('l',box(.042,.16,.05),0x4a3a2a,0,-.075,0);kb.P('l',box(.05,.03,.07),0x2a2018,0,-.15,.012);kb.P('a',box(.036,.14,.042),cloth,0,-.065,0);kb.P('a',ico(.026,0),0xe8b894,0,-.14,0);
  const G={t:mergeParts(kb.B.t),l:mergeParts(kb.B.l),a:mergeParts(kb.B.a)},g=new THREE.Group(),body=new THREE.Group();g.add(body);const torso=new THREE.Mesh(G.t,VCMAT);torso.castShadow=true;body.add(torso);
  const pv=(geo,x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);const m=new THREE.Mesh(geo,VCMAT);m.castShadow=true;q.add(m);body.add(q);return q;};
  const lL=pv(G.l,-.03,.17),lR=pv(G.l,.03,.17),sL=new THREE.Group(),sR=new THREE.Group();lL.add(sL);lR.add(sR);
  const D=()=>new THREE.Group();/* (the bones it does not have: groups nothing hangs on; the plank goes on the body, as before) */
  return{g,body,legL:lL,legR:lR,armL:pv(G.a,-.075,.33),armR:pv(G.a,.075,.33),shinL:sL,shinR:sR,footL:D(),footR:D(),chest:body,head:D(),foreL:D(),foreR:D(),T:null,plank:[.3,.1]};}
/* the walk of a villager (vilAnim): the hero's walk (pcanim.js PCG.walk) at a villager's budget, on its thirteen bones.
   Legs: the phase goes with the ground covered (the strides a second rise with the speed, the first steps from standing slower, as the hero's); a foot is down for 60% of the stride and moves back under
   the hip exactly as fast as the villager goes on, so it stays where it was put - it lands on the heel, rolls flat, and in the last third of the stance the heel comes up and it rolls over the ball;
   in the air it is lifted (the heel up behind first) and brought through on a curve, toes up to clear the ground; thigh and knee by two-bone IK in the walk's plane, the foot turned at the ankle;
   the hips lower where a leg must reach. Body: the hips rise over the foot that carries and dip between, shift a little over it, turn with the leg that swings and drop on its side, lean into a turn;
   the chest turns against the hips, leans a little forward (more as it speeds up) and breathes; the head stays steady over them - it looks where the way turns, now and then glances aside, and looks
   at the hero who comes near. Arms: they swing against the legs, a little behind them, the elbows bending as an arm comes forward. Standing: breath, a slow shift of weight, a look about.
   Every villager walks in its own way (vilVk: pace, cadence, swing of the arms, height of the step, bob, the turn of the hips, a stoop, the elbows, how it holds its head - drawn once from
   Math.random: the look of a walk, never the world's stream). */
const VILW={duty:.6,ah:.38,tf:.75,lr:.985,ro:.5,cad:1.04,sink:.004,hs:.22,to:.65,bob:.005,sway:.004,yaw:.09,tilt:.04,chest:1.6,lean:.045,lag:.07};/* (ah: where a foot lands, as a share of the ground it covers while down - .42 as the hero's walk: at .5 the feet landed half a leg ahead of the hip and the hips dipped to reach them) */
const vilHerm=(w,a,b,m0,m1)=>{const w2=w*w,w3=w2*w;return a*(2*w3-3*w2+1)+b*(3*w2-2*w3)+m0*(w3-2*w2+w)+m1*(w3-w2);};
function vilVk(p){return p.vk||(p.vk={spd:.72+.2*Math.random(),cad:.93+.14*Math.random(),arm:.8+.3*Math.random(),lift:.85+.3*Math.random(),bob:.85+.25*Math.random(),pel:.8+.4*Math.random(),
  stoop:Math.random()<.2?.06+.08*Math.random():-.01+.04*Math.random(),el:(Math.random()-.5)*.14,down:.02+.08*Math.random(),asym:(Math.random()-.5)*.25,ip:Math.random()*6.283,look:3+Math.random()*4});}
const vilCl=x=>Math.max(-1,Math.min(1,x));
/* one frame of a villager's figure: vW its speed (world units a second, as it really moves), o: carry, work (a repair), hero (to look at when near), ahead (how far the way turns from its facing) */
function vilAnim(p,dt,vW,tt,o){o=o||{};const T=p.T,vk=vilVk(p),mv=vW>.04,TAU=6.283185;p.wk=(p.wk||0)+((mv?1:0)-(p.wk||0))*(1-Math.exp(-(mv?5:6)*dt));const wk=p.wk;
  if(!T||!T.leg){/* the old box figure: the old swing */if(mv)p.gait=(p.gait||0)+dt*7.5;const sw=wk*Math.sin(p.gait||0);p.legL.rotation.x=sw*.75;p.legR.rotation.x=-sw*.75;p.body.position.y=wk*Math.abs(Math.cos(p.gait||0))*.022;p.body.rotation.z=sw*.04;
    if(o.carry){p.armL.rotation.x=-1.05;p.armR.rotation.x=-1.05;}else if(o.work){p.armL.rotation.x=-.3;p.armR.rotation.x=-1.25+Math.sin(tt*11+(p.ph||0))*.65;}else{p.armL.rotation.x=-sw*.26;p.armR.rotation.x=sw*.26;}
    p.armL.rotation.z=.05;p.armR.rotation.z=-.05;return;}
  const G=T.leg,R=T.rest,Fm=T.foot,Lg=G.L1+G.L2,sc=p.g.scale.x||1,v=Math.max(0,vW)/sc,u=v/Lg,duty=VILW.duty;
  const f=Math.max(.25,u<2?1.16*Math.pow(u/2,.4):.8+.18*u)*vk.cad*VILW.cad;/* (cad: the villagers are shorter than the hero and walk as fast - quicker, shorter steps, or their feet reach far out in front and behind) */
  if(wk>.005)p.gph=((p.gph||0)+f*dt*Math.max(.3,wk))%1;const ph=p.gph||0,SL=v/f*duty,rl=Math.min(1,u/1.4)*wk;
  /* the feet: where each is (z along the walk, y up, from its place at rest) and how it is pitched (toes up +) */
  const lead=wk*Lg*.025*Math.min(1,u/1.2),Z=p._z||(p._z=[0,0]),Y=p._y||(p._y=[0,0]),PH=p._p||(p._p=[0,0]),AN=p._a||(p._a=[null,null]),LZ=p._lz||(p._lz=[0,0]),LX=p._lx||(p._lx=[0,0]),XO=p._xo||(p._xo=[0,0]),ND=p._nd||(p._nd=[0,0]);let drop=0;
  /* a foot that carries is held where it was put on the ground (in the world: the villager may speed up, slow down or turn while it is down - its stride is worked out from the speed, so a foot
     that only followed the stride would slide), and the swing starts from where the foot really was when it lifted */
  const anc=dt>0&&p.x!=null&&p.yaw!=null&&wk>.5,/* (standing - and being pushed aside - the feet simply stay under it) */cy=Math.cos(p.yaw||0),sy=Math.sin(p.yaw||0),hz=R[1][2];
  for(let i=0;i<2;i++){const u0=(ph+(i?.5:0))%1;let y=0,fp;
    if(u0<duty){const s=u0/duty,zA=SL*(VILW.ah-s)*wk-lead;fp=s<.14?VILW.hs*(1-s/.14):s>VILW.ro?-VILW.to*Math.pow((s-VILW.ro)/(1-VILW.ro),1.6):0;let zz=zA;
      if(!anc){AN[i]=null;XO[i]=0;}else{let a=AN[i];if(!a){const lz=hz+G.az+zA,lx=R[1+i][0];a=AN[i]={x:p.x+(lx*cy+lz*sy)*sc,z:p.z+(-lx*sy+lz*cy)*sc};}
        const dx=a.x-p.x,dz=a.z-p.z;zz=(dx*sy+dz*cy)/sc-hz-G.az;let xo=(dx*cy-dz*sy)/sc-R[1+i][0];if(Math.abs(zz-zA)>Lg*.5||Math.abs(xo)>Lg*.3){AN[i]=null;zz=zA;xo=0;}/* (moved by something else: put down again) */XO[i]=xo;}
      Z[i]=zz;LZ[i]=zz;LX[i]=XO[i];}
    else{AN[i]=null;const w=(u0-duty)/(1-duty),vT=v*(1-duty)/f;Z[i]=vilHerm(w,LZ[i],SL*VILW.ah*wk-lead,-.25*vT*wk,-.25*vT*wk);XO[i]=LX[i]*(1-pcSm(0,.7,w));/* (a foot held aside on a turn comes back under its hip in the air) */
      y=vk.lift*Lg*(.055*Math.pow(Math.sin(Math.PI*w),.9)+.08*Math.pow(Math.sin(Math.PI*Math.min(1,w/.62)),1.6));
      fp=-VILW.to*(1-pcSm(0,.38,w))+VILW.hs*pcSm(.62,1,w)+.08*Math.sin(Math.PI*w);}
    fp*=rl;/* (the heel up behind lifts the ankle by the foot's length to the ball; the toes up at the heel strike lift it a little over the heel) */
    Y[i]=y*wk+(fp<0?Fm.b*Math.sin(-fp):Fm.h*Math.sin(fp));PH[i]=fp;
    /* the ground under the foot (o.ground: the stones, a step of a house, a slope) from the ground under the body: the foot stands on it */
    if(o.ground&&p.y!=null&&p.x!=null){const lx=R[1+i][0]+XO[i];let gw=-1e9;for(const fz of[-Fm.h,0,Fm.b]){const lz=hz+G.az+Z[i]+fz,q=o.ground(p.x+(lx*cy+lz*sy)*sc,p.z+(-lx*sy+lz*cy)*sc);if(q!=null&&isFinite(q)&&q>gw)gw=q;}/* (under the heel, the ankle and the ball: a foot across the edge of a step stands on the higher tread) */
      if(gw>-1e8)Y[i]+=Math.max(-.3*Lg,Math.min(.5*Lg,(gw-p.y)/sc));}
    {const cw=u0<duty?1-pcSm(VILW.tf,1,u0/duty):pcSm(.55,1,(u0-duty)/(1-duty));/* (late in its stance the foot behind is leaving - heel up, on its toes - and no longer pulls the hips down after it, as the hero's early toe-off; tf: from what share of the stance) */if(cw>0){const Lr=Lg*VILW.lr,zz=G.az+Z[i],h2=Lr*Lr-zz*zz,nd=Math.max(0,(G.hy-G.ay-Y[i])-(h2>0?Math.sqrt(h2):0))*cw;ND[i]=nd;}else ND[i]=0;}}
  /* (the hips' drop: the larger of the two legs' needs, rounded where they cross; a foot coming down to land counts as it nears the ground) */
  {const kq=.01*Lg,mx=Math.max(ND[0],ND[1]),hq=Math.max(kq-Math.abs(ND[0]-ND[1]),0)/kq;drop=mx+hq*hq*kq*.25;}
  drop=Math.min(drop,Lg*.15);if(!(dt>0)||p.dropS==null){p.dropS=drop;p.dropV=0;}else{let dv=p.dropV||0;const n=Math.max(1,Math.ceil(dt/.008)),h=dt/n;for(let k=0;k<n;k++){dv+=((drop-p.dropS)*900-dv*60)*h;p.dropS+=dv*h;}p.dropV=dv;
    if(p.dropS<drop-Lg*.02){p.dropS=drop-Lg*.02;p.dropV=Math.max(0,p.dropV);}}/* (a critically damped spring, never more than 2% of a leg short of the reach) */
  /* the hips */
  const c1=Math.cos(TAU*(ph-duty/2)),c2=Math.cos(2*TAU*(ph-duty/2)),idle=1-wk,ws=Math.sin(tt*.9+vk.ip)*Math.sin(tt*.37+vk.ip*2),br=Math.sin(tt*1.45+vk.ip);
  const hy=G.hy-p.dropS+wk*Lg*(VILW.bob*vk.bob*c2-VILW.sink);p.body.position.set(R[0][0]-wk*VILW.sway*c1+idle*.0025*ws,R[0][1]+hy-G.hy,R[0][2]);
  const yr=dt>0&&p.yaw!=null&&p.yawP!=null?pcWrap(p.yaw-p.yawP)/dt:0;p.yawP=p.yaw;p.turn=(p.turn||0)+(Math.max(-2,Math.min(2,yr))-(p.turn||0))*(1-Math.exp(-6*dt));
  const ac=dt>0?(vW-(p.vPrev||0))/dt:0;p.vPrev=vW;p.acc=(p.acc||0)+(Math.max(-3,Math.min(3,ac))-(p.acc||0))*(1-Math.exp(-4*dt));
  p.body.rotation.set(0,wk*VILW.yaw*vk.pel*Math.cos(TAU*ph),-wk*VILW.tilt*vk.pel*c1-Math.max(-.07,Math.min(.07,p.turn*u*.012))+idle*.022*ws);
  /* the chest: against the hips, a little forward, breathing */
  const ch=p.chest;ch.rotation.set(vk.stoop+wk*(VILW.lean+.01*Math.min(u,3))+p.acc*.02+idle*.012*br+(o.work?.12:0),-p.body.rotation.y*VILW.chest,-p.body.rotation.z*.6-idle*.014*ws);
  /* the head: steady, where the way goes, a glance now and then, the hero when near */
  const gl=p.gl||(p.gl={y:0,x:0,ty:0,tx:0,t:1+Math.random()*3,on:false,hero:false});gl.t-=dt;let hY=null;
  if(o.hero&&!o.work){const H=o.hero,dx=H.x-p.x,dz=H.z-p.z,dd=Math.hypot(dx,dz);if(dd<5.5&&dd>.3){const ry=pcWrap(Math.atan2(dx,dz)-(p.yaw||0));if(Math.abs(ry)<1.9)hY=Math.max(-1.05,Math.min(1.05,ry));}}
  if(gl.t<=0){if(gl.on){gl.on=false;gl.hero=false;gl.ty=0;gl.tx=0;gl.t=(wk>.5?vk.look:1.5+Math.random()*2.5)*(.6+Math.random()*.8);}
    else{gl.on=true;gl.t=.8+Math.random()*(wk>.5?1.4:2.6);gl.hero=hY!=null&&Math.random()<.7;if(!gl.hero){const sd=Math.random()<.5?-1:1;gl.ty=sd*(wk>.5?.2+.4*Math.random():.15+.7*Math.random());gl.tx=(Math.random()-.4)*.25;}}}
  if(gl.hero){if(hY==null)gl.hero=false;else{gl.ty=hY;gl.tx=-.04;}}if(o.work){gl.ty=0;gl.tx=.22;}
  gl.y+=(gl.ty-gl.y)*(1-Math.exp(-4.5*dt));gl.x+=(gl.tx-gl.x)*(1-Math.exp(-4*dt));
  p.head.rotation.set(-ch.rotation.x*.75+vk.down+gl.x,-(p.body.rotation.y+ch.rotation.y)*.85+gl.y+Math.max(-.6,Math.min(.6,o.ahead||0))*.8*wk,-(p.body.rotation.z+ch.rotation.z)*.7);
  /* the arms */
  const aL=p.armL,aR=p.armR,fL=p.foreL,fR=p.foreR;
  if(o.carry){aL.rotation.set(VIL_CARRY[0],0,.12);aR.rotation.set(VIL_CARRY[0],0,-.12);fL.rotation.set(VIL_CARRY[1],0,0);fR.rotation.set(VIL_CARRY[1],0,0);}
  else if(o.work){const hm=Math.sin(tt*11+(p.ph||0));aL.rotation.set(-.35,0,.08);fL.rotation.set(-.45,0,0);aR.rotation.set(-1.15+hm*.6,0,-.06);fR.rotation.set(-.55-.35*Math.max(0,hm),0,0);}
  else{const sw=Math.cos(TAU*(ph-VILW.lag)),swE=Math.cos(TAU*(ph-VILW.lag-.06)),A=wk*vk.arm*(.07+.08*Math.min(u,2.4)),bias=.02*wk,sL=sw*(1+vk.asym),sR=sw*(1-vk.asym),el0=.1+vk.el;
    aL.rotation.set(A*sL+bias+idle*.01*br,0,.05+wk*.02*Math.max(0,-sL));aR.rotation.set(-A*sR+bias+idle*.01*br,0,-.05-wk*.02*Math.max(0,sR));
    fL.rotation.set(-(el0+wk*(.06+.12*Math.max(0,-swE))*vk.arm),0,0);fR.rotation.set(-(el0+wk*(.06+.12*Math.max(0,swE))*vk.arm),0,0);}
  /* the legs: thigh and knee by two-bone IK, the foot at the ankle */
  /* (the thighs turn back what the hips do - the sway, the drop, the turn - so the foot on the ground stays where it is while the hips move over it) */
  if(p.legL.rotation.order!=='ZYX')p.legL.rotation.order=p.legR.rotation.order='ZYX';
  const L1=G.L1,L2=G.L2,legs=[[p.legL,p.shinL,p.footL],[p.legR,p.shinR,p.footR]],bY=p.body.rotation.y,bZ=p.body.rotation.z,bX=p.body.position.x-R[0][0];
  for(let i=0;i<2;i++){const hx=R[1+i][0]-R[0][0],dz=G.az+Z[i]+hx*Math.sin(bY),dy=hy-(G.ay+Y[i]);let d=Math.hypot(dz,dy);/* (the hips' turn carries the hip joint forward or back) */d=Math.min(Math.max(d,1e-4),(L1+L2)*.999);
    const a=Math.atan2(dz,dy),al=Math.acos(vilCl((L1*L1+d*d-L2*L2)/(2*L1*d))),be=Math.acos(vilCl((L2*L2+d*d-L1*L1)/(2*L2*d)));
    const th=a+al,sh=a-be;legs[i][0].rotation.set(-(th-G.t0),-bY,-bZ+(XO[i]-bX)/Math.max(.05,hy-G.ay));legs[i][1].rotation.x=(th-G.t0)-(sh-G.s0);legs[i][2].rotation.x=-PH[i]+(sh-G.s0);}
  return wk*vk.arm*Math.cos(TAU*ph);}
/* (the old call: the walk at a speed, the arm swing back - tests/vil-lab.js poses the arms itself) */
function vilWalk(p,moving,dt,spW){return vilAnim(p,dt,moving?spW:0,0,{});}
/* the colours a villager can wear besides its top (the world's stream draws that, as before): muted outer layers, bottoms (hers a little brighter: skirts), leather shoes */
const VIL_C2=[0x5a4632,0x6b5a3a,0x3e4a3a,0x4a3a4a,0x7a6a50,0x3a4552,0x6a4a3a];
const VIL_CB=[0x4a3a2a,0x5a4a38,0x3a3a43,0x50311c,0x6b5a40,0x2f3a4a,0x5a5048];
const VIL_CBF=[0x6a3a3a,0x4a5a7a,0x5a4a38,0x6b5a40,0x3a4a3a,0x7a5a4a,0x4a3a4a];
const VIL_CS=[0x4a2e19,0x5a3a22,0x3a2a1c,0x6e4527,0x2e2a26];
const vilDist=(a,b)=>{const p=vilRGB(a),q=vilRGB(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);};
/* a villager at (x, z), the i-th of its village: the template and the colours from a hash of the place (never from the world's stream); cloth and hat: what the stream drew */
function vilMake(x,z,i,cloth,hat){const h=k=>owHash2(Math.round(x*7.31)+i*31+k*1013,Math.round(z*5.93)-i*13+k*577),pk=(a,k)=>a[Math.min(a.length-1,Math.floor(h(k)*a.length))];
  const F=h(1)<.5,list=[];VIL_T.forEach((t,ti)=>{if((t[0]==='f')===F&&(t[7]==='hat')===!!hat)list.push(ti);});
  /* (a top too close to the skin reads as a bare chest: then the next skin tone) */
  let sk=Math.floor(h(3)*PCX_SKIN.length);for(let k=0;k<PCX_SKIN.length&&vilDist(PCX_SKIN[sk].c,cloth)<80;k++)sk=(sk+1)%PCX_SKIN.length;
  let ti=pk(list,2);const base=[PCX_SKIN[sk].c,pk(PCX_HAIRC,4).c,cloth,pk(VIL_C2,5),pk(F?VIL_CBF:VIL_CB,6),pk(VIL_CS,7),hat||0x4f3d2c];
  if(!vilTemplate(ti)){ti=list.find(k=>vilTemplate(k));if(ti===undefined)ti=VIL_T.findIndex((t,k)=>vilTemplate(k));}
  return ti>=0&&VIL_TPL[ti]?vilFigure(ti,base):vilOld(cloth,hat);}
vilWarm();

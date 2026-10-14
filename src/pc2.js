/* =====================================================================================================================
   KINGSGAARD - THE PLAYER'S CHARACTER (2): the landmarks of the body, the torso, the skeleton, skinning and the spring bones.

   The character stands on a skeleton of THREE.Bone, built in the bind pose (arms and legs straight down):
     root (the pelvis) - spine - chest - neck - head;  chest - collarbone - upper arm - forearm - hand;  root - thigh - shin - foot - toe;
   plus the chains of spring bones that the hair and the loose cloth hang from (pcChain).
   The body, the clothes, the shoes and the head with its neck are skinned meshes on that skeleton (pcSkinBuild: the weights come from where each vertex is and which part it belongs to), so sleeves and trousers bend at
   the elbow and the knee, the neck follows the head without opening and a skirt swings with the legs; the hands, the eyes, the short hair, the accessories and the weapons are rigid parts on their bones.
   The spring bones (pcSpringStep) lag behind, sway and settle: each link keeps a tail point that has inertia, is pulled back towards its rest direction, falls a little and is pushed out of spheres on the body
   (the legs push a skirt, the back and the shoulders hold long hair); only part of the motion of the whole figure through the world reaches them (inertia), so running does not blow the hair flat.
   Figure units: the figure is about 0.368 tall to the crown (a woman 0.97 of her own 0.366) and is drawn 3.72 times larger (HS; the villagers 3.45, VIL_HS); he is about seven heads tall, she about 6.7; the front is +z.
   ===================================================================================================================== */
/* the heights of the joints and of the landmarks of the body (shared: the woman is the same figure scaled by 0.97 with her own widths), the head unit U and the height of the middle of the head (hc) */
const PCL={y:{ankle:.016,knee:.098,hip:.18,root:.182,spine:.214,chest:.25,neck:.29,head:.319,sh:.273,crotch:.156,belt:.199,waist:.214,armpit:.262,nb:.2925,hc:.338,U:.027},
  /* shX/hipX: the shoulder and hip joints from the middle; up, fo, th, sn: upper arm, forearm, thigh, shin; cap: how far the round of the shoulder rises above its joint;
     arm: radii at the shoulder, mid upper arm, above the elbow, elbow, below the elbow, mid forearm, wrist; leg: top, upper thigh, mid thigh, above the knee, knee, below the knee, calf, low calf, ankle;
     hand: length, width, thickness; foot: length, width, height of the instep */
  /* (his after the body reference: slimmer arms with a shorter forearm, smaller hands, narrower shoulders, fuller knees and calves, shorter feet) */
  m:{shX:.042,hipX:.022,up:.0516,fo:.041,th:.082,sn:.082,cap:.0048,arm:[.0106,.0104,.0091,.0081,.0085,.0074,.0058],leg:[.018,.0174,.0158,.0141,.0128,.0142,.0156,.0128,.0082],hand:[.041,.0168,.0086],foot:[.057,.0145,.0125]},
  f:{shX:.038,hipX:.021,up:.06,fo:.05,th:.082,sn:.082,cap:.0045,arm:[.0115,.0109,.0102,.0087,.0093,.0083,.0069],leg:[.0187,.0178,.016,.0128,.0114,.012,.0121,.0101,.0075],hand:[.04,.0184,.0086],foot:[.064,.0122,.0106]}};
/* ---- the torso: the low-poly sculpt of pcbody.js (his or hers, its rows carried into the layout by the inverse of the lift); its top turns into the neck of the head: above the base of the neck it runs
   into the head's own neck surface (nk(y, ph) -> [x, z], key: which head) just inside it, so torso and neck are one skin (rn: the neck's radius in head units). -> {S(y, ph, off, o), R(y, ph, off), cz(y),
   C (the half-columns), noms (the rows), band(y), flip(r, c)}: what the garments are laid on ---- */
const PCB2={};
function pcBody2(F,rn,nk,key){const k=(F?'f':'m')+k5(rn)+(key||'');if(PCB2[k])return PCB2[k];
  const inv=pcRemapInv(F),R=(F?PCT_F:PCT_M).map(([yf,pts])=>({nom:inv(yf),pts:pts.map(p=>[p[0],inv(yf+(p[2]||0)),p[1]])})),C=pcAddCols(R,PCT_C,[.97,1.32]);pcHugLegs(R,F,.0006);
  const LP=pcLPBody(R,C,PCT_FLIP),cz=LP.cz;
  const S=(y,ph,off,o)=>{LP(y,ph,off,o);
    if(nk&&y>.292){const w=Math.pow(Math.max(0,(.304-y)/.012),1.4),n=nk(y,ph),r=Math.hypot(n[0],n[1]+.0025)||1,f=1+(off-.0016*(1-w))/r;o[0]=n[0]*f+(o[0]-n[0]*f)*w;o[2]=(n[1]+.0025)*f-.0025+(o[2]-(n[1]+.0025)*f+.0025)*w;}return o;};
  const Rr=(y,ph,off)=>{const o=S(y,ph,off,[0,0,0]);return Math.hypot(o[0],o[2]-cz(y));};
  return PCB2[k]={S,R:Rr,cz,lp:true,C,noms:R.map(r=>r.nom),band:LP.band,flip:PCT_FLIP};}
/* a band of the torso between two curves yb(ph)..yt(ph), round ph in [g(v), 2pi-g(v)] (an opening at the front), at an offset off(v,ph,u): laid on the sculpt's rows and columns (pcShellLP; nu, nv: unused) */
function pcShell2(B,key,yb,yt,gap,off,nu,nv){return pcShellLP(B,key,yb,yt,gap,off);}
/* ---- the skeleton ---- */
function pcSkeleton(F){const L=PCL[F?'f':'m'],Y=PCL.y,B={},list=[];
  const mk=(n,par,x,y,z)=>{const b=new THREE.Bone();b.name=n;b.position.set(x,y,z);if(par)par.add(b);B[n]=b;list.push(b);return b;};
  const root=mk('root',null,0,Y.root,0),spine=mk('spine',root,0,Y.spine-Y.root,0),chest=mk('chest',spine,0,Y.chest-Y.spine,0),neck=mk('neck',chest,0,Y.neck-Y.chest,-.0012);mk('head',neck,0,Y.head-Y.neck,.0012);
  for(const[s,sd]of[['L',-1],['R',1]]){const cl=mk('clav'+s,chest,sd*.007,Y.sh-Y.chest-.001,.001),ua=mk('upper'+s,cl,sd*(L.shX-.007),.001,-.001),fa=mk('fore'+s,ua,0,-L.up,0);mk('hand'+s,fa,0,-L.fo,0);
    const th=mk('thigh'+s,root,sd*L.hipX,Y.hip-Y.root,0),sn=mk('shin'+s,th,0,-L.th,0),ft=mk('foot'+s,sn,0,-L.sn,0);mk('toe'+s,ft,0,-.011,L.foot[0]*.5);}
  return{B,list,root,L};}
/* HIS proportions after the body reference: the figure is built in the shared layout, then his skeleton and his skinned body and clothes are lifted by one vertical map (the weights are taken
   before it, so everything bends as built): the legs and hips as they are (they already match), the trunk from the waist to the armpits stretched, the shoulders lifted, the trapezius stretched up to a
   higher base of the neck, and above that the neck and head just carried up. Hers: none. */
const PCRY_M=[[0,0],[.214,.214],[.262,.2735],[.273,.2845],[.2925,.3085]];
/* hers (Task M): the trunk from the waist to the armpits a little longer, everything above it carried up with it */
const PCRY_F=[[0,0],[.214,.214],[.262,.2678],[.273,.2788],[.2925,.2983]];
function pcRemapY(F){const K=F?PCRY_F:PCRY_M,n=K.length;return y=>{if(y<=K[1][0])return y;for(let i=1;i<n-1;i++){const a=K[i],b=K[i+1];if(y<=b[0])return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return y+(K[n-1][1]-K[n-1][0]);};}
/* move the bones of a skeleton (bind pose: positions only) to where the map puts them */
function pcRemapSkel(skel,ry){const W=new Map();skel.root.updateMatrixWorld(true);for(const b of skel.list)W.set(b,new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
  const NW=new Map();for(const[b,p]of W)NW.set(b,new THREE.Vector3(p.x,ry(p.y),p.z));
  for(const b of skel.list){const pw=b.parent&&NW.get(b.parent);const q=NW.get(b);if(pw)b.position.set(q.x-pw.x,q.y-pw.y,q.z-pw.z);else{const o=b.parent?new THREE.Vector3().setFromMatrixPosition(b.parent.matrixWorld):new THREE.Vector3();b.position.set(q.x-o.x,q.y-o.y,q.z-o.z);}}
  skel.root.updateMatrixWorld(true);}
/* a chain of spring bones under a bone: pts are the heads of the links in the bind pose (figure units), the last point is the tail of the last link */
function pcChain(skel,name,par,pts){const B=skel.B,out=[];let prev=B[par];skel.root.updateMatrixWorld(true);
  for(let i=0;i<pts.length-1;i++){const b=new THREE.Bone();b.name=name+i;const p=new THREE.Vector3(...pts[i]);prev.updateMatrixWorld(true);prev.worldToLocal(p);b.position.copy(p);prev.add(b);b.updateMatrixWorld(true);B[b.name]=b;skel.list.push(b);out.push(b);prev=b;}
  const last=out[out.length-1],t=new THREE.Vector3(...pts[pts.length-1]);last.worldToLocal(t);last.userData.tail=t;return out;}
/* ---- skinning ---- */
/* parts: {geo, mat, m (a Matrix4 from the geometry to the figure in the bind pose), w(x, y, z, lx, ly, lz) -> {bone: weight}} -> one skinned mesh per material (the material gets a skinning twin) */
function pcSkinMat(m){if(m.userData.pcSk)return m.userData.pcSk;const s=m.clone();s.skinning=true;s.onBeforeCompile=m.onBeforeCompile;s.customProgramCacheKey=m.customProgramCacheKey;if(m.extensions)s.extensions=m.extensions;m.userData.pcSk=s;return s;}
function pcSkinBuild(parts,skel,owner,ry){const idx=new Map();skel.list.forEach((b,i)=>idx.set(b.name,i));const byMat=new Map();
  for(const p of parts){const k=p.mat.uuid+(p.noShadow?'n':'');if(!byMat.has(k))byMat.set(k,[]);byMat.get(k).push(p);}
  const meshes=[],v=new THREE.Vector3(),nm=new THREE.Matrix3(),I4=new THREE.Matrix4();
  for(const list of byMat.values()){let nv=0,ni=0,hasUV=false,hasCol=false,hasT=false;for(const p of list){const g=p.geo;nv+=g.attributes.position.count;ni+=g.index?g.index.count:g.attributes.position.count;if(g.attributes.uv)hasUV=true;if(g.attributes.color)hasCol=true;if(g.attributes.flow)hasT=true;}const HS=hasT?new Float32Array(nv):null;
    const P=new Float32Array(nv*3),N=new Float32Array(nv*3),SI=new Uint16Array(nv*4),SW=new Float32Array(nv*4),UV=hasUV?new Float32Array(nv*2):null,CO=hasCol?new Float32Array(nv*3):null,FL=hasT?new Float32Array(nv*3):null,IX=new(nv>65535?Uint32Array:Uint16Array)(ni);let vo=0,io=0;
    for(const p of list){const g=p.geo,m=p.m||I4,pa=g.attributes.position.array,na=g.attributes.normal.array,cnt=g.attributes.position.count,flip=m.determinant()<0;nm.getNormalMatrix(m);
      for(let i=0;i<cnt;i++){const o=(vo+i)*3;v.fromArray(pa,i*3).applyMatrix4(m);P[o]=v.x;P[o+1]=v.y;P[o+2]=v.z;
        const w=p.w(v.x,v.y,v.z,pa[i*3],pa[i*3+1],pa[i*3+2]),ws=[];if(ry)P[o+1]=ry(v.y);for(const n in w)if(w[n]>1e-4)ws.push([n,w[n]]);ws.sort((a,b)=>b[1]-a[1]);if(ws.length>4)ws.length=4;let s=0;for(const e of ws)s+=e[1];
        for(let k=0;k<4;k++){const e=ws[k],bi=e?idx.get(e[0]):0;if(e&&bi==null)throw new Error('pc: no bone '+e[0]);SI[(vo+i)*4+k]=e?bi:0;SW[(vo+i)*4+k]=e?e[1]/s:0;}
        v.fromArray(na,i*3).applyMatrix3(nm).normalize();N[o]=v.x;N[o+1]=v.y;N[o+2]=v.z;
        if(UV){const u=g.attributes.uv;UV[(vo+i)*2]=u?u.array[i*2]:0;UV[(vo+i)*2+1]=u?u.array[i*2+1]:0;}
        if(CO){const cc=g.attributes.color;if(cc){CO[o]=cc.array[i*3];CO[o+1]=cc.array[i*3+1];CO[o+2]=cc.array[i*3+2];}else CO[o]=CO[o+1]=CO[o+2]=1;}
        if(FL){const t=g.attributes.flow;if(t){v.fromArray(t.array,i*3).transformDirection(m);FL[o]=v.x;FL[o+1]=v.y;FL[o+2]=v.z;}else FL[o+1]=-1;const hh=g.attributes.hst;HS[vo+i]=hh?hh.array[i]:0;}}
      const ix=g.index?g.index.array:null,n=ix?ix.length:cnt;for(let i=0;i<n;i+=3){const a=ix?ix[i]:i,b=ix?ix[i+1]:i+1,d=ix?ix[i+2]:i+2;IX[io++]=a+vo;if(flip){IX[io++]=d+vo;IX[io++]=b+vo;}else{IX[io++]=b+vo;IX[io++]=d+vo;}}
      vo+=cnt;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('skinIndex',new THREE.BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(SW,4));
    if(UV)geo.setAttribute('uv',new THREE.BufferAttribute(UV,2));if(CO)geo.setAttribute('color',new THREE.BufferAttribute(CO,3));if(FL){geo.setAttribute('flow',new THREE.BufferAttribute(FL,3));geo.setAttribute('hst',new THREE.BufferAttribute(HS,1));}geo.setIndex(new THREE.BufferAttribute(IX,1));geo.computeBoundingSphere();
    const mesh=new THREE.SkinnedMesh(geo,pcSkinMat(list[0].mat));mesh.castShadow=!list[0].noShadow;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.pcOwn=true;owner.add(mesh);meshes.push(mesh);}
  owner.updateMatrixWorld(true);const sk=new THREE.Skeleton(skel.list);for(const m of meshes)m.bind(sk,m.matrixWorld);return{meshes,skeleton:sk};}
/* weights: a smooth hand-over from bone a to bone b across [y0, y1]; pcAddW gives bone b the share k of what there is */
const pcBl=(a,b,y0,y1,y)=>{const t=pcSm(y0,y1,y);if(t<=0)return{[a]:1};if(t>=1)return{[b]:1};return{[a]:1-t,[b]:t};};
const pcAddW=(w,b,k)=>{if(k<=0)return w;for(const n in w)w[n]*=1-k;w[b]=(w[b]||0)+k;return w;};
/* the neck takes over from the chest between the base of the neck and the jaw: the torso and the neck of the head use the same rule, so they stay together when the head turns */
const pcNeckK=y=>pcSm(.286,.302,y);
/* the weights of the torso and of what lies on it */
function pcWTorso(F){const L=PCL[F?'f':'m'],Y=PCL.y;return(x,y,z)=>{const ax=Math.abs(x),sd=x<0?'L':'R';let w;
  if(y<Y.spine-.004)w=pcBl('root','spine',Y.spine-.02,Y.spine-.004,y);else w=pcBl('spine','chest',Y.chest-.022,Y.chest-.004,y);
  if(y>.286)pcAddW(w,'neck',pcNeckK(y));
  /* below the hip joints the torso lies on the thighs (pcHugLegs): there it moves with them, so the leg and the hip stay one surface when the leg swings; the seat and the crotch less */
  if(y<Y.hip+.006&&ax>.003)pcAddW(w,'thigh'+sd,pcSm(Y.hip+.006,Y.hip-.011,y)*pcSm(.004,.013,ax)*(z<0?.92:1));
  const dx=ax-L.shX,dy=y-Y.sh,d=Math.hypot(dx,dy,z*.7);
  if(ax>L.shX-.02&&y>Y.armpit-.014)pcAddW(w,'upper'+sd,.55*pcSm(.024,.007,d)*pcSm(L.shX-.02,L.shX-.004,ax));
  if(y>Y.sh-.012&&ax>.012)pcAddW(w,'clav'+sd,.42*pcSm(Y.sh-.012,Y.sh+.004,y)*pcSm(.012,.026,ax)*(1-pcNeckK(y)));
  return w;};}
/* an arm (any sleeve on it): upper arm, forearm across the elbow, a little of the hand at the wrist, the collarbone at the top of the shoulder */
function pcWArm(F){const L=PCL[F?'f':'m'],Y=PCL.y,e=-L.up,wr=-L.up-L.fo;return(x,y,z)=>{const s=x<0?'L':'R',ly=y-Y.sh;
  const w=pcBl('upper'+s,'fore'+s,e+.0075,e-.0075,ly);if(ly<wr+.007)pcAddW(w,'hand'+s,.7*pcSm(wr+.007,wr-.002,ly));if(ly>-.008)pcAddW(w,'clav'+s,.32*pcSm(-.008,.008,ly));return w;};}
/* a leg (any trouser leg): thigh, shin across the knee, the foot at the ankle */
function pcWLeg(F){const L=PCL[F?'f':'m'],Y=PCL.y,k=-L.th,a=-L.th-L.sn;return(x,y,z)=>{const s=x<0?'L':'R',ly=y-Y.hip;
  const w=pcBl('thigh'+s,'shin'+s,k+.0085,k-.0085,ly);if(ly<a+.008)pcAddW(w,'foot'+s,.8*pcSm(a+.008,a-.002,ly));return w;};}
/* a shoe: the foot, the toe in front of the ball of the foot, the shin up the shaft of a boot */
function pcWFoot(F){const L=PCL[F?'f':'m'],Y=PCL.y,tz=L.foot[0]*.5;return(x,y,z)=>{const s=x<0?'L':'R';const w=pcBl('foot'+s,'toe'+s,tz-.007,tz+.006,z);
  if(y>Y.ankle+.002)pcAddW(w,'shin'+s,pcSm(Y.ankle+.002,Y.ankle+.014,y));return w;};}
/* a garment that hangs on chains (a skirt, the skirts of a coat, a cloak, long hair): the chains (sorted by azimuth a; open: no chain between the last and the first), each with the names and the heights of its links;
   above the chains the weights of top(x, y, z) */
function pcWChains(chains,top,open){const n=chains.length;
  const one=(C,x,y,z)=>{const ys=C.ys,nm=C.names,band=C.band||.006;if(y>=ys[0]+band)return top(x,y,z);
    if(y>ys[0]-band){const k=pcSm(ys[0]+band,ys[0]-band,y),tw=top(x,y,z),w={};for(const b in tw)w[b]=tw[b]*(1-k);w[nm[0]]=(w[nm[0]]||0)+k;return w;}
    let w={[nm[0]]:1};for(let j=1;j<nm.length;j++)if(y<ys[j]+band){const k=pcSm(ys[j]+band,ys[j]-band,y);w=k>=1?{[nm[j]]:1}:{[nm[j-1]]:1-k,[nm[j]]:k};}return w;};
  return(x,y,z)=>{const ph=Math.atan2(x,z);let i0=0,i1=0,t=0,found=n===1;
    for(let i=0;i<n&&!found;i++){const j=(i+1)%n;if(j===0&&open)break;let span=chains[j].a-chains[i].a;if(span<=0)span+=2*Math.PI;let d=ph-chains[i].a;if(d<0)d+=2*Math.PI;if(d<=span){i0=i;i1=j;t=d/span;found=true;}}
    if(!found){let bd=1e9;for(let i=0;i<n;i++){const d=Math.abs(pcWrap(ph-chains[i].a));if(d<bd){bd=d;i0=i1=i;}}t=0;}
    const w0=one(chains[i0],x,y,z);if(i1===i0||t<=0)return w0;const w1=one(chains[i1],x,y,z),w={};for(const b in w0)w[b]=(w[b]||0)+w0[b]*(1-t);for(const b in w1)w[b]=(w[b]||0)+w1[b]*t;return w;};}
/* ---- spring bones ---- */
/* one chain: {links (top first), stiff (the share of the way back to rest per 1/60 s), drag (the share of velocity lost per 1/60 s), grav, max (the largest angle from rest), col: colliders {b (a bone), o (an offset in it), r}} */
function pcSpring(bones,o){const links=bones.map(b=>{const ch=b.children.find(c=>c.isBone&&bones.indexOf(c)>=0),tl=ch?ch.position.clone():b.userData.tail.clone();
    return{b,rest:b.quaternion.clone(),axis:tl.clone().normalize(),len:tl.length(),cur:new THREE.Vector3(),prev:new THREE.Vector3()};});
  return Object.assign({links,stiff:.12,drag:.18,grav:.04,max:1.2,col:[],init:false},o);}
const PCS_T=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],PCS_Q=[new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion()],PCS_M=[new THREE.Matrix4(),new THREE.Matrix4()];
/* one step of the springs of a figure; carry (a Matrix4 or null): how the frame of the figure moved since the last step - the tails are carried along by the share 1-inertia of it, so they feel only part of the motion */
function pcSpringStep(list,dt,sc,carry,inertia,reset){const[h,rest,nx,cc,ax,ws]=PCS_T,[pq,iq,dq]=PCS_Q,f=Math.min(3,dt*60);
  for(const S of list){const rs=reset||!S.init;S.init=true;const st=1-Math.pow(1-S.stiff,f),dr=Math.pow(1-S.drag,f),gv=S.grav*f*f;
    for(const Lk of S.links){const b=Lk.b;b.quaternion.copy(Lk.rest);b.updateMatrixWorld(true);h.setFromMatrixPosition(b.matrixWorld);b.parent.matrixWorld.decompose(cc,pq,ws);
      rest.copy(Lk.axis).applyQuaternion(Lk.rest).applyQuaternion(pq);const len=Lk.len*sc;
      if(rs){Lk.cur.copy(h).addScaledVector(rest,len);Lk.prev.copy(Lk.cur);}
      else if(carry){cc.copy(Lk.cur).applyMatrix4(carry);Lk.cur.lerp(cc,1-inertia);cc.copy(Lk.prev).applyMatrix4(carry);Lk.prev.lerp(cc,1-inertia);}
      /* inertia, the pull back towards the rest tail, a little weight */
      nx.copy(Lk.cur).sub(Lk.prev).multiplyScalar(dr).add(Lk.cur);cc.copy(h).addScaledVector(rest,len);nx.lerp(cc,st);nx.y-=gv*len;
      nx.sub(h).normalize().multiplyScalar(len).add(h);
      for(const C of S.col){cc.copy(C.o).applyMatrix4(C.b.matrixWorld);const r=C.r*sc,d=nx.distanceTo(cc);if(d<r){nx.sub(cc).multiplyScalar(r/Math.max(d,1e-6)).add(cc);nx.sub(h).normalize().multiplyScalar(len).add(h);}}
      /* never further than max from the rest direction */
      cc.copy(nx).sub(h).divideScalar(len);const dot=Math.max(-1,Math.min(1,cc.dot(rest)));if(Math.acos(dot)>S.max){ax.crossVectors(rest,cc);if(ax.lengthSq()>1e-10){ax.normalize();cc.copy(rest).applyAxisAngle(ax,S.max);nx.copy(h).addScaledVector(cc,len);}}
      Lk.prev.copy(Lk.cur);Lk.cur.copy(nx);
      /* turn the bone so that it points at its tail */
      iq.copy(pq).invert();cc.copy(nx).sub(h).normalize().applyQuaternion(iq);ax.copy(Lk.axis).applyQuaternion(Lk.rest);dq.setFromUnitVectors(ax,cc);b.quaternion.copy(dq).multiply(Lk.rest);b.updateMatrixWorld(true);}}}
/* the springs of a figure, once a frame (dt in seconds): the frame they are carried in is the parent of the model (the walking hero's group, the pivot of the preview) */
function pcPhys(g,dt,reset){const R=g.userData.pcRig;if(!R||!R.springs.length)return;const par=g.parent;g.updateMatrixWorld(true);
  const ws=PCS_T[5];g.matrixWorld.decompose(PCS_T[4],PCS_Q[0],ws);const s=ws.x,M=par?par.matrixWorld:g.matrixWorld;let carry=null;
  if(R.lastM&&!reset){PCS_M[0].copy(R.lastM).invert();carry=PCS_M[1].multiplyMatrices(M,PCS_M[0]);PCS_T[4].setFromMatrixPosition(M);PCS_T[3].setFromMatrixPosition(R.lastM);if(PCS_T[4].distanceTo(PCS_T[3])>2*s)reset=true;/* a jump (a teleport, a new place): start again */}
  R.lastM=(R.lastM||new THREE.Matrix4()).copy(M);
  const n=dt>1/45?2:1;for(let i=0;i<n;i++)pcSpringStep(R.springs,Math.min(dt,.1)/n,s,i===0?carry:null,R.inertia,reset&&i===0);}

/* =====================================================================================================
   BOULDERS (src/world/wboulder.js, world look 2): chunky stones that look broken off the cliffs, seeded and instanced.
   - Shapes (wbldMake): twelve, made once - a ball (icosphere) stretched three ways, cut by 6-11 random planes (the flat faces), its bottom flattened, a
     little noise, then one light smoothing pass so the cut edges become soft bevels; per vertex the bevel rims (aEdge), how shut in (aOcc: the
     underside) and, on about 45 % of them, the signed distance to one seam plane (aSeam). Each shape twice: 5120 facets near, 320 far.
   - Places (wbldPlace): per level-0 tile from a hash of the tile and the world's seed, never its stream; the density of before (more on talus and steep
     ground, on the lake region's shores, in the spires and the tablelands, now and then one in a meadow); shape, size (0.22-2.1, mostly small),
     turn and a few percent of brightness from the boulder's own seed; aligned to the ground's slope and sunk 25 % (big) to 45 % (small) of its height;
     two in five of the big ones get 1-3 small companions. Never in the water, on a road, a trail or a village's ground (the grid), nor within reach of a
     cliff's stones (the ground rising steeply within 4 m) - so no boulder sits inside a cliff sheet (wcliff.js).
   - Drawn as one InstancedMesh per shape near (WBLD.near, with shadows) and one far, out to WROCK.R; the instance data (iData: brightness, the ground's
     height there, seed, grey) is an instanced attribute. The stone is the cliff's (wcliffmat.js: the palette and its four tone steps, the line
     hierarchy - one plane seam, faint cracks on one in three - moss on the tops of two in five, the lowest 30 cm fading to dark earth). Under each a
     soft darker ring on the ground (a flat instanced card: the contact the ground's own light cannot know).
   ===================================================================================================== */
const WBLD={N:12,near:110,shapes:null,low:null,mat:null,ringMat:null,ringGeo:null,meshes:null,group:null,dirty:true,cx:1e9,cz:1e9,stats:{inst:0,near:0,builds:0}};
/* a ball's corners welded (three.js' icosphere repeats them per face) */
function wbldWeld(g){const p=g.attributes.position,n=p.count,map=new Map(),pos=[],idx=new Uint32Array(n);
  for(let i=0;i<n;i++){const k=Math.round(p.getX(i)*1e4)+','+Math.round(p.getY(i)*1e4)+','+Math.round(p.getZ(i)*1e4);let j=map.get(k);if(j===undefined){j=pos.length/3;map.set(k,j);pos.push(p.getX(i),p.getY(i),p.getZ(i));}idx[i]=j;}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setIndex(new THREE.BufferAttribute(idx,1));return o;}
/* one shape from its seed (det: the icosphere's level - the same seed gives the same stone at either) */
function wbldMake(seed,det){const r=wnRng(seed),N=WBLD.nz||(WBLD.nz=wnSimplex(31337)),g=wbldWeld(new THREE.IcosahedronGeometry(1,det)),p=g.attributes.position,n=p.count;
  const sx=.8+.8*r(),sy=.55+.6*r(),sz=.8+.8*r(),moved=new Float32Array(n);
  for(let i=0;i<n;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),dd=1+.1*wnN(N,x*1.6+seed*.37,y*1.6+z*1.1);p.setXYZ(i,x*sx*dd,y*sy*dd,z*sz*dd);}
  const k=6+Math.floor(r()*6),cuts=[];for(let c=0;c<k;c++){const a=r()*6.283,b=(r()<.3?.9:.3)*(r()-.5)*2;cuts.push([Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a),.42+.3*r()]);}
  for(const[nx,ny,nz,f]of cuts){let mx=-1e9;for(let i=0;i<n;i++)mx=Math.max(mx,p.getX(i)*nx+p.getY(i)*ny+p.getZ(i)*nz);const d=mx*f;
    for(let i=0;i<n;i++){const o=p.getX(i)*nx+p.getY(i)*ny+p.getZ(i)*nz-d;if(o>0){p.setXYZ(i,p.getX(i)-o*nx,p.getY(i)-o*ny,p.getZ(i)-o*nz);moved[i]+=o;}}}
  let ymin=1e9;for(let i=0;i<n;i++)ymin=Math.min(ymin,p.getY(i));const yb=ymin*.72;for(let i=0;i<n;i++){const y=p.getY(i);if(y<yb)p.setY(i,yb+(y-yb)*.25);}/* (a flat-ish bottom) */
  const adj=Array.from({length:n},()=>new Set()),ix=g.index.array;for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];adj[a].add(b).add(c);adj[b].add(a).add(c);adj[c].add(a).add(b);}
  /* one light smoothing pass: the cut edges become soft bevels, the faces stay flat */
  {const q=new Float32Array(n*3);for(let i=0;i<n;i++){let x=0,y=0,z=0,m=0;for(const j of adj[i]){x+=p.getX(j);y+=p.getY(j);z+=p.getZ(j);m++;}q[i*3]=x/m;q[i*3+1]=y/m;q[i*3+2]=z/m;}
    for(let i=0;i<n;i++)p.setXYZ(i,p.getX(i)*.75+q[i*3]*.25,p.getY(i)*.75+q[i*3+1]*.25,p.getZ(i)*.75+q[i*3+2]*.25);}
  const edge=new Float32Array(n),occ=new Float32Array(n),seam=new Float32Array(n);let ymax=-1e9;ymin=1e9;for(let i=0;i<n;i++){ymax=Math.max(ymax,p.getY(i));ymin=Math.min(ymin,p.getY(i));}
  const sm=r()<.45?(()=>{const a=r()*6.283,b=(r()-.5)*1.2;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a),(r()-.5)*.5];})():null;
  for(let i=0;i<n;i++){let e=0;for(const j of adj[i])e=Math.max(e,Math.abs(moved[i]-moved[j]));edge[i]=Math.min(1,e*4*(det>=4?1:.5));
    occ[i]=.6*Math.pow(1-(p.getY(i)-ymin)/(ymax-ymin),1.5);seam[i]=sm?p.getX(i)*sm[0]+p.getY(i)*sm[1]+p.getZ(i)*sm[2]-sm[3]:10;}
  g.setAttribute('aEdge',new THREE.BufferAttribute(edge,1));g.setAttribute('aOcc',new THREE.BufferAttribute(occ,1));g.setAttribute('aSeam',new THREE.BufferAttribute(seam,1));
  g.computeVertexNormals();g.computeBoundingSphere();g.userData={ymin,ymax,rx:Math.max(sx,sz)};return g;}
function wbldShapes(){if(WBLD.shapes)return;WBLD.shapes=[];WBLD.low=[];for(let i=0;i<WBLD.N;i++){WBLD.shapes.push(wbldMake(1000+i*37,4));WBLD.low.push(wbldMake(1000+i*37,2));}}

/* ---------- places: the boulders of one level-0 tile (t.g: its heights and water) ---------- */
function wbldPlace(t){wbldShapes();const S=WG_CFG.tile,g=t.g,n=g.n,s=n+1,R=wnRng(wnHashI(t.ti,t.tk,WG.seed+701)),list=[],props=[];
  const RW=new Float64Array(4);wgRegions(t.x0+S/2,t.z0+S/2,RW);const grey=Math.min(1,Math.max(0,RW[1]*2+(1-RW[2]-RW[1])*.35));
  const lat=(x,z)=>{const i=Math.min(n-1,Math.max(0,((x-t.x0)/2)|0)),k=Math.min(n-1,Math.max(0,((z-t.z0)/2)|0));return k*s+i;};
  const free=(x,z,h,sl,scr)=>{if(scr&&sl>1.2)return false;if(x<t.x0||z<t.z0||x>=t.x0+S||z>=t.z0+S)return false;const k=lat(x,z);if(g.wl[k]>h-.2)return false;
    const c=owCell(x,z),gv=grid[c.r]&&grid[c.r][c.c];if(gv!==0&&gv!==2)return false;if(gv===2&&sl<.5)return false;/* (closed but not steep: a building's ground or the keep) */
    if(typeof wtPathAt==='function'&&wtPathAt(x,z)<1.4)return false;/* (a trail, with a margin: world look 3) */
    /* (within reach of a cliff's stones: the ground rising more steeply than 1 in 1 within 4 m, any way) */
    for(let a=0;a<8;a++){const ca=Math.cos(a*.7854),sa=Math.sin(a*.7854);let hp=h,dp=0;if(scr)continue;for(const d of[1.2,2.5,4]){const hd=owH(x+ca*d,z+sa*d);if((hd-hp)/(d-dp)>1.05)return false;hp=hd;dp=d;}}
    return true;};
  const put=(x,z,seed,fixed,talus,dw)=>{const h=owH(x,z),e=.6,gx=(owH(x+e,z)-owH(x-e,z))/(2*e),gz=(owH(x,z+e)-owH(x,z-e))/(2*e),sl=Math.hypot(gx,gz);if(!free(x,z,h,sl,!!dw))return;
    const r=wnRng(seed),si=Math.floor(r()*WBLD.N),G=WBLD.shapes[si],ud=G.userData,u=r();let sc=fixed||(.22+1.9*Math.pow(u,2.4))*(1+.5*talus*(RW[1]+RW[2]));
    if(dw){sc=Math.min(sc,(dw-1.2)/ud.rx);if(sc<.2)return;}/* (scree: dw, the face's distance - its edge 1.2 m clear of it) */const hg=(ud.ymax-ud.ymin)*sc;
    const f=.45-.20*Math.min(1,Math.max(0,(sc-.3)/1.6)),nrm=new THREE.Vector3(-gx,1,-gz).normalize();/* (sunk 45 % of its height when small, 25 % when big) */
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),nrm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r()*6.283));
    const M=new THREE.Matrix4().compose(new THREE.Vector3(x,h-f*hg-ud.ymin*sc,z),q,new THREE.Vector3(sc,sc,sc));
    list.push({si,M:Float32Array.from(M.elements),d:[r(),h,r(),grey],x,z,h,nx:nrm.x,ny:nrm.y,nz:nrm.z,rw:ud.rx*sc,sc});
    if(sc>.35)props.push({type:'rock',x,z,r:ud.rx*sc*.85,alive:true});
    if(!fixed&&!dw&&sc>.6&&r()<.4){const k=1+Math.floor(r()*3);for(let j=0;j<k;j++){const a=r()*6.283,d=sc*ud.rx*(1.3+r()),cs=sc*(.22+.3*r());put(x+Math.cos(a)*d,z+Math.sin(a)*d,seed*7+j*13+1,cs,0);}}};
  const tries=6+Math.round(10*(RW[1]+RW[2])+4*RW[3]);
  for(let q=0;q<tries;q++){const x=t.x0+R()*S,z=t.z0+R()*S,pk=R(),sd=Math.floor(R()*2147483647),k=lat(x,z),h=owH(x,z);
    const e=1.5,sl=Math.hypot(owH(x+e,z)-owH(x-e,z),owH(x,z+e)-owH(x,z-e))/(2*e),talus=wnS(sl,.3,.75),shore=g.wl[k]>-1e8?1-wnS(h-g.wl[k],.5,4):0;
    if(pk>.12+talus*.85+shore*.6*RW[3]+.25*(RW[1]+RW[2]))continue;put(x,z,sd,0,talus);}
  /* scree (the cliff rework): at the foot of a tall cliff - a rise of 6 m or more over 4 m of the lattice - boulders gather, big and small, thick by the
     wall and thinning out into the grass; how far out each one is is measured to the face itself (the ground rising 3 m), and a boulder keeps its edge
     1.2 m clear of it (a column stands out up to 2.6 m: the biggest rest against the columns). Their own stream, from a hash of the tile */
  {const Rs=wnRng(wnHashI(t.ti*31+7,t.tk*17+3,WG.seed+709));for(let k=0;k<=n;k+=2)for(let i=0;i<=n;i+=2){const h0=g.h[k*s+i];
    for(let dir=0;dir<4;dir++){const di=dir===0?2:dir===2?-2:0,dk=dir===1?2:dir===3?-2:0,ii=i+di,kk=k+dk;if(ii<0||kk<0||ii>n||kk>n)continue;if(g.h[kk*s+ii]-h0<6)continue;if(Rs()>.75)continue;
      const ux=di/2,uz=dk/2,m=2+Math.floor(Rs()*4);for(let j=0;j<m;j++){const d0=-1+9*Math.pow(Rs(),1.6),lat=(Rs()-.5)*5,x=t.x0+i*2-ux*d0-uz*lat,z=t.z0+k*2-uz*d0+ux*lat,u=Rs(),sd=Math.floor(Rs()*2147483647);
        /* (the face: the ground 3 m over this point, toward the wall, in half-metre steps) */
        const hb=owH(x,z);let dF=-1;for(let e=0;e<=8;e+=.5)if(owH(x+ux*e,z+uz*e)>hb+3){dF=e;break;}if(dF<0)continue;
        const sc=(.3+1.7*Math.pow(u,1.4))*(1-.55*Math.min(1,dF/9));put(x,z,sd,sc,0,dF);}}}}
  return {list,props};}

/* ---------- the material: the cliff's stone (wcliffmat.js), per instance ---------- */
function wbldMaterial(){if(WBLD.mat)return WBLD.mat;const m=new THREE.MeshPhongMaterial({color:0xffffff,shininess:6,specular:0x111111}),U={tWN:{value:wtNoiseTex()},uSunD:WCM.sun};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aEdge;attribute float aOcc;attribute float aSeam;attribute vec4 iData;varying float vEdge;varying float vOcc;varying float vSeam;varying vec4 vDat;varying vec3 vWp;varying vec3 vNw;varying float vSc;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvEdge=aEdge;vOcc=aOcc;vSeam=aSeam;vDat=iData;\n#ifdef USE_INSTANCING\nmat4 wbM=modelMatrix*instanceMatrix;\n#else\nmat4 wbM=modelMatrix;\n#endif\nvWp=(wbM*vec4(transformed,1.0)).xyz;vNw=normalize(mat3(wbM)*objectNormal);vSc=length(wbM[0].xyz);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tWN;uniform vec3 uSunD;varying float vEdge;varying float vOcc;varying float vSeam;varying vec4 vDat;varying vec3 vWp;varying vec3 vNw;varying float vSc;'+WCM_PAL+WCM_FUNCS)
      .replace('#include <map_fragment>','#include <map_fragment>\n'+WBLD_COLOR).replace('#include <lights_fragment_begin>',wcmLights());};
  m.customProgramCacheKey=()=>'wbld2';return WBLD.mat=m;}
const WBLD_COLOR=`
{
  vec3 P=vWp;vec3 N=normalize(vNw);float dc=length(P-cameraPosition),fd=1.0-smoothstep(25.0,70.0,dc);float seed=vDat.z,up=clamp(N.y*0.5+0.5,0.0,1.0);
  vec4 NS=wcTex3(P+vec3(seed*9.0),N,6.0);/* (as the cliff's scale: a finer noise under the four tone steps draws contour lines) */
  float t=0.54+0.30*(up-0.5)+0.10*(NS.r-0.5)+0.04*(NS.g-0.5)*fd+0.12*vEdge*smoothstep(-0.1,0.6,N.y)-0.30*vOcc;
  /* one plane seam (on about 45 % of the shapes), drawn with fwidth; faint cracks on one in three, gone by 28 m */
  float sd=abs(vSeam)*vSc,on=step(abs(vSeam),5.0),sw=0.045,sa=fwidth(sd)*0.8+0.002;float seam=(1.0-smoothstep(sw-sa,sw+sa,sd))*on,seamSoft=(1.0-smoothstep(0.045,0.2,sd))*on;
  float crev=max(seam,0.45*seamSoft);t-=0.15*crev;
  {float ck=abs(NS.b-0.5);float cka=fwidth(ck)*0.8+0.002;t-=0.10*(1.0-smoothstep(0.012-cka,0.012+cka,ck))*step(0.67,fract(seed*3.71))*(1.0-smoothstep(10.0,28.0,dc));}
  float q4=t*4.0;t=mix(t,(floor(q4)+smoothstep(0.3,0.7,fract(q4)))/4.0,0.8);
  vec3 warm=vec3(1.04,1.0,0.94),cool=mix(vec3(0.95,0.96,1.02),vec3(0.90,0.96,1.07),vDat.w);
  vec3 col=wcStone(t,vDat.w)*mix(cool,warm,fract(seed*5.31))*(0.93+0.14*vDat.x);
  col=mix(col,col*cool*0.9,clamp((1.0-up)*0.35,0.0,1.0));col*=1.0-0.07*smoothstep(0.58,0.74,NS.a);
  col*=mix(1.0,0.70,smoothstep(0.15,0.9,crev));col=mix(col,col*vec3(1.0,0.88,0.78),smoothstep(0.4,1.0,crev)*0.5);
  vec4 NG=wcTex3(P,N,11.0);vec3 gcol=mix(vec3(0.115,0.245,0.085),vec3(0.215,0.395,0.105),smoothstep(0.2,0.7,NG.g));
  /* moss on the tops of two in five; the base fades into a darker, greener earth where it goes into the ground (vDat.y: the ground's height) */
  float mo=smoothstep(0.6,0.9,N.y)*smoothstep(0.5,0.62,NG.r)*step(fract(seed*7.13),0.4);col=mix(col,gcol*0.85,mo);
  float hgt=P.y-vDat.y;vec3 earth=mix(mix(vec3(0.16,0.13,0.08),vec3(0.14,0.20,0.07),NG.b),gcol*0.55,0.35);
  float gm0=1.0-smoothstep(-0.05,0.30,hgt);col=mix(col,earth,gm0*0.9);col*=1.0-0.25*(1.0-smoothstep(0.0,0.6,hgt));
  float sunF=clamp(dot(N,normalize(uSunD)),0.0,1.0);col*=1.0+0.32*(1.0-sunF)*(1.0-gm0);
  diffuseColor.rgb=col;
}`;
/* the contact ring: a flat card under each boulder, darkest just outside its foot */
function wbldRing(){if(WBLD.ringMat)return;const g=new THREE.PlaneGeometry(2,2);g.rotateX(-Math.PI/2);WBLD.ringGeo=g;
  /* (a plain material with a radial alpha: the game's fog patches - wdepth.js - apply to it as to every other) */
  const S=64,d=new Uint8Array(S*S*4);for(let j=0;j<S;j++)for(let i=0;i<S;i++){const r=Math.hypot(i-S/2+.5,j-S/2+.5)/(S/2),k=(j*S+i)*4,a=(1-wnS(r,.62,1))*wnS(r,.25,.6)*.42+(1-wnS(r,0,.62))*.18;d[k]=8;d[k+1]=10;d[k+2]=5;d[k+3]=Math.round(255*a);}
  const tx=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);tx.magFilter=tx.minFilter=THREE.LinearFilter;tx.needsUpdate=true;
  WBLD.ringMat=new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});}

/* ---------- drawing: per shape one InstancedMesh near and one far, filled from the tiles' lists when they change or the camera has moved ---------- */
function wbldMeshes(){if(WBLD.meshes&&WBLD.group===OW.group&&WBLD.meshes[0].near.parent===OW.group)return;wbldShapes();wbldRing();const mat=wbldMaterial();WBLD.group=OW.group;WBLD.meshes=[];
  const mk=(G,cap,shadow)=>{const g=new THREE.BufferGeometry();for(const k of['position','normal','aEdge','aOcc','aSeam'])g.setAttribute(k,G.attributes[k]);g.setIndex(G.index);
    const d=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4);d.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iData',d);
    const m=new THREE.InstancedMesh(g,mat,cap);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=true;m.userData.keep=1;OW.group.add(m);return m;};
  for(let i=0;i<WBLD.N;i++)WBLD.meshes.push({near:mk(WBLD.shapes[i],64,true),far:mk(WBLD.low[i],256,false)});
  const rm=new THREE.InstancedMesh(WBLD.ringGeo,WBLD.ringMat,512);rm.count=0;rm.frustumCulled=false;rm.renderOrder=1;rm.userData.keep=1;OW.group.add(rm);WBLD.ringMesh=rm;WBLD.dirty=true;}
/* a mesh with room for n (made anew, bigger, when it has not) */
function wbldFit(slot,which,n){const m=slot[which];if(m.instanceMatrix.count>=n)return m;const G=which==='near'?m.geometry:m.geometry,cap=Math.max(n,m.instanceMatrix.count*2);
  const g=new THREE.BufferGeometry();for(const k of['position','normal','aEdge','aOcc','aSeam'])g.setAttribute(k,m.geometry.attributes[k]);g.setIndex(m.geometry.index);
  const d=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4);d.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iData',d);
  const nm=new THREE.InstancedMesh(g,m.material,cap);nm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);nm.count=0;nm.frustumCulled=false;nm.castShadow=m.castShadow;nm.receiveShadow=true;nm.userData.keep=1;
  OW.group.remove(m);m.dispose&&m.dispose();OW.group.add(nm);slot[which]=nm;return nm;}
function wbldView(f){if(!OW.group)return;wbldMeshes();if(!WBLD.dirty&&Math.hypot(f.x-WBLD.cx,f.z-WBLD.cz)<12)return;WBLD.dirty=false;WBLD.cx=f.x;WBLD.cz=f.z;WBLD.stats.builds++;
  const per=[];for(let i=0;i<WBLD.N;i++)per.push({near:[],far:[]});const all=[];
  for(const t of WT.tiles.values()){const r=t.rocks;if(!r||!r.list)continue;for(const b of r.list){const d=Math.hypot(b.x-f.x,b.z-f.z);if(d>WROCK.R+60||(b.sc<.5&&d>260))continue;(d<WBLD.near?per[b.si].near:per[b.si].far).push(b);all.push(b);}}
  let ni=0,nn=0;for(let i=0;i<WBLD.N;i++)for(const w of['near','far']){const L=per[i][w],m=wbldFit(WBLD.meshes[i],w,L.length),A=m.instanceMatrix.array,D=m.geometry.attributes.iData;
    L.forEach((b,j)=>{A.set(b.M,j*16);D.array.set(b.d,j*4);});m.count=L.length;m.instanceMatrix.needsUpdate=true;D.needsUpdate=true;ni+=L.length;if(w==='near')nn+=L.length;}
  /* the contact rings: of the boulders within the near distance, flat on the ground's slope */
  {let rm=WBLD.ringMesh;const L=all.filter(b=>Math.hypot(b.x-f.x,b.z-f.z)<WBLD.near*1.6);if(rm.instanceMatrix.count<L.length){const nm=new THREE.InstancedMesh(WBLD.ringGeo,WBLD.ringMat,L.length*2);nm.frustumCulled=false;nm.renderOrder=1;nm.userData.keep=1;OW.group.remove(rm);OW.group.add(nm);rm=WBLD.ringMesh=nm;}
    const M=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),sv=new THREE.Vector3();
    L.forEach((b,j)=>{q.setFromUnitVectors(up,v.set(b.nx,b.ny,b.nz));const s=b.rw*1.35;M.compose(sv.set(b.x,b.h+.04,b.z),q,new THREE.Vector3(s,1,s));rm.setMatrixAt(j,M);});rm.count=L.length;rm.instanceMatrix.needsUpdate=true;}
  WBLD.stats.inst=ni;WBLD.stats.near=nn;}
function wbldReset(){WBLD.meshes=null;WBLD.group=null;WBLD.dirty=true;WBLD.cx=WBLD.cz=1e9;}

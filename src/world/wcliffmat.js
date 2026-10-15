/* =====================================================================================================
   THE CLIFF'S LOOK (src/world/wcliffmat.js, world look 1): the material of the cliff sheets wcliff.js makes, and their meshes.
   - Painted stone: a palette of four tones per stone (brown on the tablelands, grey on the spires' stone: PAL in the mockup), in four soft steps; a
     stone is lighter on top and darker underneath - its shape comes from light, not outlines; a few percent warmer or cooler stone by stone.
   - Line hierarchy: the seams between stones are the main lines - thin, dark but never black (the darkest is 70 % of the base colour, warm);
     they are found per pixel: the four best stones at the vertex (aBlk) are scored at the pixel and at two points beside it on the face, the gap
     between the best and the second best turned into metres by its gradient and drawn with fwidth (crisp at any distance, no stair-steps); a
     seam with no real step between the two stones is not drawn. The stones' own bevels are lit per pixel too (the winner's relief bends the
     face's normal). Cracks are faint hairlines on about one stone in three, gone between 10 and 28 m; specks barely there.
   - The foot: the grass climbs over the lowest stones where the cliff eases into the slope (rho, broken by noise), the rock a little darker just
     above it; moss on some tops; the fill light lights only the rock, so faces turned from the sun stay readable.
   - The game's fog (wdepth.js patches three.js's fog chunks) applies as to every other material.
   One program for every tile; each tile its own material for its own stone table (a float texture, 4 texels a stone, positions from the tile's
   corner, uOrg).
   ===================================================================================================== */
const WCM={mats:new Set(),sun:{value:new THREE.Vector3(.4,.85,.3)},time:0};
const WCM_PAL=`
const vec3 PB0=vec3(0.30,0.22,0.16),PB1=vec3(0.48,0.39,0.29),PB2=vec3(0.66,0.56,0.43),PB3=vec3(0.82,0.73,0.58);
const vec3 PG0=vec3(0.14,0.15,0.18),PG1=vec3(0.27,0.28,0.30),PG2=vec3(0.42,0.42,0.42),PG3=vec3(0.60,0.60,0.57);
vec3 wcRamp4(float t,vec3 a,vec3 b,vec3 c,vec3 d){t=clamp(t,0.0,1.0);return t<0.3333?mix(a,b,t*3.0):t<0.6667?mix(b,c,(t-0.3333)*3.0):mix(c,d,(t-0.6667)*3.0);}
vec3 wcStone(float t,float grey){return mix(wcRamp4(t,PB0,PB1,PB2,PB3),wcRamp4(t,PG0,PG1,PG2,PG3),grey);}
`;
/* the stone table of a tile as a float texture: WCL_SN (24) floats a stone = 6 RGBA texels, as wclStones lays them out (x, z from the tile's corner) */
function wcmTex(A,x0,z0){const S=WCL_SN,n=Math.max(1,A.length/S),d=new Float32Array(n*S);d.set(A);for(let k=0;k<A.length/S;k++){d[k*S]-=x0;d[k*S+2]-=z0;}
  const t=new THREE.DataTexture(d,S/4,n,THREE.RGBAFormat,THREE.FloatType);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;}
function wcmMat(tex,x0,z0){const tWN=wtNoiseTex(),m=new THREE.MeshPhongMaterial({color:0xffffff,shininess:6,specular:0x101010}),U={uBlk:{value:tex},uOrg:{value:new THREE.Vector3(x0,0,z0)},tWN:{value:tWN},tGS:{value:wtStrokeTex()},uSunD:WCM.sun};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aBlk;attribute vec4 aBlk2;flat varying vec4 vBlk;flat varying vec4 vBlk2;attribute float aCrev;attribute float aRk;attribute vec3 aPal;varying vec3 vWp;varying vec3 vN0;varying float vCrev;varying float vRk;varying float vPal;varying float vSn;varying float vGr;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;vN0=normalize(mat3(modelMatrix)*objectNormal);vCrev=aCrev;vRk=aRk;vPal=aPal.x;vSn=aPal.y;vGr=aPal.z;vBlk=aBlk;vBlk2=aBlk2;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uBlk;uniform vec3 uOrg;uniform sampler2D tWN;uniform sampler2D tGS;uniform vec3 uSunD;varying vec3 vWp;varying vec3 vN0;varying float vCrev;varying float vRk;varying float vPal;varying float vSn;varying float vGr;flat varying vec4 vBlk;flat varying vec4 vBlk2;vec3 wcN;'+WCM_PAL+WCM_FUNCS+WT_GLSL_MEADOW)
      .replace('#include <map_fragment>','#include <map_fragment>\n'+WCM_COLOR)
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize((viewMatrix*vec4(wcN,0.0)).xyz);')
      .replace('#include <lights_fragment_begin>',wcmLights());};
  m.customProgramCacheKey=()=>'wcliff11';m.userData.U=U;WCM.mats.add(m);return m;}
const WCM_FUNCS=`
/* a stone at P (from the tile's corner): x = relief, y = score (-1 outside it), z = cap (1 well inside, 0 at its rim); g = the relief's slope along the
   face (per metre, along u0 and up) - from the edge that is nearest (a block's straight bevels: the slope of one plane at a time) and the front's tilt */
vec3 wcEval(vec4 A,vec4 B,vec4 C,vec4 D,vec4 E,vec4 F,vec3 P,out vec2 g){g=vec2(0.0);vec3 d=P-A.xyz;float dn=d.x*D.x+d.z*D.y,mx=max(A.w,B.x);if(abs(dn)>0.7*mx)return vec3(0.0,-1.0,0.0);
  float u0=-d.x*D.y+d.z*D.x,a=u0*B.y+d.y*B.z,b=-u0*B.z+d.y*B.y,isk=inversesqrt(1.0+B.w*B.w),sa=a+B.w*b;
  float dd=(A.w*0.5-abs(sa))*isk;vec2 ga=-sign(sa)*vec2(1.0,B.w)*isk;
  float d2=B.x*0.5-abs(b);if(d2<dd){dd=d2;ga=vec2(0.0,-sign(b));}
  float d3=E.w-(a*E.y+b*E.z);if(d3<dd){dd=d3;ga=-E.yz;}
  float d4=F.z-(a*F.x+b*F.y);if(d4<dd){dd=d4;ga=-F.xy;}
  if(dd<=0.0)return vec3(0.0,-1.0,0.0);
  float mn=min(A.w,B.x),fd=1.0-smoothstep(0.2*mn,0.6*mn,abs(dn));if(fd<=0.0)return vec3(0.0,-1.0,0.0);
  float t=min(1.0,dd/C.y),ka=C.z/(A.w*0.5),kb=C.w/(B.x*0.5),tl=1.0+ka*a+kb*b,amp=C.x*fd,f=amp*t*tl;
  vec2 gab=amp*((dd<C.y?ga/C.y:vec2(0.0))*tl+t*vec2(ka,kb));g=vec2(gab.x*B.y-gab.y*B.z,gab.x*B.z+gab.y*B.y);
  return vec3(f,f+E.x*fd,min(1.0,dd/(0.5*mn)));}
/* the noise texture on the face, in world space, blended between the two upright planes by which way the face looks (and with the flat one: wcTex3) */
vec4 wcTex(vec3 W,vec3 n,float s){float wx=abs(n.x),wz=abs(n.z),sm=wx+wz+1e-3;return (texture2D(tWN,W.xy/s)*wz+texture2D(tWN,W.zy/s)*wx)/sm;}
vec4 wcTex3(vec3 W,vec3 n,float s){vec3 a=abs(n);a=a*a;a/=a.x+a.y+a.z+1e-4;return texture2D(tWN,W.zy/s)*a.x+texture2D(tWN,W.xz/s)*a.y+texture2D(tWN,W.xy/s)*a.z;}
`;
const WCM_COLOR=`
{
  vec3 P=vWp-uOrg;vec3 n0=normalize(vN0);float dc=length(vWp-cameraPosition);
  vec3 T0=vec3(-n0.z,0.0,n0.x);float th=length(T0);T0=th>1e-3?T0/th:vec3(1.0,0.0,0.0);vec3 U0=cross(T0,n0);
  /* the vertex's candidate stones: the best two at the pixel, each with the slope of its relief (one evaluation a stone) */
  float s1=-1.0,s2=-1.0,f1=0.0,cap=0.0,sid=0.5,ssc=1.0;vec3 g1=vec3(0.0),g2=vec3(0.0);vec2 gq;
  for(int k=0;k<8;k++){float idx=k<4?vBlk[k]:vBlk2[k-4];if(idx<0.0)break;int i=int(idx+0.5);
    vec4 D=texelFetch(uBlk,ivec2(3,i),0);if(D.x*n0.x+D.y*n0.z<0.3*th)continue;
    vec4 A=texelFetch(uBlk,ivec2(0,i),0),B=texelFetch(uBlk,ivec2(1,i),0);vec3 dq=P-A.xyz;if(dot(dq,dq)>0.36*(A.w*A.w+B.x*B.x)+0.5)continue;/* (beyond its corners: the rest of it unread) */
    vec3 q=wcEval(A,B,texelFetch(uBlk,ivec2(2,i),0),D,texelFetch(uBlk,ivec2(4,i),0),texelFetch(uBlk,ivec2(5,i),0),P,gq);
    if(q.y<0.0)continue;vec3 gw=gq.x*vec3(-D.y,0.0,D.x)+vec3(0.0,gq.y,0.0);
    if(q.y>s1){s2=s1;g2=g1;s1=q.y;g1=gw;f1=q.x;cap=q.z;sid=D.z;ssc=D.w;}else if(q.y>s2){s2=q.y;g2=gw;}}
  /* the seam: the gap between the best two, in metres by its slope along the face, drawn with fwidth (crisp at any distance); none without a real step */
  float gap=s1<0.0?1.0:(s2<0.0?f1:s1-s2);vec3 gG=s1<0.0?vec3(0.0):(s2<0.0?g1:g1-g2);gG-=n0*dot(n0,gG);
  float gl=length(gG),sdist=gap/max(gl,0.12),vis=smoothstep(0.35,0.85,gl)*step(0.0,s1);
  float sw=0.045*sqrt(ssc),sa=fwidth(sdist)*0.8+0.002;float seam=(1.0-smoothstep(sw-sa,sw+sa,sdist))*vis,seamSoft=(1.0-smoothstep(sw,sw*4.4,sdist))*vis;
  float rk=vRk;
  /* the stone's bevel lit per pixel: the winner's relief bends the face's normal */
  vec3 gF=g1-n0*dot(n0,g1);float gfl=length(gF);if(gfl>3.0)gF*=3.0/gfl;vec3 Nn=s1>=0.0?normalize(n0-gF*rk):n0;
  float up=clamp(Nn.y*0.5+0.5,0.0,1.0);
  /* the noise: one read for the stone (its channels are other scales: tone, mottling, cracks, specks), one for the green (patches, moss, the grass line, snow) */
  vec3 Wq=vWp+vec3(sid*31.7,0.0,sid*17.3);vec4 NS=wcTex(Wq,n0,6.0);float nb=NS.r,nm=NS.g;
  float crev=max(vCrev,max(seam,0.45*seamSoft));
  float t=0.54+0.12*(sid-0.5)+0.10*cap+0.30*(up-0.5)+0.10*(nb-0.5)+0.04*(nm-0.5)*(1.0-smoothstep(25.0,70.0,dc));
  t-=0.15*crev;t-=0.14*(1.0-smoothstep(0.35,0.8,rk));
  /* cracks: faint hairlines on about one stone in three, gone by 28 m */
  {float ck=abs(NS.b-0.5);float cka=fwidth(ck)*0.8+0.002;float crack=(1.0-smoothstep(0.012-cka,0.012+cka,ck))*step(0.67,fract(sid*3.71))*smoothstep(0.25,0.5,cap)*(1.0-smoothstep(10.0,28.0,dc));t-=0.10*crack;}
  float q4=t*4.0;t=mix(t,(floor(q4)+smoothstep(0.3,0.7,fract(q4)))/4.0,0.8);/* four tone steps, painted */
  vec3 warm=vec3(1.04,1.0,0.94),cool=mix(vec3(0.95,0.96,1.02),vec3(0.90,0.96,1.07),vPal);
  vec3 col=wcStone(t,vPal)*mix(cool,warm,fract(sid*5.31));
  col*=mix(1.0,0.70,smoothstep(0.15,0.9,crev));col=mix(col,col*vec3(1.0,0.88,0.78),smoothstep(0.4,1.0,crev)*0.5);/* darkest 70 % of the base, warm */
  col=mix(col,col*cool*0.9,clamp((1.0-up)*0.35,0.0,1.0));
  col*=1.0-0.07*smoothstep(0.58,0.74,NS.a);
  vec4 NG=wcTex3(vWp,n0,11.0);/* (the cliff's grass is the meadow's: WT_GLSL_MEADOW) */
  float clC;vec3 gcol=wtGrassRamp(wtMeadowT(vWp.xz,1.0-smoothstep(28.0,80.0,dc),clC)+0.14*(clamp(dot(Nn,normalize(uSunD)),0.0,1.0)-0.65));
  gcol=wtMeadowStrokes(gcol,vWp.xz,1.0-smoothstep(14.0,42.0,dc));
  /* snow on the upper spires (vSn, as the ground's): on the tops of the stones and the ledges */
  float snA=vSn>0.002?smoothstep(0.25,0.5,vSn+0.35*(NG.a-0.5)+0.2*(nb-0.5)):0.0;vec3 snC=vec3(0.88,0.91,0.97)*(0.92+0.08*nm);
  gcol=mix(gcol,snC,snA);/* (the soil is snowed over where the ground is) */if(snA>0.0)col=mix(col,snC,snA*smoothstep(0.5,0.8,Nn.y+0.1*cap));
  /* moss on some tops; the grass at the foot (vGr: the soil climbing the face) and wherever the face eases (rho), the rock a little darker just above it */
  float mo=smoothstep(0.62,0.9,Nn.y)*smoothstep(0.52,0.66,NG.r+0.1*cap)*(1.0-crev);col=mix(col,gcol*0.9,mo*0.8);
  float gr=max(vGr,1.0-smoothstep(0.25,0.55,rk))+0.22*(NG.b-0.5)-0.15*smoothstep(0.4,0.9,cap);float gm=smoothstep(0.44,0.56,gr);
  col=mix(col,gcol,gm);col=mix(col,col*0.82,smoothstep(0.15,0.44,gr)*(1.0-gm));
  float sunF=clamp(dot(Nn,normalize(uSunD)),0.0,1.0);col*=1.0+0.30*(1.0-sunF)*(1.0-gm);
  wcN=normalize(mix(Nn,vec3(0.0,1.0,0.0),gm*0.5));
  diffuseColor.rgb=col;
}`;
/* a tile's cliff mesh from wclGen's arrays (lod 0 casts shadows) */
function wcmMesh(t,lod,out){if(!out.pos||!out.idx||!out.idx.length)return null;const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(out.pos,3));g.setAttribute('normal',new THREE.BufferAttribute(out.nrm,3));{const B=out.blk,n=B.length/8,b1=new Float32Array(n*4),b2=new Float32Array(n*4);for(let i=0;i<n;i++)for(let a=0;a<4;a++){b1[i*4+a]=B[i*8+a];b2[i*4+a]=B[i*8+4+a];}
    g.setAttribute('aBlk',new THREE.BufferAttribute(b1,4));g.setAttribute('aBlk2',new THREE.BufferAttribute(b2,4));}
  g.setAttribute('aCrev',new THREE.BufferAttribute(out.crev,1));g.setAttribute('aRk',new THREE.BufferAttribute(out.rk,1));g.setAttribute('aPal',new THREE.BufferAttribute(out.pal,3));
  g.setIndex(new THREE.BufferAttribute(out.idx,1));g.computeBoundingSphere();
  const tex=wcmTex(out.stones,t.x0,t.z0),m=new THREE.Mesh(g,wcmMat(tex,t.x0,t.z0));m.position.set(t.x0,0,t.z0);m.castShadow=lod===0;m.receiveShadow=true;m.matrixAutoUpdate=false;m.updateMatrix();
  m.userData.keep=1;m.userData.tex=tex;m.userData.cliff=1;return m;}
function wcmDrop(m){if(!m)return;if(m.userData.tex)m.userData.tex.dispose();if(m.material){WCM.mats.delete(m.material);m.material.dispose();}}
/* three.js' light chunk without its point lights, for the cliff: rock in the open is lit by the sun and the sky; with the village's eight point lights
   (four with cube shadows, unrolled) on top of the stone's own work the program ran out of registers and cost several times as much (the lanterns do
   not light a cliff). Made once, from the chunk as the game has patched it */
function wcmLights(){if(WCM.lfb)return WCM.lfb;const src=THREE.ShaderChunk.lights_fragment_begin,i=src.indexOf('#if ( NUM_POINT_LIGHTS > 0 )');if(i<0)return WCM.lfb=src;
  let d=0,j=i;const re=/^[ \t]*#(if|ifdef|ifndef|endif)\b.*$/gm;re.lastIndex=i;let m;while((m=re.exec(src))){if(m[1]==='endif')d--;else d++;if(d===0){j=m.index+m[0].length;break;}}
  return WCM.lfb=d===0?src.slice(0,i)+src.slice(j):src;}
/* per frame: the sun's direction for the fill light */
function wcmFrame(){if(!WCM.sun.value)WCM.sun.value=new THREE.Vector3(.4,.85,.3);if(typeof DAYC!=='undefined'&&DAYC.dir)WCM.sun.value.copy(DAYC.dir);}

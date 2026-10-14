/* =====================================================================================================================
   KINGSGAARD INTERIORS (lighting): the light grid of a house.
   The world has one sky light (the hemisphere), the sun and the moon, and a few point lights. Inside a house the sky light must not be the same everywhere: a room reaches it through its windows only, a room with no
   window stays dark, a corner is darker than the middle of the floor, a fire or a lamp lights what it can see and not the room behind the wall.
   For every floor of a house that has been loaded a small grid (16 cm cells, 2 textures) is baked from the plan: how much of the light of each FACE of the house (front, back, left, right) reaches the cell through the windows
   (distance, angle, partition walls in between, a little spill through doorways); how much comes through the front door when it is open; how much the fires and the lamps of the rooms light it; how much the walls and the furniture
   close it in (ambient occlusion). The interior meshes AND the walls of the house sample the grid by their position in the house (owlmPatch): the sky light of the surface is scaled by what reaches the cell, the warm light is added,
   and the street lamps and the other point lights of the world are not applied inside (a lamp does not light a room through its wall; the one real point light of interior/light.js, which has shadows, still does).
   Per frame only a few numbers change (the weight of every face from the sun and the sky, the night, the fires' flicker, how far the door is open): owlmTick.
   Texture A: R,G,B,A = daylight from the front, back, left, right windows.   Texture B: R = lamps, G = 0 outside / 0.1 + 0.9 * openness inside, B = daylight through the front door, A = fires.
   ===================================================================================================================== */
const OWLM_SLABMAT=new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide});
const OWLM={capK:1.3,thru:.55,D0:1.8,gain:1,sn:.55,keep:.45,cs:.2,ambMin:.3,ambMax:1.15,aoMin:.5,q:[],defA:null,defB:null,flick:0,on:true,stats:{bakes:0,ms:0,cells:0}};
function owlmDefaults(){if(OWLM.defA)return;const mk=(r,g,b,a)=>{const t=new THREE.DataTexture(new Uint8Array([r,g,b,a]),1,1,THREE.RGBAFormat);t.needsUpdate=true;return t;};OWLM.defA=mk(255,255,255,255);OWLM.defB=mk(0,255,0,0);}
/* the uniforms of one house (shared by all its materials) */
function owlmInit(b){const ic=b.ic;if(ic.lmu)return ic.lmu;owlmDefaults();const V=THREE.Vector4;
  ic.lmu={uQ:{value:new V(-1e5,1e5,-1e5,1e5)},uQ1:{value:new V(-1e5,1e5,-1e5,1e5)},uQ2:{value:new V(-1e5,1e5,-1e5,1e5)},uQ3:{value:new V(-1e5,1e5,-1e5,1e5)},uLA:{value:OWLM.defA},uLB:{value:OWLM.defB},uLMd:{value:new V(0,0,1/OWLM.cs,0)},uLMa:{value:new V(1,1,1,0)},uFy:{value:new V(0,1e5,1e5,1e5)},uFaceW:{value:new V(1,1,1,1)},uK:{value:new V(0,0,0,OWLM.ambMin)},uK2:{value:new V(0,OWLM.ambMax,0,0)},uSc:{value:1},uScE:{value:b.BSc||1}};
  ic.lm=null;return ic.lmu;}
/* The shadows of the people in the light of the room (interior/light.js, OWHS): a cube map of the hero and the villagers of the room alone, seen from the source. owHS is 1 where nobody is between the surface and the flame
   (less where someone is: the taps of a blocker search set the penumbra from the blocker's distance, then 12 taps on a disk turned per pixel, all as directions round the one to the surface); it is looked up only inside the
   cones round the figures (uHSC). owFv is how far the source itself reaches the surface (its own cube shadow, set in the light loop below). Only the house of the source computes it (uK2.w).
   The cube is read with three.js' own cubeToUV (copied out of its chunk, so the layout of the faces is the one it draws). */
const owhsTaps=(n,f)=>{let s='';for(let i=0;i<n;i++){const r=Math.sqrt((i+.5)/n),a=i*2.3999632;s+=f((r*Math.cos(a)).toFixed(4),(r*Math.sin(a)).toFixed(4));}return s;};
const OWHS_CUBE=(()=>{const a=THREE.ShaderChunk.shadowmap_pars_fragment,i=a.indexOf('vec2 cubeToUV(');if(i<0)return null;let d=0,j=-1;for(let k=a.indexOf('{',i);k<a.length;k++){if(a[k]==='{')d++;else if(a[k]==='}'&&--d===0){j=k;break;}}
  return j>0?a.slice(i,j+1).replace('vec2 cubeToUV(','vec2 owCubeToUV('):null;})();
const OWHS_DECL='uniform sampler2D uHS;uniform vec4 uHSK,uHSN;uniform vec3 uHSL;uniform vec4 uHSC['+OWHS.N+'];varying vec4 vHsc;\n'+(OWHS_CUBE||'vec2 owCubeToUV(vec3 v,float t){return vec2(0.0);}')+
  '\nfloat owHsZ(vec3 d){return uHSN.x+unpackRGBAToDepth(texture2D(uHS,owCubeToUV(d,uHSN.w)))*(uHSN.y-uHSN.x);}\n';
const OWHS_PRE=`
float owHS=1.0,owFv=0.0;
if(uHSK.x*uK2.w>0.0){float zr=length(vHsc.xyz);vec3 bd=vHsc.xyz/max(zr,1e-4);float hit=0.0;
 for(int i=0;i<${OWHS.N};i++){vec4 c=uHSC[i];float dn=length(c.xyz);if(dn>0.0&&zr>dn&&dot(bd,c.xyz)>c.w*dn)hit=1.0;}
 if(hit>0.0&&zr<uHSN.y){
  vec3 tu=normalize(cross(bd,abs(bd.y)<.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))),tv=cross(bd,tu);
  float zt=zr-uHSK.y,an=6.2832*fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))),ca=cos(an),sa=sin(an),bs=0.0,bn=0.0,zb;vec3 ra=tu*ca+tv*sa,rb=tv*ca-tu*sa;
  `+owhsTaps(8,(x,y)=>`zb=owHsZ(bd+(ra*${x}+rb*${y})*uHSK.w);if(zb<zt){bs+=zb;bn+=1.0;}\n  `)+`if(bn>0.0){zb=bs/bn;float pr=clamp(uHSN.z*(zr-zb)/(zb*zr),uHSK.z,uHSK.w),s=0.0;
  `+owhsTaps(12,(x,y)=>`s+=step(owHsZ(bd+(ra*${x}+rb*${y})*pr),zt);\n  `)+`owHS=1.0-uHSK.x*s/12.0;}}}
`;
/* the shader: the sample before the lights, the sky light scaled and the warm light added after them, the street lamps off inside */
const OWLM_PRE=`
float lmI=0.0,lmAo=1.0;vec4 lmA=vec4(1.0),lmB=vec4(0.0,1.0,0.0,0.0);
{float fdir=gl_FrontFacing?1.0:-1.0;float fi=step(uFy.y-.25,vLp.y)+step(uFy.z-.25,vLp.y)+step(uFy.w-.25,vLp.y);vec3 sp=vLp+normalize(vNl)*fdir*.17;
 vec2 uv=vec2((fi*uLMa.z+(sp.x-uLMd.x)*uLMd.z)/uLMa.x,((sp.z-uLMd.y)*uLMd.z)/uLMa.y);lmA=texture2D(uLA,uv);lmB=texture2D(uLB,uv);
 lmI=smoothstep(.03,.09,lmB.g)*uK2.x;lmAo=clamp((lmB.g-.1)/.9,0.0,1.0);}
`+OWHS_PRE;
const OWLM_POST=`
{float dayv=dot(lmA,uFaceW)+lmB.b*uK.z;float amb=uK.w+(uK2.y-uK.w)*clamp(dayv,0.0,1.0);float ao=mix(.4,1.0,lmAo);
 reflectedLight.indirectDiffuse*=mix(1.0,amb*ao,lmI);
 reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.034,.038,.055)*lmI;
 reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(1.0,.62,.3)*(lmB.r*uK.x*.9+lmB.a*uK.y*1.0)*(1.0-.5*clamp(dayv,0.0,1.0))*mix(.65,1.0,lmAo)*lmI*mix(1.0,owHS,owFv);}
`;
function owlmPatch(sh,u,intr){
  sh.uniforms.uLA=u.uLA;sh.uniforms.uLB=u.uLB;sh.uniforms.uLMd=u.uLMd;sh.uniforms.uLMa=u.uLMa;sh.uniforms.uFy=u.uFy;sh.uniforms.uFaceW=u.uFaceW;sh.uniforms.uK=u.uK;sh.uniforms.uK2=u.uK2;sh.uniforms.uSc=intr?u.uSc:u.uScE;sh.uniforms.uQ=u.uQ;sh.uniforms.uQ1=u.uQ1;sh.uniforms.uQ2=u.uQ2;sh.uniforms.uQ3=u.uQ3;
  {/* the hero's shadow (one for the whole world: the uniforms are shared) */const hu=OWHS.u;sh.uniforms.uHS=hu.uHS;sh.uniforms.uHSM=hu.uHSM;sh.uniforms.uHSK=hu.uHSK;sh.uniforms.uHSN=hu.uHSN;sh.uniforms.uHSL=hu.uHSL;sh.uniforms.uHSC=hu.uHSC;}
  sh.vertexShader=sh.vertexShader.replace('void main() {',(intr?'attribute float aE;varying float vE;\n':'')+'varying vec3 vLp;varying vec3 vNl;uniform float uSc;uniform mat4 uHSM;varying vec4 vHsc;\nvoid main() {').replace('#include <begin_vertex>','#include <begin_vertex>\n'+(intr?' vE=max(aE,0.0);if(aE<-.5)transformed=vec3(0.0);/* (bedding hidden under a sleeper\'s own covers: vilhome.js) */\n':'')+' vLp=position*uSc;vNl=normal;')
    .replace('#include <project_vertex>','#include <project_vertex>\n vHsc=uHSM*(modelMatrix*vec4(transformed,1.0));');
  sh.fragmentShader=sh.fragmentShader.replace('void main() {','varying vec3 vLp;varying vec3 vNl;'+(intr?'varying float vE;':'')+'uniform sampler2D uLA;uniform sampler2D uLB;uniform vec4 uLMd,uLMa,uFy,uFaceW,uK,uK2,uQ,uQ1,uQ2,uQ3;\n'+OWHS_DECL+'void main() {')
    .replace('#include <lights_fragment_begin>',OWLM_PRE+'#include <lights_fragment_begin>').replace('#include <aomap_fragment>','#include <aomap_fragment>\n'+OWLM_POST);
  /* the walls and the roof: only a face that looks into the rooms (its sample point inside the rooms' rectangle of its own floor: uQ, uQ1, uQ2, uQ3 by the floor index of the grid) and lies below the top of the walls is inside; the grid bleeds a cell or two past the rooms,
     which reached the outer faces of the walls 17 cm out, and it is a plan, which said 'inside' over the roof */
  if(!intr)sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>','{vec3 spw=vLp+normalize(vNl)*(gl_FrontFacing?1.0:-1.0)*.17;float fq=step(uFy.y-.25,vLp.y)+step(uFy.z-.25,vLp.y)+step(uFy.w-.25,vLp.y);vec4 q=mix(mix(mix(uQ,uQ1,step(.5,fq)),uQ2,step(1.5,fq)),uQ3,step(2.5,fq));lmI*=step(vLp.y,uK2.z)*step(q.x-.02,spw.x)*step(spw.x,q.y+.02)*step(q.z-.02,spw.z)*step(spw.z,q.w+.02);}\n#include <lights_fragment_begin>');
  if(intr)sh.fragmentShader=sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','outgoingLight=mix(outgoingLight,diffuseColor.rgb*1.15,vE);\n  gl_FragColor = vec4( outgoingLight, diffuseColor.a );');
  /* the tops the cutaway leaves: a piece of furniture or a partition cut by the clip of the cutaway (b.cutPlane, 1.5 m over the hero's floor) showed the inside of its boxes, a chimney breast an open tray. Every part of
     an interior is a closed solid, so a face seen from behind can only be seen through such a cut: it is drawn as the top the cut leaves, in the colour of its own part, lit as a level face (the normal straight up) */
  /* (the grid is read straight above the point, and only the light of the room falls on it - the grid's light, the sky's, the warm light of the fires - not the lamps' and the sun's, whose shadows inside a solid would
     mark the walls of the cut as a tray) */
  if(intr)sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n if(!gl_FrontFacing)normal=normalize((viewMatrix*vec4(0.0,1.0,0.0,0.0)).xyz);')
    .replace('vec3 sp=vLp+normalize(vNl)*fdir*.17;','vec3 sp=gl_FrontFacing?vLp+normalize(vNl)*.17:vLp+vec3(0.0,.17,0.0);')
    .replace('outgoingLight=mix(outgoingLight,diffuseColor.rgb*1.15,vE);','if(!gl_FrontFacing)outgoingLight=reflectedLight.indirectDiffuse*OWLM.capK+totalEmissiveRadiance;\n  outgoingLight=mix(outgoingLight,diffuseColor.rgb*1.15,vE);'.replace('OWLM.capK',OWLM.capK.toFixed(3)));}
/* the point lights without shadows (street lamps, spell light) do not light the inside of a house: one patch of three.js' light shader, active for materials that define USE_LM */
(function(){const C=THREE.ShaderChunk,a='getPointDirectLightIrradiance( pointLight, geometry, directLight );';
  if(C.lights_fragment_begin.indexOf(a)>=0)C.lights_fragment_begin=C.lights_fragment_begin.replace(a,a+'\n\t\t#ifdef USE_LM\n\t\t#if UNROLLED_LOOP_INDEX >= NUM_POINT_LIGHT_SHADOWS\n\t\tdirectLight.color *= 1.0 - lmI;\n\t\t#endif\n\t\t#endif');
  window.__lmChunkOK=C.lights_fragment_begin.indexOf('USE_LM')>=0;})();
/* the source of the hero's shadow among the point lights with shadows (found by its position, uHSL): its cube shadow is kept as owFv (how far the source reaches the surface, for the warm light of the grid) and its light is cut by owHS */
(function(){const C=THREE.ShaderChunk,s=C.lights_fragment_begin,i=s.indexOf('getPointShadow( pointShadowMap[ i ]'),h='directLight.color *=';
  if(i>=0){const a=s.lastIndexOf(h,i),b=s.indexOf(': 1.0;',i)+6;if(a>=0&&b>i){const line=s.slice(a,b),ex=line.slice(h.length,-1);
    C.lights_fragment_begin=s.slice(0,a)+'#ifdef USE_LM\n\t\t{float owPs='+ex+';directLight.color *= owPs;if(distance(pointLight.position,uHSL)<.05){owFv=directLight.visible?owPs:0.0;directLight.color *= owHS;}}\n\t\t#else\n\t\t'+line+'\n\t\t#endif'+s.slice(b);}}
  window.__hsChunkOK=C.lights_fragment_begin.indexOf('owFv')>=0;})();
/* The fall-off of a point light with decay 2 (every light of the houses and the street): an inverse square law with a soft core (a flame has a size, so the light does not shoot up to infinity close to it) and a smooth window to zero at the
   range of the light, instead of three.js' (1 - d / range)^2, which is nearly flat over the first third of the range and made a lantern light a whole room evenly. The factor is 7.1 / (1 + (d / (0.085 range))^2) times the window:
   a quarter of the light at 0.17 of the range, a tenth at 0.27, none at the range. Lights with another decay (the spell light) keep the old curve. */
(function(){const C=THREE.ShaderChunk,a='if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {\n\t\treturn pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );\n\t}';
  if(C.bsdfs.indexOf(a)>=0)C.bsdfs=C.bsdfs.replace(a,'if( cutoffDistance > 0.0 && decayExponent > 1.99 && decayExponent < 2.01 ) {\n\t\tfloat rr = lightDistance / cutoffDistance;\n\t\tfloat win = saturate( 1.0 - rr * rr * rr * rr );\n\t\tfloat dd = lightDistance / ( cutoffDistance * 0.085 );\n\t\treturn win * win * 7.1 / ( 1.0 + dd * dd );\n\t}\n\t'+a);
  window.__attOK=C.bsdfs.indexOf('0.085')>=0;})();
/* The shadow of a point light is read with four taps (the corners of a tetrahedron round the direction, 1.5 texels apart) instead of nine: only the lights of the houses and the lanterns have point shadows, and each is looked up for every pixel it reaches. */
(function(){const C=THREE.ShaderChunk,a=C.shadowmap_pars_fragment,i=a.indexOf('float getPointShadow'),j=a.indexOf('return (',i),k=a.indexOf(') * ( 1.0 / 9.0 );',j);
  if(i>=0&&j>=0&&k>=0){const four='return (\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +\n\t\t\t\ttexture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )\n\t\t\t) * ( 1.0 / 4.0 );';
    C.shadowmap_pars_fragment=a.slice(0,j)+four+a.slice(k+') * ( 1.0 / 9.0 );'.length);
    const b=C.shadowmap_pars_fragment;C.shadowmap_pars_fragment=b.replace('vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;','vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y * 1.5;');}
  window.__ps4=C.shadowmap_pars_fragment.indexOf('1.0 / 4.0')>=0;})();
/* the walls of a house (and its foundation, details and roof) sample the grid too, so the inside faces of the outer walls match the room; the faces that look out are not touched (the grid says "outside" there) */
function owlmWalls(b,on){const ic=b.ic;if(!ic||!b.mats)return;const u=ic.lmu;
  for(const k of Object.keys(b.mats)){const m=b.mats[k];if(!m)continue;
    if(on){m.defines=Object.assign({},m.defines,{USE_LM:''});m.onBeforeCompile=sh=>owlmPatch(sh,u,false);m.customProgramCacheKey=()=>'owlmx';u.uScE.value=b.BSc||1;m.needsUpdate=true;}
    else if(m.defines&&m.defines.USE_LM!==undefined){delete m.defines.USE_LM;m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=>'';m.needsUpdate=true;}}}

/* ---------------------------------------------------------------- the bake ---------------------------------------------------------------- */
const owlmSegHit=(S,x1,z1,x2,z2)=>{const dx=x2-x1,dz=z2-z1;for(let i=0;i<S.length;i+=4){const ex=S[i+2]-S[i],ez=S[i+3]-S[i+1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((S[i]-x1)*ez-(S[i+1]-z1)*ex)/den,s=((S[i]-x1)*dz-(S[i+1]-z1)*dx)/den;if(t>.001&&t<.999&&s>=0&&s<=1)return true;}return false;};
/* the solid parts of the partition walls of a floor (the doorways are open), as segments */
function owlmSegs(F){const S=[];for(const w of F.walls){const ds=w.doors.slice().sort((a,c)=>a.c-c.c);let cur=w.a;const add=(a,c)=>{if(c-a<.02)return;if(w.ax==='x')S.push(a,w.p,c,w.p);else S.push(w.p,a,w.p,c);};
    for(const d of ds){add(cur,d.c-d.w/2);cur=d.c+d.w/2;}add(cur,w.b);}
  return new Float32Array(S);}
/* a window or door on an outer wall of the floor: its centre, where its light goes (the inward normal), its size, and the face it belongs to */
function owlmEmitters(P,F){const Q=F.Q,out=[];
  for(const w of P.wins){if(w.st!==F.i)continue;const m=(w.a+w.b)/2,wd=Math.max(.1,w.b-w.a-.24),S=wd*Math.max(.2,w.y1-w.y0)/OWLM.sn;let e;
    if(w.wall==='zb')e={x:m,z:Q.zb,nx:0,nz:-1,f:0,ax:1,az:0};else if(w.wall==='za')e={x:m,z:Q.za,nx:0,nz:1,f:1,ax:1,az:0};else if(w.wall==='xa')e={x:Q.xa,z:m,nx:1,nz:0,f:2,ax:0,az:1};else e={x:Q.xb,z:m,nx:-1,nz:0,f:3,ax:0,az:1};
    e.S=S;e.w=wd;out.push(e);}
  if(F.i===0&&P.door&&P.kind!=='tunnel'){const d=P.door;out.push({x:d.u,z:Q.zb,nx:0,nz:-1,f:-1,ax:1,az:0,S:Math.max(.2,(d.w-.1)*d.h*.9/OWLM.sn),w:d.w-.1});}
  return out;}
/* the pieces of a floor that give light: the fires and lamps of the plan (interior/light.js) and a lamp or two in every room of a house somebody lives in; {x, z, i (intensity), r (range, m), fire} */
function owlmSources(b,F){const src=[];for(const it of F.items){const s=OWIL_SRC[it.kind];if(!s)continue;src.push({x:it.x+Math.sin(it.rot)*s.f,z:it.z+Math.cos(it.rot)*s.f,i:s.i*.76,r:s.r,fire:s.fire?1:0,h:s.y});}/* (the real lights are .72 of what they were with the old fall-off; the grid keeps its numbers) */
  if(b.ic.lit)for(const r of F.rooms){if(r.kind==='tunnel'||r.kind==='landing'&&F.i>0&&r.rects[0].xb-r.rects[0].xa<1.2)continue;const q=r.rects.slice().sort((a,c)=>(c.xb-c.xa)*(c.zb-c.za)-(a.xb-a.xa)*(a.zb-a.za))[0];src.push({x:(q.xa+q.xb)/2,z:(q.za+q.zb)/2,i:.5,r:4.4,fire:0,h:1.7});}
  return src;}
/* Light between the floors. A solid floor stops light, a stairwell does not: what a source on the floor below (or above) puts into the opening of a flight of stairs comes out of the opening on this floor, as a new, weaker and softer source that
   stands in the opening (the light that rises through a stairwell hits the ceiling and the walls round it and lights the room from there, it does not light the floor like a lamp). The intensity at the opening is what the source gives at that
   place on its own floor (the same fall-off, the partition walls of that floor in the way), times OWLM.thru; the range is three quarters of the source's, so the light on the upper floor falls off with the distance from the opening and a
   source far from the stairs gives nothing. */
function owlmThrough(P,fi,srcs,segsF){const ext=[];
  for(const f of P.stairs){const g=f.to===fi?f.from:f.from===fi?f.to:-1;if(g<0||g===fi||!srcs[g])continue;const hx=(f.x0+f.x1)/2,hz=(f.z0+f.z1)/2;
    for(const s of srcs[g]){const dx=hx-s.x,dz=hz-s.z,d=Math.hypot(dx,dz);if(d>=s.r)continue;const sg=segsF[g];if(sg&&sg.length&&owlmSegHit(sg,s.x,s.z,hx,hz))continue;
      const fall=1-Math.min(1,Math.max(0,(d-.55*s.r)/(.45*s.r))),c=s.i*fall/(1+(d/(.42*s.r))*(d/(.42*s.r)))*OWLM.thru;if(c<.015)continue;
      ext.push({x:hx,z:hz,i:c,r:Math.max(2.4,s.r*.75),fire:s.fire,h:1.2});}}
  return ext;}
function owlmBakeFloor(b,P,F,cs,nx,nz,x0,z0,ext){
  const N=nx*nz,Q=F.Q,rects=[];for(const r of F.rooms)for(const q of r.rects)rects.push(q);
  const holes=owiHoles?owiHoles(P,F.i):[];for(const h of holes)rects.push({xa:h.x0,xb:h.x1,za:h.z0,zb:h.z1});
  const inside=new Uint8Array(N),cx=new Float32Array(nx),cz=new Float32Array(nz);for(let i=0;i<nx;i++)cx[i]=x0+(i+.5)*cs;for(let j=0;j<nz;j++)cz[j]=z0+(j+.5)*cs;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=cx[i],z=cz[j];for(const q of rects)if(x>=q.xa-.01&&x<=q.xb+.01&&z>=q.za-.01&&z<=q.zb+.01){inside[j*nx+i]=1;break;}}
  const segs=owlmSegs(F),em=owlmEmitters(P,F),A=[new Float32Array(N),new Float32Array(N),new Float32Array(N),new Float32Array(N)],Dr=new Float32Array(N),L=new Float32Array(N),Fi=new Float32Array(N),AO=new Float32Array(N).fill(1);
  const PF=OWLM.prof,mk=PF?(k)=>{const t=performance.now();PF[k]=(PF[k]||0)+t-PF.t;PF.t=t;}:()=>{};if(PF)PF.t=performance.now();
  /* daylight from the windows and the front door */
  const D0=OWLM.D0;
  const noSeg=segs.length===0;
  for(const e of em){const hw=e.w/2,pts=[-.4,.4].map(s=>[e.x+e.ax*hw*s*2+e.nx*.02,e.z+e.az*hw*s*2+e.nz*.02]);
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(!inside[c])continue;const x=cx[i],z=cz[j],dx=e.x-x,dz=e.z-z,d2=dx*dx+dz*dz;if(d2>144)continue;const d=Math.max(.15,Math.sqrt(d2)),cosw=(-dx*e.nx-dz*e.nz)/d;if(cosw<=.02)continue;
      let vis=1;if(!noSeg){vis=0;for(const p of pts)if(!owlmSegHit(segs,x,z,p[0],p[1]))vis+=.5;if(vis<=0)continue;}
      const v=e.S*(.35+.65*cosw)*vis/(1+(d/D0)*(d/D0));if(e.f<0)Dr[c]+=v;else A[e.f][c]+=v;}}
  mk('windows');for(const arr of[A[0],A[1],A[2],A[3],Dr])for(let c=0;c<N;c++)arr[c]=1-Math.exp(-OWLM.gain*arr[c]);mk('sat');
  /* the fires and the lamps: the pieces of the plan that give light (interior/light.js), and a lamp or two in every room of a house somebody lives in */
  /* the pieces on the floor: their footprints and how high they stand (a tall piece stops the light of a fire behind it, a table does not stop the light of a fire that stands lower than its top, a chair stops nothing that matters) */
  const boxes=[];for(const it of F.items){if(it.deco)continue;const sp=OWI_ITEM[it.kind];if(!sp)continue;const fp=owiFoot(it.x,it.z,it.rot,sp);boxes.push([fp.x0,fp.x1,fp.z0,fp.z1,sp.tall?.55:sp.small?.12:sp.low?.22:.38,sp.tall?1.8:sp.small?.5:sp.low?.45:.9]);}
  const boxHit=(sx,sz,sh,x,z)=>{for(const q of boxes){if(q[5]<=sh)continue;if(sx>q[0]-.25&&sx<q[1]+.25&&sz>q[2]-.25&&sz<q[3]+.25)continue;/* the source stands against it: it is its own */
      const dx=x-sx,dz=z-sz;let t0=0,t1=1;for(const[p,d,lo,hi]of[[sx,dx,q[0],q[1]],[sz,dz,q[2],q[3]]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi){t0=2;break;}}else{let a=(lo-p)/d,c=(hi-p)/d;if(a>c){const w=a;a=c;c=w;}t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)break;}}
      if(t0<=t1&&t0<1&&t1>0)return true;}return false;};
  const src=owlmSources(b,F).concat(ext||[]);
  for(const s of src){const arr=s.fire?Fi:L,i0=Math.max(0,Math.floor((s.x-s.r-x0)/cs)),i1=Math.min(nx-1,Math.ceil((s.x+s.r-x0)/cs)),j0=Math.max(0,Math.floor((s.z-s.r-z0)/cs)),j1=Math.min(nz-1,Math.ceil((s.z+s.r-z0)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=j*nx+i;if(!inside[c])continue;const dx=cx[i]-s.x,dz=cz[j]-s.z,d=Math.hypot(dx,dz);if(d>=s.r)continue;
      if(!noSeg&&owlmSegHit(segs,s.x,s.z,cx[i],cz[j]))continue;if(boxes.length&&boxHit(s.x,s.z,s.h==null?1:s.h,cx[i],cz[j]))continue;const fall=1-Math.min(1,Math.max(0,(d-.55*s.r)/(.45*s.r)));arr[c]+=s.i*fall/(1+(d/(.42*s.r))*(d/(.42*s.r)));}}
  mk('sources');
  /* the light bends through doorways: a few steps of spreading between cells that no wall separates, so a lit room lights the next one a little and a window lights the hall behind it */
  const conn=new Uint8Array(N);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(!inside[c])continue;let m=0;
    if(i+1<nx&&inside[c+1]&&!owlmSegHit(segs,cx[i],cz[j],cx[i+1],cz[j]))m|=1;if(j+1<nz&&inside[c+nx]&&!owlmSegHit(segs,cx[i],cz[j],cx[i],cz[j+1]))m|=2;conn[c]=m;}
  const buf1=new Float32Array(N),buf2=new Float32Array(N);
  const spread=(arr,it,dec,keep)=>{let a=buf1,o=buf2;a.set(arr);for(let k=0;k<it;k++){o.set(a);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i,m=conn[c];if(m&1){const v=Math.max(o[c],a[c+1]*dec);o[c]=v;const w2=Math.max(o[c+1],a[c]*dec);o[c+1]=w2;}if(m&2){const v=Math.max(o[c],a[c+nx]*dec);o[c]=v;const w2=Math.max(o[c+nx],a[c]*dec);o[c+nx]=w2;}}const t=a;a=o;o=t;}
    for(let c=0;c<N;c++)arr[c]=Math.max(arr[c],a[c]*keep);};
  /* the daylight spills as one value (the brightest face at each cell), and what it adds beyond the direct light goes to all four faces */
  mk('conn');{const M=new Float32Array(N);for(let c=0;c<N;c++)M[c]=Math.max(A[0][c],A[1][c],A[2][c],A[3][c]);const M0=new Float32Array(M);spread(M,4,.8,OWLM.keep);for(let c=0;c<N;c++){const add=M[c]>M0[c]?M[c]:0;if(add>0)for(let f=0;f<4;f++)A[f][c]=Math.max(A[f][c],add);}}
  spread(Dr,4,.8,.5);spread(L,4,.8,.4);spread(Fi,4,.8,.4);mk('spread');
  for(let c=0;c<N;c++){L[c]=Math.min(1,L[c]);Fi[c]=Math.min(1,Fi[c]);}
  /* ambient occlusion: walls, furniture. The distance of a cell centre from the nearest wall (outer walls and partitions) and from the pieces on the floor. */
  const wallD=(x,z)=>{let m=Math.min(x-Q.xa,Q.xb-x,z-Q.za,Q.zb-z);for(let i=0;i<segs.length;i+=4){const ax=segs[i],az=segs[i+1],bx=segs[i+2],bz=segs[i+3],ex=bx-ax,ez=bz-az,l2=ex*ex+ez*ez||1,t=Math.max(0,Math.min(1,((x-ax)*ex+(z-az)*ez)/l2));m=Math.min(m,Math.hypot(x-ax-ex*t,z-az-ez*t));}return m;};
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(!inside[c])continue;const x=cx[i],z=cz[j];let o=.58*Math.exp(-Math.max(0,wallD(x,z))/.34);
    for(const q of boxes){const dx=x<q[0]?q[0]-x:x>q[1]?x-q[1]:0,dz=z<q[2]?q[2]-z:z>q[3]?z-q[3]:0,d=Math.hypot(dx,dz);if(d<.7)o+=q[4]*Math.exp(-d/.3);}
    AO[c]=Math.max(0,1-o);}
  mk('ao');
  /* the cells of the wall's thickness take the values of the room next to them; the outermost ring and what is farther out says "outside" (G = 0) */
  const fill=new Uint8Array(inside);for(let pass=0;pass<2;pass++){const nf=new Uint8Array(fill);for(let j=1;j<nz-1;j++)for(let i=1;i<nx-1;i++){const c=j*nx+i;if(fill[c])continue;let best=-1;for(const o of[c-1,c+1,c-nx,c+nx])if(fill[o]){best=o;break;}
      if(best>=0){nf[c]=1;for(const arr of[A[0],A[1],A[2],A[3],Dr,L,Fi,AO])arr[c]=arr[best];}}fill.set(nf);}
  mk('fill');return{A,Dr,L,Fi,AO,fill};}
/* a whole house: the floors side by side in two textures */
function owlmBake(b){const P=b.ic.P,t0=performance.now(),cs=OWLM.cs,nF=P.floors.length;let nx=0,nz=0;const dims=[];
  for(const F of P.floors){const Q=F.Q,x0=Q.xa-cs*1.5,z0=Q.za-cs*1.5,w=Math.ceil((Q.xb-Q.xa)/cs)+3,h=Math.ceil((Q.zb-Q.za)/cs)+3;dims.push({x0,z0,w,h});nx=Math.max(nx,w);nz=Math.max(nz,h);}
  const X0=Math.min(...dims.map(d=>d.x0)),Z0=Math.min(...dims.map(d=>d.z0));/* one frame for all floors: the cell (0,0) of every floor sits at (X0, Z0), floors are laid side by side */
  const gx=nx+Math.ceil((Math.max(...dims.map(d=>d.x0+d.w*cs))-X0-nx*cs)/cs)+0,W1=Math.ceil((Math.max(...dims.map(d=>d.x0+d.w*cs))-X0)/cs)+1,H1=Math.ceil((Math.max(...dims.map(d=>d.z0+d.h*cs))-Z0)/cs)+1,TW=nF*(W1+1),TH=H1;
  const a=new Uint8Array(TW*TH*4),bb=new Uint8Array(TW*TH*4);
  const srcs=P.floors.map(F=>owlmSources(b,F)),segsF=P.floors.map(F=>owlmSegs(F));
  P.floors.forEach((F,fi)=>{const Q=F.Q,ox=Math.round((Q.xa-cs*1.5-X0)/cs),oz=Math.round((Q.za-cs*1.5-Z0)/cs),d=dims[fi],r=owlmBakeFloor(b,P,F,cs,d.w,d.h,X0+ox*cs,Z0+oz*cs,nF>1?owlmThrough(P,fi,srcs,segsF):null),base=fi*(W1+1);
    for(let j=0;j<d.h;j++)for(let i=0;i<d.w;i++){const c=j*d.w+i,o=((oz+j)*TW+base+ox+i)*4;if(oz+j>=TH||ox+i>=W1)continue;
      for(let k=0;k<4;k++)a[o+k]=Math.round(255*Math.min(1,r.A[k][c]));
      bb[o]=Math.round(255*r.L[c]);bb[o+1]=r.fill[c]?Math.round(255*(.1+.9*r.AO[c])):0;bb[o+2]=Math.round(255*r.Dr[c]);bb[o+3]=Math.round(255*r.Fi[c]);}});
  const mk=(arr)=>{const t=new THREE.DataTexture(arr,TW,TH,THREE.RGBAFormat);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearFilter;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.flipY=false;t.generateMipmaps=false;t.needsUpdate=true;return t;};
  const ta=mk(a),tb=mk(bb);OWLM.stats.bakes++;OWLM.stats.ms+=performance.now()-t0;OWLM.stats.cells+=TW*TH;
  return{ta,tb,X0,Z0,W1,TW,TH,cs,nF,ms:performance.now()-t0};}
function owlmAttach(b){const ic=b.ic;if(!ic||!ic.lmu||ic.lm||!OWLM.on)return;const P=ic.P;if(P.kind==='tunnel'||P.kind==='solid')return;
  const lm=owlmBake(b),u=ic.lmu;ic.lm=lm;u.uLA.value=lm.ta;u.uLB.value=lm.tb;u.uLMd.value.set(lm.X0,lm.Z0,1/lm.cs,lm.nF);u.uLMa.value.set(lm.TW,lm.TH,lm.W1+1,0);
  const fy=P.floors.map(F=>F.y);u.uFy.value.set(fy[0]||0,fy[1]!=null?fy[1]:1e5,fy[2]!=null?fy[2]:1e5,fy[3]!=null?fy[3]:1e5);ic.lmBlend=0;{let xa=1e9,xb=-1e9,za=1e9,zb=-1e9;for(const s of P.st){xa=Math.min(xa,s.Q.xa);xb=Math.max(xb,s.Q.xb);za=Math.min(za,s.Q.za);zb=Math.max(zb,s.Q.zb);}const Qs=[u.uQ,u.uQ1,u.uQ2,u.uQ3];for(let i=0;i<4;i++){const F=P.floors[Math.min(i,P.floors.length-1)],q=F&&F.Q;if(q)Qs[i].value.set(q.xa,q.xb,q.za,q.zb);else Qs[i].value.set(xa,xb,za,zb);}}/* (the rooms of each floor: the walls' faces that look into them; one rectangle round every floor let the storey under a jetty take the fire's light on its outside) */owlmWalls(b,true);u.uK2.value.x=0;owlmUpdate(b);}
function owlmFree(b){const ic=b.ic;if(!ic||!ic.lm)return;ic.lm.ta.dispose();ic.lm.tb.dispose();ic.lm=null;if(ic.lmu){ic.lmu.uLA.value=OWLM.defA;ic.lmu.uLB.value=OWLM.defB;ic.lmu.uK2.value.x=0;}owlmWalls(b,false);}
/* per frame: the weight of every face from the sky and the sun, the night, the fires, the door */
const _owlmN=[[0,1],[0,-1],[-1,0],[1,0]];
/* the top of the walls of a house, in the walls' frame (metres): the light grid stops there (a roof is out of doors) */
const owlmTop=b=>{const A=b.arch;return A&&A.roof&&A.roof.baseY!=null?A.roof.baseY*(b.BSc||1)-.02:1e5;};
function owlmUpdate(b,dt){const ic=b.ic;if(!ic||!ic.lm)return;const u=ic.lmu,rot=b.rot,sn=Math.sin(rot),cs=Math.cos(rot),dir=DAYC.dir,da=typeof darkAmt==='number'?darkAmt:0;
  const sky=(DAYC.k*.8+.07)*(1-.85*da),sun=DAYC.sm*(1-.9*da)*.7,fw=u.uFaceW.value;
  /* outward normals of the four faces in the world: front +z, back -z, left -x, right +x (the local x axis points to (cos, -sin), the local z axis to (sin, cos)) */
  const nrm=[[sn,cs],[-sn,-cs],[-cs,sn],[cs,-sn]],w=[0,0,0,0];
  for(let k=0;k<4;k++){const f=Math.max(0,nrm[k][0]*dir.x+nrm[k][1]*dir.z);w[k]=Math.min(1.4,sky+sun*f);}
  fw.set(w[0],w[1],w[2],w[3]);
  const open=b.dr?b.dr.a:0;u.uK.value.set(OWLT.n,OWLM.flick,open*w[0],OWLM.ambMin);
  if(ic.lmBlend<1){ic.lmBlend=Math.min(1,ic.lmBlend+(dt||1/30)*2.2);}u.uK2.value.set(ic.lmBlend,OWLM.ambMax,owlmTop(b),OWHS.b===b?1:0);/* w: the hero's shadow is cast in this house (light.js) */}
function owlmTick(dt){OWLM.flick=1+.07*Math.sin(OWIL.ph*9)+.04*Math.sin(OWIL.ph*23+1);
  /* a house whose interior has just been built is baked at once (a few ms); the ones whose light is not needed any more are freed with their interior (owiFreeMesh) */
  let n=0;const t0=performance.now();for(const b of OWI.reg){if(b.ic&&b.ic.grp){if(!b.ic.lm&&b.ic.lmu&&b.ic.lmWant!==false&&(n<1||performance.now()-t0<3)){owlmAttach(b);n++;}owlmUpdate(b,dt);}}}
function owlmReset(){for(const b of OWI.reg)if(b.ic&&b.ic.lm)owlmFree(b);}

/* The shaders of the light grid (a wall with it, the interior with no, one and two clipping planes) are compiled while the world is brought up, with the light of the interiors in the scene and without it (interior/light.js draws the first two frames
   of a world that way): four tiny triangles far under the world, kept (hidden) so that the programs stay. Otherwise the first house the hero comes near would stop the game for the length of a compile. */
function owlmPrime(k){
  if(!OWLM.dummy){owlmDefaults();const V=THREE.Vector4,u={uLA:{value:OWLM.defA},uLB:{value:OWLM.defB},uLMd:{value:new V(0,0,5,1)},uLMa:{value:new V(1,1,1,0)},uFy:{value:new V(0,1e5,1e5,1e5)},uFaceW:{value:new V(1,1,1,1)},uK:{value:new V(0,0,0,OWLM.ambMin)},uK2:{value:new V(0,OWLM.ambMax,0,0)},uSc:{value:1},uScE:{value:1},uQ:{value:new V()},uQ1:{value:new V()},uQ2:{value:new V()},uQ3:{value:new V()}};/* (every uniform the shader has: one missing made three.js throw as the world started) */
    const geo=new THREE.BufferGeometry(),pos=new Float32Array([0,0,0,.01,0,0,0,.01,0]),nor=new Float32Array([0,0,1,0,0,1,0,0,1]),col=new Float32Array([1,1,1,1,1,1,1,1,1]);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('aE',new THREE.BufferAttribute(new Float32Array(3),1));
    const pl=()=>new THREE.Plane(new THREE.Vector3(0,1,0),1e5),g=new THREE.Group();
    const mk=(n,intr,key,dbl)=>{const m=VCMAT.clone();if(dbl)m.side=THREE.DoubleSide;m.clippingPlanes=Array.from({length:n},pl);m.defines={USE_LM:''};m.onBeforeCompile=sh=>owlmPatch(sh,u,intr);m.customProgramCacheKey=()=>key;const o=new THREE.Mesh(geo,m);o.frustumCulled=false;o.position.set(0,-900,0);g.add(o);return o;};
    mk(2,false,'owlmx',false);mk(0,true,'owiints',true);mk(1,true,'owiint',true);mk(2,true,'owiintp',true);
    g.name='owlmPrime';OWLM.dummy=g;scene.add(g);}
  OWLM.dummy.visible=k<4;}

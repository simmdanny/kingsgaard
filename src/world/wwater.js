/* =====================================================================================================
   THE RIVERS' WATER (src/world/wwater.js, river look 5 - tools/mockups/river/HANDOFF.md 3.8): the mockup's water, its own code (WRL: makeNTEX,
   waterUniforms, waterMaterial, waterRibbon, makeFloat, updFloat, fleckMaterial - wrlook.js), on the ribbons wriver.js lays along every stream.
   - The depth (the shader colours by the water's thickness along the view ray): one depth-only pre-pass a frame, before the game's render, of what can
     lie under or behind a river's water - the ground's chunks, the river ground in detail, the bank stones, pebbles and boulders (the camera on its
     own layer 9 for it; each drawn with a depth material that moves its vertices as its own material does: the ground's push at the cliffs and its
     lattice lowered under the detail) - not the water, grass, ivy, drifting bits or anything else; no shadows in it. Only when a ribbon is shown.
     Its size the drawing buffer's (uRes), as the shader reads gl_FragCoord.
   - The ribbons' material: the mockup's shader, its uniforms shared (the texture, the depth, the size, the time, the sun the game's, the air the
     game's) but for the rocks in the water (uRk: the 8 nearest the camera, per ribbon mesh); its vertices go through the game's far-sight depth
     (wdepth.js) as every other material's do.
   - Drifting leaves and foam flecks (the mockup's makeFloat / updFloat) on the stream pieces near the camera (WRS.RF), only where the water is the
     river look's, their positions from the time.
   DEVIATIONS D22-D25.
   ===================================================================================================== */
const WW={tFix:null,U:null,drt:null,v2:null,dG:{},dB:null,RF:90,lm:null,fm:null,fl:null,ff:null,stats:{depth:0,depthMs:0,leaves:0,flecks:0}};
function wwShared(){if(WW.U)return WW.U;const drt=new THREE.WebGLRenderTarget(4,4);drt.depthTexture=new THREE.DepthTexture(4,4);drt.depthTexture.type=THREE.UnsignedIntType;drt.texture.generateMipmaps=false;
  WW.drt=drt;WW.v2=new THREE.Vector2();const U=WRL.waterUniforms(new THREE.Vector3(0,1,0),WRL.makeNTEX(),drt.depthTexture);U.uSun=WCM.sun;return WW.U=U;}
/* a ribbon mesh's material: the shared uniforms, its own rocks */
function wwMaterial(){const U=wwShared(),u=Object.assign({},U,{uRk:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,0,0))}}),m=WRL.waterMaterial(u),R0=WD.R0.toFixed(1),SP=WD.SPAN.toFixed(1),SC=WD.SCALE.toFixed(1);
  wrxOwn(m,'water');/* (the game's light: wrlight.js) */
  m.vertexShader=m.vertexShader.replace('gl_Position=projectionMatrix*viewMatrix*w;',
    'vec4 wdMv=viewMatrix*w;if(projectionMatrix[2][3]<-0.5){float wdL=length(wdMv.xyz);if(wdL>'+R0+'){float wdN='+R0+'+'+SP+'*(1.0-exp(-(wdL-'+R0+')/'+SC+'));wdMv.xyz*=wdN/wdL;}}gl_Position=projectionMatrix*wdMv;');
  return m;}
/* the depth pass's materials: the ground's (its push at the cliffs, WT_INSET, and the lattice lowered under the detail, WT_RD - as wterrain.js moves them)
   and a plain one */
function wwGD(rd){const k=rd?'r':'k';if(WW.dG[k])return WW.dG[k];const m=new THREE.MeshBasicMaterial({colorWrite:false});if(rd)m.defines={WT_RD:1};
  m.onBeforeCompile=sh=>{sh.uniforms.uClf=WT.clf;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aA;attribute vec2 aPu;uniform vec3 uClf;\n#ifdef WT_RD\nattribute float aRd;\n#endif\n')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef WT_RD\ntransformed.y-=aRd*0.6;\n#endif\n{vec3 wp0=(modelMatrix*vec4(transformed,1.0)).xyz;'+
        'float k=(1.0-smoothstep(0.25,0.35,aA.x))*(1.0-smoothstep(0.40,0.50,aA.z))*uClf.x*(1.0-smoothstep(uClf.y*0.85,uClf.y,length(wp0.xz-cameraPosition.xz)));transformed.xz+=aPu*k*uClf.z;}');};
  m.customProgramCacheKey=()=>'wwdepth'+k;return WW.dG[k]=m;}
function wwDepthMat(o){const m=o.material;if(m===WT.gmatRd)return wwGD(true);if(m===WT.gmat||(typeof WRD!=='undefined'&&m===WRD.mat))return wwGD(false);return WW.dB||(WW.dB=new THREE.MeshBasicMaterial({colorWrite:false}));}
/* the depth pre-pass (called just before the game renders the frame) */
function wwDepth(){if(!WW.U||typeof WRV==='undefined'||!WRV.on)return;let any=false;for(const c of WRV.cells.values())if(c.wmesh&&c.wmesh.parent){any=true;break;}if(!any)return;
  const T0=performance.now(),r=renderer,U=WW.U,sz=r.getDrawingBufferSize(WW.v2);if(WW.drt.width!==sz.x||WW.drt.height!==sz.y)WW.drt.setSize(sz.x,sz.y);
  U.uRes.value.copy(sz);U.uNear.value=camera.near;U.uFar.value=camera.far;U.uTime.value=WW.tFix!=null?WW.tFix:(performance.now()/1000)%3600;/* (WW.tFix: a time held, for the flow frames' screenshots) */
  const F=scene.fog;if(F){U.uFogC.value.copy(F.color);if(F.far<0)U.uFog.value.set(F.near*WD.S,F.near);else U.uFog.value.set(F.near,F.far);}else U.uFog.value.set(1e8,2e8);
  const L=[],add=o=>{if(!o||!o.parent)return;o.layers.enable(9);L.push(o);};
  for(const ch of WT.chunks.values())if(ch.on)add(ch.mesh);if(typeof WRD!=='undefined')for(const e of WRD.tiles.values())add(e.mesh);
  if(typeof WRS!=='undefined')for(const[k,m]of WRS.meshes)if(k[0]==='b'||k[0]==='p')add(m);if(WBLD.meshes)for(const sl of WBLD.meshes)for(const k in sl)add(sl[k]);
  const mats=L.map(o=>o.material);for(const o of L)o.material=wwDepthMat(o);
  const au=r.shadowMap.autoUpdate,lm=camera.layers.mask,bg=scene.background;r.shadowMap.autoUpdate=false;scene.background=null;camera.layers.set(9);
  r.setRenderTarget(WW.drt);r.clear();r.render(scene,camera);r.setRenderTarget(null);
  camera.layers.mask=lm;scene.background=bg;r.shadowMap.autoUpdate=au;L.forEach((o,i)=>{o.material=mats[i];});WW.stats.depth++;WW.stats.depthMs+=performance.now()-T0;}
/* per frame: each near ribbon mesh's rocks (the 8 nearest the camera of the stream pieces' rocks in the water over it), the drifting bits */
/* the game's light level for the materials with a light of their own (WRX.L, wrlight.js): the sky light and the sun as the ground takes them (the sun at
   three quarters: about its angle at noon), against the game's noon (0xe8f2ff x 0.58, 0xfff4e4 x 0.8) */
const _wwLum=c=>.2126*c.r+.7152*c.g+.0722*c.b,WW_NOON=.58*_wwLum(new THREE.Color(0xe8f2ff))+.75*.8*_wwLum(new THREE.Color(0xfff4e4));
function wwLight(){WRX.L.value=Math.max(.04,Math.min(1.25,(hemi.intensity*_wwLum(hemi.color)+.75*sun.intensity*_wwLum(sun.color))/WW_NOON));}
function wwUpdate(f){if(typeof WRX!=='undefined')wwLight();if(!WW.U||typeof WRV==='undefined'||!OW.group)return;const c=camera.position;
  if(typeof WRS!=='undefined'){const rocks=[];for(const e of WRS.segs.values())if(e.rocks)for(const k of e.rocks)rocks.push(k);
    for(const cl of WRV.cells.values()){if(!cl.wmesh)continue;const u=cl.wmesh.material.uniforms.uRk.value,b=cl.bb,L=[];
      for(const k of rocks)if(k[0]>b[0]-10&&k[0]<b[2]+10&&k[1]>b[1]-10&&k[1]<b[3]+10)L.push(k);L.sort((p,q)=>Math.hypot(p[0]-c.x,p[1]-c.z)-Math.hypot(q[0]-c.x,q[1]-c.z));
      for(let i=0;i<8;i++){const k=L[i];if(k)u[i].set(k[0],k[1],k[2],0);else u[i].set(0,0,0,0);}}}
  wwFloat(f);}
/* the drifting leaves and foam flecks of the stream pieces within WW.RF (the mockup's: 34 per 115 m, 12 of them leaves; at the river's speed, slipping
   round the rocks), only where the water is the river look's (the piece's metres whose middle is this stream's: e.valid) */
function wwFloat(f){if(typeof WRS==='undefined')return;const t=WW.U.uTime.value,ML=[],MF=[],CL=[];
  const colL={setMatrixAt:(i,M)=>ML.push(M.elements.slice()),instanceMatrix:{}},colF={setMatrixAt:(i,M)=>MF.push(M.elements.slice()),instanceMatrix:{}};
  for(const e of WRS.segs.values()){if(!e.valid||!e.RIV||wrsDist(e,f)>WW.RF)continue;const len=e.RIV.length;
    if(!e.float){const NF=Math.max(1,Math.round(34*len/115)),NL=Math.min(NF,Math.round(12*len/115));e.float=WRL.makeFloat({RIV:e.RIV,NF,NL,r:WRL.mkRng(wnHashI(e.p.i,e.p.j,WG.seed+767)%233280)});e.rockO=(e.rocks||[]).map(k=>({x:k[0],z:k[1],rw:k[2]}));}
    const l0=ML.length,f0=MF.length;
    WRL.updFloat(t,{FLOAT:e.float,RIV:e.RIV,rivHalf:(z,u)=>wrbHalf(wrsLerp(e.hwA,u),e.s0+u),waterRocks:e.rockO,WLat:u=>wrsLerp(e.wlA,u),leaves:colL,flecks:colF});
    const lv=e.float.filter(q=>q.leaf),ok=M=>{wrbNear(e.s,M[12],M[14],_wrsO);const u=_wrsO.rn[1],c=wrbCum(e.s),k=Math.min(e.s.n-1,Math.floor(u)),m=Math.round(c[k]+(c[k+1]-c[k])*(u-k));return e.valid[Math.max(0,Math.min(len-1,m))];};
    for(let i=ML.length-1;i>=l0;i--)if(!ok(ML[i])){ML.splice(i,1);lv.splice(i-l0,1);}for(const q of lv)CL.push(.55+.45*q.c);
    for(let i=MF.length-1;i>=f0;i--)if(!ok(MF[i]))MF.splice(i,1);}
  const fit=(m,n,G,mat)=>{if(m&&m.instanceMatrix.count>=n)return m;if(m)OW.group.remove(m);m=new THREE.InstancedMesh(G,mat,Math.max(16,n*2));m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count*3).fill(1),3);
    m.frustumCulled=false;m.renderOrder=6;m.userData.keep=1;OW.group.add(m);return m;};
  if(WW.lm&&WW.lm.parent!==OW.group){WW.lm=null;WW.fm=null;}
  WW.lm=fit(WW.lm,ML.length,WW.lg||(WW.lg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),wrsIvyMat());WW.fm=fit(WW.fm,MF.length,WW.fg||(WW.fg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),WW.fmat||(WW.fmat=wrxOwn(wrsShaderMat(WRL.fleckMaterial(),true),'fleck'))/* (no sun: its uniforms are three.js's fog's own object) */);
  ML.forEach((M,i)=>{WW.lm.instanceMatrix.array.set(M,i*16);WW.lm.instanceColor.setXYZ(i,0,CL[i],0);});WW.lm.count=ML.length;WW.lm.instanceMatrix.needsUpdate=true;WW.lm.instanceColor.needsUpdate=true;
  MF.forEach((M,i)=>{WW.fm.instanceMatrix.array.set(M,i*16);});WW.fm.count=MF.length;WW.fm.instanceMatrix.needsUpdate=true;
  WW.stats.leaves=ML.length;WW.stats.flecks=MF.length;}

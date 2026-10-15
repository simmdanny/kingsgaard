/* VERBATIM from tools/mockups/river/surface-study.html, lines 689-792. Water: ripple/foam texture (NTEX), one depth-only pre-pass, the water shader (depth colour, flow, foam, rock foam, fresnel, glints), the ribbon mesh with flow + speed attributes, rock uniforms, drifting leaves/flecks, renderFrame.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* ===================== the water: a ribbon along the stream at the water level; a stylized shader =====================
   - depth from one depth-only pre-pass of the opaque scene (flat material, no grass cards): water thickness along the view ray
   - colour by depth: light turquoise at the edges and in shallows, deep teal in the middle; see-through where shallow
   - two scrolling ripple maps (baked once, procedural), soft fresnel to a sky colour, painted light streaks, small sun glints
   - foam wherever the water meets something (shore, bank stones, rocks): depth difference + noise, clumpy, a broken second line that breathes */
const NTEX=(()=>{const N=256,d=new Uint8Array(N*N*4),hgt=new Float32Array(N*N),hz=(i,j)=>hgt[((j+N)%N)*N+((i+N)%N)];
  const W=[[3,1,.0,1],[1,4,1.3,.8],[5,-2,2.1,.5],[-4,3,.7,.45],[7,5,4.1,.25],[-9,6,1.1,.2],[11,-8,2.9,.12],[2,13,.4,.1]];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let h=0;const u=i/N*6.2832,v=j/N*6.2832;for(const[a,b,ph,am]of W)h+=am*Math.sin(a*u+b*v+ph+.6*Math.sin(b*u-a*v+ph*2));hgt[j*N+i]=h;}
  const fz=new Float32Array(N*N);{const G=16,g=[];for(let k=0;k<G*G;k++)g.push(Math.random());const r=mkRng(91);for(let k=0;k<G*G;k++)g[k]=r();
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){let s=0,a=.5,f=1;for(let o=0;o<4;o++){const x=i/N*G*f,y=j/N*G*f,xi=Math.floor(x),yi=Math.floor(y),u=x-xi,v=y-yi,Gf=G*f,
      at=(p,q)=>{const P=((p%Gf)+Gf)%Gf,Q=((q%Gf)+Gf)%Gf;return h2(P*31+o*7,Q*17+o*3);},uu=u*u*(3-2*u),vv=v*v*(3-2*v);
      s+=a*((at(xi,yi)*(1-uu)+at(xi+1,yi)*uu)*(1-vv)+(at(xi,yi+1)*(1-uu)+at(xi+1,yi+1)*uu)*vv);a*=.5;f*=2;}fz[j*N+i]=s/.9375;}}
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const dx=(hz(i+1,j)-hz(i-1,j))*.5,dy=(hz(i,j+1)-hz(i,j-1))*.5,k=(j*N+i)*4;
    d[k]=Math.max(0,Math.min(255,128+dx*95));d[k+1]=Math.max(0,Math.min(255,128+dy*95));d[k+2]=Math.round(fz[j*N+i]*255);d[k+3]=Math.max(0,Math.min(255,128+hgt[j*N+i]*50));}
  const t=new THREE.DataTexture(d,N,N,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;})();
const DRT=new THREE.WebGLRenderTarget(4,4);DRT.depthTexture=new THREE.DepthTexture(4,4);DRT.depthTexture.type=THREE.UnsignedIntType;DRT.texture.generateMipmaps=false;
const depthOnly=new THREE.MeshBasicMaterial({colorWrite:false});
const WU={uRk:{value:Array.from({length:8},()=>new THREE.Vector4(0,0,0,0))},tDepth:{value:DRT.depthTexture},tN:{value:NTEX},uRes:{value:new THREE.Vector2(1,1)},uNear:{value:.1},uFar:{value:500},uTime:{value:0},
  uSun:{value:SUN.clone()},uSky:{value:new THREE.Color(0xbfe3f2)},uFogC:{value:new THREE.Color(0xbcdaef)},uFog:{value:new THREE.Vector2(80,200)}};
const waterMat=new THREE.ShaderMaterial({uniforms:WU,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`varying vec3 vWP;varying vec2 vFlow;varying float vSpd;attribute vec2 aFlow;attribute float aSpd;void main(){vFlow=aFlow;vSpd=aSpd;vec4 w=modelMatrix*vec4(position,1.0);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`#include <packing>
  uniform sampler2D tDepth;uniform sampler2D tN;uniform vec4 uRk[8];varying float vSpd;uniform vec2 uRes;uniform float uNear;uniform float uFar;uniform float uTime;uniform vec3 uSun;uniform vec3 uSky;uniform vec3 uFogC;uniform vec2 uFog;
  varying vec3 vWP;varying vec2 vFlow;
  void main(){
    vec2 suv=gl_FragCoord.xy/uRes;float sz=-perspectiveDepthToViewZ(texture2D(tDepth,suv).x,uNear,uFar),mz=-perspectiveDepthToViewZ(gl_FragCoord.z,uNear,uFar);
    vec3 V=normalize(cameraPosition-vWP);float thick=max(sz-mz,0.0),dv=thick*max(abs(V.y),0.22);/* about the vertical depth of water here */
    float t=uTime;vec2 X=vWP.xz;vec2 fl=normalize(vFlow+1e-4);
    /* the flow: textures pushed downstream along the river (two phases, cross-faded, so they never stretch); speed from the river's width */
    float sp=vSpd;vec2 pr=vec2(-fl.y,fl.x);float ph0=fract(t*0.12),ph1=fract(t*0.12+0.5),kf=abs(2.0*ph0-1.0);
    vec4 a=mix(texture2D(tN,X*0.085-fl*sp*ph0*0.55),texture2D(tN,X*0.085-fl*sp*ph1*0.55+vec2(0.37,0.11)),kf);
    vec4 b=mix(texture2D(tN,X*0.21-fl*sp*ph0*1.1+pr*0.05*ph0),texture2D(tN,X*0.21-fl*sp*ph1*1.1+vec2(0.53,0.29)),kf);
    vec2 sl=(a.xy-0.5)*0.9+(b.xy-0.5)*0.6;vec3 N=normalize(vec3(-sl.x,1.0,-sl.y));
    /* colour by depth, see-through where shallow */
    float dvc=mix(dv,thick,0.55);/* (colour from the path through the water: a stone's side seen through water reads deep, not milky) */float dd=smoothstep(0.0,1.3,dvc);vec3 shallow=vec3(0.58,0.94,0.84),mid=vec3(0.22,0.80,0.78),deep=vec3(0.07,0.56,0.62);
    vec3 col=dd<0.5?mix(shallow,mid,dd*2.0):mix(mid,deep,dd*2.0-1.0);
    float alpha=mix(0.22,0.88,smoothstep(0.0,1.2,dvc));
    /* light: soft sun and sky; fresnel to the sky at grazing angles */
    float ndl=clamp(dot(N,normalize(uSun)),0.0,1.0);col*=0.82+0.30*ndl;
    float fr=pow(1.0-clamp(dot(N,V),0.0,1.0),4.0);col=mix(col,mix(uSky,vec3(0.75,0.95,0.92),0.4),fr*0.5);alpha=max(alpha,fr*0.8);
    /* painted streaks: thin light lines riding the ripples */
    float st=abs(b.w-0.5);float sa=fwidth(b.w)+0.004;float streak=(1.0-smoothstep(0.012,0.012+sa,st))*smoothstep(0.35,0.7,a.z);col=mix(col,vec3(0.86,0.98,0.96),streak*0.45);
    /* sun glints: little hard sparkles */
    vec3 Rf=reflect(-normalize(uSun),N);float gl=pow(clamp(dot(Rf,V),0.0,1.0),180.0);col+=vec3(1.0,0.98,0.9)*smoothstep(0.35,0.55,gl)*0.9;
    /* foam: clumpy where the water is thin (shore, stones, rocks), and a broken second line that breathes */
    float fn=mix(texture2D(tN,X*0.55-fl*sp*ph0*0.9).z,texture2D(tN,X*0.55-fl*sp*ph1*0.9+vec2(0.21,0.4)).z,kf),fn2=mix(texture2D(tN,X*1.3-fl*sp*ph0*1.6).z,texture2D(tN,X*1.3-fl*sp*ph1*1.6+vec2(0.6,0.15)).z,kf);
    float fe=1.0-dv/0.09;float fa=fwidth(fe)+0.03;float th=0.25+0.5*smoothstep(0.35,0.75,fn)+0.2*(fn2-0.5);float foam=smoothstep(th-fa,th+fa,fe)*step(0.36,fn2)*smoothstep(0.38,0.46,texture2D(tN,X*0.22+fl*t*0.01).z);/* clumps along the shore, with gaps *//* thin, with gaps */
    float bub=step(0.66,fn2)*(1.0-smoothstep(0.0,0.22,dv))*step(0.58,texture2D(tN,X*2.6+t*0.04).z);foam=max(foam,bub*0.8);/* loose bubbles drifting off the clumps */
    float lineD=0.42+0.07*sin(t*1.4+fn*5.0);float ln=abs(dv-lineD);float la=fwidth(dv)+0.006;float line=(1.0-smoothstep(0.015,0.015+la,ln))*step(0.55,fn2)*step(0.4,fn);
    float edge=1.0-smoothstep(0.0,0.14,dv);col=mix(col,shallow*1.05,edge*0.3);alpha=max(alpha,edge*0.45);/* thin water at the edges reads milky, not see-through to the stones' dark feet */
    /* rocks in the stream: foam piles up on the upstream side, thins on the sides, trails downstream in short streaks */
    float upK=1.0,trail=0.0;
    for(int i=0;i<8;i++){vec4 rk=uRk[i];if(rk.z<=0.0)continue;vec2 d=X-rk.xy;float dl=length(d);if(dl>rk.z*5.0)continue;
      vec2 fr=vec2(dot(d,fl),dot(d,pr))/rk.z;float near=1.0-smoothstep(1.0,1.9,dl/rk.z);
      upK=min(upK,mix(1.0,mix(0.12,1.0,smoothstep(0.35,-0.55,fr.x)),near));
      float lane=step(0.0,fr.x)*(1.0-smoothstep(0.6,1.0,abs(fr.y)))*(1.0-smoothstep(1.0,4.2,fr.x));
      float sv=mix(texture2D(tN,vec2(fr.y*0.42,fr.x*0.06+ph0*0.9*sp)+rk.xy*0.07).z,texture2D(tN,vec2(fr.y*0.42,fr.x*0.06+ph1*0.9*sp)+rk.xy*0.07+0.5).z,kf);
      trail=max(trail,lane*smoothstep(0.50,0.58,sv)*(1.0-fr.x/4.2));}
    foam*=upK;
    float f=max(max(foam,line*0.85),trail*0.9);col=mix(col,vec3(0.97,1.0,0.99),f);alpha=mix(alpha,0.97,f);
    /* posterise a touch: painted, not photographic */
    col=mix(col,floor(col*7.0+0.5)/7.0,0.25);
    float fogF=smoothstep(uFog.x,uFog.y,length(vWP-cameraPosition));col=mix(col,uFogC,fogF);
    gl_FragColor=vec4(col,alpha);}`});
const waterGeo=(()=>{const pos=[],flow=[],spd=[],idx=[],C=25;const pts=RIV.slice();const a0=pts[pts.length-1],a1=pts[pts.length-2];pts.push([a0[0]+(a0[0]-a1[0])*3,a0[1]+(a0[1]-a1[1])*3]);
  for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl,nz=tx/tl;const w=rivHalf(pts[i][1])+2.6;
    const sp=Math.max(.55,Math.min(1.7,2.8/rivHalf(pts[i][1])));for(let c=0;c<C;c++){const u=(c/(C-1)*2-1)*w;pos.push(pts[i][0]+nx*u,WL,pts[i][1]+nz*u);flow.push(tx/tl,tz/tl);spd.push(sp);}}/* (faster where narrow, slow in the pool) */
  for(let i=0;i<pts.length-1;i++)for(let c=0;c<C-1;c++){const a=i*C+c,b=a+C;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aFlow',new THREE.Float32BufferAttribute(flow,2));g.setAttribute('aSpd',new THREE.Float32BufferAttribute(spd,1));g.setIndex(idx);return g;})();
const water=new THREE.Mesh(waterGeo,waterMat);water.renderOrder=5;scene.add(water);
waterRocks.slice(0,8).forEach((k,i)=>WU.uRk.value[i].set(k.x,k.z,k.rw,0));bankU.uWL.value=WL;
/* drifting bits: a few leaves and foam flecks carried downstream at the river's speed (positions from the time, so they are deterministic) */
function rivAt(u){const i=Math.max(0,Math.min(RIV.length-2,Math.floor(u))),f=u-i,a=RIV[i],b=RIV[i+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz);
  return[a[0]+tx*f,a[1]+tz*f,-tz/tl,tx/tl,tx/tl,tz/tl];}
const FLOAT=[];{const r=mkRng(3131);for(let i=0;i<34;i++)FLOAT.push({u0:r()*(RIV.length-4),o:(r()-.5)*1.3,v:.35+.3*r(),leaf:i<12,rot:r()*6.28,spin:(r()-.5)*.6,sz:i<12?.09+.05*r():.05+.06*r(),c:r()});}
const fleckMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,uniforms:THREE.UniformsLib.fog,
  vertexShader:`varying vec2 vUv;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vec4 mvPosition=viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;
    #include <fog_pars_fragment>
    void main(){vec2 q=vUv-0.5;float d=length(q*vec2(1.0,1.6))+0.08*sin(atan(q.y,q.x)*5.0);if(d>0.42)discard;gl_FragColor=vec4(0.97,1.0,0.99,0.85);
    #include <fog_fragment>
    }`});
const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),ivyMat,12),flecks=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),fleckMat,22);
leaves.renderOrder=6;flecks.renderOrder=6;scene.add(leaves,flecks);
{const C=new THREE.Color();FLOAT.filter(f=>f.leaf).forEach((f,i)=>{C.setRGB(0,.55+.45*f.c,0);leaves.setColorAt(i,C);});leaves.instanceColor.needsUpdate=true;for(let i=0;i<22;i++)flecks.setColorAt(i,C.setRGB(1,1,1));flecks.instanceColor.needsUpdate=true;}
function updFloat(t){const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),P=new THREE.Vector3(),Sv=new THREE.Vector3();let li=0,fi=0;const L=RIV.length-4;
  for(const f of FLOAT){const w0=rivHalf(RIV[Math.floor(f.u0)][1]),sp=Math.max(.55,Math.min(1.7,2.8/w0));let u=(f.u0+f.v*sp*t)%L;const A=rivAt(u),w=rivHalf(A[1]);
    let x=A[0]+A[2]*f.o*w,z=A[1]+A[3]*f.o*w;/* (keep off rocks: slip round them) */for(const k of waterRocks){const dx=x-k.x,dz=z-k.z,dl=Math.hypot(dx,dz);if(dl<k.rw*1.25){x=k.x+dx/dl*k.rw*1.25;z=k.z+dz/dl*k.rw*1.25;}}
    P.set(x,WL+.012,z);Q.setFromAxisAngle(Y,f.rot+f.spin*t);Sv.set(f.sz,1,f.sz*(f.leaf?1.3:1));M.compose(P,Q,Sv);
    if(f.leaf)leaves.setMatrixAt(li++,M);else flecks.setMatrixAt(fi++,M);}
  leaves.instanceMatrix.needsUpdate=true;flecks.instanceMatrix.needsUpdate=true;}
const waterOld=new THREE.Mesh(waterGeo,new THREE.MeshPhongMaterial({side:THREE.DoubleSide,color:0x3f86a8,transparent:true,opacity:.82,shininess:30,flatShading:true}));waterOld.visible=false;scene.add(waterOld);
/* one frame: a depth-only pre-pass of the opaque scene (no water, no grass cards, no shadow update), then the normal render */
function renderFrame(){if(water.visible)updFloat(WU.uTime.value);const b=R.getDrawingBufferSize(new THREE.Vector2());if(DRT.width!==b.x||DRT.height!==b.y)DRT.setSize(b.x,b.y);WU.uRes.value.copy(b);
  WU.uNear.value=camera.near;WU.uFar.value=camera.far;
  if(water.visible){const tv=tufts.visible;water.visible=false;tufts.visible=false;leaves.visible=false;flecks.visible=false;scene.overrideMaterial=depthOnly;const au=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;
    R.setRenderTarget(DRT);R.clear();R.render(scene,camera);R.setRenderTarget(null);R.shadowMap.autoUpdate=au;scene.overrideMaterial=null;tufts.visible=tv;water.visible=true;leaves.visible=true;flecks.visible=true;}
  R.render(scene,camera);}
const T0=performance.now();


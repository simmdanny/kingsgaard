/* VERBATIM from tools/mockups/river/surface-study.html, lines 587-620. 3D ivy: leaf cards in strands, ray-cast onto the stone.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* ===================== ivy: small leaf cards in strands, hanging down the water side of a few taller bank stones (ray-cast onto the stone) ===================== */
const ivyMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uSun:{value:SUN.clone()}}]),
  vertexShader:`varying vec2 vUv;varying vec3 vC;varying float vL;uniform vec3 uSun;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vC=instanceColor;vec3 n=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.0,0.0,1.0));vL=0.55+0.45*abs(dot(n,normalize(uSun)));
      vec4 mvPosition=viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;varying vec3 vC;varying float vL;
    #include <fog_pars_fragment>
    void main(){vec2 q=vUv-vec2(0.5,0.55);float w=0.42*(1.0-pow(abs(q.y*1.9),1.6))*(1.0-0.35*(q.y));if(abs(q.x)>w||abs(q.y)>0.5)discard;/* a pointed leaf */
      float vein=1.0-smoothstep(0.0,0.035,abs(q.x));vec3 col=mix(vec3(0.16,0.33,0.07),vec3(0.42,0.62,0.16),vC.y)*(0.9+0.25*vUv.y);col=mix(col,col*1.25,vein*0.35);
      gl_FragColor=vec4(col*vL,1.0);
      #include <fog_fragment>
    }`});
const leafSpots=[];
{const rc=new THREE.Raycaster(),tmp=new THREE.Mesh(BSH[0],new THREE.MeshBasicMaterial()),r=mkRng(4242);
 for(const [st,nx,nz] of bankTops){if(st.kind!==1||st.top<WL+.55||r()>.35)continue;
   tmp.geometry=BSH[st.si];tmp.matrixAutoUpdate=false;tmp.matrix.copy(st.M);tmp.matrixWorld.copy(st.M);tmp.geometry.computeBoundingSphere();
   const nS=2+Math.floor(r()*3);
   for(let k=0;k<nS;k++){const j=(r()-.5)*st.rw*1.3,len=.35+.6*r();
     for(let y=st.top-.02;y>st.top-len&&y>WL+.05;y-=.055+.02*r()){const sw=.05*Math.sin(y*9+k);
       const o=new THREE.Vector3(st.x-nx*st.rw*2.5-nz*(j+sw),y,st.z-nz*st.rw*2.5+nx*(j+sw));rc.set(o,new THREE.Vector3(nx,0,nz));
       const h=rc.intersectObject(tmp,false)[0];if(!h)continue;const fn=h.face.normal.clone().transformDirection(st.M);
       leafSpots.push([h.point.clone().addScaledVector(fn,.025),fn,r()]);}}}}
const ivy=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).translate(0,-.38,0),ivyMat,Math.max(1,leafSpots.length));
{const M=new THREE.Matrix4(),C=new THREE.Color(),up=new THREE.Vector3(0,1,0);
 leafSpots.forEach(([pt,fn,rr],i)=>{const tgt=pt.clone().add(fn);const L=new THREE.Object3D();L.position.copy(pt);L.lookAt(tgt);L.rotateZ((rr-.5)*1.4);L.rotateX(.35);
   const sz=.10+.06*rr;L.scale.set(sz,sz*1.25,sz);L.updateMatrix();ivy.setMatrixAt(i,L.matrix);C.setRGB(0,rr,0);ivy.setColorAt(i,C);});
 ivy.count=leafSpots.length;ivy.instanceMatrix.needsUpdate=true;if(ivy.instanceColor)ivy.instanceColor.needsUpdate=true;ivy.castShadow=true;scene.add(ivy);}
BINST.forEach((list,si)=>{if(!list.length)return;const m=new THREE.InstancedMesh(SHAPES[si],boulderNew,list.length);const C=new THREE.Color();
  list.forEach((b,i)=>{m.setMatrixAt(i,b.M);m.setColorAt(i,b.tint);solids.push([b.x,b.z,b.rw*0.95,1]);});m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;
  m.castShadow=m.receiveShadow=true;scene.add(m);boulderMeshes.push(m);});


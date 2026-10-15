/* VERBATIM from tools/mockups/river/surface-study.html, lines 632-688. Grass tuft material and placement (meadow exclusion at the river, tufts behind stones leaning over, lip grass drooping over steep banks, reeds, tufts round boulders).
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
/* ===================== 3D grass: tufts of blades on crossed cards, drawn by the shader (no texture) ===================== */
const grassMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uSun:{value:SUN.clone()}}]),
  vertexShader:`varying vec2 vUv;varying vec3 vC;varying float vSh;uniform vec3 uSun;
    #include <fog_pars_vertex>
    void main(){vUv=uv;vC=instanceColor;vec4 wp=modelMatrix*instanceMatrix*vec4(position,1.0);
      vec3 nrm=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.0,0.0,1.0));vSh=0.78+0.22*abs(dot(nrm,uSun));
      vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader:`varying vec2 vUv;varying vec3 vC;varying float vSh;
    #include <fog_pars_fragment>
    float hs(float x){return fract(sin(x)*4375.7);}
    void main(){float ty=-1.0;
      for(int i=0;i<11;i++){float fi=float(i);float r1=hs(vC.z*91.7+fi*13.1),r2=hs(vC.z*17.3+fi*7.7),r3=hs(vC.z*51.9+fi*3.3);
        float cx=(fi+0.5)/11.0+(r1-0.5)*0.10;float hg=0.55+0.45*r2;if(vUv.y>hg)continue;
        float y=vUv.y/hg;float x=cx+(r3-0.5)*0.4*y*y;float w=0.052*(1.0-y*0.8)*(0.8+0.5*r1);
        if(abs(vUv.x-x)<w)ty=max(ty,y);}
      if(ty<0.0)discard;
      vec3 col=mix(vec3(0.24,0.44,0.09),vec3(0.62,0.80,0.22),ty)*vC.y*vSh;
      col=mix(col,col*vec3(1.08,1.0,0.78),vC.x*0.4);
      gl_FragColor=vec4(col,1.0);
      #include <fog_fragment>
    }`});
const tuftGeo=(()=>{const a=new THREE.PlaneGeometry(1,1);a.translate(0,.5,0);const b=a.clone();b.rotateY(Math.PI/2);
  const g=new THREE.BufferGeometry(),pa=a.attributes.position.array,pb=b.attributes.position.array,ua=a.attributes.uv.array;
  g.setAttribute('position',new THREE.Float32BufferAttribute([...pa,...pb],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([...ua,...ua],2));
  const ia=a.index.array;g.setIndex([...ia,...ia.map(i=>i+4)]);return g;})();
const tuftSpots=[];/* where tufts go: thick along the cliff foot, then the meadow (thinner with distance, none on the path) */
for(let z=-47;z<32;z+=.09){const hp=plateauH(z);if(hp<.4)continue;const xf=footX(z),wl=gRun(z);for(let k=0;k<6;k++){const d=-wl*rnd()*rnd()-.45+1.9*Math.pow(rnd(),1.5);tuftSpots.push([xf+d,z,1.5-.3*d]);}}
for(let i=0;i<90000;i++){const r=2+52*Math.sqrt(rnd()),a=rnd()*6.283,x=1.5+r*Math.cos(a),z=4+r*Math.sin(a);
  if(rnd()>1.2-r/50)continue;const pmk=pathMask(x,z);if(pmk>0.08){const keep=pmk<0.5?1-pmk*1.7:(pmk<0.85?0.07:0.02);if(rnd()>keep)continue;}const hp=plateauH(z),xf=footX(z),gl=gLev(z),wl=gRun(z);if(hp>.3&&x<xf-wl+.2&&x>xf-wl-LEAN*(hp-gl)-1.6)continue;{const bk=rivBank(x,z);if(bk.dd<bk.w+bk.run+.5&&(bk.y<WL+.07||(bk.face&&bk.steep>.35&&bk.dd<bk.w+bk.run-.2)))continue;}/* (only at the river: in the water, or on a steep earth face) */tuftSpots.push([x,z,(.85+.4*rnd())*(1-.55*pmk)]);}
/* the banks: a thick fringe of grass behind the stones, and tufts on the stone tops leaning out over the water */
for(const [st,nx,nz] of bankTops){for(let k=0;k<7;k++){const d=st.rw*(.35+1.4*rnd()),j=(rnd()-.5)*st.rw*2.2;const x=st.x+nx*d-nz*j,z=st.z+nz*d+nx*j;if(rivMask(x,z,.3))continue;tuftSpots.push([x,z,1.0+.5*rnd()]);}
  if(st.kind!==2&&st.top<WL+.85){for(let k=0;k<5;k++){const j=(rnd()-.5)*st.rw*1.6,d=st.rw*(.7+.25*rnd()),x=st.x+nx*d-nz*j,z=st.z+nz*d+nx*j;const gy=Math.max(H(x,z),st.top-.04);
    tuftSpots.push([x,z,1.0+.4*rnd(),gy-.03,.75+.35*rnd(),-nx,-nz]);}}}/* (behind the stone, leaning out over its edge) */
for(const [x,y,z] of cliffFine.geometry.userData.ledges)tuftSpots.push([x,z,.45+.3*rnd(),y-.04]);
BINST.flat().forEach(b=>{if(b.sc<.3)return;const k=5+Math.floor(b.sc*7);for(let j=0;j<k;j++){const a=rnd()*6.283,d=b.rw*(.85+.5*rnd());tuftSpots.push([b.x+Math.cos(a)*d,b.z+Math.sin(a)*d,.8+.3*rnd()]);}});/* tufts around every boulder's base, overlapping it *//* small tufts and leafy bits on the ledges */
/* the bank lip: grass right to the edge of the steep banks, drooping over it toward the water (not where a bank stone sits) */
{const r=mkRng(515),nearStone=(x,z)=>bankSpots.some(b=>Math.hypot(b.x-x,b.z-z)<b.rw+.35);
 for(let i=0;i<RIV.length-1;i++)for(const side of[-1,1])for(let k=0;k<9;k++){const a=RIV[i],b=RIV[i+1],f=(k+r())/9,cx=a[0]+(b[0]-a[0])*f,cz=a[1]+(b[1]-a[1])*f,tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side;
   let d=rivHalf(cz)+1.0,x=cx+nx*d,z=cz+nz*d;for(let it=0;it<3;it++){const bk=rivBank(x,z);d+=(bk.w+bk.run-.12)-bk.dd;x=cx+nx*d;z=cz+nz*d;}/* (find the lip) */
   const bk=rivBank(x,z);if(bk.steep<.22||nearStone(x,z))continue;const jx=(r()-.5)*.2;tuftSpots.push([x+nx*jx,z+nz*jx,1.0+.6*r(),bk.y-.03,.8+.6*r(),-nx,-nz]);/* (leaning out and down over the lip) */
   if(r()<.5)tuftSpots.push([x+nx*.25,z+nz*.25,1.0+.4*r()]);}
 /* reeds: clusters at the waterline in the gaps, some standing in the shallows */
 for(let c=0;c<34;c++){const i=Math.floor(r()*(RIV.length-2)),side=r()<.5?-1:1,a=RIV[i],b=RIV[i+1],tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz),nx=-tz/tl*side,nz=tx/tl*side;
   let d=rivHalf(a[1]),x=a[0]+nx*d,z=a[1]+nz*d;for(let it=0;it<3;it++){const bk=rivBank(x,z);d+=(bk.w+.15)-bk.dd;x=a[0]+nx*d;z=a[1]+nz*d;}
   if(nearStone(x,z)||rivBank(x,z).steep>.5)continue;const m=8+Math.floor(r()*12);
   for(let j=0;j<m;j++){const u=(r()-.5)*1.6,v=(r()-.6)*.7,px=x-nz*u+nx*v,pz=z+nx*u+nz*v;if(H(px,pz)<WL-.35)continue;tuftSpots.push([px,pz,.9+.4*r(),undefined,undefined,undefined,undefined,2.6+1.8*r()]);}}}
const tufts=new THREE.InstancedMesh(tuftGeo,grassMat,tuftSpots.length);
{const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Pv=new THREE.Vector3(),Sv=new THREE.Vector3(),C=new THREE.Color();
 tuftSpots.forEach(([x,z,sc,yl,tilt,tx,tz,hs],i)=>{const h=yl!==undefined?yl:H(x,z)-.03;Pv.set(x,h,z);Q.setFromAxisAngle(new THREE.Vector3(0,1,0),rnd()*6.283);
   if(tilt){const ax=new THREE.Vector3(tz,0,-tx).normalize();Q.premultiply(new THREE.Quaternion().setFromAxisAngle(ax,tilt));}/* (leaning out over the water) */
   const w=.40+.22*rnd();Sv.set(w*sc*(hs?.6:1),(.16+.14*rnd())*sc*(hs||1),w*sc*(hs?.6:1));M.compose(Pv,Q,Sv);tufts.setMatrixAt(i,M);C.setRGB(hs?.45+.4*rnd():yl!==undefined?.1:rnd()*.6,hs?.62+.2*rnd():(yl!==undefined?.7:.85)+.3*rnd(),rnd());tufts.setColorAt(i,C);});
 tufts.instanceMatrix.needsUpdate=true;tufts.instanceColor.needsUpdate=true;scene.add(tufts);}



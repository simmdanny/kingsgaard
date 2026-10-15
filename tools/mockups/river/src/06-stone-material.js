/* VERBATIM from tools/mockups/river/surface-study.html, lines 349-384. THE stone material for boulders, bank stones, water rocks, pebbles. Uniform values per use are in 07 and 09.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
function boulderMat(u){return patch('bldNew',new THREE.MeshPhongMaterial({color:0xffffff,shininess:6,specular:0x111111}),
 'attribute float aEdge;attribute float aOcc;attribute float aSeam;attribute float aRel;varying float vEdge;varying float vOcc;varying float vSeam;varying float vOy;varying vec3 vTint;varying float vRel;varying float vSc;',
 'vEdge=aEdge;vOcc=aOcc;vSeam=aSeam;vOy=position.y;vRel=aRel;vSc=1.0;\n#ifdef USE_INSTANCING\nvSc=length(instanceMatrix[0].xyz);\n#endif\n\n#ifdef USE_INSTANCING_COLOR\nvTint=instanceColor;\n#else\nvTint=vec3(0.5,0.25,0.5);\n#endif',
 'varying float vEdge;varying float vOcc;varying float vSeam;varying float vOy;varying vec3 vTint;varying float vRel;varying float vSc;uniform vec3 uSunDir;uniform float uDbg;uniform float uMossP;uniform float uIvy;uniform float uMossTop;uniform float uUpK;uniform float uUW;uniform float uWL;'+ROCK_DECL,
 `{
  vec3 P=vWP;vec3 N=normalize(vWN);vec2 X=P.xz;float fd=1.0-smoothstep(25.0,70.0,length(P-cameraPosition));float seed=vTint.z;
  diffuseColor.rgb=vec3(1.0);/* (three.js multiplied in the instance colour: it is data, not a tint) */
  float up=clamp(N.y*0.5+0.5,0.0,1.0);
  float t=0.54+uUpK*(up-0.5)+0.10*(fbm(P*0.45+seed*9.0)-0.5)+0.04*(vn(P*3.0)-0.5)*fd+0.12*vEdge*smoothstep(-0.1,0.6,N.y)-0.30*vOcc;
  float sd=abs(vSeam),on=step(sd,5.0);float sw=0.045,sa=fwidth(sd)*0.8+0.002;float seam=(1.0-smoothstep(sw-sa,sw+sa,sd))*on;float seamSoft=(1.0-smoothstep(0.045,0.2,sd))*on;
  float crev=max(seam,0.45*seamSoft);t-=0.15*crev;
  float ck=vedge(vec3(P.x*0.8,P.y*0.5,P.z*0.8)+seed*9.0);float cka=fwidth(ck)*0.8+0.003;float crackFade=1.0-smoothstep(10.0,28.0,length(P-cameraPosition));
  float crack=(1.0-smoothstep(0.008-cka,0.008+cka,ck))*smoothstep(0.5,0.62,fbm(P*0.6+seed*4.0))*step(0.67,fract(seed*3.71))*crackFade;t-=0.12*crack;
  vec3 ch=cell2(P.xz*2.2+P.y*1.7);float chip=step(0.93,ch.x)*(1.0-smoothstep(0.08,0.16,ch.y))*fd;t+=0.04*chip*(ch.z<0.5?-1.0:1.0)*crackFade;
  float q=t*4.0;t=mix(t,(floor(q)+smoothstep(0.3,0.7,fract(q)))/4.0,0.8);
  vec3 col=ramp4(t,uR0,uR1,uR2,uR3);
  col*=mix(uCool,uWarm,fract(seed*5.31));col*=0.93+0.14*vTint.x;/* per-boulder hue and brightness, a few percent */
  col=mix(col,col*uCool*0.9,clamp((1.0-up)*0.35,0.0,1.0));
  col*=1.0-0.07*smoothstep(0.58,0.74,fbm(P*1.1+7.0));
  float sp=vn(P*12.0);col*=1.0+(0.02*step(0.86,sp)-0.03*step(sp,0.10))*fd;
  col*=mix(1.0,0.70,smoothstep(0.15,0.9,crev));col=mix(col,col*vec3(1.0,0.88,0.78),smoothstep(0.4,1.0,crev)*0.5);
  float clump;vec3 gcol=meadowStrokes(grassRamp(meadowT(X,fd,clump)),X,1.0-smoothstep(14.0,42.0,length(P-cameraPosition)));
  float mo=smoothstep(0.6,0.9,N.y)*smoothstep(0.5-0.25*uMossTop,0.62-0.25*uMossTop,fbm(P*0.7+2.0))*step(fract(seed*7.13),uMossP)*uMoss;/* moss on some tops, not every boulder */
  col=mix(col,gcol*0.85,mo);
  /* hanging ivy (bank stones only): strands of leaf blobs dripping from the top over the sides */
  if(uIvy>0.5&&fract(seed*11.3)<0.3){float cx=(P.x+P.z)*2.2;float sc=floor(cx),sx=fract(cx)-0.5;float has=step(0.45,h31(vec3(sc,seed*13.0,1.0)));float drip=(0.25+0.6*h31(vec3(sc,seed*13.0,2.0)))*has;
    vec2 lp=vec2(sx*3.0+0.35*sin(P.y*9.0+sc),P.y*9.0);vec3 lc=cell2(lp);float lw=fwidth(lc.y)+0.02;float strand=1.0-smoothstep(0.22,0.30,abs(sx+0.08*sin(P.y*5.0+sc)));
    float leaf=(1.0-smoothstep(0.45-lw,0.45+lw,lc.y))*strand*step(vRel,drip)+step(vRel,0.12)*(1.0-smoothstep(0.45-lw,0.45+lw,lc.y))*has;
    vec3 iv=mix(vec3(0.13,0.28,0.07),vec3(0.36,0.55,0.14),lc.z)*(0.85+0.3*up);col=mix(col,iv,leaf*smoothstep(0.85,0.3,N.y+0.0*vRel));}
  /* the base: fades to a darker, greener earth tone where it goes into the ground */
  float hgt=P.y-(vTint.y*60.0-20.0);vec3 earth=mix(mix(vec3(0.16,0.13,0.08),vec3(0.14,0.20,0.07),fbm2(X*0.9)),gcol*0.55,0.35);
  float bnd=clamp(vSc*0.45,0.04,1.0);/* (a pebble's base band is a few cm, a boulder's 30) */float gm0=1.0-smoothstep(-0.05*bnd,0.30*bnd,hgt);col=mix(col,earth,gm0*0.9);col*=1.0-0.25*(1.0-smoothstep(0.0,0.6*bnd,hgt));
  float sunF=clamp(dot(N,normalize(uSunDir)),0.0,1.0);col*=1.0+0.32*(1.0-sunF)*(1.0-gm0);
  if(uUW>0.5){float uw=uWL-P.y;col=mix(col,mix(vec3(0.16,0.55,0.55),vec3(0.05,0.36,0.42),smoothstep(0.2,0.9,uw)),smoothstep(0.0,0.45,uw)*0.92);}/* under water: fades into the water's colour with depth */
  diffuseColor.rgb=col;
 }`,u,null,'color_fragment');}

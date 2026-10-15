/* VERBATIM from tools/mockups/river/surface-study.html, lines 225-249. Inside the ground fragment shader (after the meadow/path colour, variable col): the bed, the wet waterline, the earth bank face (layers, bumps, pebbles, roots), mud patches. Needs vWd (water level minus ground height, -9 away from the river), vBf (bank face weight), P, X, fd, slope.
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
    /* the stream bed: wet earth at the waterline, then sand and pebbles, darker and greener with depth */
    if(vWd>-0.4){vec3 bc=cell2(X*2.6);float pb=step(0.55,bc.x)*(1.0-smoothstep(0.18,0.26,bc.y));
      vec3 bed=mix(vec3(0.62,0.54,0.38),vec3(0.47,0.40,0.28),fbm2(X*0.7));bed=mix(bed,mix(vec3(0.58,0.55,0.50),vec3(0.36,0.33,0.29),bc.z),pb*0.85);
      bed=mix(bed,bed*vec3(0.62,0.80,0.74),smoothstep(0.2,1.2,vWd));bed*=1.0-0.38*vOcc;
      vec3 wet=mix(vec3(0.27,0.22,0.15),vec3(0.24,0.28,0.14),fbm2(X*1.3));
      col=mix(col,wet,smoothstep(-0.4,-0.12,vWd)*0.8);col=mix(col,bed,smoothstep(-0.08,0.04,vWd));}
    /* the earth bank: the path's dusty brown family, sampled in 3D (no stretching on the steep face); wet dark mud near the water,
       drier and lighter up the bank; the grass edge broken by noise; mud patches at the waterline */
    if(vBf>0.01||vWd>-0.6){float hw=-vWd;/* height above the water */
      float n3=fbm(P*vec3(1.1,2.2,1.1)+3.0),n4=vn(P*vec3(3.5,7.0,3.5));
      float te=0.50+0.30*(n3-0.5)+0.10*(n4-0.5)*fd+0.25*smoothstep(0.05,0.7,hw);
      vec3 earthC=ramp4(te,vec3(0.21,0.16,0.11),vec3(0.33,0.25,0.18),vec3(0.46,0.37,0.27),vec3(0.58,0.49,0.37));
      earthC*=1.0-0.18*smoothstep(0.55,0.75,vn(P*vec3(2.0,5.0,2.0)+7.0));/* darker streaks down the face */
      float sF=P.z+0.35*P.x;/* (along the face) */
      float ly=abs(fract(P.y*4.2+0.35*fbm(P*0.8))-0.5);earthC*=1.0-0.20*(1.0-smoothstep(0.05,0.13,ly))*(0.5+0.5*fd);/* soft horizontal layers */
      float bm=vn(P*vec3(4.0,6.0,4.0)+2.0),bmU=vn(P*vec3(4.0,6.0,4.0)+2.0+vec3(0.0,0.06,0.0));earthC*=1.0+0.9*(bmU-bm)*fd;/* little bumps, lit from above */
      vec3 pc3=cell2(vec2(sF*3.2,P.y*3.2));float peb3=step(0.80,pc3.x)*(1.0-smoothstep(0.11,0.16,pc3.y))*fd;
      vec3 pebC=mix(vec3(0.47,0.40,0.31),vec3(0.36,0.30,0.23),pc3.z);earthC=mix(earthC,pebC*(0.92+0.18*(1.0-pc3.y*6.0)),peb3*0.85);/* embedded pebbles */
      float rid=floor(sF*1.4);float rx=fract(sF*1.4)-0.5+0.10*sin(P.y*7.0+rid*3.0);float rw=fwidth(sF*1.4)+0.012;
      float root=(1.0-smoothstep(0.024,0.024+rw,abs(rx)))*step(0.62,h31(vec3(rid,4.0,1.0)))*smoothstep(0.2,0.5,hw)*(0.4+0.6*fd);earthC=mix(earthC,vec3(0.26,0.17,0.10),root*0.85);/* exposed roots near the top */
      earthC=mix(earthC,earthC*vec3(0.78,0.80,0.86),1.0-smoothstep(0.0,0.25,hw));/* wet at the waterline */
      float onFace=smoothstep(0.08+0.30*(n3-0.5),0.3+0.30*(n3-0.5),vBf*(0.4+1.6*slope));/* steep part of the bank shows earth; noise breaks the grass edge */
      float mud=(1.0-smoothstep(0.02,0.22,hw))*smoothstep(-0.15,0.0,hw)*smoothstep(0.42,0.6,fbm2(X*0.9+5.0));/* mud patches at the waterline */
      float e=clamp(max(onFace,mud),0.0,1.0)*smoothstep(-0.25,-0.05,hw+0.0);col=mix(col,earthC,e);}
  }

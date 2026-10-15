/* =====================================================================================================
   FAR SIGHT (src/world/wdepth.js): mountains kilometres away in a camera whose far plane stays near.
   1. Depth compression: every vertex farther than WD.R0 from a perspective camera is drawn nearer along its own line of sight
      (r -> R0 + SPAN*(1-exp(-(r-R0)/SCALE))). The mapping only grows with r, so whatever is behind something along a ray stays behind it, and the
      picture is the same (a point moved along its ray projects where it did); only the depth buffer sees the nearer distance, which keeps its precision
      with the near plane at 0.1 m. Everything within R0 (all the game's own things) is untouched. Orthographic cameras (the sun's shadows) are left alone.
   2. Air (v53): in the open world the air is clear out to WD.S (58 %) of its end, then thickens gradually over the true distance - slight at first,
      stronger and stronger - until nothing shows at the end (a smoothstep: no wall, no edge), the land melting into the sky's horizon colour. The
      end follows the Render distance setting (owFogEnd: OW_CFG.fogK times it), so the far ranges show as far as the player has chosen. A Fog whose
      far is negative selects it: near = the end. A positive far is the old linear fog.
      A landmark's material may define WD_SEE (uniform uSee = the height of its foot, its size): its upper part shows faintly through the haze out to
      2.6 times the end (at most a third of it, more the higher up), so the Great Elder Circle can be found from afar. The haze has a top there: below
      WD.SEE0 times the ring's size over its foot nothing shows through it, from there to WD.SEE1 it thins - only the top of the ring stands out. The ground's material defines
      WD_PED: the ground near a Great Elder Circle (uniform uGreat[4] = its middle x, z, the height of its foot, its size; wfeat.js fills it) shows
      through the haze by the same rule - the same top to the haze - so whatever of its peaks rises above it shows with the ring, and nothing below.
      There (and on the ring) the haze takes the sky's colour in the direction looked (the horizon's, bluer upwards - uniform uZen, WD.zen - as the sky
      dome), so what it hides melts into the sky behind instead of standing out as a pale shape.
   ===================================================================================================== */
const WD={R0:900,SPAN:1150,SCALE:5200,S:.58,SEE0:1.0,SEE1:1.65,zen:null,on:false};/* (zen: the sky's colour overhead, as the sky dome's - the game sets it each frame) *//* (SEE0, SEE1: the haze's top over a Great Elder Circle - from SEE0 to SEE1 times its size over its foot it thins, so only the top of the ring shows) */
function wdPatch(){if(WD.on)return;WD.on=true;WD.zen=WD.zen||new THREE.Color(0x4f86c6);const C=THREE.ShaderChunk;
  C.project_vertex=C.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;',
    'mvPosition = modelViewMatrix * mvPosition;\nvec3 wdV = mvPosition.xyz;\nif(projectionMatrix[2][3]<-0.5){float wdL=length(mvPosition.xyz);if(wdL>'+WD.R0.toFixed(1)+'){float wdN='+WD.R0.toFixed(1)+'+'+WD.SPAN.toFixed(1)+'*(1.0-exp(-(wdL-'+WD.R0.toFixed(1)+')/'+WD.SCALE.toFixed(1)+'));mvPosition.xyz*=wdN/wdL;}}');
  C.fog_pars_vertex='#ifdef USE_FOG\n\tvarying float fogDepth;\n\tvarying vec3 vFogV;\n#endif';
  C.fog_vertex='#ifdef USE_FOG\n\tfogDepth = - wdV.z;\n\tvFogV = wdV * mat3( viewMatrix );\n#endif';
  C.fog_pars_fragment='#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float fogDepth;\n\tvarying vec3 vFogV;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif';
  C.fog_fragment=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
	#else
		float fogFactor;vec3 wdFogC = fogColor;
		if( fogFar < 0.0 ){
			float wdD = length( vFogV );
			/* (clear to WD.S of the end, then thicker and thicker, all of it at the end) */
			fogFactor = smoothstep( fogNear * ${WD.S.toFixed(3)}, fogNear, wdD );
			#ifdef WD_SEE
			{ float wdS = smoothstep( uSee.x + ${WD.SEE0.toFixed(3)} * uSee.y, uSee.x + ${WD.SEE1.toFixed(3)} * uSee.y, cameraPosition.y + vFogV.y ) * ( 1.0 - smoothstep( fogNear * 1.6, fogNear * 2.6, wdD ) ); fogFactor = min( fogFactor, 1.0 - 0.36 * wdS ); }
			#endif
			float wdK = 0.0;
			#ifdef WD_SEE
			wdK = 1.0;
			#endif
			#ifdef WD_PED
			{ vec3 wdW = cameraPosition + vFogV; float wdP = 0.0;
			  for ( int i = 0; i < 4; i ++ ) { vec4 g = uGreat[ i ]; if ( g.w <= 0.0 ) continue;
			    float wdN = 1.0 - smoothstep( 2.2 * g.w, 3.2 * g.w, length( wdW.xz - g.xy ) ); wdK = max( wdK, wdN );
			    wdP = max( wdP, wdN * smoothstep( g.z + ${WD.SEE0.toFixed(3)} * g.w, g.z + ${WD.SEE1.toFixed(3)} * g.w, wdW.y ) ); }
			  wdP *= 1.0 - smoothstep( fogNear * 1.6, fogNear * 2.6, wdD ); fogFactor = min( fogFactor, 1.0 - 0.36 * wdP ); }
			#endif
			#if defined( WD_SEE ) || defined( WD_PED )
			/* (round a Great Elder Circle the haze takes the sky's own colour in the direction looked - the horizon's, bluer upwards, as the sky dome -
			   so what is lost in it melts into the sky behind, never a pale shape against it) */
			{ float wdH = clamp( vFogV.y / max( wdD, 1e-3 ), 0.0, 1.0 ); vec3 wdSky = mix( fogColor, uZen, pow( wdH, 0.55 ) );
			  wdSky = mix( wdSky, fogColor * 1.05, exp( - wdH * wdH / 0.01 ) * 0.45 );/* (the sky dome's own formula, kingsgaard.html owSkyInit, without the sun) */
			  wdFogC = mix( fogColor, wdSky, wdK * smoothstep( -0.01, 0.02, vFogV.y / max( wdD, 1e-3 ) ) ); }/* (only against the sky: looked down on, the haze keeps the ground's own colour) */
			#endif
			#ifdef WD_SEE
			/* (the ring past the end of the air: what the haze hides wholly is not drawn at all, so the sky itself - its sun glow too - shows there) */
			if ( fogFactor > 0.985 ) discard;
			#endif
		} else {
			fogFactor = smoothstep( fogNear, fogFar, fogDepth );
		}
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, wdFogC, fogFactor );
#endif`;}


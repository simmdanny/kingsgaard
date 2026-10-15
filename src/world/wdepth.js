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
      2.6 times the end (at most a third of it, more the higher up), so the Great Elder Circle can be found from afar. The ground's material defines
      WD_PED: the Great Elder Circle's pedestal (its 'ped' weight, wterrain.js) shows through the haze alike, most near the ring - a long, slow curve,
      half way at about the upper third of the mountain, fading into the fog over its middle - so the ring never stands clear over a mountain lost in
      the fog.
   ===================================================================================================== */
const WD={R0:900,SPAN:1150,SCALE:5200,S:.58,on:false};
function wdPatch(){if(WD.on)return;WD.on=true;const C=THREE.ShaderChunk;
  C.project_vertex=C.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;',
    'mvPosition = modelViewMatrix * mvPosition;\nvec3 wdV = mvPosition.xyz;\nif(projectionMatrix[2][3]<-0.5){float wdL=length(mvPosition.xyz);if(wdL>'+WD.R0.toFixed(1)+'){float wdN='+WD.R0.toFixed(1)+'+'+WD.SPAN.toFixed(1)+'*(1.0-exp(-(wdL-'+WD.R0.toFixed(1)+')/'+WD.SCALE.toFixed(1)+'));mvPosition.xyz*=wdN/wdL;}}');
  C.fog_pars_vertex='#ifdef USE_FOG\n\tvarying float fogDepth;\n\tvarying vec3 vFogV;\n#endif';
  C.fog_vertex='#ifdef USE_FOG\n\tfogDepth = - wdV.z;\n\tvFogV = wdV * mat3( viewMatrix );\n#endif';
  C.fog_pars_fragment='#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float fogDepth;\n\tvarying vec3 vFogV;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif';
  C.fog_fragment=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
	#else
		float fogFactor;
		if( fogFar < 0.0 ){
			float wdD = length( vFogV );
			/* (clear to WD.S of the end, then thicker and thicker, all of it at the end) */
			fogFactor = smoothstep( fogNear * ${WD.S.toFixed(3)}, fogNear, wdD );
			#ifdef WD_SEE
			{ float wdS = smoothstep( uSee.x + 0.15 * uSee.y, uSee.x + 1.3 * uSee.y, cameraPosition.y + vFogV.y ) * ( 1.0 - smoothstep( fogNear * 1.6, fogNear * 2.6, wdD ) ); fogFactor = min( fogFactor, 1.0 - 0.36 * wdS ); }
			#endif
			#ifdef WD_PED
			{ float wdP = pow( clamp( ( ped - 0.45 ) / 0.55, 0.0, 1.0 ), 2.8 ) * ( 1.0 - smoothstep( fogNear * 1.6, fogNear * 2.6, wdD ) ); fogFactor = min( fogFactor, 1.0 - 0.36 * wdP ); }
			#endif
		} else {
			fogFactor = smoothstep( fogNear, fogFar, fogDepth );
		}
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;}


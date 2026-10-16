/* =====================================================================================================
   THE GAME'S LIGHT FOR THE RIVER LOOK (src/world/wrlight.js, river look 6 - tools/mockups/river/HANDOFF.md section 6): the mockup's materials were
   tuned under its own light (sun 0xfff0d6 x 0.95, sky light 0xd8ecff / 0x8a7a58 x 0.62, ambient 0.10); the game's daytime light is sun 0xfff0d8 x 0.8,
   sky light 0xe8f2ff / 0x4a5530 x 0.58, no ambient. Measured in the parity lab (parity-gamelight against reference, per material by the material
   masks of parity-ids - tools/mockups/river/gamelight.py), and brought back with the smallest global change: one multiplier on each ported
   material's final colour (WRX.k; DEVIATIONS D26).
   The materials with a light of their own (the water, the grass, the ivy, the flecks: they read only the sun's direction) also take the game's light
   level (WRX.L: 1 at the game's noon, less at dusk, little at night - wwater.js sets it each frame), so they never glow in the dark.
   The same code in the lab (parity-gamelight.html: wrxApply) and in the game (the river look's material makers call wrxLit / wrxOwn).
   ===================================================================================================== */
/* the factors, measured (gamelight.py: reference / game light, all ten shots, pixel-weighted): the stones 1.285, the river ground 1.210 (the meadow
   beside it 1.208), the water 1.041 (the bed seen through it: the river ground's factor brings that back), the grass, ivy and flecks 1.000 (they read no
   scene light) */
const WRX={k:{stone:1.285,ground:1.210,water:1,grass:1,ivy:1,fleck:1},L:{value:1}};
/* the ground's river part: its colour code is affine in the colour it starts from (three mixes towards the wet edge, the bed and the earth face, by
   weights of their own) - so the colour divided by k going in and multiplied by k coming out is the river's own colours times k and the meadow's
   share as it was: no seam where the river's part ends */
function wrxGround(glsl){const k=WRX.k.ground;if(k===1)return glsl;const K=k.toFixed(4);return'col/='+K+';/* (the light of the game: wrlight.js) */\n'+glsl+'\ncol*='+K+';';}
/* a lit material (the stones): its final colour times k (the mockup's stone material sets diffuseColor.rgb=col) */
function wrxLit(m,k){if(k===1)return m;const ob=m.onBeforeCompile;m.onBeforeCompile=function(sh,r){if(ob)ob.call(this,sh,r);sh.fragmentShader=sh.fragmentShader.replace('diffuseColor.rgb=col;','diffuseColor.rgb=col*'+k.toFixed(4)+';');};
  const ck=m.customProgramCacheKey&&m.customProgramCacheKey();m.customProgramCacheKey=()=>(ck||'')+'|wrx'+k.toFixed(4);m.needsUpdate=true;/* (built again if it already was) */return m;}
/* a material with its own light: its final colour times k and the game's light level */
const WRX_OWN={water:['gl_FragColor=vec4(col,alpha);}','gl_FragColor=vec4(col*K,alpha);}'],grass:['gl_FragColor=vec4(col,1.0);','gl_FragColor=vec4(col*K,1.0);'],
  ivy:['gl_FragColor=vec4(col*vL,1.0);','gl_FragColor=vec4(col*vL*K,1.0);'],fleck:['gl_FragColor=vec4(0.97,1.0,0.99,0.85);','gl_FragColor=vec4(vec3(0.97,1.0,0.99)*K,0.85);']};
function wrxOwn(m,kind){const r=WRX_OWN[kind],k=WRX.k[kind];if(m.fragmentShader.indexOf(r[0])<0)throw new Error('wrx: no '+kind+' colour');
  if(m.uniforms===THREE.UniformsLib.fog)m.uniforms=THREE.UniformsUtils.clone(m.uniforms);/* (the flecks' uniforms are three.js's own fog object: never add to that) */m.uniforms.uWrxL=WRX.L;m.fragmentShader='uniform float uWrxL;\n'+m.fragmentShader.replace(r[0],r[1].replace('K','('+k.toFixed(4)+'*uWrxL)'));m.needsUpdate=true;return m;}
/* the lab's: every ported material of the scene */
function wrxApply(o){for(const m of o.stones||[])wrxLit(m,WRX.k.stone);for(const kd of['water','grass','ivy','fleck'])for(const m of o[kd]||[])wrxOwn(m,kd);}

"""Build parity.html: the mockup's scene (surface-study.html) with the game's ported code (src/world/wrbank.js, wrlook.js) in place of the mockup's
own code for every feature ported so far. Everything else stays the mockup's, byte for byte, so a difference in compare.py can only come from a port.
usage: python make-parity.py   (writes parity.html next to it; render it with render-reference.py --page parity.html --out parity)
Each substitution must match exactly once (it fails loudly otherwise)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(here, 'surface-study.html'), encoding='utf-8').read()
def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, ('substitution must match once', n, a[:120])
    s = s.replace(a, b)
def cut(start, end, b):
    """replace the text from start (included) up to end (excluded), both matching once"""
    global s
    assert s.count(start) == 1 and s.count(end) == 1, (start[:80], end[:80])
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + b + s[j:]

# ---- the game's modules, loaded after three.js ----
rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
    '<!-- parity lab: the game\'s ported river code (make-parity.py) -->\n'
    '<script src="../../../src/world/wrbank.js"></script>\n<script src="../../../src/world/wrlook.js"></script>')

# ---- step 1: the river terrain (rivBank), the ground's river attributes, GLSL_NOISE + patch, the ground shader's river part ----
cut('function rivBank(x,z){const h=Hland(x,z);', 'function H(x,z){return rivBank(x,z).y;}',
    '/* parity lab: rivBank is the game\'s (WRB.makeRivBank: src/world/wrbank.js), fed the mockup\'s river */\n'
    'const rivBank=WRB.makeRivBank({Hland:(x,z)=>Hland(x,z),inside:(x,z)=>!(x<12||x>46||z<-42),rivNear:(x,z)=>rivNear(x,z),rivHalf:(z,rn)=>rivHalf(z),WL:rn=>WL,along:(z,rn)=>z});\n')
rep('const bk=rivBank(x,z);wd[i]=bk.dd<bk.w+bk.run+.3?WL-h:-9;bf[i]=bk.face*(.25+.75*bk.steep);',
    'const bk=rivBank(x,z);const ra=WRB.riverAttrs(bk,h,WL);wd[i]=ra[0];bf[i]=ra[1];/* (parity lab: the game\'s riverAttrs) */')
cut('const GLSL_NOISE=`', '/* ===================== ground: meadow + dirt path ===================== */',
    '/* parity lab: the shared GLSL and patch are the game\'s (WRL: src/world/wrlook.js) */\nconst GLSL_NOISE=WRL.GLSL_NOISE,patch=WRL.patch;\n\n')
cut('    /* the stream bed: wet earth at the waterline, then sand and pebbles, darker and greener with depth */',
    '  }\n  diffuseColor.rgb=col;\n }`,U);',
    '${WRL.GLSL_GROUND_RIVER/* parity lab: the game\'s river part of the ground shader */}\n')

# ---- step 2: the stone generator (makeStone, weld), the rock palettes and the stone material ----
cut('const PAL={\n', 'function rockNew(u){',
    "/* parity lab: the palettes are the game's (WRL) */\nconst PAL=WRL.PAL,palU=WRL.palU,setPal=WRL.setPal,ROCK_DECL=WRL.ROCK_DECL;\n")
cut('function boulderMat(u){', "const cliffU=palU('brown',.35,1)", "/* parity lab: the stone material is the game's (WRL.boulderMat) */\nconst boulderMat=WRL.boulderMat;\n")
cut('function weld(g){', '/* flat chips: cut the shape', "/* parity lab: weld is the game's (WRL) */\nconst weld=WRL.weld;\n")
cut('/* every rock in the game from one generator', 'const SHAPES=[];', "/* parity lab: makeStone is the game's (WRL.makeStone) */\nconst makeStone=WRL.makeStone;\n")

# ---- step 3: placeBoulder, the stream's banks (bank stones, rocks in the water, pebbles), the ground's contact shade ----
cut('function placeBoulder(x,z,seed,fixedScale,shapeIdx){', '/* the cliff is one surface',
    "/* parity lab: placeBoulder is the game's (WRL.makePlaceBoulder) */\n"
    "const placeBoulder=WRL.makePlaceBoulder({SHAPES,BINST,H:(x,z)=>H(x,z),pathDist:(x,z)=>pathDist(x,z),pathHalfAt:(x,z)=>pathHalfAt(x,z),rivMask:(x,z,m)=>rivMask(x,z,m)});\n")
cut('PAL.bank={', 'const bankMeshes=[];',
    "/* parity lab: the bank palette, its uniforms, the bank stones' shapes, putStone and the placing are the game's (WRL), fed the mockup's river */\n"
    "const bankU=WRL.bankUniforms(SUN);\n"
    "const bankMat=boulderMat(bankU);\n"
    "const {BSH,BKIND}=WRL.bankShapes();\n"
    "const BKI=BSH.map(()=>[]),bankSpots=[],bankTops=[];\n"
    "const {seedWith,putStone,fract7,fract11}=WRL.bankKit({BSH,BKIND,BKI,H:(x,z)=>H(x,z)});const waterRocks=[];\n"
    "WRL.riverStones({r:mkRng(777),RIV,rivHalf:(z,u)=>rivHalf(z),rivBank,WLat:u=>WL,ROCKS:[[50,.15,1.1],[55,-.45,.8],[60,.5,1.3],[64,-.25,.9],[69,.35,.7],[74,-.4,1.0],[78,.2,.8]],"
    "NPEB:26,sd:0,solids,placeBoulder,putStone,bankSpots,bankTops,waterRocks});\n")
rep('let o=0;for(const q of solids){const dd=Math.hypot(x-q[0],z-q[1])-q[2];const R=q[3]?.9+q[2]*.5:2.6;if(dd<R){const v=(1-S(-.3,R,dd))*(q[3]?.9:.85);if(v>o)o=v;}}',
    "let o=WRL.occAt(x,z,solids);/* (parity lab: the game's occAt) */")

# ---- step 4: the ivy, the grass material and cards, the meadow's exclusion at the river, the tufts behind the stones, the lip grass, the reeds ----
cut('const ivyMat=new THREE.ShaderMaterial(', 'const leafSpots=[];', "/* parity lab: the ivy's material is the game's (WRL) */\nconst ivyMat=WRL.ivyMaterial(SUN);\n")
cut('{const rc=new THREE.Raycaster(),tmp=', 'const ivy=new THREE.InstancedMesh(',
    "/* parity lab: the ivy's leaves are the game's (WRL.ivySpots), three.js's own ray cast */\n"
    "WRL.ivySpots({BSH,bankTops,WLof:st=>WL,r:mkRng(4242),leafSpots,cast:(rc,tmp)=>rc.intersectObject(tmp,false)[0]});\n")
cut('{const M=new THREE.Matrix4(),C=new THREE.Color(),up=new THREE.Vector3(0,1,0);', ' ivy.count=leafSpots.length;',
    "{const ik=WRL.ivyKit();leafSpots.forEach((s,i)=>{const [M,C]=ik(s);ivy.setMatrixAt(i,M);ivy.setColorAt(i,C);});/* (parity lab: the game's ivyKit) */\n")
cut('const grassMat=new THREE.ShaderMaterial(', 'const tuftGeo=', "/* parity lab: the grass material is the game's (WRL) */\nconst grassMat=WRL.grassMaterial(SUN);\n")
cut('const tuftGeo=(()=>{', 'const tuftSpots=[];', "const tuftGeo=WRL.tuftGeometry();/* (parity lab: the game's) */\n")
rep('{const bk=rivBank(x,z);if(bk.dd<bk.w+bk.run+.5&&(bk.y<WL+.07||(bk.face&&bk.steep>.35&&bk.dd<bk.w+bk.run-.2)))continue;}',
    "{const bk=rivBank(x,z);if(WRB.meadowSkip(bk,WL))continue;}/* (parity lab: the game's meadowSkip) */")
cut('for(const [st,nx,nz] of bankTops){for(let k=0;k<7;k++)', 'for(const [x,y,z] of cliffFine.geometry.userData.ledges)',
    "/* parity lab: the tufts behind the bank stones are the game's (WRB.bankTufts) */\n"
    "WRB.bankTufts({bankTops,rnd,rivMask:(x,z,m)=>rivMask(x,z,m),H:(x,z)=>H(x,z),WLof:st=>WL,tuftSpots});\n")
cut('{const r=mkRng(515),nearStone=', 'const tufts=new THREE.InstancedMesh(',
    "/* parity lab: the lip grass and the reeds are the game's (WRB.lipReeds) */\n"
    "WRB.lipReeds({r:mkRng(515),RIV,rivHalf:(z,u)=>rivHalf(z),rivBank,bankSpots,H:(x,z)=>H(x,z),WLat:u=>WL,NREED:34,tuftSpots});\n")
cut('{const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Pv=', ' tufts.instanceMatrix.needsUpdate=true;',
    "{const tk=WRL.tuftKit();tuftSpots.forEach((s,i)=>{const [M,C]=tk(s,rnd,H);tufts.setMatrixAt(i,M);tufts.setColorAt(i,C);});/* (parity lab: the game's tuftKit) */\n")

# ---- step 5: the water (texture, uniforms, shader, ribbon, drifting bits); the depth pre-pass and renderFrame stay the lab's ----
cut('const NTEX=(()=>{', 'const DRT=new THREE.WebGLRenderTarget(', "/* parity lab: the ripple and foam texture is the game's (WRL) */\nconst NTEX=WRL.makeNTEX();\n")
cut('const WU={uRk:', 'const waterMat=', "/* parity lab: the water's uniforms and shader are the game's (WRL) */\nconst WU=WRL.waterUniforms(SUN,NTEX,DRT.depthTexture);\n")
cut('const waterMat=new THREE.ShaderMaterial({uniforms:WU,', 'const waterGeo=', "const waterMat=WRL.waterMaterial(WU);\n")
cut('const waterGeo=(()=>{', 'const water=new THREE.Mesh(waterGeo,waterMat);',
    "/* parity lab: the ribbon is the game's (WRL.waterRibbon), fed the mockup's river */\nconst waterGeo=WRL.waterRibbon({RIV,C:25,ext:true,rivHalf:(z,i)=>rivHalf(z),WLat:i=>WL});\n")
cut('function rivAt(u){', 'const fleckMat=',
    "/* parity lab: the drifting bits are the game's (WRL.makeFloat, WRL.updFloat) */\nconst FLOAT=WRL.makeFloat({RIV,NF:34,NL:12,r:mkRng(3131)});\n")
cut('const fleckMat=new THREE.ShaderMaterial(', 'const leaves=new THREE.InstancedMesh(', "const fleckMat=WRL.fleckMaterial();\n")
cut('function updFloat(t){', 'const waterOld=',
    "function updFloat(t){WRL.updFloat(t,{FLOAT,RIV,rivHalf:(z,u)=>rivHalf(z),waterRocks,WLat:u=>WL,leaves,flecks});}\n")

open(os.path.join(here, 'parity.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity.html')
base = s

# ---- step 6 (HANDOFF section 6): the same scene under the game's daytime light -> parity-gamelight.html ----
# the game's sun (0xfff0d8 x 0.8), its sky light (0xe8f2ff / 0x4a5530 x 0.58), no ambient; the game's air is clear this near (from 58 % of an end of
# hundreds of metres), so no fog; and the game's light adaptation of the ported materials (src/world/wrlight.js) as the game has it
s = base
rep('scene.fog=new THREE.Fog(0xbcdaef,80,200);', "scene.fog=new THREE.Fog(0xbcdaef,1e5,2e5);/* (gamelight: the game's air is clear at these distances) */")
rep('const sun=new THREE.DirectionalLight(0xfff0d6,.95);', "const sun=new THREE.DirectionalLight(0xfff0d8,.8);/* (gamelight: the game's sun) */")
rep('new THREE.HemisphereLight(0xd8ecff,0x8a7a58,.62),new THREE.AmbientLight(0xffffff,.10)', "new THREE.HemisphereLight(0xe8f2ff,0x4a5530,.58)/* (gamelight: the game's sky light, no ambient) */")
rep("const WU=WRL.waterUniforms(SUN,NTEX,DRT.depthTexture);\n", "const WU=WRL.waterUniforms(SUN,NTEX,DRT.depthTexture);WU.uFog.value.set(1e5,2e5);/* (gamelight: no fog) */\n")
rep('<script src="../../../src/world/wrlook.js"></script>', '<script src="../../../src/world/wrlook.js"></script>\n<script src="../../../src/world/wrlight.js"></script>')
rep("${WRL.GLSL_GROUND_RIVER/* parity lab: the game's river part of the ground shader */}", "${wrxGround(WRL.GLSL_GROUND_RIVER)/* gamelight: the game's light on the river ground (wrlight.js) */}")
rep('window.SS={view:', "/* gamelight: the game's light adaptation of the ported materials (wrlight.js) */\nwrxApply({stones:[boulderNew,bankMat],water:[waterMat],grass:[grassMat],ivy:[ivyMat],fleck:[fleckMat],ground:groundMat});\nwindow.SS={view:")
open(os.path.join(here, 'parity-gamelight.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity-gamelight.html')
# the same under the game's light with every factor 1 (the 'before' of DEVIATIONS D26): parity-gamelight-k1.html
s = s.replace('<script src="../../../src/world/wrlight.js"></script>', '<script src="../../../src/world/wrlight.js"></script>\n<script>WRX.k={stone:1,ground:1,water:1,grass:1,ivy:1,fleck:1};/* (gamelight-k1: no factors) */</script>', 1)
open(os.path.join(here, 'parity-gamelight-k1.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity-gamelight-k1.html')

# ---- step 6: material ids for the measurements -> parity-ids.html: every material a flat colour (river ground red, other ground dark red, stones green,
# the mockup's cliff grey, water blue, grass yellow, ivy magenta, flecks cyan, the rest and the sky black) ----
s = base
rep('window.SS={view:', """/* parity lab, material ids (step 6 measurements) */
{const vs='void main(){vec4 p=vec4(position,1.0);\\n#ifdef USE_INSTANCING\\np=instanceMatrix*p;\\n#endif\\ngl_Position=projectionMatrix*modelViewMatrix*p;}';
 const F=(r,g,b)=>new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader:vs,fragmentShader:'void main(){gl_FragColor=vec4('+r+','+g+','+b+',1.0);}'});
 const gid=new THREE.ShaderMaterial({vertexShader:'attribute float aWd;varying float vW;void main(){vW=aWd;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying float vW;void main(){gl_FragColor=vW>-8.5?vec4(1.0,0.0,0.0,1.0):vec4(0.4,0.0,0.0,1.0);}'});
 const recol=(m,c)=>{const n=m.clone();n.fog=false;n.transparent=false;n.fragmentShader=n.fragmentShader.replace(/gl_FragColor=vec4\\([^;]*\\);/,'gl_FragColor=vec4('+c+',1.0);').replace('#include <fog_fragment>','');return n;};
 const gm=recol(grassMat,'1.0,1.0,0.0'),im=recol(ivyMat,'1.0,0.0,1.0'),fm=recol(fleckMat,'0.0,1.0,1.0'),FS=F(0,1,0),FC=F(.5,.5,.5),FW=F(0,0,1),FK=F(0,0,0);
 const ID=new Set([gid,FS,FC,FW,gm,im,fm,FK]);
 const swap=()=>scene.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(ID.has(m))return;o.material=m===groundMat?gid:(m===boulderNew||m===bankMat)?FS:(m===cliffNew||m===cliffOld)?FC:m===waterMat?FW:m===grassMat?gm:m===ivyMat?im:m===fleckMat?fm:FK;});
 swap();const sl=setLook;setLook=v=>{sl(v);swap();};/* (setLook puts the boulders' own material back: swap again after it) */
 scene.background=new THREE.Color(0);scene.fog=null;}
window.SS={view:""")
open(os.path.join(here, 'parity-ids.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity-ids.html')

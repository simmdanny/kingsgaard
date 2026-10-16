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

open(os.path.join(here, 'parity.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity.html')

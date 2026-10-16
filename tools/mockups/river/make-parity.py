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

open(os.path.join(here, 'parity.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('wrote parity.html')

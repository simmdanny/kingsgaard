"""Compare the game's parity renders with the mockup's reference renders.
usage: python compare.py reference/ parity/ [--out compare/]
For every name in shots.json present in both folders: mean absolute difference (0-255, per channel, over the whole image),
the share of pixels off by more than 24, a side-by-side (reference | game | difference x4) image.
Pass: mean < 6 and over24 < 4 % on every shot. Anything worse is not 1:1: find out why (see HANDOFF.md, 'when it does not match')."""
import sys, os, json
from PIL import Image, ImageChops, ImageDraw
import numpy as np
here=os.path.dirname(os.path.abspath(__file__))
ref,game=sys.argv[1],sys.argv[2];out=sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else os.path.join(here,'compare')
os.makedirs(out,exist_ok=True);cfg=json.load(open(os.path.join(here,'shots.json')));fail=0
print('%-22s %8s %8s  %s'%('shot','mean','over24','result'))
for s in cfg['shots']:
    a,b=os.path.join(ref,s['name']+'.png'),os.path.join(game,s['name']+'.png')
    if not(os.path.exists(a) and os.path.exists(b)):print('%-22s missing'%s['name']);fail+=1;continue
    A=Image.open(a).convert('RGB');B=Image.open(b).convert('RGB').resize(A.size)
    d=np.abs(np.asarray(A,dtype=np.int16)-np.asarray(B,dtype=np.int16));mean=float(d.mean());over=float((d.max(axis=2)>24).mean()*100)
    ok=mean<6 and over<4;fail+=0 if ok else 1
    print('%-22s %8.2f %7.2f%%  %s'%(s['name'],mean,over,'ok' if ok else 'DIFFERENT'))
    D=Image.fromarray(np.clip(d*4,0,255).astype('uint8'));w,h=A.size;sb=Image.new('RGB',(w*3,h));sb.paste(A,(0,0));sb.paste(B,(w,0));sb.paste(D,(2*w,0))
    sb.resize((w*3//2,h//2)).save(os.path.join(out,s['name']+'.jpg'),quality=85)
print('PASS' if not fail else 'FAIL: %d shot(s) differ'%fail);sys.exit(1 if fail else 0)

"""Step 6 (HANDOFF section 6): how each material changes under the game's light.
usage: python gamelight.py reference/ parity-gamelight/ parity-ids/
parity-ids holds the material masks (make-parity.py writes parity-ids.html: every material a flat colour; render it like parity.html). For every
shot and every material: its pixels (the mask's colour there and in all 8 neighbours: no edges), the mean colour in the reference and in the game-light
render, and their ratio (by luminance, 0.2126 R + 0.7152 G + 0.0722 B). The last table is all shots together, pixel-weighted: the exposure factor that
brings a material back is reference / game-light."""
import sys, os, json
from PIL import Image
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
ref, gl, ids = sys.argv[1], sys.argv[2], sys.argv[3]
cfg = json.load(open(os.path.join(here, 'shots.json')))
CLS = {'river ground': (255, 0, 0), 'other ground': (102, 0, 0), 'stones': (0, 255, 0), 'cliff (mockup)': (128, 128, 128), 'water': (0, 0, 255),
       'grass': (255, 255, 0), 'ivy': (255, 0, 255), 'flecks': (0, 255, 255)}
LUM = np.array([.2126, .7152, .0722])
tot = {k: [0, np.zeros(3), np.zeros(3)] for k in CLS}
for s in cfg['shots']:
    n = s['name']; P = [os.path.join(d, n + '.png') for d in (ref, gl, ids)]
    if not all(os.path.exists(p) for p in P): print(n, 'missing'); continue
    A = np.asarray(Image.open(P[0]).convert('RGB'), dtype=np.float64); B = np.asarray(Image.open(P[1]).convert('RGB').resize(Image.open(P[0]).size), dtype=np.float64)
    I = np.asarray(Image.open(P[2]).convert('RGB').resize(Image.open(P[0]).size, Image.NEAREST), dtype=np.int16)
    print('\n%s' % n); print('  %-16s %9s %22s %22s %7s' % ('material', 'pixels', 'reference RGB', 'game light RGB', 'ratio'))
    for k, c in CLS.items():
        m = np.all(np.abs(I - np.array(c)) <= 24, axis=2)
        e = m.copy(); e[1:-1, 1:-1] = m[1:-1, 1:-1] & m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:] & m[:-2, :-2] & m[:-2, 2:] & m[2:, :-2] & m[2:, 2:]
        e[0, :] = e[-1, :] = False; e[:, 0] = e[:, -1] = False
        cnt = int(e.sum())
        if cnt < 200: continue
        ra = A[e].mean(axis=0); rb = B[e].mean(axis=0); r = (ra @ LUM) / max(rb @ LUM, 1e-6)
        tot[k][0] += cnt; tot[k][1] += A[e].sum(axis=0); tot[k][2] += B[e].sum(axis=0)
        print('  %-16s %9d %22s %22s %7.3f' % (k, cnt, '(%.0f, %.0f, %.0f)' % tuple(ra), '(%.0f, %.0f, %.0f)' % tuple(rb), r))
print('\nall shots, pixel-weighted (exposure factor = reference / game light):')
print('  %-16s %10s %22s %22s %7s' % ('material', 'pixels', 'reference RGB', 'game light RGB', 'factor'))
for k, (cnt, sa, sb) in tot.items():
    if not cnt: continue
    ra, rb = sa / cnt, sb / cnt
    print('  %-16s %10d %22s %22s %7.3f' % (k, cnt, '(%.1f, %.1f, %.1f)' % tuple(ra), '(%.1f, %.1f, %.1f)' % tuple(rb), (ra @ LUM) / max(rb @ LUM, 1e-6)))

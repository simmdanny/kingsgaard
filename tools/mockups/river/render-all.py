"""Render shots.json's shots with render-reference.py, unchanged, through a shim that only lifts Playwright's timeouts: the 30 s page load and the 5 min screenshot
(the first frame of a session compiles every program, about 5 min under SwiftShader on this machine; the renders themselves are the script's own). All shots in one
browser session, as render-reference.py does; a run that fails is retried with the shots still missing.
usage: python render-all.py --page parity.html --out parity [--only a,b] [--three vendor/three.min.js]"""
import subprocess, sys, json, os, argparse, time
here = os.path.dirname(os.path.abspath(__file__))
SHIM = r'''
import sys, os, runpy
from playwright.async_api import Page
_goto = Page.goto
async def goto(self, url, **kw):
    kw.setdefault('timeout', 900000)
    return await _goto(self, url, **kw)
Page.goto = goto
_shot = Page.screenshot
async def screenshot(self, **kw):
    kw['timeout'] = 1800000  # (the first frame of a session compiles every program: about 5 min under SwiftShader here)
    return await _shot(self, **kw)
Page.screenshot = screenshot
script = sys.argv[1]; sys.argv = [script] + sys.argv[2:]
runpy.run_path(script, run_name='__main__')
'''
ap = argparse.ArgumentParser(); ap.add_argument('--page', default='parity.html'); ap.add_argument('--out', default='parity'); ap.add_argument('--only', default='')
ap.add_argument('--three', default=os.path.join(here, 'vendor', 'three.min.js')); ap.add_argument('--tries', type=int, default=3); A = ap.parse_args()
names = [s['name'] for s in json.load(open(os.path.join(here, 'shots.json')))['shots']]
if A.only: names = [n for n in names if n in set(A.only.split(','))]
todo = list(names)
for t in range(A.tries):
    if not todo: break
    t0 = time.time()
    r = subprocess.run([sys.executable, '-c', SHIM, os.path.join(here, 'render-reference.py'), '--three', A.three, '--page', os.path.join(here, A.page),
                        '--out', A.out, '--only', ','.join(todo)], cwd=here, capture_output=True, text=True)
    done = [l.split(' ', 1)[1].strip() for l in r.stdout.splitlines() if l.startswith('wrote ')]
    for n in done: print('%-22s ok' % n, flush=True)
    todo = [n for n in todo if n not in done]
    if todo:
        last = (r.stderr or r.stdout).strip().splitlines()
        print('try %d (%.0f s): %d left; %s' % (t + 1, time.time() - t0, len(todo), last[-1][:160] if last else '?'), flush=True)
print('done' if not todo else 'FAILED: ' + ','.join(todo)); sys.exit(1 if todo else 0)

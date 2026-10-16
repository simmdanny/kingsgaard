"""Drive the dev build of Kingsgaard headless.
usage: python game.py OUTDIR script.js   (script.js is an async function body; it may call SHOT(name) -> saves OUTDIR/name.png)
env: SEED (default 1), W/H viewport (1280x720), DPR (1)"""
import sys, os, json, base64, asyncio, threading, http.server, socketserver, functools
from playwright.async_api import async_playwright
REPO = '/home/claude/kingsgaard'
THREE = '/tmp/claude-0/-home-claude/3ff3e752-b6a7-5d6f-84bf-7c847d7af443/scratchpad/three-r128/build/three.min.js'
out, scr = sys.argv[1], open(sys.argv[2]).read()
os.makedirs(out, exist_ok=True)
PORT = int(os.environ.get('PORT', '8791'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': int(os.environ.get('W', 1280)), 'height': int(os.environ.get('H', 720))}, device_scale_factor=float(os.environ.get('DPR', 1)))
        await pg.route('**/cdnjs.cloudflare.com/**three**', lambda r: r.fulfill(path=THREE, content_type='text/javascript'))
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERR ' + str(e)))
        def save(n, d):
            open(os.path.join(out, n + '.png'), 'wb').write(base64.b64decode(d.split(',', 1)[1])); print('wrote', n, flush=True)
        await pg.expose_function('pySave', save)
        await pg.goto(f'http://127.0.0.1:{PORT}/'+os.environ.get('PAGE','dist/kingsgaard.dev.html'), timeout=120000)
        await pg.wait_for_timeout(1500)
        await pg.wait_for_function('()=>window.__kk', timeout=120000)
        EV = lambda code: pg.evaluate('c=>window.__kk.ev(c)', code)
        for f in ['int-lib.js', 'ls-shot.js', 'wl-lib.js']:
            await EV(open(f'{REPO}/tests/{f}').read())
        await EV("""window.__shots={};window.__sh=function(n){renderer.render(scene,camera);return window.pySave(n,renderer.domElement.toDataURL('image/png')).then(()=>200);};0""")
        seed = int(os.environ.get('SEED', '1'))
        r = await EV(f"JSON.stringify(__wl.setup({seed}))")
        print('setup', r[:300], flush=True)
        res = await EV("(async()=>{const SHOT=n=>window.__sh(n);\n" + scr + "\n})()")
        print('result', json.dumps(res)[:4000] if res is not None else None)
        for l in logs[:30]: print(l[:300])
        await b.close()
asyncio.run(main())

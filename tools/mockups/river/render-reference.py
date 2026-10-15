"""Render the mockup's reference images (the target the game must match).
usage: python render-reference.py --three /path/to/three-r128/build/three.min.js [--out reference] [--only name,name]
Needs: pip install playwright; a Chromium (playwright install chromium, or PLAYWRIGHT_BROWSERS_PATH).
The page loads three r128 from cdnjs; it is served from --three instead (no network needed). Google Fonts are skipped."""
import asyncio, json, os, sys, argparse
from playwright.async_api import async_playwright
here=os.path.dirname(os.path.abspath(__file__))
ap=argparse.ArgumentParser();ap.add_argument('--three',required=True);ap.add_argument('--out',default=os.path.join(here,'reference'));ap.add_argument('--only',default='')
ap.add_argument('--page',default=os.path.join(here,'surface-study.html'));A=ap.parse_args()
cfg=json.load(open(os.path.join(here,'shots.json')));THREE=open(A.three,'rb').read();only=set(x for x in A.only.split(',') if x)
async def main():
    os.makedirs(A.out,exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":cfg['renderer']['viewport'][0],"height":cfg['renderer']['viewport'][1]},device_scale_factor=cfg['renderer']['pixelRatio'])
        await pg.route("https://cdnjs.cloudflare.com/**",lambda r:r.fulfill(status=200,body=THREE,content_type="application/javascript"))
        await pg.route("https://fonts.googleapis.com/**",lambda r:r.abort());await pg.route("https://fonts.gstatic.com/**",lambda r:r.abort())
        await pg.goto("file://"+os.path.abspath(A.page));await pg.wait_for_function("window.SS&&window.SS.ready",timeout=300000)
        await pg.evaluate("window.SS_FREEZE=true;document.getElementById('ui').style.display='none';")
        for s in cfg['shots']:
            if only and s['name'] not in only:continue
            t=s.get('time',cfg['time']);rock=s.get('rock','brown')
            js=f"SS.look('new');SS.rock('{rock}');water.visible=true;leaves.visible=true;flecks.visible=true;{s.get('js','')}WU.uTime.value={t};setView({s['cam']},{s['target']});SS.render();"
            await pg.evaluate(js);await pg.wait_for_timeout(300)
            await pg.screenshot(path=os.path.join(A.out,s['name']+'.png'),timeout=300000);print('wrote',s['name'])
        await b.close()
asyncio.run(main())

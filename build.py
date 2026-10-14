"""Build Kingsgaard (needs only Python 3).

  python build.py          -> dist/kingsgaard.html           (test hooks stripped, pure ASCII) + dist/assets/...
  python build.py --dev    -> dist/kingsgaard.dev.html       (keeps the local-test hooks used by tests/)

src/kingsgaard.html holds the game; the main menu lives in src/menu/ and is spliced in where the source has
/*@include menu/menu.css*/, <!--@include menu/menu.html--> and /*@include menu/menu.js*/.
The menu illustration (assets/menu/kingsgaard-menu.jpg) is copied next to the page and referenced by a relative URL."""
import re, sys, shutil, pathlib
here = pathlib.Path(__file__).parent
dev = '--dev' in sys.argv
src = (here / 'src' / 'kingsgaard.html').read_text(encoding='utf-8')

def include(m):
    p = here / 'src' / m.group(1)
    if not p.exists():
        sys.exit('missing include: %s' % p)
    return p.read_text(encoding='utf-8')
src = re.sub(r'/\*@include ([\w./-]+)\*/', include, src)
src = re.sub(r'<!--@include ([\w./-]+)-->', include, src)

if not dev:
    out, skip = [], False
    for line in src.split('\n'):
        if '<!--LOCALTEST-->' in line:
            continue
        if line.startswith('//LT-BEGIN'):
            skip = True
            continue
        if line.startswith('//LT-END'):
            skip = False
            continue
        if not skip:
            out.append(line)
    src = '\n'.join(out)
    bad = [c for c in src if ord(c) > 127]
    if bad:
        sys.exit('non-ASCII characters in the build (%d): use a JS escape sequence or an HTML entity' % len(bad))

art = here / 'assets' / 'menu' / 'kingsgaard-menu.jpg'
if not art.exists():
    sys.exit('missing menu illustration: %s (render it with tools/menu-art/render.html)' % art)
(here / 'dist' / 'assets' / 'menu').mkdir(parents=True, exist_ok=True)
shutil.copyfile(art, here / 'dist' / 'assets' / 'menu' / art.name)
name = 'kingsgaard.dev.html' if dev else 'kingsgaard.html'
(here / 'dist' / name).write_text(src, encoding='utf-8', newline='\n')
print('built dist/%s' % name, len(src), 'bytes')

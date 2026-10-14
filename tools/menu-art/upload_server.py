"""Receives the finished painting from render.html (a POSTed data URL) and writes it to ./out/NAME.jpg.
   Run:   python upload_server.py        (port 8766)
   Then:  python -m http.server 8774   in this folder, and open  http://localhost:8774/render.html?scale=2
   The 3840x2160 render posts 'art_final'; copy out/art_final.jpg to ../../assets/menu/kingsgaard-menu.jpg."""
import http.server, base64, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(D, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def _c(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', 'POST,OPTIONS')
    def do_OPTIONS(self):
        self.send_response(204); self._c(); self.end_headers()
    def do_POST(self):
        n = int(self.headers['Content-Length']); b = self.rfile.read(n).decode()
        name = os.path.basename(self.path.strip('/')) or 'shot.jpg'
        data = b.split(',', 1)[1] if ',' in b else b
        open(os.path.join(D, name), 'wb').write(base64.b64decode(data))
        self.send_response(200); self._c(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 8766), H).serve_forever()

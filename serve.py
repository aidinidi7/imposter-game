"""Lokaler Dev-Server ohne Browser-Cache, damit Aenderungen sofort sichtbar sind.

Start:   python serve.py        (Port 8080)
         python serve.py 3000   (anderer Port)
Beenden: Strg + C
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(NoCacheHandler, directory=str(ROOT))
with http.server.ThreadingHTTPServer(("", PORT), handler) as server:
    print(f"Imposter laeuft auf http://localhost:{PORT}  (Beenden mit Strg + C)")
    server.serve_forever()

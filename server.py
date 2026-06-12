"""
Digital Totem 本地开发服务器（带 CORS 代理）
- 8080 端口提供静态文件
- /api/* 请求自动代理到后端，绕过 CORS
"""
import http.server
import urllib.request
import json
import os
import sys

BACKEND = "https://7f50edaa-9bdb-4e88-beea-dbb364ef08fa.dev.coze.site"
PORT = 8080
DIR = os.path.dirname(os.path.abspath(__file__))

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy()
        else:
            self.send_error(404)

    def _proxy(self):
        url = BACKEND + self.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length else b''

        req = urllib.request.Request(
            url, data=body, method='POST',
            headers={
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'text/event-stream'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_headers = dict(resp.headers)
                content_type = resp_headers.get('Content-Type', 'application/json')

                self.send_response(resp.status)
                self.send_header('Content-Type', content_type)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()

                # 流式转发
                while True:
                    chunk = resp.read(1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()

        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    print(f"Digital Totem Dev Server")
    print(f"  Static:  http://localhost:{PORT}/demo.html")
    print(f"  Proxy:   /api/* -> {BACKEND}/api/*")
    print(f"  Dir:     {DIR}")
    print()

    server = http.server.HTTPServer(('', PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

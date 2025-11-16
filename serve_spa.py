#!/usr/bin/env python3
import http.server
import socketserver
import os

ROOT = os.path.abspath(os.path.dirname(__file__))
INDEX_PATH = os.path.join(ROOT, 'dist', 'index.html')

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve from repo root so /assets and /dist assets are available
        path = path.split('?',1)[0].split('#',1)[0]
        relpath = path.lstrip('/')
        fullpath = os.path.join(ROOT, relpath)
        return fullpath

    def do_GET(self):
        # Attempt to serve static file; on 404, fallback to dist/index.html for SPA routes
        requested = self.translate_path(self.path)
        # Temporary redirect: map /present to investigation page since dist lacks that route
        if self.path == '/present':
            self.send_response(302)
            self.send_header('Location', '/investigation/ITOM-4412')
            self.end_headers()
            return
        if self.path in ('/', '/index.html'):
            return self._serve_index()
        if os.path.isdir(requested):
            # Directory requested; try index.html within
            index_in_dir = os.path.join(requested, 'index.html')
            if os.path.exists(index_in_dir):
                self.path = self.path.rstrip('/') + '/index.html'
                return http.server.SimpleHTTPRequestHandler.do_GET(self)
        # Resolve assets carefully: first try project root, then dist/assets for built files
        if os.path.exists(requested):
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        if self.path.startswith('/assets/'):
            alt = os.path.join(ROOT, 'dist', self.path.lstrip('/'))
            if os.path.exists(alt):
                # Temporarily rewrite path so base handler serves the correct file with proper MIME
                self.path = '/dist' + self.path
                return http.server.SimpleHTTPRequestHandler.do_GET(self)
        return self._serve_index()

    def _serve_index(self):
        try:
            with open(INDEX_PATH, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, f'Error serving index: {e}')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8081'))
    with socketserver.TCPServer(('', port), SPARequestHandler) as httpd:
        print(f"Serving SPA on http://localhost:{port}")
        httpd.serve_forever()



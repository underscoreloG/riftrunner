// Tiny static server for local testing: node serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const port = parseInt(process.argv[2] || '5311', 10);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/riftrunner.html';
  const fp = path.join(__dirname, u);
  if (!fp.startsWith(__dirname)) { r.writeHead(403); return r.end(); }
  fs.readFile(fp, (e, d) => { if (e) { r.writeHead(404); return r.end('not found'); } r.writeHead(200, { 'Content-Type': T[path.extname(fp)] || 'text/plain', 'Cache-Control': 'no-store' }); r.end(d); });
}).listen(port, () => console.log('serving on', port));

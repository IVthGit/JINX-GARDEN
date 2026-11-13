// Runs one of the checks in this folder against a copy of the game served from here.
//   node tests/run.cjs smoke            one check (see README.md for the names)
//   node tests/run.cjs quick            the fast ones, one after another
//   node tests/run.cjs stage -- args    anything after the name is passed on
// Pictures and sound files go to tests/out/, which git ignores.
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..'), PORT = +(process.env.JINX_PORT || 8765);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const QUICK = ['smoke', 'garden', 'shows', 'kinds-save', 'abilities'];
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
// The checks run one at a time, without blocking: this process has to keep serving the game to them.
function runOne(file, args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit', env: Object.assign({}, process.env, { JINX_URL: `http://localhost:${PORT}/index.html` }) });
    child.on('exit', (status) => done(status || 0));
    child.on('error', () => done(1));
  });
}
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is in use. Stop what is using it, or set JINX_PORT.` : String(e)); process.exit(1); });
server.listen(PORT, async () => {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const [name, ...rest] = process.argv.slice(2);
  const names = !name || name === 'quick' ? QUICK : [name];
  let code = 0;
  for (const n of names) {
    const file = path.join(__dirname, n + '.cjs');
    if (!fs.existsSync(file)) { console.error('No such check: ' + n); code = 1; continue; }
    console.log('== ' + n);
    const status = await runOne(file, rest.filter((a) => a !== '--'));
    if (status) code = status;
  }
  server.close();
  process.exit(code);
});

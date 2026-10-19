// Concatenates src/*.js (sorted) into src/shell.html -> riftrunner.html (single standalone file)
// Usage: node build.js [--slice]   (--slice skips src/18_* and 25_* expansion files: sector 1 only)
const fs = require('fs'), path = require('path');
const dir = __dirname, src = path.join(dir, 'src');
const slice = process.argv.includes('--slice');
const files = fs.readdirSync(src).filter(f => f.endsWith('.js') && !(slice && (f.startsWith('18_') || f.startsWith('25_')))).sort();
let js = files.map(f => `\n/* ---------- ${f} ---------- */\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const shell = fs.readFileSync(path.join(src, 'shell.html'), 'utf8');
const out = shell.replace('/*__JS__*/', () => js);
const target = path.join(dir, slice ? 'riftrunner-slice.html' : 'riftrunner.html');
fs.writeFileSync(target, out);
// syntax check of the concatenated script
try { new Function(js); console.log('syntax OK'); } catch (e) { console.log('SYNTAX ERROR:', e.message); process.exitCode = 1; }
console.log('wrote', path.basename(target), (out.length / 1024).toFixed(1) + ' KB from', files.length, 'files');

// Every language must have exactly the same keys as Russian, and every key used in js/*.js must exist.
global.window = {};
const fs = require('fs'),
  path = require('path');
const dir = path.join(__dirname, '..', 'i18n');
for (const f of fs.readdirSync(dir)) require(path.join(dir, f));
const I = global.window.DTZ_I18N,
  base = Object.keys(I.ru);
let bad = 0;
for (const l of Object.keys(I)) {
  const miss = base.filter(k => !(k in I[l])),
    extra = Object.keys(I[l]).filter(k => !(k in I.ru));
  if (miss.length || extra.length) {
    bad++;
    console.log(l, 'missing', miss, 'extra', extra);
  }
}
const used = new Set(
  (
    fs
      .readdirSync(path.join(__dirname, '..', 'js'))
      .map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'))
      .join('\n')
      .match(/(?<![A-Za-z_.$])t\('[a-z0-9.]+[a-z0-9]'/g) || []
  ).map(s => s.slice(s.indexOf("'") + 1, -1))
);
const missing = [...used].filter(k => !(k in I.ru) && !/^(speak\.teil|speak\.how|tour\.h|tour\.p)$/.test(k));
if (missing.length) {
  bad++;
  console.log('used but missing:', missing);
}
if (Object.keys(I).length !== 12) {
  bad++;
  console.log('expected 12 languages, got', Object.keys(I).length);
}
if (bad) process.exit(1);
console.log('i18n ok:', Object.keys(I).length, 'languages,', base.length, 'keys');

const fs = require('fs');
const p = 'src/views/Login/Index.vue';
let c = fs.readFileSync(p, 'utf8');

const patterns = [
  '    <div class="tui-login-page">\r\n    <video\r\n      class="tui-login-bg-video"',
  '    <div class="tui-login-page">\n    <video\n      class="tui-login-bg-video"',
];
const repl = (c.includes('\r\n') ? '\r\n' : '\n');
const line = '    <div class="tui-login-page">' + repl
  + '    <div class="tui-login-bg-fallback" aria-hidden="true"></div>' + repl
  + '    <video' + repl
  + '      v-if="videoReady"' + repl
  + '      class="tui-login-bg-video"';

let replaced = false;
for (const p2 of patterns) {
  if (c.includes(p2)) {
    c = c.replace(p2, line);
    replaced = true;
    console.log('template replaced (pattern with', p2.includes('\r\n') ? 'CRLF' : 'LF', ')');
    break;
  }
}
if (!replaced) {
  // regex fallback
  const re = /(\s+<div class="tui-login-page">)\r?\n(\s+<video)\r?\n\s+class="tui-login-bg-video"/;
  const m = c.match(re);
  if (m) {
    c = c.replace(re, `\${1}${repl}    <div class="tui-login-bg-fallback" aria-hidden="true"></div>${repl}    <video${repl}      v-if="videoReady"${repl}      class="tui-login-bg-video"`);
    replaced = true;
    console.log('template replaced (regex fallback)');
  }
}
if (!replaced) {
  console.log('ERROR: pattern not found. context:');
  const idx = c.indexOf('tui-login-page');
  console.log(JSON.stringify(c.substring(Math.max(0, idx-5), idx+150)));
  process.exit(1);
}

fs.writeFileSync(p, c);
console.log('OK');

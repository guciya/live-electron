const fs = require('fs');
const p = 'src/views/Login/Index.vue';
let c = fs.readFileSync(p, 'utf8');

// 1. 修复 ${1} 残留
c = c.replace('<UIKitProvider theme="dark">${1}', '<UIKitProvider theme="dark">');

// 2. 在 UIKitProvider 开标签后插入 tui-login-page div
if (!c.includes('<div class="tui-login-page">')) {
  c = c.replace(
    /(<UIKitProvider theme="dark">\s*)(<div class="tui-login-bg-fallback)/,
    '$1<div class="tui-login-page">' + (c.includes('\r\n') ? '\r\n' : '\n') + '    $2'
  );
  console.log('added tui-login-page div');
}

// 3. 修复多余的 </div>
// 找模板中最后的 </div>（在 </UIKitProvider> 之前）
const tmplEnd = c.indexOf('</UIKitProvider>');
const beforeClose = c.substring(0, tmplEnd);
// 从末尾往前找 </div>
let lastDivClose = beforeClose.lastIndexOf('</div>');
// 倒数第二个
let secondLast = beforeClose.lastIndexOf('</div>', lastDivClose - 1);
// 如果 lastDivClose 在 secondLast 之后（说明多了一个）
if (lastDivClose > secondLast) {
  // 检查是不是连续两个 </div>
  const tail = beforeClose.substring(lastDivClose - 20);
  console.log('tail before UIKitProvider close:', JSON.stringify(tail));
  // 删掉最后那个多余的 </div>
  c = c.substring(0, lastDivClose) + c.substring(lastDivClose + 6);
  console.log('removed extra closing </div>');
}

fs.writeFileSync(p, c);
console.log('OK');

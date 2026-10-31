import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.';
const apply = process.argv.includes('--fix');
const D = '$';

function walk(d, out = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* 匹配"独占一行的块级公式定界符"：
   > $      或   > $$      或   $   /  $$
   （允许行首有引用块前缀和空白，行尾只有空白）
   单 $ = 旧写法（问题）  双 $$ = 标准写法（合规） */
const soloDollar = new RegExp('^(\\s*(?:>\\s*)*)\\' + D + '(\\s*\\' + D + ')?\\s*$');

const files = walk(root);
let good = 0, bad = 0;
const badFiles = new Map();
const samples = [];
const fixes = [];

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const lines = raw.split('\n');
  let inFence = false;
  let changed = false;
  const out = lines.map((l) => {
    if (/^\s*(?:>\s*)?(```|~~~)/.test(l)) { inFence = !inFence; return l; }
    if (inFence) return l;
    const m = soloDollar.exec(l);
    if (!m) return l;
    if (m[2] !== undefined) { good++; return l; }          // 已经是 $$
    bad++;
    badFiles.set(f, (badFiles.get(f) ?? 0) + 1);
    if (samples.length < 10) samples.push(`${f}:${lines.indexOf(l) + 1}  [${l}]`);
    changed = true;
    return `${m[1]}${D}${D}`;                               // 单 $ → $$
  });
  if (changed) fixes.push({ f, content: out.join('\n') });
}

console.log(`【标准】独占一行的 \`$$\` 定界符:  ${good}`);
console.log(`【问题】独占一行的单 \`$\` 定界符:  ${bad}`);
console.log(`\n受影响文件（前 12）:`);
[...badFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([f, c]) => console.log(`  ${String(c).padStart(4)}  ${f}`));
console.log('\n样例:');
samples.forEach((s) => console.log('  ' + s));

if (apply) {
  for (const { f, content } of fixes) writeFileSync(f, content, 'utf8');
  console.log(`\n✅ 已修复 ${fixes.length} 个文件、共 ${bad} 处定界符（单 $ → $$）`);
} else {
  console.log('\n（加 --fix 执行修复）');
}

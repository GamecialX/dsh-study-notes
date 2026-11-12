#!/usr/bin/env node
/**
 * 修复"反斜杠被吃掉"的两类损坏（R13）。
 *
 *   node templates/fix-math-escapes.mjs "<笔记根目录>" [--dry-run]
 *
 * A 类：数学环境里写成 `\\cmd`（TeX 的 `\\` 是换行）→ 收敛成单个 `\`。
 * B 类：控制字符（BEL/BS/TAB/VT/FF）——数学里恢复成 `\`+字母，正文里恢复成字母本身。
 *
 * 只改 .md，保留原行尾（LF/CRLF）。修完请重跑 check-library 并 rebuild 门户数据。
 */
import fs from 'node:fs';
import path from 'node:path';

const LETTER = { '\x07': 'a', '\x08': 'b', '\t': 't', '\x0b': 'v', '\x0c': 'f' };

const COMMANDS =
  'alpha|approx|arg|bar|begin|beta|big|binom|bot|bullet|cdot|cdots|cos|delta|dots|ell|' +
  'emptyset|end|epsilon|eta|exp|forall|frac|gamma|ge|geq|hat|in|infty|int|lambda|langle|' +
  'ldots|le|left|leq|log|lfloor|lvert|mathbf|mathbb|mathcal|mathrm|max|mid|min|mu|nabla|' +
  'ne|neq|nu|odot|omega|oplus|otimes|overline|parallel|partial|phi|pi|pm|prod|qquad|quad|' +
  'rho|rightarrow|rfloor|right|rvert|sigma|sim|sqrt|sum|tanh|tau|text|tfrac|theta|tilde|' +
  'times|to|top|underbrace|varepsilon|vec|vert|Vert|varphi|wedge|widehat|widetilde|xi|zeta';

const DD = new RegExp(`\\\\\\\\(?=(?:${COMMANDS})(?![A-Za-z]))`, 'g');
const INLINE = /(?<!\$)\$[^$\n]+\$(?!\$)/g;
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'archive', '_维护', '_skill']);

function fixLine(line, inBlock) {
  let out = line;
  if (inBlock) out = out.replace(DD, '\\');
  else out = out.replace(INLINE, (m) => m.replace(DD, '\\'));

  const chars = [...out];
  let touched = false;
  for (let i = 0; i < chars.length; i += 1) {
    if (!(chars[i] in LETTER)) continue;
    touched = true;
  }
  if (!touched) return out;

  // 位置 → 是否落在数学区间（行内公式 + 整块公式）
  const spans = [...out.matchAll(INLINE)].map((m) => [m.index, m.index + m[0].length]);
  if (inBlock) spans.push([0, out.length]);
  const inside = (pos) => spans.some(([a, b]) => pos >= a && pos < b);

  let res = '';
  for (let i = 0; i < out.length; i += 1) {
    const ch = out[i];
    if (ch in LETTER) res += inside(i) ? `\\${LETTER[ch]}` : LETTER[ch];
    else res += ch;
  }
  return res;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, files);
    } else if (name.endsWith('.md')) files.push(p);
  }
  return files;
}

const root = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!root) {
  console.error('用法：node templates/fix-math-escapes.mjs "<笔记根目录>" [--dry-run]');
  process.exit(2);
}

let files = 0;
let linesChanged = 0;
for (const file of walk(path.resolve(root))) {
  const raw = fs.readFileSync(file, 'utf8');
  const sep = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(sep);
  let block = false;
  let touched = false;
  for (let i = 0; i < lines.length; i += 1) {
    const head = lines[i].trimStart();
    const next = head.startsWith('$$') ? fixLine(lines[i], block || head.trim() === '$$') : fixLine(lines[i], block);
    if (head.startsWith('$$') && head.trim() === '$$') block = !block;
    if (next !== lines[i]) {
      lines[i] = next;
      touched = true;
      linesChanged += 1;
    }
  }
  if (touched) {
    files += 1;
    console.log(`${dry ? 'would fix' : 'fix'}: ${path.relative(path.resolve(root), file)}`);
    if (!dry) fs.writeFileSync(file, lines.join(sep), 'utf8');
  }
}
console.log(`changed files=${files} lines=${linesChanged}${dry ? '（dry-run，未写入）' : ''}`);

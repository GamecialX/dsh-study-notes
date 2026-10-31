#!/usr/bin/env node
/**
 * callout-to-blockquote.mjs —— 把旧式标注全库改成"普通引用块 + HTML 加粗斜体标签"
 *
 * 能处理两种旧写法：
 *
 *   > [!note] 本节导读          →   > <b>*Note*</b>
 *   > 正文……                         > 本节导读
 *                                     > 正文……
 *
 *   > **Note**: 本节导读        →   （同上；这是上一版迁移脚本留下的写法）
 *
 * 为什么是 <b>*Note*</b>：用户的 Typora 主题（claudette）不显示 Markdown 的 **粗体**，
 * HTML 的 <b> 在 Typora / VS Code / GitHub / 门户里都能显示，`*Note*` 叠出斜体。
 * 标签独占一行、标题放下一行，门户据此把它渲染成标注框。
 *
 * 【类型映射】
 *   note → Note    tip → Tip    important → Important    warning → Warning    caution → Caution
 *   其余 callout 类型（example、quote……）不动，交给校验器提示。
 *
 * 幂等：已经是新写法的行不会被再动。
 *
 * 用法：node callout-to-blockquote.mjs "<笔记根目录>" [--dry-run]
 *   默认直接改写；加 --dry-run 只统计、不写盘。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!root || root.startsWith('--')) {
  console.error('用法：node callout-to-blockquote.mjs "<根>" [--dry-run]');
  process.exit(2);
}

const LABEL = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

function listMd(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (dir === root && ['code', 'web'].includes(e.name)) continue;
      listMd(full, out);
    } else if (extname(e.name).toLowerCase() === '.md') out.push(full);
  }
  return out;
}

/* 结尾用 [\s\S]* 而不是 [ \t]*：CRLF 文件里 \r 会让整行匹配失败（已先统一行尾，这里双保险） */
const CALLOUT = /^(\s*(?:>\s*)+)\[!(\w+)\][+-]?([\s\S]*)$/u;
const BOLD_LABEL = /^(\s*(?:>\s*)+)\*\*(Note|Tip|Important|Warning|Caution)\*\*\s*:?([\s\S]*)$/u;

let nFiles = 0, nConv = 0;
const hist = {};
const samples = [];

for (const f of listMd(root)) {
  const raw = readFileSync(f, 'utf8').replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
  const lines = raw.split('\n');
  let inFence = false;
  let changed = 0;
  const out = [];

  for (const line of lines) {
    if (/^\s*(?:>\s*)*(```|~~~)/u.test(line)) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    let prefix, key, title;
    const c = CALLOUT.exec(line);
    const b = c ? null : BOLD_LABEL.exec(line);
    if (c) [, prefix, key, title] = c;
    else if (b) [, prefix, key, title] = b;
    else { out.push(line); continue; }
    const label = LABEL[key.toLowerCase()];
    if (!label) { out.push(line); continue; }
    changed += 1;
    hist[label] = (hist[label] ?? 0) + 1;
    const p = prefix.replace(/\s+$/u, '') + ' ';
    out.push(`${p}<b>*${label}*</b>`);
    if (title.trim()) out.push(`${p}${title.trim()}`);
    if (samples.length < 10) samples.push(`${line.trim()}   →   ${p.trim()} <b>*${label}*</b>${title.trim() ? ' ⏎ ' + title.trim() : ''}`);
  }

  const next = out.join('\n');
  if (next !== raw) {
    nFiles += 1; nConv += changed;
    if (!dryRun) writeFileSync(f, next, 'utf8');
  }
}

console.log(`${dryRun ? '[dry-run] ' : ''}改了 ${nFiles} 个文件，共 ${nConv} 处旧式标注转成 \`> <b>*Label*</b>\``);
if (nConv) {
  console.log('\n按类型统计：');
  for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(10)} ${String(v).padStart(4)} 处`);
  console.log('\n样例：');
  samples.forEach((s) => console.log('  ' + s));
}

#!/usr/bin/env node
/**
 * fix-mathbb.mjs —— 把 \mathbb{X} 批量换成 unicode 花体字母。
 *
 * 为什么要换：Typora 1.14 内置 MathJax 4，同步渲染路径遇到「首次使用的字形族」会抛
 * MathJax retry（异步才行），编辑器于是把整条公式退回源码。实测 \mathbb 是唯一稳定
 * 触发的宏；\mathbf、\mathrm、\mathcal、\ell 都正常。换完公式在 Typora 与门户 KaTeX
 * 里都能正常显示。
 *
 * 用法：
 *   node fix-mathbb.mjs "<笔记根目录>"          # 真改
 *   node fix-mathbb.mjs "<笔记根目录>" --dry    # 只看会改哪些文件、多少处
 *
 * 只动 .md / .js / .json（正文、题库、门户数据）；跳过 _维护/archive、_旧版存档、
 * _v2/_scratch、backup 这类历史目录。
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
const dry = process.argv.includes("--dry");
if (!root) {
  console.error('用法: node fix-mathbb.mjs "<笔记根目录>" [--dry]');
  process.exit(2);
}
if (!fs.existsSync(root)) {
  console.error(`目录不存在: ${root}`);
  process.exit(2);
}

/** U+1D538 起是「数学双线体大写字母」，其中 C H N P Q R Z 有历史码位（ℂ ℍ ℕ ℙ ℚ ℝ ℤ）。 */
const LETTERS = {
  A: "\u{1D538}", B: "\u{1D539}", C: "\u2102", D: "\u{1D53B}", E: "\u{1D53C}",
  F: "\u{1D53D}", G: "\u{1D53E}", H: "\u210D", I: "\u{1D540}", J: "\u{1D541}",
  K: "\u{1D542}", L: "\u{1D543}", M: "\u{1D544}", N: "\u2115", O: "\u{1D546}",
  P: "\u2119", Q: "\u211A", R: "\u211D", S: "\u{1D54A}", T: "\u{1D54B}",
  U: "\u{1D54C}", V: "\u{1D54D}", W: "\u{1D54E}", X: "\u{1D54F}", Y: "\u{1D550}",
  Z: "\u2124",
};

const SKIP = [
  /[\\/]_维护[\\/]archive[\\/]/u,
  /[\\/]_旧版存档[\\/]/u,
  /[\\/]_v2[\\/]_scratch[\\/]/u,
  /[\\/]backup[\\/]/u,
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((re) => re.test(p))) continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(md|js|json)$/u.test(e.name)) out.push(p);
  }
  return out;
}

function convert(text) {
  let n = 0;
  const out = text.replace(/\\mathbb\s*\{\s*([A-Za-z0-9])\s*\}/gu, (_m, ch) => {
    n += 1;
    if (/[A-Z]/u.test(ch)) return LETTERS[ch];
    if (/[a-z]/u.test(ch)) return ch; // \mathbb{a} 极罕见，退回普通字母
    return `\\mathbf{${ch}}`; // 指示函数 \mathbb{1} → \mathbf{1}
  });
  return { out, n };
}

let files = 0;
let total = 0;
for (const f of walk(root)) {
  const before = fs.readFileSync(f, "utf8");
  if (!before.includes("\\mathbb")) continue;
  const { out, n } = convert(before);
  const leftover = (out.match(/\\mathbb/gu) || []).length;
  files += 1;
  total += n;
  console.log(`${dry ? "[dry] " : ""}${String(n).padStart(4)} 处 -> ${path.relative(root, f)}${leftover ? `  (残留 ${leftover}，需要手工看)` : ""}`);
  if (!dry) fs.writeFileSync(f, out, "utf8");
}
console.log(`\n${dry ? "[dry] " : ""}共 ${files} 个文件, ${total} 处替换`);
if (!dry && total) console.log("下一步：重跑 node _维护/build.mjs（若题库变了），再跑 check-library --strict 复核。");

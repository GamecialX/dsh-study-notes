#!/usr/bin/env node
/* migrate-theme.mjs — 把 v3.2 之前的 HTML 学习库迁到「宽幅演示卡」主题
 *
 * 用法：
 *   node migrate-theme.mjs --lib <库根目录>           # 迁移（自动备份）
 *   node migrate-theme.mjs --lib <库根目录> --dry-run # 只报告，不改
 *
 * 做三件事（只动 CSS，不碰正文与页面）：
 *   1. 用插件当前的 templates/html/src/css/theme.css 整份替换库里的 src/css/theme.css
 *      （原文件先备份成 theme.css.bak-yyyyMMdd-HHmmss）；
 *   2. 删掉 theme-course.css 里早期手工贴的「演示卡放大补丁」段；
 *   3. 注释掉 theme-course.css 里 v3.2 之前为宽演示卡写的折行规则
 *      （@media (max-width:…){ .demo.demo-wide{grid-template-columns:1fr} … }，
 *       新主题已接管，留着会让说明栏继续掉到画布下方）。
 *
 * 零依赖，只用 node 内置模块。
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const libArg = (() => { const i = args.indexOf("--lib"); return i >= 0 ? args[i + 1] : ""; })();
const dryRun = args.includes("--dry-run");

if (!libArg) {
  console.log("用法：node migrate-theme.mjs --lib <库根目录> [--dry-run]");
  process.exit(2);
}
const lib = resolve(libArg);
const themePath = join(lib, "src", "css", "theme.css");
const overlayPath = join(lib, "src", "css", "theme-course.css");
const templatePath = join(scriptDir, "..", "templates", "html", "src", "css", "theme.css");

if (!existsSync(themePath)) {
  console.log("[跳过] " + lib + " 不是 HTML 学习库（没有 src/css/theme.css）");
  process.exit(2);
}
if (!existsSync(templatePath)) {
  console.log("[错误] 找不到插件模板：" + templatePath);
  process.exit(1);
}

const template = readFileSync(templatePath, "utf8");
if (!template.includes("--demo-w")) {
  console.log("[错误] 模板还不是 v3.2（没有 --demo-w），先升级插件。");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
let changed = 0;
const report = [];

/* ---------- 1. theme.css ---------- */
const current = readFileSync(themePath, "utf8");
if (current === template) {
  report.push("theme.css 已是 v3.2 模板，跳过");
} else if (current.includes("--demo-w")) {
  report.push("theme.css 已含宽幅规则（可能是手工版），跳过；如需换成模板请先备份再手动替换");
} else if (dryRun) {
  report.push("theme.css 将替换为模板（" + Buffer.byteLength(current) + " → " + Buffer.byteLength(template) + " 字节）");
  changed++;
} else {
  const bak = themePath + ".bak-" + stamp;
  copyFileSync(themePath, bak);
  writeFileSync(themePath, template, "utf8");
  report.push("theme.css 已替换（" + Buffer.byteLength(current) + " → " + Buffer.byteLength(template) + " 字节，备份 " + bak.split("\\").pop() + "）");
  changed++;
}

/* ---------- 2/3. theme-course.css ---------- */
function braceEnd(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function lineOf(text, idx) { return text.slice(0, idx).split("\n").length; }

function stripPatchBlock(text) {
  let out = text;
  let removed = 0;
  for (let guard = 0; guard < 10; guard++) {
    const m = out.indexOf("演示卡放大补丁");
    if (m < 0) break;
    const start = out.lastIndexOf("/*", m);
    if (start < 0) break;
    const open = out.indexOf("{", start);
    if (open < 0) break;
    const end = braceEnd(out, open);
    if (end < 0) break;
    // 收尾：连同一行尾部空白一起去掉
    let cutEnd = end + 1;
    while (cutEnd < out.length && (out[cutEnd] === "\r" || out[cutEnd] === "\n")) cutEnd++;
    out = out.slice(0, start).replace(/\s+$/, "\n") + out.slice(cutEnd);
    removed++;
  }
  return { text: out, removed };
}

function commentSpans(text) {
  const spans = [];
  let i = 0;
  while (i < text.length) {
    const s = text.indexOf("/*", i);
    if (s < 0) break;
    const e = text.indexOf("*/", s + 2);
    if (e < 0) { spans.push([s, text.length]); break; }
    spans.push([s, e + 2]);
    i = e + 2;
  }
  return spans;
}

function commentLegacyWide(text) {
  let out = text;
  const blocks = [];
  const inComment = (idx) => commentSpans(out).some(([a, b]) => idx >= a && idx < b);
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(out)) && blocks.length < 20) {
    if (inComment(m.index)) continue;
    const open = m.index + m[0].length - 1;
    const end = braceEnd(out, open);
    if (end < 0) continue;
    const body = out.slice(open + 1, end);
    const selectors = body.split("{").slice(0, -1).map((s) => s.split("}").pop().trim()).filter(Boolean);
    const allWide = selectors.length > 0 && selectors.every((s) => s.replace(/\s+/g, "").startsWith(".demo.demo-wide"));
    if (!allWide) continue;
    blocks.push({ start: m.index, end: end + 1, line: lineOf(out, m.index) });
    re.lastIndex = end;
  }
  for (const b of blocks.reverse()) {
    const block = out.slice(b.start, b.end);
    out = out.slice(0, b.start) +
      "/* [迁移 v3.2] 旧版「宽 demo 折行」规则已由 theme.css 接管，整段注释掉；确认后可删除。\n" +
      block + "\n*/" + out.slice(b.end);
  }
  return { text: out, blocks };
}

if (existsSync(overlayPath)) {
  const before = readFileSync(overlayPath, "utf8");
  let t = before;
  const patch = stripPatchBlock(t);
  t = patch.text;
  const legacy = commentLegacyWide(t);
  t = legacy.text;
  if (t !== before) {
    if (dryRun) {
      report.push("theme-course.css 将改动：" +
        (patch.removed ? "删掉 " + patch.removed + " 段旧补丁；" : "") +
        (legacy.blocks.length ? "注释掉 " + legacy.blocks.length + " 段旧折行规则（第 " + legacy.blocks.map((b) => b.line).join("、") + " 行）" : ""));
      changed++;
    } else {
      const bak = overlayPath + ".bak-" + stamp;
      copyFileSync(overlayPath, bak);
      writeFileSync(overlayPath, t, "utf8");
      report.push("theme-course.css 已改动：" +
        (patch.removed ? "删掉 " + patch.removed + " 段旧补丁；" : "") +
        (legacy.blocks.length ? "注释掉 " + legacy.blocks.length + " 段旧折行规则（第 " + legacy.blocks.map((b) => b.line).join("、") + " 行）" : "") +
        "，备份 " + bak.split("\\").pop());
      changed++;
    }
  } else {
    report.push("theme-course.css 无需改动");
  }
} else {
  report.push("没有 theme-course.css（本库只用默认主题）");
}

console.log("库：" + lib);
for (const line of report) console.log("  · " + line);
console.log("");
if (!changed) {
  console.log("结果：无需改动（已是 v3.2 或已迁移）。");
} else if (dryRun) {
  console.log("结果：这是 --dry-run，未写入任何文件。去掉 --dry-run 再跑一次即生效。");
} else {
  console.log("结果：迁移完成。建议接着跑：node <skill>/scripts/html-lint.mjs \"" + lib + "\"");
  console.log("并双击抽查一节带演示的页面（宽屏下画布应约 1030，而不是 619）。");
}

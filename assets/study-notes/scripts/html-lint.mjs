#!/usr/bin/env node
/* html-lint.mjs — HTML 学习库的机检（L0 形状 error / L1 节内弱检 warning）
 *
 * 用法：
 *   node html-lint.mjs <库根目录>
 *   node html-lint.mjs <库根目录> --strict     # L1 也按 error 算（HTML14 除外）
 *   node html-lint.mjs <库根目录> --json       # 机器可读
 *
 * 规则见 references/html-line.md 第 7 节。零依赖，只用 node 内置模块。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, relative, posix } from "node:path";

const args = process.argv.slice(2);
const root = resolve(args.find((a) => !a.startsWith("--")) || ".");
const strict = args.includes("--strict");
const asJson = args.includes("--json");

const errors = [];
const warnings = [];
const stats = { pages: 0, chapters: 0, sections: 0, bytes: 0 };
function err(rule, file, msg) { errors.push({ rule, file, msg }); }
function warn(rule, file, msg) { warnings.push({ rule, file, msg }); }
function rel(p) { return relative(root, p).split("\\").join("/"); }
function read(p) { return readFileSync(p, "utf8"); }

/* ---------- manifest ---------- */
const manifestPath = join(root, "manifest.json");
let manifest = null;
if (!existsSync(manifestPath)) {
  err("HTML01", "manifest.json", "缺少 manifest.json");
} else {
  try {
    manifest = JSON.parse(read(manifestPath));
    if (manifest.schema !== "study-notes-html/1") err("HTML01", "manifest.json", "schema 必须是 study-notes-html/1，实际是 " + manifest.schema);
    if (!Array.isArray(manifest.chapters) || !manifest.chapters.length) err("HTML01", "manifest.json", "chapters 必须是非空数组");
  } catch (e) {
    err("HTML01", "manifest.json", "不是合法 JSON：" + e.message);
  }
}

/* ---------- 收集页面 ---------- */
const pages = [];      // { path, lesson, meta }
const manifestFiles = new Set();
const lessonSet = new Set();
if (manifest) {
  for (const ch of manifest.chapters) {
    stats.chapters++;
    if (ch.file) manifestFiles.add(ch.file);
    for (const s of ch.sections || []) {
      stats.sections++;
      manifestFiles.add(s.file);
      const lid = s.lesson || (ch.id + "/" + s.id);
      lessonSet.add(lid);
      pages.push({ path: join(root, s.file), lesson: lid, kind: "section", chapter: ch.id });
    }
    if (ch.file) pages.push({ path: join(root, ch.file), lesson: "", kind: "chapter", chapter: ch.id });
  }
  pages.push({ path: join(root, "index.html"), lesson: "", kind: "index", chapter: "" });
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}
const diskHtml = existsSync(root) ? walk(root, []) : [];

/* ---------- 逐页检查 ---------- */
const RES_ATTR = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const LOCAL_ABS = /(?:[A-Za-z]:[\\/]|file:\/\/\/|\/Users\/|\/home\/)/;
const CALC_FNS = ["ceil", "floor", "round", "abs", "min", "max", "sqrt"];

for (const page of pages) {
  if (!existsSync(page.path)) {
    if (page.kind === "index" && !manifest) continue;
    err("HTML02", rel(page.path), "manifest 里登记了但文件不存在");
    continue;
  }
  const html = read(page.path);
  stats.pages++;
  stats.bytes += Buffer.byteLength(html, "utf8");
  const file = rel(page.path);
  const isSection = page.kind === "section";

  // HTML07 宿主声明
  const m = /<body([^>]*)>/i.exec(html);
  const attrs = m ? m[1] : "";
  function attr(name) { const r = new RegExp(name + '\\s*=\\s*"([^"]*)"', "i").exec(attrs); return r ? r[1] : ""; }
  if (isSection) {
    if (!attr("data-lesson")) err("HTML07", file, "body 缺 data-lesson");
    else if (!lessonSet.has(attr("data-lesson"))) err("HTML07", file, "data-lesson=" + attr("data-lesson") + " 在 manifest 里找不到");
    if (attr("data-lesson") && attr("data-lesson") !== page.lesson) err("HTML07", file, "data-lesson 与 manifest 不一致（应为 " + page.lesson + "）");
    if (!attr("data-chapter")) err("HTML07", file, "body 缺 data-chapter");
    if (!attr("data-root")) err("HTML07", file, "body 缺 data-root（相对库根的路径前缀）");
  }
  if (!attr("data-track")) err("HTML07", file, "body 缺 data-track");
  if (!attr("data-title")) err("HTML07", file, "body 缺 data-title");

  // HTML03 资源存在 / HTML04 不许外链 / HTML05 不许本机绝对路径
  let mm;
  RES_ATTR.lastIndex = 0;
  while ((mm = RES_ATTR.exec(html))) {
    const v = mm[1].trim();
    if (!v || v.startsWith("#") || v.startsWith("data:") || v.startsWith("mailto:")) continue;
    if (/^https?:\/\//i.test(v)) { err("HTML04", file, "引用了外链资源：" + v); continue; }
    if (/^\/\//.test(v)) { err("HTML04", file, "引用了协议相对外链：" + v); continue; }
    if (LOCAL_ABS.test(v)) { err("HTML05", file, "写了本机绝对路径：" + v); continue; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) continue;
    const clean = v.split("?")[0].split("#")[0];
    if (!clean) continue;
    const target = resolve(dirname(page.path), decodeURIComponent(clean));
    if (!existsSync(target)) err("HTML03", file, "链接目标不存在：" + v);
  }

  // HTML05 正文里也不许出现本机绝对路径
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  if (LOCAL_ABS.test(bodyText)) {
    const first = (LOCAL_ABS.exec(bodyText) || [])[0];
    err("HTML05", file, "正文出现本机绝对路径（" + first + "…）");
  }

  // HTML06 file:// 会坏掉的东西
  // 代码样例（<pre> 里的内容）不算页面行为：python 的 import math 不该被当成 ES import
  const scanAll = html.replace(/<pre[\s\S]*?<\/pre>/gi, " ");
  const scanBody = scanAll.replace(/<script[\s\S]*?<\/script>/gi, " ");
  if (/type\s*=\s*["']module["']/i.test(scanAll)) err("HTML06", file, '用了 type="module"（file:// 下会被 CORS 拦）');
  if (/\bimport\s+[\w{*][^\n]*\bfrom\s*["']/.test(scanAll)) err("HTML06", file, "用了 import 语句（file:// 下不可用）");
  if (/\bfetch\s*\(/.test(scanBody)) err("HTML06", file, "用了 fetch() 读本地文件（file:// 下不可用）");
  if (/XMLHttpRequest/.test(scanBody)) err("HTML06", file, "用了 XMLHttpRequest（file:// 下不可用）");
  if (/new\s+Worker\s*\(/.test(scanAll)) err("HTML06", file, "用了 Web Worker（file:// 下不可用）");

  if (!isSection) continue;

  // HTML11 骨架
  if (!/<h1[\s>]/i.test(html)) warn("HTML11", file, "缺 <h1>");
  if (!/id\s*=\s*["']pager["']/i.test(html)) warn("HTML11", file, '缺 <div class="pager" id="pager">');
  if (!/id\s*=\s*["']track["']/i.test(html)) warn("HTML11", file, '缺 <div class="track" id="track">');

  // HTML12 概念编号唯一 / 练习 / 来源
  const nums = [...html.matchAll(/概念\s*0*(\d+)/g)].map((x) => x[1]);
  const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
  if (dup.length) warn("HTML12", file, "概念编号重复：" + [...new Set(dup)].join(", "));
  if (!/class\s*=\s*["'][^"']*\bquiz\b/i.test(html) && !/class\s*=\s*["'][^"']*\bpractice\b/i.test(html)) {
    warn("HTML12", file, "没有练习区（.quiz / .practice）");
  }
  const trackKind = attr("data-track");
  if ((trackKind === "theory") && !/class\s*=\s*["'][^"']*\bsources\b/i.test(html)) {
    warn("HTML12", file, "理论线缺来源区（.sources）");
  }

  // HTML13 正文体量
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 400) warn("HTML13", file, "正文只有 " + text.length + " 字，多半没写完");

  // HTML14 除了段落没有任何组件
  const comp = (html.match(/class\s*=\s*["'][^"']*\b(?:step|think|concept|code|figure|demo|rows|see|tabs|rows)\b/gi) || []).length;
  if (comp === 0) warn("HTML14", file, "整节接近纯文字（没有任何组件）——看看有没有值得交互的地方");

  // HTML15 标签页结构：data-tab 与 .tpanel#id 一一对应，同时只有一个面板可见
  if (/data-tabs/.test(html)) {
    const tabIds = [...html.matchAll(/data-tab\s*=\s*["']([^"']+)["']/gi)].map((x) => x[1]);
    const panels = [...html.matchAll(/<div[^>]*class\s*=\s*["'][^"']*\btpanel\b[^"']*["'][^>]*>/gi)].map((x) => x[0]);
    const panelIds = panels.map((t) => (/id\s*=\s*["']([^"']+)["']/i.exec(t) || [])[1]).filter(Boolean);
    if (tabIds.length < 2) warn("HTML15", file, "data-tabs 里少于 2 个标签按钮");
    for (const id of tabIds) if (!panelIds.includes(id)) err("HTML15", file, '标签 data-tab="' + id + '" 没有对应的 .tpanel#id');
    for (const id of panelIds) if (!tabIds.includes(id)) warn("HTML15", file, "面板 #" + id + " 没有对应的标签按钮");
    const visible = panels.filter((t) => !/\bhidden\b/i.test(t)).length;
    if (visible !== 1) warn("HTML15", file, "同时可见的面板应为 1 个，现在是 " + visible + " 个（其它面板写 hidden）");
  }

  // HTML16 页内计算器：表达式只用白名单字符，变量必须声明，输出位必须在
  if (/data-calc/.test(html)) {
    const calcTags = [...html.matchAll(/<[^>]*\bdata-calc\b[^>]*>/gi)].map((x) => x[0]);
    for (const tag of calcTags) {
      const expr = (/(?:^|\s)data-expr\s*=\s*["']([^"']*)["']/i.exec(tag) || [])[1] || "";
      if (!expr.trim()) { err("HTML16", file, "data-calc 缺 data-expr"); continue; }
      if (/[^\w\s+\-*/().]/.test(expr)) { err("HTML16", file, "表达式里有不允许的字符：" + expr); continue; }
      for (const m3 of expr.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
        if (CALC_FNS.indexOf(m3[1].toLowerCase()) < 0) err("HTML16", file, "不支持的函数 " + m3[1] + "（可用：" + CALC_FNS.join(" ") + "）");
      }
      const declared = new Set([...html.matchAll(/data-var\s*=\s*["']([^"']+)["']/gi)].map((x) => x[1]));
      const bare = expr.replace(/\b(?:ceil|floor|round|abs|min|max|sqrt)\s*\(/gi, "(");
      for (const m2 of bare.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
        if (!declared.has(m2[0])) err("HTML16", file, "表达式里的变量 " + m2[0] + " 没有 data-var 输入框");
      }
    }
    if (!/data-role\s*=\s*["']calc-out["']/i.test(html)) err("HTML16", file, '缺 <b data-role="calc-out"> 输出位');
  }

  // HTML17 帧序列：data-count 与真实帧文件对得上，拖动条与读数位要在
  let frameBytes = 0;
  for (const tag of [...html.matchAll(/<div[^>]*class\s*=\s*["'][^"']*\bframes\b[^"']*["'][^>]*>/gi)].map((x) => x[0])) {
    const g = (n) => (new RegExp(n + '\\s*=\\s*"([^"]*)"', "i").exec(tag) || [])[1] || "";
    const name = g("data-frames"), count = parseInt(g("data-count"), 10), dir = g("data-dir"), ext = g("data-ext") || "svg";
    if (!name || !count || count < 2) { err("HTML17", file, "帧序列缺 data-frames 或 data-count（至少 2 帧）"); continue; }
    if (!dir) { err("HTML17", file, "帧序列缺 data-dir"); continue; }
    const base = resolve(dirname(page.path), dir);
    if (!existsSync(base)) { err("HTML17", file, "帧目录不存在：" + dir); continue; }
    const missing = [];
    for (let i = 1; i <= count; i++) {
      const fp = join(base, name + "-" + i + "." + ext);
      if (!existsSync(fp)) missing.push(name + "-" + i + "." + ext);
      else frameBytes += statSync(fp).size;
    }
    if (missing.length) err("HTML17", file, "缺少帧文件：" + missing.slice(0, 3).join(", ") + (missing.length > 3 ? " 等 " + missing.length + " 个" : ""));
  }
  if (/\bframes\b/.test(html) && !/data-role\s*=\s*["']frame-range["']/i.test(html)) {
    err("HTML17", file, '帧序列缺 <input data-role="frame-range">');
  }

  // HTML18 视频：要能操作、要说明录的是什么
  if (/<video[\s>]/i.test(html)) {
    for (const tag of [...html.matchAll(/<video[^>]*>/gi)].map((x) => x[0])) {
      if (!/\bcontrols\b/i.test(tag)) err("HTML18", file, "视频缺 controls");
    }
    if (!/class\s*=\s*["'][^"']*\bdcap\b/i.test(html)) warn("HTML18", file, "视频没有一句 .dcap 说明这段录的是什么");
    if (!/你应该看到/.test(html)) warn("HTML18", file, "视频没有配「你应该看到」");
  }

  // HTML19 体积软线（warning）：单页 >800KB / 帧总量 >5MB / 内联 SVG >6 张
  const pageBytes = Buffer.byteLength(html, "utf8");
  if (pageBytes > 800 * 1024) warn("HTML19", file, "单页 " + Math.round(pageBytes / 1024) + " KB，超过 800 KB 软线：考虑拆节或改服务器打开");
  if (frameBytes > 5 * 1024 * 1024) warn("HTML19", file, "帧序列共 " + Math.round(frameBytes / 1048576) + " MB（>5 MB），建议改成视频或外置目录");
  const svgCount = (html.match(/<svg[\s>]/gi) || []).length;
  if (svgCount > 6) warn("HTML19", file, "单页内联 SVG " + svgCount + " 张（>6），建议移到 src/image/*.svg 外链");
}

/* ---------- HTML20 主题快照：老库的 theme.css 还是 v3.2 之前 ---------- */
const themePath = join(root, "src", "css", "theme.css");
if (!existsSync(themePath)) {
  warn("HTML20", "src/css/theme.css", "缺少 src/css/theme.css，页面会退化成无主题");
} else if (!read(themePath).includes("--demo-w")) {
  warn("HTML20", "src/css/theme.css", "主题是 v3.2 之前的快照：宽屏上演示画布只有约 620px，读者得放大才能看清。迁移：node <skill>/scripts/migrate-theme.mjs --lib \"<库根目录>\"（会先备份 theme.css）");
}

/* ---------- HTML02 反查：磁盘上有、manifest 里没有 ---------- */
if (manifest) {
  const allowed = new Set([...manifestFiles].map((f) => f.split("\\").join("/")));
  for (const p of diskHtml) {
    const r = rel(p);
    if (r === "index.html" || /^ch[^/]*\/index\.html$/.test(r)) continue;
    if (!allowed.has(r)) err("HTML02", r, "磁盘上有这一页，但 manifest 里没有登记");
  }
}

/* ---------- 汇报 ---------- */
const effectiveErrors = strict ? errors.concat(warnings.filter((w) => w.rule !== "HTML14")) : errors;
const verdict = effectiveErrors.length ? 1 : 0;

if (asJson) {
  console.log(JSON.stringify({ ok: verdict === 0, stats, errors, warnings }, null, 2));
} else {
  const byRule = (list) => {
    const g = new Map();
    for (const it of list) { if (!g.has(it.rule)) g.set(it.rule, []); g.get(it.rule).push(it); }
    return g;
  };
  const print = (label, list) => {
    if (!list.length) return;
    console.log("\n" + label + "（" + list.length + "）");
    for (const [rule, items] of byRule(list)) {
      console.log("  " + rule + " × " + items.length);
      for (const it of items.slice(0, 8)) console.log("    " + it.file + " — " + it.msg);
      if (items.length > 8) console.log("    … 其余 " + (items.length - 8) + " 条");
    }
  };
  print("ERROR", errors);
  print("WARNING", warnings);
  console.log("\nSUMMARY pages=" + stats.pages + " chapters=" + stats.chapters + " sections=" + stats.sections +
    " bytes=" + stats.bytes + " ERRORS=" + errors.length + " WARNINGS=" + warnings.length +
    (strict ? " (strict)" : "") + " → " + (verdict === 0 ? "PASS" : "FAIL"));
}
process.exit(verdict);

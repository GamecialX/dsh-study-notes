#!/usr/bin/env node
/* html-nav.mjs — 把 manifest.json 编译成 src/js/nav-data.js
 *
 * 为什么要有这一步：file:// 下页面不能 fetch 本地文件，导航数据只能以 <script> 形式带进来。
 * manifest.json 仍是唯一事实源；本脚本生成的 nav-data.js 是它的投影，不要手改。
 *
 * 用法：node html-nav.mjs <库根目录>
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] || ".");
const manifestPath = join(root, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("找不到 manifest.json：" + manifestPath);
  process.exit(2);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schema !== "study-notes-html/1") {
  console.error("manifest.schema 必须是 study-notes-html/1，实际是 " + manifest.schema);
  process.exit(2);
}

const nav = {
  title: manifest.title || "",
  subtitle: manifest.subtitle || "",
  track: manifest.track || "",
  chapters: (manifest.chapters || []).map((ch) => ({
    id: ch.id,
    num: ch.num || String(ch.id).replace(/^ch/, ""),
    title: ch.title || "",
    file: ch.file || (ch.id + "/index.html"),
    summary: ch.summary || "",
    sections: (ch.sections || []).map((s) => ({
      id: s.id,
      lesson: s.lesson || (ch.id + "/" + s.id),
      title: s.title || "",
      file: s.file
    }))
  }))
};

const outDir = join(root, "src", "js");
const outPath = join(outDir, "nav-data.js");
const body = "/* 由 scripts/html-nav.mjs 从 manifest.json 生成，不要手改 */\n" +
  "window.STUDY_NAV = " + JSON.stringify(nav, null, 2) + ";\n";
await writeFile(outPath, body, "utf8");
console.log("wrote " + outPath + " (" + nav.chapters.length + " 章, " +
  nav.chapters.reduce((n, c) => n + c.sections.length, 0) + " 节)");

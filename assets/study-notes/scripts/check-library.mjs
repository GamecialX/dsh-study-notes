#!/usr/bin/env node
/**
 * check-library.mjs —— 学习笔记库交付前校验器
 *
 * 用法：
 *   node check-library.mjs "<笔记根目录>"
 *   node check-library.mjs "<笔记根目录>" --json
 *   node check-library.mjs "<笔记根目录>" --only "Cha_1 章名/C1 Sec_1 节名.md"   # 样章 / 单篇检查
 *   node check-library.mjs "<笔记根目录>" --strict        # 课程线规则（R1–R11）由 warning 升为 error
 *   node check-library.mjs "<笔记根目录>" --replay-to "<空目录>"   # 把正文照做一遍，写出每次【运行】时的 project/ 快照
 *   node check-library.mjs --help
 *
 * 只依赖 Node 内置模块。退出码：0 = 无 error（可能有 warning），1 = 存在 error，2 = 用法错误。
 *
 * 检查范围见 references/quality-gates.md 第二节。脚本只能证明机械一致性，
 * 证明不了知识正确性——那部分必须人工过。
 */

import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, basename, extname, resolve, isAbsolute } from 'node:path';

const HELP = `check-library.mjs —— 学习笔记库交付前校验器

用法：
  node check-library.mjs "<笔记根目录>"                     人类可读报告
  node check-library.mjs "<笔记根目录>" --json              JSON 输出
  node check-library.mjs "<笔记根目录>" --only "<相对路径>"  只查指定笔记（可重复；样章阶段用）
  node check-library.mjs "<笔记根目录>" --strict            课程线规则 [R1]–[R11] 的 warning 一律升为 error
  node check-library.mjs "<笔记根目录>" --replay-to "<目录>" 照正文的【新建】/【修改】/【重构】从空目录重放，
                                                           每遇到一次【运行】就把当时的 project/ 写成一个快照
  node check-library.mjs --help

退出码：0 = 无 error（可能有 warning）；1 = 存在 error；2 = 用法错误。

检查：
  结构    命名规范、frontmatter、必备产物、章末测试/速查是否齐全
  链接    标准链接与图片是否存在、锚点是否对得上标题、空链接、越出笔记根目录的链接
  可移植  wikilink / 嵌入 / callout / 单行 $$ / 单 $ 定界符 / 多 H1
  教学    每节练习 3–5 题、篇幅与标注块预算、旧式概念编号残留、章测试的跨章回顾题
  代码    <!-- source: --> / <!-- output: --> 标记的代码与输出是否真的来自对应文件
  课程线  [R1] 节内顺序 接上一节 → 3–5 步 → 小结 → 练习 → 概念索引，每步有 动作/结果/为什么
          [R2] 承接块与留给下一节   [R3] 概念是步骤里的节点（### 或被步骤包夹的 ##），全库统一
          [R4] 代码块带【新建】/【修改】/【重构】/【收口】标签；照做重放与 code/answer/chNN/ 同构；
               不引用晚于本章的答案或 notebook；读者不在 code/ 里建东西
          [R5] 导读写「你现在手上 / 本节结束时」   [R6] 章末通跑   [R7] 章末项目地图（非代码科目是产物目录）
          [R8] notebook 放 code/notebooks/CN_*.ipynb、不带输出   [R10] 3–5 步、30–100 分钟
          [R11] 正文、命令、输出里没有本机绝对路径
          默认 warning（老库不会被一次性判死），--strict 时为 error
  门户    notes_data.js 路径逐字符一致、分值恰为 100、客观题 ≥ 60、md 与 js 的题目对应

脚本只能证明机械一致性，证明不了知识正确性——那部分必须人工过
（见 references/quality-gates.md 第三节）。`;

/* ------------------------------------------------------------------ 输出 */

const problems = [];
let context = '';

function at(kind, message, where) {
  problems.push({ kind, message, where: where ?? context });
}

const error = (m, w) => at('error', m, w);
const warn = (m, w) => at('warn', m, w);

/* ------------------------------------------------------------ 常量 */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;
const CH_DIR = /^Cha_(\d+) (.+)$/u;
const SEC_FILE = /^C(\d+) Sec_(\d+) (.+)\.md$/u;
const LEGACY_CONCEPT_FILE = /^C(\d+)-(\d{2}) (.+)\.md$/u;
const TEST_FILE = /^C(\d+) 测试\.md$/u;
const SHEET_FILE = /^C(\d+) 速查\.md$/u;
const PLACEHOLDER = /\{\{[^{}]*\}\}/gu;
const STATUSES = new Set(['未开始', '学习中', '已完成']);
const QUIZ_TYPES = new Set(['choice', 'judge', 'fill', 'calc', 'subjective']);
const OBJECTIVE = new Set(['choice', 'judge', 'fill']);
const ROOT_DIR_ALLOW = new Set(['web', 'code', 'project', 'assets', 'node_modules']);

/** 与教学设计规范（references/teaching-design.md）里的预算一致。 */
const BUDGET = {
  quizMin: 3,
  quizMax: 5,
  sectionLines: 800,
  labels: 20,
};

const LABEL_LINE = /^>\s*<b>\*(?:Note|Tip|Important|Warning|Caution)\*<\/b>/gmu;
const ANSWER_BLOCK = /^>\s*(?:<b>\*(?:Note|Tip|Important|Warning|Caution)\*<\/b>|\*\*(?:Note|Tip|Important|Warning|Caution)\*\*:?|\[!(?:example|note|tip|important|warning|caution)\]-)\s*(?:\n>\s*)?(?:例[：:]\s*)?[^\n]*答案与解析/gmu;

/* ------------------------------------------------------------ 小工具 */

/** 去掉围栏代码块（保留行数，便于报告行号）。 */
function stripFences(text) {
  return text.replace(/^[ \t>]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t>]*\1[ \t]*$/gmu, (m) => m.replace(/[^\n]/gu, ' '));
}

/** 去掉围栏代码块与行内代码（保留行数，便于报告行号）。 */
function stripCode(text) {
  return stripFences(text).replace(/`[^`\n]*`/gu, (m) => ' '.repeat(m.length));
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

/**
 * 标题 → 锚点。门户（templates/web/index.html 的 slugify）用的是同一套规则：
 * 转小写 → 去掉 ` * _ ~ [ ] ( ) → 其余连续的非字母数字字符换成 - → 去首尾 -。
 * 例：「概念 1：张量 Tensor 与 ndarray」→「概念-1-张量-tensor-与-ndarray」。
 */
function slugify(text) {
  return String(text).trim().toLowerCase()
    .replace(/[`*_~[\]()]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

function headingAnchors(raw) {
  const scan = stripCode(raw);
  const set = new Set();
  for (const m of scan.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gmu)) {
    const text = m[1].replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1');
    set.add(slugify(text));
    set.add(`~${looseKey(text)}`);
  }
  return set;
}

/**
 * Typora、GitHub 与门户生成锚点的细节不同（如 ▸、：、· 是否保留），
 * 所以只要「去掉所有非字母数字后」与某个标题一致就算命中，避免误报。
 */
function looseKey(text) {
  return String(text).toLowerCase().replace(/[`*_~[\]()]/gu, '').replace(/[^\p{L}\p{N}]+/gu, '');
}

function hasAnchor(set, anchor) {
  return set.has(anchor) || set.has(slugify(anchor)) || set.has(`~${looseKey(anchor)}`);
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseFrontmatter(raw) {
  const m = FRONTMATTER.exec(raw);
  if (!m) return undefined;
  const fields = new Map();
  for (const line of m[1].split(/\r?\n/u)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep < 1) continue;
    fields.set(line.slice(0, sep).trim(), line.slice(sep + 1).trim().replace(/^["']|["']$/gu, ''));
  }
  return fields;
}

/** 交叉核对用的宽松归一化：只比较实义文字（表示层差异如 `x` 与 x、$8\times8$ 与 8×8 不算漂移）。 */
function normalizeForMatch(text) {
  return String(text)
    .replace(/\$[^$]*\$/gu, '')
    .replace(/\\[a-zA-Z]+/gu, '')
    .replace(/\s+/gu, '')
    .replace(/[。？?！!，,、；;：:．*`_~>#|"'“”‘’「」『』（）()【】[\]]/gu, '');
}

function isNoteDir(name) {
  return !name.startsWith('.') && !name.startsWith('_') && !ROOT_DIR_ALLOW.has(name);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* -------------------------------------------------------------- 参数 */

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(HELP);
  process.exit(argv.length === 0 ? 2 : 0);
}

const asJson = argv.includes('--json');
const strict = argv.includes('--strict');
const only = [];
const positional = [];
let replayTo;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--only') { if (argv[i + 1]) only.push(argv[i + 1]); i += 1; continue; }
  if (argv[i] === '--replay-to') { replayTo = argv[i + 1] ? resolve(argv[i + 1]) : undefined; i += 1; continue; }
  if (argv[i].startsWith('--')) continue;
  positional.push(argv[i]);
}
const root = positional[0] ? resolve(positional[0]) : undefined;
if (!root) {
  console.error('用法：node check-library.mjs "<笔记根目录>" [--json] [--only "<相对路径>"]');
  process.exit(2);
}
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`笔记根目录不存在或不是目录：${root}`);
  process.exit(2);
}
const onlyAbs = only.map((p) => (isAbsolute(p) ? resolve(p) : resolve(root, p)));
for (const p of onlyAbs) {
  if (!existsSync(p)) { console.error(`--only 指定的文件不存在：${p}`); process.exit(2); }
}
const partial = onlyAbs.length > 0;

/* ---------------------------------------------------------- 1. 必备产物 */

const dataPath = join(root, 'web', 'notes_data.js');

if (!partial) {
  context = '根目录';
  if (!existsSync(join(root, '00 大纲.md'))) error('缺少 `00 大纲.md`（全库总起 MOC）。');
  if (!existsSync(join(root, 'checklist.md'))) error('缺少 `checklist.md`（工作记录）。');
  if (!existsSync(join(root, 'web', 'index.html'))) error('缺少 `web/index.html`（学习门户）。');
  if (!existsSync(dataPath)) error('缺少 `web/notes_data.js`（门户数据）。');

  const hasBat = existsSync(join(root, '启动学习服务器.bat'));
  const hasSh = existsSync(join(root, 'start_server.sh'));
  if (!hasBat && !hasSh) error('缺少启动脚本（`启动学习服务器.bat` / `start_server.sh`）。');
  else {
    if (!hasBat) warn('没有 `启动学习服务器.bat`（Windows 一键启动脚本）。');
    if (!hasSh) warn('没有 `start_server.sh`（macOS / Linux 一键启动脚本）。');
  }

  const portalPath = join(root, 'web', 'index.html');
  if (existsSync(portalPath)) {
    const portal = readFileSync(portalPath, 'utf8');
    if (!portal.includes('notes_data.js')) error('`web/index.html` 似乎不是学习门户：没有引用 `notes_data.js`。');
    if (portal.length < 40000) warn(`\`web/index.html\` 只有 ${portal.length} 字节，可能是被重写的简化版，而不是模板门户。`);
    if (!portal.includes('allowSafeHtml')) warn('`web/index.html` 是旧版门户：它会把 `<b>*Note*</b>` 标签显示成源码、不会把 .md 链接转成门户路由。请从模板重新复制。');
  }
}

/* ---------------------------------------------------- 2. 章目录与笔记 */

const allMd = walk(root).filter((f) => extname(f).toLowerCase() === '.md');
const entries = readdirSync(root, { withFileTypes: true });
const chapterDirs = entries
  .filter((e) => e.isDirectory() && CH_DIR.test(e.name))
  .map((e) => {
    const m = CH_DIR.exec(e.name);
    return { dir: e.name, no: Number(m[1]), name: m[2], path: join(root, e.name) };
  })
  .sort((a, b) => a.no - b.no);
const lastChapter = chapterDirs.length ? chapterDirs[chapterDirs.length - 1].no : 0;
const chapterInfo = new Map();
const hasLegacyConceptFiles = allMd.some((f) => LEGACY_CONCEPT_FILE.test(basename(f)));

if (!partial) {
  context = '章目录';
  for (const e of entries) {
    if (e.isDirectory() && !CH_DIR.test(e.name) && isNoteDir(e.name)) {
      warn(`目录 \`${e.name}\` 不符合章目录命名 \`Cha_X 章名\`（维护用的目录请以 \`_\` 开头，校验器会跳过它）。`, e.name);
    }
  }
  if (chapterDirs.length === 0) error('没有找到任何 `Cha_X 章名` 章目录。');
}

const sheetsMissing = [];

for (const ch of chapterDirs) {
  context = ch.dir;
  const files = readdirSync(ch.path, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  const sections = [];
  let legacy = 0;

  for (const file of files) {
    if (extname(file).toLowerCase() !== '.md') continue;
    const sec = SEC_FILE.exec(file);
    const where = `${ch.dir}/${file}`;
    if (sec) {
      if (Number(sec[1]) !== ch.no) error(`节笔记 \`${file}\` 的章号 ${sec[1]} 与所在章 ${ch.no} 不一致。`, where);
      sections.push({ file, no: Number(sec[2]), name: sec[3], title: basename(file, '.md'), path: join(ch.path, file) });
    } else if (LEGACY_CONCEPT_FILE.test(file)) {
      legacy += 1;
    } else if (TEST_FILE.test(file) || SHEET_FILE.test(file)) {
      const m = TEST_FILE.exec(file) || SHEET_FILE.exec(file);
      if (Number(m[1]) !== ch.no) error(`\`${file}\` 的章号 ${m[1]} 与所在章 ${ch.no} 不一致。`, where);
    } else if (!partial) {
      error(`笔记文件 \`${file}\` 不符合命名规则（应为 \`CX Sec_X 节名.md\` / \`CX 测试.md\` / \`CX 速查.md\`）。`, where);
    }
  }
  sections.sort((a, b) => a.no - b.no);

  if (!partial) {
    if (legacy) {
      warn(`章目录里还有 ${legacy} 个旧式概念文件（\`CX-NN 名称.md\`）。规范已改为把概念写成节笔记里的 \`## 概念 N：名称\` 小节。`);
    }
    if (!sections.length) error(`章目录 \`${ch.dir}\` 里没有任何节笔记。`);
    if (ch.no !== lastChapter) {
      if (!existsSync(join(ch.path, `C${ch.no} 测试.md`))) error(`缺少章末测试 \`C${ch.no} 测试.md\`。`);
      if (!existsSync(join(ch.path, `C${ch.no} 速查.md`))) sheetsMissing.push(ch.no);
    }
    sections.forEach((s, i) => {
      if (s.no !== i + 1) warn(`节号不连续：\`${s.file}\` 是第 ${s.no} 节，但按排序应为第 ${i + 1} 节。`, `${ch.dir}/${s.file}`);
    });
  }

  chapterInfo.set(ch.no, { ...ch, sections });
}

if (sheetsMissing.length) {
  warn(`第 ${sheetsMissing.join('、')} 章没有 \`CX 速查.md\`（一页纸的本章速查，见 references/teaching-design.md）。`, '章目录');
}

/* ------------------------------------------ 课程线（R1–R11）：共用部分 */

/**
 * 课程线规则是这一版新增的教学结构要求。老库按旧骨架写成，默认只报 warning，
 * 让它们可以逐节迁移；--strict 时一律升为 error，新库应当在 --strict 下 0 error。
 */
function lint(rule, message, where) {
  (strict ? error : warn)(`[${rule}] ${message}`, where);
}

/**
 * 讲解线规则（T1–T5）在 2.1 版一律只报 warning，--strict 也不升 error：
 * fixture 与老库还是"操作手册"式讲法，先让新写的库达到要求，再逐库收紧。
 */
function hint(rule, message, where) {
  warn(`[${rule}] ${message}`, where);
}

const CODE_LANGS = new Set([
  'python', 'py', 'python3', 'javascript', 'js', 'mjs', 'cjs', 'jsx', 'typescript', 'ts', 'tsx',
  'java', 'c', 'h', 'cpp', 'c++', 'cc', 'hpp', 'cs', 'csharp', 'go', 'rust', 'rs', 'ruby', 'rb',
  'php', 'swift', 'kotlin', 'kt', 'scala', 'r', 'julia', 'jl', 'lua', 'matlab', 'octave', 'sql',
  'html', 'css', 'scss', 'vue', 'svelte', 'dart', 'haskell', 'hs', 'ocaml', 'elixir', 'erlang',
  'clojure', 'perl', 'zig', 'nim', 'solidity', 'diff'
]);
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'powershell', 'ps1', 'pwsh', 'cmd', 'bat', 'console']);
const OP_LABEL = /^[ \t]*(?:>[ \t]?)*【(新建|修改|重构|收口|运行)】(.*)$/u;
const OUTPUT_MARK = /<!--\s*output\s*:\s*([^>]+?)\s*-->/u;
const ELLIPSIS_LINE = /^\s*(?:\.\.\.|…+|(?:#|\/\/|\/\*|--)\s*(?:\.\.\.|…+).*)\s*$/u;
const DEF_LINE = /^(\s*)(?:export\s+)?(?:async\s+)?(def|class|function)\s+([A-Za-z_$][\w$]*)/u;
const SNAPSHOT_IGNORE = new Set(['__pycache__', '.pytest_cache', '.ipynb_checkpoints', '.mypy_cache', 'node_modules', '.DS_Store']);
const STEP_BUDGET = { min: 3, max: 5, minutesMin: 30, minutesMax: 100, newFileLines: 120 };

/** 全库层面的课程线事实，逐篇检查时收集，循环结束后汇总。 */
const course = { h2Concepts: [], h3Concepts: [] };
const courseCache = new Map();

function headingKind(text) {
  if (/^接上一节/u.test(text)) return 'bridge';
  if (/^第\s*\d+\s*步\s*[：:]/u.test(text)) return 'step';
  if (/^概念\s*\d+\s*[：:]/u.test(text)) return 'concept';
  if (/^本节小结/u.test(text)) return 'summary';
  if (/^本节练习/u.test(text)) return 'practice';
  if (/^概念索引/u.test(text)) return 'index';
  return 'other';
}

/** 解析围栏代码块（含引用块里的）、标题与【标签】操作。行号从 1 起。 */
function parseCourse(raw, rel) {
  const lines = raw.split(/\r?\n/u);
  const fences = [];
  const inFence = new Array(lines.length + 2).fill(false);
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^([ \t]*(?:>[ \t]?)*)(`{3,}|~{3,})[ \t]*([^\s`]*)/u.exec(lines[i]);
    if (!open) continue;
    const prefix = open[1];
    const quoted = prefix.includes('>');
    const fenceChar = open[2][0] === '`' ? '`' : '~';
    const close = new RegExp(`^[ \\t]*(?:>[ \\t]?)*${fenceChar}{${open[2].length},}[ \\t]*$`, 'u');
    const body = [];
    let j = i + 1;
    for (; j < lines.length && !close.test(lines[j]); j += 1) {
      let l = lines[j];
      if (quoted) l = l.replace(/^[ \t]*>[ \t]?/u, '');
      else if (prefix.length) l = l.slice(Math.min(prefix.length, l.length - l.trimStart().length));
      body.push(l);
    }
    fences.push({ start: i + 1, end: j + 1, lang: (open[3] || '').toLowerCase(), body, quoted });
    for (let k = i + 1; k <= j + 1; k += 1) inFence[k] = true;
    i = j;
  }
  const heads = [];
  const ops = [];
  const fenceAt = new Map(fences.map((f) => [f.start, f]));
  lines.forEach((l, idx) => {
    const n = idx + 1;
    if (inFence[n]) return;
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(l);
    if (h) { heads.push({ level: h[1].length, text: h[2].trim(), line: n, kind: headingKind(h[2].trim()) }); return; }
    const m = OP_LABEL.exec(l);
    if (!m) return;
    let k = n + 1;
    while (k <= lines.length && !inFence[k] && lines[k - 1].replace(/^[ \t]*(?:>[ \t]?)*/u, '').trim() === '') k += 1;
    ops.push({ kind: m[1], text: m[2], path: (/`([^`]+)`/u.exec(m[2]) || [])[1], fence: fenceAt.get(k), line: n, rel });
  });
  return { lines, fences, inFence, heads, ops };
}

function courseOf(file, rel) {
  if (!courseCache.has(file)) courseCache.set(file, parseCourse(readFileSync(file, 'utf8'), rel));
  return courseCache.get(file);
}

function segmentText(parsed, fromLine, toLine) {
  return parsed.lines.slice(fromLine, Math.max(fromLine, toLine - 1)).join('\n');
}

/* ------------------------------------------ [R11] 可移植路径 */

const ABS_WIN = /(?<![A-Za-z0-9_])[A-Za-z]:[\\/](?![\\/])[^\s`'"<>|)]*/gu;
const ABS_UNIX = /(?<![\w.~/-])\/(?:Users|home|mnt|tmp|var|opt|root|private)\/[^\s`'"<>|)]*/gu;

function checkAbsolutePaths(raw, rel) {
  const text = raw
    .replace(/\$\$[\s\S]*?\$\$/gu, (m) => m.replace(/[^\n]/gu, ' '))
    .replace(/\$[^$\n]+\$/gu, (m) => ' '.repeat(m.length))
    .replace(/\]\((?:https?|file):[^)]*\)/gu, (m) => ' '.repeat(m.length));
  const hits = [...text.matchAll(ABS_WIN), ...text.matchAll(ABS_UNIX)].sort((a, b) => a.index - b.index);
  if (!hits.length) return;
  const sample = hits.slice(0, 3).map((m) => `第 ${lineOf(raw, m.index)} 行 \`${m[0].slice(0, 50)}\``).join('、');
  lint('R11', `有 ${hits.length} 处本机绝对路径（${sample}）。读者的机器上没有这些路径：正文、命令和输出里的路径都写成相对笔记根目录或 \`project/\` 的形式；脚本打印路径时先转成相对路径（如 Python 的 \`Path.relative_to\`），再保存输出。`, rel);
}

/* ------------------------------------------ [R4][R8] 不许引用未来 */

function checkLeaks(raw, rel, chapterNo) {
  const found = [];
  for (const m of raw.matchAll(/code\/answer\/ch0*(\d+)/gu)) if (Number(m[1]) > chapterNo) found.push([m, `code/answer/ch${m[1]}`]);
  for (const m of raw.matchAll(/code\/notebooks\/C(\d+)_/gu)) if (Number(m[1]) > chapterNo) found.push([m, `code/notebooks/C${m[1]}_…`]);
  if (!found.length) return;
  const sample = found.slice(0, 3).map(([m, what]) => `第 ${lineOf(raw, m.index)} 行 \`${what}\``).join('、');
  lint('R4', `引用了晚于本章（第 ${chapterNo} 章）的答案或 notebook：${sample}。正文任何位置都不许出现读者还没写到的未来版本。`, rel);
}

/* ------------------------------------------ [R1][R2][R3][R4][R5][R10] 节内施工线 */

function checkCourseLine(file, raw, rel, chapterNo, sectionNo, chapterName) {
  if (/毕业设计/u.test(chapterName)) return;
  const p = courseOf(file, rel);
  const h2 = p.heads.filter((h) => h.level === 2);
  const steps = h2.filter((h) => h.kind === 'step');
  const total = p.lines.length + 1;
  const endOfSteps = (h2.find((h) => h.kind === 'summary' || h.kind === 'practice') || { line: total }).line;

  course.h2Concepts.push(...p.heads.filter((h) => h.level === 2 && h.kind === 'concept').map(() => rel));
  course.h3Concepts.push(...p.heads.filter((h) => h.level === 3 && /^概念\s*\d+\s*[：:]/u.test(h.text)).map(() => rel));

  /* R5 + R10：导读 */
  const firstH2 = h2.length ? h2[0].line : total;
  const intro = segmentText(p, 0, firstH2);
  const missIntro = ['你现在手上', '本节结束时'].filter((k) => !intro.includes(k));
  if (missIntro.length) {
    lint('R5', `导读缺少 ${missIntro.map((k) => `<b>${k}</b>：`).join('、')}。读者要先知道：上一节结束时手上（project/ 或推导本、句子本……）有什么、能做到什么做不到什么；本节结束时多了什么、多能做到什么。`, rel);
  }
  const minutes = /预计用时[^0-9\n]{0,12}(\d+)\s*分钟/u.exec(intro);
  if (minutes && (Number(minutes[1]) < STEP_BUDGET.minutesMin || Number(minutes[1]) > STEP_BUDGET.minutesMax)) {
    lint('R10', `预计用时 ${minutes[1]} 分钟，不在 ${STEP_BUDGET.minutesMin}–${STEP_BUDGET.minutesMax} 分钟（3–5 步 × 10–20 分钟）之内。太长就拆节。`, rel);
  }

  /* R1：节内顺序 */
  const issues = [];
  const bridge = h2.find((h) => h.kind === 'bridge');
  if (bridge && h2[0] !== bridge) issues.push('第一个 `##` 应是 `## 接上一节`');
  if (steps.length < STEP_BUDGET.min || steps.length > STEP_BUDGET.max) issues.push(`有 ${steps.length} 个「## 第 N 步：…」，应为 ${STEP_BUDGET.min}–${STEP_BUDGET.max} 个`);
  steps.forEach((s, i) => {
    const no = Number(/\d+/u.exec(s.text)[0]);
    if (no !== i + 1) issues.push(`步骤编号不连续（第 ${s.line} 行写的是第 ${no} 步）`);
  });
  const others = h2.filter((h) => h.kind === 'other');
  if (others.length) {
    issues.push(`有不属于施工线的 \`##\`：${others.slice(0, 3).map((h) => `「${h.text}」（第 ${h.line} 行）`).join('、')}，改成某一步里的 \`###\``);
  }
  const rank = { bridge: 0, step: 1, concept: 1, summary: 2, practice: 3, index: 4 };
  let last = -1;
  for (const h of h2) {
    const r = rank[h.kind];
    if (r === undefined) continue;
    if (r < last) { issues.push(`「${h.text}」（第 ${h.line} 行）位置不对`); break; }
    last = r;
  }
  for (const [kind, label] of [['summary', '## 本节小结'], ['index', '## 概念索引']]) {
    if (!h2.some((h) => h.kind === kind)) issues.push(`缺少 \`${label}\``);
  }
  if (issues.length) {
    lint('R1', `节内施工线不完整：${issues.join('；')}。顺序应为 导读 → 接上一节 → 第 1..N 步 → 本节小结 → 本节练习 → 概念索引。`, rel);
  }

  /* R1：每一步 = 动作 → 可见结果 → 为什么 */
  const thin = [];
  steps.forEach((s, i) => {
    const next = h2.find((h) => h.line > s.line && h.kind !== 'concept');
    const seg = segmentText(p, s.line, next ? next.line : endOfSteps);
    const miss = [];
    if (!/【(?:新建|修改|重构|收口|运行)】|<b>动手<\/b>/u.test(seg)) miss.push('动作');
    if (!/<!--\s*output\s*:|你应该看到/u.test(seg)) miss.push('可见结果');
    if (!/为什么/u.test(seg)) miss.push('为什么');
    if (miss.length) thin.push(`第 ${i + 1} 步缺${miss.join('、')}`);
  });
  if (thin.length) {
    lint('R1', `每一步都要有「动作 → 可见结果 → 为什么」：${thin.join('；')}。动作写【新建】/【修改】/【重构】/【收口】/【运行】或 <b>动手</b>：…；结果写 <b>你应该看到</b>：… 或绑定的真实输出。`, rel);
  }

  /* T1–T5：讲解线（先想 → 讲 → 做 → 看）。2.1 版只报 warning。
     正文段落常是一整行长文，所以按字数折算"行"（40 字 ≈ 一行），不按物理行数。 */
  const effLines = (chars) => Math.ceil(chars / 40);
  const proseChars = (from, to) => {
    let n = 0;
    for (let i = from + 1; i < to; i += 1) {
      if (p.inFence[i]) continue;
      const t = (p.lines[i - 1] || '').trim();
      if (!t || t.startsWith('#') || t.startsWith('<!--')) continue;
      n += t.replace(/\s+/gu, '').length;
    }
    return n;
  };
  const firstActionLine = (from, to) => {
    let line = null;
    for (const op of p.ops) {
      if (op.line > from && op.line < to && (line === null || op.line < line)) line = op.line;
    }
    for (let i = from + 1; i < to; i += 1) {
      if (!p.inFence[i] && /<b>动手<\/b>/u.test(p.lines[i - 1] || '') && (line === null || i < line)) line = i;
    }
    return line;
  };
  const t1 = [];
  for (const s of steps) {
    const next = h2.find((h) => h.line > s.line && h.kind !== 'concept');
    const to = next ? next.line : endOfSteps;
    if (/【|新建|修改|重构|收口|运行|\.(?:py|js|ts|ipynb)\b|project[\\/]/u.test(s.text)) {
      t1.push(`「第 ${s.line} 行的步骤标题写成了文件操作（${s.text}）」`);
    }
    const act = firstActionLine(s.line, to);
    const before = effLines(proseChars(s.line, act || to));
    if (before < 8) t1.push(`「第 ${act ? `${act} 行开始动手` : '整步'}之前只有约 ${before} 行讲解」`);
  }
  if (t1.length) {
    hint('T1', `每一步都要先讲后做：${t1.slice(0, 4).join('；')}。标题写成本步要回答的问题或知识主题；动手之前至少 8 行（通常 20–60 行）讲清"为什么要做、为什么非这样写"。`, rel);
  }

  const t2 = [];
  for (const h of p.heads.filter((x) => x.kind === 'concept')) {
    const next = p.heads.find((x) => x.line > h.line);
    const to = next ? next.line : total;
    const seg = segmentText(p, h.line, to);
    const n = effLines(proseChars(h.line, to));
    const bad = [];
    if (n < 24) bad.push(`正文约 ${n} 行（应 40–120 行）`);
    if (!/为什么需要它|为什么需要/u.test(seg)) bad.push('没讲「为什么需要它」');
    if (!/数学|原理|定义|推导/u.test(seg)) bad.push('没讲它在原理/数学上是什么');
    if (bad.length) t2.push(`「${h.text}」（第 ${h.line} 行）${bad.join('、')}`);
  }
  if (t2.length) {
    hint('T2', `概念要就地讲透：${t2.slice(0, 3).join('；')}。概念条目承担这一节的主要讲解量，不是 API 卡片。`, rel);
  }

  const sectionBody = segmentText(p, firstH2, endOfSteps);
  if (!/先想一下|先猜一猜/u.test(sectionBody)) {
    hint('T3', '这一节没有一处「先想一下 / 先猜一猜」：在讲清之前先抛个问题让读者自己回答，再揭晓答案。', rel);
  } else if (!/猜错|错在哪|想错/u.test(sectionBody)) {
    hint('T3', '「先猜一猜」之后要解释猜错的人错在哪：只说答案，读者不知道自己哪一步想偏了。', rel);
  }

  const t4 = [];
  for (const s of steps) {
    const next = h2.find((h) => h.line > s.line && h.kind !== 'concept');
    const to = next ? next.line : endOfSteps;
    const seg = segmentText(p, s.line, to);
    if (!/刚才发生了什么|你应该看到|为什么呢|为什么是这个结果/u.test(seg)) t4.push(`第 ${/\d+/u.exec(s.text)[0]} 步`);
  }
  if (t4.length) {
    hint('T4', `每一步跑完都要回看：${t4.join('、')}缺「<b>刚才发生了什么</b>」或「<b>你应该看到</b>」。输出要逐条对回刚才的讲解，而不只是贴一段结果。`, rel);
  }

  let codeLines = 0;
  for (const f of p.fences) {
    if (f.start > firstH2 && f.start < endOfSteps) codeLines += f.body.length;
  }
  const proseAll = effLines(proseChars(firstH2, endOfSteps));
  if (codeLines > proseAll && proseAll > 0) {
    hint('T5', `正文约 ${proseAll} 行，少于代码 ${codeLines} 行：讲解应是主体，代码是实践。把"为什么"讲够，再收短代码。`, rel);
  }

  /* R2：承接与钩子 */
  if (!bridge) {
    lint('R2', '缺少 `## 接上一节` 承接块：正文第一块要回答上一节把东西做到哪了、留下什么坑、本节补哪一块。', rel);
  } else {
    const next = h2.find((h) => h.line > bridge.line);
    const seg = segmentText(p, bridge.line, next ? next.line : total);
    const miss = ['上一节做到', '留下的坑', '本节补上'].filter((k) => !seg.includes(k));
    if (miss.length) lint('R2', `「## 接上一节」缺少 ${miss.map((k) => `<b>${k}</b>：`).join('、')}。`, `${rel}:${bridge.line}`);
  }
  const ch = chapterInfo.get(chapterNo);
  const isVeryLast = chapterNo === lastChapter && ch && ch.sections.length && ch.sections[ch.sections.length - 1].no === sectionNo;
  if (!isVeryLast && !/留给下一节/u.test(segmentText(p, steps.length ? steps[steps.length - 1].line : 0, total))) {
    lint('R2', '节末没有 `<b>留给下一节</b>：…` 钩子：读者读完要知道下一节动哪里。', rel);
  }

  /* R3：## 概念 必须被步骤包夹 */
  const unwrapped = [];
  h2.forEach((h, i) => {
    if (h.kind !== 'concept') return;
    if (h2[i - 1]?.kind !== 'step' || h2[i + 1]?.kind !== 'step') unwrapped.push(h);
  });
  if (unwrapped.length) {
    lint('R3', `\`## 概念 N\` 必须夹在两步之间（前后都是「## 第 N 步」），不能连排，也不能放在第一步之前或最后一步之后：${unwrapped.slice(0, 3).map((h) => `「${h.text}」（第 ${h.line} 行）`).join('、')}。推荐改成该步里的 \`### 概念 N：名称\`。`, rel);
  }

  /* R4：代码块的四种合法形态 */
  const bodyStart = steps.length ? steps[0].line : firstH2;
  const opFences = new Set(p.ops.filter((o) => o.fence).map((o) => o.fence.start));
  const bare = p.fences.filter((f) => f.start > bodyStart && f.start < endOfSteps && CODE_LANGS.has(f.lang) && !opFences.has(f.start));
  if (bare.length) {
    lint('R4', `正文有 ${bare.length} 个代码块没有【新建】/【修改】/【重构】/【收口】标签（第 ${bare.slice(0, 6).map((f) => f.start).join('、')} 行）：读者不知道它放进哪个文件、是整份还是只改一处。`, rel);
  }
  const excerpts = p.fences.filter((f) => f.start < endOfSteps && CODE_LANGS.has(f.lang) &&
    (/节选/u.test(f.body.slice(0, 2).join('\n')) || /节选/u.test(p.lines[f.start - 2] || '')));
  if (excerpts.length) {
    lint('R4', `第 ${excerpts.slice(0, 5).map((f) => f.start).join('、')} 行的代码块标着「节选」：读者照敲会缺行、输出也对不上。给完整文件（【新建】）或定位式改动（【修改】）。`, rel);
  }
  for (const f of p.fences) {
    if (!SHELL_LANGS.has(f.lang) || f.start >= endOfSteps) continue;
    const bad = f.body.find((l) => /(?:mkdir|New-Item|\bni\b|touch|\bcd\b|\bmd\b)[^\n]*(?<![\w./\\-])code[\\/]/u.test(l));
    if (bad) lint('R4', `命令 \`${bad.trim().slice(0, 60)}\` 让读者在 \`code/\` 里动手。\`code/\` 是答案区；读者的工程在 \`project/\`，从空目录开始建。`, `${rel}:${f.start}`);
  }
  for (const op of p.ops) {
    const where = `${rel}:${op.line}`;
    if (op.kind === '运行') {
      if (!op.fence) lint('R4', '【运行】后面没有命令代码块。', where);
      continue;
    }
    if (op.kind !== '收口' && !op.fence) { lint('R4', `【${op.kind}】后面没有紧跟代码块。`, where); continue; }
    if (!op.path) { lint('R4', `【${op.kind}】没写文件路径：标签后第一个行内代码应是 \`project/…\`。`, where); continue; }
    if (!/^project\//u.test(op.path)) {
      lint('R4', `【${op.kind}】的路径 \`${op.path}\` 不在 \`project/\` 下。${/^code\//u.test(op.path) ? '`code/` 是答案区，读者不在那里写东西。' : '读者的工程统一在 `project/`。'}`, where);
      continue;
    }
    if (!op.fence) continue;
    if (op.kind === '修改' && op.fence.lang !== 'diff') lint('R4', '【修改】要用 ```diff 块：改动行以 -/+ 开头，上下各留 1–2 行原样的上下文（行首一个空格）。', where);
    if (op.kind !== '修改' && op.fence.body.some((l) => ELLIPSIS_LINE.test(l))) {
      lint('R4', `【${op.kind}】块里有省略行（\`...\` / \`# ...\`）：完整文件和完整函数不许省略，否则读者照敲跑不起来。`, where);
    }
    if (op.kind === '新建' && op.fence.body.length > STEP_BUDGET.newFileLines) {
      lint('R4', `【新建】文件有 ${op.fence.body.length} 行，超过 ${STEP_BUDGET.newFileLines} 行：拆成几步，先新建骨架再逐步【修改】。`, where);
    }
  }
}

/* ------------------------------------------ [R4] 照做重放 */

function normText(text) {
  const lines = String(text).replace(/\r\n?/gu, '\n').split('\n').map((l) => l.replace(/[ \t]+$/u, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.length ? `${lines.join('\n')}\n` : '';
}

function fileLines(text) {
  const t = normText(text);
  return t ? t.slice(0, -1).split('\n') : [];
}

function trimBlankEdges(lines) {
  const out = [...lines];
  while (out.length && out[0].trim() === '') out.shift();
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out;
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function readTree(dir) {
  const out = new Map();
  const visit = (abs, prefix) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (SNAPSHOT_IGNORE.has(e.name) || e.name.endsWith('.pyc')) continue;
      const full = join(abs, e.name);
      if (e.isDirectory()) visit(full, `${prefix}${e.name}/`);
      else out.set(`${prefix}${e.name}`, normText(readFileSync(full, 'utf8')));
    }
  };
  if (existsSync(dir)) visit(dir, '');
  return out;
}

function answerDir(chapterNo) {
  for (const name of [`ch${String(chapterNo).padStart(2, '0')}`, `ch${chapterNo}`]) {
    const p = join(root, 'code', 'answer', name);
    if (existsSync(p) && statSync(p).isDirectory()) return p;
  }
  return undefined;
}

/** 把一个【标签】操作作用到内存里的 project/ 上。返回失败原因，成功返回 undefined。 */
function applyOp(state, op) {
  const path = op.path.replace(/^project\//u, '');
  if (!path || path.split('/').some((s) => s === '..')) return `路径 \`${op.path}\` 不合法。`;
  const body = op.fence ? op.fence.body : [];
  if (op.kind === '新建') {
    if (state.has(path)) return `\`${op.path}\` 照做到这里已经存在了：已有文件要用【修改】或【重构】，不要整份重贴。`;
    state.set(path, normText(body.join('\n')));
    return undefined;
  }
  if (!state.has(path)) return `照做到这里还没有 \`${op.path}\`：读者没法打开一个不存在的文件。`;
  const current = fileLines(state.get(path));
  if (op.kind === '收口') {
    if (!op.fence) return undefined;
    if (normText(body.join('\n')) !== normText(current.join('\n'))) {
      return `【收口】给出的 \`${op.path}\` 和照正文做到这里的结果不一致：要么正文漏了一步，要么收口版本混进了别的改动。`;
    }
    return undefined;
  }
  if (op.kind === '修改') {
    const oldL = [];
    const newL = [];
    for (const l of body) {
      if (l === '') { oldL.push(''); newL.push(''); continue; }
      if (l[0] === ' ') { oldL.push(l.slice(1)); newL.push(l.slice(1)); }
      else if (l[0] === '-') oldL.push(l.slice(1));
      else if (l[0] === '+') newL.push(l.slice(1));
      else return `diff 行 \`${l.slice(0, 40)}\` 既不是上下文（行首空格）也不是 -/+ 行。`;
    }
    while (oldL.length && newL.length && oldL[0] === '' && newL[0] === '') { oldL.shift(); newL.shift(); }
    while (oldL.length && newL.length && oldL[oldL.length - 1] === '' && newL[newL.length - 1] === '') { oldL.pop(); newL.pop(); }
    if (!oldL.length) return '【修改】没有上下文行，读者不知道改在哪：至少给 1–2 行原样的上下文。';
    const same = (a, b) => a.replace(/[ \t]+$/u, '') === b.replace(/[ \t]+$/u, '');
    const hits = [];
    for (let i = 0; i + oldL.length <= current.length; i += 1) {
      if (oldL.every((l, k) => same(l, current[i + k]))) hits.push(i);
    }
    if (hits.length !== 1) {
      return hits.length
        ? `在 \`${op.path}\` 里有 ${hits.length} 处都长这样，读者不知道改哪一处：多给一行上下文。`
        : `在 \`${op.path}\` 里找不到这几行（首行 \`${oldL[0].trim().slice(0, 50)}\`）：读者照做会卡住，多半是前面漏了一步或上下文抄错了。`;
    }
    current.splice(hits[0], oldL.length, ...newL);
    state.set(path, normText(current.join('\n')));
    return undefined;
  }
  /* 重构：按定义行找到同名函数 / 类，整块换掉 */
  const block = trimBlankEdges(body);
  const sigAt = block.findIndex((l) => DEF_LINE.test(l));
  if (sigAt < 0) return '【重构】块里找不到 def / class / function 定义行。';
  const [, , kw, name] = DEF_LINE.exec(block[sigAt]);
  const matches = current.map((l, i) => [DEF_LINE.exec(l), i]).filter(([m]) => m && m[2] === kw && m[3] === name);
  if (matches.length !== 1) return `在 \`${op.path}\` 里找到 ${matches.length} 个 \`${kw} ${name}\`，应恰好 1 个。`;
  const at = matches[0][1];
  const ind = indentOf(current[at]);
  let start = at;
  while (start > 0 && /^\s*@/u.test(current[start - 1]) && indentOf(current[start - 1]) === ind) start -= 1;
  let end = at;
  for (let j = at + 1; j < current.length; j += 1) {
    const l = current[j];
    if (l.trim() === '') continue;
    if (indentOf(l) > ind) { end = j; continue; }
    if (indentOf(l) === ind && /^\s*[}\])][;,)]*\s*$/u.test(l)) end = j;
    break;
  }
  current.splice(start, end - start + 1, ...block);
  state.set(path, normText(current.join('\n')));
  return undefined;
}

function nextOutputBinding(p, fromLine) {
  for (let n = fromLine + 1; n <= p.lines.length; n += 1) {
    if (p.inFence[n]) continue;
    const l = p.lines[n - 1];
    if (OP_LABEL.test(l) || /^#{2,3}\s/u.test(l)) return undefined;
    const m = OUTPUT_MARK.exec(l);
    if (m) return m[1];
  }
  return undefined;
}

function writeSnapshot(dir, state, meta) {
  for (const [rel, content] of state) {
    const full = join(dir, 'project', ...rel.split('/'));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  mkdirSync(join(dir, 'project'), { recursive: true });
  writeFileSync(join(dir, 'run.json'), `${JSON.stringify(meta, undefined, 2)}\n`, 'utf8');
}

/**
 * 从空目录开始，按章、按节、按出现顺序执行正文里的【新建】/【修改】/【重构】/【收口】，
 * 证明「读者照做能敲出来」；章末与 code/answer/chNN/ 逐文件比对，证明答案区与正文同构。
 */
function replayCourse(targetFiles) {
  let carry = new Map();
  let snapshots = 0;
  for (const ch of chapterInfo.values()) {
    if (/毕业设计/u.test(ch.name)) continue;
    const prevAnswer = ch.no > 1 ? answerDir(ch.no - 1) : undefined;
    const state = prevAnswer ? readTree(prevAnswer) : new Map(carry);
    let chapterOps = 0;
    for (const s of ch.sections) {
      const rel = `${ch.dir}/${s.file}`;
      const p = courseOf(s.path, rel);
      let runNo = 0;
      for (const op of p.ops) {
        if (op.kind === '运行') {
          runNo += 1;
          if (replayTo && op.fence) {
            snapshots += 1;
            writeSnapshot(join(replayTo, `c${ch.no}s${s.no}-${runNo}`), state, {
              source: rel,
              line: op.line,
              cwd: /project\//u.test(op.text) ? 'project' : 'root',
              shell: op.fence.lang,
              commands: op.fence.body.map((l) => l.trim()).filter((l) => l && !/^(?:#|::|REM\b)/iu.test(l)),
              output: nextOutputBinding(p, op.fence.end) ?? null
            });
          }
          continue;
        }
        if (!op.fence && op.kind !== '收口') continue;
        if (!op.path || !/^project\//u.test(op.path)) continue;
        chapterOps += 1;
        const why = applyOp(state, op);
        if (why && (!targetFiles || targetFiles.has(s.path))) lint('R4', `照做重放失败：${why}`, `${rel}:${op.line}`);
      }
    }
    if (replayTo && chapterOps) {
      writeSnapshot(join(replayTo, `ch${String(ch.no).padStart(2, '0')}-final`), state, { chapter: ch.no });
    }
    const ans = answerDir(ch.no);
    if (!targetFiles && chapterOps) {
      if (!ans) {
        lint('R4', `第 ${ch.no} 章有 ${chapterOps} 处【新建】/【修改】/【重构】，但没有收口快照 \`code/answer/ch${String(ch.no).padStart(2, '0')}/\`（与 project/ 同构的本章答案）。`, ch.dir);
      } else {
        const answer = readTree(ans);
        const missing = [...state.keys()].filter((k) => !answer.has(k));
        const extra = [...answer.keys()].filter((k) => !state.has(k));
        const differ = [...state.keys()].filter((k) => answer.has(k) && answer.get(k) !== state.get(k));
        const parts = [];
        if (missing.length) parts.push(`答案区缺 ${missing.slice(0, 4).join('、')}`);
        if (extra.length) parts.push(`答案区多出正文从没让读者建过的 ${extra.slice(0, 4).join('、')}`);
        if (differ.length) parts.push(`内容和照做结果不同：${differ.slice(0, 4).join('、')}`);
        if (parts.length) lint('R4', `\`${relative(root, ans).replace(/\\/g, '/')}/\` 与照正文做完第 ${ch.no} 章的 project/ 不同构：${parts.join('；')}。`, ch.dir);
      }
    }
    carry = ans ? readTree(ans) : state;
  }
  return snapshots;
}
/* ---------------------------------------------------- 3. 逐篇内容检查 */

const targets = partial ? onlyAbs : allMd;
const anchorCache = new Map();
function anchorsOf(file) {
  if (!anchorCache.has(file)) anchorCache.set(file, headingAnchors(readFileSync(file, 'utf8')));
  return anchorCache.get(file);
}

for (const file of targets) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const name = basename(file);
  const raw = readFileSync(file, 'utf8');
  const scan = stripCode(raw);
  const isLog = name === 'checklist.md' && !rel.includes('/');
  const secMatch = SEC_FILE.exec(name);
  const isTest = TEST_FILE.test(name);

  /* frontmatter */
  const fm = parseFrontmatter(raw);
  if (!isLog) {
    if (!fm) error('缺少 YAML frontmatter。', rel);
    else {
      for (const key of ['subject', 'status', 'tags']) if (!fm.has(key)) error(`frontmatter 缺少 \`${key}\`。`, rel);
      if (name !== '00 大纲.md' && !fm.has('chapter')) error('frontmatter 缺少 `chapter`。', rel);
      const status = fm.get('status');
      if (status !== undefined && !STATUSES.has(status)) error(`frontmatter 的 \`status\` 取值 "${status}" 不合法（应为 未开始 / 学习中 / 已完成）。`, rel);
    }
  }

  const placeholder = raw.match(PLACEHOLDER);
  if (placeholder) error(`残留未替换的占位符 ${placeholder[0]}（第 ${lineOf(raw, raw.indexOf(placeholder[0]))} 行）。`, rel);

  if (name === '00 大纲.md' && /待回填|TODO|待补/u.test(scan)) error('大纲中仍有未回填的链接位。', rel);

  /* 标准链接与图片 */
  const linkScan = scan.replace(/\$\$[\s\S]*?\$\$/gu, (m) => m.replace(/[^\n]/gu, ' ')).replace(/\$[^$\n]+\$/gu, (m) => ' '.repeat(m.length));
  for (const m of linkScan.matchAll(/(!?)\[([^\]\n]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/gu)) {
    const isImage = m[1] === '!';
    const href = m[3];
    const line = lineOf(raw, m.index);
    const where = `${rel}:${line}`;
    if (!href) { error(`空链接 \`[${m[2]}]()\`：没有目标。要么补上路径，要么删掉链接只留文字。`, where); continue; }
    if (/^[a-z][a-z0-9+.-]*:/iu.test(href)) continue;
    const hashAt = href.indexOf('#');
    const pathPart = hashAt >= 0 ? href.slice(0, hashAt) : href;
    const anchor = hashAt >= 0 ? safeDecode(href.slice(hashAt + 1)) : '';
    if (!pathPart) {
      if (anchor && !hasAnchor(anchorsOf(file), anchor)) error(`锚点 \`#${anchor}\` 在本文件里找不到对应标题。`, where);
      continue;
    }
    if (/[ （）]/u.test(pathPart)) warn(`链接路径 \`${pathPart}\` 含空格或全角括号却没有百分号编码，Typora / Pandoc 可能在空格处截断。`, where);
    const target = resolve(dirname(file), safeDecode(pathPart));
    const relTarget = relative(root, target);
    if (relTarget.startsWith('..') || isAbsolute(relTarget)) {
      error(`链接 \`${href}\` 指到了笔记根目录之外（解析为 ${target}）。根目录下的文件请不要写 \`../\`。`, where);
      continue;
    }
    if (!existsSync(target)) {
      error(`${isImage ? '图片' : '链接'} \`${safeDecode(pathPart)}\` 找不到文件。`, where);
      continue;
    }
    if (anchor && extname(target).toLowerCase() === '.md' && !hasAnchor(anchorsOf(target), anchor)) {
      error(`锚点 \`#${anchor}\` 在 \`${relative(root, target).replace(/\\/g, '/')}\` 里找不到对应标题。`, where);
    }
  }

  /* 可移植性 */
  for (const m of scan.matchAll(/(!?)\[\[([^[\]]+)\]\]/gu)) {
    if (m[1]) error(`用了 Obsidian 专有的嵌入语法 \`![[${m[2]}]]\`。图片请改成 \`![说明](src/${m[2]})\`。`, `${rel}:${lineOf(raw, m.index)}`);
    else error(`用了 Obsidian 专有的 wikilink \`[[${m[2]}]]\`。请改成标准链接 \`[${m[2]}](${encodeURI(m[2] + '.md')})\`。`, `${rel}:${lineOf(raw, m.index)}`);
  }
  for (const m of scan.matchAll(/\$\$[^$\n]+\$\$/gu)) {
    warn('块级公式被挤在一行。`$$` 必须各自独占一行，否则 Typora / GitHub / Pandoc 会显示源码。', `${rel}:${lineOf(raw, m.index)}`);
  }
  for (const m of scan.matchAll(/^([ \t]*(?:>[ \t]*)*)\$[ \t]*$/gmu)) {
    warn('块级公式的定界符写成了单个 `$`，应为 `$$`。', `${rel}:${lineOf(raw, m.index)}`);
  }
  for (const m of scan.matchAll(/^>\s*\[!(\w+)\]/gmu)) {
    warn(`用了 callout 语法 \`[!${m[1]}]\`。请改成 \`> <b>*Note*</b>\` 标签独占一行的普通引用块（见 references/editor-compatibility.md）。`, `${rel}:${lineOf(raw, m.index)}`);
  }
  for (const m of scan.matchAll(/^>\s*\*\*(Note|Tip|Important|Warning|Caution)\*\*:?/gmu)) {
    warn(`标注标签用了 Markdown 粗体 \`**${m[1]}**\`。用户的主题不显示 \`**粗体**\`，请改成 \`<b>*${m[1]}*</b>\`。`, `${rel}:${lineOf(raw, m.index)}`);
  }
  const h1s = [...scan.matchAll(/^#\s+\S.*$/gmu)];
  if (h1s.length > 1) warn(`文件里有 ${h1s.length} 个 H1 标题（第 ${h1s.map((m) => lineOf(raw, m.index)).join('、')} 行），应只有一个。`, rel);

  /* 迁移残留 */
  if (!hasLegacyConceptFiles && !isLog) {
    const stale = [...scan.replace(/\]\([^)]*\)/gu, ']').matchAll(/(?<![\w/%-])C\d{1,2}-\d{2}(?![\w-])/gu)];
    if (stale.length) {
      const sample = [...new Set(stale.map((m) => m[0]))].slice(0, 5).join('、');
      warn(`正文里有 ${stale.length} 处旧式概念编号（如 ${sample}）。概念文件已不存在，读者无从查找；请改成「概念小节名 + 锚点链接」。`, rel);
    }
  }
  const legacyNote = scan.match(/原概念笔记[:：]/gu);
  if (legacyNote) warn(`有 ${legacyNote.length} 行「原概念笔记：…（已并入本节）」迁移说明，读者不需要它，请删除。`, rel);

  /* 代码与输出绑定 */
  checkSnippets(raw, file, rel);

  /* 课程线：可移植路径、答案泄漏（所有笔记），节内施工线（节笔记） */
  const chapterOfFile = CH_DIR.exec(rel.split('/')[0] || '');
  if (!isLog) checkAbsolutePaths(raw, rel);
  if (chapterOfFile) checkLeaks(raw, rel, Number(chapterOfFile[1]));
  if (secMatch && chapterOfFile) checkCourseLine(file, raw, rel, Number(secMatch[1]), Number(secMatch[2]), chapterOfFile[2]);

  /* 节笔记：练习、导航、预算 */
  if (secMatch) {
    /* 只数「本节练习」小节里的答案块：正文里的留空例题也会带答案块，但不算练习。 */
    const practice = /^##\s*本节练习[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/mu.exec(scan);
    const answers = ((practice ? practice[1] : scan).match(ANSWER_BLOCK) || []).length;
    if (!practice) warn('缺少 `## 本节练习` 小节。', rel);
    if (answers < BUDGET.quizMin || answers > BUDGET.quizMax) {
      warn(`本节练习有 ${answers} 个「答案与解析」块，应为 ${BUDGET.quizMin}–${BUDGET.quizMax} 个。`, rel);
    }
    if (!/(上一节|下一节)[:：]/u.test(scan)) warn('缺少上一节 / 下一节导航行。', rel);
    const lines = raw.split('\n').length;
    if (lines > BUDGET.sectionLines) {
      warn(`本节 ${lines} 行，超过 ${BUDGET.sectionLines} 行的篇幅预算。篇幅按学时算（3–5 步 × 10–20 分钟）：先拆节，不要靠「决定不拆」绕过。`, rel);
    }
    const labels = (scan.match(LABEL_LINE) || []).length;
    if (labels > BUDGET.labels) {
      warn(`本节有 ${labels} 个标注块，超过 ${BUDGET.labels} 个的预算。标注块太多时重点反而被淹没：把普通叙述改回正文。`, rel);
    }
    const concepts = [...scan.matchAll(/^#{2,3}\s+概念\s*(\d+)\s*[：:]\s*(.+)$/gmu)];
    concepts.forEach((c, i) => {
      if (Number(c[1]) !== i + 1) warn(`概念编号不连续：第 ${i + 1} 个概念的编号是 ${c[1]}。`, rel);
    });
  }

  /* 章测试：分值格式与跨章回顾 */
  if (isTest && fm) {
    const chNo = Number(fm.get('chapter'));
    if (Number.isInteger(chNo) && chNo >= 3 && !/【回顾/u.test(scan)) {
      warn('第 3 章起，章末测试应包含 10–20 分的跨章回顾题（题号后标注 `【回顾 CX】`）。', rel);
    }
  }
}

/* ------------------------------------------------- 代码 / 输出绑定 */

function checkSnippets(raw, file, rel) {
  const re = /<!--\s*(source|output)\s*:\s*([^>]+?)\s*-->[ \t]*\r?\n(?:[ \t]*\r?\n)?([ \t>]*)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t>]*\4[ \t]*$/gmu;
  for (const m of raw.matchAll(re)) {
    const [, kind, refPath, , , body] = m;
    const where = `${rel}:${lineOf(raw, m.index)}`;
    const candidates = [resolve(root, refPath), resolve(dirname(file), refPath)];
    const target = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (!target) {
      error(`<!-- ${kind}: ${refPath} --> 指向的文件不存在（按笔记根目录或本文件目录解析）。`, where);
      continue;
    }
    const have = new Set(readFileSync(target, 'utf8').split(/\r?\n/u).map((l) => l.trim()).filter(Boolean));
    const lines = body.split(/\r?\n/u)
      .map((l) => l.replace(/^[ \t]*>[ \t]?/u, '').trim())
      .filter((l) => l && !/^(?:\.\.\.|…+|#\s*(?:\.\.\.|…+).*|\/\/\s*(?:\.\.\.|…+).*)$/u.test(l));
    const missing = lines.filter((l) => !have.has(l));
    if (missing.length) {
      error(`${kind === 'source' ? '代码片段' : '输出'}有 ${missing.length} 行不在 \`${refPath}\` 里（首行：\`${missing[0].slice(0, 60)}\`）。` +
        `${kind === 'source' ? '片段必须从真实文件里摘取（新写法用【新建】/【修改】给出读者照敲的完整内容，不要节选）' : '输出必须是运行后保存的真实结果'}。`, where);
    }
  }
  const scan = stripCode(raw);
  const claims = [...scan.matchAll(/真实输出/gu)].length;
  const bound = [...raw.matchAll(/<!--\s*output\s*:/gu)].length;
  if (claims > bound) {
    warn(`有 ${claims} 处写着「真实输出」，但只有 ${bound} 处用 \`<!-- output: 路径 -->\` 绑定了运行结果文件。没有绑定就无法证明它真的跑过。`, rel);
  }
}

/* ---------------------------------------------------- 3b. 课程线：全库 */

function hasSourceFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SNAPSHOT_IGNORE.has(e.name) || e.name === 'out') continue;
    const full = join(dir, e.name);
    if (e.isDirectory() ? hasSourceFiles(full) : /\.(?:py|js|mjs|cjs|ts|tsx|java|c|cc|cpp|go|rs|rb|jl|r)$/iu.test(e.name)) return true;
  }
  return false;
}

function checkNotebooks() {
  const codeDir = join(root, 'code');
  if (!existsSync(codeDir)) return;
  const found = [];
  const visit = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (SNAPSHOT_IGNORE.has(e.name)) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.name.endsWith('.ipynb')) found.push(full);
    }
  };
  visit(codeDir);
  for (const f of found) {
    const rel = relative(root, f).replace(/\\/g, '/');
    if (!/^code\/notebooks\/C\d+_[^/]+\.ipynb$/u.test(rel)) {
      lint('R8', `notebook 应放在 \`code/notebooks/\`，命名为 \`CN_主题.ipynb\`（N = 第几章开始用它）${/^code\/answer\//u.test(rel) ? '；答案区是框架代码的快照，框架代码不进 notebook' : ''}。`, rel);
      continue;
    }
    let nb;
    try { nb = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { error(`notebook 不是合法的 JSON：${e.message}`, rel); continue; }
    const cells = Array.isArray(nb.cells) ? nb.cells : [];
    if (!cells.length) warn('notebook 里没有任何格。', rel);
    const withOutput = cells.filter((c) => c && c.cell_type === 'code' && Array.isArray(c.outputs) && c.outputs.length).length;
    if (withOutput) lint('R8', `有 ${withOutput} 个代码格带着输出：notebook 的输出要由读者自己跑出来，交付前清空输出。`, rel);
  }
}

const sectionEntries = [...chapterInfo.values()].flatMap((ch) => ch.sections.map((s) => ({ ch, s, rel: `${ch.dir}/${s.file}` })));
const libraryOps = sectionEntries.reduce((n, { s, rel }) => n + courseOf(s.path, rel).ops.filter((o) => o.kind !== '运行').length, 0);
const projectBased = libraryOps > 0 || existsSync(join(root, 'code', 'answer'));

if (partial) {
  const targetSet = new Set(onlyAbs);
  if (projectBased && sectionEntries.some(({ s }) => targetSet.has(s.path))) replayCourse(targetSet);
} else {
  if (course.h2Concepts.length && course.h3Concepts.length) {
    lint('R3', `全库混用两种概念写法：${new Set(course.h3Concepts).size} 篇用 \`### 概念 N\`，${new Set(course.h2Concepts).size} 篇用 \`## 概念 N\`。二选一并全库统一（推荐 \`###\`）。`, '课程线');
  }
  const codeDir = join(root, 'code');
  if (!projectBased && existsSync(codeDir) && hasSourceFiles(codeDir)) {
    lint('R4', '`code/` 里是写好的成品代码，但库里没有 `code/answer/chNN/` 快照，正文也没有【新建】/【修改】标签：读者拿到的是别人的最终版，而不是从空目录一步步长出来的 `project/`，也无法检查最终版泄漏。迁移方法见插件 README「老库怎么按新结构逐步迁移」。', 'code/');
  }
  if (projectBased) {
    const n = replayCourse(undefined);
    if (replayTo) console.error(`replay：写出 ${n} 个【运行】快照到 ${replayTo}`);
  }
  for (const ch of chapterInfo.values()) {
    if (/毕业设计/u.test(ch.name) || !ch.sections.length) continue;
    const last = ch.sections[ch.sections.length - 1];
    const rel = `${ch.dir}/${last.file}`;
    const p = courseOf(last.path, rel);
    const blockEnd = (h) => (p.heads.find((x) => x.line > h.line && x.level <= h.level) || { line: p.lines.length + 1 }).line;
    const smoke = p.heads.find((h) => h.level >= 2 && /通跑|冒烟/u.test(h.text));
    if (!smoke) {
      lint('R6', `第 ${ch.no} 章最后一节没有「章末通跑」：章末要从头跑一遍整个 project/（一条命令 + 真实输出；非代码科目是从头验算、复述一遍自己的产物）。`, rel);
    } else if (projectBased) {
      const seg = segmentText(p, smoke.line, blockEnd(smoke));
      if (!/【运行】/u.test(seg) || !OUTPUT_MARK.test(seg)) {
        lint('R6', `「${smoke.text}」里要有【运行】命令和绑定的真实输出（\`<!-- output: … -->\`）：跑不起来 = 这一章没写完。`, `${rel}:${smoke.line}`);
      }
    }
    const map = p.heads.find((h) => /项目地图|产物地图/u.test(h.text));
    if (!map) {
      lint('R7', projectBased
        ? `第 ${ch.no} 章最后一节没有「项目地图」：当前 project/ 的文件树 + 每个文件一句话职责 + 本章动了哪些文件。`
        : `第 ${ch.no} 章最后一节没有「项目地图」：读者手上那份东西（推导本、句子本、时间线……）的目录 + 每一部分一句话说明 + 本章动了哪些部分。`, rel);
    } else {
      const end = blockEnd(map);
      const miss = [];
      if (projectBased) {
        const tree = p.fences.some((f) => f.start > map.line && f.start < end && ['text', 'mermaid', ''].includes(f.lang) && f.body.some((l) => /project\//u.test(l)));
        if (!tree) miss.push('含 `project/` 的文件树（```text 或 ```mermaid）');
      } else {
        /* 非代码科目没有 project/：只要求有一份目录（列表、表格或文本块），形式不限。 */
        const seg = segmentText(p, map.line, end);
        const listed = /^\s*(?:[-*+]|\d+[.)、]|\|)\s?/mu.test(seg) || p.fences.some((f) => f.start > map.line && f.start < end);
        if (!listed) miss.push('一份目录（列表、表格或 ```text 块）');
      }
      if (!/本章动了/u.test(segmentText(p, map.line, end))) miss.push('「本章动了」哪些文件');
      if (miss.length) lint('R7', `「${map.text}」缺少 ${miss.join('、')}。`, `${rel}:${map.line}`);
    }
  }
  checkNotebooks();
}
/* ---------------------------------------------------- 4. notes_data.js */

let data;
if (!partial && existsSync(dataPath)) {
  context = 'web/notes_data.js';
  const src = readFileSync(dataPath, 'utf8');
  try {
    const sandbox = {};
    // eslint-disable-next-line no-new-func
    new Function('window', src)(sandbox);
    data = sandbox.NOTES_DATA;
    if (!data || typeof data !== 'object' || !Array.isArray(data.chapters)) {
      error('`notes_data.js` 没有定义有效的 `window.NOTES_DATA`（缺少 chapters 数组）。');
      data = undefined;
    }
  } catch (e) {
    error(`\`notes_data.js\` 解析失败：${e.message}`);
  }
  const placeholder = src.match(PLACEHOLDER);
  if (placeholder) error(`\`notes_data.js\` 残留占位符 ${placeholder[0]}。`);
}

if (data) checkData(data);

function checkData(data) {
  if (!data.meta || typeof data.meta.subject !== 'string' || !data.meta.subject) warn('`meta.subject` 缺失或为空。');
  if (data.meta && data.meta.chapters !== undefined && data.meta.chapters !== data.chapters.length) {
    warn(`\`meta.chapters\` = ${data.meta.chapters}，但 chapters 数组实际有 ${data.chapters.length} 项。`);
  }

  const knownNames = new Set();
  const dataSectionFiles = new Set();
  const dataTestFiles = new Set();
  const lastNo = Math.max(0, ...data.chapters.map((c) => (Number.isInteger(c?.no) ? c.no : 0)));
  let usedAtomic = false;

  data.chapters.forEach((ch, ci) => {
    const where = `chapters[${ci}] (${ch && ch.title ? ch.title : '?'})`;
    if (!ch || typeof ch !== 'object') { error('章条目不是对象。'); return; }
    if (typeof ch.id !== 'string' || !ch.id) error('缺少 `id`。', where);
    if (typeof ch.title !== 'string' || !ch.title) error('缺少 `title`。', where);
    if (!Number.isInteger(ch.no)) error('缺少整数 `no`。', where);

    const dir = chapterDirs.find((d) => d.no === ch.no);
    const info = chapterInfo.get(ch.no);
    if (!dir) error(`章号 ${ch.no} 在磁盘上没有对应的 \`Cha_${ch.no} 章名\` 目录。`, where);
    else if (typeof ch.title === 'string' && !ch.title.includes(dir.name)) {
      warn(`章 \`title\` = "${ch.title}" 里没有目录名「${dir.name}」。`, where);
    }
    if (typeof ch.brief !== 'string' || !ch.brief) warn('缺少 `brief`（仪表盘上的一句话导读）。', where);

    if (ch.sheet !== undefined && ch.sheet !== null) {
      if (typeof ch.sheet?.file !== 'string') error('`sheet` 应为 `{ file: "/Cha_X 章名/CX 速查.md" }`。', where);
      else if (!existsSync(join(root, ch.sheet.file.replace(/^\//u, '')))) error(`\`sheet.file\` 指向的文件不存在："${ch.sheet.file}"。`, where);
    } else if (dir && existsSync(join(dir.path, `C${ch.no} 速查.md`))) {
      warn(`磁盘上有 \`C${ch.no} 速查.md\`，但章条目没有 \`sheet\`，门户里看不到它。`, where);
    }

    if (!Array.isArray(ch.sections) || ch.sections.length === 0) {
      error('缺少 `sections` 数组（或为空）。', where);
    } else {
      if (info && ch.sections.length !== info.sections.length) {
        warn(`章内 ${ch.sections.length} 节数据，磁盘上有 ${info.sections.length} 篇节笔记。`, where);
      }
      ch.sections.forEach((sec, si) => {
        const sw = `${where} > sections[${si}]`;
        if (!sec || typeof sec !== 'object') { error('节条目不是对象。', sw); return; }
        if (typeof sec.id !== 'string' || !sec.id) error('缺少 `id`（形如 c1s1）。', sw);
        if (!Number.isInteger(sec.no)) error('缺少整数 `no`。', sw);
        if (typeof sec.title !== 'string' || !sec.title) error('缺少 `title`。', sw);
        else knownNames.add(sec.title);
        if (typeof sec.file !== 'string' || !sec.file) error('缺少 `file`。', sw);
        else {
          dataSectionFiles.add(sec.file);
          if (!sec.file.startsWith('/')) error(`\`file\` 必须以 / 开头（站点根绝对路径）："${sec.file}"。`, sw);
          const abs = join(root, sec.file.replace(/^\//u, ''));
          if (!existsSync(abs)) error(`\`file\` 指向的文件不存在："${sec.file}"（逐字符核对文件名）。`, sw);
          else if (typeof sec.title === 'string' && basename(abs, '.md') !== sec.title) {
            error(`\`title\` = "${sec.title}"，但文件实际名为 "${basename(abs)}"（必须逐字符一致）。`, sw);
          }
        }
        if (!Array.isArray(sec.quiz)) error('缺少 `quiz` 数组。', sw);
        else {
          if (sec.quiz.length < BUDGET.quizMin || sec.quiz.length > BUDGET.quizMax) {
            error(`\`quiz\` 有 ${sec.quiz.length} 题，应为 ${BUDGET.quizMin}–${BUDGET.quizMax} 题。`, sw);
          }
          sec.quiz.forEach((q, qi) => validateQuestion(q, `${sw} > quiz[${qi}]`, false));
        }
        if (Array.isArray(sec.concepts)) {
          const secAbs = typeof sec.file === 'string' ? join(root, sec.file.replace(/^\//u, '')) : '';
          sec.concepts.forEach((c) => {
            if (!c || typeof c.name !== 'string' || !c.name.trim()) { warn('`concepts` 的元素缺少 `name`。', sw); return; }
            knownNames.add(c.name);
            /* 门户徽章跳转的锚点是 slugify("概念 n：name")，所以标题必须带编号（## 或 ### 都行）。 */
            if (secAbs && existsSync(secAbs) && Number.isInteger(c.n) && !hasAnchor(anchorsOf(secAbs), slugify(`概念 ${c.n}：${c.name}`))) {
              warn(`\`concepts\` 里的「${c.n}. ${c.name}」在 md 里没有对应标题 \`概念 ${c.n}：${c.name}\`（## 或 ###），门户徽章点了跳不过去。`, sw);
            }
          });
        } else if (Array.isArray(sec.atomic)) {
          usedAtomic = true;
          sec.atomic.forEach((a) => { if (typeof a === 'string') knownNames.add(a); });
        } else {
          warn('缺少 `concepts` 数组（本节的概念小节 `[{ n, name }]`）。', sw);
        }
      });
    }

    if (ch.test === null || ch.test === undefined) {
      if (ch.no !== lastNo) warn('该章没有章末测试数据（`test: null`）。除了毕业设计章，每章都应有测试。', where);
    } else {
      const tw = `${where} > test`;
      if (typeof ch.test !== 'object') { error('`test` 既不是对象也不是 null。', where); return; }
      if (typeof ch.test.title !== 'string' || !ch.test.title) warn('`test.title` 缺失。', tw);
      if (typeof ch.test.file !== 'string' || !ch.test.file) error('`test.file` 缺失。', tw);
      else {
        dataTestFiles.add(ch.test.file);
        if (!existsSync(join(root, ch.test.file.replace(/^\//u, '')))) error(`\`test.file\` 指向的文件不存在："${ch.test.file}"。`, tw);
      }
      if (ch.test.total !== 100) error(`\`test.total\` = ${ch.test.total}，必须为 100。`, tw);
      if (!Array.isArray(ch.test.questions) || ch.test.questions.length === 0) error('`test.questions` 缺失或为空。', tw);
      else {
        ch.test.questions.forEach((q, qi) => validateQuestion(q, `${tw} > questions[${qi}]`, true));
        const sum = ch.test.questions.reduce((acc, q) => acc + (typeof q?.score === 'number' ? q.score : 0), 0);
        if (sum !== 100) error(`各题分值之和为 ${sum}，必须恰为 100。`, tw);
        const objective = ch.test.questions.filter((q) => OBJECTIVE.has(q?.type))
          .reduce((acc, q) => acc + (typeof q?.score === 'number' ? q.score : 0), 0);
        if (objective < 60) error(`客观题（选择/判断/填空）合计 ${objective} 分，应 ≥ 60 分。`, tw);
      }
    }
  });

  if (usedAtomic) warn('`atomic` 是旧字段名（来自"一个概念一个文件"的时代），请改用 `concepts: [{ n, name }]`。门户两者都认。');

  for (const ch of chapterInfo.values()) {
    for (const s of ch.sections) {
      const expected = `/${ch.dir}/${s.file}`;
      if (!dataSectionFiles.has(expected)) warn(`节笔记「${s.file}」没有出现在 notes_data.js 中（路径应为 "${expected}"）。`, ch.dir);
    }
    const testPath = `/${ch.dir}/C${ch.no} 测试.md`;
    if (existsSync(join(ch.path, `C${ch.no} 测试.md`)) && !dataTestFiles.has(testPath)) {
      warn(`章末测试「C${ch.no} 测试.md」没有出现在 notes_data.js 中（路径应为 "${testPath}"）。`, ch.dir);
    }
  }

  if (data.links !== undefined) {
    if (!Array.isArray(data.links)) warn('`links` 应为数组（每项是一对概念小节名）。');
    else data.links.forEach((pair, i) => {
      if (!Array.isArray(pair) || pair.length < 2) { warn('`links` 的每一项应为两个名称组成的数组。', `links[${i}]`); return; }
      pair.slice(0, 2).forEach((t) => {
        if (typeof t === 'string' && !knownNames.has(t)) warn(`\`links\` 引用了 notes_data.js 里不存在的概念小节 "${t}"。`, `links[${i}]`);
      });
    });
  }

  crossCheck(data);
}

function validateQuestion(q, where, isTest) {
  if (!q || typeof q !== 'object') { error('题目不是对象。', where); return; }
  if (isTest && (typeof q.id !== 'string' || !q.id)) error('缺少 `id`。', where);
  if (!QUIZ_TYPES.has(q.type)) error(`\`type\` = "${q.type}" 不合法（应为 choice/judge/fill/calc/subjective）。`, where);
  if (typeof q.question !== 'string' || !q.question.trim()) error('`question` 缺失或为空。', where);
  if (typeof q.analysis !== 'string' || !q.analysis.trim()) error('`analysis` 缺失或为空（必须给出解析）。', where);
  if (isTest && (typeof q.score !== 'number' || q.score <= 0)) error('`score` 必须是正数。', where);
  if (q.type === 'choice') {
    if (!Array.isArray(q.options) || q.options.length < 2) error('选择题需要 `options`（至少 2 项）。', where);
    else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
      error(`选择题 \`answer\` = ${JSON.stringify(q.answer)} 越界（应为 0..${q.options.length - 1} 的选项下标）。`, where);
    }
  } else if (q.type === 'judge') {
    if (typeof q.answer !== 'boolean') error(`判断题 \`answer\` = ${JSON.stringify(q.answer)} 应为 true / false。`, where);
  } else if (typeof q.answer !== 'string' || !q.answer.trim()) {
    error(`${q.type} 题需要一个非空的参考答案文本。`, where);
  }
}

function crossCheck(data) {
  const TEST_SCORE_RE = /\*\*\s*(\d+)\s*[.．、]\s*[（(]\s*(\d+)\s*分\s*[)）]\s*(?:【[^】\n]*】\s*)?\*\*/gu;
  data.chapters.forEach((ch, ci) => {
    const where = `chapters[${ci}] (${ch?.title ?? '?'})`;
    (ch?.sections ?? []).forEach((sec, si) => {
      const sw = `${where} > sections[${si}]`;
      if (typeof sec?.file !== 'string') return;
      const abs = join(root, sec.file.replace(/^\//u, ''));
      if (!existsSync(abs)) return;
      const raw = readFileSync(abs, 'utf8');
      const scan = stripCode(raw);
      const answers = (scan.match(ANSWER_BLOCK) || []).length;
      const quizCount = Array.isArray(sec.quiz) ? sec.quiz.length : 0;
      if (answers && answers !== quizCount) warn(`节笔记里有 ${answers} 个答案块，notes_data.js 的 \`quiz\` 有 ${quizCount} 题，两者应一一对应。`, sw);
      /* 两种口径任一对上即可：保留行内代码（题干以代码开头时）、去掉行内代码
       * （js 把代码挪了位置，或行内代码里的 $ 会打乱公式配对时）。 */
      const flatKeep = normalizeForMatch(stripFences(raw));
      const flatDrop = normalizeForMatch(stripCode(raw));
      (sec.quiz ?? []).forEach((q, qi) => {
        if (typeof q?.question !== 'string') return;
        const probe = normalizeForMatch(q.question).slice(0, 10);
        const probeDrop = normalizeForMatch(q.question.replace(/`[^`\n]*`/gu, '')).slice(0, 10);
        const found = flatKeep.includes(probe) || (probeDrop.length >= 4 && flatDrop.includes(probeDrop));
        if (probe.length >= 4 && !found) {
          warn(`\`quiz[${qi}]\` 的题干开头在对应 .md 里找不到（可能是 md 改了而 js 没同步）："${probe}"`, sw);
        }
      });
    });

    const test = ch?.test;
    if (!test || typeof test.file !== 'string') return;
    const abs = join(root, test.file.replace(/^\//u, ''));
    if (!existsSync(abs)) return;
    const scan = stripCode(readFileSync(abs, 'utf8'));
    const scores = [...scan.matchAll(TEST_SCORE_RE)].map((m) => Number(m[2]));
    const jsScores = (test.questions ?? []).map((q) => (typeof q?.score === 'number' ? q.score : 0));
    if (!scores.length) {
      warn('测试文件里没有找到 `**N.（M 分）**` 形式的题号与分值，无法核对 md 与 notes_data.js。', `${where} > test`);
      return;
    }
    if (scores.length !== jsScores.length) error(`测试 md 里有 ${scores.length} 题，notes_data.js 里有 ${jsScores.length} 题。`, `${where} > test`);
    const mdSum = scores.reduce((a, b) => a + b, 0);
    if (mdSum !== 100) error(`测试 md 里标注的分值合计为 ${mdSum}，必须恰为 100。`, `${where} > test`);
    if (scores.join(',') !== jsScores.join(',')) {
      error(`测试 md 的分值序列 [${scores.join(', ')}] 与 notes_data.js 的 [${jsScores.join(', ')}] 不一致。`, `${where} > test`);
    }
  });
}

/* ---------------------------------------------------------------- 输出 */

const errors = problems.filter((p) => p.kind === 'error');
const warns = problems.filter((p) => p.kind === 'warn');

if (asJson) {
  console.log(JSON.stringify({ root, partial, strict, errors: errors.length, warnings: warns.length, problems }, undefined, 2));
} else {
  const groups = new Map();
  for (const p of problems) {
    if (!groups.has(p.where)) groups.set(p.where, []);
    groups.get(p.where).push(p);
  }
  for (const [where, list] of groups) {
    console.log(`\n== ${where}`);
    for (const p of list) console.log(`   [${p.kind}] ${p.message}`);
  }
  console.log('');
  if (!problems.length) console.log('OK：没有发现问题。');
  const courseCount = problems.filter((p) => /^\[R\d+\]/u.test(p.message)).length;
  if (courseCount && !strict) console.log(`其中 ${courseCount} 条是课程线规则 [R1]–[R11]（默认 warning；新库请用 --strict 验收）。`);
  console.log(`SUMMARY ERRORS=${errors.length} WARNINGS=${warns.length}${partial ? ' (--only)' : ''}${strict ? ' (--strict)' : ''} ROOT=${root}`);
}

process.exit(errors.length ? 1 : 0);

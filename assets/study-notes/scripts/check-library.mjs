#!/usr/bin/env node
/**
 * check-library.mjs —— 学习笔记库交付前校验器
 *
 * 用法：
 *   node check-library.mjs "<笔记根目录>"
 *   node check-library.mjs "<笔记根目录>" --json
 *   node check-library.mjs "<笔记根目录>" --only "Cha_1 章名/C1 Sec_1 节名.md"   # 样章 / 单篇检查
 *   node check-library.mjs --help
 *
 * 只依赖 Node 内置模块。退出码：0 = 无 error（可能有 warning），1 = 存在 error，2 = 用法错误。
 *
 * 检查范围见 references/quality-gates.md 第二节。脚本只能证明机械一致性，
 * 证明不了知识正确性——那部分必须人工过。
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, basename, extname, resolve, isAbsolute } from 'node:path';

const HELP = `check-library.mjs —— 学习笔记库交付前校验器

用法：
  node check-library.mjs "<笔记根目录>"                     人类可读报告
  node check-library.mjs "<笔记根目录>" --json              JSON 输出
  node check-library.mjs "<笔记根目录>" --only "<相对路径>"  只查指定笔记（可重复；样章阶段用）
  node check-library.mjs --help

退出码：0 = 无 error（可能有 warning）；1 = 存在 error；2 = 用法错误。

检查：
  结构    命名规范、frontmatter、必备产物、章末测试/速查是否齐全
  链接    标准链接与图片是否存在、锚点是否对得上标题、空链接、越出笔记根目录的链接
  可移植  wikilink / 嵌入 / callout / 单行 $$ / 单 $ 定界符 / 多 H1
  教学    每节练习 3–5 题、篇幅与标注块预算、旧式概念编号残留、章测试的跨章回顾题
  代码    <!-- source: --> / <!-- output: --> 标记的代码与输出是否真的来自对应文件
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
const ROOT_DIR_ALLOW = new Set(['web', 'code', 'assets', 'node_modules']);

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

/** 去掉围栏代码块与行内代码（保留行数，便于报告行号）。 */
function stripCode(text) {
  return text
    .replace(/^[ \t>]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t>]*\1[ \t]*$/gmu, (m) => m.replace(/[^\n]/gu, ' '))
    .replace(/`[^`\n]*`/gu, (m) => ' '.repeat(m.length));
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
const only = [];
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--only') { if (argv[i + 1]) only.push(argv[i + 1]); i += 1; continue; }
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
      warn(`本节 ${lines} 行，超过 ${BUDGET.sectionLines} 行的篇幅预算。考虑拆成两节，或把推导细节移到附录式小节。`, rel);
    }
    const labels = (scan.match(LABEL_LINE) || []).length;
    if (labels > BUDGET.labels) {
      warn(`本节有 ${labels} 个标注块，超过 ${BUDGET.labels} 个的预算。标注块太多时重点反而被淹没：把普通叙述改回正文。`, rel);
    }
    const concepts = [...scan.matchAll(/^##\s+概念\s+(\d+)[：:]\s*(.+)$/gmu)];
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
        `${kind === 'source' ? '片段必须从真实文件里摘取' : '输出必须是运行后保存的真实结果'}；省略处写 \`# ...\`。`, where);
    }
  }
  const scan = stripCode(raw);
  const claims = [...scan.matchAll(/真实输出/gu)].length;
  const bound = [...raw.matchAll(/<!--\s*output\s*:/gu)].length;
  if (claims > bound) {
    warn(`有 ${claims} 处写着「真实输出」，但只有 ${bound} 处用 \`<!-- output: 路径 -->\` 绑定了运行结果文件。没有绑定就无法证明它真的跑过。`, rel);
  }
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
          sec.concepts.forEach((c) => {
            if (!c || typeof c.name !== 'string' || !c.name.trim()) warn('`concepts` 的元素缺少 `name`。', sw);
            else knownNames.add(c.name);
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
      const scan = stripCode(readFileSync(abs, 'utf8'));
      const answers = (scan.match(ANSWER_BLOCK) || []).length;
      const quizCount = Array.isArray(sec.quiz) ? sec.quiz.length : 0;
      if (answers && answers !== quizCount) warn(`节笔记里有 ${answers} 个答案块，notes_data.js 的 \`quiz\` 有 ${quizCount} 题，两者应一一对应。`, sw);
      const flat = normalizeForMatch(scan);
      (sec.quiz ?? []).forEach((q, qi) => {
        if (typeof q?.question !== 'string') return;
        const probe = normalizeForMatch(q.question).slice(0, 10);
        if (probe.length >= 4 && !flat.includes(probe)) {
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
  console.log(JSON.stringify({ root, partial, errors: errors.length, warnings: warns.length, problems }, undefined, 2));
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
  console.log(`SUMMARY ERRORS=${errors.length} WARNINGS=${warns.length}${partial ? ' (--only)' : ''} ROOT=${root}`);
}

process.exit(errors.length ? 1 : 0);

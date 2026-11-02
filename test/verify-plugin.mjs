/**
 * 验证 dsh-study-notes 插件本身：语法、skill provider 契约、
 * 门户渲染器与判分函数、模板行尾与资产清单。
 *
 *   node test/verify-plugin.mjs
 *
 * 退出码 0 = 全部通过。
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SKILL_DIR = join(PKG, 'assets', 'study-notes');

let failures = 0;
let checks = 0;

function ok(name, cond, detail) {
  checks += 1;
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}
function section(title) { console.log(`\n=== ${title}`); }

/* ------------------------------------------------------------ 1. 语法 */

section('1. 语法检查');

for (const file of [
  join(PKG, 'index.js'),
  join(SKILL_DIR, 'scripts', 'check-library.mjs'),
  join(SKILL_DIR, 'scripts', 'run-course.mjs'),
  join(HERE, 'check-fixture.mjs'),
  join(HERE, 'run-sample.mjs'),
  join(SKILL_DIR, 'templates', 'web', 'serve.mjs'),
  join(SKILL_DIR, 'templates', 'callout-to-blockquote.mjs'),
  join(SKILL_DIR, 'templates', 'fix-math-delims.mjs'),
  fileURLToPath(import.meta.url)
]) {
  /* stdio: 'inherit' —— 沙箱下 Node 无法用管道捕获子进程输出，因此只看退出码。 */
  const r = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  ok(`语法 ${file.slice(PKG.length + 1)}`, r.status === 0, `exit ${r.status}`);
}

const portalHtml = readFileSync(join(SKILL_DIR, 'templates', 'web', 'index.html'), 'utf8');
const inlineScripts = [...portalHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gu)].map((m) => m[1]);
ok('门户内联脚本数量为 1', inlineScripts.length === 1, `实际 ${inlineScripts.length}`);

let portalCode = '';
try {
  portalCode = inlineScripts[0];
  new Function(portalCode);
  ok('门户内联脚本语法', true);
} catch (e) {
  ok('门户内联脚本语法', false, e.message);
}

/* ------------------------------------------------- 2. 门户渲染器无头验证 */

section('2. 门户渲染器 / 判分函数（无浏览器）');

function makeStub() {
  const el = () => ({
    onclick: null, innerHTML: '', textContent: '', style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null, replaceChild() {},
    querySelector: () => null, querySelectorAll: () => [], focus() {}
  });
  const document = {
    readyState: 'loading', title: '',
    head: { appendChild() {} }, body: { appendChild() {} },
    addEventListener() {}, createElement: el,
    querySelector: () => el(), querySelectorAll: () => []
  };
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  const window = { katex: undefined, NOTES_DATA: undefined, addEventListener() {}, scrollTo() {} };
  return {
    document, localStorage: storage, sessionStorage: storage,
    location: { hash: '', protocol: 'http:' }, navigator: {},
    fetch: () => Promise.reject(new Error('no network in test')),
    setTimeout, clearTimeout, window
  };
}

let portal = null;
try {
  const stub = makeStub();
  portal = new Function(
    'window', 'document', 'localStorage', 'sessionStorage', 'location', 'navigator',
    'fetch', 'setTimeout', 'clearTimeout', 'console',
    `${portalCode}\nreturn window.__NOTES_PORTAL__;`
  )(stub.window, stub.document, stub.localStorage, stub.sessionStorage,
    stub.location, stub.navigator, stub.fetch, stub.setTimeout, stub.clearTimeout, console);
  ok('调试出口 __NOTES_PORTAL__ 可用', !!portal && typeof portal.renderMarkdown === 'function');
} catch (e) {
  ok('门户脚本可在无头环境启动', false, e.stack || e.message);
}

if (portal) {
  const fixtureBox = {};
  new Function('window', readFileSync(join(SKILL_DIR, 'templates', 'web', 'notes_data.js'), 'utf8'))(fixtureBox);
  portal.useData(fixtureBox.NOTES_DATA);
  ok('useData 建立索引', portal.buildIndex(fixtureBox.NOTES_DATA).sections.c1s1 !== undefined);

  const md = [
    '---', 'subject: 测试', 'status: 未开始', '---', '',
    '# C1 Sec_1 基本对象', '',
    '> [!abstract] 本节导读',
    '> 讲 **基本对象**。行内公式 $a^2+b^2=c^2$，链接 [[基本对象]] 与 [[不存在的笔记]]。', '',
    '## 一、定义', '',
    '> [!note] 定义', '> 对象 $x$ 满足三条要求。', '',
    '> [!example]- 答案与解析', '> **答案**：B', '',
    '| 名称 | 含义 |', '|---|---|', '| $x$ | 基本对象 |', '',
    '- 第一项', '- 第二项', '  - 嵌套项', '',
    '1. 有序一', '2. 有序二', '',
    '- [ ] 待办', '- [x] 已完成', '',
    '```python', 'print("hi")', '```', '',
    '```mermaid', 'flowchart LR', '  A --> B', '```', '',
    '$$', 'E = mc^2', '$$', '',
    '![图](src/x.png)', '',
    '![[matmul.png]]', '',
    '段落结尾。'
  ].join('\n');

  const out = portal.renderMarkdown(portal.stripFrontmatter(md).body, {
    file: '/Cha_1 基础概念/C1 Sec_1 基本对象.md', chapterNo: 1, title: 'C1 Sec_1 基本对象'
  });

  for (const [name, cond] of [
    ['重复的一级标题被省略', !/<h1/u.test(out)],
    ['abstract callout 渲染', out.includes('callout--abstract') && out.includes('本节导读')],
    ['note callout 渲染', out.includes('callout--note')],
    ['折叠 callout 渲染', out.includes('callout-fold') && out.includes('答案与解析')],
    ['加粗渲染', out.includes('<strong>基本对象</strong>')],
    ['行内公式降级为 .tex', out.includes('class="tex"') && out.includes('data-tex="a^2+b^2=c^2"')],
    ['可解析的 wikilink 变链接', out.includes('href="#/read/c1s1"')],
    ['悬空 wikilink 标记为缺失', out.includes('wl-missing')],
    ['表格渲染', out.includes('<table>') && out.includes('<th>名称</th>')],
    ['无序列表渲染', out.includes('<ul>') && out.includes('<li>第一项')],
    ['嵌套列表渲染', (out.match(/<ul>/gu) || []).length >= 2],
    ['有序列表渲染', out.includes('<ol>') && out.includes('<li>有序一')],
    ['任务列表渲染', out.includes('type="checkbox"') && out.includes('checked')],
    ['代码块带语言标签', out.includes('cb-lang">python') && out.includes('print(&quot;hi&quot;)')],
    ['mermaid 降级为源码卡片', out.includes('cb-mermaid') && out.includes('mermaid-hint')],
    ['独立行公式降级', out.includes('tex-block') && out.includes('data-tex="E = mc^2"')],
    ['相对图片解析为站点根路径', out.includes('src="/Cha_1 基础概念/src/x.png"')],
    ['Obsidian 图片嵌入解析到章 src', out.includes('src="/Cha_1/src/matmul.png"')],
    ['无未替换的 HTML 转义残留', !out.includes('&amp;lt;')]
  ]) ok(`renderMarkdown(旧库兼容): ${name}`, cond, out.slice(0, 400));

  /* 当前规范的写法：<b>*Label*</b> 标注块、标准 .md 链接、锚点、安全 HTML */
  const md2 = [
    '# C1 Sec_1 基本对象', '',
    '> <b>*Note*</b>', '> 本节导读', '>', '> 讲 <b>基本对象</b>，公式 $x^2$。', '',
    '## 概念 1：基本对象', '',
    '> <b>*Warning*</b>', '> 易错点', '>', '> 不要混淆。', '',
    '**1.** 题干', '',
    '> <b>*Note*</b>', '> 答案与解析', '>', '> <b>答案</b>：B', '',
    '跳到 [本节概念](#概念-1-基本对象)，下一节 [C1 Sec_2 基本关系](C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md)，',
    '速查 [C1 速查](C1%20%E9%80%9F%E6%9F%A5.md)，测试 [C1 测试](C1%20%E6%B5%8B%E8%AF%95.md#一选择题)，',
    '大纲 [00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md)，空链接 [坏]()，缺失 [没有](C9%20Sec_9%20x.md)。', '',
    '<script>alert(1)</script>'
  ].join('\n');
  const out2 = portal.renderMarkdown(md2, { file: '/Cha_1 基础概念/C1 Sec_1 基本对象.md', chapterNo: 1, title: 'C1 Sec_1 基本对象' });
  for (const [name, cond] of [
    ['<b>*Note*</b> 标注块渲染为 note 框', out2.includes('callout--note') && out2.includes('本节导读')],
    ['<b>*Warning*</b> 标注块渲染为 warning 框', out2.includes('callout--warning') && out2.includes('易错点')],
    ['「答案与解析」标注块默认折叠', /callout--note callout-fold[\s\S]*答案与解析/u.test(out2)],
    ['标注块里的 <b> 保留为加粗', out2.includes('<b>基本对象</b>') || out2.includes('<strong>基本对象</strong>')],
    ['标题带锚点 id', out2.includes('id="概念-1-基本对象"')],
    ['#锚点链接变 data-anchor', out2.includes('data-anchor="概念-1-基本对象"')],
    ['同章 .md 链接跳到阅读视图', out2.includes('href="#/read/c1s2"')],
    ['速查 .md 链接跳到速查视图', out2.includes('href="#/sheet/c1"')],
    /* 测试视图是交互答卷而不是 md 渲染，锚点无处可落，所以只跳到整卷。 */
    ['测试 .md 链接（含锚点）跳到测试视图', out2.includes('<a href="#/test/c1">')],
    ['00 大纲链接跳到仪表盘', out2.includes('href="#/home"')],
    ['空链接与缺失链接标记为 wl-missing', (out2.match(/wl-missing/gu) || []).length >= 2],
    ['不安全 HTML 被转义', !out2.includes('<script>') && out2.includes('&lt;script&gt;')]
  ]) ok(`renderMarkdown(新写法): ${name}`, cond, out2.slice(Math.max(0, out2.indexOf('跳到')), out2.indexOf('跳到') + 900));
  ok('slugify 与规范一致', portal.slugify('概念 1：张量 Tensor 与 ndarray') === '概念-1-张量-tensor-与-ndarray', portal.slugify('概念 1：张量 Tensor 与 ndarray'));

  const g = portal.gradeOne;
  for (const [name, cond] of [
    ['grade: choice 正确', g({ type: 'choice', answer: 2 }, 2).correct === true],
    ['grade: choice 错误', g({ type: 'choice', answer: 2 }, 1).correct === false],
    ['grade: choice 支持字母答案', g({ type: 'choice', answer: 'B' }, 1).correct === true],
    ['grade: judge 布尔', g({ type: 'judge', answer: false }, false).correct === true],
    ['grade: fill 去空格', g({ type: 'fill', answer: '可判定性' }, '  可判定性 ').correct === true],
    ['grade: fill 多个可接受答案', g({ type: 'fill', answer: '可判定性|可判定' }, '可判定').correct === true],
    ['grade: fill 大小写不敏感', g({ type: 'fill', answer: 'ABC' }, 'abc').correct === true],
    ['grade: fill 空答案判错', g({ type: 'fill', answer: 'x' }, '').correct === false],
    ['grade: calc 不自动判分', g({ type: 'calc', answer: '过程' }, '随便').auto === false],
    ['grade: subjective 不自动判分', g({ type: 'subjective', answer: '要点' }, '').auto === false],
    ['resolveRelative 上跳目录', portal.resolveRelative('/Cha_1 X/C1 Sec_1 Y.md', '../src/a.png') === '/src/a.png'],
    ['resolveRelative 同级', portal.resolveRelative('/Cha_1 X/C1 Sec_1 Y.md', 'img/a.png') === '/Cha_1 X/img/a.png']
  ]) ok(name, cond);
}

/* ------------------------------------------------------ 3. 插件 provider */

section('3. 插件 apply() 与 skill provider 契约');

const mod = await import(`${new URL('../index.js', import.meta.url).href}`);
ok('导出 apply()', typeof mod.apply === 'function');
ok('导出 inject 含 skills', Array.isArray(mod.inject) && mod.inject.includes('skills'));
ok('导出 name', mod.name === 'study-notes');
ok('index.js 无外部依赖', !/^\s*import\s+(?!.*['"]node:)/mu.test(readFileSync(join(PKG, 'index.js'), 'utf8')));

let provider = null;
try {
  mod.apply({ skills: { registerProvider(create) { provider = create({ signal: new AbortController().signal, invalidate() {} }); return () => {}; } } }, {});
  ok('apply() 注册了 provider', !!provider);
} catch (e) {
  ok('apply() 注册了 provider', false, e.message);
}

if (provider) {
  ok('provider.name 非 runtime', provider.name === 'dsh-study-notes');
  const list = await provider.list({});
  ok('list() 返回数组且非空', Array.isArray(list) && list.length >= 1);

  const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
  for (const c of list) {
    const label = `candidate ${c.name}`;
    ok(`${label}: 名称合法`, SKILL_NAME.test(c.name));
    ok(`${label}: description 非空`, typeof c.description === 'string' && c.description.length > 0);
    ok(`${label}: invocation 双布尔`, typeof c.invocation?.modelInvocable === 'boolean' && typeof c.invocation?.userInvocable === 'boolean');
    ok(`${label}: source 字符串`, typeof c.source === 'string');
    ok(`${label}: rank 有限数`, typeof c.rank === 'number' && Number.isFinite(c.rank));
    ok(`${label}: provider 与注册名一致`, c.provider === provider.name);
    ok(`${label}: resourceBase 指向真实目录`, c.resourceBase?.kind === 'directory' && (() => {
      try { return readFileSync(join(c.resourceBase.path, 'SKILL.md'), 'utf8').length > 0; } catch { return false; }
    })());

    const def = await provider.get(c, { signal: undefined });
    ok(`${label}: get() 返回定义`, !!def && def.name === c.name && typeof def.content === 'string');
    if (c.name === 'study-notes') {
      ok('study-notes: 描述含中文触发词', /学习笔记|教学文档|从零/u.test(c.description), c.description);
      ok('study-notes: 描述长度 ≤ 500', c.description.length <= 500, `实际 ${c.description.length}`);
      ok('study-notes: 正文含资源绝对路径块', def.content.includes('studyNotesSkill'));
      ok('study-notes: 正文包含铁律与流程', def.content.includes('铁律') && def.content.includes('P0'));
      ok('study-notes: 正文字数充足', def.content.length > 3000, `实际 ${def.content.length}`);
    }
  }
  ok('get() 对未知名称返回 undefined', (await provider.get({ name: 'nope', locator: '/nope' }, {})) === undefined);
}

/* --------------------------------------------------- 4. 资产清单完整性 */

section('4. 资产清单与脚本细节');

for (const rel of [
  'SKILL.md',
  'references/notes-standard.md',
  'references/teaching-design.md',
  'references/editor-compatibility.md',
  'references/portal-standard.md',
  'references/workflow-and-recovery.md',
  'references/quality-gates.md',
  'references/subject-playbooks.md',
  'templates/syllabus.md',
  'templates/checklist.md',
  'templates/section-note.md',
  'templates/cheat-sheet.md',
  'templates/callout-to-blockquote.mjs',
  'templates/fix-math-delims.mjs',
  'templates/chapter-test.md',
  'templates/capstone.md',
  'templates/启动学习服务器.bat',
  'templates/start_server.sh',
  'templates/web/index.html',
  'templates/web/notes_data.js',
  'templates/web/serve.mjs',
  'scripts/check-library.mjs',
  'scripts/run-course.mjs'
]) {
  let size = 0;
  try { size = readFileSync(join(SKILL_DIR, rel), 'utf8').length; } catch { /* missing */ }
  ok(`存在且非空：${rel}`, size > 0, `size=${size}`);
}

const bat = readFileSync(join(SKILL_DIR, 'templates', '启动学习服务器.bat'), 'utf8');
ok('.bat 使用 CRLF 行尾', bat.includes('\r\n') && !/[^\r]\n/u.test(bat.replace(/\r\n/gu, '')));
ok('.bat 设置 UTF-8 代码页', bat.includes('chcp 65001'));
ok('.bat 切换到脚本目录', bat.includes('cd /d "%~dp0"'));
ok('.bat 探测 python / py -3 / node', bat.includes('python -c') && bat.includes('py -3 -c') && bat.includes('node -e'));
ok('.bat 默认端口 8765', bat.includes('8765'));
ok('.bat 用 for /f 判断端口占用（不依赖管道 errorlevel）', bat.includes('for /f') && bat.includes('LISTENING'));
ok('.bat 打开浏览器', bat.includes('start "" "%URL%"'));
ok('.bat 无运行时给出安装指引', bat.includes('https://www.python.org/downloads/') && bat.includes('https://nodejs.org/'));

const sh = readFileSync(join(SKILL_DIR, 'templates', 'start_server.sh'), 'utf8');
ok('.sh 使用 LF 行尾', !sh.includes('\r'));
ok('.sh 切换到脚本目录', sh.includes('cd "$(dirname "$0")"'));
ok('.sh 探测 python3/node', sh.includes('python3') && sh.includes('node'));
ok('.sh 默认端口 8765', sh.includes('8765'));
ok('.sh 真实 bind 测试端口', sh.includes('socket') && sh.includes('createServer'));

for (const rel of ['templates/syllabus.md', 'templates/checklist.md', 'templates/section-note.md', 'templates/cheat-sheet.md', 'templates/chapter-test.md', 'templates/capstone.md']) {
  const text = readFileSync(join(SKILL_DIR, rel), 'utf8');
  ok(`${rel}: 无被编码的占位符链接（%7B%7B）`, !text.includes('%7B%7B'));
  ok(`${rel}: 无旧式概念编号 CX-NN`, !/C(?:\d+|\{\{[A-Z_]+\}\})-\d{2}/u.test(text));
  ok(`${rel}: 无 callout / **Label**: 旧标注`, !/^>\s*(?:\[!\w+\]|\*\*(?:Note|Tip|Important|Warning|Caution)\*\*)/mu.test(text));
  const links = [...text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/gu)].map((m) => m[1]).filter((h) => !/^https?:/u.test(h));
  ok(`${rel}: 文件链接都带 .md / 图片扩展名`, links.every((h) => /\.(md|png|svg|jpg)$/u.test(h)), links.filter((h) => !/\.(md|png|svg|jpg)$/u.test(h)).join(', '));
}

/* ------------------------------------------- 5. 示例 notes_data.js 自洽 */

section('5. 示例 notes_data.js');

const sandbox = {};
new Function('window', readFileSync(join(SKILL_DIR, 'templates', 'web', 'notes_data.js'), 'utf8'))(sandbox);
const D = sandbox.NOTES_DATA;
ok('定义了 NOTES_DATA', !!D && Array.isArray(D.chapters));
if (D) {
  ok('meta.subject 存在', typeof D.meta?.subject === 'string' && D.meta.subject.length > 0);
  for (const ch of D.chapters) {
    for (const sec of ch.sections) {
      ok(`${sec.id}: 练习 3–5 道`, sec.quiz.length >= 3 && sec.quiz.length <= 5, `实际 ${sec.quiz.length}`);
      ok(`${sec.id}: concepts 为 [{ n, name }]`, Array.isArray(sec.concepts) && sec.concepts.every((c) => Number.isInteger(c.n) && typeof c.name === 'string'));
      ok(`${sec.id}: 不再使用旧字段 atomic`, sec.atomic === undefined);      for (const q of sec.quiz) {
        ok(`${sec.id}: ${q.type} 字段完整`, typeof q.question === 'string' && typeof q.analysis === 'string' && q.answer !== undefined);
      }
    }
    if (ch.test) ok(`${ch.id}: 有 sheet 速查`, typeof ch.sheet?.file === 'string' && /\/C\d+ 速查\.md$/u.test(ch.sheet.file));
    if (ch.test) {
      const sum = ch.test.questions.reduce((a, q) => a + q.score, 0);
      const obj = ch.test.questions.filter((q) => ['choice', 'judge', 'fill'].includes(q.type)).reduce((a, q) => a + q.score, 0);
      ok(`${ch.title}: total=100`, ch.test.total === 100);
      ok(`${ch.title}: 分值之和 = 100`, sum === 100, `实际 ${sum}`);
      ok(`${ch.title}: 客观题 ≥ 60`, obj >= 60, `实际 ${obj}`);
    }
  }
  ok('links 为非空数组', Array.isArray(D.links) && D.links.length > 0);
}

console.log(`\nSUMMARY CHECKS=${checks} FAILURES=${failures}`);
process.exit(failures ? 1 : 0);

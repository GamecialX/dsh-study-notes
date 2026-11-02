#!/usr/bin/env node
/**
 * run-course.mjs —— 把课程当读者照做一遍，并真的运行每一条【运行】命令
 *
 *   node run-course.mjs "<笔记根目录>"            比对：真实输出与正文绑定的 <!-- output: --> 文件是否一致
 *   node run-course.mjs "<笔记根目录>" --write    生成：写 code/out/*、正文里紧跟的 ```text 输出块、code/answer/chNN/
 *   node run-course.mjs "<笔记根目录>" --python "py -3"   指定替换命令开头 python / python3 的解释器
 *
 * 过程：调用同目录的 check-library.mjs --replay-to，从空目录按正文的【新建】/【修改】/【重构】
 * 重放出每次【运行】时的 project/ 快照；在快照里执行命令（stdout 与 stderr 合并）；
 * 保存前把快照的本机绝对路径去掉（规则 R11），回溯里的路径分隔符统一成 /。
 * 比对时忽略回溯栈帧行与耗时，因为它们随解释器版本和机器变化。
 *
 * 只依赖 Node 内置模块。退出码：0 = 全部一致（或 --write 完成）；1 = 有不一致；2 = 用法错误。
 * 它会执行笔记里的命令：只对自己写的库运行。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync, mkdirSync, cpSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log('用法：node run-course.mjs "<笔记根目录>" [--write] [--python "<解释器命令>"]');
  process.exit(argv.length ? 0 : 2);
}
const WRITE = argv.includes('--write');
let pythonArg;
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--python') { pythonArg = argv[i + 1]; i += 1; continue; }
  if (!argv[i].startsWith('--')) positional.push(argv[i]);
}
const ROOT = resolve(positional[0]);
if (!existsSync(ROOT) || !statSync(ROOT).isDirectory()) {
  console.error(`笔记根目录不存在：${ROOT}`);
  process.exit(2);
}

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), 'check-library.mjs');
const TMP = join(tmpdir(), `study-notes-run-${process.pid}`);
const REPLAY = join(TMP, 'replay');

let failures = 0;
function report(name, cond, detail) {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures += 1; console.log(`  FAIL  ${name}${detail ? `\n${detail}` : ''}`); }
}

function findPython() {
  if (pythonArg) return pythonArg;
  for (const cand of ['python', 'python3', 'py -3']) {
    const r = spawnSync(`${cand} -c "import sys; print(sys.version_info[0])"`, { shell: true, encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === '3') return cand;
  }
  return undefined;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'); }

function run(cwd, commands, python) {
  let out = '';
  for (const c of commands) {
    const cmd = python ? c.replace(/^python3?\b/u, python) : c;
    const r = spawnSync(`${cmd} 2>&1`, {
      cwd, shell: true, encoding: 'utf8', timeout: 120000,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' }
    });
    out += r.stdout || '';
    if (r.error) out += `\n[run-course] ${r.error.message}\n`;
  }
  const flags = process.platform === 'win32' ? 'giu' : 'gu';
  return out
    .replace(/\r\n?/gu, '\n')
    .replace(new RegExp(escapeRe(cwd + sep), flags), '')
    .replace(new RegExp(escapeRe(cwd), flags), '.')
    .replace(/^(\s*File ")([^"]+)(")/gmu, (m, a, p, b) => a + p.replace(/\\/gu, '/') + b)
    .replace(/\n+$/u, '\n');
}

/** 比对时去掉随环境变化的部分：耗时、回溯栈帧及其源码行与 ^~ 标记行。 */
function canon(text) {
  const out = [];
  let inTrace = false;
  for (const line of text.replace(/\r\n?/gu, '\n').split('\n')) {
    if (/^Traceback \(most recent call last\):/u.test(line)) { inTrace = true; out.push(line); continue; }
    if (inTrace && /^\s/u.test(line)) continue;
    inTrace = false;
    out.push(line.replace(/^(Ran \d+ tests?) in [\d.]+s$/u, '$1'));
  }
  return out.join('\n').trim();
}

function replaceOutputBlock(md, outRel, content) {
  const re = new RegExp(`(<!--\\s*output\\s*:\\s*${escapeRe(outRel)}\\s*-->\\r?\\n\`{3,}[^\\n]*\\r?\\n)[\\s\\S]*?(\\r?\\n\`{3,}[ \\t]*(?:\\r?\\n|$))`, 'u');
  return md.replace(re, (m, a, b) => a + content.replace(/\n$/u, '') + b);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
/* 校验结论由 check-library.mjs 自己报告；这里只要它写出的快照。 */
spawnSync(process.execPath, [CHECKER, ROOT, '--replay-to', REPLAY], { stdio: 'ignore' });
const snaps = existsSync(REPLAY) ? readdirSync(REPLAY).filter((d) => existsSync(join(REPLAY, d, 'run.json'))).sort() : [];
if (!snaps.length) {
  console.log('没有可重放的【运行】：正文里没有【新建】/【修改】/【重构】/【运行】标签。');
  rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

const metas = snaps.map((d) => ({ d, meta: JSON.parse(readFileSync(join(REPLAY, d, 'run.json'), 'utf8')) }));
const needsPython = metas.some(({ meta }) => (meta.commands || []).some((c) => /^python3?\b/u.test(c)));
const python = needsPython ? findPython() : undefined;
if (needsPython && !python) {
  console.log('SKIP：命令需要 Python 3，但没有找到解释器（可用 --python 指定）。');
  rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

let ran = 0;
for (const { d, meta } of metas) {
  if (meta.chapter !== undefined) {
    if (WRITE) {
      const ans = join(ROOT, 'code', 'answer', `ch${String(meta.chapter).padStart(2, '0')}`);
      rmSync(ans, { recursive: true, force: true });
      cpSync(join(REPLAY, d, 'project'), ans, { recursive: true });
      console.log(`  WROTE code/answer/ch${String(meta.chapter).padStart(2, '0')}/`);
    }
    continue;
  }
  if (!meta.output) { report(`${meta.source}:${meta.line} 的【运行】后面绑定了输出`, false, '在命令块后面加 <!-- output: code/out/….txt --> 和一个输出块。'); continue; }
  const cwd = meta.cwd === 'project' ? join(REPLAY, d, 'project') : join(REPLAY, d);
  const actual = run(cwd, meta.commands, python);
  ran += 1;
  const outFile = join(ROOT, meta.output);
  if (WRITE) {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, actual, 'utf8');
    const mdFile = join(ROOT, meta.source);
    writeFileSync(mdFile, replaceOutputBlock(readFileSync(mdFile, 'utf8'), meta.output, actual), 'utf8');
    console.log(`  WROTE ${meta.output}  (${meta.source}:${meta.line})`);
    continue;
  }
  const expected = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
  report(`${meta.source}:${meta.line} \`${meta.commands.join(' ; ')}\` 的输出与 ${meta.output} 一致`, canon(actual) === canon(expected),
    `--- 绑定的输出\n${expected}\n--- 这次真实运行\n${actual}`);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\nSUMMARY RUNS=${ran} FAILURES=${failures}${WRITE ? ' (--write)' : ''}${python ? ` PYTHON=${python}` : ''}`);
process.exit(failures ? 1 : 0);

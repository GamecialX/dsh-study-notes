/**
 * 渐进式样章（test/fixtures/progressive-ch1）的真实运行回归：
 * 复制到临时目录，用 scripts/run-course.mjs 从空目录照做一遍并执行每条【运行】，
 * 比对输出与正文绑定的 code/out/*.txt。找不到 Python 时 run-course 会跳过并返回 0。
 *
 *   node test/run-sample.mjs
 *   node test/run-sample.mjs --write   重新生成样章的输出与 code/answer/ch01/（改了样章正文后用）
 */

import { cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, 'fixtures', 'progressive-ch1');
const RUNNER = join(HERE, '..', 'assets', 'study-notes', 'scripts', 'run-course.mjs');

if (process.argv.includes('--write')) {
  const r = spawnSync(process.execPath, [RUNNER, FIXTURE, '--write'], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const tmp = join(tmpdir(), `study-notes-sample-${process.pid}`);
rmSync(tmp, { recursive: true, force: true });
cpSync(FIXTURE, tmp, { recursive: true });
const r = spawnSync(process.execPath, [RUNNER, tmp], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
process.exit(r.status ?? 1);

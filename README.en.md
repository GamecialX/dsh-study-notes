# dsh-study-notes

[简体中文](README.md) | **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness plugin](https://img.shields.io/badge/DSH-plugin-6f42c1)](https://github.com/GamecialX/dsh-study-notes)

A DeepSeek Harness plugin (bundle) that registers one skill into the current profile:

> **`study-notes`** — when the user wants to learn a subject from zero and asks for "study notes / teaching docs / a handout / textbook-style notes", it drives the agent to build **a course you can follow from top to bottom**, not a concept encyclopedia: every section grows one checkable artifact in the reader's own `project/` (for non-programming subjects: a derivation notebook, a sentence book, a timeline…), the next section continues from it, and each concept appears inside the step that first needs it. It comes with figures, 3–5 exercises per section, a per-chapter cheat sheet, a 100-point chapter test with cross-chapter review, and a local web learning portal (single-file app plus a one-click launcher). Notes are Typora-first **standard Markdown**. For a brand-new course the agent writes **one sample section first** and waits for the user to confirm the style before generating the rest.

Zero dependencies, no build step, installs offline. `index.js` imports only `node:` built-ins.

---

## 1. What it actually delivers

Once `study-notes` is loaded, the agent produces the following under the notes root the user picks:

| Artifact | Purpose |
|---|---|
| `00 大纲.md` | Whole-library entry page: subject overview, **how to follow this course**, per-section "artifact / where you start typing", and a concept lookup table (for lookup only; the course itself is read in order) |
| `Cha_X 章名/` | Per chapter: section notes (`## 接上一节` → 3–5 `## 第 N 步：` steps → summary → exercises, with concepts as `### 概念 N：` inside the step that first needs them), `CX 速查.md`, `CX 测试.md`, `src/` diagram sources; the last section has a chapter smoke run and a project map |
| `project/` (the reader's) | The reader's own workspace. It starts empty and grows step by step through the labels 【新建】 (create) / 【修改】 (diff) / 【重构】 (replace by name) / 【收口】 (wrap up) / 【运行】 (run); the agent never puts anything in it |
| `code/` (answers and evidence, code-heavy subjects) | `code/answer/chNN/`: what `project/` should look like after chapter N; `code/out/`: the real output of every 【运行】 (bound with `<!-- output: -->`); `code/notebooks/CN_*.ipynb`: demo notebooks without outputs || `checklist.md` | Working record: plan table, progress pointer, recovery context (including the confirmed sample-section conventions), changelog |
| `web/index.html` | Single-file learning portal (black mechanical style × frosted glass, all CSS/JS inlined) |
| `web/notes_data.js` | Table of contents and quiz data (prose is not duplicated; the front end fetches `.md` at runtime) |
| `web/serve.mjs` | Dependency-free Node static server (used only when Python is unavailable) |
| `启动学习服务器.bat`, `start_server.sh` | Start the server and open the portal in one click |

The portal provides: dashboard progress and average score, sidebar navigation tree, five kinds of callout rendered as coloured boxes with answers collapsed by default, heading anchors and standard `.md` links, a per-chapter cheat-sheet view, formulas (KaTeX-enhanced when available, automatic offline fallback), instant grading of in-section exercises, full chapter tests with a report card (objective questions auto-graded, subjective ones self-scored against the rubric, best and latest attempts kept), a knowledge graph, full-text search, and `localStorage` persistence.

---

## 2. Installation

The plugin package **is the repository root** (the directory containing `package.json`). DSH installs plugins from a **local absolute path**, so clone the repository first:

```bash
git clone git@github.com:GamecialX/dsh-study-notes.git
# or over HTTPS if you have no SSH key set up:
git clone https://github.com/GamecialX/dsh-study-notes.git
```

Below, `<plugin-dir>` stands for the absolute path of that directory. Pick one of the three install routes.

### Option A: Web UI (recommended)

1. Open the DSH web UI and click **Plugins** in the left sidebar.
2. Click **Add plugin** and enter the **absolute path** of `<plugin-dir>`, for example
   - Windows: `C:\Users\<you>\dsh-study-notes`
   - macOS / Linux: `/Users/<you>/dsh-study-notes`
3. Click **Install**. The bundle is enabled by default, and the plugin's own row (id `study-notes`) is enabled with it.

The path must be absolute and must point at the level that contains `package.json` — that is, the repository root.

### Option B: Let the agent install it

In a session that has the `plugin_manager` tool (Creator mode), say:

> Use plugin_manager's install_bundle to install `<plugin-dir>` into the current profile.

Every `plugin_manager` action needs approval outside full-permission mode; that is expected.

### Option C: CLI

```bash
dsh plugin --profile <profile-name> add "<plugin-dir>"
```

### After installing, confirm

- The **Plugins** page shows a **Study notes (学习笔记)** card (title and description come from `locale/`, the icon from `icon.svg`).
- A new session's skill catalogue lists `study-notes`.
- Saying "I want to learn <subject> from scratch, generate study notes for me" makes the agent load `study-notes` and confirm subject and goal with you first — that means it works.

> **Note**: if it was installed via `pnpm add <local-path>`, the profile usually records a **symlink** to this directory. **Do not move or delete this directory**, or the plugin breaks (the skill disappears or asset paths stop resolving).

---

## 3. Repository layout

```
dsh-study-notes/
├── package.json           # declares dsh.bundle.patch; no dependencies, no peerDependencies
├── cordis.patch.yml       # inserts one row: id=study-notes, name=dsh-study-notes
├── index.js               # host plugin: parses SKILL.md and registers the skill into ctx.skills
├── icon.svg               # card icon on the Plugins page
├── locale/{en,zh}.json    # card title/description ({ "meta": { title, description } })
├── assets/study-notes/    # the skill itself (resourceBase points here: real files, not .d.ts)
│   ├── SKILL.md           # entry instructions: positioning, artifacts, asset map, seven rules and course-line rules R1–R11, P0–P5 flow (incl. P2.5 sample-section confirmation and P5 read-in-order test)
│   ├── references/        # specs loaded on demand
│   │   ├── notes-standard.md            # the single formatting spec: structure, naming, callouts, link/formula/code binding, cheat sheets, tests
│   │   ├── teaching-design.md           # the single teaching spec: one artifact line, cumulative sections, concepts at first point of need, length by study time, read-in-order test
│   │   ├── workflow-and-recovery.md     # flow criteria, sample-section confirmation, checklist format, interruption-recovery protocol
│   │   ├── quality-gates.md             # content red lines + engineering red lines + manual self-check
│   │   ├── portal-standard.md           # portal data contract (concepts / sheet), views, rendering, grading, launcher
│   │   ├── editor-compatibility.md      # Typora pitfalls: why no callouts, how to debug missing formulas
│   │   └── subject-playbooks.md         # per-domain playbooks: math / code / language / humanities / hands-on / exam prep
│   ├── templates/         # skeletons to copy and fill
│   │   ├── syllabus.md checklist.md section-note.md cheat-sheet.md
│   │   ├── chapter-test.md capstone.md
│   │   ├── callout-to-blockquote.mjs     # legacy callouts ([!note] / **Note**:) → <b>*Note*</b> (idempotent)
│   │   ├── fix-math-delims.mjs           # block formula delimiter $ → $$ (idempotent, writes only with --fix)
│   │   ├── 启动学习服务器.bat  start_server.sh
│   │   └── web/{index.html, notes_data.js, serve.mjs}
│   └── scripts/
│       ├── check-library.mjs            # validator (whole library / --only one note / --strict / --replay-to)
│       └── run-course.mjs               # really runs 【运行】 commands in replay snapshots; compares or generates outputs and answer snapshots
└── test/                  # development self-tests (not part of the runtime)
    ├── verify-plugin.mjs
    ├── check-fixture.mjs
    ├── run-sample.mjs
    └── fixtures/
        ├── progressive-ch1/             # code-subject progressive sample: reference for the new structure and regression fixture
        └── math-ch1/                    # non-code sample (maths derivation notebook): proves the course rules do not require project/
```

---

## 4. Run the tests yourself

```bash
# 1) plugin layer: syntax, skill-provider contract, portal renderer and grading functions, template line endings, asset list
node test/verify-plugin.mjs

# 2) checker end to end: a compliant library has 0 errors; a broken one reports errors; the progressive sample is
#    0 errors / 0 warnings under --strict; 18 injected course defects are warnings by default and errors under --strict;
#    replay snapshots have the right content; a non-code sample (a maths derivation notebook, no project/)
#    has 0 errors under --strict and 3 injected defects are caught
node test/check-fixture.mjs

# 3) progressive sample, really executed: copy test/fixtures/progressive-ch1 to a temp dir, follow it from an empty
#    directory, run every 【运行】 and compare with the saved output (needs Python 3; skipped with exit 0 if missing)
node test/run-sample.mjs

# all three
npm test
```

`test/fixtures/progressive-ch1/` is a complete "chapter 1" (autodiff from scratch: numerical derivatives → a `Value` that backpropagates by itself). It doubles as the reference sample of the new structure: it shows what a "接上一节 → 第 N 步 → 留给下一节" section looks like, how code labels are written, and how `code/answer/ch01/` matches the `project/` you get by following the text. After editing the sample, regenerate its outputs and answer snapshot with `node test/run-sample.mjs --write`.

`verify-plugin.mjs` boots the portal script in a **headless** environment (a tiny DOM stub) and calls the Markdown renderer and the grading functions directly through the portal's `window.__NOTES_PORTAL__` debug hook. That makes rendering regressions, callouts and answer collapsing, heading anchors, standard-link resolution, image path resolution and `$formula$` fallback all automatically verifiable.

What cannot be verified automatically is how the portal **looks** in a real browser (frosted glass, motion, responsive layout) — that needs human eyes.

---

## 5. Validating a generated library

```bash
node assets/study-notes/scripts/check-library.mjs "<notes-root>"                      # default: course rules are warnings
node assets/study-notes/scripts/check-library.mjs "<notes-root>" --strict             # acceptance for new libraries: course rules become errors
node assets/study-notes/scripts/check-library.mjs "<notes-root>" --only "<rel-path>"  # one note (sample stage; repeatable)
node assets/study-notes/scripts/check-library.mjs "<notes-root>" --json
node assets/study-notes/scripts/check-library.mjs "<notes-root>" --replay-to "<empty-dir>"  # replay the text, write a project/ snapshot per 【运行】

node assets/study-notes/scripts/run-course.mjs "<notes-root>"           # really run every 【运行】 in its snapshot, compare with saved output
node assets/study-notes/scripts/run-course.mjs "<notes-root>" --write   # generate code/out/, the output blocks in the text, code/answer/chNN/
node assets/study-notes/scripts/run-course.mjs "<notes-root>" --python "py -3"  # choose the interpreter
```

`check-library.mjs` exits `0` = no errors (warnings may exist), `1` = errors, `2` = usage error. It checks:

- **Structure**: naming, frontmatter, required artifacts, per-chapter test (error) and cheat sheet (warning); directories starting with `_` or `.` are skipped.
- **Links**: standard links and images exist, anchors resolve to headings (tolerating Typora/GitHub punctuation differences), empty links, links escaping the root, unencoded spaces.
- **Portability**: `[[wikilink]]` / `![[embed]]` = error; `> [!x]` callouts, `> **Note**:`, single-line `$$`, multiple H1s = warning.
- **Teaching**: 3–5 exercises per section (only counting answer blocks under "本节练习"), ≤ 800 lines per note, ≤ 20 callouts, leftover old `C1-01` numbering, `【回顾 CX】` review questions from chapter 3 on.
- **Code**: fragments bound by `<!-- source: -->` / `<!-- output: -->` are compared line by line against the real files; "real output" claimed but unbound = warning.
- **Course line [R1]–[R11]** (warnings by default, errors under `--strict`):
  - [R1] section order is intro → 接上一节 → 3–5 steps → summary → exercises → concept index, and every step has "action → visible result → why";
  - [R2] a `## 接上一节` bridge (what the last section built / what it left open / what this section adds) and a closing "留给下一节" hook;
  - [R3] concepts are nodes inside steps (`### 概念 N：`, or a `## 概念 N：` sandwiched between two steps), one style across the library;
  - [R4] code blocks carry 【新建】/【修改】(diff)/【重构】/【收口】 labels with a path under `project/`, no "excerpt" blocks and no elided lines; replaying the text from an empty directory must succeed and the end of each chapter must match `code/answer/chNN/`; no references to answers or notebooks from later chapters; the reader never works inside `code/`;
  - [R5] the intro states "what you have now" and "what you will have at the end"; [R6] chapter smoke run (one command + real output); [R7] chapter project map (for non-code subjects, a table of contents of the artifact; no `project/` required);
  - [R8] notebooks live in `code/notebooks/CN_*.ipynb` without outputs; [R10] 3–5 steps and 30–100 minutes per section;
  - [R11] no machine-specific absolute paths in text, commands or output.
  - [R9] "one artifact per section" is a planning rule. It lives in the "本节产物" column of the syllabus and checklist and is checked by hand.
- **Portal**: `notes_data.js` paths match character for character, `quiz` has 3–5 questions, points total exactly 100, objective questions ≥ 60, `sheet`, `concepts`, both ends of `links`, and md/js question correspondence.

`run-course.mjs` is the machine version of the "read-in-order test": it calls `check-library.mjs --replay-to` to get the `project/` at every 【运行】, runs the commands there (stdout and stderr merged), strips machine-specific absolute paths, and compares with `code/out/`, ignoring traceback frames and timings. If Python is not found it skips with exit 0. **It executes the commands in the notes; run it only on libraries you wrote.**

Both scripts prove **mechanical consistency** and "following the text actually works". They cannot prove **that the content is correct**, nor whether a reader knows what to do next. That is a human pass driven by `assets/study-notes/references/quality-gates.md` and the manual read-in-order test in section 12 of `teaching-design.md`.

---

## 6. 老库怎么按新结构逐步迁移 (migrating an existing library step by step)

Libraries generated before v2.0.0 use a "concept card" skeleton: each section is a row of `## 概念 N：` blocks, and code is excerpted from a finished `code/` tree. The new checker raises **no new errors** on such libraries. It lists course-line problems as `[R*]` warnings, so you can migrate one section at a time instead of rewriting everything at once. For reference, three existing libraries checked read-only in default mode all had 0 errors and roughly 370, 220 and 250 course-line warnings.

**Before you start**: commit the library to git (or back it up). Migration rewrites a lot of text, and you need a way back.

**Step 0: see the debt.**

```bash
node assets/study-notes/scripts/check-library.mjs "<library>" --json > before.json
```

Count the findings per `[R*]` number to see which rules and which chapters carry most of the work.

**Step 1: fix the free ones first.** These do not touch the teaching structure and can be done library-wide in one pass:

- [R11] absolute paths: replace `C:\Users\…`, `D:\…`, `/home/…` in text, commands and saved output with paths relative to the notes root or `project/`. If a script prints paths, make it print relative paths and regenerate the output.
- [R8] notebooks: move them to `code/notebooks/CN_topic.ipynb` and clear their outputs.

**Step 2: migrate chapter by chapter, starting from chapter 1.** The bridge chain runs forward, so chapter N's "接上一节" depends on chapter N−1 already being migrated. For each chapter:

1. **Fix the line first (R9)**: in `00 大纲.md` and `checklist.md`, write the "本节产物" (artifact) for every section: what the reader has at the end of it and how they can check it. A section with no artifact was a concept card all along; merge it into another section or re-cut the chapter.
2. **Rebuild the section skeleton (R1/R2/R5/R10)**: add `## 接上一节` (<b>上一节做到</b>： / <b>留下的坑</b>： / <b>本节补上</b>：), make the intro state "你现在手上 / 本节结束时", cut the body into 3–5 `## 第 N 步：` steps that each name the action, the visible result and the reason, and end with <b>留给下一节</b>：. Split sections longer than 800 lines or 5 steps.
3. **Move concepts into steps (R3)**: turn `## 概念 N：名称` into `### 概念 N：名称` and place it in the step that first needs it. **Keep the number**: the portal builds its concept badges and anchors from "概念 N：", and dropping the number breaks those links. While a migration is half done, mixing `##` and `###` across the library produces one [R3] "mixed styles" warning; that is expected and disappears when you finish.
4. **Turn finished code into the reader's own code (R4)**:
   - today's `code/` is the final version of the whole book. Put the state **at the end of this chapter** into `code/answer/chNN/`, stripping classes and functions that only later chapters add; otherwise you leak future versions to the reader;
   - rewrite code blocks as labelled operations: 【新建】`project/…` (whole file), 【修改】`project/…` (a ```diff block with context lines), 【重构】`project/…` (replace a function by name), 【收口】, 【运行】 (a command block). Delete every "excerpt" and every `...` elision;
   - move commands that make the reader create things in `code/` (such as `mkdir -p code/xxx`) to `project/`.
5. **Generate real output and the answer snapshot**:

   ```bash
   node assets/study-notes/scripts/run-course.mjs "<library>" --write
   ```

   It follows the text from an empty directory, runs every 【运行】, and writes `code/out/`, the output blocks in the text and `code/answer/chNN/`. Read the generated output: **when it disagrees with the prose, fix the prose, not the output**. A replay failure (a 【修改】 whose context cannot be found) means the text cannot be followed as written; fix it at the reported line.
6. **Add the chapter ending (R6/R7)**: give the chapter's last section a "章末通跑" step (one command + bound real output) and a "本章项目地图" (a file tree containing `project/`, one line of responsibility per file, and "本章动了" listing the files this chapter touched).
7. **Accept the chapter**: run `check-library.mjs "<library>" --strict --only "<each section of this chapter>"`, then `run-course.mjs "<library>"`. The chapter is migrated when it has 0 errors and every output matches. Log it in the changelog of `checklist.md`.

**Step 3: accept the whole library.** When every chapter is migrated, run `check-library.mjs "<library>" --strict` and `run-course.mjs "<library>"`. When both pass, the migration is done. Finish with one manual read-in-order test of a chapter: follow only the literal instructions, in an empty `project/`, to the end of the chapter.

**Non-programming subjects** (maths, languages, history…) have no `project/` or `code/`, so the code parts of [R4]/[R6] do not apply. Follow items 1–3 and 6 of step 2: the artifact of a section becomes one more result in the derivation notebook, one more set of patterns in the sentence book, one more stretch of the timeline; the chapter smoke run becomes "re-derive / retell your own artifact from the start". Per-subject guidance is in `assets/study-notes/references/subject-playbooks.md`.

---
## 7. Implementation notes

- **No external dependencies**: `index.js`, `serve.mjs`, `check-library.mjs` and `run-course.mjs` use only `node:` built-ins. Hence there is no `dependencies` and no `peerDependencies` in `package.json` — installing triggers no network access and is never rejected by the profile's DSH version compatibility check.
- **`inject = ['skills']`**: when the profile has no skill registry, the plugin stays quietly inactive instead of throwing.
- **`SKILL.md` is self-parsed**: the plugin reads the YAML frontmatter of `assets/*/SKILL.md` and takes `name` and `description` as the catalogue entry; `SKILL.md` is the single source of metadata and cannot drift. Adding a skill only requires another directory under `assets/` with a `SKILL.md`.
- **`resourceBase` exposes the real directory**: when the skill loads, the `skill` tool tells the model the absolute paths of `references/`, `templates/` and `scripts/`. The model copies large files (portal HTML, launchers) with shell commands instead of retyping them — cheaper on context and free of transcription errors.
- **Port probing in the launcher**: the `.bat` collects `netstat` lines containing **LISTENING** to decide whether the port is taken. Matching `":8765 "` alone is wrong — `TIME_WAIT` connections put the same number in the local or remote port column and produce false positives; and `errorlevel` after a pipe is unreliable because cmd propagates it inconsistently.

---

## 8. Known limitations

- The portal's **visual** layer is not covered by automated tests (no browser control); it needs manual confirmation.
- `check-library.mjs` counts question numbers and points in `CX 测试.md` using the `**N.（M 分）**` convention. If a test file uses another format it degrades to a warning ("cannot check automatically") instead of a false positive.
- Consistency between `notes_data.js` and the `.md` files is only checked **loosely** (first 10 meaningful characters of the stem, the sequence of points, the number of questions). Semantically equivalent but differently worded questions go unnoticed.
- `run-course.mjs` runs 【运行】 commands through the system shell (a leading `python` / `python3` is replaced by the detected or `--python` interpreter), with a 120-second timeout per command, and compares after stripping snapshot absolute paths and ignoring traceback frames and unittest timings. Output that depends on unseeded randomness, the network or a GPU will be reported as different: seed it, or present it as a ```` ```text ```` illustration and say so.
- Concept headings keep their number (`### 概念 N：名称`) because the portal derives concept badges and anchors from "概念 N："; unnumbered concept headings are not recognised by the portal.
- The course-line rules check whether the structure looks like a course. They cannot check whether a reader knows what to do next at a given point; that still needs the manual read-in-order test.
- If the plugin directory is moved after installation the symlink breaks and the plugin must be reinstalled.

---

## 9. License & credits

MIT © 2026 [GamecialX](https://github.com/GamecialX). See [LICENSE](LICENSE).

- Want to change something or open a PR? Run `npm test` first (163 plugin assertions, the checker end-to-end fixture and the real run of the sample chapter) and keep it green.
- Want to run it on your own subject? See "5. Validating a generated library" above; for an existing library, see "6. 老库怎么按新结构逐步迁移".

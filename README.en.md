# dsh-study-notes

[简体中文](README.md) | **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness plugin](https://img.shields.io/badge/DSH-plugin-6f42c1)](https://github.com/GamecialX/dsh-study-notes)

A DeepSeek Harness plugin (bundle) that registers one skill into the current profile:

> **`study-notes`** — when the user wants to learn a subject from zero and asks for "study notes / teaching docs / a handout / textbook-style notes", it drives the agent to build **a library you can actually live in**: chaptered **standard Markdown** notes (Typora-first; a concept becomes a section in place rather than an atomised file), figures, 3–5 exercises per section, a per-chapter cheat sheet, a 100-point chapter test with cross-chapter review, and a local web learning portal (single-file app plus a one-click launcher). For a brand-new course the agent writes **one sample section first** and waits for the user to confirm the style before generating the rest.

Zero dependencies, no build step, installs offline. `index.js` imports only `node:` built-ins.

---

## 1. What it actually delivers

Once `study-notes` is loaded, the agent produces the following under the notes root the user picks:

| Artifact | Purpose |
|---|---|
| `00 大纲.md` | Whole-library entry page: subject overview, learning path, per-chapter entries, **concept index** (anchor-linked) |
| `Cha_X 章名/` | Per chapter: section notes (with `## 概念 N：` blocks), `CX 速查.md`, `CX 测试.md`, `src/` diagram sources |
| `code/` (code-heavy subjects) | Real code and real run output referenced by the prose, bound via `<!-- source: -->` / `<!-- output: -->` |
| `checklist.md` | Working record: plan table, progress pointer, recovery context (including the confirmed sample-section conventions), changelog |
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
│   ├── SKILL.md           # entry instructions: role, artifacts, asset map, six rules, P0–P5 flow (incl. P2.5 sample-section confirmation)
│   ├── references/        # specs loaded on demand
│   │   ├── notes-standard.md            # the single formatting spec: structure, naming, callouts, link/formula/code binding, cheat sheets, tests
│   │   ├── teaching-design.md           # the single teaching spec: required/optional concepts, length budget, predict-then-reveal, progressive exercises, spaced review
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
│       └── check-library.mjs            # validator (whole library, or --only one note)
└── test/                  # development self-tests (not part of the runtime)
    ├── verify-plugin.mjs
    └── check-fixture.mjs
```

---

## 4. Run the tests yourself

```bash
# 1) plugin layer: syntax, skill-provider contract, portal renderer and grading functions, template line endings
node test/verify-plugin.mjs

# 2) end to end: build a compliant library (expect 0 errors) and a deliberately broken one (expect errors)
node test/check-fixture.mjs

# equivalent to
npm test
```

`verify-plugin.mjs` boots the portal script in a **headless** environment (a tiny DOM stub) and calls the Markdown renderer and the grading functions directly through the portal's `window.__NOTES_PORTAL__` debug hook. That makes rendering regressions, callouts and answer collapsing, heading anchors, standard-link resolution, image path resolution and `$formula$` fallback all automatically verifiable.

What cannot be verified automatically is how the portal **looks** in a real browser (frosted glass, motion, responsive layout) — that needs human eyes.

---

## 5. Validating a generated library

```bash
node assets/study-notes/scripts/check-library.mjs "<notes-root>"
node assets/study-notes/scripts/check-library.mjs "<notes-root>" --json
```

There is also `--only "<relative-path>"` (repeatable) to check just one note, which is what the sample-section stage uses. Exit code `0` = no errors (warnings may exist), `1` = errors, `2` = usage error. It checks:

- **Structure**: naming, frontmatter, required artifacts, per-chapter test (error) and cheat sheet (warning); directories starting with `_` or `.` are skipped.
- **Links**: standard links and images exist, anchors resolve to headings (tolerating Typora/GitHub punctuation differences), empty links, links escaping the root, unencoded spaces.
- **Portability**: `[[wikilink]]` / `![[embed]]` = error; `> [!x]` callouts, `> **Note**:`, single-line `$$`, multiple H1s = warning.
- **Teaching**: 3–5 exercises per section (only counting answer blocks under "本节练习"), ≤ 800 lines per note, ≤ 20 callouts, leftover old `C1-01` numbering, `【回顾 CX】` review questions from chapter 3 on.
- **Code**: fragments bound by `<!-- source: -->` / `<!-- output: -->` are compared line by line against the real files; "real output" claimed but unbound = warning.
- **Portal**: `notes_data.js` paths match character for character, `quiz` has 3–5 questions, points total exactly 100, objective questions ≥ 60, `sheet`, `concepts`, both ends of `links`, and md/js question correspondence.

It proves **mechanical consistency**; it cannot prove **that the content is correct**. The latter is a human pass driven by `assets/study-notes/references/quality-gates.md`.

---

## 6. Implementation notes

- **No external dependencies**: `index.js`, `serve.mjs` and `check-library.mjs` use only `node:` built-ins. Hence there is no `dependencies` and no `peerDependencies` in `package.json` — installing triggers no network access and is never rejected by the profile's DSH version compatibility check.
- **`inject = ['skills']`**: when the profile has no skill registry, the plugin stays quietly inactive instead of throwing.
- **`SKILL.md` is self-parsed**: the plugin reads the YAML frontmatter of `assets/*/SKILL.md` and takes `name` and `description` as the catalogue entry; `SKILL.md` is the single source of metadata and cannot drift. Adding a skill only requires another directory under `assets/` with a `SKILL.md`.
- **`resourceBase` exposes the real directory**: when the skill loads, the `skill` tool tells the model the absolute paths of `references/`, `templates/` and `scripts/`. The model copies large files (portal HTML, launchers) with shell commands instead of retyping them — cheaper on context and free of transcription errors.
- **Port probing in the launcher**: the `.bat` collects `netstat` lines containing **LISTENING** to decide whether the port is taken. Matching `":8765 "` alone is wrong — `TIME_WAIT` connections put the same number in the local or remote port column and produce false positives; and `errorlevel` after a pipe is unreliable because cmd propagates it inconsistently.

---

## 7. Known limitations

- The portal's **visual** layer is not covered by automated tests (no browser control); it needs manual confirmation.
- `check-library.mjs` counts question numbers and points in `CX 测试.md` using the `**N.（M 分）**` convention. If a test file uses another format it degrades to a warning ("cannot check automatically") instead of a false positive.
- Consistency between `notes_data.js` and the `.md` files is only checked **loosely** (first 10 meaningful characters of the stem, the sequence of points, the number of questions). Semantically equivalent but differently worded questions go unnoticed.
- If the plugin directory is moved after installation the symlink breaks and the plugin must be reinstalled.

---

## 8. License & credits

MIT © 2026 [GamecialX](https://github.com/GamecialX). See [LICENSE](LICENSE).

- Want to change something or open a PR? Run `npm test` first (159 assertions plus the end-to-end fixture) and keep it green.
- Want to run it on your own subject? See "5. Validating a generated library" above.

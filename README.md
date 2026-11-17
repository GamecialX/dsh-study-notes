# dsh-study-notes

**简体中文** | [English](README.en.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness plugin](https://img.shields.io/badge/DSH-plugin-6f42c1)](https://github.com/GamecialX/dsh-study-notes)


一个 DeepSeek Harness 插件（bundle），它往当前 profile 里注册一个技能：

> **`study-notes`** —— 当用户想从零学一门科目、想要"学习笔记 / 教学文档 / 讲义 / 教材式笔记"时，
> 指导 agent 生成**一门能从头跟到尾的课**，而不是一本概念百科：每一节在读者自己的 `project/`
> （非代码科目是推导本、句子本、时间线……）里长出一个能检查的产物，下一节接着上一节的产物往下做；
> 概念在第一次用到它的那一步里出现。配套有图、每节 3–5 道练习、本章速查、100 分制章末测试（含跨章回顾），
> 以及一个本地的网页学习门户（单文件应用 + 一键启动脚本）。笔记是 Typora 优先的**标准 Markdown**。
> 新课程会先写一节样章，等用户确认风格后再批量生成。理论课（没有工程产物、以理解与辨析为核心）走另一条线：产物是**知识卷轴**（概念地图、时间线、论证稿），做的是轻动手，章末合书复述；也能按你的要求**逐章停下来等反馈**，而不是一口气写完。

零依赖、零构建、可离线安装。`index.js` 只 import `node:` 内置模块。

---

## 一、它到底交付什么

`study-notes` 被加载后，agent 会按《学习笔记生成准则》生成下列产物（都在用户指定的笔记根目录下）：

| 产物 | 说明 |
|---|---|
| `00 大纲.md` | 全库总起页：科目简介、**怎么跟这门课**、逐章逐节的「本节产物 / 动手入口」、概念检索表（检索用，正课顺着读） |
| `Cha_X 章名/` | 每章：节笔记（`## 接上一节` → 3–5 个 `## 第 N 步：` → 小结 → 练习，概念以 `### 概念 N：` 出现在第一次用到它的那一步里）、`CX 速查.md`、`CX 测试.md`、`src/` 图源、`_提供/` 课件给的现成文件（正文用【提供】声明，见 5.2）；最后一节有章末通跑和本章项目地图 |
| `project/`（读者的） | 读者自己动手的工程，从空目录开始，照正文的【新建】/【修改】/【重构】/【收口】/【运行】一步步长出来（【提供】声明的是课件给的现成文件，从章目录 `_提供/` 复制，不用手搓）；agent 不往里放东西 |
| `code/`（答案与证据，代码类科目） | `code/answer/chNN/`：第 N 章做完时 `project/` 应有的样子；`code/out/`：每次【运行】的真实输出（`<!-- output: -->` 绑定）；`code/notebooks/CN_*.ipynb`：读者的实践场（小实验、可视化，一格一件事；交付时不带输出） |
| `checklist.md` | 工作记录：规划表、进度指针、恢复上下文（含课程线 / 节奏 / 样章约定）、变更日志、反馈与迭代记录 |
| `web/index.html` | 单文件学习门户（黑色机械风 × 毛玻璃，内联全部 CSS/JS） |
| `web/vendor/katex/` | 离线公式引擎（KaTeX 0.16.22，约 1.3 MB；断网也能排版公式） |
| `web/notes_data.js` | 目录结构与题目数据（正文不复制，前端实时 fetch `.md`） |
| `web/serve.mjs` | 零依赖 Node 静态服务器（只在探测不到 Python 时使用） |
| `启动学习服务器.bat`、`start_server.sh` | 一键起服务器并自动打开门户 |

门户的能力：仪表盘进度与均分、侧栏导航树、标注块（`> <b>*Note*</b>` 等 5 种）渲染为彩色框且答案默认折叠、
标题锚点与标准 `.md` 链接跳转、本章速查页、公式（KaTeX 随门户离线分发，断网也能排版；本地副本缺失时自动回退 CDN）、节内练习即时判分、
章末整卷测试与成绩单（客观题自动判分、主观题按评分要点自评、保留最佳与最近成绩）、知识图谱、全文搜索、
`localStorage` 持久化。

**另一种交付形态（v3.0 起）：HTML 学习库。** 用户不想用 Typora、想要能插图 / 能放可拖演示 / 打开就好看的课时，agent 会改为生成一座纯静态 HTML 库：一节一页，`index.html` → 章首页 → 节页，轨道与上下节翻页由外壳生成，演示可以播放 / 拖动 / 改参数，练习即时判分，进度存在 `localStorage`。**双击就能看**：没有构建、没有 CDN、没有 module / fetch，断网可用。两种形态二选一，不会同一套内容写两份。

---

## 二、安装

插件包就是**这个仓库的根目录**（含 `package.json` 的那一层）。DSH 从**本地绝对路径**安装它，所以先把仓库克隆到本机：

```bash
git clone git@github.com:GamecialX/dsh-study-notes.git
# 没配 SSH 就走 HTTPS：
git clone https://github.com/GamecialX/dsh-study-notes.git
```

下面把这个目录的绝对路径记作 `<插件目录>`，三种装法选一种。

### 方式 A：Web 界面（推荐）

1. 打开 DSH 的 Web 界面，左侧栏点 **Plugins**。
2. 点 **Add plugin**，在输入框里填 `<插件目录>` 的**绝对路径**，例如
   - Windows：`C:\Users\<你的用户名>\dsh-study-notes`
   - macOS / Linux：`/Users/<你的用户名>/dsh-study-notes`
3. 点 **Install**。安装完成后 bundle 默认是启用状态，本插件的那一行（id 为 `study-notes`）也会启用。

路径必须是绝对路径，且指向**含有 `package.json` 的那一层**（也就是仓库根目录）。

### 方式 B：让 agent 装

在一个启用了 `plugin_manager` 工具的会话（Creator 模式）里说：

> 用 plugin_manager 的 install_bundle，把 `<插件目录>` 装到当前 profile。

每个 `plugin_manager` 动作在非完全权限模式下都需要批准，这是正常现象。

### 方式 C：CLI

```bash
dsh plugin --profile <profile 名> add "<插件目录>"
```

### 安装后确认

- 侧栏 **Plugins** 页面里能看到 **Study notes (学习笔记)** 卡片（标题与描述来自 `locale/`，图标来自 `icon.svg`）。
- 新开会话时，会话技能目录里出现 `study-notes`。
- 在会话里说一句「我想从零学 <某科目>，给我生成学习笔记」，agent 应当加载 `study-notes` 并先向你确认科目与目的——这就是它生效了。

> **注意**：如果是通过 `pnpm add <本地路径>` 安装的，profile 里记的通常是**符号链接**，
> 指向本目录。**不要移动或删除这个目录**，否则插件会失效（表现为 skill 消失或资源路径读不到）。

---

## 三、目录结构

```
dsh-study-notes/
├── package.json           # 声明 dsh.bundle.patch；无依赖、无 peerDependencies
├── cordis.patch.yml       # insert 一行：id=study-notes, name=dsh-study-notes
├── index.js               # Host 插件：解析 SKILL.md 并把 skill 注册进 ctx.skills
├── icon.svg               # Plugins 页面上的卡片图标
├── locale/{en,zh}.json    # 卡片标题/描述（{ "meta": { title, description } }）
├── assets/study-notes/    # 技能本体（resourceBase 指向这里，所以不是 .d.ts，是真实文件）
│   ├── SKILL.md           # 入口指令：定位、产物、资产地图、七条铁律与课程线规则 R1–R13、P0–P5 流程（含 P2.5 样章确认、P5 顺读测试）
│   ├── references/        # 按需加载的详规
│   │   ├── notes-standard.md            # 格式唯一规范：结构、命名、标注块、链接/公式/代码绑定、速查、测试
│   │   ├── teaching-design.md           # 教学唯一规范：一条产物线、节节累积、概念就地出现、按学时定篇幅、顺读测试
│   │   ├── workflow-and-recovery.md     # 流程判据、样章确认、checklist 格式、中断恢复协议
│   │   ├── quality-gates.md             # 内容红线 + 工程红线 + 人工自检
│   │   ├── portal-standard.md           # 门户数据契约（concepts / sheet）、视图、渲染、判分、启动脚本
│   │   ├── editor-compatibility.md      # Typora 踩坑记录：为什么不用 callout、公式不显示怎么查
│   │   ├── theory-line.md               # 理论线：L1–L8、知识卷轴、引用规矩、混合课怎么分章
│   │   ├── theory-line.md               # 理论线：L1–L8、知识卷轴、引用规矩、混合课怎么分章
│   │   ├── html-line.md                 # HTML 学习库线：目录树、manifest、宿主协议、主题变量、演示契约
│   │   └── subject-playbooks.md         # 数学/代码/语言/人文/操作型/应试/纯理论 的分科目打法
│   ├── templates/         # 可直接复制/填充的骨架
│   │   ├── syllabus.md checklist.md section-note.md section-note-theory.md cheat-sheet.md
│   │   ├── chapter-test.md capstone.md
│   │   ├── callout-to-blockquote.mjs     # 旧标注（[!note] / **Note**:）→ <b>*Note*</b>（幂等）
│   │   ├── fix-math-delims.mjs           # 块级公式定界符 $ → $$（幂等，--fix 才写盘）
│   │   ├── fix-mathbb.mjs                # \mathbb{…} → unicode 花体（Typora 1.14 渲染不了）
│   │   ├── 启动学习服务器.bat  start_server.sh
│   │   └── web/{index.html, notes_data.js, serve.mjs, vendor/katex/}
│   │   ├── html/                        # HTML 学习库线（v3.0）：骨架与外壳，用 shell 逐字节复制
│   │   │   ├── index.html chapter.html section.html manifest.example.json
│   │   │   └── src/css/{theme.css, theme-course.css}  src/js/{shell.js, demo.js}
│   └── scripts/
│       ├── check-library.mjs            # 校验器（全库 / --only 单篇 / --strict / --replay-to 照做重放）
│       ├── run-course.mjs               # 在重放快照里真实运行【运行】命令，比对或生成输出与答案快照
│       ├── html-lint.mjs                # HTML 库形状机检（HTML01–07 error，HTML11–14 warning）
│       └── html-nav.mjs                 # manifest.json → src/js/nav-data.js（file:// 不能 fetch）
└── test/                  # 开发自测（不参与运行时）
    ├── verify-plugin.mjs
    ├── check-fixture.mjs
    ├── run-sample.mjs
    └── fixtures/
        ├── progressive-ch1/             # 代码类渐进式样章：新结构的参考样本与回归夹具
        ├── math-ch1/                    # 非代码样章（数学推导本）：确认课程线规则不强求 project/
        └── html-mini/                   # HTML 线最小库：1 章 3 节，机检与导航回归
```

---

## 四、自己跑一遍测试

```bash
# 1) 插件层：语法、skill provider 契约、门户渲染器与判分函数、模板行尾、资产清单、
#    HTML 线（模板占位符与宿主协议、夹具机检 0 error、nav-data 生成、断链与 module 能被抓）
node test/verify-plugin.mjs

# 2) 校验器端到端：合规库 0 error；注入缺陷的库报 error；渐进式样章在 --strict 下 0 error / 0 warning；
#    18 种课程线缺陷各自在默认模式下是 warning、在 --strict 下是 error；照做重放的快照内容正确；
#    非代码样章（数学推导本，没有 project/）在 --strict 下 0 error，3 种缺陷能被抓到
node test/check-fixture.mjs

# 3) 渐进式样章真实运行：把 test/fixtures/progressive-ch1 复制到临时目录，从空目录照做，
#    执行每一条【运行】并比对保存的输出（需要 Python 3；找不到时跳过并返回 0）
node test/run-sample.mjs

# 三条一起
npm test
```

`test/fixtures/progressive-ch1/` 是一门完整的「第 1 章」样章（从零手搓自动求导：数值导数 → 会自己反向传播的 `Value`），
它同时是新结构的参考样本：看它就知道一节「接上一节 → 第 N 步 → 留给下一节」长什么样、
代码块标签怎么写、`code/answer/ch01/` 和照做出来的 `project/` 怎样一一对应。
改了样章正文后用 `node test/run-sample.mjs --write` 重新生成它的输出与答案快照。

`verify-plugin.mjs` 会在**无浏览器**环境里启动门户脚本（用一个极小的 DOM stub），
通过门户暴露的 `window.__NOTES_PORTAL__` 调试出口直接调用 Markdown 渲染器与判分函数，
所以渲染回归、标注块与答案折叠、标题锚点、标准链接解析、图片路径解析、`$公式$` 降级这些都能自动验证。

浏览器里的**视觉**效果（毛玻璃、动效、响应式布局）无法自动验证——那部分需要人眼看。

---

## 五、校验生成出来的学习库

```bash
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>"                    # 默认：课程线规则只报 warning
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>" --strict           # 新库验收：课程线规则升为 error
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>" --only "<相对路径>"  # 单篇（样章阶段，可重复）
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>" --json
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>" --replay-to "<空目录>"  # 照正文重放，写出每次【运行】时的 project/ 快照

node assets/study-notes/scripts/run-course.mjs "<笔记根目录>"            # 在快照里真的运行每条【运行】，比对保存的输出
node assets/study-notes/scripts/run-course.mjs "<笔记根目录>" --write    # 生成 code/out/、正文输出块、code/answer/chNN/
node assets/study-notes/scripts/run-course.mjs "<笔记根目录>" --python "py -3"   # 指定解释器
```

`check-library.mjs` 退出码 `0` = 无 error（可能有 warning），`1` = 有 error，`2` = 用法错误。它检查：

- **结构**：命名规范、frontmatter、必备产物、每章测试（error）与速查（warning）；跳过 `_`、`.` 开头的目录。
- **链接**：标准链接与图片是否存在、锚点能否对上标题（容忍 Typora/GitHub 的符号差异）、空链接、越出根目录的链接、未编码空格。
- **可移植**：`[[wikilink]]` / `![[嵌入]]` = error；`> [!x]` callout、`> **Note**:`、单行 `$$`、多 H1 = warning。
- **教学**：每节练习 3–5 题（只数「本节练习」里的答案块）、篇幅 ≤ 800 行、标注块 ≤ 20、旧式 `C1-01` 编号残留、第 3 章起测试的 `【回顾 CX】` 题。
- **代码**：`<!-- source: -->` / `<!-- output: -->` 绑定的片段逐行对照真实文件；写了「真实输出」却没绑定 = warning。
- **课程线 [R1]–[R13]**（默认 warning，`--strict` 时 error）：
  - [R1] 节内顺序是 导读 → 接上一节 → 3–5 步 → 小结 → 练习 → 概念索引，每一步都有「动作 → 可见结果 → 为什么」；
  - [R2] `## 接上一节`（上一节做到 / 留下的坑 / 本节补上）和节末的「留给下一节」；
  - [R3] 概念是步骤里的节点（`### 概念 N：` 或被两步包夹的 `## 概念 N：`），全库统一一种写法；
  - [R4] 代码块带【新建】/【修改】(diff)/【重构】/【收口】标签、路径在 `project/` 下、不许「节选」和省略行；
    照正文从空目录重放必须成功，章末结果与 `code/answer/chNN/` 同构；不许引用晚于本章的答案或 notebook；读者不在 `code/` 里动手；
    【提供】`project/…` 声明课件给的文件（赛题骨架、评测脚本等读者不该手搓的东西），重放时从 `<章目录>/_提供/` 播种，缺文件同样报 R4；
  - [R5] 导读写清「你现在手上」和「本节结束时」；[R6] 章末通跑（一条命令 + 真实输出）；[R7] 章末项目地图（非代码科目是产物目录，不要求 `project/`）；
  - [R8] notebook 放 `code/notebooks/CN_*.ipynb`，是读者的实践场（一格一件事、随手跑），交付时不带输出，正文结论不得只靠它成立；[R10] 每节 3–5 步、预计 30–100 分钟；
  - [R11] 正文、命令、输出里没有本机绝对路径。
  - [R12] 公式里没有 `\mathbb`：Typora 1.14 内置 MathJax 4，同步渲染路径上 `\mathbb` 会整条退回源码（读者以为公式坏了）。花体字母写 unicode（`ℝ` `ℕ` `ℤ` `ℚ` `ℂ` `𝔼`），指示函数写 `\mathbf{1}`；批量替换 `templates/fix-mathbb.mjs`。实测细节见 `assets/study-notes/references/editor-compatibility.md` 第六节。
- [R13] 公式里没有 `\\命令名`（TeX 的 `\\` 是换行，整条公式会退回源码）、正文与公式里没有控制字符（反斜杠被字符串层吃掉的后遗症）；修复用 `templates/fix-math-escapes.mjs`。
  - [R9]「每节一个产物」是规划阶段的要求，落在大纲与 checklist 的「本节产物」列，由人工核对。
- **门户**：`notes_data.js` 路径逐字符一致、`quiz` 3–5 题、分值恰为 100、客观题 ≥ 60、`sheet`、`concepts`、`links` 两端、md 与 js 的题目对应。

`run-course.mjs` 是「顺读测试」的机器版：它调用 `check-library.mjs --replay-to` 得到每次【运行】时的 `project/`，
在里面执行命令（stdout 与 stderr 合并），去掉本机绝对路径后与 `code/out/` 比对；比对时忽略回溯栈帧和耗时。
找不到 Python 时它跳过并返回 0。**它会执行笔记里的命令，只对自己写的库运行。**

这两个脚本证明的是**机械一致性**和「照做能跑通」，证明不了**知识正确性**，
也证明不了「读者知不知道下一步干什么」——后者按 `assets/study-notes/references/quality-gates.md`
和 `teaching-design.md` 第十二节的人工顺读测试过。

### 5.1 讲解线规则（T1–T5，v2.1 新增）

v2.0.0 的 R1–R11 保证的是「读者能照着做出来」。实测发现这还不够：一节读完，读者可能只是在**跟着别人的代码走**，
说得出"下一步新建哪个文件"，说不出"为什么要这个函数、为什么非这样写"。v2.1 因此补了一组讲解线规则：

| 规则 | 要求 |
|---|---|
| T1 先讲后做 | 每一步的标题是一个问题或知识主题（「为什么一批数不能是 Python 列表」）；动手之前至少 8 行（通常 20–60 行）讲清为什么要做这一步、为什么非这样写 |
| T2 概念讲透 | `### 概念 N` 条目 40–120 行：为什么需要它 → 原理/数学上的说法 → 一句话 → 定义 → 例子 → 易错点；不是 API 卡片 |
| T3 先想再看 | 每节至少一处「先想一下 / 先猜一猜」，揭晓后必须解释猜错的人错在哪 |
| T4 回看 | 每步跑完有「刚才发生了什么」，把输出逐条对回讲解 |
| T5 讲解为主 | 正文不少于代码：代码是实践环节，不是骨架 |

**重要：T1–T5 在 2.1 版一律只报 warning，`--strict` 也不升 error。** 理由是本仓库的 fixture 和老库都还是
"操作手册"式讲法，一上来就强制会让迁移寸步难行。写新库时请把它们当硬要求执行；
等 fixtures 全部改写成四拍讲法后，下一版再收紧。

模板 `templates/section-note.md` 与 `references/teaching-design.md` 已按四拍（想 → 讲 → 做 → 看）重写，
新库照模板写就自然满足 T1–T5。

### 5.2 【提供】——课件给的文件（v2.2 新增）

比赛或作业包常常自带一层「基础设施」：语料生成器、数据集加载器、指标与评分脚本、赛题骨架。这些文件读者不该手搓（也不是本章要教的东西），又太长、塞进正文会把 T5「正文不少于代码」压垮。做法是把它们放进章目录下的 `_提供/`，正文声明一次：

````markdown
【提供】`project/competition/`（组委会给的赛题骨架：语料生成、图像数据、指标与评分。本章 `_提供/competition/` 下就是这些文件，复制到 `project/` 即可用。）
````

- 路径必须以 `project/` 开头。以 `/` 结尾是**目录形式**：把 `<章目录>/_提供/competition/` 下所有文件（含子目录）递归播种成 `project/competition/<相对路径>`；否则是**单文件形式**（`project/prepare_data.py` ← `_提供/prepare_data.py`）。
- 一行只声明一个路径，多个文件写多行；不要求后面跟代码块，也不参与省略行 / 120 行上限这类 fence 检查。
- 校验器重放一章前先把该章所有【提供】播种进 `project/`，所以 `code/answer/chNN/` 里有这些文件不算「答案区多出」；`_提供/` 下缺文件同样报 **R4**，消息里点明 `<章目录>/_提供/…` 与 `project/…` 两个路径。
- 两条纪律：**提供也要能读懂**（正文一句话说明它提供什么、读者不用改）、**能自己写就自己写**（核心机制仍要读者一行行敲）。

### 5.3 理论线与逐章反馈（v2.3 新增）

R1–R13 假设「有一份可以逐行敲出来的工程产物」。哲学、历史、法理、纯概念型数学这类科目没有 `project/`，硬套只会得到一份"操作手册式"的名词解释。v2.3 补了一条没有工程产物的线，以及两种生成节奏：

| 规则 | 要求 |
|---|---|
| L1 四拍不变 | 想 → 讲 → 做 → 看 照旧，只是「做」换成轻动手（≤ 30 分钟：手算一次路由、画一张对照表、合书复述一段），写成 `<b>动手</b>：…` + `<b>你应该看到</b>：…` 成对出现 |
| L2 产物是知识卷轴 | 概念地图（Mermaid `flowchart`/`mindmap`）、时间线、对照表、推导或论证稿，逐节累积、可检验、可修改；不用 `project/` |
| L3 讲解是主体 | 每步正文 ≥ 60% 篇幅讲清"为什么"，T1/T2/T5 照用 |
| L4 每章一张结构图 | 至少一张 Mermaid 或表格，把本章概念之间的关系画出来 |
| L5 引用规矩 | 只有四类硬事实行内标来源：数字、时间点、SOTA 断言、机构/人物归属；章末用 `### 来源与时效` 汇总（H3，写成 `##` 会被 R1 判 error）；没把握写「此处存疑」，**不编造出处** |
| L6 章末通跑 | 合书复述 + 限时自测；「本章项目地图」写成卷轴目录 |
| L7 练习三类 | 辨析、复述、应用 |
| L8 局部代码课 | 一章里确实能跑代码的整节/整步，按实践线写；notebook 仍受 R8 约束 |

- 判断走哪条线、混合课怎么按章分配（大纲章表标 `类型：理论 / 实践`）、引用具体写法，见 `assets/study-notes/references/theory-line.md`；节模板是 `templates/section-note-theory.md`。
- **L1–L8 不进校验器**：脚本只认结构与绑定，理论线的"讲透没有"由交付前人工过（`quality-gates.md`）。
- **两种节奏**：建库时 P0 会问一句——**逐章停**（每章交付标 🟦，等你反馈、改完再开下一章；只在第一章交付后主动给一份"你可以改的地方"清单）或**连续推进**（确认样章后一口气生成，只在 P0/P2.5 停）。两种都不许在节中间停下来问。
- 同一次 P0 还会问**输出载体**：Typora 优先的 Markdown + 本地门户，或 v3.0 起的 HTML 学习库（见 5.4），二选一，不假称支持 PDF / 线上站点。

### 5.4 HTML 学习库线（v3.0 新增）

同一门课，另一种装帧：**一节一页**，`index.html` → `chNN/index.html` → `chNN/secNN.html`，双击就开。适合"要在正文里插图、要放能拖的演示、要好看的版式"的课。选 HTML 就**只产 HTML**，不会同一套内容再写一份 MD。

| 部件 | 说明 |
|---|---|
| `manifest.json` | 唯一事实源：章标题、节标题、文件名、顺序。`html-nav.mjs` 把它编译成 `src/js/nav-data.js`（file:// 不能 fetch，导航只能以 script 形式进页面） |
| `src/css/theme.css` | 主题：纸纹底、980 版心、海报盒、页边批注、概念卡、演示卡、深色变量。**逐字节复制，不手改** |
| `src/css/theme-course.css` | 课程覆盖层（可选）：只改变量与点缀，不动骨架 |
| `src/js/shell.js` | 外壳：轨道、上下节翻页、主题切换、完成标记、批注折叠、练习判分、标签页、页内计算器、帧序列、继续上次、章节卡与进度 |
| `src/js/demo.js` | 演示引擎：`StudyDemo.register(id, { tier, steps, state, frame, readout })`，滑块/按钮/时间轴按 `data-act` / `data-param` 自动绑定，状态写进 URL hash（`#t=0.42&lr=1.05`），空格播放、←→ 单步 |
| `chNN/secNN.html` | 节页：从 `templates/html/section.html` 填占位符。四拍、概念卡、代码块、`你应该看到`、演示卡、练习、小结、来源与时效 |
| `CREDITS.md` | 图片/视频来源与许可（搜来的素材必须记） |

约束（`references/html-line.md` 是完整契约）：**六条宿主协议**（`data-lesson/chapter/root/track/title`、外壳生成 `#track`/`#pager`、进度只进 localStorage、相对路径、不联网）＋**file:// 禁区**（`type="module"`、`import`、`fetch()` 本地文件、Worker 都会被拦）。

交互是插入件，不是主体：判据是「读的时间明显多于点的时间」；三项准入（不试不会信 / 懂了做不对 / 文字绕不清）、三项禁入（本来就会信 / 长链推理 / 只为好看）；正文删掉所有组件仍要读通。演示分四档：F1 滑块重画、F2 可拖（主力）、F3 预渲染帧、F4 视频（只点缀），每章 1–2 个。

除演示之外，v3.1 起模板里还备好了六类小部件，按内容形态挑，不按“显得丰富”挑：**标签页**（同一件事的两种读法）、**分层提示**（先给方向、后给理由）、**页内计算器**（把数字交给读者改，支持 `ceil/floor/round/abs/sqrt/min/max`）、**继续上次**（首页与章首页都显示上次读到哪一节）、**章节卡**（每章完成数 + 均分，节卡带时长与产物）、**F3 帧序列 / F4 视频**（浏览器里播不稳的东西预渲染成帧或短视频）。

机检：

```bash
node assets/study-notes/scripts/html-nav.mjs  "<库>"            # manifest → src/js/nav-data.js
node assets/study-notes/scripts/html-lint.mjs "<库>"            # HTML01–07 + 15–18 必须 0 error；HTML11–14、19 是 warning
```

`test/fixtures/html-mini/` 是一份能过机检、能双击打开的最小库（1 章 4 节，第 4 节专门覆盖标签页 / 计算器 / F3 / F4），既可当参考，也是回归夹具；`verify-plugin.mjs` 第 7 节会跑它，并故意注入 `type="module"` 与本机绝对路径，确认这两类错误能被抓住。

---
## 六、老库怎么按新结构逐步迁移

v2.0.0 之前生成的库是「概念卡片」骨架：每节由若干 `## 概念 N：` 排成，代码从写好的 `code/` 成品里摘「节选」。
新版校验器对这类库**不报新的 error**，只把课程线问题列成 `[R*]` warning，所以可以一节一节地迁，不必一次推倒。
用本仓库实测的三座老库（只读、默认模式）作参照：都是 0 error，课程线 warning 分别约 370、220、250 条。

**迁移前**：先把库提交到 git（或整体备份）。迁移会大面积改正文，出了问题要能回到原样。

**第 0 步：看清欠账。**

```bash
node assets/study-notes/scripts/check-library.mjs "<库>" --json > before.json
```

按 `[R*]` 编号数一数，知道问题主要集中在哪些规则、哪些章。

**第 1 步：先修零成本的。** 这几类改动不碰教学结构，可以全库一次做完：

- [R11] 本机绝对路径：正文、命令、保存的输出里的 `C:\Users\…`、`D:\…`、`/home/…` 换成相对笔记根目录或 `project/` 的写法；
  脚本打印路径的，改成先转相对路径再打印，然后重新生成输出。
- [R8] notebook：挪到 `code/notebooks/CN_主题.ipynb`，清空输出。
- 门户公式：把 `templates/web/index.html` 与整个 `templates/web/vendor/` 复制进 `<库>/web/`。
  只复制 `index.html` 也能用，但断网时公式会退化成源码；带上 `vendor/`（约 1.3 MB）才是真正离线可读。

**第 2 步：按章迁移，从第 1 章开始往后。** 承接链是从前往后的，第 N 章的「接上一节」依赖第 N−1 章已经迁好。每一章：

1. **先定线（R9）**：在 `00 大纲.md` 和 `checklist.md` 里给本章每一节写「本节产物」——这一节结束时读者手上多了什么、能检查什么。
   写不出来的节，说明它本来就是概念卡片，要并进别的节或重新切分。
2. **改节骨架（R1/R2/R5/R10）**：每节加 `## 接上一节`（<b>上一节做到</b>：/ <b>留下的坑</b>：/ <b>本节补上</b>：），
   导读写「你现在手上 / 本节结束时」，正文切成 3–5 个 `## 第 N 步：`，每步写清动作、可见结果、为什么，节末加
   <b>留给下一节</b>：。超过 800 行或超过 5 步的节拆成两节。
3. **把概念挪进步骤（R3）**：`## 概念 N：名称` 改成 `### 概念 N：名称`，放进第一次需要它的那一步里。
   **编号保留**：门户的概念徽标和锚点靠「概念 N：」定位，去掉编号会断链。迁移中途全库混用 `##` 与 `###` 会报一条
   [R3]「全库混用」warning，这是预期的，迁完就消失。
4. **把成品代码变成读者自己的代码（R4）**：
   - 现在的 `code/` 是全书最终版。把**本章结束时**应有的状态放进 `code/answer/chNN/`——要剥掉后面章节才加的类和函数，
     否则就是把未来版本泄漏给了读者；
   - 正文代码块改成带标签的操作：【新建】`project/…`（完整文件）、【修改】`project/…`（```diff 块，留上下文行）、
     【重构】`project/…`（按函数名整体替换）、【收口】、【运行】（命令代码块）；删掉所有「节选」和 `...` 省略行；
   - 课件给的基础设施（比赛/作业包的题库、数据加载器、指标与评分脚本）不要塞进正文让读者手搓：放进
     `Cha_X …/_提供/`，正文用【提供】`project/…` 声明，重放时会自动播种进 `project/`；
   - 让读者在 `code/` 里建目录、写文件的命令（如 `mkdir -p code/xxx`）都改到 `project/`。
5. **生成真实输出和答案快照**：

   ```bash
   node assets/study-notes/scripts/run-course.mjs "<库>" --write
   ```

   它会从空目录照正文做一遍、执行每条【运行】，写出 `code/out/`、正文里的输出块和 `code/answer/chNN/`。
   读一遍生成的输出：**和正文说法不一样时改正文，不改输出**。重放失败（某个【修改】找不到上下文）说明正文本身照做不通，按报告的行号修。
6. **补章末（R6/R7）**：本章最后一节加一步「章末通跑」（一条命令 + 绑定的真实输出），再加「本章项目地图」
   （包含 `project/` 的文件树、每个文件一句话职责、「本章动了」哪些文件）。
7. **本章验收**：对本章每一节跑 `check-library.mjs "<库>" --strict --only "<本章各节>"`，再跑一次 `run-course.mjs "<库>"`。
   本章 0 error、输出全部一致，才算这一章迁完，记进 `checklist.md` 的变更日志。

**第 2 步补充：把讲解补厚（T1–T5）。** 只改结构、不改讲解，会得到一堆"能照做但学不到东西"的节——
这正是 v2.1 要解决的问题。补法不碰代码、不动输出，可以先跑一遍 `check-library.mjs` 看 `[T1]`–`[T5]` 的 warning 定位：

- 每步标题从文件操作改成问题（「新建 check.py」→「先想清楚：为什么"一批数"不能是 Python 列表」）；
- 每步动手前补 2–5 段"为什么现在要做这个、为什么非这样写"，把刚才的结构说明升级成讲解；
- 概念条目从 15–40 行扩到 40–120 行，补「为什么需要它」和"它在数学/原理上是什么"；
- 每节挑一处改成先想后看（先抛问题、让读者自己答，再揭晓）；每步输出后加「刚才发生了什么」，逐条对回讲解。

**第 3 步：全库验收。** 所有章迁完后跑 `check-library.mjs "<库>" --strict` 和 `run-course.mjs "<库>"`，两者都通过即迁移完成。
最后挑一章做一次人工顺读测试（只按正文字面指示，在空的 `project/` 里照做到章末）。

**非代码科目**（数学、语言、历史……）没有 `project/` 和 `code/`，[R4]/[R6] 的代码部分不适用。
迁移照样走第 2 步的 1–3、6：每节的产物换成推导本里多出的一条结论、句子本里多出的一组句型、时间线上多出的一段，
章末通跑换成「从头验算 / 复述一遍自己的产物」。分科目的写法见 `assets/study-notes/references/subject-playbooks.md`。

---
## 七、实现要点

- **无外部依赖**：`index.js`、`serve.mjs`、`check-library.mjs`、`run-course.mjs` 只使用 `node:` 内置模块。
  因此 `package.json` 里没有 `dependencies`，也没有 `peerDependencies`——安装时不会触发任何
  网络请求，也不会被 profile 的 DSH 版本兼容性检查拒绝。
- **`inject = ['skills']`**：profile 里没有 skill 注册表时，插件安静地保持 inactive，而不是抛错。
- **`SKILL.md` 自解析**：插件读取 `assets/*/SKILL.md` 的 YAML frontmatter，取出 `name` 与
  `description` 作为目录条目；`SKILL.md` 是唯一的元信息来源，不会与别处漂移。
  新增技能只需在 `assets/` 下多放一个含 `SKILL.md` 的目录。
- **`resourceBase` 暴露真实目录**：技能加载时，`skill` 工具会告诉模型
  `references/`、`templates/`、`scripts/` 的绝对路径。模型用 shell 复制大文件
  （门户 HTML、启动脚本）而不是重新打一遍，既省上下文又不会抄错字节。
- **启动脚本的端口探测**：`.bat` 用 `for /f` 收集 `netstat` 里 **LISTENING** 的行来判断端口是否被占用。
  不能只看 `":8765 "`——`TIME_WAIT` 连接里同一个数字会出现在本地或远端端口列，会被误判为占用；
  也不能依赖管道之后的 `errorlevel`，cmd 在管道里传递它的方式不可靠。

---

## 八、已知局限

- 门户的**视觉效果**没有被自动化测试覆盖（无浏览器控制），需要人工确认。
- `check-library.mjs` 对 `CX 测试.md` 的题号/分值是按 `**N.（M 分）**` 这一约定格式统计的。
  如果测试文件用了别的格式，它会退化为一条 warning（"无法自动核对"），而不是误报。
- `notes_data.js` 与 `.md` 的题目一致性只能做**宽松**核对（题干前 10 个实义字、分值序列、题目数量）。
  语义等价但措辞不同的题目不会被发现。
- `run-course.mjs` 用系统 shell 执行【运行】命令（开头的 `python` / `python3` 会换成探测到或 `--python` 指定的解释器），单条命令默认超时 120 秒（长演示用 `--timeout 400000` 放宽；被超时杀掉会截断输出、表现为「输出不一致」——先怀疑超时）；遇到 `python -m 包名.evaluate / .predict` 且同目录没有 `runs/` 产物时，它会先把该包的 `train` 静默跑一遍（重放快照只存源码，不存运行产物），
  按「去掉快照绝对路径、忽略回溯栈帧与 unittest 耗时」的口径比对。依赖未固定的随机数、网络或 GPU 的输出会被判为不一致：
  这类步骤要么固定种子，要么写成 ```` ```text ```` 的示意并说明。
- 概念标题保留编号（`### 概念 N：名称`），因为门户的概念徽标按「概念 N：」生成锚点；不带编号的概念标题不会被门户识别。
- 课程线规则能查出「结构上像不像一门课」，查不出「读者读到这里知不知道下一步干什么」，后者仍靠人工顺读测试。
- 安装后如果移动了本插件目录，符号链接会断掉，需要重新安装。

---

## 九、许可与致谢

MIT © 2026 [GamecialX](https://github.com/GamecialX)，见 [LICENSE](LICENSE)。

- 想改/提 PR：先 `npm test`（173 项插件检查 + 校验器端到端 fixture + 样章真实运行）保持全绿。
- 想在自己的科目上跑一遍：见上方「五、校验生成出来的学习库」；老库见「六、老库怎么按新结构逐步迁移」。


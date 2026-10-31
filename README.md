# dsh-study-notes

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DeepSeek Harness plugin](https://img.shields.io/badge/DSH-plugin-6f42c1)](https://github.com/GamecialX/dsh-study-notes)


一个 DeepSeek Harness 插件（bundle），它往当前 profile 里注册一个技能：

> **`study-notes`** —— 当用户想从零学一门科目、想要"学习笔记 / 教学文档 / 讲义 / 教材式笔记"时，
> 指导 agent 生成**一整座可住进去学习的库**：分章的**标准 Markdown** 笔记（Typora 优先；概念就地成节，
> 不拆原子文件）、图、每节 3–5 道练习、本章速查、100 分制章末测试（含跨章回顾），外加一个本地的网页学习门户
> （单文件应用 + 一键启动脚本）。新课程会先写一节样章，等用户确认风格后再批量生成。

零依赖、零构建、可离线安装。`index.js` 只 import `node:` 内置模块。

---

## 一、它到底交付什么

`study-notes` 被加载后，agent 会按《学习笔记生成准则》生成下列产物（都在用户指定的笔记根目录下）：

| 产物 | 说明 |
|---|---|
| `00 大纲.md` | 全库总起页：科目简介、学习路线、逐章条目、**概念总索引**（带锚点链接） |
| `Cha_X 章名/` | 每章：节笔记（含 `## 概念 N：` 小节）、`CX 速查.md`、`CX 测试.md`、`src/` 图源 |
| `code/`（代码类科目） | 正文引用的真实代码与运行输出，用 `<!-- source: -->` / `<!-- output: -->` 绑定 |
| `checklist.md` | 工作记录：规划表、进度指针、恢复上下文（含样章确认的风格约定）、变更日志 |
| `web/index.html` | 单文件学习门户（黑色机械风 × 毛玻璃，内联全部 CSS/JS） |
| `web/notes_data.js` | 目录结构与题目数据（正文不复制，前端实时 fetch `.md`） |
| `web/serve.mjs` | 零依赖 Node 静态服务器（只在探测不到 Python 时使用） |
| `启动学习服务器.bat`、`start_server.sh` | 一键起服务器并自动打开门户 |

门户的能力：仪表盘进度与均分、侧栏导航树、标注块（`> <b>*Note*</b>` 等 5 种）渲染为彩色框且答案默认折叠、
标题锚点与标准 `.md` 链接跳转、本章速查页、公式（KaTeX 可用时增强、离线自动降级）、节内练习即时判分、
章末整卷测试与成绩单（客观题自动判分、主观题按评分要点自评、保留最佳与最近成绩）、知识图谱、全文搜索、
`localStorage` 持久化。

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
│   ├── SKILL.md           # 入口指令：角色、产物、资产地图、六条铁律、P0–P5 流程（含 P2.5 样章确认）
│   ├── references/        # 按需加载的详规
│   │   ├── notes-standard.md            # 格式唯一规范：结构、命名、标注块、链接/公式/代码绑定、速查、测试
│   │   ├── teaching-design.md           # 教学唯一规范：概念必备/可选、篇幅预算、先猜后看、渐进练习、间隔复习
│   │   ├── workflow-and-recovery.md     # 流程判据、样章确认、checklist 格式、中断恢复协议
│   │   ├── quality-gates.md             # 内容红线 + 工程红线 + 人工自检
│   │   ├── portal-standard.md           # 门户数据契约（concepts / sheet）、视图、渲染、判分、启动脚本
│   │   ├── editor-compatibility.md      # Typora 踩坑记录：为什么不用 callout、公式不显示怎么查
│   │   └── subject-playbooks.md         # 数学/代码/语言/人文/操作型/应试 的分科目打法
│   ├── templates/         # 可直接复制/填充的骨架
│   │   ├── syllabus.md checklist.md section-note.md cheat-sheet.md
│   │   ├── chapter-test.md capstone.md
│   │   ├── callout-to-blockquote.mjs     # 旧标注（[!note] / **Note**:）→ <b>*Note*</b>（幂等）
│   │   ├── fix-math-delims.mjs           # 块级公式定界符 $ → $$（幂等，--fix 才写盘）
│   │   ├── 启动学习服务器.bat  start_server.sh
│   │   └── web/{index.html, notes_data.js, serve.mjs}
│   └── scripts/
│       └── check-library.mjs            # 校验器（全库 / --only 单篇）
└── test/                  # 开发自测（不参与运行时）
    ├── verify-plugin.mjs
    └── check-fixture.mjs
```

---

## 四、自己跑一遍测试

```bash
# 1) 插件层：语法、skill provider 契约、门户渲染器与判分函数、模板行尾
node test/verify-plugin.mjs

# 2) 端到端：造一份合规库（应 0 error）+ 一份注入缺陷的库（应报 error）
node test/check-fixture.mjs

# 等价于
npm test
```

`verify-plugin.mjs` 会在**无浏览器**环境里启动门户脚本（用一个极小的 DOM stub），
通过门户暴露的 `window.__NOTES_PORTAL__` 调试出口直接调用 Markdown 渲染器与判分函数，
所以渲染回归、标注块与答案折叠、标题锚点、标准链接解析、图片路径解析、`$公式$` 降级这些都能自动验证。

浏览器里的**视觉**效果（毛玻璃、动效、响应式布局）无法自动验证——那部分需要人眼看。

---

## 五、校验生成出来的学习库

```bash
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>"
node assets/study-notes/scripts/check-library.mjs "<笔记根目录>" --json
```

另有 `--only "<相对路径>"`（可重复）只检查指定笔记，供样章阶段使用。
退出码 `0` = 无 error（可能有 warning），`1` = 有 error，`2` = 用法错误。它检查：

- **结构**：命名规范、frontmatter、必备产物、每章测试（error）与速查（warning）；跳过 `_`、`.` 开头的目录。
- **链接**：标准链接与图片是否存在、锚点能否对上标题（容忍 Typora/GitHub 的符号差异）、空链接、越出根目录的链接、未编码空格。
- **可移植**：`[[wikilink]]` / `![[嵌入]]` = error；`> [!x]` callout、`> **Note**:`、单行 `$$`、多 H1 = warning。
- **教学**：每节练习 3–5 题（只数「本节练习」里的答案块）、篇幅 ≤ 800 行、标注块 ≤ 20、旧式 `C1-01` 编号残留、第 3 章起测试的 `【回顾 CX】` 题。
- **代码**：`<!-- source: -->` / `<!-- output: -->` 绑定的片段逐行对照真实文件；写了「真实输出」却没绑定 = warning。
- **门户**：`notes_data.js` 路径逐字符一致、`quiz` 3–5 题、分值恰为 100、客观题 ≥ 60、`sheet`、`concepts`、`links` 两端、md 与 js 的题目对应。

它证明的是**机械一致性**，证明不了**知识正确性**——后者按
`assets/study-notes/references/quality-gates.md` 人工过。

---

## 六、实现要点

- **无外部依赖**：`index.js`、`serve.mjs`、`check-library.mjs` 只使用 `node:` 内置模块。
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

## 七、已知局限

- 门户的**视觉效果**没有被自动化测试覆盖（无浏览器控制），需要人工确认。
- `check-library.mjs` 对 `CX 测试.md` 的题号/分值是按 `**N.（M 分）**` 这一约定格式统计的。
  如果测试文件用了别的格式，它会退化为一条 warning（"无法自动核对"），而不是误报。
- `notes_data.js` 与 `.md` 的题目一致性只能做**宽松**核对（题干前 10 个实义字、分值序列、题目数量）。
  语义等价但措辞不同的题目不会被发现。
- 安装后如果移动了本插件目录，符号链接会断掉，需要重新安装。
---

## 八、许可与致谢

MIT © 2026 [GamecialX](https://github.com/GamecialX)，见 [LICENSE](LICENSE)。

- 想改/提 PR：先 `npm test`（159 项检查 + 端到端 fixture）保持全绿。
- 想在自己的科目上跑一遍：见上方「五、校验生成出来的学习库」。


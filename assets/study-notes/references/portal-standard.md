# 网页学习门户标准

门户与 Typora 里读的笔记**共用同一批 Markdown 作为唯一事实源**。门户做四件事：在浏览器里读全部节笔记与本章速查、作答节内练习与章末测试并自动判分、追踪学习进度、搜索与浏览概念关系。

---

## 一、总原则

1. **单事实源**：正文内容**不复制**进网页数据。前端实时 `fetch` 对应 `.md` 文件渲染。用户在 Typora 里改了 md，刷新网页即同步。`notes_data.js` 只存目录结构与测试/练习的结构化数据。
2. **单文件应用**：`index.html` 内联全部 CSS/JS，零构建、零安装。**核心功能（导航、阅读、测试、进度）不得依赖外网资源**；CDN 仅可用于公式渲染等增强项，且离线时必须降级。
3. **路由用 hash**：`#/home`、`#/read/c1s1`、`#/test/c1`，兼容任意静态服务器。

---

## 二、文件构成

```
web/
├── index.html        # 单文件应用（内联 CSS/JS，内置迷你 Markdown 渲染器）
├── notes_data.js     # window.NOTES_DATA = { ... }
└── serve.mjs         # Node 兜底静态服务器（只在探测不到 Python 时使用）
```

- `notes_data.js` 由**你**手写；`index.html` 与 `serve.mjs` 从模板复制，不要改（除非用户明确要求定制门户）。
- `serve.mjs` 是**零依赖**的静态服务器，只用 Node 内置模块。它存在的意义是：机器上只有 Node 而没有 Python 时，启动脚本仍然能工作。

---

## 三、数据契约（notes_data.js）

```js
window.NOTES_DATA = {
  meta: { subject: "<科目名>", generatedAt: "<生成时间>", chapters: <章数> },
  chapters: [{
    id: "c1", no: 1, title: "<章名>", brief: "<一句话导读>",
    sections: [{
      id: "c1s1", no: 1, title: "<节名>",
      file: "/Cha_1 章名/C1 Sec_1 节名.md",   // 站点根绝对路径
      concepts: [{ n: 1, name: "概念A" },       // 本节的概念条目：对应 md 里的「### 概念 N：名称」（老库是 ##）
                 { n: 2, name: "概念B" }],
      quiz: [{                                  // 节内 3–5 道练习（与 md 内一致）
        type: "choice",        // choice | judge | fill | calc | subjective
        question: "...",
        options: ["...", "..."], // judge 无 options；fill/calc/subjective 可无
        answer: 2,             // choice 为选项下标（从 0 起）；judge 为 true/false；其余为参考答案文本
        analysis: "解析"
      }]
    }],
    sheet: { file: "/Cha_1 章名/C1 速查.md" },  // 本章速查（毕业设计章省略）
    test: {
      title: "第 1 章 测试", file: "/Cha_1 章名/C1 测试.md", total: 100,
      questions: [{
        id: "q1", type: "choice", score: 5,
        question: "...", options: ["..."], answer: 1, analysis: "..."
      }]
    }
  }],
  links: [["概念A", "概念B"]]        // 可选：知识图谱的边，两端都是 concepts 里的 name
};
```

硬性要求：

- `file` 路径与实际文件名**逐字符一致**（含空格与全半角）。前端会用 `encodeURI` 请求。
- 练习与测试题在 md 笔记中以人类可读形式完整存在，在 `notes_data.js` 中以结构化形式存在，**两者必须一致**。
- `chapters[].test.total` 必须为 `100`，且各 `questions[].score` 之和恰为 100。
- 每节 `quiz` 3–5 题；`concepts[].name` 与 md 里 `### 概念 N：名称`（或老库的 `## 概念 N：名称`）的名称一致，`n` 与编号一致：徽章按 `slugify("概念 N：名称")` 跳转，所以标题必须带编号。
- 旧字段 `atomic: ["C1-01 概念A"]` 门户仍能读，校验器会提示改成 `concepts`。
- `id` 规则：章 `c<章号>`，节 `c<章号>s<节号>`，题 `q<序号>`（章内唯一）。
- `meta.generatedAt` 用 `YYYY-MM-DD HH:mm` 本地时间字符串。

### 可选扩展（模板已支持，可省略）

```js
meta: {
  subject: "……",
  options: {
    fillCaseSensitive: false,   // fill 判分是否区分大小写（默认不分）
    katex: "auto"               // "auto"（尝试 CDN，失败降级）| false（从不加载）
  }
}
```

---

## 四、信息架构与视图

### 1. 仪表盘 `#/home`

- 科目 HUD 大标题；总进度（已完成节 / 总节数）与测试平均分读数。
- 各章装甲卡片：章号、章名、进度条、测试得分、学习状态灯、「继续学习」按钮。
- 最近学习入口。
- 「重置进度」按钮（**需二次确认**）。

### 2. 阅读视图 `#/read/c1s1`

- 左侧毛玻璃导航树：章可折叠 → 节列表，含完成状态灯与当前高亮；窄屏折叠为抽屉。
- 主区毛玻璃卡片渲染该节 md 正文。
- 本节概念条目以徽章列表呈现，点击跳到对应标题锚点（`##` 与 `###` 都行）。
- 节末「练习演练」卡片：3–5 题交互作答、即时判分与解析。
- 顶部面包屑与「上一节 / 下一节」按钮。
- 「标记本节完成」按钮。

### 3. 速查视图 `#/sheet/c1`

- 侧栏每章下有「本章速查」入口（章条目有 `sheet` 时出现）。
- 渲染 `CX 速查.md`，链接与锚点规则同阅读视图。

### 4. 测试视图 `#/test/c1`

- 整卷作答模式，按题号顺序：选择/判断点选、填空输入、计算/主观题文本作答。
- 「交卷」后出具成绩单：
  - 总分环状仪表；
  - 客观题自动判分、逐题对错；
  - 主观题展示参考答案与评分要点，由用户**自评填分**；
  - 逐题解析可展开；
  - 成绩与作答记录存档。
- 允许重测，**保留最近与最佳两次成绩**。

### 5. 可选加分项（模板已实现）

知识图谱视图（基于 `concepts` 与 `links` 的概念关系图）与全文搜索。

---

## 五、视觉设计语言：黑色机械风 × 毛玻璃

整体氛围为**深色机甲驾驶舱 / HUD**，要求「炫酷但克制」，**不得牺牲可读性**。

```css
:root {
  --bg: #0a0d12;          /* 近黑底 */
  --panel: #11151c;       /* 面板底 */
  --armor: #1a2029;       /* 装甲灰 */
  --text: #d6deeb;        /* 正文 */
  --dim: #8b98ab;         /* 弱化文字 */
  --accent: #00e5ff;      /* 霓虹青（主强调） */
  --warn: #ff9f1c;        /* 琥珀橙（次强调/警示） */
  --ok: #3ddc84;          /* 判分通过 */
  --bad: #ff5470;         /* 判分错误 */
  --glass: rgba(255,255,255,.05);
  --glass-line: rgba(255,255,255,.09);
  --mono: ui-monospace, "JetBrains Mono", Consolas, monospace;
}
```

- **背景**：近黑底叠加细微网格线与低透明度噪点/扫描线，营造 HUD 空间感；不使用大图背景。
- **毛玻璃**：侧栏、内容卡片、弹层统一 `background: var(--glass); backdrop-filter: blur(18px) saturate(150%); border: 1px solid var(--glass-line);`。
- **机械感组件**：卡片四角做斜切角（`clip-path`）或 L 形取景框描边；分割线用装甲板双线并点缀铆钉圆点；标题区配等宽小字号大写 HUD 标签（如 `SECTOR 02 / PROGRESS 67% / SCORE 88/100`，字距加宽、前缀 `▸` 或 `◆`）。
- **发光与动效**：强调色元素带柔和 `box-shadow` 辉光；hover 微发光、切页淡入上移、判分时成功绿/失败红闪烁反馈、进度条充能动画。**单次动效 ≤300ms**，全部克制。必须尊重 `prefers-reduced-motion`。
- **字体**：正文用系统无衬线栈；HUD 标签、数字读数、代码用 `--mono` 等宽栈。正文行高 ≥ 1.7，段落宽度适当限制（约 78ch）。
- **响应式**：≥360px 宽度可用；窄屏下侧栏折叠为抽屉。

---

## 六、渲染与交互行为

- **内置迷你 Markdown 渲染器**（自研，内联于 `index.html`），支持：标题（带锚点）、段落、粗斜体、行内代码、围栏代码块（深色代码卡片）、有序/无序列表、任务列表、表格、引用与标注块、分割线、图片、链接、删除线、安全的行内 HTML。
- **Markdown 渲染细节**（不依赖任何编辑器专有语法）：
  - 标注块 `> <b>*Note*</b>`（标签独占一行，下一行是标题）→ 带配色的玻璃提示框，5 种类型 `Note`/`Tip`/`Important`/`Warning`/`Caution`；标题为「答案与解析」「参考答案」的块默认折叠、可点击展开。
  - 安全的行内 HTML（`<b> <strong> <i> <em> <u> <sub> <sup> <kbd> <mark> <br>`）照常显示，其余 HTML 转义。
  - 标题自动生成锚点（规则同 `notes-standard.md` 5.1）。
  - 标准链接 `[文字](相对路径.md#锚点)` → 按相对该 md 所在目录解析，指向节笔记 / 速查 / 测试时跳到 `#/read/…` / `#/sheet/…` / `#/test/…`，`00 大纲.md` 跳到仪表盘；`#锚点` 滚动到对应标题；目标不在门户里或为空链接时渲染为灰色"缺失链接"。
  - 图片 `![说明](src/x.png)` → 按相对该 md 所在目录解析。
  - 旧式 `> [!x]` callout 与 `[[wikilink]]` 仍能渲染（兼容老库），新内容不要再用。
- **公式**：识别 `$...$` 与 `$$...$$`；允许 CDN 引入 KaTeX 增强渲染，但离线时必须降级为等宽高亮的 LaTeX 源码样式，保证可读。**禁止因解析失败丢失或截断正文。**
- **判分规则**：
  - `choice` / `judge` 自动判分；
  - `fill` 去除首尾空格后与答案全等（大小写策略按 `meta.options.fillCaseSensitive` 声明，默认不区分）；
  - `calc` / `subjective` 展示参考答案与评分要点，自评输入分数。
- **本地持久化**：进度与成绩存 `localStorage`，键名统一前缀 `notes_portal:`：
  - `notes_portal:progress` —— 已完成节集合
  - `notes_portal:scores` —— 各章测试成绩 `{ best, last }`
  - `notes_portal:last` —— 最近学习位置
  - `notes_portal:quiz` —— 节内练习作答记录（可选）
- `notes_data.js` 加载失败时给出**友好错误页**（说明如何启动、检查文件路径），而不是白屏。

---

## 七、一键启动脚本

笔记根目录下必须有 `启动学习服务器.bat`（Windows）与 `start_server.sh`（macOS/Linux），行为：

1. 切换工作目录到**脚本所在目录**（= 笔记根目录 = 站点根目录）。
2. 依序探测可用运行时：`python` → `py -3` → `node`。Python 用标准库 `http.server`；Node 用内置模块实现等价静态服务。全程**零第三方依赖、零联网安装**。
3. 默认端口 **8765**，支持命令行参数覆盖；端口被占用时自动 +1 重试（至多 5 个端口）。
4. 服务器就绪后自动打开浏览器访问 `http://localhost:<端口>/web/index.html`。
5. 探测不到任何可用运行时时，打印明确的安装指引（附官网地址）后退出，**不得静默失败**。

| 需要什么 | 去哪里拿 |
|---|---|
| 门户应用本体（数千行） | `templates/web/index.html` |
| Node 兜底静态服务器 | `templates/web/serve.mjs` |
| 两个启动脚本 | `templates/启动学习服务器.bat`、`templates/start_server.sh` |

这四个文件**必须逐字节复制**（Windows 用 `Copy-Item -LiteralPath`，macOS/Linux 用 `cp`）：`.bat` 依赖 CRLF 行尾与 UTF-8 代码页，手抄必然出错；`index.html` 有数千行，重打既费时又容易破坏渲染器。

---

## 八、同步节奏（重要）

门户**随章节生长**，不要留到最后一次性补建：

- 大纲确定后立刻建 `web/` 骨架与两个启动脚本。
- 每完成一章，重写 `notes_data.js` 中该章的条目（含 `sheet`）。
- 正文无需同步——前端实时读取 md。

§ 「每完成一章就重写 notes_data.js」的代价很小（文件是结构化的、每章独立），但能保证任何时候打开门户都是可用的。不要攒着。

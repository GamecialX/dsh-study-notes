# HTML 学习库线（契约）

> 建库时用户选了 **HTML**（而非 Markdown）就用本文档。此时**只产 HTML，不写 Markdown 笔记**。
> 产物是一套**双击 index.html 就能打开**的本地学习站：无 CDN、无构建、无需 Node。
> 本文只定"库的形状"与 6 条宿主协议；页面内部怎么排版、用哪些组件，生成时自己决定。

## 0. 与 MD 线的分界

| | Markdown 线 | HTML 线 |
|---|---|---|
| 产物 | `.md` 笔记 + 门户（默认生成） | 只产 `.html` + 资源 |
| 校验 | R 线规则 | L0/L1（第 7 节） |
| 共享 | **学习法**（四拍、概念、练习、速查、测试）与**主题变量名**；内容不共享 | 同左 |

## 1. 目录形状

```
<库名>/
├─ index.html              # 库首页：课程地图 + 总进度 + 成绩
├─ manifest.json           # 章节清单（唯一事实源）
├─ ch01/
│  ├─ index.html           # 章首页：本章大纲、产物清单、节卡片
│  └─ sec01.html           # 节页面（一节一页）
├─ src/
│  ├─ css/theme.css        # 默认主题（vendored）
│  ├─ css/theme-course.css # 可选：本课覆盖层（只改变量与少量插槽）
│  ├─ js/shell.js          # 宿主协议：导航、进度、主题、批注、复制
│  ├─ js/demo.js           # F 演示外壳：播放/步进/时间轴/hash/键盘/降级
│  ├─ image/               # 图片（自绘优先）
│  └─ media/               # 视频、帧序列
├─ assets/                 # 代码产物、notebook、数据
└─ CREDITS.md              # 外部素材来源与许可（用了别人的图就必须有）
```

## 2. manifest.json（唯一事实源）

```json
{
  "schema": "study-notes-html/1",
  "title": "手搓深度学习",
  "subtitle": "从空目录长出一个跑得起来的小框架",
  "track": "practice",
  "lang": "zh",
  "created": "2026-11-17",
  "theme": { "name": "paper", "courseOverlay": null },
  "chapters": [
    { "id": "ch01", "title": "让参数自己往下走", "dir": "ch01",
      "sections": [
        { "id": "sec01", "title": "损失曲面长什么样", "file": "ch01/sec01.html" }
      ] }
  ]
}
```

- `track`：`practice` / `theory` / `mixed`；`theme.courseOverlay` 填 `"theme-course.css"` 时多引一层
- **章节顺序即数组顺序**；上一节/下一节**不手写**，由 shell.js 读 manifest 计算
- 增删页面必须同步 manifest；两边不一致 = L0 报错

## 3. 宿主协议（只有 6 条）

1. **声明位置与标题**：`<body data-lesson="ch01/sec01" data-chapter="ch01" data-track="practice" data-title="第 3 节：步长取多大才不会来回震荡">`
2. **引入共享件**（相对路径、经典 script、禁止 module）：
   ```html
   <link rel="stylesheet" href="../src/css/theme.css">
   <script src="../src/js/nav-data.js"></script>   <!-- html-nav.mjs 生成，必须在 shell.js 之前 -->
   <script src="../src/js/demo.js"></script>       <!-- 必须同步：页面末尾的 StudyDemo.register 要用 -->
   <script src="../src/js/shell.js" defer></script>
   ```
   **demo.js 不能加 defer**：节页末尾的内联脚本在解析期就调用 `StudyDemo.register`，defer 的话那时 `window.StudyDemo` 还不存在，演示会静默失效。
3. **导航占位**：顶栏 `<nav id="track"></nav>`、页脚 `<div id="pager"></div>`，由 shell.js 填
4. **进度上报**：完成标记与判分交卷时派发
   `document.dispatchEvent(new CustomEvent("study-progress", { detail: { lesson, kind: "done" | "score", done?, score?, total? } }))`
   shell.js 写 `localStorage`（`study:progress:<lesson>`、`study:scores:<lesson>`）；存储不可用则静默降级为内存
5. **资源一律相对路径**（图片、视频、样式、脚本）
6. **不许联网**：无 CDN、无外部字体、无远程 API、无统计脚本

其余自由：配色、列数、有没有动画、组件选哪几个。

## 4. 主题层

- 颜色/字体/间距全部走 CSS 变量，集中在 `theme.css` 的 `:root` 与 `html[data-theme="dark"]`
- 覆盖层 `theme-course.css` **只许**改变量 + 少量插槽样式，不得复制整份组件样式
- 变量契约（shell.js 与组件依赖，**不得改名**）：`--paper --paper-2 --ink --ink-2 --ink-3 --red --blue --kraft --line`；字体 `--serif --sans --mono`
- **演示卡宽幅（v3.2）**：宽屏（≥1081px）下 `.demo` 突破 980 版心、居中到视口宽（上限 1440），说明栏仍在右侧 330，画布接近 1:1；开着页边批注时说明栏落到画布下方。宽度用 `--demo-w` 调（在 `theme-course.css` 里覆盖即可），某张卡想收回去就给它 `width:auto;margin:40px 0`
- **老库换主题**：`theme.css` 建库时逐字节复制，插件升级不会改写老库；v3.2 之前建的库跑 `node <skill>/scripts/migrate-theme.mjs --lib "<库>"`（自动备份，顺带删掉早期手贴的「演示卡放大补丁」并注释掉旧 `.demo.demo-wide` 折行规则）

## 5. 交互方向（文字为主，组件为辅）

默认是文章，组件是插入件不是骨架。判据只有一条：**读的时间明显多于点的时间**。

**四条硬约束**
1. **正文自足**：删掉所有组件这一节仍读得通。禁止"拖动上面的滑块你会发现……"却不自己解释。
2. **每节只问一次**：「这一节里，**读者不动手就会误解的地方**在哪？」不按段落问"这段能不能交互"。
3. **三项准入**（满足其一）：不试出来就不会信（C/F）｜懂了但做不对（B）｜文字越解释越绕（A/B）。
4. **三项禁入**：读者本来就会信的结论；需要长链推理的推导；只为好看的动效。

**内容形态 → 组件**

| 正在写的东西 | 应该是 | 类 |
|---|---|---|
| 定义、记号、约定 | 概念卡 + 折叠（先猜后展开） | A |
| 两个容易混的东西 | 并排对照 / 双栏 | A |
| 一段能跑的代码 | 【新建/修改】标签 + 【运行】输出 + 复制 | E |
| 随参数变化的量 | 滑块一拖就重画 | C |
| 随时间演化的过程 | 播放 / 步进 / 拖时间轴 | D·F |
| 读者八成会搞错的点 | 二选一判断，点完立刻知道错 | B |
| 必须记住的结论 | 填空 / 闪回 | B |
| 要反复查的东西 | 标签页 + 章末速查 | A |
| 多分支的决策 | 分支图，选一条高亮其余 | C·E |
| 要算的数 | 页内小计算器 | E |

**不定量、不设门槛、不统计交互热度**——配额只会逼出凑数的控件。每章最多 **1–2 个 F 演示**（F1/F2 主力，F3 兜底，F4 点缀）。

### 5.1 组件与外壳约定（v3.1 起全部有默认实现）

| 组件 | 标记 | 外壳做的事 |
|---|---|---|
| 标签页 | `.tabs[data-tabs]` + `.tbar [role=tab][data-tab=ID]` + `.tpanel#ID` | `initTabs`：点击/←→ 切换，管 `aria-selected` 与 `hidden` |
| 分层提示 | `.hints` 里若干 `<details><summary>提示 N …</summary>` | 纯原生折叠，无脚本 |
| 页内计算器 | `.calc[data-calc][data-expr="2 / k - eta"]` + `input[data-var=名字]` + `[data-role=calc-out]` | `initCalc`：自写表达式求值（数字、变量、`+ - * / ( )` 与 `ceil/floor/round/abs/sqrt/min/max`，不用 `eval`）；空值/未声明变量报错到 `[data-role=calc-err]` |
| F3 帧序列 | `.demo.frames[data-frames=名][data-count=N][data-dir=../src/media/frames/][data-ext=svg]` 内含 `img[data-frame]`、`input[data-role=frame-range]`、`[data-role=frame-out]` | `initFrames`：逐帧切换、拖动条、←→；帧文件按 `名-1.svg … 名-N.svg` |
| F4 视频 | `.demo` 里 `.dstage` 包 `video[controls][preload=metadata]` + `.dcap` 一句说明 | 原生控件；必须配"你应该看到" |
| 继续上次 | `[data-role=continue]`（首页全库、章首页加 `data-scope="chapter"`） | `initContinue`：读 `study:last`，显示"继续上次 + 节标题 + 进度" |
| 章节卡进度 | 由 shell.js 按 nav-data 生成 | 每章 `done/total` 与均分（**章首页的进度只统计本章**，库首页才统计全库）；节卡显示 `minutes`/`product`（manifest 可选字段） |

## 6. F 演示契约（可定位、可降级、可测）

**四档**：F1 参数重画（只有滑块，`steps: 0`，不要播放键）｜F2 canvas/SVG 播放-步进-拖时间轴（主力）｜F3 预渲染帧序列 + 拖动条（兜底）｜F4 真视频（只点缀，不能真拖）。

```html
<div class="demo" data-demo="grad-lr" data-tier="F2">
  <canvas id="grad-lr-c" aria-label="学习率过大时的震荡轨迹"></canvas>
  <noscript><img src="../src/image/grad-lr-first-frame.svg" alt="第 0 帧静帧"></noscript>
</div>
```

```js
StudyDemo.register("grad-lr", {
  tier: "F2",
  state: { t: 0, lr: 0.35, speed: 1 },        // 全部可寻址，t 可写进 hash
  frame: function (state) { /* 纯绘制：只读 state，不累积 DOM */ }
});
```

- `state` 全量可寻址；`frame(state)` 是纯函数；`input → state → rAF 一帧 → frame(state)`
- hash 同步 `#t=0.42&lr=0.05`；空格播放/暂停、←→ 单步；`<noscript>` 给首帧静帧
- 禁止：每帧 `appendChild`、播放与绘制混写、依赖"上一次画了什么"
- **三项教学要求**：① 一句话说明演示什么（不是"动画演示"）② `<b>你应该看到</b>` 与动手步骤成对 ③ 至少三个"值得停下的点"（起点/转折/终点）

## 7. 校验（`check-library.mjs` 的 HTML 模式）

**L0 库形状（error）**
- `HTML01` manifest 存在且合法，`schema` = `study-notes-html/1`
- `HTML02` manifest 每个 `file` 都存在；磁盘 `.html` 都在 manifest 里（首页/章首页除外）
- `HTML03` 页面相对链接、`src`、`href`、`<img>`、`<video>` 目标存在
- `HTML04` 无 CDN / 外部字体 / 远程脚本（资源属性里出现 `http(s)://` 即报）
- `HTML05` 无本机绝对路径（`[A-Za-z]:\\`、`/Users/`、`file:///`）
- `HTML06` 无 `type="module"`、ES `import … from`、`fetch(`/`XMLHttpRequest` 读本地文件、`new Worker`。**只扫可执行部分**：`<pre>` 里的代码样例不算（Python 的 `import json` 不会误报），普通 `import 模块名`（没有 `from`）也不报
- `HTML07` 有 `data-lesson`/`data-track`/`data-title`，且 `data-lesson` 与 manifest 对得上

**L0 结构（v3.1 新增，error）**
- `HTML15` 标签页：每个 `data-tab` 都有同名 `.tpanel#id`；同时只有一个面板不带 `hidden`
- `HTML16` 计算器：`data-expr` 只用白名单字符（函数限 `ceil/floor/round/abs/sqrt/min/max`，其它函数名报错）；每个变量都有 `data-var` 输入框；有 `[data-role=calc-out]`
- `HTML17` 帧序列：`data-count` 与真实帧文件一一对应；有 `[data-role=frame-range]`
- `HTML18` 视频：`<video>` 带 `controls`；有 `.dcap` 与"你应该看到"

**L1 节内弱检（warning）**
- `HTML11` 有 `<h1>`、`id="pager"`、`id="track"`
- `HTML12` 概念编号节内唯一；有练习区（`.quiz`/`.practice`）；理论线有来源区（`.sources`）
- `HTML13` 正文过短报警（去标签 < 400 字 = 多半没写）
- `HTML14` 除段落/代码块外没有任何组件 → 提示"本节接近纯文字"（**不阻断、不升 error**）
- `HTML19` 体积软线：单页 > 800 KB、帧序列总量 > 5 MB、单页内联 SVG > 6 张
- `HTML20` 主题快照：库里的 `src/css/theme.css` 缺 `--demo-w`（v3.2 之前的拷贝）→ 宽屏上演示画布只有约 620px；跑 `scripts/migrate-theme.mjs --lib "<库>"` 换新（自动备份）

`--strict` 把 warning 当 error（`HTML14` 除外），用于交付前自检。

**L2 人工/自检**：`quality-gates.md` + 理论课两关（`theory-line.md`）+ F 演示"值得停下的点"

**体积阈值（软线）**：单页 > 800 KB → 拆数据或起本地服务器；F3 内联帧 > 5 MB → 帧放 `src/media/`；单页内联 SVG > 6 张 → 移 `src/image/*.svg`（外链，`file://` 可用）。

## 8. 建库四问 + 生成顺序

**必须问**：① 载体 MD / HTML？② 课程类型我猜的 ___（代码/理论/混合）对吗？③ 逐章停下来反馈，还是连续推进？④ 有自己的设计需求吗（①用默认 ②描述风格，我生成 `theme-course.css` ③你给参考图）。**建完随时能换**。

**顺序**：`00 大纲.md` + `checklist.md` → `manifest.json`（先骨架）→ 一个**样例节**（1 演示 + 1 练习）给用户确认手感 → 按章生成节页 + 章首页 + 首页 → `check-library.mjs` 跑 HTML 模式到 0 error 再交付。

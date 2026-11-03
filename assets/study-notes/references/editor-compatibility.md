# Typora 兼容性：标注块格式与踩坑记录

用户主要用 **Typora**。这份文档记录标注块为什么这样写，以及"公式不显示"一类问题怎么排查。写法本身以 `notes-standard.md` 第四节为准。

---

## 一、规则

分块标注统一写成**普通引用块 + HTML 加粗斜体标签**。
标签**独占一行**、**不带冒号**；标题/正文从**下一行**开始：

```markdown
> <b>*Note*</b>
> 本节导读
>
> 正文内容……
```

| 标签 | 用途 |
|---|---|
| `> <b>*Note*</b>` | 正式定义、核心结论、说明 |
| `> <b>*Tip*</b>` | 技巧、记忆口诀、经验之谈、要点小结 |
| `> <b>*Important*</b>` | 重点、必须记住的约束 |
| `> <b>*Warning*</b>` | 易错点、常见误区、前置依赖提醒 |
| `> <b>*Caution*</b>` | 危险、反例、会造成错误结果的做法 |

语义差别写在**下一行的中文标题**里（「本节导读」「案例：xxx」「想一想」「记住这些」）。

答案与解析：

```markdown
> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：B
>
> <b>解析</b>：……
```

### 为什么用 `<b>` 而不是 Markdown 的 `**粗体**`

**用户的 claudette 主题不显示 `**粗体**`**（实测）。`<b>` 是 HTML 行内标签，任何渲染器都认，
且能与 `*斜体*` 叠成"加粗 + 斜体"：`<b>*Note*</b>`。**不要擅自改回 `**Note**`。**

**禁止** `> [!note] 标题` 这种 callout 语法；也**禁止** `> **Note**:` 这种粗体标签写法。

---

## 二、为什么禁止 callout（两个死结）

### 死结 1：标记文字去不掉

Typora 把 `> [!note]` 渲染成彩色框，但**保留 `[!note]` 这串字**（GitHub 会换成图标、Obsidian 换成 emoji、Typora 保留文字）。
CSS 没有"只隐藏同一段落里前 N 个字符"的能力——**唯一**能去掉它的手法是：

```css
#write .md-alert > p:first-child { text-indent: -9999px; }   /* 把首行推出视野 */
```

### 死结 2：`text-indent` 会毁掉引用块里的行内公式

实测（隔离对照实验）：

| 写法 | 该引用块里的 `$h \approx 10^{-6}$` |
|---|---|
| 加 `text-indent: -9999px` | ❌ **整段变空白** |
| 不加 | ✅ 正常显示 |

原因：**MathJax 排版完成之前，公式还是段落里的普通文本**，会被 `text-indent` 一起推出可视区；
如果再加 `overflow: hidden` 就彻底裁掉。表格单元格里的公式不受影响，因为它不是 `p:first-child`
——**这个差异正是定位线索**。

**结论：两个死结无法同时解开。放弃 callout。**

---

## 三、排查"公式不显示"的正确顺序

这是本项目耗掉最多时间的一个问题，留下三条经验：

### 3.1 先让用户确认编辑器设置，别一上来读文件

| # | 让用户确认 | 位置 | 症状 |
|---|---|---|---|
| 1 | **内联公式开关是开着的** | `文件 → 偏好设置 → Markdown → 内联公式` | 关掉后 `$h$` 原样显示成文字 |

> ⚠️ 第 1 条尤其坑：**它的键名不是 `inlineMath`**（那是 MathJax 的内部配置项，恒为启用），
> 所以搜配置文件搜不到，容易误判成"Typora 取消了行内公式"。
> 内置配置（`resources/html/content.html`）始终是 `inlineMath: [['$','$'], ['$$','$$']]`，
> **不代表用户开了这个开关**。

### 3.2 改过主题/CSS 之后，先怀疑自己的改动

本项目的真实经历：文件语法逐字节正常、Typora 的行内公式正则全部匹配、MathJax 资源完好、
主题 CSS 没碰公式选择器 —— **一路排查全部通过**，而真凶是**自己装的一段 CSS**。

最有价值的线索其实用户早就给了：**表格里的公式一直正常**。
表格单元格不是 `p:first-child`，规则碰不到它——这条线索直接指向自己的补丁。

### 3.3 先看到真实 DOM，再改选择器

调试 CSS 的铁律。本项目为此连续猜错三次选择器（`::after` → `.md-alert-text-container` → `.md-alert-text`），
而实际 DOM 里那些元素根本不存在。

- `Ctrl+Shift+I` 在 Typora 里是**插入图片**，不是开发者工具；开发者工具在 `视图 → 开发者工具`。
- 便宜有效的办法：给每个**候选元素**上不同颜色/描边，看哪个变色——变色即命中。

---

## 四、老库迁移

```bash
node callout-to-blockquote.mjs "<笔记根目录>" --dry-run   # 只看统计
node callout-to-blockquote.mjs "<笔记根目录>"             # 实际改写
```

- 同时处理 `> [!note] 标题` 和上一版迁移留下的 `> **Note**: 标题`，都改成 `> <b>*Note*</b>` + 下一行标题。
- **幂等**：已经是新写法的行不会被再动；围栏代码块里的内容不动；以 `_`、`.` 开头的目录和 `code/`、`web/` 跳过。
- **注意行尾**：CRLF 文件里若用 `[ \t]*` 接标题，`\r` 会让整行匹配失败、**静默漏转**。脚本内部已先统一行尾。
- 折叠 blockquote（`> [!note]- ...`）会退化成普通标注行——**内容保留**，不再可折叠。

---

## 五、顺带：块级公式定界符

与本文档同批修掉的另一个坑：块级公式的定界符必须是 **`$$`**（两个美元）且独占一行。
曾因规范文档自身写错（写成单个 `$`），导致全库 390 处公式在 Typora 里不渲染。

```bash
node fix-math-delims.mjs "<笔记根目录>"          # 只报告
node fix-math-delims.mjs "<笔记根目录>" --fix    # 实际改写
```

---

## 六、Typora 1.14 渲染不了 `\mathbb`（2026-11 实测）

**症状**：只有含 `\mathbb` 的公式整条退回源码（块级显示成 `$$\mathbb{R}^{N\times H}$$`，行内显示成 `$\mathbb{R}^{3}$`）；同一篇里含 `\qquad`、`\mathcal`、`\ell`、`\mathbf` 的公式都正常。

**根因**（用 Typora 自带的 MathJax 4.1.0 做的隔离实验）：

- Typora 1.14 升级到 **MathJax 4**（`Change Log` 里写着 "Upgrade to MathJax v4"）。
- MathJax 4 对**首次使用的字形族**做惰性字体初始化；初始化需要异步，而 Typora 走的是**同步**渲染路径。
- 同步调用遇到它就抛 `MathJax retry -- an asynchronous action is required; try using one of the promise-based functions and await its resolution.`，Typora 捕获后把整条公式退回源码。
- 用同一个 bundle 改成 `await tex2svgPromise(...)` 后，同一批公式全部正常 → 问题在"同步渲染"，不在公式本身。
- 全库审计：1209 条公式里 88 条同步失败，失败清单与"含 `\mathbb`"几乎一一对应。`\mathbb` 是唯一稳定触发的宏。

**规则：正文公式里禁止 `\mathbb`。** 替代写法（Typora 1.14 与门户 KaTeX 0.16 都验证过）：

| 原来的写法 | 改成 | 说明 |
|---|---|---|
| `\mathbb{R}` `\mathbb{N}` `\mathbb{Z}` `\mathbb{Q}` `\mathbb{C}` `\mathbb{P}` `\mathbb{H}` | `ℝ` `ℕ` `ℤ` `ℚ` `ℂ` `ℙ` `ℍ` | unicode 双线体，外观与 `\mathbb` 完全一致 |
| `\mathbb{E}` | `𝔼` | 期望符号 |
| `\mathbb{1}[x>0]` | `\mathbf{1}[x>0]` | 指示函数；`𝟙` 也能渲染，但 KaTeX 缺字宽数据，排版略歪 |
| `\mathbb{A}` 等其余字母 | 对应 unicode 双线体 | `node templates/fix-mathbb.mjs "<根>"` 可批量换 |

**批量修复**：

```bash
node templates/fix-mathbb.mjs "<笔记根目录>" --dry   # 先看会改哪些文件
node templates/fix-mathbb.mjs "<笔记根目录>"         # 实际改写（md/js/json，跳过历史目录）
node _维护/build.mjs                                 # 题库改过就重生成 notes_data.js 与大纲
node .../scripts/check-library.mjs "<笔记根目录>" --strict   # [R12] 应为 0
```

**为什么不用"升级 Typora / 装宏包"来绕过**：读者的机器是既定的，教程必须开箱能读；而且这是编辑器内部竞态，表现为"有时能显示、有时不能"，不可依赖。改内容最稳，代价只是一次批量替换。


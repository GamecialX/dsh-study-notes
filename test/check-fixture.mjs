/**
 * 端到端验证 check-library.mjs：先造一份合规的示例学习库（应 0 error），
 * 再造一份注入了已知缺陷的库（应报出一批 error）。
 *
 *   node test/check-fixture.mjs
 *
 * 退出码 0 = 校验器的通过/报错行为都符合预期。
 */

import { mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SKILL = join(PKG, 'assets', 'study-notes');
const CHECKER = join(SKILL, 'scripts', 'check-library.mjs');

const SUBJECT = '示例科目';
const TEMP_ROOT = join(tmpdir(), `study-notes-fixture-${process.pid}`);

let failures = 0;
function report(name, cond, detail) {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

/* ------------------------------------------------------------ 生成器 */

function build(target, broken) {
  rmSync(target, { recursive: true, force: true });

  const put = (rel, content) => {
    const full = join(target, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  };
  const fm = (chapter, extra = '') =>
    `---\nsubject: ${SUBJECT}\nchapter: ${chapter}\n${extra}status: 未开始\ntags: [${SUBJECT}, 节笔记]\n---\n\n`;

  mkdirSync(join(target, 'web'), { recursive: true });
  /* 门户骨架（index.html / serve.mjs / 两个启动脚本）稍后复制——
     必须放在本文件写完 `web/notes_data.js` **之后**，否则自定义数据会被模板盖掉。 */

  put('Cha_1 基础概念/src/diagram.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>\n');

  /* checklist.md 是工作记录，故意没有 frontmatter —— 校验器应当豁免。 */
  put('checklist.md', `# ${SUBJECT} 学习笔记 · 工作记录\n\n## ① 总体规划\n\n| 章 | 节 | 状态 |\n|---|---|---|\n| 1 基础概念 | Sec_1 基本对象 | ✅ |\n`);

  put('00 大纲.md', `---
subject: ${SUBJECT}
chapter: 0
status: 未开始
tags: [${SUBJECT}, 大纲]
---

# ${SUBJECT} 学习笔记 · 总大纲

## 三、章节目录

### ▸ 第 1 章 · 基础概念

| 节 | 标题 |
|---|---|
| 1.1 | [C1 Sec_1 基本对象](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_1%20%E5%9F%BA%E6%9C%AC%E5%AF%B9%E8%B1%A1.md) |
| 1.2 | [C1 Sec_2 基本关系](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md) |

**本章测试**：[C1 测试](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20%E6%B5%8B%E8%AF%95.md) · **本章速查**：[C1 速查](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20%E9%80%9F%E6%9F%A5.md)

**本节包含的概念**：[基本对象](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_1%20%E5%9F%BA%E6%9C%AC%E5%AF%B9%E8%B1%A1.md#概念-1-基本对象) · [对象的相等](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_1%20%E5%9F%BA%E6%9C%AC%E5%AF%B9%E8%B1%A1.md#概念-2-对象的相等) · [基本关系](Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md#概念-1-基本关系)

### ▸ 第 2 章 · 进阶应用

| 节 | 标题 |
|---|---|
| 2.1 | [C2 Sec_1 第一个工具](Cha_2%20%E8%BF%9B%E9%98%B6%E5%BA%94%E7%94%A8/C2%20Sec_1%20%E7%AC%AC%E4%B8%80%E4%B8%AA%E5%B7%A5%E5%85%B7.md) |

**本节包含的概念**：[第一个工具](Cha_2%20%E8%BF%9B%E9%98%B6%E5%BA%94%E7%94%A8/C2%20Sec_1%20%E7%AC%AC%E4%B8%80%E4%B8%AA%E5%B7%A5%E5%85%B7.md#概念-1-第一个工具)
`);

  put('Cha_1 基础概念/C1 Sec_1 基本对象.md', `${fm(1, 'section: 1\n')}# C1 Sec_1 基本对象

> <b>*Note*</b>
> 本节导读
> 讲基本对象。行内公式 $x^2$ 与图片：

![示意图](src/diagram.svg)

## 一、定义

> <b>*Note*</b>
> 基本对象
> 对象 $x$ 满足三条要求。

## 概念 1：基本对象

> <b>*Note*</b>
> 一句话
> 基本对象是这门课里最小的讨论单位。

### 定义

> <b>*Note*</b>
> 基本对象的定义
> 对象 $x$ 满足存在性、唯一性、可判定性。

### 为什么需要它

没有统一的最小单位，后面的推理就没有共同起点。

### 形式化 / 示例

$$
x \\in U
$$

### 易错点与辨析

| 容易混淆 | 区别 |
|---|---|
| 集合 | 集合是对象的容器，不是对象本身 |

> <b>*Tip*</b>
> 记住这些
> 1. 三条要求缺一不可。

---

## 概念 2：对象的相等

> <b>*Note*</b>
> 一句话
> "相等"必须是可判定的。

### 定义

> <b>*Note*</b>
> 相等
> 两个对象相等，当且仅当它们的所有可观测属性一致。

### 为什么需要它

否则「同一个对象」无法在推理中被引用。

### 形式化 / 示例

$$
a = b \\iff \\forall p\\,(p(a) \\leftrightarrow p(b))
$$

### 易错点与辨析

| 容易混淆 | 区别 |
|---|---|
| 看起来相同 | 外观相同不等于可观测属性一致 |

> <b>*Tip*</b>
> 记住这些
> 1. 相等 ≠ 看起来相同。

---

## 本节小结

> <b>*Tip*</b>
> 要点清单
> 1. 基本对象有两条性质。

---

## 本节练习

**1.** 下列哪一项是本节定义的「基本对象」？

A. 甲　B. 乙　C. 丙　D. 丁

> <b>*Note*</b>
> 例：答案与解析
> **答案**：B

**2.** 两个基本对象只要看起来相同，就一定是相等的。

> <b>*Note*</b>
> 例：答案与解析
> **答案**：错误

**3.** 基本对象的三条要求分别是存在性、唯一性和 ______。

> <b>*Note*</b>
> 例：答案与解析
> **答案**：可判定性

---

## 概念索引

1. [基本对象](#概念-1-基本对象)
2. [对象的相等](#概念-2-对象的相等)

---

下一节：[C1 Sec_2 基本关系](C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md) · 本章测试：[C1 测试](C1%20%E6%B5%8B%E8%AF%95.md)
`);

  put('Cha_1 基础概念/C1 Sec_2 基本关系.md', `${fm(1, 'section: 2\n')}# C1 Sec_2 基本关系

> <b>*Note*</b>
> 本节导读
> 讲基本关系。

\`\`\`mermaid
flowchart LR
  A[对象] --> B[关系]
\`\`\`

## 概念 1：基本关系

> <b>*Note*</b>
> 一句话
> 关系把两个对象连起来。

### 定义

> <b>*Note*</b>
> 基本关系
> 记作 $a \\sim b$。

### 为什么需要它

对象之间没有关系就推不出任何结论。

### 形式化 / 示例

$$
a \\sim b \\iff (a, b) \\in R
$$

### 易错点与辨析

| 容易混淆 | 区别 |
|---|---|
| 空关系 | 空关系也是合法关系，只是不含任何有序对 |

> <b>*Tip*</b>
> 记住这些
> 1. 空关系是关系。

---

## 本节小结

> <b>*Tip*</b>
> 要点清单
> 1. 关系是有序对的集合。

---

## 本节练习

**1.** 关于基本关系，下列说法正确的是？

A. 甲　B. 乙　C. 丙　D. 丁

> <b>*Note*</b>
> 例：答案与解析
> **答案**：C

**2.** 空关系也是一种基本关系。

> <b>*Note*</b>
> 例：答案与解析
> **答案**：正确

**3.** 若 a 与 b 有基本关系，记作 a ______ b。

> <b>*Note*</b>
> 例：答案与解析
> **答案**：~

---

## 概念索引

1. [基本关系](#概念-1-基本关系)

---

上一节：[C1 Sec_1 基本对象](C1%20Sec_1%20%E5%9F%BA%E6%9C%AC%E5%AF%B9%E8%B1%A1.md) · 本章测试：[C1 测试](C1%20%E6%B5%8B%E8%AF%95.md)
`);

  /* 概念小节已内联在各节笔记里，因此不再生成独立的概念文件。 */

  const scores = [6, 6, 6, 6, 6, 6, 6, 9, 9, 20, 20];
  put('Cha_1 基础概念/C1 测试.md', `---
subject: ${SUBJECT}
chapter: 1
status: 未开始
tags: [${SUBJECT}, 章末测试]
---

# C1 基础概念 测试

> <b>*Note*</b>
> 测试说明
> 满分 100 分。

${scores.map((s, i) => `**${i + 1}.（${s} 分）** 第 ${i + 1} 题题干。\n`).join('\n')}
---

> <b>*Note*</b>
> 标准答案与解析
> 逐题解析。

---

返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md)
`);

  put('Cha_1 基础概念/C1 速查.md', `---
subject: ${SUBJECT}
chapter: 1
status: 未开始
tags: [${SUBJECT}, 速查]
---

# C1 速查

| 概念 | 一句话 | 正文 |
|---|---|---|
| 基本对象 | 最小的讨论单位 | [C1 Sec_1](C1%20Sec_1%20%E5%9F%BA%E6%9C%AC%E5%AF%B9%E8%B1%A1.md#概念-1-基本对象) |
| 基本关系 | 把两个对象连起来 | [C1 Sec_2](C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md#概念-1-基本关系) |

返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md)
`);

  put('code/tool.py', 'def tool(x):\n    return x * 2\n\nprint(tool(21))\n');
  put('code/out/tool.txt', '42\n');

  put('Cha_2 进阶应用/C2 Sec_1 第一个工具.md', `${fm(2, 'section: 1\n')}# C2 Sec_1 第一个工具

> <b>*Note*</b>
> 本节导读
> 引入第一个真正有用的工具。

## 概念 1：第一个工具

> <b>*Note*</b>
> 一句话
> 第一个把理论变成结果的工具。

### 定义

> <b>*Note*</b>
> 工具
> 一个输入到输出的映射。

### 为什么需要它

把理论变成可复用的操作。

### 形式化 / 示例

<!-- source: code/tool.py -->
\`\`\`python
def tool(x):
    # ...
    return x * 2
\`\`\`

<!-- output: code/out/tool.txt -->
\`\`\`text
42
\`\`\`

### 易错点与辨析

| 容易混淆 | 区别 |
|---|---|
| 定义 | 定义是约定，工具是它的实现 |

> <b>*Tip*</b>
> 记住这些
> 1. 工具必须可复用。

---

## 本节小结

> <b>*Tip*</b>
> 要点清单
> 1. 工具是理论的可执行形式。

---

## 本节练习

**1.** 使用第一个工具时，必须先满足的条件是？

A. 甲　B. 乙　C. 丙　D. 丁

> <b>*Note*</b>
> 例：答案与解析
> **答案**：A

**2.** 该工具对所有输入都成立。

> <b>*Note*</b>
> 例：答案与解析
> **答案**：错误

**3.** 用该工具计算一个具体例子，写出完整过程。

> <b>*Note*</b>
> 例：答案与解析
> **参考答案**：代入 → 化简 → 结果。

---

## 概念索引

1. [第一个工具](#概念-1-第一个工具)

---

上一节：[C1 Sec_2 基本关系](../Cha_1%20%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5/C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md) · 返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md)
`);

  const copyPortal = () => {
    for (const [from, to] of [
      [join(SKILL, 'templates', 'web', 'index.html'), 'web/index.html'],
      [join(SKILL, 'templates', 'web', 'serve.mjs'), 'web/serve.mjs'],
      [join(SKILL, 'templates', '启动学习服务器.bat'), '启动学习服务器.bat'],
      [join(SKILL, 'templates', 'start_server.sh'), 'start_server.sh']
    ]) copyFileSync(from, join(target, to));
  };

  /* C2-01 的概念已内联进 C2 Sec_1，不再生成独立文件。 */

  /* ---------------- 门户数据：合规库的版本 ---------------- */
  put('web/notes_data.js', `window.NOTES_DATA = {
  meta: { subject: "${SUBJECT}", generatedAt: "2026-01-01 09:00", chapters: 2 },
  chapters: [
    { id: "c1", no: 1, title: "第 1 章 基础概念", brief: "导读一",
      sections: [
        { id: "c1s1", no: 1, title: "C1 Sec_1 基本对象", file: "/Cha_1 基础概念/C1 Sec_1 基本对象.md",
          concepts: [{ n: 1, name: "基本对象" }, { n: 2, name: "对象的相等" }],
          quiz: [
            { type: "choice", question: "下列哪一项是本节定义的「基本对象」？", options: ["甲","乙","丙","丁"], answer: 1, analysis: "解析" },
            { type: "judge", question: "两个基本对象只要看起来相同，就一定是相等的。", answer: false, analysis: "解析" },
            { type: "fill", question: "基本对象的三条要求分别是存在性、唯一性和 ______。", answer: "可判定性", analysis: "解析" }
          ] },
        { id: "c1s2", no: 2, title: "C1 Sec_2 基本关系", file: "/Cha_1 基础概念/C1 Sec_2 基本关系.md",
          concepts: [{ n: 1, name: "基本关系" }],
          quiz: [
            { type: "choice", question: "关于基本关系，下列说法正确的是？", options: ["甲","乙","丙","丁"], answer: 2, analysis: "解析" },
            { type: "judge", question: "空关系也是一种基本关系。", answer: true, analysis: "解析" },
            { type: "fill", question: "若 a 与 b 有基本关系，记作 a ______ b。", answer: "~", analysis: "解析" }
          ] }
      ],
      sheet: { file: "/Cha_1 基础概念/C1 速查.md" },
      test: { title: "第 1 章 测试", file: "/Cha_1 基础概念/C1 测试.md", total: 100,
        questions: [6, 6, 6, 6, 6, 6, 6, 9, 9, 20, 20].map((score, i) => ({
          id: "q" + (i + 1),
          type: i < 6 ? "choice" : (i < 11 ? "judge" : "fill"),
          score,
          question: "第 " + (i + 1) + " 题题干。",
          ...(i < 6 ? { options: ["甲", "乙", "丙", "丁"], answer: 0 } : { answer: i < 11 ? true : "参考" }),
          analysis: "解析"
        })) } },
    { id: "c2", no: 2, title: "第 2 章 进阶应用", brief: "导读二",
      sections: [
        { id: "c2s1", no: 1, title: "C2 Sec_1 第一个工具", file: "/Cha_2 进阶应用/C2 Sec_1 第一个工具.md",
          concepts: [{ n: 1, name: "第一个工具" }],
          quiz: [
            { type: "choice", question: "使用第一个工具时，必须先满足的条件是？", options: ["甲","乙","丙","丁"], answer: 0, analysis: "解析" },
            { type: "judge", question: "该工具对所有输入都成立。", answer: false, analysis: "解析" },
            { type: "calc", question: "用该工具计算一个具体例子，写出完整过程。", answer: "参考", analysis: "解析" }
          ] }
      ],
      test: null }
  ],
  /* links 是门户的知识图谱关系对（可选）。合规库留空即可；
     它有内容时校验器会核对两端是否都是库中真实存在的标题。 */
  links: []
};`);


  /* 最后一章允许没有章末测试（毕业设计/总结章）。 */
  if (!broken) {
    /* 合规库到此为止：复制门户骨架后即可交付校验。 */
    copyPortal();
    return;
  }

  /* ---------------- 注入缺陷 ---------------- */

  /* 缺陷 1：图片指向不存在的文件（标准图片语法） */
  put('Cha_1 基础概念/C1 Sec_3 缺图的一节.md', `${fm(1, 'section: 3\n')}# C1 Sec_3 缺图的一节

![缺失的图](src/does-not-exist.png)

## 本节练习

> <b>*Note*</b>
> 例：答案与解析
> 答案

---

上一节：[C1 Sec_2 基本关系](C1%20Sec_2%20%E5%9F%BA%E6%9C%AC%E5%85%B3%E7%B3%BB.md)
`);

  /* 缺陷 2：标准链接指向不存在的文件（悬空链接） */
  put('Cha_2 进阶应用/C2 Sec_2 坏的一节.md', `${fm(2, 'section: 2\n')}# C2 Sec_2 坏的一节

指向一个不存在的文件：[不存在的笔记](C9-99%20%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E7%AC%94%E8%AE%B0.md)。

## 本节练习

> <b>*Note*</b>
> 例：答案与解析
> 答案

---

上一节：[C2 Sec_1 第一个工具](C2%20Sec_1%20%E7%AC%AC%E4%B8%80%E4%B8%AA%E5%B7%A5%E5%85%B7.md)
`);

  /* 缺陷 3：用了 Obsidian 专有的 wikilink（可移植性规范不允许） */
  put('Cha_2 进阶应用/C2 Sec_3 用了 wikilink 的一节.md', `${fm(2, 'section: 3\n')}# C2 Sec_3 用了 wikilink 的一节

这里用了 [[C2 Sec_1 第一个工具]] 这种专有写法。

## 本节练习

> <b>*Note*</b>
> 例：答案与解析
> 答案

---

上一节：[C2 Sec_2 坏的一节](C2%20Sec_2%20%E5%9D%8F%E7%9A%84%E4%B8%80%E8%8A%82.md)
`);

  /* 缺陷 4：残留占位符 */
  put('Cha_2 进阶应用/C2-02 占位符.md', `---
subject: ${SUBJECT}
chapter: 2
section: 2
status: 未开始
tags: [${SUBJECT}, 节笔记]
---

# C2-02 {{CONCEPT_NAME}}

{{BODY}}
`);

  /* 缺陷库也要有完整的门户骨架（否则会先因缺文件而挂，掩盖真正的缺陷）。 */
  copyPortal();

  /* 缺陷 5：门户数据与真实文件不一致（路径错、题数不对、分值不过 100、选项下标越界） */
  put('web/notes_data.js', `window.NOTES_DATA = {
  meta: { subject: "${SUBJECT}", generatedAt: "2026-01-01 09:00", chapters: 2 },
  chapters: [
    { id: "c1", no: 1, title: "第 1 章 基础概念", brief: "导读一",
      sections: [
        { id: "c1s1", no: 1, title: "C1 Sec_1 基本对象", file: "/Cha_1 基础概念/C1 Sec_1 基本对象.md",
          concepts: [{ n: 1, name: "基本对象" }],
          quiz: [
            { type: "choice", question: "下列哪一项是本节定义的「基本对象」？", options: ["甲","乙","丙","丁"], answer: 1, analysis: "解析" },
            { type: "judge", question: "两个基本对象只要看起来相同，就一定是相等的。", answer: false, analysis: "解析" },
            { type: "fill", question: "基本对象的三条要求分别是存在性、唯一性和 ______。", answer: "可判定性", analysis: "解析" }
          ] },
        { id: "c1s3", no: 3, title: "C1 Sec_3 缺图的一节", file: "/Cha_1 基础概念/不存在的文件.md",
          concepts: [{ n: 1, name: "不存在的概念" }],
          quiz: [ { type: "choice", question: "只有两题", options: ["甲","乙"], answer: 5, analysis: "解析" },
                  { type: "judge", question: "第二题。", answer: true, analysis: "解析" } ] }
      ],
      test: { title: "第 1 章 测试", file: "/Cha_1 基础概念/C1 测试.md", total: 90,
        questions: [
          { type: "choice", score: 10, question: "题", options: ["甲","乙"], answer: 0, analysis: "解析" },
          { type: "judge", score: 20, question: "题", answer: true, analysis: "解析" }
        ] } },
    { id: "c2", no: 2, title: "第 2 章 进阶应用", brief: "导读二",
      sections: [
        { id: "c2s1", no: 1, title: "C2 Sec_1 第一个工具", file: "/Cha_2 进阶应用/C2 Sec_1 第一个工具.md",
          concepts: [{ n: 1, name: "第一个工具" }],
          quiz: [
            { type: "choice", question: "使用第一个工具时，必须先满足的条件是？", options: ["甲","乙","丙","丁"], answer: 0, analysis: "解析" },
            { type: "judge", question: "该工具对所有输入都成立。", answer: false, analysis: "解析" },
            { type: "calc", question: "用该工具计算一个具体例子，写出完整过程。", answer: "参考", analysis: "解析" }
          ] }
      ],
      test: null }
  ],
  links: [["不存在的节点 A", "不存在的节点 B"]]
};`);
}

/* ---------------------------------------------------------------- 主流程 */

function runChecker(root) {
  /* stdio: 'inherit'：沙箱下无法用管道捕获子进程输出，只看退出码。 */
  return spawnSync(process.execPath, [CHECKER, root], { stdio: 'inherit' });
}

console.log('=== 合规示例库：应当 0 error ===');
const good = join(TEMP_ROOT, 'good');
build(good, false);
const goodRun = runChecker(good);
report('合规库 → 退出码 0', goodRun.status === 0, `exit ${goodRun.status}`);

console.log('\n=== 注入缺陷的库：应当报出 error ===');
const bad = join(TEMP_ROOT, 'bad');
build(bad, true);
const badRun = runChecker(bad);
report('缺陷库 → 退出码 1', badRun.status === 1, `exit ${badRun.status}`);

console.log('\n=== 单项缺陷：在合规库上各注入一个新规则缺陷，每个都应报 error ===');
const SEC1 = 'Cha_1 基础概念/C1 Sec_1 基本对象.md';
const TOOL = 'Cha_2 进阶应用/C2 Sec_1 第一个工具.md';
const single = [
  ['空链接', SEC1, (s) => s.replace('## 本节小结', '这是 [一个空链接]()。\n\n## 本节小结')],
  ['链接越出笔记根目录', SEC1, (s) => s.replace('## 本节小结', '见 [外部](../../outside.md)。\n\n## 本节小结')],
  ['锚点对不上标题', SEC1, (s) => s.replace('## 本节小结', '见 [不存在](#概念-9-不存在)。\n\n## 本节小结')],
  ['跨章链接漏了章目录', SEC1, (s) => s.replace('## 本节小结', '见 [工具](C2%20Sec_1%20%E7%AC%AC%E4%B8%80%E4%B8%AA%E5%B7%A5%E5%85%B7.md)。\n\n## 本节小结')],
  ['代码片段不在来源文件里', TOOL, (s) => s.replace('    return x * 2\n```', '    return x * 3\n```')],
  ['输出与输出文件不一致', TOOL, (s) => s.replace('```text\n42\n```', '```text\n43\n```')]
];
for (const [name, rel, mutate] of single) {
  const dir = join(TEMP_ROOT, 'single');
  build(dir, false);
  const file = join(dir, rel);
  const before = readFileSync(file, 'utf8');
  const after = mutate(before);
  if (after === before) { report(`${name} → 缺陷已注入`, false, '替换没有生效，检查注入代码'); continue; }
  writeFileSync(file, after, 'utf8');
  const run = runChecker(dir);
  report(`${name} → 退出码 1`, run.status === 1, `exit ${run.status}`);
}

console.log('\n=== 样章模式：--only 只检查指定文件 ===');
{
  const dir = join(TEMP_ROOT, 'only');
  build(dir, true);
  const run = spawnSync(process.execPath, [CHECKER, dir, '--only', SEC1], { stdio: 'inherit' });
  report('缺陷库里只查合规的 C1 Sec_1 → 退出码 0', run.status === 0, `exit ${run.status}`);
}
console.log('\n=== 清理 ===');
rmSync(TEMP_ROOT, { recursive: true, force: true });
report('临时目录已清理', !existsSync(TEMP_ROOT));

console.log(`\nSUMMARY FAILURES=${failures}`);
process.exit(failures ? 1 : 0);

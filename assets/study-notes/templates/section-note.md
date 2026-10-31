---
subject: {{SUBJECT}}
chapter: {{CHAPTER_NO}}
section: {{SECTION_NO}}
status: 未开始
tags: [{{SUBJECT}}, 节笔记]
---

# C{{CHAPTER_NO}} Sec_{{SECTION_NO}} {{SECTION_NAME}}

> <b>*Note*</b>
> 本节导读
>
> 本节讲 <b>{{SECTION_TOPIC}}</b>。学完之后你能：
>
> 1. {{OBJECTIVE_1}}
> 2. {{OBJECTIVE_2}}
> 3. {{OBJECTIVE_3}}
>
> <b>前置</b>：{{PREREQUISITES_WITH_LINKS}}
> <b>预计用时</b>：{{MINUTES}} 分钟 ｜ <b>难度</b>：{{DIFFICULTY}}

<!-- 学习目标 2–4 条，用可检验的动词（能手算 / 能解释 / 能写出 / 能区分）。每条都要有练习对应。
     前置写成链接；跨章用 ../Cha_X 章名/CX Sec_X 节名.md（百分号编码）。
     本文件里的 HTML 说明注释写完后删掉（source / output 标记除外）。 -->

---

## 一、{{BLOCK1_TITLE}}

{{BLOCK1_BODY}}

<!-- 引子：本节要解决什么问题、没有它会怎样。用到前面章节的知识时，一两句话复述要点并给链接（间隔复习）。 -->

---

## 概念 1：{{CONCEPT1_NAME}}

{{CONCEPT1_ONE_LINER}}

> <b>*Note*</b>
> {{CONCEPT1_TERM}} 的定义
>
> {{CONCEPT1_RIGOROUS_DEFINITION}}

### 为什么需要它

{{CONCEPT1_MOTIVATION}}

### 手算一遍

{{CONCEPT1_WORKED_EXAMPLE}}

<!-- 完整例题：每步写出依据。 -->

> <b>*Tip*</b>
> 先猜一猜
>
> {{CONCEPT1_PREDICT_QUESTION}}

<!-- source: code/{{CODE_FILE}} -->
```python
{{CONCEPT1_CODE_EXCERPT}}
```

<!-- output: code/out/{{OUTPUT_FILE}} -->
```text
{{CONCEPT1_REAL_OUTPUT}}
```

{{CONCEPT1_REVEAL_AND_WHY_PEOPLE_GUESS_WRONG}}

<!-- 代码类科目：片段从 code/ 里的真实文件摘取，省略处写 # ...；输出是运行后保存的文件。
     非代码科目：删掉上面两个代码块，先猜一猜换成算例或判断题。 -->

> <b>*Warning*</b>
> 易错点
>
> {{CONCEPT1_COMMON_MISTAKE}}

| 容易混淆 | 区别 |
|---|---|
| {{CONCEPT1_CONFUSE_A}} | {{CONCEPT1_CONFUSE_A_DIFF}} |

<!-- 必备：一句话、定义、至少一个例子、至少一条易错点或辨析。
     可选：为什么需要它、形式化、先猜一猜、记住这些（见 references/teaching-design.md 第三节）。
     简单概念删掉可选部分即可，不要为凑骨架硬写。 -->

---

## 概念 2：{{CONCEPT2_NAME}}

{{CONCEPT2_BODY}}

**轮到你**：{{FADED_EXAMPLE_PROBLEM}}（第 {{FADED_STEP}} 步留空：______）

> <b>*Note*</b>
> 答案与解析
>
> {{FADED_EXAMPLE_ANSWER}}

<!-- 留空例题：同类题，关键一两步留给读者补。它不计入本节练习数。 -->

<!-- 图：流程/结构/关系用 Mermaid；真实图片放入本章 src/，用 ![说明](src/文件名.png) -->

```mermaid
{{MERMAID_DIAGRAM}}
```

---

## 本节小结

> <b>*Tip*</b>
> 记住这些
>
> 1. {{POINT_1}}
> 2. {{POINT_2}}
> 3. {{POINT_3}}
> 4. {{POINT_4}}
> 5. {{POINT_5}}

---

## 本节练习

<!-- 3–5 题，难度递进：基础 → 应用 → 易错/辨析 →（可选）综合 →（可选）连接前面章节。
     每条学习目标至少对应一题。题干与答案同步写进 notes_data.js 的 sections[].quiz（题干逐字一致）。 -->

**1.**（目标 1）{{QUIZ1_QUESTION}}

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：{{QUIZ1_ANSWER}}
>
> <b>解析</b>：{{QUIZ1_ANALYSIS}}

**2.**（目标 2）{{QUIZ2_QUESTION}}

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：{{QUIZ2_ANSWER}}
>
> <b>解析</b>：{{QUIZ2_ANALYSIS}}

**3.**（目标 3）{{QUIZ3_QUESTION}}

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：{{QUIZ3_ANSWER}}
>
> <b>解析</b>：{{QUIZ3_ANALYSIS}}

<!-- 需要第 4、5 题时照抄上面的格式。 -->

---

## 概念索引

1. [{{CONCEPT1_NAME}}](#{{CONCEPT1_ANCHOR}})
2. [{{CONCEPT2_NAME}}](#{{CONCEPT2_ANCHOR}})

<!-- 锚点规则：标题转小写 → 去掉 `*_~[]() → 其余连续空格与标点换成 - → 去首尾 -。
     例：「概念 1：张量 Tensor 与 ndarray」→ 概念-1-张量-tensor-与-ndarray -->

---

上一节：[C{{CHAPTER_NO}} Sec_{{PREV_NO}} {{PREV_NAME}}](C{{CHAPTER_NO}}%20Sec_{{PREV_NO}}%20{{PREV_NAME_URLENC}}.md) · 返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md) · 本章速查：[C{{CHAPTER_NO}} 速查](C{{CHAPTER_NO}}%20%E9%80%9F%E6%9F%A5.md) · 下一节：[C{{CHAPTER_NO}} Sec_{{NEXT_NO}} {{NEXT_NAME}}](C{{CHAPTER_NO}}%20Sec_{{NEXT_NO}}%20{{NEXT_NAME_URLENC}}.md)

<!-- 首节省略「上一节」；末节把「下一节」换成「本章测试：[C… 测试](C…%20%E6%B5%8B%E8%AF%95.md)」。 -->

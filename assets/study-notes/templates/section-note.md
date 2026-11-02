---
subject: {{SUBJECT}}
chapter: {{CHAPTER_NO}}
section: {{SECTION_NO}}
status: 未开始
tags: [{{SUBJECT}}, 节笔记]
---

# C{{CHAPTER_NO}} Sec_{{SECTION_NO}} {{SECTION_NAME}}

<!-- 这张模板是代码科目的版本。非代码科目（数学、语言、人文……）保留同样的环节与顺序，
     只把「动手」换成 <b>动手</b>：在推导本 / 句子本 / 年表上写……，把「可见结果」换成 <b>你应该看到</b>：……。
     讲解的比重不变：每个步骤仍然是「先想 → 讲 → 做 → 看」四拍。 -->

> <b>*Note*</b>
> **本节导读**
>
> <b>你现在手上</b>：{{CURRENT_STATE}}
> <b>本节结束时</b>：{{END_STATE}}
>
> <b>本节要回答</b>
> 1. {{QUESTION_1}}
> 2. {{QUESTION_2}}
>
> 学完你能：
> 1. 能解释{{EXPLAIN_1}}
> 2. 能写出{{WRITE_2}}
> 3. 能说清{{AWARE_3}}
>
> <b>前置</b>：{{PREREQ}} ｜ <b>预计用时</b>：{{MINUTES}} 分钟 ｜ <b>难度</b>：{{DIFFICULTY}}

<!-- 导读三行缺一不可：手上有什么、结束时多了什么、本节回答哪几个问题。
     问题写成真问题（「为什么一批数不能是 Python 列表」），不要写成任务（「新建 data.py」）。
     用时 = 步数 × 10–20 分钟，30–100 之间；超了就拆节。 -->

## 接上一节

<!-- 全课第一节写：这是第一节，还没有「上一节」。本节要造的第一样东西是 {{FIRST_ARTIFACT}}。 -->

<b>上一节做到</b>：{{LAST_DONE}}

<b>留下的坑</b>：{{LAST_GAP}}

<b>本节补上</b>：{{THIS_FILLS}}

---

## 第 1 步：{{STEP1_QUESTION}}

<!-- 标题是一个要回答的问题或一个知识主题，不是文件操作。
     本节 3–5 步，编号连续；每步内部的顺序固定：先想 → 讲 → 做 → 看。 -->

> <b>*Tip*</b>
> 先想一下：{{THINK_PROMPT}}（想好再往下看，看完回来对一下。）

{{STEP1_EXPLAIN}}

<!-- 讲：至少 8 行，通常 20–60 行。要求：
     ① 先说清这段要解决什么问题、不解决会怎样；
     ② 原理与数学：定义、推导、量级估算、代价账（按科目取舍，数学类不要跳步）；
     ③ 一个反例或一个容易走错的岔路；
     ④ 结尾一句把话题交给下面的实践：「想清楚了，我们把它实现出来。」 -->

【新建】`project/{{FILE}}`

```python
{{FULL_FILE}}
```

【运行】在 `project/` 里：

```bash
{{RUN_COMMAND}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-1.txt -->
```text
{{REAL_OUTPUT}}
```

<b>刚才发生了什么</b>：{{READ_BACK}}

<!-- 看：3–10 行。逐条把输出对回上面的讲解——哪一行验证了哪句话、哪一行只是脚手架。
     输出必须是 run-course.mjs 跑出来的，不许手写。 -->

<b>为什么这样做</b>：{{WHY_THIS}}

### 概念 1：{{CONCEPT1_NAME}}

<!-- 概念就地展开，40–120 行，六件事按顺序讲：
     为什么需要它 → 它在数学/原理上是什么 → 一句话 → 准确定义（Note）→ 例子 → 易错点（Warning）。
     不要写成 API 卡片：读者读完要能说出「为什么非它不可」，而不只是「它怎么用」。 -->

<b>为什么需要它</b>：{{CONCEPT1_WHY}}

<b>它在数学上是什么</b>：{{CONCEPT1_MATH}}

<b>一句话</b>：{{CONCEPT1_ONE_LINE}}

> <b>*Note*</b>
> **{{CONCEPT1_NAME}} 的定义**
>
> {{CONCEPT1_DEFINITION}}

<b>例子</b>：{{CONCEPT1_EXAMPLE}}

> <b>*Warning*</b>
> {{CONCEPT1_PITFALL}}

---

## 第 2 步：{{STEP2_QUESTION}}

> <b>*Tip*</b>
> 先猜一猜：{{GUESS_PROMPT}}

{{STEP2_EXPLAIN}}

<b>为什么现在轮到这一步</b>：{{WHY_THIS_STEP}}

【修改】`project/{{FILE}}`：{{CHANGE_WHAT}}

```diff
 {{CONTEXT_BEFORE}}
-{{OLD_LINE}}
+{{NEW_LINE}}
 {{CONTEXT_AFTER}}
```

<!-- diff 规则：上下文行首一个空格，上下各 1–2 行，且这几行在文件里只能匹配到一处。 -->

【运行】在 `project/` 里：

```bash
{{RUN_COMMAND_2}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-2.txt -->
```text
{{REAL_OUTPUT_2}}
```

<b>刚才发生了什么</b>：{{READ_BACK_2}}

<b>为什么是这个结果</b>：{{WHY_RESULT_2}}（猜错的人错在哪：{{WHY_WRONG}}）

---

## 第 3 步：{{STEP3_QUESTION}}

{{STEP3_EXPLAIN}}

<!-- 这一步故意让它坏掉：先让读者看到真实报错，再修。 -->

【运行】在 `project/` 里：

```bash
{{RUN_COMMAND_3}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-3.txt -->
```text
{{REAL_ERROR_OUTPUT}}
```

<b>刚才发生了什么</b>：现在是坏的：{{WHAT_BROKE}}

【重构】`project/{{FILE}}` 的 `{{FUNCTION}}`：{{REPAIR_WHY}}

```python
{{WHOLE_FUNCTION}}
```

【运行】在 `project/` 里：

```bash
{{RUN_COMMAND_4}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-4.txt -->
```text
{{REAL_OUTPUT_4}}
```

<b>刚才发生了什么</b>：{{READ_BACK_4}}

<b>为什么这样修</b>：{{REPAIR_EXPLAIN}}

【收口】`project/{{FILE}}` 现在应该是这样，对不上就回头找漏掉的那一步：

```python
{{WHOLE_FILE}}
```

<!-- 【收口】给出的内容必须和「照正文做到这里」的结果逐字一致。
     章末（每章最后一节）把最后一步换成 `## 第 N 步：章末通跑：…`，一条命令跑完整个 project/，
     并在 `## 本节小结` 之后加 `### 本章项目地图`：```text 文件树（每个文件一句话职责 + 「Sec_N 新建」标注）
     + `<b>本章动了</b>：…。标准答案在 code/answer/chNN/，结构和 project/ 一样。` -->

---

## 本节小结

> <b>*Tip*</b>
> 记住这些
>
> 1. {{TAKEAWAY_1}}
> 2. {{TAKEAWAY_2}}
> 3. {{TAKEAWAY_3}}
> 4. {{TAKEAWAY_4}}
> 5. {{TAKEAWAY_5}}
>
> <b>留给下一节</b>：{{NEXT_HOOK}}

<!-- 小结写「你现在能解释的几件事」，不是任务清单。留给下一节点名下一节要碰的文件或问题。 -->

---

## 本节练习

**1.**（目标 1）{{EXERCISE_1}}

> <b>*Note*</b>
> **答案与解析**
>
> <b>答案</b>：{{ANSWER_1}}
>
> <b>解析</b>：{{ANALYSIS_1}}

**2.**（目标 2）{{EXERCISE_2}}

> <b>*Note*</b>
> **答案与解析**
>
> <b>答案</b>：{{ANSWER_2}}
>
> <b>解析</b>：{{ANALYSIS_2}}

**3.**（目标 3）{{EXERCISE_3}}

> <b>*Note*</b>
> **答案与解析**
>
> <b>答案</b>：{{ANSWER_3}}
>
> <b>解析</b>：{{ANALYSIS_3}}

<!-- 题干必须和 web/notes_data.js 里 sections[].quiz 的 question 逐字一致（含行内代码）。
     3–5 题，难度递进：先认（读代码说输出）→ 再改（补一行）→ 再写（自己写一个小函数）。 -->

---

## 概念索引

<!-- 锚点规则：标题转小写 → 去掉 *_~\[]() 这些符号 → 连续空格与标点换成 - → 去首尾 -。
     `概念 1：数值导数` → `#概念-1-数值导数`。## 与 ### 的规则一样。 -->

1. [{{CONCEPT1_NAME}}](#概念-1-{{CONCEPT1_ANCHOR}})

---

[上一节]({{PREV_SECTION_URLENC}}.md) ｜ [返回大纲](../00%20%E5%A4%A7%E7%BA%B2.md) ｜ [本章速查]({{SHEET_URLENC}}.md) ｜ [下一节]({{NEXT_SECTION_URLENC}}.md)

<!-- 导航行 URL 百分号编码；首节省略「上一节」，末节把「下一节」换成「本章测试」。 -->

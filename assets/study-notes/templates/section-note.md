---
subject: {{SUBJECT}}
chapter: {{CHAPTER_NO}}
section: {{SECTION_NO}}
status: 未开始
tags: [{{SUBJECT}}, 节笔记]
---

# C{{CHAPTER_NO}} Sec_{{SECTION_NO}} {{SECTION_NAME}}

<!-- 本模板的步骤示例（【新建】/【修改】/【重构】/【收口】/【运行】、project/、文件树）专供代码类 / 计算机类 / AI 类课程。
     其他科目保留导读、接上一节、3–5 步、小结、练习、概念索引这些环节，步骤里用 <b>动手</b> / <b>你应该看到</b> / <b>为什么</b>，
     具体写法有自由空间，按 references/subject-playbooks.md 的对应科目来；不用的代码示例整块删掉。 -->

> <b>*Note*</b>
> 本节导读
>
> <b>你现在手上</b>：{{WHAT_THE_LEARNER_HAS_NOW}}
>
> <b>本节结束时</b>：{{WHAT_IS_NEW_AT_THE_END}}
>
> 学完你能：
>
> 1. {{OBJECTIVE_1}}
> 2. {{OBJECTIVE_2}}
> 3. {{OBJECTIVE_3}}
>
> <b>前置</b>：{{PREREQUISITES_WITH_LINKS}}
> <b>预计用时</b>：{{MINUTES}} 分钟 ｜ <b>难度</b>：{{DIFFICULTY}}

<!-- 你现在手上：上一节结束时 project/（或推导本、句子本……）里有什么，能做到什么、做不到什么。
     本节结束时：多了哪几个文件 / 哪几条式子 / 哪几句话，多能做到什么。写具体的文件名。
     学习目标 2–4 条，用可检验的动词（能手算 / 能解释 / 能写出 / 能区分），每条都要有练习对应。
     预计用时 = 步骤数 × 10–20 分钟，30–100 之间；超了就拆节。
     本文件里的 HTML 说明注释写完后删掉。 -->

## 接上一节

<b>上一节做到</b>：{{PREVIOUS_SECTION_RESULT}}

<b>留下的坑</b>：{{THE_PROBLEM_LEFT_OPEN}}

<b>本节补上</b>：{{WHAT_THIS_SECTION_FIXES}}

<!-- 坑要具体：一个读者已经能感受到的问题，不是"本节将介绍 X"。全课第一节写"这是第一节"，并说明本节要造的第一样东西。 -->

## 第 1 步：{{STEP1_VERB_PHRASE}}

{{STEP1_WHY_THIS_STEP_NOW}}

【新建】`project/{{STEP1_FILE}}`

```python
{{STEP1_WHOLE_FILE}}
```

【运行】在 `project/` 里：

```bash
{{STEP1_COMMAND}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-1.txt -->
```text
{{STEP1_REAL_OUTPUT}}
```

<b>为什么这样做</b>：{{STEP1_WHY}}

<!-- 每一步：动作 → 可见的真实结果 → 为什么。标题是动词短语（"把核对写成一条测试"），不是名词。
     【新建】放整份文件（≤ 120 行，不许省略）；输出由 run-course.mjs --write 真实运行后写入，不要手写。
     非代码科目：动作写 <b>动手</b>：在推导本 / 句子本上……；结果写 <b>你应该看到</b>：……。 -->

## 第 2 步：{{STEP2_VERB_PHRASE}}

{{STEP2_INTRO}}

### 概念 1：{{CONCEPT1_NAME}}

<b>一句话</b>：{{CONCEPT1_ONE_LINER_ABOUT_WHAT_THE_LEARNER_JUST_DID}}

> <b>*Note*</b>
> {{CONCEPT1_TERM}} 的定义
>
> {{CONCEPT1_RIGOROUS_DEFINITION}}

<b>例子</b>：{{CONCEPT1_EXAMPLE}}

> <b>*Warning*</b>
> 易错点
>
> {{CONCEPT1_COMMON_MISTAKE}}

<!-- 概念在第一次需要它的这一步出现：一句话、定义、一个例子、一条易错点，通常 15–40 行。
     讲完马上回到动作。一步最多一个概念，不要两个概念连排。 -->

【修改】`project/{{STEP2_FILE}}`：{{STEP2_WHAT_CHANGES}}

```diff
 {{UNCHANGED_LINE_BEFORE}}
-{{REMOVED_LINE}}
+{{ADDED_LINE}}
 {{UNCHANGED_LINE_AFTER}}
```

<!-- 【修改】用 diff：上下各留 1–2 行原样的上下文（行首一个空格），改动行以 - / + 开头。上下文在文件里必须只出现一次。 -->

> <b>*Tip*</b>
> 先猜一猜
>
> {{PREDICT_QUESTION}}

【运行】在 `project/` 里：

```bash
{{STEP2_COMMAND}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-2.txt -->
```text
{{STEP2_REAL_OUTPUT}}
```

<b>为什么是这个结果</b>：{{REVEAL_AND_WHY_PEOPLE_GUESS_WRONG}}

## 第 3 步：{{STEP3_VERB_PHRASE}}

{{STEP3_INTRO}}

【运行】在 `project/` 里：

```bash
{{STEP3_COMMAND_THAT_FAILS}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-3.txt -->
```text
{{STEP3_REAL_FAILURE}}
```

现在是坏的：{{WHY_IT_IS_BROKEN}}

<!-- 每节至少一次"现在是坏的"：真实的报错、失败的测试、反例。先让读者撞上，再修。 -->

【重构】`project/{{STEP3_FILE}}` 的 `{{FUNCTION_NAME}}`：{{WHY_REPLACE_THE_WHOLE_FUNCTION}}

```python
{{WHOLE_FUNCTION_WITH_ORIGINAL_INDENT}}
```

【运行】在 `project/` 里：

```bash
{{STEP3_COMMAND}}
```

<!-- output: code/out/c{{CHAPTER_NO}}s{{SECTION_NO}}-4.txt -->
```text
{{STEP3_REAL_OUTPUT}}
```

<b>为什么这样修</b>：{{STEP3_WHY}}

【收口】`project/{{STEP3_FILE}}` 现在应该是这样，对不上就回头找漏掉的那一步：

```python
{{STEP3_FILE_AS_IT_IS_NOW}}
```

<!-- 需要第 4、5 步时照上面的格式写。章末最后一节的最后一步是「章末通跑」：
     ## 第 N 步：章末通跑：…  里面一个【运行】，一条命令从头跑完整个 project/，带真实输出。 -->

## 本节小结

> <b>*Tip*</b>
> 记住这些
>
> 1. {{POINT_1}}
> 2. {{POINT_2}}
> 3. {{POINT_3}}
> 4. {{POINT_4}}
> 5. {{POINT_5}}

<b>留给下一节</b>：{{HOOK_NAMING_THE_NEXT_FILE_OR_ACTION}}

<!-- 章末最后一节在这里加：
### 本章项目地图

```text
project/
├── {{FILE_A}}        {{ONE_LINE_ROLE}}（Sec_1 新建）
└── {{FILE_B}}        {{ONE_LINE_ROLE}}（Sec_2 修改）
```

<b>本章动了</b>：{{FILES_CREATED_OR_CHANGED_THIS_CHAPTER}}。标准答案在 code/answer/chNN/，结构和 project/ 一样。 -->

## 本节练习

<!-- 3–5 题，难度递进：基础 → 应用 → 易错/辨析（最好就是本节坏掉的那个坑）→（可选）综合 →（可选）连接前面章节。
     每条学习目标至少对应一题。题干与答案同步写进 notes_data.js 的 sections[].quiz（题干逐字一致，含行内代码）。 -->

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

## 概念索引

1. [{{CONCEPT1_NAME}}](#{{CONCEPT1_ANCHOR}})

<!-- 锚点规则：标题转小写 → 去掉 `*_~[]() → 其余连续空格与标点换成 - → 去首尾 -。
     例：「概念 1：数值导数」→ 概念-1-数值导数。## 与 ### 算法一样。 -->

---

上一节：[C{{CHAPTER_NO}} Sec_{{PREV_NO}} {{PREV_NAME}}](C{{CHAPTER_NO}}%20Sec_{{PREV_NO}}%20{{PREV_NAME_URLENC}}.md) · 返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md) · 本章速查：[C{{CHAPTER_NO}} 速查](C{{CHAPTER_NO}}%20%E9%80%9F%E6%9F%A5.md) · 下一节：[C{{CHAPTER_NO}} Sec_{{NEXT_NO}} {{NEXT_NAME}}](C{{CHAPTER_NO}}%20Sec_{{NEXT_NO}}%20{{NEXT_NAME_URLENC}}.md)

<!-- 首节省略「上一节」；末节把「下一节」换成「本章测试：[C… 测试](C…%20%E6%B5%8B%E8%AF%95.md)」。 -->

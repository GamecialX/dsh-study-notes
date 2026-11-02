---
subject: {{SUBJECT}}
chapter: 0
status: 未开始
tags: [{{SUBJECT}}, 大纲]
---

# {{SUBJECT}} 学习笔记 · 总大纲

> <b>*Note*</b>
> 这是什么
>
> 这是 <b>{{SUBJECT}}</b> 的全库总起页。这门课从上读到下：每一节都在你自己的 {{LEARNER_ARTIFACT}} 里长出一截，节末能验证。下面列出每一节做出什么、从哪一步动手。
>
> <b>适合谁</b>：{{TARGET_LEARNER}}
> <b>学完能做到</b>：{{LEARNING_OUTCOMES}}
> <b>前置要求</b>：{{PREREQUISITES}}

<!-- 本文件在笔记根目录，链接章内文件要带章目录：Cha_1%20章名/C1%20Sec_1%20节名.md（百分号编码）。
     本文件里的 HTML 说明注释写完后删掉。 -->

---

## 一、科目简介

{{SUBJECT_INTRO}}

<!-- 3–6 段：这门科目研究什么问题、为什么重要、核心思维方式、常见误区。用通俗语言，不要写成百科条目。 -->

> <b>*Tip*</b>
> 怎么跟这门课
>
> 1. <b>从上读到下，边读边做</b>：从第 1 章第 1 节开始按顺序读。每节第一段告诉你开工前手上有什么、结束时多了什么；每一步告诉你在哪个文件里做什么、应该看到什么。
> 2. <b>只在 `project/` 里动手</b>：你的代码（或推导本、句子本）从空白开始，自己敲出来。代码块的标签：【新建】整份新文件、【修改】只改标出的几行、【重构】整个函数换掉、【运行】要敲的命令。
> 3. <b>卡住了对照什么</b>：先对照这一步的输出和【收口】；整章做完再去 `code/answer/chNN/` 对标准答案，它的结构和你的 `project/` 一样。
> 4. <b>编辑器</b>：用 Typora 打开（VS Code 等也能读，全文是标准 Markdown）。每读完一节把 frontmatter 的 `status` 改成 `学习中` / `已完成`。
> 5. <b>网页端</b>：双击根目录的 `启动学习服务器.bat`（macOS/Linux 用 `./start_server.sh`），在浏览器里做节内练习、看本章速查、考章末测试，进度自动保存。两边读的是同一批文件。

---

## 二、学习路线

```mermaid
flowchart TD
  A["第 1 章 {{CH1_NAME}}"] --> B["第 2 章 {{CH2_NAME}}"]
  B --> C["第 3 章 {{CH3_NAME}}"]
  C --> D["…"]
  D --> Z["第 N 章 毕业设计"]
```

<b>难度曲线</b>：第 1–{{EASY_END}} 章 入门 · 第 {{MID_START}}–{{MID_END}} 章 进阶 · 第 {{HARD_START}} 章起 挑战

<b>学习顺序建议</b>：{{STUDY_ORDER_ADVICE}}

---

## 三、章节目录

<!-- 每章复制下面这一段。所有链接在内容生成后回填。章标题里不要放 ▸ 等装饰符号，锚点更稳。
     本节要回答：这一节读完，读者能自己回答的一两个问题（写问题，不写任务）。
     本节产物：本节结束时 project/（或推导本、句子本……）里多出或改了什么，读者能自己验证。
     动手入口：本节第一个动作（新建哪个文件 / 写下哪条式子 / 默写哪一句）。写不出这三列的节，回去重排。
     {{LEARNER_ARTIFACT}} 换成 project/、推导本、句子本、时间线……（见 references/subject-playbooks.md）。 -->

### 第 {{CHAPTER_NO}} 章 {{CHAPTER_NAME}}

> <b>一句话导读</b>：{{CHAPTER_BRIEF}}
> <b>难度</b>：{{CHAPTER_DIFFICULTY}} ｜ <b>预计用时</b>：{{CHAPTER_HOURS}}

| 节 | 标题 | 学完你能 | 本节要回答 | 本节产物 | 动手入口 |
|---|---|---|---|---|---|
| {{CHAPTER_NO}}.1 | [C{{CHAPTER_NO}} Sec_1 {{SEC1_NAME}}]({{CHAPTER_DIR_URLENC}}/C{{CHAPTER_NO}}%20Sec_1%20{{SEC1_NAME_URLENC}}.md) | {{SEC1_OBJECTIVES}} | {{SEC1_QUESTIONS}} | {{SEC1_ARTIFACT}} | {{SEC1_FIRST_ACTION}} |
| {{CHAPTER_NO}}.2 | [C{{CHAPTER_NO}} Sec_2 {{SEC2_NAME}}]({{CHAPTER_DIR_URLENC}}/C{{CHAPTER_NO}}%20Sec_2%20{{SEC2_NAME_URLENC}}.md) | {{SEC2_OBJECTIVES}} | {{SEC2_QUESTIONS}} | {{SEC2_ARTIFACT}} | {{SEC2_FIRST_ACTION}} |

<b>本章速查</b>：[C{{CHAPTER_NO}} 速查]({{CHAPTER_DIR_URLENC}}/C{{CHAPTER_NO}}%20%E9%80%9F%E6%9F%A5.md) ｜ <b>本章测试</b>：[C{{CHAPTER_NO}} 测试]({{CHAPTER_DIR_URLENC}}/C{{CHAPTER_NO}}%20%E6%B5%8B%E8%AF%95.md)

---

<!-- 重复块结束 -->

## 四、概念总索引

> <b>*Note*</b>
> 这是检索用的，正课请顺着读
>
> 下面按概念列出它第一次出场的位置，方便复习时回查。概念是课程线上的节点，脱离了它所在的那一步就不好懂；第一次学请从第 1 章第 1 节顺着读。

| 概念 | 第一次出场 |
|---|---|
| [{{CONCEPT_NAME}}]({{CHAPTER_DIR_URLENC}}/C{{CHAPTER_NO}}%20Sec_{{SEC_NO}}%20{{SEC_NAME_URLENC}}.md#{{CONCEPT_ANCHOR}}) | C{{CHAPTER_NO}} Sec_{{SEC_NO}} 第 {{STEP_NO}} 步 |

---

## 五、记号与术语约定

全库统一使用下列记号。<b>如果你在其他教材里看到不同约定，以本表为准</b>（正文里会注明差异）。

| 记号 / 术语 | 含义 |
|---|---|
| {{SYMBOL}} | {{MEANING}} |
| {{TERM}} | {{DEFINITION}} |

---

## 六、学习建议

> <b>*Tip*</b>
> 编者按
>
> {{EDITOR_ADVICE}}

> <b>*Warning*</b>
> 常见误区
>
> - {{PITFALL_1}}
> - {{PITFALL_2}}
> - {{PITFALL_3}}

---

## 七、进度追踪

| 章 | 节数 | 概念数 | 速查 | 测试 | 状态 |
|---|---|---|---|---|---|
| 1 {{CH1_NAME}} | {{N}} | {{M}} | [C1 速查]({{CH1_DIR_URLENC}}/C1%20%E9%80%9F%E6%9F%A5.md) | [C1 测试]({{CH1_DIR_URLENC}}/C1%20%E6%B5%8B%E8%AF%95.md) | ⬜ |
| 2 {{CH2_NAME}} | {{N}} | {{M}} | [C2 速查]({{CH2_DIR_URLENC}}/C2%20%E9%80%9F%E6%9F%A5.md) | [C2 测试]({{CH2_DIR_URLENC}}/C2%20%E6%B5%8B%E8%AF%95.md) | ⬜ |

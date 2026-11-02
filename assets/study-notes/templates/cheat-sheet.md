---
subject: {{SUBJECT}}
chapter: {{CHAPTER_NO}}
status: 未开始
tags: [{{SUBJECT}}, 速查]
---

# C{{CHAPTER_NO}} 速查

> <b>*Note*</b>
> 怎么用这一页
>
> 第 {{CHAPTER_NO}} 章「{{CHAPTER_NAME}}」的一页纸速查。只收本章讲过的内容，每条都能点回正文。复习和做测试前翻一遍。

<!-- 篇幅 80–200 行。不写新知识、不写长解释、不放练习。每条链到正文锚点。
     本文件里的 HTML 说明注释写完后删掉。 -->

---

## 一、核心概念一句话

| 概念 | 一句话 | 正文 |
|---|---|---|
| {{CONCEPT_NAME}} | {{ONE_LINER}} | [C{{CHAPTER_NO}} Sec_{{SEC_NO}}](C{{CHAPTER_NO}}%20Sec_{{SEC_NO}}%20{{SEC_NAME_URLENC}}.md#{{CONCEPT_ANCHOR}}) |

---

## 二、公式 / API / 命令

| 名称 | 写法 | 说明 |
|---|---|---|
| {{ITEM_NAME}} | {{ITEM_FORMULA_OR_CODE}} | {{ITEM_NOTE}} |

<!-- 数学类放公式（行内 $...$ 或独占一行的 $$）；代码类放 API 签名与最常用的调用；操作类放参数与正常范围。 -->

---

## 三、什么时候用哪个

| 场景 | 用 | 不要用 |
|---|---|---|
| {{SCENARIO}} | {{USE}} | {{AVOID}} |

---

## 四、本章结束时你手上有什么

| 文件 / 页 | 职责 | 在哪一节长出来 |
|---|---|---|
| `project/{{FILE}}` | {{ONE_LINE_ROLE}} | [C{{CHAPTER_NO}} Sec_{{SEC_NO}}](C{{CHAPTER_NO}}%20Sec_{{SEC_NO}}%20{{SEC_NAME_URLENC}}.md) |

<!-- 从本章最后一节的「本章项目地图」抄过来，只保留文件与一句话职责。非代码科目写推导本 / 句子本的页或组。 -->

---

## 五、本章易错点

> <b>*Warning*</b>
> 最容易错的几件事
>
> 1. {{PITFALL_1}}
> 2. {{PITFALL_2}}
> 3. {{PITFALL_3}}

---

返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md) · 本章测试：[C{{CHAPTER_NO}} 测试](C{{CHAPTER_NO}}%20%E6%B5%8B%E8%AF%95.md)

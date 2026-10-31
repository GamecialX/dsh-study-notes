---
subject: {{SUBJECT}}
chapter: {{CHAPTER_NO}}
status: 未开始
tags: [{{SUBJECT}}, 章末测试]
---

# C{{CHAPTER_NO}} {{CHAPTER_NAME}} 测试

> <b>*Note*</b>
> 测试说明
>
> <b>满分 100 分</b>，覆盖本章全部 {{SECTION_COUNT}} 节。建议先合上笔记独立完成，再对照答案。
>
> 客观题（选择 / 判断 / 填空）共 {{OBJECTIVE_SCORE}} 分，门户会自动判分；计算与主观题共 {{SUBJECTIVE_SCORE}} 分，提交后按评分要点自评。

<!-- 分值写在题号后：**N.（M 分）**。各题合计恰为 100，客观题 ≥ 60。
     第 3 章起含 10–20 分跨章回顾题，题号后标【回顾 CX】，至少覆盖两个旧章节（见 references/teaching-design.md 第七节）。
     第 1、2 章删掉「六、跨章回顾」。本文件里的 HTML 说明注释写完后删掉。 -->

---

## 一、选择题（每题 {{CHOICE_SCORE}} 分，共 {{CHOICE_TOTAL}} 分）

**1.（{{Q1_SCORE}} 分）** {{Q1_STEM}}

A. {{Q1_A}}
B. {{Q1_B}}
C. {{Q1_C}}
D. {{Q1_D}}

**2.（{{Q2_SCORE}} 分）** {{Q2_STEM}}

A. {{Q2_A}}
B. {{Q2_B}}
C. {{Q2_C}}
D. {{Q2_D}}

---

## 二、判断题（每题 {{JUDGE_SCORE}} 分，共 {{JUDGE_TOTAL}} 分）

**{{Q3_NO}}.（{{Q3_SCORE}} 分）** {{Q3_STATEMENT}}（ ）

**{{Q4_NO}}.（{{Q4_SCORE}} 分）** {{Q4_STATEMENT}}（ ）

---

## 三、填空题（每题 {{FILL_SCORE}} 分，共 {{FILL_TOTAL}} 分）

**{{Q5_NO}}.（{{Q5_SCORE}} 分）** {{Q5_STEM}} ______

**{{Q6_NO}}.（{{Q6_SCORE}} 分）** {{Q6_STEM}} ______

---

## 四、计算题（共 {{CALC_TOTAL}} 分）

**{{Q7_NO}}.（{{Q7_SCORE}} 分）** {{Q7_STEM}}

---

## 五、主观题（共 {{SUBJ_TOTAL}} 分）

**{{Q8_NO}}.（{{Q8_SCORE}} 分）** {{Q8_STEM}}

---

## 六、跨章回顾（共 {{REVIEW_TOTAL}} 分）

**{{Q9_NO}}.（{{Q9_SCORE}} 分）** 【回顾 C{{REVIEW_CH_A}}】 {{Q9_STEM}}

A. {{Q9_A}}
B. {{Q9_B}}
C. {{Q9_C}}
D. {{Q9_D}}

**{{Q10_NO}}.（{{Q10_SCORE}} 分）** 【回顾 C{{REVIEW_CH_B}}】 {{Q10_STEM}}（ ）

---

> <b>*Note*</b>
> 标准答案与解析
>
> <b>1.</b> {{Q1_ANSWER}} ｜ 解析：{{Q1_ANALYSIS}}
>
> <b>2.</b> {{Q2_ANSWER}} ｜ 解析：{{Q2_ANALYSIS}}
>
> <b>{{Q3_NO}}.</b> {{Q3_ANSWER}} ｜ 解析：{{Q3_ANALYSIS}}
>
> <b>{{Q4_NO}}.</b> {{Q4_ANSWER}} ｜ 解析：{{Q4_ANALYSIS}}
>
> <b>{{Q5_NO}}.</b> {{Q5_ANSWER}} ｜ 解析：{{Q5_ANALYSIS}}
>
> <b>{{Q6_NO}}.</b> {{Q6_ANSWER}} ｜ 解析：{{Q6_ANALYSIS}}
>
> <b>{{Q7_NO}}.</b> 参考答案：{{Q7_ANSWER}}
> 评分要点：① {{Q7_RUBRIC_1}}（{{Q7_R1_SCORE}} 分）② {{Q7_RUBRIC_2}}（{{Q7_R2_SCORE}} 分）③ {{Q7_RUBRIC_3}}（{{Q7_R3_SCORE}} 分）
>
> <b>{{Q8_NO}}.</b> 评分要点：① {{Q8_RUBRIC_1}}（{{Q8_R1_SCORE}} 分）② {{Q8_RUBRIC_2}}（{{Q8_R2_SCORE}} 分）③ {{Q8_RUBRIC_3}}（{{Q8_R3_SCORE}} 分）
>
> <b>{{Q9_NO}}.</b> {{Q9_ANSWER}} ｜ 解析：{{Q9_ANALYSIS}}（回看：[{{Q9_REVIEW_LINK_TEXT}}](../{{Q9_REVIEW_CHAPTER_DIR_URLENC}}/{{Q9_REVIEW_SECTION_FILE_URLENC}}.md#{{Q9_REVIEW_ANCHOR}})）
>
> <b>{{Q10_NO}}.</b> {{Q10_ANSWER}} ｜ 解析：{{Q10_ANALYSIS}}（回看：[{{Q10_REVIEW_LINK_TEXT}}](../{{Q10_REVIEW_CHAPTER_DIR_URLENC}}/{{Q10_REVIEW_SECTION_FILE_URLENC}}.md#{{Q10_REVIEW_ANCHOR}})）

<!-- 生成时核对：各题分值之和恰为 100；客观题合计 ≥ 60；回顾题的回看链接指向 ../Cha_X 章名/CX Sec_X 节名.md#锚点。 -->

---

上一章：[C{{PREV_CHAPTER_NO}} 测试](../{{PREV_CHAPTER_DIR_URLENC}}/C{{PREV_CHAPTER_NO}}%20%E6%B5%8B%E8%AF%95.md) · 本章速查：[C{{CHAPTER_NO}} 速查](C{{CHAPTER_NO}}%20%E9%80%9F%E6%9F%A5.md) · 返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md) · 下一章：[C{{NEXT_CHAPTER_NO}} 测试](../{{NEXT_CHAPTER_DIR_URLENC}}/C{{NEXT_CHAPTER_NO}}%20%E6%B5%8B%E8%AF%95.md)

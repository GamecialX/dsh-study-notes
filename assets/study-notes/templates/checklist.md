# {{SUBJECT}} 学习笔记 · 工作记录

> <b>*Note*</b>
> 这份文件是干什么的
>
> 工作记录、进度指针、中断恢复上下文与变更日志。**假设下一次会话完全不知道发生了什么**——这里的每一节都是它唯一的线索。中断工作前必须更新。

- **科目**：{{SUBJECT}}
- **笔记根目录**：`{{COURSE_ROOT}}`（只在这份工作记录里写；正文、命令、输出里一律用相对路径）
- **创建时间**：{{CREATED_AT}}
- **学习目的**：{{LEARNING_GOAL}}
- **用户起点**：{{USER_BACKGROUND}}

---

## ① 总体规划

状态：`⬜` 未开始 · `🔄` 进行中 · `✅` 完成

| 章 | 文件 | 本节产物 | 概念（写名字，不编号） | 状态 |
|---|---|---|---|---|
| 1 {{CH1_NAME}} | C1 Sec_1 {{SEC1_NAME}} | {{SEC1_ARTIFACT}} | {{SEC1_CONCEPTS}} | ⬜ |
|  | C1 Sec_2 {{SEC2_NAME}} | {{SEC2_ARTIFACT}} | {{SEC2_CONCEPTS}} | ⬜ |
|  | C1 速查 | — | — | ⬜ |
|  | C1 测试 | — | — | ⬜ |
|  | `code/answer/ch01/`（代码类） | 与 project/ 同构的本章答案 | — | ⬜ |
| 2 {{CH2_NAME}} | C2 Sec_1 {{SEC1_NAME}} | {{SEC1_ARTIFACT}} | {{SEC1_CONCEPTS}} | ⬜ |
| … | | | | ⬜ |

---

## ② 当前进度指针

- **正在写**：`{{CURRENT_FILE}}` —— 完成到：{{CURRENT_PROGRESS}}（写到第几步）
- **真实输出**：`run-course.mjs --write` 已跑到 {{RUN_COURSE_THROUGH}}；`code/answer/` 已生成到第 {{ANSWER_THROUGH}} 章
- **下一篇**：`{{NEXT_FILE}}`
- **门户同步**：`notes_data.js` 已同步至第 {{SYNCED_THROUGH}} 章；{{UNSYNCED_NOTE}}
- **当前阶段**：P{{PHASE}} {{PHASE_NAME}}（P0 确认 · P1 大纲 · P2 骨架 · P2.5 样章确认 · P3 逐章 · P4 毕业设计 · P5 收尾）

---

## ③ 恢复上下文

- **最近完成**：{{LAST_COMPLETED}}
- **待办**：
  - [ ] {{TODO_1}}
  - [ ] {{TODO_2}}
- **未回填的链接清单**：
  - [ ] `00 大纲.md` 第 {{N}} 章的节、速查、测试、概念链接
  - [ ] `{{FILE}}` 的概念索引 / 导航行
- **已确定的风格约定**（P2.5 样章确认后填写）：
  - 样章：`{{SAMPLE_FILE}}`，确认时间 {{SAMPLE_CONFIRMED_AT}}
  - 篇幅：每节 {{STEP_COUNT}} 步、约 {{SECTION_MINUTES}} 分钟；每一步的跨度：{{STEP_SIZE}}
  - 讲解深浅 / 语气：{{DEPTH_AND_TONE}}
  - 称呼：{{ADDRESS_STYLE}}；比喻体系：{{METAPHOR_SYSTEM}}
  - 标注块密度：{{LABEL_DENSITY}}
  - 练习：每节 {{QUIZ_COUNT}} 道（3–5），第 1 题基础、第 2 题应用、第 3 题易错辨析，其余综合
  - 代码 / 图 / 公式比例：{{MEDIA_MIX}}
- **用户的特殊要求**：
  - {{USER_REQUEST_1}}

---

## ④ 变更日志

<!-- 只追加，不修改历史 -->

- {{CREATED_AT}}  建立科目规划与 `00 大纲.md`
- {{CREATED_AT}}  建立 `web/` 骨架、启动脚本、仅含目录的 `notes_data.js`

---

## ⑤ 交付自检

（收尾阶段填写，见 `references/quality-gates.md` 第五节）

- 校验脚本（`--strict`）：{{CHECK_RESULT}}
- 真实运行（`run-course.mjs`）：{{RUN_RESULT}}
- 顺读测试：{{READ_THROUGH_RESULT}}
- 抽查公式：{{FORMULA_SPOTCHECK}}
- 抽查代码：{{CODE_SPOTCHECK}}
- 门户实测：{{PORTAL_TEST}}
- 已知局限：{{KNOWN_LIMITS}}

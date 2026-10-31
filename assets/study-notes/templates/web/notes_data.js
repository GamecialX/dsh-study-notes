/* ============================================================================
 * notes_data.js —— 网页学习门户的目录 / 题目数据
 * ============================================================================
 *
 * 这是【形状示例】，不是内容。生成学习库时，用真实科目数据【整份替换】本文件。
 *
 * 规则（详见 references/portal-standard.md）：
 *   - 正文不写在这里！正文只存在于 .md 文件里，前端实时 fetch。
 *   - file 路径必须与真实文件名逐字符一致（含空格与全半角），以 / 开头（站点根）。
 *   - 每节 quiz 3–5 题，且与该节 .md 里「本节练习」的题目一一对应（题干逐字一致）。
 *   - concepts 列出本节的概念小节：n 与 name 对应 md 里的「## 概念 N：名称」。
 *   - sheet 指向本章速查 CX 速查.md（毕业设计章省略）。
 *   - links 是知识图谱的边（可选），两端都写 concepts 里的 name。
 *   - 每章 test.total 必须为 100，且 test.questions[].score 之和恰为 100；
 *     客观题（choice / judge / fill）合计 ≥ 60。
 *   - answer：choice 为选项下标（从 0 起）；judge 为 true / false；
 *             fill / calc / subjective 为参考答案文本（fill 可用 | 分隔多个可接受答案）。
 *   - 某章没有章末测试时写 test: null（例如毕业设计章）。
 *
 * 生成完后务必运行：node <skill>/scripts/check-library.mjs "<笔记根目录>"
 * ========================================================================== */

window.NOTES_DATA = {
  meta: {
    subject: "示例科目",
    generatedAt: "2026-01-01 09:00",
    chapters: 2,
    options: {
      fillCaseSensitive: false,
      katex: "auto"
    }
  },

  chapters: [
    {
      id: "c1",
      no: 1,
      title: "第 1 章 基础概念",
      brief: "先建立全库共用的语言：什么是本学科的基本对象，以及它们之间最基本的关系。",
      sections: [
        {
          id: "c1s1",
          no: 1,
          title: "C1 Sec_1 基本对象",
          file: "/Cha_1 基础概念/C1 Sec_1 基本对象.md",
          concepts: [{ n: 1, name: "基本对象" }, { n: 2, name: "对象的相等" }],
          quiz: [
            {
              type: "choice",
              question: "下列哪一项是本节定义的「基本对象」？",
              options: ["A 选项内容", "B 选项内容", "C 选项内容", "D 选项内容"],
              answer: 1,
              analysis: "由定义可知 B 满足全部三条要求，A 缺少第三条。"
            },
            {
              type: "judge",
              question: "两个基本对象只要看起来相同，就一定是相等的。",
              answer: false,
              analysis: "「看起来相同」是表象；相等性由定义中的判定条件决定。"
            },
            {
              type: "fill",
              question: "基本对象的三条要求分别是存在性、唯一性和 ______。",
              answer: "可判定性|可判定",
              analysis: "缺少可判定性就无法判断两个对象是否相等。"
            }
          ]
        },
        {
          id: "c1s2",
          no: 2,
          title: "C1 Sec_2 基本关系",
          file: "/Cha_1 基础概念/C1 Sec_2 基本关系.md",
          concepts: [{ n: 1, name: "基本关系" }],
          quiz: [
            {
              type: "choice",
              question: "关于基本关系，下列说法正确的是？",
              options: ["A 选项内容", "B 选项内容", "C 选项内容", "D 选项内容"],
              answer: 2,
              analysis: "关系必须同时满足自反性与传递性，只有 C 两条都满足。"
            },
            {
              type: "judge",
              question: "空关系也是一种基本关系。",
              answer: true,
              analysis: "按定义，空关系满足全部条件，是合法的基本关系。"
            },
            {
              type: "fill",
              question: "若 a 与 b 有基本关系，记作 a ______ b。",
              answer: "~",
              analysis: "本节采用的记号是 a ~ b。"
            }
          ]
        }
      ],
      sheet: { file: "/Cha_1 基础概念/C1 速查.md" },
      test: {
        title: "第 1 章 测试",
        file: "/Cha_1 基础概念/C1 测试.md",
        total: 100,
        questions: [
          {
            id: "q1", type: "choice", score: 6,
            question: "第 1 题题干。",
            options: ["A 选项", "B 选项", "C 选项", "D 选项"],
            answer: 0,
            analysis: "解析文字。"
          },
          {
            id: "q2", type: "choice", score: 6,
            question: "第 2 题题干。",
            options: ["A 选项", "B 选项", "C 选项", "D 选项"],
            answer: 3,
            analysis: "解析文字。"
          },
          {
            id: "q3", type: "choice", score: 6,
            question: "第 3 题题干。",
            options: ["A 选项", "B 选项", "C 选项", "D 选项"],
            answer: 1,
            analysis: "解析文字。"
          },
          {
            id: "q4", type: "choice", score: 6,
            question: "第 4 题题干。",
            options: ["A 选项", "B 选项", "C 选项", "D 选项"],
            answer: 2,
            analysis: "解析文字。"
          },
          {
            id: "q5", type: "judge", score: 6,
            question: "第 5 题陈述句。",
            answer: true,
            analysis: "解析文字。"
          },
          {
            id: "q6", type: "judge", score: 6,
            question: "第 6 题陈述句。",
            answer: false,
            analysis: "解析文字。"
          },
          {
            id: "q7", type: "judge", score: 6,
            question: "第 7 题陈述句。",
            answer: true,
            analysis: "解析文字。"
          },
          {
            id: "q8", type: "fill", score: 9,
            question: "第 8 题填空题干，答案为 ______。",
            answer: "参考答案",
            analysis: "解析文字。"
          },
          {
            id: "q9", type: "fill", score: 9,
            question: "第 9 题填空题干，答案为 ______。",
            answer: "参考答案",
            analysis: "解析文字。"
          },
          {
            id: "q10", type: "calc", score: 20,
            question: "第 10 题计算题题干。",
            answer: "参考答案：完整的计算过程与最终结果。",
            analysis: "评分要点：① 正确列出已知条件（5 分）② 推导过程无误（10 分）③ 结果与单位正确（5 分）。"
          },
          {
            id: "q11", type: "subjective", score: 20,
            question: "第 11 题主观题题干。",
            answer: "评分要点：① 能指出核心概念（8 分）② 论证逻辑完整（8 分）③ 有独立判断或举例（4 分）。",
            analysis: "本题考察综合运用能力。"
          }
        ]
      }
    },

    {
      id: "c2",
      no: 2,
      title: "第 2 章 进阶应用",
      brief: "把第 1 章建立的语言用于解决具体问题，并引入第一个真正有用的工具。",
      sections: [
        {
          id: "c2s1",
          no: 1,
          title: "C2 Sec_1 第一个工具",
          file: "/Cha_2 进阶应用/C2 Sec_1 第一个工具.md",
          concepts: [{ n: 1, name: "第一个工具" }],
          quiz: [
            {
              type: "choice",
              question: "使用第一个工具时，必须先满足的条件是？",
              options: ["A 选项内容", "B 选项内容", "C 选项内容", "D 选项内容"],
              answer: 0,
              analysis: "前置条件不满足时工具会失效，这是最常见的错误来源。"
            },
            {
              type: "judge",
              question: "该工具对所有输入都成立。",
              answer: false,
              analysis: "它只对满足特定条件的输入成立。"
            },
            {
              type: "calc",
              question: "用该工具计算一个具体例子，写出完整过程。",
              answer: "参考答案：① 代入条件 ② 化简 ③ 得到结果。",
              analysis: "评分要点：条件判断（2 分）、代入与化简（5 分）、结果（3 分）。"
            }
          ]
        }
      ],
      test: null
    }
  ],

  links: [
    ["基本对象", "对象的相等"],
    ["对象的相等", "基本关系"],
    ["基本关系", "第一个工具"]
  ]
};

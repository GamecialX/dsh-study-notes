window.NOTES_DATA = {
  meta: { subject: "等差数列入门", generatedAt: "2026-01-01 09:00", chapters: 1 },
  chapters: [
    { id: "c1", no: 1, title: "第 1 章 等差数列", brief: "在推导本上从一条数列推出通项和求和两条公式。",
      sections: [
        { id: "c1s1", no: 1, title: "C1 Sec_1 通项与求和", file: "/Cha_1 等差数列/C1 Sec_1 通项与求和.md",
          concepts: [{ n: 1, name: "等差数列" }, { n: 2, name: "通项公式" }, { n: 3, name: "求和公式" }],
          quiz: [
            { type: "choice", question: "数列 5, 9, 13, … 的第 10 项是多少？", options: ["41", "45", "49", "40"], answer: 0, analysis: "5 + 9 × 4 = 41。" },
            { type: "judge", question: "判断：等差数列的通项可以写成 $a_n = a_1 + nd$。", answer: false, analysis: "n = 1 时得 a1 + d，不等于 a1。" },
            { type: "fill", question: "等差数列 1, 3, 5, … 前 n 项的和是 ______。", answer: "n^2|n²|n*n", analysis: "S_n = n(1 + 2n - 1)/2 = n²。" }
          ] }
      ],
      sheet: { file: "/Cha_1 等差数列/C1 速查.md" },
      test: { title: "第 1 章 测试", file: "/Cha_1 等差数列/C1 测试.md", total: 100,
        questions: [
          { id: "q1", type: "choice", score: 30, question: "数列 2, 6, 10, … 的第 8 项是多少？", options: ["30", "34", "32", "26"], answer: 0, analysis: "2 + 7 × 4 = 30。" },
          { id: "q2", type: "judge", score: 30, question: "判断：任意等差数列的前 n 项和，都等于项数乘以首项与末项的平均数。", answer: true, analysis: "S_n = n · (a1 + an)/2。" },
          { id: "q3", type: "fill", score: 10, question: "等差数列 4, 7, 10, … 的公差是 ______。", answer: "3", analysis: "7 - 4 = 3。" },
          { id: "q4", type: "subjective", score: 30, question: "用首尾配对的办法推出等差数列前 n 项和的公式，并用它求 1 + 2 + … + 100。", answer: "正倒两行配对，每对和为 a1 + an，共 n 对，除以 2；结果 5050。", analysis: "要点：配对、n 对、除以 2、5050。" }
        ] } }
  ],
  links: []
};

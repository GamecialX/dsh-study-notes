window.NOTES_DATA = {
  meta: { subject: "从零手搓自动求导", generatedAt: "2026-01-01 09:00", chapters: 1 },
  chapters: [
    { id: "c1", no: 1, title: "第 1 章 会求导的数", brief: "先造一把靠得住的尺子，再造一个会自己求导的数，最后用尺子量它。",
      sections: [
        { id: "c1s1", no: 1, title: "C1 Sec_1 工作台与数值导数", file: "/Cha_1 会求导的数/C1 Sec_1 工作台与数值导数.md",
          concepts: [{ n: 1, name: "数值导数" }, { n: 2, name: "单元测试" }],
          quiz: [
            { type: "choice", question: "用中心差分、取 $h=0.5$，估计 $f(x)=x^3$ 在 $x=1$ 处的导数，结果是多少？", options: ["3", "3.25", "3.5", "2.75"], answer: 1, analysis: "(1.5^3 - 0.5^3) / 1 = 3.25；多出的 0.25 是截断误差，恰好等于 h^2。" },
            { type: "judge", question: "判断：步长 $h$ 取得越小，`numeric_grad` 的结果就越接近真实导数。", answer: false, analysis: "h 太小时舍入误差上升，误差先降后升。" },
            { type: "fill", question: "在 `project/` 里直接运行 `python tests/test_numeric.py` 会报 `ModuleNotFoundError`，因为这时 Python 把 ______ 目录（而不是 `project/`）放进了模块搜索路径。", answer: "tests|tests/", analysis: "直接运行脚本时，脚本所在目录 tests/ 进入搜索路径，minigrad/ 在上一层。" }
          ] },
        { id: "c1s2", no: 2, title: "C1 Sec_2 会自己求导的 Value", file: "/Cha_1 会求导的数/C1 Sec_2 会自己求导的 Value.md",
          concepts: [{ n: 1, name: "计算图" }, { n: 2, name: "反向传播" }],
          quiz: [
            { type: "choice", question: "对 `c = a * b + a`（`a = 2`，`b = -3`）调用一次 `c.backward()` 后，`a.grad` 是多少？", options: ["-3", "1", "-2", "2"], answer: 2, analysis: "两条路径：乘法贡献 b = -3，相加贡献 1，合计 -2。" },
            { type: "judge", question: "判断：连续调用两次 `c.backward()` 后，`a.grad` 恰好是第一次的两倍，即 -4.0。", answer: false, analysis: "真实输出是 -7.0：中间节点 a*b 的 grad 也在累加。" },
            { type: "fill", question: "`_backward` 里写 `self.grad += …` 而不是 `self.grad = …`，是因为同一个 `Value` 可能有多条通往输出的路径，每条路径的梯度要 ______ 起来。", answer: "相加|累加|加", analysis: "多元链式法则：各条出边的贡献求和。" },
            { type: "calc", question: "对 $f(x, y) = xy + x^2 + 3$，在 $x = 1.5$、$y = -2$ 处手算 $\\frac{\\partial f}{\\partial x}$ 与 $\\frac{\\partial f}{\\partial y}$，并说明 `test_value.py` 为什么要同时用 `backward` 和 `numeric_grad` 算它们。", answer: "∂f/∂x = y + 2x = 1；∂f/∂y = x = 1.5。两条独立的路一致才能互相作证。", analysis: "backward 用链式法则精确求导，numeric_grad 用差商近似，二者互不依赖。" }
          ] }
      ],
      sheet: { file: "/Cha_1 会求导的数/C1 速查.md" },
      test: { title: "第 1 章 测试", file: "/Cha_1 会求导的数/C1 测试.md", total: 100,
        questions: [
          { id: "q1", type: "choice", score: 10, question: "中心差分估计 f'(x) 的公式是？", options: ["(f(x+h)-f(x))/h", "(f(x+h)-f(x-h))/(2h)", "(f(x+h)-f(x-h))/h", "(f(x)-f(x-h))/(2h)"], answer: 1, analysis: "A、D 是单侧差商，C 少除了 2。" },
          { id: "q2", type: "choice", score: 10, question: "让文件夹 minigrad/ 能被 import minigrad 导入，最少需要哪个文件？", options: ["setup.py", "main.py", "__init__.py", "check.py"], answer: 2, analysis: "有 __init__.py 的文件夹才是常规包。" },
          { id: "q3", type: "choice", score: 10, question: "对 out = a * b，_backward 里 a.grad 应加上什么？", options: ["out.grad", "b.data * out.grad", "a.data * out.grad", "b.grad"], answer: 1, analysis: "∂(ab)/∂a = b，再乘上游的 out.grad。" },
          { id: "q4", type: "choice", score: 10, question: "backward() 为什么要先做拓扑排序？", options: ["让输出更好看", "保证调用某节点的 _backward 时，它的 grad 已经收齐所有下游的贡献", "去掉重复节点以节省内存", "Python 的 set 要求有序"], answer: 1, analysis: "逆拓扑序保证下游先传完。" },
          { id: "q5", type: "judge", score: 10, question: "assertEqual 适合比较两个浮点计算结果。", answer: false, analysis: "浮点有舍入误差，应用 assertAlmostEqual。" },
          { id: "q6", type: "judge", score: 10, question: "Value 的 _prev 存的是算出它的那几个输入节点。", answer: true, analysis: "_prev 就是计算图里指向它的边的起点。" },
          { id: "q7", type: "fill", score: 10, question: "backward() 开始时，把输出节点自己的 grad 设为 ______。", answer: "1|1.0", analysis: "∂c/∂c = 1。" },
          { id: "q8", type: "subjective", score: 30, question: "对 c = a * b + a 连续调用两次 c.backward()，a.grad 变成 -7.0 而不是 -2.0。解释原因，并给出一种修法。", answer: "+= 累加；中间节点 a*b 的 grad 未清零；每次 backward 前清零或重建 Value。", analysis: "累加 10 分；中间节点未清零的推算 10 分；修法 10 分。" }
        ] } }
  ],
  links: [["数值导数", "单元测试"], ["计算图", "反向传播"], ["数值导数", "反向传播"]]
};

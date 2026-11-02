---
subject: 从零手搓自动求导
chapter: 1
section: 1
status: 未开始
tags: [从零手搓自动求导, 节笔记]
---

# C1 Sec_1 工作台与数值导数

> <b>*Note*</b>
> 本节导读
>
> <b>你现在手上</b>：一个空文件夹。没有任何代码，也还不需要懂任何框架。
>
> <b>本节结束时</b>：`project/` 里多出 4 个文件：能被 `import` 的包 `minigrad/`（`__init__.py` 与 `numeric.py`）、随手验证用的草稿纸 `check.py`、一份测试 `tests/test_numeric.py`。你能用一条命令估出任意函数在某点的导数，并用另一条命令核对它。
>
> 学完你能：
>
> 1. 从空目录搭出一个能 `import` 的 Python 包，并说清每个文件干什么；
> 2. 手算并用代码估出一个导数，解释为什么代码给出的不是精确的 6；
> 3. 写出一条单元测试，读懂它失败时的输出并修好它。
>
> <b>前置</b>：会写 Python 函数与 `lambda`；知道导数是函数图像在某点的斜率。
> <b>预计用时</b>：45 分钟 ｜ <b>难度</b>：入门

## 接上一节

<b>上一节做到</b>：这是全课第一节，还没有上一节。你手上只有一个空的笔记根目录。

<b>留下的坑</b>：整门课要从零写一个会自动求导的小框架。可"自动"算出来的导数对不对，拿什么来核对？没有一把尺子，后面每一步都只能靠"看起来像"。

<b>本节补上</b>：先造这把尺子。用最笨、但一定靠得住的办法（数值导数）估导数，再把"核对"写成一条随时能重跑的测试。下一节写的自动求导，就拿这把尺子来量。

这门课的代码全部由你自己在笔记根目录下的 `project/` 里敲出来，从空文件夹开始。每一步都告诉你新建哪个文件、改哪几行、跑什么命令、应该看到什么。

## 第 1 步：建出能 import 的空包

<b>动手</b>：在笔记根目录下新建文件夹 `project/`，再在里面新建文件夹 `minigrad/`，然后写下面两个文件。

【新建】`project/minigrad/__init__.py`

```python
"""minigrad：从零手搓的自动求导小框架。"""

__version__ = "0.1.0"
```

【新建】`project/check.py`

```python
import minigrad

print("minigrad", minigrad.__version__)
```

【运行】在 `project/` 里：

```bash
python check.py
```

<!-- output: code/out/c1s1-1.txt -->
```text
minigrad 0.1.0
```

<b>为什么这样做</b>：文件夹里有了 `__init__.py`，Python 就把它当成一个包，`import minigrad` 时执行的正是这个文件，所以能读到 `__version__`。`check.py` 和 `minigrad/` 并排放在 `project/` 根上：Python 运行一个脚本时会把脚本所在的目录加进模块搜索路径，`check.py` 因此一定找得到旁边的 `minigrad/`。它是你的草稿纸，以后每加一个功能，就往里加一两行打印，跑一下看一眼。

## 第 2 步：用差商估一个导数

先不写代码，手算一次。$f(x)=x^2$ 在 $x=3$ 处的导数是 $f'(3)=2\times3=6$。如果不会求导公式，还能怎么得到这个 6？在 3 的左右各走一小步，看函数值变了多少。

### 概念 1：数值导数

<b>一句话</b>：不推公式，直接在 $x$ 两侧各取一个很近的点，用两点连线的斜率近似导数。

> <b>*Note*</b>
> 数值导数（中心差分）的定义
>
> 对在 $x$ 附近可导的函数 $f$ 和一个小步长 $h>0$：
>
> $$
> f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}
> $$
>
> 当 $f$ 三阶可导时，截断误差与 $h^2$ 同阶。

<b>例子</b>：$f(x)=x^2$，$x=3$，$h=0.1$：

$$
\frac{3.1^2 - 2.9^2}{0.2} = \frac{9.61 - 8.41}{0.2} = 6
$$

对二次函数，中心差分在数学上恰好没有截断误差。

> <b>*Warning*</b>
> 易错点
>
> $h$ 不是越小越好。$h$ 太小时 $f(x+h)$ 与 $f(x-h)$ 几乎相等，相减会丢掉大部分有效数字（舍入误差），结果反而变差。双精度浮点数下，$h$ 取 $10^{-5}$ 左右是常用的折中。

把公式写成框架里的第一个函数。

【新建】`project/minigrad/numeric.py`

```python
def numeric_grad(f, x, h=1e-5):
    """用中心差分估计 f 在 x 处的导数。"""
    return (f(x + h) - f(x - h)) / (2 * h)
```

【修改】`project/minigrad/__init__.py`：让 `minigrad.numeric_grad` 能直接用。

```diff
 """minigrad：从零手搓的自动求导小框架。"""

+from .numeric import numeric_grad
+
 __version__ = "0.1.0"
```

【修改】`project/check.py`：在最后加一行。

```diff
 print("minigrad", minigrad.__version__)
+print("d(x*x)/dx at x=3:", minigrad.numeric_grad(lambda x: x * x, 3.0))
```

> <b>*Tip*</b>
> 先猜一猜
>
> 刚才手算出来恰好是 6。这一行会打印 `6.0` 吗？先写下你的答案，再运行。

【运行】在 `project/` 里：

```bash
python check.py
```

<!-- output: code/out/c1s1-2.txt -->
```text
minigrad 0.1.0
d(x*x)/dx at x=3: 6.000000000039306
```

<b>为什么不是 6.0</b>：数学上中心差分对 $x^2$ 没有误差，但计算机里的 $3.00001^2$ 和 $2.99999^2$ 都只能近似存储，两个很接近的数相减再除以很小的 $2h$，舍入误差被放大到了第 11 位小数。这不是 bug，是数值导数的本性。记住这个 `6.000000000039306`，下一步它会让一条测试失败。

<b>动手</b>（选做）：打开 `code/notebooks/C1_差商的步长.ipynb`，逐格运行，把 $h$ 从 $10^{-1}$ 一路缩到 $10^{-12}$，看误差先变小、后变大。notebook 只用来玩数，框架代码只写在 `project/` 里。

## 第 3 步：把核对写成一条测试

每次都用眼睛看 `check.py` 的输出，项目一大就看不过来。把"导数应该是 6"写成一条程序自己会检查的断言。

【新建】`project/tests/test_numeric.py`

```python
import unittest

from minigrad import numeric_grad


class TestNumericGrad(unittest.TestCase):
    def test_square(self):
        self.assertEqual(numeric_grad(lambda x: x * x, 3.0), 6.0)


if __name__ == "__main__":
    unittest.main()
```

【运行】在 `project/` 里：

```bash
python -m unittest discover -s tests -v
```

<!-- output: code/out/c1s1-3.txt -->
```text
test_square (test_numeric.TestNumericGrad.test_square) ... FAIL

======================================================================
FAIL: test_square (test_numeric.TestNumericGrad.test_square)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests/test_numeric.py", line 8, in test_square
    self.assertEqual(numeric_grad(lambda x: x * x, 3.0), 6.0)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 6.000000000039306 != 6.0

----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (failures=1)
```

现在测试是坏的：它要求结果<b>恰好</b>等于 `6.0`，而上一步你已经亲眼看到结果是 `6.000000000039306`。

### 概念 2：单元测试

<b>一句话</b>：一小段自动检查"某个函数在某个输入上应该给出某个结果"的代码，跑一次就告诉你哪条对、哪条错。

> <b>*Note*</b>
> 单元测试的定义
>
> 单元测试是针对最小可测单元（一个函数或一个类）的自动化检查：给定输入，断言（assert）输出满足预期。Python 标准库的 `unittest` 会自动找出 `tests/` 里以 `test` 开头的文件和方法，逐个运行并汇报 `ok` / `FAIL`。

<b>例子</b>：上面的 `test_square` 就是一条单元测试。`FAIL` 那几行告诉你三件事：哪条测试失败、失败在哪一行、期望值和实际值各是多少。

> <b>*Warning*</b>
> 易错点
>
> 浮点数不要用 `assertEqual` 比较，要用 `assertAlmostEqual(实际, 期望, places=n)`：它只比较到小数点后第 n 位。还有，不要在 `project/` 里直接运行 `python tests/test_numeric.py`：那样 Python 只把 `tests/` 加进搜索路径，找不到旁边的 `minigrad/`，会报 `ModuleNotFoundError`。

【修改】`project/tests/test_numeric.py`：改成近似比较，再加一条三次函数的测试。

```diff
     def test_square(self):
-        self.assertEqual(numeric_grad(lambda x: x * x, 3.0), 6.0)
+        self.assertAlmostEqual(numeric_grad(lambda x: x * x, 3.0), 6.0, places=6)
+
+    def test_cube(self):
+        self.assertAlmostEqual(numeric_grad(lambda x: x ** 3, 2.0), 12.0, places=6)
```

【运行】在 `project/` 里：

```bash
python -m unittest discover -s tests -v
```

<!-- output: code/out/c1s1-4.txt -->
```text
test_cube (test_numeric.TestNumericGrad.test_cube) ... ok
test_square (test_numeric.TestNumericGrad.test_square) ... ok

----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
```

<b>为什么这样做</b>：`places=6` 表示只要前 6 位小数相同就算通过，这正好容下数值导数的舍入误差，又足够严格，算错公式（比如漏了除以 2）一定会被抓住。`python -m unittest discover -s tests` 在 `project/` 里运行时，当前目录（`project/`）在搜索路径上，所以测试里的 `from minigrad import …` 能找到包。以后每加一个功能，就加一条测试，这条命令就是整个项目的体检。

## 本节小结

> <b>*Tip*</b>
> 记住这些
>
> 1. 文件夹里有 `__init__.py` 才是包；`import minigrad` 执行的就是它。
> 2. 中心差分 $\frac{f(x+h)-f(x-h)}{2h}$ 不用推公式就能估导数，是后面检验自动求导的尺子。
> 3. $h$ 太大有截断误差，太小有舍入误差，$10^{-5}$ 左右是折中。
> 4. 浮点结果用 `assertAlmostEqual` 比较，不用 `assertEqual`。
> 5. 在 `project/` 里运行 `python -m unittest discover -s tests -v`，一条命令跑完全部测试。

<b>留给下一节</b>：尺子有了，但它很贵：每估一个导数就要把 $f$ 多算两遍。一个有一百万个参数的模型，估一遍全部导数要算两百万遍。下一节在 `project/minigrad/` 里新建 `value.py`，让数在计算时自己记账，算完一遍就能倒推出所有导数，再拿本节的 `numeric_grad` 来量它。

## 本节练习

**1.** 用中心差分、取 $h=0.5$，估计 $f(x)=x^3$ 在 $x=1$ 处的导数，结果是多少？

A. 3　B. 3.25　C. 3.5　D. 2.75

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：B
>
> <b>解析</b>：$\frac{1.5^3 - 0.5^3}{2\times0.5} = \frac{3.375-0.125}{1} = 3.25$。真实导数是 3，多出的 0.25 正是截断误差：对三次函数它恰好等于 $h^2 = 0.25$。选 A 的同学把近似值当成了精确值。

**2.** 判断：步长 $h$ 取得越小，`numeric_grad` 的结果就越接近真实导数。

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：错误
>
> <b>解析</b>：$h$ 缩小时截断误差下降，但舍入误差上升。$h$ 小到 $10^{-12}$ 左右时，$f(x+h)$ 与 $f(x-h)$ 的差只剩几位有效数字，结果会明显变差。notebook `C1_差商的步长` 里能亲眼看到这个先降后升。

**3.** 在 `project/` 里直接运行 `python tests/test_numeric.py` 会报 `ModuleNotFoundError`，因为这时 Python 把 ______ 目录（而不是 `project/`）放进了模块搜索路径。

> <b>*Note*</b>
> 答案与解析
>
> <b>答案</b>：tests
>
> <b>解析</b>：直接运行脚本时，Python 把脚本所在目录加进搜索路径，也就是 `tests/`，而 `minigrad/` 在它的上一层。用 `python -m unittest discover -s tests` 时当前目录 `project/` 在路径上，就找得到。

## 概念索引

1. [数值导数](#概念-1-数值导数)
2. [单元测试](#概念-2-单元测试)

---

返回大纲：[00 大纲](../00%20%E5%A4%A7%E7%BA%B2.md) · 本章速查：[C1 速查](C1%20%E9%80%9F%E6%9F%A5.md) · 下一节：[C1 Sec_2 会自己求导的 Value](C1%20Sec_2%20%E4%BC%9A%E8%87%AA%E5%B7%B1%E6%B1%82%E5%AF%BC%E7%9A%84%20Value.md)

import unittest

from minigrad import Value, numeric_grad


def f(x, y):
    return x * y + x * x + 3


class TestBackward(unittest.TestCase):
    def test_matches_numeric_grad(self):
        x, y = Value(1.5), Value(-2.0)
        out = f(x, y)
        out.backward()
        self.assertAlmostEqual(x.grad, numeric_grad(lambda t: f(t, -2.0), 1.5), places=6)
        self.assertAlmostEqual(y.grad, numeric_grad(lambda t: f(1.5, t), -2.0), places=6)


if __name__ == "__main__":
    unittest.main()

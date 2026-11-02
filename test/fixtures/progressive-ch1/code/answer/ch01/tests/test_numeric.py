import unittest

from minigrad import numeric_grad


class TestNumericGrad(unittest.TestCase):
    def test_square(self):
        self.assertAlmostEqual(numeric_grad(lambda x: x * x, 3.0), 6.0, places=6)

    def test_cube(self):
        self.assertAlmostEqual(numeric_grad(lambda x: x ** 3, 2.0), 12.0, places=6)


if __name__ == "__main__":
    unittest.main()

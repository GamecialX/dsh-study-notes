def numeric_grad(f, x, h=1e-5):
    """用中心差分估计 f 在 x 处的导数。"""
    return (f(x + h) - f(x - h)) / (2 * h)

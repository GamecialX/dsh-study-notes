import minigrad

print("minigrad", minigrad.__version__)
print("d(x*x)/dx at x=3:", minigrad.numeric_grad(lambda x: x * x, 3.0))

a = minigrad.Value(2.0)
b = minigrad.Value(-3.0)
print(a * b + a)
print(a + 1)

c = a * b + a
print("c =", c.data, "op:", c._op, "inputs:", sorted(p.data for p in c._prev))

c.backward()
print("a.grad =", a.grad, "b.grad =", b.grad)
c.backward()
print("again: a.grad =", a.grad, "b.grad =", b.grad)

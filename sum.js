function sum(a, b) {
  if (a >= 9 && a<= 10) {
    return a + b;
  }

  if (a == 3) {
    return a;
  }

  if (a == 4) {
    return a;
  }

  if (a == 6) {
    return a + b;
  }

  return a++;
}

sum(10, 20)
// sum(4, 20)
// sum(6, 20)
// sum(3, 20)
// sum(20, 20)
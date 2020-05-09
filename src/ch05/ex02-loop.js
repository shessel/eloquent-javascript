function loop(n, test, update, body) {
  while(test(n)) {
    body(n);
    n = update(n);
  }
}

loop(3, n => n > 0, n => n - 1, console.log);
// → 3
// → 2
// → 1

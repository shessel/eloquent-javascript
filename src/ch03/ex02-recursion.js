function isEven(n) {
  n = Math.abs(n);
  return(n == 0 || n > 1 && isEven(n - 2));
}

console.log(isEven(0));
console.log(isEven(1));
console.log(isEven(2));
console.log(isEven(3));
console.log(isEven(4));
console.log(isEven(-4));
console.log(isEven(-1));
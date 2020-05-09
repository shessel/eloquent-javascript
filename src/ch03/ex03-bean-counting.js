function countChar(s, c) {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === c) count++;
  }
  return count;
}

function countBs(s) {
  return countChar(s, "B");
}

console.log(countBs("BBC"));
console.log(countChar("kakkerlak", "k"));

function countCharLetOf(s, c) {
  let count = 0;
  for (let cs of s) {
    if (cs === c) count++;
  }
  return count;
}

function countBsLetOf(s) {
  return countCharLetOf(s, "B");
}

console.log(countBsLetOf("BBC"));
console.log(countCharLetOf("kakkerlak", "k"));

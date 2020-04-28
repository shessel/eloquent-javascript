function arrayToList(array) {
  let rest = null;
  for (let value of array.reverse()) {
    rest = {value, rest};
  }
  return rest;
}

function listToArray(rest) {
  let array = [];
  while (rest) {
    array.push(rest.value);
    rest = rest.rest;
  }
  return array;
}

function prepend(value, rest) {
  return {value, rest};
}

function nth(rest, n) {
  if (!rest) {
    return undefined;
  } else if (n == 0) {
    return rest.value;
  } else {
    return nth(rest.rest, n -1);
  }
}

console.log(arrayToList([10, 20]));
// → {value: 10, rest: {value: 20, rest: null}}
console.log(listToArray(arrayToList([10, 20, 30])));
// → [10, 20, 30]
console.log(prepend(10, prepend(20, null)));
// → {value: 10, rest: {value: 20, rest: null}}
console.log(nth(arrayToList([10, 20, 30]), 1));
// → 20

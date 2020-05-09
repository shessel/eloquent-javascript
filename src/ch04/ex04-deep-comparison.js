function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  
  if (a == null || typeof a != "object" ||
      b == null || typeof b != "object") {
    return false;
  }

  let aKeys = Object.keys(a);
  let bKeys = Object.keys(b);

  if (aKeys.length != bKeys.length) {
    return false;
  }

  for (let key of aKeys) {
    if (!bKeys.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    };
  }

  return true;
}

let obj = {here: {is: "an"}, object: 2};
console.log(deepEqual(obj, obj));
// → true
console.log(deepEqual(obj, {here: 1, object: 2}));
// → false
console.log(deepEqual(obj, {here: {is: "an"}, object: 2}));
// → true
console.log(deepEqual(true, obj));
// → false
console.log(deepEqual(true, false));
// → false
console.log(deepEqual(false, false));
// → true
console.log(deepEqual(1, false));
// → false
console.log(deepEqual(1, true));
// → false
console.log(deepEqual(1, 5));
// → false
console.log(deepEqual(5, 5));
// → true
console.log(deepEqual(1, "1"));
// → false
console.log(deepEqual(null, "1"));
// → false
console.log(deepEqual(null, undefined));
// → false
console.log(deepEqual(null, null));
// → true
console.log(deepEqual(undefined, undefined));
// → true

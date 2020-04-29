require("./scripts.js");

function characterScript(char) {
  return SCRIPTS.find((script) => {
    return script.ranges.some(([lower, upper]) => {
      return char.codePointAt(0) >= lower && char.codePointAt(0) < upper;
    });
  });
}

console.log(characterScript("ر"));

function countBy(items, groupName) {
  result = [];
  for (item of items) {
    let name = groupName(item);
    let i = result.findIndex(group => group.name === name);
    if (i < 0) {
      result.push({name, count: 1});
    } else {
      result[i].count++;
    }
  }
  return result;
}

console.log(countBy([1, 2, 3, 4, 5], x => x > 2));

function dominantDirection(text) {
  let counts = countBy(text, char => {
    let script = characterScript(char);
    return script ? script.direction : "none";
  });

  let countsFiltered = counts.filter(c => c.name != "none");

  if (countsFiltered.length == 0) return "none";
  else return countsFiltered.reduce((a,b) => a.count < b.count ? b : a).name;
}

console.log(dominantDirection("Hello!"));
console.log(dominantDirection("!!!"));
// → ltr
console.log(dominantDirection("Hey, مساء الخير"));
// → rtl

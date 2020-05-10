const {bigOak} = require("./crow-tech");
const {anyStorage, network, storage} = require("./11_async");

async function locateScalpel(nest) {
  let target = nest.name;
  for (;;) {
    let next_target = await anyStorage(nest, target, "scalpel");
    if (target == next_target) return next_target;
    target = next_target;
  }
}

function locateScalpel2(nest) {
  function tryNext(target) {
    return anyStorage(nest, target, "scalpel")
      .then(value => {
        if (value == target) return value;
        else return tryNext(value);
      });
  }
  return tryNext(nest.name);
}

locateScalpel(bigOak).then(console.log);
// → Butcher Shop
locateScalpel2(bigOak).then(console.log);
// → Butcher Shop

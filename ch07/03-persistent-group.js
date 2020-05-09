class PGroup {
  constructor(values = []) {
    this.values = values;
  }

  has (value) {
    return this.values.includes(value);
  }

  add (value) {
    if (this.has(value)) return this;
    else return new PGroup([...this.values, value]);
  }

  delete (value) {
    if (!this.has(value)) return this;
    else return new PGroup(this.values.filter(v => v != value));
  }
}
PGroup.empty = new PGroup();

let a = PGroup.empty.add("a");
let ab = a.add("b");
let b = ab.delete("a");

console.log(b.has("b"));
// → true
console.log(a.has("b"));
// → false
console.log(b.has("a"));
// → false

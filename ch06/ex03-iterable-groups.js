class GroupIterator {
  constructor(group) {
    this.group = group;
    this.index = 0;
  }

  next() {
    if (this.index >= this.group.values.length) return {done: true};
    else return {value: this.group.values[this.index++], done: false};
  }
}

class Group {
  constructor() {
    this.values = [];
  }

  has (value) {
    return this.values.includes(value);
  }

  add (value) {
    if (!this.has(value)) {
      this.values.push(value);
    }
  }

  delete (value) {
    if (this.has(value)) {
      this.values.splice(this.values.indexOf(value), 1);
    }
  }

  static from(input) {
    let group = new Group();
    input.forEach(element => group.add(element));
    return group;
  }

  [Symbol.iterator]() {
    return new GroupIterator(this);
  }
}

for (let value of Group.from(["a", "b", "c"])) {
  console.log(value);
}
// → a
// → b
// → c

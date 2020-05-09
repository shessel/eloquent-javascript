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
}

let group = Group.from([10, 20]);
console.log(group.has(10));
// → true
console.log(group.has(30));
// → false
group.add(10);
group.delete(10);
console.log(group.has(10));
// → false

const roads = [
  "Alice's House-Bob's House",   "Alice's House-Cabin",
  "Alice's House-Post Office",   "Bob's House-Town Hall",
  "Daria's House-Ernie's House", "Daria's House-Town Hall",
  "Ernie's House-Grete's House", "Grete's House-Farm",
  "Grete's House-Shop",          "Marketplace-Farm",
  "Marketplace-Post Office",     "Marketplace-Shop",
  "Marketplace-Town Hall",       "Shop-Town Hall"
];

function buildGraph(roads) {
  let graph = Object.create(null);
  let add = (v0, v1) => {
    if (graph[v0]) graph[v0].push(v1);
    else graph[v0] = [v1];
  }
  roads.map(r => r.split('-')).forEach(([from, to]) => {
    add(from, to);
    add(to, from);
  });
  return graph;
}

let roadGraph = buildGraph(roads);
console.log(roadGraph);

class VillageState {
  constructor(place, parcels) {
    this.place = place;
    this.parcels = parcels;
  }

  static random(parcelCount = 5) {
    let parcels = [];
    for (let i = 0; i < parcelCount; i++) {
      let place = randomPick(Object.keys(roadGraph));
      let address;
      do {
        address = randomPick(Object.keys(roadGraph));
      } while (address == place);
      parcels.push({place, address});
    }
    return new VillageState("Post Office", parcels);
  }

  move(to) {
    if (!roadGraph[this.place].includes(to)) return this;
    
    let parcels = this.parcels.map(({place, address}) => ({ place: (place == this.place ? to : place), address}))
                              .filter(({place, address}) => place != address);

    return new VillageState(to, parcels);
  }
}

let first = new VillageState(
  "Post Office",
  [{place: "Post Office", address: "Alice's House"}]
);
let next = first.move("Alice's House");

console.log(next.place);
// → Alice's House
console.log(next.parcels);
// → []
console.log(first.place);
// → Post Office

function runRobot(state, robot, memory) {
  let turn = 0;
  while (state.parcels.length) {
    let action = robot(state, memory);
    state = state.move(action.direction);
    memory = action.memory;
    console.log(`Moved to ${action.direction}`);
    turn++;
  }
  console.log(`Finished in ${turn} turns`);
}

function randomPick(array) {
  return array[Math.floor(Math.random()*array.length)];
}

function randomRobot(state) {
  return {direction: randomPick(roadGraph[state.place])};
}

runRobot(VillageState.random(), randomRobot);

const mailRoute = [
  "Alice's House", "Cabin", "Alice's House", "Bob's House",
  "Town Hall", "Daria's House", "Ernie's House",
  "Grete's House", "Shop", "Grete's House", "Farm",
  "Marketplace", "Post Office"
];

function routeRobot(state, memory) {
  if (memory.length == 0) memory = mailRoute;
  return {direction: memory[0], memory: memory.slice(1)};
}

runRobot(VillageState.random(), routeRobot, mailRoute);

function findRoute(graph, from, to) {
  let visited = [];
  let queue = [{at: from, route: []}];

  while (queue.length > 0) {
    let {at, route} = queue[0];
    route.push(at);

    if (at == to) return route;

    for (let dest of graph[at].filter(p => !visited.includes(p))) {
      queue.push({at: dest, route: [...route]});
    }

    visited.push(at);
    queue = queue.slice(1);
  }
}

console.log(findRoute(roadGraph, "Alice's House", "Town Hall"));

function goalOrientedRobot({place, parcels}, memory) {
  if (memory.length == 0) {
    let next = parcels[0];
    if (place != next.place) memory = findRoute(roadGraph, place, next.place);
    else memory = findRoute(roadGraph, place, next.address);
  }

  return {direction: memory[0], memory: memory.slice(1)};
}

runRobot(VillageState.random(), goalOrientedRobot, []);

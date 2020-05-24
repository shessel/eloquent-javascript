class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  neg() {
    return new Vector(-this.x, -this.y);
  }

  scaleScalar(factor) {
    return new Vector(this.x*factor, this.y*factor);
  }

  scaleVec(other) {
    return new Vector(this.x*other.x, this.y*other.y);
  }
}

function doActorsOverlap(actorA, actorB) {
  let topLeftA = actorA.pos;
  let bottomRightA = actorA.pos.add(actorA.size);

  let topLeftB = actorB.pos;
  let bottomRightB = actorB.pos.add(actorB.size);

  return topLeftA.x <= bottomRightB.x
    && topLeftA.y <= bottomRightB.y
    && topLeftB.x <= bottomRightA.x
    && topLeftB.y <= bottomRightA.y;
}

class Player {
  constructor (pos, vel) {
    this.pos = pos;
    this.vel = vel;
  }

  static speed = 7;
  static jumpVel = 17;
  static gravity = 30;

  update(dt, level, keyState) {
    let pos = this.pos;
    let velX = 0;
    if (keyState.ArrowLeft) velX = -1;
    if (keyState.ArrowRight) velX += 1;
    velX = Math.min(1, Math.max(-1, velX)) * Player.speed;
    let newX = pos.add(new Vector(velX*dt, 0));
    if (!level.getTouchedMapTypes(newX, this.size).includes("wall")) {
      pos = newX;
    }

    let velY = Math.min(this.vel.y + Player.gravity*dt, Player.gravity);
    let newY = pos.add(new Vector(0, dt*velY));
    if (!level.getTouchedMapTypes(newY, this.size).includes("wall")) {
      pos = newY;
    } else if (keyState.ArrowUp && velY > 0) {
      velY = -Player.jumpVel;
    } else {
      velY = 0;
    }
    return new Player(pos, new Vector(velX, velY));
  }

  static create(pos) {
    const cellSize = new Vector(1,1);
    let offset = Player.prototype.size.sub(cellSize).scaleVec(new Vector(0.5,1));

    pos = pos.sub(offset.add(new Vector(0,0.01)));
    return new Player(pos, new Vector(0,0));
  }
}
Player.prototype.size = new Vector(0.8, 1.5);
Player.prototype.type = "player";

class Lava {
  constructor (pos, vel, reset) {
    this.pos = pos;
    this.vel = vel;
    if (reset) this.reset = reset;
  }

  update(dt, level) {
    let vel = this.vel;
    let pos = this.pos.add(vel.scaleScalar(dt));
    if (level.getTouchedMapTypes(pos, this.size).includes("wall")) {
      if (this.reset) {
        pos = this.reset;
      } else {
        vel = vel.scaleScalar(-1);
        pos = pos.add(vel.scaleScalar(dt));
      }
    }
    return new Lava(pos, vel, this.reset);
  }

  static create(pos, char) {
    if (char == "=") return new Lava(pos, new Vector(2, 0));
    else if (char == "|") return new Lava(pos, new Vector(0, 2));
    else if (char == "v") return new Lava(pos, new Vector(0, 3), pos);
  }
}
Lava.prototype.size = new Vector(1, 1);
Lava.prototype.type = "lava";

class Coin {
  constructor(pos, basePos, phase) {
    this.pos = pos;
    this.basePos = basePos;
    this.phase = phase;
    this.active = true;
    this.wobbleAmount = Coin.prototype.size.y * Coin.wobbleFac;
  }

  static wobbleFreq = 8;
  static wobbleFac = 0.15;

  update(dt) {
    let phase = this.phase + dt * Coin.wobbleFreq;
    let pos = this.basePos.add(new Vector(0, Math.sin(phase) * this.wobbleAmount));
    return new Coin(pos, this.basePos, phase);
  }

  static create(pos) {
    const cellSize = new Vector(1,1);
    const offset = Coin.prototype.size.sub(cellSize).scaleVec(new Vector(0.5,0.5));
    
    pos = pos.sub(offset);
    return new Coin(pos, pos, Math.random()*2*Math.PI);
  }
}
Coin.prototype.size = new Vector(0.6, 0.6);
Coin.prototype.type = "coin";

class State {
  constructor(level, actors, state) {
    this.level = level;
    this.actors = actors;
    this.state = state;
    this.coinCount = this.actors.filter(actor => actor.type == "coin").length;
  }

  static start(level) {
    return new State(level, level.actors, "playing");
  }

  get player() {
    return this.actors.find(actor => actor.type == "player");
  }

  update(dt, keyState) {
    let state = this.state;
    let actors = this.actors.map(actor => actor.update(dt, this.level, keyState));
      
    if (state == "playing") {
      let player = this.player;
      if (this.level.getTouchedMapTypes(player.pos, player.size).includes("lava")) {
        return new State(this.level, actors, "lost");
      }

      actors.filter(actor => actor != player)
        .forEach(actor => {
          if (doActorsOverlap(player, actor)) {
            if (actor.type == "coin") {
              actor.active = false;
              this.coinCount -= 1;
              if (this.coinCount == 0) {
                state = "won";
              }
            }
            if (actor.type == "lava") {
              state = "lost";
            }
          }
        });
      actors = actors.filter(actor => actor.type != "coin" || actor.active);
    }
    return new State(this.level, actors, state);
  }
}

class Level {
  constructor(description) {
    this.actors = [];
    this.map = description.trim().split("\n").map(line => [...line]);
    this.height = this.map.length;
    this.width = this.map[0].length;
    this.map = this.map.map((row, y) => {
      return row.map((char, x) => {
        let type = this.charsToType[char];
        if (typeof type == "string") return type;
        this.actors.push(type.create(new Vector(x,y), char));
        return "empty";
      })
    });
  }

  getTouchedMapTypes(pos, size) {
    let min = new Vector(
      Math.floor(pos.x),
      Math.floor(pos.y)
    );
    let max = new Vector(
      Math.ceil(pos.x + size.x),
      Math.ceil(pos.y + size.y)
    );
    let result = [];
    for (let y = min.y; y < max.y; y++) {
      for (let x = min.x; x < max.x; x++) {
        let type = "wall";
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          type = this.map[y][x];              
        }
        if (!result.includes(type)) result.push(type);
      }
    }
    return result;
  }
}
Level.prototype.charsToType = {
  ".": "empty",
  "#": "wall",
  "@": Player,
  "o": Coin,
  "+": "lava",
  "=": Lava,
  "|": Lava,
  "v": Lava
};

function createElement(type, attributes, ...children) {
  let el = document.createElement(type);
  for (let attr of Object.keys(attributes)) {
    el.setAttribute(attr, attributes[attr]);
  }
  for (let child of children) {
    el.appendChild(child);
  }
  return el;
}

class DomRenderer {
  constructor(level, parent) {
    this.level = level;
    this.container = createElement("div", {class: "game"}, this.drawBackground(level));
    parent.appendChild(this.container);
  }

  clear() {
    this.container.remove();
  }

  static scale = 20;

  drawBackground(level) {
    return createElement("table", {
        class: "background",
        style: `width: ${level.width*DomRenderer.scale}px; height: ${level.heigh**DomRenderer.scale}px;`
      }, ...level.map.map(row => {
      return createElement("tr", {}, ...row.map(cell =>{
        return createElement("td", {class: cell});
      }));}
    ));
  }
  
  drawActors(actors) {
    let actorElements = actors.map(actor => {
      let style = "";
      style += `top: ${actor.pos.y*DomRenderer.scale}px;`
      style += `left: ${actor.pos.x*DomRenderer.scale}px;`
      style += `width: ${actor.size.x*DomRenderer.scale}px;`
      style += `height: ${actor.size.y*DomRenderer.scale}px;`
      return createElement("div", {
        class: `actor ${actor.type}`,
        style
        }
      );
    });
    return createElement("div", {class: "actors"}, ...actorElements);
  }

  scrollToPlayer(state) {
    let width = this.container.clientWidth;
    let height = this.container.clientHeight;
    let buffer = new Vector(width/3,height/3);

    let left = this.container.scrollLeft;
    let right = left + width;
    let top = this.container.scrollTop;
    let bottom = top + height;

    let center = state.player.pos.add(state.player.size.scaleScalar(0.5));
    center = center.scaleScalar(DomRenderer.scale);
    if (center.x < left + buffer.x) {
      this.container.scrollLeft = center.x - buffer.x;
    }
    else if (center.x > right - buffer.x) {
      this.container.scrollLeft = center.x - (width - buffer.x);
    }
    if (center.y < top + buffer.y) {
      this.container.scrollTop = center.y - buffer.y;
    }
    else if (center.y > bottom - buffer.y) {
      this.container.scrollTop = center.y - (height - buffer.y);
    }
  }

  draw(state) {          
    if (this.actorLayer) this.actorLayer.remove();
    this.actorLayer = this.drawActors(state.actors);
    this.scrollToPlayer(state);
    this.container.appendChild(this.actorLayer);
    this.container.className = `game ${state.state}`;
  }
}

class InputHandler {
  constructor() {
    this.keyState = Object.create(null);
    this.keyState["ArrowUp"] = false;
    this.keyState["ArrowLeft"] = false;
    this.keyState["ArrowRight"] = false;

    window.addEventListener("keydown", event => {
      if (Object.keys(this.keyState).includes(event.code)) {
        this.keyState[event.code] = true;
        event.preventDefault();
      };
    });
    window.addEventListener("keyup", event => {
      if (Object.keys(this.keyState).includes(event.code)) {
        this.keyState[event.code] = false;
        event.preventDefault();
      };
    });
  }
}

class Game {
  constructor(levels, renderer) {
    this.levels = levels.map(level => new Level(level));
    this.rendererType = renderer;
    this.inputHandler = new InputHandler();
  }

  update(dt) {
      this.state = this.state.update(dt, this.inputHandler.keyState);
      this.renderer.draw(this.state);
  }

  runLevel(level) {
    this.renderer = new this.rendererType(level, document.body);;
    this.state = State.start(level);
    return new Promise(resolve => {
      let last;
      let timeout = 1;
      let loop = time => {
        if (last) {
          let dt = 0.001 * (time - last);
          this.update(dt);
          if (this.state.state != "playing") {
            if (timeout > 0) timeout -= dt;
            else {
              this.renderer.clear();
              resolve(this.state.state);
              return;
            }
          }
        }
        last = time;
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    })
  }

  async run() {
    for (let level of this.levels) {
      for (let result; result != "won";) {
        result = await this.runLevel(level);
      }
    }
  }
}

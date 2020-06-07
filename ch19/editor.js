function elt(type, props, ...children) {
  let element = document.createElement(type);
  if (props) Object.assign(element, props);
  children.forEach(child => {
    if (typeof child == "string") element.appendChild(document.createTextNode(child));
    else element.appendChild(child)
  });
  return element;
}

class Picture {
  constructor(width, height, data) {
    this.width = width;
    this.height = height;
    this.data = data;
  }

  static empty(width, height, color) {
    let data = new Array(width * height).fill(color);
    return new Picture(width, height, data);
  }

  draw(data) {
    let newData = this.data.slice();
    for (let { pos: { x, y }, color } of data) {
      newData[y * this.width + x] = color;
    }
    return new Picture(this.width, this.height, newData);
  }

  drawLine(start, end, color, positions = []) {
    let width = end.x - start.x;
    let height = end.y - start.y;
    let steps = Math.max(Math.abs(width), Math.abs(height));

    positions.push({ x: start.x, y: start.y });

    for (let i = 1; i <= steps; i++) {
      let x = start.x + Math.floor(i * width / steps)
      let y = start.y + Math.floor(i * height / steps)
      positions.push({ x, y });
    }

    return this.fill(positions, color);
  }

  fill(positions, color) {
    let newData = this.data.slice();
    for (let { x, y } of positions) {
      newData[y * this.width + x] = color;
    }
    return new Picture(this.width, this.height, newData);
  }

  fillRect({ x: left, y: top }, { x: right, y: bottom }, color) {
    let newData = this.data.slice();
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        newData[y * this.width + x] = color;
      }
    }
    return new Picture(this.width, this.height, newData);
  }

  fillRectData({ x: left, y: top }, { x: right, y: bottom }, data) {
    let newData = this.data.slice();
    let i = 0;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        newData[y * this.width + x] = data[i++];
      }
    }
    return new Picture(this.width, this.height, newData);
  }

  pixel({ x, y }) {
    return this.data[y * this.width + x];
  }
}

const scale = 10;
class PictureCanvas {
  constructor(picture, onDown) {
    this.picture = picture;
    this.dom = elt("canvas", { width: picture.width * scale, height: picture.height * scale });
    this.dom.addEventListener("mousedown", event => {
      if ((event.buttons & 1) == 1) {
        let x = Math.floor(event.offsetX / scale);
        let y = Math.floor(event.offsetY / scale);
        let lastX = x, lastY = y;
        let onMove = onDown({ x, y });
        if (onMove) {
          let move = event => {
            if ((event.buttons & 1) == 0) {
              this.dom.removeEventListener("mousemove", move);
              this.dom.removeEventListener("mouseup", up);
              return;
            }
            let x = Math.floor(event.offsetX / scale);
            let y = Math.floor(event.offsetY / scale);
            if (x != lastX || y != lastY) {
              lastX = x; lastY = y;
              onMove({ x, y });
            }
          };
          this.dom.addEventListener("mousemove", move);
          let up = event => {
            if ((event.buttons & 1) == 0) {
              this.dom.removeEventListener("mousemove", move);
              this.dom.removeEventListener("mouseup", up);
            }
          }
          this.dom.addEventListener("mouseup", up);
        }
      }
    });
  }

  drawPicture() {
    let ctx = this.dom.getContext("2d");
    for (let y = 0; y < this.picture.height; y++) {
      for (let x = 0; x < this.picture.width; x++) {
        ctx.fillStyle = this.picture.pixel({ x, y });
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  syncState(picture) {
    this.picture = picture;
    this.drawPicture();
  }
}

function draw(pos, state, dispatch) {
  let params = [];
  let last = pos;
  const originalUndoStack = state.undoStack;
  function draw(pos, state) {
    // early out prevents pixels being saved as target color in undo stack
    // when they are passed over multiple times
    if (state.picture.pixel(pos) == state.color) return;

    let picture;

    // to get unbroken paths when drawing connect non-neighboring single pixels
    // by drawing a line between them
    if (Math.abs(last.x - pos.x) > 1 || Math.abs(last.y - pos.y) > 1) {
      let positions = [];
      picture = state.picture.drawLine(last, pos, state.color, positions);
      positions = positions.map(pos => ({ pos, color: state.picture.pixel(pos) })).filter(({ color }) => color != state.color);
      params = [...params, ...positions];
    } else {
      picture = state.picture.draw([{ pos, color: state.color }]);
      params.push({ pos, color: state.picture.pixel(pos) })
    }
    dispatch({
      picture,
      undoStack: [...originalUndoStack, { pictureOp: "draw", params: [params] }]
    });
    last = pos;
  }
  draw(pos, state);
  return draw;
}

function line(pos, state, dispatch) {
  let start = pos;
  function draw(pos) {
    let positions = [];
    const picture = state.picture.drawLine(start, pos, state.color, positions);
    positions = positions.map(pos => ({ pos, color: state.picture.pixel(pos) }));
    dispatch({
      picture,
      undoStack: [...state.undoStack, { pictureOp: "draw", params: [positions] }]
    });
  }
  draw(start);
  return draw;
}

function rect(pos, state, dispatch) {
  let start = pos;
  function drawRect(pos) {
    let topLeft = {
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
    };
    let bottomRight = {
      x: Math.max(start.x, pos.x),
      y: Math.max(start.y, pos.y),
    };
    let undoData = [];
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      const sliceStart = y * state.picture.width + topLeft.x;
      const sliceEnd = sliceStart + (bottomRight.x - topLeft.x + 1);
      undoData.push(...state.picture.data.slice(sliceStart, sliceEnd));
    }
    dispatch({
      picture: state.picture.fillRect(topLeft, bottomRight, state.color),
      undoStack: [...state.undoStack, { pictureOp: "fillRectData", params: [topLeft, bottomRight, undoData] }]
    });
  }
  drawRect(pos);
  return drawRect;
}

function fill(pos, state, dispatch) {
  const colorToReplace = state.picture.pixel(pos);
  if (state.color == colorToReplace) return;

  let positions = [pos];
  const w = state.picture.width;
  const h = state.picture.height;
  const offsets = [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  for (let i = 0; i < positions.length; i++) {
    let basePos = positions[i];
    for (let offset of offsets) {
      let pos = { x: basePos.x + offset.x, y: basePos.y + offset.y };
      if (pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h
        && state.picture.pixel(pos) == colorToReplace
        && !positions.some(({ x, y }) => x == pos.x && y == pos.y)) {
        positions.push(pos);
      }
    }
  }
  dispatch({
    picture: state.picture.fill(positions, state.color),
    undoStack: [...state.undoStack, { pictureOp: "fill", params: [positions, colorToReplace] }]
  });
}

function pick(pos, state, dispatch) {
  dispatch({ color: state.picture.pixel(pos), tool: state.previousTool });
}

class ColorSelect {
  constructor(state, { dispatch }) {
    this.input = elt("input", {
      type: "color",
      style: "vertical-align: middle;",
      value: state.color,
      onchange: event => dispatch({ color: event.target.value })
    });
    this.dom = elt("label", {}, "🎨", this.input);
  }

  syncState(state) {
    this.input.value = state.color;
  }
}

class ToolSelect {
  constructor(state, { tools, dispatch }) {
    this.previousTool = state.tool;
    this.select = elt("select",
      { onchange: event => dispatch({ tool: event.target.value, previousTool: this.previousTool }) },
      ...Object.keys(tools).map(tool => elt("option", { selected: state.tool == tool }, tool))
    );
    this.dom = elt("label", {}, "🛠", this.select);
  }

  syncState(state) {
    this.previousTool = state.tool;
    for (let child of this.select.children) {
      child.selected = child.childNodes[0].textContent == state.tool;
    }
  }
}

class UndoButton {
  constructor(state, { dispatch }) {
    this.dom = elt("button", {
      onclick: event => {
        if (this.undoStack.length == 0) return;
        const undoProp = this.undoStack[this.undoStack.length - 1]
        dispatch({
          picture: this.picture[undoProp.pictureOp](...undoProp.params),
          undoStack: this.undoStack.slice(0, this.undoStack.length - 1)
        })
      }
    },
      // ↷ Redo
      "↶ Undo");
  }

  syncState(state) {
    this.undoStack = state.undoStack;
    this.picture = state.picture;
  }
}

class SaveButton {
  constructor(state, { dispatch }) {
    this.dom = elt("button",
      {
        onclick: event => {
          var canvas = document.querySelector("canvas");
          var dataURL = canvas.toDataURL("image/png");
          var a = elt("a", { href: dataURL, download: "art.png" });
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }, "💾 Save")
  }

  syncState() { }
}

const baseTools = {
  draw,
  pick,
  fill,
  rect,
  line,
};

const baseState = {
  tool: "draw",
  color: "#ff0000",
  undoStack: [],
  picture: Picture.empty(32, 32, "#f0f0f0")
};

const baseControls = [
  ToolSelect,
  ColorSelect,
  UndoButton,
  SaveButton
];

const baseConfig = { controls: baseControls, tools: baseTools };

class PixelEditor {
  constructor(state = baseState, { controls, tools } = baseConfig) {
    let dispatch = (props) => {
      let newState = Object.assign({}, this.state, props);
      this.syncState(newState);
    };

    let onDown = pos => {
      const tool = tools[this.state.tool];
      let move = tool(pos, this.state, dispatch);
      if (move) { return pos => move(pos, this.state, dispatch) }
    }

    this.canvas = new PictureCanvas(state.picture, onDown);
    this.controls = controls.map(control => new control(state, { tools, dispatch }));
    this.dom = elt("div", {}, this.canvas.dom, elt("div", {}, ...this.controls.reduce((res, control) => [...res, "\u00A0\u00A0\u00A0\u00A0", control.dom], [])));
    this.syncState(state);
  }

  syncState(state) {
    this.state = state;
    this.canvas.syncState(this.state.picture);
    this.controls.forEach(control => control.syncState(this.state));
  }
}

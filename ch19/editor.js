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
    for (let {pos: {x, y}, color} of data) {
      newData[y*this.width + x] = color;
    }
    return new Picture(this.width, this.height, newData);
  }

  fill(positions, color) {
    let newData = this.data.slice();
    for (let {x, y} of positions) {
      newData[y*this.width + x] = color;
    }
    return new Picture(this.width, this.height, newData);
  }

  fillRect({x: left, y: top}, {x: right, y: bottom}, color) {
    let newData = this.data.slice();
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        newData[y*this.width + x] = color;
      }
    }
    return new Picture(this.width, this.height, newData);
  }

  pixel({x,y}) {
    return this.data[y*this.width + x];
  }
}

const scale = 10;
class PictureCanvas {
  constructor(picture, onDown) {
    this.picture = picture;
    this.dom = elt("canvas", {width: picture.width*scale, height: picture.height*scale});
    this.dom.addEventListener("mousedown", event => {
      if ((event.buttons & 1) == 1) {
        let x = Math.floor(event.offsetX/scale);
        let y = Math.floor(event.offsetY/scale);
        let onMove = onDown({x,y});
        if (onMove) {
          let move = event => {
            if ((event.buttons & 1) == 0) {
              this.dom.removeEventListener("mousemove", move);
              this.dom.removeEventListener("mouseup", up);
              return;
            }
            let x = Math.floor(event.offsetX/scale);
            let y = Math.floor(event.offsetY/scale);
            onMove({x,y});
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
        ctx.fillStyle = this.picture.pixel({x, y});
        ctx.fillRect(x*scale, y*scale, scale, scale);
      }
    }
  }

  syncState(picture) {
    this.picture = picture;
    this.drawPicture();
  }
}

function draw(pos, state, dispatch) { 
  function drawPixel(pos, state) {
    dispatch({picture: state.picture.draw([{pos, color: state.color}])});
  }
  drawPixel(pos, state);
  return drawPixel;
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
    dispatch({picture: state.picture.fillRect(topLeft, bottomRight, state.color)});
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
    {x: 0, y: -1},
    {x: -1, y: 0},
    {x: 1, y: 0},
    {x: 0, y: 1},
  ];
  for (let i = 0; i < positions.length; i++) {
    let basePos = positions[i];    
    for (let offset of offsets) {
      let pos = {x: basePos.x + offset.x, y: basePos.y + offset.y};
      if (pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h
          && state.picture.pixel(pos) == colorToReplace
          && !positions.some(({x, y}) => x == pos.x && y == pos.y)) {
        positions.push(pos);
      }
    }
  }
  dispatch({picture: state.picture.fill(positions, state.color)});
}

function pick(pos, state, dispatch) {
  dispatch({color: state.picture.pixel(pos), tool: state.previousTool});
}

function colorPicker(pos, state, dispatch) {
  dispatch({color: state.picture.pixel(pos)});
}

class ColorSelect {
  constructor(state, {dispatch}) {
    this.input = elt("label", {}, "🎨", elt("input", {
      type: "color",
      style: "vertical-align: middle;",
      value: state.color,
      onchange: event => dispatch({color: event.target.value})}));
    this.dom = this.input;
  }

  syncState(state) {
    this.input.value = state.color;
  }
}

class ToolSelect {
  constructor(state, {tools, dispatch}) {
    this.previousTool = state.tool;
    this.dom = elt("label", {}, "🛠", elt("select",
      {onchange: event => dispatch({tool: event.target.value, previousTool: this.previousTool})},
      ...Object.keys(tools).map(tool => elt("option", {selected: state.tool == tool}, tool))
    ));
  }

  syncState(state) {
    this.previousTool = state.tool;
    for (let child of this.dom.children) {
      child.selected = child.childNodes[0].textContent == state.tool;
    }
  }
}

class SaveButton {
  constructor(state, {dispatch}) {
    this.dom = elt("button",
    {
      onclick: event => {
        var canvas = document.querySelector("canvas");
        var dataURL = canvas.toDataURL("image/png");
        var a = elt("a", {href: dataURL, download: "art.png"});
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }, "💾 Save")
  }

  syncState() {}
}

const baseTools = {
  draw,
  pick,
  fill,
  rect,
};

const baseState = {
  tool: "draw",
  color: "#ff0000",
  picture: Picture.empty(32, 32, "#f0f0f0")
};

const baseControls = [
  ToolSelect,
  ColorSelect,
  SaveButton
];

const baseConfig = {controls: baseControls, tools: baseTools};

class PixelEditor {
  constructor(state = baseState, {controls, tools} = baseConfig) {
    let dispatch = (props) => {
      let newState = Object.assign({}, this.state, props);
      this.syncState(newState);
    };

    let onDown = pos => {
      const tool = tools[this.state.tool];
      let move = tool(pos, this.state, dispatch);
      if (move) { return pos => move(pos, this.state, dispatch)}
    }

    this.canvas = new PictureCanvas(state.picture, onDown);
    this.controls = controls.map(control => new control(state, {tools, dispatch}));
    this.dom = elt("div", {}, this.canvas.dom, elt("div", {}, ...this.controls.reduce((res, control) => [...res, "\u00A0\u00A0\u00A0\u00A0", control.dom], [])));
    this.syncState(state);
  }

  syncState(state) {
    this.state = state;
    this.canvas.syncState(this.state.picture);
    this.controls.forEach(control => control.syncState(this.state));
  }
}

const data = {
  points: [],
  regions: [],
  paths: [],
  places: [],
};

const COLOR_OCEAN = "#5a89a8";

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let context;
let camera = { x: 0.15, y: 0.15, zoom: 5000 };
let texts = [];

function tick() {}

function render() {
  texts = [];

  context.fillStyle = COLOR_OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);

  data.regions.forEach((region) => renderRegion(region));
  data.paths.forEach((path) => renderPath(path));
  data.places.forEach((place) => renderPlace(place));
  // data.points.forEach((point) => renderPoint(point));
  texts.forEach((text) => renderText(text));
}

function renderPoint(point) {
  context.beginPath();
  context.arc(...convertPoint(point), 3, 0, Math.PI * 2, false);
  context.fillStyle = "#000";
  context.fill();
}

function renderRegion(region) {
  const { points } = region;

  context.beginPath();
  context.moveTo(...convertPoint(getPointById(data.points, points[0])));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(getPointById(data.points, points[i])));
  }
  context.closePath();

  context.fillStyle = region.color;
  context.globalAlpha = region.opacity;
  context.fill();
  context.globalAlpha = 1.0;

  const center = getCenter(points);
  texts.push({
    text: region.name,
    x: center[0],
    y: center[1],
    font: "32pt Pretendard JP",
  });
}

function renderPath(path) {
  const { points } = path;

  context.beginPath();
  context.moveTo(...convertPoint(getPointById(data.points, points[0])));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(getPointById(data.points, points[i])));
  }

  context.strokeStyle = path.color;
  context.lineWidth = path.width;
  context.stroke();

  // label
  let align, baseline;
  let margin = { left: 0, right: 0, top: 0, bottom: 0 };
  // prettier-ignore
  for (let indexes of [[0, 1], [points.length - 1, points.length - 2]]) {
    margin = { left: 0, right: 0, top: 0, bottom: 0 };
    if (
      Math.abs(getPointById(data.points, points[indexes[0]]).x - getPointById(data.points, points[indexes[1]]).x)
      > Math.abs(getPointById(data.points, points[indexes[0]]).y - getPointById(data.points, points[indexes[1]]).y)
    ) {
      // horizontal
      baseline = "middle";
      if (getPointById(data.points, points[indexes[0]]).x < getPointById(data.points, points[indexes[1]]).x) {
        // to right
        align = "right";
        margin.right = 12;
      } else {
        // to left
        align = "left";
        margin.left = 12;
      }
    } else {
      // vertical
      align = "center";
      if (getPointById(data.points, points[indexes[0]]).y < getPointById(data.points, points[indexes[1]]).y) {
        // to bottom
        baseline = "bottom";
        margin.bottom = 12;
      } else {
        // to top
        baseline = "top";
        margin.top = 12;
      }
    }

    texts.push({
      text: path.name,
      x: convertPoint(getPointById(data.points, points[indexes[0]]))[0],
      y: convertPoint(getPointById(data.points, points[indexes[0]]))[1],
      font: "16pt Pretendard JP",
      align,
      baseline,
      margin,
    });
  }
}

function renderPlace(place) {
  const point = getPointById(data.points, place.point);

  context.beginPath();
  context.arc(...convertPoint(point), 8, 0, Math.PI * 2, false);
  context.fillStyle = "#ffec00";
  context.strokeStyle = "#000";
  context.lineWidth = 1;
  context.fill();
  context.stroke();

  texts.push({
    text: place.name,
    x: convertPoint(point)[0],
    y: convertPoint(point)[1],
    font: "16pt Pretendard JP",
    align: "left",
    margin: { left: 16 },
  });
}

function renderText(text) {
  context.beginPath();
  context.font = text.font;
  context.fillStyle = text.color || "#000";
  context.textAlign = text.align || "center";
  context.textBaseline = text.baseline || "middle";

  let margin = text.margin || {};
  let x = text.x + (margin.left || 0) - (margin.right || 0);
  let y = text.y + (margin.top || 0) - (margin.bottom || 0);

  context.fillText(text.text, x, y);
}

function getPointById(points, id) {
  return points.find((point) => point.id == id);
}

function convertPoint(point) {
  const x = (point.x - camera.x) * camera.zoom + canvas.width / 2;
  const y = (point.y - camera.y) * camera.zoom + canvas.height / 2;
  return [x, y];
}

function getCenter(pointIds) {
  const [xs, ys] = pointIds.reduce(
    (acc, id) => {
      const point = convertPoint(getPointById(data.points, pointIds[id]));
      acc[0].push(point[0]);
      acc[1].push(point[1]);

      return acc;
    },
    [[], []]
  );

  const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) / 2;
  const y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) / 2;

  return [x, y];
}

function onresize() {
  const dpr = window.devicePixelRatio;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  render();
}

window.addEventListener("resize", onresize);

let dragging = false;
function onmousedown(e) {
  if (e.which !== 1) {
    return;
  }

  dragging = true;
}

function onmouseup(e) {
  if (e.which !== 1) {
    return;
  }

  dragging = false;
}

function onmousemove(e) {
  if (!dragging) {
    return;
  }

  camera.x -= (e.movementX * window.devicePixelRatio) / camera.zoom;
  camera.y -= (e.movementY * window.devicePixelRatio) / camera.zoom;
  render();
}

function onwheel(e) {
  camera.zoom *= Math.exp(e.wheelDelta / 1000);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.querySelector("#canvas");
  context = canvas.getContext("2d");

  onresize();

  canvas.addEventListener("mousedown", onmousedown);
  canvas.addEventListener("mouseup", onmouseup);
  canvas.addEventListener("mousemove", onmousemove);
  canvas.addEventListener("wheel", onwheel);

  document.getElementById("import").addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file.name.split(".").pop() != "json") return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const json = JSON.parse(e.target.result);
      data.points = json.points || [];
      data.regions = json.regions || [];
      data.paths = json.paths || [];
      data.places = json.places || [];

      render();
    };

    reader.readAsText(file);
  });
});

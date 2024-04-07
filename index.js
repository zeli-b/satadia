const DATA = {
  points: [
    { id: 0, x: 0.1, y: 0.1 },
    { id: 1, x: 0.1, y: 0.2 },
    { id: 2, x: 0.2, y: 0.1 },
    { id: 3, x: 0.2, y: 0.2 },
    { id: 4, x: 0.15, y: 0.1 },
    { id: 5, x: 0.15, y: 0.2 },
    { id: 6, x: 0.15, y: 0.15 },
  ],
  regions: [
    {
      id: 0,
      layer: 0,
      points: [0, 4, 1, 3, 5, 2],
      name: "사각형",
      color: "#fdde59",
      opacity: 0.2,
    },
  ],
  paths: [
    {
      id: 0,
      layer: 1,
      points: [4, 6, 5],
      name: "직선",
      color: "black",
      width: 2,
    },
  ],
  places: [
    {
      id: 0,
      layer: 1,
      point: 6,
      name: "거점",
    },
  ],
};

const COLOR_OCEAN = "#5a89a8";

let canvas;
let context;
let camera = { x: 0.15, y: 0.15, zoom: 3000 };
let texts = [];

function tick() {}

function render() {
  texts = [];

  context.fillStyle = COLOR_OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);

  DATA.regions.forEach((region) => renderRegion(region));
  DATA.points.forEach((point) => renderPoint(point));
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
  context.moveTo(...convertPoint(getPointById(DATA.points, points[0])));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(getPointById(DATA.points, points[i])));
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
    font: "16pt Pretendard JP",
    color: "#000",
    align: "center",
    baseline: "middle",
  });
}

function renderText(text) {
  context.beginPath();
  context.font = text.font;
  context.fillStyle = text.color;
  context.textAlign = text.align;
  context.textBaseline = text.baseline;
  context.fillText(text.text, text.x, text.y);
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
      const point = convertPoint(getPointById(DATA.points, pointIds[id]));
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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  render();
}

window.addEventListener("resize", onresize);

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.querySelector("#canvas");
  context = canvas.getContext("2d");

  onresize();
});

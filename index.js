const POINTS = [
  { id: 0, x: 0.1, y: 0.1 },
  { id: 1, x: 0.1, y: 0.2 },
  { id: 2, x: 0.2, y: 0.1 },
  { id: 3, x: 0.2, y: 0.2 },
  { id: 4, x: 0.15, y: 0.1 },
  { id: 5, x: 0.15, y: 0.2 },
  { id: 6, x: 0.15, y: 0.15 },
];

const COLOR_OCEAN = "#5a89a8";

let canvas;
let context;
let camera = { x: 0, y: 0, zoom: 1000 };

function tick() {}

function render() {
  context.fillStyle = COLOR_OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const point of POINTS) {
    renderPoint(point.x, point.y);
  }
}

function renderPoint(x_, y_) {
  const x = (x_ - camera.x) * camera.zoom + canvas.width / 2;
  const y = (y_ - camera.y) * camera.zoom + canvas.height / 2;

  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2, false);
  context.fillStyle = "#000";
  context.fill();
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

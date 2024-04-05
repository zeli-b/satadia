const COLOR_OCEAN = "#5a89a8";

let canvas;
let context;

function tick() {}

function render() {
  context.fillStyle = COLOR_OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);
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

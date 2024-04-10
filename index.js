let data = newData();

const COLOR_OCEAN = "#5a89a8";

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let context;
let camera = { x: 0.15, y: 0.15, zoom: 5000 };

function tick() {}

function render() {
  if (data === undefined) {
    return;
  }

  // background
  context.fillStyle = COLOR_OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // render data
  data.regions.forEach((region) => renderRegion(region));
  data.paths.forEach((path) => renderPath(path));
  data.places.forEach((place) => renderPlace(place));
  // data.points.forEach((point) => renderPoint(point));

  // render pre-hud
  renderBorder();
  renderScale();
}

function renderBorder() {
  const [startX, startY] = convertPoint({ x: data.minx, y: data.miny });
  const [endX, endY] = convertPoint({ x: data.maxx, y: data.maxy });
  const width = endX - startX;

  context.lineWidth = 1;
  context.beginPath();

  context.moveTo(0, startY);
  context.lineTo(canvas.width, startY);
  context.moveTo(0, endY);
  context.lineTo(canvas.width, endY);

  for (let x = startX % width; x < canvas.width; x += width) {
    context.moveTo(x, startY);
    context.lineTo(x, endY);
  }

  context.stroke();
}

function stringifyLength(length) {
  if (length >= 1000) {
    return `${length / 1000}km`;
  }
  if (length < 1) {
    return `${length * 1000}mm`;
  }

  return `${length}m`;
}

function renderScale() {
  const minimalRodLength = 100;
  const unitPerPixel = minimalRodLength / camera.zoom; // 화면의 MRL 픽셀이 좌표상 거리로 몇 단위이냐
  const distancePerUnit = data.width / (data.maxx - data.minx); // 좌표상 거리 1이 몇 미터냐
  const distancePerPixel = distancePerUnit * unitPerPixel; // 화면의 MRL 픽셀이 몇 미터냐

  let goodUnit = Math.pow(10, Math.ceil(Math.log10(distancePerPixel))); // [m]
  let rodLength = (goodUnit / distancePerPixel) * minimalRodLength;

  while (rodLength >= 250) {
    rodLength /= 2;
    goodUnit /= 2;
  }

  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(canvas.width - 20 - rodLength, canvas.height - 20);
  context.lineTo(canvas.width - 20, canvas.height - 20);
  context.stroke();

  context.fillStyle = "black";
  context.font = "16pt Pretendard JP";
  context.textAlign = "right";
  context.fillText(
    stringifyLength(goodUnit),
    canvas.width - 20,
    canvas.height - 40,
  );
}

function renderPoint(point) {
  context.beginPath();
  context.arc(...convertPoint(point), 3, 0, Math.PI * 2, false);
  context.fillStyle = "#000";
  context.fill();
}

function movePointLeft(point) {
  let result = { ...point };
  result.x -= data.maxx - data.minx;
  return result;
}

function movePointRight(point) {
  let result = { ...point };
  result.x += data.maxx - data.minx;
  return result;
}

function getPointPositions(points) {
  let point, previousPoint;
  const result = [];

  point = getPointById(data.points, points[0]);
  result.push(point);
  previousPoint = point;

  for (let i = 1; i < points.length; i++) {
    point = getPointById(data.points, points[i]);

    while (point.x - previousPoint.x > (data.maxx - data.minx) / 2) {
      point = movePointLeft(point);
    }
    while (point.x - previousPoint.x < -(data.maxx - data.minx) / 2) {
      point = movePointRight(point);
    }

    result.push(point);
    previousPoint = point;
  }

  return result;
}

function renderRegion(region, dx) {
  if (dx === undefined) dx = 0;

  const { points } = region;

  // -- draw polygon
  const positions = getPointPositions(points).map((position) => {
    return {
      x: position.x + dx,
      y: position.y,
      id: position.id,
    };
  });
  context.beginPath();
  context.moveTo(...convertPoint(positions[0]));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(positions[i]));
  }
  context.closePath();

  // -- fill polygon
  context.fillStyle = region.color;
  context.globalAlpha = region.opacity;
  context.fill();
  context.globalAlpha = 1.0;

  // -- fill text
  const { center, min, max } = getSpecialPoints(positions);
  const realCenter = convertPoint(center);
  context.font = "32pt Pretendard JP";
  context.fillStyle = "black";
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillText(region.name, realCenter[0], realCenter[1]);

  // -- cylinderical render
  // to right
  if (
    dx >= 0 &&
    convertPoint({ x: min.x + (data.maxx - data.minx), y: min.y })[0] <=
      canvas.width
  ) {
    renderRegion(region, dx + (data.maxx - data.minx));
  }
  // to left
  if (
    dx <= 0 &&
    convertPoint({ x: max.x - (data.maxx - data.minx), y: max.y })[0] > 0
  ) {
    renderRegion(region, dx - (data.maxx - data.minx));
  }
}

function renderPath(path, dx) {
  if (dx === undefined) dx = 0;

  const { points } = path;

  // -- draw polygon
  const positions = getPointPositions(points).map((position) => {
    return {
      x: position.x + dx,
      y: position.y,
      id: position.id,
    };
  });

  context.strokeStyle = path.color;
  context.lineWidth = path.width;
  context.beginPath();
  context.moveTo(...convertPoint(positions[0]));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(positions[i]));
  }
  context.stroke();

  // -- label
  let align, baseline;
  let margin = { left: 0, right: 0, top: 0, bottom: 0 };
  for (let [i, j] of [
    [0, 1],
    [points.length - 1, points.length - 2],
  ]) {
    margin = { left: 0, right: 0, top: 0, bottom: 0 };
    if (
      Math.abs(positions[i].x - positions[j].x) >
      Math.abs(positions[i].y - positions[j].y)
    ) {
      // horizontal
      baseline = "middle";
      if (positions[i].x < positions[j].x) {
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
      if (positions[i].y < positions[j].y) {
        // to bottom
        baseline = "bottom";
        margin.bottom = 12;
      } else {
        // to top
        baseline = "top";
        margin.top = 12;
      }
    }

    const realPosition = convertPoint(positions[i]);
    context.textAlign = align;
    context.textBaseline = baseline;
    context.font = "16pt Pretendard JP";
    context.fillText(
      path.name,
      realPosition[0] + margin.left - margin.right,
      realPosition[1] + margin.top - margin.bottom,
    );
  }

  // -- cylinderical render
  const { min, max } = getSpecialPoints(positions);
  // to right
  if (
    dx >= 0 &&
    convertPoint({ x: min.x + (data.maxx - data.minx), y: min.y })[0] <=
      canvas.width
  ) {
    renderPath(path, dx + (data.maxx - data.minx));
  }
  // to left
  if (
    dx <= 0 &&
    convertPoint({ x: max.x - (data.maxx - data.minx), y: max.y })[0] > 0
  ) {
    renderPath(path, dx - (data.maxx - data.minx));
  }
}

function renderPlace(place, dx) {
  if (dx === undefined) dx = 0;

  let point = getPointById(data.points, place.point);
  point = { x: point.x + dx, y: point.y };
  const realPosition = convertPoint(point);

  context.beginPath();
  context.arc(...realPosition, 8, 0, Math.PI * 2, false);
  context.fillStyle = "#ffec00";
  context.strokeStyle = "#000";
  context.lineWidth = 1;
  context.fill();
  context.stroke();

  context.font = "16pt Pretendard JP";
  context.textAlign = "left";
  context.fillStyle = "black";
  context.fillText(place.name, realPosition[0] + 16, realPosition[1]);

  // -- cylinderical render
  // to right
  if (
    dx >= 0 &&
    convertPoint({ x: point.x + (data.maxx - data.minx) })[0] <= canvas.width
  ) {
    renderPlace(place, dx + (data.maxx - data.minx));
  }
  // to left
  if (
    dx <= 0 &&
    convertPoint({ x: point.x - (data.maxx - data.minx) })[0] > 0
  ) {
    renderPlace(place, dx - (data.maxx - data.minx));
  }
}

function getPointById(points, id) {
  return points.find((point) => point.id == id);
}

function convertPoint(point) {
  const x = (point.x - camera.x) * camera.zoom + canvas.width / 2;
  const y = (point.y - camera.y) * camera.zoom + canvas.height / 2;
  return [x, y];
}

function getSpecialPoints(positions) {
  const [xs, ys] = positions.reduce(
    (acc, id) => {
      acc[0].push(id.x);
      acc[1].push(id.y);
      return acc;
    },
    [[], []],
  );

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = minX + (maxX - minX) / 2;
  const centerY = minY + (maxY - minY) / 2;

  return {
    center: { x: centerX, y: centerY },
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
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

  canvas.style.cursor = "grabbing";
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

  while (camera.x < data.minx) {
    camera.x += data.maxx - data.minx;
  }
  while (camera.x > data.maxx) {
    camera.x -= data.maxx - data.minx;
  }
  if (camera.y < data.miny) {
    camera.y = data.miny;
  }
  if (camera.y > data.maxy) {
    camera.y = data.maxy;
  }
  render();
}

function onwheel(e) {
  camera.zoom *= Math.exp(e.wheelDelta / 1000);

  if (camera.zoom < 1) {
    camera.zoom = 1;
  }

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
      data = JSON.parse(e.target.result);

      render();
    };

    reader.readAsText(file);
  });
});

function newData() {
  return {
    minx: 0,
    maxx: 1,
    miny: 0,
    maxy: 1,
    width: 1,
    height: 1,
    points: [],
    regions: [],
    paths: [],
    places: [],
  };
}

function save() {
  const text = JSON.stringify(data);
  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  link.download = new Date().getTime() + ".json";
  link.click();

  URL.revokeObjectURL(link.href);
}

function emptyProject() {
  data = newData();
  render();
}

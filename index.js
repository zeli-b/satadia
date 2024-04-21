let data = newData();
let pointMap = {};

const COLOR_OCEAN = "#5a89a8";

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let context;
let camera = {
  x: (data.minx + data.maxx) / 2,
  y: (data.miny + data.maxy) / 2,
  zoom: 1000 / ((data.maxx - data.minx + data.maxy - data.miny) / 4),
};

const texts = [];
function renderText() {
  texts.forEach((text) => text());
  texts.length = 0;
}

function render() {
  if (tool === TOOL_HAND && canvas.style.cursor === "") {
    canvas.style.cursor = "grab";
  } else if (tool !== TOOL_HAND) {
    canvas.style.cursor = "";
  }

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
  if (tool !== TOOL_HAND) {
    data.points.forEach((point) => renderPoint(point));
  }

  // render pre-hud
  renderBorder();
  renderText();
  renderMousePath();
  renderScale();
}

function renderMousePath() {
  context.lineWidth = 1;
  context.strokeStyle = "#0000ff40";

  context.beginPath();
  for (let i = 0; i < mousePath.length; i++) {
    const [x, y] = mousePath[i];

    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
}

function renderBorder() {
  const [startX, startY] = convertPoint({ x: data.minx, y: data.miny });
  const [endX, endY] = convertPoint({ x: data.maxx, y: data.maxy });
  const width = endX - startX;

  context.lineWidth = 1;
  context.strokeStyle = "black";
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

  context.strokeStyle = "black";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(canvas.width - 20 - rodLength, canvas.height - 20);
  context.lineTo(canvas.width - 20, canvas.height - 20);
  context.stroke();

  texts.push(() => {
    context.fillStyle = "black";
    context.font = "16pt Pretendard JP";
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(
      stringifyLength(goodUnit),
      canvas.width - 20,
      canvas.height - 40,
    );
  });
}

function renderPoint(point, dx) {
  if (dx === undefined) dx = 0;

  const [x, y] = convertPoint({ x: point.x + dx, y: point.y });

  if (x < 0 || x > canvas.width) {
    return;
  }
  if (y < 0 || y > canvas.height) {
    return;
  }

  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2, false);
  context.fillStyle = "black";
  context.fill();

  /*
  context.font = "16px Pretendard JP";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(point.id, x, y + 20);
  */

  // -- cylinderical render
  // to right
  if (
    dx >= 0 &&
    convertPoint({ x: point.x + dx + (data.maxx - data.minx) })[0] <=
      canvas.width
  ) {
    renderPoint(point, dx + (data.maxx - data.minx));
  }
  // to left
  if (
    dx <= 0 &&
    convertPoint({ x: point.x + dx - (data.maxx - data.minx) })[0] > 0
  ) {
    renderPoint(point, dx - (data.maxx - data.minx));
  }
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

  point = getPointById(points[0]);
  result.push(point);
  previousPoint = point;

  for (let i = 1; i < points.length; i++) {
    point = getPointById(points[i]);

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
  const { center, min, max } = getSpecialPoints(positions);

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

  if (convertPoint(max)[0] < 0) return;
  if (convertPoint(max)[1] < 0) return;
  if (convertPoint(min)[0] > canvas.width) return;
  if (convertPoint(min)[1] > canvas.height) return;

  // fill
  context.lineWidth = 1;
  context.strokeStyle = "black";
  context.beginPath();
  context.moveTo(...convertPoint(positions[0]));
  for (let i = 1; i < points.length; i++) {
    context.lineTo(...convertPoint(positions[i]));
  }
  context.closePath();
  context.stroke();

  // -- fill polygon
  context.fillStyle = region.color;
  context.globalAlpha = region.opacity;
  context.fill();
  context.globalAlpha = 1.0;

  // -- fill text
  const realCenter = convertPoint(center);
  texts.push(() => {
    context.font = "32pt Pretendard JP";
    context.fillStyle = "black";
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(region.name, realCenter[0], realCenter[1]);
  });
}

function renderPath(path, dx) {
  if (dx === undefined) dx = 0;

  const { points } = path;

  // -- cylinderical render
  const positions = getPointPositions(points).map((position) => {
    return {
      x: position.x + dx,
      y: position.y,
      id: position.id,
    };
  });

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

  // -- get min max and check if renderable
  if (convertPoint(max)[0] < 0) return;
  if (convertPoint(min)[0] > canvas.width) return;
  if (convertPoint(max)[1] < 0) return;
  if (convertPoint(min)[1] > canvas.height) return;

  // -- draw polygon
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
    texts.push(() => {
      context.textAlign = align;
      context.textBaseline = baseline;
      context.font = "16pt Pretendard JP";
      context.fillStyle = "black";
      context.fillText(
        path.name,
        realPosition[0] + margin.left - margin.right,
        realPosition[1] + margin.top - margin.bottom,
      );
    });
  }
}

function renderPlace(place, dx) {
  if (dx === undefined) dx = 0;

  let point = getPointById(place.point);
  point = { x: point.x + dx, y: point.y };
  const realPosition = convertPoint(point);

  context.beginPath();
  context.arc(...realPosition, 8, 0, Math.PI * 2, false);
  context.fillStyle = "#ffec00";
  context.strokeStyle = "#000";
  context.lineWidth = 1;
  context.fill();
  context.stroke();

  texts.push(() => {
    context.font = "16pt Pretendard JP";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = "black";
    context.fillText(place.name, realPosition[0] + 16, realPosition[1]);
  });

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

function getPointById(id) {
  if (pointMap[id] === undefined) {
    const point = data.points.find((point) => point.id == id);
    pointMap[id] = point;
    return point;
  }

  return pointMap[id];
}

function convertPoint(point) {
  const x = (point.x - camera.x) * camera.zoom + canvas.width / 2;
  const y = (point.y - camera.y) * camera.zoom + canvas.height / 2;
  return [x, y];
}

function unconvertPoint(x, y, notInMap) {
  const dpr = window.devicePixelRatio;

  let cx = ((x - canvas.width / dpr / 2) / camera.zoom) * dpr + camera.x;
  if (!notInMap) {
    while (cx > data.maxx) {
      cx -= data.maxx - data.minx;
    }
    while (cx < data.minx) {
      cx += data.maxx - data.minx;
    }
  }

  let cy = ((y - canvas.height / dpr / 2) / camera.zoom) * dpr + camera.y;
  if (!notInMap) {
    if (cy < data.miny) {
      cy = data.miny;
    } else if (cy > data.maxy) {
      cy = data.maxy;
    }
  }

  return [cx, cy];
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

function newPoint(x, y) {
  let max = 0;
  data.points.forEach((point) => {
    max = Math.max(max, point.id);
  });

  const id = max + 1;
  return { id, x, y };
}

let dragging = false;

function getDistanceSegmentPoint(x, y, x1, y1, x2, y2) {
  /*
  if (x2 - x1 === 0) {
    return getDistanceSegmentPoint(y, x, y1, x1, y2, x2);
  }

  const t = (y2 - y1) / (x2 - x1);
  const a = t;
  const b = -1;
  const c = -t * x1 + y1;

  return Math.abs(a * x + b * y + c) / Math.hypot(a, b);
  */
  // Function to calculate distance between a point (x, y) and a line segment defined by (x1, y1) and (x2, y2)

  // Calculate the length of the segment
  const segmentLengthSquared = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);

  // If the segment is just a point, return distance to that point
  if (segmentLengthSquared === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }

  // Calculate the parameter t where the point projection lies on the line extending the segment
  let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / segmentLengthSquared;

  // If t is less than 0, the projection of the point is before the segment
  if (t < 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }

  // If t is greater than 1, the projection of the point is after the segment
  if (t > 1) {
    return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
  }

  // Calculate the coordinates of the projection
  const projectionX = x1 + t * (x2 - x1);
  const projectionY = y1 + t * (y2 - y1);

  // Calculate the distance between the point and the projection
  return Math.sqrt(
    (x - projectionX) * (x - projectionX) +
      (y - projectionY) * (y - projectionY),
  );
}

function getPathSegment(e) {
  const [x, y] = unconvertPoint(e.clientX, e.clientY);

  let closestDistance;
  let closest = null;
  for (let i = 0; i < data.paths.length; i++) {
    const path = data.paths[i];
    for (let j = 0; j < path.points.length; j++) {
      const p1 = getPointById(path.points[j]);
      const p2 = getPointById(path.points[(j + 1) % path.points.length]);

      const distance = getDistanceSegmentPoint(x, y, p1.x, p1.y, p2.x, p2.y);

      if (!closest || !closestDistance || distance < closestDistance) {
        closest = [i, j + 1];
        closestDistance = distance;
      }
    }
  }

  return closest;
}

function getRegionSegment(e) {
  const [x, y] = unconvertPoint(e.clientX, e.clientY);

  let closestDistance;
  let closest = null;
  for (let i = 0; i < data.regions.length; i++) {
    const region = data.regions[i];
    for (let j = 0; j < region.points.length; j++) {
      const p1 = getPointById(region.points[j]);
      const p2 = getPointById(region.points[(j + 1) % region.points.length]);

      const distance = getDistanceSegmentPoint(x, y, p1.x, p1.y, p2.x, p2.y);

      if (!closest || !closestDistance || distance < closestDistance) {
        closest = [i, j + 1];
        closestDistance = distance;
      }
    }
  }

  return closest;
}

let pointSelected;
let mousePath = [];
let pathInsertSelected;
let regionMakePointIds = [];
let regionInsertSelected;
function onmousedown(e) {
  if (e.which !== 1) {
    return;
  }

  mousePath.push([
    e.clientX * window.devicePixelRatio,
    e.clientY * window.devicePixelRatio,
  ]);

  if (tool === TOOL_HAND) {
    dragging = true;

    canvas.style.cursor = "grabbing";
  } else {
    canvas.style.cursor = "";
  }

  if (tool === TOOL_POINT_MAKE) {
    const [x, y] = unconvertPoint(e.clientX, e.clientY);
    const point = newPoint(x, y);
    data.points.push(point);
    render();
  }

  if (tool === TOOL_POINT_MOVE || tool === TOOL_PATH_MAKE) {
    pointSelected = clickPoint(e);
  }

  if (tool === TOOL_PATH_INSERT) {
    pathInsertSelected = getPathSegment(e);
  }

  if (tool === TOOL_REGION_MAKE) {
    const point = clickPoint(e);
    regionMakePointIds.push(point.id);
  }

  if (tool === TOOL_REGION_INSERT) {
    regionInsertSelected = getRegionSegment(e);
  }
}

function isPointUsed(id) {
  // in region
  for (let i = 0; i < data.regions.length; i++) {
    const region = data.regions[i];
    if (region.points.indexOf(id) !== -1) {
      return true;
    }
  }

  // in path
  for (let i = 0; i < data.paths.length; i++) {
    const path = data.paths[i];
    if (path.points.indexOf(id) !== -1) {
      return true;
    }
  }

  // in place
  for (let i = 0; i < data.places.length; i++) {
    const place = data.places[i];
    if (place.point === id) {
      return true;
    }
  }

  return false;
}

function clickPoint(e) {
  const [x, y] = unconvertPoint(e.clientX, e.clientY);
  let point;
  for (let i = 0; i < data.points.length; i++) {
    const nowPoint = data.points[i];
    if (
      point === undefined ||
      Math.hypot(nowPoint.x - x, nowPoint.y - y) <
        Math.hypot(point.x - x, point.y - y)
    ) {
      point = nowPoint;
    }
  }

  return point;
}

function newPlace(pointId, layer, name) {
  let max = 0;
  data.points.forEach((point) => {
    max = Math.max(max, point.id);
  });

  return { id: max + 1, layer, point: pointId, name };
}

function getPlaceWithPointId(pointId) {
  for (let i = 0; i < data.places.length; i++) {
    const place = data.places[i];

    if (place.point === pointId) {
      return place;
    }
  }

  return null;
}

function onmouseup(e) {
  if (e.which !== 1) {
    return;
  }

  if (tool === TOOL_HAND) {
    dragging = false;
    canvas.style.cursor = "grab";
  }

  if (tool === TOOL_POINT_DELETE) {
    const point = clickPoint(e);

    if (point && !isPointUsed(point.id)) {
      data.points = data.points.filter((p) => p !== point);
    }
  }

  if (tool === TOOL_PLACE_MAKE) {
    const point = clickPoint(e);

    if (point) {
      if (!getPlaceWithPointId(point.id)) {
        const name = prompt("거점의 이름");
        const layer = prompt("거점 레이어");
        const place = newPlace(point.id, parseInt(layer), name);
        data.places.push(place);
      }
    }
  }

  if (tool === TOOL_PLACE_DELETE) {
    const point = clickPoint(e);
    if (point) {
      const thePlace = getPlaceWithPointId(point.id);
      if (thePlace) {
        data.places = data.places.filter((place) => place.id !== thePlace.id);
      }
    }
  }

  if (tool === TOOL_PATH_INSERT) {
    const point = clickPoint(e);

    if (pathInsertSelected && point) {
      const remainder = data.paths[pathInsertSelected[0]].points.splice(
        pathInsertSelected[1],
      );

      data.paths[pathInsertSelected[0]].points = [
        ...data.paths[pathInsertSelected[0]].points,
        point.id,
        ...remainder,
      ];

      pathInsertSelected = undefined;
    }
  }

  if (tool === TOOL_PATH_REMOVE) {
    const point = clickPoint(e);

    if (point) {
      for (let i = 0; i < data.paths.length; i++) {
        const path = data.paths[i];

        if (path.points.indexOf(point.id) === -1) {
          continue;
        }

        if (path.points.length <= 2) {
          continue;
        }

        path.points = path.points.filter((p) => p !== point.id);
      }
    }
  }

  if (tool === TOOL_PATH_MAKE) {
    const point = clickPoint(e);

    data.paths.push(newPath([pointSelected.id, point.id]));
  }

  if (tool === TOOL_PATH_DELETE) {
    const pathId = getPathSegment(e)[0];

    data.paths.splice(pathId, 1);
  }

  if (tool === TOOL_REGION_MAKE) {
    if (
      regionMakePointIds[regionMakePointIds.length - 1] ===
      regionMakePointIds[0]
    ) {
      regionMakePointIds.splice(regionMakePointIds.length - 1, 1);
    }

    if (regionMakePointIds.length >= 3) {
      data.regions.push(newRegion([...regionMakePointIds]));
    }

    regionMakePointIds.length = 0;
  }

  if (tool === TOOL_REGION_INSERT) {
    const point = clickPoint(e);

    if (regionInsertSelected && point) {
      const remainder = data.regions[regionInsertSelected[0]].points.splice(
        regionInsertSelected[1],
      );

      data.regions[regionInsertSelected[0]].points = [
        ...data.regions[regionInsertSelected[0]].points,
        point.id,
        ...remainder,
      ];

      regionInsertSelected = undefined;
    }
  }

  if (tool === TOOL_REGION_REMOVE) {
    for (let i = 0; i < data.regions.length; i++) {
      const region = data.regions[i];

      for (let j = 0; j < region.points.length; j++) {
        const point = getPointById(region.points[j]);
        const convertedPoint = convertPoint(point);

        if (
          polygonContainsPoint(mousePath, convertedPoint) &&
          region.points.length > 3
        ) {
          region.points = region.points.filter((p) => p != point.id);
          j--;
        }
      }
    }
  }

  if (tool === TOOL_REGION_DELETE) {
    const region = clickRegion(e);

    if (region) {
      data.regions = data.regions.filter((r) => region.id !== r.id);
    }
  }

  if (tool === TOOL_REGION_CONFIG) {
    const region = clickRegion(e);

    region.layer = prompt("레이어", region.layer);
    region.name = prompt("이름", region.name);
    region.color = prompt("색상", region.color);
    region.opacity = prompt("불투명도", region.opacity);
  }

  mousePath.length = 0;
  pointSelected = undefined;
  render();
}

function polygonContainsPoint(points, point) {
  const [cx, cy] = point;

  let intersectionCount = 0;
  for (let j = 0; j < points.length; j++) {
    let p1 = points[j];
    let p2 = points[(j + 1) % points.length];

    if (p1[1] > p2[1]) {
      [p1, p2] = [p2, p1];
    }

    if (!(p1[1] <= cy && cy < p2[1])) {
      continue;
    }

    const intersectionX =
      ((cy - p1[1]) / (p2[1] - p1[1])) * (p2[0] - p1[0]) + p1[0];
    if (intersectionX > cx) {
      intersectionCount++;
    }
  }

  return intersectionCount % 2 == 1;
}

function clickRegion(e) {
  const [cx, cy] = unconvertPoint(e.clientX, e.clientY);

  let selectedRegion;
  let selectedRegionSize = Infinity;
  for (let i = 0; i < data.regions.length; i++) {
    const region = data.regions[i];

    // check if point in polygon
    const convertedPoints = [];
    for (let j = 0; j < region.points.length; j++) {
      const point = getPointById(region.points[j]);
      convertedPoints.push([point.x, point.y]);
    }
    console.log(convertedPoints, cx, cy);
    if (!polygonContainsPoint(convertedPoints, [cx, cy])) {
      continue;
    }

    // select smaller region
    if (region.points.length < selectedRegionSize) {
      selectedRegionSize = region.points.length;
      selectedRegion = region;
    }
  }

  if (selectedRegion === undefined) {
    return;
  }

  return selectedRegion;
}

function newRegion(points) {
  let id = 0;
  for (let i = 0; i < data.regions.length; i++) {
    const region = data.regions[i];
    id = Math.max(id, region.id);
  }

  const name = prompt("이름");
  const layer = parseInt(prompt("레이어"));
  const color = prompt("색상");
  const opacity = parseFloat(prompt("불투명도 (0–1)"));

  return {
    id,
    layer,
    points,
    name,
    color,
    opacity,
  };
}

function newPath(points) {
  const name = prompt("이름");
  const layer = parseInt(prompt("레이어"));
  const color = prompt("색 (#000000)") || "#000000";
  const width = parseInt(prompt("굵기 (2)")) || 2;

  if (!name || !layer) {
    return;
  }

  let id = 0;
  for (let i = 0; i < data.paths.length; i++) {
    const path = data.paths[i];
    id = Math.max(path.id);
  }

  return {
    id: id + 1,
    layer,
    points,
    name,
    color,
    width,
  };
}

function onmousemove(e) {
  if (dragging) {
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
  }

  if (tool === TOOL_POINT_MOVE && pointSelected !== undefined) {
    const [x, y] = unconvertPoint(e.clientX, e.clientY);
    pointSelected.x = x;
    pointSelected.y = y;
  }

  if (tool === TOOL_REGION_MAKE) {
    if (regionMakePointIds.length > 0) {
      const lastId = regionMakePointIds[regionMakePointIds.length - 1];
      const point = clickPoint(e);

      if (lastId !== point.id) {
        regionMakePointIds.push(point.id);
      }
    }
  }

  if (mousePath.length > 0) {
    mousePath.push([
      e.clientX * window.devicePixelRatio,
      e.clientY * window.devicePixelRatio,
    ]);
  }

  render();
}

function onwheel(e) {
  if (e.composed && e.ctrlKey) {
    e.preventDefault();
  }

  let multiplier = Math.exp(e.wheelDelta / 2000);

  if (camera.zoom * multiplier < canvas.width / 2 / (data.maxx - data.minx)) {
    multiplier = canvas.width / 2 / (data.maxx - data.minx) / camera.zoom;
  }

  const [cx, cy] = unconvertPoint(e.clientX, e.clientY, true);
  camera.x += (cx - camera.x) * Math.log(multiplier);
  camera.y += (cy - camera.y) * Math.log(multiplier);
  console.log(multiplier);

  if (camera.y < data.miny) {
    camera.y = data.miny;
  }
  if (camera.y > data.maxy) {
    camera.y = data.maxy;
  }

  camera.zoom *= multiplier;

  render();
}

const TOOL_HAND = "tool-hand";
const TOOL_POINT_MAKE = "tool-point-make";
const TOOL_POINT_MOVE = "tool-point-select";
const TOOL_POINT_DELETE = "tool-point-delete";
const TOOL_PLACE_MAKE = "tool-place-make";
const TOOL_PLACE_DELETE = "tool-place-delete";
const TOOL_PATH_MAKE = "tool-path-make";
const TOOL_PATH_INSERT = "tool-path-insert";
const TOOL_PATH_REMOVE = "tool-path-remove";
const TOOL_PATH_DELETE = "tool-path-delete";
const TOOL_REGION_MAKE = "tool-region-make";
const TOOL_REGION_INSERT = "tool-region-insert";
const TOOL_REGION_REMOVE = "tool-region-remove";
const TOOL_REGION_DELETE = "tool-region-delete";
const TOOL_REGION_CONFIG = "tool-region-config";
const toolRadios = {};
let tool = TOOL_HAND;

let spaceDragToolBuffer;

function onkeydown(e) {
  if (e.code === "Space" && spaceDragToolBuffer === undefined) {
    spaceDragToolBuffer = tool;
    toolRadios[TOOL_HAND].checked = true;
    tool = TOOL_HAND;
    render();
  }
}

function onkeyup(e) {
  if (e.code === "Space") {
    toolRadios[spaceDragToolBuffer].checked = true;
    tool = spaceDragToolBuffer;
    spaceDragToolBuffer = undefined;
    render();
  }
}

document.addEventListener("keydown", onkeydown);
document.addEventListener("keyup", onkeyup);

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
      pointMap = {};
      camera.x = (data.maxx + data.minx) / 2;
      camera.y = (data.maxy + data.miny) / 2;
      camera.zoom =
        1000 / ((data.maxx - data.minx + data.maxy - data.miny) / 4);

      render();
    };

    reader.readAsText(file);
  });

  document
    .querySelectorAll("#tool-select-panel>p>input[type=radio]")
    .forEach((radio) => {
      radio.addEventListener("change", (e) => {
        tool = e.currentTarget.id;
        render();
      });
      toolRadios[radio.id] = radio;
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
  pointMap = {};
  camera.x = (data.maxx + data.minx) / 2;
  camera.y = (data.maxy + data.miny) / 2;
  camera.zoom = 1000 / ((data.maxx - data.minx + data.maxy - data.miny) / 4);

  render();
}

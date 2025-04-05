const DEFAULT_DEPTH = 12;

function getPolygonBoundingBox(points) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}

function normalizeProportion(obj) {
  const total = Object.values(obj).reduce((sum, val) => sum + val, 0);
  if (total === 0) return obj; // or handle edge case differently

  const result = {};
  for (const key in obj) {
    result[key] = obj[key] / total;
  }
  return result;
}

function isPolygonInsideSquare(points) {
  for (const [x, y] of points) {
    if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0) {
      return false; // 한 점이라도 정사각형 밖이면 false
    }
  }
  return true; // 모든 점이 정사각형 내부
}

function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00000001) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function ccw(A, B, C) {
  return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
}

function segmentsIntersect(A, B, C, D) {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function polygonIntersectsSquareBoundary(points) {
  const square = [
    [0.0, 0.0],
    [1.0, 0.0],
    [1.0, 1.0],
    [0.0, 1.0]
  ];

  const squareEdges = [];
  for (let i = 0; i < 4; i++) {
    squareEdges.push([square[i], square[(i + 1) % 4]]);
  }

  const polyEdges = [];
  for (let i = 0; i < points.length; i++) {
    polyEdges.push([points[i], points[(i + 1) % points.length]]);
  }

  for (const [p1, p2] of polyEdges) {
    for (const [q1, q2] of squareEdges) {
      if (segmentsIntersect(p1, p2, q1, q2)) {
        return true;
      }
    }
  }

  return false;
}

function getMostFrequent(arr) {
  const hashmap = arr.reduce( (acc, val) => {
    acc[val] = (acc[val] || 0 ) + 1
    return acc
  },{});

  return Object.keys(hashmap)
    .reduce((a, b) => hashmap[a] > hashmap[b] ? a : b);
}

class Quadtree {
  constructor(value) {
    this.value = value;
    this.children = null;
    this.isReduced = true;
  }

  isDivided() {
    return this.children !== null;
  }

  divide() {
    if (this.isDivided())
      throw new Error("Quadtree already divided");

    this.children = [
      new Quadtree(this.value),
      new Quadtree(this.value),
      new Quadtree(this.value),
      new Quadtree(this.value),
    ];

    this.isReduced = false;

    return this;
  }

  reduce() {
    if (this.isReduced)
      return;

    if (!this.isDivided())
      return;

    this.children.forEach(c => c.reduce());

    if (this.children.some(c => c.isDivided())) {
      return;
    }

    const value = this.children
      .reduce((a, b) => a !== null && a.value === b.value ? a : null);
    
    if (value === null) {
      return;
    }

    this.children = null;
    this.value = value.value;
    this.isReduced = true;

    return this;
  }

  drawCircle(x, y, radius, value, recurseLevel) {
    if (recurseLevel <= 0)
      return

    if (recurseLevel === undefined)
      recurseLevel = DEFAULT_DEPTH;

    const luc = Math.hypot(x - 0, y - 0) < radius;
    const ruc = Math.hypot(x - 1, y - 0) < radius;
    const ldc = Math.hypot(x - 0, y - 1) < radius;
    const rdc = Math.hypot(x - 1, y - 1) < radius;

    if (![luc, ruc, ldc, rdc].some(i => i) && !this.hasPoint(x, y)) {
      return this;
    }

    if ([luc, ruc, ldc, rdc].every(i => i)) {
      this.value = value;
      this.children = null;
      return this;
    }

    if (!this.isDivided())
      this.divide();

    const nr = radius * 2;
    const nlx = 2 * x;
    const nrx = 2 * x - 1;
    const nuy = 2 * y;
    const ndy = 2 * y - 1;
    this.children[0].drawCircle(nlx, nuy, nr, value, --recurseLevel);
    this.children[1].drawCircle(nrx, nuy, nr, value, recurseLevel);
    this.children[2].drawCircle(nlx, ndy, nr, value, recurseLevel);
    this.children[3].drawCircle(nrx, ndy, nr, value, recurseLevel);

    return this.reduce();
  }

  drawRect(x1, y1, x2, y2, value, recurseLevel) {
    if (recurseLevel <= 0)
      return

    if (recurseLevel === undefined) {
      recurseLevel = DEFAULT_DEPTH;
    }

    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];

    // 사각형이 셀을 완전히 포함하면 즉시 채움
    if (x1 <= 0 && x2 >= 1 && y1 <= 0 && y2 >= 1) {
      this.value = value;
      this.children = null;
      return this;
    }

    // 사각형과 셀 겹침이 없으면 탈출
    if (x2 < 0 || x1 > 1 || y2 < 0 || y1 > 1) {
      return this;
    }

    if (!this.isDivided())
      this.divide();

    recurseLevel--;
    const nlx1 = 2 * x1;
    const nlx2 = 2 * x2;
    const nrx1 = 2 * x1 - 1;
    const nrx2 = 2 * x2 - 1;
    const nuy1 = 2 * y1;
    const nuy2 = 2 * y2;
    const ndy1 = 2 * y1 - 1;
    const ndy2 = 2 * y2 - 1;
    this.children[0].drawRect(nlx1, nuy1, nlx2, nuy2, value, recurseLevel);
    this.children[1].drawRect(nrx1, nuy1, nrx2, nuy2, value, recurseLevel);
    this.children[2].drawRect(nlx1, ndy1, nlx2, ndy2, value, recurseLevel);
    this.children[3].drawRect(nrx1, ndy1, nrx2, ndy2, value, recurseLevel);

    return this.reduce();
  }

  drawPoly(points, value, recurseLevel, boundingBox) {
    if (recurseLevel <= 0)
      return;

    if (recurseLevel === undefined) {
      recurseLevel = DEFAULT_DEPTH;
    }

    // AABB 계산 및 교차 여부 판단
    if (boundingBox === undefined) {
      boundingBox = getPolygonBoundingBox(points);
    }

    const cellBox = { x1: 0, y1: 0, x2: 1, y2: 1 };

    // AABB 충돌 없으면 바로 탈출
    if (
      boundingBox.x2 < cellBox.x1 || boundingBox.x1 > cellBox.x2 ||
      boundingBox.y2 < cellBox.y1 || boundingBox.y1 > cellBox.y2
    ) {
      return this;
    }

    if (
      !polygonIntersectsSquareBoundary(points)
      && !isPolygonInsideSquare(points)
    ) {
      if (isPointInPolygon([0.5, 0.5], points)) {
        this.value = value;
        this.children = null;
      }
      return this;
    }

    if (!this.isDivided())
      this.divide();

    const lupoints = [], rupoints = [], ldpoints = [], rdpoints = [];
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      lupoints.push([2 * x, 2 * y]);
      rupoints.push([2 * x - 1, 2 * y]);
      ldpoints.push([2 * x, 2 * y - 1]);
      rdpoints.push([2 * x - 1, 2 * y - 1]);
    }

    const luBox = {
      x1: 2 * boundingBox.x1,
      y1: 2 * boundingBox.y1,
      x2: 2 * boundingBox.x2,
      y2: 2 * boundingBox.y2
    };

    const ruBox = {
      x1: 2 * boundingBox.x1 - 1,
      y1: 2 * boundingBox.y1,
      x2: 2 * boundingBox.x2 - 1,
      y2: 2 * boundingBox.y2
    };

    const ldBox = {
      x1: 2 * boundingBox.x1,
      y1: 2 * boundingBox.y1 - 1,
      x2: 2 * boundingBox.x2,
      y2: 2 * boundingBox.y2 - 1
    };

    const rdBox = {
      x1: 2 * boundingBox.x1 - 1,
      y1: 2 * boundingBox.y1 - 1,
      x2: 2 * boundingBox.x2 - 1,
      y2: 2 * boundingBox.y2 - 1
    };

    this.children[0].drawPoly(lupoints, value, recurseLevel - 1, luBox);
    this.children[1].drawPoly(rupoints, value, recurseLevel - 1, ruBox);
    this.children[2].drawPoly(ldpoints, value, recurseLevel - 1, ldBox);
    this.children[3].drawPoly(rdpoints, value, recurseLevel - 1, rdBox);

    return this.reduce();
  }

  isHadInCircle(x, y, radius) {
    return Math.hypot(x - 0.5, y - 0.5) < radius;
  }

  hasPoint(x, y) {
    return 0 <= x && x < 1 && 0 <= y && y < 1;
  }

  getValueProportion(recurseLevel) {
    if (recurseLevel <= 0) {
      const proportionMap = {};
      proportionMap[this.getValue()] = 1.0;
      return proportionMap;
    }

    if (recurseLevel === undefined)
      recurseLevel = DEFAULT_DEPTH;

    if (!this.isDivided()) {
      const proportionMap = {};
      proportionMap[this.value] = 1.0;
      return proportionMap;
    }

    const proportionMap = {};

    recurseLevel--;
    this.children.forEach(child => {
      const childProportions = child.getValueProportion(recurseLevel);
      for (const key in childProportions) {
        if (proportionMap[key]) {
          proportionMap[key] += childProportions[key] * 0.25;
        } else {
          proportionMap[key] = childProportions[key] * 0.25;
        }
      }
    });

    return normalizeProportion(proportionMap);
  }

  setChild(index, value) {
    if (!(value instanceof Quadtree))
      throw new Error("child of quadtree must instanceof quadtree");

    this.children[index] = value;
    return this;
  }

  getValue() {
    if (!this.isDivided()) {
      return this.value;
    }

    const children = this.children.map(c => c.getValue());
    return getMostFrequent(children);
  }

  jsonify() {
    if (!this.isDivided()) {
      return this.value;
    }

    return [
      this.children[0].jsonify(),
      this.children[1].jsonify(),
      this.children[2].jsonify(),
      this.children[3].jsonify(),
    ];
  }
}

function getQuadtreeFromJson(json) {
  if (json instanceof Number || typeof json === "number") {
    return new Quadtree(json);
  }

  const result = new Quadtree(null).divide();
  result.setChild(0, getQuadtreeFromJson(json[0]));
  result.setChild(1, getQuadtreeFromJson(json[1]));
  result.setChild(2, getQuadtreeFromJson(json[2]));
  result.setChild(3, getQuadtreeFromJson(json[3]));
  return result;
}

if (require.main === module) {
 const qt = new Quadtree(0);

  // 7. 전체 배경 텍스처 느낌의 큰 원 (value: 2)
  qt.drawCircle(0.5, 0.5, 0.5, 1);

  // 1. 별 모양 중앙 (value: 1)
  qt.drawPoly([
    [0.5, 0.1],
    [0.6175, 0.3412],
    [0.875, 0.3412],
    [0.675, 0.5412],
    [0.7587, 0.825],
    [0.5, 0.66],
    [0.2412, 0.825],
    [0.325, 0.5412],
    [0.125, 0.3412],
    [0.3825, 0.3412]
  ], 2);

  qt.drawCircle(0.2, 0.2, 0.15, 3);

  qt.drawRect(0.75, 0.75, 0.95, 0.95, 4);

  // 4. 중심에 겹쳐지는 작은 원 (value: 2)
  qt.drawCircle(0.5, 0.5, 0.15, 5);

  // 5. 좌하단 장식용 직사각형 (value: 1)
  qt.drawRect(0.05, 0.8, 0.2, 0.95, 6);

  // 6. 우상단 큰 원 (value: 3)
  qt.drawCircle(0.8, 0.2, 0.18, 7);

  console.log(JSON.stringify(qt.jsonify()));
}

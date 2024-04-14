from xml.dom import minidom
from svg.path import parse_path
from json import dump


max_id = 0
points = dict()
point_ids = dict()


def get_point_id(point):
    global max_id

    if point in point_ids:
        return point_ids[point]

    max_id += 1
    point_ids[point] = max_id
    return max_id


def main():
    connections = dict()
    regions = list()

    # -- read svg file
    doc = minidom.parse("world.svg")

    paths = doc.getElementsByTagName("path")
    for _, path in enumerate(paths):
        d = path.getAttribute("d")
        parsed = parse_path(d)

        for obj in parsed:
            point1 = (round(obj.start.real, 2), round(obj.start.imag, 2))
            point2 = (round(obj.end.real, 2), round(obj.end.imag, 2))

            point1_id = get_point_id(point1)
            point2_id = get_point_id(point2)
            points[point1_id] = {"id": point1_id, "x": point1[0], "y": point1[1]}
            points[point2_id] = {"id": point2_id, "x": point2[0], "y": point2[1]}

            connections[point1_id] = point2_id

    polygons = doc.getElementsByTagName("polygon")
    for polygon in polygons:
        coordinates = polygon.getAttribute("points").split()
        previous = None
        while coordinates:
            y = float(coordinates.pop())
            x = float(coordinates.pop())

            point = (x, y)
            point_id = get_point_id(point)
            points[point_id] = {"id": point_id, "x": point[0], "y": point[1]}

            if previous is not None:
                connections[get_point_id(previous)] = point_id

            previous = point

    doc.unlink()

    # -- regions
    for k, v in connections.items():
        appended = False
        for region in regions:
            if region[-1] == k:
                region.append(v)
                appended = True

        if appended:
            continue

        regions.append([k, v])

    offset = 0
    for i in range(len(regions)):
        i -= offset

        if len(regions[i]) <= 2:
            del regions[i]
            offset += 1
            continue

        regions[i] = {
            "id": i,
            "layer": 0,
            "points": regions[i],
            "name": "",
            "color": "#fff",
            "opacity": 0.5,
        }

    print(len(regions))

    # -- write json file
    json = {
        "minx": 0,
        "maxx": 3840,
        "miny": 0,
        "maxy": 2160,
        "width": 5408929.82983342,
        "height": 5403072.404726598845,
        "points": list(points.values()),
        "regions": regions,
        "paths": [],
        "places": [],
    }

    with open("output.json", "w") as file:
        dump(json, file)


if __name__ == "__main__":
    main()

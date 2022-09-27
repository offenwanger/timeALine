let MathUtil = function () {
    function vectorFromAToB(a, b) {
        return subtractAFromB(a, b);
    }

    function distanceFromAToB(a, b) {
        let x = a.x - b.x;
        let y = a.y - b.y;

        return Math.sqrt(x * x + y * y);
    }

    function addAToB(a, b) {
        return {
            x: b.x + a.x,
            y: b.y + a.y
        }
    }

    function subtractAFromB(a, b) {
        return {
            x: b.x - a.x,
            y: b.y - a.y
        }
    }

    function pointsEqual(a, b) {
        return a.x == b.x && a.y == b.y;
    }

    function vectorLength(v) {
        return distanceFromAToB(v, { x: 0, y: 0 });
    }

    function normalize(vector) {
        let length = vectorLength(vector);
        if (length == 0) {
            console.error("cannot get normal for 0, 0!")
            return vector;
        }

        return { x: vector.x / length, y: vector.y / length };
    }

    function getPointAtDistanceAlongVector(distance, vector, origin = { x: 0, y: 0 }) {
        let normalVector = normalize(vector);
        return { x: normalVector.x * distance + origin.x, y: normalVector.y * distance + origin.y };
    }

    function projectPointOntoVector(point, vector, origin = { x: 0, y: 0 }) {
        // handle edge case of straight normal
        if (vector.y == 0) {
            return { x: point.x, y: origin.y, neg: point.x > origin.x }
        }

        if (vector.x == 0) {
            return { x: origin.x, y: point.y, neg: point.y < origin.y }
        }

        let normalVector = normalize(vector);

        let a = origin;
        let b = { x: origin.x + normalVector.x, y: origin.y + normalVector.y }

        var aToB = { x: b.x - a.x, y: b.y - a.y };
        var aToPoint = { x: point.x - a.x, y: point.y - a.y };
        var sqLenAToB = aToB.x * aToB.x + aToB.y * aToB.y;
        var dot = aToPoint.x * aToB.x + aToPoint.y * aToB.y;
        var t = dot / sqLenAToB;

        return {
            x: a.x + aToB.x * t,
            y: a.y + aToB.y * t,
            neg: t < 0
        };
    }

    function projectPointOntoLine(coords, point1, point2) {
        var p1ToP2 = {
            x: point2.x - point1.x,
            y: point2.y - point1.y
        };
        var p1ToCoords = {
            x: coords.x - point1.x,
            y: coords.y - point1.y
        };
        var p1ToP2LenSquared = p1ToP2.x * p1ToP2.x + p1ToP2.y * p1ToP2.y;
        var dot = p1ToCoords.x * p1ToP2.x + p1ToCoords.y * p1ToP2.y;
        var percent = Math.min(1, Math.max(0, dot / p1ToP2LenSquared));

        return {
            x: point1.x + p1ToP2.x * percent,
            y: point1.y + p1ToP2.y * percent,
            percent: percent
        };
    }

    function vectorToRotation(vector) {
        vector = normalize(vector);
        var angle = Math.atan2(vector.y, vector.x);   //radians
        // you need to devide by PI, and MULTIPLY by 180:
        var degrees = 180 * angle / Math.PI;  //degrees
        return (360 + Math.round(degrees)) % 360 - 90; //round number, avoid decimal fragments
    }

    function rotateVectorLeft(vector) {
        return { x: -vector.y, y: vector.x };
    }

    function rotateVectorRight(vector) {
        return { x: vector.y, y: -vector.x };
    }

    return {
        vectorFromAToB,
        distanceFromAToB,
        addAToB,
        subtractAFromB,
        pointsEqual,
        vectorLength,
        normalize,
        getPointAtDistanceAlongVector,
        projectPointOntoVector,
        projectPointOntoLine,
        vectorToRotation,
        rotateVectorLeft,
        rotateVectorRight,
    }
}();

let PathMath = function () {
    let cache = {};
    const PATH_PRECISION = 10; // pixels

    function getHash(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array: ", points);
            return "";
        };

        return points.map(p => "(" + Math.round(p.x) + "," + Math.round(p.y) + ")").join(",");
    }

    function getPathData(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array: ", points);
            return {};
        };

        let hash = getHash(points);
        if (!cache[hash]) {
            cache[hash] = { accessed: Date.now() }

            if (Object.keys(cache).length > 10) {
                // ditch the least used
                let deleteItem = Object.entries(cache).reduce((min, d) => {
                    if (d[1].accessed < min[1].accessed) {
                        return d;
                    } else {
                        return min;
                    }
                })

                delete cache[deleteItem[0]]
            }
        }
        return cache[hash]
    }

    let mLineGenerator;
    function getPathD(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array: ", points);
            return "";
        };

        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.pathD) {
            if (!mLineGenerator) {
                mLineGenerator = d3.line()
                    .x((p) => p.x)
                    .y((p) => p.y)
                    .curve(d3.curveCatmullRom.alpha(0.5));
            }

            pathData.pathD = mLineGenerator(points);
        }

        return pathData.pathD;
    }

    function getPath(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));
        return path;
    }

    function getPathLength(points) {
        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.length) {
            let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('d', getPathD(points));
            pathData.length = path.getTotalLength();
        }

        return pathData.length;
    }

    function equalsPath(points1, points2) {
        if (points1.length != points2.length) return false;
        for (let i = 0; i < points1.length; i++) {
            if (points1[i].x != points2[i].x || points1[i].y != points2[i].y) return false;
        }
        return true;
    }

    function getClosestPointOnPath(coords, points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array: ", points);
            return { x: 0, y: 0, percent: 0, length: 0 };
        };

        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.pointsStructure) {
            pathData.pointsStructure = createPointsStructure(points);
        }

        let pointsStructure = pathData.pointsStructure;

        if (pointsStructure.length < 2) {
            console.error("Bad state! Should be impossible for points structures to have less than 2 points.", pointsStructure);
            return { x: 0, y: 0, percent: 0, length: 0 };
        }

        let point1 = pointsStructure.reduce((minData, pointData) => {
            let dist = MathUtil.distanceFromAToB(coords, pointData.point);
            if (dist < minData.dist) {
                return { dist, pointData };
            } else {
                return minData;
            }
        }, { dist: Infinity }).pointData;

        // we now have 1 - 2 points to check to see which is closest;
        let point2 = (point1.index + 1) == pointsStructure.length ? null : pointsStructure[point1.index + 1];
        let prevPoint = point1.index == 0 ? null : pointsStructure[point1.index - 1];
        if (!point2 || (prevPoint &&
            MathUtil.distanceFromAToB(coords, prevPoint.point) <
            MathUtil.distanceFromAToB(coords, point2.point))) {
            point2 = point1;
            point1 = prevPoint;
        }

        let pathLength = getPathLength(points);
        let projectedPoint = MathUtil.projectPointOntoLine(coords, point1.point, point2.point);
        let lenOnLine = MathUtil.distanceFromAToB(point1.point, point2.point) * projectedPoint.percent;
        let length = lenOnLine + point1.percent * pathLength;
        let percent = length / pathLength;

        return { x: projectedPoint.x, y: projectedPoint.y, percent, length };
    }

    function getPositionForPercent(points, percent) {
        if (isNaN(percent)) throw new Error("Invalid percent: " + percent);
        if (!points) throw new Error("Invalid point array:  " + points);
        if (points.length < 2) throw new Error("Invalid point array, too short: " + points);

        if (percent < 0) {
            let direction = MathUtil.vectorFromAToB(points[1], points[0]);
            let length = Math.abs(percent) * TAIL_LENGTH;
            return MathUtil.getPointAtDistanceAlongVector(length, direction, points[0]);
        } else if (percent > 1) {
            let direction = MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1]);
            let length = (percent - 1) * TAIL_LENGTH;
            return MathUtil.getPointAtDistanceAlongVector(length, direction, points[points.length - 1]);
        } else {
            let path = getPath(points);
            let length = path.getTotalLength() * percent;
            let point = path.getPointAtLength(length);
            return { x: point.x, y: point.y };
        }
    }

    function getNormalForPercent(points, percent) {
        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        let path = getPath(points);
        let totalLength = path.getTotalLength();
        let length = totalLength * percent;

        let point1, point2;
        // if the percent is really close to or off the end
        if (length < 1) {
            point1 = points[0]
            point2 = points[1];
        } else if (length > totalLength - 1) {
            point1 = points[points.length - 2];
            point2 = points[points.length - 1];
        } else {
            point1 = path.getPointAtLength(length);
            point2 = path.getPointAtLength(length + 1);
        }

        return MathUtil.rotateVectorRight(MathUtil.normalize(MathUtil.vectorFromAToB(point1, point2)));
    }

    function getPositionForPercentAndDist(points, percent, dist) {
        if (isNaN(percent) || isNaN(dist)) throw new Error("Invalid percent, dist: " + percent + ", " + dist);

        let basePose = getPositionForPercent(points, percent);
        let normal = getNormalForPercent(points, percent);

        return MathUtil.getPointAtDistanceAlongVector(dist, normal, basePose);
    }

    function getPointsWithin(x, coords, points) {
        let returnable = [];
        for (let i = 0; i < points.length; i++) {
            if (MathUtil.distanceFromAToB(points[i], coords) < x) returnable.push(i);
        }
        return returnable;
    }

    function segmentPath(points, fineDetail, labelerFunc) {
        let segments = []

        let seg = { label: labelerFunc(points[0]), points: [points[0]] };
        for (let i = 1; i < points.length; i++) {
            let point = points[i];
            let label = labelerFunc(point);
            if (label == seg.label) {
                seg.points.push(point);
            } else {
                segments.push(seg)
                seg = { label, points: [point] }
            }
        }
        segments.push(seg);

        if (fineDetail && segments.length == 1) {
            let originalSegment = segments[0];

            segments = [];
            let seg = { label: originalSegment.label, points: [originalSegment.points[0]] };
            for (let i = 1; i < originalSegment.points.length; i++) {
                let startLen = getPathLength(originalSegment.points.slice(0, i))
                let subPath = getPath(originalSegment.points.slice(0, i + 1));
                let endLen = subPath.getTotalLength();

                for (let len = startLen; len < endLen; len++) {
                    let point = subPath.getPointAtLength(len);
                    let label = labelerFunc(point);
                    if (label != seg.label) {
                        seg.points.push({ x: point.x, y: point.y });
                        segments.push(seg);
                        seg = { label, points: [{ x: point.x, y: point.y }] }
                    }
                }

                seg.points.push(originalSegment.points[i]);
            }
            segments.push(seg);

        } else if (fineDetail) {
            for (let i = 0; i < segments.length - 1; i++) {
                let startLen = getPathLength(mergeSegments(segments.slice(0, i + 1)))
                let subPath = getPath(mergeSegments(segments.slice(0, i + 2)));
                let endLen = subPath.getTotalLength();

                let found = false;
                for (let len = startLen; len < endLen; len++) {
                    let point = subPath.getPointAtLength(len);
                    let label = labelerFunc(point);
                    if (label != segments[i].label) {
                        if (label != segments[i + 1].label) console.error("Something funky going on here.", label, segments[i].label, segments[i + 1].label);
                        // we found the crossover point
                        segments[i].points.push({ x: point.x, y: point.y });
                        segments[i + 1].points.unshift({ x: point.x, y: point.y });
                        found = true;
                        break;
                    }
                }
                if (!found) console.error("Unhandled edge case! But probably won't break anything by itself.");
            }
        }

        return segments;
    }

    function mergeSegments(segments) {
        if (!segments.length) throw new Error("Array has no length!");

        let points = [...segments[0].points];
        for (let i = 1; i < segments.length; i++) {
            let s = segments[i];
            if (MathUtil.pointsEqual(s.points[0], points[points.length - 1])) {
                points.push(...s.points.slice(1))
            } else {
                points.push(...s.points)
            }
        }
        return points;
    }

    function cloneSegments(segments) {
        return [...segments.map(segment => {
            return {
                label: segment.label,
                points: segment.points.map(p => {
                    return { x: p.x, y: p.y };
                })
            };
        })]
    }

    // UTILITY //


    function createPointsStructure(points) {
        let path = getPath(points);
        let pathLength = getPathLength(points);

        let pointsStructure = [];
        for (let scanLength = 0; scanLength < pathLength + PATH_PRECISION; scanLength += PATH_PRECISION) {
            let currLen = Math.min(scanLength, pathLength);

            // get the point
            let point = path.getPointAtLength(currLen);
            pointsStructure.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, path)
            });
        }

        // if the line is really twisty, add extra points.
        let refinedPointsStructure = [pointsStructure[0]];
        for (let i = 1; i < pointsStructure.length; i++) {
            if (MathUtil.distanceFromAToB(pointsStructure[i - 1].point, pointsStructure[i].point) < 0.75 * PATH_PRECISION) {
                let percent = (pointsStructure[i - 1].percent + pointsStructure[i].percent) / 2;
                let currLen = pathLength * percent;
                let point = path.getPointAtLength(currLen);

                refinedPointsStructure.push({
                    point: { x: point.x, y: point.y },
                    percent,
                    normal: getNormal(point, currLen, pathLength, path)
                });
            }

            refinedPointsStructure.push(pointsStructure[i])
        }

        for (let i = 0; i < refinedPointsStructure.length; i++) {
            refinedPointsStructure[i].index = i;
        }

        return refinedPointsStructure;
    }

    function getNormal(point, pointLen, pathLength, path) {
        let point1 = point;
        let point2;
        if (pointLen + 1 > pathLength) {
            point1 = path.getPointAtLength(pointLen - 1);
            point2 = point;
        } else {
            point2 = path.getPointAtLength(pointLen + 1);
        }
        let normal = MathUtil.rotateVectorRight(MathUtil.normalize(MathUtil.vectorFromAToB(point1, point2)));

        return normal;
    }

    // END UTILITY //

    return {
        getPathD,
        getPath,
        getPathLength,
        equalsPath,
        getPositionForPercent,
        getNormalForPercent,
        getPositionForPercentAndDist,
        getClosestPointOnPath,
        getPointsWithin,
        segmentPath,
        mergeSegments,
        cloneSegments,
    }
}();

let DataUtil = function () {
    function inferDataAndType(cellVal) {
        if (typeof (x) === 'number') {
            return { val: cellVal, type: DataTypes.NUM }
        } else if (isNumeric(String(cellVal))) {
            return { val: parseFloat("" + cellVal), type: DataTypes.NUM }
        } else {
            return { val: String(cellVal), type: DataTypes.TEXT }
        }
    }

    function isDate(val) {
        // this is too aggressive
        return !isNaN(Date.parse(val));
    }

    function isNumeric(val) {
        return isFloat(val) || isInt(val);
    }

    function isFloat(val) {
        var floatRegex = /^-?\d+(?:[.,]\d*?)?$/;
        if (!floatRegex.test(val))
            return false;

        val = parseFloat(val);
        if (isNaN(val))
            return false;
        return true;
    }

    function isInt(val) {
        var intRegex = /^-?\d+$/;
        if (!intRegex.test(val))
            return false;

        var intVal = parseInt(val, 10);
        return parseFloat(val) == intVal && !isNaN(intVal);
    }

    function getUniqueList(list, key = null) {
        return [...new Map(list.map(item => [key ? item[key] : item, item])).values()]
    }

    function AGreaterThanB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a > b;
        } else if (type == DataTypes.TEXT) {
            return String(a) > String(b);
        } else { throw new Error("Cannot calculate greaterThan for type: " + type); }
    }

    function subtractAFromB(a, b, type) {
        if (type == DataTypes.NUM) {
            return b - a;
        } else { throw new Error("Cannot calculate subtract for type: " + type); }
    }

    function AEqualsB(a, b, type) {
        if (type == DataTypes.NUM) {
            // only check to 4 decimal places
            return Math.round(a * 10000) == Math.round(b * 10000);
        } else if (type == DataTypes.TEXT) {
            return a == b;
        } else { throw new Error("Cannot calculate equals for type: " + type); }
    }

    function incrementAByB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a + b;
        } else { throw new Error("Cannot calculate increment by for type: " + type); }
    }

    function getFormattedDate(date) {
        if (!(date instanceof Date)) {
            let num = date;
            date = new Date(num);
            if (isNaN(date)) {
                console.error("Not a date!", num);
                return "";
            }
        }

        let year = date.getFullYear();
        let month = date.toLocaleString('en-US', { month: 'short' });
        let day = date.getDate();
        let hour = date.getHours();
        let min = date.getMinutes();
        let sec = date.getSeconds();

        day = (day < 10 ? "0" : "") + day;
        hour = (hour < 10 ? "0" : "") + hour;
        min = (min < 10 ? "0" : "") + min;
        sec = (sec < 10 ? "0" : "") + sec;

        return month + " " + day + ", " + year + " " + hour + ":" + min + ":" + sec;
    }

    function filterTimePinByChangedPin(pins, changedPin) {
        let filtered = pins.filter(pin => {
            // clear the binding out of the array so we can readd the new data
            if (pin.id == changedPin.id) return false;
            if (!pin.timeStamp || !changedPin.timeStamp) return true;

            // otherwise make sure time and bindings both increase in the same direction
            return (pin.timeStamp < changedPin.timeStamp && pin.linePercent < changedPin.linePercent) ||
                (pin.timeStamp > changedPin.timeStamp && pin.linePercent > changedPin.linePercent);
        });
        filtered.push(changedPin);
        return filtered;
    }


    return {
        inferDataAndType,
        getUniqueList,
        isDate,
        isNumeric,

        AGreaterThanB,
        subtractAFromB,
        AEqualsB,
        incrementAByB,

        getFormattedDate,

        filterTimePinByChangedPin,
    }
}();

let ToolTip = function () {
    function show(str, pos) {
        let div = $("#tooltip-div").css({
            left: pos.x + 10,
            top: pos.y + 10
        });
        div.html(str);
        div.show();
    }

    return {
        show,
        hide: function () { $("#tooltip-div").hide(); }
    }
}();
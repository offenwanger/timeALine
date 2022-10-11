let MathUtil = function () {
    function vectorFromAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors!", a, b);
            return { x: 0, y: 0 };
        }

        return subtractAFromB(a, b);
    }

    function distanceFromAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors!", a, b);
            return 0;
        }

        let x = a.x - b.x;
        let y = a.y - b.y;

        return Math.sqrt(x * x + y * y);
    }

    function addAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors!", a, b);
            return { x: 0, y: 0 };
        }

        return {
            x: b.x + a.x,
            y: b.y + a.y
        }
    }

    function subtractAFromB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors!", a, b);
            return { x: 0, y: 0 };
        }

        return {
            x: b.x - a.x,
            y: b.y - a.y
        }
    }

    function pointsEqual(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors!", a, b);
            return false;
        }

        return a.x == b.x && a.y == b.y;
    }

    function vectorLength(v) {
        if (!v || !isNumeric(v.x) || !isNumeric(v.y)) {
            console.error("Invalid vector!", v);
            return 0;
        }

        return distanceFromAToB(v, { x: 0, y: 0 });
    }

    function normalize(vector) {
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector!", vector);
            return { x: 0, y: 0 };
        }

        let length = vectorLength(vector);
        if (length == 0) {
            console.error("Invalid vector!", vector)
            return vector;
        }

        return { x: vector.x / length, y: vector.y / length };
    }

    function getPointAtDistanceAlongVector(distance, vector, origin = { x: 0, y: 0 }) {
        if (!origin || !isNumeric(origin.x) || !isNumeric(origin.y) || !isNumeric(distance)) {
            console.error("Invalid values!", origin, distance);
            return { x: 0, y: 0 };
        }

        let normalVector = normalize(vector);
        return { x: normalVector.x * distance + origin.x, y: normalVector.y * distance + origin.y };
    }

    function projectPointOntoVector(point, vector, origin = { x: 0, y: 0 }) {
        if (!point || !isNumeric(point.x) || !isNumeric(point.y) ||
            !origin || !isNumeric(origin.x) || !isNumeric(origin.y) ||
            !vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid values!", point, vector, origin);
            return { x: 0, y: 0, neg: 0 };
        }

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
        if (!coords || !isNumeric(coords.x) || !isNumeric(coords.y) ||
            !point1 || !isNumeric(point1.x) || !isNumeric(point1.y) ||
            !point2 || !isNumeric(point2.x) || !isNumeric(point2.y)) {
            console.error("Invalid values!", coords, point1, point2);
            return { x: 0, y: 0, percent: 0 };
        }

        if (MathUtil.pointsEqual(point1, point2)) {
            console.error("Invalid Line!", point1, point2);
            return {
                x: point1.x,
                y: point1.y,
                percent: 0
            }
        }

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
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: -vector.y, y: vector.x };
    }

    function rotateVectorRight(vector) {
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: vector.y, y: -vector.x };
    }

    function isNumeric(val) {
        return typeof val == 'number';
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
    function getLineGenerator() {
        if (!mLineGenerator) {
            mLineGenerator = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveCatmullRom.alpha(0.5));
        }
        return mLineGenerator;
    }


    function getPathD(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array: ", points);
            return "";
        };

        return getLineGenerator()(points);
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

    function getSubpathLength(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));
        return path.getTotalLength();
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

        let metaPoints = getMetaPoints(points);

        if (metaPoints.length < 2) {
            console.error("Bad state! Should be impossible for points structures to have less than 2 points.", metaPoints);
            return { x: 0, y: 0, percent: 0, length: 0 };
        }

        let point1 = metaPoints.reduce((minData, pointData) => {
            let dist = MathUtil.distanceFromAToB(coords, pointData.point);
            if (dist < minData.dist) {
                return { dist, pointData };
            } else {
                return minData;
            }
        }, { dist: Infinity }).pointData;

        // we now have 1 - 2 points to check to see which is closest;
        let point2 = (point1.index + 1) == metaPoints.length ? null : metaPoints[point1.index + 1];
        let prevPoint = point1.index == 0 ? null : metaPoints[point1.index - 1];

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

        if (percent <= 0) {
            let direction = MathUtil.vectorFromAToB(points[1], points[0]);
            let length = Math.abs(percent) * TAIL_LENGTH;
            return MathUtil.getPointAtDistanceAlongVector(length, direction, points[0]);
        } else if (percent >= 1) {
            let direction = MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1]);
            let length = (percent - 1) * TAIL_LENGTH;
            return MathUtil.getPointAtDistanceAlongVector(length, direction, points[points.length - 1]);
        } else {
            let metaPoints = getMetaPoints(points);
            let afterPoint = null;
            for (let i = 0; i < metaPoints.length; i++) {
                if (percent < metaPoints[i].percent) {
                    afterPoint = metaPoints[i];
                    break;
                }
            }
            if (afterPoint.index == 0) {
                console.error("Code should be unreachable", percent, afterPoint);
                afterPoint = metaPoints[1];
            }
            let beforePoint = metaPoints[afterPoint.index - 1];

            let percentBetween = (percent - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
            let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
            let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;

            return { x, y };
        }
    }

    function getNormalForPercent(points, percent) {
        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        if (percent <= 0) {
            return MathUtil.rotateVectorRight(
                MathUtil.normalize(
                    MathUtil.vectorFromAToB(points[0], points[1])));
        } else if (percent >= 1) {
            return MathUtil.rotateVectorRight(
                MathUtil.normalize(
                    MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1])));
        } else {
            let metaPoints = getMetaPoints(points);
            let afterPoint = null;
            for (let i = 0; i < metaPoints.length; i++) {
                if (percent < metaPoints[i].percent) {
                    afterPoint = metaPoints[i];
                    break;
                }
            }
            if (afterPoint.index == 0) {
                console.error("Code should be unreachable", "percent:" + percent, afterPoint);
                afterPoint = metaPoints[1];
            }
            let beforePoint = metaPoints[afterPoint.index - 1];

            let normalPositionBefore = MathUtil.addAToB(beforePoint.point, beforePoint.normal);
            let normalPositionAfter = MathUtil.addAToB(afterPoint.point, afterPoint.normal);

            let percentBetween = (percent - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
            let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
            let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;
            let normalX = percentBetween * (normalPositionAfter.x - normalPositionBefore.x) + normalPositionBefore.x;
            let normalY = percentBetween * (normalPositionAfter.y - normalPositionBefore.y) + normalPositionBefore.y;

            let normalVector = MathUtil.vectorFromAToB({ x, y }, { x: normalX, y: normalY });

            return MathUtil.normalize(normalVector);
        }
    }

    function getPositionForPercentAndDist(points, percent, dist) {
        if (isNaN(percent) || isNaN(dist)) {
            console.error("Invalid percent, dist!", percent, dist);
            return { x: 0, y: 0 };
        }

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

    function segmentPath(points, labelerFunc) {
        let metaPoints = getMetaPoints(points);

        let segments = []

        let seg = { label: labelerFunc(metaPoints[0].point, metaPoints[0].percent), points: [metaPoints[0].point] };
        for (let i = 1; i < metaPoints.length; i++) {
            let point = metaPoints[i].point;
            let label = labelerFunc(point, metaPoints[i].percent);
            if (label == seg.label) {
                if (metaPoints[i].isOriginal) seg.points.push(point);
            } else {
                seg.points.push(point);
                segments.push(seg)
                seg = { label, points: [{ x: point.x, y: point.y }] }
            }
        }
        segments.push(seg);

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

    function getMetaPoints(points) {
        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.metaPoints) {
            pathData.metaPoints = createMetaPoints(points);
        }

        return pathData.metaPoints;
    }

    function createMetaPoints(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));

        let pathLength = getPathLength(points);

        let metaPoints = [];
        for (let scanLength = 0; scanLength < pathLength + PATH_PRECISION; scanLength += PATH_PRECISION) {
            let currLen = Math.min(scanLength, pathLength);

            // get the point
            let point = path.getPointAtLength(currLen);
            metaPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, path)
            });
        }

        // if the line is really twisty, add extra points.
        let prevPointsStructure = metaPoints;
        metaPoints = [metaPoints[0]];
        for (let i = 1; i < prevPointsStructure.length; i++) {
            if (MathUtil.distanceFromAToB(prevPointsStructure[i - 1].point, prevPointsStructure[i].point) < 0.75 * PATH_PRECISION) {
                let percent = (prevPointsStructure[i - 1].percent + prevPointsStructure[i].percent) / 2;
                let currLen = pathLength * percent;
                let point = path.getPointAtLength(currLen);

                metaPoints.push({
                    point: { x: point.x, y: point.y },
                    percent,
                    normal: getNormal(point, currLen, pathLength, path)
                });
            }

            metaPoints.push(prevPointsStructure[i])
        }

        let originalPoints = [];
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let currLen = getSubpathLength(points.slice(0, i + 1));
            originalPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, path),
                isOriginal: true
            });
        }

        prevPointsStructure = originalPoints.concat(metaPoints);
        prevPointsStructure.sort((a, b) => a.percent - b.percent);
        metaPoints = [prevPointsStructure[0]]
        for (let i = 1; i < prevPointsStructure.length; i++) {
            let pointData = prevPointsStructure[i];
            let lastPointData = metaPoints[metaPoints.length - 1];
            if (MathUtil.pointsEqual(lastPointData.point, pointData.point)) {
                // we're going to assume that if the percents are the same the points are close enough to make no difference
                lastPointData.isOriginal = lastPointData.isOriginal || pointData.isOriginal;
            } else {
                metaPoints.push(pointData);
            }
        }

        for (let i = 0; i < metaPoints.length; i++) {
            metaPoints[i].index = i;
        }

        return metaPoints;
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
        getPathLength,
        getSubpathLength,
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

    function getColorBetween(color1, color2, percent) {
        let rgb1 = color1.match(/\w\w/g).map((c) => parseInt(c, 16));
        let rgb2 = color2.match(/\w\w/g).map((c) => parseInt(c, 16));

        if (rgb1.length != 3 || rgb2.length != 3 || rgb1.some(n => isNaN(n)) || rgb2.some(n => isNaN(n))) {
            console.error("Invalid hex color!", color1, color2);
            return "#000000";
        }

        let avgRGB = []
        for (let i = 0; i < 3; i++) {
            avgRGB[i] = Math.round(rgb1[i] + ((rgb2[i] - rgb1[i]) * percent)).toString(16).padStart(2, '0');
        }
        return '#' + avgRGB.join("");
    }

    function filterTimePinByChangedPin(pins, changedPin, timeAttribute) {
        if (!timeAttribute || isNaN(changedPin[timeAttribute])) {
            console.error("Invalid pin or time attribute!", changedPin, timeAttribute);
            return pins;
        }

        let filtered = pins.filter(pin => {
            // clear the binding out of the array so we can read the new data
            if (pin.id == changedPin.id) return false;
            if (!pin[timeAttribute] || !changedPin[timeAttribute]) return true;

            // otherwise make sure time and bindings both increase in the same direction
            return (pin[timeAttribute] < changedPin[timeAttribute] && pin.linePercent < changedPin.linePercent) ||
                (pin[timeAttribute] > changedPin[timeAttribute] && pin.linePercent > changedPin.linePercent);
        });
        filtered.push(changedPin);
        filtered.sort((a, b) => a.linePercent - b.linePercent);
        return filtered;
    }

    function timelineStrokesChanged(timeline1, timeline2) {
        if (!timeline1) {
            if (!timeline2) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline2.annotationStrokes.map(s => s.id);
        }

        if (!timeline2) {
            if (!timeline1) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline1.annotationStrokes.map(s => s.id);
        }

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let pinChanged = timeline1.timePins.length != timeline2.timePins.length ||
            timeline1.timePins.some(pin => {
                // check if at least one pin has changed.
                let oldPin = timeline2.timePins.find(p => p.id == pin.id);
                // pin set mismatch, that's a change.
                if (!oldPin) return true;
                // otherwise check if the line percent has changed.
                if (oldPin.linePercent != pin.linePercent) return true;
                return false;
            });
        if (pinChanged) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let allIds = DataUtil.getUniqueList(
            timeline1.annotationStrokes.map(s => s.id).concat(
                timeline2.annotationStrokes.map(s => s.id)));

        let changedIds = allIds.filter(id => {
            let stroke1 = timeline1.annotationStrokes.find(s => s.id == id);
            let stroke2 = timeline2.annotationStrokes.find(s => s.id == id);
            // if either is missing this has changed.
            if (!stroke1 || !stroke2) return true;
            // if the path has changed it's changed.
            if (!stroke1.equals(stroke2)) return true;
            // no change
            return false;
        });
        return changedIds;
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

        getColorBetween,

        filterTimePinByChangedPin,
        timelineStrokesChanged,
    }
}();

let ToolTip = function (id) {
    let tooltipDiv = $("<div>");
    tooltipDiv.addClass("tooltip-div");
    tooltipDiv.attr("id", id);
    $("body").append(tooltipDiv);

    function show(str, pos) {
        tooltipDiv.css({
            left: pos.x + 10,
            top: pos.y + 10
        });
        tooltipDiv.html(str);

        if (pos.x + 10 + tooltipDiv.outerWidth() > window.innerWidth) {
            tooltipDiv.css({
                left: pos.x - 10 - tooltipDiv.outerWidth(),
            });
        }

        if (pos.y + 10 + tooltipDiv.outerHeight() > window.innerHeight) {
            tooltipDiv.css({
                top: pos.y - 10 - tooltipDiv.outerHeight(),
            });
        }

        tooltipDiv.show();
    }

    function hide() {
        tooltipDiv.hide();
    }

    return { show, hide }
};
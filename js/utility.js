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
            return { point: { x: point.x, y: origin.y }, neg: point.x > origin.x }
        }

        if (vector.x == 0) {
            return { point: { x: origin.x, y: point.y }, neg: point.y < origin.y }
        }

        let normalVector = normalize(vector);

        let a = origin;
        let b = { x: origin.x + normalVector.x, y: origin.y + normalVector.y }

        var aToB = { x: b.x - a.x, y: b.y - a.y };
        var aToPoint = { x: point.x - a.x, y: point.y - a.y };
        var sqLenAToB = aToB.x * aToB.x + aToB.y * aToB.y;
        var dot = aToPoint.x * aToB.x + aToPoint.y * aToB.y;
        var t = dot / sqLenAToB;

        dot = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);

        return {
            x: a.x + aToB.x * t,
            y: a.y + aToB.y * t,
            neg: t < 0
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
        vectorToRotation,
        rotateVectorLeft,
    }
}();

let PathMath = function () {
    let mLineGenerator;
    function getPathD(points) {
        if (!mLineGenerator) {
            mLineGenerator = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveCatmullRom.alpha(0.5));
        }

        return mLineGenerator(points);
    }

    function getPath(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));
        return path;
    }

    function getPathLength(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));
        return path.getTotalLength();
    }

    function getClosestPointOnPath(point, points) {
        let path = getPath(points);
        let pathLength = path.getTotalLength();
        let precision = 20;

        let bestPoint;
        let bestLength;
        let bestDistance = Infinity;

        for (let scanLength = 0; scanLength <= pathLength + precision; scanLength += precision) {
            let scan = path.getPointAtLength(Math.min(scanLength, pathLength));
            let scanDistance = MathUtil.distanceFromAToB(scan, point);
            if (scanDistance < bestDistance) {
                bestPoint = scan;
                bestLength = Math.min(scanLength, pathLength);
                bestDistance = scanDistance;
            }
        }

        // binary search for precise estimate
        while (precision > 0.5) {
            precision /= 2;

            let beforeLength = bestLength - precision;
            let beforePoint = path.getPointAtLength(beforeLength);
            let beforeDistance = MathUtil.distanceFromAToB(beforePoint, point);

            let afterLength = bestLength + precision;
            let afterPoint = path.getPointAtLength(afterLength);
            let afterDistance = MathUtil.distanceFromAToB(afterPoint, point);

            if (beforeLength >= 0 && beforeDistance < bestDistance) {
                bestPoint = beforePoint;
                bestLength = beforeLength;
                bestDistance = beforeDistance;
            } else if (afterLength <= pathLength && afterDistance < bestDistance) {
                bestPoint = afterPoint;
                bestLength = afterLength;
                bestDistance = afterDistance;
            }
        }

        return { x: bestPoint.x, y: bestPoint.y, percent: bestLength / path.getTotalLength(), length: bestLength };
    }

    function getPositionForPercent(points, percent) {
        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

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
            return path.getPointAtLength(length);
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

        return MathUtil.rotateVectorLeft(MathUtil.normalize(MathUtil.vectorFromAToB(point1, point2)));
    }

    function getPositionForPercentAndDist(points, percent, dist) {
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

    function mergePointSegments(segments) {
        return segments[0].concat(...segments
            .slice(1, segments.length)
            // slice off the first point as it's a duplicate in a properly formatted segment array.
            .map(points => points.slice(1, points.length)));
    }

    return {
        getPathD,
        getPath,
        getPathLength,
        getPositionForPercent,
        getPositionForPercentAndDist,
        getClosestPointOnPath,
        getPointsWithin,
        mergePointSegments,
    }
}();

let TimeBindingUtil = function () {
    const TIMESTRAMP = TimeBindingTypes.TIMESTRAMP;

    function AGreaterThanB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid Comparison between " + a.type + " and " + b.type);

            return a.timestamp > b.timestamp;
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function ALessThanB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid Comparison between " + a.type + " and " + b.type);

            return a.timestamp < b.timestamp;
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function AEqualsB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid Comparison between " + a.type + " and " + b.type);

            return a.timestamp == b.timestamp;
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function timeBetweenAandB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return Math.abs(a.timestamp - b.timestamp);
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function subtractAFromB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return b.timestamp - a.timestamp;
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function percentBetweenAandB(a, b, val) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);
            if (val.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + val.type);

            return (val - a.timestamp) / (b.timestamp - a.timestamp);
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function averageAandB(a, b) {
        if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return Math.floor((a.timestamp + b.timestamp) / 2);
        } else {
            console.error("Invalid time type: " + a.type);
        }
    }

    function incrementBy(time, value) {
        if (time.type == TIMESTRAMP) {
            time.timestamp += value;
        } else {
            console.error("Invalid time type: " + a.type);
        }
        return time;
    }

    return {
        AGreaterThanB,
        ALessThanB,
        AEqualsB,
        timeBetweenAandB,
        subtractAFromB,
        percentBetweenAandB,
        averageAandB,
        incrementBy,
    }
}();

let DataUtil = function () {
    function inferDataAndType(cellVal) {
        if (typeof (x) === 'number') {
            return { val: cellVal, type: DataTypes.NUM }
        } else if (isNumeric("" + cellVal)) {
            return { val: parseFloat("" + cellVal), type: DataTypes.NUM }
        } else if ((cellVal instanceof DataStructs.TimeBinding && cellVal.type == TimeBindingTypes.TIMESTRAMP)) {
            return { val: cellVal.timeStamp, type: TimeBindingTypes.TIMESTRAMP }
        } else if (isDate(cellVal)) {
            if (cellVal instanceof DataStructs.TimeBinding) return cellVal;
            else return { val: Date.parse(cellVal), type: TimeBindingTypes.TIMESTRAMP }
        } else {
            return { val: cellVal, type: DataTypes.TEXT }
        }
    }

    function isDate(val) {
        return val instanceof DataStructs.TimeBinding || !isNaN(Date.parse(val));
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
        return [...new Map(list.map(binding => [key ? binding[key] : binding, binding])).values()]
    }

    return {
        inferDataAndType,
        getUniqueList,
        isDate,
        isNumeric,
    }
}();

function CanvasMask(canvas) {
    this.canvas = canvas;
    let mContext = canvas.getContext("2d");

    this.isCovered = function (coords) {
        return mContext.getImageData(coords.x, coords.y, 1, 1).data[3] > 0;
    }
}
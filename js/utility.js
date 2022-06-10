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
    }
}();

let PathMath = function () {
    let mLineGenerator = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

    function getPath(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', mLineGenerator(points));
        return path;
    }

    function getPathLength(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', mLineGenerator(points));
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
        getPathD: (points) => mLineGenerator(points),
        getPath,
        getPathLength,
        getPositionForPercent,
        getClosestPointOnPath,
        getPointsWithin,
        mergePointSegments,
    }
}();

let TimeWarpUtil = function () {
    const PLACE_HOLDER = TimeBindingTypes.PLACE_HOLDER;
    const TIMESTRAMP = TimeBindingTypes.TIMESTRAMP;

    function timeOfAGreaterThanB(a, b) {
        return TimeBindingUtil.AGreaterThanB(a.timeBinding, b.timeBinding);
    }

    function timeBetweenAandB(a, b) {
        return TimeBindingUtil.timeBetweenAandB(a.timeBinding, b.timeBinding);
    }

    function averageAandB(a, b) {
        return new DataStructs.WarpPoint(TimeBindingUtil.averageAandB(a.timeBinding, b.timeBinding), (a.linePercent + b.linePercent) / 2)
    }

    function incrementBy(warpPoint, time) {
        if (warpPoint.timeBinding.type == PLACE_HOLDER) {
            warpPoint.timeBinding.placeHolder += time;
        } else if (warpPoint.timeBinding.type == TIMESTRAMP) {
            warpPoint.timeBinding.timestamp += time;
        }
        return warpPoint;
    }

    return {
        timeOfAGreaterThanB,
        timeBetweenAandB,
        averageAandB,
        incrementBy,
    }
}();

let TimeBindingUtil = function () {
    const PLACE_HOLDER = TimeBindingTypes.PLACE_HOLDER;
    const TIMESTRAMP = TimeBindingTypes.TIMESTRAMP;

    function AGreaterThanB(a, b) {
        if (a.type == PLACE_HOLDER) {
            if (b.type != PLACE_HOLDER) throw new Error("Invalid Comparison between ", + a.type + " and " + b.type);

            return a.placeHolder > b.placeHolder;
        } else if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid Comparison between ", + a.type + " and " + b.type);

            return a.timestamp > b.timestamp;
        }
    }

    function ALessThanB(a, b) {
        if (a.type == PLACE_HOLDER) {
            if (b.type != PLACE_HOLDER) throw new Error("Invalid Comparison between ", + a.type + " and " + b.type);

            return a.placeHolder < b.placeHolder;
        } else if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid Comparison between ", + a.type + " and " + b.type);

            return a.timestamp < b.timestamp;
        }
    }

    function timeBetweenAandB(a, b) {
        if (a.type == PLACE_HOLDER) {
            if (b.type != PLACE_HOLDER) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return Math.abs(a.placeHolder - b.placeHolder);
        } else if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return Math.abs(a.timestamp - b.timestamp);
        }
    }

    function averageAandB(a, b) {
        if (a.type == PLACE_HOLDER) {
            if (b.type != PLACE_HOLDER) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return (a.placeHolder + b.placeHolder) / 2;
        } else if (a.type == TIMESTRAMP) {
            if (b.type != TIMESTRAMP) throw new Error("Invalid operation between ", + a.type + " and " + b.type);

            return Math.floor((a.timestamp + b.timestamp) / 2);
        }
    }

    function incrementBy(time, value) {
        if (time.type == PLACE_HOLDER) {
            time.placeHolder += value;
        } else if (time.type == TIMESTRAMP) {
            time.timestamp += value;
        }
        return time;
    }

    return {
        AGreaterThanB,
        ALessThanB,
        timeBetweenAandB,
        averageAandB,
        incrementBy,
    }
}();

function CanvasMask(canvas) {
    this.canvas = canvas;
    let mContext = canvas.getContext("2d");

    this.isCovered = function (coords) {
        return mContext.getImageData(coords.x, coords.y, 1, 1).data[3] > 0;
    }
}

function createAnnotation(text, timeBinding) {
    let dataRow = new DataStructs.DataRow();

    let timeBindingItem = new DataStructs.DataItem(DataTypes.TIME_BINDING, timeBinding)
    dataRow.dataItems.push(timeBindingItem);

    let textItem = new DataStructs.DataItem(DataTypes.TEXT, text, null, { x: 10, y: 10 })
    dataRow.dataItems.push(textItem);

    return dataRow;
}
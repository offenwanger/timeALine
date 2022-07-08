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
        if (!Array.isArray(points)) throw new Error("Bad point array: " + points);

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
                        seg.points.push(point);
                        segments.push(seg);
                        seg = { label, points: [point] }
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
                        segments[i].points.push(point);
                        segments[i + 1].points.unshift(point);
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

    return {
        getPathD,
        getPath,
        getPathLength,
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
            console.error("Fix the get time type here.");
            return { val: cellVal.timeStamp, type: TimeBindingTypes.TIMESTRAMP }
        } else if (isDate(cellVal)) {
            console.error("Fix the get time type here.");
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
        return [...new Map(list.map(item => [key ? item[key] : item, item])).values()]
    }

    function AGreaterThanB(a, b, type) {
        if (type == DataTypes.TIME_BINDING) {
            return TimeBindingUtil.AGreaterThanB(a, b);
        } else if (type == DataTypes.NUM) {
            return a > b;
        } else { throw new Error("Cannot calculate greaterThan for type: " + type); }
    }

    function subtractAFromB(a, b, type) {
        if (type == DataTypes.TIME_BINDING) {
            return TimeBindingUtil.subtractAFromB(a, b);
        } else if (type == DataTypes.NUM) {
            return b - a;
        } else { throw new Error("Cannot calculate subtract for type: " + type); }
    }

    function AEqualsB(a, b, type) {
        if (type == DataTypes.TIME_BINDING) {
            return TimeBindingUtil.AEqualsB(a, b);
        } else if (type == DataTypes.NUM) {
            // only check to 4 decimal places
            return Math.round(a * 10000) == Math.round(b * 10000);
        } else if (type == DataTypes.TEXT) {
            return a == b;
        } else { throw new Error("Cannot calculate equals for type: " + type); }
    }

    function incrementAByB(a, b, type) {
        if (type == DataTypes.TIME_BINDING) {
            return TimeBindingUtil.incrementBy(a, b);
        } else if (type == DataTypes.NUM) {
            return a + b;
        } else { throw new Error("Cannot calculate increment by for type: " + type); }
    }


    function percentBetween(a, b, v, type) {
        if (type == DataTypes.TIME_BINDING) {
            return TimeBindingUtil.percentBetweenAandB(a, b, v);
        } else if (type == DataTypes.NUM) {
            return (v - a) / (b - a);
        } else { throw new Error("Cannot calculate percents for type: " + type); }
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
        percentBetween,
    }
}();

let WarpBindingUtil = function () {
    function filterValidWarpBindingIds(warpBindingData, alteredBindingData) {
        let alteredType = alteredBindingData.timeCell.getType();
        let alteredValue = alteredBindingData.timeCell.getValue();
        let alteredPercent = alteredBindingData.linePercent;

        let validBindingIds = [];
        warpBindingData.forEach(binding => {
            if (binding.timeCell.getType() == alteredType) {
                if (binding.warpBindingId == alteredBindingData.warpBindingId) {
                    validBindingIds.push(binding.warpBindingId);
                } else if (binding.linePercent > alteredPercent && DataUtil.AGreaterThanB(binding.timeCell.getValue(), alteredValue, alteredType)) {
                    validBindingIds.push(binding.warpBindingId);
                } else if (alteredPercent > binding.linePercent && DataUtil.AGreaterThanB(alteredValue, binding.timeCell.getValue(), alteredType)) {
                    validBindingIds.push(binding.warpBindingId);
                }
            } else {
                validBindingIds.push(binding.warpBindingId);
            }
        });

        return validBindingIds;
    }

    return {
        filterValidWarpBindingIds,
    }
}();
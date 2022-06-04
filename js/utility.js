let MathUtil = function () {
    function vectorFromAToB(a, b) {
        return subtractAFromB(a, b);
    }

    function distanceFromAToB(a, b) {
        let x = a.x - b.x;
        let y = a.y - b.y;

        return Math.sqrt(x * x + y * y);
    }

    function subtractAFromB(a, b) {
        return {
            x: b.x - a.x,
            y: b.y - a.y
        }
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
        subtractAFromB,
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

    function getClosestPointOnPath(point, points) {
        let path = getPath(points);
        let pathLength = path.getTotalLength();
        let precision = 20;

        let bestPoint;
        let bestLength;
        let bestDistance = Infinity;

        for (let scanLength = 0; scanLength <= pathLength; scanLength += precision) {
            let scan = path.getPointAtLength(scanLength);
            let scanDistance =  MathUtil.distanceFromAToB(scan, point);
            if (scanDistance < bestDistance) {
                bestPoint = scan;
                bestLength = scanLength;
                bestDistance = scanDistance;
            }
        }

        // binary search for precise estimate
        precision /= 2;
        while (precision > 0.5) {
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
            } else {
                precision /= 2;
            }
        }

        return { x: bestPoint.x, y: bestPoint.y, percent: bestLength / path.getTotalLength(), length: bestLength };
    }

    return {
        getPathD: (points) => mLineGenerator(points),
        getPath,
        getClosestPointOnPath,
    }
}();
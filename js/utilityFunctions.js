let PathMath = function () {
    function getPointAtPercentOfPath(path, percent) {
        return path.node().getPointAtLength((path.node().getTotalLength() * percent));
    }

    function getClosestPointOnPath(path, point) {
        let pathNode = path.node();
        let pathLength = pathNode.getTotalLength();
        let precision = 20;
        let bestPoint;
        let bestLength;
        let bestDistance = Infinity;

        for (let scanLength = 0; scanLength <= pathLength; scanLength += precision) {
            let scan = pathNode.getPointAtLength(scanLength);
            let scanDistance = distancebetween(scan, point);
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
            let beforePoint = pathNode.getPointAtLength(beforeLength);
            let beforeDistance = distancebetween(beforePoint, point);

            let afterLength = bestLength + precision;
            let afterPoint = pathNode.getPointAtLength(afterLength);
            let afterDistance = distancebetween(afterPoint, point);

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

        return { x: bestPoint.x, y: bestPoint.y, percent: bestLength / pathNode.getTotalLength() };
    }

    function distancebetween(point1, point2) {
        let a = point1.x - point2.x;
        let b = point1.y - point2.y;

        return Math.sqrt(a * a + b * b);
    }
    
    function getNormalAtPercentOfPath(path, percent) {
        // this is not 100% accurate but will be a reasonable approximation
        // there's some stange gankyness when it gets too close to the end, so just use a close vector
        if (percent < 0.001) {
            percent = 0.001
        } else if(percent > 0.999) {
            percent = .999
        }

        let point1 = getPointAtPercentOfPath(path, Math.max(0, percent - 0.001));
        let point2 = getPointAtPercentOfPath(path, Math.min(path.node().getTotalLength(), percent + 0.001));
        // this is now a vector pointing along the forward direction on the line
        let difference = { x: point2.x - point1.x, y: point2.y - point1.y };
        
        // rotate clockwise, 
        return normalize(rotatePoint90DegreesCounterClockwiseLayoutCoords(difference));
    }

    function rotatePoint90DegreesCounterClockwise(point) {
        return { x: -1 * point.y, y: point.x };
    }

    
    function rotatePoint90DegreesCounterClockwiseLayoutCoords(point) {
        return { x: point.y, y: -1 * point.x };
    }
    
    function projectPointOntoNormal(point, normalVector, origin) {
        // handle edge case of straight normal
        if(normalVector.y == 0) {
            return {point:{x:point.x, y:origin.y},neg:point.x > origin.x}
        }

        if(normalVector.x == 0) {
            return {point:{x:origin.x, y:point.y},neg:point.y < origin.y}
        }

        let a = origin;
        let b = {x:origin.x + normalVector.x, y:origin.y + normalVector.y}

        var aToB = { x: b.x - a.x, y: b.y - a.y };
        var aToPoint = { x: point.x - a.x, y: point.y - a.y };
        var sqLenAToB = aToB.x * aToB.x + aToB.y * aToB.y;
        var dot = aToPoint.x * aToB.x + aToPoint.y * aToB.y;
        var t = dot / sqLenAToB;
    
        dot = ( b.x - a.x ) * ( point.y - a.y ) - ( b.y - a.y ) * ( point.x - a.x );
        
        return {
            point: {
                x: a.x + aToB.x * t,
                y: a.y + aToB.y * t
            },
            neg: t < 0
        };
    }

    function getPointAtDistanceAlongNormal(distance, normalVector, origin) {
        return { x: normalVector.x*distance+origin.x, y: normalVector.y*distance+origin.y};
    }  

    function normalize(vector) {
        let length = distancebetween(vector, { x: 0, y: 0 });
        if (length == 0) {
            console.error("cannot get normal for 0, 0!")
            return vector;
        }

        return { x: vector.x / length, y: vector.y / length };
    }

    function getCoordsForPercentAndDist(path, pathPercent, dist) {
        let normalVector = getNormalAtPercentOfPath(path, pathPercent);
        return getPointAtDistanceAlongNormal(dist, normalVector, getPointAtPercentOfPath(path, pathPercent))
    }

    function getDistForAxisPercent(percent, axisDistTop, axisDistBottom) {
        return ((axisDistTop - axisDistBottom) * percent) + axisDistBottom;
    }


    return {
        getPointAtPercentOfPath,
        getClosestPointOnPath,
        distancebetween,
        getNormalAtPercentOfPath,
        rotatePoint90DegreesCounterClockwise,
        rotatePoint90DegreesCounterClockwiseLayoutCoords,
        projectPointOntoNormal,
        getPointAtDistanceAlongNormal,
        normalize,
        getCoordsForPercentAndDist,
        getDistForAxisPercent
    }
}();
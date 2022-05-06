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

        return { x: bestPoint.x, y: bestPoint.y, percent: bestLength / pathNode.getTotalLength(), length: bestLength };
    }

    function remapLinePointsAroundNewPoint(line, startPercent, endPercent, newPointPercent, pixelPercision = 50) {
        let resultBefore = [];
        let totalLength = line.node().getTotalLength();
        for (let len = totalLength * startPercent; len < totalLength * newPointPercent; len += pixelPercision) {
            resultBefore.push(line.node().getPointAtLength(len));
        }
        resultBefore = resultBefore.map(p => { return { x: p.x, y: p.y }; });

        let resultAfter = [];
        for (let len = totalLength * newPointPercent; len < totalLength * endPercent; len += pixelPercision) {
            resultAfter.push(line.node().getPointAtLength(len));
        }
        resultAfter = resultAfter.map(p => { return { x: p.x, y: p.y }; });

        return { before: resultBefore, after: resultAfter };
    }

    function distancebetween(point1, point2) {
        let a = point1.x - point2.x;
        let b = point1.y - point2.y;

        return Math.sqrt(a * a + b * b);
    }

    function getNormalAtPercentOfPath(path, percent) {
        // this is not 100% accurate but will be a reasonable approximation
        // there's some stange gankyness when it gets too close to the end, so just use a close vector
        if (percent < 0.01) {
            percent = 0.01
        } else if (percent > 0.99) {
            percent = .99
        }

        let point1 = getPointAtPercentOfPath(path, percent - 0.01);
        let point2 = getPointAtPercentOfPath(path, percent + 0.01);
        // this is now a vector pointing along the forward direction on the line
        let difference = { x: point2.x - point1.x, y: point2.y - point1.y };

        // rotate clockwise, 
        return normalize(rotatePoint90DegreesCounterClockwiseLayoutCoords(difference));
    }

    function rotatePoint90DegreesCounterClockwise(point) {
        return { x: -1 * point.y, y: point.x };
    }

    function rotatePoint90DegreesClockwise(point) {
        return { x: point.y, y: -1 * point.x };
    }


    function rotatePoint90DegreesCounterClockwiseLayoutCoords(point) {
        return { x: point.y, y: -1 * point.x };
    }

    function projectPointOntoNormal(point, normalVector, origin) {
        // handle edge case of straight normal
        if (normalVector.y == 0) {
            return { point: { x: point.x, y: origin.y }, neg: point.x > origin.x }
        }

        if (normalVector.x == 0) {
            return { point: { x: origin.x, y: point.y }, neg: point.y < origin.y }
        }

        let a = origin;
        let b = { x: origin.x + normalVector.x, y: origin.y + normalVector.y }

        var aToB = { x: b.x - a.x, y: b.y - a.y };
        var aToPoint = { x: point.x - a.x, y: point.y - a.y };
        var sqLenAToB = aToB.x * aToB.x + aToB.y * aToB.y;
        var dot = aToPoint.x * aToB.x + aToPoint.y * aToB.y;
        var t = dot / sqLenAToB;

        dot = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);

        return {
            point: {
                x: a.x + aToB.x * t,
                y: a.y + aToB.y * t
            },
            neg: t < 0
        };
    }

    function projectPointOntoLine(point, lineStart, lineEnd) {
        if (pointIsEqual(point, lineStart)) {
            return {
                point,
                distance: 0,
                percent: 0
            };
        } else if (pointIsEqual(point, lineEnd)) {
            return {
                point,
                distance: 0,
                percent: 1
            };
        }

        let lineStartToLineEnd = subtractPoints(lineEnd, lineStart);
        let lineStartToPoint = subtractPoints(point, lineStart);
        let len = vectorLength(lineStartToLineEnd)
        let dot = lineStartToPoint.x * lineStartToLineEnd.x + lineStartToPoint.y * lineStartToLineEnd.y;
        let projLen = dot / len;
        let projPercent = projLen / len;
        let projectVector = scalarMultiplyPoint(lineStartToLineEnd, projPercent)
        let projectedPoint = {
            x: lineStart.x + projectVector.x,
            y: lineStart.y + projectVector.y
        }

        let dotThing = (lineEnd.x - lineStart.x) * (point.y - lineStart.y) - (lineEnd.y - lineStart.y) * (point.x - lineStart.x);
        let negation = dotThing / Math.abs(dotThing);

        let distance = negation * distancebetween(point, projectedPoint);


        return {
            point: projectedPoint,
            distance,
            percent: projPercent
        };
    }

    function getPointAtDistanceAlongNormal(distance, normalVector, origin) {
        return { x: normalVector.x * distance + origin.x, y: normalVector.y * distance + origin.y };
    }

    function normalize(vector) {
        let length = vectorLength(vector);
        if (length == 0) {
            console.error("cannot get normal for 0, 0!")
            return vector;
        }

        return { x: vector.x / length, y: vector.y / length };
    }

    function vectorLength(vector) {
        return distancebetween(vector, { x: 0, y: 0 });
    }

    function getCoordsForPercentAndDist(path, pathPercent, dist, dynamicNormals = true) {
        let normalVector = getNormalAtPercentOfPath(path, 0);
        if (dynamicNormals) normalVector = getNormalAtPercentOfPath(path, pathPercent);
        return getPointAtDistanceAlongNormal(dist, normalVector, getPointAtPercentOfPath(path, pathPercent))
    }

    function getDistForAxisPercent(percent, axisDistTop, axisDistBottom) {
        return ((axisDistTop - axisDistBottom) * percent) + axisDistBottom;
    }

    function warpPercent(warpPoints, percent) {
        // make a copy of the array
        let wp = warpPoints.concat([{ from: 0, to: 0 }, { from: 1, to: 1 }]);
        wp.sort((a, b) => {
            if (a.from == b.from) {
                return a.to - b.to;
            } else {
                return a.from - b.from;
            }
        });

        // There might be some edge cases around this, but we'll deal with those when they come.
        if (percent == 0) return 0;

        for (let i = 0; i < wp.length - 1; i++) {
            if (percent > wp[i].from && percent <= wp[i + 1].from) {
                // upper.from and lower.from must strictly be different numbers
                let lower = wp[i]
                let upper = wp[i + 1]
                let percentBetweenTwoControls = (percent - lower.from) / (upper.from - lower.from)
                return ((upper.to - lower.to) * percentBetweenTwoControls) + lower.to;
            }
        }

        console.error("Code should be unreachable!", percent);
        return 0;
    }

    function pointsToPercentDistMapping(points, lineStart, lineEnd) {
        let result = []
        points.forEach(point => {
            let projection = projectPointOntoLine(point, lineStart, lineEnd);
            result.push({ percent: projection.percent, dist: projection.distance })
        })
        return result;
    }

    function percentDistMappingToPoints(mapping, lineStart, lineEnd) {
        let lineVector = subtractPoints(lineEnd, lineStart);
        let normal = rotatePoint90DegreesCounterClockwise(normalize(lineVector));
        let result = [];
        mapping.forEach(entry => {
            origin = {
                x: lineVector.x * entry.percent + lineStart.x,
                y: lineVector.y * entry.percent + lineStart.y
            }

            result.push(getPointAtDistanceAlongNormal(entry.dist, normal, origin));
        });
        return result;
    }

    function subtractPoints(point1, point2) {
        return {
            x: point1.x - point2.x,
            y: point1.y - point2.y
        }
    }

    function addPoints(point1, point2) {
        return {
            x: point1.x + point2.x,
            y: point1.y + point2.y
        }
    }

    function pointIsEqual(point1, point2) {
        return point1.x == point2.x && point1.y == point2.y;
    }

    function scalarMultiplyPoint(point, scalar) {
        return {
            x: point.x * scalar,
            y: point.y * scalar
        }
    }

    function normalVectorToDegrees(vector) {
        var angle = Math.atan2(vector.y, vector.x);   //radians
        // you need to devide by PI, and MULTIPLY by 180:
        var degrees = 180 * angle / Math.PI;  //degrees
        return (360 + Math.round(degrees)) % 360 - 90; //round number, avoid decimal fragments
    }


    return {
        getPointAtPercentOfPath,
        getClosestPointOnPath,
        distancebetween,
        getNormalAtPercentOfPath,
        rotatePoint90DegreesCounterClockwise,
        rotatePoint90DegreesClockwise,
        rotatePoint90DegreesCounterClockwiseLayoutCoords,
        projectPointOntoNormal,
        getPointAtDistanceAlongNormal,
        normalize,
        getCoordsForPercentAndDist,
        getDistForAxisPercent,
        warpPercent,
        pointsToPercentDistMapping,
        percentDistMappingToPoints,
        remapLinePointsAroundNewPoint,
        normalVectorToDegrees,
        subtractPoints,
        addPoints,
        scalarMultiplyPoint,
    }
}();

let idCounter = 0;
function getUniqueId() {
    // ensures uniqueness if we get three at the same time.
    idCounter++
    return Date.now() + "_" + idCounter;
}
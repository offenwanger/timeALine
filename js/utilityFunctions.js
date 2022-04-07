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

    return {
        getPointAtPercentOfPath,
        getClosestPointOnPath,
        distancebetween,
    }
}();
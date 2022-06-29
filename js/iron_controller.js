function IronController(svg) {
    const MIN_RESOLUTION = 2;

    let mActive = false;
    let mLines = [];
    let mLineModifiedCallback = () => { };

    let mIronGroup = svg.append('g')
        .attr("id", 'iron-g')
        .style("visibility", 'hidden');

    let mCover = mIronGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mLinesGroup = mIronGroup.append('g');

    let mMovingLines = [];
    let mStartPosition = null;
    let mBrushController = new BrushController(svg);
    mBrushController.setDragStartCallback(dragStart);
    mBrushController.setDragCallback(drag);
    mBrushController.setDragEndCallback(dragEnd);


    function dragStart(coords, radius) {
        mStartPosition = coords;
        mLines.forEach(line => {
            let segments = segmentLine(coords, radius, line.points);
            if (segments.length > 1 || segments[0].covered) {
                mMovingLines.push({ id: line.id, oldSegments: segments, newSegments: copySegments(segments) });
            }
        })

        mBrushController.freeze(true);
        mCover.style("visibility", '');

        drag(coords, radius);
    }

    function drag(coords) {
        let ironStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - 20)
        let drawingLines = [];
        mMovingLines.forEach(line => {
            drawingLines.push(PathMath.mergePointSegments(ironSegments(line.newSegments, ironStrength)));
        })

        drawLines(drawingLines);
    }

    function dragEnd(coords, radius) {
        let ironStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - radius)
        let result = mMovingLines.map(line => {
            return {
                id: line.id,
                oldSegments: line.oldSegments.map(segment => segment.points),
                newSegments: ironSegments(line.newSegments, ironStrength)
            }
        });
        mLineModifiedCallback(result);

        // reset
        mMovingLines = []
        mStartPosition = null;
        drawLines([]);
        mCover.style("visibility", 'hidden');
        mBrushController.freeze(false);
    }

    function ironSegments(segments, ironStrength) {
        let returnArray = [];
        segments.forEach(segment => {
            if (!segment.covered) {
                returnArray.push(segment.points);
            } else {
                let line = MathUtil.vectorFromAToB(segment.points[0], segment.points[segment.points.length - 1]);
                let movedPoints = [];
                segment.points.forEach(point => {
                    // first and last points will also be projected, but they are already on line, so that's fine.
                    let projectPoint = MathUtil.projectPointOntoVector(point, line, segment.points[0]);
                    let length = MathUtil.distanceFromAToB(projectPoint, point);
                    if (length > 0) {
                        let vector = MathUtil.vectorFromAToB(projectPoint, point);
                        let newPoint = MathUtil.getPointAtDistanceAlongVector(Math.max(length - ironStrength, 0), vector, projectPoint);
                        movedPoints.push(newPoint);
                    } else {
                        movedPoints.push(point);
                    }
                });

                let newPoints = [movedPoints[0]];
                for (let i = 1; i < movedPoints.length - 1; i++) {
                    let point = movedPoints[i];
                    if (MathUtil.distanceFromAToB(movedPoints[i - 1], point) > MIN_RESOLUTION) {
                        let line = MathUtil.vectorFromAToB(movedPoints[i - 1], movedPoints[i + 1]);
                        let projectPoint = MathUtil.projectPointOntoVector(point, line, movedPoints[i - 1]);
                        let length = MathUtil.distanceFromAToB(projectPoint, point);
                        if (length > 0) newPoints.push(point);
                    }
                }
                if (newPoints.length > 1 && MathUtil.distanceFromAToB(newPoints[newPoints.length - 1], movedPoints[movedPoints.length - 1]) < MIN_RESOLUTION) {
                    newPoints.pop();
                }
                newPoints.push(movedPoints[movedPoints.length - 1]);

                returnArray.push(newPoints);
            }
        });
        return returnArray;
    }

    function segmentLine(coords, radius, points) {
        // this line is under the drag circle. 
        let segments = [{ covered: MathUtil.distanceFromAToB(points[0], coords) < radius, points: [points[0]] }]
        for (let i = 1; i < points.length; i++) {
            let point = points[i];
            let isCovered = MathUtil.distanceFromAToB(point, coords) < radius;
            if (isCovered == segments[segments.length - 1].covered) {
                segments[segments.length - 1].points.push(point);
            } else {
                if (isCovered) {
                    // if a line section is partly covered, we want it in the covered segment
                    let previousPoint = points[i - 1]
                    segments.push({ covered: isCovered, points: [previousPoint, point] })
                } else {
                    // if a line section is partly covered, we want it in the previous covered segment
                    segments[segments.length - 1].points.push(point);
                    segments.push({ covered: isCovered, points: [point] })
                }
            }
        }
        segments = segments.filter(segment => segment.points.length > 1);

        return segments;
    }

    function copySegments(segments) {
        return [...segments.map(segment => {
            return {
                covered: segment.covered,
                points: segment.points.map(p => {
                    return { x: p.x, y: p.y };
                })
            };
        })]
    }

    function drawLines(points) {
        let paths = mLinesGroup.selectAll('.timelinePath').data(points);
        paths.enter().append('path')
            .classed('timelinePath', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLinesGroup.selectAll('.timelinePath').attr('d', (points) => PathMath.getPathD(points));
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mIronGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mIronGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.linesUpdated = (lines) => mLines = lines;
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}

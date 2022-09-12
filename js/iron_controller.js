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
    let mBrushController = BrushController.getInstance(svg);
    mBrushController.addDragStartCallback(dragStart);
    mBrushController.addDragCallback(drag);
    mBrushController.addDragEndCallback(dragEnd);


    function dragStart(coords, radius) {
        if (mActive) {
            mStartPosition = coords;
            mLines.forEach(line => {
                let oldSegments = PathMath.segmentPath(line.points, true,
                    (point) => MathUtil.distanceFromAToB(point, coords) < radius ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);

                if (oldSegments.length == 0) { console.error("Failed to get segments for line", line); return; };

                if (oldSegments.length > 1 || oldSegments[0].label == SEGMENT_LABELS.CHANGED) {
                    let newSegments = PathMath.cloneSegments(oldSegments);
                    mMovingLines.push({ id: line.id, oldSegments, newSegments });
                }
            })

            mBrushController.freeze(true);
            mCover.style("visibility", '');

            drag(coords, radius);
        }
    }

    function drag(coords) {
        if (mActive) {
            let ironStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - 20)
            let drawingLines = [];
            mMovingLines.forEach(line => {
                drawingLines.push(PathMath.mergeSegments(ironSegments(line.newSegments, ironStrength)));
            })

            drawLines(drawingLines);
        }
    }

    function dragEnd(coords, radius) {
        if (mActive) {
            let ironStrength = Math.max(0, MathUtil.distanceFromAToB(mStartPosition, coords) - radius)
            let result = mMovingLines.map(line => {
                return {
                    id: line.id,
                    oldSegments: line.oldSegments,
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
    }

    function ironSegments(segments, ironStrength) {
        let returnArray = [];
        segments.forEach(segment => {
            if (segment.label == SEGMENT_LABELS.UNAFFECTED) {
                returnArray.push(segment);
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

                returnArray.push({ label: segment.label, points: newPoints });
            }
        });
        return returnArray;
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

    this.updateModel = (model) => mLines = model.getAllTimelines();
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}

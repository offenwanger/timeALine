function DragController(svg) {
    const DRAG_POINT_RADIUS = 5;

    let mActive = false;
    let mLines = [];
    let mLineModifiedCallback = () => { };

    let mBrushController = BrushController.getInstance(svg);
    mBrushController.addDragStartCallback(brushDragStart);
    mBrushController.addDragCallback(onDrag);
    mBrushController.addDragEndCallback(onDragEnd);

    let mDragGroup = svg.append('g')
        .attr("id", 'drag-g')
        .style("visibility", 'hidden');

    let mCover = mDragGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mLinesGroup = mDragGroup.append('g');
    let mPointsGroup = mDragGroup.append('g');

    let mMovingLines = []
    let mDragStartPos = null

    function linesUpdated(lines) {
        mLines = lines;

        let startPointData = lines.map(line => {
            return { id: line.id, point: line.points[0], points: line.points };
        })
        let endPointsData = lines.map(line => {
            return { id: line.id, point: line.points[line.points.length - 1], points: line.points };
        })

        let startPoints = mPointsGroup.selectAll('.start-point').data(startPointData);
        startPoints.exit().remove();
        startPoints.enter().append("circle")
            .classed("start-point", true)
            .attr('id', d => "start-point_" + d.id)
            .attr('r', DRAG_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#b51d1c')
            .attr("stroke", "black")
            .call(d3.drag()
                .on('start', startNodeDragStart)
                .on('drag', function (e) { onDrag({ x: e.x, y: e.y }) })
                .on('end', function (e) { onDragEnd({ x: e.x, y: e.y }) }));
        mPointsGroup.selectAll('.start-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let endPoints = mPointsGroup.selectAll('.end-point').data(endPointsData);
        endPoints.exit().remove();
        endPoints.enter().append("circle")
            .classed("end-point", true)
            .attr('id', d => "end-point_" + d.id)
            .attr('r', DRAG_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#1c1db5')
            .attr("stroke", "black")
            .call(d3.drag()
                .on('start', onRotatePointDragStart)
                .on('drag', onRotatePointDrag)
                .on('end', onRotatePointDragEnd));
        mPointsGroup.selectAll('.end-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y);
    }


    function startNodeDragStart(e, d) {
        mDragStartPos = { x: e.x, y: e.y };
        mMovingLines = [{
            id: d.id,
            oldSegments: [{ label: SEGMENT_LABELS.CHANGED, points: d.points }],
            newSegments: [{ label: SEGMENT_LABELS.CHANGED, points: [...d.points] }]
        }];
        mCover.style("visibility", '');
        mPointsGroup.style("visibility", 'hidden');
    }

    function brushDragStart(coords, brushRadius) {
        if (mActive) {

            mDragStartPos = coords;
            mLines.forEach(line => {
                let closestPoint = PathMath.getClosestPointOnPath(coords, line.points);
                if (MathUtil.distanceFromAToB(closestPoint, coords) < brushRadius) {
                    let oldSegments = PathMath.segmentPath(line.points, true,
                        (point) => MathUtil.distanceFromAToB(point, coords) < brushRadius ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);
                    let newSegments = PathMath.cloneSegments(oldSegments);

                    mMovingLines.push({
                        id: line.id,
                        oldSegments,
                        newSegments
                    });
                }
            });

            if (mMovingLines.length > 0) {
                mCover.style("visibility", '');
                mPointsGroup.style("visibility", 'hidden');
            }
        }
    }

    function onDrag(coords) {
        if (mActive) {
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let linesData = mMovingLines.map(line => moveSegments(line.newSegments, diff));

            drawLines(linesData.map(segments => PathMath.mergeSegments(segments)));

        }
    }

    function moveSegments(segments, amount) {
        let returnable = []
        segments.forEach((segment) => {
            if (segment.label == SEGMENT_LABELS.CHANGED) {
                returnable.push({
                    label: segment.label,
                    points: segment.points.map((point) => {
                        return { x: point.x + amount.x, y: point.y + amount.y };
                    })
                })
            } else return returnable.push(segment);
        })
        return returnable;
    }

    function onDragEnd(coords) {
        if (mActive) {
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let result = mMovingLines.map(line => {
                return {
                    id: line.id,
                    oldSegments: line.oldSegments,
                    newSegments: moveSegments(line.newSegments, diff)
                }
            });
            mLineModifiedCallback(result);

            // reset
            mMovingLines = []
            mDragStartPos = null
            drawLines([]);
            mCover.style("visibility", 'hidden');
            mPointsGroup.style("visibility", '');
        }
    }

    function onRotatePointDragStart(e, d) {
        mDragStartPos = { x: e.x, y: e.y };
        mMovingLines = [{
            id: d.id,
            oldSegments: [{ label: SEGMENT_LABELS.CHANGED, points: d.points }],
            percentDistMapping: pointsToPercentDistMapping(d.points),
        }];
        mCover.style("visibility", '');
        mPointsGroup.style("visibility", 'hidden');
    }

    function onRotatePointDrag(e) {
        let coords = { x: e.x, y: e.y };
        let lineStart = mMovingLines[0].oldSegments[0].points[0];
        let points = percentDistMappingToPoints(mMovingLines[0].percentDistMapping, lineStart, coords)

        drawLines([points]);
    }

    function onRotatePointDragEnd(e, d) {
        let coords = { x: e.x, y: e.y };
        let lineStart = mMovingLines[0].oldSegments[0].points[0];
        let points = percentDistMappingToPoints(mMovingLines[0].percentDistMapping, lineStart, coords)

        let result = mMovingLines.map(line => {
            return {
                id: line.id,
                oldSegments: line.oldSegments,
                newSegments: [{ label: SEGMENT_LABELS.CHANGED, points: points }]
            }
        });
        mLineModifiedCallback(result);

        // reset
        mMovingLines = []
        mDragStartPos = null
        drawLines([]);
        mCover.style("visibility", 'hidden');
        mPointsGroup.style("visibility", '');
    }

    function pointsToPercentDistMapping(points) {
        let lineStart = points[0];
        let lineEnd = points[points.length - 1];

        let len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        if (len == 0) throw new Error("Line start and line end are the same!")

        let vector = MathUtil.vectorFromAToB(lineStart, lineEnd);
        let result = []
        points.forEach(point => {
            let projectedPoint = MathUtil.projectPointOntoVector(point, vector, lineStart);
            let projPercent = (projectedPoint.neg ? -1 : 1) * MathUtil.distanceFromAToB(lineStart, projectedPoint) / len;

            let normal = MathUtil.rotateVectorLeft(MathUtil.normalize(vector));
            let neg = MathUtil.projectPointOntoVector(point, normal, projectedPoint).neg;
            let distance = (neg ? -1 : 1) * MathUtil.distanceFromAToB(projectedPoint, point);

            result.push({ percent: projPercent, distPercent: distance / len })
        })
        return result;
    }

    function percentDistMappingToPoints(mapping, lineStart, lineEnd) {
        let lineVector = MathUtil.vectorFromAToB(lineStart, lineEnd);
        let len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        if (len == 0) {
            // we appear to have eliminated the line, tweak it to avoid errors. 
            lineEnd.x++;
            lineVector = MathUtil.vectorFromAToB(lineStart, lineEnd);
            len = MathUtil.distanceFromAToB(lineStart, lineEnd);
        }
        let normal = MathUtil.rotateVectorLeft(MathUtil.normalize(lineVector));
        let result = [];
        mapping.forEach(entry => {
            origin = {
                x: lineVector.x * entry.percent + lineStart.x,
                y: lineVector.y * entry.percent + lineStart.y
            }

            result.push(MathUtil.getPointAtDistanceAlongVector(entry.distPercent * len, normal, origin));
        });
        return result;
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
            mDragGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mDragGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.linesUpdated = linesUpdated;
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}
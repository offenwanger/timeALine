
function LineDrawingController(svg) {
    const EXTENSION_POINT_RADIUS = 5;

    let mActive = false;
    let mDrawFinishedCallback = () => { };
    let mDraggedPoints = [];
    let mLineResolution = 50;
    let mDragStartParams = {};
    let mStartPoints = []
    let mEndPoints = []

    let mLineDrawingGroup = svg.append('g')
        .attr("id", 'line-drawing-g')
        .style("visibility", 'hidden');

    mLineDrawingGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.2')
        .call(d3.drag()
            .on('start', function (e) { /* nothing at the moment */ })
            .on('drag', onDragged)
            .on('end', onDragEnd));


    let mDrawingLine = mLineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    let mPointsGroup = mLineDrawingGroup.append('g');

    function linesUpdated(idPointArr) {
        mStartPoints = idPointArr.map(item => {
            return { id: item.id, point: item.points[0] };
        })
        mEndPoints = idPointArr.map(item => {
            return { id: item.id, point: item.points[item.points.length - 1] };
        })

        let startPoints = mPointsGroup.selectAll('.start-point').data(mStartPoints);
        startPoints.exit().remove();
        startPoints.enter().append("circle")
            .classed("start-point", true)
            .attr('id', d => "start-point_" + d.id)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#b51d1c')
            .attr("stroke", "black")
            .call(d3.drag()
                .on('start', function (e, d) {
                    mDragStartParams.startPoint = d.id;
                    mPointsGroup.selectAll('.start-point').style("visibility", "hidden");
                    mPointsGroup.select('#end-point_' + d.id).style("visibility", "hidden");
                })
                .on('drag', onDragged)
                .on('end', onDragEnd));
        mPointsGroup.selectAll('.start-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let endPoints = mPointsGroup.selectAll('.end-point').data(mEndPoints);
        endPoints.exit().remove();
        endPoints.enter().append("circle")
            .classed("end-point", true)
            .attr('id', d => "end-point_" + d.id)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#1c1db5')
            .attr("stroke", "black")
            .call(d3.drag()
                .on('start', function (e, d) {
                    mDragStartParams.endPoint = d.id;
                    mPointsGroup.selectAll('.end-point').style("visibility", "hidden");
                    mPointsGroup.select('#start-point_' + d.id).style("visibility", "hidden");
                })
                .on('drag', onDragged)
                .on('end', onDragEnd));
        mPointsGroup.selectAll('.end-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)
    }

    function onDragged(e) {
        if (mActive) {
            mDraggedPoints.push({ x: e.x, y: e.y });
            mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onDragEnd(e) {
        if (mDraggedPoints.length > 1) {
            if (mActive) {
                let mousePoint = { x: e.x, y: e.y };
                let dragEndPoint = null;
                if (!mDragStartParams.startPoint) {
                    let minCircle = mStartPoints.reduce((min, curr) => {
                        if (MathUtil.distanceFromAToB(curr.point, mousePoint) < min.dist && (!mDragStartParams.endPoint || curr.id != mDragStartParams.endPoint)) {
                            return { id: curr.id, dist: MathUtil.distanceFromAToB(curr, mousePoint) };
                        } else return min;
                    }, { dist: EXTENSION_POINT_RADIUS })

                    if (minCircle.id) {
                        dragEndPoint = minCircle;
                    }
                }

                let endOnEndPoint = false;
                if (!mDragStartParams.endPoint) {
                    let minCircle = mEndPoints.reduce((min, curr) => {
                        if (MathUtil.distanceFromAToB(curr.point, mousePoint) < min.dist && (!mDragStartParams.startPoint || curr.id != mDragStartParams.startPoint)) {
                            return { id: curr.id, dist: MathUtil.distanceFromAToB(curr, mousePoint) };
                        } else return min;
                    }, { dist: dragEndPoint ? dragEndPoint.dist : EXTENSION_POINT_RADIUS })

                    if (minCircle.id) {
                        endOnEndPoint = true;
                        dragEndPoint = minCircle;
                    }
                }

                if (endOnEndPoint || mDragStartParams.startPoint) {
                    // if we ended on an end point or started on a start point, reverse the array so the first 
                    // points will be close to the end point, and the last points will be close to the start point
                    mDraggedPoints = mDraggedPoints.reverse();
                    mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
                }

                let startPointLineId = mDragStartParams.startPoint ? mDragStartParams.startPoint : null;
                let endPointLineId = mDragStartParams.endPoint ? mDragStartParams.endPoint : null;


                if (dragEndPoint) {
                    if (endOnEndPoint) {
                        endPointLineId = dragEndPoint.id;
                    } else {
                        startPointLineId = dragEndPoint.id;
                    }
                }


                let result = getPointsFromLine(mDrawingLine, mLineResolution);

                mDrawFinishedCallback(result, startPointLineId, endPointLineId);
            }
            // reset
            mDraggedPoints = [];
            mDrawingLine.attr('d', PathMath.getPathD([]));
            mDragStartParams = {};
            mPointsGroup.selectAll('.start-point').style("visibility", "");
            mPointsGroup.selectAll('.end-point').style("visibility", "");
        }
    }

    function getPointsFromLine(line, resolution) {
        let result = [];
        for (let len = 0; len < line.node().getTotalLength(); len += resolution) {
            result.push(line.node().getPointAtLength(len));
        }
        result.push(line.node().getPointAtLength(line.node().getTotalLength()));
        return result.map(p => { return { x: p.x, y: p.y }; });
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mLineDrawingGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mLineDrawingGroup.style('visibility', "hidden");
        }
    }

    this.linesUpdated = linesUpdated;
    this.setActive = setActive;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
}

function EraserController(svg) {
    let mActive = false;
    let mDraggedPoints = [];

    let mEraseCallback = () => { };

    let mEraserGroup = svg.append('g')
        .attr("id", 'eraser-g')
        .style("visibility", 'hidden');

    let mEraserLine = mEraserGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    let mBrushController = new BrushController(svg);
    mBrushController.setDragStartCallback((c, brushRadius) => {
        mEraserLine.attr('stroke-width', brushRadius * 2);
    });

    mBrushController.setDragCallback((coords) => {
        mDraggedPoints.push(coords);
        mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
    })

    mBrushController.setDragEndCallback(() => {
        let width = svg.attr('width');
        let height = svg.attr('height');

        let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
            .attr('width', width)
            .attr('height', height)
            // this is required for unknown reasons
            .attr("xmlns", "http://www.w3.org/2000/svg");
        exportSVG.append(() => mEraserLine.clone().node());
        exportSVG = exportSVG.node();

        let blob = new Blob([exportSVG.outerHTML], { type: 'image/svg+xml;charset=utf-8' });

        let URL = window.URL || window.webkitURL || window;
        let blobURL = URL.createObjectURL(blob);

        let image = new Image();
        image.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            let context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, width, height);

            mDraggedPoints = [];
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));

            mEraseCallback(new CanvasMask(canvas));
        };
        image.src = blobURL;
    })

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mEraserGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mEraserGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.setEraseCallback = (callback) => mEraseCallback = callback;
}

function DragController(svg) {
    const DRAG_POINT_RADIUS = 5;

    let mActive = false;
    let mLines = [];
    let mLineModifiedCallback = () => { };

    let mBrushController = new BrushController(svg);
    mBrushController.setDragStartCallback(brushDragStart);
    mBrushController.setDragCallback(onDrag);
    mBrushController.setDragEndCallback(onDragEnd);

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
            oldSegments: [{ covered: true, points: d.points }],
            newSegments: [{ covered: true, points: [...d.points] }]
        }];
        mCover.style("visibility", '');
        mPointsGroup.style("visibility", 'hidden');
    }

    function brushDragStart(coords, brushRadius) {
        mDragStartPos = coords;
        mLines.forEach(line => {
            let closestPoint = PathMath.getClosestPointOnPath(coords, line.points);
            if (MathUtil.distanceFromAToB(closestPoint, coords) < brushRadius) {
                let oldSegments = segmentLine(coords, brushRadius, line.points);
                oldSegments = addSegmentForClosestPoint(oldSegments, closestPoint);
                let newSegments = capSegments(coords, brushRadius, oldSegments, PathMath.getPath(line.points))

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

    function addSegmentForClosestPoint(segments, closestPoint) {
        let prevSegmentLength = 0
        for (let i = 0; i < segments.length; i++) {
            let segmentLength = PathMath.getPathLength([].concat(...segments.slice(0, i + 1).map(segment => segment.points)));
            if (closestPoint.length == segmentLength || closestPoint.length == prevSegmentLength) {
                // the closest point is on a path node, and therefore that node must be in the circle. 
                return [...segments];
            } else if (closestPoint.length > prevSegmentLength && closestPoint.length < segmentLength) {
                let segment = segments[i];

                if (segment.covered) {
                    return [...segments];
                } else {
                    // the closest point fell into a section of line for which no points were covered. 
                    // create a new segment with the before and after points
                    let returnSegments = [...segments.slice(0, i)]

                    let prevLength = 0;
                    for (let j = 1; j < segment.points.length; j++) {
                        let subsegmentLength = PathMath.getPathLength(segment.points.slice(0, j + 1)) + prevSegmentLength;
                        if (closestPoint.length > prevLength && closestPoint.length < subsegmentLength) {
                            // point is between this point and the last. Split up the segment
                            // everything up to j - 1
                            returnSegments.push({ covered: segment.covered, points: segment.points.slice(0, j) })
                            // j - 1 and j,
                            returnSegments.push({ covered: !segment.covered, points: segment.points.slice(j - 1, j + 1) })
                            // j and everything after
                            returnSegments.push({ covered: segment.covered, points: segment.points.slice(j) })
                            break;
                        }

                        prevLength = subsegmentLength;
                    }
                    returnSegments.push(...segments.slice(i + 1))
                    returnSegments = returnSegments.filter(segment => segment.points.length > 1);
                    return returnSegments;
                }
            } else {
                prevSegmentLength = segmentLength;
            }
        }
        console.error("Unhandled edge case!", segments, closestPoint)
        return segments;
    }

    function capSegments(coords, radius, segments, path) {
        let returnSegments = [];
        let previousLength = 0
        for (let i = 0; i < segments.length; i++) {
            let segment = { covered: segments[i].covered, points: [...segments[i].points] };
            returnSegments.push(segment);

            let segmentEnd = PathMath.getPathLength([].concat(...segments.slice(0, i + 1).map(segment => segment.points)));

            let segmentStart = previousLength;
            previousLength = segmentEnd;

            if (segment.covered) {
                // if this is so, then we assume that the first and last points are not covered and middle points are 
                let points = segment.points;
                segment.movingTail = false;
                if (MathUtil.distanceFromAToB(points[0], coords) < radius) {
                    // actuall the start point is covered, this is a special case.
                    segment.movingTail = true;
                } else {
                    // find the point at which we cross under the circle, add that as a point. 
                    for (let j = segmentStart; j < segmentEnd; j++) {
                        let point = path.getPointAtLength(j);
                        if (MathUtil.distanceFromAToB(point, coords) < radius) {
                            points.splice(1, 0, point);
                            break;
                        }
                    }
                }

                if (MathUtil.distanceFromAToB(points[points.length - 1], coords) < radius) {
                    segment.movingTail = true;
                } else {
                    for (let j = segmentEnd; j > segmentStart; j--) {
                        let point = path.getPointAtLength(j);
                        if (MathUtil.distanceFromAToB(point, coords) < radius) {
                            points.splice(points.length - 1, 0, point);
                            break;
                        }
                    }
                }

                // add center point to shorter segments
                if (points.length < 5) {
                    if (segment.movingTail) {
                        // that's fine
                    } else if (points.length < 4) {
                        throw Error("Unhandled edge case! Short segment!");
                    } else {
                        let innerStart = segmentStart + MathUtil.distanceFromAToB(points[0], points[1]);
                        let insertLength = ((segmentEnd - MathUtil.distanceFromAToB(points[3], points[2])) - innerStart) / 2 + innerStart;

                        let insertIndex = 2;
                        points.splice(insertIndex, 0, path.getPointAtLength(insertLength));
                    }
                }
            }
        }

        return returnSegments;
    }

    function onDrag(coords) {
        let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
        let pointsSets = mMovingLines.map(line => moveSegments(line.newSegments, diff));

        drawLines(pointsSets.map(points => PathMath.mergePointSegments(points)));
    }

    function moveSegments(segments, amount) {

        return segments.map((segment, segmentIndex) => {
            if (segment.covered) {
                return segment.points.map((point, index) => {
                    if (segments.length == 1 && segment.covered) {
                        // if we only have one moving segment, move all the points
                        return { x: point.x + amount.x, y: point.y + amount.y };

                    } else if (index > 1 && index < segment.points.length - 2) {
                        return { x: point.x + amount.x, y: point.y + amount.y };

                    } else if (segmentIndex == 0 && segment.movingTail && index < segment.points.length - 2) {
                        return { x: point.x + amount.x, y: point.y + amount.y };

                    } else if (segmentIndex == segments.length - 1 && segment.movingTail && index > 1) {
                        return { x: point.x + amount.x, y: point.y + amount.y };

                    } else {
                        return point;
                    }
                });
            } else return segment.points;
        })
    }

    function onDragEnd(coords) {
        let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
        let result = mMovingLines.map(line => {
            return {
                id: line.id,
                oldSegments: line.oldSegments.map(segment => segment.points),
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

    function onRotatePointDragStart(e, d) {
        mDragStartPos = { x: e.x, y: e.y };
        mMovingLines = [{
            id: d.id,
            oldSegments: [{ covered: true, points: d.points }],
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
                oldSegments: line.oldSegments.map(segment => segment.points),
                newSegments: [points]
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

function IronController(svg) {
    const IRON_STRENGTH = 0.2;
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

function BrushController(svg) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 100;

    let mActive = false;
    let mFreeze = false;
    let mBrushSize = 10;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };

    let mBrushGroup = svg.append('g')
        .attr("id", 'brush-g')
        .style("visibility", 'hidden');

    mBrushGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', svg.attr('height'))
        .attr('width', svg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .call(d3.drag()
            .on('start', function (e) {
                if (mActive) {
                    mDragStartCallback({ x: e.x, y: e.y }, mBrushSize);
                }
            })
            .on('drag', function (e) {
                if (!mFreeze) updateCircle({ x: e.x, y: e.y });
                if (mActive) {
                    mDragCallback({ x: e.x, y: e.y }, mBrushSize)
                }
            })
            .on('end', function (e) {
                if (mActive) {
                    mDragEndCallback({ x: e.x, y: e.y }, mBrushSize)
                }
            }))
        .on("mousemove", (e) => {
            if (!mFreeze) updateCircle({ x: d3.pointer(e)[0], y: d3.pointer(e)[1] });
        })
        .on("wheel", function (e) {
            mBrushSize = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mBrushSize + e.wheelDelta / 50));
            mBrush.attr("r", mBrushSize);
        });

    function updateCircle(coords) {
        mBrush.attr("cx", coords.x);
        mBrush.attr("cy", coords.y);
    }

    let mBrush = mBrushGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', mBrushSize)
        .attr('stroke', "black")
        .attr('stroke-wdith', 2)
        .attr('fill', 'none');

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mBrushGroup.style('visibility', "");

        } else if (!active && mActive) {
            mActive = false;
            mBrushGroup.style('visibility', "hidden");
        }
    }

    this.freeze = (freeze) => mFreeze = freeze;
    this.setActive = setActive;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
}
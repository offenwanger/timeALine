function SelectionController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mModel = null;

    let mLineModifiedCallback = () => { };
    let mDragStartCallback = (timelineId, e) => { return { x: e.x, y: e.y } }

    let mSelectedTimelines = [];
    let mSelectedStrokes = [];
    let mSelectedTimePins = [];
    let mSelectedText = [];
    let mSelectedDataPoints = [];

    let mCover = overlayLayer.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', overlayLayer.node().getBBox().width)
        .attr('height', overlayLayer.node().getBBox().height)
        .attr('fill', 'white')
        .attr('opacity', '0.8')
        .style("visibility", 'hidden');

    let mSelectionGroup = interactionLayer.append('g')
        .attr("id", 'selection-g')
        .style("visibility", 'hidden');
    let mStartPoint = mSelectionGroup.append("circle")
        .attr("id", "line-selection-start-point")
        .attr('r', 5)
        .attr('cursor', 'pointer')
        .attr('fill', '#b51d1c')
        .attr("stroke", "black")
        .on('pointerdown', startNodeDragStart)
        .style("visibility", 'hidden');
    let mStartPointTarget = mSelectionGroup.append("circle")
        .attr("id", "line-selection-start-point-target")
        .attr('r', 20)
        .attr('fill', '#000000')
        .attr('cursor', 'pointer')
        .attr('opacity', 0)
        .on('pointerdown', startNodeDragStart)
        .style("visibility", 'hidden');
    let mRotatePoint = mSelectionGroup.append("circle")
        .attr("id", "line-selection-end-point")
        .attr('r', 5)
        .attr('fill', '#1c1db5')
        .attr("stroke", "black")
        .style("visibility", 'hidden');
    let mRotatePointTarget = mSelectionGroup.append("circle")
        .attr("id", "line-selection-end-point-target")
        .attr('r', 20)
        .attr('fill', '#000000')
        .attr('cursor', 'pointer')
        .attr('opacity', 0)
        .on('pointerdown', onRotatePointDragStart)
        .style("visibility", 'hidden');

    let mLine = mSelectionGroup.append('path')
        .attr("id", "line-selection-line")
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)
        .style("visibility", 'hidden');

    let mMarqueeGroup = overlayLayer.append("g")
        .attr("id", 'marquee-group')
        .style("visibility", 'hidden');

    let mDragging = false;
    let mDraggingRotation = false;
    let mDragStartPos = null;
    let mDraggingTimeline = null;
    let mRotatatingPointsMapping = null;

    function updateModel(model) {
        mModel = model;

        // TODO: hacky. Fix.
        mSelectedTimelines = mSelectedTimelines.map(t => mModel.getTimelineById(t.id));
        if (mSelectedTimelines[0]) setTimelineControls(mSelectedTimelines[0]);
    }

    function startNodeDragStart(e, d) {
        if (mActive) {
            mDragging = true;
            dragStart(e, d);
        }
    }

    function onRotatePointDragStart(e, d) {
        if (mActive) {
            mDraggingRotation = true;
            mRotatatingPointsMapping = pointsToPercentDistMapping(d.points);
            dragStart(e, d);
        }
    }

    function dragStart(e, d) {
        mDragStartPos = mDragStartCallback(d.id, e);
        mDraggingTimeline = d;
        mCover.style("visibility", '');
        mLine.attr('stroke', d.color)
            .attr('d', PathMath.getPathD(d.points))
            .style('visibility', "");
        mStartPoint.style("visibility", 'hidden');
        mStartPointTarget.style("visibility", 'hidden');
        mRotatePoint.style("visibility", 'hidden');
        mRotatePointTarget.style("visibility", 'hidden');
    }

    function onPointerDown(coords) {
        // background clicked
        if (mActive) {
            mSelectedTimelines = [];

            mStartPoint.style("visibility", 'hidden');
            mStartPointTarget.style("visibility", 'hidden');
            mRotatePoint.style("visibility", 'hidden');
            mRotatePointTarget.style("visibility", 'hidden');
        }
    }

    function onTimelinePointerDown(timelineId, coords) {
        if (mActive) {
            let timeline = mModel.getTimelineById(timelineId);
            mSelectedTimelines = [];
            mSelectedTimelines.push(timeline);

            setTimelineControls(timeline);

            mStartPoint.style("visibility", '');
            mStartPointTarget.style("visibility", '');
            mRotatePoint.style("visibility", '');
            mRotatePointTarget.style("visibility", '');
        }
    }

    function setTimelineControls(timeline) {
        mStartPoint
            .attr('cx', timeline.points[0].x)
            .attr('cy', timeline.points[0].y);
        mStartPointTarget.datum(timeline)
            .attr('cx', timeline.points[0].x)
            .attr('cy', timeline.points[0].y);

        mRotatePoint
            .attr('cx', timeline.points[timeline.points.length - 1].x)
            .attr('cy', timeline.points[timeline.points.length - 1].y);
        mRotatePointTarget.datum(timeline)
            .attr('cx', timeline.points[timeline.points.length - 1].x)
            .attr('cy', timeline.points[timeline.points.length - 1].y);
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let points = mDraggingTimeline.points.map((point) => {
                return { x: point.x + diff.x, y: point.y + diff.y };
            });
            mLine.attr('d', PathMath.getPathD(points));
        }

        if (mActive && mDraggingRotation) {
            let lineStart = mDraggingTimeline.points[0];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, lineStart, coords)
            mLine.attr('d', PathMath.getPathD(points));
        }

    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            let diff = MathUtil.subtractAFromB(mDragStartPos, coords);
            let points = mDraggingTimeline.points.map((point) => {
                return { x: point.x + diff.x, y: point.y + diff.y };
            });

            mLineModifiedCallback(mDraggingTimeline.id, mDraggingTimeline.points, points);
        }

        if (mActive && mDraggingRotation) {
            let lineStart = mDraggingTimeline.points[0];
            let points = percentDistMappingToPoints(mRotatatingPointsMapping, lineStart, coords)

            mLineModifiedCallback(mDraggingTimeline.id, mDraggingTimeline.points, points);
        }

        // reset
        if (mActive && (mDragging || mDraggingRotation)) {
            mDraggingRotation = false;
            mDragging = false;
            mDraggingTimeline = null;
            mDragStartPos = null
            mRotatatingPointsMapping = null;
            mCover.style("visibility", 'hidden');
            mLine.style("visibility", 'hidden');
            mStartPoint.style("visibility", '');
            mStartPointTarget.style("visibility", '');
            mRotatePoint.style("visibility", '');
            mRotatePointTarget.style("visibility", '');
        }
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

            let normal = MathUtil.rotateVectorRight(MathUtil.normalize(vector));
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
        let normal = MathUtil.rotateVectorRight(MathUtil.normalize(lineVector));
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

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mMarqueeGroup.style('visibility', "");
            mSelectionGroup.style('visibility', "").raise();
        } else if (!active && mActive) {
            mActive = false;
            mMarqueeGroup.style('visibility', "hidden");
            mSelectionGroup.style('visibility', "hidden");
        }

        mActive = active;
    };

    this.updateModel = updateModel;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;

    this.onTimelinePointerDown = onTimelinePointerDown;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setLineModifiedCallback = (callback) => mLineModifiedCallback = callback;
}
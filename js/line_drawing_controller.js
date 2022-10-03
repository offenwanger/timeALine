function LineDrawingController(vizLayer, overlayLayer, interactionLayer) {
    const EXTENSION_POINT_RADIUS = 5;
    const LINE_RESOLUTION = 50;

    let mActive = false;
    let mColor = "#000000"

    let mDragging = false;
    let mDraggedPoints = [];
    let mDragStartParams = {};

    let mDrawFinishedCallback = () => { };
    let mStartPoints = []
    let mEndPoints = []

    let mLineDrawingGroup = interactionLayer.append('g')
        .attr("id", 'line-drawing-g')
        .style("visibility", 'hidden');

    let mCover = overlayLayer.append('rect')
        .attr("id", "timeline-drawing-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.5');

    function onPointerDown(coords) {
        if (mActive) {
            mDragging = true;
        }
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onPointerUp(coords) {
        if (mDragging && mDraggedPoints.length > 1) {
            mDragging = false;

            if (mActive) {
                // check if we're overlapping a line cap
                // but only check valid caps.
                let capPoints = [...mStartPoints, ...mEndPoints];
                if (mDragStartParams.startPoint) {
                    capPoints = mEndPoints;
                } else if (mDragStartParams.endPoint) {
                    capPoints = mStartPoints;
                }

                let minPointData = capPoints.reduce((minPointData, pointData) => {
                    let dist = MathUtil.distanceFromAToB(pointData.point, coords);
                    if (dist < minPointData.dist) {
                        minPointData.dist = dist;
                        minPointData.id = pointData.id
                        minPointData.isStartPoint = pointData.isStartPoint;
                    }
                    return minPointData;
                }, { dist: EXTENSION_POINT_RADIUS });

                if (mDragStartParams.startPoint || (minPointData.id && !minPointData.isStartPoint)) {
                    // if we ended on an end point or started on a start point, reverse the array so the first 
                    // points will be close to the end point, and the last points will be close to the start point
                    mDraggedPoints = mDraggedPoints.reverse();
                    mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
                }

                let startPointLineId = null;
                if (mDragStartParams.startPoint) startPointLineId = mDragStartParams.startPoint;
                if (minPointData.id && minPointData.isStartPoint) startPointLineId = minPointData.id;

                let endPointLineId = null;
                if (mDragStartParams.endPoint) endPointLineId = mDragStartParams.endPoint;
                if (minPointData.id && !minPointData.isStartPoint) {
                    endPointLineId = minPointData.id;
                }

                let result = getPointsFromLine(mDrawingLine, LINE_RESOLUTION);

                mDrawFinishedCallback(result, startPointLineId, endPointLineId);
            }
            // reset
            mDraggedPoints = [];
            mDrawingLine.attr('d', PathMath.getPathD([]));
            mDrawingLine.attr('stroke', mColor);
            mDragStartParams = {};
            mPointsGroup.selectAll('.draw-start-point').style("visibility", "");
            mPointsGroup.selectAll('.draw-end-point').style("visibility", "");
        }
    }

    let mDrawingLine = mLineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    let mPointsGroup = mLineDrawingGroup.append('g');

    function updateModel(model) {
        let timelines = model.getAllTimelines();
        mStartPoints = timelines.map(item => {
            return { id: item.id, point: item.points[0], isStartPoint: true, color: item.color };
        })
        mEndPoints = timelines.map(item => {
            return { id: item.id, point: item.points[item.points.length - 1], isStartPoint: false, color: item.color };
        })

        let startPoints = mPointsGroup.selectAll('.draw-start-point').data(mStartPoints);
        startPoints.exit().remove();
        startPoints.enter().append("circle")
            .classed("draw-start-point", true)
            .attr('id', d => "start-point_" + d.id)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#b51d1c')
            .attr("stroke", "black")
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.startPoint = d.id;
                    mPointsGroup.selectAll('.draw-start-point').style("visibility", "hidden");
                    mPointsGroup.select('#end-point_' + d.id).style("visibility", "hidden");
                    mDrawingLine.attr('stroke', d.color);
                }
            })
        mPointsGroup.selectAll('.draw-start-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)

        let endPoints = mPointsGroup.selectAll('.draw-end-point').data(mEndPoints);
        endPoints.exit().remove();
        endPoints.enter().append("circle")
            .classed("draw-end-point", true)
            .attr('id', d => "end-point_" + d.id)
            .attr('r', EXTENSION_POINT_RADIUS)
            .attr('cursor', 'pointer')
            .attr('fill', '#1c1db5')
            .attr("stroke", "black")
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.endPoint = d.id;
                    mPointsGroup.selectAll('.draw-end-point').style("visibility", "hidden");
                    mPointsGroup.select('#start-point_' + d.id).style("visibility", "hidden");
                    mDrawingLine.attr('stroke', d.color);
                }
            })
        mPointsGroup.selectAll('.draw-end-point')
            .attr('cx', (d) => d.point.x)
            .attr('cy', (d) => d.point.y)
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
            mCover.style('visibility', "")
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height)
        } else if (!active && mActive) {
            mActive = false;
            mLineDrawingGroup.style('visibility', "hidden");
            mCover.style('visibility', "hidden");
        }
    }

    function setColor(color) {
        mColor = color;
        mDrawingLine.attr('stroke', color);
    }

    this.updateModel = updateModel;
    this.setActive = setActive;
    this.setColor = setColor;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
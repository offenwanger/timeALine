function LineDrawingController(svg) {
    const EXTENSION_POINT_RADIUS = 5;
    const LINE_RESOLUTION = 50;

    let mActive = false;

    let mDragging = false;
    let mDraggedPoints = [];
    let mDragStartParams = {};

    let mDrawFinishedCallback = () => { };
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
        .on('pointerdown', function (e) {
            if (mActive) {
                mDragging = true;
            }
        });

    $(document).on("pointermove", function (e) {
        e = e.originalEvent;
        if (mActive && mDragging) {
            mDraggedPoints.push({ x: e.x, y: e.y });
            mDrawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    });
    $(document).on("pointerup", function (e) {
        e = e.originalEvent;
        // TODO: Should check if this is indeed all fingers off

        if (mDragging && mDraggedPoints.length > 1) {
            mDragging = false;

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


                let result = getPointsFromLine(mDrawingLine, LINE_RESOLUTION);

                mDrawFinishedCallback(result, startPointLineId, endPointLineId);
            }
            // reset
            mDraggedPoints = [];
            mDrawingLine.attr('d', PathMath.getPathD([]));
            mDragStartParams = {};
            mPointsGroup.selectAll('.start-point').style("visibility", "");
            mPointsGroup.selectAll('.end-point').style("visibility", "");
        }
    });

    let mDrawingLine = mLineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    let mPointsGroup = mLineDrawingGroup.append('g');

    function updateModel(model) {
        let timelines = model.getAllTimelines();
        mStartPoints = timelines.map(item => {
            return { id: item.id, point: item.points[0] };
        })
        mEndPoints = timelines.map(item => {
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
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.startPoint = d.id;
                    mPointsGroup.selectAll('.start-point').style("visibility", "hidden");
                    mPointsGroup.select('#end-point_' + d.id).style("visibility", "hidden");
                }
            })
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
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDragStartParams.endPoint = d.id;
                    mPointsGroup.selectAll('.end-point').style("visibility", "hidden");
                    mPointsGroup.select('#start-point_' + d.id).style("visibility", "hidden");
                }
            })
        mPointsGroup.selectAll('.end-point')
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
        } else if (!active && mActive) {
            mActive = false;
            mLineDrawingGroup.style('visibility', "hidden");
        }
    }

    this.updateModel = updateModel;
    this.setActive = setActive;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
}
function DataPointController(svg) {
    const TAIL_POINT_COUNT = 20;

    let mAxisUpdatedCallback = () => { };
    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mMouseOverCallback = () => { };
    let mMouseOutCallback = () => { };

    let mDragStartPos = null;

    let mPointDragging = false;
    let mPointDraggingBinding = null;

    let mAxisDragging = false;
    let mAxisDraggingData = null;

    let mDataPointGroup = svg.append('g')
        .attr("id", 'data-point-display-g');
    let mAxisGroup = svg.append('g')
        .attr("id", 'data-axis-display-g');

    // put this on document to capture releases outside the window
    $(document).on('pointermove', function (e) {
        e = e.originalEvent;

        if (mPointDragging) {
            mDragCallback(mPointDraggingBinding, mDragStartPos, { x: e.x, y: e.y });
        }

        if (mAxisDragging) {
            let dragPoint = { x: e.x, y: e.y };

            let normal = mAxisDraggingData.normal;
            let origin = mAxisDraggingData.basePose;

            let newPosition = MathUtil.projectPointOntoVector(dragPoint, normal, origin);

            mAxisGroup.select("#axis-control_" + mAxisDraggingData.axisId + "_" + mAxisDraggingData.ctrl).attr("cx", newPosition.x);
            mAxisGroup.select("#axis-control_" + mAxisDraggingData.axisId + "_" + mAxisDraggingData.ctrl).attr("cy", newPosition.y);

            let line = mAxisGroup.select("#axis-line_" + mAxisDraggingData.axisId);
            if (mAxisDraggingData.ctrl == 1) {
                line.attr('x1', newPosition.x)
                    .attr('y1', newPosition.y);
            } else {
                line.attr('x2', newPosition.x)
                    .attr('y2', newPosition.y);
            }
        }
    });
    $(document).on("pointerup", function (e) {
        e = e.originalEvent;
        if (mPointDragging) {
            mPointDragging = false;

            mDragEndCallback(mPointDraggingBinding, mDragStartPos, { x: e.x, y: e.y });

            // cleanup
            mPointDraggingBinding = null;
            mDragStartPos = null;
        } else if (mAxisDragging) {
            mAxisDragging = false;

            let dragPoint = { x: e.x, y: e.y };

            let normal = mAxisDraggingData.normal;
            let origin = mAxisDraggingData.basePose;

            let newPosition = MathUtil.projectPointOntoVector(dragPoint, normal, origin);
            let dist = MathUtil.distanceFromAToB(origin, newPosition);
            dist = newPosition.neg ? -1 * dist : dist;
            mAxisUpdatedCallback(mAxisDraggingData.axisId, mAxisDraggingData.ctrl, dist);

            // cleanup
            mAxisDraggingData = null;
            mDragStartPos = null;
        }
    });

    function updateModel(model) {
        let timelines = model.getAllTimelines();
        let boundData = model.getAllCellBindingData().filter(cbd => cbd.dataCell.getType() == DataTypes.NUM);
        drawPoints(timelines, boundData);
        drawAxes(DataUtil.getUniqueList(boundData.filter(d => d.axisBinding).map(d => {
            return {
                id: d.axisBinding.id,
                line: timelines.find(t => t.id == d.timelineId).points,
                axis: d.axisBinding
            }
        }), 'id'))
    }

    function drawPoints(timelines, boundData) {
        let drawingData = timelines.map(t => getTimelineDrawingData(t, boundData.filter(b => b.timelineId == t.id))).flat();
        let points = mDataPointGroup.selectAll('.data-display-point').data(drawingData);
        setupCircles(points)
    }

    function drawTimelinePointSet(timeline, boundData) {
        let drawingData = getTimelineDrawingData(timeline, boundData);

        let setsIds = DataUtil.getUniqueList(boundData.map(boundData.columnId));
        setsIds.forEach(setId => {
            let setData = drawingData.filter(drawingData.binding.columnId == setId);
            let points = mDataPointGroup.selectAll('.data-display-point-set_' + setId).data(setData);
            setupCircles(points)
        });
    }

    function setupCircles(selection) {
        selection.exit().remove();
        selection.enter()
            .append('circle')
            .classed('data-display-point', true)
            // ERROR: TODO: Fix this, it's not calling a function here. 
            .classed(d => { return 'data-display-point-set_' + d.binding.columnId; }, true)
            .attr('r', 3.0)
            .attr('stroke', 'black')
            .on('pointerdown', function (e, d) {
                mPointDraggingBinding = d.binding;
                mDragStartPos = { x: e.x, y: e.y };
                mDragStartCallback(mPointDraggingBinding, mDragStartPos);
            })
            .on('mouseover', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mMouseOverCallback(d.binding, mouseCoords);
            })
            .on('mouseout', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mMouseOutCallback(d.binding, mouseCoords);
            });

        mDataPointGroup.selectAll('.data-display-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color })
            .style('opacity', function (d) { return d.opacity });
    }

    //// point draw utility ////
    function getTimelineDrawingData(timeline, boundData) {
        let drawingData = boundData.filter(b => b.linePercent >= 0 && b.linePercent <= 1).map(b => getDrawingData(timeline, b));
        let tail1Data = boundData.filter(b => b.linePercent < 0).map(b => getDrawingData(timeline, b));
        let tail2Data = boundData.filter(b => b.linePercent > 1).map(b => getDrawingData(timeline, b));

        drawingData.push(...filterAndFade(tail1Data, TAIL_POINT_COUNT));
        drawingData.push(...filterAndFade(tail2Data, TAIL_POINT_COUNT));

        return drawingData;
    }

    function getDrawingData(timeline, binding) {
        let { val1, val2, dist1, dist2 } = binding.axisBinding;
        if (val1 == val2) throw new Error("Invalid binding values: " + val1 + ", " + val2);

        let dist = (dist2 - dist1) * (binding.dataCell.getValue() - val1) / (val2 - val1) + dist1;
        let pos = PathMath.getPositionForPercentAndDist(timeline.points, binding.linePercent, dist);

        return {
            binding,
            x: pos.x,
            y: pos.y,
            opacity: 1,
            color: "red"
        };
    }

    function filterAndFade(tailArr, count) {
        let n = Math.ceil(tailArr.length / count);
        let shuffled = tailArr.sort(function () { return .5 - Math.random() });
        let selected = shuffled.slice(0, n);
        let fade = 1;
        selected.forEach(pointData => {
            fade -= 1 / n;
            pointData.opacity = fade;
        })
        return selected;
    }
    //// end point draw utility ////

    function drawAxes(axesData) {
        let axisLineData = []
        let axisControlData = []

        axesData.forEach(axisData => {
            let axis = axisData.axis;
            let basePose = PathMath.getPositionForPercent(axisData.line, axis.linePercent);
            let normal = PathMath.getNormalForPercent(axisData.line, axis.linePercent);

            let pos1 = MathUtil.getPointAtDistanceAlongVector(axis.dist1, normal, basePose);
            let pos2 = MathUtil.getPointAtDistanceAlongVector(axis.dist2, normal, basePose);

            axisLineData.push({ axisId: axis.id, x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y });

            axisControlData.push({ axisId: axis.id, ctrl: 1, x: pos1.x, y: pos1.y, val: axis.val1, normal, basePose });
            axisControlData.push({ axisId: axis.id, ctrl: 2, x: pos2.x, y: pos2.y, val: axis.val2, normal, basePose });
        })

        let lines = mAxisGroup.selectAll('.axis-line').data(axisLineData);
        lines.exit().remove();
        lines.enter()
            .append('line')
            .classed("axis-line", true)
            .attr('id', function (d) { return "axis-line_" + d.axisId })
            .attr('stroke-width', 1.5)
            .attr('stroke', 'black');
        mAxisGroup.selectAll('.axis-line')
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y1 })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y2 });

        let controlLabels = mAxisGroup.selectAll('.axis-control-label').data(axisControlData);
        controlLabels.exit().remove();
        controlLabels.enter()
            .append('text')
            .classed('axis-control-label', true)
            .attr('id', function (d) { return "axis-control_" + d.axisId + "_" + d.ctrl })
            .attr('text-anchor', 'left')
            .style('font-size', '16px');

        mAxisGroup.selectAll('.axis-control-label')
            .attr('x', function (d) { return d.x })
            .attr('y', function (d) { return d.y })
            .text(function (d) { return d.val });

        let controls = mAxisGroup.selectAll('.axis-control-circle').data(axisControlData);
        controls.exit().remove();
        controls.enter()
            .append('circle')
            .classed("axis-control-circle", true)
            .attr('r', 3.5)
            .attr('cursor', 'pointer')
            .on('pointerdown', (e, d) => {
                mAxisDraggingData = d;
                mDragStartPos = { x: e.x, y: e.y };
                mAxisDragging = true;
            })

        mAxisGroup.selectAll('.axis-control-circle')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y });
    }

    this.updateModel = updateModel;
    this.drawPoints = drawPoints;
    this.drawTimelinePointSet = drawTimelinePointSet;
    this.drawAxes = drawAxes;
    this.setAxisUpdatedCallback = (callback) => mAxisUpdatedCallback = callback;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback
    this.setMouseOverCallback = (callback) => { mMouseOverCallback = callback; };
    this.setMouseOutCallback = (callback) => { mMouseOutCallback = callback; };
}
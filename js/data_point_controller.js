function DataPointController(vizLayer, overlayLayer, interactionLayer) {
    const TAIL_POINT_COUNT = 20;

    let mActive = false;

    let mPointDragging = false;
    let mPointDraggingBinding = null;
    let mPointDragStartCallback = (cellBindingData, event) => { };
    let mPointDragCallback = (cellBindingData, coords) => { };
    let mPointDragEndCallback = (cellBindingData, coords) => { }

    let mAxisDragging = false;
    let mAxisDraggingData = null;
    let mAxisDragStartCallback = (axisId, controlPoint, event) => { };
    let mAxisDragCallback = (axisId, controlPoint, dist, coords) => { };
    let mAxisDragEndCallback = (axisId, controlPoint, dist, coords) => { };

    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };

    let mDataPointGroup = vizLayer.append('g')
        .attr("id", 'data-point-display-g');
    let mAxisGroup = vizLayer.append('g')
        .attr("id", 'data-axis-display-g');

    let mDataPointTargetGroup = interactionLayer.append('g')
        .attr("id", 'data-point-target-g');
    let mAxisTargetGroup = interactionLayer.append('g')
        .attr("id", 'data-axis-target-g');

    function updateModel(model) {
        let timelines = model.getAllTimelines();
        let boundData = model.getAllCellBindingData().filter(cbd => cbd.dataCell.getType() == DataTypes.NUM);
        drawPoints(timelines, boundData);
        drawAxes(DataUtil.getUniqueList(boundData.filter(d => d.axisBinding).map(d => {
            return {
                id: d.axisBinding.id,
                line: d.timeline.points,
                axis: d.axisBinding
            }
        }), 'id'))
    }

    function drawPoints(timelines, boundData) {
        let drawingData = timelines.map(t => getTimelineDrawingData(t, boundData.filter(b => b.timeline.id == t.id))).flat();
        let selection = mDataPointGroup.selectAll('.data-display-point').data(drawingData);
        selection.exit().remove();
        selection.enter()
            .append('circle')
            .classed('data-display-point', true)
            .attr('r', 3.0)
            .attr('stroke', 'black')

        mDataPointGroup.selectAll('.data-display-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color })
            .style('opacity', function (d) { return d.opacity });

        let targetSelection = mDataPointTargetGroup.selectAll('.data-target-point')
            .data(drawingData);
        targetSelection.exit().remove();
        targetSelection.enter()
            .append('circle')
            .classed('data-target-point', true)
            .attr('r', 10)
            .attr('fill', "black")
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mPointDragging = true;
                    mPointDraggingBinding = d.binding;
                    mPointDragStartCallback(mPointDraggingBinding, e);
                }
            })
            .on('pointerenter', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mPointerEnterCallback(d.binding, mouseCoords);
            })
            .on('pointerout', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mPointerOutCallback(d.binding, mouseCoords);
            });

        mDataPointTargetGroup.selectAll('.data-target-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y });
    }

    //// point draw utility ////
    function getTimelineDrawingData(timeline, boundData) {
        let drawingData = boundData.filter(b => b.linePercent != NO_LINE_PERCENT && b.linePercent >= 0 && b.linePercent <= 1).map(b => getDrawingData(timeline, b));
        let tail1Data = boundData.filter((b, index) => (b.linePercent == NO_LINE_PERCENT && index % 2 == 0) || b.linePercent < 0).map(b => getDrawingData(timeline, b));
        let tail2Data = boundData.filter((b, index) => (b.linePercent == NO_LINE_PERCENT && index % 2 == 1) || b.linePercent > 1).map(b => getDrawingData(timeline, b));

        drawingData.push(...filterAndFade(tail1Data, TAIL_POINT_COUNT));
        drawingData.push(...filterAndFade(tail2Data, TAIL_POINT_COUNT));

        return drawingData;
    }

    function getDrawingData(timeline, binding) {
        let { val1, val2, dist1, dist2 } = binding.axisBinding;

        if (val1 == val2) {
            console.error("Invalid binding values: " + val1 + ", " + val2);
            val1 = 0;
            if (val1 == val2) val2 = 1;
        };

        let dist = (dist2 - dist1) * (binding.dataCell.getValue() - val1) / (val2 - val1) + dist1;
        let pos = PathMath.getPositionForPercentAndDist(timeline.points, binding.linePercent, dist);

        return {
            binding,
            x: pos.x,
            y: pos.y,
            opacity: 1,
            color: binding.color ? binding.color : "black"
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

            axisControlData.push({
                axisId: axis.id,
                ctrl: 1,
                color: axis.color1 ? axis.color1 : "black",
                x: pos1.x,
                y: pos1.y,
                val: axis.val1,
                normal,
                basePose
            });
            axisControlData.push({
                axisId: axis.id,
                ctrl: 2,
                color: axis.color2 ? axis.color2 : "black",
                x: pos2.x,
                y: pos2.y,
                val: axis.val2,
                normal,
                basePose
            });
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
            .attr('id', function (d) { return "axis-control_" + d.axisId + "_" + d.ctrl })
            .attr('r', 3.0)
            .attr('stroke', 'black')

        mAxisGroup.selectAll('.axis-control-circle')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color });

        let controlTargets = mAxisTargetGroup.selectAll('.axis-target-circle').data(axisControlData);
        controlTargets.exit().remove();
        controlTargets.enter()
            .append('circle')
            .classed("axis-target-circle", true)
            .attr('r', 6)
            .attr('opacity', 0)
            .attr('cursor', 'pointer')
            .on('pointerdown', (e, d) => {
                if (mActive) {
                    mAxisDraggingData = d;
                    mAxisDragging = true;
                    mAxisDragStartCallback(mAxisDraggingData.axisId, mAxisDraggingData.ctrl, e)
                }
            })

        mAxisTargetGroup.selectAll('.axis-target-circle')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y });
    }

    function onPointerMove(coords) {
        if (mPointDragging) {
            mPointDragCallback(mPointDraggingBinding, coords);
        }

        if (mAxisDragging) {
            let normal = mAxisDraggingData.normal;
            let origin = mAxisDraggingData.basePose;
            let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
            let dist = MathUtil.distanceFromAToB(origin, newPosition);
            dist = newPosition.neg ? -1 * dist : dist;
            mAxisDragCallback(mAxisDraggingData.axisId, mAxisDraggingData.ctrl, dist, coords);
        }
    }

    function onPointerUp(coords) {
        if (mPointDragging) {

            mPointDragEndCallback(mPointDraggingBinding, coords);

            mPointDragging = false;
            mPointDraggingBinding = null;
        } else if (mAxisDragging) {
            let normal = mAxisDraggingData.normal;
            let origin = mAxisDraggingData.basePose;
            let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
            let dist = MathUtil.distanceFromAToB(origin, newPosition);
            dist = newPosition.neg ? -1 * dist : dist;
            mAxisDragEndCallback(mAxisDraggingData.axisId, mAxisDraggingData.ctrl, dist, coords);

            // cleanup
            mAxisDragging = false;
            mAxisDraggingData = null;
        }
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mDataPointTargetGroup.style('visibility', "");
            mAxisTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mDataPointTargetGroup.style('visibility', "hidden");
            mAxisTargetGroup.style('visibility', "hidden");
        }
    }

    this.updateModel = updateModel;
    this.drawPoints = drawPoints;
    this.drawAxes = drawAxes;
    this.setActive = setActive;
    this.setPointDragStartCallback = (callback) => mPointDragStartCallback = callback;
    this.setPointDragCallback = (callback) => mPointDragCallback = callback;
    this.setPointDragEndCallback = (callback) => mPointDragEndCallback = callback
    this.setAxisDragStartCallback = (callback) => mAxisDragStartCallback = callback;
    this.setAxisDragCallback = (callback) => mAxisDragCallback = callback;
    this.setAxisDragEndCallback = (callback) => mAxisDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => { mPointerEnterCallback = callback; };
    this.setPointerOutCallback = (callback) => { mPointerOutCallback = callback; };

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
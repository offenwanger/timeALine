function DataPointController(vizLayer, overlayLayer, interactionLayer) {
    const TAIL_POINT_COUNT = 20;

    let mModel = new DataStructs.DataModel();
    let mPointDrawingData = null;
    let mLineDrawingData = null;
    let mAxisDrawingData = null;

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
        let oldModel = mModel;
        mModel = model;

        let oldPointDrawingData = mPointDrawingData;
        let oldLineDrawingData = mLineDrawingData;
        let oldAxisDrawingData = mAxisDrawingData;
        mPointDrawingData = {};
        mLineDrawingData = {};
        mAxisDrawingData = {};

        mModel.getAllTimelines().forEach(timeline => {
            let changedCellBindingIds = DataUtil.timelineDataPointsChanged(timeline.id, model, oldModel);
            let recalculationData = [];

            let cellBindingData = mModel.getCellBindingData(timeline.id)
                .filter(cbd => cbd.dataCell.getType() == DataTypes.NUM);

            cellBindingData.forEach(bindingData => {
                if (changedCellBindingIds.includes(bindingData.cellBinding.id)) {
                    recalculationData.push(bindingData);
                } else {
                    mPointDrawingData[bindingData.cellBinding.id] = oldPointDrawingData[bindingData.cellBinding.id];
                }
            });
            let newData = getPointDrawingData(timeline, recalculationData);
            newData.forEach(dataItem => {
                mPointDrawingData[dataItem.binding.cellBinding.id] = dataItem;
            })

            let axisIds = timeline.axisBindings.map(b => b.id);
            axisIds.forEach(axisId => {
                let cells = cellBindingData.filter(cbd => cbd.axisBinding.id == axisId);
                if (cells.length == 0) { console.error("No cells found for axis id!", axisId); return; }
                let axis = cells[0].axisBinding;
                let otherAxis = oldModel.getAxisById(axis.id);

                if (otherAxis && axis.equals(otherAxis)) {
                    mAxisDrawingData[axis.id] = oldAxisDrawingData[axis.id];
                } else {
                    mAxisDrawingData[axis.id] = getAxisDrawingData(timeline, axis);
                }

                if (axis.style != DataDisplayStyles.POINTS) {
                    if (cells.some(cbd => changedCellBindingIds.includes(cbd.cellBinding.id))) {
                        let pointDrawingData = cells.map(cbd => mPointDrawingData[cbd.cellBinding.id]);
                        mLineDrawingData[axisId] = getLineDrawingData(axis, timeline, pointDrawingData);
                    } else {
                        mLineDrawingData[axisId] = oldLineDrawingData[axisId];
                    }
                }
            })
        });

        drawLines(Object.values(mLineDrawingData).filter(drawingData => drawingData.axis.style == DataDisplayStyles.LINE));
        drawStreams(Object.values(mLineDrawingData).filter(drawingData => drawingData.axis.style == DataDisplayStyles.STREAM));
        drawAreas(Object.values(mLineDrawingData).filter(drawingData => drawingData.axis.style == DataDisplayStyles.AREA));
        drawPoints(Object.values(mPointDrawingData));
        drawAxes(Object.values(mAxisDrawingData));
    }

    function drawDataSet(cellBindingData) {
        if (cellBindingData.length == 0) { console.error("No data provided for drawing!"); return; }
        let timeline = cellBindingData[0].timeline
        let pointDrawingData = getPointDrawingData(timeline, cellBindingData);
        drawPoints(pointDrawingData);

        let axis = cellBindingData[0].axisBinding;
        let axisData = getAxisDrawingData(timeline, axis);
        drawAxes([axisData]);

        let lineData;
        if (axis.style != DataDisplayStyles.POINTS) {
            lineData = getLineDrawingData(axis, timeline, pointDrawingData);
        }
        if (axis.style == DataDisplayStyles.LINE) { drawLines([lineData]); } else { drawLines([]); }
        if (axis.style == DataDisplayStyles.STREAM) { drawStreams([lineData]); } else { drawStreams([]); }
        if (axis.style == DataDisplayStyles.AREA) { drawAreas([lineData]); } else { drawAreas([]); }
    }

    function getPointDrawingData(timeline, cellBindings) {
        cellBindings.sort((a, b) => a.linePercent - b.linePercent);
        let percents = cellBindings.map(b => b.linePercent);
        let dists = cellBindings.map(b => {
            let { val1, val2, dist1, dist2 } = b.axisBinding;
            if (b.axisBinding.style == DataDisplayStyles.AREA || b.axisBinding.style == DataDisplayStyles.STREAM) {
                val2 = Math.max(Math.abs(val1), Math.abs(val2));
                val1 = 0;
            }
            if (val1 == val2) { console.error("Invalid axis values: " + val1 + ", " + val2); val1 = 0; if (val1 == val2) val2 = 1; };
            let dist = (dist2 - dist1) * (b.dataCell.getValue() - val1) / (val2 - val1) + dist1;
            return dist;
        })
        let positions = PathMath.getPositionsForPercentsAndDists(timeline.points, percents, dists);
        return cellBindings.map((bindingData, index) => {
            return {
                binding: bindingData,
                dist: dists[index],
                x: positions[index].x,
                y: positions[index].y,
            }
        });
    }

    function getLineDrawingData(axis, timeline, pointDrawingData) {
        let returnable = {
            axis: axis,
            timelineId: timeline.id
        }

        let linePoints = PathMath.interpolatePoints(timeline.points, pointDrawingData.map(p => {
            return { percent: p.binding.linePercent, dist: p.dist }
        }));

        if (axis.style == DataDisplayStyles.LINE) {
            returnable.line = PathMath.getPathD(linePoints);
        } else if (axis.style == DataDisplayStyles.AREA) {
            let bottomPoints = PathMath.interpolatePoints(timeline.points, pointDrawingData.map(p => {
                return { percent: p.binding.linePercent, dist: axis.dist1 }
            }));
            returnable.line = PathMath.getPathD(linePoints.concat(bottomPoints.reverse()));
        } else if (axis.style == DataDisplayStyles.STREAM) {
            let bottomPoints = PathMath.interpolatePoints(timeline.points, pointDrawingData.map(p => {
                return { percent: p.binding.linePercent, dist: axis.dist1 - (p.dist - axis.dist1) }
            }));
            returnable.line = PathMath.getPathD(linePoints.concat(bottomPoints.reverse()));
        }

        return returnable;
    }

    function getAxisDrawingData(timeline, axis) {
        let origin = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
        let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);

        let pos1 = MathUtil.getPointAtDistanceAlongVector(axis.dist1, normal, origin);
        let pos2 = MathUtil.getPointAtDistanceAlongVector(axis.dist2, normal, origin);

        return { timelineId: timeline.id, axis, normal, origin, pos1, pos2 };
    }

    function drawPoints(drawingData) {
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
            .attr('fill', function (d) { return d.binding.color })
            .attr('timeline-id', function (d) { return d.binding.timeline.id })
            .attr('binding-id', function (d) { return d.binding.cellBinding.id });

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
                if (mActive) {
                    mPointerEnterCallback(e, d.binding);
                    FilterUtil.applyShadowFilter(mDataPointGroup
                        .select('.data-display-point[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.binding);
                    FilterUtil.removeShadowFilter(mDataPointGroup
                        .select('.data-display-point[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            });

        mDataPointTargetGroup.selectAll('.data-target-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y });
    }

    function drawLines() {
        console.error("Finish me");

    }

    function drawAreas() {
        console.error("Finish me");

    }

    function drawStreams() {
        console.error("Finish me");

    }

    function drawAxes(axesData) {
        let axisLineData = []
        let axisControlData = []

        axesData.forEach(axisData => {
            axisLineData.push({
                axisId: axisData.axis.id,
                x1: axisData.pos1.x,
                y1: axisData.pos1.y,
                x2: axisData.pos2.x,
                y2: axisData.pos2.y,
                timelineId: axisData.timelineId,
            });

            axisControlData.push({
                axisId: axisData.axis.id,
                normal: axisData.normal,
                origin: axisData.origin,
                timelineId: axisData.timelineId,

                ctrl: 1,
                color: axisData.axis.color1 ? axisData.axis.color1 : "black",
                x: axisData.pos1.x,
                y: axisData.pos1.y,
                val: axisData.axis.val1,
            });
            axisControlData.push({
                axisId: axisData.axis.id,
                normal: axisData.normal,
                origin: axisData.origin,
                timelineId: axisData.timelineId,

                ctrl: 2,
                color: axisData.axis.color2 ? axisData.axis.color2 : "black",
                x: axisData.pos2.x,
                y: axisData.pos2.y,
                val: axisData.axis.val2,
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
            .attr('y2', function (d) { return d.y2 })
            .attr('timeline-id', function (d) { return d.timelineId });

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
            .text(function (d) { return d.val })
            .attr('timeline-id', function (d) { return d.timelineId })
            .attr('axis-id', function (d) { return d.axisId })
            .attr('axis-ctrl', function (d) { return d.ctrl });

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
            .attr('fill', function (d) { return d.color })
            .attr('timeline-id', function (d) { return d.timelineId })
            .attr('axis-id', function (d) { return d.axisId })
            .attr('axis-ctrl', function (d) { return d.ctrl });

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
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    FilterUtil.applyShadowFilter(mAxisGroup
                        .selectAll('[axis-id="' + d.axisId + '"][axis-ctrl="' + d.ctrl + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    FilterUtil.removeShadowFilter(mAxisGroup
                        .selectAll('[axis-id="' + d.axisId + '"][axis-ctrl="' + d.ctrl + '"]'));
                }
            });

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
            let origin = mAxisDraggingData.origin;
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
            let origin = mAxisDraggingData.origin;
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
    this.drawDataSet = drawDataSet;
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
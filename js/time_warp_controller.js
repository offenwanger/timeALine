function TimeWarpController(svg) {
    const TICK_WIDTH = 3;
    const TICK_LENGTH = 8
    const TICK_TARGET_SIZE = 10;
    const MIN_TICK_SPACING = 30;
    const TAIL_TICK_COUNT = 2;

    let mActive = false;

    let mLinePoints = {};
    let mBindings = []
    let mDraggingBinding = null;

    let mUpdateWarpBindingCallback = () => { };

    let mTailGroup = svg.append('g')
        .attr("id", 'tick-tail-g');
    let mControlTickGroup = svg.append('g')
        .attr("id", 'tick-g');

    let mControlTickTargetGroup = svg.append('g')
        .attr("id", 'tick-target-g')
        .style('visibility', "hidden")

    function addOrUpdateTimeControls(timelines, warpBindingData) {
        mBindings = warpBindingData;

        timelines.forEach(timeline => {
            mLinePoints[timeline.id] = timeline.points;
            drawTails(timeline.id, timeline.points);
            drawTicks(timeline.id, timeline.points, warpBindingData.filter(wbd => wbd.timelineId == timeline.id));
            setTickHandlers(timeline.id);
        });
    }

    function removeTimeControls(timelineIds) {
        timelineIds.forEach(id => {
            delete mLinePoints[id];
            mControlTickGroup.selectAll('.warpTick_' + id).remove();
            mControlTickTargetGroup.selectAll('.warpTickTarget_' + id).remove();
            mTailGroup.select('#timelineTail1_' + id).remove();
            mTailGroup.select('#timelineTail2_' + id).remove();
        })
    }

    function drawTicks(timelineId, linePoints, warpBindingData) {
        warpBindingData.sort((a, b) => a.linePercent - b.linePercent)

        let path = PathMath.getPath(linePoints);
        let totalLength = path.getTotalLength();

        let tickData = [];
        let tickTargetData = [];

        if (warpBindingData.length == 0) {
            tickData.push(...getTicksForSegment(path, totalLength, 0, 1))
        } else if (warpBindingData[0].linePercent > 0) {
            tickData.push(...getTicksForSegment(path, totalLength, 0, warpBindingData[0].linePercent))
        }

        warpBindingData.forEach((binding, index) => {
            let position = path.getPointAtLength(totalLength * binding.linePercent);

            let degrees;
            if (binding.linePercent > 0) {
                let positionBefore = path.getPointAtLength(totalLength * binding.linePercent - 1);
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
            } else {
                let positionAfter = path.getPointAtLength(totalLength * binding.linePercent + 1);
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(position, positionAfter)) - 90;
            }

            let size = 1

            let boundTickData = {
                position,
                size: constrainValue(size),
                degrees,
                binding,
                color: binding.color ? binding.color : DataTypesColor[binding.timeCell.getType()],
            };
            tickData.push(boundTickData);
            tickTargetData.push(boundTickData);

            // get the regular ticks for the following segment
            tickData.push(...getTicksForSegment(path, totalLength, binding.linePercent, index + 1 < warpBindingData.length ? warpBindingData[index + 1].linePercent : 1));
        });

        let startTailDirection = MathUtil.vectorFromAToB(linePoints[1], linePoints[0]);
        let endTailDirection = MathUtil.vectorFromAToB(linePoints[linePoints.length - 2], linePoints[linePoints.length - 1])
        for (let i = 0; i < TAIL_TICK_COUNT; i++) {
            let percentInTail = 1 - i / TAIL_TICK_COUNT;
            tickData.push({
                position: PathMath.getPositionForPercent(linePoints, -percentInTail),
                size: 1,
                degrees: MathUtil.vectorToRotation(startTailDirection) + 90,
                color: 'grey',
            })
            tickData.push({
                position: PathMath.getPositionForPercent(linePoints, 1 + percentInTail),
                size: 1,
                degrees: MathUtil.vectorToRotation(endTailDirection) + 90,
                color: 'grey',
            })
        }

        let ticks = mControlTickGroup.selectAll('.warpTick_' + timelineId).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('warpTick_' + timelineId, true);
        mControlTickGroup.selectAll('.warpTick_' + timelineId)
            .style("stroke", (d) => d.color)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", (d) => d.size * TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + d.size * TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - d.size * TICK_LENGTH / 2);

        let targets = mControlTickTargetGroup.selectAll('.warpTickTarget_' + timelineId).data(tickTargetData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('warpTickTarget_' + timelineId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')

        mControlTickTargetGroup.selectAll('.warpTickTarget_' + timelineId)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", TICK_TARGET_SIZE + TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + TICK_TARGET_SIZE + TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - TICK_TARGET_SIZE + TICK_LENGTH / 2);
    }

    function getTicksForSegment(path, pathLength, startPercent, endPercent) {
        let tickData = [];

        let segmentLength = (endPercent - startPercent) * pathLength;
        let tickCount = Math.floor((segmentLength - MIN_TICK_SPACING) / MIN_TICK_SPACING);

        if (segmentLength > MIN_TICK_SPACING && startPercent == 0) {
            let position = path.getPointAtLength(0);
            let positionAfter = path.getPointAtLength(1);
            let degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(position, positionAfter)) - 90;
            let size = 1;
            tickData.push({
                position,
                size: constrainValue(size),
                degrees,
                color: 'black'
            })
        }

        if (tickCount > 0) {
            let startLength = startPercent * pathLength;
            let tickDist = segmentLength / (tickCount + 1)
            let ticks = Array.from(Array(tickCount).keys())
                .map(val => ((val + 1) * tickDist) + startLength)
                .map(dist => {
                    let position = path.getPointAtLength(dist);
                    let positionBefore = path.getPointAtLength(dist - 1);
                    let degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
                    let size = 1;
                    return {
                        position,
                        size: constrainValue(size),
                        degrees,
                        color: 'black'
                    };
                })
            tickData.push(...ticks);
        }

        if (segmentLength > MIN_TICK_SPACING && endPercent == 1) {
            let position = path.getPointAtLength(pathLength);
            let positionBefore = path.getPointAtLength(pathLength - 1);
            let degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
            let size = 1;
            tickData.push({
                position,
                size: constrainValue(size),
                degrees,
                color: 'black'
            })
        }

        return tickData;
    }

    function drawTails(timelineId, linePoints) {
        let tail1 = mTailGroup.select('#timelineTail1_' + timelineId).node()
            ? mTailGroup.select('#timelineTail1_' + timelineId)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + timelineId)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"));

        let tail2 = mTailGroup.select('#timelineTail2_' + timelineId).node()
            ? mTailGroup.select('#timelineTail2_' + timelineId)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail2_' + timelineId)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"));

        let startPoint = linePoints[0];
        let direction1 = MathUtil.vectorFromAToB(linePoints[1], startPoint);
        let tail1End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction1, startPoint);
        tail1.attr('x1', startPoint.x)
            .attr('y1', startPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);

        let endPoint = linePoints[linePoints.length - 1]
        let direction2 = MathUtil.vectorFromAToB(linePoints[linePoints.length - 2], endPoint);
        let tail2End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction2, endPoint);
        tail2.attr('x1', endPoint.x)
            .attr('y1', endPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
    }

    function setTickHandlers(timelineId) {
        let targets = mControlTickTargetGroup.selectAll('.warpTickTarget_' + timelineId);
        targets.on('mousedown.drag', null);
        targets.call(d3.drag()
            .on('start', (event, d) => {
                if (mActive) {
                    pinDragStart(d.binding.timelineId, d.binding);
                }
            })
            .on('drag', (event, d) => {
                if (mActive) {
                    let dragPoint = { x: event.x, y: event.y };
                    let linePercent = PathMath.getClosestPointOnPath(dragPoint, mLinePoints[d.binding.timelineId]).percent;
                    pinDrag(d.binding.timelineId, linePercent);
                }
            })
            .on('end', (event, d) => {
                if (mActive) {

                    let dragPoint = { x: event.x, y: event.y };
                    let linePercent = PathMath.getClosestPointOnPath(dragPoint, mLinePoints[d.binding.timelineId]).percent;
                    pinDragEnd(d.binding.timelineId, linePercent);
                }
            }))
            .on("mouseover", (event, d) => {
                //TODO Highlight the time cell
                ToolTip.show(d.binding.timeCell.toString(), d.position)
            })
            .on("mouseout", function () {
                ToolTip.hide();
            });
    }

    function pinDragStart(timelineId, warpBinding) {
        if (mActive) {
            mDraggingBinding = warpBinding;
            pinDrag(timelineId, warpBinding.linePercent);
        }
    }

    function pinDrag(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) throw new Error("Bad state! Binding not set!")

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let binding = new DataStructs.WarpBindingData(
                mDraggingBinding.timelineId,
                mDraggingBinding.warpBindingId,
                mDraggingBinding.tableId,
                mDraggingBinding.rowId,
                mDraggingBinding.timeCell,
                linePercent,
            );
            binding.linePercent = linePercent;
            let validBindings = WarpBindingUtil.filterValidWarpBindingIds(mBindings.filter(b => b.timelineId == timelineId), binding);
            let tempBindings = mBindings.filter(b =>
                b.warpBindingId != binding.warpBindingId &&
                validBindings.includes(b.warpBindingId))
            tempBindings.push(binding);

            let linePoints = mLinePoints[timelineId];

            drawTicks(timelineId, linePoints, tempBindings);
        }
    }

    function pinDragEnd(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) throw new Error("Bad state! Binding not set!")

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let binding = new DataStructs.WarpBindingData(
                mDraggingBinding.timelineId,
                mDraggingBinding.warpBindingId,
                mDraggingBinding.tableId,
                mDraggingBinding.rowId,
                mDraggingBinding.timeCell,
                linePercent,
            );

            mUpdateWarpBindingCallback(timelineId, binding);

            mDraggingBinding = null;
        }
    }

    function constrainValue(x) {
        // constrains the value between 1 and 3
        return 3 / (Math.exp(1 - x) + 1);
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mControlTickTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mControlTickTargetGroup.style('visibility', "hidden");
        }
    };

    this.addOrUpdateTimeControls = addOrUpdateTimeControls;
    this.removeTimeControls = removeTimeControls;
    this.setUpdateWarpBindingCallback = (callback) => mUpdateWarpBindingCallback = callback;

    this.pinDragStart = pinDragStart;
    this.pinDrag = pinDrag;
    this.pinDragEnd = pinDragEnd;
}


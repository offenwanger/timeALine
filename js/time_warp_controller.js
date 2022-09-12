function TimeWarpController(svg) {
    const WARP_TICK_WIDTH = 3;
    const WARP_TICK_LENGTH = 8
    const WARP_TICK_TARGET_SIZE = 10;

    let mActive = false;

    let mLinePoints = {};
    let mBindings = []

    let mDragging = false;
    let mDraggingBinding = null;

    let mUpdateWarpBindingCallback = () => { };

    let mTailGroup = svg.append('g')
        .attr("id", 'tick-tail-g');
    let mWarpTickGroup = svg.append('g')
        .attr("id", 'tick-g');

    let mWarpTickTargetGroup = svg.append('g')
        .attr("id", 'tick-target-g')
        .style('visibility', "hidden")

    // put this on document to capture releases outside the window
    document.addEventListener("pointerup", function (event) {
        if (mActive && mDragging) {
            mDragging = false;

            let dragPoint = { x: event.x, y: event.y };
            let linePercent = PathMath.getClosestPointOnPath(dragPoint, mLinePoints[mDraggingBinding.timelineId]).percent;
            pinDragEnd(mDraggingBinding.timelineId, linePercent);
        }
    });


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
            mWarpTickGroup.selectAll('.warpTick_' + id).remove();
            mWarpTickTargetGroup.selectAll('.warpTickTarget_' + id).remove();
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

            let boundTickData = {
                position,
                degrees,
                binding,
                color: binding.color ? binding.color : DataTypesColor[binding.timeCell.getType()],
            };
            tickData.push(boundTickData);
            tickTargetData.push(boundTickData);
        });

        let ticks = mWarpTickGroup.selectAll('.warpTick_' + timelineId).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('warpTick_' + timelineId, true);
        mWarpTickGroup.selectAll('.warpTick_' + timelineId)
            .style("stroke", (d) => d.color)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", (d) => WARP_TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + WARP_TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - WARP_TICK_LENGTH / 2);

        let targets = mWarpTickTargetGroup.selectAll('.warpTickTarget_' + timelineId).data(tickTargetData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('warpTickTarget_' + timelineId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')

        mWarpTickTargetGroup.selectAll('.warpTickTarget_' + timelineId)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", WARP_TICK_TARGET_SIZE + WARP_TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + WARP_TICK_TARGET_SIZE + WARP_TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - WARP_TICK_TARGET_SIZE + WARP_TICK_LENGTH / 2);
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
        let targets = mWarpTickTargetGroup.selectAll('.warpTickTarget_' + timelineId);

        targets
            .on('pointerdown', (event, d) => {
                if (mActive) {
                    mDragging = true;
                    pinDragStart(d.binding.timelineId, d.binding);
                }
            })
            .on('pointermove', (event, d) => {
                if (mActive && mDragging) {
                    let dragPoint = { x: event.x, y: event.y };
                    let linePercent = PathMath.getClosestPointOnPath(dragPoint, mLinePoints[d.binding.timelineId]).percent;
                    pinDrag(d.binding.timelineId, linePercent);
                }
            })
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

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mWarpTickTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mWarpTickTargetGroup.style('visibility', "hidden");
        }
    };

    this.addOrUpdateTimeControls = addOrUpdateTimeControls;
    this.removeTimeControls = removeTimeControls;
    this.setUpdateWarpBindingCallback = (callback) => mUpdateWarpBindingCallback = callback;

    this.pinDragStart = pinDragStart;
    this.pinDrag = pinDrag;
    this.pinDragEnd = pinDragEnd;
}


function TimeWarpController(vizLayer, overlayLayer, interactionLayer) {
    const WARP_TICK_WIDTH = 6;
    const WARP_TICK_LENGTH = 10
    const WARP_TICK_TARGET_SIZE = 10;

    let mActive = false;

    let mLinePoints = {};
    let mBindings = {};

    let mDragging = false;
    let mDraggingBinding = null;
    let mDraggingTimeline = null;

    let mUpdateWarpBindingCallback = () => { };

    let mTailGroup = vizLayer.append('g')
        .attr("id", 'tick-tail-g');
    let mWarpTickGroup = vizLayer.append('g')
        .attr("id", 'tick-g');

    let mWarpTickTargetGroup = interactionLayer.append('g')
        .attr("id", 'tick-target-g')
        .style('visibility', "hidden")

    function updateModel(model) {
        mLinePoints = {};
        mBindings = {};

        mTailGroup.selectAll('*').remove();
        mWarpTickGroup.selectAll('*').remove();
        mWarpTickTargetGroup.selectAll('*').remove();

        model.getAllTimelines().forEach(timeline => {
            mLinePoints[timeline.id] = timeline.points;
            mBindings[timeline.id] = timeline.warpBindings;
            drawTails(timeline.id, timeline.points);
            drawWarpTicks(timeline.id, timeline.points, timeline.warpBindings);
        });
    }

    function drawWarpTicks(timelineId, linePoints, warpBindings) {
        warpBindings.sort((a, b) => a.linePercent - b.linePercent)

        let path = PathMath.getPath(linePoints);
        let totalLength = path.getTotalLength();

        let tickData = [];
        let tickTargetData = [];

        warpBindings.forEach(binding => {
            let position = path.getPointAtLength(totalLength * binding.linePercent);

            let degrees;
            if (binding.linePercent > 0) {
                let positionBefore = path.getPointAtLength(totalLength * binding.linePercent - 1);
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
            } else {
                let positionAfter = path.getPointAtLength(totalLength * binding.linePercent + 1);
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(position, positionAfter)) - 90;
            }

            tickData.push({ position, degrees, binding });
            tickTargetData.push({ position, degrees, binding });
        });

        let ticks = mWarpTickGroup.selectAll('.warpTick_' + timelineId).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('warpTick_' + timelineId, true);
        mWarpTickGroup.selectAll('.warpTick_' + timelineId)
            .style("stroke", "black")
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
            .on('pointerdown', (event, d) => {
                if (mActive) {
                    mDragging = true;
                    let bindingData = Object.entries(mBindings).find(([timelineId, warpBindings]) => warpBindings.some(wb => wb.id == d.binding.id))
                    if (!bindingData) { console.error("Bad state! Timeline not found for binding!", d.binding); return; }
                    pinDragStart(bindingData[0], d.binding);
                }
            })
            .on("mouseover", (event, d) => {
                if (d.timeStamp) {
                    ToolTip.show(new Date(d.binding.timestamp), d.position)
                } else {
                    ToolTip.show(Math.round(d.binding.linePercent * 100) + "%", d.position)
                }
            })
            .on("mouseout", function () {
                ToolTip.hide();
            });

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


    function onPointerMove(coords) {
        if (mActive && mDragging) {
            let linePercent = PathMath.getClosestPointOnPath(coords, mLinePoints[mDraggingTimeline]).percent;
            pinDrag(mDraggingTimeline, linePercent);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            mDragging = false;

            let linePercent = PathMath.getClosestPointOnPath(coords, mLinePoints[mDraggingTimeline]).percent;
            pinDragEnd(mDraggingTimeline, linePercent);

            mDraggingTimeline = null;
        }
    }

    function pinDragStart(timelineId, warpBinding) {
        if (mActive) {
            mDraggingBinding = warpBinding;
            mDraggingTimeline = timelineId;
            pinDrag(timelineId, warpBinding.linePercent);
        }
    }

    function pinDrag(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) { console.error("Bad state! Binding not set!"); return; }

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let binding = mDraggingBinding.copy();
            binding.linePercent = linePercent;

            let tempBindings = mBindings[timelineId].filter(wb =>
                // clear the binding out of the array so we can readd the new data
                wb.id != binding.id && (
                    !wb.timeStamp ||
                    // otherwise make sure time and bindings both increase in the same direction
                    (wb.timeStamp < binding.timeStamp && wb.linePercent < binding.linePercent) ||
                    (wb.timeStamp > binding.timeStamp && wb.linePercent > binding.linePercent)));
            tempBindings.push(binding);

            let linePoints = mLinePoints[timelineId];

            // TODO: It would be more efficient to just hide the temp deleted bindings. 
            drawWarpTicks(timelineId, linePoints, tempBindings);
        }
    }

    function pinDragEnd(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) throw new Error("Bad state! Binding not set!")

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let binding = mDraggingBinding.copy();
            binding.linePercent = linePercent;

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

    this.updateModel = updateModel;

    this.setUpdateWarpBindingCallback = (callback) => mUpdateWarpBindingCallback = callback;

    this.pinDragStart = pinDragStart;
    this.pinDrag = pinDrag;
    this.pinDragEnd = pinDragEnd;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}


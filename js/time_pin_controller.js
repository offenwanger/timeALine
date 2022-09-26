function TimePinController(vizLayer, overlayLayer, interactionLayer) {
    const PIN_TICK_WIDTH = 6;
    const PIN_TICK_LENGTH = 10
    const PIN_TICK_TARGET_SIZE = 10;

    let mActive = false;

    let mLinePoints = {};
    let mBindings = {};

    let mDragging = false;
    let mDraggingBinding = null;
    let mDraggingTimeline = null;

    let mUpdatePinBindingCallback = () => { };
    let mMouseOverCallback = () => { };
    let mMouseOutCallback = () => { };

    let mTailGroup = vizLayer.append('g')
        .attr("id", 'tick-tail-g');
    let mPinTickGroup = vizLayer.append('g')
        .attr("id", 'tick-g');

    let mPinTickTargetGroup = interactionLayer.append('g')
        .attr("id", 'tick-target-g')

    function updateModel(model) {
        mLinePoints = {};
        mBindings = {};

        mTailGroup.selectAll('*').remove();
        mPinTickGroup.selectAll('*').remove();
        mPinTickTargetGroup.selectAll('*').remove();

        model.getAllTimelines().forEach(timeline => {
            mLinePoints[timeline.id] = timeline.points;
            mBindings[timeline.id] = timeline.timePins;
            drawTails(timeline.id, timeline.points);
            drawPinTicks(timeline.id, timeline.points, timeline.timePins);
        });
    }

    function drawPinTicks(timelineId, linePoints, timePins) {
        timePins.sort((a, b) => a.linePercent - b.linePercent)

        let path = PathMath.getPath(linePoints);
        let totalLength = path.getTotalLength();

        let tickData = [];
        let tickTargetData = [];

        timePins.forEach(binding => {
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

        let ticks = mPinTickGroup.selectAll('.pinTick_' + timelineId).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('pinTick_' + timelineId, true);
        mPinTickGroup.selectAll('.pinTick_' + timelineId)
            .style("stroke", "black")
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", (d) => PIN_TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + PIN_TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - PIN_TICK_LENGTH / 2);

        let targets = mPinTickTargetGroup.selectAll('.pinTickTarget_' + timelineId)
            .data(tickTargetData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('pinTickTarget_' + timelineId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
            .on('pointerdown', (event, d) => {
                if (mActive) {
                    mDragging = true;
                    let bindingData = Object.entries(mBindings).find(([timelineId, timePins]) => timePins.some(pin => pin.id == d.binding.id))
                    if (!bindingData) { console.error("Bad state! Timeline not found for binding!", d.binding); return; }
                    pinDragStart(bindingData[0], d.binding);
                }
            })
            .on("mouseover", (event, d) => {
                mMouseOverCallback(event, d.binding);
            })
            .on("mouseout", function (event, d) {
                mMouseOutCallback(event, d.binding);
            })

        mPinTickTargetGroup.selectAll('.pinTickTarget_' + timelineId)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", PIN_TICK_TARGET_SIZE + PIN_TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + PIN_TICK_TARGET_SIZE + PIN_TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - PIN_TICK_TARGET_SIZE + PIN_TICK_LENGTH / 2);
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

    function pinDragStart(timelineId, timePin) {
        if (mActive) {
            mDraggingBinding = timePin;
            mDraggingTimeline = timelineId;
            pinDrag(timelineId, timePin.linePercent);
        }
    }

    function pinDrag(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) { console.error("Bad state! Binding not set!"); return; }

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let changedPin = mDraggingBinding.copy();
            changedPin.linePercent = linePercent;

            let tempBindings = DataUtil.filterTimePinByChangedPin(mBindings[timelineId], changedPin);

            let linePoints = mLinePoints[timelineId];

            // TODO: It would be more efficient to just hide the temp deleted bindings. 
            drawPinTicks(timelineId, linePoints, tempBindings);
        }
    }

    function pinDragEnd(timelineId, linePercent) {
        if (mActive) {
            if (!mDraggingBinding) throw new Error("Bad state! Binding not set!")

            if (linePercent < 0) linePercent = 0;
            if (linePercent > 1) linePercent = 1;

            let binding = mDraggingBinding.copy();
            binding.linePercent = linePercent;

            mUpdatePinBindingCallback(timelineId, binding);

            mDraggingBinding = null;
        }
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
        } else if (!active && mActive) {
            mActive = false;
        }
    };

    this.updateModel = updateModel;

    this.setUpdateTimePinCallback = (callback) => mUpdatePinBindingCallback = callback;
    this.setMouseOverCallback = (callback) => mMouseOverCallback = callback;
    this.setMouseOutCallback = (callback) => mMouseOutCallback = callback;

    this.pinDragStart = pinDragStart;
    this.pinDrag = pinDrag;
    this.pinDragEnd = pinDragEnd;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}


function TimePinController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mLinePoints = {};
    let mBindings = {};

    let mDragging = false;
    let mDraggingBinding = null;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };

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
            drawPinTicks(timeline, timeline.timePins);
        });
    }

    function drawPinTicks(timeline, timePins) {
        timePins.sort((a, b) => a.linePercent - b.linePercent)

        let tickData = [];
        let tickTargetData = [];

        timePins.forEach(binding => {
            let position = PathMath.getPositionForPercent(timeline.points, binding.linePercent);

            let positionBefore = PathMath.getNormalForPercent(timeline.points, binding.linePercent - 1);
            let degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;


            tickData.push({ position, degrees, binding });
            tickTargetData.push({ position, degrees, binding });
        });


        const pinTickWidth = 6;
        const pinTickLength = 10
        const pinTickTargetPadding = 10;

        let ticks = mPinTickGroup.selectAll('.pinTick_' + timeline.id).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('pinTick_' + timeline.id, true);
        mPinTickGroup.selectAll('.pinTick_' + timeline.id)
            .style("stroke", "black")
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", (d) => pinTickWidth)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + pinTickLength / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - pinTickLength / 2);

        let targets = mPinTickTargetGroup.selectAll('.pinTickTarget_' + timeline.id)
            .data(tickTargetData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('pinTickTarget_' + timeline.id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
            .on('pointerdown', (event, d) => {
                if (mActive) {
                    mDragging = true;
                    mDraggingBinding = d.binding;
                    mDragStartCallback(event, d.binding);
                }
            })
            .on("pointerenter", (event, d) => {
                mPointerEnterCallback(event, d.binding);
            })
            .on("pointerout", function (event, d) {
                mPointerOutCallback(event, d.binding);
            })

        mPinTickTargetGroup.selectAll('.pinTickTarget_' + timeline.id)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", pinTickTargetPadding + pinTickWidth)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + pinTickTargetPadding + pinTickLength / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - pinTickTargetPadding + pinTickLength / 2);
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
            mDragCallback(coords, mDraggingBinding);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging) {
            mDragging = false;
            mDragEndCallback(coords, mDraggingBinding);

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
    this.drawPinTicks = drawPinTicks;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}


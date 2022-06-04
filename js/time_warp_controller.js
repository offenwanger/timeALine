function TimeWarpController(svg, getUpdatedWarpSet, getTimeForLinePercent) {
    const TAIL_LENGTH = 50;
    const TICK_WIDTH = 3;
    const TICK_LENGTH = 8
    const TICK_TARGET_SIZE = 10;
    const MIN_TICK_SPACING = 30;

    let mExernalCallGetUpdatedWarpSet = getUpdatedWarpSet;
    let mExernalCallGetTimeForLinePercent = getTimeForLinePercent;
    let mWarpControlsModifiedCallback = () => { };

    let mTailGroup = svg.append('g');
    let mControlTickGroup = svg.append('g');

    let mControlTickTargetGroup = svg.append('g');

    function addOrUpdateTimeControls(timelines) {
        timelines.forEach(timeline => {
            drawTails(timeline.id, timeline.linePath.points);
            drawTicks(timeline.id, timeline.warpPoints.map(point => point.clone()), timeline.linePath.points);
            setTickHandlers(timeline.id, timeline.linePath.points);
        });
    }

    function drawTicks(id, warpPoints, points) {
        let path = PathMath.getPath(points);
        let totalLength = path.getTotalLength();
        let totalTime = TimeWarpUtil.timeBetweenAandB(warpPoints[warpPoints.length - 1], warpPoints[0]);
        let tickData = []

        // Add warp point data
        warpPoints.forEach((warpPoint, index) => {
            let position;
            let degrees;
            let size;
            if (warpPoint.isStart) {
                position = points[0]
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(points[0], points[1])) - 90;
                size = getTimeRatio(warpPoint, warpPoints[index + 1], totalTime)
            } else if (warpPoint.isEnd) {
                position = points[points.length - 1]
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(points[points.length - 1], points[points.length - 2])) + 90;
                size = getTimeRatio(warpPoint, warpPoints[index - 1], totalTime)
            } else {
                position = path.getPointAtLength(totalLength * warpPoint.linePercent);
                let positionBefore = path.getPointAtLength(totalLength * warpPoint.linePercent - 1);
                degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
                size = (getTimeRatio(warpPoint, warpPoints[index - 1], totalTime) + getTimeRatio(warpPoint, warpPoints[index + 1], totalTime)) / 2
            }

            tickData.push({ position, size: constrainValue(size), degrees, warpPoint, color: 'steelblue' })

            // Add tick data
            if (!warpPoint.isEnd) {
                let warpPointAfter = warpPoints[index + 1];
                let segmentLength = (warpPointAfter.linePercent - warpPoint.linePercent) * totalLength;
                let tickCount = Math.floor((segmentLength - MIN_TICK_SPACING) / MIN_TICK_SPACING);
                if (tickCount > 0) {
                    let startLength = warpPoint.linePercent * totalLength;
                    let tickDist = segmentLength / (tickCount + 1)
                    let ticks = Array.from(Array(tickCount).keys())
                        .map(val => ((val + 1) * tickDist) + startLength)
                        .map(dist => {
                            let position = path.getPointAtLength(dist);
                            let positionBefore = path.getPointAtLength(dist - 1);
                            let degrees = MathUtil.vectorToRotation(MathUtil.vectorFromAToB(positionBefore, position)) - 90;
                            let size = getTimeRatio(warpPoint, warpPointAfter, totalTime);
                            let tickWarpPoint = new DataStructs.WarpPoint(mExernalCallGetTimeForLinePercent(id, dist / totalLength), dist / totalLength);
                            return { position, size: constrainValue(size), degrees, warpPoint: tickWarpPoint, color: 'black' };
                        })
                    tickData.push(...ticks);
                }
            }
        });

        let tailTickData = [{
            tailPos: TAIL_LENGTH,
            tailDirection: MathUtil.vectorFromAToB(points[1], points[0]),
            tailStart: points[0],
            length: -1 * TAIL_LENGTH / totalLength
        }, {
            tailPos: TAIL_LENGTH / 2,
            tailDirection: MathUtil.vectorFromAToB(points[1], points[0]),
            tailStart: points[0],
            length: -1 * (TAIL_LENGTH / 2) / totalLength
        }, {
            tailPos: TAIL_LENGTH,
            tailDirection: MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1]),
            tailStart: points[points.length - 1],
            length: (TAIL_LENGTH + totalLength) / totalLength
        }, {
            tailPos: TAIL_LENGTH / 2,
            tailDirection: MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1]),
            tailStart: points[points.length - 1],
            length: (TAIL_LENGTH / 2 + totalLength) / totalLength
        }];
        tailTickData.forEach(ttd => {
            tickData.push({
                position: MathUtil.getPointAtDistanceAlongVector(ttd.tailPos, ttd.tailDirection, ttd.tailStart),
                size: 1,
                degrees: MathUtil.vectorToRotation(ttd.tailDirection) + 90,
                warpPoint: new DataStructs.WarpPoint(mExernalCallGetTimeForLinePercent(id, ttd.length), ttd.length),
                color: 'grey'
            })
        })

        let ticks = mControlTickGroup.selectAll('.warpTick_' + id).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line').classed('warpTick_' + id, true);
        mControlTickGroup.selectAll('.warpTick_' + id)
            .style("stroke", (d) => d.color)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", (d) => d.size * TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + d.size * TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - d.size * TICK_LENGTH / 2);

        let targets = mControlTickTargetGroup.selectAll('.warpTickTarget_' + id).data(tickData);
        targets.exit().remove();
        targets.enter().append('line')
            .classed('warpTickTarget_' + id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')

        mControlTickTargetGroup.selectAll('.warpTickTarget_' + id)
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", TICK_TARGET_SIZE + TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + TICK_TARGET_SIZE + TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - TICK_TARGET_SIZE + TICK_LENGTH / 2);
    }

    function getTimeRatio(warpPointBefore, warpPointAfter, totalTime) {
        return (TimeWarpUtil.timeBetweenAandB(warpPointAfter, warpPointBefore) / totalTime) /
            Math.abs(warpPointAfter.linePercent - warpPointBefore.linePercent);
    }

    function drawTails(id, points) {
        let tail1 = mTailGroup.select('#timelineTail1_' + id).node()
            ? mTailGroup.select('#timelineTail1_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"));

        let tail2 = mTailGroup.select('#timelineTail2_' + id).node()
            ? mTailGroup.select('#timelineTail2_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'grey')
                .style("stroke-dasharray", ("5, 5"));

        let startPoint = points[0]
        let direction1 = MathUtil.vectorFromAToB(points[1], startPoint);
        let tail1End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction1, startPoint);
        tail1.attr('x1', startPoint.x)
            .attr('y1', startPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);

        let endPoint = points[points.length - 1]
        let direction2 = MathUtil.vectorFromAToB(points[points.length - 2], endPoint);
        let tail2End = MathUtil.getPointAtDistanceAlongVector(TAIL_LENGTH, direction2, endPoint);
        tail2.attr('x1', endPoint.x)
            .attr('y1', endPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
    }

    function setTickHandlers(timelineId, points) {
        let targets = mControlTickTargetGroup.selectAll('.warpTickTarget_' + timelineId);
        targets.on('mousedown.drag', null);
        targets.call(d3.drag()
            .on('start', (event, d) => { /** nothing for now */ })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let linePercent = mousePositionToLinePercent(dragPoint, points)

                if (linePercent <= 0) {
                    let warpPoint = d.warpPoint.clone()
                    warpPoint.linePercent = 0;
                    warpPoint.isStart = true;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, warpPoint);
                    drawTicks(timelineId, warpPoints, points);
                } else if (linePercent >= 1) {
                    let warpPoint = d.warpPoint.clone()
                    warpPoint.linePercent = 1;
                    warpPoint.isEnd = true;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, warpPoint);
                    drawTicks(timelineId, warpPoints, points);
                } else {
                    d.warpPoint.linePercent = linePercent;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, d.warpPoint);
                    drawTicks(timelineId, warpPoints, points);
                }
            })
            .on('end', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let linePercent = mousePositionToLinePercent(dragPoint, points)

                if (linePercent < 0) {
                    let warpPoint = d.warpPoint.clone()
                    warpPoint.linePercent = 0;
                    warpPoint.isStart = true;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, warpPoint);
                    mWarpControlsModifiedCallback(timelineId, warpPoints);
                } else if (linePercent > 1) {
                    let warpPoint = d.warpPoint.clone()
                    warpPoint.linePercent = 1;
                    warpPoint.isEnd = true;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, warpPoint);
                    mWarpControlsModifiedCallback(timelineId, warpPoints);
                } else {
                    d.warpPoint.linePercent = linePercent;
                    let warpPoints = mExernalCallGetUpdatedWarpSet(timelineId, d.warpPoint);
                    mWarpControlsModifiedCallback(timelineId, warpPoints);
                }
            }))
            .on("mouseover", (event, d) => {
                let div = $("#tooltip-div").css({
                    left: d.position.x + 10,
                    top: d.position.y + 10
                });
                div.show();
                let str;
                if (d.warpPoint.timeBinding.type == TimeBindingTypes.TIMESTRAMP) str = new Date(d.warpPoint.timeBinding.timestamp).toDateString()
                else if (d.warpPoint.timeBinding.type == TimeBindingTypes.PLACE_HOLDER) str = (d.warpPoint.timeBinding.placeHolder * 100).toFixed(0) + "%";
                else { console.error("Error, invalid type: " + d.warpPoint.timeBinding.type); str = "Error" }
                div.html(str);
            })
            .on("mouseout", function () {
                $("#tooltip-div").hide();
            });
    }

    function constrainValue(x) {
        // constrains the value between 1 and 3
        return 3 / (Math.exp(1 - x) + 1);
    }

    function mousePositionToLinePercent(mousePoint, points) {
        let pointOnPath = PathMath.getClosestPointOnPath(mousePoint, points);

        let percent = pointOnPath.percent;
        let distToPath = MathUtil.distanceFromAToB(mousePoint, pointOnPath)

        let pointOnTail1 = MathUtil.projectPointOntoVector(mousePoint, MathUtil.vectorFromAToB(points[1], points[0]), points[0]);
        if (!pointOnTail1.neg && MathUtil.distanceFromAToB(mousePoint, pointOnTail1) < distToPath) {
            percent = (-1 * MathUtil.distanceFromAToB(pointOnTail1, points[0])) / PathMath.getPath(points).getTotalLength();

            distToPath = MathUtil.distanceFromAToB(mousePoint, pointOnTail1);
        }

        let last = points.length - 1;
        let pointOnTail2 = MathUtil.projectPointOntoVector(mousePoint, MathUtil.vectorFromAToB(points[last - 1], points[last]), points[last]);
        if (!pointOnTail2.neg && MathUtil.distanceFromAToB(mousePoint, pointOnTail2) < distToPath) {
            let totalLength = PathMath.getPath(points).getTotalLength();

            percent = (MathUtil.distanceFromAToB(pointOnTail2, points[last]) + totalLength) / totalLength;
        }

        return percent
    }

    this.addOrUpdateTimeControls = addOrUpdateTimeControls;
    this.setWarpControlsModifiedCallback = (callback) => mWarpControlsModifiedCallback = callback;
}


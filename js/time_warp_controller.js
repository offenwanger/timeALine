function TimeWarpController(svg) {
    const TAIL_LENGTH = 50;
    const TICK_WIDTH = 3;
    const TICK_LENGTH = 8
    const TICK_TARGET_SIZE = 3;
    const MIN_TICK_SPACING = 30;

    let mTailGroup = svg.append('g');
    let mControlTickGroup = svg.append('g');

    let mControlTickTargetGroup = svg.append('g');

    function addOrUpdateTimeControls(timelines) {
        timelines.forEach(timeline => {
            drawTails(timeline.id, timeline.linePath.points);
            drawTicks(timeline.id, timeline.warpPoints, timeline.linePath.points);
        });
    }

    function drawTicks(id, warpPoints, points) {
        let path = PathGenerator.getPath(points);
        let totalLength = path.getTotalLength();
        let totalTime = warpPoints[warpPoints.length - 1].timePoint - warpPoints[0].timePoint;
        let tickData = []
        warpPoints.forEach((warpPoint, index) => {
            let position;
            let degrees;
            let size;
            if (warpPoint.isStart) {
                position = points[0]
                degrees = PathMath.vectorToRotation(PathMath.vectorFromAToB(points[0], points[1])) - 90;
                size = getTimeRatio(warpPoint, warpPoints[index + 1], totalTime)
            } else if (warpPoint.isEnd) {
                position = points[points.length - 1]
                degrees = PathMath.vectorToRotation(PathMath.vectorFromAToB(points[points.length - 1], points[points.length - 2])) + 90;
                size = getTimeRatio(warpPoint, warpPoints[index - 1], totalTime)
            } else {
                position = path.getPointAtLength(totalLength * warpPoint.linePercent);
                let positionBefore = path.getPointAtLength(totalLength * warpPoint.linePercent - 1);
                degrees = PathMath.vectorToRotation(PathMath.vectorFromAToB(positionBefore, position)) - 90;
                size = (getTimeRatio(warpPoint, warpPoints[index - 1], totalTime) + getTimeRatio(warpPoint, warpPoints[index + 1], totalTime)) / 2
            }

            tickData.push({ position, size, degrees, color: 'steelblue' })

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
                            let degrees = PathMath.vectorToRotation(PathMath.vectorFromAToB(positionBefore, position)) - 90;
                            let size = getTimeRatio(warpPoint, warpPointAfter, totalTime);
                            return { position, size, degrees, color: 'black' };
                        })
                    tickData.push(...ticks);
                }
            }
        });

        let ticks = mControlTickGroup.selectAll('.warpTick_' + id).data(tickData);
        ticks.exit().remove();
        ticks.enter().append('line')
            .classed('.warpTick_' + id, true)
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
            .classed('.warpTickTarget_' + id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
            .attr('transform', (d) => "rotate(" + d.degrees + " " + d.position.x + " " + d.position.y + ")")
            .style("stroke-width", TICK_TARGET_SIZE * TICK_WIDTH)
            .attr("x1", (d) => d.position.x)
            .attr("y1", (d) => d.position.y + TICK_TARGET_SIZE * TICK_LENGTH / 2)
            .attr("x2", (d) => d.position.x)
            .attr("y2", (d) => d.position.y - TICK_TARGET_SIZE * TICK_LENGTH / 2);


    }

    function getTimeRatio(warpPointBefore, warpPointAfter, totalTime) {
        return ((warpPointAfter.timePoint - warpPointBefore.timePoint) / totalTime) /
            (warpPointAfter.linePercent - warpPointBefore.linePercent);
    }

    function drawTails(id, points) {
        let tail1 = mTailGroup.select('#timelineTail1_' + id).node()
            ? mTailGroup.select('#timelineTail1_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'black')
                .style('opacity', 0.5)
                .style("stroke-dasharray", ("5, 5"));

        let tail2 = mTailGroup.select('#timelineTail2_' + id).node()
            ? mTailGroup.select('#timelineTail2_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'black')
                .style('opacity', 0.5)
                .style("stroke-dasharray", ("5, 5"));

        let startPoint = points[0]
        let direction1 = PathMath.vectorFromAToB(points[1], startPoint);
        let tail1End = PathMath.getPointAtDistanceAlongVector(TAIL_LENGTH, direction1, startPoint);
        tail1.attr('x1', startPoint.x)
            .attr('y1', startPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);

        let endPoint = points[points.length - 1]
        let direction2 = PathMath.vectorFromAToB(points[points.length - 2], endPoint);
        let tail2End = PathMath.getPointAtDistanceAlongVector(TAIL_LENGTH, direction2, endPoint);
        tail2.attr('x1', endPoint.x)
            .attr('y1', endPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
    }

    this.addOrUpdateTimeControls = addOrUpdateTimeControls;
}


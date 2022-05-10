function TimeLineTicker(svg, id, startPoint, timePegs, endPoint, path) {
    let mId = id;
    let mPath = path;
    let mPathLength = path.node().getTotalLength();
    let mStartPoint = startPoint;
    let mTimePegs = timePegs;
    let mEndPoint = endPoint;

    let mTimeTickData = [];
    let mTimePegsUpdatedCallback = function (startPoint, timePegs, endPoint) { };

    const tickLength = 8;
    const tickWidth = 3;
    const minTickDist = 30;

    const tailLength = 70;

    let mAnnotationGroup = svg.append("g").lower();
    let mGroup = svg.append("g");

    let mTail1Normal;
    let mTail2Normal;
    let mTail1Direction;
    let mTail2Direction;

    /** TAILS */

    // when dragging tail tick, if tick in main line, update end point

    // in get length for time, check if time in is tails
    // return a 'is tail' value

    let tail1 = mGroup.append('line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'black')
        .style('opacity', 0.5)
        .style("stroke-dasharray", ("5, 5"))
        .lower();

    let tail2 = mGroup.append('line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'black')
        .style('opacity', 0.5)
        .style("stroke-dasharray", ("5, 5"))
        .lower();

    update(startPoint, timePegs, endPoint, path)

    /** Element management **/
    function update(startPoint, timePegs, endPoint, path, timeRangeMin = 0, timeRangeMax = 1) {
        mStartPoint = startPoint;
        mTimePegs = timePegs;
        mEndPoint = endPoint;
        mPath = path;
        mPathLength = path.node().getTotalLength();
        mRangeMin = timeRangeMin;
        mRangeMax = timeRangeMax

        let timeRangeData = getTimeRangeData(mStartPoint, mTimePegs, mEndPoint, mPathLength);

        let timePegData = createPegDataset(mTimePegs, timeRangeData);
        let pegs = mGroup.selectAll(".time-peg-" + mId).data(timePegData);
        pegs.exit().remove();
        pegs.enter().append("line")
            .classed("time-peg-" + mId, true)
            .style("stroke", "steelblue");

        let pegsTargets = mGroup.selectAll(".time-peg-target-" + mId).data(timePegData);
        pegsTargets.exit().remove();
        let newPegsTargets = pegsTargets.enter().append("line")
            .classed("time-peg-target-" + mId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setPegHandlers(newPegsTargets);

        mTimeTickData = resizeTicks(
            createTickDataset(timeRangeData.map(item => item.line))
                .map(len => {
                    let pos = mPath.node().getPointAtLength(len);
                    return {
                        lengthAlongLine: len,
                        size: 1,
                        x: pos.x,
                        y: pos.y
                    }
                }),
            timeRangeData);

        let ticks = mGroup.selectAll(".time-tick-" + mId).data(mTimeTickData);
        ticks.exit().remove();
        ticks.enter().append("line")
            .classed("time-tick-" + mId, true)
            .style("stroke", "black");

        let tickTargets = mGroup.selectAll(".time-tick-target-" + mId).data(mTimeTickData);
        tickTargets.exit().remove();
        let newtickTargets = tickTargets.enter().append("line")
            .classed("time-tick-target-" + mId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimeTickHandlers(newtickTargets);

        updateTails();

        draw();
        drawAnnotations(mStartPoint, mTimePegs, mEndPoint);
    }

    function updateTails() {
        mTail1Normal = PathMath.getNormalAtPercentOfPath(mPath, 0);
        mTail1Direction = PathMath.rotatePoint90DegreesClockwise(mTail1Normal);
        let tail1End = PathMath.getPointAtDistanceAlongNormal(tailLength, mTail1Direction, mStartPoint);
        tail1
            .attr('x1', mStartPoint.x)
            .attr('y1', mStartPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);
        updateTailTicks(mStartPoint, tail1End, mTail1Normal, 1);

        mTail2Normal = PathMath.getNormalAtPercentOfPath(mPath, 1);
        mTail2Direction = PathMath.rotatePoint90DegreesCounterClockwise(mTail2Normal);
        let tail2End = PathMath.getPointAtDistanceAlongNormal(tailLength, mTail2Direction, mEndPoint);
        tail2
            .attr('x1', mEndPoint.x)
            .attr('y1', mEndPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
        updateTailTicks(mEndPoint, tail2End, mTail2Normal, 2);
    }

    function updateTailTicks(start, end, normal, num) {
        let data = [.5, 1].map(percent => {
            let pos = PathMath.addPoints(start,
                PathMath.scalarMultiplyPoint(
                    PathMath.subtractPoints(end, start),
                    percent));
            return { percent, x: pos.x, y: pos.y };
        });

        mGroup.selectAll(".tail-" + num + "-tick-" + mId).remove();
        mGroup.selectAll(".tail-" + num + "-tick-" + mId)
            .data(data)
            .enter()
            .append("line")
            .classed("tail-" + num + "-tick-" + mId, true)
            .style("stroke", "black")
            .style("stroke-width", tickWidth)
            .style("opacity", 0.5)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(normal) + " " + d.x + " " + d.y + ")"
            })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - tickLength / 2 });

        mGroup.selectAll(".tail-" + num + "-tick-target-" + mId).remove();
        let tickTargets = mGroup.selectAll(".tail-" + num + "-tick-target-" + mId).data(data)
            .enter()
            .append("line")
            .classed("tail-" + num + "-tick-target-" + mId, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(normal) + " " + d.x + " " + d.y + ")"
            })
            .style("stroke-width", tickWidth)
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - tickLength / 2 });

        setTailTickHandlers(tickTargets, num)
    }

    function draw() {
        mGroup.selectAll(".time-tick-" + mId)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(mPath, d.lengthAlongLine / mPathLength)) + " " + d.x + " " + d.y + ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 });


        mGroup.selectAll(".time-tick-target-" + mId)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(mPath, d.lengthAlongLine / mPathLength)) + " " + d.x + " " + d.y + ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 + 5 });

        mGroup.selectAll(".time-peg-" + mId)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(mPath, d.lengthAlongLine / mPathLength)) + " " + d.x + " " + d.y + ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 });

        mGroup.selectAll(".time-peg-target-" + mId)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(mPath, d.lengthAlongLine / mPathLength)) + " " + d.x + " " + d.y + ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 + 5 });
    }

    /** Input Handlers **/

    function setPegHandlers(pegs) {
        let otherPegs;
        let draggedPeg;
        let nextPeg;
        let previousPeg;
        pegs.call(d3.drag()
            .on('start', (event, d) => {
                draggedPeg = mTimePegs[d.index];
                otherPegs = mTimePegs.filter(p => p != draggedPeg);
                nextPeg = d.index < mTimePegs.length - 1 ?
                    mTimePegs[d.index + 1] : {
                        lengthAlongLine: mPathLength,
                        boundTimepoint: mEndPoint.boundTimepoint
                    };
                previousPeg = d.index > 0 ?
                    mTimePegs[d.index - 1] : {
                        lengthAlongLine: 0,
                        boundTimepoint: mStartPoint.boundTimepoint
                    };
            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };

                let result = getPegsAfterDrag(dragPoint, draggedPeg, nextPeg, previousPeg, mStartPoint, otherPegs, mEndPoint);

                drawTempData(result.startPoint, result.timePegs, result.endPoint);
                drawAnnotations(result.startPoint, result.timePegs, result.endPoint);
            })
            .on('end', (event) => {
                let dragPoint = { x: event.x, y: event.y };

                let result = getPegsAfterDrag(dragPoint, draggedPeg, nextPeg, previousPeg, mStartPoint, otherPegs, mEndPoint);

                mTimePegsUpdatedCallback(result.startPoint, result.timePegs, result.endPoint);
            }))
    }


    function setTimeTickHandlers(ticks) {
        let newPeg;
        let previousPeg;
        let nextPeg;
        ticks.call(d3.drag()
            .on('start', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);
                let rangeData = getTimeRangeData(mStartPoint, mTimePegs, mEndPoint, mPathLength);

                let boundTimepoint = getTimeForLength(p.length, rangeData);

                newPeg = new DataStructures.TimePeg(p.length, boundTimepoint);

                if (mTimePegs.length == 0) {
                    nextPeg = { lengthAlongLine: mPathLength, boundTimepoint: mEndPoint.boundTimepoint }
                    previousPeg = { lengthAlongLine: 0, boundTimepoint: mStartPoint.boundTimepoint }
                } else {
                    let i = 0;
                    for (i; i < mTimePegs.length; i++) {
                        if (mTimePegs[i].lengthAlongLine > newPeg.lengthAlongLine) {
                            previousPeg = i == 0 ? { lengthAlongLine: 0, boundTimepoint: mStartPoint.boundTimepoint } : mTimePegs[i - 1]
                            nextPeg = mTimePegs[i]
                            break;
                        }
                    }
                    if (i == mTimePegs.length) {
                        previousPeg = mTimePegs[i - 1]
                        nextPeg = { lengthAlongLine: mPathLength, boundTimepoint: mEndPoint.boundTimepoint }
                    }
                }
            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };

                let result = getPegsAfterDrag(dragPoint, newPeg, nextPeg, previousPeg, mStartPoint, mTimePegs, mEndPoint);

                drawTempData(result.startPoint, result.timePegs, result.endPoint);
                drawAnnotations(result.startPoint, result.timePegs, result.endPoint);
            })
            .on('end', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);

                let result = getPegsAfterDrag(dragPoint, newPeg, nextPeg, previousPeg, mStartPoint, mTimePegs, mEndPoint);

                mTimePegsUpdatedCallback(result.startPoint, result.timePegs, result.endPoint);
            }))
    }

    function getPegsAfterDrag(mousePoint, draggedPeg, nextPeg, previousPeg, startPoint, otherPegs, endPoint) {
        let projection = mousePositionToTimeline(mousePoint);

        if (projection.tail == 1) {
            let lineLen = nextPeg.lengthAlongLine;
            let tailLen = projection.length;

            let startPointPercent = tailLen / (lineLen + tailLen);
            let timeDiff = nextPeg.boundTimepoint - draggedPeg.boundTimepoint;
            let newStartPointTime = timeDiff * startPointPercent + draggedPeg.boundTimepoint;

            // copy startpoint to avoid modification
            startPoint = Object.assign({}, startPoint);
            startPoint.boundTimepoint = newStartPointTime;

            let timePegs = otherPegs.filter(peg => peg.boundTimepoint > newStartPointTime);

            return { startPoint, timePegs, endPoint };

        } else if (projection.tail == 2) {
            let lineLen = mPathLength - previousPeg.lengthAlongLine;
            let tailLen = projection.length;

            let endPointPercent = lineLen / (lineLen + tailLen);
            let timeDiff = draggedPeg.boundTimepoint - previousPeg.boundTimepoint;
            let newEndPointTime = timeDiff * endPointPercent + previousPeg.boundTimepoint;

            // copy endpoint to avoid modification
            endPoint = Object.assign({}, endPoint);
            endPoint.boundTimepoint = newEndPointTime;

            let timePegs = otherPegs.filter(peg => peg.boundTimepoint < newEndPointTime);

            return { startPoint, timePegs, endPoint };
        } else {
            draggedPeg.lengthAlongLine = projection.length;
            let timePegs = addTimePegToSet(otherPegs, draggedPeg);
            return { startPoint, timePegs, endPoint };
        }
    }

    function setTailTickHandlers(ticks, tail) {
        let boundTimepoint;
        let fakePeg;
        ticks.call(d3.drag()
            .on('start', (event, d) => {
                boundTimepoint = getTimeForTailPercent(d.percent, tail);
                console.log(d.percent, tail, boundTimepoint)
                fakePeg = { boundTimepoint: getTimeForTailPercent(d.percent * 2, tail), tailLen: d.percent * tailLength };
            })
            .on('drag', (event, d) => {
                let mousePoint = { x: event.x, y: event.y };

                let { startPoint, timePegs, endPoint } = getPegsAfterTailDrag(mousePoint, tail, boundTimepoint, fakePeg)

                drawTempData(startPoint, timePegs, endPoint);
                drawAnnotations(startPoint, timePegs, endPoint);
            })
            .on('end', (event) => {
                let mousePoint = { x: event.x, y: event.y };
                let { startPoint, timePegs, endPoint } = getPegsAfterTailDrag(mousePoint, tail, boundTimepoint, fakePeg)

                mTimePegsUpdatedCallback(startPoint, timePegs, endPoint);
            }))
    }

    function getPegsAfterTailDrag(mousePoint, tail, boundTimepoint, fakePeg) {
        // {position, length, tail}
        let projection = mousePositionToTimeline(mousePoint);
        if (tail == 1) {
            if (projection.tail == 1) {
                let nextPeg = mTimePegs.length > 0 ? mTimePegs[0] : { lengthAlongLine: mPathLength, boundTimepoint: mEndPoint.boundTimepoint };
                let lineLen = nextPeg.lengthAlongLine;
                let tailLen = projection.length;

                let startPointPercent = tailLen / (lineLen + tailLen);
                let timeDiff = nextPeg.boundTimepoint - boundTimepoint;
                let newStartPointTime = timeDiff * startPointPercent + boundTimepoint;

                let startPoint = Object.assign({}, mStartPoint);
                startPoint.boundTimepoint = newStartPointTime;

                return { startPoint, timePegs: mTimePegs, endPoint: mEndPoint };
            } else if (projection.tail == 2) {
                let lineLen = projection.length + mPathLength + fakePeg.tailLen;
                let timeLen = boundTimepoint - fakePeg.boundTimepoint;

                let startPoint = Object.assign({}, mStartPoint);
                startPoint.boundTimepoint = (timeLen * fakePeg.tailLen / lineLen) + fakePeg.boundTimepoint;
                let endPoint = Object.assign({}, mEndPoint);
                endPoint.boundTimepoint = (timeLen * (fakePeg.tailLen + mPathLength) / lineLen) + fakePeg.boundTimepoint;
                let timePegs = [];

                return { startPoint, timePegs, endPoint };
            } else {
                let lineLen = projection.length + fakePeg.tailLen;
                let timeLen = boundTimepoint - fakePeg.boundTimepoint;

                let startPoint = Object.assign({}, mStartPoint);
                startPoint.boundTimepoint = (timeLen * fakePeg.tailLen / lineLen) + fakePeg.boundTimepoint;
                let timePegs = addTimePegToSet(mTimePegs, new DataStructures.TimePeg(projection.length, boundTimepoint));

                return { startPoint, timePegs, endPoint: mEndPoint };
            }
        } else if (tail == 2) {
            if (projection.tail == 1) {
                let lineLen = projection.length + mPathLength + fakePeg.tailLen;
                let timeLen = fakePeg.boundTimepoint - boundTimepoint;

                let startPoint = Object.assign({}, mStartPoint);
                startPoint.boundTimepoint = (timeLen * projection.length / lineLen) + boundTimepoint;
                let endPoint = Object.assign({}, mEndPoint);
                endPoint.boundTimepoint = (timeLen * (fakePeg.tailLen + mPathLength) / lineLen) + boundTimepoint;
                let timePegs = [];

                return { startPoint, timePegs, endPoint };

            } else if (projection.tail == 2) {
                let previousPeg = mTimePegs.length > 0 ? mTimePegs[mTimePegs.length - 1] : { lengthAlongLine: 0, boundTimepoint: mStartPoint.boundTimepoint };
                let lineLen = mPathLength - previousPeg.lengthAlongLine;
                let tailLen = projection.length;

                let endPointPercent = lineLen / (lineLen + tailLen);
                let timeDiff = boundTimepoint - previousPeg.boundTimepoint;
                let newEndPointTime = timeDiff * endPointPercent + previousPeg.boundTimepoint;

                let endPoint = Object.assign({}, mEndPoint);
                endPoint.boundTimepoint = newEndPointTime;

                return { startPoint: mStartPoint, timePegs: mTimePegs, endPoint };
            } else {
                let lineLen = (mPathLength - projection.length) + fakePeg.tailLen;
                let timeLen = fakePeg.boundTimepoint - boundTimepoint;

                let endPoint = Object.assign({}, mEndPoint);
                endPoint.boundTimepoint = (timeLen * (mPathLength - projection.length) / lineLen) + boundTimepoint;
                let timePegs = addTimePegToSet(mTimePegs, new DataStructures.TimePeg(projection.length, boundTimepoint));

                return { startPoint: mStartPoint, timePegs, endPoint };
            }
        } else throw new Error("Invalid tail: " + tail);
    }

    function mousePositionToTimeline(mousePoint) {
        let p = PathMath.getClosestPointOnPath(mPath, mousePoint);
        let distToPath = PathMath.distancebetween(p, mousePoint)

        let projection = PathMath.projectPointOntoNormal(mousePoint, mTail1Direction, mStartPoint);
        let length = PathMath.distancebetween(projection.point, mStartPoint);
        if (!projection.neg && length < distToPath) {
            return {
                position: projection.point,
                length,
                tail: 1,
            }
        }

        projection = PathMath.projectPointOntoNormal(mousePoint, mTail2Direction, mEndPoint);
        length = PathMath.distancebetween(projection.point, mEndPoint);
        if (!projection.neg && length < distToPath) {
            return {
                position: projection.point,
                length,
                tail: 2,
            }
        }

        return {
            position: p,
            length: p.length,
            tail: 0
        }
    }

    function drawTempData(startPoint, pegs, endPoint) {
        let timeRangeData = getTimeRangeData(startPoint, pegs, endPoint);
        let pegData = createPegDataset(pegs, timeRangeData);
        let pegsElements = mGroup.selectAll(".time-peg-" + mId).data(pegData);

        pegsElements.exit().remove();
        pegsElements.enter().append("line")
            .classed("time-peg-" + mId, true)
            .style("stroke", "black");

        let tickData = resizeTicks(mTimeTickData, timeRangeData);
        mGroup.selectAll(".time-tick-" + mId).data(tickData);

        draw();
    }

    /** Data manipulation **/

    function createPegDataset(timePegs, rangeData) {
        let returnable = []
        for (let i = 0; i < timePegs.length; i++) {
            let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

            let ratioBefore =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                ((rangeData[i + 1].line - rangeData[i].line) / mPathLength);
            let ratioAfter =
                ((rangeData[i + 2].time - rangeData[i + 1].time) / totalTimeChange) /
                ((rangeData[i + 2].line - rangeData[i + 1].line) / mPathLength);

            let pos = mPath.node().getPointAtLength(timePegs[i].lengthAlongLine);

            returnable.push({
                lengthAlongLine: timePegs[i].lengthAlongLine,
                size: sigmoid((ratioBefore + ratioAfter) / 2),
                index: i,
                x: pos.x,
                y: pos.y
            })
        }

        return returnable;
    }

    function createTickDataset(pegsLinePositions) {
        let returnable = []

        for (let i = 0; i < pegsLinePositions.length - 1; i++) {
            let chunkLen = pegsLinePositions[i + 1] - pegsLinePositions[i];
            // TODO: Handle this edge case
            if (chunkLen == 0) chunkLen = 0.00001;

            let tickCount = Math.floor((chunkLen - minTickDist) / minTickDist);
            let tickDist = chunkLen / (tickCount + 1)

            if (tickCount > 0) {
                returnable.push(...Array.from(Array(tickCount).keys()).map(val => ((val + 1) * tickDist) + pegsLinePositions[i]));
            }
        }

        return returnable;
    }

    function resizeTicks(ticks, rangeData) {
        let returnable = [];

        let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

        for (let i = 0; i < rangeData.length - 1; i++) {
            let chunkLen = rangeData[i + 1].line - rangeData[i].line;
            // TODO: Handle this edge case
            if (chunkLen == 0) chunkLen = 0.00001;

            let normalizedChangeRatio =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / mPathLength);

            let size = sigmoid(normalizedChangeRatio);

            ticks.filter(tick => tick.lengthAlongLine < rangeData[i + 1].line && tick.lengthAlongLine > rangeData[i].line)
                .forEach(tick => {
                    returnable.push({
                        lengthAlongLine: tick.lengthAlongLine,
                        size,
                        x: tick.x,
                        y: tick.y,
                    });
                })
        }

        return returnable;
    }

    function addTimePegToSet(timePegs, peg) {
        let returnable = []
        let added = false;
        for (let i = 0; i < timePegs.length; i++) {
            if (timePegs[i].lengthAlongLine > peg.lengthAlongLine && !added) {
                // the first time timePegs[i].lengthAlongLine is greater than peg's, add peg.
                returnable.push(peg);
                added = true;
            }

            if (timePegs[i].lengthAlongLine < peg.lengthAlongLine && timePegs[i].boundTimepoint < peg.boundTimepoint) {
                returnable.push(timePegs[i]);
            } else if (timePegs[i].lengthAlongLine > peg.lengthAlongLine && timePegs[i].boundTimepoint > peg.boundTimepoint) {
                returnable.push(timePegs[i]);
            }
        }

        if (!added) {
            // allPegs.lengthAlongLine are < peg's, (or the array is empty), add it to the end.
            returnable.push(peg);
        }

        return returnable;
    }

    function getTimeForLength(length, rangeData) {
        if (length < 0) { console.error("Length out of bounds, must be positive " + length); return null; }

        let i = 0
        while (i < rangeData.length && length > rangeData[i].line) i++;

        if (i == 0) return rangeData[0].time;

        if (i == rangeData.length) { console.error("Length out of bounds: " + length + " max length is " + length); return null; }

        let percentBetweenPegs = (length - rangeData[i - 1].line) / (rangeData[i].line - rangeData[i - 1].line);
        return (rangeData[i].time - rangeData[i - 1].time) * percentBetweenPegs + rangeData[i - 1].time;
    }

    function getTimeForTailPercent(percent, tail) {
        if (tail == 1) {
            let tailTime = mStartPoint.boundTimepoint - mRangeMin;
            if (tailTime <= 0) tailTime = tailLength * (mRangeMax - mRangeMin) / mPathLength;

            return mStartPoint.boundTimepoint - percent * tailTime;

        } else if (tail == 2) {
            let tailTime = mRangeMax - mEndPoint.boundTimepoint;
            if (tailTime <= 0) tailTime = tailLength * (mRangeMax - mRangeMin) / mPathLength;

            return mEndPoint.boundTimepoint + percent * tailTime;
        } else {
            throw new Error("Time not in tails!");
        }
    }

    function getTailPercentForTime(time) {
        if (time < mStartPoint.boundTimepoint) {
            let tailTime = mStartPoint.boundTimepoint - mRangeMin;
            if (tailTime <= 0) tailTime = tailLength * (mRangeMax - mRangeMin) / mPathLength;

            return (mStartPoint.boundTimepoint - time) / tailTime;

        } else if (time > mEndPoint.boundTimepoint) {
            let tailTime = mRangeMax - mEndPoint.boundTimepoint;
            if (tailTime <= 0) tailTime = tailLength * (mRangeMax - mRangeMin) / mPathLength;

            return (time - mEndPoint.boundTimepoint) / tailTime;
        } else {
            throw new Error("Time not in tails!");
        }
    }

    function getOriginAndNormalForTime(time) {
        let rangeData = getTimeRangeData(mStartPoint, mTimePegs, mEndPoint);
        if (time < mStartPoint.boundTimepoint) {
            let percent = getTailPercentForTime(time);
            let originLen = tailLength * percent;
            let origin = PathMath.getPointAtDistanceAlongNormal(originLen, mTail1Direction, mStartPoint);
            return { origin, normal: mTail1Normal }
        } else if (time > mEndPoint.boundTimepoint) {
            let percent = getTailPercentForTime(time);
            let originLen = tailLength * percent;
            let origin = PathMath.getPointAtDistanceAlongNormal(originLen, mTail2Direction, mEndPoint);

            return { origin, normal: mTail2Normal }
        } else {
            let i = 1
            while (i < rangeData.length && time > rangeData[i].time) i++;

            let percentBetweenPegs = (time - rangeData[i - 1].time) / (rangeData[i].time - rangeData[i - 1].time);
            let len = (rangeData[i].line - rangeData[i - 1].line) * percentBetweenPegs + rangeData[i - 1].line;
            let origin = mPath.node().getPointAtLength(len);
            let normal = PathMath.getNormalAtPercentOfPath(mPath, len / mPathLength);
            return { origin, normal };
        }
    }

    function getTimeRangeData(start, pegs, end) {
        let returnable = [];
        let time = start.boundTimepoint == -1 ?
            0 : start.boundTimepoint;

        returnable.push({ line: 0, time });

        let len = pegs.length;
        for (let i = 0; i < len; i++) {
            time = pegs[i].boundTimepoint == -1 ?
                (i + 1) / (len + 1) : pegs[i].boundTimepoint;
            returnable.push({ line: pegs[i].lengthAlongLine, time });
        }

        time = end.boundTimepoint == -1 ?
            1 : end.boundTimepoint;
        returnable.push({ line: mPathLength, time });

        return returnable;
    }

    function sigmoid(x) {
        return 3 / (Math.exp(1 - x) + 1);
    }

    /** Annotations **/

    function drawAnnotations(startPoint, timePegs, endPoint) {
        const makeAnnotations = d3.annotation()
            .accessors({
                x: d => d.x,
                y: d => d.y,
            });

        let allPoints = timePegs.concat([
            { boundTimepoint: startPoint.boundTimepoint, lengthAlongLine: 0, labelOffset: startPoint.labelOffset },
            { boundTimepoint: endPoint.boundTimepoint, lengthAlongLine: mPathLength, labelOffset: endPoint.labelOffset }]);

        let annotationData = [];
        for (let i = 0; i < allPoints.length; i++) {
            let text = allPoints[i].boundTimepoint == -1 || allPoints[i].boundTimepoint < 1 ? "--" : new Date(allPoints[i].boundTimepoint).toDateString();

            annotationData.push({
                note: {
                    label: text
                },
                data: mPath.node().getPointAtLength(allPoints[i].lengthAlongLine),
                // hack to get around the broken drag events from the new d3 version
                className: "annotationId-" + i,

                dy: allPoints[i].labelOffset.x,
                dx: allPoints[i].labelOffset.y,
            });
        }

        makeAnnotations.annotations(annotationData);
        mAnnotationGroup.call(makeAnnotations);
    }

    // accessors
    this.setTimePegsUpdatedCallback = function (callback) { mTimePegsUpdatedCallback = callback; };
    this.getOriginAndNormalForTime = getOriginAndNormalForTime;
    this.getTimeRange = function () { return [mStartPoint.boundTimepoint, mEndPoint.boundTimepoint]; };
    this.update = update;
    this.remove = function () {
        mAnnotationGroup.remove();
        mGroup.remove();
    }
}
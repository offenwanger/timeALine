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

    let mAnnotationGroup = svg.append("g");
    let mGroup = svg.append("g");

    update(startPoint, timePegs, endPoint, path)

    /** Element management **/
    function update(startPoint, timePegs, endPoint, path) {
        mStartPoint = startPoint;
        mTimePegs = timePegs;
        mEndPoint = endPoint;
        mPath = path;
        mPathLength = path.node().getTotalLength();

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

        draw()
        drawAnnotations(mStartPoint, mTimePegs, mEndPoint);
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
        pegs.call(d3.drag()
            .on('start', (event, d) => {
                draggedPeg = mTimePegs[d.index];
                otherPegs = mTimePegs.filter(p => p != draggedPeg);
            })
            .on('drag', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                draggedPeg.lengthAlongLine = p.length;
                let tempPegSet = addTimePegToSet(otherPegs, draggedPeg);

                drawTempData(mStartPoint, tempPegSet, mEndPoint)
                drawAnnotations(mStartPoint, tempPegSet, mEndPoint);
            })
            .on('end', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);

                draggedPeg.lengthAlongLine = p.length;

                mTimePegsUpdatedCallback(mStartPoint, addTimePegToSet(otherPegs, draggedPeg), mEndPoint);
            }))
    }

    function setTimeTickHandlers(ticks) {
        let newPeg;
        ticks.call(d3.drag()
            .on('start', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);
                let rangeData = getTimeRangeData(mStartPoint, mTimePegs, mEndPoint, mPathLength);

                let boundTimepoint = getTimeForLength(p.length, rangeData);

                newPeg = new DataStructures.TimePeg(p.length, boundTimepoint);
            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);

                newPeg.lengthAlongLine = p.length;

                let tempPegSet = addTimePegToSet(mTimePegs, newPeg);

                drawTempData(mStartPoint, tempPegSet, mEndPoint);
                drawAnnotations(mStartPoint, tempPegSet, mEndPoint);
            })
            .on('end', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(mPath, dragPoint);

                newPeg.lengthAlongLine = p.length;

                mTimePegsUpdatedCallback(mStartPoint, addTimePegToSet(mTimePegs, newPeg), mEndPoint);
            }))
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

    function getLengthForTime(time) {
        let rangeData = getTimeRangeData(mStartPoint, mTimePegs, mEndPoint);

        if (time < 0) { console.error("Time out of bounds, must be positive " + length); return null; }

        let i = 0
        while (i < rangeData.length && time > rangeData[i].time) i++;

        if (i == 0) return 0;

        if (i == rangeData.length) { console.error("Time out of bounds: " + time + " max time is " + rangeData[rangeData.length - 1].time); return null; }

        let percentBetweenPegs = (time - rangeData[i - 1].time) / (rangeData[i].time - rangeData[i - 1].time);
        return (rangeData[i].line - rangeData[i - 1].line) * percentBetweenPegs + rangeData[i - 1].line;
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
    this.getLengthForTime = getLengthForTime;
    this.update = update;
    this.remove = function () {
        mAnnotationGroup.remove();
        mGroup.remove();
    }
}
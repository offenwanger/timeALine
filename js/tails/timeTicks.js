let createTimeTicker = function (svg) {
    let timePegsUpdatedCallback = function (id, timePegs) { };
    let timeTickSets = {};

    const tickLength = 8;
    const tickWidth = 3;
    const minTickDist = 30;

    /** Element management **/
    function update(id, startPoint, timePegs, endPoint, path) {
        let pathLength = path.node().getTotalLength();
        if (!timeTickSets[id]) {
            timeTickSets[id] = { timeTickData: [], data: {} };
        }
        timeTickSets[id].data.startPoint = startPoint
        timeTickSets[id].data.timePegs = timePegs;
        timeTickSets[id].data.endPoint = endPoint;
        timeTickSets[id].data.path = path;
        timeTickSets[id].data.pathLength = pathLength;

        let timeRangeData = getTimeRangeData(startPoint, timePegs, endPoint, pathLength);

        let timePegData = createPegDataset(timePegs, timeRangeData, path, pathLength);
        let pegs = svg.selectAll(".time-peg-" + id).data(timePegData);
        pegs.exit().remove();
        pegs.enter().append("line")
            .classed("time-peg-" + id, true)
            .style("stroke", "steelblue");

        let pegsTargets = svg.selectAll(".time-peg-target-" + id).data(timePegData);
        pegsTargets.exit().remove();
        let newPegsTargets = pegsTargets.enter().append("line")
            .classed("time-peg-target-" + id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setPegHandlers(newPegsTargets, id);

        timeTickSets[id].timeTickData = resizeTicks(
            createTickDataset(timeRangeData.map(item => item.line))
                .map(len => {
                    let pos = path.node().getPointAtLength(len);
                    return {
                        lengthAlongLine: len,
                        size: 1,
                        x: pos.x,
                        y: pos.y
                    }
                }),
            timeRangeData,
            pathLength);

        let ticks = svg.selectAll(".time-tick-" + id).data(timeTickSets[id].timeTickData);
        ticks.exit().remove();
        ticks.enter().append("line")
            .classed("time-tick-" + id, true)
            .style("stroke", "black");

        let tickTargets = svg.selectAll(".time-tick-target-" + id).data(timeTickSets[id].timeTickData);
        tickTargets.exit().remove();
        let newtickTargets = tickTargets.enter().append("line")
            .classed("time-tick-target-" + id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimeTickHandlers(newtickTargets, id);

        draw(id, path, pathLength)
        drawAnnotations(timePegs, path);
    }

    function draw(id, path, pathLength) {
        svg.selectAll(".time-tick-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / pathLength)) + " " + d.x + " " + d.y + ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 });


        svg.selectAll(".time-tick-target-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / pathLength)) + " " + d.x + " " + d.y + ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 + 5 });

        svg.selectAll(".time-peg-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / pathLength)) + " " + d.x + " " + d.y + ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 });

        svg.selectAll(".time-peg-target-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / pathLength)) + " " + d.x + " " + d.y + ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return d.x })
            .attr("y1", function (d) { return d.y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return d.x })
            .attr("y2", function (d) { return d.y - d.size * tickLength / 2 + 5 });
    }

    /** Input Handlers **/

    function setPegHandlers(pegs, id) {
        let otherPegs;
        let draggedPeg;
        pegs.call(d3.drag()
            .on('start', (event, d) => {
                draggedPeg = timeTickSets[id].data.timePegs[d.index];
                otherPegs = timeTickSets[id].data.timePegs.filter(p => p != draggedPeg);
            })
            .on('drag', (event) => {
                let path = timeTickSets[id].data.path;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                draggedPeg.lengthAlongLine = p.length;
                let tempPegSet = addTimePegToSet(otherPegs, draggedPeg);

                // get the current data
                let startPoint = timeTickSets[id].data.startPoint;
                let endPoint = timeTickSets[id].data.endPoint;
                drawWithTempPegSet(tempPegSet, id, startPoint, endPoint, path, pathLength)
                drawAnnotations(tempPegSet, path);
            })
            .on('end', (event) => {
                let path = timeTickSets[id].data.path;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                draggedPeg.lengthAlongLine = p.length;

                timePegsUpdatedCallback(id, addTimePegToSet(otherPegs, draggedPeg));
            }))
    }

    function setTimeTickHandlers(ticks, id) {
        let newPeg;
        ticks.call(d3.drag()
            .on('start', (event) => {
                // get the current data
                let startPoint = timeTickSets[id].data.startPoint;
                let timePegs = timeTickSets[id].data.timePegs;
                let endPoint = timeTickSets[id].data.endPoint;
                let path = timeTickSets[id].data.path;
                let pathLength = timeTickSets[id].data.pathLength;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);
                let rangeData = getTimeRangeData(startPoint, timePegs, endPoint, pathLength);

                let boundTimepoint = getTimeForLength(p.length, rangeData);

                newPeg = new DataStructures.TimePeg(p.length, boundTimepoint);
            })
            .on('drag', (event, d) => {
                // get the current data
                let startPoint = timeTickSets[id].data.startPoint;
                let timePegs = timeTickSets[id].data.timePegs;
                let endPoint = timeTickSets[id].data.endPoint;
                let path = timeTickSets[id].data.path;
                let pathLength = timeTickSets[id].data.pathLength;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                newPeg.lengthAlongLine = p.length;

                let tempPegSet = addTimePegToSet(timePegs, newPeg);

                drawWithTempPegSet(tempPegSet, id, startPoint, endPoint, path, pathLength);
                drawAnnotations(tempPegSet, path);
            })
            .on('end', (event) => {
                let timePegs = timeTickSets[id].data.timePegs;
                let path = timeTickSets[id].data.path;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                newPeg.lengthAlongLine = p.length;

                timePegsUpdatedCallback(id, addTimePegToSet(timePegs, newPeg));
            }))
    }

    function drawWithTempPegSet(pegs, id, startPoint, endPoint, path, pathLength) {
        let timeRangeData = getTimeRangeData(startPoint, pegs, endPoint, pathLength);
        let pegData = createPegDataset(pegs, timeRangeData, path, pathLength);
        let pegsElements = svg.selectAll(".time-peg-" + id).data(pegData);

        pegsElements.exit().remove();
        pegsElements.enter().append("line")
            .classed("time-peg-" + id, true)
            .style("stroke", "black");

        let tickData = resizeTicks(timeTickSets[id].timeTickData, timeRangeData, pathLength);
        svg.selectAll(".time-tick-" + id).data(tickData);

        draw(id, path, pathLength);

    }

    /** Data manipulation **/

    function createPegDataset(timePegs, rangeData, path, pathLength) {
        let returnable = []
        for (let i = 0; i < timePegs.length; i++) {
            let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

            let ratioBefore =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                ((rangeData[i + 1].line - rangeData[i].line) / pathLength);
            let ratioAfter =
                ((rangeData[i + 2].time - rangeData[i + 1].time) / totalTimeChange) /
                ((rangeData[i + 2].line - rangeData[i + 1].line) / pathLength);

            let pos = path.node().getPointAtLength(timePegs[i].lengthAlongLine);

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

    function resizeTicks(ticks, rangeData, lineLength) {
        let returnable = [];

        let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

        for (let i = 0; i < rangeData.length - 1; i++) {
            let chunkLen = rangeData[i + 1].line - rangeData[i].line;
            // TODO: Handle this edge case
            if (chunkLen == 0) chunkLen = 0.00001;

            let normalizedChangeRatio =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / lineLength);

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

    function getTimeRangeData(start, pegs, end, lineLength) {
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
        returnable.push({ line: lineLength, time });

        return returnable;
    }

    function sigmoid(x) {
        return 3 / (Math.exp(1 - x) + 1);
    }

    /** Annotations **/

    let annotationGroup = svg.append("g");
    function drawAnnotations(timePegs, path) {
        const makeAnnotations = d3.annotation()
            .accessors({
                x: d => d.x,
                y: d => d.y,
            });

        let annotations = createAnnotationData(timePegs, path)

        makeAnnotations.annotations(annotations);
        annotationGroup.call(makeAnnotations);
    }

    function createAnnotationData(timePegs, path) {
        let annotationData = [];
        for (let i = 0; i < timePegs.length; i++) {
            let text = timePegs[i].boundTimepoint == -1 || timePegs[i].boundTimepoint < 1 ? "--" : new Date(timePegs.boundTimepoint).toDateString();

            annotationData.push({
                note: {
                    label: text
                },
                data: path.node().getPointAtLength(timePegs[i].lengthAlongLine),
                // hack to get around the broken drag events from the new d3 version
                className: "annotationId-" + i,

                dy: timePegs[i].labelOffset.x,
                dx: timePegs[i].labelOffset.y,
            });
        }

        return annotationData;
    }

    return {
        setTimePegsUpdatedCallback: function (callback) { timePegsUpdatedCallback = callback; },
        update,
    }
}
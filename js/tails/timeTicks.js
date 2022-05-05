let createTimeTicker = function (svg) {
    let timePegsUpdatedCallback = function (model) { };

    const tickLength = 8;
    const tickWidth = 3;
    const minTickDist = 30;

    function update(model) {
        updatePegs(model);
        updateTicks(model);
    }

    function updatePegs(model) {
        let timeRangeData = getTimeRangeData(
            model.timelineData.startPoint,
            model.timelineData.timePegs,
            model.timelineData.endPoint,
            model.path.node().getTotalLength());
        model.timePegData = convertPegData(model.timelineData.timePegs, timeRangeData, model.path.node().getTotalLength());

        let pegs = svg.selectAll(".time-peg-" + model.timelineData.id).data(model.timePegData);
        pegs.exit().remove();
        pegs.enter().append("line")
            .classed("time-peg-" + model.timelineData.id, true)
            .style("stroke", "steelblue");

        let pegsTargets = svg.selectAll(".time-peg-target-" + model.timelineData.id).data(model.timePegData);
        pegsTargets.exit().remove();
        let newPegsTargets = pegsTargets.enter().append("line")
            .classed("time-peg-target-" + model.timelineData.id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimePegHandlers(newPegsTargets, model);

        drawPegs(model)
    }

    function updateTicks(model) {
        let timeRangeData = getTimeRangeData(
            model.timelineData.startPoint,
            model.timelineData.timePegs,
            model.timelineData.endPoint,
            model.path.node().getTotalLength());
        model.timeTickData = getTickPositions(timeRangeData.map(item => item.line))
            .map(len => { return { lengthAlongLine: len, size: 1 } });
        setTickSize(model.timeTickData, timeRangeData, model.path.node().getTotalLength());

        let ticks = svg.selectAll(".time-tick-" + model.timelineData.id).data(model.timeTickData);
        ticks.exit().remove();
        ticks.enter().append("line")
            .classed("time-tick-" + model.timelineData.id, true)
            .style("stroke", "black");

        let tickTargets = svg.selectAll(".time-tick-target-" + model.timelineData.id).data(model.timeTickData);
        tickTargets.exit().remove();
        let newtickTargets = tickTargets.enter().append("line")
            .classed("time-tick-target-" + model.timelineData.id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimeTickHandlers(newtickTargets, model);

        drawTicks(model)
    }

    function convertPegData(timePegs, rangeData, lineLen) {
        let returnable = []
        for (let i = 0; i < timePegs.length; i++) {
            let chunkLen = rangeData[i + 1].line - rangeData[i].line;
            let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

            let nCRBefore =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / lineLen);
            let nCRAfter =
                ((rangeData[i + 2].time - rangeData[i + 1].time) / totalTimeChange) /
                (chunkLen / lineLen);

            returnable.push({
                lengthAlongLine: timePegs[i].lengthAlongLine,
                size: sigmoid((nCRBefore + nCRAfter / 2)),
                index: i
            })
        }

        return returnable;
    }

    function setTimePegHandlers(pegs, model) {
        pegs.call(d3.drag()
            .on('start', (event) => {

            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(model.path, dragPoint);

                let peg = model.timelineData.timePegs[d.index];
                let pegs = model.timelineData.timePegs.filter(p => p != peg);

                peg.lengthAlongLine = p.length;
                pegs = addTimePegToSet(pegs, peg);

                let totalLength = model.path.node().getTotalLength();
                let timeRangeData = getTimeRangeData(
                    model.timelineData.startPoint,
                    pegs,
                    model.timelineData.endPoint,
                    totalLength);

                let pegData = convertPegData(pegs, timeRangeData, model.path.node().getTotalLength());
                svg.selectAll(".time-peg-" + model.timelineData.id).data(pegData);

                drawPegs(model);
            })
            .on('end', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(model.path, dragPoint);

                let peg = model.timelineData.timePegs[d.index];
                let pegs = model.timelineData.timePegs.filter(p => p != peg);

                peg.lengthAlongLine = p.length;
                pegs = addTimePegToSet(pegs, peg);

                model.timelineData.timePegs = addTimePegToSet(pegs, peg);
                timePegsUpdatedCallback(model);
            }))
    }


    function getTickPositions(pegsLinePositions) {
        let returnable = []

        for (let i = 0; i < pegsLinePositions.length - 1; i++) {
            let chunkLen = pegsLinePositions[i + 1] - pegsLinePositions[i];
            // TODO: Ditch this
            if (chunkLen == 0) chunkLen = 0.00001;

            let tickCount = Math.floor((chunkLen - minTickDist) / minTickDist);
            let tickDist = chunkLen / (tickCount + 1)

            returnable.push(...Array.from(Array(tickCount).keys()).map(val => ((val + 1) * tickDist) + pegsLinePositions[i]));
        }

        return returnable;
    }

    function setTickSize(ticks, rangeData, lineLength) {
        let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;

        for (let i = 0; i < rangeData.length - 1; i++) {
            let chunkLen = rangeData[i + 1].line - rangeData[i].line;
            // TODO: Ditch this
            if (chunkLen == 0) chunkLen = 0.00001;

            let normalizedChangeRatio =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / lineLength);

            let size = sigmoid(normalizedChangeRatio);

            ticks.filter(tick => tick.lengthAlongLine < rangeData[i + 1].line && tick.lengthAlongLine > rangeData[i].line)
                .forEach(tick => tick.size = size)
        }
    }


    function setTimeTickHandlers(ticks, model) {
        let newPeg;
        ticks.call(d3.drag()
            .on('start', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(model.path, dragPoint);

                let rangeData = getTimeRangeData(
                    model.timelineData.startPoint,
                    model.timelineData.timePegs,
                    model.timelineData.endPoint,
                    model.path.node().getTotalLength());
                let boundTimepoint = getTimeForLength(p.length, rangeData);

                newPeg = new DataStructures.TimePeg(p.length, boundTimepoint);
            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(model.path, dragPoint);

                newPeg.lengthAlongLine = p.length;

                let pegs = addTimePegToSet(model.timelineData.timePegs, newPeg);
                let totalLength = model.path.node().getTotalLength();
                let timeRangeData = getTimeRangeData(
                    model.timelineData.startPoint,
                    pegs,
                    model.timelineData.endPoint,
                    totalLength);
                setTickSize(model.timeTickData, timeRangeData, totalLength);
                svg.selectAll(".time-tick-" + model.timelineData.id).data(model.timeTickData);

                console.log(pegs)

                drawTicks(model);
            })
            .on('end', (event) => {
                model.timelineData.timePegs = addTimePegToSet(model.timelineData.timePegs, newPeg);
                timePegsUpdatedCallback(model);
                newPeg = null;
            }))
    }

    function addTimePegToSet(timePegs, peg) {
        let returnable = []
        let added = false;
        for (let i = 0; i < timePegs.length; i++) {
            if (timePegs[i].lengthAlongLine < peg.lengthAlongLine) {
                returnable.push(timePegs[i]);
            } else if (timePegs[i].time > peg.time && timePegs[i].lengthAlongLine > peg.lengthAlongLine) {
                // only add if they are not equal
                returnable.push(timePegs[i]);
            }

            if (timePegs[i].lengthAlongLine > peg.lengthAlongLine && !added) {
                // the first time timePegs[i].lengthAlongLine is greater than peg's, add peg.
                returnable.push(peg);
                added = true;
            }
        }

        if (!added) {
            // allPegs.lengthAlongLine are < peg's, (or the array is empty), add it to the end.
            returnable.push(peg);
        }

        return returnable;
    }

    function drawTicks(model) {
        svg.selectAll(".time-tick-" + model.timelineData.id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(
                            model.path, d.lengthAlongLine / model.path.node().getTotalLength())) +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 });


        svg.selectAll(".time-tick-target-" + model.timelineData.id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(
                            model.path, d.lengthAlongLine / model.path.node().getTotalLength())) +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 + 5 });
    }

    function drawPegs(model) {
        svg.selectAll(".time-peg-" + model.timelineData.id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(
                            model.path, d.lengthAlongLine / model.path.node().getTotalLength())) +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 });

        svg.selectAll(".time-peg-target-" + model.timelineData.id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(
                            model.path, d.lengthAlongLine / model.path.node().getTotalLength())) +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    model.path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return model.path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 + 5 });

    }


    function getTimeForLength(length, rangeData) {
        if (length < 0) { console.error("Length out of bounds, must be positive " + length); return null; }

        let i = 0
        while (i < rangeData.length && length > rangeData[i].line) i++;

        if (i == 0) return model.timelineData.startPoint.boundTimepoint;

        if (i == rangeData.length) { console.error("Length out of bounds: " + length + " max length is " + model.path.node().getTotalLength()); return null; }

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
        return 2 / (Math.exp(1 - x) + 1);
    }

    return {
        setTimePegsUpdatedCallback: function (callback) { timePegsUpdatedCallback = callback; },
        update,
    }
}
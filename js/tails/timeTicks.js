let createTimeTicker = function (svg) {
    let timePegsUpdatedCallback = function (id, timePegs) { };
    let timeTickSets = {};

    const tickLength = 8;
    const tickWidth = 3;
    const minTickDist = 30;

    function update(id, startPoint, timePegs, endPoint, path) {
        let lineLength = path.node().getTotalLength();

        timeTickSets[id] = {
            timePegData: [],
            timeTickData: []
        };

        let timeRangeData = getTimeRangeData(startPoint, timePegs, endPoint, lineLength);
        timeTickSets[id].timePegData = convertPegData(timePegs, timeRangeData, lineLength);

        let pegs = svg.selectAll(".time-peg-" + id).data(timeTickSets[id].timePegData);
        pegs.exit().remove();
        pegs.enter().append("line")
            .classed("time-peg-" + id, true)
            .style("stroke", "steelblue");

        let pegsTargets = svg.selectAll(".time-peg-target-" + id).data(timeTickSets[id].timePegData);
        pegsTargets.exit().remove();
        let newPegsTargets = pegsTargets.enter().append("line")
            .classed("time-peg-target-" + id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimePegHandlers(newPegsTargets, id, startPoint, timePegs, endPoint, path);

        timeTickSets[id].timeTickData = getTickPositions(timeRangeData.map(item => item.line))
            .map(len => { return { lengthAlongLine: len, size: 1 } });
        setTickSize(timeTickSets[id].timeTickData, timeRangeData, lineLength);

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

        setTimeTickHandlers(newtickTargets, id, startPoint, timePegs, endPoint, path);

        draw(id, path)
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

    function setTimePegHandlers(pegs, id, startPoint, timePegs, endPoint, path) {
        pegs.call(d3.drag()
            .on('start', (event) => {

            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                let peg = timePegs[d.index];
                let pegs = timePegs.filter(p => p != peg);

                peg.lengthAlongLine = p.length;
                pegs = addTimePegToSet(pegs, peg);

                let timeRangeData = getTimeRangeData(startPoint, pegs, endPoint, path.node().getTotalLength());

                let pegData = convertPegData(pegs, timeRangeData, path.node().getTotalLength());
                svg.selectAll(".time-peg-" + id).data(pegData);

                draw(id, path);
            })
            .on('end', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                let peg = timePegs[d.index];
                let pegs = timePegs.filter(p => p != peg);

                peg.lengthAlongLine = p.length;
                pegs = addTimePegToSet(pegs, peg);

                timePegsUpdatedCallback(id, addTimePegToSet(pegs, peg));
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


    function setTimeTickHandlers(ticks, id, startPoint, timePegs, endPoint, path) {
        let newPeg;
        ticks.call(d3.drag()
            .on('start', (event) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);
                let rangeData = getTimeRangeData(startPoint, timePegs, endPoint, path.node().getTotalLength());

                let boundTimepoint = getTimeForLength(p.length, rangeData);

                newPeg = new DataStructures.TimePeg(p.length, boundTimepoint);
            })
            .on('drag', (event, d) => {
                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(path, dragPoint);

                newPeg.lengthAlongLine = p.length;

                let pegs = addTimePegToSet(timePegs, newPeg);
                let totalLength = path.node().getTotalLength();
                let timeRangeData = getTimeRangeData(startPoint, pegs, endPoint, totalLength);
                setTickSize(timeTickSets[id].timeTickData, timeRangeData, totalLength);
                svg.selectAll(".time-tick-" + id).data(timeTickSets[id].timeTickData);

                draw(id, path);
            })
            .on('end', (event) => {
                timePegsUpdatedCallback(id, addTimePegToSet(timePegs, newPeg));
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

    function draw(id, path) {
        svg.selectAll(".time-tick-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / path.node().getTotalLength())) +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 });


        svg.selectAll(".time-tick-target-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / path.node().getTotalLength())) +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 + 5 });

        svg.selectAll(".time-peg-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / path.node().getTotalLength())) +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            })
            .style("stroke-width", function (d) { return d.size * tickWidth })
            .attr("x1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 })
            .attr("x2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 });

        svg.selectAll(".time-peg-target-" + id)
            .attr('transform', function (d) {
                return "rotate(" +
                    PathMath.normalVectorToDegrees(
                        PathMath.getNormalAtPercentOfPath(path, d.lengthAlongLine / path.node().getTotalLength())) +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).x +
                    " " +
                    path.node().getPointAtLength(d.lengthAlongLine).y +
                    ")"
            }).style("stroke-width", function (d) { return d.size * tickWidth + 5 })
            .attr("x1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y1", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y + d.size * tickLength / 2 + 5 })
            .attr("x2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).x })
            .attr("y2", function (d) { return path.node().getPointAtLength(d.lengthAlongLine).y - d.size * tickLength / 2 + 5 });

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
        return 2 / (Math.exp(1 - x) + 1);
    }

    return {
        setTimePegsUpdatedCallback: function (callback) { timePegsUpdatedCallback = callback; },
        update,
    }
}
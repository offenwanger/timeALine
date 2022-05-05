document.addEventListener('DOMContentLoaded', function (e) {
    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);

    let lineResolution = 20;

    let timelineModels = [];

    let lineDrawer = createLineDrawer(svg);
    lineDrawer.setOnDrawFinished((points, line, touchTarget) => {
        // only allow one line to be drawn for now.
        lineDrawer.setCanDraw(false);

        let newTimelineData = new DataStructures.Timeline(points);
        let newTimelineModel = {
            timelineData: newTimelineData,
            path: line,
            touchTarget: touchTarget,
            timeTicks: [],
            timePegs: []
        }
        newTimelineModel.startControl = createLineStartControl(newTimelineModel);
        newTimelineModel.endControl = createLineEndControl(newTimelineModel);

        bindTouchTargetEvents(touchTarget, newTimelineModel);

        timelineModels.push(newTimelineModel)

        dataUpdated(newTimelineModel)
    });
    lineDrawer.setCanDraw(true);
    lineDrawer.setLineResolution(lineResolution)

    function createLineStartControl(model) {
        let coords = model.timelineData.points[0];
        let controlPoint = svg.append("circle")
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 5.0)
            .attr('cursor', 'pointer')
            .attr('fill', '#b51d1c')
            .attr("stroke", "black")

        let dragMapping;
        let startPoint;
        controlPoint.call(d3.drag()
            .on('start', function (e) {
                startPoint = model.timelineData.points[0];
                endPoint = model.timelineData.points[model.timelineData.points.length - 1];
                dragMapping = PathMath.pointsToPercentDistMapping(model.timelineData.points, startPoint, endPoint);
            })
            .on('drag', function (e) {
                let newStartPoint = { x: e.x, y: e.y }
                let diff = PathMath.subtractPoints(newStartPoint, startPoint);

                // cloning point
                let newEndPoint = Object.assign({}, model.timelineData.points[model.timelineData.points.length - 1]);
                newEndPoint.x += diff.x;
                newEndPoint.y += diff.y;

                controlPoint.attr("cx", newStartPoint.x)
                controlPoint.attr("cy", newStartPoint.y)
                model.endControl.attr("cx", newEndPoint.x)
                model.endControl.attr("cy", newEndPoint.y)

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, newStartPoint, newEndPoint);
                model.path.attr('d', lineDrawer.lineGenerator(newPoints));

                // update the ticks
            })
            .on('end', function (e) {
                let newStartPoint = { x: e.x, y: e.y }
                let newEndPoint = model.timelineData.points[model.timelineData.points.length - 1];
                let diff = PathMath.subtractPoints(newStartPoint, startPoint)

                newEndPoint.x += diff.x;
                newEndPoint.y += diff.y;

                controlPoint.attr("cx", newStartPoint.x)
                controlPoint.attr("cy", newStartPoint.y)
                model.endControl.attr("cx", newEndPoint.x)
                model.endControl.attr("cy", newEndPoint.y)

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, newStartPoint, newEndPoint);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));

        return controlPoint;
    }

    function createLineEndControl(model) {
        let coords = model.timelineData.points[model.timelineData.points.length - 1];
        let controlPoint = svg.append("circle")
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 5.0)
            .attr('cursor', 'pointer')
            .attr('fill', 'steelblue')
            .attr("stroke", "black")

        let dragMapping;
        controlPoint.call(d3.drag()
            .on('start', function (e) {
                let startPoint = model.timelineData.points[0];
                let endPoint = model.timelineData.points[model.timelineData.points.length - 1];
                dragMapping = PathMath.pointsToPercentDistMapping(model.timelineData.points, startPoint, endPoint);
            })
            .on('drag', function (e) {
                controlPoint.attr("cx", e.x)
                controlPoint.attr("cy", e.y)
                let startPoint = model.timelineData.points[0];
                let endPoint = { x: e.x, y: e.y }

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, startPoint, endPoint);
                model.path.attr('d', lineDrawer.lineGenerator(newPoints));
            })
            .on('end', function (e) {
                let startPoint = model.timelineData.points[0];
                let endPoint = { x: e.x, y: e.y }

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, startPoint, endPoint);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));

        return controlPoint;
    }


    function bindTouchTargetEvents(target, model) {
        let targetPointIndex;
        let targetLength;
        let dragPoints;
        target.call(d3.drag()
            .on('start', (e) => {
                let p = PathMath.getClosestPointOnPath(model.path, { x: e.x, y: e.y });
                // copy the array
                dragPoints = model.timelineData.points.map(point => { return { x: point.x, y: point.y } })
                targetLength = p.percent * model.path.node().getTotalLength();
                if (p.percent < 0.0001) {
                    // set the target for first point on the line that's not the start point
                    targetPointIndex = 1;
                } else if (p.percent > 0.999) {
                    // set the target for the last point on the line that's not the end point
                    targetPointIndex = dragPoints.length - 1;
                } else {
                    targetPointIndex = getInsertIndex(p.percent, model.path)
                    dragPoints.splice(targetPointIndex, 0, { x: p.x, y: p.y });
                    model.path.attr('d', lineDrawer.lineGenerator(dragPoints));
                }
            })
            .on('drag', (e) => {
                dragPoints[targetPointIndex].x += e.dx;
                dragPoints[targetPointIndex].y += e.dy;

                let dx = e.dx;
                let dy = e.dy;

                let touchRange = 100;
                for (let i = 1; i < targetPointIndex; i++) {
                    let dist = targetLength - i * lineResolution;
                    let str = gaussian(Math.max(0, (touchRange - dist) / touchRange));
                    let dxi = dx * str;
                    let dyi = dy * str;

                    dragPoints[i].x += dxi;
                    dragPoints[i].y += dyi;
                }

                for (let i = targetPointIndex + 1; i < dragPoints.length - 1; i++) {
                    let dist = i * lineResolution - targetLength;
                    let str = gaussian(Math.max(0, (touchRange - dist) / touchRange));
                    let dxi = dx * str;
                    let dyi = dy * str;

                    dragPoints[i].x += dxi;
                    dragPoints[i].y += dyi;
                }

                // TODO implement the less stupid algorithm (get points within x distance of the main point)
                model.path.attr('d', lineDrawer.lineGenerator(dragPoints));
            })
            .on('end', (e) => {
                let newPoints = lineDrawer.remapPointsWithResolution(dragPoints, lineResolution);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));
    }

    function getInsertIndex(percent, line) {
        // This assumes one point every lineResolution along the path
        let len = line.node().getTotalLength() * percent;
        return Math.floor(len / lineResolution) + 1;
    }

    function dataUpdated(model) {
        model.path.attr('d', lineDrawer.lineGenerator(model.timelineData.points));
        model.touchTarget.attr('d', lineDrawer.lineGenerator(model.timelineData.points));

        recalculateTicks(model);
    }

    const minTickDist = 30;
    const tickLength = 8;
    const tickWidth = 3;
    function recalculateTicks(model) {
        let pegD = []
        let tickD = []

        let lineLen = model.path.node().getTotalLength();
        let rangeData = getTimeRangeData(
            model.timelineData.startPoint,
            model.timelineData.timePegs,
            model.timelineData.endPoint,
            lineLen);
        let totalTimeChange = rangeData[rangeData.length - 1].time - rangeData[0].time;


        for (let i = 0; i < rangeData.length - 1; i++) {
            let chunkLen = rangeData[i + 1].line - rangeData[i].line;
            // TODO: Ditch this
            if (chunkLen == 0) chunkLen = 0.00001;

            let tickCount = Math.floor((chunkLen - minTickDist) / minTickDist);
            let tickDist = chunkLen / (tickCount + 1)

            let normalizedChangeRatio =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / lineLen);

            tickD.push(...Array.from(Array(tickCount).keys()).map(i => {
                return {
                    lengthAlongLine: (i + 1) * tickDist,
                    size: sigmoid(normalizedChangeRatio),
                }
            }));
        }

        let timePegs = model.timelineData.timePegs;
        for (let i = 0; i < timePegs.length; i++) {
            let nCRBefore =
                ((rangeData[i + 1].time - rangeData[i].time) / totalTimeChange) /
                (chunkLen / lineLen);
            let nCRAfter =
                ((rangeData[i + 2].time - rangeData[i + 1].time) / totalTimeChange) /
                (chunkLen / lineLen);

            pegD.push({
                lengthAlongLine: timePegs[i].lengthAlongLine,
                size: sigmoid((nCRBefore + nCRAfter / 2))
            })
        }

        let ticks = svg.selectAll(".time-tick-" + model.timelineData.id).data(tickD);
        ticks.exit().remove();
        ticks.enter().append("line")
            .classed("time-tick-" + model.timelineData.id, true)
            .style("stroke", "black");

        let tickTargets = svg.selectAll(".time-tick-target-" + model.timelineData.id).data(tickD);
        tickTargets.exit().remove();
        let newtickTargets = tickTargets.enter().append("line")
            .classed("time-tick-target-" + model.timelineData.id, true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round');

        setTimeTickHandlers(newtickTargets, model);

        drawTicks(model)

        // TODO: update peg data
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

    function setTimeTickHandlers(ticks, model) {
        let line = model.path;
        let startPercent;
        ticks.call(d3.drag()
            .on('start', (event) => {
                if (draggedPoints.length < 2) return;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(line, dragPoint);
                startPercent = p.percent;

                drawTicks();
            })
            .on('drag', (event, d) => {
                if (draggedPoints.length < 2) return;

                let index = d.index;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(timeline, dragPoint);

                let totalLength = line.node().getTotalLength()
                let tickCount = Math.floor(totalLength / 40);

                let splitLen = p.percent * totalLength;
                let distLower = splitLen / index;
                let distUpper = (totalLength - splitLen) / (tickCount - index)

                tickData.forEach((data, i) => {
                    let len
                    if (index > i) {
                        len = i * distLower;
                    } else {
                        len = splitLen + ((i - index) * distUpper);
                    }
                    data.point = timeline.node().getPointAtLength(len);
                    data.rotation = PathMath.normalVectorToDegrees(PathMath.getNormalAtPercentOfPath(timeline, len / totalLength));
                });

                drawTicks();
            })
            .on('end', (event) => {
                if (draggedPoints.length < 2) return;

                let dragPoint = { x: event.x, y: event.y };
                let p = PathMath.getClosestPointOnPath(line, dragPoint);

                let dataPercent = linePercentToDataPercent(startPercent, timePegs);
                let linePercent = p.percent;

                let newPeg = { dataPercent, linePercent };

                let pegIndex = -1
                let existingPeg = timePegs.find(peg => Math.abs(peg.dataPercent - newPeg.dataPercent) < 0.0001)
                if (existingPeg) {
                    pegIndex = timePegs.indexOf(existingPeg);
                    // just to make sure they are consistent
                    dataPercent = existingPeg.dataPercent;
                    existingPeg.linePercent = linePercent;
                } else {
                    timePegs.push(newPeg)
                    timePegs.sort((a, b) => a.linePercent - b.linePercent)
                    pegIndex = timePegs.indexOf(newPeg);
                }

                // eliminate pegs that have been dragged over. 
                timePegs = timePegs.filter((peg, index) => {
                    if (index == pegIndex) return true;
                    if (index < pegIndex) {
                        return peg.dataPercent < dataPercent
                    } else {
                        return peg.dataPercent > dataPercent
                    }
                })

                recalculateTicks();
                drawData();
            }))
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

    function gaussian(x) {
        let a = 1;
        let b = 1;
        let c = 1 / 3
        return a * Math.exp(-(x - b) * (x - b) / (2 * c * c));
    }

    function sigmoid(x) {
        return 2 / (Math.exp(1 - x) + 1);
    }

});
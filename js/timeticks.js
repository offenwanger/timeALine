let loadData;
let setNormalsStraight;
let setNormalsDynamic;


document.addEventListener('DOMContentLoaded', function (e) {
    const STRAIGHT = 0;
    const DYNAMIC = 1;
    let normalsSetting = DYNAMIC;

    let lineDrawn = false;

    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);
    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'white')
        .call(d3.drag()
            .on('start', function (e) {
                if (lineDrawn) return;
                draggedPoints = [];
            })
            .on('drag', function (e) {
                if (lineDrawn) return;
                draggedPoints.push({ x: e.x, y: e.y });
                drawTimeline()
            })
            .on('end', function (e) {
                if (lineDrawn) return;
                let result = [];
                for (let i = 0; i < draggedPoints.length; i += 10) {
                    result.push(draggedPoints[i]);
                }
                lineDrawn = true;
                draggedPoints = result;
                drawTimeline()
                drawData();
            }));


    var Gen = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

    let draggedPoints = [];

    let zoomValue = 10

    let focus = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let timeline = focus.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5);

    let timelineTarget = focus.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 50)
        .attr('opacity', '0')
        .call(d3.drag()
            .on('start', timelineDragStart)
            .on('drag', timelineDragged)
            .on('end', timelineDragEnd))
        .on("dblclick", addAnnotationToTimeline);

    let startLabel = focus.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');
    let endLabel = focus.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxis1Ctrl1 = focus.append('circle')
        .datum(3)
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxis1Ctrl1Label = focus.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxis1Ctrl2 = focus.append('circle')
        .datum(10)
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxis1Ctrl2Label = focus.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxis1Line = focus.append('line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'black');

    function drawTimeline() {
        if (draggedPoints.length < 2) return;

        timeline.attr('d', Gen(draggedPoints));
        timelineTarget.attr('d', Gen(draggedPoints));

        startLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).y; });
        endLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).y; });

        let normal = PathMath.getNormalAtPercentOfPath(timeline, 0);
        let origin = { x: draggedPoints[0].x, y: draggedPoints[0].y }
        dataAxis1Ctrl1
            .attr('cx', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).x; })
            .attr('cy', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).y; });
        dataAxis1Ctrl1Label
            .attr('x', parseInt(dataAxis1Ctrl1.attr('cx')) + 3)
            .attr('y', dataAxis1Ctrl1.attr('cy'));

        dataAxis1Ctrl2
            .attr('cx', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).x; })
            .attr('cy', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).y; });
        dataAxis1Ctrl2Label
            .attr('x', parseInt(dataAxis1Ctrl2.attr('cx')) + 3)
            .attr('y', dataAxis1Ctrl2.attr('cy'));

        // does not need scaling because we are pulling off the already scaled control points.
        dataAxis1Line
            .attr('x1', dataAxis1Ctrl1.attr('cx'))
            .attr('y1', dataAxis1Ctrl1.attr('cy'))
            .attr('x2', dataAxis1Ctrl2.attr('cx'))
            .attr('y2', dataAxis1Ctrl2.attr('cy'));

        recalculateTicks();
        drawAnnotations();

    }
    drawTimeline();

    function drawData() {
        focus.selectAll('.dataPoint')
            .attr('cx', function (d) {
                let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
                let convertedPercent = dataPercentToLinePercent(d[0], timePegs);
                let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist, normalsSetting == DYNAMIC);
                return coords.x;
            })
            .attr('cy', function (d) {
                let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
                let convertedPercent = dataPercentToLinePercent(d[0], timePegs);
                let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist, normalsSetting == DYNAMIC);
                return coords.y;
            });
    }

    function dataAxisControlDragged(event) {
        if (draggedPoints.length < 2) return;
        // needs to be in model coords
        let dragPoint = { x: event.x, y: event.y };

        let origin = { x: draggedPoints[0].x, y: draggedPoints[0].y }
        let normalVector = PathMath.getNormalAtPercentOfPath(timeline, 0)

        let newPosition = PathMath.projectPointOntoNormal(dragPoint, normalVector, origin);
        let dist = PathMath.distancebetween(origin, newPosition.point) / zoomValue;

        d3.select(this).datum(newPosition.neg ? -1 * dist : dist);
        drawTimeline();
    }

    let tickData;
    function recalculateTicks() {
        let totalLength = timeline.node().getTotalLength()
        let tickCount = Math.floor(totalLength / 40);
        let tickDist = totalLength / tickCount;

        tickData = [...Array(tickCount).keys()].map(val => val * tickDist).map((len, index) => {
            return {
                index,
                point: timeline.node().getPointAtLength(len),
                rotation: PathMath.normalVectorToDegrees(PathMath.getNormalAtPercentOfPath(timeline, len / totalLength)),
                size: getTickSize(len / totalLength, timePegs)
            }
        });

        let ticks = focus.selectAll(".time-tick").data(tickData);
        ticks.exit().remove();
        ticks.enter().append("line")
            .classed("time-tick", true)
            .style("stroke", "black")
        drawTicks();

        let tickTargets = focus.selectAll(".time-tick-target").data(tickData);
        tickTargets.exit().remove();
        let newtickTargets = tickTargets.enter().append("line")
            .classed("time-tick-target", true)
            .style("stroke", "white")
            .style("opacity", "0")
            .attr('stroke-linecap', 'round')
        setTimeTickHandlers(newtickTargets, timeline)
    }

    function drawTicks() {
        focus.selectAll(".time-tick-target").data(tickData)
            .attr('transform', function (d) { return "rotate(" + d.rotation + " " + d.point.x + " " + d.point.y + ")" })
            .style("stroke-width", function (d) { return d.size.width + 5 })
            .attr("x1", function (d) { return d.point.x })
            .attr("y1", function (d) { return d.point.y + d.size.length / 2 + 5 })
            .attr("x2", function (d) { return d.point.x })
            .attr("y2", function (d) { return d.point.y - d.size.length / 2 - 5 })

        focus.selectAll(".time-tick").data(tickData)
            .attr('transform', function (d) { return "rotate(" + d.rotation + " " + d.point.x + " " + d.point.y + ")" })
            .style("stroke-width", function (d) { return d.size.width })
            .attr("x1", function (d) { return d.point.x })
            .attr("y1", function (d) { return d.point.y + d.size.length / 2 })
            .attr("x2", function (d) { return d.point.x })
            .attr("y2", function (d) { return d.point.y - d.size.length / 2 })
    }

    let timePegs = []

    function setTimeTickHandlers(ticks, line) {
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

    function linePercentToDataPercent(percent, timePegs) {
        if (timePegs.length == 0) return percent;

        let indexAfter = 0
        while (percent > timePegs[indexAfter].linePercent) {
            indexAfter++;
            if (indexAfter == timePegs.length) break;
        }

        let pegBefore;
        let pegAfter;

        if (indexAfter == 0) {
            pegBefore = { dataPercent: 0, linePercent: 0 }
        } else {
            pegBefore = timePegs[indexAfter - 1];
        }

        if (indexAfter == timePegs.length) {
            pegAfter = { dataPercent: 1, linePercent: 1 }
        } else {
            pegAfter = timePegs[indexAfter];
        }

        let percentBetweenTwoPegs = (percent - pegBefore.linePercent) / (pegAfter.linePercent - pegBefore.linePercent)
        return ((pegAfter.dataPercent - pegBefore.dataPercent) * percentBetweenTwoPegs) + pegBefore.dataPercent;
    }

    function dataPercentToLinePercent(percent, timePegs) {
        if (timePegs.length == 0) return percent;

        let indexAfter = 0
        while (percent > timePegs[indexAfter].dataPercent) {
            indexAfter++;
            if (indexAfter == timePegs.length) break;
        }

        let pegBefore;
        let pegAfter;

        if (indexAfter == 0) {
            pegBefore = { dataPercent: 0, linePercent: 0 }
        } else {
            pegBefore = timePegs[indexAfter - 1];
        }

        if (indexAfter == timePegs.length) {
            pegAfter = { dataPercent: 1, linePercent: 1 }
        } else {
            pegAfter = timePegs[indexAfter];
        }

        let percentBetweenTwoPegs = (percent - pegBefore.dataPercent) / (pegAfter.dataPercent - pegBefore.dataPercent)
        return ((pegAfter.linePercent - pegBefore.linePercent) * percentBetweenTwoPegs) + pegBefore.linePercent;
    }

    function getTickSize(percent, timePegs) {
        if (timePegs.length == 0) return { length: 10, width: 3 };

        let indexAfter = 0
        while (percent > timePegs[indexAfter].linePercent) {
            indexAfter++;
            if (indexAfter == timePegs.length) break;
        }

        let pegBefore;
        let pegAfter;

        if (indexAfter == 0) {
            pegBefore = { dataPercent: 0, linePercent: 0 }
        } else {
            pegBefore = timePegs[indexAfter - 1];
        }

        if (indexAfter == timePegs.length) {
            pegAfter = { dataPercent: 1, linePercent: 1 }
        } else {
            pegAfter = timePegs[indexAfter];
        }

        let ratio = (pegAfter.dataPercent - pegBefore.dataPercent) / (pegAfter.linePercent - pegBefore.linePercent)

        return { length: 10 * ratio, width: 3 * ratio }

    }

    function sigmoid(z) {
        return 2 / (1 + Math.exp(-z + 1));
    }


    let targetIndex;
    function timelineDragStart(e) {
        let mouseCoords = { x: e.x, y: e.y }
        let closetDist = Number.MAX_VALUE;
        for (let i = 0; i < draggedPoints.length; i++) {
            let dist = PathMath.distancebetween(mouseCoords, draggedPoints[i]);
            if (dist < closetDist) {
                closetDist = dist;
                targetIndex = i;
            }
        }

        let p = PathMath.getClosestPointOnPath(timeline, { x: e.x, y: e.y });
        if (PathMath.distancebetween(p, draggedPoints[targetIndex]) > 50) {
            // add a new point

            // figure out if the point should go before or after targetIndex
            let insertIndex = targetIndex + 1;
            if (p.percent < PathMath.getClosestPointOnPath(timeline, draggedPoints[targetIndex]).percent) {
                insertIndex--;
            }


            draggedPoints.splice(insertIndex, 0, p)

            targetIndex = insertIndex
        }
    }

    function timelineDragged(e) {
        draggedPoints[targetIndex].x += e.dx;
        draggedPoints[targetIndex].y += e.dy;
        let dx = e.dx;
        let dy = e.dy;
        for (let i = 1; i < Math.max(targetIndex, draggedPoints.length - targetIndex); i++) {
            dx /= 2;
            dy /= 2;
            if (targetIndex - i > 0) {
                draggedPoints[targetIndex - i].x += dx;
                draggedPoints[targetIndex - i].y += dy;
            }
            if (targetIndex + i < draggedPoints.length) {
                draggedPoints[targetIndex + i].x += dx;
                draggedPoints[targetIndex + i].y += dy;
            }
        }

        drawTimeline()
    }

    function timelineDragEnd(e) {
        drawData();
    }

    loadData = function () {
        FileHandler.getDataFile().then(result => {
            let data = result.data.map(item => [parseInt(item[0]), parseInt(item[1])])

            let timeLineRange = d3.extent(data.map(item => item[0]).filter(item => item));
            let dataDimention1Range = d3.extent(data.map(item => item[1]).filter(item => item));

            data = data.map(item => {
                let percent0 = (item[0] - timeLineRange[0]) / (timeLineRange[1] - timeLineRange[0])
                let percent1 = (item[1] - dataDimention1Range[0]) / (dataDimention1Range[1] - dataDimention1Range[0])
                return [percent0, percent1];
            })

            data = data.filter(item => !isNaN(item[0] && !isNaN(item[1])));

            startLabel.text(new Date(timeLineRange[0]).toDateString()).lower();
            endLabel.text(new Date(timeLineRange[1]).toDateString()).lower();

            dataAxis1Ctrl1Label.text(dataDimention1Range[0]).lower();
            dataAxis1Ctrl2Label.text(dataDimention1Range[1]).lower();

            drawTimeline();

            focus.selectAll('.dataPoint')
                .data(data)
                .enter()
                .append('circle')
                .classed('dataPoint', true)
                .attr('r', 3.0)
                .attr('fill', 'red')
                .attr('stroke', 'black')
                .lower();

            drawData();
        });
    }

    setNormalsStraight = function () {
        normalsSetting = STRAIGHT;
        drawData();
    }

    setNormalsDynamic = function () {
        normalsSetting = DYNAMIC;
        drawData();
    }

    let annotationGroup = focus.append("g");
    const makeAnnotations = d3.annotation()
        .accessors({
            x: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).x,
            y: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).y,
        });

    let annotationId = 0;
    let timelineAnnotations = []
    function addAnnotationToTimeline(e) {
        let p = PathMath.getClosestPointOnPath(timeline, { x: e.x, y: e.y });

        let annotationData = {
            note: {
                label: "<text>",
                wrap: 200,
                padding: 10
            },
            data: { percent: p.percent },
            // hack to get around the broken drag events from the new d3 version
            className: "id-" + annotationId,

            dy: 100,
            dx: 100,
        }

        annotationId++

        timelineAnnotations.push(annotationData);

        drawAnnotations();

        d3.selectAll(".annotation")
            .on(".drag", null)
            .call(d3.drag()
                .on('drag', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = timelineAnnotations.find(annotation => annotation.className == id);
                    annotation.dx += e.dx;
                    annotation.dy += e.dy;
                    drawAnnotations();
                }))
            .on('dblclick', function () {
                let position = d3.select(this).select("tspan").node().getBoundingClientRect();
                let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                let annotation = timelineAnnotations.find(annotation => annotation.className == id);
                let inputbox = d3.select("#input-box");

                inputbox
                    .style("top", Math.floor(position.y - 8) + "px")
                    .style("left", Math.floor(position.x - 8) + "px")
                    .attr("height", inputbox.property("scrollHeight"))
                    .on('input', null)
                    .on('input', function (e) {
                        annotation.note.label = inputbox.property("value");
                        inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
                        drawAnnotations();
                    }).on('change', function (e) {
                        inputbox
                            .style("top", "-200px")
                            .style("left", "-100px")
                    });

                inputbox.property("value", annotation.note.label);
                inputbox.style("height", inputbox.property("scrollHeight") + "px");
                inputbox.style("width", annotation.note.wrap + "px");

                inputbox.node().focus();
            });
    }

    function getCirclePos(circle) {
        return {
            x: parseInt(circle.attr('cx')),
            y: parseInt(circle.attr('cy')),
        }
    }

    function drawAnnotations() {
        makeAnnotations.annotations(timelineAnnotations);
        annotationGroup.call(makeAnnotations);
    }


});



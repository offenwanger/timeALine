let loadData;

document.addEventListener("DOMContentLoaded", function (e) {
    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select("#svg_container").append("svg")
        .attr("width", width)
        .attr("height", height);

    let curves = [new Curve(10, 20, 20,20, 30, 10, 40, 10), new Curve(40, 10, 50, 10, 50, 20, 60, 20)]

    let zoomValue = 10
    let xScale = d3.scaleLinear()
        .rangeRound([0, width])
        .domain([0, width / zoomValue]);

    let yScale = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, height / zoomValue]);

    let focus = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    focus.selectAll('.timeLineControlLine')
        .data(curves.reduce((arr, curve) => arr.concat(curve.getPointControlPointParis()), []))
        .enter()
        .append('line')
        .classed("timeLineControlLine", true)
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("stroke", "black")
        .attr("opacity", "0.2")
        .attr("stroke-dasharray", ("3, 3"));

    focus.selectAll('.timeLineControlCircle')
        .data(curves.reduce((arr, curve) => arr.concat(curve.getControlPointCurveMapping()), []))
        .enter()
        .append('circle')
        .classed("timeLineControlCircle", true)
        .attr('r', 5.0)
        .attr('cursor', 'pointer')
        .attr('fill', 'steelblue')
        .attr("stroke", "black")
        .call(d3.drag()
            .on('start', dragTimelineControlStart)
            .on('drag', draggingTimelineControl)
            .on('end', dragTimelineControlEnd));

    let timeline = focus.append("path")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5);

    let warpControl1 = focus.append("circle")
        .datum(0.25)
        .attr("r", 3.5)
        .call(d3.drag()
            .on('drag', warpControlDragged)
            .on('end', drawData));
    let warpControl1Label = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");

    let warpControl2 = focus.append("circle")
        .datum(0.75)
        .attr("r", 3.5)
        .call(d3.drag()
            .on('drag', warpControlDragged)
            .on('end', drawData));
    let warpControl2Label = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");

    let startLabel = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");
    let endLabel = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");

    let dataAxis1Ctrl1 = focus.append("circle")
        .datum(3)
        .attr("r", 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxis1Ctrl1Label = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");

    let dataAxis1Ctrl2 = focus.append("circle")
        .datum(10)
        .attr("r", 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxis1Ctrl2Label = focus.append("text")
        .attr("text-anchor", "left")
        .style("font-size", "16px");

    let dataAxis1Line = focus.append("line")
        .attr("stroke-width", 1.5)
        .attr("stroke", "black");

    function drawTimeline() {
        timeline.datum(curves)
            .attr("d", function (curveData) {
                let path = d3.path();
                curveData.forEach(curve => {
                    path.moveTo(xScale(curve.x0), yScale(curve.y0))
                    path.bezierCurveTo(xScale(curve.cx1), yScale(curve.cy1), xScale(curve.cx2), yScale(curve.cy2), xScale(curve.x1), yScale(curve.y1));
                });
                return path;
            });

        focus.selectAll('.timeLineControlLine')
            .data(curves.reduce((arr, curve) => arr.concat(curve.getPointControlPointParis()), []))
            .attr('x1', function (d) { return xScale(d[0].x); })
            .attr('y1', function (d) { return yScale(d[0].y); })
            .attr('x2', function (d) { return xScale(d[1].x); })
            .attr('y2', function (d) { return yScale(d[1].y); });

        focus.selectAll('.timeLineControlCircle')
            .data(curves.reduce((arr, curve) => arr.concat(curve.getControlPointCurveMapping()), []))
            .attr('cx', function (d) { return xScale(d.coords.x); })
            .attr('cy', function (d) { return yScale(d.coords.y); })

        // does not require xScaling because we are pulling off the already scaled timeline
        warpControl1
            .attr('cx', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).x; })
            .attr('cy', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).y; });
        warpControl1Label
            .attr("x", warpControl1.attr("cx") + 3)
            .attr("y", warpControl1.attr("cy"));

        warpControl2
            .attr('cx', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).x; })
            .attr('cy', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).y; });
        warpControl2Label
            .attr("x", warpControl2.attr("cx") + 3)
            .attr("y", warpControl2.attr("cy"));

        startLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).y; });
        endLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).y; });


        let origin = { x: curves[0].x0, y: curves[0].y0 }
        let controlVector = { x: curves[0].cx1 - curves[0].x0, y: curves[0].cy1 - curves[0].y0 }
        let normal = PathMath.normalize(PathMath.rotatePoint90DegreesCounterClockwise(controlVector));

        dataAxis1Ctrl1
            .attr('cx', function (d) { return xScale(PathMath.getPointAtDistanceAlongNormal(d, normal, origin).x); })
            .attr('cy', function (d) { return yScale(PathMath.getPointAtDistanceAlongNormal(d, normal, origin).y); });
        dataAxis1Ctrl1Label
            .attr("x", parseInt(dataAxis1Ctrl1.attr("cx")) + 3)
            .attr("y", dataAxis1Ctrl1.attr("cy"));

        dataAxis1Ctrl2
            .attr('cx', function (d) { return xScale(PathMath.getPointAtDistanceAlongNormal(d, normal, origin).x); })
            .attr('cy', function (d) { return yScale(PathMath.getPointAtDistanceAlongNormal(d, normal, origin).y); });
        dataAxis1Ctrl2Label
            .attr("x", parseInt(dataAxis1Ctrl2.attr("cx")) + 3)
            .attr("y", dataAxis1Ctrl2.attr("cy"));

        // does not need scaling because we are pulling off the already scaled control points.
        dataAxis1Line
            .attr("x1", dataAxis1Ctrl1.attr("cx"))
            .attr("y1", dataAxis1Ctrl1.attr("cy"))
            .attr("x2", dataAxis1Ctrl2.attr("cx"))
            .attr("y2", dataAxis1Ctrl2.attr("cy"));



    }
    drawTimeline();

    function drawData() {
        let warpPoints = [
            { from: 0.25, to: warpControl1.datum() },
            { from: 0.75, to: warpControl2.datum() }
        ]
        focus.selectAll(".dataPoint")
            .attr('cx', function (d) {
                let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
                let convertedPercent = PathMath.warpPercent(warpPoints, d[0]);
                let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist);
                return coords.x;
            })
            .attr('cy', function (d) {
                let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
                let convertedPercent = PathMath.warpPercent(warpPoints, d[0]);
                let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist);
                return coords.y;
            });
    }

    function dragTimelineControlStart(event, d) {
        d3.select(this).style("stroke", "")
    }

    function draggingTimelineControl(event, d) {
        let xCoor = event.x;
        let yCoor = event.y;

        let curvePointData = d3.select(this).datum();
        curvePointData.curve.update(curvePointData.point, { x: xScale.invert(xCoor), y: yScale.invert(yCoor) })

        drawTimeline();
    }

    function dragTimelineControlEnd(event, d) {
        d3.select(this)
            .style("stroke", "black")
        drawData();
    }

    function dragTimelineControlStart(event, d) {
        d3.select(this).style("stroke", "")
    }

    function dataAxisControlDragged(event) {
        // needs to be in model coords
        let dragPoint = { x: xScale.invert(event.x), y: yScale.invert(event.y) };

        let origin = { x: curves[0].x0, y: curves[0].y0 }
        let tangentVector = { x: curves[0].cx1 - curves[0].x0, y: curves[0].cy1 - curves[0].y0 }
        let normalVector = PathMath.normalize(PathMath.rotatePoint90DegreesCounterClockwise(tangentVector));

        let newPosition = PathMath.projectPointOntoNormal(dragPoint, normalVector, origin);
        let dist = PathMath.distancebetween(origin, newPosition.point);

        d3.select(this).datum(newPosition.neg ? -1 * dist : dist);
        drawTimeline();
    }

    function warpControlDragged(event) {
        let dragPoint = { x: event.x, y: event.y };
        let p = PathMath.getClosestPointOnPath(timeline, dragPoint);
        d3.select(this).datum(p.percent);
        drawTimeline();
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

            warpControl1Label.text(new Date((timeLineRange[1] - timeLineRange[0]) * 0.25 + timeLineRange[0]).toDateString()).lower();
            warpControl2Label.text(new Date((timeLineRange[1] - timeLineRange[0]) * 0.75 + timeLineRange[0]).toDateString()).lower();
            startLabel.text(new Date(timeLineRange[0]).toDateString()).lower();
            endLabel.text(new Date(timeLineRange[1]).toDateString()).lower();

            dataAxis1Ctrl1Label.text(dataDimention1Range[0]).lower();
            dataAxis1Ctrl2Label.text(dataDimention1Range[1]).lower();

            drawTimeline();

            focus.selectAll(".dataPoint")
                .data(data)
                .enter()
                .append('circle')
                .classed("dataPoint", true)
                .attr('r', 3.0)
                .attr('fill', 'red')
                .attr("stroke", "black")
                .lower();

            drawData();
        });
    }
});



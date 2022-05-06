function TimeLineDataSet(svg, id, data, path, ticker) {
    let lowValDist = 30;
    let highValDist = 100;
    let lowVal;
    let highVal;

    let group = svg.append('g');

    let pathLength = path.node().getTotalLength();

    let dataAxisCtrlLow = group.append('circle')
        .attr("ctrl", "low")
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxisCtrlLowLabel = group.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxisCtrlHigh = group.append('circle')
        .attr("ctrl", "high")
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxisCtrlHighLabel = group.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxisLine = group.append('line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'black');

    let valRange = d3.extent(data.map(item => item.val));
    lowVal = valRange[0];
    highVal = valRange[1]

    dataAxisCtrlLowLabel.text(lowVal).lower();
    dataAxisCtrlHighLabel.text(highVal).lower();

    drawAxis();
    drawData();

    function drawAxis() {
        let normal = PathMath.getNormalAtPercentOfPath(path, 0);
        let origin = path.node().getPointAtLength(0)

        let ctrl1Pos = PathMath.getPointAtDistanceAlongNormal(lowValDist, normal, origin)
        dataAxisCtrlLow
            .attr('cx', ctrl1Pos.x)
            .attr('cy', ctrl1Pos.y);
        dataAxisCtrlLowLabel
            .attr('x', ctrl1Pos.x + 3)
            .attr('y', ctrl1Pos.y);

        let ctrl2Pos = PathMath.getPointAtDistanceAlongNormal(highValDist, normal, origin)
        dataAxisCtrlHigh
            .attr('cx', ctrl2Pos.x)
            .attr('cy', ctrl2Pos.y);
        dataAxisCtrlHighLabel
            .attr('x', ctrl2Pos.x + 3)
            .attr('y', ctrl2Pos.y);

        dataAxisLine
            .attr('x1', ctrl1Pos.x)
            .attr('y1', ctrl1Pos.y)
            .attr('x2', ctrl2Pos.x)
            .attr('y2', ctrl2Pos.y);
    }

    function drawData() {
        data.forEach(d => {
            let dist = PathMath.getDistForAxisPercent((d.val - lowVal) / (highVal - lowVal), highValDist, lowValDist);
            let percent = ticker.getLengthForTime(d.time, id) / pathLength;
            let coords = PathMath.getCoordsForPercentAndDist(path, percent, dist);
            d.x = coords.x;
            d.y = coords.y;
        })

        group.selectAll('.data_point_' + id).data(data)
            .enter()
            .append('circle')
            .classed('data_point_' + id, true)
            .attr('r', 3.0)
            .attr('fill', 'red')
            .attr('stroke', 'black')
            .lower();

        group.selectAll('.data_point_' + id)
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
    }

    function dataAxisControlDragged(event) {
        // needs to be in model coords
        let dragPoint = { x: event.x, y: event.y };

        let normal = PathMath.getNormalAtPercentOfPath(path, 0);
        let origin = path.node().getPointAtLength(0)

        let newPosition = PathMath.projectPointOntoNormal(dragPoint, normal, origin);
        let dist = PathMath.distancebetween(origin, newPosition.point);
        dist = newPosition.neg ? -1 * dist : dist;

        d3.select(this).attr("ctrl") == "low" ? lowValDist = dist : highValDist = dist;

        drawAxis();
    }

    function remove() {
        group.selectAll('.data_point_' + id).remove();
        dataAxisCtrlLow.remove();
        dataAxisCtrlLowLabel.remove();
        dataAxisCtrlHigh.remove()
        dataAxisCtrlHighLabel.remove();
        dataAxisLine.remove();
    }

    function updatePath(newPath) {
        path = newPath;
        pathLength = path.node().getTotalLength();

        drawAxis();
        drawData();
    }

    // accessors
    this.updatePath = updatePath;
    this.remove = remove;
}
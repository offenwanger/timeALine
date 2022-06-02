function TimeLineDataSet(svg, id, data, path, ticker) {
    let mLowValDist = 30;
    let mHighValDist = 100;
    let mData = data;

    let valRange = d3.extent(data.map(item => item.val));
    let mLowVal = valRange[0];
    let mHighVal = valRange[1]

    let mGroup = svg.append('g');

    let mPath = path;
    let mPathLength = path.node().getTotalLength();

    const tailPointCount = 20;

    let dataAxisCtrlLow = mGroup.append('circle')
        .attr("ctrl", "low")
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxisCtrlLowLabel = mGroup.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxisCtrlHigh = mGroup.append('circle')
        .attr("ctrl", "high")
        .attr('r', 3.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('drag', dataAxisControlDragged)
            .on('end', drawData));
    let dataAxisCtrlHighLabel = mGroup.append('text')
        .attr('text-anchor', 'left')
        .style('font-size', '16px');

    let dataAxisLine = mGroup.append('line')
        .attr('stroke-width', 1.5)
        .attr('stroke', 'black');

    dataAxisCtrlLowLabel.text(mLowVal).lower();
    dataAxisCtrlHighLabel.text(mHighVal).lower();

    drawAxis();
    drawData();

    function drawAxis() {
        let normal = PathMath.getNormalAtPercentOfPath(mPath, 0);
        let origin = mPath.node().getPointAtLength(0)

        let ctrl1Pos = PathMath.getPointAtDistanceAlongNormal(mLowValDist, normal, origin)
        dataAxisCtrlLow
            .attr('cx', ctrl1Pos.x)
            .attr('cy', ctrl1Pos.y);
        dataAxisCtrlLowLabel
            .attr('x', ctrl1Pos.x + 3)
            .attr('y', ctrl1Pos.y);

        let ctrl2Pos = PathMath.getPointAtDistanceAlongNormal(mHighValDist, normal, origin)
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
        let mainData = mData.filter(d => d.time >= ticker.getTimeRange()[0] && d.time <= ticker.getTimeRange()[1]);
        mainData.forEach(d => {
            let { origin, normal } = ticker.getOriginAndNormalForTime(d.time);
            let dist = PathMath.getDistForAxisPercent((d.val - mLowVal) / (mHighVal - mLowVal), mHighValDist, mLowValDist);
            let coords = PathMath.getPointAtDistanceAlongNormal(dist, normal, origin);
            d.x = coords.x;
            d.y = coords.y;
            d.opacity = 1;
        })

        let tail1Points = mData.filter(d => d.time < ticker.getTimeRange()[0]);
        let n = Math.ceil(tail1Points.length / tailPointCount);
        let fades = Array.from(Array(tailPointCount + 1).keys()).map(fade => (fade / tailPointCount) * .5);
        for (let i = 0; i < tail1Points.length; i += n) {
            let d = tail1Points[i];
            let { origin, normal } = ticker.getOriginAndNormalForTime(d.time);
            let dist = PathMath.getDistForAxisPercent((d.val - mLowVal) / (mHighVal - mLowVal), mHighValDist, mLowValDist);
            let coords = PathMath.getPointAtDistanceAlongNormal(dist, normal, origin);
            d.x = coords.x;
            d.y = coords.y;
            d.opacity = fades.splice(Math.floor(Math.random() * fades.length), 1);
            if (!d.opacity) d.opacity = 0;
            mainData.push(d);
        }

        let tail2Points = mData.filter(d => d.time > ticker.getTimeRange()[1]);
        n = Math.ceil(tail2Points.length / tailPointCount);
        fades = Array.from(Array(tailPointCount + 1).keys()).map(fade => (fade - tailPointCount / 2) / tailPointCount);
        for (let i = 0; i < tail2Points.length; i += n) {
            let d = tail2Points[i];
            let { origin, normal } = ticker.getOriginAndNormalForTime(d.time);
            let dist = PathMath.getDistForAxisPercent((d.val - mLowVal) / (mHighVal - mLowVal), mHighValDist, mLowValDist);
            let coords = PathMath.getPointAtDistanceAlongNormal(dist, normal, origin);
            d.x = coords.x;
            d.y = coords.y;
            d.opacity = fades.splice(Math.floor(Math.random() * fades.length), 1);
            if (!d.opacity) d.opacity = 0;
            mainData.push(d);
        }

        let points = mGroup.selectAll('.data_point_' + id).data(mainData);
        points.exit().remove();
        points.enter()
            .append('circle')
            .classed('data_point_' + id, true)
            .attr('r', 3.0)
            .attr('fill', 'red')
            .attr('stroke', 'black')
            .attr('filter', "url(#crayon)")
            .lower();

        mGroup.selectAll('.data_point_' + id)
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .style('opacity', function (d) { return d.opacity })
    }

    function dataAxisControlDragged(event) {
        // needs to be in model coords
        let dragPoint = { x: event.x, y: event.y };

        let normal = PathMath.getNormalAtPercentOfPath(mPath, 0);
        let origin = mPath.node().getPointAtLength(0)

        let newPosition = PathMath.projectPointOntoNormal(dragPoint, normal, origin);
        let dist = PathMath.distancebetween(origin, newPosition.point);
        dist = newPosition.neg ? -1 * dist : dist;

        d3.select(this).attr("ctrl") == "low" ? mLowValDist = dist : mHighValDist = dist;

        drawAxis();
    }

    // accessors
    this.updatePath = function (path) {
        mPath = path;
        mPathLength = path.node().getTotalLength();

        drawAxis();
        drawData();
    };

    this.remove = function () {
        mGroup.remove()
    };
}
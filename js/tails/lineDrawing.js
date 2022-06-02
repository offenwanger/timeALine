function TimeLineDrawer(svg) {
    let mCanDraw = false;
    let mDrawFinishedCallback = () => { };
    let mDraggedPoints = [];
    let mLineResolution = 50;
    let mLineGenerator = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

    let lineDrawingGroup = svg.append('g');

    lineDrawingGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .call(d3.drag()
            .on('start', function (e) { /* nothing at the moment */ })
            .on('drag', onDragged)
            .on('end', onDragEnd));

    let drawingLine = lineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)
        .attr('filter', "url(#pencil)");

    let drawingLineTarget = lineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 50)
        .attr('opacity', '0');

    function onDragged(e) {
        if (mCanDraw) {
            mDraggedPoints.push({ x: e.x, y: e.y });
            drawingLine.attr('d', mLineGenerator(mDraggedPoints));
            drawingLineTarget.attr('d', mLineGenerator(mDraggedPoints));
        }
    }

    function onDragEnd() {
        if (mCanDraw) {
            let result = getPointsFromLine(drawingLine, mLineResolution);
            drawingLine.attr('d', mLineGenerator(result));
            drawingLineTarget.attr('d', mLineGenerator(result));

            mDrawFinishedCallback(result, drawingLine.clone(), drawingLineTarget.clone());

            mDraggedPoints = [];
            drawingLine.attr('d', mLineGenerator([]));
            drawingLineTarget.attr('d', mLineGenerator([]));

        }
    }

    function remapPointsWithResolution(points, resolution) {
        let line = drawingLine.clone().attr('d', mLineGenerator(points));
        let result = getPointsFromLine(line, resolution);
        line.remove();
        return result;
    }

    function getPointsFromLine(line, resolution) {
        let result = [];
        for (let len = 0; len < line.node().getTotalLength(); len += resolution) {
            result.push(line.node().getPointAtLength(len));
        }
        result.push(line.node().getPointAtLength(line.node().getTotalLength()));
        return result.map(p => { return { x: p.x, y: p.y }; });
    }

    // accessors
    this.setCanDraw = function (canDraw) { mCanDraw = canDraw };
    this.setOnDrawFinished = function (callback) { mDrawFinishedCallback = callback; };
    this.setLineResolution = function (resolution) { mLineResolution = resolution; };
    this.remapPointsWithResolution = remapPointsWithResolution;
    this.lineGenerator = mLineGenerator;
    this.sink = function () { lineDrawingGroup.lower(); };
}
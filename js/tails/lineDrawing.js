let createLineDrawer = function (svg) {
    let canDraw = false;
    let drawFinishedCallback = () => { };
    let draggedPoints = [];
    let lineResolution = 50;

    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .call(d3.drag()
            .on('start', function (e) { /* nothing at the moment */ })
            .on('drag', onDragged)
            .on('end', onDragEnd));

    let drawingLine = svg.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5);

    let drawingLineTarget = svg.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 50)
        .attr('opacity', '0');

    let lineGenerator = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

    function onDragged(e) {
        if (canDraw) {
            draggedPoints.push({ x: e.x, y: e.y });
            drawingLine.attr('d', lineGenerator(draggedPoints));
            drawingLineTarget.attr('d', lineGenerator(draggedPoints));
        }
    }

    function onDragEnd() {
        if (canDraw) {
            let result = getPointsFromLine(drawingLine, lineResolution);
            drawingLine.attr('d', lineGenerator(result));
            drawingLineTarget.attr('d', lineGenerator(result));

            drawFinishedCallback(result, drawingLine.clone(), drawingLineTarget.clone());

            draggedPoints = [];
            drawingLine.attr('d', lineGenerator([]));
            drawingLineTarget.attr('d', lineGenerator([]));

        }
    }

    function remapPointsWithResolution(points, resolution) {
        let line = drawingLine.clone().attr('d', lineGenerator(points));
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

    return {
        setCanDraw: (draw) => canDraw = draw,
        setOnDrawFinished: (callback) => drawFinishedCallback = callback,
        lineGenerator,
        setLineResolution: (resolution) => lineResolution = resolution,
        remapPointsWithResolution,
    }
}
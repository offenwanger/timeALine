let createLineDrawer = function (svg) {
    let isDrawing = false;
    let drawFinishedCallback = () => { };
    let draggedPoints = [];

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

    var lineGenerator = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

    function onDragged(e) {
        if (isDrawing) {
            draggedPoints.push({ x: e.x, y: e.y });
            drawingLine.attr('d', lineGenerator(draggedPoints));
            drawingLineTarget.attr('d', lineGenerator(draggedPoints));
        }
    }

    function onDragEnd() {
        if (isDrawing) {
            let result = [];
            for (let i = 0; i < draggedPoints.length; i += 10) {
                result.push(draggedPoints[i]);
            }

            drawingLine.attr('d', lineGenerator(result));
            drawingLineTarget.attr('d', lineGenerator(result));

            drawFinishedCallback(result, drawingLine.clone(), drawingLineTarget.clone());
            draggedPoints = [];

            drawingLine.attr('d', lineGenerator([]));
            drawingLineTarget.attr('d', lineGenerator([]));

        }
    }

    return {
        setIsDrawing: (draw) => isDrawing = draw,
        setOnDrawFinished: (callback) => drawFinishedCallback = callback,
    }
}
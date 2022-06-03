
function BrushController(svg) {
    let mActive = false;
    let mDrawFinishedCallback = () => { };
    let mDraggedPoints = [];
    let mLineResolution = 50;

    let lineDrawingGroup = svg.append('g')
        .style("visibility", 'hidden');

    lineDrawingGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.2')
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

    function onDragged(e) {
        if (mActive) {
            mDraggedPoints.push({ x: e.x, y: e.y });
            drawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onDragEnd() {
        if (mActive) {
            let result = getPointsFromLine(drawingLine, mLineResolution);

            mDrawFinishedCallback(result);

            mDraggedPoints = [];
            drawingLine.attr('d', PathMath.getPathD([]));
        }
    }


    function getPointsFromLine(line, resolution) {
        let result = [];
        for (let len = 0; len < line.node().getTotalLength(); len += resolution) {
            result.push(line.node().getPointAtLength(len));
        }
        result.push(line.node().getPointAtLength(line.node().getTotalLength()));
        return result.map(p => { return { x: p.x, y: p.y }; });
    }

    this.setActive = function (active) {
        if (active && !mActive) {
            mActive = true;
            lineDrawingGroup.style('visibility', "");

            // TODO add extension nodes.
        } else if (!active && mActive) {
            mActive = false;
            lineDrawingGroup.style('visibility', "hidden");
        }
    }

    this.redistributePoints = function (points, resolution) {
        let line = drawingLine.clone().attr('d', PathMath.getPathD(points));
        let result = getPointsFromLine(line, resolution);
        line.remove();
        return result;
    }

    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
}

function EraserController(svg) {

}

function DragController(svg) {

}

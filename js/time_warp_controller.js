function TimeWarpController(svg) {
    const TAIL_LENGTH = 50;

    let mTailGroup = svg.append('g');

    function addOrUpdateTimeControls(timelines) {
        timelines.forEach(timeline => {
            updateTails(timeline.id, timeline.linePath.points);
            // update warp controls
            // update ticks
        });
    }

    function updateTails(id, points) {
        let tail1 = mTailGroup.select('#timelineTail1_' + id).node()
            ? mTailGroup.select('#timelineTail1_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'black')
                .style('opacity', 0.5)
                .style("stroke-dasharray", ("5, 5"));

        let tail2 = mTailGroup.select('#timelineTail2_' + id).node()
            ? mTailGroup.select('#timelineTail2_' + id)
            : mTailGroup.append('line')
                .attr('id', 'timelineTail1_' + id)
                .attr('stroke-width', 1.5)
                .attr('stroke', 'black')
                .style('opacity', 0.5)
                .style("stroke-dasharray", ("5, 5"));

        let startPoint = points[0]
        let direction1 = PathMath.vectorFromAToB(points[1], startPoint);
        let tail1End = PathMath.getPointAtDistanceAlongVector(TAIL_LENGTH, direction1, startPoint);
        tail1.attr('x1', startPoint.x)
            .attr('y1', startPoint.y)
            .attr('x2', tail1End.x)
            .attr('y2', tail1End.y);

        let endPoint = points[points.length - 1]
        let direction2 = PathMath.vectorFromAToB(points[points.length - 2], endPoint);
        let tail2End = PathMath.getPointAtDistanceAlongVector(TAIL_LENGTH, direction2, endPoint);
        tail2.attr('x1', endPoint.x)
            .attr('y1', endPoint.y)
            .attr('x2', tail2End.x)
            .attr('y2', tail2End.y);
    }

    this.addOrUpdateTimeControls = addOrUpdateTimeControls;
}


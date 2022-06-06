function LineViewController(svg) {

    let lineGroup = svg.append('g');

    function drawTimeLines(linePaths) {
        let paths = lineGroup.selectAll('.timelinePath').data(linePaths.map(path => path.points));
        paths.enter().append('path')
            .classed('timelinePath', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        lineGroup.selectAll('.timelinePath').attr('d', (points) => PathMath.getPathD(points));

        let points = lineGroup.selectAll(".pointMarkerCircle").data(linePaths.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .classed("pointMarkerCircle", true)
            .attr("r", "1px")
            .attr("fill", "black")
            .style("opacity", 0.5);
        points.exit().remove();
        lineGroup.selectAll(".pointMarkerCircle")
            .attr("cx", function (d) { return d.x })
            .attr("cy", function (d) { return d.y })
    }

    this.drawTimeLines = drawTimeLines;
}
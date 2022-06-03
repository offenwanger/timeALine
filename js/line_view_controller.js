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
            .attr('d', (points) => PathGenerator.getPathD(points));
        paths.exit().remove();

        let points = lineGroup.selectAll(".pointMarkerCircle").data(linePaths.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .attr("cx", function (d) { return d.x })
            .attr("cy", function (d) { return d.y })
            .attr("r", "1px")
            .attr("fill", "black")
            .style("opacity", 0.5);
        points.exit().remove();
    }

    this.drawTimeLines = drawTimeLines;
}
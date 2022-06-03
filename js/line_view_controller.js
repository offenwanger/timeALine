function LineViewController(svg) {
    let mLineGenerator = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveCatmullRom.alpha(0.5));

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
            .attr('d', (points) => mLineGenerator(points));
        paths.exit().remove();
    }

    this.drawTimeLines = drawTimeLines;
}
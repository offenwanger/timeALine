function LineViewController(svg) {
    let mActive;
    let mLineClickedCallback = () => { };

    let mLineGroup = svg.append('g')
        .attr("id", 'line-view-g');
    let mTargetGroup = svg.append('g')
        .attr("id", 'line-view-target-g');

    function drawTimeLines(linePaths) {
        let paths = mLineGroup.selectAll('.timelinePath').data(linePaths.map(path => path.points));
        paths.enter().append('path')
            .classed('timelinePath', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.timelinePath').attr('d', (points) => PathMath.getPathD(points));

        let points = mLineGroup.selectAll(".pointMarkerCircle").data(linePaths.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .classed("pointMarkerCircle", true)
            .attr("r", "1px")
            .attr("fill", "black")
            .style("opacity", 0.5);
        points.exit().remove();
        mLineGroup.selectAll(".pointMarkerCircle")
            .attr("cx", function (d) { return d.x })
            .attr("cy", function (d) { return d.y })

        let targets = mTargetGroup.selectAll('.timelineTarget').data(linePaths);
        targets.enter().append('path')
            .classed('timelineTarget', true)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 50)
            .attr('opacity', '0')
            .on("click", (e, d) => {
                if (mActive) {
                    let mouseCoords = { x: e.x, y: e.y };
                    mLineClickedCallback(d.id, PathMath.getClosestPointOnPath(mouseCoords, d.points))
                }
            });
        targets.exit().remove();
        mTargetGroup.selectAll('.timelineTarget').attr('d', (path) => PathMath.getPathD(path.points));
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mTargetGroup.style('visibility', "hidden");
        }

        mActive = active;
    };

    this.drawTimeLines = drawTimeLines;
    this.setActive = setActive;
    this.setLineClickCallback = (callback) => mLineClickedCallback = callback;
}
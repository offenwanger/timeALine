function LineViewController(svg) {
    let mActive;
    let mLineClickedCallback = () => { };
    let mLineDragStartCallback = () => { };
    let mLineDragCallback = () => { };
    let mLineDragEndCallback = () => { };
    let mMouseOverCallback = () => { };
    let mMouseOutCallback = () => { };
    let mMouseMoveCallback = () => { };

    let mLineGroup = svg.append('g')
        .attr("id", 'line-view-g');
    let mTargetGroup = svg.append('g')
        .attr("id", 'line-view-target-g');

    let mDragging = false;
    let mDraggingData = null;

    $(document).on("pointermove", function (e) {
        e = e.originalEvent;
        if (mDragging && mActive) {
            onDrag('drag', e, mDraggingData);
        }
    });
    $(document).on("pointerup", function (e) {
        e = e.originalEvent;
        if (mDragging && mActive) {
            mDragging = false;
            onDrag('end', e, mDraggingData);
        }
    });

    function updateModel(model) {
        let linePaths = model.getAllTimelines();
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
            .attr('stroke-linecap', 'round')
            .attr('opacity', '0')
            .on("click", (e, d) => {
                if (mActive) {
                    let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                    mLineClickedCallback(d.id, PathMath.getClosestPointOnPath(mouseCoords, d.points))
                }
            })
            .on('mouseover', (e, d) => {
                if (mActive) {
                    let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                    mMouseOverCallback(d.id, mouseCoords)
                }
            })
            .on('mousemove', (e, d) => {
                if (mActive) {
                    let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                    mMouseMoveCallback(d.id, mouseCoords)
                }
            })
            .on('mouseout', (e, d) => {
                if (mActive) {
                    let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                    mMouseOutCallback(d.id, mouseCoords)
                }
            })
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDraggingData = d;
                    onDrag('start', e, d);
                }
            })

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

    function onDrag(drag, e, d) {
        let callback;
        switch (drag) {
            case 'start':
                callback = mLineDragStartCallback;
                break;
            case 'drag':
                callback = mLineDragCallback;
                break;
            case 'end':
                callback = mLineDragEndCallback;
                break;
        }

        callback(d.id, { x: e.x, y: e.y }, PathMath.getClosestPointOnPath({ x: e.x, y: e.y }, d.points));
    }

    this.updateModel = updateModel;
    this.setActive = setActive;
    this.setLineClickCallback = (callback) => mLineClickedCallback = callback;
    this.setLineDragStartCallback = (callback) => mLineDragStartCallback = callback;
    this.setLineDragCallback = (callback) => mLineDragCallback = callback;
    this.setLineDragEndCallback = (callback) => mLineDragEndCallback = callback;
    this.setMouseOverCallback = (callback) => mMouseOverCallback = callback;
    this.setMouseMoveCallback = (callback) => mMouseMoveCallback = callback;
    this.setMouseOutCallback = (callback) => mMouseOutCallback = callback;
}
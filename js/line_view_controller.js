function LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer) {
    let mActive = false;
    let mLineClickedCallback = () => { };
    let mLineDragStartCallback = () => { };
    let mLineDragCallback = () => { };
    let mLineDragEndCallback = () => { };
    let mMouseOverCallback = () => { };
    let mMouseOutCallback = () => { };
    let mMouseMoveCallback = () => { };

    let mLineGroup = mVizLayer.append('g')
        .attr("id", 'line-view-g');
    let mTargetGroup = mInteractionLayer.append('g')
        .attr("id", 'line-view-target-g')
        .style('visibility', "hidden");

    let mDragging = false;
    let mDraggingData = null;

    function updateModel(model) {
        let timelines = model.getAllTimelines();

        drawPlainLines(timelines.filter(timeline => timeline.timePins.filter(pin => pin.timeStamp).length == 0));
        drawWarpedLines(timelines.filter(timeline => timeline.timePins.filter(pin => pin.timeStamp).length > 0), model);

        drawLineTargets(timelines);
    }

    function drawPlainLines(timelines) {
        let paths = mLineGroup.selectAll('.timelinePath').data(timelines);
        paths.enter().append('path')
            .classed('timelinePath', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.timelinePath').attr('d', (timeline) => PathMath.getPathD(timeline.points));

        let points = mLineGroup.selectAll(".pointMarkerCircle").data(timelines.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .classed("pointMarkerCircle", true)
            .attr("r", "1px")
            .attr("fill", "#4278B0")
            .style("opacity", 0.5);
        points.exit().remove();
        mLineGroup.selectAll(".pointMarkerCircle")
            .attr("cx", function (d) { return d.x })
            .attr("cy", function (d) { return d.y })
    }

    function drawWarpedLines(timelines, model) {
        let allSegments = [];
        timelines.forEach(timeline => {
            let timePins = model.getTimeBindingValues(timeline);
            if (!timePins[0].linePercent) {
                timePins[0].linePercent = 0;
            }
            if (!timePins[timePins.length - 1].linePercent) {
                timePins[timePins.length - 1].linePercent = 1;
            }
            timePins = timePins.filter(pin => pin.linePercent || pin.linePercent == 0);
            timePins.sort((a, b) => a.linePercent - b.linePercent);

            let segments = getDrawingSegments(timeline, timePins);
            segments.forEach(segment => segment.id = timeline.id);
            allSegments.push(...segments);
        });

        let paths = mLineGroup.selectAll('.warped-timeline-path').data(allSegments);
        paths.enter().append('path')
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.warped-timeline-path')
            .attr('opacity', (segment) => segment.label)
            .attr('d', (segment) => PathMath.getPathD(segment.points));
    }

    function drawWarpedTimeline(timeline, timePins) {
        d3.selectAll(".warped-timeline-path").filter(function (d) { return d.id == timeline.id; }).remove();
        d3.selectAll(".timelinePath").filter(function (d) { return d.id == timeline.id; }).remove();
        d3.selectAll(".temp").remove();

        let segments = getDrawingSegments(timeline, timePins);
        mLineGroup.selectAll(".temp")
            .data(segments)
            .enter()
            .append('path')
            .classed('temp', true)
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
            .attr('opacity', (segment) => segment.label)
            .attr('d', (segment) => PathMath.getPathD(segment.points));
    }

    function getDrawingSegments(timeline, timePins) {
        let timeRatios = [];
        for (let i = 1; i < timePins.length; i++) {
            timeRatios.push((timePins[i].timeStamp - timePins[i - 1].timeStamp) / (timePins[i].linePercent - timePins[i - 1].linePercent));
        }
        let minRatio = Math.min(...timeRatios);
        let maxRatio = Math.max(...timeRatios);
        let opacityValues = [];
        for (let i = 0; i < timeRatios.length; i++) {
            opacityValues.push(((timeRatios[i] - minRatio) / (maxRatio - minRatio)) * 0.8 + 0.2);
        }

        return PathMath.segmentPath(timeline.points, function (point, percent) {
            if (percent >= timePins[timePins.length - 1].linePercent) {
                return opacityValues[opacityValues.length - 1]
            }

            for (let i = 0; i < timePins.length; i++) {
                if (percent < timePins[i].linePercent) {
                    if (i == 0) {
                        return opacityValues[i];
                    } else {
                        return opacityValues[i - 1];
                    }
                }
            }

            console.error("Code should be unreachable! Should have returned by now!");
            return 1;
        });
    }

    function drawLineTargets(timelines) {
        let targets = mTargetGroup.selectAll('.timelineTarget').data(timelines);
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
                    mMouseOverCallback(e, d.id)
                }
            })
            .on('mouseout', (e, d) => {
                if (mActive) {
                    mMouseOutCallback(e, d.id)
                }
            })
            .on('mousemove', (e, d) => {
                if (mActive) {
                    mMouseMoveCallback(e, d.id)
                }
            })
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDraggingData = d;
                    mLineDragStartCallback(d.id, e);
                }
            })

        targets.exit().remove();
        mTargetGroup.selectAll('.timelineTarget').attr('d', (timeline) => PathMath.getPathD(timeline.points));
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


    function onPointerMove(coords) {
        if (mDragging && mActive) {
            mLineDragCallback(mDraggingData.id, PathMath.getClosestPointOnPath(coords, mDraggingData.points));
        }
    }

    function onPointerUp(coords) {
        if (mDragging && mActive) {
            mDragging = false;
            mLineDragEndCallback(mDraggingData.id, PathMath.getClosestPointOnPath(coords, mDraggingData.points));
        }
    }

    this.updateModel = updateModel;
    this.drawWarpedTimeline = drawWarpedTimeline;
    this.setActive = setActive;
    this.setLineClickCallback = (callback) => mLineClickedCallback = callback;
    this.setLineDragStartCallback = (callback) => mLineDragStartCallback = callback;
    this.setLineDragCallback = (callback) => mLineDragCallback = callback;
    this.setLineDragEndCallback = (callback) => mLineDragEndCallback = callback;
    this.setMouseOverCallback = (callback) => mMouseOverCallback = callback;
    this.setMouseMoveCallback = (callback) => mMouseMoveCallback = callback;
    this.setMouseOutCallback = (callback) => mMouseOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
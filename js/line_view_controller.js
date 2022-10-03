function LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer) {
    let mLineStyle = LineStyle.STYLE_DASHED;

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
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.timelinePath')
            .attr('stroke', (timeline) => timeline.color)
            .attr('d', (timeline) => PathMath.getPathD(timeline.points));

        if (mLineStyle == LineStyle.STYLE_DASHED) {
            mLineGroup.selectAll('.timelinePath')
                .style("stroke-dasharray", "15, 4, 1, 4, 1, 4")
        }

        let points = mLineGroup.selectAll(".pointMarkerCircle").data(timelines.map(path => path.points).flat())
        points.enter()
            .append("circle")
            .classed("pointMarkerCircle", true)
            .attr("r", "1px")
            .attr("fill", "#000000")
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
            segments.forEach(segment => {
                segment.timelineId = timeline.id;
                segment.color = timeline.color;
            });
            allSegments.push(...segments);
        });

        if (mLineStyle == LineStyle.STYLE_DASHED) {
            drawDashedLines(allSegments);
        } else if (mLineStyle == LineStyle.STYLE_OPACITY) {
            drawSemiOpaqueLines(allSegments);
        } else console.error("Unimplimented line style: " + mLineStyle)
    }

    function drawWarpedTimeline(timeline, timePins) {
        d3.selectAll(".warped-timeline-path").filter(function (d) { return d.timelineId == timeline.id; }).remove();
        d3.selectAll(".timelinePath").filter(function (d) { return d.id == timeline.id; }).remove();

        let segments = getDrawingSegments(timeline, timePins);
        segments.forEach(segment => {
            segment.timelineId = timeline.id;
            segment.color = timeline.color;
        });

        if (mLineStyle == LineStyle.STYLE_DASHED) {
            drawDashedLines(segments, false);
        } else if (mLineStyle == LineStyle.STYLE_OPACITY) {
            drawSemiOpaqueLines(segments, false);
        } else console.error("Unimplimented line style: " + mLineStyle)
    }

    function drawSemiOpaqueLines(segmentData, overwrite = true) {
        segmentData.forEach(s => {
            s.opacity = s.label * 2;
        })

        let paths = mLineGroup.selectAll('.warped-timeline-path');
        if (overwrite) {
            paths = paths.data(segmentData);
        } else {
            let oldData = paths.data();
            paths = paths.data(oldData.concat(segmentData));
        }

        paths.enter().append('path')
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.warped-timeline-path')
            .attr('stroke', d => d.color)
            .attr('opacity', d => d.opacity)
            .attr('d', d => PathMath.getPathD(d.points));
    }

    function drawDashedLines(segmentData, overwrite = true) {
        segmentData.forEach(s => {
            s.indicatorStroke = 180 * Math.exp(-4 * s.label);
        })

        let paths = mLineGroup.selectAll('.warped-timeline-path');
        if (overwrite) {
            paths = paths.data(segmentData);
        } else {
            let oldData = paths.data();
            paths = paths.data(oldData.concat(segmentData));
        }

        paths.enter().append('path')
            .classed('warped-timeline-path', true)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
        paths.exit().remove();
        mLineGroup.selectAll('.warped-timeline-path')
            .attr('stroke', d => d.color)
            .style("stroke-dasharray", d => d.indicatorStroke + ", 4, 1, 4, 1, 4")
            .attr('d', d => PathMath.getPathD(d.points));
    }

    function getDrawingSegments(timeline, timePins) {
        let ratioValues = [];
        for (let i = 1; i < timePins.length; i++) {
            let percentOfTime = (timePins[i].timeStamp - timePins[i - 1].timeStamp) / (timePins[timePins.length - 1].timeStamp - timePins[0].timeStamp);
            percentOfTime = Math.max(Math.round(100 * percentOfTime) / 100, 0.01);
            let percentOfLine = (timePins[i].linePercent - timePins[i - 1].linePercent);
            percentOfLine = Math.max(Math.round(100 * percentOfLine) / 100, 0.01);
            let ratio = Math.log10(percentOfTime / percentOfLine)
            let ratioValue = ratio / 4 + 0.5;
            ratioValues.push(ratioValue)
        }

        return PathMath.segmentPath(timeline.points, function (point, percent) {
            if (percent >= timePins[timePins.length - 1].linePercent) {
                return ratioValues[ratioValues.length - 1]
            }

            for (let i = 0; i < timePins.length; i++) {
                if (percent < timePins[i].linePercent) {
                    if (i == 0) {
                        return ratioValues[i];
                    } else {
                        return ratioValues[i - 1];
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
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragging = true;
                    mDraggingData = d;
                    mLineDragStartCallback(d.id, e);
                }
            })
            .on('mouseover', (e, d) => {
                if (mActive) {
                    mMouseOverCallback(e, d.id)
                }
            })
            .on('mousemove', (e, d) => {
                if (mActive) {
                    mMouseMoveCallback(e, d.id)
                }
            })
            .on('mouseout', (e, d) => {
                if (mActive) {
                    mMouseOutCallback(e, d.id)
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

    function toggleStyle(model) {
        if (mLineStyle == LineStyle.STYLE_DASHED) {
            mLineStyle = LineStyle.STYLE_OPACITY;
        } else {
            mLineStyle = LineStyle.STYLE_DASHED;
        }

        d3.selectAll(".warped-timeline-path").remove();
        d3.selectAll(".timelinePath").remove();

        updateModel(model);
    }


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
    this.toggleStyle = toggleStyle;
    this.setLineDragStartCallback = (callback) => mLineDragStartCallback = callback;
    this.setLineDragCallback = (callback) => mLineDragCallback = callback;
    this.setLineDragEndCallback = (callback) => mLineDragEndCallback = callback;
    this.setMouseOverCallback = (callback) => mMouseOverCallback = callback;
    this.setMouseMoveCallback = (callback) => mMouseMoveCallback = callback;
    this.setMouseOutCallback = (callback) => mMouseOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
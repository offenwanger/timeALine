function LensController(svg) {
    const MODE_DEFAULT = "default";
    const MODE_PAN = "pan";

    let mSvg = svg;

    let mMode = MODE_DEFAULT;
    let mModel;
    let mTimelineId;

    let viewG = svg.append("g")
        .attr("id", "lens-main-view-g");
    setPan(0, 0);

    let mLineG = viewG.append("g").attr("id", "lens-line-g");
    let mAnnotationG = viewG.append("g").attr("id", "lens-annotations-g");
    let mPointsG = viewG.append("g").attr("id", "lens-points-g");
    let mStrokesG = viewG.append("g").attr("id", "lens-strokes-g");

    let mPanning = false;

    let panCapture = svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', svg.attr('height'))
        .attr('width', svg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .style('display', 'none')
        .on("pointerdown", function (event) {
            // TODO: Should check what's down here (i.e. many fingers? Right Click?)
            if (mMode == MODE_PAN) {
                mPanning = true;
            }
        })
        .on("pointermove", function (event) {
            if (mMode == MODE_PAN && mPanning) {
                let currData = viewG.datum();
                setPan(currData.x + event.movementX, currData.y + event.movementY);
            }
        })
        .on("pointerup", function (event) {
            // TODO: Should check if this is indeed all fingers off
            mPanning = false;
        });

    // efficiency variable
    let mLineLength;

    function focus(timelineId, percent) {
        if (!timelineId) {
            mTimelineId = null;

            eraseLine();
            eraseWarpBindings();
            eraseDataPoints();
            eraseAnnotations();
            eraseStrokes();

            setPan(0, 0);
        } else {
            if (mTimelineId != timelineId) {
                mTimelineId = timelineId;
                completeRedraw();
            }

            setPan(-(percent * mLineLength - svg.attr("width") / 2), svg.attr("height") / 2);
        }
    }

    function setPan(x, y) {
        viewG.datum({ x, y })
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    }

    // redraws everything. 
    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;

        if (!mTimelineId) return;

        let oldTimeline = oldModel.getTimelineById(mTimelineId);
        let timeline = mModel.getTimelineById(mTimelineId);

        if (!PathMath.equalsPath(oldTimeline.points, timeline.points)) {
            completeRedraw();
        } else if (true /*warp bindings have changed*/) {
            redrawWarpBindings();
            redrawDataPoints();
            redrawAnnotations();
            redrawStrokes();
        } else {
            if (true /*annotations changed*/) {

            }

            if (true /*data points changed*/) {

            }

            if (true /*strokes changed*/) {

            }
        }
    }

    function completeRedraw() {
        let timeline = mModel.getTimelineById(mTimelineId);
        mLineLength = PathMath.getPathLength(timeline.points);

        redrawLine(mLineLength);
        redrawWarpBindings();
        redrawDataPoints();
        redrawAnnotations();
        redrawStrokes();
    }

    function redrawLine(lineLength) {
        mLineG.selectAll("#lens-line")
            .data([null]).enter().append("line")
            .attr("id", "lens-line")
            // TODO: switch this out for a chosen color at some point
            .attr("stroke", "steelblue")
            .attr("stroke-width", 5)
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("y2", 0);
        mLineG.select("#lens-line")
            .attr("x2", lineLength);
    }
    function eraseLine() {
        mLineG.select("#lens-line").remove();
    }

    function redrawWarpBindings() {

    }

    function eraseWarpBindings() {

    }

    function redrawDataPoints() {
        // draw any data points that are in the range we are showing
        // we are showing length at a 1-1, 
        // Data can be drawn at it's distance based on the axis

    }
    function eraseDataPoints() {

    }

    function redrawAnnotations() {
        // get the annotation's distance from it's point on the line, draw a marker
        // clicking the marker makes the text pop up. any other click closes it. 

    }
    function eraseAnnotations() {

    }

    function redrawStrokes() {
        // draw any strokes where part of the stroke in in the visible area

    }
    function eraseStrokes() {

    }

    function setPanActive(active) {
        if (active) {
            resetMode();
            mMode = MODE_PAN;
            panCapture.style('display', '');
        } else if (mMode == MODE_PAN) {
            // only set to default if we were in pan mode.
            resetMode();
        }
    }

    function resetMode() {
        if (mMode == MODE_PAN) {
            panCapture.style('display', 'none');
        }
        mMode = MODE_DEFAULT;
    }

    function mapPointsToCurrentTimeline(points) {
        // TODO: account for rotation        
        return points.map(p => {
            return new DataStructs.StrokePoint((p.x - viewG.datum().x) / mLineLength, /*not sure about this*/ viewG.datum().y - p.y)
        })
    }

    this.focus = focus;
    this.updateModel = updateModel;

    this.getCurrentTimelineId = () => mTimelineId;
    this.mapPointsToCurrentTimeline = mapPointsToCurrentTimeline;

    this.setPanActive = setPanActive;
    this.resetMode = resetMode;
}
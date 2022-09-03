function LensController(svg) {
    let mModel;
    let mTimelineId;
    let mFocusPercent = 0;

    let mLineG = svg.append("g").attr("id", "lens-line-g");
    let mAnnotationG = svg.append("g").attr("id", "lens-annotations-g");
    let mPointsG = svg.append("g").attr("id", "lens-points-g");
    let mStrokesG = svg.append("g").attr("id", "lens-strokes-g");

    // efficiency variable
    let mLineLength;

    // redraws everything. 
    function draw(model, timelineId = null) {
        if (!timelineId && !mTimelineId) return;
        if (!timelineId) timelineId = mTimelineId;

        eraseLine();
        eraseAnnotations();
        eraseDataPoints();
        eraseStrokes();

        let newTimeline = model.getAllTimelines().find(t => t.id == timelineId);

        if (!newTimeline) {
            // presumably our previous timeline got deleted
            // clear out everything
            mModel = null;
            mTimelineId = null;
            return;
        }

        mModel = model;
        mTimelineId = timelineId;

        let timeline = mModel.getAllTimelines().find(t => t.id == mTimelineId);
        let mLineLength = PathMath.getPathLength(timeline.points);
        drawLine(mLineLength);
        drawDataPoints();
        drawAnnotations();
        drawStrokes();
    }

    function drawLine(lineLength) {
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

    function drawDataPoints() {
        // draw any data points that are in the range we are showing
        // we are showing length at a 1-1, 
        // Data can be drawn at it's distance based on the axis

    }
    function eraseDataPoints() {

    }

    function drawAnnotations() {
        // get the annotation's distance from it's point on the line, draw a marker
        // clicking the marker makes the text pop up. any other click closes it. 

    }
    function eraseAnnotations() {

    }

    function drawStrokes() {
        // draw any strokes where part of the stroke in in the visible area

    }
    function eraseStrokes() {

    }

    function focus(percent) {

    }

    this.focus = focus;
    this.update = draw;
}
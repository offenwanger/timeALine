function LensController(svg) {
    const MODE_DEFAULT = "default";
    const MODE_PAN = "pan";

    let mSvg = svg;

    let mPanCallback = () => { };

    let mMode = MODE_DEFAULT;
    let mModel;
    let mTimelineId;

    let mLineLength;
    let mStrokesData = {}

    let viewGroup = svg.append("g")
        .attr("id", "lens-main-view-g");
    setPan(0, 0);

    let mLineG = viewGroup.append("g").attr("id", "lens-line-g");
    let mAnnotationGroup = viewGroup.append("g").attr("id", "lens-annotations-g");
    let mPointsGroup = viewGroup.append("g").attr("id", "lens-points-g");
    let mStrokeGroup = viewGroup.append("g").attr("id", "lens-strokes-g");

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

    $(document).on("pointermove", function (event) {
        event = event.originalEvent;
        if (mMode == MODE_PAN && mPanning) {
            let currData = viewGroup.datum();
            setPan(currData.x + event.movementX, currData.y + event.movementY);
        }
    });
    $(document).on("pointerup", function () {
        // TODO: Should check if this is indeed all fingers off
        let currData = viewGroup.datum();
        mPanCallback(mTimelineId, (mSvg.attr("width") / 2 - currData.x) / mLineLength, -(mSvg.attr("height") / 2) + currData.y)
        mPanning = false;
    });

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

                let timeline = mModel.getTimelineById(mTimelineId);
                mLineLength = PathMath.getPathLength(timeline.points);
                redrawLine(mLineLength);

                redrawStrokes(mModel, null, true);
            }

            setPan(-(percent * mLineLength - svg.attr("width") / 2), svg.attr("height") / 2);
        }
    }

    function setPan(x, y) {
        viewGroup.datum({ x, y })
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    }

    // redraws everything. 
    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;

        if (!mTimelineId) return;

        let timeline = mModel.getTimelineById(mTimelineId);

        if (!timeline) {
            // timeline got erased

            eraseLine();
            eraseWarpBindings();
            eraseDataPoints();
            eraseAnnotations();
            eraseStrokes();

            setPan(0, 0);
            return;
        }

        let oldTimeline = oldModel.getTimelineById(mTimelineId);

        let pathChanged = !PathMath.equalsPath(oldTimeline.points, timeline.points);
        if (pathChanged) {
            let timeline = mModel.getTimelineById(mTimelineId);
            mLineLength = PathMath.getPathLength(timeline.points);
            redrawLine(mLineLength);
        }

        redrawStrokes(model, oldModel, pathChanged);
    }

    function redrawLine(lineLength) {
        mLineG.selectAll("#lens-line")
            .data([null]).enter().append("line")
            .attr("id", "lens-line")
            // TODO: switch this out for a chosen color at some point
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
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

    function redrawStrokes(newModel, oldModel, redrawEverything) {
        let oldStrokeData = mStrokesData;
        let oldStrokes = redrawEverything ? null : oldModel.getTimelineById(mTimelineId).annotationStrokes;

        mStrokesData = {}

        let timeline = newModel.getTimelineById(mTimelineId);
        timeline.annotationStrokes.forEach(stroke => {
            let recalc = true;
            if (!redrawEverything) {
                let oldStroke = oldStrokes.find(s => s.id == stroke.id);
                if (oldStroke && oldStroke.equals(stroke)) {
                    recalc = false
                }
            }

            if (recalc) {
                mStrokesData[stroke.id] = calculateStrokeData(stroke);
            } else {
                mStrokesData[stroke.id] = oldStrokeData[stroke.id];
            }
        });


        let selection = mStrokeGroup.selectAll(".lens-annotation-stroke").data(Object.values(mStrokesData));
        selection.exit()
            .remove();
        selection.enter()
            .append("path")
            .classed("lens-annotation-stroke", true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
        mStrokeGroup.selectAll(".lens-annotation-stroke")
            .attr("stroke", d => d.color)
            .attr('d', d => PathMath.getPathD(d.projectedPoints));
    }
    function eraseStrokes() {
        mStrokeGroup.selectAll(".lens-annotation-stroke").remove();
    }

    function calculateStrokeData(stroke) {
        let projectedPoints = stroke.points.map(point => {
            return PathMath.getPositionForPercentAndDist([{ x: 0, y: 0 }, { x: mLineLength, y: 0 }], point.linePercent, point.lineDist);
        })

        return { color: stroke.color, projectedPoints };
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
            return new DataStructs.StrokePoint((p.x - viewGroup.datum().x) / mLineLength, viewGroup.datum().y - p.y)
        })
    }

    this.focus = focus;
    this.updateModel = updateModel;

    this.getCurrentTimelineId = () => mTimelineId;
    this.mapPointsToCurrentTimeline = mapPointsToCurrentTimeline;

    this.setPanActive = setPanActive;
    this.setPanCallback = (callback) => mPanCallback = callback;
    this.resetMode = resetMode;
}
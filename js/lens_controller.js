function LensController(svg, externalModelController, externalModelUpdated) {
    const MODE_DEFAULT = "default";
    const MODE_PAN = "pan";
    const MODE_COLOR_BRUSH = "colorBrush";

    let mSvg = svg;
    let mModelController = externalModelController;
    let mVizLayer = svg.append("g")
        .attr("id", "lens-main-view-g");
    let mVizOverlayLayer = mSvg.append("g").attr("id", "main-canvas-interaction-layer");
    let mInteractionLayer = mSvg.append("g").attr("id", "main-interaction-layer");

    let mPanCallback = () => { };

    let mMode = MODE_DEFAULT;
    let mModel;
    let mTimelineId;

    let mLineLength;
    let mStrokesData = {}

    let mViewTransform = {};
    resetViewTransform();

    let mLineG = mVizLayer.append("g").attr("id", "lens-line-g");
    let mAnnotationGroup = mVizLayer.append("g").attr("id", "lens-annotations-g");
    let mPointsGroup = mVizLayer.append("g").attr("id", "lens-points-g");
    let mStrokeGroup = mVizLayer.append("g").attr("id", "lens-strokes-g");

    let mPanning = false;

    let mLensColorBrushController = new ColorBrushController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLensColorBrushController.setDrawFinishedCallback((points, color) => {
        if (mTimelineId) {
            let mappedPoints = mapPointsToPercentDist(points)
            mModelController.addTimelineStroke(mTimelineId, mappedPoints, color);

            modelUpdated();
        }
    })

    // needs to go after controllers so it's on top
    mVizOverlayLayer.append('rect')
        .attr('id', "lens-overlay")
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', mSvg.attr('height'))
        .attr('width', mSvg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .on('pointerdown', function (pointerEvent) {
            if (mMode == MODE_PAN) {
                // TODO: Should check what's down here (i.e. many fingers? Right Click?)
                mPanning = true;
            }

            let coords = screenToSvgCoords({ x: pointerEvent.x, y: pointerEvent.y });
            mLensColorBrushController.onPointerDown(coords);
        })

    $(document).on("pointermove", function (e) {
        let pointerEvent = e.originalEvent;
        if (mMode == MODE_PAN && mPanning) {
            mViewTransform.x = mViewTransform.x + pointerEvent.movementX
            mViewTransform.y = mViewTransform.y + pointerEvent.movementY
            setViewToTransform();
        }

        // these do their own active checking
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        mLensColorBrushController.onPointerMove(coords)
    });
    $(document).on("pointerup", function (e) {
        let pointerEvent = e.originalEvent;

        // TODO: Should check if this is indeed all fingers off

        if (mPanning) {
            mPanCallback(
                mTimelineId,
                (mSvg.attr('width') / 2 - mViewTransform.x) / mLineLength,
                -(mSvg.attr('height') / 2) + mViewTransform.y);
            mPanning = false;
        }

        // these do their own active checking
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        mLensColorBrushController.onPointerUp(coords)
    });


    function screenToSvgCoords(coords) {
        let svgElementCoords = svg.node().getBoundingClientRect();
        let x = coords.x - svgElementCoords.x - mViewTransform.x;
        let y = coords.y - svgElementCoords.y - mViewTransform.y;
        return { x, y };
    }

    function svgCoordsToScreenCoords(coords) {
        let svgElementCoords = svg.node().getBoundingClientRect();
        let x = coords.x + svgElementCoords.x + mViewTransform.x;
        let y = coords.y + svgElementCoords.y + mViewTransform.y;
        return { x, y };
    }

    function modelUpdated() {
        externalModelUpdated();
    }

    function focus(timelineId, percent) {
        if (!timelineId) {
            mTimelineId = null;

            eraseLine();
            eraseWarpBindings();
            eraseDataPoints();
            eraseAnnotations();
            eraseStrokes();

            resetViewTransform()
        } else {
            if (mTimelineId != timelineId) {
                mTimelineId = timelineId;

                let timeline = mModel.getTimelineById(mTimelineId);
                mLineLength = PathMath.getPathLength(timeline.points);
                redrawLine(mLineLength);

                redrawStrokes(mModel, null, true);
            }

            mViewTransform.x = -(percent * mLineLength - svg.attr('width') / 2);
            mViewTransform.y = svg.attr('height') / 2;
            setViewToTransform();
        }
    }

    function resetViewTransform() {
        mViewTransform.x = 0;
        mViewTransform.y = 0;
        mViewTransform.rotation = 0;
        setViewToTransform();
    }

    function setViewToTransform() {
        mVizLayer.attr("transform", "translate(" + mViewTransform.x + "," + mViewTransform.y + ")");
        mInteractionLayer.attr("transform", "translate(" + mViewTransform.x + "," + mViewTransform.y + ")");
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

            resetViewTransform();
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
        } else if (mMode == MODE_PAN) {
            // only set to default if we were in pan mode.
            resetMode();
        }
    }

    function setColorBrushActive(active) {
        if (active) {
            resetMode();
            mMode = MODE_COLOR_BRUSH;
            mLensColorBrushController.setActive(active);
        } else if (mMode == MODE_COLOR_BRUSH) {
            // only set to default if we were brush mode.
            resetMode();
        }
    }

    function resetMode() {
        if (mMode == MODE_COLOR_BRUSH) {
            mLensColorBrushController.setActive(false);
        }
        mMode = MODE_DEFAULT;
    }

    function mapPointsToPercentDist(points) {
        return points.map(p => {
            return new DataStructs.StrokePoint(p.x / mLineLength, -p.y)
        })
    }

    this.focus = focus;
    this.updateModel = updateModel;

    this.getCurrentTimelineId = () => mTimelineId;

    this.setPanActive = setPanActive;
    this.setColorBrushActive = setColorBrushActive;
    this.resetMode = resetMode;

    this.setColor = (color) => mLensColorBrushController.setColor(color);

    this.setPanCallback = (callback) => mPanCallback = callback;
}
function LensController(svg, externalModelController, externalModelUpdated) {
    const MODE_DEFAULT = "default";
    const MODE_PAN = "pan";
    const MODE_COLOR_BRUSH = "colorBrush";

    let mSvg = svg;
    let mModelController = externalModelController;
    let mVizLayer = svg.append("g")
        .attr("id", "lens-main-view-g");
    let mVizOverlayLayer = mSvg.append("g")
        .attr("id", "lens-viz-overlay-layer");
    let mInteractionLayer = mSvg.append("g")
        .attr("id", "lens-interaction-layer");

    let mPanCallback = () => { };

    let mMode = MODE_DEFAULT;
    let mModel;
    let mTimelineId;

    let mLineLength;
    let mStrokesData = {}

    let mViewTransform = {};
    resetViewTransform();

    let mLineGroup = mVizLayer.append("g").attr("id", "lens-line-g");
    let mTextGroup = mVizLayer.append("g").attr("id", "lens-annotations-g");
    let mPointsGroup = mVizLayer.append("g").attr("id", "lens-points-g");
    let mStrokeGroup = mVizLayer.append("g").attr("id", "lens-strokes-g");
    let mPinGroup = mVizLayer.append("g").attr("id", "lens-pins-g");

    let mPanning = false;

    let mLensColorBrushController = new ColorBrushController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLensColorBrushController.setDrawFinishedCallback((points, color) => {
        if (mTimelineId) {
            let model = mModelController.getModel();
            let timelineHasMapping = model.hasTimeMapping(mTimelineId);
            let mappedPoints = points.filter(p => p.x <= mLineLength && p.x >= 0).map(p => {
                let point = new DataStructs.StrokePoint(-p.y);
                let linePercent = point.linePercent = p.x / mLineLength;
                if (timelineHasMapping) {
                    point.timeStamp = model.mapLinePercentToTime(mTimelineId, linePercent);
                } else {
                    point.timePercent = model.mapLinePercentToTime(mTimelineId, linePercent);
                }
                return point;
            })

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
        if (isNaN(parseInt(coords.x)) || isNaN(parseInt(coords.y))) {
            console.error("Bad coords", coords);
            return { x: 0, y: 0 };
        }

        let svgElementCoords = svg.node().getBoundingClientRect();
        if (isNaN(parseInt(svgElementCoords.x)) || isNaN(parseInt(svgElementCoords.y))) {
            console.error("Bad svg bounding box!", svgElementCoords);
            return { x: 0, y: 0 };
        }

        if (isNaN(parseInt(mViewTransform.x)) || isNaN(parseInt(mViewTransform.y))) {
            console.error("Bad veiw state!", mViewTransform);
            return { x: 0, y: 0 };
        }

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

    function getCurrentCenterPercent() {
        if (!mTimelineId) {
            return 0;
        } else {
            return (mSvg.attr('width') / 2 - mViewTransform.x) / mLineLength;
        }
    }

    function modelUpdated() {
        externalModelUpdated();
    }

    function focus(timelineId, percent) {
        if (!timelineId) {
            mTimelineId = null;

            eraseLine();
            eraseTimePins();
            eraseDataPoints();
            eraseTextData();
            eraseStrokes();

            resetViewTransform()
        } else {
            if (mTimelineId != timelineId) {
                mTimelineId = timelineId;

                let timeline = mModel.getTimelineById(mTimelineId);
                mLineLength = PathMath.getPathLength(timeline.points);
                redrawLine(mLineLength, timeline.color);

                redrawStrokes(null);
                redrawDataPoints();
                redrawTextData();
                redrawTimePins();
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

        mSvg.style("background-color", mModel.getCanvas().color);

        if (!mTimelineId) return;

        let timeline = mModel.getTimelineById(mTimelineId);

        if (!timeline) {
            // timeline got erased

            eraseLine();
            eraseTimePins();
            eraseDataPoints();
            eraseTextData();
            eraseStrokes();

            resetViewTransform();

            mTimelineId = null;
            return;
        }

        let oldTimeline = oldModel.getTimelineById(mTimelineId);

        if (!PathMath.equalsPath(oldTimeline.points, timeline.points) || oldTimeline.color != timeline.color) {
            let timeline = mModel.getTimelineById(mTimelineId);
            mLineLength = PathMath.getPathLength(timeline.points);
            redrawLine(mLineLength, timeline.color);
        }

        redrawStrokes(oldModel);
        redrawDataPoints();
        redrawTextData();
        redrawTimePins();
    }

    function redrawLine(lineLength, color) {
        mLineGroup.selectAll("#lens-line")
            .data([null]).enter().append("line")
            .attr("id", "lens-line")
            // TODO: switch this out for a chosen color at some point
            .attr("stroke-width", 1.5)
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("y2", 0);
        mLineGroup.select("#lens-line")
            .attr("stroke", color)
            .attr("x2", lineLength);
    }
    function eraseLine() {
        mLineGroup.select("#lens-line").remove();
    }

    function redrawTimePins() {
        let timeline = mModel.getTimelineById(mTimelineId);
        if (!timeline) {
            console.error("Code should be unreachable.");
            return;
        }

        let pinsData = timeline.timePins.map(pin => pin.linePercent * mLineLength);
        let pins = mPinGroup.selectAll('.lens-pin-tick')
            .data(pinsData);
        pins.exit().remove();
        pins.enter().append('line')
            .classed('lens-pin-tick', true);

        const pinTickWidth = 6;
        const pinTickLength = 10
        mPinGroup.selectAll('.lens-pin-tick')
            .style("stroke", "black")
            .style("stroke-width", (d) => pinTickWidth)
            .attr("x1", (d) => d)
            .attr("x2", (d) => d)
            .attr("y1", (d) => pinTickLength / 2)
            .attr("y2", (d) => -pinTickLength / 2);

    }

    function eraseTimePins() {

    }

    function redrawDataPoints() {
        let cellBindingData = mModel.getCellBindingData(mTimelineId)
            .filter(cbd => cbd.linePercent != NO_LINE_PERCENT &&
                cbd.dataCell.getType() == DataTypes.NUM)
        let numData = cellBindingData.map(cbd => {
            let { val1, val2, dist1, dist2 } = cbd.axisBinding;
            if (cbd.axisBinding.style == DataDisplayStyles.AREA || cbd.axisBinding.style == DataDisplayStyles.STREAM) {
                val2 = Math.max(Math.abs(val1), Math.abs(val2));
                val1 = 0;
            }
            if (val1 == val2) {
                console.error("Invalid binding values: " + val1 + ", " + val2);
                val1 = 0;
                if (val1 == val2) val2 = 1;
            };
            let dist = (dist2 - dist1) * (cbd.dataCell.getValue() - val1) / (val2 - val1) + dist1;
            return {
                x: cbd.linePercent * mLineLength,
                y: -dist,
                color: cbd.color ? cbd.color : "black"
            };
        });

        let selection = mPointsGroup.selectAll('.lens-data-point').data(numData);
        selection.exit().remove();
        selection.enter()
            .append('circle')
            .classed('lens-data-point', true)
            .attr('r', 3.0)
            .attr('stroke', 'black')

        mPointsGroup.selectAll('.lens-data-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color });
    }
    function eraseDataPoints() {
        mPointsGroup.selectAll('.lens-data-point').remove();
    }

    function redrawTextData() {
        let cellBindingData = mModel.getCellBindingData(mTimelineId)
            .filter(cbd => cbd.linePercent != NO_LINE_PERCENT &&
                cbd.dataCell.getType() == DataTypes.TEXT)
        let textData = cellBindingData.map(cbd => {
            return {
                x: cbd.linePercent * mLineLength,
                color: cbd.color ? cbd.color : "black"
            };
        });

        let selection = mTextGroup.selectAll('.lens-text-markers')
            .data(textData);
        selection.exit().remove();
        selection.enter()
            .append('line')
            .classed("lens-text-markers", true)
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .attr('opacity', 0.6)
            .attr('y1', -5)
            .attr('y2', 5);
        mTextGroup.selectAll('.lens-text-markers')
            .attr('x1', function (d) { return d.x + 2 })
            .attr('x2', function (d) { return d.x - 2 });
    }
    function eraseTextData() {
        mTextGroup.selectAll('.lens-text-markers').remove();

    }

    function redrawStrokes(oldModel) {
        let oldStrokeData = mStrokesData;
        mStrokesData = {}

        let timeline = mModel.getTimelineById(mTimelineId);
        let oldtimeline = oldModel ? oldModel.getTimelineById(mTimelineId) : null;
        let changedStrokes = DataUtil.timelineStrokesChanged(timeline, oldtimeline);
        mModel.getStrokeData(timeline.id).forEach(strokeData => {
            if (changedStrokes.includes(strokeData.id)) {
                mStrokesData[strokeData.id] = {
                    color: strokeData.color,
                    projectedPoints: strokeData.points.map(point => {
                        return PathMath.getPositionForPercentAndDist([{ x: 0, y: 0 }, { x: mLineLength, y: 0 }], point.linePercent, point.lineDist);
                    })
                }
            } else {
                mStrokesData[strokeData.id] = oldStrokeData[strokeData.id];
            }
        })

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

    function setColorBrushColor(color) {
        mLensColorBrushController.setColor(color);
    }

    this.focus = focus;
    this.updateModel = updateModel;

    this.getCurrentTimelineId = () => mTimelineId;
    this.getCurrentCenterPercent = getCurrentCenterPercent;

    this.setPanActive = setPanActive;
    this.setColorBrushActive = setColorBrushActive;
    this.resetMode = resetMode;

    this.setColorBrushColor = setColorBrushColor;

    this.setPanCallback = (callback) => mPanCallback = callback;
}
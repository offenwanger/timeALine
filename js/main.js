document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_NONE = 'noneMode';
    const MODE_SELECTION = 'selection';
    const MODE_LINE_DRAWING = "drawing";
    const MODE_LINE_DRAWING_EYEDROPPER = "drawingEyedropper";
    const MODE_ERASER = "eraser";
    const MODE_ERASER_TIMELINE = "eraserTimeline";
    const MODE_ERASER_STROKE = "eraserStroke";
    const MODE_ERASER_POINT = "eraserPoint";
    const MODE_ERASER_TEXT = "eraserText";
    const MODE_ERASER_PIN = "eraserPin";
    const MODE_DEFORM = "deform";
    const MODE_SMOOTH = "smooth";
    const MODE_SCISSORS = "scissors";
    const MODE_TEXT = "text";
    const MODE_PIN = "pin";
    const MODE_LENS = "lens";
    const MODE_COLOR_BRUSH = "colorBrush";
    const MODE_COLOR_BRUSH_EYEDROPPER = "colorBrushEyedropper";
    const MODE_COLOR_BUCKET = "bucket";
    const MODE_COLOR_BUCKET_EYEDROPPER = "bucketEyedropper";
    const MODE_PAN = "pan";
    const MODE_LINK = "link";

    let mMode;
    let mBucketColor = "#000000";

    let mSvg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight);

    let mVizLayer = mSvg.append("g").attr("id", "main-viz-layer");
    let mVizOverlayLayer = mSvg.append("g").attr("id", "main-canvas-interaction-layer");
    let mInteractionLayer = mSvg.append("g").attr("id", "main-interaction-layer");

    let mLensSvg = d3.select('#lens-view').append('svg')
        .attr('width', $("#lens-view").width())
        .attr('height', $("#lens-view").height());

    let mPanning = false;
    let mViewTransform = { x: 0, y: 0, rotation: 0 };

    // Dragging variables
    let mDraggingTimePin = null;
    let mDraggingTimePinSettingTime = false;

    let mSelectedCellBindingId = null;

    let mMouseDropShadow = new MouseDropShadow(mVizLayer);
    let mLineHighlight = new LineHighlight(mVizLayer);

    let mTooltip = new ToolTip("main-tooltip");
    let mTooltipSetTo = ""

    FilterUtil.initializeShadowFilter(mSvg);
    FilterUtil.setFilterDisplayArea(0, 0, mSvg.attr('width'), mSvg.attr('height'));

    let mModelController = new ModelController();

    let mLensController = new LensController(mLensSvg, mModelController, modelUpdated);
    mLensController.setPanCallback((timelineId, centerPercent, centerHeight) => {
        if (timelineId && mModelController.getModel().getTimelineById(timelineId)) {
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, centerPercent, mLensSvg.attr("width"));
        }
    })

    let mSelectionController = new SelectionController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mSelectionController.setDragStartCallback((timelineId, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords;
    });
    mSelectionController.setLineModifiedCallback((timelineId, points, newPoints) => {
        mModelController.updateTimelinePoints(timelineId, [{ points }], [{ points: newPoints }]);

        modelUpdated();
    });

    let mLineViewController = new LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineViewController.setLineDragStartCallback((timelineId, pointerEvent) => {
        if (mMode == MODE_SELECTION) {
            mSelectionController.onTimelinePointerDown(timelineId, screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY }));
        } if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            if (!timeline) {
                console.error("Bad timeline id! " + timelineId);
                return;
            }

            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);
            let timePin = new DataStructs.TimePin(linePoint.percent);

            let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                timePin.timeStamp = time;
            } else {
                timePin.timePercent = time;
            }

            mDraggingTimePin = timePin;

            pinDrag(timeline, timePin, linePoint.percent);
        } else if (mMode == MODE_LENS) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            if (!timeline) { console.error("Bad timeline id! " + timelineId); return; }
            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);
            mLensController.focus(timelineId, linePoint.percent);
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, linePoint.percent, mLensSvg.attr("width"));
        } else if (mMode == MODE_TEXT || mMode == MODE_LINK || mMode == MODE_LENS || mMode == MODE_SCISSORS) {
            mDragStartPosition = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        }
    })
    mLineViewController.setLineDragCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);
        } else if (mMode == MODE_LENS) {
            mLensController.focus(timelineId, linePoint.percent);
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, linePoint.percent, mLensSvg.attr("width"));
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
        } else if (mMode == MODE_TEXT) {
            // TODO: Open the text input in new comment mode.
            // TODO: Create in pointer down instead and initiate a drag on the text 
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                mModelController.addBoundTextRow(timelineId, "<text>", time);
            } else {
                let timePin = new DataStructs.TimePin(linePoint.percent);
                timePin.timePercent = mModelController.getModel()
                    .mapLinePercentToTime(timelineId, linePoint.percent);

                mModelController.addBoundTextRow(timelineId, "<text>", "", timePin);
            }

            modelUpdated();
        } else if (mMode == MODE_LINK) {
            mModelController.bindCells(timelineId, mDataTableController.getSelectedCells());

            modelUpdated();
        } else if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateTimelineColor(timelineId, mBucketColor);
            modelUpdated();
        } else if (mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setColorBrushColor(timeline.color);
        } else if (mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setColorBucketColor(timeline.color);
        } else if (mMode == MODE_LINE_DRAWING_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setLineDrawingColor(timeline.color);
        } else if (mMode == MODE_SCISSORS) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            let points1 = [];
            let points2 = timeline.points.map(p => Object.assign({}, { x: p.x, y: p.y }));

            for (let i = 0; i < timeline.points.length; i++) {
                points1.push(points2.shift());
                if (PathMath.getPathLength(points1) > linePoint.length) {
                    points2.unshift(points1.pop());
                    points1.push({ x: linePoint.x, y: linePoint.y });
                    points2.unshift({ x: linePoint.x, y: linePoint.y });
                    break;
                }
            }

            let segments = [
                { label: SEGMENT_LABELS.UNAFFECTED, points: points1 },
                { label: SEGMENT_LABELS.UNAFFECTED, points: points2 }
            ]

            mModelController.breakTimeline(timelineId, segments);

            modelUpdated();
        }
    })
    mLineViewController.setPointerEnterCallback((event, timelineId) => {
        if (mMode == MODE_SELECTION) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
            mDataTableController.highlightCells(mModelController.getModel().getCellBindingData(timelineId).map(b => [b.dataCell.id, b.timeCell.id]).flat());
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == MODE_LINK) {
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })
    mLineViewController.setPointerMoveCallback((event, timelineId) => {
        if (mMode == MODE_SELECTION) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
        }
    });
    mLineViewController.setPointerOutCallback((event, timelineId) => {
        if (mMode == MODE_SELECTION) {
            if (mTooltipSetTo == timelineId) {
                mTooltip.hide();
            }

            mMouseDropShadow.hide();
            mDataTableController.highlightCells([]);
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == MODE_LINK) {
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })

    let mStrokeController = new StrokeController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mStrokeController.setDragEndCallback((strokeId, coords) => {
        if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateStrokeColor(strokeId, mBucketColor);
            modelUpdated();
        } else if (mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
            setColorBrushColor(mModelController.getModel().getStrokeById(strokeId).color);
        } else if (mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
            setColorBucketColor(mModelController.getModel().getStrokeById(strokeId).color);
        } else if (mMode == MODE_LINE_DRAWING_EYEDROPPER) {
            setLineDrawingColor(mModelController.getModel().getStrokeById(strokeId).color);
        }
    })

    let mTimePinController = new TimePinController(mVizLayer, mVizOverlayLayer, mInteractionLayer);

    mTimePinController.setDragStartCallback((event, timePin) => { /* don't need to do anything here. */ })
    mTimePinController.setDragCallback((coords, timePin) => {
        let timeline = mModelController.getModel().getTimelineForTimePin(timePin.id);
        let projectedPoint = PathMath.getClosestPointOnPath(coords, timeline.points)

        pinDrag(timeline, timePin, projectedPoint.percent)
    });
    mTimePinController.setDragEndCallback((coords, timePin) => {
        let timeline = mModelController.getModel().getTimelineForTimePin(timePin.id);
        let projectedPoint = PathMath.getClosestPointOnPath(coords, timeline.points)

        pinDragEnd(timeline, timePin, projectedPoint.percent)
    });
    mTimePinController.setPointerEnterCallback((event, timePin) => {
        let screenCoords = { x: event.clientX, y: event.clientY };
        let message = timePin.timeStamp ? DataUtil.getFormattedDate(timePin.timeStamp) : "Percent of time: " + Math.round(timePin.timePercent * 100) + "%";

        let timeCell = mModelController.getModel().getTimeCellForPin(timePin.id);
        if (timeCell) {
            if (timeCell.isValid()) {
                console.error("Bad state. Valid time linked to pin.", timeCell, timePin)
            } else if (timeCell.getValue()) {
                message = "<div>" + message + "<div></div>" + timeCell.getValue() + "</div>";
            }
        }

        mTooltip.show(message, screenCoords);
        mTooltipSetTo = timePin.id;
    });
    mTimePinController.setPointerOutCallback((event, timePin) => {
        if (mTooltipSetTo = timePin.id) {
            mTooltip.hide();
        }
    });

    let mTextController = new TextController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mTextController.setTextUpdatedCallback((cellId, text) => {
        mModelController.updateText(cellId, text);
        modelUpdated();
    });
    mTextController.setPointerEnterCallback((e, cellBindingData) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id]);
    })
    mTextController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells([]);
    })
    mTextController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        if (mMode == MODE_TEXT || mMode == MODE_SELECTION) {
            showTextContextMenu(cellBindingData);
        } else if (mMode == MODE_PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForCellBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData = cellBindingData.copy();
            cellBindingData.linePercent = linePoint.percent;
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            mTextController.drawTimelineText(timeline, [cellBindingData]);
        }

        return coords;
    });
    mTextController.setDragCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_TEXT || mMode == MODE_SELECTION) {
            hideTextContextMenu();

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            if (!cellBindingData.isCanvasBinding) {
                let bindingData = mModelController.getModel().getCellBindingData(cellBindingData.timeline.id)
                    .filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT);
                let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));

                // copy the dataCell to avoid modification leaks
                let cellBinding = bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding.copy();
                cellBinding.offset = offset;
                bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding = cellBinding;

                mTextController.drawTimelineText(
                    mModelController.getModel().getTimelineById(cellBindingData.timeline.id),
                    bindingData);
            } else {
                let bindingData = mModelController.getModel().getCanvasBindingData();
                let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));

                // copy the dataCell to avoid modification leaks
                let cellBinding = bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding.copy();
                cellBinding.offset = offset;
                bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding = cellBinding;

                mTextController.drawCanvasText(bindingData);
            }
        } else if (mMode == MODE_PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData = cellBindingData.copy();
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            cellBindingData.linePercent = linePoint.percent;
            mTextController.drawTimelineText(timeline, [cellBindingData]);
        }
    });
    mTextController.setDragEndCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_TEXT || mMode == MODE_SELECTION) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            modelUpdated();

            showTextContextMenu(cellBindingData);
        } else if (mMode == MODE_PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            let offset = MathUtil.subtractAFromB(linePoint, coords);
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!cellBindingData.timeCell.isValid()) {
                mModelController.updateTimePinBinding(cellBindingData.cellBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        }
    });
    $(document).on("pointerdown", function (event) {
        if ($(event.target).closest('#text-context-menu-div').length === 0 &&
            $(event.target).closest('.text-interaction-target').length === 0) {
            // if we didn't click on a button in the context div
            hideTextContextMenu();
        }
    });

    // Text controller utility functions
    // TODO: make this general for all context menus
    function showTextContextMenu(cellBindingData) {
        let textBox = mTextController.getTextBoundingBoxes()
            .find(b => b.cellBindingId == cellBindingData.cellBinding.id);
        if (!textBox) {
            console.error("textbox not found!", cellBindingData);
            return;
        }
        let coords = svgCoordsToScreen({ x: textBox.x2, y: textBox.y1 })

        $('#text-context-menu-div').css('top', coords.y);
        $('#text-context-menu-div').css('left', coords.x);
        $('#text-context-menu-div').show();
        mSelectedCellBindingId = cellBindingData.cellBinding.id;
    }
    function hideTextContextMenu() {
        $('#text-context-menu-div').hide();
        mSelectedCellBindingId = null;
    }

    // end of text utility functions

    let mDataPointController = new DataPointController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDataPointController.setPointDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForCellBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([timeline], [cellBindingData]);
        }

        return coords;
    });
    mDataPointController.setPointDragCallback((cellBindingData, coords) => {
        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    timePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([cellBindingData.timeline], [cellBindingData]);
        }
    });
    mDataPointController.setPointDragEndCallback((cellBindingData, coords) => {
        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    timePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!cellBindingData.timeCell.isValid()) {
                mModelController.updateTimePinBinding(cellBindingData.cellBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        }
    });
    mDataPointController.setAxisDragStartCallback((axisId, controlNumber, event) => {
        if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateAxisColor(axisId, controlNumber, mBucketColor);
            modelUpdated();
        } else if (mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
            let axis = mModelController.getModel().getAxisById(axisId);
            let color = controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBrushColor(color);
        } else if (mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
            let axis = mModelController.getModel().getAxisById(axisId);
            let color = controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBucketColor(color);
        } else if (mMode == MODE_LINE_DRAWING_EYEDROPPER) {
            let axis = mModelController.getModel().getAxisById(axisId);
            let color = controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setLineDrawingColor(color);
        }
    })
    mDataPointController.setAxisDragCallback((axisId, controlNumber, newDist, coords) => {
        if (mMode == MODE_SELECTION) {
            let boundData = mModelController.getModel().getAllCellBindingData().filter(cbd => {
                return cbd.dataCell.getType() == DataTypes.NUM && cbd.axisBinding && cbd.axisBinding.id == axisId;
            });
            boundData.forEach(cbd => {
                if (controlNumber == 1) {
                    cbd.axisBinding.dist1 = newDist;
                } else {
                    cbd.axisBinding.dist2 = newDist;
                }
            })

            if (boundData.length == 0) { console.error("Bad state. Should not display a axis that has no data.", axisId); return; }

            mDataPointController.drawPoints([boundData[0].timeline], boundData);
            mDataPointController.drawAxes([{ id: axisId, line: boundData[0].timeline.points, axis: boundData[0].axisBinding, timelineId: boundData[0].timeline.id }]);
        }
    });
    mDataPointController.setAxisDragEndCallback((axisId, controlNumber, newDist, coords) => {
        if (mMode == MODE_SELECTION) {
            mModelController.updateAxisDist(axisId, controlNumber, newDist);

            modelUpdated();
        }
    });
    mDataPointController.setPointerEnterCallback((e, cellBindingData) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mDataPointController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells([]);
    })

    // UTILITY
    function setDragPinForCellBindingDrag(cellBindingData, linePoint) {
        // check if a pin already exists for this text, whether or not it's valid
        let timePin;

        if (cellBindingData.timeCell.isValid()) {
            timePin = cellBindingData.timeline.timePins.find(pin => pin.timeStamp == cellBindingData.timeCell.getValue());
        } else if (cellBindingData.cellBinding.timePinId) {
            timePin = cellBindingData.timeline.timePins.find(pin => pin.id == cellBindingData.cellBinding.timePinId);
        }

        // if not, create one.
        if (!timePin) {
            timePin = new DataStructs.TimePin(linePoint.percent);

            let hasTimeMapping = mModelController.getModel().hasTimeMapping(cellBindingData.timeline.id);
            if (cellBindingData.timeCell.isValid()) {
                timePin.timeStamp = cellBindingData.timeCell.getValue();
            } else if (hasTimeMapping) {
                timePin.timeStamp = mModelController.getModel()
                    .mapLinePercentToTime(cellBindingData.timeline.id, linePoint.percent, false)
            }

            if (!cellBindingData.timeCell.isValid()) {
                cellBindingData.timePinId = timePin.id;
            }

            if (!hasTimeMapping) {
                timePin.timePercent = mModelController.getModel()
                    .mapLinePercentToTime(cellBindingData.timeline.id, linePoint.percent, true)
            }

            if (!cellBindingData.timeCell.isValid() || !hasTimeMapping) {
                mDraggingTimePinSettingTime = true;
            }
        }

        mDraggingTimePin = timePin;
    }

    // END UTILITY

    let mLineDrawingController = new LineDrawingController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineDrawingController.setDrawFinishedCallback((newPoints, color, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            mModelController.newTimeline(newPoints, color);

            modelUpdated();
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            mModelController.mergeTimeline(startLineId, endLineId, newPoints);

            modelUpdated();
        } else {
            mModelController.extendTimeline(startPointLineId ? startPointLineId : endPointLineId, newPoints, startPointLineId != null);

            modelUpdated();
        }
    });

    let mColorBrushController = new ColorBrushController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mColorBrushController.setDrawFinishedCallback((points, color) => {
        let strokePoints = points.map(p => {
            let strokePoint = new DataStructs.StrokePoint(p.y);
            strokePoint.xValue = p.x;
            return strokePoint;
        })
        mModelController.addCanvasStroke(strokePoints, color);

        modelUpdated();
    })

    let mEraserController = new EraserController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mEraserController.setEraseCallback(canvasMask => {
        if (mMode == MODE_ERASER_TEXT ||
            mMode == MODE_ERASER_TIMELINE ||
            mMode == MODE_ERASER_STROKE ||
            mMode == MODE_ERASER_POINT ||
            mMode == MODE_ERASER_PIN ||
            mMode == MODE_ERASER) {
            mModelController.undoStackPush();
        }

        // check/erase lines
        if (mMode == MODE_ERASER_TEXT || mMode == MODE_ERASER) {
            // text has to be erased first because we need the rendering information.
            let boundingBoxes = mTextController.getTextBoundingBoxes();
            mModelController.eraseMaskedText(canvasMask, boundingBoxes);
        }
        if (mMode == MODE_ERASER_TIMELINE || mMode == MODE_ERASER) {
            mModelController.eraseMaskedTimelines(canvasMask);
        }
        if (mMode == MODE_ERASER_STROKE || mMode == MODE_ERASER) {
            mModelController.eraseMaskedStrokes(canvasMask);
        }
        if (mMode == MODE_ERASER_POINT || mMode == MODE_ERASER) {
            mModelController.eraseMaskedDataPoints(canvasMask);
        }
        if (mMode == MODE_ERASER_PIN) {
            // only do this if we are specifically erasing pins, because 
            // pins will be deleted with the erased line section.
            mModelController.eraseMaskedPins(canvasMask);
        }

        modelUpdated();
    })

    let mDeformController = new DeformController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDeformController.setDragStartCallback((timelineId, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords;
    });
    mDeformController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        modelUpdated();
    });

    let mSmoothController = new SmoothController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mSmoothController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        modelUpdated();
    });

    let mDataTableController = new DataTableController();
    mDataTableController.setOnSelectionCallback((data, yTop, yBottom) => {
        let left = $('.drawer-content-wrapper')[0].getBoundingClientRect().left;

        if (data) {
            let position = (yTop + yBottom) / 2 - $('#link-button-div').height() / 2 - 10;
            if (position < 10) position = 10;
            if (position > window.innerHeight - 100) position = window.innerHeight - 100;

            $('#link-button-div').css('top', position);
            $('#link-button-div').css('left', left - $('#link-button-div').width() / 2 - 10);
            $('#link-button-div').show();
        } else {
            $('#link-button-div').hide();
            if (mMode == MODE_LINK) setDefaultMode();
        }
    });
    mDataTableController.setTableUpdatedCallback((table, changeType, changeData) => {
        mModelController.tableUpdated(table, changeType, changeData);

        // Could do some more checks to avoid expensive redraws
        if (changeType == TableChange.DELETE_ROWS ||
            changeType == TableChange.DELETE_COLUMNS ||
            changeType == TableChange.UPDATE_CELLS) {

            modelUpdated();
        }
    });

    let mBrushController = BrushController.getInstance(mVizLayer, mVizOverlayLayer, mInteractionLayer);

    mVizOverlayLayer.append('rect')
        .attr('id', "main-viz-overlay")
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', mSvg.attr('height'))
        .attr('width', mSvg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .on('pointerdown', function (pointerEvent) {
            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

            if (mMode == MODE_PAN) {
                mPanning = true;
            } else if (mMode == MODE_COLOR_BUCKET) {
                mModelController.updateCanvasColor(mBucketColor);
                modelUpdated();
            } else if (mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
                setColorBrushColor(mModelController.getModel().getCanvas().color);
            } else if (mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
                setColorBucketColor(mModelController.getModel().getCanvas().color);
            } else if (mMode == MODE_LINE_DRAWING_EYEDROPPER) {
                setLineDrawingColor(mModelController.getModel().getCanvas().color);
            } else if (mMode == MODE_LENS) {
                mLensController.focus(null, null);
                mLineHighlight.hide();
            } else if (mMode == MODE_TEXT) {
                mModelController.addCanvasText("<text>", coords);
                modelUpdated();
            }

            mColorBrushController.onPointerDown(coords);
            mLineDrawingController.onPointerDown(coords);
            mDeformController.onPointerDown(coords);
            mEraserController.onPointerDown(coords);
            mSmoothController.onPointerDown(coords);
            mSelectionController.onPointerDown(coords);
        })

    $(document).on('pointermove', function (e) {
        let pointerEvent = e.originalEvent;
        if (mMode == MODE_PAN && mPanning) {
            mViewTransform.x = mViewTransform.x + pointerEvent.movementX
            mViewTransform.y = mViewTransform.y + pointerEvent.movementY
            setViewToTransform();
        }

        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        mColorBrushController.onPointerMove(coords);
        mLineViewController.onPointerMove(coords);
        mLineDrawingController.onPointerMove(coords);
        mBrushController.onPointerMove(coords);
        mDeformController.onPointerMove(coords);
        mEraserController.onPointerMove(coords);
        mTimePinController.onPointerMove(coords);
        mTextController.onPointerMove(coords);
        mDataPointController.onPointerMove(coords);
        mSmoothController.onPointerMove(coords);
        mStrokeController.onPointerMove(coords);
        mSelectionController.onPointerMove(coords);

        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });

    $(document).on("pointerup", function (e) {
        let pointerEvent = e.originalEvent;
        if (mPanning) {
            mPanning = false;
        }

        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        mColorBrushController.onPointerUp(coords);
        mLineViewController.onPointerUp(coords);
        mLineDrawingController.onPointerUp(coords);
        mDeformController.onPointerUp(coords);
        mEraserController.onPointerUp(coords);
        mTimePinController.onPointerUp(coords);
        mTextController.onPointerUp(coords);
        mDataPointController.onPointerUp(coords);
        mSmoothController.onPointerUp(coords);
        mStrokeController.onPointerUp(coords);
        mSelectionController.onPointerUp(coords);
    });

    function screenToSvgCoords(screenCoords) {
        if (isNaN(parseInt(screenCoords.x)) || isNaN(parseInt(screenCoords.y))) {
            console.error("Bad screen coords", screenCoords);
            return { x: 0, y: 0 };
        }

        let svgViewportPos = mSvg.node().getBoundingClientRect();
        if (isNaN(parseInt(svgViewportPos.x)) || isNaN(parseInt(svgViewportPos.y))) {
            console.error("Bad svg bounding box!", svgViewportPos);
            return { x: 0, y: 0 };
        }

        if (isNaN(parseInt(mViewTransform.x)) || isNaN(parseInt(mViewTransform.y))) {
            console.error("Bad veiw state!", mViewTransform);
            return { x: 0, y: 0 };
        }

        return {
            x: screenCoords.x - svgViewportPos.x - mViewTransform.x,
            y: screenCoords.y - svgViewportPos.y - mViewTransform.y
        };
    }

    function svgCoordsToScreen(svgCoords) {
        let svgViewportPos = mSvg.node().getBoundingClientRect();
        return {
            x: svgCoords.x + svgViewportPos.x + mViewTransform.x,
            y: svgCoords.y + svgViewportPos.y + mViewTransform.y
        };
    }

    function setViewToTransform() {
        mVizLayer.attr("transform", "translate(" + mViewTransform.x + "," + mViewTransform.y + ")");
        mInteractionLayer.attr("transform", "translate(" + mViewTransform.x + "," + mViewTransform.y + ")");
        FilterUtil.setFilterDisplayArea(-mViewTransform.x, -mViewTransform.y, mSvg.attr('width'), mSvg.attr('height'));
    }

    let mDrawerController = new DrawerController("#data-drawer");
    mDrawerController.setOnDrawerClosed(() => {
        mDataTableController.deselectCells();
    });

    function pinDrag(timeline, timePin, linePercent) {
        if (linePercent < 0) linePercent = 0;
        if (linePercent > 1) linePercent = 1;

        let changedPin = timePin.copy();
        changedPin.linePercent = linePercent;

        let timelineHasMapping = mModelController.getModel().hasTimeMapping(timeline.id);
        let timeAttribute = timelineHasMapping ? "timeStamp" : "timePercent";

        let tempPins = DataUtil.filterTimePinByChangedPin(timeline.timePins, changedPin, timeAttribute);
        mTimePinController.drawPinTicks(timeline, tempPins);

        let timeBindingValues = DataUtil.filterTimePinByChangedPin(
            mModelController.getModel().getTimeBindingValues(timeline), changedPin, timeAttribute);

        mLineViewController.drawSingleTimeline(timeline, timeBindingValues, timeAttribute);
    }

    function pinDragEnd(timeline, timePin, linePercent) {
        if (linePercent < 0) linePercent = 0;
        if (linePercent > 1) linePercent = 1;

        timePin.linePercent = linePercent;

        mModelController.updatePinBinding(timeline.id, timePin);
        modelUpdated();
    }

    function modelUpdated() {
        mLineViewController.updateModel(mModelController.getModel());
        mLineDrawingController.updateModel(mModelController.getModel());
        mDeformController.updateModel(mModelController.getModel());
        mSmoothController.updateModel(mModelController.getModel());
        mDataTableController.updateModel(mModelController.getModel());
        mTextController.updateModel(mModelController.getModel());
        mDataPointController.updateModel(mModelController.getModel());
        mTimePinController.updateModel(mModelController.getModel());
        mLensController.updateModel(mModelController.getModel());
        mStrokeController.updateModel(mModelController.getModel());
        mEraserController.updateModel(mModelController.getModel());
        mSelectionController.updateModel(mModelController.getModel());

        if (mLensController.getCurrentTimelineId()) {
            let timeline = mModelController.getModel().getTimelineById(mLensController.getCurrentTimelineId());
            if (timeline) {
                mLineHighlight.showAround(timeline.points, mLensController.getCurrentCenterPercent(), mLensSvg.attr("width"))
            } else {
                console.error("Bad state! Lens have timeline that no longer exists: " + mLensController.getCurrentTimelineId())
            }
        } else {
            mLineHighlight.hide();
        }

        $("body").css("background-color", mModelController.getModel().getCanvas().color);
    }

    // Setup main view buttons' events
    $("#datasheet-toggle-button").on("click", () => {
        // TODO: Made sub-menus slide nicely to.
        clearMode();
        if (mDrawerController.isOpen()) {
            mDrawerController.closeDrawer();
        } else {
            mDrawerController.openDrawer();
        }
    })
    setupButtonTooltip("#datasheet-toggle-button", "Opens and closes the datasheets and lens view");

    $("#undo-button").on("click", () => { doUndo(); })
    $(document).keydown(function (e) {
        if (e.ctrlKey && e.which == 90) {
            doUndo();
        }
    });
    function doUndo() {
        let undone = mModelController.undo();
        if (undone) {
            modelUpdated();
        };
    }
    setupButtonTooltip("#undo-button", "Undo last action");

    $("#redo-button").on("click", () => { doRedo(); })
    $(document).keydown(function (e) {
        if ((e.ctrlKey && e.keyCode == 89) || (e.ctrlKey && e.shiftKey && e.which == 90)) {
            doRedo();
        }
    });
    function doRedo() {
        let redone = mModelController.redo();
        if (redone) {
            modelUpdated();
        }
    }
    setupButtonTooltip("#redo-button", "Redo last undone action");

    $("#upload-button").on("click", () => {
        FileHandler.getJSONModel().catch(err => {
            console.error("Error while getting file: ", err)
        }).then(result => {
            mModelController.setModelFromObject(result);
            modelUpdated();
        }).catch(err => {
            console.error("Error while setting the model: ", err)
        });
    })
    setupButtonTooltip("#upload-button", "Upload a previously downloaded file");

    $("#download-button").on("click", () => {
        FileHandler.downloadJSON(mModelController.getModelAsObject());
    })
    setupButtonTooltip("#download-button", "Package your image into a json file which can be uploaded later");
    // ---------------
    setupModeButton("#line-drawing-button", MODE_LINE_DRAWING, () => {
        mLineDrawingController.setActive(true);
    });
    setupButtonTooltip("#line-drawing-button", "Draws timelines")
    setupButtonTooltip('#line-drawing-button', "Draws annotations on the diagram and in the lens view")
    setupSubModeButton('#line-drawing-button', '-eyedropper', MODE_LINE_DRAWING_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#line-drawing-button-eyedropper', "Copies the color from anything that can be colored")
    $("#line-drawing-button-color-picker").on("click", (e) => {
        setColorPickerInputColor(mLineDrawingController.getColor());
        toggleColorPicker(e);
    });
    setupButtonTooltip("#line-drawing-button-color-picker", "Choose timeline color");


    $("#line-manipulation-button").on("click", () => {
        if (mMode == MODE_DEFORM) {
            setDefaultMode();
        } else {
            $("#line-manipulation-button-deform").trigger("click");
        }
    })
    setupButtonTooltip("#line-manipulation-button", "Smooths and deforms timelines")
    setupSubModeButton("#line-manipulation-button", "-deform", MODE_DEFORM, () => {
        mDeformController.setActive(true);
    });
    setupButtonTooltip("#line-manipulation-button-deform", "Deforms timelines")
    setupSubModeButton("#line-manipulation-button", "-smooth", MODE_SMOOTH, () => {
        mSmoothController.setActive(true);
    });
    setupButtonTooltip("#line-manipulation-button-smooth", "Flattens timelines")

    setupModeButton('#scissors-button', MODE_SCISSORS, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#scissors-button', "Snips timelines")

    $("#toggle-timeline-style-button").on("click", () => {
        mLineViewController.toggleStyle(mModelController.getModel());
    })
    setupButtonTooltip('#toggle-timeline-style-button', "Flips through available timeline styles")
    // ---------------
    setupModeButton('#color-brush-button', MODE_COLOR_BRUSH, () => {
        mColorBrushController.setActive(true);
        mLensController.setColorBrushActive(true);
    });
    setupButtonTooltip('#color-brush-button', "Draws annotations on the diagram and in the lens view")
    setupSubModeButton('#color-brush-button', '-eyedropper', MODE_COLOR_BRUSH_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-brush-button-eyedropper', "Copies the color from anything that can be colored")
    $("#color-brush-button-color-picker").on("click", (e) => {
        setColorPickerInputColor(mColorBrushController.getColor());
        toggleColorPicker(e);
    });
    setupButtonTooltip("#color-brush-button-color-picker", "Choose brush color");

    setupModeButton('#comment-button', MODE_TEXT, () => {
        mLineViewController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#comment-button', "Creates text items on timelines or on the main view")
    $("#toggle-font-button").on("click", () => {
        if (!mSelectedCellBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        mModelController.toggleFont(mSelectedCellBindingId);
        modelUpdated();
    })
    $("#toggle-font-weight-button").on("click", () => {
        if (!mSelectedCellBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        mModelController.toggleFontWeight(mSelectedCellBindingId);
        modelUpdated();
    })
    $("#toggle-font-italics-button").on("click", () => {
        if (!mSelectedCellBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        mModelController.toggleFontItalics(mSelectedCellBindingId);
        modelUpdated();
    })
    $("#increase-font-size-button").on("click", () => {
        if (!mSelectedCellBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        let cellBinding = mModelController.getModel().getCellBindingById(mSelectedCellBindingId);
        if (!cellBinding) {
            console.error("Bad State! Cell binding not found", mSelectedCellBindingId);
            return;
        }

        mModelController.setFontSize(mSelectedCellBindingId, Math.min(cellBinding.fontSize + 4, 64));
        modelUpdated();
    })
    $("#decrease-font-size-button").on("click", () => {
        if (!mSelectedCellBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        let cellBinding = mModelController.getModel().getCellBindingById(mSelectedCellBindingId);
        if (!cellBinding) {
            console.error("Bad State! Cell binding not found", mSelectedCellBindingId);
            return;
        }

        mModelController.setFontSize(mSelectedCellBindingId, Math.max(cellBinding.fontSize - 4, 4));
        modelUpdated();
    })

    setupModeButton('#pin-button', MODE_PIN, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#pin-button', "Creates and moves time pins on timelines")
    // ---------------
    $("#selection-button").on("click", () => {
        setDefaultMode();
    })
    setupButtonTooltip("#selection-button", "Select and move items around")

    setupModeButton("#eraser-button", MODE_ERASER, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button", "Erases all the things!")
    setupSubModeButton("#eraser-button", "-timeline", MODE_ERASER_TIMELINE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases timelines only")
    setupSubModeButton("#eraser-button", "-stroke", MODE_ERASER_STROKE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases strokes only")
    setupSubModeButton("#eraser-button", "-point", MODE_ERASER_POINT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases points only")
    setupSubModeButton("#eraser-button", "-text", MODE_ERASER_TEXT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases text only")
    setupSubModeButton("#eraser-button", "-pin", MODE_ERASER_PIN, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases pins only")

    setupModeButton('#color-bucket-button', MODE_COLOR_BUCKET, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mStrokeController.setActive(true);
    });
    setupButtonTooltip('#color-bucket-button', "Colors all the things!")
    setupButtonTooltip('#color-bucket-button', "Draws annotations on the diagram and in the lens view")
    setupSubModeButton('#color-bucket-button', '-eyedropper', MODE_COLOR_BUCKET_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-bucket-button-eyedropper', "Copies the color from anything that can be colored")
    $("#color-bucket-button-color-picker").on("click", (e) => {
        setColorPickerInputColor(mBucketColor);
        toggleColorPicker(e);
    });
    setupButtonTooltip("#color-bucket-button-color-picker", "Choose color to color things with");

    $('#color-picker-wrapper').farbtastic((color) => {
        if (mMode == MODE_COLOR_BRUSH || mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
            setColorBrushColor(color);
        } else if (mMode == MODE_COLOR_BUCKET || mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
            setColorBucketColor(color);
        } else if (mMode == MODE_LINE_DRAWING || mMode == MODE_LINE_DRAWING_EYEDROPPER) {
            setLineDrawingColor(color);
        }
    });
    $(document).on("click", function (event) {
        if ($(event.target).closest('#color-picker-div').length === 0 &&
            $(event.target).closest("#color-brush-button-color-picker").length === 0 &&
            $(event.target).closest("#color-bucket-button-color-picker").length === 0 &&
            $(event.target).closest("#line-drawing-button-color-picker").length === 0) {
            // if we didn't click on the div or an open button
            $('#color-picker-div').hide();
        }
    });
    $("#color-picker-input").on('input', (e) => {
        if (mMode == MODE_COLOR_BRUSH || MODE_COLOR_BRUSH_EYEDROPPER) {
            setColorBrushColor($("#color-picker-input").val());
        } else if (mMode == MODE_COLOR_BUCKET || MODE_COLOR_BUCKET_EYEDROPPER) {
            setColorBucketColor($("#color-picker-input").val());
        } else if (mMode == MODE_LINE_DRAWING || MODE_LINE_DRAWING_EYEDROPPER) {
            setLineDrawingColor($("#color-picker-input").val());
        }
    })
    // set color to a random color
    setColorBrushColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
    setColorBucketColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
    setLineDrawingColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))

    // ---------------
    setupModeButton('#lens-button', MODE_LENS, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#lens-button', "Displayed the clicked section of timeline in the lens view")

    setupModeButton("#panning-button", MODE_PAN, () => {
        mLensController.setPanActive(true);
    });
    setupButtonTooltip("#panning-button", "Pans the main view and the lens view")

    // setup other buttons

    setupModeButton('#link-button', MODE_LINK, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#link-button', "Attaches data to timelines")

    $("#add-datasheet-button").on("click", () => {
        let newTable = new DataStructs.DataTable([
            new DataStructs.DataColumn("Time", 0),
            new DataStructs.DataColumn("", 1),
            new DataStructs.DataColumn("", 2)
        ]);
        for (let i = 0; i < 3; i++) {
            let dataRow = new DataStructs.DataRow()
            dataRow.index = i;
            dataRow.dataCells.push(new DataStructs.TimeCell("", newTable.dataColumns[0].id));
            for (let j = 1; j < newTable.dataColumns.length; j++) {
                dataRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", newTable.dataColumns[j].id));
            }
            newTable.dataRows.push(dataRow)
        }

        mModelController.addTable(newTable);
        mDataTableController.addOrUpdateTables(newTable);
        modelUpdated();
    })
    setupButtonTooltip("#add-datasheet-button", "Adds a new datasheet")

    function setupModeButton(buttonId, mode, callback) {
        $(buttonId).on("click", () => {
            if (mMode == mode) {
                setDefaultMode()
            } else {
                clearMode();
                callback();
                mMode = mode;

                $(buttonId).css('opacity', '0.3');

                $('#mode-indicator-div').html("");
                let modeImg = $("<img>");
                modeImg.attr("id", "mode-img");
                modeImg.attr("src", $(buttonId).attr("src"));
                modeImg.css("max-width", "35px");
                modeImg.css("background-color", $(buttonId).css("background-color"));
                modeImg.addClass("mode-indicator");
                $('#mode-indicator-div').append(modeImg);
                $('#mode-indicator-div').show();

                $(buttonId + '-sub-menu').css('top', $(buttonId).offset().top);
                $(buttonId + '-sub-menu').css('left', $(buttonId).offset().left - $(buttonId + '-sub-menu').outerWidth() - 10);
                $(buttonId + '-sub-menu').show();
            }
        })
    }

    function setupSubModeButton(buttonId, subButtonAppendix, mode, callback) {
        $(buttonId + subButtonAppendix).on("click", () => {
            if (mMode == mode) {
                $(buttonId).trigger('click');
            } else {
                // clear everything and show your own submenu
                clearMode();
                $(buttonId + '-sub-menu').css('top', $(buttonId).offset().top);
                $(buttonId + '-sub-menu').css('left', $(buttonId).offset().left - $(buttonId + '-sub-menu').outerWidth() - 10);
                $(buttonId + '-sub-menu').show();

                callback();
                mMode = mode;

                $(buttonId).css('opacity', '0.3');
                $(buttonId + subButtonAppendix).css('opacity', '0.3');

                $('#mode-indicator-div').html("");
                let modeImg = $("<img>");
                modeImg.attr("src", $(buttonId + subButtonAppendix).attr("src"));
                modeImg.css("max-width", "35px");
                modeImg.css("background-color", $(buttonId + subButtonAppendix).css("background-color"));
                modeImg.addClass("mode-indicator");
                $('#mode-indicator-div').append(modeImg);
                $('#mode-indicator-div').show();
            }
        })
    }

    function setupButtonTooltip(buttonId, text) {
        $(buttonId).on("pointerenter", (event) => {
            let screenCoords = { x: event.clientX, y: event.clientY };
            mTooltip.show(text, screenCoords);
            mTooltipSetTo = buttonId;
        })
        $(buttonId).on("pointerout", (event) => {
            if (mTooltipSetTo == buttonId) {
                mTooltip.hide();
            }
        })
    }

    function setDefaultMode() {
        clearMode();
        mMode = MODE_SELECTION;

        mSelectionController.setActive(true);
        mLineViewController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);

        $("#selection-button").css('opacity', '0.3');

        $('#mode-indicator-div').html("");
        let modeImg = $("<img>");
        modeImg.attr("id", "mode-img");
        modeImg.attr("src", $("#selection-button").attr("src"));
        modeImg.css("max-width", "35px");
        modeImg.css("background-color", $("#selection-button").css("background-color"));
        modeImg.addClass("mode-indicator");
        $('#mode-indicator-div').append(modeImg);
        $('#mode-indicator-div').show();

        $('#selection-button-sub-menu').css('top', $("#selection-button").offset().top);
        $('#selection-button-sub-menu').css('left', $("#selection-button").offset().left - $('#selection-button-sub-menu').outerWidth() - 10);
        $('#selection-button-sub-menu').show();
    }
    setDefaultMode();

    function clearMode(hideSubMenus = true) {
        mLineViewController.setActive(false);
        mLineDrawingController.setActive(false);
        mEraserController.setActive(false);
        mDeformController.setActive(false);
        mSmoothController.setActive(false);
        mTimePinController.setActive(false);
        mColorBrushController.setActive(false);
        mDataPointController.setActive(false);
        mTextController.setActive(false);
        mStrokeController.setActive(false);
        mSelectionController.setActive(false);
        mLensController.resetMode();
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();
        $('.sub-menu').hide();

        mMode = MODE_NONE;
    }

    // Color utility functions
    function setEyeDropperActive() {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mStrokeController.setActive(true);
    }

    function toggleColorPicker(e) {
        if ($("#color-picker-div").is(":visible")) {
            $('#color-picker-div').hide();
        } else {
            $('#color-picker-div').css('top', e.pageY);
            $('#color-picker-div').css('left', e.pageX - $('#color-picker-div').width());
            $('#color-picker-div').show();
        }
    }

    function setColorPickerInputColor(color) {
        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $.farbtastic('#color-picker-wrapper').setColor(color);
    }

    function setColorBucketColor(color) {
        $('#color-bucket-button-color-picker').css('background-color', color);
        $('#color-bucket-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mBucketColor = color;
    }

    function setLineDrawingColor(color) {
        $('#line-drawing-button-color-picker').css('background-color', color);
        $('#line-drawing-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mLineDrawingController.setColor(color)
    }

    function setColorBrushColor(color) {
        $('#color-brush-button-color-picker').css('background-color', color);
        $('#color-brush-button').css('background-color', color);
        $('#mode-img').css('background-color', color);
        mColorBrushController.setColor(color)
        mLensController.setColorBrushColor(color)
    }
    // End color utility functions

    function MouseDropShadow(parent) {
        let shadow = parent.append('g')
            .attr("id", "mouse-drop-shadow");

        shadow.append('circle')
            .attr("id", "drop-position")
            .attr('fill', "grey")
            .attr('r', 3.5)
            .attr('opacity', 0.5);
        shadow.append('line')
            .attr("id", "drop-line")
            .attr('stroke-width', 1.5)
            .attr('stroke', 'grey')
            .attr('opacity', 0.5);

        this.show = function (dropCoords, mouseCoords) {
            shadow.select("#drop-position")
                .attr("cx", dropCoords.x)
                .attr("cy", dropCoords.y)
            shadow.select("#drop-line")
                .attr("x1", dropCoords.x)
                .attr("y1", dropCoords.y)
                .attr("x2", mouseCoords.x)
                .attr("y2", mouseCoords.y)
            shadow.style("visibility", null);
        }
        this.hide = function () { shadow.style("visibility", "hidden"); };
        // start hidden
        this.hide();
    }

    function showLineTime(timelineId, screenCoords) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);

        let svgCoords = screenToSvgCoords(screenCoords);
        let pointOnLine = PathMath.getClosestPointOnPath(svgCoords, timeline.points);

        let time = mModelController.getModel().mapLinePercentToTime(timelineId, pointOnLine.percent);
        let message = mModelController.getModel().hasTimeMapping(timelineId) ?
            DataUtil.getFormattedDate(time) : "Percent of time: " + Math.round(time * 100) + "%";

        mMouseDropShadow.show(pointOnLine, svgCoords);

        mTooltip.show(message, screenCoords);
        mTooltipSetTo = timelineId;
    }

    function LineHighlight(parent) {
        let mHighlight = parent.append('path')
            .attr("id", "highlight-path")
            .attr('stroke', "blue")
            .attr('fill', "none")
            .attr('stroke-width', 5)
            .style("isolation", "auto")

        let mLastPointSet = [];
        let mPathLength = 0;
        let mPathStruct = []


        this.showAround = function (points, centerPercent, length) {
            let len = PathMath.getPathLength(points);
            let centerLen = len * centerPercent;
            let lowPercent = (centerLen - length / 2) / len
            let highPercent = (centerLen + length / 2) / len
            this.show(points, Math.max(lowPercent, 0), Math.min(highPercent, 1))
        }

        this.show = function (points, startpercent, endPercent) {
            if (!PathMath.equalsPath(mLastPointSet, points)) {
                mLastPointSet = points;
                mPathLength = PathMath.getPathLength(points);

                if (mPathLength < 20) {
                    mPathStruct = [points[0]];
                } else {
                    mPathStruct = Array.from(Array(Math.floor(mPathLength / 10)).keys())
                        .map(i => PathMath.getPositionForPercent(points, i * 10 / mPathLength))
                }

                mPathStruct.push(points[points.length - 1])
            }

            let startIndex = Math.floor(startpercent * mPathLength / 10);
            let endIndex = Math.ceil(endPercent * mPathLength / 10);

            mHighlight.attr("d", PathMath.getPathD(mPathStruct.slice(startIndex, endIndex)));
            mHighlight.style("visibility", "");
        }

        this.hide = function () { mHighlight.style("visibility", "hidden"); };
        // start hidden
        this.hide();
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type)
    // });

    setDefaultMode();
});
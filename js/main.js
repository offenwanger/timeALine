document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_NONE = 'noneMode';
    const MODE_DEFAULT = 'default';
    const MODE_LINE_DRAWING = "drawing";
    const MODE_LINE_DRAWING_EYEDROPPER = "drawingEyedropper";
    const MODE_ERASER = "eraser";
    const MODE_DRAG = "drag";
    const MODE_IRON = "iron";
    const MODE_SCISSORS = "scissors";
    const MODE_COMMENT = "comment";
    const MODE_PIN = "pin";
    const MODE_LENS = "lens";
    const MODE_COLOR_BRUSH = "colorBrush";
    const MODE_COLOR_BRUSH_EYEDROPPER = "colorBrushEyedropper";
    const MODE_COLOR_BUCKET = "bucket";
    const MODE_COLOR_BUCKET_EYEDROPPER = "bucketEyedropper";
    const MODE_PAN = "pan";
    const MODE_LINK = "link";

    let mMode = MODE_DEFAULT;
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
    let mDragStartPosition = null;

    let mMouseDropShadow = new MouseDropShadow(mVizLayer);
    let mLineHighlight = new LineHighlight(mVizLayer);

    let mTooltip = new ToolTip("main-tooltip");
    let mTooltipSetTo = ""

    let mModelController = new ModelController();

    let mLensController = new LensController(mLensSvg, mModelController, modelUpdated);
    mLensController.setPanCallback((timelineId, centerPercent, centerHeight) => {
        if (timelineId && mModelController.getModel().getTimelineById(timelineId)) {
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, centerPercent, mLensSvg.attr("width"));
        }
    })

    let mLineViewController = new LineViewController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineViewController.setLineDragStartCallback((timelineId, pointerEvent) => {
        if (mMode == MODE_PIN) {
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
        } else if (mMode == MODE_COMMENT || mMode == MODE_LINK || mMode == MODE_LENS || mMode == MODE_SCISSORS) {
            mDragStartPosition = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        }
    })
    mLineViewController.setLineDragCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
        } else if (mMode == MODE_COMMENT) {
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
        } else if (mMode == MODE_LENS) {
            mLensController.focus(timelineId, linePoint.percent);
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, linePoint.percent, mLensSvg.attr("width"));
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
        lineViewControllerShowTime(timelineId, { x: event.clientX, y: event.clientY });
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingData(timelineId).map(b => [b.dataCell.id, b.timeCell.id]).flat());
    })
    mLineViewController.setMouseMoveCallback((event, timelineId) => {
        lineViewControllerShowTime(timelineId, { x: event.clientX, y: event.clientY });
    });
    function lineViewControllerShowTime(timelineId, screenCoords) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);

        let svgCoords = screenToSvgCoords(screenCoords);
        let pointOnLine = PathMath.getClosestPointOnPath(svgCoords, timeline.points);

        let message;
        if (mModelController.getModel().hasTimeMapping(timelineId)) {
            message = DataUtil.getFormattedDate(new Date(mModelController.getModel().mapLinePercentToTime(timelineId, pointOnLine.percent)));
        } else {
            message = (Math.round(pointOnLine.percent * 10000) / 100) + "%";
        }

        mMouseDropShadow.show(pointOnLine, svgCoords);

        mTooltip.show(message, screenCoords);
        mTooltipSetTo = timelineId;
    }
    mLineViewController.setPointerOutCallback((event, timelineId) => {
        if (mTooltipSetTo == timelineId) {
            mTooltip.hide();
        }

        mMouseDropShadow.hide();
        mDataTableController.highlightCells([]);
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
    mTextController.setPointerEnterCallback((cellBindingData) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mTextController.setPointerOutCallback((cellBindingData) => {
        mDataTableController.highlightCells([]);
    })
    mTextController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForCellBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData = cellBindingData.copy();
            cellBindingData.linePercent = linePoint.percent;
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            mTextController.drawTimelineAnnotations(timeline, [cellBindingData]);
        }

        return coords;
    });
    mTextController.setDragCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_COMMENT || mMode == MODE_DEFAULT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let bindingData = mModelController.getModel().getCellBindingData(cellBindingData.timeline.id)
                .filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT);
            let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));

            // copy the dataCell to avoid modification leaks
            let cellBinding = bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding.copy();
            cellBinding.offset = offset;
            bindingData.find(b => b.cellBinding.id == cellBindingData.cellBinding.id).cellBinding = cellBinding;

            mTextController.drawTimelineAnnotations(
                mModelController.getModel().getTimelineById(cellBindingData.timeline.id),
                bindingData);
        } else if (mMode == MODE_PIN) {
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
            mTextController.drawTimelineAnnotations(timeline, [cellBindingData]);
        }
    });
    mTextController.setDragEndCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_COMMENT || mMode == MODE_DEFAULT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let offset = MathUtil.addAToB(cellBindingData.cellBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            modelUpdated();
        } else if (mMode == MODE_PIN) {
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
        if (mMode == MODE_DEFAULT) {
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
            mDataPointController.drawAxes([{ id: axisId, line: boundData[0].timeline.points, axis: boundData[0].axisBinding }]);
        }
    });
    mDataPointController.setAxisDragEndCallback((axisId, controlNumber, newDist, coords) => {
        if (mMode == MODE_DEFAULT) {
            mModelController.updateAxisDist(axisId, controlNumber, newDist);

            modelUpdated();
        }
    });
    mDataPointController.setPointerEnterCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mDataPointController.setPointerOutCallback((cellBindingData, mouseCoords) => {
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

    let mEraserController = new EraserController(mVizLayer, mVizOverlayLayer, mInteractionLayer, () => { return mModelController.getModel().getAllTimelines(); });
    mEraserController.setEraseCallback(lineData => {
        let eraseIds = lineData.filter(d => d.segments.length == 1 && d.segments[0].label == SEGMENT_LABELS.DELETED).map(d => d.id);
        let breakData = lineData.filter(d => d.segments.length > 1);

        eraseIds.forEach(id => mModelController.deleteTimeline(id));
        breakData.forEach(d => mModelController.breakTimeline(d.id, d.segments));

        modelUpdated();
    })

    let mDragController = new DragController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDragController.setDragStartCallback((timelineId, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        return coords;
    });
    mDragController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        modelUpdated();
    });

    let mIronController = new IronController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mIronController.setLineModifiedCallback(data => {
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
            }

            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

            mColorBrushController.onPointerDown(coords);
            mLineDrawingController.onPointerDown(coords);
            mDragController.onPointerDown(coords);
            mEraserController.onPointerDown(coords);
            mIronController.onPointerDown(coords);
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
        mDragController.onPointerMove(coords);
        mEraserController.onPointerMove(coords);
        mTimePinController.onPointerMove(coords);
        mTextController.onPointerMove(coords);
        mDataPointController.onPointerMove(coords);
        mIronController.onPointerMove(coords);
        mStrokeController.onPointerMove(coords);

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
        mDragController.onPointerUp(coords);
        mEraserController.onPointerUp(coords);
        mTimePinController.onPointerUp(coords);
        mTextController.onPointerUp(coords);
        mDataPointController.onPointerUp(coords);
        mIronController.onPointerUp(coords);
        mStrokeController.onPointerUp(coords);
    });

    function screenToSvgCoords(screenCoords) {
        let svgViewportPos = mSvg.node().getBoundingClientRect();
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
        mDragController.updateModel(mModelController.getModel());
        mIronController.updateModel(mModelController.getModel());
        mDataTableController.updateModel(mModelController.getModel());
        mTextController.updateModel(mModelController.getModel());
        mDataPointController.updateModel(mModelController.getModel());
        mTimePinController.updateModel(mModelController.getModel());
        mLensController.updateModel(mModelController.getModel());
        mStrokeController.updateModel(mModelController.getModel());
        mEraserController.updateModel(mModelController.getModel());

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
        FileHandler.getJSONModel().then(result => {
            mModelController.setModelFromObject(result);
            modelUpdated();
        }).catch(err => {
            console.error("Error while getting file: ", err)
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
    $("#line-drawing-button-color-picker").on("click", toggleColorPicker);
    setupButtonTooltip("#line-drawing-button-color-picker", "Choose timeline color");

    setupModeButton("#drag-button", MODE_DRAG, () => {
        mDragController.setActive(true);
    });
    setupButtonTooltip("#drag-button", "Deforms timelines")

    setupModeButton("#iron-button", MODE_IRON, () => {
        mIronController.setActive(true);
    });
    setupButtonTooltip("#iron-button", "Flattens timelines")

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
    $("#color-brush-button-color-picker").on("click", toggleColorPicker);
    setupButtonTooltip("#color-brush-button-color-picker", "Choose brush color");

    setupModeButton('#comment-button', MODE_COMMENT, () => {
        mLineViewController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#comment-button', "Creates text items on timelines or on the main view")

    setupModeButton('#pin-button', MODE_PIN, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#pin-button', "Creates and moves time pins on timelines")
    // ---------------
    setupModeButton("#eraser-button", MODE_ERASER, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button", "Erases all the things!")

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
    $("#color-bucket-button-color-picker").on("click", toggleColorPicker);
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
    setColorBrushColor("#" + Math.floor(Math.random() * 16777215).toString(16))
    setColorBucketColor("#" + Math.floor(Math.random() * 16777215).toString(16))
    setLineDrawingColor("#" + Math.floor(Math.random() * 16777215).toString(16))

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

        // set active those things with default pointerenters, etc. 
        mLineViewController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);

        mMode = MODE_DEFAULT;
    }

    function clearMode(hideSubMenus = true) {
        mLineViewController.setActive(false);
        mLineDrawingController.setActive(false);
        mEraserController.setActive(false);
        mDragController.setActive(false);
        mIronController.setActive(false);
        mTimePinController.setActive(false);
        mColorBrushController.setActive(false);
        mDataPointController.setActive(false);
        mTextController.setActive(false);
        mStrokeController.setActive(false);
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
            setColorPickerInputColor(mColorBrushController.getColor());
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
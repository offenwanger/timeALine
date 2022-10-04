document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_NONE = 'noneMode';
    const MODE_DEFAULT = 'default';
    const MODE_LINE_DRAWING = "drawing";
    const MODE_ERASER = "eraser";
    const MODE_DRAG = "drag";
    const MODE_IRON = "iron";
    const MODE_SCISSORS = "scissors";
    const MODE_COMMENT = "comment";
    const MODE_PIN = "pin";
    const MODE_LENS = "lens";
    const MODE_COLOR_BRUSH = "colorBrush";
    const MODE_COLOR_BUCKET = "bucket";
    const MODE_EYEDROPPER = "eyedropper";
    const MODE_PAN = "pan";
    const MODE_LINK = "link";

    let mMode = MODE_DEFAULT;
    let mColor = "#000000";

    let mSvg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

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
    let mDragStartPosition = null;

    let mMouseDropShadow = new MouseDropShadow(mVizLayer);
    let mLineHighlight = new LineHighlight(mVizLayer);

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

            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                if (time instanceof Date) time = time.getTime();
                timePin.timeStamp = time;
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
                mModelController.addBoundTextRow(timelineId, "<text>", "", timePin);
            }

            modelUpdated();
        } else if (mMode == MODE_LINK) {
            mModelController.bindCells(timelineId, mDataTableController.getSelectedCells());

            modelUpdated();
        } else if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateTimelineColor(timelineId, mColor);
            modelUpdated();
        } else if (mMode == MODE_EYEDROPPER) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            setColor(timeline.color);
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
    mLineViewController.setMouseOverCallback((event, timelineId) => {
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

        ToolTip.show(message, screenCoords);
    }
    mLineViewController.setMouseOutCallback(() => {
        ToolTip.hide();
        mMouseDropShadow.hide();
        mDataTableController.highlightCells([]);
    })

    let mStrokeController = new StrokeController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mStrokeController.setDragEndCallback((strokeId, coords) => {
        if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateStrokeColor(strokeId, mColor);
            modelUpdated();
        } else if (mMode == MODE_EYEDROPPER) {
            setColor(mModelController.getModel().getStrokeById(strokeId).color);
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
    mTimePinController.setMouseOverCallback((event, timePin) => {
        let screenCoords = { x: event.clientX, y: event.clientY };
        let message = timePin.timeStamp ? DataUtil.getFormattedDate(timePin.timeStamp) : Math.round(timePin.linePercent * 100) + "%";

        let timeCell = mModelController.getModel().getTimeCellForPin(timePin.id);
        if (timeCell) {
            if (timeCell.isValid()) {
                console.error("Bad state. Valid time linked to pin.", timeCell, timePin)
            } else if (timeCell.getValue()) {
                message = "<div>" + message + "<div></div>" + timeCell.getValue() + "</div>";
            }
        }

        ToolTip.show(message, screenCoords);
    });
    mTimePinController.setMouseOutCallback((event, timePin) => {
        ToolTip.hide();
    });

    let mTextController = new TextController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mTextController.setTextUpdatedCallback((cellId, text) => {
        mModelController.updateText(cellId, text);
        modelUpdated();
    });
    mTextController.setMouseOverCallback((cellBindingData) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mTextController.setMouseOutCallback((cellBindingData) => {
        mDataTableController.highlightCells([]);
    })
    mTextController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            cellBindingData = cellBindingData.copy();
            cellBindingData.linePercent = linePoint.percent;
            cellBindingData.cellBinding.offset = MathUtil.subtractAFromB(linePoint, coords);

            let timePin = timeline.timePins.find(pin => pin.id == cellBindingData.cellBinding.timePinId);
            if (!timePin) timePin = new DataStructs.TimePin(linePoint.percent);

            mDraggingTimePin = timePin;

            if (cellBindingData.timeCell.isValid()) {
                timePin.timeStamp = cellBindingData.timeCell.getValue();
            } else {
                cellBindingData.timePinId = timePin.id;
            }

            pinDrag(timeline, timePin, linePoint.percent);
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

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
        }
    });

    let mDataPointController = new DataPointController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDataPointController.setPointDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // TODO: handle tail data
            let timePin = new DataStructs.TimePin(linePoint.percent);
            mDraggingTimePin = timePin;

            if (cellBindingData.timeCell.isValid()) {
                timePin.timeStamp = cellBindingData.timeCell.getValue();
            } else {
                cellBindingData.timePinId = timePin.id;
            }

            pinDrag(timeline, timePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([timeline], [cellBindingData]);
        }

        return coords;
    });
    mDataPointController.setPointDragCallback((cellBindingData, coords) => {
        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([cellBindingData.timeline], [cellBindingData]);
        }
    });
    mDataPointController.setPointDragEndCallback((cellBindingData, coords) => {
        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
        }
    });
    mDataPointController.setAxisDragStartCallback((axisId, controlNumber, event) => {
        if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateAxisColor(axisId, controlNumber, mColor);
            modelUpdated();
        } else if (mMode == MODE_EYEDROPPER) {
            let axis = mModelController.getModel().getAxisById(axisId);
            let color = controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColor(color);
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
    mDataPointController.setMouseOverCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mDataPointController.setMouseOutCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([]);
    })

    let mLineDrawingController = new LineDrawingController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            mModelController.newTimeline(newPoints, mColor);

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
    mColorBrushController.setDrawFinishedCallback((points) => {
        let strokePoints = points.map(p => {
            let strokePoint = new DataStructs.StrokePoint(null, p.y);
            strokePoint.linePercent = p.x;
            return strokePoint;
        })
        mModelController.addCanvasStroke(strokePoints, mColor);

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
            if (mMode == MODE_LINK) clearMode();
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
                mModelController.updateCanvasColor(mColor);
                modelUpdated();
            } else if (mMode == MODE_EYEDROPPER) {
                setColor(mModelController.getModel().getCanvas().color);
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

        let tempPins = DataUtil.filterTimePinByChangedPin(timeline.timePins, changedPin);
        mTimePinController.drawPinTicks(timeline, tempPins);

        if (timePin.timeStamp) {
            // we are dragging a stamped pin
            let timeBindingValues = mModelController.getModel().getTimeBindingValues(timeline);
            tempPins = [...tempPins];
            if (tempPins[0].linePercent > 0 && timeBindingValues[0].timeStamp < tempPins[0].timeStamp) {
                tempPins.unshift(timeBindingValues[0]);
                tempPins[0].linePercent = 0;
            }
            if (tempPins[tempPins.length - 1].linePercent < 1 && timeBindingValues[timeBindingValues.length - 1].timeStamp > tempPins[tempPins.length - 1].timeStamp) {
                tempPins.push(timeBindingValues[timeBindingValues.length - 1]);
                tempPins[tempPins.length - 1].linePercent = 1;
            }

            if (tempPins.length > 1) {
                mLineViewController.drawWarpedTimeline(timeline, tempPins);
            }
        }
    }

    function pinDragEnd(timeline, timePin, linePercent) {
        if (linePercent < 0) linePercent = 0;
        if (linePercent > 1) linePercent = 1;

        timePin.linePercent = linePercent;

        if (!timePin.timeStamp && mModelController.getModel().hasTimeMapping(timeline.id)) {
            timePin.timeStamp = mModelController.getModel().mapLinePercentToTime(timeline.id, timePin.linePercent);
        }

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


    $("#line-drawing-button").on("click", () => {
        if (mMode == MODE_LINE_DRAWING) {
            setDefaultMode()
        } else {
            clearMode()
            mLineDrawingController.setActive(true);
            mMode = MODE_LINE_DRAWING;
            showIndicator('#line-drawing-button', '#line-drawing-mode-indicator');
        }
    })

    $("#eraser-button").on("click", () => {
        if (mMode == MODE_ERASER) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_ERASER;
            mEraserController.setActive(true);
            showIndicator('#eraser-button', '#eraser-mode-indicator');
        }
    })

    $("#drag-button").on("click", () => {
        if (mMode == MODE_DRAG) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_DRAG;
            mDragController.setActive(true);
            showIndicator('#drag-button', '#drag-mode-indicator');
        }
    })

    $("#iron-button").on("click", () => {
        if (mMode == MODE_IRON) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_IRON;
            mIronController.setActive(true);
            showIndicator('#iron-button', '#iron-mode-indicator');
        }
    })

    $("#scissors-button").on("click", () => {
        if (mMode == MODE_SCISSORS) {
            setDefaultMode()
        } else {
            clearMode()
            mLineViewController.setActive(true);
            mMode = MODE_SCISSORS;
            showIndicator('#scissors-button', '#scissors-mode-indicator');
        }
    })

    $("#comment-button").on("click", () => {
        if (mMode == MODE_COMMENT) {
            setDefaultMode()
        } else {
            clearMode()
            mLineViewController.setActive(true);
            mMode = MODE_COMMENT;
            showIndicator('#comment-button', '#comment-mode-indicator');
        }
    })

    $("#pin-button").on("click", () => {
        if (mMode == MODE_PIN) {
            setDefaultMode()
        } else {
            clearMode()
            mLineViewController.setActive(true);
            mTimePinController.setActive(true);
            mDataPointController.setActive(true);
            mTextController.setActive(true);
            mMode = MODE_PIN;
            showIndicator('#pin-button', '#pin-mode-indicator');
        }
    })

    $("#toggle-timeline-style-button").on("click", () => {
        mLineViewController.toggleStyle(mModelController.getModel());
    })

    $("#lens-button").on("click", () => {
        if (mMode == MODE_LENS) {
            setDefaultMode()
        } else {
            clearMode()
            mLineViewController.setActive(true);
            mMode = MODE_LENS;
            showIndicator('#lens-button', '#lens-mode-indicator');
        }
    })

    $("#download-button").on("click", () => {
        FileHandler.downloadJSON(mModelController.getModelAsObject());
    })

    $("#upload-button").on("click", () => {
        FileHandler.getJSONModel().then(result => {
            mModelController.setModelFromObject(result);
            modelUpdated();
        }).catch(err => {
            console.error("Error while getting file: ", err)
        });
    })

    $("#undo-button").on("click", () => {
        let undone = mModelController.undo();
        if (undone) {
            modelUpdated();
        };
    })

    $("#redo-button").on("click", () => {
        let redone = mModelController.redo();
        if (redone) {
            modelUpdated();
        }
    })

    $("#datasheet-toggle-button").on("click", () => {
        if (mDrawerController.isOpen()) {
            mDrawerController.closeDrawer();
        } else {
            mDrawerController.openDrawer();
        }

        return;
    })


    $('#color-picker-wrapper').farbtastic((color) => {
        setColor(color);
    });
    $(document).on("click", function (event) {
        if ($(event.target).closest('#color-picker-div').length === 0 &&
            $(event.target).closest("#color-picker-button").length === 0) {
            // if we didn't click on the div or the open button
            $('#color-picker-div').hide();
        }
    });
    $("#color-picker-input").on('input', (e) => {
        setColor($("#color-picker-input").val());
    })
    // set color to a random color
    setColor("#" + Math.floor(Math.random() * 16777215).toString(16))


    $("#color-picker-button").on("click", (e) => {
        if ($("#color-picker-div").is(":visible")) {
            $('#color-picker-div').hide();
        } else {
            $('#color-picker-div').css('top', e.pageY);
            $('#color-picker-div').css('left', e.pageX - $('#color-picker-div').width());
            $('#color-picker-div').show();
        }

        return;
    })


    $("#color-brush-button").on("click", () => {
        if (mMode == MODE_COLOR_BRUSH) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_COLOR_BRUSH;
            mColorBrushController.setActive(true);
            mLensController.setColorBrushActive(true);
            showIndicator('#color-brush-button', '#color-brush-mode-indicator');
        }
    })

    $("#color-bucket-button").on("click", () => {
        if (mMode == MODE_COLOR_BUCKET) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_COLOR_BUCKET;
            mLineViewController.setActive(true);
            mTimePinController.setActive(true);
            mDataPointController.setActive(true);
            mTextController.setActive(true);
            mStrokeController.setActive(true);
            showIndicator('#color-bucket-button', '#color-bucket-mode-indicator');
        }
    })

    $("#eyedropper-button").on("click", () => {
        if (mMode == MODE_EYEDROPPER) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_EYEDROPPER;
            mLineViewController.setActive(true);
            mTimePinController.setActive(true);
            mDataPointController.setActive(true);
            mTextController.setActive(true);
            mStrokeController.setActive(true);
            showIndicator('#eyedropper-button', '#eyedropper-mode-indicator');
        }
    })

    $("#panning-button").on("click", () => {
        if (mMode == MODE_PAN) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_PAN;
            mLensController.setPanActive(true);
            showIndicator('#panning-button', '#panning-mode-indicator');
        }
    })

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

    $("#load-datasheet-button").on("click", () => {
        FileHandler.getCSVDataFile().then(result => {
            // TODO figure out if there's a header row
            mModelController.newTable(result.data);
            modelUpdated();
        });
    })

    $("#link-button").on('click', () => {
        if (mMode == MODE_LINK) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_LINK;
            mLineViewController.setActive(true);
            showIndicator('#link-button', '#link-mode-indicator');
        }
    })


    function showIndicator(imgButtonId, modeIndicatorId) {
        $(imgButtonId).css('opacity', '0.3');
        $('#mode-indicator-div img').hide();
        $(modeIndicatorId).show();
        $('#mode-indicator-div').show();
    }

    function setDefaultMode() {
        clearMode();

        // set active those things with default mouseovers, etc. 
        mLineViewController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);

        mMode = MODE_DEFAULT;
    }

    function clearMode() {
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

        mMode = MODE_NONE;
    }

    function setColor(color) {
        mColor = color;

        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $('#color-picker-button').css('background-color', color);
        $('#color-bucket-button').css('background-color', color);

        $('#color-bucket-mode-indicator').css('background-color', color);

        $('#color-brush-button').css('background-color', color);
        $('#color-brush-mode-indicator').css('background-color', color);
        mColorBrushController.setColor(color)

        $('#line-drawing-button').css('background-color', color);
        $('#line-drawing-mode-indicator').css('background-color', color);
        mLineDrawingController.setColor(color)

        mLensController.setColor(color)
        $.farbtastic('#color-picker-wrapper').setColor(color);
    }

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

    $(document).on('mousemove', function (e) {
        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type)
    // });

    setDefaultMode();
});
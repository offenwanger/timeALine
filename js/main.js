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
    const MODE_ERASER_IMAGE = "eraserImage";
    const MODE_DEFORM = "deform";
    const MODE_SMOOTH = "smooth";
    const MODE_SCISSORS = "scissors";
    const MODE_TEXT = "text";
    const MODE_IMAGE = "image";
    const MODE_IMAGE_LINK = "imageLink"
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
    let mVizOverlayLayer = mSvg.append("g").attr("id", "main-overlay-layer");
    let mInteractionLayer = mSvg.append("g").attr("id", "main-interaction-layer");

    let mPanning = false;
    let mViewTransform = { x: 0, y: 0, rotation: 0 };

    // Dragging variables
    let mDraggingTimePin = null;
    let mDraggingTimePinSettingTime = false;

    let mSelectedCellBindingId = null;
    let mSelectedImageBindingId = null;
    let mSelectedAxisId = null;
    let mLinkingBinding = null;

    let mMouseDropShadow = new MouseDropShadow(mInteractionLayer);
    let mLineHighlight = new LineHighlight(mVizLayer);

    let mTooltip = new ToolTip("main-tooltip");
    let mTooltipSetTo = ""

    FilterUtil.initializeShadowFilter(mSvg);
    FilterUtil.setFilterDisplayArea(0, 0, mSvg.attr('width'), mSvg.attr('height'));

    let mMainOverlay = mVizOverlayLayer.append('rect')
        .attr('id', "main-viz-overlay")
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', mSvg.attr('height'))
        .attr('width', mSvg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0');

    let mLinkLine = mInteractionLayer.append("line")
        .attr('stroke-width', 0.5)
        .attr('stroke', 'black')
        .attr('opacity', 0.6);

    window.addEventListener("resize", () => {
        mSvg.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
        mMainOverlay.attr('width', window.innerWidth)
            .attr('height', window.innerHeight);
    });

    let mWorkspace;
    let mModelController = new ModelController();

    let mDrawerController = new DrawerController("#data-drawer");
    mDrawerController.setDrawerResizedCallback((width) => {
        mLensSvg.attr("width", width);
        if (mLensController.getCurrentTimelineId()) {
            if (mLensController.getCurrentTimelineId()) {
                showLensView(mLensController.getCurrentTimelineId(), mLensController.getCurrentCenterPercent());
            }
        }
    })
    $("#data-drawer").find('.close-button').on('click', () => {
        mDrawerController.closeDrawer();
        mDataTableController.deselectCells();
        $('#link-button-div').hide();
    });

    // note that this needs to happen after we set drawer controller
    let mLensSvg = d3.select('#lens-view').append('svg')
        .attr('width', $("#lens-view").width())
        .attr('height', $("#lens-view").height());
    let mLensController = new LensController(mLensSvg, mModelController, modelUpdated);
    mLensController.setPanCallback((timelineId, centerPercent, centerHeight) => {
        if (timelineId && mModelController.getModel().getTimelineById(timelineId)) {
            showLensView(timelineId, centerPercent);
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
            mSelectionController.onTimelineDragStart(timelineId, screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY }));
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
            showLensView(timelineId, linePoint.percent);
            mLensController.focus(timelineId, linePoint.percent);
        } else if (mMode == MODE_TEXT || mMode == MODE_IMAGE || mMode == MODE_LINK || mMode == MODE_LENS || mMode == MODE_SCISSORS) {
            mDragStartPosition = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        } else if (mMode == MODE_IMAGE_LINK) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            mModelController.imageBindingToLineBinding(timelineId, mSelectedImageBindingId, linePoint);

            modelUpdated();
            setDefaultMode();
        }
    })
    mLineViewController.setLineDragCallback((timelineId, coords) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            pinDrag(timeline, mDraggingTimePin, PathMath.getClosestPointOnPath(coords, timeline.points).percent);
        } else if (mMode == MODE_LENS) {
            let linePoint = PathMath.getClosestPointOnPath(coords,
                mModelController.getModel().getTimelineById(timelineId).points);

            showLensView(timelineId, linePoint.percent);
            mLensController.focus(timelineId, linePoint.percent);
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, coords) => {
        let linePoint = PathMath.getClosestPointOnPath(coords,
            mModelController.getModel().getTimelineById(timelineId).points);
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
        } else if (mMode == MODE_IMAGE) {
            FileHandler.getImageFile().then((imageData) => {
                if (mModelController.getModel().hasTimeMapping(timelineId)) {
                    let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                    mModelController.addBoundImage(timelineId, imageData, time);
                } else {
                    let timePin = new DataStructs.TimePin(linePoint.percent);
                    timePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timelineId, linePoint.percent);

                    mModelController.addBoundImage(timelineId, imageData, "", timePin);
                }

                modelUpdated();
            })
        } else if (mMode == MODE_LINK) {
            mModelController.bindCells(timelineId, mDataTableController.getSelectedCells());

            mDataTableController.deselectCells();
            $('#link-button-div').hide();

            modelUpdated();
            setDefaultMode();
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
        if (mMode == MODE_SELECTION || mMode == MODE_TEXT || mMode == MODE_IMAGE || mMode == MODE_PIN) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
            mDataTableController.highlightCells(mModelController.getModel().getTimelineHighlightData(timelineId));
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == MODE_LINK) {
            FilterUtil.applyShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })
    mLineViewController.setPointerMoveCallback((event, timelineId) => {
        if (mMode == MODE_SELECTION || mMode == MODE_TEXT || mMode == MODE_IMAGE || mMode == MODE_PIN) {
            showLineTime(timelineId, { x: event.clientX, y: event.clientY });
        }
    });
    mLineViewController.setPointerOutCallback((event, timelineId) => {
        if (mMode == MODE_SELECTION || mMode == MODE_TEXT || mMode == MODE_IMAGE || mMode == MODE_PIN) {
            if (mTooltipSetTo == timelineId) {
                mTooltip.hide();
            }

            mMouseDropShadow.hide();
            mDataTableController.highlightCells({});
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        } else if (mMode == MODE_LINK) {
            FilterUtil.removeShadowFilter(mVizLayer.selectAll('[timeline-id="' + timelineId + '"]'));
        }
    })

    let mStrokeController = new StrokeController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mStrokeController.setDragStartCallback((strokeId, pointerEvent) => {
        if (mMode == MODE_SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                mDragStartPosition = coords;
                mStrokeController.redrawCanvasStroke(stroke);
            }
        }
    });
    mStrokeController.setDragCallback((strokeId, coords) => {
        if (mMode == MODE_SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                let diff = MathUtil.subtractAFromB(mDragStartPosition, coords);
                stroke.points.forEach(p => {
                    p.xValue += diff.x;
                    p.lineDist += diff.y;
                })
                mStrokeController.redrawCanvasStroke(stroke);
            }
        }
    });
    mStrokeController.setDragEndCallback((strokeId, coords) => {
        if (mMode == MODE_SELECTION) {
            if (mModelController.isCanvasStroke(strokeId)) {
                let stroke = mModelController.getModel().getStrokeById(strokeId);
                let diff = MathUtil.subtractAFromB(mDragStartPosition, coords);
                mModelController.updateStrokePoints(strokeId, stroke.points.map(p => {
                    p.xValue += diff.x;
                    p.lineDist += diff.y;
                    return p;
                }));
                modelUpdated();
            }
        } else if (mMode == MODE_COLOR_BUCKET) {
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
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingHighlightData(cellBindingData.cellBinding));
    })
    mTextController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells({});
    })
    mTextController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        if (mMode == MODE_TEXT || mMode == MODE_SELECTION) {
            showTextContextMenu(cellBindingData);
        } else if (mMode == MODE_PIN && !cellBindingData.isCanvasBinding) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(cellBindingData, linePoint);
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

    let mImageController = new ImageController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mImageController.setDragStartCallback((imageBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
        if (mMode == MODE_PAN) {
            mPanning = true;
        } else if (mMode == MODE_IMAGE || mMode == MODE_SELECTION) {
            showImageContextMenu(imageBindingData);
        } else if (mMode == MODE_PIN && !imageBindingData.isCanvasBinding) {
            let linePoint = PathMath.getClosestPointOnPath(coords, imageBindingData.timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(imageBindingData, linePoint, true);
            pinDrag(imageBindingData.timeline, mDraggingTimePin, linePoint.percent);

            imageBindingData = imageBindingData.copy();
            imageBindingData.linePercent = linePoint.percent;
            imageBindingData.imageBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            mImageController.redrawImage(imageBindingData);
        }

        return coords;
    });
    mImageController.setDragCallback((imageBindingData, startPos, coords) => {
        if (mMode == MODE_IMAGE || mMode == MODE_SELECTION) {
            hideImageContextMenu();

            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let offset = MathUtil.addAToB(imageBindingData.imageBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            // copy the dataCell to avoid modification leaks
            imageBindingData = imageBindingData.copy();
            imageBindingData.imageBinding.offset = offset;
            mImageController.redrawImage(imageBindingData);
        } else if (mMode == MODE_PIN && !imageBindingData.isCanvasBinding) {
            let timeline = imageBindingData.timeline;
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

            imageBindingData = imageBindingData.copy();
            imageBindingData.imageBinding.offset = MathUtil.subtractAFromB(linePoint, coords);
            imageBindingData.linePercent = linePoint.percent;
            mImageController.redrawImage(imageBindingData);
        }
    });
    mImageController.setDragEndCallback((imageBindingData, startPos, coords) => {
        if (mMode == MODE_IMAGE || mMode == MODE_SELECTION) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, coords)) return;

            let offset = MathUtil.addAToB(imageBindingData.imageBinding.offset, MathUtil.subtractAFromB(startPos, coords));
            mModelController.updateImageOffset(imageBindingData.imageBinding.id, offset);
            mModelController.getModel().getImageBindingById()

            modelUpdated();

            imageBindingData.imageBinding.offset = offset;
            showImageContextMenu(imageBindingData);
        } else if (mMode == MODE_PIN && !imageBindingData.isCanvasBinding) {
            let timeline = imageBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            let offset = MathUtil.subtractAFromB(linePoint, coords);
            mModelController.updateImageOffset(imageBindingData.imageBinding.id, offset);

            if (mDraggingTimePinSettingTime) {
                if (mModelController.getModel().hasTimeMapping(timeline.id)) {
                    mDraggingTimePin.timeStamp = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, false)
                } else {
                    mDraggingTimePin.timePercent = mModelController.getModel()
                        .mapLinePercentToTime(timeline.id, linePoint.percent, true)
                }
            }

            if (!imageBindingData.imageBinding.timeStamp) {
                mModelController.updateTimePinBinding(imageBindingData.imageBinding.id, mDraggingTimePin.id)
            }

            // this will trigger a model update
            pinDragEnd(timeline, mDraggingTimePin, linePoint.percent);
            mDraggingTimePin = null;
            mDraggingTimePinSettingTime = false;
        }
    });
    mImageController.setDoubleClickCallback((imageBindingData, clickEvent) => {
        showImageViewer(imageBindingData.imageBinding);
    })
    // Text controller utility functions
    // TODO: make this general for all context menus
    function showImageContextMenu(imageBindingData) {
        let coords;
        if (imageBindingData.isCanvasBinding) {
            coords = svgCoordsToScreen({
                x: imageBindingData.imageBinding.offset.x + imageBindingData.imageBinding.width,
                y: imageBindingData.imageBinding.offset.y
            });
        } else {
            let pos = PathMath.getPositionForPercent(imageBindingData.timeline.points, imageBindingData.linePercent);
            coords = svgCoordsToScreen({
                x: imageBindingData.imageBinding.offset.x + imageBindingData.imageBinding.width + pos.x,
                y: imageBindingData.imageBinding.offset.y + pos.y
            });
        }

        if (imageBindingData.isCanvasBinding) {
            $("#image-link-button").show();
            $("#image-unlink-button").hide();
        } else {
            $("#image-unlink-button").show();
            $("#image-link-button").hide();
        }

        $('#image-context-menu-div').css('top', coords.y);
        $('#image-context-menu-div').css('left', coords.x);
        $('#image-context-menu-div').show();
        mSelectedImageBindingId = imageBindingData.imageBinding.id;
    }
    function hideImageContextMenu() {
        $('#image-context-menu-div').hide();
        mSelectedImageBindingId = null;
    }

    // end of text utility functions


    let mDataPointController = new DataPointController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDataPointController.setPointDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let timeline = cellBindingData.timeline;
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            // sets mDraggingTimePin
            setDragPinForBindingDrag(cellBindingData, linePoint);
            pinDrag(timeline, mDraggingTimePin, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawDataSet([cellBindingData]);
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
            mDataPointController.drawDataSet([cellBindingData]);
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
    mDataPointController.setAxisDragStartCallback((axis, controlNumber, event) => {
        if (mMode == MODE_SELECTION) {
            let model = mModelController.getModel();
            showAxisContextMenu(axis, model.getTimelineByAxisId(axis.id));
        } else if (mMode == MODE_COLOR_BUCKET) {
            mModelController.updateAxisColor(axis.id, controlNumber, mBucketColor);
            modelUpdated();
        } else if (mMode == MODE_COLOR_BRUSH_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBrushColor(color);
        } else if (mMode == MODE_COLOR_BUCKET_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setColorBucketColor(color);
        } else if (mMode == MODE_LINE_DRAWING_EYEDROPPER) {
            let color = controlNumber == null ? null : controlNumber == 1 ? axis.color1 : axis.color2;
            if (color) setLineDrawingColor(color);
        }
    })
    mDataPointController.setAxisDragCallback((axis, controlNumber, coords) => {
        if (mMode == MODE_SELECTION) {
            hideAxisContextMenu();
            let model = mModelController.getModel();

            // copy to avoid leaks
            axis = axis.copy();

            let timeline = model.getTimelineByAxisId(axis.id);
            if (controlNumber == null) {
                let closestPoint = PathMath.getClosestPointOnPath(coords, timeline.points);
                axis.linePercent = closestPoint.percent;
            } else {
                let origin = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
                let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);
                let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
                let dist = MathUtil.distanceFromAToB(origin, newPosition);
                dist = newPosition.neg ? -1 * dist : dist;
                if (controlNumber == 1) {
                    axis.dist1 = dist;
                } else {
                    axis.dist2 = dist;
                }
            }

            let boundData = model.getAllCellBindingData().filter(cbd => {
                return cbd.dataCell.getType() == DataTypes.NUM && cbd.axisBinding && cbd.axisBinding.id == axis.id;
            });
            boundData.forEach(cbd => {
                cbd.axisBinding = axis;
            })
            if (boundData.length == 0) { console.error("Bad state. Should not display a axis that has no data.", axis.id); return; }

            mDataPointController.drawDataSet(boundData);
        }
    });
    mDataPointController.setAxisDragEndCallback((axis, controlNumber, coords) => {
        if (mMode == MODE_SELECTION) {// copy to avoid leaks
            let model = mModelController.getModel();

            // copy to avoid leaks
            axis = axis.copy();

            let timeline = model.getTimelineByAxisId(axis.id);
            if (controlNumber == null) {
                let closestPoint = PathMath.getClosestPointOnPath(coords, timeline.points);
                axis.linePercent = closestPoint.percent;
            } else {
                let origin = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
                let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);
                let newPosition = MathUtil.projectPointOntoVector(coords, normal, origin);
                let dist = MathUtil.distanceFromAToB(origin, newPosition);
                dist = newPosition.neg ? -1 * dist : dist;
                if (controlNumber == 1) {
                    axis.dist1 = dist;
                } else {
                    axis.dist2 = dist;
                }
            }

            mModelController.updateAxisPosition(axis.id, axis.dist1, axis.dist2, axis.linePercent);

            modelUpdated();
            showAxisContextMenu(axis, timeline);
        }
    });
    mDataPointController.setPointerEnterCallback((e, cellBindingData) => {
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingHighlightData(cellBindingData.cellBinding));
    })
    mDataPointController.setPointerOutCallback((e, cellBindingData) => {
        mDataTableController.highlightCells({});
    })

    // UTILITY
    function setDragPinForBindingDrag(bindingData, linePoint, isImage = false) {
        // check if a pin already exists for this text, whether or not it's valid
        let timePinId = isImage ? bindingData.imageBinding.timePinId : bindingData.cellBinding.timePinId;
        let timeIsValid = isImage ? bindingData.imageBinding.timeStamp : bindingData.timeCell.isValid();
        let time = isImage ? bindingData.imageBinding.timeStamp : bindingData.timeCell.getValue();

        let timePin;
        if (timeIsValid) {
            timePin = bindingData.timeline.timePins.find(pin => pin.timeStamp == time);
        } else if (timePinId) {
            timePin = bindingData.timeline.timePins.find(pin => pin.id == timePinId);
        }

        // if not, create one.
        if (!timePin) {
            timePin = new DataStructs.TimePin(linePoint.percent);

            let hasTimeMapping = mModelController.getModel().hasTimeMapping(bindingData.timeline.id);
            if (timeIsValid) {
                timePin.timeStamp = time;
            } else if (hasTimeMapping) {
                timePin.timeStamp = mModelController.getModel()
                    .mapLinePercentToTime(bindingData.timeline.id, linePoint.percent, false)
            }

            if (!timeIsValid) {
                bindingData.timePinId = timePin.id;
            }

            if (!hasTimeMapping) {
                timePin.timePercent = mModelController.getModel()
                    .mapLinePercentToTime(bindingData.timeline.id, linePoint.percent, true)
            }

            if (!timeIsValid || !hasTimeMapping) {
                mDraggingTimePinSettingTime = true;
            }
        }

        mDraggingTimePin = timePin;
    }

    function showAxisContextMenu(axis, timeline) {
        let basePose = PathMath.getPositionForPercent(timeline.points, axis.linePercent);
        let normal = PathMath.getNormalForPercent(timeline.points, axis.linePercent);

        let pos1 = MathUtil.getPointAtDistanceAlongVector(axis.dist1, normal, basePose);
        let pos2 = MathUtil.getPointAtDistanceAlongVector(axis.dist2, normal, basePose);

        let coords = svgCoordsToScreen({
            x: Math.max(pos1.x, pos2.x),
            y: Math.min(pos1.y, pos2.y)
        });

        if (axis.alignment == DataDisplayAlignments.DYNAMIC) {
            $('#dynamic-normals-axis-button').show();
            $('#fixed-normals-axis-button').hide();
        } else {
            $('#dynamic-normals-axis-button').hide();
            $('#fixed-normals-axis-button').show();
        }

        $('#axis-context-menu-div').css('top', coords.y);
        $('#axis-context-menu-div').css('left', coords.x);
        $('#axis-context-menu-div').show();
        mSelectedAxisId = axis.id;
    }
    function hideAxisContextMenu() {
        $('#axis-context-menu-div').hide();
        mSelectedAxisId = null;
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
    mColorBrushController.setDrawFinishedCallback((points, color, radius) => {
        let strokePoints = points.map(p => {
            let strokePoint = new DataStructs.StrokePoint(p.y);
            strokePoint.xValue = p.x;
            return strokePoint;
        })
        mModelController.addCanvasStroke(strokePoints, color, radius * 2);

        modelUpdated();
    })

    let mEraserController = new EraserController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mEraserController.setEraseCallback(canvasMask => {
        if (mMode == MODE_ERASER_TEXT ||
            mMode == MODE_ERASER_TIMELINE ||
            mMode == MODE_ERASER_STROKE ||
            mMode == MODE_ERASER_POINT ||
            mMode == MODE_ERASER_PIN ||
            mMode == MODE_ERASER_IMAGE ||
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
        if (mMode == MODE_ERASER_IMAGE || mMode == MODE_ERASER) {
            mModelController.eraseMaskedImages(canvasMask);
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
    mDataTableController.setOnSelectionCallback((yTop, yBottom, isFirstColOnly) => {
        if (isFirstColOnly) {
            $('#link-button-div').hide();
        } else {
            let maxPos = window.innerHeight - mLensSvg.attr("height") - 50;
            let minPos = 10;
            let position = (yTop + yBottom) / 2 - $('#link-button-div').height() / 2 - 10;

            $('#link-button-div').css('top', Math.min(maxPos, Math.max(minPos, position)));
            $('#link-button-div').show();
        }
    });
    mDataTableController.setOnDeselectionCallback((yTop, yBottom) => {
        $('#link-button-div').hide();
        if (mMode == MODE_LINK) setDefaultMode();
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
    mDataTableController.setShouldDeselectCallback(() => {
        // this is an annoying integration thing.
        return mMode != MODE_LINK;
    })

    let mBrushController = BrushController.getInstance(mVizLayer, mVizOverlayLayer, mInteractionLayer);

    mMainOverlay.on('pointerdown', function (pointerEvent) {
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
            hideLensView();
        } else if (mMode == MODE_TEXT) {
            mModelController.addCanvasText("<text>", coords);
            modelUpdated();
        } else if (mMode == MODE_IMAGE) {
            FileHandler.getImageFile().then(imageData => {
                mModelController.addCanvasImage(imageData, coords);
                modelUpdated();
            })
        }

        mColorBrushController.onPointerDown(coords);
        mLineDrawingController.onPointerDown(coords);
        mDeformController.onPointerDown(coords);
        mEraserController.onPointerDown(coords);
        mSmoothController.onPointerDown(coords);
        mSelectionController.onPointerDown(coords);
    })

    $(document).on("pointerdown", function (event) {
        if ($(event.target).closest('#text-context-menu-div').length === 0 &&
            $(event.target).closest('.text-interaction-target').length === 0) {
            // if we didn't click on a button in the context div
            hideTextContextMenu();
        }

        if ($(event.target).closest('#image-context-menu-div').length === 0 &&
            $(event.target).closest('.image-interaction-target').length === 0) {
            // if we didn't click on a button in the context div
            hideImageContextMenu();
        }

        if ($(event.target).closest('#axis-context-menu-div').length === 0 &&
            $(event.target).closest('.axis-target-circle').length === 0) {
            // if we didn't click on a button in the context div
            hideAxisContextMenu();
        }

        if ($(event.target).closest('#color-picker-div').length === 0 &&
            $(event.target).closest("#color-brush-button-color-picker").length === 0 &&
            $(event.target).closest("#color-bucket-button-color-picker").length === 0 &&
            $(event.target).closest("#line-drawing-button-color-picker").length === 0) {
            // if we didn't click on the div or an open button
            $('#color-picker-div').hide();
        }

        if (mMode == MODE_IMAGE_LINK) {
            setDefaultMode();
        }
    });

    $(document).on('pointermove', function (e) {
        let pointerEvent = e.originalEvent;
        let screenCoords = { x: pointerEvent.clientX, y: pointerEvent.clientY };

        mDrawerController.onPointerMove(screenCoords)

        let coords = screenToSvgCoords(screenCoords);

        if (mMode == MODE_PAN && mPanning) {
            mViewTransform.x = mViewTransform.x + pointerEvent.movementX
            mViewTransform.y = mViewTransform.y + pointerEvent.movementY
            setViewToTransform();
        } else if (mMode == MODE_IMAGE_LINK) {
            if (!mLinkingBinding) {
                console.error("No image linking binding set!");
                setDefaultMode();
                return;
            }

            showLinkLine(mLinkingBinding.offset, coords);
        }

        mColorBrushController.onPointerMove(coords);
        mLineViewController.onPointerMove(coords);
        mLineDrawingController.onPointerMove(coords);
        mBrushController.onPointerMove(coords);
        mDeformController.onPointerMove(coords);
        mEraserController.onPointerMove(coords);
        mTimePinController.onPointerMove(coords);
        mTextController.onPointerMove(coords);
        mImageController.onPointerMove(coords);
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

        let screenCoords = { x: pointerEvent.clientX, y: pointerEvent.clientY };

        mDrawerController.onPointerUp(screenCoords)

        let coords = screenToSvgCoords(screenCoords);

        // sync pointer ups
        mColorBrushController.onPointerUp(coords);
        mLineViewController.onPointerUp(coords);
        mLineDrawingController.onPointerUp(coords);
        mDeformController.onPointerUp(coords);
        mTimePinController.onPointerUp(coords);
        mTextController.onPointerUp(coords);
        mImageController.onPointerUp(coords);
        mDataPointController.onPointerUp(coords);
        mSmoothController.onPointerUp(coords);
        mStrokeController.onPointerUp(coords);
        mSelectionController.onPointerUp(coords);

        // async pointer ups
        // the promise is mainly for testing purposes, but also 
        // highlights that these may happen in any order.
        return Promise.all([
            mEraserController.onPointerUp(coords)
        ])
    });

    $(document).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && /* z */ e.which == 90) {
            doUndo();
        }

        if (((e.ctrlKey || e.metaKey) && /* y */ e.keyCode == 89) || ((e.ctrlKey || e.metaKey) && e.shiftKey && /* y */ e.which == 90)) {
            doRedo();
        }

        if (/* delete */ e.which == 46) {
            deleteSelected();
        }
    });

    function doUndo() {
        let undone = mModelController.undo();
        if (undone) {
            modelUpdated();
        };
    }

    function doRedo() {
        let redone = mModelController.redo();
        if (redone) {
            modelUpdated();
        }
    }

    function deleteSelected() {
        let selectedCount = [mSelectedCellBindingId, mSelectedImageBindingId, mSelectedAxisId]
            .reduce((count, item) => item == null ? count : count + 1, 0);
        if (selectedCount > 1) {
            console.error("Multiple selected items!", [mSelectedCellBindingId, mSelectedImageBindingId, mSelectedAxisId]);
            return;
        };

        if (mSelectedCellBindingId != null) {
            mModelController.deleteCellBinding(mSelectedCellBindingId);
        } else if (mSelectedImageBindingId != null) {
            mModelController.deleteImageBinding(mSelectedImageBindingId);
        } else if (mSelectedAxisId != null) {
            mModelController.deleteDataSet(mSelectedAxisId);
        }

        if (selectedCount == 1) {
            modelUpdated();
            hideAxisContextMenu();
            hideTextContextMenu();
            hideImageContextMenu();
        }
    }

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
        mImageController.updateModel(mModelController.getModel());
        mDataPointController.updateModel(mModelController.getModel());
        mTimePinController.updateModel(mModelController.getModel());
        mLensController.updateModel(mModelController.getModel());
        mStrokeController.updateModel(mModelController.getModel());
        mEraserController.updateModel(mModelController.getModel());
        mSelectionController.updateModel(mModelController.getModel());

        if (mLensController.getCurrentTimelineId()) {
            showLensView(mLensController.getCurrentTimelineId(), mLensController.getCurrentCenterPercent());
        } else {
            hideLensView();
        }

        $("body").css("background-color", mModelController.getModel().getCanvas().color);

        if (mWorkspace) {
            mWorkspace.writeVersion(mModelController.getModelAsObject());
        }
    }

    // Setup main view buttons' events
    $("#datasheet-toggle-button").on("click", () => {
        if (mDrawerController.isOpen()) {
            mDrawerController.closeDrawer();
            mDataTableController.deselectCells();
            $('#link-button-div').hide();
        } else {
            mDrawerController.openDrawer();
        }
    })
    setupButtonTooltip("#datasheet-toggle-button", "Opens and closes the datasheets and lens view");

    $("#undo-button").on("click", () => { doUndo(); })
    setupButtonTooltip("#undo-button", "Undo last action");

    $("#redo-button").on("click", () => { doRedo(); })
    setupButtonTooltip("#redo-button", "Redo last undone action");

    $("#upload-button").on("click", async () => {
        setDefaultMode();
        showSubMenu("#upload-button");
    })
    setupButtonTooltip("#upload-button", "Shows menu to load previous work");

    $("#upload-button-folder").on("click", async () => {
        try {
            setDefaultMode();

            mWorkspace = await FileHandler.getWorkspace(false);
            workspaceSet();

            let model = await mWorkspace.getCurrentVersion();
            mModelController.setModelFromObject(model);
            modelUpdated();
        } catch (e) {
            if (e.message.includes("The user aborted a request")) return;
            if (e.message.includes("Missing folders")) {
                alert("Cannot open workspace: " + e.message)
                return;
            };
            console.error("Error fetching model", e); return;
        }
    })
    setupButtonTooltip("#upload-button-folder", "Select and load a viz from a workspace folder");

    $("#upload-button-json").on("click", async () => {
        let model;
        try {
            model = await FileHandler.getJSONModel();
            mModelController.setModelFromObject(model);
            modelUpdated();
            setDefaultMode();
        } catch (e) {
            if (e.message.includes("The user aborted a request")) return;
            console.error("Error loading workspace", e); return;
        }
    })
    setupButtonTooltip("#upload-button-json", "Replace current viz with a previously downloaded json file");

    $("#download-button").on("click", () => {
        setDefaultMode();
        showSubMenu("#download-button");
    })
    setupButtonTooltip("#download-button", "Shows menu with options to save your work");

    $("#download-button-folder").on("click", async () => {
        try {
            mWorkspace = await FileHandler.getWorkspace(true);
            mWorkspace.writeVersion(mModelController.getModelAsObject());

            workspaceSet();
        } catch (e) {
            if (e.message.includes("The user aborted a request")) return;
            if (e.message.includes("Folder not empty")) {
                alert("Cannot open workspace: " + e.message)
                return;
            };
            console.error("Error saving workspace", e); return;
        }
    })
    setupButtonTooltip("#download-button-folder", "Set the workspace folder for this visualization");

    $("#download-button-json").on("click", () => {
        FileHandler.downloadJSON(mModelController.getModelAsObject());
    })
    setupButtonTooltip("#download-button-json", "Package your image into a json file which can be uploaded later");

    $("#download-button-svg").on("click", () => {
        let viz = mVizLayer.clone(true);
        viz.attr("transform", "translate(" + 0 + "," + 0 + ")");
        viz.selectAll('g').each(function () {
            if (this.childElementCount == 0) {
                d3.select(this).remove();
            }
        });
        viz.select('#timeline-drawing-brush').remove();

        let { x, y, width, height } = viz.node().getBBox();

        let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', x + " " + y + " " + width + " " + height)
            .style("background-color", mModelController.getModel().getCanvas().color)
            .attr("xmlns", "http://www.w3.org/2000/svg");
        exportSVG.append(function () { return viz.node() });
        FileHandler.downloadSVG(exportSVG.node())
    })
    setupButtonTooltip("#download-button-svg", "Download your viz as svg");

    $("#download-button-png").on("click", async () => {
        let viz = mVizLayer.clone(true);
        viz.attr("transform", "translate(" + 0 + "," + 0 + ")");
        viz.selectAll('g').each(function () {
            if (this.childElementCount == 0) {
                d3.select(this).remove();
            }
        });
        viz.select('#timeline-drawing-brush').remove();

        let { x, y, height, width } = viz.node().getBBox();
        x -= 10;
        y -= 10;
        height += 20;
        width += 20;

        let canvas = await DataUtil.svgToCanvas(viz.node(), x, y, width, height, mModelController.getModel().getCanvas().color);
        FileHandler.downloadPNG(canvas)
    })
    setupButtonTooltip("#download-button-png", "Download your viz as png");
    // ---------------
    setupModeButton("#line-drawing-button", MODE_LINE_DRAWING, () => {
        mLineDrawingController.setActive(true);
    });
    setupButtonTooltip("#line-drawing-button", "Draws timelines")
    $("#line-drawing-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/timeline_drawing.mp4");
    })
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
    $("#line-manipulation-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/deform.mp4");
    })
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
    setupButtonTooltip('#scissors-button', "Splits timelines")
    $('#scissors-button').on("dblclick", function () {
        showVideoViewer("img/tutorial/scissors.mp4");
    })

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
    $('#color-brush-button',).on("dblclick", function () {
        showVideoViewer("img/tutorial/stroke_annotation.mp4");
    })
    setupSubModeButton('#color-brush-button', '-eyedropper', MODE_COLOR_BRUSH_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-brush-button-eyedropper', "Copies the color from anything that can be colored")
    $("#color-brush-button-color-picker").on("click", (e) => {
        setColorPickerInputColor(mColorBrushController.getColor());
        toggleColorPicker(e);
    });
    setupButtonTooltip("#color-brush-button-color-picker", "Choose brush color");

    $("#color-brush-button-grow").on("click", () => {
        mColorBrushController.increaseBrushRadius();
        mLensController.increaseBrushRadius();
    })
    $("#color-brush-button-shrink").on("click", () => {
        mColorBrushController.decreaseBrushRadius();
        mLensController.decreaseBrushRadius();
    })


    setupModeButton('#text-button', MODE_TEXT, () => {
        mLineViewController.setActive(true);
        mTextController.setActive(true);
    });
    setupButtonTooltip('#text-button', "Creates text items on timelines or on the main view")
    $('#text-button',).on("dblclick", function () {
        showVideoViewer("img/tutorial/text.mp4");
    })
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
    $("#delete-text-button").on("click", deleteSelected);
    setupButtonTooltip("#delete-text-button", "Unlink this text from the visual");

    setupModeButton('#image-button', MODE_IMAGE, () => {
        mLineViewController.setActive(true);
        mImageController.setActive(true);
    });
    setupButtonTooltip('#image-button', "Add images to the viz")
    $('#image-button').on("dblclick", function () {
        showVideoViewer("img/tutorial/image.mp4");
    })


    $("#image-unlink-button").on("click", () => {
        if (!mSelectedImageBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        mModelController.imageBindingToCanvasBinding(mSelectedImageBindingId);
        mSelectedImageBindingId = null;

        setDefaultMode();
        modelUpdated();
    })
    setupButtonTooltip("#image-unlink-button", "Detach image from line")
    $("#delete-image-button").on("click", deleteSelected);
    setupButtonTooltip("#delete-image-button", "Delete this image");

    setupModeButton('#image-link-button', MODE_IMAGE_LINK, () => {
        if (!mSelectedImageBindingId) {
            console.error("Button should not be clickable!");
            setDefaultMode();
            return;
        }
        mLinkingBinding = mModelController.getModel().getImageBindingById(mSelectedImageBindingId);
        mLineViewController.setActive(true);
    });
    setupButtonTooltip("#image-link-button", "Attach image to line")

    $("#image-time-edit-button").on("click", (event) => {
        if (!mSelectedImageBindingId) {
            console.error("Button should not be clickable!");
            return;
        }

        let imageBinding = mModelController.getModel().getImageBindingById(mSelectedImageBindingId);
        if (!imageBinding) {
            console.error("Image binding not found for id!", mSelectedImageBindingId);
            return;
        }

        let screenCoords = { x: event.clientX, y: event.clientY };
        let inputbox = d3.select("#input-box");

        inputbox.on('input', null)
            .style("top", Math.floor(screenCoords.y) + "px")
            .style("left", Math.floor(screenCoords.x) + "px")
            .on('input', function (e) {
                let value = inputbox.property("value");
                let isValid = value && (!isNaN(new Date(value)) || !isNaN(new Date(parseInt(value))));
                if (isValid) {
                    inputbox.style("background-color", "")
                } else {
                    inputbox.style("background-color", "lightpink")
                }
                inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
            }).on('change', function (e) {
                inputbox
                    .style("top", "-400px")
                    .style("left", "-200px")
            }).on('blur', function (e) {
                let value = inputbox.property("value");
                let isValid = value && (!isNaN(new Date(value)) || !isNaN(new Date(parseInt(value))));
                if (isValid) {
                    let time = new Date(value);
                    if (isNaN(time)) {
                        time = new Date(parseInt(value));
                    }
                    if (isNaN(time)) {
                        console.error("Time was valid then it wasn't!")
                        return;
                    }
                    mModelController.updateImageTime(imageBinding.id, time.getTime());
                    modelUpdated();
                }
                inputbox
                    .style("top", "-400px")
                    .style("left", "-200px")
            });

        inputbox.property("value", imageBinding.timeStamp ? DataUtil.getFormattedDate(imageBinding.timeStamp) : "");
        inputbox.style("height", inputbox.property("scrollHeight") + "px");
        inputbox.style("width", 200 + "px");

        inputbox.node().focus();
    })
    setupButtonTooltip("#image-time-edit-button", "Edit the time assigned to the image")


    setupModeButton('#pin-button', MODE_PIN, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mImageController.setActive(true);
    });
    setupButtonTooltip('#pin-button', "Creates and moves time pins on timelines")
    $('#pin-button',).on("dblclick", function () {
        showVideoViewer("img/tutorial/pin.mp4");
    })

    // ---------------
    $("#selection-button").on("click", () => {
        setDefaultMode();
    })
    setupButtonTooltip("#selection-button", "Select and move items around")
    $("#selection-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/selection.mp4");
    })


    setupModeButton("#eraser-button", MODE_ERASER, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button", "Erases all the things!")
    $("#eraser-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/eraser.mp4");
    })
    setupSubModeButton("#eraser-button", "-timeline", MODE_ERASER_TIMELINE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-timeline", "Erases timelines only")
    setupSubModeButton("#eraser-button", "-stroke", MODE_ERASER_STROKE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-stroke", "Erases strokes only")
    setupSubModeButton("#eraser-button", "-point", MODE_ERASER_POINT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-point", "Erases points only")
    setupSubModeButton("#eraser-button", "-text", MODE_ERASER_TEXT, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-text", "Erases text only")
    setupSubModeButton("#eraser-button", "-pin", MODE_ERASER_PIN, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-pin", "Erases pins only")
    setupSubModeButton("#eraser-button", "-image", MODE_ERASER_IMAGE, () => {
        mEraserController.setActive(true);
    });
    setupButtonTooltip("#eraser-button-image", "Erases images only")

    setupModeButton('#color-bucket-button', MODE_COLOR_BUCKET, () => {
        mLineViewController.setActive(true);
        mTimePinController.setActive(true);
        mDataPointController.setActive(true);
        mTextController.setActive(true);
        mStrokeController.setActive(true);
    });
    setupButtonTooltip('#color-bucket-button', "Colors all the things!")
    $("#color-bucket-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/bucket.mp4");
    })
    setupSubModeButton('#color-bucket-button', '-eyedropper', MODE_COLOR_BUCKET_EYEDROPPER, setEyeDropperActive);
    setupButtonTooltip('#color-bucket-button-eyedropper', "Copies the color from anything that can be colored")
    $("#color-bucket-button-color-picker").on("click", (e) => {
        setColorPickerInputColor(mBucketColor);
        toggleColorPicker(e);
    });
    setupButtonTooltip("#color-bucket-button-color-picker", "Choose color to color things with");

    $('#color-picker-wrapper').farbtastic((color) => {
        if (color != "#NaNNaNNaN") {
            color = color + getOpacityInput();
            if (mMode == MODE_COLOR_BRUSH) {
                setColorBrushColor(color);
            } else if (mMode == MODE_COLOR_BUCKET) {
                setColorBucketColor(color);
            } else if (mMode == MODE_LINE_DRAWING) {
                setLineDrawingColor(color);
            }
            setColorPickerInputColor(color);
        }
    });
    $("#color-picker-input").on('input', (e) => {
        if (mMode == MODE_COLOR_BRUSH) {
            setColorBrushColor($("#color-picker-input").val());
        } else if (mMode == MODE_COLOR_BUCKET) {
            setColorBucketColor($("#color-picker-input").val());
        } else if (mMode == MODE_LINE_DRAWING) {
            setLineDrawingColor($("#color-picker-input").val());
        }
        setColorPickerInputColor($("#color-picker-input").val());
    })
    $("#opacity-input").on('change', function () {
        let opacity = getOpacityInput();
        let color = $("#color-picker-input").val().substring(0, 7) + opacity;

        if (mMode == MODE_COLOR_BRUSH) {
            setColorBrushColor(color);
        } else if (mMode == MODE_COLOR_BUCKET) {
            setColorBucketColor(color);
        } else if (mMode == MODE_LINE_DRAWING) {
            setLineDrawingColor(color);
        }
        setColorPickerInputColor(color);
    })

    // set color to a random color
    setColorBrushColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + "FF")
    setColorBucketColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + "FF")
    setLineDrawingColor("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') + "FF")

    // ---------------
    setupModeButton('#lens-button', MODE_LENS, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#lens-button', "Displayed the clicked section of timeline in the lens view")
    $("#lens-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/lens.mp4");
    })

    setupModeButton("#panning-button", MODE_PAN, () => {
        mLensController.setPanActive(true);
        mImageController.setActive(true);
    });
    setupButtonTooltip("#panning-button", "Pans the main view and the lens view")
    $("#panning-button").on("dblclick", function () {
        showVideoViewer("img/tutorial/pan.mp4");
    })


    // setup other buttons

    setupModeButton('#link-button', MODE_LINK, () => {
        mLineViewController.setActive(true);
    });
    setupButtonTooltip('#link-button', "Attaches data to timelines")

    $("#toggle-data-style-button").on("click", () => {
        if (!mSelectedAxisId) { console.error("Button should not be clickable!"); return; }
        mModelController.toggleDataStyle(mSelectedAxisId);
        modelUpdated();
    });
    setupButtonTooltip("#toggle-data-style-button", "Toggle the data display style");
    $('#dynamic-normals-axis-button').on("click", () => {
        if (!mSelectedAxisId) { console.error("Button should not be clickable!"); return; }
        mModelController.updateAxisDataAlignment(mSelectedAxisId, DataDisplayAlignments.FIXED);

        $('#dynamic-normals-axis-button').hide();
        $('#fixed-normals-axis-button').show();
        modelUpdated();
    });
    setupButtonTooltip('#dynamic-normals-axis-button', "Change the data alignment relative to the line.");
    $('#fixed-normals-axis-button').on("click", () => {
        if (!mSelectedAxisId) { console.error("Button should not be clickable!"); return; }
        mModelController.updateAxisDataAlignment(mSelectedAxisId, DataDisplayAlignments.DYNAMIC);

        $('#fixed-normals-axis-button').hide();
        $('#dynamic-normals-axis-button').show();
        modelUpdated();
    });
    setupButtonTooltip('#fixed-normals-axis-button', "Change the data alignment relative to the line.");
    $("#delete-axis-button").on("click", deleteSelected);
    setupButtonTooltip("#delete-axis-button", "Unlink all data points in this set");

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
        modelUpdated();
    })
    setupButtonTooltip("#add-datasheet-button", "Adds a new datasheet")

    $("#upload-datasheet-button").on("click", async () => {
        let csv = await FileHandler.getCSVDataFile();
        mModelController.addTableFromCSV(csv.data);
        modelUpdated();
    })
    setupButtonTooltip("#upload-datasheet-button", "Upload a csv datasheet")

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

                showSubMenu(buttonId);
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
                showSubMenu(buttonId);

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

    function showSubMenu(buttonId) {
        $('.sub-menu').hide();
        $(buttonId + '-sub-menu').show();
        $('#sub-menu-wrapper').css('top', window.height);
        $('#sub-menu-wrapper').show();

        // This is dump but nessisary to show the menu in the right origination
        // otherwise the sub-menu height is 0, so it can't tell if it's too tall.
        setTimeout(() => {
            let top = $(buttonId).offset().top;
            let height = $(buttonId + '-sub-menu').height();

            if ((top + height) > window.innerHeight) {
                $('#sub-menu-wrapper').css('top', "");
                $('#sub-menu-wrapper').css('bottom', window.innerHeight - ($(buttonId).offset().top + $(buttonId).height()));
            } else {
                $('#sub-menu-wrapper').css('top', top);
                $('#sub-menu-wrapper').css('bottom', "");
            }
        }, 1)
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
        mImageController.setActive(true);
        mStrokeController.setActive(true);

        $("#selection-button").css('opacity', '0.3');

        hideImageContextMenu();
        hideTextContextMenu();
        hideAxisContextMenu();

        mLinkingBinding = null;
        hideLinkLine();

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

    function clearMode() {
        mLineViewController.setActive(false);
        mLineDrawingController.setActive(false);
        mEraserController.setActive(false);
        mDeformController.setActive(false);
        mSmoothController.setActive(false);
        mTimePinController.setActive(false);
        mColorBrushController.setActive(false);
        mDataPointController.setActive(false);
        mTextController.setActive(false);
        mImageController.setActive(false);
        mStrokeController.setActive(false);
        mSelectionController.setActive(false);
        mLensController.resetMode();
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();
        $('#sub-menu-wrapper').hide();

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
        if (typeof color == 'string') {
            setOpacityInput(color.substring(7, 9))
        }
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

    function getOpacityInput() {
        let val = parseInt($('#opacity-input').val());
        if (isNaN(val)) val = 255;
        return val.toString(16).padStart(2, '0')
    }

    function setOpacityInput(value) {
        if (value.length == 2) {
            let val = parseInt(value, 16);
            if (!isNaN(val)) {
                $('#opacity-input').val(val)
            }
        } else {
            $('#opacity-input').val(255)
        }
    }
    // End color utility functions

    function showImageViewer(imageBinding) {
        $("#full-image").show();
        $("#video-viewer").hide();

        $("#full-image").attr("src", imageBinding.imageData);
        $('#image-viewer').show();
    }

    function showVideoViewer(videoURL) {
        $("#full-image").hide();
        $("#video-viewer").show();

        $("#video-viewer").empty();
        $("#video-viewer").append($("<source>").attr("src", videoURL));
        $("#video-viewer")[0].load();
        $('#image-viewer').show();
    }

    $("#image-viewer .close").on("click", function () {
        $('#image-viewer').hide();
    });

    function workspaceSet() {
        $("#download-button").attr("src", "img/download_button.png")
        $("#download-button-folder").attr("src", "img/folder_button.png")
    }

    function showLinkLine(coords1, coords2) {
        mLinkLine.attr('x1', coords1.x).attr('y1', coords1.y)
            .attr('x2', coords2.x).attr('y2', coords2.y);
        mLinkLine.style("visibility", '');
    }

    function hideLinkLine() {
        mLinkLine.style("visibility", 'hidden');
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

    function showLensView(timelineId, percent) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);
        if (!timeline) console.error("Bad state! tried to show highlight for non-existant line: " + timelineId);

        $("#lens-div").show();

        if (!mDrawerController.isOpen()) {
            mDrawerController.openDrawer();
        }

        mLineHighlight.showAround(timeline.points, percent, mLensSvg.attr("width"));
    }

    function hideLensView() {
        $("#lens-div").hide();

        mLensController.focus(null, null);
        mLineHighlight.hide();
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
            mHighlight.raise();
        }

        this.hide = function () { mHighlight.style("visibility", "hidden"); };
        // start hidden
        this.hide();
    }

    /** useful test and development function: */
    // $(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     console.log(e.type, screenToSvgCoords({ x: e.clientX, y: e.clientY }))
    // });

    mLineViewController.raise();
    mMainOverlay.raise();
    hideLensView();
    setDefaultMode();
});
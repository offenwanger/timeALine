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
    // Note that both click and drag get called, ensure code doesn't overlap. 
    mLineViewController.setLineClickCallback((timelineId, linePoint) => {
        if (mMode == MODE_COMMENT) {
            // TODO: Open the text input in new comment mode. 
            let time;
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
            } else {
                // this function should be called with some text already
                time = "";
                //TODO create a warp binding
            }

            mModelController.addBoundTextRow("<text>", time, timelineId);

            modelUpdated();
        } else if (mMode == MODE_LINK) {
            mModelController.bindCells(timelineId, mDataTableController.getSelectedCells());

            modelUpdated();
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

    mLineViewController.setLineDragStartCallback((timelineId, pointerEvent) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(timelineId);
            if (!timeline) {
                console.error("Bad timeline id! " + timelineId);
                return;
            }

            let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);
            let warpBinding = new DataStructs.WarpBinding(linePoint.percent);

            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                let time = mModelController.getModel().mapLinePercentToTime(timelineId, linePoint.percent);
                if (time instanceof Date) time = time.getTime();
                warpBinding.timeStamp = time;
            }

            mTimeWarpController.pinDragStart(timelineId, warpBinding);
        }
    })
    mLineViewController.setLineDragCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            mTimeWarpController.pinDrag(timelineId, linePoint.percent);
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, linePoint) => {
        if (mMode == MODE_PIN) {
            mTimeWarpController.pinDragEnd(timelineId, linePoint.percent);
            modelUpdated();
        }
    })

    mLineViewController.setMouseOverCallback((timelineId, mouseCoords) => {
        lineViewControllerShowTime(timelineId, mouseCoords);
        mDataTableController.highlightCells(mModelController.getModel().getCellBindingData(timelineId).map(b => [b.dataCell.id, b.timeCell.id]).flat());
    })

    mLineViewController.setMouseMoveCallback(lineViewControllerShowTime);

    function lineViewControllerShowTime(timelineId, mouseCoords) {
        let timeline = mModelController.getModel().getTimelineById(timelineId);
        let pointOnLine = PathMath.getClosestPointOnPath(mouseCoords, timeline.points);
        try {
            let message;
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                message = DataUtil.getFormattedDate(new Date(mModelController.getModel().mapLinePercentToTime(timelineId, pointOnLine.percent)));
            } else {
                message = (Math.round(pointOnLine.percent * 10000) / 100) + "%";
            }
            ToolTip.show(message, mouseCoords);
            mMouseDropShadow.show(pointOnLine, mouseCoords)
        } catch (e) { console.error(e.stack); }
    }

    mLineViewController.setMouseOutCallback((timelineId, mouseCoords) => {
        ToolTip.hide();
        mMouseDropShadow.hide();
        mDataTableController.highlightCells([]);
    })

    let mStrokeController = new StrokeController(mVizLayer, mVizOverlayLayer, mInteractionLayer);

    let mTimeWarpController = new TimeWarpController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mTimeWarpController.setUpdateWarpBindingCallback((timelineId, warpBindingData) => {
        mModelController.updateWarpBinding(timelineId, warpBindingData);
        modelUpdated();
    })

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

            let binding = new DataStructs.WarpBinding(linePoint.percent);
            if (cellBindingData.timeCell.isValid()) {
                binding.timeStamp = cellBindingData.timeCell.getValue();
            } else {
                binding.timeCellId = cellBindingData.timeCell.id;
            }

            mTimeWarpController.pinDragStart(timeline.id, binding);
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
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timeline.id);
            let linePoint = PathMath.getClosestPointOnPath(coords, timeline.points);

            mTimeWarpController.pinDrag(cellBindingData.timeline.id, linePoint.percent);

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
            let linePoint = PathMath.getClosestPointOnPath(coords, cellBindingData.timeline.points);

            let offset = MathUtil.subtractAFromB(linePoint, coords);
            mModelController.updateTextOffset(cellBindingData.cellBinding.id, offset);

            // this will trigger a warp point update, which will update everything
            mTimeWarpController.pinDragEnd(cellBindingData.timeline.id, linePoint.percent);

            modelUpdated();
        }
    });

    let mDataPointController = new DataPointController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mDataPointController.setAxisUpdatedCallback((axisId, oneOrTwo, newDist) => {
        mModelController.updateAxisDist(axisId, oneOrTwo, newDist);

        modelUpdated();
    });
    mDataPointController.setMouseOverCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mDataPointController.setMouseOutCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([]);
    })
    mDataPointController.setDragStartCallback((cellBindingData, pointerEvent) => {
        let coords = screenToSvgCoords({ x: pointerEvent.clientX, y: pointerEvent.clientY });

        if (mMode == MODE_PIN) {
            let linePoint = PathMath.getClosestPointOnPath(coords, cellBindingData.timeline.points);

            let binding = new DataStructs.WarpBinding(linePoint.percent);
            if (cellBindingData.timeCell.isValid()) {
                binding.timeStamp = cellBindingData.timeCell.getValue();
            } else {
                binding.timeCellId = cellBindingData.timeCell.id;
            }

            mTimeWarpController.pinDragStart(cellBindingData.timeline.id, binding);
            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([cellBindingData.timeline], [cellBindingData]);
        }

        return coords;
    });
    mDataPointController.setDragCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_PIN) {
            let linePoint = PathMath.getClosestPointOnPath(coords, cellBindingData.timeline.points);

            mTimeWarpController.pinDrag(cellBindingData.timeline.id, linePoint.percent);

            cellBindingData.linePercent = linePoint.percent;
            mDataPointController.drawPoints([cellBindingData.timeline], [cellBindingData]);
        }
    });
    mDataPointController.setDragEndCallback((cellBindingData, startPos, coords) => {
        if (mMode == MODE_PIN) {
            let linePoint = PathMath.getClosestPointOnPath(coords, cellBindingData.timeline.points);
            // this will trigger a warp point update, which will update everything
            mTimeWarpController.pinDragEnd(cellBindingData.timeline.id, linePoint.percent);

            modelUpdated();
        }
    });


    let mLineDrawingController = new LineDrawingController(mVizLayer, mVizOverlayLayer, mInteractionLayer);
    mLineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            mModelController.newTimeline(newPoints);

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
        // TODO: Add new stroke

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
        mTimeWarpController.onPointerMove(coords);
        mTextController.onPointerMove(coords);
        mDataPointController.onPointerMove(coords);
        mIronController.onPointerMove(coords);
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
        mTimeWarpController.onPointerUp(coords);
        mTextController.onPointerUp(coords);
        mDataPointController.onPointerUp(coords);
        mIronController.onPointerUp(coords);
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

    function modelUpdated() {
        mLineViewController.updateModel(mModelController.getModel());
        mLineDrawingController.updateModel(mModelController.getModel());
        mDragController.updateModel(mModelController.getModel());
        mIronController.updateModel(mModelController.getModel());
        mDataTableController.updateModel(mModelController.getModel());
        mTextController.updateModel(mModelController.getModel());
        mDataPointController.updateModel(mModelController.getModel());
        mTimeWarpController.updateModel(mModelController.getModel());
        mLensController.updateModel(mModelController.getModel());
        mStrokeController.updateModel(mModelController.getModel());

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
            mTimeWarpController.setActive(true);
            mMode = MODE_PIN;
            showIndicator('#pin-button', '#pin-mode-indicator');
        }
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
            showIndicator('#color-bucket-button', '#color-bucket-mode-indicator');
        }
    })

    $("#eyedropper-button").on("click", () => {
        if (mMode == MODE_EYEDROPPER) {
            setDefaultMode()
        } else {
            clearMode()
            mMode = MODE_EYEDROPPER;
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

        mMode = MODE_DEFAULT;
    }

    function clearMode() {
        mLineViewController.setActive(false);
        mLineDrawingController.setActive(false);
        mEraserController.setActive(false);
        mDragController.setActive(false);
        mIronController.setActive(false);
        mTimeWarpController.setActive(false);
        mColorBrushController.setActive(false);
        mLensController.resetMode();
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();

        mMode = MODE_NONE;
    }

    function setColor(color) {
        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $('#color-picker-button').css('background-color', color);
        $('#color-bucket-button').css('background-color', color);
        $('#color-bucket-mode-indicator').css('background-color', color);
        $('#color-brush-button').css('background-color', color);
        $('#color-brush-mode-indicator').css('background-color', color);
        mColorBrushController.setColor(color)
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
            .style("mix-blend-mode", "screen")
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
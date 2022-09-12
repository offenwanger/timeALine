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
    const MODE_EYEDROPPER = "eyedropper";
    const MODE_PAN = "pan";
    const MODE_LINK = "link";

    let mMode = MODE_DEFAULT;
    let mDraggingValue = null;
    let mSvg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

    let mLensSvg = d3.select('#lens-view').append('svg')
        .attr('width', $("#lens-view").width())
        .attr('height', $("#lens-view").height());

    let mMouseDropShadow = new MouseDropShadow(mSvg);
    let mLineHighlight = new LineHighlight(mSvg);

    let mModelController = new ModelController();

    let mLineViewController = new LineViewController(mSvg);
    // Note that both click and drag get called, ensure code doesn't overlap. 
    mLineViewController.setLineClickCallback((timelineId, linePoint) => {
        if (mMode == MODE_COMMENT) {
            let type = mModelController.getModel().hasTimeMapping(timelineId) ? DataTypes.TIME_BINDING : DataTypes.NUM;
            let time = mModelController.getModel().mapLinePercentToTime(timelineId, type, linePoint.percent);

            mModelController.addBoundTextRow(time.toString(), time, timelineId);

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

    mLineViewController.setLineDragStartCallback((timelineId, mousePoint, linePoint) => {
        if (mMode == MODE_PIN) {
            let type = mModelController.getModel().hasTimeMapping(timelineId) ? DataTypes.TIME_BINDING : DataTypes.NUM;
            let time = mModelController.getModel().mapLinePercentToTime(timelineId, type, linePoint.percent);

            let tableRowData = mModelController.addTimeRow(time);
            mDataTableController.addOrUpdateTables(mModelController.getModel().getAllTables());

            let warpBindingData = new DataStructs.WarpBindingData(timelineId, null,
                tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                linePoint.percent);
            mTimeWarpController.pinDragStart(timelineId, warpBindingData);
        }
    })
    mLineViewController.setLineDragCallback((timelineId, mousePoint, linePoint) => {
        if (mMode == MODE_PIN) {
            mTimeWarpController.pinDrag(timelineId, linePoint.percent);
        }
    })
    mLineViewController.setLineDragEndCallback((timelineId, mousePoint, linePoint) => {
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
            let time;
            if (mModelController.getModel().hasTimeMapping(timelineId)) {
                time = mModelController.getModel().mapLinePercentToTime(timelineId, DataTypes.TIME_BINDING, pointOnLine.percent).toString();
            } else {
                time = "" + Math.round(mModelController.getModel().mapLinePercentToTime(timelineId, DataTypes.NUM, pointOnLine.percent) * 100) / 100;
            }
            ToolTip.show(time, mouseCoords)
            mMouseDropShadow.show(pointOnLine, mouseCoords)
        } catch (e) { console.error(e.stack); }
    }

    mLineViewController.setMouseOutCallback((timelineId, mouseCoords) => {
        ToolTip.hide();
        mMouseDropShadow.hide();
        mDataTableController.highlightCells([]);
    })

    let mLensController = new LensController(mLensSvg);
    mLensController.setPanCallback((timelineId, centerPercent, centerHeight) => {
        if (timelineId && mModelController.getModel().getTimelineById(timelineId)) {
            mLineHighlight.showAround(mModelController.getModel().getTimelineById(timelineId).points, centerPercent, mLensSvg.attr("width"));
        }
    })

    let mStrokeController = new StrokeController(mSvg);

    let mTimeWarpController = new TimeWarpController(mSvg);
    mTimeWarpController.setUpdateWarpBindingCallback((timelineId, warpBindingData) => {
        mModelController.addOrUpdateWarpBinding(timelineId, warpBindingData);

        modelUpdated();
    })

    let mTextController = new TextController(mSvg);
    mTextController.setTextUpdatedCallback((cellId, text) => {
        mModelController.updateText(cellId, text);

        modelUpdated();
    });
    mTextController.setMouseOverCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    mTextController.setMouseOutCallback((cellBindingData, mouseCoords) => {
        mDataTableController.highlightCells([]);
    })
    mTextController.setDragStartCallback((cellBindingData, startPos) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(startPos, timeline.points);

            // check if there is a warp binding for this row
            let warpBindingData = mModelController.getModel().getWarpBindingData(cellBindingData.timelineId);
            mDraggingValue = {};
            // copy to avoid data leaks
            mDraggingValue.cellBindingData = cellBindingData.copy();

            mDraggingValue.binding = warpBindingData.find(wbd => wbd.rowId == cellBindingData.rowId);
            if (mDraggingValue.binding) {
                mDraggingValue.binding.linePercent = linePoint.percent;
            } else {
                // if not, create one
                mDraggingValue.binding = new DataStructs.WarpBindingData(cellBindingData.timelineId, null,
                    cellBindingData.tableId, cellBindingData.rowId, cellBindingData.timeCell,
                    linePoint.percent);
            }

            mTimeWarpController.pinDragStart(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding);
            mDraggingValue.cellBindingData.linePercent = linePoint.percent;
            mTextController.drawTimelineAnnotations(
                mModelController.getModel().getTimelineById(mDraggingValue.cellBindingData.timelineId),
                [mDraggingValue.cellBindingData]);
        }
    });
    mTextController.setDragCallback((cellBindingData, startPos, mousePos) => {
        if (mMode == MODE_COMMENT || mMode == MODE_DEFAULT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, mousePos)) return;

            let bindingData = mModelController.getModel().getCellBindingData(cellBindingData.timelineId).filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT);
            let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(startPos, mousePos));

            // copy the dataCell to avoid modification leaks
            let dataCell = bindingData.find(b => b.cellBindingId == cellBindingData.cellBindingId).dataCell.copy();
            dataCell.offset = offset;
            bindingData.find(b => b.cellBindingId == cellBindingData.cellBindingId).dataCell = dataCell;

            mTextController.drawTimelineAnnotations(
                mModelController.getModel().getTimelineById(cellBindingData.timelineId),
                bindingData);
        } else if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            mDraggingValue.binding.linePercent = linePoint.percent;
            mTimeWarpController.pinDrag(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);

            let cellBData = mDraggingValue.cellBindingData;
            if (cellBData.dataCell.getType() == DataTypes.TEXT) {
                cellBData = cellBData.copy();
                cellBData.dataCell.offset = MathUtil.addAToB(cellBData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
            }
            cellBData.linePercent = linePoint.percent;
            mTextController.drawTimelineAnnotations(timeline, [cellBData]);
        }
    });
    mTextController.setDragEndCallback((cellBindingData, startPos, mousePos) => {
        if (mMode == MODE_COMMENT || mMode == MODE_DEFAULT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, mousePos)) return;

            let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(startPos, mousePos));
            mModelController.updateTextOffset(cellBindingData.dataCell.id, offset);

            modelUpdated();
        } else if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
            mModelController.updateTextOffset(cellBindingData.dataCell.id, offset);

            mDraggingValue.binding.linePercent = linePoint.percent;
            // this will trigger a warp point update, which will update everything
            mTimeWarpController.pinDragEnd(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);

            modelUpdated();
        }

        mDraggingValue = null;
    });

    let mDataPointController = new DataPointController(mSvg);
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
    mDataPointController.setDragStartCallback((cellBindingData, startPos) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(startPos, timeline.points);

            // check if there is a warp binding for this row
            let warpBindingData = mModelController.getModel().getWarpBindingData(cellBindingData.timelineId);
            mDraggingValue = {};
            // copy to avoid data leaks
            mDraggingValue.cellBindingData = cellBindingData.copy();

            mDraggingValue.binding = warpBindingData.find(wbd => wbd.rowId == cellBindingData.rowId);
            if (mDraggingValue.binding) {
                mDraggingValue.binding.linePercent = linePoint.percent;
            } else {
                // if not, create one
                mDraggingValue.binding = new DataStructs.WarpBindingData(cellBindingData.timelineId, null,
                    cellBindingData.tableId, cellBindingData.rowId, cellBindingData.timeCell,
                    linePoint.percent);
            }

            mTimeWarpController.pinDragStart(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding);
            mDraggingValue.cellBindingData.linePercent = linePoint.percent;
            mDataController.drawTimelineData(
                mModelController.getModel().getTimelineById(mDraggingValue.cellBindingData.timelineId),
                [mDraggingValue.cellBindingData]);
        }
    });
    mDataPointController.setDragCallback((cellBindingData, startPos, mousePos) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            mDraggingValue.binding.linePercent = linePoint.percent;
            mTimeWarpController.pinDrag(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);

            let cellBData = mDraggingValue.cellBindingData;
            if (cellBData.dataCell.getType() == DataTypes.TEXT) {
                cellBData = cellBData.copy();
                cellBData.dataCell.offset = MathUtil.addAToB(cellBData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
            }
            cellBData.linePercent = linePoint.percent;
            mDataController.drawTimelineData(timeline, [cellBData]);
        }
    });
    mDataPointController.setDragEndCallback((cellBindingData, startPos, mousePos) => {
        if (mMode == MODE_PIN) {
            let timeline = mModelController.getModel().getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            if (cellBindingData.dataCell.getType() == DataTypes.TEXT) {
                let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
                mModelController.updateTextOffset(cellBindingData.dataCell.id, offset);
            }

            mDraggingValue.binding.linePercent = linePoint.percent;
            // this will trigger a warp point update, which will update everything
            mTimeWarpController.pinDragEnd(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);

            modelUpdated();
        }

        mDraggingValue = null;
    });


    let mLineDrawingController = new LineDrawingController(mSvg);
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

    let mColorBrushController = new ColorBrushController(mSvg);
    mColorBrushController.setDrawFinishedCallback((points, color) => {
        // TODO: Add new stroke

        modelUpdated();
    })

    let mLensColorBrushController = new ColorBrushController(mLensSvg);
    mLensColorBrushController.setDrawFinishedCallback((points, color) => {
        let timelineId = mLensController.getCurrentTimelineId();
        if (timelineId) {
            let mappedPoints = mLensController.mapPointsToCurrentTimeline(points)
            mModelController.addTimelineStroke(timelineId, mappedPoints, color);

            modelUpdated();
        }
    })

    let mEraserController = new EraserController(mSvg, () => { return mModelController.getModel().getAllTimelines(); });
    mEraserController.setEraseCallback(lineData => {
        let eraseIds = lineData.filter(d => d.segments.length == 1 && d.segments[0].label == SEGMENT_LABELS.DELETED).map(d => d.id);
        let breakData = lineData.filter(d => d.segments.length > 1);

        eraseIds.forEach(id => mModelController.deleteTimeline(id));
        breakData.forEach(d => mModelController.breakTimeline(d.id, d.segments));

        modelUpdated();
    })

    let mDragController = new DragController(mSvg);
    mDragController.setLineModifiedCallback(data => {
        data.forEach(d => mModelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));

        modelUpdated();
    });

    let mIronController = new IronController(mSvg);
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
            console.error("Error while getting file: " + err)
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
            mLensColorBrushController.setActive(true);
            showIndicator('#color-brush-button', '#color-brush-mode-indicator');
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
            for (let j = 0; j < newTable.dataColumns.length; j++) {
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
        mLensColorBrushController.setActive(false);
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
        mLensColorBrushController.setColor(color)
        $.farbtastic('#color-picker-wrapper').setColor(color);
    }

    function MouseDropShadow(svg) {
        let shadow = svg.append('g')
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

    function LineHighlight(svg) {
        let mHighlight = svg.append('path')
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
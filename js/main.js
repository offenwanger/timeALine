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
    const MODE_COLOR = "color";
    const MODE_EYEDROPPER = "eyedropper";
    const MODE_LINK = "link";

    let svg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

    let mMouseDropShadow = new MouseDropShadow(svg);

    let modelController = new ModelController();

    let mDraggingValue = null;

    let lineViewController = new LineViewController(svg);
    // Note that both click and drag get called, ensure code doesn't overlap. 
    lineViewController.setLineClickCallback((timelineId, linePoint) => {
        if (mode == MODE_COMMENT) {
            let type = modelController.hasTimeMapping(timelineId) ? DataTypes.TIME_BINDING : DataTypes.NUM;
            let time = modelController.mapLinePercentToTime(timelineId, type, linePoint.percent);

            modelController.addBoundTextRow(time.toString(), time, timelineId);

            dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());
            dataTableController.updateTableData(modelController.getAllTables());
        } else if (mode == MODE_LINK) {
            modelController.bindCells(timelineId, dataTableController.getSelectedCells());
            dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());
        }
    })

    lineViewController.setLineDragStartCallback((timelineId, mousePoint, linePoint) => {
        if (mode == MODE_PIN) {
            let type = modelController.hasTimeMapping(timelineId) ? DataTypes.TIME_BINDING : DataTypes.NUM;
            let time = modelController.mapLinePercentToTime(timelineId, type, linePoint.percent);

            let tableRowData = modelController.addTimeRow(time);
            dataTableController.updateTableData(modelController.getAllTables());

            let warpBindingData = new DataStructs.WarpBindingData(timelineId, null,
                tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                linePoint.percent);
            timeWarpController.pinDragStart(timelineId, warpBindingData);
        }
    })
    lineViewController.setLineDragCallback((timelineId, mousePoint, linePoint) => {
        if (mode == MODE_PIN) {
            timeWarpController.pinDrag(timelineId, linePoint.percent);
        }
    })
    lineViewController.setLineDragEndCallback((timelineId, mousePoint, linePoint) => {
        if (mode == MODE_PIN) {
            timeWarpController.pinDragEnd(timelineId, linePoint.percent);
        }
    })

    lineViewController.setMouseOverCallback((timelineId, mouseCoords) => {
        lineViewControllerShowTime(timelineId, mouseCoords);
        dataTableController.highlightCells(modelController.getCellBindingData(timelineId).map(b => [b.dataCell.id, b.timeCell.id]).flat());
    })

    lineViewController.setMouseMoveCallback(lineViewControllerShowTime);

    function lineViewControllerShowTime(timelineId, mouseCoords) {
        let timeline = modelController.getTimelineById(timelineId);
        let pointOnLine = PathMath.getClosestPointOnPath(mouseCoords, timeline.points);
        try {
            let time;
            if (modelController.hasTimeMapping(timelineId)) {
                time = modelController.mapLinePercentToTime(timelineId, DataTypes.TIME_BINDING, pointOnLine.percent).toString();
            } else {
                time = "" + Math.round(modelController.mapLinePercentToTime(timelineId, DataTypes.NUM, pointOnLine.percent) * 100) / 100;
            }
            ToolTip.show(time, mouseCoords)
            mMouseDropShadow.show(pointOnLine, mouseCoords)
        } catch (e) { console.error(e.stack); }
    }

    lineViewController.setMouseOutCallback((timelineId, mouseCoords) => {
        ToolTip.hide();
        mMouseDropShadow.hide();
        dataTableController.highlightCells([]);
    })

    let timeWarpController = new TimeWarpController(svg);
    timeWarpController.setUpdateWarpBindingCallback((timelineId, warpBindingData) => {
        modelController.addOrUpdateWarpBinding(timelineId, warpBindingData);

        timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines(), modelController.getAllWarpBindingData());
        dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());
    })

    let dataController = new DataViewController(svg);
    dataController.setTextUpdatedCallback((cellId, text) => {
        modelController.updateText(cellId, text);
        dataTableController.updateTableData(modelController.getAllTables());
        dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());
    });
    dataController.setDataDragStartCallback((cellBindingData, startPos) => {
        if (mode == MODE_PIN) {
            let timeline = modelController.getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(startPos, timeline.points);

            // check if there is a warp binding for this row
            let warpBindingData = modelController.getWarpBindingData(cellBindingData.timelineId);
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

            timeWarpController.pinDragStart(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding);
            mDraggingValue.cellBindingData.linePercent = linePoint.percent;
            dataController.drawTimelineData(
                modelController.getTimelineById(mDraggingValue.cellBindingData.timelineId),
                [mDraggingValue.cellBindingData]);
        }
    });
    dataController.setDataDragCallback((cellBindingData, startPos, mousePos) => {
        if ((mode == MODE_COMMENT || mode == MODE_DEFAULT) && cellBindingData.dataCell.getType() == DataTypes.TEXT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, mousePos)) return;

            let bindingData = modelController.getCellBindingData(cellBindingData.timelineId).filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT);
            let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(startPos, mousePos));

            // copy the dataCell to avoid modification leaks
            let dataCell = bindingData.find(b => b.cellBindingId == cellBindingData.cellBindingId).dataCell.clone();
            dataCell.offset = offset;
            bindingData.find(b => b.cellBindingId == cellBindingData.cellBindingId).dataCell = dataCell;

            dataController.drawTimelineData(modelController.getTimelineById(cellBindingData.timelineId), bindingData);
        } else if (mode == MODE_PIN) {
            let timeline = modelController.getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            mDraggingValue.binding.linePercent = linePoint.percent;
            timeWarpController.pinDrag(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);

            let cellBData = mDraggingValue.cellBindingData;
            if (cellBData.dataCell.getType() == DataTypes.TEXT) {
                cellBData = cellBData.copy();
                cellBData.dataCell.offset = MathUtil.addAToB(cellBData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
            }
            cellBData.linePercent = linePoint.percent;
            dataController.drawTimelineData(timeline, [cellBData]);
        }
    });
    dataController.setDataDragEndCallback((cellBindingData, startPos, mousePos) => {
        if ((mode == MODE_COMMENT || mode == MODE_DEFAULT) && cellBindingData.dataCell.getType() == DataTypes.TEXT) {
            // if we didn't actually move, don't do anything.
            if (MathUtil.pointsEqual(startPos, mousePos)) return;

            let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(startPos, mousePos));
            modelController.updateTextOffset(cellBindingData.dataCell.id, offset);

            let bindingData = modelController.getCellBindingData(cellBindingData.timelineId).filter(cbd => cbd.dataCell.getType() == DataTypes.TEXT);

            dataController.drawTimelineData(modelController.getTimelineById(cellBindingData.timelineId), bindingData);
        } else if (mode == MODE_PIN) {
            let timeline = modelController.getTimelineById(cellBindingData.timelineId);
            let linePoint = PathMath.getClosestPointOnPath(mousePos, timeline.points);

            if (cellBindingData.dataCell.getType() == DataTypes.TEXT) {
                let offset = MathUtil.addAToB(cellBindingData.dataCell.offset, MathUtil.subtractAFromB(linePoint, mousePos));
                modelController.updateTextOffset(cellBindingData.dataCell.id, offset);
            }

            mDraggingValue.binding.linePercent = linePoint.percent;
            // this will trigger a warp point update, which will update everything
            timeWarpController.pinDragEnd(mDraggingValue.cellBindingData.timelineId, mDraggingValue.binding.linePercent);
        }

        mDraggingValue = null;
    });
    dataController.setAxisUpdatedCallback((axisId, oneOrTwo, newDist) => {
        modelController.updateAxisDist(axisId, oneOrTwo, newDist);
        dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());
    });
    dataController.setDataMouseOverCallback((cellBindingData, mouseCoords) => {
        dataTableController.highlightCells([cellBindingData.dataCell.id, cellBindingData.timeCell.id]);
    })
    dataController.setDataMouseOutCallback((cellBindingData, mouseCoords) => {
        dataTableController.highlightCells([]);
    })


    let lineDrawingController = new LineDrawingController(svg);
    lineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            modelController.newTimeline(newPoints);
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            let removedIds = modelController.mergeTimeline(startLineId, endLineId, newPoints);
            timeWarpController.removeTimeControls(removedIds);
        } else {
            modelController.extendTimeline(startPointLineId ? startPointLineId : endPointLineId, newPoints, startPointLineId != null);
        }

        updateAllControls();
    });


    let eraserController = new EraserController(svg, modelController.getAllTimelines);
    eraserController.setEraseCallback(lineData => {
        let eraseIds = lineData.filter(d => d.segments.length == 1 && d.segments[0].label == SEGMENT_LABELS.DELETED).map(d => d.id);
        let breakData = lineData.filter(d => d.segments.length > 1);

        eraseIds.forEach(id => modelController.deleteTimeline(id));
        breakData.forEach(d => modelController.breakTimeline(d.id, d.segments));

        timeWarpController.removeTimeControls(lineData.map(d => d.id));
        updateAllControls();
    })

    let dragController = new DragController(svg);
    dragController.setLineModifiedCallback(data => {
        data.forEach(d => modelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));
        updateAllControls();
    });

    let ironController = new IronController(svg);
    ironController.setLineModifiedCallback(data => {
        data.forEach(d => modelController.updateTimelinePoints(d.id, d.oldSegments, d.newSegments));
        updateAllControls();
    });

    let dataTableController = new DataTableController();
    dataTableController.setOnSelectionCallback((data, yTop, yBottom) => {
        let left = $('.drawer-content-wrapper')[0].getBoundingClientRect().left;

        if (data) {
            $('#link-button-div').css('top', (yTop + yBottom) / 2 - $('#link-button-div').height() / 2 - 10);
            $('#link-button-div').css('left', left - $('#link-button-div').width() / 2 - 10);
            $('#link-button-div').show();
        } else {
            $('#link-button-div').hide();
            if (mode == MODE_LINK) clearMode();
        }
    });
    dataTableController.setTableUpdatedCallback((table, changeType, changeData) => {
        modelController.tableUpdated(table, changeType, changeData);

        // Could do some more checks to avoid expensive redraws
        if (changeType == TableChange.DELETE_ROWS ||
            changeType == TableChange.DELETE_COLUMNS ||
            changeType == TableChange.UPDATE_CELLS) {
            updateAllControls();
        }
    });

    function updateAllControls() {
        lineViewController.linesUpdated(modelController.getAllTimelines());
        lineDrawingController.linesUpdated(modelController.getAllTimelines());
        dragController.linesUpdated(modelController.getAllTimelines());
        ironController.linesUpdated(modelController.getAllTimelines());

        dataTableController.updateTableData(modelController.getAllTables());

        dataController.drawData(modelController.getAllTimelines(), modelController.getAllCellBindingData());

        timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines(), modelController.getAllWarpBindingData());
    }


    $("#line-drawing-button").on("click", () => {
        if (mode == MODE_LINE_DRAWING) {
            setDefaultMode()
        } else {
            clearMode()
            lineDrawingController.setActive(true);
            mode = MODE_LINE_DRAWING;
            showIndicator('#line-drawing-button', '#line-drawing-mode-indicator');
        }
    })

    $("#eraser-button").on("click", () => {
        if (mode == MODE_ERASER) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_ERASER;
            eraserController.setActive(true);
            showIndicator('#eraser-button', '#eraser-mode-indicator');
        }
    })

    $("#drag-button").on("click", () => {
        if (mode == MODE_DRAG) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_DRAG;
            dragController.setActive(true);
            showIndicator('#drag-button', '#drag-mode-indicator');
        }
    })

    $("#iron-button").on("click", () => {
        if (mode == MODE_IRON) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_IRON;
            ironController.setActive(true);
            showIndicator('#iron-button', '#iron-mode-indicator');
        }
    })

    $("#scissors-button").on("click", () => {
        if (mode == MODE_SCISSORS) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_SCISSORS;
            showIndicator('#scissors-button', '#scissors-mode-indicator');
        }
    })

    $("#comment-button").on("click", () => {
        if (mode == MODE_COMMENT) {
            setDefaultMode()
        } else {
            clearMode()
            lineViewController.setActive(true);
            mode = MODE_COMMENT;
            showIndicator('#comment-button', '#comment-mode-indicator');
        }
    })

    $("#pin-button").on("click", () => {
        if (mode == MODE_PIN) {
            setDefaultMode()
        } else {
            clearMode()
            lineViewController.setActive(true);
            timeWarpController.setActive(true);
            mode = MODE_PIN;
            showIndicator('#pin-button', '#pin-mode-indicator');
        }
    })

    $("#download-button").on("click", () => {
        FileHandler.downloadJSON(modelController.getModel());
    })

    $("#upload-button").on("click", () => {
        FileHandler.getJSONModel().then(result => {
            modelController.setModelFromObject(result);
            updateAllControls();
        });
    })

    $("#datasheet-toggle-button").on("click", () => {
        if (dataTableController.isOpen()) {
            dataTableController.closeTableView();
        } else {
            dataTableController.openTableView();
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


    $("#color-button").on("click", () => {
        if (mode == MODE_COLOR) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_COLOR;
            showIndicator('#color-button', '#color-mode-indicator');
        }
    })

    $("#eyedropper-button").on("click", () => {
        if (mode == MODE_EYEDROPPER) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_EYEDROPPER;
            showIndicator('#eyedropper-button', '#eyedropper-mode-indicator');
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

        modelController.addTable(newTable);
        dataTableController.addTable(newTable);
    })

    $("#load-datasheet-button").on("click", () => {
        FileHandler.getCSVDataFile().then(result => {
            // TODO figure out if there's a header row
            modelController.newTable(result.data);
        });
    })

    $("#link-button").on('click', () => {
        if (mode == MODE_LINK) {
            setDefaultMode()
        } else {
            clearMode()
            mode = MODE_LINK;
            lineViewController.setActive(true);
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
        lineViewController.setActive(true);

        mode = MODE_DEFAULT;
    }

    function clearMode() {
        lineViewController.setActive(false);
        lineDrawingController.setActive(false);
        eraserController.setActive(false);
        dragController.setActive(false);
        ironController.setActive(false);
        timeWarpController.setActive(false);
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();

        mode = MODE_NONE;
    }

    function setColor(color) {
        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $('#color-picker-button').css('background-color', color);
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

    $(document).on('mousemove', function (e) {
        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });

    setDefaultMode();
});
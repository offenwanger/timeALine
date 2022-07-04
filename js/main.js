document.addEventListener('DOMContentLoaded', function (e) {
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

    let mode = MODE_DEFAULT;

    let svg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

    let modelController = new ModelController();

    let lineViewController = new LineViewController(svg);
    // Note that both click and drag get called, ensure code doesn't overlap. 
    lineViewController.setLineClickCallback((timelineId, linePoint) => {
        if (mode == MODE_COMMENT) {
            let type = DataTypes.NUM;
            if (modelController.hasTimeMapping(timelineId)) type = DataTypes.TIME_BINDING;
            let timeBinding = modelController.mapLinePercentToTime(timelineId, type, linePoint.percent);

            modelController.addBoundTextRow(timeBinding.toString(), timeBinding, timelineId);
            dataController.drawData(modelController.getBoundData());
            dataTableController.updateTableData(modelController.getAllTables());
        } else if (mode == MODE_LINK) {
            modelController.bindCells(timelineId, dataTableController.getSelectedCells());
            dataController.drawData(modelController.getBoundData());
        }
    })

    lineViewController.setLineDragStartCallback((timelineId, mousePoint, linePoint) => {
        if (mode == MODE_PIN) {
            let type = modelController.hasTimeMapping(timelineId) ? DataTypes.TIME_BINDING : DataTypes.NUM;
            let time = modelController.mapLinePercentToTime(timelineId, type, linePoint.percent);

            let rowData = modelController.addRowWithTime(time)
            dataTableController.updateTableData(modelController.getAllTables());

            let warpBinding = new DataStructs.WarpBinding(rowData.tableId, rowData.rowId, linePoint.percent, true);
            timeWarpController.pinDragStart(timelineId, warpBinding);
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

    let timeWarpController = new TimeWarpController(svg, modelController.getUpdatedWarpBindings);
    timeWarpController.setUpdateWarpBindingCallback((timelineId, warpBinding) => {
        modelController.updateWarpBinding(timelineId, warpBinding);

        timeWarpController.addOrUpdateTimeControls(modelController.getWarpBindingsData());
        dataController.drawData(modelController.getBoundData());
    })

    let dataController = new DataViewController(svg);
    dataController.setTextUpdatedCallback((cellId, text) => {
        modelController.updateText(cellId, text);
        dataTableController.updateTableData(modelController.getAllTables());
    });
    dataController.setTextMovedCallback((cellId, newOffset) => {
        modelController.updateTextOffset(cellId, newOffset);
    });
    dataController.setAxisUpdatedCallback((axisId, oneOrTwo, newDist) => {
        modelController.updateAxisDist(axisId, oneOrTwo, newDist);
        dataController.drawData(modelController.getBoundData());
    });


    let lineDrawingController = new LineDrawingController(svg);
    lineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            modelController.newTimeline(newPoints);
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            let removedIds = modelController.mergeTimeline(newPoints, startLineId, endLineId);
            timeWarpController.removeTimeControls(removedIds);
        } else {
            modelController.extendTimeline(newPoints, startPointLineId ? startPointLineId : endPointLineId, startPointLineId != null);
        }

        updateAllControls();
    });


    let eraserController = new EraserController(svg);
    eraserController.setEraseCallback(mask => {
        let removedIds = modelController.deletePoints(mask);
        timeWarpController.removeTimeControls(removedIds);

        updateAllControls();
    })

    let dragController = new DragController(svg);
    dragController.setLineModifiedCallback(lines => {
        modelController.pointsUpdated(lines);
        updateAllControls();
    });

    let ironController = new IronController(svg);
    ironController.setLineModifiedCallback(lines => {
        modelController.pointsUpdated(lines);
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
    dataTableController.setTableUpdatedCallback((table, redraw) => {
        modelController.tableUpdated(table);
        if (redraw) {
            updateAllControls();
        }
    });

    function updateAllControls() {
        lineViewController.linesUpdated(modelController.getTimelinePaths());
        lineDrawingController.linesUpdated(modelController.getTimelinePaths());
        dragController.linesUpdated(modelController.getTimelinePaths());
        ironController.linesUpdated(modelController.getTimelinePaths());
        dataTableController.updateTableData(modelController.getAllTables());

        dataController.drawData(modelController.getBoundData());

        timeWarpController.addOrUpdateTimeControls(modelController.getWarpBindingsData());
    }


    $("#line-drawing-button").on("click", () => {
        if (mode == MODE_LINE_DRAWING) {
            clearMode()
        } else {
            clearMode()
            lineDrawingController.setActive(true);
            mode = MODE_LINE_DRAWING;
            showIndicator('#line-drawing-button', '#line-drawing-mode-indicator');
        }
    })

    $("#eraser-button").on("click", () => {
        if (mode == MODE_ERASER) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_ERASER;
            eraserController.setActive(true);
            showIndicator('#eraser-button', '#eraser-mode-indicator');
        }
    })

    $("#drag-button").on("click", () => {
        if (mode == MODE_DRAG) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_DRAG;
            dragController.setActive(true);
            showIndicator('#drag-button', '#drag-mode-indicator');
        }
    })

    $("#iron-button").on("click", () => {
        if (mode == MODE_IRON) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_IRON;
            ironController.setActive(true);
            showIndicator('#iron-button', '#iron-mode-indicator');
        }
    })

    $("#scissors-button").on("click", () => {
        if (mode == MODE_SCISSORS) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_SCISSORS;
            showIndicator('#scissors-button', '#scissors-mode-indicator');
        }
    })

    $("#comment-button").on("click", () => {
        if (mode == MODE_COMMENT) {
            clearMode()
        } else {
            clearMode()
            lineViewController.setActive(true);
            mode = MODE_COMMENT;
            showIndicator('#comment-button', '#comment-mode-indicator');
        }
    })

    $("#pin-button").on("click", () => {
        if (mode == MODE_PIN) {
            clearMode()
        } else {
            clearMode()
            lineViewController.setActive(true);
            timeWarpController.setActive(true);
            mode = MODE_PIN;
            showIndicator('#pin-button', '#pin-mode-indicator');
        }
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
            clearMode()
        } else {
            clearMode()
            mode = MODE_COLOR;
            showIndicator('#color-button', '#color-mode-indicator');
        }
    })

    $("#eyedropper-button").on("click", () => {
        if (mode == MODE_EYEDROPPER) {
            clearMode()
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
            clearMode()
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

        mode = MODE_DEFAULT;
    }

    function setColor(color) {
        $('#color-picker-input').val(color);
        $('#color-picker-input').css('background-color', color);
        $('#color-picker-button').css('background-color', color);
        $.farbtastic('#color-picker-wrapper').setColor(color);
    }

    $(document).on('mousemove', function (e) {
        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });


});
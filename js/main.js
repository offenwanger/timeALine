document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_DEFAULT = 'default';
    const MODE_LINE_DRAWING = "drawing";
    const MODE_ERASER = "eraser";
    const MODE_DRAG = "drag";
    const MODE_IRON = "iron";
    const MODE_SCISSORS = "scissors";
    const MODE_COMMENT = "comment";
    const MODE_COLOR = "color";
    const MODE_EYEDROPPER = "eyedropper";
    const MODE_LINK = "link";

    let mode = MODE_DEFAULT;

    let svg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

    let modelController = new ModelController();

    let lineViewController = new LineViewController(svg);
    lineViewController.setLineClickCallback((id, linePoint) => {
        console.log(id, linePoint)
    })

    let timeWarpController = new TimeWarpController(svg, modelController.getUpdatedWarpSet, modelController.getTimeForLinePercent);
    timeWarpController.setWarpControlsModifiedCallback((timelineId, newControlSet) => {
        if (timelineId) modelController.updateWarpControls(timelineId, newControlSet);
        timeWarpController.addOrUpdateTimeControls([modelController.getTimelineById(timelineId)]);
        annotationController.drawAnnotations(modelController.getAnnotations());
    })

    let annotationController = new AnnotationController(svg, modelController.getTimeForLinePercent);
    annotationController.setAnnotationTextUpdatedCallback((annotationId, text) => {
        modelController.updateAnnotationText(annotationId, text);
    });
    annotationController.setAnnotationCreatedCallback((annotation, timelineId) => {
        modelController.addNewAnnotation(annotation, timelineId);
        annotationController.drawAnnotations(modelController.getAnnotations());
    });
    annotationController.setAnnotationMovedCallback((annotationId, newOffset) => {
        modelController.updateAnnotationTextOffset(annotationId, newOffset);
    });

    let lineDrawingController = new LineDrawingController(svg);
    lineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            let newTimeline = modelController.newTimeline(newPoints);
            lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
            lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
            dragController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }))
            ironController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }))

            // No need to update annotations, there won't be any for the new line. Just update the add-target. 
            annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

            timeWarpController.addOrUpdateTimeControls([newTimeline]);
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            let removedIds = modelController.mergeTimeline(newPoints, startLineId, endLineId);
            timeWarpController.removeTimeControls(removedIds);

            updateAllControls();
        } else {
            modelController.extendTimeline(newPoints, startPointLineId ? startPointLineId : endPointLineId, startPointLineId != null);

            updateAllControls();
        }
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

    function updateAllControls() {
        lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
        lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
        dragController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }))
        ironController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }))

        annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
        annotationController.drawAnnotations(modelController.getAnnotations());

        timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines());
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
            annotationController.setActive(true);
            mode = MODE_COMMENT;
            showIndicator('#comment-button', '#comment-mode-indicator');
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
            new DataStructs.DataColumn("Time", DataTypes.UNSPECIFIED),
            new DataStructs.DataColumn("Col2", DataTypes.UNSPECIFIED),
            new DataStructs.DataColumn("Col3", DataTypes.UNSPECIFIED),
        ]);
        newTable.dataRows = [["", "", ""], ["", "", ""], ["", "", ""]]
        dataTableController.addTable(newTable);
    })

    $("#load-datasheet-button").on("click", () => {
        FileHandler.getCSVDataFile().then(result => {
            // TODO figure out if there's a header row
            modelController.newDataset(result.data);
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
        annotationController.setActive(false);
        dragController.setActive(false);
        ironController.setActive(false);
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
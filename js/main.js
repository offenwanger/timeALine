document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_DEFAULT = 'default';
    const MODE_LINE_DRAWING = "drawing";
    const MODE_ERASER = "eraser";
    const MODE_DRAG = "drag";
    const MODE_IRON = "iron";
    const MODE_SCISSORS = "scissors";
    const MODE_COMMENT = "comment";
    const MODE_DATASHEET = "datasheet";

    let mode = MODE_DEFAULT;

    let svg = d3.select('#svg_container').append('svg')
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight - 50);

    let modelController = new ModelController();

    let lineViewController = new LineViewController(svg);

    let annotationController = new AnnotationController(svg, modelController.getTimeForLinePercent);
    annotationController.setAnnotationTextUpdatedCallback((annotationId, text) => {
        console.log("Finish me! update text!", annotationId, text);
    });
    annotationController.setAnnotationCreatedCallback((annotation, timelineId) => {
        modelController.addNewAnnotation(annotation, timelineId);
        annotationController.drawAnnotations(modelController.getAnnotations());
    });
    annotationController.setAnnotationMovedCallback((annotationId, newOffset) => {
        console.log("Finish me! update offset!", annotationId, newOffset)
    });

    let timeWarpController = new TimeWarpController(svg, modelController.getUpdatedWarpSet, modelController.getTimeForLinePercent);
    timeWarpController.setWarpControlsModifiedCallback((timelineId, newControlSet) => {
        if (timelineId) modelController.updateWarpControls(timelineId, newControlSet);
        timeWarpController.addOrUpdateTimeControls([modelController.getTimelineById(timelineId)]);
        annotationController.drawAnnotations(modelController.getAnnotations());
    })

    let lineDrawingController = new LineDrawingController(svg);
    lineDrawingController.setDrawFinishedCallback((newPoints, startPointLineId = null, endPointLineId = null) => {
        if (startPointLineId == null && endPointLineId == null) {
            let newTimeline = modelController.newTimeline(newPoints);
            lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
            lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

            // No need to update annotations, there won't be any for the new line. Just update the comment add target. 
            annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

            timeWarpController.addOrUpdateTimeControls([newTimeline]);
        } else if (startPointLineId != null && endPointLineId != null) {
            // the line which has it's end point connecting to the other line goes first
            let startLineId = endPointLineId;
            let endLineId = startPointLineId;
            let removedIds = modelController.mergeTimeline(newPoints, startLineId, endLineId);

            lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
            lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

            annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
            annotationController.drawAnnotations(modelController.getAnnotations());

            timeWarpController.removeTimeControls(removedIds);
            timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines());
        } else {
            modelController.extendTimeline(newPoints, startPointLineId ? startPointLineId : endPointLineId, startPointLineId != null);

            lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
            lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

            annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
            annotationController.drawAnnotations(modelController.getAnnotations());

            timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines());
        }
    });


    let eraserController = new EraserController(svg);
    eraserController.setEraseCallback(mask => {
        let removedIds = modelController.deletePoints(mask);

        lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
        lineDrawingController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));

        annotationController.linesUpdated(modelController.getAllTimelines().map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }));
        annotationController.drawAnnotations(modelController.getAnnotations());

        timeWarpController.removeTimeControls(removedIds);
        timeWarpController.addOrUpdateTimeControls(modelController.getAllTimelines());
    })

    let dragController = new DragController(svg);


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
            showIndicator('#drag-button', '#drag-mode-indicator');
        }
    })

    $("#iron-button").on("click", () => {
        if (mode == MODE_IRON) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_IRON;
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

    $("#datasheet-button").on("click", () => {
        FileHandler.getCSVDataFile().then(result => {
            // TODO figure out if there's a header row
            modelController.newDataset(result.data);
        });
    })

    function showIndicator(imgButtonId, modeIndicatorId) {
        $(imgButtonId).css('opacity', '0.3');
        $('#mode-indicator-div img').hide();
        $(modeIndicatorId).show();
        $('#mode-indicator-div').show();
    }

    function clearMode() {
        lineDrawingController.setActive(false);
        eraserController.setActive(false);
        annotationController.setActive(false);
        $('.tool-button').css('opacity', '');
        $('#mode-indicator-div img').hide();
        $('#mode-indicator-div').hide();

        mode = MODE_DEFAULT;
    }


    $(document).on('mousemove', function (e) {
        $('#mode-indicator-div').css({
            left: e.pageX + 10,
            top: e.pageY + 10
        });
    });


});
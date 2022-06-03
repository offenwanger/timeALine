document.addEventListener('DOMContentLoaded', function (e) {
    const MODE_DEFAULT = 'default';
    const MODE_BRUSH = "brush";
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

    let timeWarpController = new TimeWarpController(svg, modelController.getUpdatedWarpSet, modelController.getTimeForLinePercent);
    timeWarpController.setWarpControlsModifiedCallback((timelineId, newControlSet) => {
        console.log(timelineId, newControlSet);
    })

    let brushController = new BrushController(svg);
    brushController.setDrawFinishedCallback((newPoints, connectionId1 = null, extendStart = null, connectionId2 = null) => {
        if (connectionId1 == null) {
            let newTimeline = modelController.newTimeline(newPoints);
            lineViewController.drawTimeLines(modelController.getTimelineLinePaths());
            timeWarpController.addOrUpdateTimeControls([newTimeline]);
        } else if (connectionId2 == null) {
            modelController.extendTimeline(newPoints, connectionId1, extendStart);
        } else {
            let startId = extendStart ? connectionId2 : connectionId1;
            let endId = extendStart ? connectionId1 : connectionId2;
            modelController.mergeTimeline(newPoints, startId, endId);
        }
    });


    let eraserController = new EraserController(svg);
    let dragController = new DragController(svg);


    $("#brush-button").on("click", () => {
        if (mode == MODE_BRUSH) {
            clearMode()
        } else {
            clearMode()
            brushController.setActive(true);
            mode = MODE_BRUSH;
            showIndicator('#brush-button', '#brush-mode-indicator');
        }
    })

    $("#eraser-button").on("click", () => {
        if (mode == MODE_ERASER) {
            clearMode()
        } else {
            clearMode()
            mode = MODE_ERASER;
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

            brushController.setActive(true);
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
        brushController.setActive(false);
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
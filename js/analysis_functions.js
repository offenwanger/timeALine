function setAnalysisMode(modelUpdated, mModelController, getCanvasFromViz) {
    function disable(buttonId) {
        $(buttonId).css("opacity", "0.5");
        $(buttonId).off("click");
    }

    $('#extra-functions-div').show();
    disable("#undo-button");
    disable("#redo-button");
    disable("#upload-button");
    disable("#line-drawing-button");
    disable("#line-manipulation-button");
    disable("#scissors-button");
    disable("#toggle-timeline-style-button");
    disable("#color-brush-button");
    disable("#text-button");
    disable("#pin-button");
    disable("#image-button");
    disable("#selection-button");
    disable("#eraser-button");
    disable("#color-bucket-button");

    $('#extra-json-to-png').on('click', async () => {
        let workspace = await FileHandler.getWorkspace(false);
        await workspace.forEachVersion(async (version, versionNumber) => {
            mModelController.setModelFromObject(version);
            modelUpdated();

            let canvas = await getCanvasFromViz();
            await workspace.writePNG(canvas, versionNumber);
        })
    })

    $('#extra-versioning-to-json').on('click', async () => {
        let workspace = await FileHandler.getWorkspace(false);
        await workspace.forEachVersion(async (version, versionNumber) => {
            await workspace.writeJSON(version, versionNumber);
        })
    })

    $('#create-workspace-viz').on('click', async () => {
        let workspace = await FileHandler.getWorkspace(false);
        let logData = await workspace.getLogData();
        console.log(logData)
    })
}
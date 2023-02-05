function setupExtras(modelUpdated, mModelController, getCanvasFromViz) {
    $('#extra-functions-div').show();
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
}
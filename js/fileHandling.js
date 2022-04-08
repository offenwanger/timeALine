let FileHandler = function () {
    async function getDataFile() {
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return Papa.parse(contents);
    }

    return {
        getDataFile,
    }
}();
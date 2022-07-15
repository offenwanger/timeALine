let FileHandler = function () {
    async function getCSVDataFile() {
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return Papa.parse(contents);
    }

    function downloadJSON(obj) {
        var a = document.createElement("a");
        var file = new Blob([JSON.stringify(obj)], { type: 'text/plain' });
        a.href = URL.createObjectURL(file);
        a.download = 'json.txt';
        a.click();
    }

    async function getJSONModel() {
        // TODO: Validate. 
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return JSON.parse(contents);
    }

    return {
        getCSVDataFile,
        downloadJSON,
        getJSONModel,
    }
}();
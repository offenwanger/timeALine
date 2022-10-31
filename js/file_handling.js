let FileHandler = function () {
    async function getCSVDataFile() {
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return Papa.parse(contents);
    }

    async function getImageFile() {
        let fileHandle = await window.showOpenFilePicker({
            types: [{ description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] } },],
            multiple: false
        });
        let file = await fileHandle[0].getFile();
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onloadend = function () {
                resolve(reader.result)
            }
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function downloadJSON(obj) {
        var a = document.createElement("a");
        var file = new Blob([JSON.stringify(obj)], { type: 'text/plain' });
        a.href = URL.createObjectURL(file);
        a.download = 'viz.json';
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
        getImageFile,
        downloadJSON,
        getJSONModel,
    }
}();
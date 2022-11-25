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
        let blob = new Blob([JSON.stringify(obj)], { type: 'text/plain' });
        downloadFile(blob, 'timeALine_viz.json');
    }

    async function downloadPNG(canvas) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        downloadFile(blob, 'timeALine_viz.png');
    }

    function downloadSVG(svgElement) {
        let svgURL = new XMLSerializer().serializeToString(svgElement);
        var blob = new Blob([svgURL], { type: 'text/plain' });
        downloadFile(blob, 'timeALine_viz.svg');
    }

    function downloadFile(blob, name) {
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        // delete the internal blob reference to clear memory
        URL.revokeObjectURL(link.href);
    }

    async function getJSONModel() {
        // TODO: Validate. 
        let fileHandle = await window.showOpenFilePicker();
        let file = await fileHandle[0].getFile();
        let contents = await file.text();
        return JSON.parse(contents);
    }

    async function getWorkspace(create) {
        let directoryHandle = await window.showDirectoryPicker();
        let workspace = new Workspace(directoryHandle);
        await workspace.init(create);
        return workspace;
    }

    function Workspace(directoryHandle) {
        this.handle = directoryHandle;
        this.traceCount = 0;
        this.versionCount = 0;

        async function init(create) {
            if (create) {
                for await (let f of this.handle.values()) {
                    throw new Error("Folder not empty, this is here: " + f.name);
                }
                await this.handle.getDirectoryHandle("trace", { create });
                await this.handle.getDirectoryHandle("version", { create });
            } else {
                let expectedFolders = ["trace", "version"]
                for await (let f of this.handle.values()) {
                    let index = expectedFolders.indexOf(f.name);
                    if (index == -1) {
                        console.error("Unexpected folder!", folder);
                    } else {
                        expectedFolders.splice(index, 1);
                    }
                }
                if (expectedFolders.length > 0) {
                    throw new Error("Missing folders: " + expectedFolders.join(", "));
                }
            }

            let traceFolder = await this.handle.getDirectoryHandle("trace");
            for await (f of traceFolder.values()) {
                let num = parseInt(f.name.split(".")[0]);
                if (num) {
                    this.traceCount = Math.max(num + 1, this.traceCount);
                }
            }

            let versionFolder = await this.handle.getDirectoryHandle("version");
            for await (f of versionFolder.values()) {
                let num = parseInt(f.name.split(".")[0]);
                if (DataUtil.isNumeric(num)) {
                    this.versionCount = Math.max(num + 1, this.versionCount);
                }
            }
        }

        async function storeTrace(pngBlob) {
            let name = this.traceCount + ".png";
            this.traceCount++;

            let traceFolder = await this.handle.getDirectoryHandle("trace", { create: true });
            let fileHandle = await traceFolder.getFileHandle(name, { create: true });
            let stream = await fileHandle.createWritable();
            await stream.write(pngBlob);
            await stream.close();
        }

        async function writeVersion(obj) {
            let name = this.versionCount + ".json";
            this.versionCount++;

            let versionFolder = await this.handle.getDirectoryHandle("version", { create: true });
            let fileHandle = await versionFolder.getFileHandle(name, { create: true });
            let stream = await fileHandle.createWritable();
            await stream.write(JSON.stringify(obj));
            await stream.close();
        }

        async function getCurrentVersion() {
            let name = (this.versionCount - 1) + ".json";
            let versionFolder = await this.handle.getDirectoryHandle("version");
            let fileHandle = await versionFolder.getFileHandle(name);

            let file = await fileHandle.getFile();
            let contents = await file.text();
            return JSON.parse(contents);
        }

        this.init = init;
        this.storeTrace = storeTrace;
        this.writeVersion = writeVersion;
        this.getCurrentVersion = getCurrentVersion;
    }


    return {
        getCSVDataFile,
        getImageFile,
        downloadJSON,
        downloadPNG,
        downloadSVG,
        getJSONModel,
        getWorkspace,
    }
}();
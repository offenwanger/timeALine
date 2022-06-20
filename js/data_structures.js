let DataStructs = function () {
    let idCounter = 0;
    function getUniqueId() {
        idCounter++
        return Date.now() + "_" + idCounter;
    }

    function Timeline() {
        this.id = getUniqueId();
        this.warpPoints = [];
        this.linePath = new LinePath();
        this.dataSets = [];
        this.annotationDataset = new DataSet();
    }

    function WarpPoint(timeBinding = null, linePercent = 0, isStart = false, isEnd = false, id = null) {
        this.id = id ? id : getUniqueId();
        this.timeBinding = timeBinding ? timeBinding : new TimeBinding(TimeBindingTypes.PLACE_HOLDER, 0);
        this.linePercent = linePercent;
        this.isStart = isStart;
        this.isEnd = isEnd;

        this.clone = function () {
            return new WarpPoint(this.timeBinding.clone(), this.linePercent, this.isStart, this.isEnd, this.id);
        }
    }

    function LinePath() {
        this.id = getUniqueId();
        this.points = [];
    }

    // subset of a data table
    function DataSet() {
        this.id = getUniqueId();
        this.table = null;
        this.timeCol = null;
        this.valCol = null;
        this.dataRows = [];
        this.YAxis = null;
        this.clone = function () {
            let newDataSet = new DataSet();
            newDataSet.table = this.table;
            newDataSet.timeCol = this.timeCol;
            newDataSet.valCol = this.valCol;
            newDataSet.dataRows = [...this.dataRows]
            newDataSet.YAxis = this.YAxis ? this.YAxis.clone() : null;
            return newDataSet;
        }
    }

    function YAxis() {
        this.id = getUniqueId();
        this.val1 = 0;
        this.dist1 = 0;
        this.val2 = 1;
        this.dist2 = 1;
        this.linePercent = 0;
        this.clone = function () {
            let newAxis = new YAxis();
            newAxis.val1 = this.val1;
            newAxis.dist1 = this.dist1;
            newAxis.val2 = this.val2;
            newAxis.dist2 = this.dist2;
            newAxis.linePercent = this.linePercent;
        }
    }


    function DataTable(columns = []) {
        this.id = getUniqueId();
        this.dataRows = [];
        this.dataColumns = columns;
        this.pos = { x: 0, y: 0 };

        this.getRow = (rowId) => this.dataRows.find(row => row.id == rowId);
        this.getColumn = (colId) => this.dataColumns.find(col => col.id == colId)
        this.getDataset = () => {
            let table = Array(this.dataRows.length).fill(0).map(i => Array(this.dataColumns.length));

            this.dataRows.forEach(row => row.dataCells.forEach(cell => {
                let column = this.getColumn(cell.columnId);
                if (!column) {
                    console.error("Column missing!")
                } else {
                    table[row.index][column.index] = cell.val;
                }
            }))

            return table;
        }
    }

    function DataColumn(name, index) {
        this.id = getUniqueId();
        this.name = name;
        this.index = index;
    }

    function DataRow() {
        this.id = getUniqueId();
        this.dataCells = [];
        this.index = -1;
        this.getCell = (columnId) => this.dataCells.find(cell => cell.columnId == columnId);
    }

    function DataCell(type, val, columnId = null, offset = { x: 10, y: 10 }, valid = false) {
        this.id = getUniqueId();
        this.type = type;
        this.val = val;
        this.columnId = columnId;
        this.offset = offset
        this.valid = valid;
    }

    function TimeBinding(type = TimeBindingTypes.PLACE_HOLDER, value = 0) {
        this.id = getUniqueId();
        this.type = type;
        this.placeHolder = null;
        this.timeStamp = null;

        switch (type) {
            case TimeBindingTypes.PLACE_HOLDER:
                this.placeHolder = value;
                break;
            case TimeBindingTypes.TIMESTRAMP:
                this.timeStamp = value;
        }

        this.setTime = function (value) {
            switch (this.type) {
                case TimeBindingTypes.PLACE_HOLDER:
                    this.placeHolder = value;
                    break;
                case TimeBindingTypes.TIMESTRAMP:
                    this.timeStamp = value;
            }
        }

        this.toString = function () {
            switch (this.type) {
                case TimeBindingTypes.PLACE_HOLDER:
                    return (this.placeHolder * 100).toFixed(0) + "%"
                case TimeBindingTypes.TIMESTRAMP:
                    return new Date(this.timeStamp).toDateString();
            }
        }

        this.clone = function () {
            let tb = new TimeBinding(this.type)
            tb.placeHolder = this.placeHolder;
            tb.timeStamp = this.timeStamp;
            return tb;
        }
    }

    return {
        Timeline,
        WarpPoint,
        LinePath,
        DataSet,
        YAxis,
        DataTable,
        DataColumn,
        DataRow,
        DataCell,
        TimeBinding,
    }
}();


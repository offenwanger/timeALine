let DataStructs = function () {
    let idCounter = 0;
    function getUniqueId() {
        idCounter++
        return Date.now() + "_" + idCounter;
    }

    function Timeline(points = []) {
        this.id = getUniqueId();
        this.points = points;
        this.cellBindings = [];
        this.warpBindings = [];
        this.axisBindings = [];
    }

    function CellBinding(tableId, rowId, columnId, cellId) {
        this.id = getUniqueId();
        this.tableId = tableId;
        this.rowId = rowId;
        this.columnId = columnId;
        this.cellId = cellId;

        this.clone = function () {
            return new CellBinding(this.tableId, this.rowId, this.columnId, this.cellId);
        }
    }

    function WarpBinding(tableId, rowId, linePercent, isValid = true) {
        this.id = getUniqueId();
        this.tableId = tableId;
        this.rowId = rowId;
        this.linePercent = linePercent;
        this.isValid = isValid;
        this.clone = function () { return new WarpBinding(this.tableId, this.rowId, this.linePercent, this.isValid); };
    }

    // These are only for number sets now, but if we get 
    // another type (i.e. duration) might need a 'type' specifier. 
    function AxisBinding(columnId) {
        this.id = getUniqueId();
        this.columnId = columnId;
        this.val1 = 0;
        this.dist1 = 0;
        this.val2 = 1;
        this.dist2 = 1;
        this.linePercent = 1;
        this.clone = function () {
            let newAxis = new AxisBinding(this.columnId);
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

    function DataCell(type, val, columnId = null, offset = { x: 10, y: 10 }) {
        this.id = getUniqueId();
        this.type = type;
        this.val = val;
        this.columnId = columnId;
        this.offset = offset

        this.isValid = function () {
            switch (this.type) {
                case DataTypes.TEXT:
                    return true;
                case DataTypes.NUM:
                    if (DataUtil.isNumeric(this.val)) return true;
                    else return false;
                case DataTypes.TIME_BINDING:
                    return DataUtil.isDate(this.val);
                case DataTypes.UNSPECIFIED:
                    return true;
            }
        }

        this.getValue = function () {
            // if this isn't valid, return a string to display.
            if (!this.isValid()) return this.val.toString();

            switch (this.type) {
                case DataTypes.TEXT:
                    return this.val.toString();
                case DataTypes.NUM:
                    return parseFloat("" + this.val);
                case DataTypes.TIME_BINDING:
                    return this.val instanceof TimeBinding ? this.val : new TimeBinding(TimeBindingTypes.TIMESTRAMP, Date.parse(val));
                case DataTypes.UNSPECIFIED:
                    return DataUtil.inferDataAndType(this.val).val;
            }
        }

        this.getType = function () {
            return this.type == DataTypes.UNSPECIFIED ? DataUtil.inferDataAndType(this.val).type : this.type;
        }

        this.toString = function () {
            if (typeof this.val == 'string') {
                return this.val;
            } if (typeof this.val == 'number') {
                return "" + Math.round(this.val * 100) / 100;
            } else if (this.val instanceof TimeBinding) {
                return this.val.toString();
            } else {
                console.error("Invalid value type! ", this.val);
            }
        }

        this.clone = function () {
            return new DataCell(this.type, this.val, this.columnId, this.offset);
        }
    }

    function TimeBinding(type = TimeBindingTypes.TIMESTRAMP, value = 0) {
        this.id = getUniqueId();
        this.type = type;
        this.placeHolder = null;
        this.timeStamp = null;

        switch (type) {
            case TimeBindingTypes.TIMESTRAMP:
                this.timeStamp = value;
                break;
            default:
                console.error("Invalid time type: " + type);
        }

        this.setTime = function (value) {
            switch (this.type) {
                case TimeBindingTypes.TIMESTRAMP:
                    this.timeStamp = value;
                    break;
                default:
                    console.error("Invalid time type: " + type);
            }
        }

        this.toString = function () {
            switch (this.type) {
                case TimeBindingTypes.TIMESTRAMP:
                    return new Date(this.timeStamp).toDateString();
                default:
                    console.error("Invalid time type: " + type);
                    return "";
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
        CellBinding,
        WarpBinding,
        AxisBinding,
        DataTable,
        DataColumn,
        DataRow,
        DataCell,
        TimeBinding,
    }
}();


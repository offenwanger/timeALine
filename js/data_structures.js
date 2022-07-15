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
    Timeline.fromObject = function (obj) {
        let timeline = new Timeline(obj.points);
        timeline.id = obj.id;
        obj.cellBindings.forEach(b => timeline.cellBindings.push(CellBinding.fromObject(b)));
        obj.warpBindings.forEach(b => timeline.warpBindings.push(WarpBinding.fromObject(b)));
        obj.axisBindings.forEach(b => timeline.axisBindings.push(AxisBinding.fromObject(b)));
        return timeline;
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
    CellBinding.fromObject = function (obj) {
        let binding = new CellBinding(obj.tableId, obj.rowId, obj.columnId, obj.cellId);
        binding.id = obj.id;
        return binding;
    }

    function CellBindingData(timelineId, cellBindingId, tableId, rowId, timeCell, dataCell, linePercent, axisBinding = null) {
        this.timelineId = timelineId;
        this.cellBindingId = cellBindingId;
        this.tableId = tableId;
        this.rowId = rowId;
        this.timeCell = timeCell;
        this.dataCell = dataCell;
        this.linePercent = linePercent;
        this.axisBinding = axisBinding;

        // copy replicates the data without creating new objects.
        this.copy = function () {
            let b = new CellBindingData(
                this.timelineId,
                this.cellBindingId,
                this.tableId,
                this.rowId,
                this.timeCell.clone(),
                this.dataCell.clone(),
                this.linePercent,
                this.axisBinding
            )
            b.timeCell.id = this.timeCell.id;
            b.dataCell.id = this.dataCell.id;
            return b;
        }
    }

    function WarpBinding(tableId, rowId, linePercent, isValid = true) {
        this.id = getUniqueId();
        this.tableId = tableId;
        this.rowId = rowId;
        this.linePercent = linePercent;
        this.isValid = isValid;

        this.clone = function () {
            return new WarpBinding(this.tableId, this.rowId, this.linePercent, this.isValid);
        };
    }
    WarpBinding.fromObject = function (obj) {
        let binding = new WarpBinding(obj.tableId, obj.rowId, obj.linePercent, obj.isValid);
        binding.id = obj.id;
        return binding;
    }

    function WarpBindingData(timelineId, warpBindingId, tableId, rowId, timeCell, linePercent) {
        this.timelineId = timelineId;
        this.warpBindingId = warpBindingId;
        this.tableId = tableId;
        this.rowId = rowId;
        this.timeCell = timeCell;
        this.linePercent = linePercent;
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
            return newAxis;
        }
    }
    AxisBinding.fromObject = function (obj) {
        let binding = new AxisBinding(obj.columnId);
        binding.id = obj.id;
        binding.val1 = obj.val1;
        binding.dist1 = obj.dist1;
        binding.val2 = obj.val2;
        binding.dist2 = obj.dist2;
        binding.linePercent = obj.linePercent;
        return binding;
    }

    function DataTable(columns = []) {
        this.id = getUniqueId();
        this.dataRows = [];
        this.dataColumns = columns;

        this.getRow = (rowId) => this.dataRows.find(row => row.id == rowId);
        this.getColumn = (colId) => this.dataColumns.find(col => col.id == colId)
    }
    DataTable.fromObject = function (obj) {
        let table = new DataTable();
        table.id = obj.id;
        obj.dataRows.forEach(r => table.dataRows.push(DataRow.fromObject(r)));
        obj.dataColumns.forEach(c => table.dataColumns.push(DataColumn.fromObject(c)));
        return table;
    }

    function DataColumn(name, index) {
        this.id = getUniqueId();
        this.name = name;
        this.index = index;
    }
    DataColumn.fromObject = function (obj) {
        let column = new DataColumn(obj.name, obj.index);
        column.id = obj.id;
        return column;
    }

    function DataRow() {
        this.id = getUniqueId();
        this.index = -1;
        this.dataCells = [];
        this.getCell = (columnId) => this.dataCells.find(cell => cell.columnId == columnId);
    }
    DataRow.fromObject = function (obj) {
        let row = new DataRow();
        row.id = obj.id;
        row.index = obj.index;
        obj.dataCells.forEach(c => row.dataCells.push(DataCell.fromObject(c)));
        return row;
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
    DataCell.fromObject = function (obj) {
        let val = obj.val;
        if (typeof val == 'object') {
            if (val.type && Object.values(TimeBindingTypes).includes(val.type)) {
                val = new TimeBinding(val.type, val.value);
            } else {
                console.error("Badly formatted import: ", val)
            };
        }
        let cell = new DataCell(obj.type, val, obj.columnId, obj.offset);
        cell.id = obj.id;
        return cell;
    }

    function TimeBinding(type = TimeBindingTypes.TIMESTRAMP, value = 0) {
        this.type = type;
        this.value = value;

        switch (type) {
            case TimeBindingTypes.TIMESTRAMP:
                if (!Number.isInteger(value)) throw new Error("Invalid timestamp: " + value);
                // no additional setup nessiary
                break;
            default:
                console.error("Invalid time type: " + type);
        }

        this.toString = function () {
            switch (this.type) {
                case TimeBindingTypes.TIMESTRAMP:
                    return new Date(this.value).toDateString();
                default:
                    console.error("Invalid time type: " + type);
                    return "";
            }
        }

        this.clone = function () {
            return new TimeBinding(this.type, this.value);
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
        // utility data structs
        CellBindingData,
        WarpBindingData,
    }
}();


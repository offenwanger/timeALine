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
        this.annotationStrokes = [];

        this.copy = function () {
            let timeline = new Timeline();
            timeline.id = this.id;
            // sometimes the x, y, points are not nessisarily plain objects (i.e. SVP point)
            // TODO: Should maybe make my own point object...
            timeline.points = this.points.map(p => Object.assign({}, { x: p.x, y: p.y }));
            timeline.cellBindings = this.cellBindings.map(b => b.copy());
            timeline.warpBindings = this.warpBindings.map(b => b.copy());
            timeline.axisBindings = this.axisBindings.map(b => b.copy());
            timeline.annotationStrokes = this.annotationStrokes.map(b => b.copy());
            return timeline;
        }
    }

    Timeline.fromObject = function (obj) {
        let timeline = new Timeline(obj.points);
        timeline.id = obj.id;
        obj.cellBindings.forEach(b => timeline.cellBindings.push(CellBinding.fromObject(b)));
        obj.warpBindings.forEach(b => timeline.warpBindings.push(WarpBinding.fromObject(b)));
        obj.axisBindings.forEach(b => timeline.axisBindings.push(AxisBinding.fromObject(b)));
        obj.annotationStrokes ? obj.annotationStrokes.forEach(b => timeline.annotationStrokes.push(Stroke.fromObject(b))) : "";
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

        this.copy = function () {
            let binding = new CellBinding(this.tableId, this.rowId, this.columnId, this.cellId);
            binding.id = this.id;
            return binding;
        }
    }
    CellBinding.fromObject = function (obj) {
        let binding = new CellBinding(obj.tableId, obj.rowId, obj.columnId, obj.cellId);
        binding.id = obj.id;
        return binding;
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

        this.copy = function () {
            let binding = new WarpBinding(this.tableId, this.rowId, this.linePercent, this.isValid);
            binding.id = this.id;
            return binding;
        }
    }
    WarpBinding.fromObject = function (obj) {
        let binding = new WarpBinding(obj.tableId, obj.rowId, obj.linePercent, obj.isValid);
        binding.id = obj.id;
        return binding;
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

        this.copy = function () {
            let binding = new AxisBinding(this.columnId);
            binding.id = this.id;
            binding.val1 = this.val1;
            binding.dist1 = this.dist1;
            binding.val2 = this.val2;
            binding.dist2 = this.dist2;
            binding.linePercent = this.linePercent;
            return binding;
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

        this.copy = function () {
            let table = new DataTable();
            table.id = this.id;
            table.dataRows = this.dataRows.map(r => r.copy());
            table.dataColumns = this.dataColumns.map(c => c.copy());
            return table;
        }
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

        this.copy = function () {
            let col = new DataColumn(this.name, this.index);
            col.id = this.id;
            return col;
        }
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

        this.copy = function () {
            let row = new DataRow();
            row.id = this.id;
            row.index = this.index;
            row.dataCells = this.dataCells.map(c => c.copy());
            return row;
        }
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

        this.copy = function () {
            // TODO: Make sure that val get copied properly. We'll worry about it later.
            let cell = new DataCell(this.type, this.val, this.columnId, this.offset);
            cell.id = this.id;
            return cell;
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

    function Stroke(points, color) {
        if (!Array.isArray(points)) throw new Error("Invalid stroke array: " + points);

        this.id = getUniqueId();
        this.points = points;
        this.color = color;

        this.copy = function () {
            let stroke = new Stroke(this.points.map(p => p.copy()), this.color);
            stroke.id = this.id;
            return stroke;
        }

        this.equals = function (otherStroke) {
            if (this.id != otherStroke.id) return false;
            if (this.points.length != otherStroke.points.length) return false;
            if (this.color != otherStroke.color) return false;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i].linePercent != otherStroke.points[i].linePercent) return false;
                if (this.points[i].lineDist != otherStroke.points[i].lineDist) return false;
            }
            return true;
        }
    }
    Stroke.fromObject = function (obj) {
        let stroke = new Stroke(obj.points.map(p => StrokePoint.fromObject(p)), obj.color);
        stroke.id = obj.id;
        return stroke;
    }

    function StrokePoint(linePercent, lineDist) {
        this.linePercent = linePercent;
        this.lineDist = lineDist;
        this.copy = function () {
            return new StrokePoint(this.linePercent, this.lineDist);
        }
    }
    StrokePoint.fromObject = function (obj) {
        return new StrokePoint(obj.linePercent, obj.lineDist);
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
        Stroke,
        StrokePoint,
    }
}();


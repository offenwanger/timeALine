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
        this.timePins = [];
        this.axisBindings = [];
        this.annotationStrokes = [];

        this.copy = function () {
            let timeline = new Timeline();
            timeline.id = this.id;
            // sometimes the x, y, points are not nessisarily plain objects (i.e. SVP point)
            // TODO: Should maybe make my own point object...
            timeline.points = this.points.map(p => Object.assign({}, { x: p.x, y: p.y }));
            timeline.cellBindings = this.cellBindings.map(b => b.copy());
            timeline.timePins = this.timePins.map(b => b.copy());
            timeline.axisBindings = this.axisBindings.map(b => b.copy());
            timeline.annotationStrokes = this.annotationStrokes.map(b => b.copy());
            return timeline;
        }
    }

    Timeline.fromObject = function (obj) {
        let timeline = new Timeline(obj.points);
        timeline.id = obj.id;
        obj.cellBindings.forEach(b => timeline.cellBindings.push(CellBinding.fromObject(b)));
        obj.timePins.forEach(b => timeline.timePins.push(TimePin.fromObject(b)));
        obj.axisBindings.forEach(b => timeline.axisBindings.push(AxisBinding.fromObject(b)));
        obj.annotationStrokes ? obj.annotationStrokes.forEach(b => timeline.annotationStrokes.push(Stroke.fromObject(b))) : "";
        return timeline;
    }

    function CellBinding(cellId) {
        this.id = getUniqueId();
        this.cellId = cellId;
        // text value display offset
        this.offset = { x: 10, y: 10 };
        this.timePinId = null;

        this.clone = function () {
            let binding = new CellBinding(this.cellId);
            binding.offset = this.offset;
            binding.timePinId = this.timePinId;
            return binding;
        }

        this.copy = function () {
            let binding = new CellBinding(this.cellId);
            binding.offset = this.offset;
            binding.timePinId = this.timePinId;
            binding.id = this.id;
            return binding;
        }
    }
    CellBinding.fromObject = function (obj) {
        let binding = new CellBinding(obj.cellId);
        binding.offset = obj.offset;
        binding.timePinId = obj.timePinId;
        binding.id = obj.id;
        return binding;
    }

    /**
     * Time pins must have a line percent, but not necessarily anything else.
     * @param {float} linePercent 
     */
    function TimePin(linePercent) {
        this.id = getUniqueId();
        // Timestamp in miliseconds
        this.timeStamp = null;
        this.linePercent = linePercent;

        this.clone = function () {
            let binding = new TimePin(this.linePercent);
            binding.timeStamp = this.timeStamp;
            return binding;
        };

        this.copy = function () {
            let binding = new TimePin(this.linePercent);
            binding.id = this.id;
            binding.timeStamp = this.timeStamp;
            return binding;
        }
    }
    TimePin.fromObject = function (obj) {
        let binding = new TimePin(obj.linePercent);
        binding.id = obj.id;
        binding.timeStamp = obj.timeStamp;

        // for robustness in case a Date get into a time pin instead of a timestamp
        if (typeof binding.timeStamp === 'string' || binding.timeStamp instanceof String) {
            if (!isNaN(new Date(binding.timeStamp))) {
                binding.timeStamp = new Date(binding.timeStamp).getTime();
            } else if (!isNaN(new Date(parseInt(binding.timeStamp)))) {
                binding.timeStamp = new Date(parseInt(binding.timeStamp)).getTime();
            }
        }

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
        obj.dataCells.forEach(c => {
            if (c.isTimeCell) {
                row.dataCells.push(TimeCell.fromObject(c));
            } else {
                row.dataCells.push(DataCell.fromObject(c));
            }
        });
        return row;
    }

    function TimeCell(val, columnId = null) {
        this.id = getUniqueId();
        // could be string or timestamp or just text
        this.val = val;
        this.columnId = columnId;
        this.isTimeCell = true;

        this.isValid = function () {
            return this.val && !isNaN(new Date(this.val)) || !isNaN(new Date(parseInt(this.val)));
        }

        this.getValue = function () {
            // if this isn't valid, return a string to display.
            if (!this.isValid()) {
                if (!this.val) {
                    return "";
                } else {
                    return this.val.toString();
                }
            } else if (!isNaN(new Date(this.val))) {
                return new Date(this.val).getTime();
            } else if (!isNaN(new Date(parseInt(this.val)))) {
                // we want the timestamp which is what we assume this is. 
                return parseInt(this.val);
            } else {
                console.error("Bad state!", this);
                return 0;
            }
        }

        this.toString = function () {
            if (!this.val) {
                return "";
            } else if (typeof this.val == "string") {
                return this.val;
            } else if (this.val instanceof Date) {
                return DataUtil.getFormattedDate(this.val);
            } else if (typeof this.val == 'number') {
                return DataUtil.getFormattedDate(new Date(this.val));
            }
        }

        this.copy = function () {
            // TODO: Make sure that val get copied properly. We'll worry about it later.
            let cell = new TimeCell(this.val, this.columnId);
            cell.id = this.id;
            return cell;
        }

        this.clone = function () {
            return new TimeCell(this.val, this.columnId);
        }
    }
    TimeCell.fromObject = function (obj) {
        let time = obj.val;
        let cell = new TimeCell(time, obj.columnId);
        cell.val = obj.val;
        cell.id = obj.id;
        return cell;
    }

    function DataCell(type, val, columnId = null, color = null) {
        this.id = getUniqueId();
        this.type = type;
        this.val = val;
        this.columnId = columnId;
        this.color = color

        this.isValid = function () {
            switch (this.type) {
                case DataTypes.TEXT:
                    return true;
                case DataTypes.NUM:
                    if (DataUtil.isNumeric(this.val)) return true;
                    else return false;
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
            } else {
                console.error("Invalid value type! ", this.val);
            }
        }

        this.copy = function () {
            // TODO: Make sure that val get copied properly. We'll worry about it later.
            let cell = new DataCell(this.type, this.val, this.columnId, this.color);
            cell.id = this.id;
            return cell;
        }

        this.clone = function () {
            return new DataCell(this.type, this.val, this.columnId, this.color);
        }
    }
    DataCell.fromObject = function (obj) {
        let cell = new DataCell(obj.type, obj.val, obj.columnId, obj.color);
        cell.id = obj.id;
        return cell;
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
        DataTable,
        DataColumn,
        DataRow,
        TimeCell,
        DataCell,
        Stroke,
        StrokePoint,

        CellBinding,
        AxisBinding,
        TimePin,
    }
}();


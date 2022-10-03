DataStructs.DataModel = function () {
    let mCanvas = new DataStructs.Canvas();
    let mTimelines = [];
    let mDataTables = [];

    function getCellBindingData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id!", timelineId); return []; }
        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let table = getTableForCell(cellBinding.cellId);
            if (!table) { console.error("Invalid cell binding! No table!"); return; }
            let tableId = table.id;

            let row = getRowByCellId(cellBinding.cellId);
            if (!row) { console.error("Invalid cell binding! No row!"); return; }
            let rowId = row.id;

            let timeCell = getTimeCellForRow(rowId);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            let dataCell = getCellById(cellBinding.cellId);
            if (!dataCell) { console.error("Failed to get cell for column"); return; }
            if (dataCell.id != cellBinding.cellId) throw new ModelStateError("Got the wrong cell!");

            let linePercent;
            if (timeCell.isValid()) {
                linePercent = mapTimeToLinePercent(timeline.id, timeCell.getValue());
            } else {
                if (cellBinding.timePinId) {
                    let timePin = timeline.timePins.find(pin => pin.id == cellBinding.timePinId);
                    if (timePin) {
                        linePercent = timePin.linePercent;
                    } else {
                        console.error("Time pin not found for cell binding!", cellBinding);
                        linePercent = NO_LINE_PERCENT;
                    }
                } else {
                    linePercent = NO_LINE_PERCENT;
                }
            }
            let axis = timeline.axisBindings.find(a => a.columnId == dataCell.columnId);

            returnable.push(new DataStructs.CellBindingData(cellBinding, timeline, dataCell, timeCell, tableId, rowId, linePercent, axis ? axis : null));
        })
        return returnable;
    }

    function getAllCellBindingData() {
        return mTimelines.map(timeline => getCellBindingData(timeline.id)).flat();
    }

    function mapTimeToLinePercent(timelineId, time) {
        if (isNaN(time)) { console.error("Invalid time: " + time); return 0; }

        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id!", timelineId); return 0; }

        if (timeline.timePins.find(pin => pin.timeStamp == time)) {
            return timeline.timePins.find(pin => pin.timeStamp == time).linePercent;
        }

        let bindingValues = getTimeBindingValues(timeline);

        if (bindingValues.length == 0) {
            return 0;
        } else if (bindingValues.length == 1) {
            return time > bindingValues[0].timeStamp ? 0 : 1;
        }

        if (!("linePercent" in bindingValues[0])) bindingValues[0].linePercent = 0;
        if (!("linePercent" in bindingValues[bindingValues.length - 1])) bindingValues[bindingValues.length - 1].linePercent = 1;
        bindingValues = bindingValues.filter(bv => "linePercent" in bv);

        if (time < bindingValues[0].timeStamp) {
            return 0;
        } else if (time > bindingValues[bindingValues.length - 1].timeStamp) {
            return 1;
        }

        return mapBindingArrayInterval(bindingValues, time, "timeStamp", "linePercent")
    }

    function mapLinePercentToTime(timelineId, linePercent) {
        if (isNaN(linePercent)) { console.error("Invalid percent:" + linePercent); return 0; }

        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id!", timelineId); return 0; }

        let bindingValues = getTimeBindingValues(timeline);

        if (bindingValues.length < 2) { console.error("Insufficient data to get time!"); return 0; }

        if (!("linePercent" in bindingValues[0])) bindingValues[0].linePercent = 0;
        if (!("linePercent" in bindingValues[bindingValues.length - 1])) bindingValues[bindingValues.length - 1].linePercent = 1;
        bindingValues = bindingValues.filter(bv => "linePercent" in bv);

        if (linePercent < bindingValues[0].linePercent) {
            let timeRatio = (bindingValues[1].timeStamp - bindingValues[0].timeStamp) / (bindingValues[1].linePercent - bindingValues[0].linePercent)
            let timeDiff = timeRatio * (bindingValues[0].linePercent - linePercent);
            return bindingValues[0].timeStamp - timeDiff;
        } else if (linePercent > bindingValues[bindingValues.length - 1].linePercent) {
            let lastBinding = bindingValues[bindingValues.length - 1];
            let prevBinding = bindingValues[bindingValues.length - 2];
            let timeRatio = (lastBinding.timeStamp - prevBinding.timeStamp) / (lastBinding.linePercent - prevBinding.linePercent)
            let timeDiff = timeRatio * (linePercent - lastBinding.linePercent);
            return lastBinding.timeStamp + timeDiff;
        }

        return mapBindingArrayInterval(bindingValues, linePercent, "linePercent", "timeStamp")
    }

    function hasTimeMapping(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id!", timelineId); return false; }

        let bindingValues = getTimeBindingValues(timeline);

        if (bindingValues.length < 2) { return false; }
        return true;
    }

    function getTimeBindingValues(timeline) {
        let bindingValues = [...timeline.timePins.filter(pin => pin.timeStamp)];
        let timePinTimeStamps = bindingValues.map(b => b.timeStamp);
        bindingValues.push(...getBoundTimeValues(timeline.id)
            .map(val => { return { timeStamp: val } })
            .filter(b => !timePinTimeStamps.includes(b.timeStamp)));
        bindingValues.sort((a, b) => a.timeStamp - b.timeStamp);

        return bindingValues;
    }

    /* End Mapping Utility function */
    function getBoundTimeValues(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Bad timelineId: " + timelineId);

        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let timeCell = getTimeCellForDataCell(cellBinding.cellId);
            if (!timeCell) return;

            if (timeCell.isValid()) returnable.push(timeCell.getValue());
        })

        return returnable;
    }

    function mapBindingArrayInterval(bindings, value, fromKey, toKey) {
        if (bindings.length < 2) throw new ModelStateError("Insufficent bindings for mapping!");

        // find the correct interval
        for (let i = 1; i < bindings.length; i++) {
            let nextVal = bindings[i][fromKey];
            let prevVal = bindings[i - 1][fromKey];

            if (value >= prevVal && value <= nextVal) {
                let percentBetween = (value - prevVal) / (nextVal - prevVal)

                let nextConvertVal = bindings[i][toKey];
                let prevConvertVal = bindings[i - 1][toKey];

                return percentBetween * (nextConvertVal - prevConvertVal) + prevConvertVal;
            }
        }

        console.error("Unhandle mapping edge case!", bindings, value, fromKey, toKey);
        return 0;
    }

    function getCellById(cellId) {
        return mDataTables.map(t => t.dataRows.map(r => r.dataCells)).flat(3).find(cell => cell.id == cellId);
    }

    function getRowByCellId(cellId) {
        let row = mDataTables.map(t => t.dataRows).flat(2).find(row => row.dataCells.some(c => c.id == cellId));
        if (!row) { throw new Error("Row not found for cell: " + cellId); }
        return row;
    }

    function getCellBindingById(cellBindingId) {
        return mTimelines.map(t => t.cellBindings).flat().find(cb => cb.id == cellBindingId);
    }

    function getTimeCellForRow(rowId) {
        let table = mDataTables.find(t => t.dataRows.some(r => r.id == rowId));
        if (!table) { throw new Error("Row now found in any table: " + rowId); }
        let row = table.dataRows.find(r => r.id == rowId);
        let col = getTimeColumnByTableId(table.id);
        return row.getCell(col.id);
    }

    function getTimeCellForPin(timePinId) {
        let cellBinding = mTimelines.map(t => t.cellBindings).flat().find(cb => cb.timePinId == timePinId);
        if (cellBinding) {
            return getTimeCellForDataCell(cellBinding.cellId);
        } else {
            return null;
        }
    }

    function getTimeCellForDataCell(dataCellId) {
        let row = getRowByCellId(dataCellId);
        if (!row) {
            console.error("Cannot get row for cell!", dataCellId);
            return null;
        }

        let timeCell = getTimeCellForRow(row.id);
        if (!timeCell) {
            console.error("Cannot get time cell for row!", row);
            return null;
        } else {
            return timeCell;
        }
    }

    function getTableForCell(cellId) {
        let table = mDataTables.find(t => t.dataRows.some(row => row.dataCells.some(c => c.id == cellId)));
        if (!table) { throw new Error("Table not found for cell: " + cellId); }
        return table;
    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    function getTimelineForTimePin(timePinId) {
        return mTimelines.find(t => t.timePins.some(pin => pin.id == timePinId));
    }

    function getTableById(id) {
        return mDataTables.find(t => t.id == id);
    }

    function getAxisById(axisId) {
        return mTimelines.map(t => t.axisBindings).flat().find(b => b.id == axisId);
    }

    function getTimeColumnByTableId(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    this.setCanvas = (canvas) => mCanvas = canvas;
    this.setTimelines = (timelines) => mTimelines = timelines;
    this.setTables = (tables) => mDataTables = tables;

    this.getCanvas = () => mCanvas;

    this.getTimelineById = getTimelineById;
    this.getTimelineForTimePin = getTimelineForTimePin;
    this.getAllTimelines = function () { return mTimelines };
    this.getTableById = getTableById;
    this.getAllTables = function () { return mDataTables };
    this.getTimeColumnByTableId = getTimeColumnByTableId;

    this.getCellBindingData = getCellBindingData;
    this.getAllCellBindingData = getAllCellBindingData;

    this.getCellById = getCellById;
    this.getCellBindingById = getCellBindingById;

    this.getAxisById = getAxisById;

    this.getTimeCellForPin = getTimeCellForPin;
    this.getTimeCellForDataCell = getTimeCellForDataCell;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.mapTimeToLinePercent = mapTimeToLinePercent;
    this.hasTimeMapping = hasTimeMapping;
    this.getTimeBindingValues = getTimeBindingValues;

    this.copy = function () {
        let model = new DataStructs.DataModel();
        model.setCanvas(mCanvas.copy());
        model.setTimelines(mTimelines.map(t => t.copy()));
        model.setTables(mDataTables.map(t => t.copy()));
        return model;
    }
}


DataStructs.CellBindingData = function (cellBinding, timeline, dataCell, timeCell, tableId, rowId, linePercent = NO_LINE_PERCENT, axisBinding = null) {
    this.cellBinding = cellBinding;
    this.timeline = timeline;
    this.dataCell = dataCell;
    this.timeCell = timeCell;
    this.tableId = tableId;
    this.rowId = rowId;

    // optional values
    this.linePercent = linePercent;
    this.axisBinding = axisBinding;

    this.copy = function () {
        let b = new DataStructs.CellBindingData(
            this.cellBinding.copy(),
            this.timeline.copy(),
            this.dataCell.copy(),
            this.timeCell.copy(),
            this.tableId,
            this.rowId
        )
        b.linePercent = this.linePercent;
        b.axisBinding = this.axisBinding;
        return b;
    }
}
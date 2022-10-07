DataStructs.DataModel = function () {
    let mCanvas = new DataStructs.Canvas();
    let mTimelines = [];
    let mDataTables = [];

    function getCellBindingData(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for getting cell binding data!", timelineId); return []; }
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
            if (cellBinding.timePinId) {
                let timePin = timeline.timePins.find(pin => pin.id == cellBinding.timePinId);
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    console.error("Time pin not found for cell binding!", cellBinding);
                    cellBinding.timePinId = null;
                    linePercent = NO_LINE_PERCENT;
                }
            } else if (hasTimeMapping(timelineId) && timeCell.isValid()) {
                linePercent = mapTimeToLinePercent(timeline.id, timeCell.getValue());
            } else if (timeCell.isValid()) {
                let timePin = timeline.timePins.find(pin => pin.timeStamp == timeCell.getValue());
                if (timePin) {
                    linePercent = timePin.linePercent;
                } else {
                    linePercent = NO_LINE_PERCENT;
                }
            } else {
                linePercent = NO_LINE_PERCENT;
            }

            let axis = timeline.axisBindings.find(a => a.columnId == dataCell.columnId);

            let color = null;
            if (cellBinding.color) {
                color = cellBinding.color;
            } else if (dataCell.color) {
                color = dataCell.color;
            } else if (dataCell.getType() == DataTypes.NUM && axis && axis.color1 && axis.color2) {
                let num = dataCell.getValue();
                let colorPercent = (num - axis.val1) / (axis.val2 - axis.val1)

                color = DataUtil.getColorBetween(axis.color1, axis.color2, colorPercent)
            }

            returnable.push(new DataStructs.CellBindingData(cellBinding, timeline, dataCell, timeCell, tableId, rowId, color, linePercent, axis ? axis : null));
        })
        return returnable;
    }

    function getAllCellBindingData() {
        return mTimelines.map(timeline => getCellBindingData(timeline.id)).flat();
    }

    function mapTimeToLinePercent(timelineId, time) {
        if (isNaN(time)) { console.error("Invalid time: ", time); return 0; }

        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for mapping time to line percent!", timelineId); return 0; }

        let timelineHasMapping = hasTimeMapping(timelineId);
        if (!timelineHasMapping && (time < 0 || time > 1)) {
            console.error("Invalid state! Expected time percent and value invalid", time, timeline);
            return 0;
        }
        // we can't check timestamps as they are unbounded.

        // there might be an extact pin with timestamp even if we don't have a time mapping.
        let exactPin = timeline.timePins.find(pin => pin.timeStamp == time);
        if (!exactPin && !timelineHasMapping) {
            // only check this if the line does not have a mapping. 
            // If it has a mapping, we should not be asking to map a timePercent, 
            // and we don't want to confuse a timeStamp of 0.5 with a timePercent.
            exactPin = timeline.timePins.find(pin => pin.timePercent == time);
        }
        if (exactPin) {
            return exactPin.linePercent;
        }

        let bindingValues = getTimeBindingValues(timeline);
        if (bindingValues.length < 2) {
            console.error("Code should be unreachable!", timeline, time);
            return 0;
        }

        let timeAttribute = timelineHasMapping ? "timeStamp" : "timePercent";
        if (time <= bindingValues[0][timeAttribute]) {
            return 0;
        } else if (time >= bindingValues[bindingValues.length - 1][timeAttribute]) {
            return 1;
        }

        return mapBindingArrayInterval(bindingValues, time, timeAttribute, "linePercent")
    }

    function mapLinePercentToTime(timelineId, linePercent) {
        if (isNaN(linePercent)) { console.error("Invalid percent:" + linePercent); return 0; }
        if (linePercent < 0) {
            console.error("Invalid linePercent!", linePercent);
            linePercent = 0;
        }
        if (linePercent > 1) {
            console.error("Invalid linePercent!", linePercent);
            linePercent = 1;
        }

        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for mapping line percent to time!", timelineId); return 0; }

        let bindingValues = getTimeBindingValues(timeline);
        if (bindingValues.length < 2) {
            console.error("Code should be unreachable!", timeline, time);
            return 0;
        }

        let timeAttribute = hasTimeMapping(timelineId) ? "timeStamp" : "timePercent";
        return mapBindingArrayInterval(bindingValues, linePercent, "linePercent", timeAttribute)
    }

    function hasTimeMapping(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) { console.error("Invalid timeline id for testing time mapping!", timelineId); return false; }

        let timePinTimeStamps = [...timeline.timePins
            .filter(pin => pin.timeStamp)].map(b => b.timeStamp);
        let boundTimeValues = getBoundTimeCellValues(timeline.id)
            .filter(time => !timePinTimeStamps.includes(time));

        if (boundTimeValues.concat(timePinTimeStamps).length < 2) {
            return false;
        } else {
            return true;
        }
    }

    function getTimeBindingValues(timeline) {
        let timeBindingValues;

        if (hasTimeMapping(timeline.id)) {
            timeBindingValues = timeline.timePins.filter(pin => pin.timeStamp);
            timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);

            let timePinTimeStamps = timeBindingValues.map(b => b.timeStamp);

            timeBindingValues.push(...getBoundTimeCellValues(timeline.id)
                .map(val => { return { timeStamp: val } })
                .filter(b => !timePinTimeStamps.includes(b.timeStamp)));
            timeBindingValues.sort((a, b) => a.timeStamp - b.timeStamp);

            if (!("linePercent" in timeBindingValues[0])) timeBindingValues[0].linePercent = 0;
            if (!("linePercent" in timeBindingValues[timeBindingValues.length - 1])) timeBindingValues[timeBindingValues.length - 1].linePercent = 1;
            timeBindingValues = timeBindingValues.filter(bv => "linePercent" in bv);

            if (timeBindingValues.length < 2) {
                console.error("Code should be unreachable! there should be at least two bindings.", timeBindingValues);
            }

            if (timeBindingValues[0].linePercent > 0) {
                let timeRatio = (timeBindingValues[1].timeStamp - timeBindingValues[0].timeStamp) / (timeBindingValues[1].linePercent - timeBindingValues[0].linePercent)
                let timeDiff = timeRatio * (timeBindingValues[0].linePercent);
                timeBindingValues.unshift({ linePercent: 0, timeStamp: timeBindingValues[0].timeStamp - timeDiff });
            }

            if (timeBindingValues[timeBindingValues.length - 1].linePercent < 1) {
                let lastBinding = timeBindingValues[timeBindingValues.length - 1];
                let prevBinding = timeBindingValues[timeBindingValues.length - 2];
                let timeRatio = (lastBinding.timeStamp - prevBinding.timeStamp) / (lastBinding.linePercent - prevBinding.linePercent)
                let timeDiff = timeRatio * (1 - lastBinding.linePercent);
                timeBindingValues.push({ linePercent: 1, timeStamp: lastBinding.timeStamp + timeDiff });
            }
        } else {
            timeBindingValues = [...timeline.timePins];
            timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);

            if (timeBindingValues.length == 0 || timeBindingValues[0].linePercent > 0) {
                timeBindingValues.unshift({ linePercent: 0, timePercent: 0 });
            }

            if (timeBindingValues[timeBindingValues.length - 1].linePercent < 1) {
                timeBindingValues.push({ linePercent: 1, timePercent: 1 })
            }

            if (timeBindingValues[1].timePercent <= 0) {
                timeBindingValues[1].timePercent = 0.001;
            }

            if (timeBindingValues[timeBindingValues.length - 2].timePercent >= 1) {
                timeBindingValues[timeBindingValues.length - 2].timePercent = 0.999;
            }
        }

        // sort again to be on the safe side.
        timeBindingValues.sort((a, b) => a.linePercent - b.linePercent);
        return timeBindingValues;
    }

    /* End Mapping Utility function */
    function getBoundTimeCellValues(timelineId) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) {
            console.error("bad timeline id for getting bound time cells!", timelineId);
            return [];
        }

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

    function getTimePinById(pinId) {
        return mTimelines.map(t => t.timePins).flat().find(pin => pin.id == pinId);
    }

    function getStrokeById(strokeId) {
        return mTimelines
            .map(t => t.annotationStrokes)
            .flat()
            .concat(mCanvas.annotationStrokes)
            .find(s => s.id == strokeId);
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
    this.getRowByCellId = getRowByCellId;

    this.getCellBindingData = getCellBindingData;
    this.getAllCellBindingData = getAllCellBindingData;

    this.getCellById = getCellById;
    this.getCellBindingById = getCellBindingById;

    this.getAxisById = getAxisById;
    this.getTimePinById = getTimePinById;

    this.getStrokeById = getStrokeById;

    this.getTimeCellForPin = getTimeCellForPin;
    this.getTimeCellForDataCell = getTimeCellForDataCell;
    this.getBoundTimeCellValues = getBoundTimeCellValues;

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


DataStructs.CellBindingData = function (cellBinding, timeline, dataCell, timeCell, tableId, rowId, color, linePercent = NO_LINE_PERCENT, axisBinding = null) {
    this.cellBinding = cellBinding;
    this.timeline = timeline;
    this.dataCell = dataCell;
    this.timeCell = timeCell;
    this.tableId = tableId;
    this.rowId = rowId;
    this.color = color;

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
            this.rowId,
            this.color,
        )
        b.linePercent = this.linePercent;
        b.axisBinding = this.axisBinding;
        return b;
    }
}
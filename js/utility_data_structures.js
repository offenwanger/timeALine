DataStructs.DataModel = function (timelines = [], dataTables = []) {
    let mTimelines = timelines.map(t => t.copy())
    let mDataTables = dataTables.map(t => t.copy());

    function getWarpBindingData(timelineId) {
        let returnable = [];
        let timeline = getTimelineById(timelineId);
        timeline.warpBindings.forEach(warpBinding => {
            let row = getTableRow(warpBinding.tableId, warpBinding.rowId);
            if (!row) { console.error("Invalid warp binding! No row!"); return; }

            let timeCell = row.getCell(getTimeColumnByTableId(warpBinding.tableId).id);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            returnable.push(new DataStructs.WarpBindingData(timeline.id, warpBinding.id,
                warpBinding.tableId, warpBinding.rowId, timeCell, warpBinding.linePercent));
        })
        return returnable;
    }

    function getAllWarpBindingData() {
        return mTimelines.map(timeline => getWarpBindingData(timeline.id)).flat();
    }

    function getCellBindingData(timelineId) {
        let timeline = getTimelineById(timelineId);
        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let row = getTableRow(cellBinding.tableId, cellBinding.rowId);
            if (!row) { breakhere; console.error("Invalid cell binding! No row!"); return; }

            let timeCell = row.getCell(getTimeColumnByTableId(cellBinding.tableId).id);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            let dataCell = row.getCell(cellBinding.columnId);
            if (!dataCell) { console.error("Failed to get cell for column"); return; }
            if (dataCell.id != cellBinding.cellId) throw new ModelStateError("Got the wrong cell!");

            let linePercent;
            // first check if there's a warp binding for this row
            if (timeline.warpBindings.find(b => b.rowId == row.id)) {
                linePercent = timeline.warpBindings.find(b => b.rowId == row.id).linePercent;
            } else if (timeCell.getType() == DataTypes.TEXT) {
                linePercent = 0;
            } else {
                try {
                    linePercent = mapTimeToLinePercent(timeline.id, timeCell.getType(), timeCell.getValue());
                } catch (e) {
                    if (e.name == "ModelStateError" && timeline.cellBindings.length == 1 && timeCell.getType() == DataTypes.TIME_BINDING) {
                        linePercent = 0;
                    } else {
                        console.error(e);
                        return;
                    }
                }
            }
            let axis = timeline.axisBindings.find(a => a.columnId == cellBinding.columnId);

            returnable.push(new DataStructs.CellBindingData(
                timeline.id,
                cellBinding.id,
                cellBinding.tableId,
                cellBinding.rowId,
                timeCell,
                dataCell,
                linePercent,
                axis ? axis : null));
        })
        return returnable;
    }

    function getAllCellBindingData() {
        return mTimelines.map(timeline => getCellBindingData(timeline.id)).flat();
    }


    function mapTimeToLinePercent(timelineId, type, timeVal) {
        if (type == DataTypes.TEXT) {
            let bindingArray = getAllWarpBindingData().filter(wbd => wbd.timeCell.getType() == DataTypes.TEXT);
            let binding = bindingArray.find(b => DataUtil.AEqualsB(b.timeCell.getValue(), timeVal, type));
            return binding ? binding.linePercent : 0;
        }

        if (type != DataTypes.TIME_BINDING && type != DataTypes.NUM) throw new Error("Unhandled type: " + type);

        let { start, end } = inferEndPoints(timelineId, type);
        let bindingArray = getBindingArray(timelineId, type);

        if (DataUtil.AGreaterThanB(start, timeVal, type)) {
            return 0;
        } else if (DataUtil.AGreaterThanB(timeVal, end, type)) {
            return 1;
        } else if (bindingArray.length == 0) {
            return DataUtil.percentBetween(start, end, timeVal, type);
        } else {
            return mapBindingArrayInterval(bindingArray, timeVal,
                "time", type,
                "linePercent", DataTypes.NUM);
        }

    }

    function mapLinePercentToTime(timelineId, type, linePercent) {
        // can only be done if there are at least two reference points, or is num. 
        if (type != DataTypes.TIME_BINDING && type != DataTypes.NUM) throw new DataTypeError("Unhandled type: " + type);
        if (type == DataTypes.TIME_BINDING && !hasTimeMapping(timelineId)) throw new ModelStateError("Insufficient data to get time of type: " + type);

        let bindingArray = getBindingArray(timelineId, type);

        if (bindingArray.length == 0) {
            let { start, end } = inferEndPoints(timelineId, type);
            let timeAlongLine = DataUtil.subtractAFromB(start, end, type) * linePercent;
            return DataUtil.incrementAByB(start, timeAlongLine, type);
        } else {
            return mapBindingArrayInterval(bindingArray, linePercent, "linePercent", DataTypes.NUM, "time", type);
        }
    }

    function getBindingArray(timelineId, type) {
        let { start, end } = inferEndPoints(timelineId, type);
        let bindingArray = getAllWarpBindingData().filter(b =>
            b.timelineId == timelineId && b.timeCell.getType() == type);
        bindingArray.sort((a, b) => DataUtil.AGreaterThanB(a.timeCell.getValue(), b.timeCell.getValue(), type) ? 1 : -1);
        bindingArray = bindingArray.map(b => { return { linePercent: b.linePercent, time: b.timeCell.getValue() } })

        if (bindingArray.length > 0) {
            // add caps
            if (bindingArray[0].linePercent > 0) {
                bindingArray.push({ linePercent: 0, time: start });
            }
            if (bindingArray[bindingArray.length - 1].linePercent < 1) {
                bindingArray.push({ linePercent: 1, time: end });
            }
        }
        bindingArray.sort((a, b) => a.linePercent - b.linePercent);

        return bindingArray;
    }

    function mapBindingArrayInterval(bindingArray, value, fromKey, fromType, toKey, toType) {
        if (bindingArray.length < 2) throw new ModelStateError("Insufficent bindings for mapping!");
        if (DataUtil.AGreaterThanB(bindingArray[0][fromKey], value, fromType)) throw new Error("Value is outside binding range! Value:" + value + " Lower bound: " + bindingArray[0][fromKey]);
        if (DataUtil.AGreaterThanB(value, bindingArray[bindingArray.length - 1][fromKey], fromType)) throw new Error("Value is outside binding range! Value:" + value + " Upper bound: " + bindingArray[0][fromKey]);

        // find the correct interval
        for (let i = 1; i < bindingArray.length; i++) {
            let bindingFromVal = bindingArray[i][fromKey];
            let prevBindingFromVal = bindingArray[i - 1][fromKey];

            let isBetween = DataUtil.AGreaterThanB(bindingFromVal, value, fromType) &&
                DataUtil.AGreaterThanB(value, prevBindingFromVal, fromType);
            isBetween = isBetween || DataUtil.AEqualsB(value, bindingFromVal, fromType) ||
                DataUtil.AEqualsB(value, prevBindingFromVal, fromType);

            if (isBetween) {
                let bindingToVal = bindingArray[i][toKey];
                let prevBindingToVal = bindingArray[i - 1][toKey];

                let fromPercentBetween = DataUtil.percentBetween(prevBindingFromVal, bindingFromVal, value, fromType);
                let toDiff = DataUtil.subtractAFromB(prevBindingToVal, bindingToVal, toType);

                return DataUtil.incrementAByB(prevBindingToVal, fromPercentBetween * toDiff, toType);
            }
        }

        console.error("Unhandle mapping edge case!", value, fromKey, fromType, toKey, toType, bindingArray);
        return 0;
    }

    function inferEndPoints(timelineId, type) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Invalid timeline id: " + timelineId)

        let warpBindingsData = getAllWarpBindingData().filter(b =>
            b.timelineId == timelineId && b.timeCell.getType() == type);
        warpBindingsData.sort((a, b) => DataUtil.AGreaterThanB(a.timeCell.getValue(), b.timeCell.getValue(), type) ? 1 : -1);


        let boundCellData = getBoundTimeValues(timelineId, type);
        let warpBindingValues = warpBindingsData.map(wbd => wbd.timeCell.getValue());
        boundCellData = boundCellData.filter(b => !warpBindingValues.includes(b));

        function inferStart(firstVal, nextVal, firstPercent, nextPercent) {
            let ratio = DataUtil.subtractAFromB(firstVal, nextVal, type) / (nextPercent - firstPercent)
            let timeVal = ratio * firstPercent;
            return DataUtil.incrementAByB(firstVal, -timeVal, type);
        }

        function inferEnd(lastVal, prevVal, lastPercent, prevPercent) {
            let ratio = DataUtil.subtractAFromB(prevVal, lastVal, type) / (lastPercent - prevPercent)
            let timeVal = ratio * (1 - lastPercent);
            return DataUtil.incrementAByB(lastVal, timeVal, type);
        }

        // handle the one or less reference points edge cases
        if (boundCellData.length + warpBindingsData.length < 2) {
            if (type != DataTypes.NUM) throw new ModelStateError("Not enough data to caluclate end points!");

            if (boundCellData.length == 0 && warpBindingsData.length == 0) {
                // if there are utterly no references
                return { start: 0, end: 1 }
            } if (boundCellData.length == 1 && warpBindingsData.length == 0) {
                // if there is one data reference
                let val = boundCellData[0];
                if (val > 0) {
                    return { start: 0, end: val }
                } else {
                    return { start: val, end: 1 }
                }
            } else if (boundCellData.length == 0 && warpBindingsData.length == 1) {
                let val = warpBindingsData[0].timeCell.getValue();
                if (warpBindingsData[0].linePercent <= 0.0001) {
                    return { start: warpBindingsData[0].timeCell.getValue(), end: warpBindingsData[0].timeCell.getValue() + 1 }
                } else if (warpBindingsData[0].linePercent >= 0.999) {
                    return { start: warpBindingsData[0].timeCell.getValue() - 1, end: warpBindingsData[0].timeCell.getValue() }
                } else if (val > 0) {
                    return { start: 0, end: inferEnd(val, 0, warpBindingsData[0].linePercent, 0) }
                } else if (val < 0) {
                    return { start: inferStart(val, 1, warpBindingsData[0].linePercent, 1), end: 1 }
                } else throw new Error("Code should be unreachable!");
            } else throw new Error("Code should be unreachable!");
        }

        // infer the start and end (or just use the bound data)
        let start, end;
        if (boundCellData.length > 0 &&
            (warpBindingsData.length == 0 || DataUtil.AGreaterThanB(warpBindingsData[0].timeCell.getValue(), boundCellData[0], type))) {
            // the lowest point is bound data, all good. 
            start = boundCellData[0];
        } else if (warpBindingsData[0].linePercent <= 0.001) {
            start = warpBindingsData[0].timeCell.getValue();
        } else {
            // we need to infer the lowest point. It wasn't boundCellData, so there must be a warpBinding
            let firstVal = warpBindingsData[0].timeCell.getValue();
            let firstPercent = warpBindingsData[0].linePercent;
            if (warpBindingsData.length >= 2) {
                // if there is another warp binding, we use it as it will either be the closet point 
                // or determining the position of the closest point. 
                let nextVal = warpBindingsData[1].timeCell.getValue();
                let nextPercent = warpBindingsData[1].linePercent;
                start = inferStart(firstVal, nextVal, firstPercent, nextPercent);
            } else {
                // there must be at least one cell after this, and the last of the cells will be the end point, use that.
                start = inferStart(firstVal, boundCellData[boundCellData.length - 1], warpBindingsData[0].linePercent, 1);
            }

        }

        if (boundCellData.length > 0 &&
            (warpBindingsData.length == 0 ||
                DataUtil.AGreaterThanB(
                    boundCellData[boundCellData.length - 1],
                    warpBindingsData[warpBindingsData.length - 1].timeCell.getValue(),
                    type))) {
            // the highest point is bound data, all good. 
            end = boundCellData[boundCellData.length - 1];
        } else if (warpBindingsData[warpBindingsData.length - 1].linePercent >= 0.999) {
            end = warpBindingsData[warpBindingsData.length - 1].timeCell.getValue();
        } else {
            // we need to infer the highest point. It wasn't boundCellData, so there must be a warpBinding
            let lastVal = warpBindingsData[warpBindingsData.length - 1].timeCell.getValue();
            let lastPercent = warpBindingsData[warpBindingsData.length - 1].linePercent;
            if (warpBindingsData.length >= 2) {
                // if there is another warp binding, we use it as it will either be the closet point 
                // or determining the position of the closest point. 
                let prevVal = warpBindingsData[warpBindingsData.length - 2].timeCell.getValue();
                let prevPercent = warpBindingsData[warpBindingsData.length - 2].linePercent;
                end = inferEnd(lastVal, prevVal, lastPercent, prevPercent);
            } else {
                // there must be at least one cell before this, and the first of the cells will be the start point, use that.
                end = inferEnd(lastVal, boundCellData[0], lastPercent, 0);
            }
        }

        return { start, end }
    }

    function getCellById(cellId) {
        return mDataTables.map(t => t.dataRows.map(r => r.dataCells)).flat(3).find(cell => cell.id == cellId);
    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    function getTableById(id) {
        return mDataTables.find(t => t.id == id);
    }

    function getAxisById(axisId) {
        return mTimelines.map(t => t.axisBindings).flat().find(b => b.id == axisId);
    }

    function getCellsFromBinding(binding) {
        let table = getTableById(binding.tableId);
        let timeColId = table.dataColumns.find(col => col.index == 0).id;
        let row = table.getRow(binding.rowId);
        let cell = row.getCell(binding.columnId);
        let timeCell = row.getCell(timeColId);

        return {
            timeCell,
            cell,
        }
    }


    function getTableRow(tableId, rowId) {
        return getTableById(tableId).getRow(rowId);
    }

    function getTimeColumnByTableId(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    function getMaxBoundTime(timelineId, type) {
        let values = getTimelineById(timelineId).cellBindings
            .map(b => getCellsFromBinding(b).timeCell)
            .filter(timeCell => timeCell.getType() == type)
            .map(timeCell => timeCell.getValue());
        if (values.length == 0) {
            return null;
        } else if (values.length == 1) {
            return values[0]
        } else if (type == DataTypes.NUM) {
            return Math.max(...values);
        } else if (type == DataTypes.TIME_BINDING) {
            return values.reduce((max, val) => TimeBindingUtil.AGreaterThanB(val, max) ? val : max);
        } else { console.error("cannot get max of " + type) };
    }

    function getMinBoundTime(timelineId, type) {
        let values = getTimelineById(timelineId).cellBindings
            .map(b => getCellsFromBinding(b).timeCell)
            .filter(timeCell => timeCell.getType() == type)
            .map(timeCell => timeCell.getValue());
        if (values.length == 0) {
            return null;
        } else if (values.length == 1) {
            return values[0]
        } else if (type == DataTypes.NUM) {
            return Math.min(...values);
        } else if (type == DataTypes.TIME_BINDING) {
            return values.reduce((min, val) => TimeBindingUtil.AGreaterThanB(val, min) ? min : val);
        } else { console.error("cannot get max of " + type) };
    }

    function hasTimeMapping(timelineId) {
        let warpBindingsData = getTimelineById(timelineId).warpBindings
            .filter(b => b.isValid)
            .map(b => {
                let cell = getTableRow(b.tableId, b.rowId).getCell(getTimeColumnByTableId(b.tableId).id)
                return { linePercent: b.linePercent, val: cell.getValue(), type: cell.getType() }
            })
            .filter(result => result.type == DataTypes.TIME_BINDING);
        // if we have two warp bindings, there's enough data
        if (warpBindingsData.length >= 2) return true;

        let max = getMaxBoundTime(timelineId, DataTypes.TIME_BINDING);
        let min = getMinBoundTime(timelineId, DataTypes.TIME_BINDING);

        // if we have no values, we do not have enough data.
        if (max == null) return false;

        // if we have two values, there's enough data
        if (!TimeBindingUtil.AEqualsB(max, min)) return true;

        // if we have only have one value, and no warp bindings, there is not enough data
        if (warpBindingsData.length == 0) return false;

        // if we have one warp and one data piece that are different, there is enough data
        if (!TimeBindingUtil.AEqualsB(warpBindingsData[0].val, min)) return true;

        // otherwise there isn't.
        return false;
    }

    function getBoundTimeValues(timelineId, timeType) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Bad timelineId: " + timelineId);

        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let row = getTableRow(cellBinding.tableId, cellBinding.rowId);
            if (!row) { console.error("Invalid warp binding! No row!"); return; }

            let timeCell = row.getCell(getTimeColumnByTableId(cellBinding.tableId).id);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            if (timeCell.getType() == timeType) {
                returnable.push(timeCell.getValue());
            }
        })

        if (timeType == DataTypes.NUM || timeType == DataTypes.TIME_BINDING) {
            returnable.sort((a, b) => DataUtil.AGreaterThanB(a, b, timeType) ? 1 : -1);
        }

        return returnable;
    }

    this.setTimelines = (timelines) => mTimelines = timelines;
    this.setTables = (tables) => mDataTables = tables;

    this.getTimelineById = getTimelineById;
    this.getAllTimelines = function () { return mTimelines };
    this.getTableById = getTableById;
    this.getAllTables = function () { return mDataTables };
    this.getTimeColumnByTableId = getTimeColumnByTableId;

    this.getWarpBindingData = getWarpBindingData;
    this.getAllWarpBindingData = getAllWarpBindingData;
    this.getCellBindingData = getCellBindingData;
    this.getAllCellBindingData = getAllCellBindingData;

    this.getCellById = getCellById;
    this.getCellsFromBinding = getCellsFromBinding;

    this.getAxisById = getAxisById;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.mapTimeToLinePercent = mapTimeToLinePercent;
    this.hasTimeMapping = hasTimeMapping;

    this.copy = function () { return new DataStructs.DataModel(mTimelines, mDataTables); }
}


DataStructs.CellBindingData = function (timelineId, cellBindingId, tableId, rowId, timeCell, dataCell, linePercent, axisBinding = null) {
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
        let b = new DataStructs.CellBindingData(
            this.timelineId,
            this.cellBindingId,
            this.tableId,
            this.rowId,
            this.timeCell.copy(),
            this.dataCell.copy(),
            this.linePercent,
            this.axisBinding
        )
        return b;
    }
}

DataStructs.WarpBindingData = function (timelineId, warpBindingId, tableId, rowId, timeCell, linePercent) {
    this.timelineId = timelineId;
    this.warpBindingId = warpBindingId;
    this.tableId = tableId;
    this.rowId = rowId;
    this.timeCell = timeCell;
    this.linePercent = linePercent;
}
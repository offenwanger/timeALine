function ModelController() {
    let mModel = new DataStructs.DataModel();

    let mUndoStack = [];
    let mRedoStack = [];

    function newTimeline(points) {
        undoStackPush();

        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = new DataStructs.Timeline(points.map(p => Object.assign({}, p)));
        mModel.getAllTimelines().push(timeline);

        return timeline;
    }

    function extendTimeline(timelineId, points, extendStart) {
        undoStackPush();

        let timeline = mModel.getTimelineById(timelineId);
        let originalLength = PathMath.getPathLength(timeline.points);

        // knock off the first point cuz it's probably pretty close. 
        //TODO: Handle this properly.
        extendStart ? points.pop() : points.unshift();

        let newPoints = extendStart ? points.concat(timeline.points) : timeline.points.concat(points);
        let newLength = PathMath.getPathLength(newPoints);

        timeline.points = newPoints;
        if (extendStart) {
            let diff = newLength - originalLength;
            timeline.warpBindings.forEach(binding => {
                let originalLengthAlongLine = binding.linePercent * originalLength;
                binding.linePercent = (originalLengthAlongLine + diff) / newLength;
            })
        } else {
            let conversionRatio = originalLength / newLength;
            timeline.warpBindings.forEach(binding => {
                binding.linePercent *= conversionRatio;
            })
        }
    }

    function mergeTimeline(timelineIdStart, timelineIdEnd, points) {
        undoStackPush();

        let startTimeline = mModel.getTimelineById(timelineIdStart);
        let endTimeline = mModel.getTimelineById(timelineIdEnd);

        let originalStartLength = PathMath.getPathLength(startTimeline.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.points);

        // knock off the end points cuz they're probably pretty close.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.points.concat(points, endTimeline.points);
        let newLength = PathMath.getPathLength(newPoints);

        let newTimeline = new DataStructs.Timeline(newPoints);
        newTimeline.cellBindings = DataUtil.getUniqueList(startTimeline.cellBindings.concat(endTimeline.cellBindings), 'cellId');

        mModel.setTimelines(mModel.getAllTimelines().filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd));
        mModel.getAllTimelines().push(newTimeline);

        // Update warp binding line percents
        let conversionRatio = originalStartLength / newLength;
        startTimeline.warpBindings.forEach(binding => {
            binding.linePercent *= conversionRatio;
        });

        let diff = newLength - originalEndLength;
        endTimeline.warpBindings.forEach(binding => {
            let originalLengthAlongLine = binding.linePercent * originalEndLength;
            binding.linePercent = (originalLengthAlongLine + diff) / newLength;
        });

        newTimeline.warpBindings = startTimeline.warpBindings.concat(endTimeline.warpBindings);
        newTimeline.warpBindings.sort((a, b) => { a.linePercent - b.linePercent; })
        let bindingCheck = newTimeline.warpBindings.map(b => {
            let timeCell = mModel.getTableById(b.tableId).getRow(b.rowId).getCell(mModel.getTimeColumnByTableId(b.tableId).id);
            return {
                rowId: b.rowId,
                val: timeCell.getValue(),
                type: timeCell.getType(),
                linePercent: b.linePercent
            }
        });

        // TODO: use the utilty function

        // only num and time can be invalid
        let lastBinding;
        let invalidWarpBindings = [];
        // the list is sorted, so val must be in acending order or the binding isn't valid
        bindingCheck.filter(b => b.type == DataTypes.NUM).forEach((binding) => {
            if (lastBinding && lastBinding.val >= binding.val) {
                invalidWarpBindings.push(binding.rowId);
            } else {
                lastBinding = binding;
            }
        })
        lastBinding = null;
        bindingCheck.filter(b => b.type == DataTypes.TIME_BINDING).forEach((binding) => {
            if (lastBinding && TimeBindingUtil.AGreaterThanB(lastBinding.val, binding.val)) {
                invalidWarpBindings.push(binding.rowId);
            } else {
                lastBinding = binding;
            }
        })
        newTimeline.warpBindings.forEach(binding => {
            if (invalidWarpBindings.includes(binding.rowId)) {
                binding.isValid = false;
            }
        })

        return [timelineIdStart, timelineIdEnd];
    }

    function deleteTimeline(timelineId) {
        undoStackPush();

        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
    }

    function breakTimeline(timelineId, segments) {
        undoStackPush();

        if (segments.length < 2) throw new Error("Expecting at least part of the timeline to be erased.")

        let timeline = mModel.getTimelineById(timelineId);

        // assign the segments their correct line percents:
        let totalLength = PathMath.getPathLength(timeline.points);
        segments[0].startLength = 0;
        segments[0].startPercent = 0;
        segments[0].endLength = PathMath.getPathLength(segments[0].points);
        segments[0].endPercent = segments[0].endLength / totalLength;
        for (let i = 1; i < segments.length; i++) {
            segments[i].startLength = segments[i - 1].endLength;
            segments[i].startPercent = segments[i - 1].endPercent;
            segments[i].endLength = PathMath.getPathLength(PathMath.mergeSegments(segments.slice(0, i + 1)));
            segments[i].endPercent = segments[i].endLength / totalLength;
            // ensure the last segment does indeed go to one, avoid rounding errors.
            if (i == segments.length - 1) segments[i].endPercent = 1;
        }


        // split up the warp bindings into their proper segments
        segments.forEach(s => s.warpBindingsData = []);
        let warpBindingData = mModel.getWarpBindingData(timeline.id);
        warpBindingData.forEach(binding => {
            let segment = segments.find(s => s.startPercent <= binding.linePercent &&
                binding.linePercent <= s.endPercent);
            if (!segment) { console.error("Something wierd here."); return; };
            segment.warpBindingsData.push(binding);
        })

        // split up the cell bindings into their proper segments
        segments.forEach(s => s.cellBindingsData = []);
        let cellBindingData = mModel.getCellBindingData(timeline.id);
        cellBindingData.forEach(binding => {
            let segment = segments.find(s => s.startPercent <= binding.linePercent &&
                binding.linePercent <= s.endPercent);
            if (!segment) { console.error("Something wierd here. Didn't find segment for linePercent: " + binding.linePercent); return; };
            segment.cellBindingsData.push(binding);
        });

        // add warp bindings to ensure the data doesn't move because of being disconnected
        segments.forEach(segment => {
            segment.warpBindings = [
                ...getBreakWarpBindings(segment.cellBindingsData, segment.warpBindingsData, DataTypes.NUM, segment.startPercent, segment.endPercent),
                ...getBreakWarpBindings(segment.cellBindingsData, segment.warpBindingsData, DataTypes.TIME_BINDING, segment.startPercent, segment.endPercent)];
        })

        // create the new timelines
        let newTimelines = segments.filter(s => s.label == SEGMENT_LABELS.UNAFFECTED).map(segment => {
            let newTimeline = new DataStructs.Timeline(segment.points);

            newTimeline.warpBindings = segment.warpBindingsData.map(wbd => {
                let warpBinding = timeline.warpBindings.find(b => b.id == wbd.warpBindingId).clone();
                warpBinding.linePercent = (warpBinding.linePercent - segment.startPercent) / (segment.endPercent - segment.startPercent);
                return warpBinding;
            }).concat(segment.warpBindings);

            newTimeline.cellBindings = segment.cellBindingsData.map(b => timeline.cellBindings.find(cb => cb.id == b.cellBindingId));

            let axesColumns = DataUtil.getUniqueList(segment.cellBindingsData.filter(cbd => cbd.dataCell.getType() == DataTypes.NUM).map(cbd => cbd.dataCell.columnId));
            newTimeline.axisBindings = timeline.axisBindings.filter(ab => axesColumns.includes(ab.columnId)).map(ab => ab.clone());

            return newTimeline;
        })

        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
        mModel.getAllTimelines().push(...newTimelines);
    }

    //// Break Utils ////
    function getBreakWarpBindings(cellbindingData, warpBindingData, type, startPercent, endPercent) {
        let returnable = [];

        let typeData = cellbindingData.filter(c => c.timeCell.getType() == type);
        if (typeData.length > 0) {
            // could either use line percent or value as they should both sequentially increase, line percent is easier
            let arrmax = function (prev, current) { return (prev.linePercent > current.linePercent) ? prev : current };
            let arrmin = function (prev, current) { return (prev.linePercent < current.linePercent) ? prev : current };

            let maxTypeData = typeData.reduce(arrmax);
            let minTypeData = typeData.reduce(arrmin);

            let typeWarpPoints = warpBindingData.filter(wbd => wbd.timeCell.getType() == type)
            let maxTypeWarp = typeWarpPoints.length > 0 ? typeWarpPoints.reduce(arrmax) : null;
            let minTypeWarp = typeWarpPoints.length > 0 ? typeWarpPoints.reduce(arrmin) : null;

            if (endPercent < 1 && (!maxTypeWarp || maxTypeData.linePercent > maxTypeWarp.linePercent)) {
                let linePercent = (maxTypeData.linePercent - startPercent) / (endPercent - startPercent);
                let binding = new DataStructs.WarpBinding(maxTypeData.tableId, maxTypeData.rowId, linePercent, true);
                returnable.push(binding);
            }

            // If we're not the first segment, and there is no warp points, or we're before the first one, and if we haven't already added a warp point for this data point
            if (startPercent > 0 && (!minTypeWarp || minTypeData.linePercent < minTypeWarp.linePercent) && returnable.length < typeData.length) {
                let linePercent = (minTypeData.linePercent - startPercent) / (endPercent - startPercent)
                let binding = new DataStructs.WarpBinding(minTypeData.tableId, minTypeData.rowId, linePercent, true);
                returnable.push(binding);
            }
        }

        return returnable;
    }
    //// end Break Utils ////

    function updateTimelinePoints(timelineId, oldSegments, newSegments) {
        undoStackPush();

        let timeline = mModel.getTimelineById(timelineId);

        timeline.points = PathMath.mergeSegments(newSegments);

        // update the warp points
        let newLength = PathMath.getPathLength(PathMath.mergeSegments(newSegments));
        let oldLength = PathMath.getPathLength(PathMath.mergeSegments(oldSegments));
        let cumulativeNewLength = 0;
        let cumulativeOldLength = 0;
        for (let i = 0; i < oldSegments.length; i++) {
            let newSegmentLength = PathMath.getPathLength(newSegments[i].points);
            let oldSegmentLength = PathMath.getPathLength(oldSegments[i].points);

            let newStartPercent = cumulativeNewLength / newLength;
            let oldStartPercent = cumulativeOldLength / oldLength;

            cumulativeNewLength += newSegmentLength;
            cumulativeOldLength += oldSegmentLength;

            let newEndPercent = cumulativeNewLength / newLength;
            let oldEndPercent = cumulativeOldLength / oldLength;

            let newInterval = newEndPercent - newStartPercent;
            let oldInterval = oldEndPercent - oldStartPercent;

            timeline.warpBindings
                .filter(binding =>
                    binding.linePercent >= oldStartPercent &&
                    binding.linePercent <= oldEndPercent)
                .forEach(binding => {
                    binding.linePercent = (((binding.linePercent - oldStartPercent) / oldInterval) * newInterval) + newStartPercent;
                })
        }
    }

    function addBoundTextRow(text, timeBinding, timelineId) {
        undoStackPush();

        if (mModel.getAllTables().length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mModel.getAllTables().push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mModel.getAllTables()[0].dataRows.length;
        mModel.getAllTables()[0].dataRows.push(newRow);

        let timeColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, timeBinding, timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId, { x: 10, y: 10 })
        newRow.dataCells.push(textCell);

        for (let i = 2; i < mModel.getAllTables()[0].dataColumns.length; i++) {
            let colId = mModel.getAllTables()[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        let newBinding = new DataStructs.CellBinding(mModel.getAllTables()[0].id, newRow.id, nextColId, textCell.id);
        mModel.getTimelineById(timelineId).cellBindings.push(newBinding);
    }

    function addOrUpdateWarpBinding(timelineId, alteredBindingData) {
        undoStackPush();

        if (!timelineId) throw new Error("Invalid TimelineId: " + timelineId);

        let timeline = mModel.getTimelineById(timelineId);

        if (!timeline) throw new Error("Invalid TimelineId: " + timelineId);

        let warpBindingData = mModel.getAllWarpBindingData().filter(wbd => wbd.timelineId == timelineId);
        let validIds = WarpBindingUtil.filterValidWarpBindingIds(warpBindingData, alteredBindingData);
        timeline.warpBindings = timeline.warpBindings.filter(wb => validIds.includes(wb.id));
        if (!alteredBindingData.warpBindingId) {
            // new warp binging
            timeline.warpBindings.push(new DataStructs.WarpBinding(
                alteredBindingData.tableId, alteredBindingData.rowId, alteredBindingData.linePercent));
        } else {
            let warpBinding = timeline.warpBindings.find(wb => wb.id == alteredBindingData.warpBindingId);
            if (!warpBinding) { console.error("Cannot find warp binding!"); return; }
            warpBinding.linePercent = alteredBindingData.linePercent;
        }
    }

    function addTimeRow(time) {
        undoStackPush();

        if ((typeof time == "number" && isNaN(time))) throw new Error("Invalid time!")

        if (mModel.getAllTables().length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mModel.getAllTables().push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mModel.getAllTables()[0].dataRows.length;
        mModel.getAllTables()[0].dataRows.push(newRow);

        let timeColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, time, timeColId)
        newRow.dataCells.push(timeCell);

        for (let i = 1; i < mModel.getAllTables()[0].dataColumns.length; i++) {
            let colId = mModel.getAllTables()[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        return { tableId: mModel.getAllTables()[0].id, rowId: newRow.id, timeCell };
    }

    function updateText(cellId, text) {
        undoStackPush();

        let cell = mModel.getCellById(cellId);
        cell.val = text;
    }

    function updateTextOffset(cellId, offset) {
        undoStackPush();

        let cell = mModel.getCellById(cellId);
        cell.offset = offset;
    }

    function addTimelineStroke(timelineId, points, color) {
        mModel.getTimelineById(timelineId).annotationStrokes.push(new DataStructs.Stroke(points, color));
    }

    function addTable(table) {
        undoStackPush();

        // TODO validate table.
        mModel.getAllTables().push(table.copy());
    }

    function addTableFromCSV(array2d) {
        undoStackPush();

        // TODO validate array

        let table = new DataStructs.DataTable();

        let firstColIsTime = false;
        let count = 0
        array2d.forEach((row) => {
            let item = row[0];
            if (!isNaN(Date.parse(item))) count++;
        });
        if (count > array2d.length / 2) firstColIsTime = true;

        array2d[0].forEach((cell, index) => {
            let startIndex = 0
            if (index == 0) {
                table.dataColumns.push(new DataStructs.DataColumn("Time", index));
                if (!firstColIsTime) {
                    startIndex = 1;
                    table.dataColumns.push(DataStructs.DataColumn("Col" + index + startIndex));
                }
            } else {
                table.dataColumns.push(DataStructs.DataColumn("Col" + index + startIndex));
            }
        })

        array2d.forEach((row, index) => {
            let dataRow = new DataStructs.DataRow();
            dataRow.index = index;
            row.forEach((cell, index) => {
                dataRow.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, cell, table.dataColumns[index]));
            });
            table.dataRows.push(dataRow)
        });
    }

    function tableUpdated(table, change, changeData) {
        undoStackPush();

        // sanitize the table to prevent data leaks
        table = table.copy();

        let index = mModel.getAllTables().findIndex(t => t.id == table.id);
        mModel.getAllTables()[index] = table;

        if (change == TableChange.DELETE_ROWS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let deleteBindings = timeLine.cellBindings.filter(b => changeData.includes(b.rowId));
                if (deleteBindings) {
                    // delete cell bindings for those rows
                    timeLine.cellBindings = timeLine.cellBindings.filter(b => !changeData.includes(b.rowId));
                    updateAndDeleteAxis(timeLine);
                }
            })
        } else if (change == TableChange.DELETE_COLUMNS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let deleteBindings = timeLine.cellBindings.filter(b => changeData.includes(b.columnId));
                if (deleteBindings) {
                    // delete cell bindings for those columns
                    timeLine.cellBindings = timeLine.cellBindings.filter(b => !changeData.includes(b.columnId));
                    // delete axis for those columns
                    timeLine.axisBindings = timeLine.axisBindings.filter(b => !changeData.includes(b.columnId));
                }
            })
        } else if (change == TableChange.UPDATE_CELLS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let wasChanged = timeLine.cellBindings.some(b => changeData.includes(b.cellId));
                if (wasChanged) {
                    updateAndDeleteAxis(timeLine);
                }
            })
        }
    }

    //// table Update Util functions ////
    function updateAndDeleteAxis(timeLine) {
        // update axis
        let deleteAxis = [];
        let bindingAndCells = timeLine.cellBindings.map(cb => { return { binding: cb, cell: mModel.getCellsFromBinding(cb).cell }; });
        timeLine.axisBindings.forEach(axis => {
            let cells = bindingAndCells.filter(bAndC => bAndC.binding.columnId == axis.columnId && bAndC.cell.getType() == DataTypes.NUM);
            if (cells.length > 1) {
                axis.val1 = Math.min(...cells.map(c => c.cell.getValue()));
                axis.val2 = Math.max(...cells.map(c => c.cell.getValue()));
            } else if (cells.length == 1) {
                axis.val1 = 0;
                axis.val2 = cells[0].cell.getValue();
            } else {
                deleteAxis.push(axis.id);
            }
        })
        // delete axis that no longer have cells
        timeLine.axisBindings = timeLine.axisBindings.filter(b => !deleteAxis.includes(b.id));
    }
    //// end of table Update Util functions ////

    function bindCells(lineId, cellBindings) {
        undoStackPush();

        let timeline = mModel.getTimelineById(lineId);
        let filteredBindings = cellBindings.filter(binding => binding.columnId != mModel.getTimeColumnByTableId(binding.tableId).id);
        timeline.cellBindings.push(...filteredBindings);
        // clear out duplicates
        timeline.cellBindings = DataUtil.getUniqueList(timeline.cellBindings, "cellId");

        let oldAxes = timeline.axisBindings;
        timeline.axisBindings = []

        let columnsIds = DataUtil.getUniqueList(timeline.cellBindings.map(c => c.columnId));
        columnsIds.forEach(columnId => {
            let tableId = timeline.cellBindings.find(binding => binding.columnId == columnId).tableId;
            let table = mModel.getTableById(tableId);
            let rowIds = timeline.cellBindings.filter(binding => binding.columnId == columnId).map(b => b.rowId);
            let rows = rowIds.map(rowId => table.getRow(rowId));
            let cells = rows.map(row => row.getCell(columnId));
            let numCells = cells.filter(cell => cell.getType() == DataTypes.NUM && cell.isValid())

            if (numCells.length > 0) {
                let min = Math.min(...numCells.map(i => i.getValue()));
                let max = Math.max(...numCells.map(i => i.getValue()));
                if (min == max) min > 0 ? min = 0 : max = 0;

                let axis = oldAxes.find(a => a.columnId == columnId);
                if (!axis) {
                    axis = new DataStructs.AxisBinding(columnId);
                    axis.dist1 = 30;
                    axis.dist2 = 100;
                }

                axis.val1 = min;
                axis.val2 = max;
                timeline.axisBindings.push(axis)
            }
        });
    }

    function updateAxisDist(axisId, oneOrTwo, dist) {
        undoStackPush();

        let axis = mModel.getAxisById(axisId);

        if (!axis) throw Error("Invalid axis id: " + axisId);
        if (oneOrTwo == 1) {
            axis.dist1 = dist;
        } else {
            axis.dist2 = dist;
        }
    }

    /****
     * Utility
     */

    function setModelFromObject(obj) {
        undoStackPush();

        mModel = new DataStructs.DataModel();
        obj.timelines.forEach(timeline => mModel.getAllTimelines().push(DataStructs.Timeline.fromObject(timeline)))
        obj.dataTables.forEach(table => mModel.getAllTables().push(DataStructs.DataTable.fromObject(table)))
    }

    function getModelAsObject() {
        return {
            timelines: mModel.getAllTimelines(),
            dataTables: mModel.getAllTables()
        }
    }

    function undo() {
        if (mUndoStack.length == 0) return false;
        // throws away our currently version, but will hide annoying errors for a bit...
        mRedoStack.push(mModel.copy());
        mModel = mUndoStack.pop();

        return true;
    }

    function redo() {
        if (mRedoStack.length == 0) return false;
        mUndoStack.push(mModel.copy());
        mModel = mRedoStack.pop();
        return true;
    }

    function undoStackPush() {
        mRedoStack = [];
        mUndoStack.push(mModel.copy());
    }

    /****
     * Exports
     */

    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;
    this.deleteTimeline = deleteTimeline;
    this.breakTimeline = breakTimeline;
    this.updateTimelinePoints = updateTimelinePoints;

    this.addTable = addTable;
    this.addTableFromCSV = addTableFromCSV;
    this.tableUpdated = tableUpdated;
    this.addTimeRow = addTimeRow

    // clean these up so they only modify the table, and clear that they do so.
    this.addBoundTextRow = addBoundTextRow;
    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

    this.addTimelineStroke = addTimelineStroke;

    this.bindCells = bindCells;

    this.updateAxisDist = updateAxisDist;

    this.addOrUpdateWarpBinding = addOrUpdateWarpBinding;

    this.getModel = () => mModel.copy();

    this.setModelFromObject = setModelFromObject;
    this.getModelAsObject = getModelAsObject;

    this.undo = undo;
    this.redo = redo;
}
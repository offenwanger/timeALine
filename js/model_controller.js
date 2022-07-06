function ModelController() {
    let mTimelines = [];
    let mDataTables = [];

    function newTimeline(points) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = new DataStructs.Timeline(points);
        mTimelines.push(timeline);

        return timeline;
    }

    function extendTimeline(timelineId, points, extendStart) {
        let timeline = getTimelineById(timelineId);
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
        let startTimeline = getTimelineById(timelineIdStart);
        let endTimeline = getTimelineById(timelineIdEnd);

        let originalStartLength = PathMath.getPathLength(startTimeline.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.points);

        // knock off the end points cuz they're probably pretty close.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.points.concat(points, endTimeline.points);
        let newLength = PathMath.getPathLength(newPoints);

        let newTimeline = new DataStructs.Timeline(newPoints);
        newTimeline.cellBindings = DataUtil.getUniqueList(startTimeline.cellBindings.concat(endTimeline.cellBindings), 'cellId');

        mTimelines = mTimelines.filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd);
        mTimelines.push(newTimeline);

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
            let timeCell = getTableById(b.tableId).getRow(b.rowId).getCell(getTimeColumn(b.tableId).id);
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
        mTimelines = mTimelines.filter(t => t.id != timelineId);
    }

    function breakTimeline(timelineId, segments) {
        if (segments.length < 2) throw new Error("Expecting at least part of the timeline to be erased.")

        let timeline = getTimelineById(timelineId);

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
        }


        // split up the warp bindings into their proper segments
        segments.forEach(s => s.warpBindings = []);
        timeline.warpBindings.forEach(binding => {
            let segment = segments.find(s => {
                s.startPercent <= binding.linePercent &&
                    s.endPercent >= binding.linePercent
            });
            if (!segment) { console.error("Something wierd here."); };
            segment.warpBindings.push(binding.clone());
        })

        // add warp bindings to ensure the correct data stays in the line
        segments.forEach(segment => {
            if (segment.label == SEGMENT_LABELS.UNAFFECTED) {
                if (segment.startPercent > 0) {
                    let time;
                    if (hasTimeMapping(timelineId)) {
                        time = mapLinePercentToTime(timelineId, DataTypes.TIME_BINDING, segment.startPercent);
                    } else {
                        time = mapLinePercentToTime(timelineId, DataTypes.NUM, segment.startPercent);
                    }

                    let newRowData = addTimeRow(time);
                    let linePercent = 0;
                    let binding = new DataStructs.WarpBinding(newRowData.tableId, newRowData.rowId, linePercent, true);
                    segment.warpBindings.push(binding);
                }

                if (segment.endPercent < 1) {
                    let time;
                    if (hasTimeMapping(timelineId)) {
                        time = mapLinePercentToTime(timelineId, DataTypes.TIME_BINDING, segment.endPercent);
                    } else {
                        time = mapLinePercentToTime(timelineId, DataTypes.NUM, segment.endPercent);
                    }

                    let newRowData = addTimeRow(time);
                    let linePercent = 1;
                    let binding = new DataStructs.WarpBinding(newRowData.tableId, newRowData.rowId, linePercent, true);
                    segment.warpBindings.push(binding);
                }
            }
        })

        // create the new timelines
        let newTimelines = segments.filter(s => s.label == SEGMENT_LABELS.UNAFFECTED).map(segment => {
            let newTimeline = new DataStructs.Timeline(segment.points);
            newTimeline.warpBindings = segment.warpBindings;
            newTimeline.cellBindings = [...timeline.cellBindings].map(b => b.clone());
            return newTimeline;
        })

        mTimelines = mTimelines.filter(t => t.id != timelineId);
        mTimelines.push(...newTimelines);
    }

    function updateTimelinePoints(timelineId, oldSegments, newSegments) {
        let timeline = getTimelineById(timelineId);

        timeline.points = PathMath.mergeSegments(newSegments);

        // update the warp points
        let newLength = PathMath.getPathLength(PathMath.mergeSegments(newSegments));
        let oldLength = PathMath.getPathLength(PathMath.mergeSegments(oldSegments));
        let cumulativeNewLength = 0;
        let cumulativeOldLength = 0;
        for (let i = 0; i < oldSegments.length; i++) {
            let newSegmentLength = PathMath.getPathLength(newSegments[i]);
            let oldSegmentLength = PathMath.getPathLength(oldSegments[i]);

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
        if (mDataTables.length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mDataTables.push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mDataTables[0].dataRows.length;
        mDataTables[0].dataRows.push(newRow);

        let timeColId = mDataTables[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, timeBinding, timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mDataTables[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId, { x: 10, y: 10 })
        newRow.dataCells.push(textCell);

        for (let i = 2; i < mDataTables[0].dataColumns.length; i++) {
            let colId = mDataTables[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        let newBinding = new DataStructs.CellBinding(mDataTables[0].id, newRow.id, nextColId, textCell.id);
        getTimelineById(timelineId).cellBindings.push(newBinding);
    }

    function addOrUpdateWarpBinding(timelineId, alteredBindingData) {
        if (!timelineId) throw new Error("Invalid TimelineId: " + timelineId);

        let timeline = getTimelineById(timelineId);

        if (!timeline) throw new Error("Invalid TimelineId: " + timelineId);

        let warpBindingData = getAllWarpBindingData().filter(wbd => wbd.timelineId == timelineId);
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
        if ((typeof time == "number" && isNaN(time))) throw new Error("Invalid time!")

        if (mDataTables.length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mDataTables.push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mDataTables[0].dataRows.length;
        mDataTables[0].dataRows.push(newRow);

        let timeColId = mDataTables[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, time, timeColId)
        newRow.dataCells.push(timeCell);

        for (let i = 0; i < mDataTables[0].dataColumns.length; i++) {
            let colId = mDataTables[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        return { tableId: mDataTables[0].id, rowId: newRow.id, timeCell };
    }

    function updateText(cellId, text) {
        let cell = getCellById(cellId);
        cell.val = text;
    }

    function updateTextOffset(cellId, offset) {
        let cell = getCellById(cellId);
        cell.offset = offset;
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

    function addTable(table) {
        // TODO validate table.
        mDataTables.push(table);
    }

    function addTableFromCSV(array2d) {
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

    function tableUpdated(table) {
        let index = mDataTables.findIndex(t => t.id == table.id);
        mDataTables[index] = table;
    }

    function bindCells(lineId, cellBindings) {
        let timeline = getTimelineById(lineId);
        let filteredBindings = cellBindings.filter(binding => getTimeColumn(binding.tableId).id != binding.columnId);
        timeline.cellBindings.push(...filteredBindings);
        // clear out duplicates
        timeline.cellBindings = DataUtil.getUniqueList(timeline.cellBindings, "cellId");

        let oldAxes = timeline.axisBindings;
        timeline.axisBindings = []

        let columnsIds = DataUtil.getUniqueList(timeline.cellBindings.map(c => c.columnId));
        columnsIds.forEach(columnId => {
            let tableId = timeline.cellBindings.find(binding => binding.columnId == columnId).tableId;
            let table = getTableById(tableId);
            let rowIds = timeline.cellBindings.filter(binding => binding.columnId == columnId).map(b => b.rowId);
            let rows = rowIds.map(rowId => table.getRow(rowId));
            let cells = rows.map(row => row.getCell(columnId));
            let numCells = cells.filter(cell => cell.getType() == DataTypes.NUM && cell.isValid())
            // TODO: Handle invalid cells
            if (numCells.length > 0) {
                let min = Math.min(...numCells.map(i => i.getValue()));
                let max = Math.max(...numCells.map(i => i.getValue()));
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
        let axis = getAxisById(axisId);

        if (!axis) throw Error("Invalid axis id: " + axisId);
        if (oneOrTwo == 1) {
            axis.dist1 = dist;
        } else {
            axis.dist2 = dist;
        }
    }

    function getAxisById(axisId) {
        return mTimelines.map(t => t.axisBindings).flat().find(b => b.id == axisId);
    }

    function getCellFromBinding(binding) {
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

    function mapTimeToLinePercent(timelineId, type, timeVal) {
        let warpBindingsData = getAllWarpBindingData().filter(b =>
            b.timelineId == timelineId && b.timeCell.getType() == type);
        warpBindingsData.sort((a, b) => DataUtil.AGreaterThanB(a.timeCell.getValue(), b.timeCell.getValue(), type) ? 1 : -1);

        if (type == DataTypes.TEXT) {
            let binding = warpBindingsData.find(b => DataUtil.AEqualsB(b.timeCell.getValue(), timeVal, type));
            return binding ? binding.linePercent : 0;
        } else if (type == DataTypes.TIME_BINDING || type == DataTypes.NUM) {
            let { start, end } = inferEndPoints(timelineId, type);

            if (warpBindingsData.length == 0) {
                return DataUtil.percentBetween(start, end, timeVal, type);
            } else {
                // add caps
                if (warpBindingsData[0].linePercent > 0) {
                    warpBindingsData.push({ val: start, linePercent: 0 });
                }
                if (warpBindingsData[0].linePercent < 1) {
                    warpBindingsData.push({ val: end, linePercent: 1 });
                }

                // find the correct interval
                for (let i = 1; i < warpBindingsData.length; i++) {
                    let bindingData = warpBindingsData[i];
                    let prevBindingData = warpBindingsData[i - 1];
                    if ((DataUtil.AGreaterThanB(bindingData.val, timeVal, type) || DataUtil.AEqualsB(bindingData.val, timeVal, type)) &&
                        DataUtil.AGreaterThanB(timeVal, prevBindingData.val, type)) {
                        return DataUtil.percentBetween(prevBindingData.val, bindingData.val, timeVal, type) + prevBindingData.linePercent;
                    }
                }

                console.error("Unhandle edge case!", start, end, timeVal);
                return 0;
            }
        } else throw new Error("Unhandled type: " + type);
    }

    function mapLinePercentToTime(timelineId, type, linePercent) {
        // can only be done if there are at least two reference points, or is num. 
        let { start, end } = inferEndPoints(timelineId, type);
        let warpBindingsData = getAllWarpBindingData().filter(b =>
            b.timelineId == timelineId && b.timeCell.getType() == type);
        warpBindingsData.sort((a, b) => DataUtil.AGreaterThanB(a.timeCell.getValue(), b.timeCell.getValue(), type) ? 1 : -1);

        if (warpBindingsData.length == 0) {
            let timeAlongLine = DataUtil.subtractAFromB(start, end, type) * linePercent;
            return DataUtil.incrementAByB(start, timeAlongLine, type);
        } else {
            if (warpBindingsData[0].linePercent > 0) {
                warpBindingsData.push({ val: start, linePercent: 0 });
            }
            if (warpBindingsData[0].linePercent < 1) {
                warpBindingsData.push({ val: end, linePercent: 1 });
            }

            for (let i = 1; i < warpBindingsData.length; i++) {
                let bindingData = warpBindingsData[i];
                let prevBindingData = warpBindingsData[i - 1];
                if (bindingData.linePercent > linePercent &&
                    linePercent > prevBindingData.linePercent) {
                    let timeAlongLine = DataUtil.subtractAFromB(prevBindingData.val, bindingData.val, type) * linePercent;
                    return DataUtil.incrementAByB(prevBindingData.val, timeAlongLine, type);
                }
            }

            console.error("Unhandle edge case!", start, end, val);
            return 0;
        }
    }

    function getAllWarpBindingData() {
        let returnable = [];
        mTimelines.forEach(timeline => {
            timeline.warpBindings.forEach(warpBinding => {
                let row = getTableRow(warpBinding.tableId, warpBinding.rowId);
                if (!row) { console.error("Invalid warp binding! No row!"); return; }

                let timeCell = row.getCell(getTimeColumn(warpBinding.tableId).id);
                if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

                returnable.push(new DataStructs.WarpBindingData(timeline.id, warpBinding.id,
                    warpBinding.tableId, warpBinding.rowId, timeCell, warpBinding.linePercent));
            })
        })
        return returnable;
    }

    function getAllCellBindingData() {
        let returnable = [];
        mTimelines.forEach(timeline => {
            timeline.cellBindings.forEach(cellBinding => {
                let row = getTableRow(cellBinding.tableId, cellBinding.rowId);
                if (!row) { console.error("Invalid warp binding! No row!"); return; }

                let timeCell = row.getCell(getTimeColumn(cellBinding.tableId).id);
                if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

                let dataCell = row.getCell(cellBinding.columnId);
                if (!dataCell) { console.error("Failed to get cell for column"); return; }
                if (dataCell.id != cellBinding.cellId) throw new Error("Got the wrong cell!");

                let linePercent = mapTimeToLinePercent(timeline.id, timeCell.getType(), timeCell.getValue());
                let axis = timeline.axisBindings.find(a => a.columnId == cellBinding.columnId);

                returnable.push(new DataStructs.CellBindingData(timeline.id, cellBinding.id, timeCell, dataCell, linePercent, axis ? axis : null));
            })
        })
        return returnable;
    }

    /****
     * Utility
     */

    function getTableRow(tableId, rowId) {
        return getTableById(tableId).getRow(rowId);
    }

    function getTimeColumn(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    function inferEndPoints(timelineId, type) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Invalid timeline id: " + timelineId)

        let warpBindingsData = getAllWarpBindingData().filter(b =>
            b.timelineId == timelineId && b.timeCell.getType() == type);
        warpBindingsData.sort((a, b) => DataUtil.AGreaterThanB(a.timeCell.getValue(), b.timeCell.getValue(), type) ? 1 : -1);

        let boundCellData = getBoundTimeValues(timelineId, type);

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

        if (warpBindingsData.length > 1) {
            // at least two bindings
            let start = inferStart(warpBindingsData[0].timeCell.getValue(), warpBindingsData[1].timeCell.getValue(),
                warpBindingsData[0].linePercent, warpBindingsData[1].linePercent);

            let end = inferEnd(warpBindingsData[warpBindingsData.length - 1].timeCell.getValue(), warpBindingsData[warpBindingsData.length - 2].timeCell.getValue(),
                warpBindingsData[warpBindingsData.length - 1].linePercent, warpBindingsData[warpBindingsData.length - 2].linePercent)

            return { start, end }
        } else if ((warpBindingsData.length == 1 && boundCellData.length > 1) ||
            (warpBindingsData.length == 1 && boundCellData.length == 1 &&
                !DataUtil.AEqualsB(warpBindingsData[0].timeCell.getValue(), boundCellData[0], type))) {
            // one binding and at least one value
            if (DataUtil.AGreaterThanB(warpBindingsData[0].timeCell.getValue(), boundCellData[0], type) &&
                DataUtil.AGreaterThanB(boundCellData[boundCellData.length - 1], warpBindingsData[0].timeCell.getValue(), type)) {
                // if the values wrap the binding, return the values as start and end
                return { start: warpBindingsData[0], end: boundCellData[boundCellData.length - 1] };
            } else if (DataUtil.AGreaterThanB(warpBindingsData[0].timeCell.getValue(), boundCellData[0], type)) {
                let start = boundCellData[0];
                let lastVal = warpBindingsData[0].timeCell.getValue();
                let lastPercent = warpBindingsData[0].linePercent;
                let end = inferEnd(lastVal, start, lastPercent, 0);

                return { start, end }
            } else if (DataUtil.AGreaterThanB(boundCellData[boundCellData.length - 1], warpBindingsData[0].timeCell.getValue(), type)) {
                let firstVal = warpBindingsData[0].timeCell.getValue();
                let firstPercent = warpBindingsData[0].linePercent;
                let end = boundCellData[boundCellData.length - 1];
                let start = inferStart(firstVal, end, firstPercent, 1);

                return { start, end };
            } else {
                throw new Error("Code should be unreachable!")
            }
        } else if (boundCellData.length > 1) {
            // at least two values
            return { start: boundCellData[0], end: boundCellData[boundCellData.length - 1] };
        } else if (warpBindingsData.length == 1 && type == DataTypes.NUM) {
            let val = warpBindingsData[0].timeCell.getValue();
            if (val > 0) {
                return { start: 0, end: inferEnd(val, 0, warpBindingsData[0].linePercent, 0) }
            } else {
                return { start: inferStart(val, 1, warpBindingsData[0].linePercent, 1), end: 1 }
            }
        } else if (boundCellData.length == 1 && type == DataTypes.NUM) {
            let val = boundCellData[0];
            if (val > 0) {
                return { start: 0, end: val }
            } else {
                return { start: val, end: 1 }
            }
        } else if (type == DataTypes.NUM) {
            return { start: 0, end: 1 }
        } else throw new Error("Not enough data to caluclate end points!");
    }

    function getMaxBoundTime(timelineId, type) {
        let values = getTimelineById(timelineId).cellBindings
            .map(b => getCellFromBinding(b).timeCell)
            .filter(timeCell => timeCell.getType() == type)
            .map(timeCell => timeCell.getValue());
        if (values.length == 0) {
            return null;
        } else if (values.length == 1) {
            return values[0]
        } else if (type == DataTypes.NUM) {
            return Math.max(...values);
        } else if (type == DataTypes.TIME_BINDING) {
            values.reduce((max, val) => TimeBindingUtil.AGreaterThanB(val, max) ? val : max);
        } else { console.error("cannot get max of " + type) };
    }

    function getMinBoundTime(timelineId, type) {
        let values = getTimelineById(timelineId).cellBindings
            .map(b => getCellFromBinding(b).timeCell)
            .filter(timeCell => timeCell.getType() == type)
            .map(timeCell => timeCell.getValue());
        if (values.length == 0) {
            return null;
        } else if (values.length == 1) {
            return values[0]
        } else if (type == DataTypes.NUM) {
            return Math.min(...values);
        } else if (type == DataTypes.TIME_BINDING) {
            values.reduce((min, val) => TimeBindingUtil.AGreaterThanB(val, min) ? min : val);
        } else { console.error("cannot get max of " + type) };
    }

    function hasTimeMapping(timelineId) {
        let warpBindingsData = getTimelineById(timelineId).warpBindings
            .filter(b => b.isValid)
            .map(b => {
                let cell = getTableRow(b.tableId, b.rowId).getCell(getTimeColumn(b.tableId).id)
                return { linePercent: b.linePercent, val: cell.getValue(), type: cell.getType() }
            })
            .filter(result => result.type == DataTypes.TIME_BINDING);
        // if we have two warp bindings, there's enough data
        if (warpBindingsData.length > 2) return true;


        let max = getMaxBoundTime(timelineId, DataTypes.TIME_BINDING);
        let min = getMinBoundTime(timelineId, DataTypes.TIME_BINDING);

        // if we have no values, we do not have enough data.
        if (max == null) return false;

        // if we have two values, there's enough data
        if (!TimeBindingUtil.AEqualsB(max, min)) return true;

        // if we have only have one value, there is not enough data
        if (warpBindingsData.length == 0) return false;

        // if we have one warp and one data piece that are different, there is enough data
        if (!TimeBindingUtil.AEqualsB(warpBindingsData[0].val, min)) return true;

        // otherwise there isn't.
        return false;
    }

    /****
     * Utility
     */

    function getBoundTimeValues(timelineId, timeType) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Bad timelineId: " + timelineId);

        let returnable = [];
        timeline.cellBindings.forEach(cellBinding => {
            let row = getTableRow(cellBinding.tableId, cellBinding.rowId);
            if (!row) { console.error("Invalid warp binding! No row!"); return; }

            let timeCell = row.getCell(getTimeColumn(cellBinding.tableId).id);
            if (!timeCell) { console.error("Bad table state! Failed to get time cell"); return; }

            if (timeCell.getType() == timeType) {
                returnable.push(timeCell.getValue());
            }
        })

        returnable.sort((a, b) => DataUtil.AGreaterThanB(a, b, timeType) ? 1 : -1);
        return returnable;
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

    this.getTimelineById = getTimelineById;
    this.getAllTimelines = () => [...mTimelines];

    this.addTable = addTable;
    this.addTableFromCSV = addTableFromCSV;
    this.getAllTables = () => [...mDataTables];
    this.tableUpdated = tableUpdated;
    this.addTimeRow = addTimeRow

    // clean these up so they only modify the table, and clear that they do so.
    this.addBoundTextRow = addBoundTextRow;
    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

    this.bindCells = bindCells;

    this.updateAxisDist = updateAxisDist;

    this.addOrUpdateWarpBinding = addOrUpdateWarpBinding;

    this.getAllWarpBindingData = getAllWarpBindingData;
    this.getAllCellBindingData = getAllCellBindingData;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.hasTimeMapping = hasTimeMapping;


}
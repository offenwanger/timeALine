function ModelController() {
    let mTimelines = [];
    let mDataTables = [];

    function newTimeline(points) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = createTimeline(points);
        mTimelines.push(timeline);

        return timeline;
    }

    function extendTimeline(timelineId, points, extendStart) {
        let timeline = getTimelineById(timelineId);
        let originalLength = PathMath.getPathLength(timeline.linePath.points);

        // knock off the first point cuz it's probably pretty close. 
        //TODO: Handle this properly.
        extendStart ? points.pop() : points.unshift();

        let newPoints = extendStart ? points.concat(timeline.linePath.points) : timeline.linePath.points.concat(points);
        let newLength = PathMath.getPathLength(newPoints);

        timeline.linePath.points = newPoints;
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

        let originalStartLength = PathMath.getPathLength(startTimeline.linePath.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.linePath.points);

        // knock off the end points cuz they're probably pretty close.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.linePath.points.concat(points, endTimeline.linePath.points);
        let newLength = PathMath.getPathLength(newPoints);

        let newTimeline = createTimeline(newPoints);
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
        let totalLength = PathMath.getPathLength(timeline.linePath.points);
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

                    let newRowData = addRowWithTime(time);
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

                    let newRowData = addRowWithTime(time);
                    let linePercent = 1;
                    let binding = new DataStructs.WarpBinding(newRowData.tableId, newRowData.rowId, linePercent, true);
                    segment.warpBindings.push(binding);
                }
            }
        })

        // create the new timelines
        let newTimelines = segments.filter(s => s.label == SEGMENT_LABELS.UNAFFECTED).map(segment => {
            let newTimeline = createTimeline(segment.points);
            newTimeline.warpBindings = segment.warpBindings;
            newTimeline.cellBindings = [...timeline.cellBindings].map(b => b.clone());
            return newTimeline;
        })

        mTimelines = mTimelines.filter(t => t.id != timelineId);
        mTimelines.push(...newTimelines);
    }

    function updateTimelinePoints(timelineId, oldSegments, newSegments) {
        let timeline = getTimelineById(timelineId);

        timeline.linePath.points = PathMath.mergeSegments(newSegments);

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

    function updateWarpBinding(timelineId, binding) {
        if (!timelineId) throw new Error("Invalid TimelineId: " + timelineId);

        let timeline = getTimelineById(timelineId);

        if (!timeline) throw new Error("Invalid TimelineId: " + timelineId);

        timeline.warpBindings = getUpdatedWarpBindings(timeline.id, binding);
    }

    function getUpdatedWarpBindings(timelineId, alteredBinding) {
        let allBindings = getTimelineById(timelineId).warpBindings;
        let alteredTimeCell = getTimeCellForRow(alteredBinding.tableId, alteredBinding.rowId);
        let alteredType = alteredTimeCell.getType();
        let alteredValue = alteredTimeCell.getValue();

        let validBindings = [alteredBinding];
        allBindings.forEach(binding => {
            let timeCell = getTimeCellForRow(binding.tableId, binding.rowId);
            if (timeCell.getType() == alteredType) {
                if (binding.linePercent > alteredBinding.linePercent && DataUtil.AGreaterThanB(timeCell.getValue(), alteredValue, alteredType)) {
                    validBindings.push(binding)
                } else if (alteredBinding.linePercent > binding.linePercent && DataUtil.AGreaterThanB(alteredValue, timeCell.getValue(), alteredType)) {
                    validBindings.push(binding)
                } // TODO: else delete row if it's not being used for anything else?
            } else {
                validBindings.push(binding);
            }
        });
        return validBindings;
    }

    function addRowWithTime(time) {
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

        return { tableId: mDataTables[0].id, rowId: newRow.id };
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

    function getBoundData() {
        let data = []
        mTimelines.forEach(timeline => {
            timeline.cellBindings.forEach(binding => {
                let { cell, timeCell } = getCellFromBinding(binding);

                if (!cell.isValid()) {
                    console.error("Handle this!");
                    return;
                }

                let linePercent;
                let warpBinding = timeline.warpBindings.find(wb => wb.rowId == binding.rowId);
                if (warpBinding) {
                    linePercent = warpBinding.linePercent;
                } else {
                    if (!timeCell.isValid) {
                        linePercent = 0;
                    } else {
                        let timeType = timeCell.getType();
                        if (timeType == DataTypes.TIME_BINDING) {
                            if (hasTimeMapping(timeline.id)) {
                                linePercent = mapTimeToLinePercent(timeline.id, timeType, timeCell.getValue());
                            } else {
                                linePercent = 0;
                            }
                        } else if (timeType == DataTypes.NUM) {
                            linePercent = mapTimeToLinePercent(timeline.id, timeType, timeCell.getValue());
                        } else {
                            linePercent = 0;
                        }
                    }
                }

                data.push({
                    id: cell.id,
                    type: cell.getType(),
                    val: cell.getValue(),
                    offset: cell.offset,
                    line: timeline.linePath.points,
                    linePercent,
                    axis: timeline.axisBindings.find(a => a.columnId == binding.columnId)
                });

            })
        })

        return data;
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

    function getWarpBindingsData() {
        return mTimelines.map(timeline => {
            let bindings = timeline.warpBindings.map(b => {
                let timeCell = getTableById(b.tableId).getRow(b.rowId).getCell(getTimeColumn(b.tableId).id);
                return {
                    rowId: b.rowId,
                    timeVal: timeCell.getValue(),
                    type: timeCell.getType(),
                    linePercent: b.linePercent,
                    isValid: b.isValid,
                }
            });

            return {
                id: timeline.id,
                bindings: bindings,
                linePoints: timeline.linePath.points,
            }
        });
    }

    function getTableRow(tableId, rowId) {
        return getTableById(tableId).getRow(rowId);
    }

    function getTimeColumn(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    function getTimeCellForRow(tableId, rowId) {
        let row = getTableRow(tableId, rowId);
        if (!row) throw new Error("Invalid row id!");
        let cell = row.getCell(getTimeColumn(tableId).id);
        if (!cell) throw new Error("Bad table state! Failed to get time cell");
        return cell;
    }

    function mapTimeToLinePercent(timelineId, type, timeVal) {
        let { min, max, warpBindingsData } = getMaxMinWarpBindings(timelineId, type);

        if (warpBindingsData.length == 0) {
            return DataUtil.percentBetween(min, max, timeVal, type);
        } else {
            // add caps
            if (warpBindingsData[0].linePercent > 0) {
                warpBindingsData.push({ val: min, linePercent: 0 });
            }
            if (warpBindingsData[0].linePercent < 1) {
                warpBindingsData.push({ val: max, linePercent: 1 });
            }

            // find the correct interval
            for (let i = 1; i < warpBindingsData.length; i++) {
                let bindingData = warpBindingsData[i];
                let prevBindingData = warpBindingsData[i - 1];
                if (DataUtil.AGreaterThanB(bindingData.val, timeVal, type) &&
                    DataUtil.AGreaterThanB(timeVal, prevBindingData.val, type)) {
                    return DataUtil.percentBetween(prevBindingData.val, bindingData.val, timeVal, type) + prevBindingData.linePercent;
                }
            }

            console.error("Unhandle edge case!", max, min, val);
            return 0;
        }
    }

    function mapLinePercentToTime(timelineId, type, linePercent) {
        let { max, min, warpBindingsData } = getMaxMinWarpBindings(timelineId, type);

        if (warpBindingsData.length == 0) {
            let timeAlongLine = DataUtil.subtractAFromB(min, max, type) * linePercent;
            return DataUtil.incrementAByB(min, timeAlongLine, type);
        } else {
            if (warpBindingsData[0].linePercent > 0) {
                warpBindingsData.push({ val: min, linePercent: 0 });
            }
            if (warpBindingsData[0].linePercent < 1) {
                warpBindingsData.push({ val: max, linePercent: 1 });
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

            console.error("Unhandle edge case!", max, min, val);
            return 0;
        }
    }

    function getMaxMinWarpBindings(timelineId, type) {
        let timeline = getTimelineById(timelineId);
        if (!timeline) throw new Error("Invalid timeline id: " + timelineId)

        let equals = (a, b) => DataUtil.AEqualsB(a, b, type);
        let greaterThan = (a, b) => DataUtil.AGreaterThanB(a, b, type);
        let subtractAFromB = (a, b) => DataUtil.subtractAFromB(a, b, type);
        let incrementBy = (a, b) => DataUtil.incrementAByB(a, b, type);

        let warpBindingsData = getTimelineById(timelineId).warpBindings
            .filter(b => b.isValid)
            .map(b => {
                let cell = getTableRow(b.tableId, b.rowId).getCell(getTimeColumn(b.tableId).id)
                return { linePercent: b.linePercent, val: cell.getValue(), type: cell.getType() }
            })
            .filter(result => result.type == type);
        warpBindingsData.sort((a, b) => greaterThan(a.val, b.val) ? 1 : -1);

        let max = getMaxTimeMapping(timelineId, type);
        let min = getMinTimeMapping(timelineId, type);

        if (warpBindingsData.length > 0 && (equals(min, warpBindingsData[0].val) || greaterThan(min, warpBindingsData[0].val))) {
            // min isn't actually min
            min = null;
        }

        let lastIndex = warpBindingsData.length - 1;
        if (warpBindingsData.length > 0 && (equals(max, warpBindingsData[lastIndex].val) || greaterThan(warpBindingsData[lastIndex].val, max))) {
            // max isn't actually max
            max = null;
        }

        if (max == min) {
            // there was less than two values
            if (max == null) {
                // there were no values
                if (warpBindingsData.length > 1) {
                    let firstVal = warpBindingsData[0].val;
                    let nextVal = warpBindingsData[1].val;
                    let firstPercent = warpBindingsData[0].linePercent;
                    let nextPercent = warpBindingsData[1].linePercent;
                    // but at least two warp bindings
                    let ratio = subtractAFromB(firstVal, nextVal) / (nextPercent - firstPercent)
                    let timeVal = ratio * firstPercent;
                    min = incrementBy(firstVal, -timeVal);

                    let lastVal = warpBindingsData[warpBindingsData.length - 1].val;
                    let prevVal = warpBindingsData[warpBindingsData.length - 2].val;
                    let lastPercent = warpBindingsData[warpBindingsData.length - 1].linePercent;
                    let prevPercent = warpBindingsData[warpBindingsData.length - 2].linePercent;
                    ratio = subtractAFromB(prevVal, lastVal) / (lastPercent - prevPercent)
                    timeVal = ratio * (1 - lastPercent);
                    max = incrementBy(lastVal, timeVal);
                } else {
                    if (type == DataTypes.TIME_BINDING) {
                        throw new Error("Not enough data to caluclate a time!");
                    } else if (type == DataTypes.NUM) {
                        if (warpBindingsData.length > 0) {
                            // one warp binding, no values, and the binding is a num
                            let value = warpBindingsData[0].val;
                            let linePercent = warpBindingsData[0].linePercent;

                            if (typeof value != "number") throw new Error("Binding is not a number: " + value);

                            if (value < 1 && value > 0) {
                                max = 1;
                                min = 0;
                            } else if (value >= 1) {
                                max = value / linePercent;
                                min = 0;
                            } else if (value <= 0) {
                                max = 1;
                                min = (1 - value) / (1 - linePercent);
                            } else throw Error("Invalid value: " + value);
                        } else {
                            // Nothing at all.
                            max = 1;
                            min = 0;
                        }
                    }
                }
            } else if (warpBindingsData.length > 0) {
                // there was only one value but at least one warp bindings
                let val = max;
                let last = warpBindingsData.length - 1;
                if (val < warpBindingsData[0].val) {
                    min = val;
                    let prevVal = warpBindingsData.length == 1 ? min : warpBindingsData[last - 1].val;
                    let prevLine = warpBindingsData.length == 1 ? 0 : warpBindingsData[last - 1].linePercent;

                    let maxTimeDiff = subtractAFromB(warpBindingsData[last].val, prevVal) * (1 - prevLine) / (warpBindingsData[last].linePercent - warpBindingsData[last - 1].linePercent)
                    max = incrementBy(warpBindingsData[0].val, maxTimeDiff);


                } else if (val > warpBindingsData[last].val) {
                    max = val;
                    let nextVal = warpBindingsData.length == 1 ? max : warpBindingsData[1].val;
                    let nextLine = warpBindingsData.length == 1 ? 1 : warpBindingsData[1].linePercent;

                    let minTimeDiff = subtractAFromB(nextVal, warpBindingsData[0].val) * warpBindingsData[0].linePercent / (nextLine.linePercent - warpBindingsData[0].linePercent)
                    min = incrementBy(warpBindingsData[0].val, -minTimeDiff);
                }
            } else {
                // There is one value but no warp bindings
                if (type == DataTypes.TIME_BINDING) {
                    throw new Error("Not enough data to caluclate a time!");
                } else if (type == DataTypes.NUM) {
                    let val = max;
                    if (val > 0) {
                        min = 0;
                        max = val;
                    } else {
                        min = val;
                        max = 1;
                    }
                }
            }
        }

        if (isNaN(min) || isNaN(max)) { throw new Error("Failed to get proper min and max time bindings: " + min + " " + max) }

        return { max, min, warpBindingsData };
    }

    function getMaxTimeMapping(timelineId, type) {
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

    function getMinTimeMapping(timelineId, type) {
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


        let max = getMaxTimeMapping(timelineId, DataTypes.TIME_BINDING);
        let min = getMinTimeMapping(timelineId, DataTypes.TIME_BINDING);

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

    function createTimeline(points) {
        let timeline = new DataStructs.Timeline();
        timeline.linePath.points = points;

        return timeline;
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
    this.addRowWithTime = addRowWithTime

    this.getTimelinePaths = function () { return mTimelines.map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }) };

    this.addBoundTextRow = addBoundTextRow;
    this.bindCells = bindCells;
    this.getBoundData = getBoundData;

    this.updateAxisDist = updateAxisDist;

    this.updateWarpBinding = updateWarpBinding;
    this.getWarpBindingsData = getWarpBindingsData;
    this.getUpdatedWarpBindings = getUpdatedWarpBindings;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.hasTimeMapping = hasTimeMapping;

    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

}
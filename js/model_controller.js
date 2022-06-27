function ModelController() {
    let mTimelines = [];
    let mDataTables = [];

    function newTimeline(points) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = createTimeline(points);
        mTimelines.push(timeline);

        return timeline;
    }

    function createTimeline(points) {
        let timeline = new DataStructs.Timeline();
        timeline.linePath.points = points;

        return timeline;
    }

    function extendTimeline(points, timelineId, extendStart) {
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

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {
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

    function deletePoints(mask) {
        let currentTimelines = [];
        let removedTimelines = [];
        mTimelines.forEach(timeline => {
            timeline.warpBindings.sort((a, b) => { a.linePercent - b.linePercent; })

            let segments = [{ covered: mask.isCovered(timeline.linePath.points[0]), points: [timeline.linePath.points[0]] }]

            // TODO: Subdivide the line segment to get a more exact erase in the affected areas
            for (let i = 1; i < timeline.linePath.points.length; i++) {
                let point = timeline.linePath.points[i];
                if (mask.isCovered(point) == segments[segments.length - 1].covered) {
                    segments[segments.length - 1].points.push(point);
                } else {
                    let previousPoint = timeline.linePath.points[i - 1]
                    segments.push({ covered: mask.isCovered(point), points: [previousPoint, point] })
                }
            }

            // remove the first segment if it was only one point long. 
            if (segments.length > 1 && segments[0].points.length == 1) segments.shift();

            if (segments.length > 1) {
                removedTimelines.push(timeline);

                let totalLength = PathMath.getPathLength(timeline.linePath.points);

                let warpIndex = 0;
                for (let i = 0; i < segments.length; i++) {
                    let segment = segments[i];

                    segment.length = PathMath.getPathLength(segments[i].points);

                    (i == 0) ?
                        segment.startPercent = 0 :
                        segment.startPercent = segments[i - 1].endPercent;

                    segment.endPercent = (segment.length / totalLength) + segment.startPercent;

                    segment.warpBindings = [];

                    for (warpIndex; warpIndex < timeline.warpBindings.length; warpIndex++) {
                        // if the line percent is on this segment (or if this is the last segment just put on everything that's left)
                        if (timeline.warpBindings[warpIndex].linePercent <= segment.endPercent || i == segments.length - 1) {
                            let binding = timeline.warpBindings[warpIndex].clone();
                            binding.linePercent -= segment.startPercent
                            binding.linePercent /= segment.endPercent - segment.startPercent;
                            segment.warpBindings.push(binding);
                        } else {
                            break;
                        }
                    }

                    if (!segment.covered) {
                        let newTimeline = createTimeline(segment.points);
                        newTimeline.warpBindings = segment.warpBindings;

                        if (i > 0) {
                            if (hasTimeMapping(timeline.id)) {
                                let time = mapLinePercentToTime(timeline.id, DataTypes.TIME_BINDING, segment.startPercent);
                                let binding = createAndAddBindingRow(0, time)
                                newTimeline.warpBindings.push(binding);
                            }

                            let time = mapLinePercentToTime(timeline.id, DataTypes.NUM, segment.startPercent);
                            let binding = createAndAddBindingRow(0, time)
                            newTimeline.warpBindings.push(binding);
                        }
                        if (i < segments.length - 1) {
                            if (hasTimeMapping(timeline.id)) {
                                let time = mapLinePercentToTime(timeline.id, DataTypes.TIME_BINDING, segment.startPercent);
                                let binding = createAndAddBindingRow(1, time)
                                newTimeline.warpBindings.push(binding);
                            }

                            let time = mapLinePercentToTime(timeline.id, DataTypes.NUM, segment.endPercent);
                            let binding = createAndAddBindingRow(1, time)
                            newTimeline.warpBindings.push(binding);
                        }

                        newTimeline.cellBindings = [...timeline.cellBindings];

                        currentTimelines.push(newTimeline)
                    }
                }
            } else if (segments.length == 1) {
                if (segments[0].covered) {
                    removedTimelines.push(timeline);
                } else {
                    currentTimelines.push(timeline);
                }
            } else console.error("Unhandled edge case!!", timeline);
        });

        mTimelines = currentTimelines;
        return removedTimelines.map(timeline => timeline.id);
    }

    function pointsUpdated(lines) {
        lines.forEach(line => {
            let timeline = getTimelineById(line.id);

            let newSegments = line.newSegments;
            let oldSegments = line.oldSegments;

            timeline.linePath.points = PathMath.mergePointSegments(newSegments);

            // update the warp points
            let newLength = PathMath.getPathLength(PathMath.mergePointSegments(newSegments));
            let oldLength = PathMath.getPathLength(PathMath.mergePointSegments(oldSegments));
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
        })
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

    function createAndAddBindingRow(linePercent, timeBinding) {
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
        let timeCell = new DataStructs.DataCell(DataTypes.TIME_BINDING, timeBinding, timeColId)
        newRow.dataCells.push(timeCell);

        for (let i = i; i < mDataTables[0].dataColumns.length; i++) {
            let colId = mDataTables[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        return new DataStructs.WarpBinding(mDataTables[0].id, newRow.id, linePercent, true);
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

    function updateWarpBinding(timelineId, warpBinding) {
        console.log("Finish me!")
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

    function mapTimeToLinePercent(timelineId, type, val) {
        let { max, min, warpBindingsData, greaterThan, percentBetween } = getMaxMinWarpBindingsCompare(timelineId, type);

        if (warpBindingsData.length == 0) {
            return percentBetween(min, max, val)
        } else {
            if (warpBindingsData[0].linePercent > 0) {
                warpBindingsData.push({ val: min, linePercent: 0 });
            }
            if (warpBindingsData[0].linePercent < 1) {
                warpBindingsData.push({ val: max, linePercent: 1 });
            }

            for (let i = 1; i < warpBindingsData.length; i++) {
                if (greaterThan(val, warpBindingsData[i - 1].val) && greaterThan(warpBindingsData[i].val, val)) {
                    return percentBetween(warpBindingsData[i - 1].val, warpBindingsData[i].val) + warpBindingsData[i - 1].linePercent;
                }
            }

            console.error("Unhandle edge case!", max, min, val);
            return 0;
        }
    }

    function mapLinePercentToTime(timelineId, type, linePercent) {
        let { max, min, warpBindingsData, greaterThan, subtractAFromB, incrementBy } = getMaxMinWarpBindingsCompare(timelineId, type);

        if (warpBindingsData.length == 0) {
            return incrementBy(min, subtractAFromB(min, max) * linePercent);
        } else {
            if (warpBindingsData[0].linePercent > 0) {
                warpBindingsData.push({ val: min, linePercent: 0 });
            }
            if (warpBindingsData[0].linePercent < 1) {
                warpBindingsData.push({ val: max, linePercent: 1 });
            }

            for (let i = 1; i < warpBindingsData.length; i++) {
                if (greaterThan(linePercent, warpBindingsData[i - 1].linePercent) && greaterThan(warpBindingsData[i].linePercent, linePercent)) {
                    return incrementBy(warpBindingsData[i - 1].val, subtractAFromB(warpBindingsData[i].val, warpBindingsData[i - 1].val) * linePercent);
                }
            }

            console.error("Unhandle edge case!", max, min, val);
            return 0;
        }
    }

    function getMaxMinWarpBindingsCompare(timelineId, type) {
        let greaterThan;
        let subtractAFromB;
        let equals;
        let incrementBy;
        let percentBetween;
        if (type == DataTypes.TIME_BINDING) {
            greaterThan = TimeBindingUtil.AGreaterThanB;
            subtractAFromB = TimeBindingUtil.subtractAFromB;
            equals = TimeBindingUtil.AEqualsB;
            incrementBy = TimeBindingUtil.incrementBy;
            percentBetween = TimeBindingUtil.percentBetweenAandB;
        } else if (type == DataTypes.NUM) {
            greaterThan = (a, b) => a > b;
            subtractAFromB = (a, b) => b - a;
            equals = (a, b) => a == b;
            incrementBy = (a, b) => a + b;
            percentBetween = (a, b, v) => (v - a) / (b - a);
        } else { console.error("cannot map type " + type); return 0; }

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
                    // but at least two warp bindings
                    let minTimeDiff = subtractAFromB(warpBindingsData[1].val, warpBindingsData[0].val) * warpBindingsData[0].linePercent / (warpBindingsData[1].linePercent - warpBindingsData[0].linePercent)
                    min = incrementBy(warpBindingsData[0].val, -minTimeDiff);

                    let last = warpBindingsData.length - 1;
                    let maxTimeDiff = subtractAFromB(warpBindingsData[last].val, warpBindingsData[last - 1].val) * (1 - warpBindingsData[last].linePercent) / (warpBindingsData[last].linePercent - warpBindingsData[last - 1].linePercent)
                    max = incrementBy(warpBindingsData[0].val, maxTimeDiff);
                } else {
                    if (type == DataTypes.TIME_BINDING) {
                        console.error("Not enough data to caluclate a time!"); return null;
                    } else if (type == DataTypes.NUM) {
                        if (warpBindingsData.length > 0) {
                            // one warp binding, no values
                            if (warpBindingsData.val < 1) max = 1;
                            if (warpBindingsData.val > 0) min = 0;
                            if (!max) {
                                max = warpBindingsData.val / warpBindingsData.linePercent;
                            } else if (!min) {
                                min = (max - warpBindingsData.val) / (1 - warpBindingsData.linePercent);
                            }
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
                    console.error("Not enough data to caluclate a time!"); return null;
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

        return { max, min, warpBindingsData, greaterThan, percentBetween, subtractAFromB, incrementBy };
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
            .filter(result => result.type == type);
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

    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;

    this.deletePoints = deletePoints;
    this.pointsUpdated = pointsUpdated;

    this.getTimelineById = getTimelineById;
    this.getAllTimelines = () => [...mTimelines];

    this.addTable = addTable;
    this.addTableFromCSV = addTableFromCSV;
    this.getAllTables = () => [...mDataTables];
    this.tableUpdated = tableUpdated;

    this.getTimelinePaths = function () { return mTimelines.map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }) };

    this.addBoundTextRow = addBoundTextRow;
    this.bindCells = bindCells;
    this.getBoundData = getBoundData;

    this.updateAxisDist = updateAxisDist;

    this.updateWarpBinding = updateWarpBinding;
    this.getWarpBindingsData = getWarpBindingsData;

    this.mapLinePercentToTime = mapLinePercentToTime;
    this.hasTimeMapping = hasTimeMapping;

    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

}
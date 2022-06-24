function ModelController() {
    let mTimelines = [];
    let mDataTables = [];

    function newTimeline(points) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = createTimeline(points);

        timeline.warpPoints.push(
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, 0), 0, true, false),
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, 1), 1, false, true));

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
            timeline.warpPoints.forEach(point => {
                let originalLengthAlongLine = point.linePercent * originalLength;
                point.linePercent = (originalLengthAlongLine + diff) / newLength;
            })

            let startPoint = timeline.warpPoints[0].clone();
            startPoint.isStart = false;
            timeline.warpPoints = getUpdatedWarpSet(timeline.id, startPoint);
        } else {
            let conversionRatio = originalLength / newLength;
            timeline.warpPoints.forEach(point => {
                point.linePercent *= conversionRatio;
            })
            let endPoint = timeline.warpPoints[timeline.warpPoints.length - 1].clone();
            endPoint.isEnd = false;
            timeline.warpPoints = getUpdatedWarpSet(timeline.id, endPoint);
        }
    }

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {
        let startTimeline = getTimelineById(timelineIdStart);
        let endTimeline = getTimelineById(timelineIdEnd);

        if (startTimeline.warpPoints[0].timeBinding.type != endTimeline.warpPoints[0].timeBinding.type) {
            console.error("incompatible timeline, display user error message!");
            return [];
        }

        let originalStartLength = PathMath.getPathLength(startTimeline.linePath.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.linePath.points);

        // knock off the end points cuz they're probably pretty close.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.linePath.points.concat(points, endTimeline.linePath.points);
        let newLength = PathMath.getPathLength(newPoints);

        let startStartWarp = startTimeline.warpPoints[0]
        let startEndWarp = startTimeline.warpPoints[startTimeline.warpPoints.length - 1]
        let endStartWarp = endTimeline.warpPoints[0]
        let endEndWarp = endTimeline.warpPoints[endTimeline.warpPoints.length - 1]

        let newTimeline = createTimeline(newPoints);
        newTimeline.cellBindings = DataUtil.getUniqueList(startTimeline.cellBindings.concat(endTimeline.cellBindings), 'cellId');

        mTimelines = mTimelines.filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd);
        mTimelines.push(newTimeline);

        // Update warp point line percents
        // TODO: Merge warp points...
        let conversionRatio = originalStartLength / newLength;
        startTimeline.warpPoints.forEach(point => {
            point.linePercent *= conversionRatio;
        });
        startTimeline.warpPoints[startTimeline.warpPoints.length - 1].isEnd = false;

        let diff = newLength - originalEndLength;
        endTimeline.warpPoints.forEach(point => {
            let originalLengthAlongLine = point.linePercent * originalEndLength;
            point.linePercent = (originalLengthAlongLine + diff) / newLength;
        })
        endTimeline.warpPoints[0].isStart = false;

        newTimeline.warpPoints = startTimeline.warpPoints.concat(endTimeline.warpPoints);

        // Handle timeoverlap
        if (TimeWarpUtil.timeOfAGreaterThanB(startEndWarp, endStartWarp)) {

            let startPoint = new DataStructs.WarpPoint;
            startPoint.isStart = true;
            startPoint.linePercent = 0;
            startPoint.timeBinding = TimeWarpUtil.timeOfAGreaterThanB(startStartWarp, endStartWarp) ? endStartWarp.timeBinding : startStartWarp.timeBinding;

            let endPoint = new DataStructs.WarpPoint;
            endPoint.isEnd = true;
            endPoint.linePercent = 1;
            endPoint.timeBinding = TimeWarpUtil.timeOfAGreaterThanB(startEndWarp, endEndWarp) ? startEndWarp.timeBinding : endEndWarp.timeBinding;

            let allPoints = newTimeline.warpPoints;
            newTimeline.warpPoints = [startPoint, endPoint];
            allPoints.forEach(point => {
                if (point.linePercent > 0 &&
                    point.linePercent < 1 &&
                    TimeWarpUtil.timeOfAGreaterThanB(endPoint, point) &&
                    TimeWarpUtil.timeOfAGreaterThanB(point, startPoint)) {
                    // if it's somewhere in the middle, just throw it in...
                    newTimeline.warpPoints = getUpdatedWarpSet(newTimeline.id, point);
                }
            })
        }

        // TODO: Merge data (I think this is just concat the sets)
        return [timelineIdStart, timelineIdEnd];
    }

    function deletePoints(mask) {
        let currentTimelines = [];
        let removedTimelines = [];
        mTimelines.forEach(timeline => {
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

                    segment.warpPoints = [];

                    for (warpIndex; warpIndex < timeline.warpPoints.length; warpIndex++) {
                        if (timeline.warpPoints[warpIndex].linePercent <= segment.endPercent) {
                            let warpPoint = timeline.warpPoints[warpIndex].clone();
                            warpPoint.linePercent -= segment.startPercent
                            warpPoint.linePercent /= segment.endPercent - segment.startPercent;
                            segment.warpPoints.push(warpPoint);
                        } else {
                            break;
                        }
                    }

                    if (segment.warpPoints.length == 0 || !segment.warpPoints[0].isStart) {
                        if (segment.warpPoints.length > 0 && segment.warpPoints[0].linePercent < 0.001 && !segment.warpPoints[0].isEnd) {
                            segment.warpPoints[0].linePercent = 0;
                            segment.warpPoints[0].isStart = true;
                        } else {
                            let startPoint = new DataStructs.WarpPoint()
                            startPoint.linePercent = 0;
                            startPoint.timeBinding = getTimeForTimelineLinePercent(timeline, segment.startPercent);
                            startPoint.isStart = true;
                            segment.warpPoints.unshift(startPoint);
                        }
                    }

                    let lastWarpPoint = segment.warpPoints.length - 1;
                    if (lastWarpPoint == 0 || !segment.warpPoints[lastWarpPoint].isEnd) {
                        if (lastWarpPoint > 0 && segment.warpPoints[lastWarpPoint].linePercent > 0.990) {
                            segment.warpPoints[lastWarpPoint].linePercent = 1;
                            segment.warpPoints[lastWarpPoint].isEnd = true;
                        } else if (i == segments.length - 1) {
                            // If we're the last segment we should have the last warp point. 
                            // We might not have claimed it already because the total lengths of
                            // all the segments will likely not quite add up to 1  
                            segment.warpPoints.push(timeline.warpPoints[timeline.warpPoints.length - 1]);
                        } else {
                            let endPoint = new DataStructs.WarpPoint()
                            endPoint.linePercent = 1;
                            endPoint.timeBinding = getTimeForTimelineLinePercent(timeline, segment.endPercent);
                            endPoint.isEnd = true;
                            segment.warpPoints.push(endPoint);
                        }
                    }

                    if (!segment.covered) {
                        // TODO: Fix this
                        let newTimeline = createTimeline(segment.points);
                        newTimeline.warpPoints = segment.warpPoints;

                        // TODO only keep bindings sitting in this segment?
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

                timeline.warpPoints
                    .filter(warpPoint =>
                        warpPoint.linePercent >= oldStartPercent &&
                        warpPoint.linePercent <= oldEndPercent)
                    .forEach(warpPoint => {
                        warpPoint.linePercent = (((warpPoint.linePercent - oldStartPercent) / oldInterval) * newInterval) + newStartPercent;
                    })
            }
        })
    }

    function getUpdatedWarpSet(timelineId, modifiedWarpPoint) {
        let timeline = getTimelineById(timelineId);

        if (!timeline) { console.error("Invalid timeline id!", timelineId); return [] };

        let warpPoints = timeline.warpPoints;

        // validate the warp point;
        if (modifiedWarpPoint.linePercent < 0) { console.error("Invalid warp point!", modifiedWarpPoint); return warpPoints };
        if (modifiedWarpPoint.linePercent > 1) { console.error("Invalid warp point!", modifiedWarpPoint); return warpPoints };
        if (modifiedWarpPoint.linePercent == 0 && !modifiedWarpPoint.isStart) { console.error("Invalid warp point!", modifiedWarpPoint); return warpPoints };
        if (modifiedWarpPoint.linePercent == 1 && !modifiedWarpPoint.isEnd) { console.error("Invalid warp point!", modifiedWarpPoint); return warpPoints };

        let newWarpPoints = [];
        if (modifiedWarpPoint.isStart) {
            newWarpPoints.push(modifiedWarpPoint);
            warpPoints.forEach(point => {
                if (!point.isStart && TimeWarpUtil.timeOfAGreaterThanB(point, modifiedWarpPoint)) {
                    newWarpPoints.push(point);
                }
            })
        } else if (modifiedWarpPoint.isEnd) {
            warpPoints.forEach(point => {
                if (!point.isEnd && TimeWarpUtil.timeOfAGreaterThanB(modifiedWarpPoint, point)) {
                    newWarpPoints.push(point);
                }
            })
            newWarpPoints.push(modifiedWarpPoint);
        } else {
            let addedPoint = false;
            warpPoints.forEach(point => {
                if (point.id != modifiedWarpPoint.id) {
                    if (!addedPoint && point.linePercent > modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(modifiedWarpPoint);
                        addedPoint = true;
                    }

                    if (TimeWarpUtil.timeOfAGreaterThanB(modifiedWarpPoint, point) && modifiedWarpPoint.linePercent > point.linePercent) {
                        newWarpPoints.push(point);
                    } else if (TimeWarpUtil.timeOfAGreaterThanB(point, modifiedWarpPoint) && point.linePercent > modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(point);
                    }
                }
            })

            if (!addedPoint) newWarpPoints.push(modifiedWarpPoint);
            if (!warpPoints[0].isStart || !warpPoints[warpPoints.length - 1].isEnd) { console.error("Unhandled edge case!!", warpPoints, modifiedWarpPoint); return warpPoints; }
        }

        if (!newWarpPoints[0].isStart) {
            let totalTime = TimeWarpUtil.timeBetweenAandB(newWarpPoints[newWarpPoints.length - 1], newWarpPoints[0]);
            let linePercent = newWarpPoints[0].linePercent;
            let timeToEnd = (linePercent * totalTime) / (1 - linePercent)
            newWarpPoints.unshift(TimeWarpUtil.incrementBy(
                new DataStructs.WarpPoint(newWarpPoints[0].timeBinding.clone(), 0, true, false), -timeToEnd));
        }

        if (!newWarpPoints[newWarpPoints.length - 1].isEnd) {
            let totalTime = TimeWarpUtil.timeBetweenAandB(newWarpPoints[newWarpPoints.length - 1], newWarpPoints[0]);
            let linePercent = newWarpPoints[newWarpPoints.length - 1].linePercent;
            let timeToEnd = (1 - linePercent) * totalTime / linePercent;
            newWarpPoints.push(TimeWarpUtil.incrementBy(
                new DataStructs.WarpPoint(newWarpPoints[newWarpPoints.length - 1].timeBinding.clone(), 1, false, true), timeToEnd));
        }

        return newWarpPoints;
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
        let timeCell = new DataStructs.DataCell(DataTypes.TIME_BINDING, timeBinding, timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mDataTables[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId, { x: 10, y: 10 })
        newRow.dataCells.push(textCell);

        let newBinding = new DataStructs.CellBinding(mDataTables[0].id, newRow.id, nextColId, textCell.id);
        getTimelineById(timelineId).cellBindings.push(newBinding);
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
                    axis.dist1 = 1;
                    axis.dist2 = 10;
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
                let tableId = binding.tableId;
                let table = getTableById(tableId);
                let columnId = binding.columnId;
                let timeColId = table.dataColumns.find(col => col.index == 0).id;
                let row = table.getRow(binding.rowId);
                let cell = row.getCell(binding.columnId);
                let timeCell = row.getCell(timeColId);

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
                            linePercent = mapTimeBindingToLinePercent(timeline.id, timeCell.getValue());
                        } else if (timeType == DataTypes.NUM) {
                            linePercent = mapTimeBindingToLinePercent(timeline.id, new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, timeCell.getValue()));
                        } else {
                            linePercent = 0;
                        }
                    }
                }

                data.push({
                    id: cell.id,
                    type: cell.getType(),
                    line: timeline.linePath.points,
                    linePercent,
                    val: cell.getValue(),
                    offset: cell.offset,
                    axis: timeline.axisBindings.find(a => a.columnId == columnId)
                });

            })
        })

        return data;
    }

    function getWarpBindings(timelineId, type) {
        return getTimelineById(timelineId).warpBindings
            .filter(b => b.isValid)
            .map(b => getTableRow(b.tableId, b.rowId).getCell(getTimeColumn(b.tableId).id))
            .filter(cell => cell.getType() == type);
    }

    function getTableRow(tableId, rowId) {
        return getTableById(tableId).getRow(rowId);
    }

    function getTimeColumn(tableId) {
        return getTableById(tableId).dataColumns.find(col => col.index == 0);
    }

    function mapTimeBindingToLinePercent(timelineId, timeBinding) {
        let numWarpBindings = getWarpBindings(timelineId, DataTypes.NUM);
        let timeWarpBindings = getWarpBindings(timelineId, DataTypes.TIME_BINDING);
        console.log("Finish me!");
        return 0.5;
    }

    function mapLinePercentToTimeBinding(timelineId, percent) {
        console.log("Finish me!");
        return new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, 0.5);
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

    this.mapLinePercentToTimeBinding = mapLinePercentToTimeBinding;

    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

}
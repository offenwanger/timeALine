function ModelController() {
    let mAnnotationsTable = new DataStructs.DataTable([
        new DataStructs.DataColumn("time", 0),
        new DataStructs.DataColumn("text", 1)
    ]);
    let mTimelines = [];
    let mDataTables = [];

    function newTable(array2d) {
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

        // attach the annotation dataset
        timeline.annotationDataset.table = mAnnotationsTable.id;
        timeline.annotationDataset.timeCol = mAnnotationsTable.dataColumns[0].id;
        timeline.annotationDataset.valCol = mAnnotationsTable.dataColumns[1].id;

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
        newTimeline.annotationDataset = mergeDataset(startTimeline.annotationDataset, endTimeline.annotationDataset);

        mTimelines = mTimelines.filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd);
        mTimelines.push(newTimeline);

        // Update warp point line percents
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

    function mergeDataset(dataset1, dataset2) {
        // TODO: Think this through, do the tables and columns need to be the same?
        if (dataset1.table != dataset2.table) throw Error("Incompatible sets, different tables");
        if (dataset1.timeCol != dataset2.timeCol) throw Error("Incompatible sets, different time columns");
        if (dataset1.valCol != dataset2.valCol) throw Error("Incompatible sets, different time columns");

        let mergedDataset = new DataStructs.DataSet();
        mergedDataset.table = dataset1.table;
        mergedDataset.timeCol = dataset1.timeCol;
        mergedDataset.valCol = dataset1.valCol;
        mergedDataset.dataRows = [... new Set(dataset1.dataRows.concat(dataset2.dataRows))];
        // TODO: Handle YAxis...

        return mergedDataset;
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
                        segment.annotationIds = [];
                        // Collect all the relevant annotations
                        timeline.annotationDataset.dataRows.forEach(rowId => {
                            let row = mAnnotationsTable.getRow(rowId);
                            let timeBinding = row.getCell(timeline.annotationDataset.timeCol).val;
                            let startTime = segment.warpPoints[0].timeBinding;
                            let endTime = segment.warpPoints[segment.warpPoints.length - 1].timeBinding;

                            if (TimeBindingUtil.AGreaterThanB(timeBinding, startTime) &&
                                TimeBindingUtil.AGreaterThanB(endTime, timeBinding)) {
                                segment.annotationIds.push(row.id);
                            }
                        })
                    }

                    //TODO divide datasets (though I think it's really more copy than divide...)
                    // this.dataSets = [];

                    if (!segment.covered) {
                        let newTimeline = createTimeline(segment.points);
                        newTimeline.warpPoints = segment.warpPoints;

                        newTimeline.annotationDataset = timeline.annotationDataset.clone();
                        newTimeline.annotationDataset.dataRows = segment.annotationIds;

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

    function updateWarpControls(timelineId, newControlSet) {
        getTimelineById(timelineId).warpPoints = newControlSet;
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

    function getTimeForLinePercent(timelineId, percent) {
        return getTimeForTimelineLinePercent(getTimelineById(timelineId), percent);
    }

    function getTimeForTimelineLinePercent(timeline, percent) {
        if (percent < 0) {
            let startTime = timeline.warpPoints[0].timeBinding;
            let minTime = getMinTime(timeline);

            let tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, minTime);
            if (startTime == minTime) {
                tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, timeline.warpPoints[1].timeBinding);
            }

            return TimeBindingUtil.incrementBy(startTime.clone(), percent * tailTimeSpan)

        } else if (percent > 1) {
            let endTime = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding;
            let maxTime = getMaxTime(timeline);

            let tailTimeSpan = TimeBindingUtil.timeBetweenAandB(endTime, maxTime);
            if (endTime == maxTime) {
                tailTimeSpan = TimeBindingUtil.timeBetweenAandB(endTime, timeline.warpPoints[timeline.warpPoints.length - 2].timeBinding);
            }

            return TimeBindingUtil.incrementBy(endTime.clone(), (percent - 1) * tailTimeSpan)
        } else {
            let warpPoints = timeline.warpPoints;
            for (let index = 0; index < warpPoints.length - 1; index++) {
                if (percent <= warpPoints[index + 1].linePercent) {
                    // percent is between this point and this next
                    let percentBetweenPoints = (percent - warpPoints[index].linePercent) / (warpPoints[index + 1].linePercent - warpPoints[index].linePercent);
                    let timeBetweenPoints = TimeWarpUtil.timeBetweenAandB(warpPoints[index], warpPoints[index + 1]);
                    return TimeBindingUtil.incrementBy(warpPoints[index].timeBinding.clone(), percentBetweenPoints * timeBetweenPoints)
                }
            }
        }
    }

    function getTimelineLinePercentForTime(timeline, time) {
        if (TimeBindingUtil.AGreaterThanB(timeline.warpPoints[0].timeBinding, time)) {
            // time is in the tail
            let startTime = timeline.warpPoints[0].timeBinding;
            let minTime = getMinTime(timeline);

            let tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, minTime);
            if (startTime == minTime) {
                tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, timeline.warpPoints[1].timeBinding);
            }

            return 0 - TimeBindingUtil.timeBetweenAandB(timeline.warpPoints[0].timeBinding, time) / tailTimeSpan;
        } else if (TimeBindingUtil.AGreaterThanB(time, timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding)) {
            // time is in the tail
            let endTime = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding; timeline.dataSets.concat([timeline.annotationDataset])
            let maxTime = getMaxTime(timeline);

            let tailTimeSpan = TimeBindingUtil.timeBetweenAandB(endTime, maxTime);
            if (endTime == maxTime) {
                tailTimeSpan = TimeBindingUtil.timeBetweenAandB(endTime, timeline.warpPoints[timeline.warpPoints.length - 2].timeBinding);
            }

            return 1 + (TimeBindingUtil.timeBetweenAandB(timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding, time) / tailTimeSpan);
        } else {
            let warpPoints = timeline.warpPoints;
            for (let index = 0; index < warpPoints.length - 1; index++) {
                if (TimeBindingUtil.AGreaterThanB(warpPoints[index + 1].timeBinding, time)) {
                    // time is between this point and this next
                    let percentBetweenPoints = TimeBindingUtil.timeBetweenAandB(time, warpPoints[index].timeBinding) / TimeWarpUtil.timeBetweenAandB(warpPoints[index + 1], warpPoints[index]);
                    return percentBetweenPoints * (warpPoints[index + 1].linePercent - warpPoints[index].linePercent) + warpPoints[index].linePercent;
                }
            }
        }
    }

    function getMinTime(timeline) {
        let startTime = timeline.warpPoints[0].timeBinding;
        return timeline.dataSets.concat([timeline.annotationDataset])
            .map(dataset => getDataValues(dataset.table, dataset.timeCol, dataset.dataRows))
            .flat()
            .reduce((min, curr) => TimeBindingUtil.ALessThanB(min, curr) ? min : curr, startTime);
    }

    function getMaxTime(timeline) {
        let endTime = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding; timeline.dataSets.concat([timeline.annotationDataset])
        return timeline.dataSets.concat([timeline.annotationDataset])
            .map(dataset => getDataValues(dataset.table, dataset.timeCol, dataset.dataRows))
            .flat()
            .reduce((max, curr) => TimeBindingUtil.AGreaterThanB(max, curr) ? max : curr, endTime);
    }

    function getDataValues(tableId, columnId, rowIds) {
        if (rowIds.length == 0) return [];

        let table = tableId == mAnnotationsTable.id ? mAnnotationsTable : mDataTables.find(table => table.id == tableId);

        if (!table) throw Error("invalid table Id! " + tableId);

        let rows = table.dataRows.filter(row => rowIds.includes(row.id));
        return rows.map(row => {
            let item = row.dataCells.find(item => item.columnId == columnId);
            return item ? item.val : null;
        });
    }

    function addNewAnnotation(text, timeBinding, id) {
        let annotation = new DataStructs.DataRow();

        let timeBindingItem = new DataStructs.DataCell(DataTypes.TIME_BINDING, timeBinding)
        annotation.dataCells.push(timeBindingItem);

        let textItem = new DataStructs.DataCell(DataTypes.TEXT, text, null, { x: 10, y: 10 })
        annotation.dataCells.push(textItem);

        // set the columns and the index
        annotation.index = mAnnotationsTable.dataRows.length;
        annotation.dataCells.find(item => item.type == DataTypes.TIME_BINDING).columnId = mAnnotationsTable.dataColumns[0].id;
        annotation.dataCells.find(item => item.type == DataTypes.TEXT).columnId = mAnnotationsTable.dataColumns[1].id;
        // add to the table
        mAnnotationsTable.dataRows.push(annotation);

        let timeline = getTimelineById(id);
        timeline.annotationDataset.dataRows.push(annotation.id);
    }

    function getAnnotations() {
        let annotationData = []
        mTimelines.forEach(timeline => {
            timeline.annotationDataset.dataRows.forEach(rowId => {
                let row = mAnnotationsTable.getRow(rowId);
                let textCell = row.getCell(timeline.annotationDataset.valCol);
                let timeCell = row.getCell(timeline.annotationDataset.timeCol);
                let percent = getTimelineLinePercentForTime(timeline, timeCell.val);
                let position = PathMath.getPositionForPercent(timeline.linePath.points, percent);

                annotationData.push({
                    position,
                    text: textCell.val,
                    offset: textCell.offset,
                    id: row.id
                })
            })
        })

        return annotationData;
    }


    function updateAnnotationText(annotationId, text) {
        let annotation = mAnnotationsTable.getRow(annotationId);
        // TODO make this more robust, i.e. keep track of which column is the text column
        // for now, just find the first text column
        let textCell = annotation.dataCells.find(item => item.type == DataTypes.TEXT);
        textCell.val = text;
    }

    function updateAnnotationTextOffset(annotationId, offset) {
        let annotation = mAnnotationsTable.getRow(annotationId);
        // TODO make this more robust, i.e. keep track of which column is the text column
        // for now, just find the first text column
        let textCell = annotation.dataCells.find(item => item.type == DataTypes.TEXT);
        textCell.offset = offset;
    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    function tableUpdated(table) {
        let index = mDataTables.findIndex(t => t.id == table.id);
        mDataTables[index] = table;
    }

    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;

    this.deletePoints = deletePoints;
    this.pointsUpdated = pointsUpdated;

    this.updateWarpControls = updateWarpControls;
    this.getTimelineById = getTimelineById;
    this.getAllTimelines = () => [...mTimelines];

    this.newTable = newTable;
    this.getAllTables = () => [mAnnotationsTable, ...mDataTables];
    this.tableUpdated = tableUpdated;

    this.getUpdatedWarpSet = getUpdatedWarpSet;
    this.getTimeForLinePercent = getTimeForLinePercent;

    this.addNewAnnotation = addNewAnnotation;
    this.getAnnotations = getAnnotations;
    this.updateAnnotationText = updateAnnotationText;
    this.updateAnnotationTextOffset = updateAnnotationTextOffset;

    this.getTimelinePaths = function () { return mTimelines.map(timeline => { return { id: timeline.id, points: timeline.linePath.points } }) };
}
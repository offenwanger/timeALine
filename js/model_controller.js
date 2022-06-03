function ModelController() {
    let mAnnotationsDataset = new DataStructs.DataSet();
    let mTimelines = [];
    let mDataTables = [];

    function newDataset(array2d) {
        let table = new DataStructs.DataTable();
        array2d.forEach((row, index) => {
            let dataRow = new DataStructs.DataRow();
            row.forEach(item => {
                if (!item) {
                    dataRow.dataItems.push(null);
                } else {
                    let item;
                    if (!isNaN(Date.parse(item))) {
                        item = new DataStructs.DataItem(DataStructs.DataTypes.TIME_BINDING, index, Date.parse(item));
                    } else if (!isNaN(parseFloat(item))) {
                        item = new DataStructs.DataItem(DataStructs.DataTypes.NUM, index, parseFloat(item));
                    } else {
                        item = new DataStructs.DataItem(DataStructs.DataTypes.TEXT, index, item);
                    }
                    dataRow.dataItems.push(item);
                }
            });
            table.dataRows.push(dataRow)
        });
    }

    function newTimeline(points) {
        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = new DataStructs.Timeline();
        timeline.linePath.points = points;

        let startPoint = new DataStructs.WarpPoint();
        startPoint.linePercent = 0;
        startPoint.timePoint = 0;
        startPoint.isStart = true;
        let endPoint = new DataStructs.WarpPoint();
        endPoint.linePercent = 1;
        endPoint.timePoint = 1;
        endPoint.isEnd = true;
        timeline.warpPoints.push(startPoint, endPoint)

        mTimelines.push(timeline);

        return timeline;
    }

    function getUpdatedWarpSet(timelineId, modifiedWarpPoint) {
        let warpPoints = getTimelineById(timelineId).warpPoints;
        let newWarpPoints = [];
        if (modifiedWarpPoint.isStart) {
            newWarpPoints.push(modifiedWarpPoint);
            warpPoints.forEach(point => {
                if (!point.isStart && point.timePoint > modifiedWarpPoint.timePoint) {
                    warpPoints.push(point);
                }
            })
            if (!warpPoints[warpPoints.length - 1].isEnd) { console.error("Unhandled edge case!!", warpPoints, modifiedWarpPoint); return warpPoints; }
        } else if (modifiedWarpPoint.isEnd) {
            warpPoints.forEach(point => {
                if (!point.isEnd && point.timePoint < modifiedWarpPoint.timePoint) {
                    warpPoints.push(point);
                }
            })
            newWarpPoints.push(modifiedWarpPoint);

            if (!warpPoints[0].isStart) { console.error("Unhandled edge case!!", warpPoints, modifiedWarpPoint); return warpPoints; }
        } else {
            let addedPoint = false;
            warpPoints.forEach(point => {
                if (point.id != modifiedWarpPoint.id) {
                    if (!addedPoint && point.linePercent > modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(modifiedWarpPoint);
                    }

                    if (point.timePoint < modifiedWarpPoint.timePoint && point.linePercent < modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(point);
                    } else if (point.timePoint > modifiedWarpPoint.timePoint && point.linePercent > modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(point);
                    }
                }
            })

            if (!warpPoints[0].isStart || !warpPoints[warpPoints.length - 1].isEnd) { console.error("Unhandled edge case!!", warpPoints, modifiedWarpPoint); return warpPoints; }
        }

        return newWarpPoints;
    }

    function getTimeForLinePercent(timelineId, percent) {
        let timeline = getTimelineById(timelineId);
        if (percent < 0) {
            let minTime = Math.min(...timeline.datasets.map(dataset => dataset.data.map(item => item.time)).flat().map(time => time.timestamp));
            let startTime = timeline.warpPoints[0].timePoint;
            if (minTime > startTime) {
                minTime = startTime - (timeline.warpPoints[1].timePoint - startTime)
            }

            let tailTimeSpan = startTime - minTime;
            return startTime - (Math.abs(percent) * tailTimeSpan)

        } else if (percent > 1) {
            let maxTime = Math.max(...timeline.datasets.map(dataset => dataset.data.map(item => item.time)).flat().map(time => time.timestamp));
            let endTime = timeline.warpPoints[timeline.warpPoints.length - 1];
            if (maxTime < endTime) {
                maxTime = endTime + (endTime - timeline.warpPoints[timeline.warpPoints.length - 2].timePoint)
            }

            let tailTimeSpan = maxTime - endTime;
            return endTime + ((percent - 1) * tailTimeSpan);
        } else {
            let warpPoints = timeline.warpPoints;
            for (let index = 0; index < warpPoints.length - 1; index++) {
                if (percent <= warpPoints[index + 1].linePercent) {
                    // percent is between this point and this next
                    let percentBetweenPoints = (percent - warpPoints[index].linePercent) / (warpPoints[index + 1].linePercent - warpPoints[index].linePercent);
                    return percentBetweenPoints * (warpPoints[index + 1].timePoint - warpPoints[index].timePoint) + warpPoints[index].timePoint;
                }
            }
            console.error("Error! Should be unreachable! ", percent, warpPoints)
        }
    }

    function extendTimeline(points, timelineId, extendStart) {

    }

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {

    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    this.newDataset = newDataset;
    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;

    this.getUpdatedWarpSet = getUpdatedWarpSet;
    this.getTimeForLinePercent = getTimeForLinePercent;

    this.getTimelineLinePaths = function () { return mTimelines.map(timeline => timeline.linePath); };
}
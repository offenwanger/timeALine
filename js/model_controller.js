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

        timeline.warpPoints.push(
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(DataStructs.TimeBindingTypes.PLACE_HOLDER, 0), 0, true, false),
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(DataStructs.TimeBindingTypes.PLACE_HOLDER, 1), 1, false, true));

        mTimelines.push(timeline);

        return timeline;
    }

    function extendTimeline(points, timelineId, extendStart) {

    }

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {

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
                if (!point.isStart && point.timeBinding.getSingleTime() > modifiedWarpPoint.timeBinding.getSingleTime()) {
                    newWarpPoints.push(point);
                }
            })
        } else if (modifiedWarpPoint.isEnd) {
            warpPoints.forEach(point => {
                if (!point.isEnd && point.timeBinding.getSingleTime() < modifiedWarpPoint.timeBinding.getSingleTime()) {
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

                    if (point.timeBinding.getSingleTime() < modifiedWarpPoint.timeBinding.getSingleTime() && point.linePercent < modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(point);
                    } else if (point.timeBinding.getSingleTime() > modifiedWarpPoint.timeBinding.getSingleTime() && point.linePercent > modifiedWarpPoint.linePercent) {
                        newWarpPoints.push(point);
                    }
                }
            })

            if (!warpPoints[0].isStart || !warpPoints[warpPoints.length - 1].isEnd) { console.error("Unhandled edge case!!", warpPoints, modifiedWarpPoint); return warpPoints; }
        }

        if (!newWarpPoints[0].isStart) {
            let totalTime = newWarpPoints[newWarpPoints.length - 1].timeBinding.getSingleTime() - newWarpPoints[0].timeBinding.getSingleTime();
            let linePercent = newWarpPoints[0].linePercent;
            let timeToEnd = (linePercent * totalTime) / (1 - linePercent)
            let timeBinding = newWarpPoints[0].timeBinding.clone();
            timeBinding.setTime(newWarpPoints[0].timeBinding.getSingleTime() - timeToEnd)
            newWarpPoints.unshift(new DataStructs.WarpPoint(timeBinding, 0, true, false));
        }

        if (!newWarpPoints[newWarpPoints.length - 1].isEnd) {
            let totalTime = newWarpPoints[newWarpPoints.length - 1].timeBinding.getSingleTime() - newWarpPoints[0].timeBinding.getSingleTime();
            let linePercent = newWarpPoints[newWarpPoints.length - 1].linePercent;
            let timeToEnd = (1 - linePercent) * totalTime / linePercent;
            let timeBinding = newWarpPoints[newWarpPoints.length - 1].timeBinding.clone();
            timeBinding.setTime(newWarpPoints[newWarpPoints.length - 1].timeBinding.getSingleTime() + timeToEnd);
            newWarpPoints.push(new DataStructs.WarpPoint(timeBinding, 1, false, true));
        }

        return newWarpPoints;
    }

    function getTimeForLinePercent(timelineId, percent) {
        let timeline = getTimelineById(timelineId);
        let returnTime;
        let returnType;
        if (percent < 0) {
            let minTime = Math.min(...timeline.dataSets.map(dataset => dataset.data.map(item => item.time)).flat().map(time => time.getSingleTime()));
            let startTime = timeline.warpPoints[0].timeBinding.getSingleTime();
            if (minTime > startTime) {
                minTime = startTime - (timeline.warpPoints[1].timeBinding.getSingleTime() - startTime)
            }

            let tailTimeSpan = startTime - minTime;
            returnTime = startTime - (Math.abs(percent) * tailTimeSpan)
            returnType = timeline.warpPoints[0].timeBinding.type;

        } else if (percent > 1) {
            let maxTime = Math.max(...timeline.dataSets.map(dataset => dataset.data.map(item => item.time)).flat().map(time => time.getSingleTime()));
            let endTime = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding.getSingleTime();
            if (maxTime < endTime) {
                maxTime = endTime + (endTime - timeline.warpPoints[timeline.warpPoints.length - 2].timeBinding.getSingleTime())
            }

            let tailTimeSpan = maxTime - endTime;
            returnTime = endTime + ((percent - 1) * tailTimeSpan);
            returnType = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding.type;
        } else {
            let warpPoints = timeline.warpPoints;
            for (let index = 0; index < warpPoints.length - 1; index++) {
                if (percent <= warpPoints[index + 1].linePercent) {
                    // percent is between this point and this next
                    let percentBetweenPoints = (percent - warpPoints[index].linePercent) / (warpPoints[index + 1].linePercent - warpPoints[index].linePercent);
                    returnTime = percentBetweenPoints * (warpPoints[index + 1].timeBinding.getSingleTime() - warpPoints[index].timeBinding.getSingleTime()) + warpPoints[index].timeBinding.getSingleTime();
                    returnType = warpPoints[index].timeBinding.type;
                    break;
                }
            }
        }

        return new DataStructs.TimeBinding(returnType, returnTime);

    }

    function getTimelineById(id) {
        return mTimelines.find(t => t.id == id);
    }

    this.newDataset = newDataset;
    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;
    this.updateWarpControls = updateWarpControls;
    this.getTimelineById = getTimelineById;

    this.getUpdatedWarpSet = getUpdatedWarpSet;
    this.getTimeForLinePercent = getTimeForLinePercent;

    this.getTimelineLinePaths = function () { return mTimelines.map(timeline => timeline.linePath); };
}
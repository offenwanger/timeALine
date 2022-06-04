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
                        item = new DataStructs.DataItem(DataTypes.TIME_BINDING, index, Date.parse(item));
                    } else if (!isNaN(parseFloat(item))) {
                        item = new DataStructs.DataItem(DataTypes.NUM, index, parseFloat(item));
                    } else {
                        item = new DataStructs.DataItem(DataTypes.TEXT, index, item);
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
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, 0), 0, true, false),
            new DataStructs.WarpPoint(new DataStructs.TimeBinding(TimeBindingTypes.PLACE_HOLDER, 1), 1, false, true));

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

        console.log(newWarpPoints)

        return newWarpPoints;
    }

    function getTimeForLinePercent(timelineId, percent) {
        let timeline = getTimelineById(timelineId);
        if (percent < 0) {
            let startTime = timeline.warpPoints[0].timeBinding;
            let minTime = timeline.dataSets
                .map(dataset => dataset.data.map(item => item.time))
                .flat()
                .reduce((min, curr) => TimeBindingUtil.ALessThanB(min, curr) ? min : curr, startTime);

            let tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, minTime);
            if (startTime == minTime) {
                tailTimeSpan = TimeBindingUtil.timeBetweenAandB(startTime, timeline.warpPoints[1].timeBinding);
            }

            return TimeBindingUtil.incrementBy(startTime.clone(), percent * tailTimeSpan)

        } else if (percent > 1) {
            let endTime = timeline.warpPoints[timeline.warpPoints.length - 1].timeBinding;
            let maxTime = timeline.dataSets
                .map(dataset => dataset.data.map(item => item.time))
                .flat()
                .reduce((max, curr) => TimeBindingUtil.AGreaterThanB(max, curr) ? max : curr, endTime);

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
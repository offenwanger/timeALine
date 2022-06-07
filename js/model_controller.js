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
            let conversionRatio =  originalLength / newLength;
            timeline.warpPoints.forEach(point => {
                point.linePercent *= conversionRatio;
            })
            let endPoint = timeline.warpPoints[timeline.warpPoints.length - 1].clone();
            endPoint.isEnd = false;
            timeline.warpPoints = getUpdatedWarpSet(timeline.id, endPoint);
        }
    }

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {
        console.log("merge me!", points, timelineIdStart, timelineIdEnd)
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

                    // TODO: same for annotations
                    // this.annotationDataset = new DataSet();

                    //TODO divide datasets (though I think it's really more copy than divide...)
                    // this.dataSets = [];

                    if (!segment.covered) {
                        let newTimeline = new DataStructs.Timeline;
                        newTimeline.linePath.points = segment.points;
                        newTimeline.warpPoints = segment.warpPoints;
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

    this.deletePoints = deletePoints;

    this.updateWarpControls = updateWarpControls;
    this.getTimelineById = getTimelineById;
    this.getAllTimelines = () => [...mTimelines];

    this.getUpdatedWarpSet = getUpdatedWarpSet;
    this.getTimeForLinePercent = getTimeForLinePercent;

    this.getTimelineLinePaths = function () { return mTimelines.map(timeline => timeline.linePath); };
}
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

    function extendTimeline(points, timelineId, extendStart) {

    }

    function mergeTimeline(points, timelineIdStart, timelineIdEnd) {

    }

    this.newDataset = newDataset;
    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;

    this.getTimelineLinePaths = function () { return mTimelines.map(timeline => timeline.linePath); };
}
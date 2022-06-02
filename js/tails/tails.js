let loadData;

document.addEventListener('DOMContentLoaded', function (e) {
    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);

    let defs = svg.append("defs");
    let filter = defs.append("filter")
        .attr("id", "pencil");
    filter.append("feTurbulence")
        .attr("baseFrequency", "0.5");
    filter.append("feDisplacementMap")
        .attr("in", "SourceGraphic")
        .attr("scale", "7");

    filter = defs.append("filter")
        .attr("id", "crayon");
    filter.append("feDisplacementMap")
        .attr("in", "SourceGraphic")
        .attr("scale", "2");

    let lineResolution = 20;

    let timelineModels = [];

    let lineDrawer = new TimeLineDrawer(svg);
    lineDrawer.setOnDrawFinished((points, line, touchTarget) => {
        // only allow one line to be drawn for now.
        lineDrawer.setCanDraw(false);

        let newTimelineData = new DataStructures.Timeline(points);
        let newTimelineModel = {
            timelineData: newTimelineData,
            dataTimeRanges: [],
            path: line,
            touchTarget: touchTarget,
            dataManagers: []
        }
        newTimelineModel.startControl = createLineStartControl(newTimelineModel);
        newTimelineModel.endControl = createLineEndControl(newTimelineModel);
        newTimelineModel.ticker = new TimeLineTicker(svg,
            newTimelineData.id,
            newTimelineData.startPoint,
            newTimelineData.timePegs,
            newTimelineData.endPoint,
            newTimelineModel.path);
        newTimelineModel.ticker.setTimePegsUpdatedCallback(function (start, pegs, end) {
            newTimelineModel.timelineData.startPoint.boundTimepoint = start.boundTimepoint;
            newTimelineModel.timelineData.startPoint.labelOffset = start.labelOffset;
            newTimelineModel.timelineData.timePegs = pegs;
            newTimelineModel.timelineData.endPoint.boundTimepoint = end.boundTimepoint;
            newTimelineModel.timelineData.endPoint.labelOffset = end.labelOffset;
            dataUpdated(newTimelineModel);
        })

        // make sure the drawing canvas is under everything else
        lineDrawer.sink()

        bindTouchTargetEvents(touchTarget, newTimelineModel);

        timelineModels.push(newTimelineModel)

        dataUpdated(newTimelineModel)
    });
    lineDrawer.setCanDraw(true);
    lineDrawer.setLineResolution(lineResolution)

    function createLineStartControl(model) {
        let coords = model.timelineData.points[0];
        let controlPoint = svg.append("circle")
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 5.0)
            .attr('cursor', 'pointer')
            .attr('fill', '#b51d1c')
            .attr("stroke", "black")

        let dragMapping;
        let startPoint;
        controlPoint.call(d3.drag()
            .on('start', function (e) {
                startPoint = model.timelineData.points[0];
                endPoint = model.timelineData.points[model.timelineData.points.length - 1];
                dragMapping = PathMath.pointsToPercentDistMapping(model.timelineData.points, startPoint, endPoint);
            })
            .on('drag', function (e) {
                let newStartPoint = { x: e.x, y: e.y }
                let diff = PathMath.subtractPoints(newStartPoint, startPoint);

                // cloning point
                let newEndPoint = Object.assign({}, model.timelineData.points[model.timelineData.points.length - 1]);
                newEndPoint.x += diff.x;
                newEndPoint.y += diff.y;

                controlPoint.attr("cx", newStartPoint.x)
                controlPoint.attr("cy", newStartPoint.y)
                model.endControl.attr("cx", newEndPoint.x)
                model.endControl.attr("cy", newEndPoint.y)

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, newStartPoint, newEndPoint);
                model.path.attr('d', lineDrawer.lineGenerator(newPoints));

                // update the ticks
            })
            .on('end', function (e) {
                let newStartPoint = { x: e.x, y: e.y }
                let newEndPoint = model.timelineData.points[model.timelineData.points.length - 1];
                let diff = PathMath.subtractPoints(newStartPoint, startPoint)

                newEndPoint.x += diff.x;
                newEndPoint.y += diff.y;

                controlPoint.attr("cx", newStartPoint.x)
                controlPoint.attr("cy", newStartPoint.y)
                model.endControl.attr("cx", newEndPoint.x)
                model.endControl.attr("cy", newEndPoint.y)

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, newStartPoint, newEndPoint);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));

        return controlPoint;
    }

    function createLineEndControl(model) {
        let coords = model.timelineData.points[model.timelineData.points.length - 1];
        let controlPoint = svg.append("circle")
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 5.0)
            .attr('cursor', 'pointer')
            .attr('fill', 'steelblue')
            .attr("stroke", "black")

        let dragMapping;
        controlPoint.call(d3.drag()
            .on('start', function (e) {
                let startPoint = model.timelineData.points[0];
                let endPoint = model.timelineData.points[model.timelineData.points.length - 1];
                dragMapping = PathMath.pointsToPercentDistMapping(model.timelineData.points, startPoint, endPoint);
            })
            .on('drag', function (e) {
                controlPoint.attr("cx", e.x)
                controlPoint.attr("cy", e.y)
                let startPoint = model.timelineData.points[0];
                let endPoint = { x: e.x, y: e.y }

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, startPoint, endPoint);
                model.path.attr('d', lineDrawer.lineGenerator(newPoints));
            })
            .on('end', function (e) {
                let startPoint = model.timelineData.points[0];
                let endPoint = { x: e.x, y: e.y }

                let newPoints = PathMath.percentDistMappingToPoints(dragMapping, startPoint, endPoint);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));

        return controlPoint;
    }

    function bindTouchTargetEvents(target, model) {
        let targetPointIndex;
        let targetLength;
        let dragPoints;
        target.call(d3.drag()
            .on('start', (e) => {
                let p = PathMath.getClosestPointOnPath(model.path, { x: e.x, y: e.y });
                // copy the array
                dragPoints = model.timelineData.points.map(point => { return { x: point.x, y: point.y } })
                targetLength = p.percent * model.path.node().getTotalLength();
                if (p.percent < 0.0001) {
                    // set the target for first point on the line that's not the start point
                    targetPointIndex = 1;
                } else if (p.percent > 0.999) {
                    // set the target for the last point on the line that's not the end point
                    targetPointIndex = dragPoints.length - 1;
                } else {
                    targetPointIndex = getInsertIndex(p.percent, model.path)
                    dragPoints.splice(targetPointIndex, 0, { x: p.x, y: p.y });
                    model.path.attr('d', lineDrawer.lineGenerator(dragPoints));
                }
            })
            .on('drag', (e) => {
                dragPoints[targetPointIndex].x += e.dx;
                dragPoints[targetPointIndex].y += e.dy;

                let dx = e.dx;
                let dy = e.dy;

                let touchRange = 100;
                for (let i = 1; i < targetPointIndex; i++) {
                    let dist = targetLength - i * lineResolution;
                    let str = gaussian(Math.max(0, (touchRange - dist) / touchRange));
                    let dxi = dx * str;
                    let dyi = dy * str;

                    dragPoints[i].x += dxi;
                    dragPoints[i].y += dyi;
                }

                for (let i = targetPointIndex + 1; i < dragPoints.length - 1; i++) {
                    let dist = i * lineResolution - targetLength;
                    let str = gaussian(Math.max(0, (touchRange - dist) / touchRange));
                    let dxi = dx * str;
                    let dyi = dy * str;

                    dragPoints[i].x += dxi;
                    dragPoints[i].y += dyi;
                }

                // TODO implement the less stupid algorithm (get points within x distance of the main point)
                model.path.attr('d', lineDrawer.lineGenerator(dragPoints));
            })
            .on('end', (e) => {
                let newPoints = lineDrawer.remapPointsWithResolution(dragPoints, lineResolution);
                newPoints = lineDrawer.remapPointsWithResolution(newPoints, lineResolution);
                model.timelineData.setPoints(newPoints);

                dataUpdated(model);
            }));
    }

    function getInsertIndex(percent, line) {
        // This assumes one point every lineResolution along the path
        let len = line.node().getTotalLength() * percent;
        return Math.floor(len / lineResolution) + 1;
    }

    function dataUpdated(model) {
        model.path.attr('d', lineDrawer.lineGenerator(model.timelineData.points));
        model.touchTarget.attr('d', lineDrawer.lineGenerator(model.timelineData.points));

        // TODO: Handle multiple datasets
        let timeRange = model.dataTimeRanges.length > 0 ? model.dataTimeRanges[0] : [0, 1];

        model.ticker.update(
            model.timelineData.startPoint,
            model.timelineData.timePegs,
            model.timelineData.endPoint,
            model.path,
            timeRange[0],
            timeRange[1]);

        model.dataManagers.forEach(manager => manager.updatePath(model.path));
    }

    function getModelById(id) {
        return timelineModels.find(model => model.timelineData.id == id);
    }

    function gaussian(x) {
        let a = 1;
        let b = 1;
        let c = 1 / 3
        return a * Math.exp(-(x - b) * (x - b) / (2 * c * c));
    }

    loadData = function () {
        FileHandler.getDataFile().then(result => {
            let data = result.data.map(item => { return { time: parseInt(item[0]), val: parseInt(item[1]) } });

            let model = timelineModels[0];

            model.timelineData.dataSets.push(new DataStructures.DataSet(data));

            let timeRange = d3.extent(data.map(item => item.time).filter(item => item));
            model.dataTimeRanges.push(timeRange);

            model.timelineData.timePegs.forEach(peg => {
                let start = model.timelineData.startPoint.boundTimepoint != -1 ? model.timelineData.startPoint.boundTimepoint : 0;
                let end = model.timelineData.endPoint.boundTimepoint != -1 ? model.timelineData.endPoint.boundTimepoint : 1;

                let percent = (peg.boundTimepoint - start) / (end - start)

                peg.boundTimepoint = Math.floor((timeRange[1] - timeRange[0]) * percent + timeRange[0]);
            })
            model.timelineData.startPoint.boundTimepoint = timeRange[0]
            model.timelineData.endPoint.boundTimepoint = timeRange[1]

            data = data.filter(item => !isNaN(item.time && !isNaN(item.val)));

            model.ticker.update(
                model.timelineData.startPoint,
                model.timelineData.timePegs,
                model.timelineData.endPoint,
                model.path,
                timeRange[0],
                timeRange[1]);

            model.dataManagers.push(new TimeLineDataSet(svg, model.timelineData.id, data, model.path, model.ticker))
        });
    }

});
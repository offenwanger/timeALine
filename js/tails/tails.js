document.addEventListener('DOMContentLoaded', function (e) {
    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);

    let lineResolution = 20;

    let timelineData = [];
    let timelineModels = [];

    let lineDrawer = createLineDrawer(svg);
    lineDrawer.setOnDrawFinished((points, line, touchTarget) => {
        // only allow one line to be drawn for now.
        lineDrawer.setCanDraw(false);

        let newTimelineData = new DataStructures.Timeline(points);
        timelineData.push(newTimelineData);
        let newTimelineModel = {
            timelineData: newTimelineData,
            path: line,
            touchTarget: touchTarget,
            tickMarks: [/** bring this code over from the tick marks code */]
        }
        newTimelineModel.startControl = createLineStartControl(newTimelineModel);
        newTimelineModel.endControl = createLineEndControl(newTimelineModel);

        bindTouchTargetEvents(touchTarget, newTimelineModel);

        timelineModels.push(newTimelineModel)
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
        let targetSegmentIndex;
        target.call(d3.drag()
            .on('start', (e) => {
                // add a point at the nearest point clicked
            })
            .on('drag', (e) => {
                // drag that point using the stupid algorithm (careful not to move the endpoints)
                // or implement the less stupid algorithm (get points within x distance of the main point, actually, 
                //   they won't be much different in this system)
            })
            .on('end', (e) => {
                // respace the line points
            }));
    }


    function dataUpdated(model) {
        model.path.attr('d', lineDrawer.lineGenerator(model.timelineData.points));

        // update the ticks
    }

});
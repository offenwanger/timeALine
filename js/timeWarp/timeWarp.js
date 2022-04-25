document.addEventListener('DOMContentLoaded', function (e) {
    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);

    let timelines = [];

    let lineDrawer = createLineDrawer(svg);
    lineDrawer.setOnDrawFinished((points, line, touchTarget) => {
        lineDrawer.setIsDrawing(false);
        let segments = [{
            controlPoint: createControlPoint(points[0]),
            percent: 0,
            timePeg: createTimeEndPeg(0),
            points: points.slice(0, points.length - 1),
        }, {
            controlPoint: createControlPoint(points[points.length - 1]),
            percent: 1,
            timePeg: createTimeEndPeg(1),
            points: [points[points.length - 1]]
        }
        ];

        let lineData = {
            segments,
            line,
            touchTarget,
            timeControl: createTimeControlLine(),
        };

        for (let i = 0; i < segments.length; i++) {
            bindControlPointEvents(segments[i].controlPoint, i, lineData);
        }
        bindTouchTargetEvents(lineData.touchTarget, lineData);

        timelines.push(lineData);
        drawLine(lineData);
    });
    lineDrawer.setIsDrawing(true);

    function drawLine(lineData) {
        let allPoints = lineData.segments.map(segment => segment.points).flat();
        lineData.line.attr('d', lineDrawer.lineGenerator(allPoints));
        lineData.touchTarget.attr('d', lineDrawer.lineGenerator(allPoints));
        lineData.timeControl.attr('d', lineDrawer.lineGenerator(generateSecondaryLinePoints(lineData.line, 20)));

        lineData.segments.forEach(segment => {
            let peg = segment.timePeg;
            if (peg) {
                let percent = peg.datum()
                let coords = PathMath.getPointAtPercentOfPath(lineData.timeControl, percent);
                peg.attr("x", coords.x - peg.attr("width") / 2)
                peg.attr("y", coords.y - peg.attr("height") / 2)
            }
        })
    }

    function generateSecondaryLinePoints(line, dist, dynamicNormals = true) {
        let points = []
        let totalLength = line.node().getTotalLength();
        for (let len = 0; len < totalLength; len += 50) {
            points.push(PathMath.getCoordsForPercentAndDist(line, len / totalLength, dist, dynamicNormals))
        }
        points.push(PathMath.getCoordsForPercentAndDist(line, 1, dist, dynamicNormals))
        return points;
    }


    function createControlPoint(coords) {
        return svg.append("circle")
            .attr('cx', coords.x)
            .attr('cy', coords.y)
            .attr('r', 5.0)
            .attr('cursor', 'pointer')
            .attr('fill', 'steelblue')
            .attr("stroke", "black")
    }

    function bindControlPointEvents(point, index, lineData) {
        let rearMapping = []
        let forwardMapping = []
        point.on("dblclick", (e) => {
            if (index != 0 && index != lineData.segments.length - 1) {
                let segment = lineData.segments.splice(index, 1)[0];
                lineData.segments[index - 1].points = lineData.segments[index - 1].points.concat(segment.points);
                segment.controlPoint.remove();
            }

            for (let i = 0; i < lineData.segments.length; i++) {
                bindControlPointEvents(lineData.segments[i].controlPoint, i, lineData);
            }
        });

        point.on(".drag", null);
        point.call(d3.drag()
            .on('start', function (e) {
                if (index > 0) {
                    let startPoint = {
                        x: parseInt(lineData.segments[index - 1].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index - 1].controlPoint.attr('cy'))
                    }
                    let endPoint = {
                        x: parseInt(lineData.segments[index].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index].controlPoint.attr('cy'))
                    }
                    rearMapping = PathMath.pointsToPercentDistMapping(lineData.segments[index - 1].points, startPoint, endPoint);
                }
                if (index < lineData.segments.length - 1) {
                    let startPoint = {
                        x: parseInt(lineData.segments[index].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index].controlPoint.attr('cy'))
                    }
                    let endPoint = {
                        x: parseInt(lineData.segments[index + 1].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index + 1].controlPoint.attr('cy'))
                    }
                    forwardMapping = PathMath.pointsToPercentDistMapping(lineData.segments[index].points, startPoint, endPoint);
                }
            })
            .on('drag', function (e) {
                point.attr("cx", e.x)
                point.attr("cy", e.y)
                if (index > 0) {
                    let startPoint = {
                        x: parseInt(lineData.segments[index - 1].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index - 1].controlPoint.attr('cy'))
                    }
                    let endPoint = {
                        x: parseInt(lineData.segments[index].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index].controlPoint.attr('cy'))
                    }
                    lineData.segments[index - 1].points = PathMath.percentDistMappingToPoints(rearMapping, startPoint, endPoint);
                }
                if (index < lineData.segments.length - 1) {
                    let startPoint = {
                        x: parseInt(lineData.segments[index].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index].controlPoint.attr('cy'))
                    }
                    let endPoint = {
                        x: parseInt(lineData.segments[index + 1].controlPoint.attr('cx')),
                        y: parseInt(lineData.segments[index + 1].controlPoint.attr('cy'))
                    }
                    lineData.segments[index].points = PathMath.percentDistMappingToPoints(forwardMapping, startPoint, endPoint);
                }

                if (index == lineData.segments.length - 1) {
                    lineData.segments[index].points[0] = { x: e.x, y: e.y };
                }

                drawLine(lineData)
            })
            .on('end', function (e) {
                lineData.segments[index].percent = PathMath.getClosestPointOnPath(lineData.line, { x: e.x, y: e.y }).percent;
            }));

    }

    function bindTouchTargetEvents(target, lineData) {
        target.on("dblclick", (e) => {
            let newPoint = PathMath.getClosestPointOnPath(lineData.line, { x: e.x, y: e.y });
            let index = 0
            for (let i = 0; i < lineData.segments.length - 1; i++) {
                if (newPoint.percent >= lineData.segments[i].percent && newPoint.percent <= lineData.segments[i + 1].percent) {
                    index = i;
                    break;
                }
            }

            let startPercent = lineData.segments[index].percent;
            let endPercent = lineData.segments[index + 1].percent;

            let newSegmentPoints = PathMath.remapLinePointsAroundNewPoint(lineData.line, startPercent, endPercent, newPoint.percent);

            lineData.segments[index].points = newSegmentPoints.before;

            let newSegment = {
                controlPoint: createControlPoint(newSegmentPoints.after[0]),
                percent: newPoint.percent,
                points: newSegmentPoints.after,
            }

            lineData.segments.splice(index + 1, 0, newSegment);

            for (let i = 0; i < lineData.segments.length; i++) {
                bindControlPointEvents(lineData.segments[i].controlPoint, i, lineData);
            }

            drawLine(lineData);
        });

        let targetPointIndex;
        let targetSegmentIndex;
        target.call(d3.drag()
            .on('start', (e) => {
                let newPoint = PathMath.getClosestPointOnPath(lineData.line, { x: e.x, y: e.y });
                for (let i = 0; i < lineData.segments.length - 1; i++) {
                    if (newPoint.percent >= lineData.segments[i].percent && newPoint.percent <= lineData.segments[i + 1].percent) {
                        targetSegmentIndex = i;
                        break;
                    }
                }

                let startPercent = lineData.segments[targetSegmentIndex].percent;
                let endPercent = lineData.segments[targetSegmentIndex + 1].percent;

                let newSegmentPoints = PathMath.remapLinePointsAroundNewPoint(lineData.line, startPercent, endPercent, newPoint.percent);
                lineData.segments[targetSegmentIndex].points = newSegmentPoints.before.concat(newSegmentPoints.after);

                targetPointIndex = newSegmentPoints.before.length;
            })
            .on('drag', (e) => {
                let draggedPoints = lineData.segments[targetSegmentIndex].points;
                draggedPoints[targetPointIndex].x += e.dx;
                draggedPoints[targetPointIndex].y += e.dy;
                for (let i = 1; i < Math.max(targetPointIndex, draggedPoints.length - targetPointIndex); i++) {
                    if (targetPointIndex - i > 0) {
                        let falloff = (targetPointIndex - i) / targetPointIndex
                        draggedPoints[targetPointIndex - i].x += e.dx * falloff;
                        draggedPoints[targetPointIndex - i].y += e.dy * falloff;
                    }
                    if (targetPointIndex + i < draggedPoints.length) {
                        let falloff = ((draggedPoints.length) - (targetPointIndex + i)) / (draggedPoints.length - targetPointIndex);
                        draggedPoints[targetPointIndex + i].x += e.dx * falloff;
                        draggedPoints[targetPointIndex + i].y += e.dy * falloff;
                    }
                }

                drawLine(lineData);
            })
            .on('end', () => { }))
    }

    function createTimeEndPeg(percent) {
        return svg.append("rect")
            .datum(percent)
            .attr('height', 10)
            .attr('width', 6)
            .attr('fill', '#89afcf')
            .attr("stroke", "black")
    }

    function createTimeControlLine() {
        return svg.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#89afcf')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5);
    }
});
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
            timePeg: createTimeEndPeg(0),
            points,
        }, {
            controlPoint: createControlPoint(points[points.length - 1]),
            timePeg: createTimeEndPeg(1),
            points: []
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
            let percent = peg.datum()
            let coords = PathMath.getPointAtPercentOfPath(lineData.timeControl, percent);
            peg.attr("x", coords.x - peg.attr("width") / 2)
            peg.attr("y", coords.y - peg.attr("height") / 2)
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

                drawLine(lineData)
            })
            .on('end', function (e) {

            }));

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
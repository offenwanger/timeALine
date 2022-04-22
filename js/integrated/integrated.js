// let loadData;
// let setNormalsStraight;
// let setNormalsDynamic;


document.addEventListener('DOMContentLoaded', function (e) {
    const DEFAULT = 0;
    const ADD_LINE = 1;
    const ADD_DATA = 2;
    const SET_STRAIGHT = 3;
    const SET_DYNAMIC = 4;

    let mode = DEFAULT;

    let margin = { top: 20, right: 20, bottom: 30, left: 50 };
    let width = window.innerWidth - margin.left - margin.right;
    let height = window.innerHeight - margin.top - margin.bottom;
    let svg = d3.select('#svg_container').append('svg')
        .attr('width', width)
        .attr('height', height);

    let lineDrawer = createLineDrawer(svg);
    lineDrawer.setOnDrawFinished((linePoints, line, lineTouchTarget) => {
        clearMode();
    });


    $("#line-brush").on('click', function() {
        if(mode == ADD_LINE) {
            clearMode();
        } else {
            clearMode();
            lineDrawer.setIsDrawing(true);
            mode = ADD_LINE;
            $("#line-brush > img").css('opacity', 0);
            $('#mode-indicator').show();
            $("#line-brush-indicator").show();
        }
    });

    $("#add-data").on('click', function() {
        if(mode == ADD_DATA) {
            clearMode();
        } else {
            clearMode();
            mode = ADD_DATA;
            $("#add-data > img").css('opacity', 0);
            $('#mode-indicator').show();
            $("#add-data-indicator").show();
        }
    });
    
    $("#straight-normals").on('click', function() {
        if(mode == SET_STRAIGHT) {
            clearMode();
        } else {
            clearMode();
            mode = SET_STRAIGHT;
            $("#straight-normals > img").css('opacity', 0);
            $('#mode-indicator').show();
            $("#straight-normals-indicator").show();
        }
    });
    
    $("#dynamic-normals").on('click', function() {
        if(mode == SET_DYNAMIC) {
            clearMode();
        } else {
            clearMode();
            mode = SET_DYNAMIC;
            $("#dynamic-normals > img").css('opacity', 0);
            $('#mode-indicator').show();
            $("#dynamic-normals-indicator").show();
        }
    });

    function clearMode() {
        if(mode == ADD_LINE) {
            lineDrawer.setIsDrawing(false);
        }

        $(".tool-button > img").css('opacity', '');
        $("#mode-indicator > img").hide();
        $('#mode-indicator').hide();
        mode = DEFAULT;
    }

    $(document).on('mousemove', function (e) {
        $('#mode-indicator').css({
            left: e.pageX,
            top: e.pageY
        });
    });

//     var Gen = d3.line()
//         .x((p) => p.x)
//         .y((p) => p.y)
//         .curve(d3.curveCatmullRom.alpha(0.5));

//     let draggedPoints = [];

//     let zoomValue = 10
//     let xScale = d3.scaleLinear()
//         .rangeRound([0, width])
//         .domain([0, width / zoomValue]);

//     let yScale = d3.scaleLinear()
//         .rangeRound([height, 0])
//         .domain([0, height / zoomValue]);

//     let focus = svg.append('g')
//         .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


//     let warpControl1 = focus.append('circle')
//         .datum(0.25)
//         .attr('r', 3.5)
//         .call(d3.drag()
//             .on('drag', warpControlDragged)
//             .on('end', drawData));
//     let warpControl1Label = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');

//     let warpControl2 = focus.append('circle')
//         .datum(0.75)
//         .attr('r', 3.5)
//         .call(d3.drag()
//             .on('drag', warpControlDragged)
//             .on('end', drawData));
//     let warpControl2Label = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');

//     let startLabel = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');
//     let endLabel = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');

//     let dataAxis1Ctrl1 = focus.append('circle')
//         .datum(3)
//         .attr('r', 3.5)
//         .attr('cursor', 'pointer')
//         .call(d3.drag()
//             .on('drag', dataAxisControlDragged)
//             .on('end', drawData));
//     let dataAxis1Ctrl1Label = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');

//     let dataAxis1Ctrl2 = focus.append('circle')
//         .datum(10)
//         .attr('r', 3.5)
//         .attr('cursor', 'pointer')
//         .call(d3.drag()
//             .on('drag', dataAxisControlDragged)
//             .on('end', drawData));
//     let dataAxis1Ctrl2Label = focus.append('text')
//         .attr('text-anchor', 'left')
//         .style('font-size', '16px');

//     let dataAxis1Line = focus.append('line')
//         .attr('stroke-width', 1.5)
//         .attr('stroke', 'black');

    function drawTimeline() {
        if (draggedPoints.length < 2) return;

        timeline.attr('d', Gen(draggedPoints));
        timelineTarget.attr('d', Gen(draggedPoints));

        // does not require xScaling because we are pulling off the already scaled timeline
        warpControl1
            .attr('cx', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).x; })
            .attr('cy', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).y; });
        warpControl1Label
            .attr('x', warpControl1.attr('cx') + 3)
            .attr('y', warpControl1.attr('cy'));

        warpControl2
            .attr('cx', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).x; })
            .attr('cy', function (d) { return PathMath.getPointAtPercentOfPath(timeline, d).y; });
        warpControl2Label
            .attr('x', warpControl2.attr('cx') + 3)
            .attr('y', warpControl2.attr('cy'));

        startLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 0).y; });
        endLabel
            .attr('x', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).x; })
            .attr('y', function (d) { return PathMath.getPointAtPercentOfPath(timeline, 1).y; });

        let normal = PathMath.getNormalAtPercentOfPath(timeline, 0);
        let origin = { x: draggedPoints[0].x, y: draggedPoints[0].y }
        dataAxis1Ctrl1
            .attr('cx', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).x; })
            .attr('cy', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).y; });
        dataAxis1Ctrl1Label
            .attr('x', parseInt(dataAxis1Ctrl1.attr('cx')) + 3)
            .attr('y', dataAxis1Ctrl1.attr('cy'));

        dataAxis1Ctrl2
            .attr('cx', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).x; })
            .attr('cy', function (d) { return PathMath.getPointAtDistanceAlongNormal(d * zoomValue, normal, origin).y; });
        dataAxis1Ctrl2Label
            .attr('x', parseInt(dataAxis1Ctrl2.attr('cx')) + 3)
            .attr('y', dataAxis1Ctrl2.attr('cy'));

        // does not need scaling because we are pulling off the already scaled control points.
        dataAxis1Line
            .attr('x1', dataAxis1Ctrl1.attr('cx'))
            .attr('y1', dataAxis1Ctrl1.attr('cy'))
            .attr('x2', dataAxis1Ctrl2.attr('cx'))
            .attr('y2', dataAxis1Ctrl2.attr('cy'));

        drawAnnotations();

    }
//     drawTimeline();

//     function drawData() {
//         let warpPoints = [
//             { from: 0.25, to: warpControl1.datum() },
//             { from: 0.75, to: warpControl2.datum() }
//         ]
//         focus.selectAll('.dataPoint')
//             .attr('cx', function (d) {
//                 let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
//                 let convertedPercent = PathMath.warpPercent(warpPoints, d[0]);
//                 let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist, normalsSetting == DYNAMIC);
//                 return coords.x;
//             })
//             .attr('cy', function (d) {
//                 let dist = PathMath.getDistForAxisPercent(d[1], dataAxis1Ctrl2.datum(), dataAxis1Ctrl1.datum());
//                 let convertedPercent = PathMath.warpPercent(warpPoints, d[0]);
//                 let coords = PathMath.getCoordsForPercentAndDist(timeline, convertedPercent, zoomValue * dist, normalsSetting == DYNAMIC);
//                 return coords.y;
//             });
//     }

//     function dataAxisControlDragged(event) {
//         if (draggedPoints.length < 2) return;
//         // needs to be in model coords
//         let dragPoint = { x: event.x, y: event.y };

//         let origin = { x: draggedPoints[0].x, y: draggedPoints[0].y }
//         let normalVector = PathMath.getNormalAtPercentOfPath(timeline, 0)

//         let newPosition = PathMath.projectPointOntoNormal(dragPoint, normalVector, origin);
//         let dist = PathMath.distancebetween(origin, newPosition.point) / zoomValue;

//         d3.select(this).datum(newPosition.neg ? -1 * dist : dist);
//         drawTimeline();
//     }

//     function warpControlDragged(event) {
//         let dragPoint = { x: event.x, y: event.y };
//         let p = PathMath.getClosestPointOnPath(timeline, dragPoint);
//         d3.select(this).datum(p.percent);
//         drawTimeline();
//     }

//     let targetIndex;
//     function timelineDragStart(e) {
//         let mouseCoords = { x: e.x, y: e.y }
//         let closetDist = Number.MAX_VALUE;
//         for (let i = 0; i < draggedPoints.length; i++) {
//             let dist = PathMath.distancebetween(mouseCoords, draggedPoints[i]);
//             if (dist < closetDist) {
//                 closetDist = dist;
//                 targetIndex = i;
//             }
//         }

//         let p = PathMath.getClosestPointOnPath(timeline, { x: e.x, y: e.y });
//         if (PathMath.distancebetween(p, draggedPoints[targetIndex]) > 50) {
//             // add a new point

//             // figure out if the point should go before or after targetIndex
//             let insertIndex = targetIndex + 1;
//             if (p.percent < PathMath.getClosestPointOnPath(timeline, draggedPoints[targetIndex]).percent) {
//                 insertIndex--;
//             }


//             draggedPoints.splice(insertIndex, 0, p)

//             targetIndex = insertIndex
//         }
//     }

//     function timelineDragged(e) {
//         draggedPoints[targetIndex].x += e.dx;
//         draggedPoints[targetIndex].y += e.dy;
//         let dx = e.dx;
//         let dy = e.dy;
//         for (let i = 1; i < Math.max(targetIndex, draggedPoints.length - targetIndex); i++) {
//             dx /= 2;
//             dy /= 2;
//             if (targetIndex - i > 0) {
//                 draggedPoints[targetIndex - i].x += dx;
//                 draggedPoints[targetIndex - i].y += dy;
//             }
//             if (targetIndex + i < draggedPoints.length) {
//                 draggedPoints[targetIndex + i].x += dx;
//                 draggedPoints[targetIndex + i].y += dy;
//             }
//         }

//         drawTimeline()
//     }

//     function timelineDragEnd(e) {
//         drawData();
//     }

//     loadData = function () {
//         FileHandler.getDataFile().then(result => {
//             let data = result.data.map(item => [parseInt(item[0]), parseInt(item[1])])

//             let timeLineRange = d3.extent(data.map(item => item[0]).filter(item => item));
//             let dataDimention1Range = d3.extent(data.map(item => item[1]).filter(item => item));

//             data = data.map(item => {
//                 let percent0 = (item[0] - timeLineRange[0]) / (timeLineRange[1] - timeLineRange[0])
//                 let percent1 = (item[1] - dataDimention1Range[0]) / (dataDimention1Range[1] - dataDimention1Range[0])
//                 return [percent0, percent1];
//             })

//             data = data.filter(item => !isNaN(item[0] && !isNaN(item[1])));

//             warpControl1Label.text(new Date((timeLineRange[1] - timeLineRange[0]) * 0.25 + timeLineRange[0]).toDateString()).lower();
//             warpControl2Label.text(new Date((timeLineRange[1] - timeLineRange[0]) * 0.75 + timeLineRange[0]).toDateString()).lower();
//             startLabel.text(new Date(timeLineRange[0]).toDateString()).lower();
//             endLabel.text(new Date(timeLineRange[1]).toDateString()).lower();

//             dataAxis1Ctrl1Label.text(dataDimention1Range[0]).lower();
//             dataAxis1Ctrl2Label.text(dataDimention1Range[1]).lower();

//             drawTimeline();

//             focus.selectAll('.dataPoint')
//                 .data(data)
//                 .enter()
//                 .append('circle')
//                 .classed('dataPoint', true)
//                 .attr('r', 3.0)
//                 .attr('fill', 'red')
//                 .attr('stroke', 'black')
//                 .lower();

//             drawData();
//         });
//     }

//     setNormalsStraight = function () {
//         normalsSetting = STRAIGHT;
//         drawData();
//     }

//     setNormalsDynamic = function () {
//         normalsSetting = DYNAMIC;
//         drawData();
//     }

//     let annotationGroup = focus.append("g");
//     const makeAnnotations = d3.annotation()
//         .accessors({
//             x: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).x,
//             y: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).y,
//         });

//     let annotationId = 0;
//     let timelineAnnotations = []
//     function addAnnotationToTimeline(e) {
//         let p = PathMath.getClosestPointOnPath(timeline, { x: e.x, y: e.y });

//         let annotationData = {
//             note: {
//                 label: "<text>",
//                 wrap: 200,
//                 padding: 10
//             },
//             data: { percent: p.percent },
//             // hack to get around the broken drag events from the new d3 version
//             className: "id-" + annotationId,

//             dy: 100,
//             dx: 100,
//         }

//         annotationId++

//         timelineAnnotations.push(annotationData);

//         drawAnnotations();

//         d3.selectAll(".annotation")
//             .on(".drag", null)
//             .call(d3.drag()
//                 .on('drag', function (e) {
//                     let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
//                     let annotation = timelineAnnotations.find(annotation => annotation.className == id);
//                     annotation.dx += e.dx;
//                     annotation.dy += e.dy;
//                     drawAnnotations();
//                 }))
//             .on('dblclick', function () {
//                 let position = d3.select(this).select("tspan").node().getBoundingClientRect();
//                 let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
//                 let annotation = timelineAnnotations.find(annotation => annotation.className == id);
//                 let inputbox = d3.select("#input-box");

//                 inputbox
//                     .style("top", Math.floor(position.y - 8) + "px")
//                     .style("left", Math.floor(position.x - 8) + "px")
//                     .attr("height", inputbox.property("scrollHeight"))
//                     .on('input', null)
//                     .on('input', function (e) {
//                         annotation.note.label = inputbox.property("value");
//                         inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
//                         drawAnnotations();
//                     }).on('change', function (e) {
//                         inputbox
//                             .style("top",  "-200px")
//                             .style("left", "-100px")
//                     });

//                 inputbox.property("value", annotation.note.label);
//                 inputbox.style("height", inputbox.property("scrollHeight") + "px");
//                 inputbox.style("width", annotation.note.wrap + "px");

//                 inputbox.node().focus();
//             });
//     }

//     function drawAnnotations() {
//         makeAnnotations.annotations(timelineAnnotations);
//         annotationGroup.call(makeAnnotations);
//     }


});



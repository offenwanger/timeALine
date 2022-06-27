function DataViewController(svg) {
    let dataPointDisplayGroup = svg.append('g')
        .attr("id", 'data-point-display-g');

    let mAnnotationController = new AnnotationController(svg);
    let mPointController = new DataPointController(svg);

    function drawData(boundData) {
        mAnnotationController.drawAnnotations(boundData.filter(b => b.type == DataTypes.TEXT));
        mPointController.drawPoints(boundData.filter(b => b.type == DataTypes.NUM))
        mPointController.drawAxes(DataUtil.getUniqueList(boundData.filter(d => d.axis).map(d => { return { id: d.axis.id, line: d.line, axis: d.axis } }), 'id'))
    }

    this.drawData = drawData;
    this.setTextUpdatedCallback = (callback) => mAnnotationController.setAnnotationTextUpdatedCallback(callback);
    this.setTextMovedCallback = (callback) => mAnnotationController.setAnnotationMovedCallback(callback);
    this.setAxisUpdatedCallback = (callback) => mPointController.setAxisUpdatedCallback(callback);
}

function DataPointController(svg) {
    const TAIL_POINT_COUNT = 20;

    let mAxisUpdatedCallback = () => { };

    let mDataPointGroup = svg.append('g')
        .attr("id", 'data-point-display-g');
    let mAxisGroup = svg.append('g')
        .attr("id", 'data-axis-display-g');

    function drawPoints(boundData) {
        let drawingData = []
        let tail1Data = []
        let tail2Data = []

        boundData.forEach(point => {
            let { val1, val2, dist1, dist2 } = point.axis;
            let dist = (dist2 - dist1) * (point.val - val1) / (val2 - val1) + dist1;
            let pos = PathMath.getPositionForPercentAndDist(point.line, point.linePercent, dist);

            let data = { id: point.id, x: pos.x, y: pos.y, opacity: 1, color: "red" };

            if (point.linePercent < 0) {
                tail1Data.push(data);
            } else if (point.linePercent > 1) {
                tail2Data.push(data);
            } else {
                drawingData.push(data)
            }
        });

        function filterAndFade(arr, count) {
            let n = Math.ceil(arr.length / count);
            let shuffled = arr.sort(function () { return .5 - Math.random() });
            let selected = arr.slice(0, n);
            let fade = 1;
            selected.forEach(pointData => {
                fade -= 1 / n;
                pointData.opacity = fade;
            })
            return selected;
        }

        drawingData.push(...filterAndFade(tail1Data, TAIL_POINT_COUNT));
        drawingData.push(...filterAndFade(tail2Data, TAIL_POINT_COUNT));

        let points = mDataPointGroup.selectAll('.data-display-point').data(drawingData);
        points.exit().remove();
        points.enter()
            .append('circle')
            .classed('data-display-point', true)
            .attr('r', 3.0)
            .attr('stroke', 'black');

        mDataPointGroup.selectAll('.data-display-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color })
            .style('opacity', function (d) { return d.opacity })
    }

    function drawAxes(axesData) {
        let axisLineData = []
        let axisControlData = []

        axesData.forEach(axisData => {
            let axis = axisData.axis;
            let basePose = PathMath.getPositionForPercent(axisData.line, axis.linePercent);
            let normal = PathMath.getNormalForPercent(axisData.line, axis.linePercent);

            let pos1 = MathUtil.getPointAtDistanceAlongVector(axis.dist1, normal, basePose);
            let pos2 = MathUtil.getPointAtDistanceAlongVector(axis.dist2, normal, basePose);

            axisLineData.push({ axisId: axis.id, x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y });

            axisControlData.push({ axisId: axis.id, ctrl: 1, x: pos1.x, y: pos1.y, val: axis.val1, normal, basePose });
            axisControlData.push({ axisId: axis.id, ctrl: 2, x: pos2.x, y: pos2.y, val: axis.val2, normal, basePose });
        })

        let lines = mAxisGroup.selectAll('.axis-line').data(axisLineData);
        lines.exit().remove();
        lines.enter()
            .append('line')
            .classed("axis-line", true)
            .attr('id', function (d) { return "axis-line_" + d.axisId })
            .attr('stroke-width', 1.5)
            .attr('stroke', 'black');
        mAxisGroup.selectAll('.axis-line')
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y1 })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y2 });

        let controlLabels = mAxisGroup.selectAll('.axis-control-label').data(axisControlData);
        controlLabels.exit().remove();
        controlLabels.enter()
            .append('text')
            .classed('axis-control-label', true)
            .attr('text-anchor', 'left')
            .style('font-size', '16px');

        mAxisGroup.selectAll('.axis-control-label')
            .attr('x', function (d) { return d.x })
            .attr('y', function (d) { return d.y })
            .text(function (d) { return d.val });

        let controls = mAxisGroup.selectAll('.axis-control-circle').data(axisControlData);
        controls.exit().remove();
        controls.enter()
            .append('circle')
            .classed("axis-control-circle", true)
            .attr('r', 3.5)
            .attr('cursor', 'pointer')
            .call(d3.drag()
                .on('drag', axisControlDragged)
                .on('end', axisControlDragEnd));

        mAxisGroup.selectAll('.axis-control-circle')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y });
    }

    function axisControlDragged(event, d) {
        let dragPoint = { x: event.x, y: event.y };

        let normal = d.normal;
        let origin = d.basePose;

        let newPosition = MathUtil.projectPointOntoVector(dragPoint, normal, origin);

        d3.select(this).attr("cx", newPosition.x);
        d3.select(this).attr("cy", newPosition.y);

        let line = mAxisGroup.select("#axis-line_" + d.axisId);
        if (d.ctrl == 1) {
            line.attr('x1', newPosition.x)
                .attr('y1', newPosition.y);
        } else {
            line.attr('x2', newPosition.x)
                .attr('y2', newPosition.y);
        }
    }

    function axisControlDragEnd(event, d) {
        let dragPoint = { x: event.x, y: event.y };

        let normal = d.normal;
        let origin = d.basePose;

        let newPosition = MathUtil.projectPointOntoVector(dragPoint, normal, origin);
        let dist = MathUtil.distanceFromAToB(origin, newPosition);
        dist = newPosition.neg ? -1 * dist : dist;
        mAxisUpdatedCallback(d.axisId, d.ctrl, dist);
    }

    this.drawPoints = drawPoints;
    this.drawAxes = drawAxes;
    this.setAxisUpdatedCallback = (callback) => mAxisUpdatedCallback = callback;
}

function AnnotationController(svg) {
    let mAnnotationTextUpdatedCallback = () => { };
    let mAnnotationMovedCallback = () => { };

    let mAnnotationDisplayGroup = svg.append('g')
        .attr("id", 'annotation-display-g');

    function drawAnnotations(boundData) {
        // convert annotations to annotation data
        let annotationSet = []


        boundData.forEach(binding => {
            let pos = PathMath.getPositionForPercent(binding.line, binding.linePercent);
            let annotationData = {
                note: {
                    label: binding.val,
                    wrap: 200,
                    padding: 10
                },
                x: pos.x,
                y: pos.y,
                // hack to get around the broken drag events from the new d3 version
                className: "id-" + binding.id,

                dy: binding.offset.y,
                dx: binding.offset.x,

                binding
            }

            annotationSet.push(annotationData);
        })

        const makeAnnotations = d3.annotation();
        makeAnnotations.annotations(annotationSet);
        mAnnotationDisplayGroup.call(makeAnnotations);

        d3.selectAll(".annotation")
            .on(".drag", null)
            .call(d3.drag()
                .on('drag', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = annotationSet.find(a => a.className == id);
                    annotation.dx += e.dx;
                    annotation.dy += e.dy;
                    makeAnnotations.annotations(annotationSet);
                    mAnnotationDisplayGroup.call(makeAnnotations);
                })
                .on('end', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = annotationSet.find(a => a.className == id);
                    mAnnotationMovedCallback(annotation.binding.id, { x: annotation.dx, y: annotation.dy });
                }))
            .on('dblclick', function () {
                let position = d3.select(this).select("tspan").node().getBoundingClientRect();
                let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                let annotation = annotationSet.find(a => a.className == id);
                let inputbox = d3.select("#input-box");

                inputbox
                    .style("top", Math.floor(position.y - 8) + "px")
                    .style("left", Math.floor(position.x - 8) + "px")
                    .attr("height", inputbox.property("scrollHeight"))
                    .on('input', null)
                    .on('input', function (e) {
                        annotation.note.label = inputbox.property("value");
                        mAnnotationTextUpdatedCallback(annotation.binding.id, inputbox.property("value"))
                        inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
                        makeAnnotations.annotations(annotationSet);
                        mAnnotationDisplayGroup.call(makeAnnotations);
                    }).on('change', function (e) {
                        inputbox
                            .style("top", "-200px")
                            .style("left", "-100px")
                    });

                inputbox.property("value", annotation.note.label);
                inputbox.style("height", inputbox.property("scrollHeight") + "px");
                inputbox.style("width", annotation.note.wrap + "px");

                inputbox.node().focus();
            });
    }

    this.drawAnnotations = drawAnnotations;
    this.setAnnotationTextUpdatedCallback = (callback) => mAnnotationTextUpdatedCallback = callback
    this.setAnnotationMovedCallback = (callback) => mAnnotationMovedCallback = callback;
}
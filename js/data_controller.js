function DataViewController(svg) {
    let mPointController = new DataPointController(svg);
    mPointController.setPointDragStartCallback((cellBindingData, startPos) => {
        mDataDragStartCallback(cellBindingData, startPos);
    });
    mPointController.setPointDragCallback((cellBindingData, startPos, mousePos) => {
        mDataDragCallback(cellBindingData, startPos, mousePos);
    });
    mPointController.setPointDragEndCallback((cellBindingData, startPos, mousePos) => {
        mDataDragEndCallback(cellBindingData, startPos, mousePos);
    });
    mPointController.setPointMouseOverCallback((cellBindingData, mousePos) => {
        mDataMouseOverCallback(cellBindingData, mousePos);
    });
    mPointController.setPointMouseOutCallback((cellBindingData, mousePos) => {
        mDataMouseOutCallback(cellBindingData, mousePos);
    });

    let mAnnotationController = new AnnotationController(svg);
    mAnnotationController.setAnnotationDragStartCallback((cellBindingData, startPos) => {
        mDataDragStartCallback(cellBindingData, startPos);
    });
    mAnnotationController.setAnnotationDragCallback((cellBindingData, startPos, mousePos) => {
        mDataDragCallback(cellBindingData, startPos, mousePos);
    });
    mAnnotationController.setAnnotationDragEndCallback((cellBindingData, startPos, mousePos) => {
        mDataDragEndCallback(cellBindingData, startPos, mousePos);
    });
    mAnnotationController.setAnnotationMouseOverCallback((cellBindingData, mousePos) => {
        mDataMouseOverCallback(cellBindingData, mousePos);
    });
    mAnnotationController.setAnnotationMouseOutCallback((cellBindingData, mousePos) => {
        mDataMouseOutCallback(cellBindingData, mousePos);
    });

    let mDataDragStartCallback = () => { };
    let mDataDragCallback = () => { };
    let mDataDragEndCallback = () => { };
    let mDataMouseOverCallback = () => { };
    let mDataMouseOutCallback = () => { };

    function drawData(timelines, boundData) {
        mAnnotationController.drawAnnotations(timelines, boundData.filter(b => b.dataCell.getType() == DataTypes.TEXT));
        mPointController.drawPoints(timelines, boundData.filter(b => b.dataCell.getType() == DataTypes.NUM))
        mPointController.drawAxes(DataUtil.getUniqueList(boundData.filter(d => d.axisBinding).map(d => {
            return {
                id: d.axisBinding.id,
                line: timelines.find(t => t.id == d.timelineId).points,
                axis: d.axisBinding
            }
        }), 'id'))
    }

    function drawTimelineData(timeline, boundData) {
        let textData = boundData.filter(b => b.dataCell.getType() == DataTypes.TEXT);
        let numData = boundData.filter(b => b.dataCell.getType() == DataTypes.NUM);

        if (textData.length) {
            mAnnotationController.drawTimelineAnnotations(timeline, textData);
        }

        if (numData.length) {
            // we do not redraw the axis on the assumption that they won't be changing. 
            mPointController.drawTimelinePointSet(timeline, numData);
        }
    }

    this.drawData = drawData;
    this.drawTimelineData = drawTimelineData;
    this.setTextUpdatedCallback = (callback) => mAnnotationController.setAnnotationTextUpdatedCallback(callback);

    this.setDataDragStartCallback = (callback) => mDataDragStartCallback = callback;
    this.setDataDragCallback = (callback) => mDataDragCallback = callback;
    this.setDataDragEndCallback = (callback) => mDataDragEndCallback = callback;
    this.setDataMouseOverCallback = (callback) => { mDataMouseOverCallback = callback; };
    this.setDataMouseOutCallback = (callback) => { mDataMouseOutCallback = callback; };

    this.setAxisUpdatedCallback = (callback) => mPointController.setAxisUpdatedCallback(callback);
}

function DataPointController(svg) {
    const TAIL_POINT_COUNT = 20;

    let mAxisUpdatedCallback = () => { };
    let mPointDragStartCallback = () => { };
    let mPointDragCallback = () => { };
    let mPointDragEndCallback = () => { };
    let mPointMouseOverCallback = () => { };
    let mPointMouseOutCallback = () => { };

    let mDraggingPointBinding = null;
    let mDragStartPos = null;

    let mDataPointGroup = svg.append('g')
        .attr("id", 'data-point-display-g');
    let mAxisGroup = svg.append('g')
        .attr("id", 'data-axis-display-g');

    function drawPoints(timelines, boundData) {
        let drawingData = timelines.map(t => getTimelineDrawingData(t, boundData.filter(b => b.timelineId == t.id))).flat();
        let points = mDataPointGroup.selectAll('.data-display-point').data(drawingData);
        setupCircles(points)
    }

    function drawTimelinePointSet(timeline, boundData) {
        let drawingData = getTimelineDrawingData(timeline, boundData);

        let setsIds = DataUtil.getUniqueList(boundData.map(boundData.columnId));
        setsIds.forEach(setId => {
            let setData = drawingData.filter(drawingData.binding.columnId == setId);
            let points = mDataPointGroup.selectAll('.data-display-point-set_' + setId).data(setData);
            setupCircles(points)
        });
    }

    function setupCircles(selection) {
        selection.exit().remove();
        selection.enter()
            .append('circle')
            .classed('data-display-point', true)
            // ERROR: TODO: Fix this, it's not calling a function here. 
            .classed(d => { return 'data-display-point-set_' + d.binding.columnId; }, true)
            .attr('r', 3.0)
            .attr('stroke', 'black')
            .call(d3.drag()
                .on('start', function (e, d) {
                    mDraggingPointBinding = d.binding;
                    mDragStartPos = { x: e.x, y: e.y };
                    mPointDragStartCallback(mDraggingPointBinding, mDragStartPos);
                })
                .on('drag', function (e) {
                    mPointDragCallback(mDraggingPointBinding, mDragStartPos, { x: e.x, y: e.y });
                })
                .on('end', function (e) {
                    mPointDragEndCallback(mDraggingPointBinding, mDragStartPos, { x: e.x, y: e.y });
                    // cleanup
                    mDraggingPointBinding = null;
                    mDragStartPos = null;
                }))
            .on('mouseover', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mPointMouseOverCallback(d.binding, mouseCoords);
            })
            .on('mouseout', (e, d) => {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mPointMouseOutCallback(d.binding, mouseCoords);
            });

        mDataPointGroup.selectAll('.data-display-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color })
            .style('opacity', function (d) { return d.opacity });
    }

    //// point draw utility ////
    function getTimelineDrawingData(timeline, boundData) {
        let drawingData = boundData.filter(b => b.linePercent >= 0 && b.linePercent <= 1).map(b => getDrawingData(timeline, b));
        let tail1Data = boundData.filter(b => b.linePercent < 0).map(b => getDrawingData(timeline, b));
        let tail2Data = boundData.filter(b => b.linePercent > 1).map(b => getDrawingData(timeline, b));

        drawingData.push(...filterAndFade(tail1Data, TAIL_POINT_COUNT));
        drawingData.push(...filterAndFade(tail2Data, TAIL_POINT_COUNT));

        return drawingData;
    }

    function getDrawingData(timeline, binding) {
        let { val1, val2, dist1, dist2 } = binding.axisBinding;
        if (val1 == val2) throw new Error("Invalid binding values: " + val1 + ", " + val2);

        let dist = (dist2 - dist1) * (binding.dataCell.getValue() - val1) / (val2 - val1) + dist1;
        let pos = PathMath.getPositionForPercentAndDist(timeline.points, binding.linePercent, dist);

        return {
            binding,
            x: pos.x,
            y: pos.y,
            opacity: 1,
            color: "red"
        };
    }

    function filterAndFade(tailArr, count) {
        let n = Math.ceil(tailArr.length / count);
        let shuffled = tailArr.sort(function () { return .5 - Math.random() });
        let selected = shuffled.slice(0, n);
        let fade = 1;
        selected.forEach(pointData => {
            fade -= 1 / n;
            pointData.opacity = fade;
        })
        return selected;
    }
    //// end point draw utility ////

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
    this.drawTimelinePointSet = drawTimelinePointSet;
    this.drawAxes = drawAxes;
    this.setAxisUpdatedCallback = (callback) => mAxisUpdatedCallback = callback;
    this.setPointDragStartCallback = (callback) => mPointDragStartCallback = callback;
    this.setPointDragCallback = (callback) => mPointDragCallback = callback;
    this.setPointDragEndCallback = (callback) => mPointDragEndCallback = callback
    this.setPointMouseOverCallback = (callback) => { mPointMouseOverCallback = callback; };
    this.setPointMouseOutCallback = (callback) => { mPointMouseOutCallback = callback; };
}

function AnnotationController(svg) {
    let mAnnotationDisplayGroup = svg.append('g')
        .attr("id", 'annotation-display-g');

    let mAnnotationTextUpdatedCallback = () => { };

    let mAnnotationDragStartCallback = () => { };
    let mAnnotationDragCallback = () => { };
    let mAnnotationDragEndCallback = () => { };
    let mAnnotationMouseOverCallback = () => { };
    let mAnnotationMouseOutCallback = () => { };

    let mDragStartPos = null;

    let mDataCache = {};

    function drawTimelineAnnotations(timeline, boundData) {
        draw(timeline, boundData);
    }

    function drawAnnotations(timelines, boundData) {
        // clear the cache, redraw
        mDataCache = {};
        if(timelines.length == 0) {
            mAnnotationDisplayGroup.selectAll("*").remove();
        }

        timelines.forEach(timeline => {
            draw(timeline, boundData.filter(binding => binding.timelineId == timeline.id));
        })
    }

    function draw(timeline, boundData) {
        let annotationDataset = [];
        let textWidth = 200;
        let linePadding = 2;

        let timelineChanged = !mDataCache[timeline.id] || mDataCache[timeline.id].points != JSON.stringify(timeline.points);
        if (timelineChanged) {
            // reset the cache for this timeline (or set it in the first place)
            mDataCache[timeline.id] = {
                points: JSON.stringify(timeline.points),
                bindings: {},
                annotationData: {}
            };
        }

        boundData.forEach(binding => {
            let annotationData;
            if (!mDataCache[timeline.id].bindings[binding.cellBindingId] || mDataCache[timeline.id].bindings[binding.cellBindingId] != JSON.stringify(binding)) {
                let pos = PathMath.getPositionForPercent(timeline.points, binding.linePercent);
                let text = binding.dataCell.getValue();
                let offsetX = binding.dataCell.offset.x;
                let offsetY = binding.dataCell.offset.y;
                annotationData = { x: pos.x, y: pos.y, text, offsetX, offsetY, binding };

                mDataCache[timeline.id].bindings[binding.cellBindingId] = JSON.stringify(binding);
                mDataCache[timeline.id].annotationData[binding.cellBindingId] = annotationData;
            } else {
                annotationData = mDataCache[timeline.id].annotationData[binding.cellBindingId]
            }

            annotationDataset.push(annotationData);
        })

        let selection = mAnnotationDisplayGroup.selectAll(".annotation-text_" + timeline.id).data(annotationDataset);
        selection.exit().remove();
        selection.enter().append("text")
            .classed("annotation-text_" + timeline.id, true)

        mAnnotationDisplayGroup.selectAll(".annotation-text_" + timeline.id)
            .attr("x", function (d) { return d.x + d.offsetX; })
            .attr("y", function (d) { return d.y + d.offsetY; })
            .call(setText, textWidth);

        let horizontalLineData = []
        let connectingLineData = []
        mAnnotationDisplayGroup.selectAll(".annotation-text_" + timeline.id).each(function (d) {
            let boundingBox = this.getBBox();
            let x1 = boundingBox.x;
            let x2 = boundingBox.x + boundingBox.width;
            let y1 = boundingBox.y;
            let y2 = boundingBox.y + boundingBox.height;
            let closeY, closeX;
            if (Math.abs(d.y - y1) < Math.abs(d.y - y2)) {
                closeY = y1 - linePadding;
            } else {
                closeY = y2 + linePadding;
            }

            if (Math.abs(d.x - x1) < Math.abs(d.x - x2)) {
                closeX = x1 - linePadding;
            } else {
                closeX = x2 + linePadding;
            }

            horizontalLineData.push({ x1: x1 - linePadding, x2: x2 + linePadding, y: closeY });
            connectingLineData.push({ x1: d.x, y1: d.y, x2: closeX, y2: closeY });
        })

        let horizontalLines = mAnnotationDisplayGroup.selectAll('.horizontal-line_' + timeline.id).data(horizontalLineData);
        horizontalLines.exit().remove();
        horizontalLines.enter()
            .append('line')
            .classed("horizontal-line_" + timeline.id, true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mAnnotationDisplayGroup.selectAll('.horizontal-line_' + timeline.id)
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y });


        let connectingLines = mAnnotationDisplayGroup.selectAll('.connecting-line_' + timeline.id).data(connectingLineData);
        connectingLines.exit().remove();
        connectingLines.enter()
            .append('line')
            .classed("connecting-line_" + timeline.id, true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mAnnotationDisplayGroup.selectAll('.connecting-line_' + timeline.id)
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y1 })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y2 });

        // Set interaction events
        mAnnotationDisplayGroup.selectAll(".annotation-text_" + timeline.id)
            .on(".drag", null)
            .call(d3.drag()
                .on('start', function (e, d) {
                    mDragStartPos = { x: e.x, y: e.y };
                    mAnnotationDragStartCallback(d.binding, mDragStartPos);
                })
                .on('drag', function (e, d) {
                    mAnnotationDragCallback(d.binding, mDragStartPos, { x: e.x, y: e.y });
                })
                .on('end', function (e, d) {
                    mAnnotationDragEndCallback(d.binding, mDragStartPos, { x: e.x, y: e.y });
                    // cleanup
                    mDragStartPos = null;
                }))
            .on('dblclick', function (e, d) {
                let position = d3.select(this).node().getBoundingClientRect();
                let inputbox = d3.select("#input-box");

                inputbox
                    .style("top", Math.floor(position.y - 8) + "px")
                    .style("left", Math.floor(position.x - 8) + "px")
                    .attr("height", inputbox.property("scrollHeight"))
                    .on('input', null)
                    .on('input', function (e) {
                        inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
                    }).on('change', function (e) {
                        inputbox
                            .style("top", "-200px")
                            .style("left", "-100px")
                    }).on('blur', function (e) {
                        mAnnotationTextUpdatedCallback(d.binding.dataCell.id, inputbox.property("value"))
                        inputbox
                            .style("top", "-200px")
                            .style("left", "-100px")
                    });

                inputbox.property("value", d.text);
                inputbox.style("height", inputbox.property("scrollHeight") + "px");
                inputbox.style("width", textWidth + "px");

                inputbox.node().focus();
            })
            .on('mouseover', function (e, d) {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mAnnotationMouseOverCallback(d.binding, mouseCoords);
            })
            .on('mouseout', function (e, d) {
                let mouseCoords = { x: d3.pointer(e)[0], y: d3.pointer(e)[1] };
                mAnnotationMouseOutCallback(d.binding, mouseCoords);
            });
    }

    function setText(textElements, width) {
        textElements.each(function () {
            let textElement = d3.select(this);
            let text = d3.select(this).datum().text;
            let currentText = textElement.text();

            if (currentText.replace(/\s+/, "") != text.replace(/\s+/, "")) {
                let words = text.split(/\s+/).reverse();
                let word;
                let line = [];
                let lineNumber = 1;
                let lineHeight = 1.1; // ems
                let tspan = textElement.text(null).append("tspan")
                    .attr("dy", "0em");

                while (word = words.pop()) {
                    tspan.text(word);
                    if (tspan.node().getComputedTextLength() > width) {
                        for (let i = 0; i < word.length; i++) {
                            tspan.text(word.substring(0, i));
                            if (tspan.node().getComputedTextLength() > width) {
                                temp = word.substring(0, i - 1);
                                words.push(word.substring(i - 1));
                                word = temp;
                                break;
                            }
                        }
                    }

                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = textElement.append("tspan")
                            .attr("dy", lineNumber * lineHeight + "em")
                            .text(word);
                        lineNumber++;

                    }
                }
            }

            textElement.selectAll("tspan")
                .attr("x", textElement.attr("x"))
                .attr("y", textElement.attr("y"));
        });
    }

    this.drawAnnotations = drawAnnotations;
    this.drawTimelineAnnotations = drawTimelineAnnotations;
    this.setAnnotationTextUpdatedCallback = (callback) => mAnnotationTextUpdatedCallback = callback
    this.setAnnotationDragStartCallback = (callback) => mAnnotationDragStartCallback = callback;
    this.setAnnotationDragCallback = (callback) => mAnnotationDragCallback = callback;
    this.setAnnotationDragEndCallback = (callback) => mAnnotationDragEndCallback = callback;
    this.setAnnotationMouseOverCallback = (callback) => mAnnotationMouseOverCallback = callback;
    this.setAnnotationMouseOutCallback = (callback) => mAnnotationMouseOutCallback = callback;
}
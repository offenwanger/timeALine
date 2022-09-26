
function TextController(vizLayer, overlayLayer, interactionLayer) {
    const TEXT_WIDTH = 200;

    let mDisplayGroup = vizLayer.append('g')
        .attr("id", 'annotation-display-g');
    let mInteractionGroup = interactionLayer.append('g')
        .attr("id", 'annotation-interaction-g');

    let mTextUpdatedCallback = () => { };

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mMouseOverCallback = () => { };
    let mMouseOutCallback = () => { };

    let mDragging = false;
    let mDragStartPos = null;
    let mDragBinding = null;

    let mDataCache = {};

    function updateModel(model) {
        mDataCache = {};
        mDisplayGroup.selectAll("*").remove();
        mInteractionGroup.selectAll("*").remove();

        model.getAllTimelines().forEach(timeline => {
            draw(timeline, model.getCellBindingData(timeline.id).filter(b => b.dataCell.getType() == DataTypes.TEXT));
        })
    }

    function drawTimelineAnnotations(timeline, boundData) {
        draw(timeline, boundData);
    }

    function draw(timeline, boundData) {
        let annotationDataset = [];
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
            if (!mDataCache[timeline.id].bindings[binding.cellBinding.id] || mDataCache[timeline.id].bindings[binding.cellBinding.id] != JSON.stringify(binding)) {
                let linePercent = binding.linePercent != NO_LINE_PERCENT ? binding.linePercent : 0;
                let pos = PathMath.getPositionForPercent(timeline.points, linePercent);
                let text = binding.dataCell.getValue();
                let offsetX = binding.cellBinding.offset.x;
                let offsetY = binding.cellBinding.offset.y;
                annotationData = {
                    x: pos.x,
                    y: pos.y,
                    text,
                    offsetX,
                    offsetY,
                    hasTime: binding.timeCell.isValid(),
                    binding
                };

                mDataCache[timeline.id].bindings[binding.cellBinding.id] = JSON.stringify(binding);
                mDataCache[timeline.id].annotationData[binding.cellBinding.id] = annotationData;
            } else {
                annotationData = mDataCache[timeline.id].annotationData[binding.cellBinding.id]
            }

            annotationDataset.push(annotationData);
        })

        let selection = mDisplayGroup.selectAll(".annotation-text_" + timeline.id).data(annotationDataset);
        selection.exit().remove();
        selection.enter().append("text")
            .classed("annotation-text_" + timeline.id, true)

        mDisplayGroup.selectAll(".annotation-text_" + timeline.id)
            .attr("x", function (d) { return d.x + d.offsetX; })
            .attr("y", function (d) { return d.y + d.offsetY; })
            .call(setText, TEXT_WIDTH);

        let horizontalLineData = []
        let connectingLineData = []
        let interactionTargetData = []
        mDisplayGroup.selectAll(".annotation-text_" + timeline.id)
            .each(function (d) {
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
                connectingLineData.push({ x1: d.x, y1: d.y, x2: closeX, y2: closeY, hasTime: d.hasTime });
                interactionTargetData.push(Object.assign({
                    binding: d.binding,
                    text: d.text,
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height
                }));
            })

        setupInteractionTargets(timeline, interactionTargetData);

        let horizontalLines = mDisplayGroup.selectAll('.horizontal-line_' + timeline.id)
            .data(horizontalLineData);
        horizontalLines.exit().remove();
        horizontalLines.enter()
            .append('line')
            .classed("horizontal-line_" + timeline.id, true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mDisplayGroup.selectAll('.horizontal-line_' + timeline.id)
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y });


        let connectingLines = mDisplayGroup.selectAll('.connecting-line_' + timeline.id)
            .data(connectingLineData);
        connectingLines.exit().remove();
        connectingLines.enter()
            .append('line')
            .classed("connecting-line_" + timeline.id, true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mDisplayGroup.selectAll('.connecting-line_' + timeline.id)
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y1 })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y2 })
            .style("stroke-dasharray", d => d.hasTime ? null : "3, 3");
    }

    function setupInteractionTargets(timeline, interactionTargetData) {
        let interactionTargets = mInteractionGroup.selectAll('.text-interaction-target_' + timeline.id)
            .data(interactionTargetData);
        interactionTargets.exit().remove();
        interactionTargets.enter()
            .append('rect')
            .classed('text-interaction-target_' + timeline.id, true)
            .attr('fill', 'white')
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                mDragStartPos = mDragStartCallback(d.binding, e);
                mDragging = true;
                mDragBinding = d.binding;
            })
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
                            .style("top", "-400px")
                            .style("left", "-200px")
                    }).on('blur', function (e) {
                        mTextUpdatedCallback(d.binding.dataCell.id, inputbox.property("value"))
                        inputbox
                            .style("top", "-400px")
                            .style("left", "-200px")
                    });

                inputbox.property("value", d.text);
                inputbox.style("height", inputbox.property("scrollHeight") + "px");
                inputbox.style("width", TEXT_WIDTH + "px");

                inputbox.node().focus();
            })
            .on('mouseover', function (e, d) {
                mMouseOverCallback(d.binding, e);
            })
            .on('mouseout', function (e, d) {
                mMouseOutCallback(d.binding, e);
            });

        mInteractionGroup.selectAll('.text-interaction-target_' + timeline.id)
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("height", d => d.height)
            .attr("width", d => d.width);
    }

    function onPointerMove(coords) {
        if (mDragging) {
            mDragCallback(mDragBinding, mDragStartPos, coords);
        }
    }

    function onPointerUp(coords) {
        if (mDragging) {
            mDragging = false;
            mDragEndCallback(mDragBinding, mDragStartPos, coords);

            mDragStartPos = null;
            mDragBinding = null;
        }
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

    this.updateModel = updateModel;
    this.drawTimelineAnnotations = drawTimelineAnnotations;
    this.setTextUpdatedCallback = (callback) => mTextUpdatedCallback = callback
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setMouseOverCallback = (callback) => mMouseOverCallback = callback;
    this.setMouseOutCallback = (callback) => mMouseOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
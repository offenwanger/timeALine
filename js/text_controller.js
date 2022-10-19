
function TextController(vizLayer, overlayLayer, interactionLayer) {
    const TEXT_WIDTH = 200;

    let mActive = false;

    let mDisplayGroup = vizLayer.append('g')
        .attr("id", 'annotation-display-g');
    let mInteractionGroup = interactionLayer.append('g')
        .attr("id", 'annotation-interaction-g');

    let mTextUpdatedCallback = () => { };

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };

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

        boundData.sort((a, b) => a.linePercent - b.linePercent);
        let positions = PathMath.getPositionForPercents(
            timeline.points,
            boundData.map(binding => binding.linePercent != NO_LINE_PERCENT ? binding.linePercent : 0))
        boundData.forEach((binding, index) => {
            let annotationData;
            if (!mDataCache[timeline.id].bindings[binding.cellBinding.id] || mDataCache[timeline.id].bindings[binding.cellBinding.id] != JSON.stringify(binding)) {
                let text = binding.dataCell.getValue();
                let offsetX = binding.cellBinding.offset.x;
                let offsetY = binding.cellBinding.offset.y;
                let pos = positions[index];
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

        let selection = mDisplayGroup.selectAll('.annotation-text[timeline-id="' + timeline.id + '"]')
            .data(annotationDataset);
        selection.exit().remove();
        selection.enter().append("text")
            .classed("annotation-text", true)
            .attr("timeline-id", timeline.id)

        mDisplayGroup.selectAll('.annotation-text[timeline-id="' + timeline.id + '"]')
            .attr("x", function (d) { return d.x + d.offsetX; })
            .attr("y", function (d) { return d.y + d.offsetY; })
            .attr("binding-id", function (d) { return d.binding.cellBinding.id; })
            .call(setText, TEXT_WIDTH);

        let horizontalLineData = []
        let connectingLineData = []
        let interactionTargetData = []
        mDisplayGroup.selectAll('.annotation-text[timeline-id="' + timeline.id + '"]')
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

                horizontalLineData.push({
                    x1: x1 - linePadding,
                    x2: x2 + linePadding,
                    y: closeY,
                    bindingId: d.binding.cellBinding.id
                });
                connectingLineData.push({
                    x1: d.x,
                    y1: d.y,
                    x2: closeX,
                    y2: closeY,
                    hasTime: d.hasTime,
                    bindingId: d.binding.cellBinding.id
                });
                interactionTargetData.push(Object.assign({
                    binding: d.binding,
                    text: d.text,
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height
                }));
            })

        let horizontalLines = mDisplayGroup.selectAll('.horizontal-line[timeline-id="' + timeline.id + '"]')
            .data(horizontalLineData);
        horizontalLines.exit().remove();
        horizontalLines.enter()
            .append('line')
            .classed("horizontal-line", true)
            .attr("timeline-id", timeline.id)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mDisplayGroup.selectAll('.horizontal-line[timeline-id="' + timeline.id + '"]')
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y })
            .attr("binding-id", function (d) { return d.bindingId; });


        let connectingLines = mDisplayGroup.selectAll('.connecting-line[timeline-id="' + timeline.id + '"]')
            .data(connectingLineData);
        connectingLines.exit().remove();
        connectingLines.enter()
            .append('line')
            .classed('connecting-line', true)
            .attr("timeline-id", timeline.id)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mDisplayGroup.selectAll('.connecting-line[timeline-id="' + timeline.id + '"]')
            .attr('x1', function (d) { return d.x1 })
            .attr('y1', function (d) { return d.y1 })
            .attr('x2', function (d) { return d.x2 })
            .attr('y2', function (d) { return d.y2 })
            .style("stroke-dasharray", d => d.hasTime ? null : "3, 3")
            .attr("binding-id", function (d) { return d.bindingId; });

        setupInteractionTargets(timeline, interactionTargetData);
    }

    function setupInteractionTargets(timeline, interactionTargetData) {
        let interactionTargets = mInteractionGroup.selectAll('.text-interaction-target[timeline-id="' + timeline.id + '"]')
            .data(interactionTargetData);
        interactionTargets.exit().remove();
        interactionTargets.enter()
            .append('rect')
            .classed('text-interaction-target', true)
            .attr('timeline-id', timeline.id)
            .attr('fill', 'white')
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mDragStartPos = mDragStartCallback(d.binding, e);
                    mDragging = true;
                    mDragBinding = d.binding;
                }
            })
            .on('dblclick', function (e, d) {
                if (mActive) {
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
                }
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    mPointerEnterCallback(e, d.binding);
                    FilterUtil.applyShadowFilter(mDisplayGroup
                        .selectAll('[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.binding);
                    FilterUtil.removeShadowFilter(mDisplayGroup
                        .selectAll('[binding-id="' + d.binding.cellBinding.id + '"]'));
                }
            });

        mInteractionGroup.selectAll('.text-interaction-target[timeline-id="' + timeline.id + '"]')
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

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mInteractionGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mInteractionGroup.style('visibility', "hidden");
        }
    }

    this.updateModel = updateModel;
    this.drawTimelineAnnotations = drawTimelineAnnotations;
    this.setActive = setActive;
    this.setTextUpdatedCallback = (callback) => mTextUpdatedCallback = callback
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
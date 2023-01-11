
function TextController(vizLayer, overlayLayer, interactionLayer) {
    const TEXT_WIDTH = 200;

    let mActive = false;

    let mDisplayGroup = vizLayer.append('g')
        .attr("id", 'annotation-display-g');
    let mInteractionGroup = interactionLayer.append('g')
        .attr("id", 'annotation-interaction-g');

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };
    let mDoubleClickCallback = (cellId, text, x, y, height, width) => { }

    let mDragging = false;
    let mDragStartPos = null;
    let mDragBinding = null;

    let mDataCache = {};
    let mBoundingBoxData = [];

    function updateModel(model) {
        mDataCache = {};
        mBoundingBoxData = [];
        mDisplayGroup.selectAll("*").remove();
        mInteractionGroup.selectAll("*").remove();

        model.getAllTimelines().forEach(timeline => {
            drawTimelineText(timeline, model.getCellBindingData(timeline.id).filter(b => b.dataCell.getType() == DataTypes.TEXT));
        })

        drawCanvasText(model.getCanvasBindingData());
    }

    function drawTimelineText(timeline, boundData) {
        let annotationDataset = [];
        let linePadding = 2;

        mBoundingBoxData = mBoundingBoxData.filter(d => d.timelineId != timeline.id);

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
            .attr("font-family", function (d) { return d.binding.cellBinding.font; })
            .attr("font-weight", function (d) { return d.binding.cellBinding.fontWeight ? 700 : 400; })
            .style("font-style", function (d) { return d.binding.cellBinding.fontItalics ? "italic" : null; })
            .style("font-size", function (d) { return d.binding.cellBinding.fontSize })
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

                mBoundingBoxData.push({
                    x1, x2, y1, y2,
                    timelineId: timeline.id,
                    cellBindingId: d.binding.cellBinding.id
                });

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

    function drawCanvasText(boundData) {
        let annotationDataset = [];
        mBoundingBoxData = mBoundingBoxData.filter(d => !d.isCanvasText);
        boundData.forEach(binding => {
            let annotationData = {
                x: binding.cellBinding.offset.x,
                y: binding.cellBinding.offset.y,
                text: binding.dataCell.getValue(),
                binding
            };
            annotationDataset.push(annotationData);
        })

        let selection = mDisplayGroup.selectAll('.annotation-text[is-canvas-text="canvas-text"]')
            .data(annotationDataset);
        selection.exit().remove();
        selection.enter().append("text")
            .classed("annotation-text", true)
            .attr("is-canvas-text", "canvas-text");

        mDisplayGroup.selectAll('.annotation-text[is-canvas-text="canvas-text"]')
            .attr("x", function (d) { return d.x })
            .attr("y", function (d) { return d.y })
            .attr("font-family", function (d) { return d.binding.cellBinding.font; })
            .attr("font-weight", function (d) { return d.binding.cellBinding.fontWeight ? 700 : 400; })
            .style("font-style", function (d) { return d.binding.cellBinding.fontItalics ? "italic" : null; })
            .style("font-size", function (d) { return d.binding.cellBinding.fontSize })
            .attr("binding-id", function (d) { return d.binding.cellBinding.id; })
            .call(setText, TEXT_WIDTH);

        let interactionTargetData = []
        mDisplayGroup.selectAll('.annotation-text[is-canvas-text="canvas-text"]')
            .each(function (d) {
                let boundingBox = this.getBBox();
                let x1 = boundingBox.x;
                let x2 = boundingBox.x + boundingBox.width;
                let y1 = boundingBox.y;
                let y2 = boundingBox.y + boundingBox.height;

                mBoundingBoxData.push({
                    x1, x2, y1, y2,
                    isCanvasText: true,
                    cellBindingId: d.binding.cellBinding.id
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

        setupInteractionTargets(null, interactionTargetData);
    }

    function setupInteractionTargets(timeline, interactionTargetData) {
        let targetSelector = timeline ?
            '.text-interaction-target[timeline-id="' + timeline.id + '"]' :
            '.text-interaction-target[is-canvas-text="canvas-text"]';

        let interactionTargets = mInteractionGroup.selectAll(targetSelector)
            .data(interactionTargetData);
        interactionTargets.exit().remove();
        interactionTargets.enter()
            .append('rect')
            .classed('text-interaction-target', true)
            .attr(timeline ? 'timeline-id' : "is-canvas-text", timeline ? timeline.id : "canvas-text")
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
                let rect = d3.select(this).node().getBoundingClientRect();
                mDoubleClickCallback(d.binding.dataCell.id, d.text, rect.x, rect.y, rect.height, rect.width);
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

        mInteractionGroup.selectAll(targetSelector)
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
    this.drawTimelineText = drawTimelineText;
    this.drawCanvasText = drawCanvasText;
    this.setActive = setActive;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;
    this.setDoubleClickCallback = (callback) => mDoubleClickCallback = callback;
    this.getTextBoundingBoxes = () => mBoundingBoxData;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
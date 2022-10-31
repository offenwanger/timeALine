function ImageController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };
    let mPointerEnterCallback = () => { };
    let mPointerOutCallback = () => { };
    let mDoubleClickCallback = () => { };

    let mDragging = false;
    let mDragStartPos = null;
    let mDragBinding = null;

    let mImageGroup = vizLayer.append('g')
        .attr("id", 'image-group')
        .lower();
    let mInteractionGroup = interactionLayer.append('g')
        .attr("id", 'image-interaction-group')
        .lower();

    function updateModel(model) {
        let imageDrawingData = getDrawingData(model.getAllImageBindings());

        let selection = mImageGroup.selectAll(".image-item").data(imageDrawingData);
        selection.exit().remove();
        selection.enter().append("svg:image")
            .classed("image-item", true);
        mImageGroup.selectAll(".image-item")
            .attr("binding-id", d => d.binding.imageBinding.id)
            .attr("timeline-id", d => d.binding.timeline ? d.binding.timeline.id : "")
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d => d.binding.imageBinding.width)
            .attr('height', d => d.binding.imageBinding.height)
            .attr('xlink:href', d => d.binding.imageBinding.imageData);

        let connectingLines = mImageGroup.selectAll('.image-connecting-line')
            .data(imageDrawingData.filter(data => !data.binding.isCanvasBinding));
        connectingLines.exit().remove();
        connectingLines.enter()
            .append('line')
            .classed('image-connecting-line', true)
            .attr('stroke-width', 0.5)
            .attr('stroke', 'black')
            .attr('opacity', 0.6);
        mImageGroup.selectAll('.image-connecting-line')
            .attr('x1', d => d.lineX1)
            .attr('y1', d => d.lineY1)
            .attr('x2', d => d.lineX2)
            .attr('y2', d => d.lineY2)
            .style("stroke-dasharray", d => d.binding.imageBinding.timeStamp ? null : "3, 3")
            .attr("timeline-id", d => d.binding.timeline ? d.binding.timeline.id : "")
            .attr("binding-id", d => d.binding.imageBinding.id);

        let interactionTargets = mInteractionGroup.selectAll(".image-interaction-target")
            .data(imageDrawingData);
        interactionTargets.exit().remove();
        interactionTargets.enter()
            .append('rect')
            .classed('image-interaction-target', true)
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
                mDoubleClickCallback(d.binding, e)
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    mPointerEnterCallback(e, d.binding);
                    FilterUtil.applyShadowFilter(mImageGroup
                        .selectAll('[binding-id="' + d.binding.imageBinding.id + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    mPointerOutCallback(e, d.binding);
                    FilterUtil.removeShadowFilter(mImageGroup
                        .selectAll('[binding-id="' + d.binding.imageBinding.id + '"]'));
                }
            });

        mInteractionGroup.selectAll(".image-interaction-target")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("height", d => d.binding.imageBinding.height)
            .attr("width", d => d.binding.imageBinding.width);
    }

    function redrawImage(imageBindingData) {
        let data = getDrawingData([imageBindingData])[0];
        mImageGroup.select(".image-item[binding-id=\"" + imageBindingData.imageBinding.id + "\"]")
            .attr('x', data.x)
            .attr('y', data.y)
            .attr('width', imageBindingData.imageBinding.width)
            .attr('height', imageBindingData.imageBinding.height);
        if (!imageBindingData.isCanvasBinding) {
            mImageGroup.selectAll(".image-connecting-line[binding-id=\"" + imageBindingData.imageBinding.id + "\"]")
                .attr('x1', data.lineX1)
                .attr('y1', data.lineY1)
                .attr('x2', data.lineX2)
                .attr('y2', data.lineY2)
                .attr("timeline-id", imageBindingData.timeline ? data.binding.timeline.id : "")
                .attr("binding-id", imageBindingData.imageBinding.id)
                .style("stroke-dasharray", imageBindingData.imageBinding.timeStamp ? null : "3, 3");
        }

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

    function getDrawingData(boundData) {
        let drawingData = [];
        let timelines = DataUtil.getUniqueList(boundData.filter(b => !b.isCanvasBinding).map(b => b.timeline), 'id');
        timelines.forEach(timeline => {
            let timelineData = boundData.filter(b => b.timeline && b.timeline.id == timeline.id);
            timelineData.sort((a, b) => a.linePercent - b.linePercent);
            let positions = PathMath.getPositionForPercents(
                timeline.points,
                timelineData.map(binding => binding.linePercent != NO_LINE_PERCENT ? binding.linePercent : 0))
            timelineData.forEach((d, index) => {
                let x = positions[index].x + d.imageBinding.offset.x;
                let y = positions[index].y + d.imageBinding.offset.y;
                let { height, width } = d.imageBinding;
                drawingData.push({
                    pos: positions[index],
                    x, y,
                    lineX1: positions[index].x,
                    lineY1: positions[index].y,
                    lineX2: Math.abs(positions[index].x - x) < Math.abs(positions[index].x - (x + width)) ? x : (x + width),
                    lineY2: Math.abs(positions[index].y - y) < Math.abs(positions[index].y - (y + height)) ? y : (y + height),
                    binding: d,
                })
            });
        })

        boundData.filter(b => b.isCanvasBinding).forEach(binding => {
            drawingData.push({
                x: binding.imageBinding.offset.x,
                y: binding.imageBinding.offset.y,
                binding
            })
        });

        return drawingData;
    }

    this.updateModel = updateModel;
    this.setActive = setActive;
    this.redrawImage = redrawImage;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setPointerEnterCallback = (callback) => mPointerEnterCallback = callback;
    this.setPointerOutCallback = (callback) => mPointerOutCallback = callback;
    this.setDoubleClickCallback = (callback) => mDoubleClickCallback = callback;

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
function ImageController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;

    let mDragStartCallback = () => { };
    let mDragCallback = () => { };
    let mDragEndCallback = () => { };

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
        let selection = mImageGroup.selectAll(".image-item").data(getDrawingData(model.getAllImageBindings()));
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
    }

    function redrawImage(imageBindingData) {
        let data = getDrawingData([imageBindingData])[0];
        mImageGroup.select(".image-item[binding-id=\"" + imageBindingData.imageBinding.id + "\"]")
            .attr('x', data.x)
            .attr('y', data.y)
            .attr('width', imageBindingData.imageBinding.width)
            .attr('height', imageBindingData.imageBinding.height);
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
                drawingData.push({
                    x: positions[index].x + d.imageBinding.offset.x,
                    y: positions[index].y + d.imageBinding.offset.y,
                    binding: d
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

    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
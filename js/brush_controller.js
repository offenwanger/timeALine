function BrushController(vizLayer, overlayLayer, interactionLayer) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 800;

    let mActive = false;
    let mFreeze = false;
    let mBrushSize = 50;

    let mBrushGroup = interactionLayer.append('g')
        .attr("id", 'brush-g')
        .style("visibility", 'hidden');

    $(document).on("wheel", function (e) {
        e = e.originalEvent;
        if (mActive) {
            mBrushSize = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mBrushSize + e.wheelDelta / 50));
            mBrush.attr("r", mBrushSize);
        }
    });

    function setBrushSize(brushSize) {
        mBrushSize = brushSize;
        mBrush.attr("r", mBrushSize);
    }

    function onPointerMove(coords) {
        if (!mFreeze) {
            mBrush.attr("cx", coords.x);
            mBrush.attr("cy", coords.y);
        }
    }

    let mBrush = mBrushGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', mBrushSize)
        .attr('stroke', "black")
        .attr('stroke-wdith', 2)
        .attr('fill', 'none');

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mBrushGroup.style('visibility', "");

        } else if (!active && mActive) {
            mActive = false;
            mBrushGroup.style('visibility', "hidden");
        }
    }

    this.freeze = (freeze) => mFreeze = freeze;
    this.setActive = setActive;
    this.onPointerMove = onPointerMove;
    this.getBrushRadius = () => mBrushSize;
    this.setBrushSize = setBrushSize;
}

BrushController.getInstance = function (vizLayer, overlayLayer, interactionLayer) {
    if (!BrushController.instance) {
        BrushController.instance = new BrushController(vizLayer, overlayLayer, interactionLayer);
    }

    return BrushController.instance;
}
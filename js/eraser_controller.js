function EraserController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;
    let mDragging = false;
    let mBrushSize = 0;
    let mDraggedPoints = [];

    let mEraseCallback = (canvasMask) => { };

    let mEraserGroup = interactionLayer.append('g')
        .attr("id", 'eraser-g')
        .style("visibility", 'hidden');

    let mEraserLine = mEraserGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    let mBrushController = BrushController.getInstance(vizLayer, overlayLayer, interactionLayer);

    function onPointerDown(coords) {
        if (mActive) {
            mBrushSize = mBrushController.getBrushRadius();
            mDragging = true;
            mEraserLine.attr('stroke-width', mBrushSize * 2);
        }
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    async function onPointerUp() {
        if (mActive && mDragging) {
            mDragging = false;

            let eraserOutline = mEraserLine.node().getBBox();
            // eraser outline only takes the path coords into account, not the width
            let canvasWidth = eraserOutline.width + mBrushSize * 2;
            let canvasHeight = eraserOutline.height + mBrushSize * 2;
            let canvasX = eraserOutline.x - mBrushSize;
            let canvasY = eraserOutline.y - mBrushSize;

            let canvas = await DataUtil.svgToCanvas(mEraserLine.clone().node(), canvasX, canvasY, canvasWidth, canvasHeight);
            let mask = new CanvasMask(canvas, canvasX, canvasY, canvasWidth, canvasHeight);

            mEraseCallback(mask);

            // reset
            mDraggedPoints = [];
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    this.setActive = (active) => {
        if (active && !mActive) {
            mActive = true;
            mEraserGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mEraserGroup.style('visibility', "hidden");
        }

        mActive = active;
        mBrushController.setActive(active)
    };

    this.updateModel = (model) => mEraserLine.attr('stroke', model.getCanvas().color);
    this.setEraseCallback = (callback) => mEraseCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
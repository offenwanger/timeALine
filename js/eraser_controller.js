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

    function onPointerUp() {
        if (mActive && mDragging) {
            mDragging = false;

            let eraserOutline = mEraserLine.node().getBBox();
            // eraser outline only takes the path coords into account, not the width
            let canvasWidth = eraserOutline.width + mBrushSize * 2;
            let canvasHeight = eraserOutline.height + mBrushSize * 2;
            let canvasX = eraserOutline.x - mBrushSize;
            let canvasY = eraserOutline.y - mBrushSize;

            // raterize erase shape
            let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
                .attr('width', canvasWidth)
                .attr('height', canvasHeight)
                // this is required for unknown reasons
                .attr("xmlns", "http://www.w3.org/2000/svg");

            let canvasLine = mEraserLine.clone();
            canvasLine.attr('d', PathMath.getPathD(mDraggedPoints.map(p => {
                return { x: p.x - canvasX, y: p.y - canvasY };
            })));
            exportSVG.append(() => canvasLine.node());
            exportSVG = exportSVG.node();

            let blob = new Blob([exportSVG.outerHTML], { type: 'image/svg+xml;charset=utf-8' });

            let URL = window.URL || window.webkitURL || window;
            let blobURL = URL.createObjectURL(blob);

            let image = new Image();
            image.onload = () => {
                let canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                let context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

                let mask = new CanvasMask(canvas, canvasX, canvasY, canvasWidth, canvasHeight);

                mEraseCallback(mask);

                // reset
                mDraggedPoints = [];
                mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
            };
            image.src = blobURL;
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
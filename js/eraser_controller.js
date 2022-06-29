function EraserController(svg) {
    let mActive = false;
    let mDraggedPoints = [];

    let mEraseCallback = () => { };

    let mEraserGroup = svg.append('g')
        .attr("id", 'eraser-g')
        .style("visibility", 'hidden');

    let mEraserLine = mEraserGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    let mBrushController = new BrushController(svg);
    mBrushController.setDragStartCallback((c, brushRadius) => {
        mEraserLine.attr('stroke-width', brushRadius * 2);
    });

    mBrushController.setDragCallback((coords) => {
        mDraggedPoints.push(coords);
        mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
    })

    mBrushController.setDragEndCallback(() => {
        let width = svg.attr('width');
        let height = svg.attr('height');

        let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
            .attr('width', width)
            .attr('height', height)
            // this is required for unknown reasons
            .attr("xmlns", "http://www.w3.org/2000/svg");
        exportSVG.append(() => mEraserLine.clone().node());
        exportSVG = exportSVG.node();

        let blob = new Blob([exportSVG.outerHTML], { type: 'image/svg+xml;charset=utf-8' });

        let URL = window.URL || window.webkitURL || window;
        let blobURL = URL.createObjectURL(blob);

        let image = new Image();
        image.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            let context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, width, height);

            mDraggedPoints = [];
            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));

            mEraseCallback(new CanvasMask(canvas));
        };
        image.src = blobURL;
    })

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

    this.setEraseCallback = (callback) => mEraseCallback = callback;
}
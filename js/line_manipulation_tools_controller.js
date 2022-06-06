
function LineDrawingController(svg) {
    let mActive = false;
    let mDrawFinishedCallback = () => { };
    let mDraggedPoints = [];
    let mLineResolution = 50;

    let lineDrawingGroup = svg.append('g')
        .attr("id", 'line-drawing-g')
        .style("visibility", 'hidden');

    lineDrawingGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.2')
        .call(d3.drag()
            .on('start', function (e) { /* nothing at the moment */ })
            .on('drag', onDragged)
            .on('end', onDragEnd));

    let drawingLine = lineDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    function onDragged(e) {
        if (mActive) {
            mDraggedPoints.push({ x: e.x, y: e.y });
            drawingLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onDragEnd() {
        if (mActive) {
            let result = getPointsFromLine(drawingLine, mLineResolution);

            mDrawFinishedCallback(result);

            mDraggedPoints = [];
            drawingLine.attr('d', PathMath.getPathD([]));
        }
    }


    function getPointsFromLine(line, resolution) {
        let result = [];
        for (let len = 0; len < line.node().getTotalLength(); len += resolution) {
            result.push(line.node().getPointAtLength(len));
        }
        result.push(line.node().getPointAtLength(line.node().getTotalLength()));
        return result.map(p => { return { x: p.x, y: p.y }; });
    }

    this.setActive = function (active) {
        if (active && !mActive) {
            mActive = true;
            lineDrawingGroup.style('visibility', "");

            // TODO add extension nodes.
        } else if (!active && mActive) {
            mActive = false;
            lineDrawingGroup.style('visibility', "hidden");
        }
    }

    this.redistributePoints = function (points, resolution) {
        let line = drawingLine.clone().attr('d', PathMath.getPathD(points));
        let result = getPointsFromLine(line, resolution);
        line.remove();
        return result;
    }

    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
}

function EraserController(svg) {
    let mActive = false;
    let mDraggedPoints = [];

    let mEraseCallback = () => { };

    let mEraserGroup = svg.append('g')
        .attr("id", 'line-drawing-g')
        .style("visibility", 'hidden');

    let mEraserLine = mEraserGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    let mBrushController = new BrushController(svg);
    mBrushController.setDrawStartCallback((c, brushRadius) => {
        mEraserLine.attr('stroke-width', brushRadius * 2);
    });

    mBrushController.setDrawCallback((coords) => {
        mDraggedPoints.push(coords);
        mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
    })

    mBrushController.setDrawEndCallback(() => {
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

            mEraseCallback(new CanvasMask(canvas));
        };
        image.src = blobURL;

        mDraggedPoints = [];
        mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
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

function DragController(svg) {

}

function BrushController(svg) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 100;

    let mActive = false;
    let mBrushSize = 10;

    let mDrawStartCallback = () => { };
    let mDrawCallback = () => { };
    let mDrawEndCallback = () => { };

    let mBrushGroup = svg.append('g')
        .attr("id", 'brush-g')
        .style("visibility", 'hidden');

    mBrushGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', svg.attr('height'))
        .attr('width', svg.attr('width'))
        .attr('fill', 'white')
        .attr('opacity', '0')
        .call(d3.drag()
            .on('start', function (e) {
                if (mActive) {
                    mDrawStartCallback({ x: e.x, y: e.y }, mBrushSize);
                }
            })
            .on('drag', function (e) {
                updateCircle({ x: e.x, y: e.y });
                if (mActive) {
                    mDrawCallback({ x: e.x, y: e.y }, mBrushSize)
                }
            })
            .on('end', function (e) {
                if (mActive) {
                    mDrawEndCallback({ x: e.x, y: e.y }, mBrushSize)
                }
            }))
        .on("mousemove", (e) => updateCircle({ x: d3.pointer(e)[0], y: d3.pointer(e)[1] }))
        .on("wheel", function (e) {
            mBrushSize = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, mBrushSize + e.wheelDelta / 50));
            mBrush.attr("r", mBrushSize);
        });

    function updateCircle(coords) {
        mBrush.attr("cx", coords.x);
        mBrush.attr("cy", coords.y);
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

    this.setActive = setActive;
    this.setDrawStartCallback = (callback) => mDrawStartCallback = callback;
    this.setDrawCallback = (callback) => mDrawCallback = callback;
    this.setDrawEndCallback = (callback) => mDrawEndCallback = callback;
}
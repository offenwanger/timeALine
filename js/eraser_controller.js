function EraserController(vizLayer, overlayLayer, interactionLayer, getAllLinePaths) {
    let mActive = false;
    let mDragging = false;
    let mBrushSize = 0;
    let mDraggedPoints = [];

    let mEraseCallback = () => { };

    let mExternalCallGetAllLinePaths = getAllLinePaths;

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

            let eraserOutline = mEraserGroup.node().getBBox();
            // eraser outline only takes the path coords into account, not the width
            let canvasWidth = eraserOutline.width + mBrushSize * 2;
            let canvasHeight = eraserOutline.width + mBrushSize * 2;
            let canvasX = eraserOutline.x - mBrushSize;
            let canvasY = eraserOutline.y - mBrushSize;

            // raterize erase shape
            let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
                .attr('width', canvasWidth)
                .attr('height', canvasHeight)
                // this is required for unknown reasons
                .attr("xmlns", "http://www.w3.org/2000/svg");

            mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints.map(p => {
                return { x: p.x - canvasX, y: p.y - canvasY };
            })));
            exportSVG.append(() => mEraserLine.clone().node());
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
                let linePaths = mExternalCallGetAllLinePaths();

                let checkedPaths = linePaths.filter(p => {
                    for (let i = 0; i < p.points.length - 1; i++) {
                        if (crossesBoundingBox(p.points[i], p.points[i + 1], {
                            xMin: canvasX,
                            xMax: canvasX + canvasWidth,
                            yMin: canvasY,
                            yMax: canvasY + canvasHeight
                        })) {
                            return true;
                        }
                    }
                    return false;
                })

                let segmentsData = checkedPaths.map(p => {
                    return {
                        id: p.id,
                        segments: PathMath.segmentPath(p.points, true, (point) => {
                            return mask.isCovered(point) ? SEGMENT_LABELS.DELETED : SEGMENT_LABELS.UNAFFECTED;
                        })
                    }
                })

                // filter out untouched lines
                segmentsData = segmentsData.filter(sd => sd.segments.length != 1 || sd.segments[0].label == SEGMENT_LABELS.DELETED);

                mEraseCallback(segmentsData);

                // reset
                mDraggedPoints = [];
                mEraserLine.attr('d', PathMath.getPathD(mDraggedPoints));
            };
            image.src = blobURL;
        }
    }

    function crossesBoundingBox(point1, point2, boundingBox) {
        if (point1.x <= boundingBox.xMax && point1.x >= boundingBox.xMin
            && point1.y <= boundingBox.yMax && point1.y >= boundingBox.yMin) {
            return true;
        }

        if (point2.x <= boundingBox.xMax && point2.x >= boundingBox.xMin
            && point2.y <= boundingBox.yMax && point2.y >= boundingBox.yMin) {
            return true;
        }

        return intersects(point1.x, point1.y, point2.x, point2.y, boundingBox.xMin, boundingBox.yMin, boundingBox.xMax, boundingBox.yMin)
            || intersects(point1.x, point1.y, point2.x, point2.y, boundingBox.xMin, boundingBox.yMax, boundingBox.xMax, boundingBox.yMax)
            || intersects(point1.x, point1.y, point2.x, point2.y, boundingBox.xMin, boundingBox.yMin, boundingBox.xMin, boundingBox.yMax)
            || intersects(point1.x, point1.y, point2.x, point2.y, boundingBox.xMax, boundingBox.yMin, boundingBox.xMax, boundingBox.yMax);
    }

    // returns true if the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
    function intersects(a, b, c, d, p, q, r, s) {
        var det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (-0.01 < lambda && lambda < 1.01) && (-0.01 < gamma && gamma < 1.01);
        }
    };

    function CanvasMask(canvas, x, y, width, height) {
        let mX = x;
        let mY = y;
        let mContext = canvas.getContext("2d");

        this.isCovered = function (coords) {
            if (coords.x < x || coords.y < y || coords.x > x + width || coords.y > y + height) return false;
            return mContext.getImageData(Math.round(coords.x - mX), Math.round(coords.y - mY), 1, 1).data[3] > 0;
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

    this.setEraseCallback = (callback) => mEraseCallback = callback;
    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
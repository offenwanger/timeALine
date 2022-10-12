function ColorBrushController(vizLayer, overlayLayer, interactionLayer) {
    let mActive = false;
    let mColor = '#000000'

    let mDragging = false;
    let mDraggedPoints = [];

    let mDrawFinishedCallback = () => { };

    let mDrawingGroup = interactionLayer.append('g')
        .attr("id", 'color-drawing-g')
        .style("visibility", 'hidden');

    // this must be under the mDrawing group else it capure events it shouldn't.
    let mColorLine = mDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    let mCover = overlayLayer.append('rect')
        .attr('id', "color-brush-cover")
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'white')
        .attr('opacity', '0.2');

    function onPointerDown(coords) {
        if (mActive) {
            mDragging = true;
        }
    }

    function onPointerMove(coords) {
        if (mActive && mDragging) {
            mDraggedPoints.push(coords);
            mColorLine.attr('d', PathMath.getPathD(mDraggedPoints));
        }
    }

    function onPointerUp(coords) {
        if (mActive && mDragging && mDraggedPoints.length > 1) {
            let result = [...mDraggedPoints]
            mDrawFinishedCallback(result, mColor);
        }

        mDragging = false;
        mDraggedPoints = [];
        mColorLine.attr('d', PathMath.getPathD([]));
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mDrawingGroup.style('visibility', "");
            mCover.style("visibility", '')
                .attr('width', overlayLayer.node().getBBox().width)
                .attr('height', overlayLayer.node().getBBox().height);
        } else if (!active && mActive) {
            mActive = false;
            mDrawingGroup.style('visibility', "hidden");
            mCover.style('visibility', "hidden");
        }
    }

    function setColor(color) {
        mColor = color;
        mColorLine.attr('stroke', color);
    }

    this.setActive = setActive;
    this.setColor = setColor;
    this.getColor = () => mColor;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;

    this.onPointerDown = onPointerDown;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
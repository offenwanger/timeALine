function ColorBrushController(svg) {
    let mSvg = svg;

    let mActive = false;
    let mColor = 'black';

    let mDragging = false;
    let mDraggedPoints = [];

    let mDrawFinishedCallback = () => { };

    let mDrawingGroup = svg.append('g')
        .attr("id", 'color-drawing-g')
        .style("visibility", 'hidden');

    // this must be under the mDrawing group else it capure events it shouldn't.
    let mColorLine = mDrawingGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', mColor)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', 1.5)

    mDrawingGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', svg.attr('width'))
        .attr('height', svg.attr('height'))
        .attr('fill', 'white')
        .attr('opacity', '0.2')
        .on("pointerdown", function (event) {
            // TODO: Should check what's down here (i.e. many fingers? Right Click?)
            if (mActive) {
                mDragging = true;
            }
        })
        .on("pointermove", function (event) {
            if (mActive && mDragging) {
                mDraggedPoints.push(localMouseCoords({ x: event.x, y: event.y }));
                mColorLine.attr('d', PathMath.getPathD(mDraggedPoints));
            }
        })

    // put this on document to capture releases outside the window
    document.addEventListener("pointerup", function (event) {
        if (mActive && mDragging && mDraggedPoints.length > 1) {
            let result = [...mDraggedPoints]
            mDrawFinishedCallback(result, mColor);
        }

        mDragging = false;
        mDraggedPoints = [];
        mColorLine.attr('d', PathMath.getPathD([]));
    });

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mDrawingGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mDrawingGroup.style('visibility', "hidden");
        }
    }

    function setColor(color) {
        mColor = color;
        mColorLine.attr('stroke', mColor);
    }

    function localMouseCoords(coords) {
        var offset = mSvg.node().getBoundingClientRect();
        return { x: coords.x - offset.x, y: coords.y - offset.y };
    }

    this.setActive = setActive;
    this.setColor = setColor;
    this.setDrawFinishedCallback = (callback) => mDrawFinishedCallback = callback;
}
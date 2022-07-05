function BrushController(svg) {
    const BRUSH_SIZE_MIN = 2;
    const BRUSH_SIZE_MAX = 100;

    let mActive = false;
    let mFreeze = false;
    let mBrushSize = 10;

    let mDragStartCallbacks = [];
    let mDragCallbacks = [];
    let mDragEndCallbacks = [];

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
                    mDragStartCallbacks.forEach(callback => callback({ x: e.x, y: e.y }, mBrushSize));
                }
            })
            .on('drag', function (e) {
                if (!mFreeze) updateCircle({ x: e.x, y: e.y });
                if (mActive) {
                    mDragCallbacks.forEach(callback => callback({ x: e.x, y: e.y }, mBrushSize));
                }
            })
            .on('end', function (e) {
                if (mActive) {
                    mDragEndCallbacks.forEach(callback => callback({ x: e.x, y: e.y }, mBrushSize));
                }
            }))
        .on("mousemove", (e) => {
            if (!mFreeze) updateCircle({ x: d3.pointer(e)[0], y: d3.pointer(e)[1] });
        })
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

    this.freeze = (freeze) => mFreeze = freeze;
    this.setActive = setActive;
    this.addDragStartCallback = (callback) => mDragStartCallbacks.push(callback);
    this.addDragCallback = (callback) => mDragCallbacks.push(callback);
    this.addDragEndCallback = (callback) => mDragEndCallbacks.push(callback);
    // At some point may need callback removes as well, but the current system achitecture doesn't call for it.
}

BrushController.getInstance = function (svg) {
    if (!BrushController.instance) {
        BrushController.instance = new BrushController(svg);
    }

    return BrushController.instance;
}
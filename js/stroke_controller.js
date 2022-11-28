function StrokeController(vizLayer, overlayLayer, interactionLayer) {
    let mModel = new DataStructs.DataModel();
    let mStrokesData = {}

    let mActive = false;

    let mStrokeDragging = false;
    let mStrokeDraggingId = null;

    let mDragStartCallback = (strokeId, event) => { };
    let mDragCallback = (strokeId, coords) => { };
    let mDragEndCallback = (strokeId, coords) => { };

    let mStrokeGroup = vizLayer.append('g')
        .attr("id", 'stroke-view-g');
    let mStrokeTargetGroup = interactionLayer.append('g')
        .attr("id", 'stroke-view-target-g')
        .style('visibility', "hidden");

    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;

        let oldStrokeData = mStrokesData;
        mStrokesData = {}

        mModel.getAllTimelines().forEach(timeline => {
            let oldtimeline = oldModel.getAllTimelines().find(t => t.id == timeline.id);
            let changedStrokes = DataUtil.timelineStrokesChanged(timeline, oldtimeline);
            mModel.getStrokeData(timeline.id).forEach(strokeData => {
                if (changedStrokes.includes(strokeData.id)) {
                    mStrokesData[strokeData.id] = {
                        color: strokeData.color,
                        width: strokeData.width,
                        projectedPoints: strokeData.points.map(point =>
                            PathMath.getPositionForPercentAndDist(timeline.points, point.linePercent, point.lineDist)),
                        timelineId: timeline.id,
                        strokeId: strokeData.id
                    };
                } else {
                    mStrokesData[strokeData.id] = oldStrokeData[strokeData.id];
                }
            })
        });

        mModel.getCanvas().annotationStrokes.forEach(stroke => {
            mStrokesData[stroke.id] = {
                color: stroke.color,
                width: stroke.width,
                projectedPoints: stroke.points.map(p => {
                    return {
                        x: p.xValue,
                        y: p.lineDist,
                    }
                }),
                strokeId: stroke.id
            };
        })

        drawStrokes();
    }

    function drawStrokes() {
        let selection = mStrokeGroup.selectAll(".canvas-annotation-stroke").data(Object.values(mStrokesData));
        selection.exit()
            .remove();
        selection.enter()
            .append("path")
            .classed("canvas-annotation-stroke", true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
        mStrokeGroup.selectAll(".canvas-annotation-stroke")
            .attr("stroke", d => d.color)
            .attr('stroke-width', d => d.width)
            .attr('d', d => PathMath.getPathD(d.projectedPoints))
            .attr("stroke-id", d => d.strokeId)
            .attr("timeline-id", d => d.timelineId);

        let targetSelection = mStrokeTargetGroup.selectAll(".canvas-annotation-stroke-target")
            .data(Object.values(mStrokesData));
        targetSelection.exit()
            .remove();
        targetSelection.enter()
            .append("path")
            .classed("canvas-annotation-stroke-target", true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke', 'black')
            .attr('fill', 'none')
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mStrokeDragging = true;
                    mStrokeDraggingId = d.strokeId;
                    mDragStartCallback(mStrokeDraggingId, e);
                }
            })
            .on('pointerenter', (e, d) => {
                if (mActive) {
                    FilterUtil.applyShadowFilter(mStrokeGroup
                        .selectAll('[stroke-id="' + d.strokeId + '"]'));
                }
            })
            .on('pointerout', (e, d) => {
                if (mActive) {
                    FilterUtil.removeShadowFilter(mStrokeGroup
                        .selectAll('[stroke-id="' + d.strokeId + '"]'));
                }
            });
        mStrokeTargetGroup.selectAll(".canvas-annotation-stroke-target")
            .attr('d', d => PathMath.getPathD(d.projectedPoints))
            .attr('stroke-width', d => Math.max(6, d.width));
    }

    function onPointerMove(coords) {
        if (mActive && mStrokeDragging) {
            mDragCallback(mStrokeDraggingId, coords);
        }
    }

    function onPointerUp(coords) {
        if (mActive && mStrokeDragging) {
            mDragEndCallback(mStrokeDraggingId, coords);

            mStrokeDragging = false;
            mStrokeDraggingId = null;
        }
    }

    function setActive(active) {
        if (active && !mActive) {
            mActive = true;
            mStrokeTargetGroup.style('visibility', "");
        } else if (!active && mActive) {
            mActive = false;
            mStrokeTargetGroup.style('visibility', "hidden");
        }
    }

    this.updateModel = updateModel;
    this.setActive = setActive;

    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}
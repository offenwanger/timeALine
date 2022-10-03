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
        .attr("id", 'stroke-view-g');

    function updateModel(model) {
        let oldModel = mModel;
        mModel = model;

        let stokesWithPathChange = [];
        oldModel.getAllTimelines().forEach(oldTimeline => {
            let newTimeline = mModel.getTimelineById(oldTimeline.id);
            if (newTimeline && !PathMath.equalsPath(oldTimeline.points, newTimeline.points)) {
                stokesWithPathChange.push(...oldTimeline.annotationStrokes.map(s => s.id));
            }
        });

        let oldStrokeData = mStrokesData;
        let oldStrokes = oldModel.getAllTimelines().reduce((arr, t) => {
            arr.push(...t.annotationStrokes);
            return arr;
        }, []);

        mStrokesData = {}

        mModel.getAllTimelines().forEach(timeline => {
            timeline.annotationStrokes.forEach(stroke => {
                let recalc = true;
                if (!stokesWithPathChange.includes(stroke.id)) {
                    let oldStroke = oldStrokes.find(s => s.id == stroke.id);
                    if (oldStroke && oldStroke.equals(stroke)) {
                        recalc = false
                    }
                }

                if (recalc) {
                    mStrokesData[stroke.id] = calculateStrokeData(timeline.points, stroke);
                } else {
                    mStrokesData[stroke.id] = oldStrokeData[stroke.id];
                }
            })
        });

        drawStrokes();
    }

    function calculateStrokeData(timelinePoints, stroke) {
        let projectedPoints = stroke.points.map(point => {
            return PathMath.getPositionForPercentAndDist(timelinePoints, point.linePercent, point.lineDist);
        })

        return { color: stroke.color, projectedPoints };
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
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
        mStrokeGroup.selectAll(".canvas-annotation-stroke")
            .attr("stroke", d => d.color)
            .attr('d', d => PathMath.getPathD(d.projectedPoints));


        let targetSelection = mStrokeTargetGroup.selectAll(".canvas-annotation-stroke-target")
            .data(Object.entries(mStrokesData).map(([id, data]) => { return { id, data } }));
        targetSelection.exit()
            .remove();
        targetSelection.enter()
            .append("path")
            .classed("canvas-annotation-stroke-target", true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr("stroke", "black")
            .attr('stroke-width', 6)
            .attr('fill', 'black')
            .attr('opacity', 0)
            .on('pointerdown', function (e, d) {
                if (mActive) {
                    mStrokeDragging = true;
                    mStrokeDraggingId = d.id;
                    mDragStartCallback(mStrokeDraggingId, e);
                }
            })
        mStrokeTargetGroup.selectAll(".canvas-annotation-stroke-target")
            .attr('d', d => PathMath.getPathD(d.data.projectedPoints));
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
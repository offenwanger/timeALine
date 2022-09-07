function StrokeController(svg) {
    let mModel = new DataStructs.DataModel();
    let mStrokesData = {}

    let mStrokeGroup = svg.append('g')
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
    }

    this.updateModel = updateModel;

}
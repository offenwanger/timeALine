function StrokeController(svg) {
    let mModel = new DataStructs.DataModel();
    let strokeData = {}

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

        let oldStrokeData = strokeData;
        let oldStrokes = oldModel.getAllTimelines().reduce((arr, t) => {
            arr.push(...t.annotationStrokes);
            return arr;
        }, []);

        strokeData = {}

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
                    strokeData[stroke.id] = calculateStrokeData(timeline.points, stroke);
                } else {
                    strokeData[stroke.id] = oldStrokeData[stroke.id];
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
        let selection = mStrokeGroup.selectAll(".annotation-stroke").data(Object.values(strokeData));
        selection.exit().remove();
        selection.enter().append("path")
            .classed("annotation-stroke", true)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr("stroke", d => d.color)
            .attr('d', d => PathMath.getPathD(d.projectedPoints));
    }

    this.updateModel = updateModel;

}
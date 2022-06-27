function DataViewController(svg) {
    let dataPointDisplayGroup = svg.append('g')
        .attr("id", 'data-point-display-g');

    let mAnnotationController = new AnnotationController(svg);
    let mPointController = new DataPointController(svg);

    function drawData(boundData) {
        mAnnotationController.drawAnnotations(boundData.filter(b => b.type == DataTypes.TEXT));
        mPointController.drawPoints(boundData.filter(b => b.type == DataTypes.NUM))
    }

    this.drawData = drawData;
    this.setTextUpdatedCallback = (callback) => mAnnotationController.setAnnotationTextUpdatedCallback(callback);
    this.setTextMovedCallback = (callback) => mAnnotationController.setAnnotationMovedCallback(callback);
    this.setAxisUpdatedCallback = (callback) => mPointController.setAxisUpdatedCallback(callback);
}

function DataPointController(svg) {
    const TAIL_POINT_COUNT = 20;

    let mAxisUpdatedCallback = () => { };

    let mDataPointGroup = svg.append('g')
        .attr("id", 'data-point-display-g');
    let mAxesGroup = svg.append('g')
        .attr("id", 'data-axis-display-g');

    function drawPoints(boundData) {
        let drawingData = []
        let tail1Data = []
        let tail2Data = []

        boundData.forEach(point => {
            let { val1, val2, dist1, dist2 } = point.axis;
            let dist = (dist2 - dist1) * (point.val - val1) / (val2 - val1) + dist1;
            let pos = PathMath.getPositionForPercentAndDist(point.line, point.linePercent, dist);

            let data = { id: point.id, x: pos.x, y: pos.y, opacity: 1, color: "red" };

            if (point.linePercent < 0) {
                tail1Data.push(data);
            } else if (point.linePercent > 1) {
                tail2Data.push(data);
            } else {
                drawingData.push(data)
            }
        });

        function filterAndFade(arr, count) {
            let n = Math.ceil(arr.length / count);
            let shuffled = arr.sort(function () { return .5 - Math.random() });
            let selected = arr.slice(0, n);
            let fade = 1;
            selected.forEach(pointData => {
                fade -= 1 / n;
                pointData.opacity = fade;
            })
            return selected;
        }

        drawingData.push(...filterAndFade(tail1Data, TAIL_POINT_COUNT));
        drawingData.push(...filterAndFade(tail2Data, TAIL_POINT_COUNT));

        let points = mDataPointGroup.selectAll('.data-display-point').data(drawingData);
        points.exit().remove();
        points.enter()
            .append('circle')
            .classed('data-display-point', true)
            .attr('r', 3.0)
            .attr('stroke', 'black');

        mDataPointGroup.selectAll('.data-display-point')
            .attr('cx', function (d) { return d.x })
            .attr('cy', function (d) { return d.y })
            .attr('fill', function (d) { return d.color })
            .style('opacity', function (d) { return d.opacity })
    }

    function drawAxes(axes) {
        axes.forEach(axis => {

        })
    }

    this.drawPoints = drawPoints;
    this.drawAxes = drawAxes;
    this.setAxisUpdatedCallback = (callback) => mAxisUpdatedCallback = callback;


    // let valRange = d3.extent(data.map(item => item.val));
    // let mLowVal = valRange[0];
    // let mHighVal = valRange[1]

    // let mGroup = svg.append('g');

    // let mPath = path;
    // let mPathLength = path.node().getTotalLength();

    // const tailPointCount = 20;

    // let dataAxisCtrlLow = mGroup.append('circle')
    //     .attr("ctrl", "low")
    //     .attr('r', 3.5)
    //     .attr('cursor', 'pointer')
    //     .call(d3.drag()
    //         .on('drag', dataAxisControlDragged)
    //         .on('end', drawData));
    // let dataAxisCtrlLowLabel = mGroup.append('text')
    //     .attr('text-anchor', 'left')
    //     .style('font-size', '16px');

    // let dataAxisCtrlHigh = mGroup.append('circle')
    //     .attr("ctrl", "high")
    //     .attr('r', 3.5)
    //     .attr('cursor', 'pointer')
    //     .call(d3.drag()
    //         .on('drag', dataAxisControlDragged)
    //         .on('end', drawData));
    // let dataAxisCtrlHighLabel = mGroup.append('text')
    //     .attr('text-anchor', 'left')
    //     .style('font-size', '16px');

    // let dataAxisLine = mGroup.append('line')
    //     .attr('stroke-width', 1.5)
    //     .attr('stroke', 'black');

    // dataAxisCtrlLowLabel.text(mLowVal).lower();
    // dataAxisCtrlHighLabel.text(mHighVal).lower();

    // drawAxis();
    // drawData();

    // function drawAxis() {
    //     let normal = PathMath.getNormalAtPercentOfPath(mPath, 0);
    //     let origin = mPath.node().getPointAtLength(0)

    //     let ctrl1Pos = PathMath.getPointAtDistanceAlongNormal(mLowValDist, normal, origin)
    //     dataAxisCtrlLow
    //         .attr('cx', ctrl1Pos.x)
    //         .attr('cy', ctrl1Pos.y);
    //     dataAxisCtrlLowLabel
    //         .attr('x', ctrl1Pos.x + 3)
    //         .attr('y', ctrl1Pos.y);

    //     let ctrl2Pos = PathMath.getPointAtDistanceAlongNormal(mHighValDist, normal, origin)
    //     dataAxisCtrlHigh
    //         .attr('cx', ctrl2Pos.x)
    //         .attr('cy', ctrl2Pos.y);
    //     dataAxisCtrlHighLabel
    //         .attr('x', ctrl2Pos.x + 3)
    //         .attr('y', ctrl2Pos.y);

    //     dataAxisLine
    //         .attr('x1', ctrl1Pos.x)
    //         .attr('y1', ctrl1Pos.y)
    //         .attr('x2', ctrl2Pos.x)
    //         .attr('y2', ctrl2Pos.y);
    // }

    // function drawData() {

    // }

    // function dataAxisControlDragged(event) {
    //     // needs to be in model coords
    //     let dragPoint = { x: event.x, y: event.y };

    //     let normal = PathMath.getNormalAtPercentOfPath(mPath, 0);
    //     let origin = mPath.node().getPointAtLength(0)

    //     let newPosition = PathMath.projectPointOntoNormal(dragPoint, normal, origin);
    //     let dist = PathMath.distancebetween(origin, newPosition.point);
    //     dist = newPosition.neg ? -1 * dist : dist;

    //     d3.select(this).attr("ctrl") == "low" ? mLowValDist = dist : mHighValDist = dist;

    //     drawAxis();
    // }

    // // accessors
    // this.updatePath = function (path) {
    //     mPath = path;
    //     mPathLength = path.node().getTotalLength();

    //     drawAxis();
    //     drawData();
    // };

    // this.remove = function () {
    //     mGroup.remove()
    // };
}

function AnnotationController(svg) {
    let mAnnotationTextUpdatedCallback = () => { };
    let mAnnotationMovedCallback = () => { };

    let mAnnotationDisplayGroup = svg.append('g')
        .attr("id", 'annotation-display-g');

    function drawAnnotations(boundData) {
        // convert annotations to annotation data
        let annotationSet = []


        boundData.forEach(binding => {
            let pos = PathMath.getPositionForPercent(binding.line, binding.linePercent);
            let annotationData = {
                note: {
                    label: binding.val,
                    wrap: 200,
                    padding: 10
                },
                x: pos.x,
                y: pos.y,
                // hack to get around the broken drag events from the new d3 version
                className: "id-" + binding.id,

                dy: binding.offset.y,
                dx: binding.offset.x,

                binding
            }

            annotationSet.push(annotationData);
        })

        const makeAnnotations = d3.annotation();
        makeAnnotations.annotations(annotationSet);
        mAnnotationDisplayGroup.call(makeAnnotations);

        d3.selectAll(".annotation")
            .on(".drag", null)
            .call(d3.drag()
                .on('drag', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = annotationSet.find(a => a.className == id);
                    annotation.dx += e.dx;
                    annotation.dy += e.dy;
                    makeAnnotations.annotations(annotationSet);
                    mAnnotationDisplayGroup.call(makeAnnotations);
                })
                .on('end', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = annotationSet.find(a => a.className == id);
                    mAnnotationMovedCallback(annotation.binding.id, { x: annotation.dx, y: annotation.dy });
                }))
            .on('dblclick', function () {
                let position = d3.select(this).select("tspan").node().getBoundingClientRect();
                let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                let annotation = annotationSet.find(a => a.className == id);
                let inputbox = d3.select("#input-box");

                inputbox
                    .style("top", Math.floor(position.y - 8) + "px")
                    .style("left", Math.floor(position.x - 8) + "px")
                    .attr("height", inputbox.property("scrollHeight"))
                    .on('input', null)
                    .on('input', function (e) {
                        annotation.note.label = inputbox.property("value");
                        mAnnotationTextUpdatedCallback(annotation.binding.id, inputbox.property("value"))
                        inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
                        makeAnnotations.annotations(annotationSet);
                        mAnnotationDisplayGroup.call(makeAnnotations);
                    }).on('change', function (e) {
                        inputbox
                            .style("top", "-200px")
                            .style("left", "-100px")
                    });

                inputbox.property("value", annotation.note.label);
                inputbox.style("height", inputbox.property("scrollHeight") + "px");
                inputbox.style("width", annotation.note.wrap + "px");

                inputbox.node().focus();
            });
    }

    this.drawAnnotations = drawAnnotations;
    this.setAnnotationTextUpdatedCallback = (callback) => mAnnotationTextUpdatedCallback = callback
    this.setAnnotationMovedCallback = (callback) => mAnnotationMovedCallback = callback;
}
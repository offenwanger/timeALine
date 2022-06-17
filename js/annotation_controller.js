function AnnotationController(svg) {
    let mAnnotationTextUpdatedCallback = () => { };
    let mAnnotationMovedCallback = () => { };

    let mAnnotationDisplayGroup = svg.append('g')
        .attr("id", 'annotation-display-g');

    function drawAnnotations(annotationsData) {
        // convert annotations to annotation data
        let annotationId = 0;
        let timelineAnnotations = []

        annotationsData.forEach(dataItem => {
            let annotationData = {
                note: {
                    label: dataItem.text,
                    wrap: 200,
                    padding: 10
                },
                x: dataItem.position.x,
                y: dataItem.position.y,
                // hack to get around the broken drag events from the new d3 version
                className: "id-" + annotationId,

                dy: dataItem.offset.y,
                dx: dataItem.offset.x,

                dataItem
            }

            annotationId++

            timelineAnnotations.push(annotationData);
        })


        const makeAnnotations = d3.annotation().accessors({
            x: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).x,
            y: d => PathMath.getPointAtPercentOfPath(timeline, d.percent).y,
        });
        makeAnnotations.annotations(timelineAnnotations);
        mAnnotationDisplayGroup.call(makeAnnotations);

        d3.selectAll(".annotation")
            .on(".drag", null)
            .call(d3.drag()
                .on('drag', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotation = timelineAnnotations.find(annotation => annotation.className == id);
                    annotation.dx += e.dx;
                    annotation.dy += e.dy;
                    makeAnnotations.annotations(timelineAnnotations);
                    mAnnotationDisplayGroup.call(makeAnnotations);
                })
                .on('end', function (e) {
                    let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                    let annotationData = timelineAnnotations.find(annotation => annotation.className == id);
                    mAnnotationMovedCallback(annotationData.dataItem.id, { x: annotationData.dx, y: annotationData.dy });
                }))
            .on('dblclick', function () {
                let position = d3.select(this).select("tspan").node().getBoundingClientRect();
                let id = d3.select(this).attr("class").split(" ").filter(cls => cls.startsWith("id-"))
                let annotation = timelineAnnotations.find(annotation => annotation.className == id);
                let inputbox = d3.select("#input-box");

                inputbox
                    .style("top", Math.floor(position.y - 8) + "px")
                    .style("left", Math.floor(position.x - 8) + "px")
                    .attr("height", inputbox.property("scrollHeight"))
                    .on('input', null)
                    .on('input', function (e) {
                        annotation.note.label = inputbox.property("value");
                        mAnnotationTextUpdatedCallback(annotation.dataItem.id, inputbox.property("value"))
                        inputbox.style("height", (inputbox.property("scrollHeight") - 4) + "px");
                        makeAnnotations.annotations(timelineAnnotations);
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
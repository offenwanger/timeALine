function DataViewController(svg) {
    let dataPointDisplayGroup = svg.append('g')
        .attr("id", 'data-point-display-g');

    let mAnnotationController = new AnnotationController(svg);

    function drawData(boundData) {
        let annotations = boundData.filter(b => b.type == DataTypes.TEXT);
        let nums = boundData.filter(b => b.type == DataTypes.NUM);

        mAnnotationController.drawAnnotations(annotations);
    }

    this.drawData = drawData;
    this.setTextUpdatedCallback = (callback) => mAnnotationController.setAnnotationTextUpdatedCallback(callback);
    this.setTextMovedCallback = (callback) => mAnnotationController.setAnnotationMovedCallback(callback);
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
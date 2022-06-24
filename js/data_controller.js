function DataPointController(svg) {
    let dataPointDisplayGroup = svg.append('g')
        .attr("id", 'data-point-display-g');

    function drawDataPoints(boundData) {
        console.log(boundData);
    }

    this.drawDataPoints = drawDataPoints;
}
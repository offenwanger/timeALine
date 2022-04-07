document.addEventListener("DOMContentLoaded", function(e) {
    let svg = d3.select("#svg_container").append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    svg.append("circle")
    .attr("cx", 10).attr("cy", 100).attr("r", 40).style("fill", "blue");
    svg.append("circle")
    .attr("cx", 50).attr("cy", 100).attr("r", 40).style("fill", "red");
    svg.append("circle")
    .attr("cx", 100).attr("cy", 100).attr("r", 40).style("fill", "green");
});

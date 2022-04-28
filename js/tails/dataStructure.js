let DataStructures = function () {
    function Timeline(points) {
        this.id = getUniqueId();
        this.path = []
        this.startPoint = { boundTimepoint: -1 };
        this.endPoint = { boundTimepoint: -1 };
        this.warpControls = []
        this.dataSets = []

        this.setPoints = function (points) {
            if (points.length < 2) throw new Error("Path too short! " + points);
            // TODO: validate path data

            this.points = points.map(item => {
                return { x: item.x, y: item.y }
            });

            this.startPoint.x = this.points[0].x;
            this.startPoint.y = this.points[0].y;

            this.endPoint.x = this.points[this.points.length - 1].x,
                this.endPoint.y = this.points[this.points.length - 1].y;

        }
        this.setPoints(points);
    }

    function WarpControl(lengthAlongLine, boundTimepoint = -1, labelOffset = { x: 10, y: 10 }) {
        this.lengthAlongLine = lengthAlongLine;
        this.boundTimepoint = boundTimepoint;
        this.labelOffset = labelOffset
    }

    function DataSet(data, distlow = 1, disthigh = 10) {
        // TODO: validate data

        this.low = distlow;
        this.high = disthigh;
        this.data = data;
    }

    return {
        Timeline,
        WarpControl,
        DataSet,
    }
}();

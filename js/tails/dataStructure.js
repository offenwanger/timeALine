let DataStructures = function () {
    function Timeline(points) {
        this.id = getUniqueId();
        this.startPoint = new CapPoint(0, 0);
        this.endPoint = new CapPoint(1, 1);
        this.timePegs = []
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

    function TimePeg(lengthAlongLine, boundTimepoint = -1, labelOffset = { x: 10, y: 10 }) {
        this.lengthAlongLine = lengthAlongLine;
        this.boundTimepoint = boundTimepoint;
        this.labelOffset = labelOffset
    }

    function CapPoint(x, y, boundTimepoint = -1, labelOffset = { x: 10, y: 10 }) {
        this.x = x;
        this.y = y;
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
        TimePeg,
        DataSet,
    }
}();

function Curve(x0, y0, cx1, cy1, cx2, cy2, x1, y1) {
    this.x0 = x0;
    this.y0 = y0;
    this.cx1 = cx1;
    this.cy1 = cy1;
    this.cx2 = cx2;
    this.cy2 = cy2;
    this.x1 = x1;
    this.y1 = y1;

    this.getControlPointCurveMapping = function () {
        return [
            [this.x0, this.y0, {point:'0', curve:this}], 
            [this.cx1, this.cy1, {point:'c1', curve:this}], 
            [this.cx2, this.cy2, {point:'c2', curve:this}], 
            [this.x1, this.y1, {point:'1', curve:this}]
        ]
    }

    this.getPointControlPointParis = function () {
        return [
            [[this.x0, this.y0], [this.cx1, this.cy1]],
            [[this.x1, this.y1], [this.cx2, this.cy2]]
        ]
    }

    this.update = function(point, value) {
        switch (point) {
            case "0":
                this.x0 = value[0];
                this.y0 = value[1];
                break;
            case "c1":
                this.cx1 = value[0];
                this.cy1 = value[1];
                break;
            case "c2":
                this.cx2 = value[0];
                this.cy2 = value[1];
                break;
            case "1":
                this.x1 = value[0];
                this.y1 = value[1];
                break;
        }
    }
}
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
            // The x and y have to be wrapped in coords else D3 tries to read them as screen coords.
            // it's really stupid. I don't know why it does that. 
            // I'm probably using it wrong. 
            { coords: { x: this.x0, y: this.y0 }, point: '0', curve: this },
            { coords: { x: this.cx1, y: this.cy1 }, point: 'c1', curve: this },
            { coords: { x: this.cx2, y: this.cy2 }, point: 'c2', curve: this },
            { coords: { x: this.x1, y: this.y1 }, point: '1', curve: this },
        ]
    }

    this.getPointControlPointParis = function () {
        return [
            [{ x: this.x0, y: this.y0 }, { x: this.cx1, y: this.cy1 }],
            [{ x: this.x1, y: this.y1 }, { x: this.cx2, y: this.cy2 }]
        ]
    }

    this.update = function (pointIndicator, newValue) {
        switch (pointIndicator) {
            case "0":
                this.x0 = newValue.x;
                this.y0 = newValue.y;
                break;
            case "c1":
                this.cx1 = newValue.x;
                this.cy1 = newValue.y;
                break;
            case "c2":
                this.cx2 = newValue.x;
                this.cy2 = newValue.y;
                break;
            case "1":
                this.x1 = newValue.x;
                this.y1 = newValue.y;
                break;
        }
    }
}
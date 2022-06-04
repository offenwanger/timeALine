let DataStructs = function () {
    let idCounter = 0;
    function getUniqueId() {
        idCounter++
        return Date.now() + "_" + idCounter;
    }

    function Timeline() {
        this.id = getUniqueId();
        this.warpPoints = [];
        this.linePath = new LinePath();
        this.dataSets = [];
        this.annotationDataset = new DataSet();
    }

    function WarpPoint(timePoint = 0, linePercent = 0, isStart = false, isEnd = false, id = null) {
        this.id = id ? id : getUniqueId();
        this.timePoint = timePoint;
        this.linePercent = linePercent;
        this.isStart = isStart;
        this.isEnd = isEnd;

        this.clone = function () {
            return new WarpPoint(this.timePoint, this.linePercent, this.isStart, this.isEnd, this.id);
        }
    }

    function LinePath() {
        this.id = getUniqueId();
        this.points = [];
    }

    function DataSet() {
        this.id = getUniqueId();
        this.table = null;
        this.timeCol = null;
        this.valCol = null;
        this.YAxis = null;
        // Array of {time = DataItem<Timebinding>, item = DataItem}
        this.data = [];
    }


    function YAxis() {
        this.id = getUniqueId();
        this.val1 = 0;
        this.dist1 = 0;
        this.val2 = 1;
        this.dist2 = 1;
        this.linePercent = 0;
    }


    function DataTable() {
        this.id = getUniqueId();
        this.dataRows = [];
        this.colTypes = [];
        this.pos = { x: 0, y: 0 };
    }


    function DataRow() {
        this.id = getUniqueId();
        this.dataItems = [];
    }

    let DataTypes = {
        TEXT: 'text',
        NUM: 'num',
        TIME_BINDING: 'timebinding'
    }

    function DataItem(type, index, val, offset = null) {
        this.id = getUniqueId();
        this.type = type;
        this.val = val;
        this.index = index;
        this.offset = offset
    }


    function TimeBinding() {
        this.id = getUniqueId();
        this.timeStamp = 0;

        // TODO: expand this to handle fuzzy time
    }

    return {
        Timeline,
        WarpPoint,
        LinePath,
        DataSet,
        YAxis,
        DataTable,
        DataRow,
        DataItem,
        TimeBinding,
        DataTypes,
    }
}();


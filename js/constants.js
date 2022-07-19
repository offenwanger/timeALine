const TAIL_LENGTH = 50;

const DataTypes = {
    TEXT: 'text',
    NUM: 'num',
    TIME_BINDING: 'timebinding',
    UNSPECIFIED: 'unspecified'
}

const DataTypesColor = {};
DataTypesColor[DataTypes.TEXT] = 'steelblue';
DataTypesColor[DataTypes.NUM] = 'green';
DataTypesColor[DataTypes.TIME_BINDING] = 'purple';

const TimeBindingTypes = {
    TIMESTRAMP: 'timestamp',
}

const SEGMENT_LABELS = {
    UNAFFECTED: 'unaffected',
    DELETED: 'deleted',
    CHANGED: 'changed'
}

const TableChange = {
    REORDER_ROWS: "reorderRows",
    REORDER_COLUMNS: "reorderColumns",
    DELETE_ROWS: "deleteRows",
    DELETE_COLUMNS: "deleteColumns",
    CREATE_ROWS: "createRows",
    CREATE_COLUMNS: "createColumns",
    UPDATE_CELLS: "updateCells",
}

class ModelStateError extends Error {
    constructor(message) {
        super(message);
        this.name = "ModelStateError";
    }
}

class DataTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = "DataTypeError";
    }
}
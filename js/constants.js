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
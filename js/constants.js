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

const TimeBindingTypes = {
    PLACE_HOLDER: 'place_holder',
    TIMESTRAMP: 'timestamp',
}
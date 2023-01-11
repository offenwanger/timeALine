const TAIL_LENGTH = 50;

// taking an int here as it might do wierd things but is less likely to cause crashes. 
const NO_LINE_PERCENT = -1;

const Mode = {
    NONE: 'noneMode',
    SELECTION: 'selection',
    LINE_DRAWING: 'drawing',
    LINE_DRAWING_EYEDROPPER: 'drawingEyedropper',
    ERASER: 'eraser',
    ERASER_TIMELINE: 'eraserTimeline',
    ERASER_STROKE: 'eraserStroke',
    ERASER_POINT: 'eraserPoint',
    ERASER_TEXT: 'eraserText',
    ERASER_PIN: 'eraserPin',
    ERASER_IMAGE: 'eraserImage',
    DEFORM: 'deform',
    SMOOTH: 'smooth',
    SCISSORS: 'scissors',
    TEXT: 'text',
    IMAGE: 'image',
    IMAGE_LINK: 'imageLink',
    PIN: 'pin',
    LENS: 'lens',
    COLOR_BRUSH: 'colorBrush',
    COLOR_BRUSH_EYEDROPPER: 'colorBrushEyedropper',
    COLOR_BUCKET: 'bucket',
    COLOR_BUCKET_EYEDROPPER: 'bucketEyedropper',
    PAN: 'pan',
    LINK: 'link',
}

const DataTypes = {
    TEXT: 'text',
    NUM: 'num',
    UNSPECIFIED: 'unspecified'
}

const Fonts = [
    'Arial, sans-serif',
    'OCR A Std, monospace',
    'Brush Script MT, Brush Script Std, cursive',
    // this should be at the bottom so when you toggle through 
    // the first time the text returns to this as the last item
    'Times, Times New Roman, serif'
]

const DataDisplayStyles = {
    POINTS: 'points',
    LINE: 'line',
    AREA: 'area',
    STREAM: 'stream'
}

const DataDisplayAlignments = {
    DYNAMIC: 'dynamic',
    FIXED: 'fixed'
}

const SEGMENT_LABELS = {
    UNAFFECTED: 'unaffected',
    DELETED: 'deleted',
    CHANGED: 'changed'
}

const TableChange = {
    REORDER_ROWS: 'reorderRows',
    REORDER_COLUMNS: 'reorderColumns',
    DELETE_ROWS: 'deleteRows',
    DELETE_COLUMNS: 'deleteColumns',
    CREATE_ROWS: 'createRows',
    CREATE_COLUMNS: 'createColumns',
    UPDATE_CELLS: 'updateCells',
}

const LineStyle = {
    STYLE_OPACITY: 'opacity',
    STYLE_DASHED: 'dashed',
}

class ModelStateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ModelStateError';
    }
}

class DataTypeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DataTypeError';
    }
}
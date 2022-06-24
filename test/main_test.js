let chai = require('chai');
let rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

describe('Test Main - Integration Test', function () {
    let enviromentVariables;
    let mainInit;
    let modelController;
    let setVariables;
    beforeEach(function () {
        if (global.d3) throw new Error("Context leaks!")

        global.document = Object.assign({
            addEventListener: function (event, callback) {
                if (event == "DOMContentLoaded") {
                    mainInit = callback;
                }
            }
        }, TestUtils.fakeDocument)

        let main = rewire('../js/main.js');
        let data_structures = rewire('../js/data_structures.js');
        let table_view_controller = rewire('../js/table_view_controller.js');
        let model_controller = rewire('../js/model_controller.js');
        let line_manipulation_tools_controller = rewire('../js/line_manipulation_tools_controller.js');
        let line_view_controller = rewire('../js/line_view_controller.js');
        let time_warp_controller = rewire('../js/time_warp_controller.js');
        let annotation_controller = rewire('../js/annotation_controller.js');
        let data_controller = rewire('../js/data_controller.js');

        let utility = rewire('../js/utility.js');

        enviromentVariables = {
            d3: Object.assign({}, TestUtils.mockD3),
            $: TestUtils.makeMockJquery(),
            Handsontable: Object.assign({}, TestUtils.mockHandsOnTable),
            window: { innerWidth: 1000, innerHeight: 800 },
            ModelController: function () {
                model_controller.__get__("ModelController").call(this);
                modelController = this;
            },
            DataStructs: data_structures.__get__("DataStructs"),
            LineViewController: line_view_controller.__get__("LineViewController"),
            TimeWarpController: time_warp_controller.__get__("TimeWarpController"),
            AnnotationController: annotation_controller.__get__("AnnotationController"),
            DataPointController: data_controller.__get__("DataPointController"),
            LineDrawingController: line_manipulation_tools_controller.__get__("LineDrawingController"),
            EraserController: line_manipulation_tools_controller.__get__("EraserController"),
            DragController: line_manipulation_tools_controller.__get__("DragController"),
            IronController: line_manipulation_tools_controller.__get__("IronController"),
            DataTableController: table_view_controller.__get__("DataTableController"),
            PathMath: utility.__get__("PathMath"),
            MathUtil: utility.__get__("MathUtil"),
            TimeWarpUtil: utility.__get__("TimeWarpUtil"),
            DataUtil: utility.__get__("DataUtil"),
            TimeBindingUtil: utility.__get__("TimeBindingUtil"),
        }

        setVariables = function () {
            main.__set__(enviromentVariables);
        }

        setVariables();
    });

    afterEach(function (done) {
        Object.keys(enviromentVariables).forEach((key) => {
            delete global[key];
        })
        delete enviromentVariables;
        delete global.document;
        delete modelController;

        done();
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            mainInit();
        });
    })

    describe('draw line test', function () {
        it('should draw a line', function () {
            let onDrawLineClicked = null;
            let onLineDragStart = null;
            let onLineDrag = null;
            let onLineDragEnd = null;

            let lineDrawingG = Object.assign({}, TestUtils.mockElement);
            lineDrawingG.append = function (type) {
                if (type == 'path') {
                    let p = Object.assign({}, TestUtils.mockElement);
                    p.node = () => {
                        let node = Object.assign({}, TestUtils.fakeSVGPath)
                        node.d = this.attrs.d;
                        return node;
                    };
                    return p;
                } else return this;
            }
            lineDrawingG.call = function (drag) {
                if (onLineDragStart) return;
                onLineDragStart = drag.start;
                onLineDrag = drag.drag;
                onLineDragEnd = drag.end;
                return this;
            };

            let mockElement = Object.assign({}, TestUtils.mockElement);
            mockElement.attr = function (attr, val) {
                if (attr == "id" && val == "line-drawing-g") {
                    return lineDrawingG;
                } else return this;
            }

            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);

            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#line-drawing-button") {
                    onDrawLineClicked = func
                }
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            setVariables();
            mainInit();

            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onLineDragStart, null);
            assert.notEqual(onLineDrag, null);
            assert.notEqual(onLineDragEnd, null);

            onDrawLineClicked();

            onLineDragStart()
            onLineDrag({ x: 100, y: 100 });
            onLineDrag({ x: 110, y: 100 });
            onLineDrag({ x: 120, y: 100 });
            onLineDrag({ x: 150, y: 102 });
            onLineDrag({ x: 90, y: 102 });
            onLineDrag({ x: 40, y: 103 });
            onLineDrag({ x: 10, y: 105 });
            onLineDragEnd({ x: 10, y: 105 });

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 5)

            onLineDragStart()
            onLineDrag({ x: 10, y: 10 });
            onLineDrag({ x: 11, y: 10 });
            onLineDrag({ x: 1, y: 15 });
            onLineDragEnd({ x: 1, y: 15 });

            assert.equal(modelController.getAllTimelines().length, 2);
            assert.equal(modelController.getAllTimelines()[1].linePath.points.length, 2)

            onLineDragStart()
            onLineDragEnd({ x: 1, y: 15 });

            assert.equal(modelController.getAllTimelines().length, 2);
        });
    })

    describe('link data test', function () {
        it('should link non-blank data cell', function () {
            let onLinkClicked = null;
            let onDrawLineClicked = null;
            let onAddDatasheetClicked = null;
            let onLineTargetClicked = null;
            let onLineDragStart = null;
            let onLineDrag = null;
            let onLineDragEnd = null;
            let onCellChanged = null;

            let lineDrawingG = Object.assign({}, TestUtils.mockElement);
            lineDrawingG.append = function (type) {
                if (type == 'path') {
                    let p = Object.assign({}, TestUtils.mockElement);
                    p.node = () => {
                        let node = Object.assign({}, TestUtils.fakeSVGPath)
                        node.d = this.attrs.d;
                        return node;
                    };
                    return p;
                } else return this;
            }
            lineDrawingG.call = function (drag) {
                if (onLineDragStart) return;
                onLineDragStart = drag.start;
                onLineDrag = drag.drag;
                onLineDragEnd = drag.end;
                return this;
            };

            let timelineTarget = Object.assign({}, TestUtils.mockElement);
            timelineTarget.on = function (e, func) {
                if (e == "click") {
                    onLineTargetClicked = func;
                }
            }

            let mockElement = Object.assign({}, TestUtils.mockElement);
            mockElement.attr = function (attr, val) {
                if (attr == "id" && val == "line-drawing-g") {
                    return lineDrawingG;
                } else return this;
            }
            mockElement.classed = function (classed) {
                if (classed == "timelineTarget") {
                    return timelineTarget;
                } else return this;
            }

            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);

            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#line-drawing-button") {
                    onDrawLineClicked = func
                }

                if (this.id == "#link-button") {
                    onLinkClicked = func
                }

                if (this.id == "#add-datasheet-button") {
                    onAddDatasheetClicked = func
                }
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            enviromentVariables.Handsontable = function (div, init) {
                onCellChanged = init.afterChange;
                return {
                    getSelected: function () {
                        return [
                            [0, 0, 2, 0],
                            [0, 0, 1, 1]
                        ]
                    }
                }
            }

            setVariables();
            mainInit();

            assert.notEqual(onAddDatasheetClicked, null);
            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onLinkClicked, null);
            assert.notEqual(onLineDragStart, null);
            assert.notEqual(onLineDrag, null);
            assert.notEqual(onLineDragEnd, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 2);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "timeCell"],
                [0, 1, "", "10"],
                [1, 1, "", "20"],
                [2, 1, "", "text1"],
                [2, 2, "", "text2"],
            ])

            onDrawLineClicked();

            onLineDragStart()
            onLineDrag({ x: 100, y: 100 });
            onLineDrag({ x: 110, y: 100 });
            onLineDrag({ x: 120, y: 100 });
            onLineDrag({ x: 150, y: 102 });
            onLineDrag({ x: 90, y: 102 });
            onLineDrag({ x: 40, y: 103 });
            onLineDrag({ x: 10, y: 105 });
            onLineDragEnd({ x: 10, y: 105 });

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 5)
            assert.notEqual(onLineTargetClicked, null);

            onLinkClicked();
            onLineTargetClicked({ x: 150, y: 102 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });

            // won't bind the two time cols.
            assert.equal(modelController.getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getBoundData().length, 3);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val1, 10);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val2, 20);

        });
    })
});
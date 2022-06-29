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
        let data_controller = rewire('../js/data_controller.js');

        let utility = rewire('../js/utility.js');

        enviromentVariables = {
            d3: Object.assign({}, TestUtils.mockD3),
            $: TestUtils.makeMockJquery(),
            Handsontable: TestUtils.makeMockHandsontable,
            window: { innerWidth: 1000, innerHeight: 800 },
            ModelController: function () {
                model_controller.__get__("ModelController").call(this);
                modelController = this;
            },
            DataStructs: data_structures.__get__("DataStructs"),
            LineViewController: line_view_controller.__get__("LineViewController"),
            TimeWarpController: time_warp_controller.__get__("TimeWarpController"),
            DataViewController: data_controller.__get__("DataViewController"),
            AnnotationController: data_controller.__get__("AnnotationController"),
            LineDrawingController: line_manipulation_tools_controller.__get__("LineDrawingController"),
            EraserController: line_manipulation_tools_controller.__get__("EraserController"),
            DragController: line_manipulation_tools_controller.__get__("DragController"),
            IronController: line_manipulation_tools_controller.__get__("IronController"),
            DataTableController: table_view_controller.__get__("DataTableController"),
            PathMath: utility.__get__("PathMath"),
            MathUtil: utility.__get__("MathUtil"),
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

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);

            setVariables();
            mainInit();

            drawLineFunc([{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 120, y: 100 }, { x: 150, y: 102 }, { x: 90, y: 102 }, { x: 40, y: 103 }, { x: 10, y: 105 }]);

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 5)

            drawLineFunc([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 1, y: 15 }]);

            assert.equal(modelController.getAllTimelines().length, 2);
            assert.equal(modelController.getAllTimelines()[1].linePath.points.length, 2)

            drawLineFunc([]);

            assert.equal(modelController.getAllTimelines().length, 2);
        });
    })

    describe('link data test', function () {
        it('should link non-blank data cell', function () {
            let onLinkClicked = null;
            let onAddDatasheetClicked = null;
            let onCellChanged = null;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#link-button") {
                    onLinkClicked = func
                } else if (this.id == "#add-datasheet-button") {
                    onAddDatasheetClicked = func
                } else onFunc.call(this, e, func);
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            enviromentVariables.Handsontable = function (div, init) {
                onCellChanged = init.afterChange;
                return {
                    getSelected: function () {
                        return [
                            [0, 0, 0, 2],
                            [0, 0, 1, 1]
                        ]
                    }
                }
            }

            setVariables();
            mainInit();

            assert.notEqual(onAddDatasheetClicked, null);
            assert.notEqual(onLinkClicked, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 1);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "timeCell"],
                [0, 1, "", "10"],
                [1, 1, "", "20"],
                [2, 1, "", "text1"],
                [2, 2, "", "text2"],
            ])

            drawLineFunc([{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 120, y: 100 }, { x: 150, y: 102 }, { x: 90, y: 102 }, { x: 40, y: 103 }, { x: 10, y: 105 }]);

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 5)

            onLinkClicked();
            clickLineFunc({ x: 150, y: 102 }, modelController.getAllTimelines()[0]);
            
            // won't bind the two time cols.
            assert.equal(modelController.getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getBoundData().length, 3);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val1, 10);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val2, 20);

        });
    });

    describe('comment test', function () {
        it('should add a comment to a line', function () {
            let onCommentClicked = null;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#comment-button") {
                    onCommentClicked = func
                } else onFunc.call(this, e, func);
            }

            let wasCalled = false;
            let mockAnnotation = Object.assign({}, TestUtils.mockAnnotation);
            mockAnnotation.annotations = function (result) {
                if (result.length == 3) {
                    wasCalled = true;
                    // the annotation should be where we clicked
                    expect(result.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
                    expect(result.map(r => Math.round(r.y)).sort()).to.eql([100, 102, 105]);
                }
            }
            enviromentVariables.d3.annotation = () => mockAnnotation;

            setVariables();
            mainInit();

            assert.notEqual(onCommentClicked, null);

            drawLineFunc([{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 120, y: 100 }, { x: 150, y: 102 }, { x: 90, y: 102 }, { x: 40, y: 103 }, { x: 10, y: 105 }]);

            assert.equal(modelController.getAllTimelines().length, 1);

            onCommentClicked();
            clickLineFunc({ x: 100, y: 100 },  modelController.getAllTimelines()[0]);
            clickLineFunc({ x: 10, y: 105 },  modelController.getAllTimelines()[0]);
            clickLineFunc({ x: 150, y: 102 },  modelController.getAllTimelines()[0]);
            
            assert.equal(modelController.getBoundData().length, 3);
            assert.equal(wasCalled, true);
        });

        it('should move a comment', function () {
            let onCommentClicked = null;
            let onCommentDrag = null;
            let onCommentDragEnd = null;
            let annotationData;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);

            let mockAnnotation = Object.assign({}, TestUtils.mockAnnotation);
            mockAnnotation.annotations = function (data) {
                annotationData = data;
                return this;
            }
            enviromentVariables.d3.annotation = () => mockAnnotation;

            let mockAnnotationsSelection = Object.assign({}, TestUtils.mockElement);
            mockAnnotationsSelection.call = function (drag) {
                onCommentDrag = drag.drag;
                onCommentDragEnd = drag.end;
                return this;
            }
            mockAnnotationsSelection.attr = function (name, val = null) {
                if (name == 'class') return annotationData[0].className;

                if (val != null) {
                    this.attrs[name] = val;
                    return this;
                } else return this.attrs[name];
            };

            enviromentVariables.d3.selectAll = () => Object.assign({}, mockAnnotationsSelection);
            enviromentVariables.d3.select = (selection) => {
                if (selection == '#svg_container') return Object.assign({}, mockSVG);
                else return mockAnnotationsSelection;
            };

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#comment-button") {
                    onCommentClicked = func
                } else onFunc.call(this, e, func)
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            setVariables();
            mainInit();

            assert.notEqual(onCommentClicked, null);

            drawLineFunc([{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 120, y: 100 }, { x: 150, y: 102 }, { x: 90, y: 102 }, { x: 40, y: 103 }, { x: 10, y: 105 }]);

            assert.equal(modelController.getAllTimelines().length, 1);

            onCommentClicked();
            clickLineFunc({ x: 150, y: 102 }, modelController.getAllTimelines()[0]);

            assert.equal(modelController.getBoundData().length, 1);

            assert.notEqual(onCommentDrag, null);
            assert.notEqual(onCommentDragEnd, null);

            onCommentDrag({ dx: 10, dy: 10 });
            onCommentDragEnd({ dx: 0, dy: 0 });

            assert.equal(modelController.getBoundData().length, 1);

            expect(modelController.getBoundData()[0].offset).to.eql({ x: 20, y: 20 });
        });
    })


    describe('data test', function () {
        it('should draw data on the line', function () {
            let onAddDatasheetClicked = null;
            let onCellChanged = null;

            let onLinkClicked = null;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);

            let wasCalled = false;
            let mockDataSelection = Object.assign({}, TestUtils.mockElement);
            mockDataSelection.data = function (result) {
                if (result.length > 0) {
                    wasCalled = true;
                    assert.equal(result.length, 2);
                    // the x start and end
                    expect(result.map(r => Math.floor(r.x))).to.eql([0, 100]);
                    // the initial value of 10 plus 30 and plus 100
                    expect(result.map(r => Math.floor(r.y))).to.eql([40, 110]);
                }
                return this;
            }
            mockElement.selectAll = function (selector) {
                if (selector == ".data-display-point") return mockDataSelection;
                else return this;
            }

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#link-button") {
                    onLinkClicked = func
                } else if (this.id == "#add-datasheet-button") {
                    onAddDatasheetClicked = func
                } else if (this.id == "#comment-button") {
                    onCommentClicked = func
                } else return onFunc.call(this, e, func);
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            enviromentVariables.Handsontable = function (div, init) {
                onCellChanged = init.afterChange;
                return {
                    getSelected: function () {
                        return [
                            [0, 0, 1, 1]
                        ]
                    }
                }
            }

            setVariables();
            mainInit();

            assert.notEqual(onAddDatasheetClicked, null);

            assert.notEqual(onLinkClicked, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 1);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            drawLineFunc([{ x: 0, y: 10 }, { x: 100, y: 10 }]);

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 3)

            onLinkClicked();
            clickLineFunc({ x: 50, y: 50 }, modelController.getAllTimelines()[0]);

            // won't bind the two time cols.
            assert.equal(modelController.getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getBoundData().length, 2);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val1, 15);
            assert.equal(modelController.getBoundData().find(item => item.axis).axis.val2, 25);

            assert.equal(wasCalled, true);
        });

        it('should update the axis', function () {
            let onAddDatasheetClicked = null;
            let onCellChanged = null;

            let onLinkClicked = null;

            let onControlDrag = null;
            let onControlDragEnd = null;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);
    
            let controlPointData;

            let controlPointSelection = Object.assign({}, TestUtils.mockElement);
            controlPointSelection.data = function (data) {
                controlPointData = data;
                return this;
            }
            controlPointSelection.call = function (drag) {
                if (onControlDrag) return;
                onControlDrag = drag.drag;
                onControlDragEnd = drag.end;
                return this;
            };
            
            mockElement.selectAll = function (selection) {
                if (selection == '.axis-control-circle') {
                    return controlPointSelection;
                } else return this;
            }

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#link-button") {
                    onLinkClicked = func
                } else if (this.id == "#add-datasheet-button") {
                    onAddDatasheetClicked = func
                } else if (this.id == "#comment-button") {
                    onCommentClicked = func
                } else return onFunc.call(this, e, func);
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            enviromentVariables.Handsontable = function (div, init) {
                onCellChanged = init.afterChange;
                return {
                    getSelected: function () {
                        return [
                            [0, 0, 1, 1]
                        ]
                    }
                }
            }

            setVariables();
            mainInit();

            assert.notEqual(onAddDatasheetClicked, null);

            assert.notEqual(onLinkClicked, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 1);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            drawLineFunc([{ x: 0, y: 10 }, { x: 100, y: 10 }]);

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 3)

            onLinkClicked();
            clickLineFunc({ x: 50, y: 50 }, modelController.getAllTimelines()[0]);

            assert.notEqual(onControlDrag, null);
            assert.notEqual(onControlDragEnd, null);

            onControlDrag({ x: 0, y: 50 }, controlPointData[0])
            onControlDragEnd({ x: 0, y: 50 }, controlPointData[0])
            assert.equal(controlPointData.length, 2);

            assert.equal(modelController.getBoundData()[0].axis.dist1, 40);

        });
    })

    describe('warp data tests', function () {
        it('should link non-blank data cell', function () {
            let onPinClicked = null;

            let mockElement = Object.assign({}, TestUtils.mockElement);
            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);

            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = () => Object.assign({}, mockSVG);
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            let drawLineFunc = testLineDraw(mockElement, mockJqueryElement);
            let clickLineFunc = testLineClick(mockElement);

            let onFunc = mockJqueryElement.on;
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#pin-button") {
                    onPinClicked = func
                } else onFunc.call(this, e, func);
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            setVariables();
            mainInit();

            assert.notEqual(onPinClicked, null);

            drawLineFunc([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            onPinClicked();
            clickLineFunc({ x: 150, y: 102 }, modelController.getAllTimelines()[0]);
            clickLineFunc({ x: 125, y: 101 }, modelController.getAllTimelines()[0]);
            clickLineFunc({ x: 175, y: 103 }, modelController.getAllTimelines()[0]);

            assert.equal(modelController.getAllTimelines()[0].warpBindings.length, 3);
            expect(modelController.getAllTimelines()[0].warpBindings.map(w =>Math.round(w.linePercent*100)/100).sort()).to.eql([0.25, 0.50, 0.75]);
            assert.equal(modelController.getBoundData().length, 0);
        });
    })
});

function testLineDraw(mockElement, mockJqueryElement) {
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

    let attrFunc = mockElement.attr;
    mockElement.attr = function (attr, val) {
        if (attr == "id" && val == "line-drawing-g") {
            return lineDrawingG;
        } else return attrFunc.call(this, attr, val);
    }

    let onFunc = mockJqueryElement.on;
    mockJqueryElement.on = function (e, func) {
        if (this.id == "#line-drawing-button") {
            onDrawLineClicked = func
        } else onFunc.call(this, e, func);
    }

    return function (points) {
        onDrawLineClicked();
        assert.notEqual(onDrawLineClicked, null, "onDrawLineClicked not set");
        assert.notEqual(onLineDragStart, null, "onLineDragStart not set");
        assert.notEqual(onLineDrag, null, "onLineDrag not set");
        assert.notEqual(onLineDragEnd, null, "onLineDragEnd not set");

        onLineDragStart()
        points.forEach(point => {
            onLineDrag(point);
        })
        onLineDragEnd(points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 });
        onDrawLineClicked();
    };

}

function testLineClick(mockElement) {
    let onLineTargetClicked = null;

    let timelineTarget = Object.assign({}, TestUtils.mockElement);
    timelineTarget.on = function (e, func) {
        if (e == "click") {
            onLineTargetClicked = func;
        }
    }

    let classedFunc = mockElement.classed;
    mockElement.classed = function (classed, val) {
        if (classed == "timelineTarget") {
            return timelineTarget;
        } else return classedFunc.call(this, classed, val);
    }

    return function(coords, timeline) {
        assert.notEqual(onLineTargetClicked, null, "onLineTargetClicked not set")

        onLineTargetClicked(coords, { id: timeline.id, points: timeline.linePath.points });
    }

}
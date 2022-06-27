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
            Handsontable: TestUtils.makeMockHandsOnTable,
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
                            [0, 0, 0, 2],
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
            assert.equal(modelController.getAllTables().length, 1);
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
    });

    describe('comment test', function () {
        it('should add a comment to a line', function () {
            let onCommentClicked = null;
            let onDrawLineClicked = null;
            let onLineTargetClicked = null;
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

                if (this.id == "#comment-button") {
                    onCommentClicked = func
                }
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

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

            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onCommentClicked, null);
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
            assert.notEqual(onLineTargetClicked, null);

            onCommentClicked();
            onLineTargetClicked({ x: 100, y: 100 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });
            onLineTargetClicked({ x: 10, y: 105 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });
            onLineTargetClicked({ x: 150, y: 102 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });

            assert.equal(modelController.getBoundData().length, 3);
            assert.equal(wasCalled, true);
        });

        it('should move a comment', function () {
            let onCommentClicked = null;
            let onDrawLineClicked = null;
            let onLineTargetClicked = null;
            let onLineDragStart = null;
            let onLineDrag = null;
            let onLineDragEnd = null;
            let onCommentDrag = null;
            let onCommentDragEnd = null;
            let annotationData;

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
            },
                enviromentVariables.d3.selectAll = () => Object.assign({}, mockAnnotationsSelection);

            let mockSVG = Object.assign({}, TestUtils.mockSvg);
            mockSVG.append = () => Object.assign({}, mockElement);
            enviromentVariables.d3.select = (selection) => {
                if (selection == '#svg_container') return Object.assign({}, mockSVG);
                else return mockAnnotationsSelection;
            };

            let mockJqueryElement = Object.assign({}, TestUtils.mockJqueryElement);
            mockJqueryElement.on = function (e, func) {
                if (this.id == "#line-drawing-button") {
                    onDrawLineClicked = func
                }

                if (this.id == "#comment-button") {
                    onCommentClicked = func
                }
            }
            enviromentVariables.$ = TestUtils.makeMockJquery(mockJqueryElement);

            setVariables();
            mainInit();

            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onCommentClicked, null);
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
            assert.notEqual(onLineTargetClicked, null);

            onCommentClicked();
            onLineTargetClicked({ x: 150, y: 102 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });

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

            let onDrawLineClicked = null;
            let onLineDragStart = null;
            let onLineDrag = null;
            let onLineDragEnd = null;

            let onLinkClicked = null;
            let onLineTargetClicked = null;

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

                if (this.id == "#comment-button") {
                    onCommentClicked = func
                }
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

            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onLineDragStart, null);
            assert.notEqual(onLineDrag, null);
            assert.notEqual(onLineDragEnd, null);

            assert.notEqual(onLinkClicked, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 1);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            onDrawLineClicked();

            onLineDragStart()
            onLineDrag({ x: 0, y: 10 });
            onLineDrag({ x: 100, y: 10 });
            onLineDragEnd({ x: 100, y: 10 });

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 3)
            assert.notEqual(onLineTargetClicked, null);

            onLinkClicked();
            onLineTargetClicked({ x: 50, y: 50 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });

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

            let onDrawLineClicked = null;
            let onLineDragStart = null;
            let onLineDrag = null;
            let onLineDragEnd = null;

            let onLinkClicked = null;
            let onLineTargetClicked = null;

            let onControlDrag = null;
            let onControlDragEnd = null;

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

            let controlPointData;

            let controlPointSelection = Object.assign({}, TestUtils.mockElement);
            controlPointSelection.data = function(data) {
                controlPointData = data;
                return this;
            }
            controlPointSelection.call = function (drag) {
                if (onControlDrag) return;
                onControlDrag = drag.drag;
                onControlDragEnd = drag.end;
                return this;
            };

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
            mockElement.selectAll= function (selection) {
                if(selection == '.axis-control-circle') {
                    return controlPointSelection;
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

                if (this.id == "#comment-button") {
                    onCommentClicked = func
                }
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

            assert.notEqual(onDrawLineClicked, null);
            assert.notEqual(onLineDragStart, null);
            assert.notEqual(onLineDrag, null);
            assert.notEqual(onLineDragEnd, null);

            assert.notEqual(onLinkClicked, null);

            onAddDatasheetClicked();
            assert.equal(modelController.getAllTables().length, 1);
            assert.notEqual(onCellChanged, null);

            onCellChanged([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            onDrawLineClicked();

            onLineDragStart()
            onLineDrag({ x: 0, y: 10 });
            onLineDrag({ x: 100, y: 10 });
            onLineDragEnd({ x: 100, y: 10 });

            assert.equal(modelController.getAllTimelines().length, 1);
            assert.equal(modelController.getAllTimelines()[0].linePath.points.length, 3)
            assert.notEqual(onLineTargetClicked, null);

            onLinkClicked();
            onLineTargetClicked({ x: 50, y: 50 }, { id: modelController.getAllTimelines()[0].id, points: modelController.getAllTimelines()[0].linePath.points });

            assert.notEqual(onControlDrag, null);
            assert.notEqual(onControlDragEnd, null);

            onControlDrag({ x: 0, y: 50 }, controlPointData[0])
            onControlDragEnd({ x: 0, y: 50 }, controlPointData[0])
            assert.equal(controlPointData.length, 2);

            assert.equal(modelController.getBoundData()[0].axis.dist1, 40);

        });
    })
});
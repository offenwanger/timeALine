let chai = require('chai');
let rewire = require('rewire');

let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();


describe('Test LayoutController', function () {
    let getDragController;
    let mockSvg;
    let enviromentVariables;
    let mockElement

    beforeEach(function (done) {
        let line_manipulation_tools_controller = rewire('../js/line_manipulation_tools_controller.js');

        mockElement = {
            attrs: {},
            styles: {},
            innerData: {},
            attr: function (name, val = null) {
                if (val != null) {
                    this.attrs[name] = val;
                    return this;
                } else return this.attrs[name];
            },
            style: function (name, val = null) {
                if (val != null) {
                    this.styles[name] = val;
                    return this;
                } else return this.styles[name];
            },
            classed: function () { return this; },
            call: function () { return this; },
            on: function () { return this; },
            append: function () { return Object.assign({}, mockElement) },
            selectAll: function () { return Object.assign({}, mockElement) },
            remove: () => { },
            data: function (data) { innerData = data; return this; },
            exit: function () { return Object.assign({}, mockElement) },
            enter: function () { return Object.assign({}, mockElement) },
        };

        mockSvg = {
            append: () => Object.assign({}, mockElement),
            attr: () => { return 10 },
        }

        mockDrag = {
            on: function () { return this; }
        }

        mockD3 = {
            line: () => {
                return {
                    x: function () { return this },
                    y: function () { return this },
                    curve: function () { return function (val) { return val } },
                }
            },
            curveCatmullRom: { alpha: () => { } },
            drag: () => Object.assign({}, mockDrag),
        };

        let utility = rewire('../js/utility.js');

        enviromentVariables = {
            PathMath: utility.__get__('PathMath'),
            MathUtil: utility.__get__('MathUtil'),
            d3: mockD3,
            document: TestUtils.fakeDocument,
        }

        getDragController = function () {
            line_manipulation_tools_controller.__set__(enviromentVariables);
            let DragController = line_manipulation_tools_controller.__get__('DragController');
            return new DragController(mockSvg);
        }

        done();
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDragController();
        })
    });

    describe('drag test', function () {
        it('should start drag without error', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "id1", points: [
                    { x: 0, y: 0 },
                    { x: 10, y: 15 },
                    { x: 5, y: 20 }]
            }, {
                id: "id1", points: [
                    { x: 10, y: 10 },
                    { x: 15, y: 10 },
                    { x: 15, y: 15 }]
            }])
            dragController.setActive(true);
            dragStart({ x: 10, y: 10 });
        })
    });

    describe('drag test', function () {
        it('should drag start of line without error', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = dragStart ? dragStart : func;
                        break;
                    case "drag":
                        drag = drag ? drag : func;
                        break;
                    case "end":
                        dragEnd = dragEnd ? dragEnd : func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "id1", points: [
                    { x: -10, y: -10 },
                    { x: -10, y: -15 },
                    { x: -5, y: -20 }]
            }, {
                id: "id2", points: [
                    { x: 10, y: 10 },
                    { x: 20, y: 20 },
                    { x: 30, y: 30 }]
            }])
            dragController.setActive(true);
            let called = false;
            dragController.setLineModifiedCallback((result) => {
                assert.equal(result[0].newSegments[0][0].x, 15)
                assert.equal(result[0].newSegments[0][0].y, 15)
                called = true;
            })

            dragStart({ x: 10, y: 10 });
            drag({ x: 15, y: 15 });
            dragEnd({ x: 15, y: 15 });

            assert.equal(called, true);
        });

        describe('drag test', function () {
            it('should drag end of line without error', function () {
                let dragStart, drag, dragEnd;
                mockDrag.on = function (event, func) {
                    switch (event) {
                        case "start":
                            dragStart = dragStart ? dragStart : func;
                            break;
                        case "drag":
                            drag = drag ? drag : func;
                            break;
                        case "end":
                            dragEnd = dragEnd ? dragEnd : func;
                            break;
                    }
                    return this;
                }
                let dragController = getDragController();
                dragController.linesUpdated([{
                    id: "id1", points: [
                        { x: -10, y: -10 },
                        { x: -10, y: -15 },
                        { x: -5, y: -20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 20, y: 20 },
                        { x: 30, y: 30 }]
                }])
                dragController.setActive(true);
                let called = false;
                dragController.setLineModifiedCallback((result) => {
                    assert.equal(result[0].newSegments[1][2].x, 5)
                    assert.equal(result[0].newSegments[1][2].y, -2)
                    called = true;
                })

                dragStart({ x: -5, y: -28 });
                drag({ x: 5, y: -8 });
                dragEnd({ x: 5, y: -10 });

                assert.equal(called, true);
            });
        });

        it('should drag points in middle of line', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = dragStart ? dragStart : func;
                        break;
                    case "drag":
                        drag = drag ? drag : func;
                        break;
                    case "end":
                        dragEnd = dragEnd ? dragEnd : func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "1654867647735_5", points: [
                    { x: 121, y: 306 },
                    { x: 170.47430419921875, y: 313.05169677734375 },
                    { x: 220.34288024902344, y: 316.6365661621094 },
                    { x: 270.1659240722656, y: 320.81927490234375 },
                    { x: 320.0511169433594, y: 323.1343994140625 },
                    { x: 369.8844909667969, y: 319.5586242675781 },
                    { x: 419.21697998046875, y: 311.4256286621094 },
                    { x: 468.8236083984375, y: 305.245361328125 },
                    { x: 518.4913940429688, y: 299.5127258300781 },
                    { x: 568.2349853515625, y: 294.8827209472656 },
                    { x: 618.2064208984375, y: 293.8427734375 },
                    { x: 667.8211669921875, y: 287.9786682128906 },
                    { x: 682, y: 282 }]
            }]);
            dragController.setActive(true);
            let called = false;
            dragController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].length, 3);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].length, 5);
                expect(result[0].newSegments[1][2].x).to.be.closeTo(14.2, .1);
                expect(result[0].newSegments[1][2].y).to.be.closeTo(13.4, .1);
                called = true;
            })

            dragStart({ x: 420, y: 313 });
            drag({ x: 100, y: 100 });
            dragEnd({ x: 15, y: 15 });

            assert.equal(called, true);
        });

        it('should create appropriate new points for line with no points', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = dragStart ? dragStart : func;
                        break;
                    case "drag":
                        drag = drag ? drag : func;
                        break;
                    case "end":
                        dragEnd = dragEnd ? dragEnd : func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "1654867647735_5", points: [
                    { x: 0, y: 40 },
                    { x: 0, y: 0 },
                    { x: 40, y: 40 },
                    { x: 40, y: 0 }]
            }]);
            dragController.setActive(true);
            let called = false;
            dragController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].length, 2);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].length, 5);
                expect(result[0].newSegments[1][0].x).to.be.closeTo(0, .1);
                expect(result[0].newSegments[1][0].y).to.be.closeTo(0, .1);

                expect(result[0].newSegments[1][1].x).to.be.closeTo(13.4, .1);
                expect(result[0].newSegments[1][1].y).to.be.closeTo(13.4, .1);

                expect(result[0].newSegments[1][2].x).to.be.closeTo(20, .1);
                expect(result[0].newSegments[1][2].y).to.be.closeTo(20, .1);

                expect(result[0].newSegments[1][3].x).to.be.closeTo(26.5, .1);
                expect(result[0].newSegments[1][3].y).to.be.closeTo(26.5, .1);

                expect(result[0].newSegments[1][4].x).to.be.closeTo(40, .1);
                expect(result[0].newSegments[1][4].y).to.be.closeTo(40, .1);
                called = true;
            })

            let clickPoint = { x: 21, y: 19 };
            dragStart(clickPoint);
            dragEnd(clickPoint);

            assert.equal(called, true);
        });

        it('should create appropriate new points for line with points', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = dragStart ? dragStart : func;
                        break;
                    case "drag":
                        drag = drag ? drag : func;
                        break;
                    case "end":
                        dragEnd = dragEnd ? dragEnd : func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "1654867647735_5", points: [
                    { x: 0, y: 40 },
                    { x: 0, y: 0 },
                    { x: 20, y: 20 },
                    { x: 40, y: 40 },
                    { x: 40, y: 0 }]
            }]);
            dragController.setActive(true);
            let called = false;
            dragController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].length, 3);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].length, 5);
                expect(result[0].newSegments[1][0].x).to.be.closeTo(0, .1);
                expect(result[0].newSegments[1][0].y).to.be.closeTo(0, .1);

                expect(result[0].newSegments[1][1].x).to.be.closeTo(13.4, .1);
                expect(result[0].newSegments[1][1].y).to.be.closeTo(13.4, .1);

                expect(result[0].newSegments[1][2].x).to.be.closeTo(20, .1);
                expect(result[0].newSegments[1][2].y).to.be.closeTo(20, .1);

                expect(result[0].newSegments[1][3].x).to.be.closeTo(26.5, .1);
                expect(result[0].newSegments[1][3].y).to.be.closeTo(26.5, .1);

                expect(result[0].newSegments[1][4].x).to.be.closeTo(40, .1);
                expect(result[0].newSegments[1][4].y).to.be.closeTo(40, .1);
                called = true;
            })

            let clickPoint = { x: 21, y: 19 };
            dragStart(clickPoint);
            dragEnd(clickPoint);

            assert.equal(called, true);
        });

        it('should drag line between points', function () {
            let dragStart, drag, dragEnd;
            mockDrag.on = function (event, func) {
                switch (event) {
                    case "start":
                        dragStart = dragStart ? dragStart : func;
                        break;
                    case "drag":
                        drag = drag ? drag : func;
                        break;
                    case "end":
                        dragEnd = dragEnd ? dragEnd : func;
                        break;
                }
                return this;
            }
            let dragController = getDragController();
            dragController.linesUpdated([{
                id: "1654867647735_5", points: [
                    { x: 57, y: 292 },
                    { x: 106.71902465820312, y: 287.2408142089844 },
                    { x: 156.71688842773438, y: 286.9873962402344 },
                    { x: 206.7021942138672, y: 286.83392333984375 },
                    { x: 256.36041259765625, y: 281.0871276855469 },
                    { x: 305.69073486328125, y: 272.94775390625 },
                    { x: 355.42828369140625, y: 268.02215576171875 },
                    { x: 405.401611328125, y: 266.8685607910156 },
                    { x: 455.37518310546875, y: 266.03228759765625 },
                    { x: 505.30194091796875, y: 266.1291809082031 },
                    { x: 554.2832641601562, y: 275.4727783203125 },
                    { x: 603.6814575195312, y: 280.8619079589844 },
                    { x: 652.7205810546875, y: 271.8529052734375 },
                    { x: 702.0360717773438, y: 263.6290283203125 },
                    { x: 750.932861328125, y: 254.02215576171875 },
                    { x: 778, y: 243 }]
            }]);
            dragController.setActive(true);
            let called = false;
            dragController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].length, 2);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].length, 5);
                expect(result[0].newSegments[1][2].x).to.be.closeTo(177.9, .1);
                expect(result[0].newSegments[1][2].y).to.be.closeTo(67.5, .1);
                called = true;
            })

            dragStart({ x: 378, y: 265 });
            drag({ x: 178, y: 65 });
            dragEnd({ x: 178, y: 65 });

            assert.equal(called, true);
        });
    });
});

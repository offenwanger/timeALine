let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            integrationEnv.mainInit();
        });
    })

    describe('draw line test', function () {
        it('should draw a line', function () {
            integrationEnv.mainInit();

            testLineDraw([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 1, y: 15 }], integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].linePath.points.length, 2)

            let longerLine = [
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }
            ];
            testLineDraw(longerLine, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[1].linePath.points.length, 5)

            testLineDraw([], integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 2);
        });
    })

    describe('link data test', function () {
        it('should link non-blank data cell', function () {
            integrationEnv.mainInit();

            clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.enviromentVariables.handsontables.length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "timeCell"],
                [0, 1, "", "10"],
                [1, 1, "", "20"],
                [2, 1, "", "text1"],
                [2, 2, "", "text2"],
            ])

            testLineDraw([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].linePath.points.length, 5)

            integrationEnv.enviromentVariables.handsontables[0].selected = [
                [0, 0, 0, 2],
                [0, 0, 1, 1]
            ];

            clickButton('#link-button', integrationEnv.enviromentVariables.$);
            clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 3);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val1, 10);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val2, 20);
        });
    });

    describe('comment test', function () {
        it('should add a comment to a line', function () {
            integrationEnv.mainInit();

            testLineDraw([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            clickLine({ x: 100, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickLine({ x: 10, y: 105 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 3)
            expect(annotationSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
            expect(annotationSet.map(r => Math.round(r.y)).sort()).to.eql([100, 102, 105]);

            assert.equal(integrationEnv.ModelController.getBoundData().length, 3);
        });

        it('should move a comment', function () {
            integrationEnv.mainInit();

            testLineDraw([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            clickLine({ x: 100, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getBoundData().length, 1);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            let fakeThis = {
                attr: function () {
                    return annotationSet[0].className;
                }
            }
            let onCommentDrag = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.drag;
            onCommentDrag.call(fakeThis, { dx: 10, dy: 10 });
            let onCommentDragEnd = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.end;
            onCommentDragEnd.call(fakeThis, { dx: 0, dy: 0 });

            assert.equal(integrationEnv.ModelController.getBoundData().length, 1);

            expect(integrationEnv.ModelController.getBoundData()[0].offset).to.eql({ x: 20, y: 20 });
        });
    })


    describe('data test', function () {
        it('should draw data on the line', function () {
            integrationEnv.mainInit();

            clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            testLineDraw([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].linePath.points.length, 3)

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 1, 1]];
            clickButton("#link-button", integrationEnv.enviromentVariables.$);
            clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 2);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val1, 15);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val2, 25);
        });

        it('should update the axis', function () {
            integrationEnv.mainInit();

            clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            testLineDraw([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].linePath.points.length, 3)

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 1, 1]];
            clickButton("#link-button", integrationEnv.enviromentVariables.$);
            clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            let axisControlCircles = integrationEnv.enviromentVariables.d3.selectors['.axis-control-circle'];
            assert.equal(axisControlCircles.innerData.length, 2);

            let data = axisControlCircles.innerData.find(d => d.ctrl == 1);

            let fakeCircle = { attr: () => { } };
            axisControlCircles.drag.drag.call(fakeCircle, { x: 0, y: 50 }, data)
            axisControlCircles.drag.end.call(fakeCircle, { x: 0, y: 50 }, data)

            assert.equal(integrationEnv.ModelController.getBoundData()[0].axis.dist1, 40);
        });
    })

    describe('warp data tests', function () {
        it('should link non-blank data cell', function () {
            integrationEnv.mainInit();

            testLineDraw([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }], integrationEnv.enviromentVariables);

            clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickLine({ x: 125, y: 101 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            clickLine({ x: 175, y: 103 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 3);
            expect(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort()).to.eql([0.25, 0.50, 0.75]);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 0);
        });
    })
});

function testLineDraw(points, enviromentVariables) {
    assert('#line-drawing-g' in enviromentVariables.d3.selectors, "Line Drawing G not created!");
    let lineDrawingG = enviromentVariables.d3.selectors['#line-drawing-g'];
    let drawingRect = lineDrawingG.children.find(c => c.type == 'rect');
    let onLineDragStart = drawingRect.drag.start;
    let onLineDrag = drawingRect.drag.drag;
    let onLineDragEnd = drawingRect.drag.end;
    assert(onLineDragStart, "onLineDragStart not set");
    assert(onLineDrag, "onLineDrag not set");
    assert(onLineDragEnd, "onLineDragEnd not set");

    clickButton("#line-drawing-button", enviromentVariables.$);

    onLineDragStart()
    points.forEach(point => {
        onLineDrag(point);
    })
    onLineDragEnd(points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 });

    clickButton("#line-drawing-button", enviromentVariables.$);
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

    return function (coords, timeline) {
        assert.notEqual(onLineTargetClicked, null, "onLineTargetClicked not set")

        onLineTargetClicked(coords, { id: timeline.id, points: timeline.linePath.points });
    }

}

function clickButton(buttonId, fakeJQ) {
    assert(buttonId in fakeJQ.selectors, buttonId + " not found!");
    let clickFunc = fakeJQ.selectors[buttonId].eventCallbacks['click'];
    assert(clickFunc, buttonId + " click not set!");
    clickFunc();
}

function clickLine(coords, lineId, enviromentVariables) {
    let timeLineTargets = enviromentVariables.d3.selectors['.timelineTarget'];
    let data = timeLineTargets.innerData.find(d => d.id == lineId);
    timeLineTargets.eventCallbacks['click'](coords, data);
}
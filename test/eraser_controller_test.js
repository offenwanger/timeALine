const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test EraserController', function () {
    let integrationEnv;
    let getEraserController;
    let colorSquare;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getEraserController = function (externalCall) {
            let EraserController = integrationEnv.enviromentVariables.EraserController;
            return new EraserController(integrationEnv.enviromentVariables.d3.svg, externalCall);
        }

        colorSquare = function (x1, y1, x2, y2) {
            for (let i = x1; i < x2; i++) {
                for (let j = y1; j < y2; j++) {
                    global.document.canvasImage[i][j].data = [0, 0, 0, 1];
                }
            }
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getEraserController();
        })
    });

    describe('erase line tests', function () {
        it('should start erase without error', function () {
            let eraserController = getEraserController(() => [{
                id: "id1", points: [
                    { x: 0, y: 0 },
                    { x: 10, y: 15 },
                    { x: 5, y: 20 }]
            }, {
                id: "id2", points: [
                    { x: 10, y: 10 },
                    { x: 15, y: 10 },
                    { x: 15, y: 15 }]
            }]);
            eraserController.setActive(true);

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.start;
            eraserStart({ x: 10, y: 10 });
        })

        it('should erase start of line without error', function () {
            let eraserController = getEraserController(() => [{
                id: "id1", points: [
                    { x: -10, y: -10 },
                    { x: -10, y: -15 },
                    { x: -5, y: -20 }]
            }, {
                id: "id2", points: [
                    { x: 10, y: 10 },
                    { x: 20, y: 20 },
                    { x: 30, y: 30 }]
            }]);
            eraserController.setActive(true);

            let called = false;
            eraserController.setEraseCallback((result) => {
                assert.equal(result[0].id, "id2")
                assert.equal(result[0].segments.length, 2)
                assert.equal(result[0].segments[0].label, SEGMENT_LABELS.DELETED)
                assert.equal(result[0].segments[0].points[0].x, 10)
                assert.equal(result[0].segments[1].label, SEGMENT_LABELS.UNAFFECTED)
                assert.equal(Math.round(result[0].segments[1].points[0].x), 20)
                called = true;
            });

            colorSquare(0, 0, 20, 20);

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.start;
            let eraser = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.drag;
            let eraserEnd = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.end;

            eraserStart({ x: 10, y: 10 });
            eraser({ x: 15, y: 15 });
            eraserEnd({ x: 15, y: 15 });

            assert.isNotNull(integrationEnv.enviromentVariables.img.onload);
            integrationEnv.enviromentVariables.img.onload();

            assert.equal(called, true);
        });

        it('should erase end of line without error', function () {
            let eraserController = getEraserController(() => [{
                id: "id1", points: [
                    { x: 40, y: 40 },
                    { x: 60, y: 60 },
                    { x: 80, y: 80 }]
            }, {
                id: "id2", points: [
                    { x: 10, y: 10 },
                    { x: 20, y: 20 },
                    { x: 30, y: 30 }]
            }]);
            eraserController.setActive(true);
            let called = false;
            eraserController.setEraseCallback((result) => {
                assert.equal(result[0].id, "id1")
                assert.equal(result[0].segments.length, 2)
                assert.equal(result[0].segments[0].label, SEGMENT_LABELS.UNAFFECTED)
                assert.equal(result[0].segments[0].points[0].x, 40)
                assert.equal(result[0].segments[1].label, SEGMENT_LABELS.DELETED)
                assert.equal(Math.round(result[0].segments[1].points[0].x), 70)
                called = true;
            });

            colorSquare(65, 70, 90, 90);

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.start;
            let eraser = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.drag;
            let eraserEnd = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.end;

            eraserStart({ x: 80, y: 80 });
            eraser({ x: 75, y: 80 });
            eraserEnd({ x: 75, y: 80 });

            assert.isNotNull(integrationEnv.enviromentVariables.img.onload);
            integrationEnv.enviromentVariables.img.onload();

            assert.equal(called, true);
        });

        it('should erase points in middle of line', function () {
            let eraserController = getEraserController(() => [{
                id: "1654867647735_5", points: [
                    { x: 121, y: 306 },
                    { x: 170.47430419921875, y: 313.05169677734375 },
                    { x: 220.34288024902344, y: 316.6365661621094 },
                    { x: 270.1659240722656, y: 320.81927490234375 },
                    { x: 320.0511169433594, y: 323.1343994140625 },
                    { x: 369.8844909667969, y: 319.5586242675781 },
                    { x: 419.21697998046875, y: 311.4256286621094 },
                    { x: 468.8236083984375, y: 305.245361328125 }]
            }]);
            eraserController.setActive(true);
            let called = false;
            eraserController.setEraseCallback((result) => {
                assert.equal(result[0].segments.length, 3);
                assert.equal(result[0].segments[0].label, SEGMENT_LABELS.UNAFFECTED);
                assert.equal(result[0].segments[2].label, SEGMENT_LABELS.UNAFFECTED);
                assert.equal(result[0].segments[1].label, SEGMENT_LABELS.DELETED);
                called = true;
            })

            colorSquare(390, 283, 430, 323);

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.start;
            let eraser = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.drag;
            let eraserEnd = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.end;

            eraserStart({ x: 420, y: 313 });
            eraser({ x: 410, y: 303 });
            eraserEnd({ x: 400, y: 293 });

            assert.isNotNull(integrationEnv.enviromentVariables.img.onload);
            integrationEnv.enviromentVariables.img.onload();

            assert.equal(called, true);
        });

        it('should create appropriate new points for erasing section with no points', function () {
            let eraserController = getEraserController(() => [{
                id: "1654867647735_5", points: [
                    { x: 0, y: 40 },
                    { x: 0, y: 0 },
                    { x: 40, y: 40 },
                    { x: 40, y: 0 }]
            }]);
            eraserController.setActive(true);
            let called = false;
            eraserController.setEraseCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].segments.length, 3);
                assert.equal(result[0].segments[0].points.length, 3);
                assert.equal(result[0].segments[1].points.length, 2);
                assert.equal(result[0].segments[2].points.length, 3);

                expect(result[0].segments[1].points[0].x).to.be.closeTo(12.7, .1);
                expect(result[0].segments[1].points[0].y).to.be.closeTo(12.7, .1);

                expect(result[0].segments[1].points[1].x).to.be.closeTo(27.5, .1);
                expect(result[0].segments[1].points[1].y).to.be.closeTo(27.5, .1);

                called = true;
            })

            colorSquare(13, 13, 28, 28);

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.start;
            let eraserEnd = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').drag.end;

            let clickPoint = { x: 21, y: 19 };
            eraserStart(clickPoint);
            eraserEnd(clickPoint);

            assert.isNotNull(integrationEnv.enviromentVariables.img.onload);
            integrationEnv.enviromentVariables.img.onload();

            assert.equal(called, true);
        });
    });
});

describe('Integration Test EraserController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('erase line test', function () {
        it('should break line into two', function () {
            integrationEnv.mainInit();
            let longerLine = [
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }
            ];
            IntegrationUtils.drawLine(longerLine, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([{ x: 150, y: 100 }], 10, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 2);
        });

        it('should erase whole line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 120, y: 100 }, { x: 120, y: 80 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 90 },
                { x: 120, y: 80 }], 10, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 0);
        });

        it('should correctly add end warp points', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([
                { x: 30, y: 10 },
                { x: 30, y: 100 },
                { x: 70, y: 100 },
                { x: 70, y: 10 }], 10, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[1].warpBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[2].warpBindings.length, 1);

            let id1 = integrationEnv.ModelController.getAllTimelines()[0].id;
            let id2 = integrationEnv.ModelController.getAllTimelines()[1].id;
            let id3 = integrationEnv.ModelController.getAllTimelines()[2].id;

            let warpBindingData = integrationEnv.ModelController.getAllWarpBindingData();
            expect(warpBindingData.map(wbd => wbd.timeCell.getValue())).to.eql([0.2, 0.4, 0.6, 0.8]);
            expect(warpBindingData.map(wbd => wbd.timelineId)).to.eql([id1, id2, id2, id3]);
            expect(warpBindingData.map(wbd => wbd.linePercent)).to.eql([1, 0, 1, 0]);
        });
    })
});

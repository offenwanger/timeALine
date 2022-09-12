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

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;
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

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;
            let eraser = (point) => {IntegrationUtils.pointerMove(point, integrationEnv)};
            let eraserEnd = (point) => {IntegrationUtils.pointerUp(point, integrationEnv)};

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

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;
            let eraser = (point) => {IntegrationUtils.pointerMove(point, integrationEnv)};
            let eraserEnd = (point) => {IntegrationUtils.pointerUp(point, integrationEnv)};

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

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;
            let eraser = (point) => {IntegrationUtils.pointerMove(point, integrationEnv)};
            let eraserEnd = (point) => {IntegrationUtils.pointerUp(point, integrationEnv)};

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

            let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;
            let clickPoint = { x: 21, y: 19 };
            eraserStart(clickPoint);
            IntegrationUtils.pointerUp(clickPoint, integrationEnv);

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
            IntegrationUtils.drawLine(longerLine, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([{ x: 150, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
        });

        it('should erase whole line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 120, y: 100 }, { x: 120, y: 80 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 90 },
                { x: 120, y: 80 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 0);
        });
    })

    describe('erase line with strokes test', function () {
        it('should break strokes into two', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 10, y: 100 },
                { x: 20, y: 110 },
                { x: 70, y: 100 },
                { x: 80, y: 110 },
                { x: 90, y: 102 },
                { x: 95, y: 110 }
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 110, y: 150 },
                    { x: 120, y: 160 },
                    { x: 170, y: 150 },
                    { x: 180, y: 160 },
                    { x: 190, y: 152 },
                    { x: 195, y: 160 }
                ]);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([{ x: 150, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 2);
        });

        it('should break strokes into three', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 400, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 10, y: 100 },
                { x: 20, y: 110 },
                { x: 70, y: 100 },
                { x: 80, y: 110 },
                { x: 90, y: 102 },
                { x: 100, y: 110 },
                { x: 110, y: 100 },
                { x: 120, y: 110 },
                { x: 170, y: 100 },
                { x: 180, y: 110 },
                { x: 190, y: 102 },
                { x: 195, y: 110 }
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 110, y: 150 },
                    { x: 120, y: 160 },
                    { x: 170, y: 150 },
                    { x: 180, y: 160 },
                    { x: 190, y: 152 },
                    { x: 200, y: 160 },
                    { x: 210, y: 150 },
                    { x: 220, y: 160 },
                    { x: 270, y: 150 },
                    { x: 280, y: 160 },
                    { x: 290, y: 152 },
                    { x: 295, y: 160 }
                ]);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([{ x: 150, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);

            IntegrationUtils.erase([{ x: 250, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 3);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            expect(integrationEnv.ModelController.getModel().getAllTimelines().map(t => t.annotationStrokes.map(s => s.points.map(p => Math.round(100 * p.linePercent) / 100))))
                .to.eql([
                    [[0.25, 0.5]],
                    [[0.12, 0.25, 0.37, 0.50, 0.62, 0.75]],
                    [[0.07, 0.14, 0.21, 0.25]]
                ]);
        });


        it('should break strokes into six', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 300, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 20, y: 100 },
                { x: 80, y: 110 },
                { x: 120, y: 110 },
                { x: 130, y: 102 },
                { x: 170, y: 102 },
                { x: 190, y: 110 },
                { x: 190, y: 100 },
                { x: 170, y: 102 },
                { x: 130, y: 102 },
                { x: 120, y: 100 },
                { x: 80, y: 102 },
                { x: 20, y: 110 },
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 120, y: 150 },
                    { x: 180, y: 160 },
                    { x: 220, y: 160 },
                    { x: 230, y: 152 },
                    { x: 270, y: 152 },
                    { x: 290, y: 160 },
                    { x: 290, y: 150 },
                    { x: 270, y: 152 },
                    { x: 230, y: 152 },
                    { x: 220, y: 150 },
                    { x: 180, y: 152 },
                    { x: 120, y: 160 }
                ]);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);

            IntegrationUtils.erase([{ x: 190, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 3);

            IntegrationUtils.erase([{ x: 250, y: 100 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 5);

            expect(integrationEnv.ModelController.getModel().getAllTimelines().map(t => t.annotationStrokes.map(s => s.points.map(p => Math.round(100 * p.linePercent) / 100))))
                .to.eql([
                    [[0.25, 1], [1, 0.25]],
                    [[0.5, 0.75], [0.75, 0.5]],
                    [[0.25, 0.75, 0.75, 0.25]]
                ]);
        });
    });
});

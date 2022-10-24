const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test EraserController', function () {
    let integrationEnv;
    let getEraserController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getEraserController = function (externalCall) {
            let EraserController = integrationEnv.enviromentVariables.EraserController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new EraserController(new mockElement(), new mockElement(), new mockElement(), externalCall);
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
        it('should erase start of line without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not drawn");
            let timelinePoints = integrationEnv.ModelController.getModel().getAllTimelines()[1].points;
            expect(timelinePoints[0]).to.eql({ x: 40, y: 40 });

            IntegrationUtils.erase([{ x: 0, y: 40 }, { x: 35, y: 40 }, { x: 15, y: 40 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "incorrect line number");
            timelinePoints = integrationEnv.ModelController.getModel().getAllTimelines()[1].points;
            expect(timelinePoints[0]).to.eql({ x: 50, y: 40 });
        });

        it('should erase end of line without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not drawn");
            let timelinePoints = integrationEnv.ModelController.getModel().getAllTimelines()[1].points;
            expect(timelinePoints[timelinePoints.length - 1]).to.eql({ x: 80, y: 40 });

            IntegrationUtils.erase([{ x: 80, y: 40 }, { x: 75, y: 40 }, { x: 90, y: 40 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "incorrect line number");
            timelinePoints = integrationEnv.ModelController.getModel().getAllTimelines()[1].points;
            expect(timelinePoints[timelinePoints.length - 1]).to.eql({ x: 70, y: 40 });

        });

        it('should erase points in middle of line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 121, y: 306 },
                { x: 170.47430419921875, y: 313.05169677734375 },
                { x: 220.34288024902344, y: 316.6365661621094 },
                { x: 270.1659240722656, y: 320.81927490234375 },
                { x: 320.0511169433594, y: 323.1343994140625 },
                { x: 369.8844909667969, y: 319.5586242675781 },
                { x: 419.21697998046875, y: 311.4256286621094 },
                { x: 468.8236083984375, y: 305.245361328125 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let originalLength = PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points);

            IntegrationUtils.erase([{ x: 420, y: 313 }, { x: 410, y: 303 }, { x: 400, y: 293 }], 10, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "line not split");

            let len1 = PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points);
            let len2 = PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[1].points);
            assert(originalLength > len1 + len2);
        });

        it('should create appropriate new points for erasing section with no points', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 40 }, { x: 0, y: 0 }, { x: 40, y: 40 }, { x: 40, y: 0 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.erase([{ x: 21, y: 19 }], 10, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "line not split");

            let lines = integrationEnv.ModelController.getModel().getAllTimelines();

            expect(lines[0].points[1].x).to.be.closeTo(7.1, .1);
            expect(lines[0].points[1].y).to.be.closeTo(7.1, .1);

            expect(lines[1].points[0].x).to.be.closeTo(34.1, .1);
            expect(lines[1].points[0].y).to.be.closeTo(31.3, .1);
        });

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

    describe('erase data test', function () {
        it('should erase strokes on a line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 300, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);
            IntegrationUtils.drawLensColorLine([{ x: 110, y: 100 }, { x: 120, y: 110 }, { x: 150, y: 102 }, { x: 160, y: 110 }], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 1);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([{ x: 210, y: 150 }, { x: 220, y: 160 }, { x: 250, y: 152 }, { x: 260, y: 160 }]);

            IntegrationUtils.erase([{ x: 210, y: 150 }, { x: 220, y: 152 }, { x: 240, y: 152 }, { x: 250, y: 152 }, { x: 260, y: 152 }], 10, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 0);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 0);
        });

        it('should split strokes on a line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 300, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);
            IntegrationUtils.drawLensColorLine([
                { x: 110, y: 100 },
                { x: 115, y: 100 },
                { x: 120, y: 100 },
                { x: 125, y: 102 },
                { x: 145, y: 102 },
                { x: 150, y: 102 },
                { x: 155, y: 100 },
                { x: 160, y: 100 }
            ], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 1);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 210, y: 150 },
                    { x: 215, y: 150 },
                    { x: 220, y: 150 },
                    { x: 225, y: 152 },
                    { x: 245, y: 152 },
                    { x: 250, y: 152 },
                    { x: 255, y: 150 },
                    { x: 260, y: 150 }
                ]);

            IntegrationUtils.erase([{ x: 235, y: 152 }, { x: 230, y: 152 }], 10, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 2);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 2);
        });

        it('should erase strokes on canvas', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawCanvasStroke([{ x: 210, y: 150 }, { x: 220, y: 160 }, { x: 250, y: 152 }, { x: 260, y: 160 }], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([{ x: 210, y: 150 }, { x: 220, y: 160 }, { x: 250, y: 152 }, { x: 260, y: 160 }]);

            IntegrationUtils.erase([{ x: 240, y: 152 }, { x: 230, y: 152 }], 10, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 0);
        });

        it('should split strokes on canvas', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawCanvasStroke([
                { x: 210, y: 100 },
                { x: 215, y: 100 },
                { x: 220, y: 100 },
                { x: 225, y: 102 },
                { x: 245, y: 102 },
                { x: 250, y: 102 },
                { x: 255, y: 100 },
                { x: 260, y: 100 }
            ], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 210, y: 100 },
                    { x: 215, y: 100 },
                    { x: 220, y: 100 },
                    { x: 225, y: 102 },
                    { x: 245, y: 102 },
                    { x: 250, y: 102 },
                    { x: 255, y: 100 },
                    { x: 260, y: 100 }
                ]);

            IntegrationUtils.erase([{ x: 240, y: 102 }, { x: 230, y: 102 }], 10, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 2);
        });
    })

    describe('erase line with data test', function () {
        it('should erase line and not move text with no time mapping', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 100 }, { x: 400, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 300, y: 101 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 350, y: 102 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 387, y: 110 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text[timeline-id=\"" + timelineId + "\"]"].innerData;
            assert.equal(textSet.length, 6, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150, 300, 350, 387]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([100, 100, 100, 100, 100, 100]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 6);

            IntegrationUtils.erase([{ x: 250, y: 100 }], 10, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 6);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text[timeline-id=\"" + timelineId1 + "\"]"].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([100, 100, 100]);
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;

            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text[timeline-id=\"" + timelineId2 + "\"]"].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([300, 350, 387]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([100, 100, 100]);
        });
    })

    describe('erase line with strokes test', function () {
        it('should break strokes into two', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

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
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

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
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"]
                .innerData[0].projectedPoints.map(p => { return { x: Math.round(p.x), y: Math.round(p.y) } }))
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
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(t => t.annotationStrokes.map(s => s.points.map(p => Math.round(100 * p.timePercent) / 100))))
                .to.eql([
                    [[0.25, 0.25, 0.5]],
                    [[0.14, 0.14, 0.29, 0.43, 0.57, 0.71]],
                    [[0, 0.08, 0.15, 0.19]]
                ]);
        });


        it('should break strokes into six', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 300, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

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

            expect(integrationEnv.ModelController.getModel().getAllTimelines().map(t => t.annotationStrokes.map(s => s.points.map(p => Math.round(100 * p.timePercent) / 100))))
                .to.eql([
                    [[0.25, 0.25, 1], [1, 0.25]],
                    [[0.33, 0.33, 0.67], [0.67, 0.33]],
                    [[0.67, 0.67, 0]]
                ]);
        });
    });
});

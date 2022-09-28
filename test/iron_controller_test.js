const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test IronController', function () {
    let integrationEnv;
    let getIronController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getIronController = function (externalCall) {
            let IronController = integrationEnv.enviromentVariables.IronController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new IronController(new mockElement(), new mockElement(), new mockElement(), externalCall);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getIronController();
        })
    });

    describe('iron line tests', function () {
        it('should start iron without error', function () {
            let ironController = getIronController();
            ironController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: 0, y: 0 },
                        { x: 10, y: 15 },
                        { x: 5, y: 20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 15, y: 10 },
                        { x: 15, y: 15 }]
                }]
            })
            ironController.setActive(true);

            ironController.onPointerDown({ x: 10, y: 10 });
        })

        it('should iron start of line without error', function () {
            let ironController = getIronController();

            ironController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: -10, y: -10 },
                        { x: -10, y: -15 },
                        { x: -5, y: -20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 12, y: 10 },
                        { x: 14, y: 14 },
                        { x: 20, y: 20 },
                        { x: 30, y: 30 }]
                }]
            });
            ironController.setActive(true);

            let called = false;
            ironController.setLineModifiedCallback((result) => {
                assert.equal(result[0].id, "id2")
                assert.equal(result[0].oldSegments.length, 2)
                assert.equal(result[0].newSegments.length, 2)
                assert.equal(result[0].newSegments[0].label, SEGMENT_LABELS.CHANGED)
                assert.equal(result[0].newSegments[0].points[0].x, 10)
                // the Xs and Ys should like up in this line when flat
                expect(result[0].newSegments[0].points.map(p => p.x)).to.eql(result[0].newSegments[0].points.map(p => p.y));
                expect(result[0].newSegments[1].points.map(p => p.x)).to.eql(result[0].newSegments[1].points.map(p => p.y));

                // the first point of the unchanged section should equal the last point of the changed section
                assert.equal(result[0].newSegments[1].label, SEGMENT_LABELS.UNAFFECTED)
                expect(result[0].newSegments[1].points[0]).to.eql(result[0].newSegments[0].points[result[0].newSegments[0].points.length - 1]);
                called = true;
            });

            ironController.onPointerDown({ x: 10, y: 10 });
            ironController.onPointerMove({ x: 15, y: 15 });
            ironController.onPointerUp({ x: 15, y: 15 });

            assert.equal(called, true);
        });

        it('should iron end of line without error', function () {
            let ironController = getIronController();

            ironController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: 40, y: 40 },
                        { x: 60, y: 60 },
                        { x: 78, y: 78 },
                        { x: 80, y: 78 },
                        { x: 80, y: 80 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 20, y: 20 },
                        { x: 30, y: 30 }]
                }]
            });
            ironController.setActive(true);
            let called = false;
            ironController.setLineModifiedCallback((result) => {
                assert.equal(result[0].id, "id1")
                assert.equal(result[0].oldSegments.length, 2)
                assert.equal(result[0].newSegments.length, 2)
                assert.equal(result[0].newSegments[0].label, SEGMENT_LABELS.UNAFFECTED)
                assert.equal(result[0].newSegments[1].label, SEGMENT_LABELS.CHANGED)

                // the Xs and Ys should like up in this line when flat
                expect(result[0].newSegments[0].points.map(p => p.x)).to.eql(result[0].newSegments[0].points.map(p => p.y));
                expect(result[0].newSegments[1].points.map(p => p.x)).to.eql(result[0].newSegments[1].points.map(p => p.y));

                // the first point of the unchanged section should equal the last point of the changed section
                expect(result[0].newSegments[1].points[0]).to.eql(result[0].newSegments[0].points[result[0].newSegments[0].points.length - 1]);
                called = true;
            });

            ironController.onPointerDown({ x: 80, y: 80 });
            ironController.onPointerMove({ x: 75, y: 80 });
            ironController.onPointerUp({ x: 75, y: 80 }, integrationEnv);

            assert.equal(called, true);
        });

        it('should iron points in middle of line', function () {
            let ironController = getIronController();

            ironController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 121, y: 306 },
                        { x: 170, y: 313 },
                        { x: 220, y: 316 },
                        { x: 265, y: 320 },
                        { x: 320, y: 323 },
                        { x: 369, y: 319 },
                        { x: 419, y: 311 },
                        { x: 468, y: 305 }]
                }]
            });
            ironController.setActive(true);
            let called = false;
            ironController.setLineModifiedCallback((result) => {
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[0].label, SEGMENT_LABELS.UNAFFECTED);
                assert.equal(result[0].newSegments[1].label, SEGMENT_LABELS.CHANGED);
                assert.equal(result[0].newSegments[2].label, SEGMENT_LABELS.UNAFFECTED);

                expect(result[0].newSegments[1].points).to.not.eql(result[0].oldSegments[1].points);
                expect(result[0].oldSegments[1].points.map(p => { return { x: Math.round(p.x), y: Math.round(p.y) } }))
                    .to.eql([{ x: 260, y: 320 }, { x: 265, y: 320 }, { x: 280, y: 321 }]);
                expect(result[0].newSegments[1].points.map(p => { return { x: Math.round(p.x), y: Math.round(p.y) } }))
                    .to.eql([{ x: 260, y: 320 }, { x: 280, y: 321 }]);

                called = true;
            })

            ironController.onPointerDown({ x: 270, y: 320 });
            ironController.onPointerMove({ x: 280, y: 320 });
            ironController.onPointerUp({ x: 300, y: 320 }, integrationEnv);

            assert.equal(called, true);
        });

        it('should create appropriate new points for ironing a section with no points', function () {
            let ironController = getIronController();

            ironController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 0, y: 40 },
                        { x: 0, y: 0 },
                        { x: 40, y: 40 },
                        { x: 40, y: 0 }]
                }]
            });
            ironController.setActive(true);
            let called = false;
            ironController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[0].points.length, 3);
                assert.equal(result[0].newSegments[1].points.length, 2);
                assert.equal(result[0].newSegments[2].points.length, 3);

                expect(result[0].newSegments[1].points[0].x).to.be.closeTo(14.1, .1);
                expect(result[0].newSegments[1].points[0].y).to.be.closeTo(14.1, .1);

                expect(result[0].newSegments[1].points[1].x).to.be.closeTo(28.2, .1);
                expect(result[0].newSegments[1].points[1].y).to.be.closeTo(28.2, .1);

                called = true;
            })

            let clickPoint = { x: 21, y: 19 };

            ironController.onPointerDown(clickPoint);
            ironController.onPointerUp(clickPoint, integrationEnv);

            assert.equal(called, true);
        });
    });
});

describe('Integration Test IronController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('iron line test', function () {
        it('should flatten the line', function () {
            integrationEnv.mainInit();
            let longerLine = [
                { x: 100, y: 100 },
                { x: 125, y: 200 },
                { x: 150, y: 100 },
            ];
            IntegrationUtils.drawLine(longerLine, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let beforePoints = integrationEnv.ModelController.getModel().getAllTimelines()[0].points;
            assert.equal(beforePoints.length, 6, "line not drawn");

            IntegrationUtils.clickButton("#iron-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.mainPointerDown({ x: 125, y: 200 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 150, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.clickButton("#iron-button", integrationEnv.enviromentVariables.$);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].points).to.not.eql(beforePoints);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 8);
        });
    })
});

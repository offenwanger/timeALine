let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Integration Test LineDrawingController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('draw line test', function () {
        it('should draw a line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 1, y: 15 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 2)

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

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].points.length, 5)

            IntegrationUtils.drawLine([{ x: 0, y: 0 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
        });
    })

    describe('line extension tests', function () {
        it('should extend an timeline with data without moving the data', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let timeline = integrationEnv.ModelController.getModel().getAllTimelines()[0];

            IntegrationUtils.bindDataToLine(timeline.id, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"],
                ["Jan 15, 2021", 2],
                ["Jan 14, 2021", 1.5],
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)

            assert.equal(PathMath.getPathLength(timeline.points), 50)

            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.x)).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.y)).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => item.x)).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => item.y)).to.eql([100, 100, 100]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 50, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 25, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 0, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 0, y: 100 }, integrationEnv);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 150)

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].timeStamp, new Date("Jan 10, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.66666, 0.0001);

            // the data should have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);

            // get the end button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 200)

            // there should be another time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[1].timeStamp, new Date("Jan 20, 2021").getTime());
            // and the first one should have had it's line percent updated
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.5, 0.0001);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });
    });

    describe('line merging tests', function () {
        it('should merge an empty timeline without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.map(p => p.x)).to.eql([0, 50, 75, 100, 150, 175, 200, 250]);
        });

        it('should merge a timeline with data without moving the data when its possible', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 14, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].x, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => Math.round(b.linePercent * 100) / 100)).to.eql([0.33, 0.67]);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            let newTimelineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData.length, 2)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].x, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].y, 100)

            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 14, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.4, 0.6, 0.8]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.x))).to.eql([50, 100, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });

        it('should merge a timeline with data moving the data when its necessary', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 13, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 12, 2021", "Text Note 2"],
                ["Jan 16, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].x, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 1);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].timeStamp).to.eql(new Date("Jan 13, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].linePercent).to.be.closeTo(0.33333, 0.0001);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            let newTimelineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData.length, 2)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].x, 50)
            // this one had to move
            expect(selectors[".annotation-text_" + newTimelineId].innerData[1].x).to.be.closeTo(33.333333, 0.0001)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].y, 100)

            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 16, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.6]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                // this last data display point had to move to 
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 117]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.x))).to.eql([50, 33, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });
    });
});
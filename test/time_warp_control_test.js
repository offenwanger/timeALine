const chai = require('chai');

let assert = chai.assert;
let expect = chai.expect;


describe('Test TimeWarpController', function () {
    let integrationEnv;
    let getTimeWarpController;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
        getTimeWarpController =  function (externalCall) {
            let TimeWarpController = integrationEnv.enviromentVariables.TimeWarpController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new TimeWarpController(new mockElement(), new mockElement(), new mockElement(), externalCall);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getTimeWarpController(() => { });
        })
    });

    describe('time controls test', function () {
        it('should add time ticks without time', function () {
            let model = new DataStructs.DataModel();
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }]))
            model.getAllTimelines()[0].warpBindings.push(new DataStructs.WarpBinding(0.2), new DataStructs.WarpBinding(0.4))
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }]))
            model.getAllTimelines()[1].warpBindings.push(new DataStructs.WarpBinding(0.5))

            let timeWarpController = getTimeWarpController(() => { });
            timeWarpController.updateModel(model);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + model.getAllTimelines()[0].id].innerData.length, 2, "ticks were passed data");
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + model.getAllTimelines()[1].id].innerData.length, 1, "ticks were passed data");
        });

        it('should add time ticks with time', function () {
            let model = new DataStructs.DataModel();
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }]))
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }]))
            model.getAllTimelines()[0].warpBindings.push(new DataStructs.WarpBinding(0.2), new DataStructs.WarpBinding(0.4))
            model.getAllTimelines()[1].warpBindings.push(new DataStructs.WarpBinding(0.5))
            model.getAllTimelines()[0].warpBindings[0].timeStamp = new Date("jan 2, 2022").getTime();
            model.getAllTimelines()[0].warpBindings[1].timeCellId = "id7";
            model.getAllTimelines()[1].warpBindings[0].timeStamp = new Date("jan 2, 2022").getTime();

            let timeWarpController = getTimeWarpController(() => { });
            timeWarpController.updateModel(model);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + model.getAllTimelines()[0].id].innerData.length, 2, "ticks were passed data");
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + model.getAllTimelines()[1].id].innerData.length, 1, "ticks were passed data");
        })
    });
});

describe('Integration Test TimeWarpController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('warp data tests', function () {
        it('should create pins without time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }], integrationEnv);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => w.timeStamp))
                .to.eql([null, null, null]);
        });

        it('should create pins with time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 15, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w =>w.timeStamp).sort())
                .to.eql([
                    0.25*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(), 
                    0.50*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(), 
                    0.75*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()
                ]);
        });

        it('should create and update pin on drag with no data', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // no data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length == 1, true, "ticks were passed data");
        });

        it('should create and update pin on drag with data', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 15, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].timeStamp, 
                0.50*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length == 1, true, "ticks were passed data");
        });

        it('should display a pin while dragging, but not update until done', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timelineTarget'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);

            let onLineDragStart = timeLineTargets.eventCallbacks.pointerdown;
            onLineDragStart({ clientX: 150, clientY: 110 }, data)

            // the tick was drawn
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId], "warp ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));

            assert(bindingTickData, "tick was not drawn");

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 0);

            IntegrationUtils.pointerMove({ x: 125, y: 110 }, integrationEnv);

            // the tick was updated
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId], "warp ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");

            bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));
            assert(bindingTickData);
            expect(bindingTickData.position).to.eql({ x: 125, y: 100 });

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 0);

            IntegrationUtils.pointerUp({ x: 125, y: 110 }, integrationEnv);

            // the timeline has been updated
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);
        });

        it('should delete visual pins while dragging, but not update until done', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 125, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            // we have three ticks in data and three drawn
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);
            
            let tickTargets = integrationEnv.enviromentVariables.d3.selectors['.warpTickTarget_' + timelineId];
            assert.equal(tickTargets.innerData.length, 3)

            // start drag
            let onTickDragStart = tickTargets.eventCallbacks.pointerdown;
            onTickDragStart({ clientX: 150, clientY: 110 }, tickTargets.innerData[1]);
            // drag this tick over another one
            IntegrationUtils.pointerMove({ x: 110, y: 110 }, integrationEnv);

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);
            // but the visual has
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.warpTickTarget_' + timelineId].innerData.length, 2)

            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));
            assert(bindingTickData);
            expect(bindingTickData.position).to.eql({ x: 110, y: 100 });

            // finish the drag
            IntegrationUtils.pointerUp({ x: 110, y: 110 }, integrationEnv);

            // the timeline has been updated
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[1].linePercent, 0.1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[1].timeStamp, 
                0.50*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
        });

        it('should set time when binding enough time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 125, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => w.timeStamp))
                .to.eql([null, null, null]);
            
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 18, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w =>w.timeStamp).sort())
                .to.eql([
                    0.25*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(), 
                    0.50*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(), 
                    0.75*(new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()
                ]);
        });
    })
});

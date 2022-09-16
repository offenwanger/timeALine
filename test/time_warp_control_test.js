const chai = require('chai');

let assert = chai.assert;
let expect = chai.expect;


describe('Test TimeWarpController', function () {
    let integrationEnv;
    let getTimeWarpController;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
        getTimeWarpController = function (updateBindingsFunc) {
            let TimeWarpController = integrationEnv.enviromentVariables.TimeWarpController;
            return new TimeWarpController(integrationEnv.enviromentVariables.d3.svg, updateBindingsFunc);
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
        it('should add time controls without error', function () {
            let timelines = [
                { id: "id1", points: [{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }] },
                { id: "id2", points: [{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }] },
            ]
            let bindings = [{
                timelineId: "id1",
                timeCell: { getValue: () => 5, getType: () => DataTypes.NUM },
                linePercent: 0.5,
            }, {
                timelineId: "id1",
                timeCell: { getValue: () => 2, getType: () => DataTypes.NUM },
                linePercent: 0.2,
            }];

            let timeWarpController = getTimeWarpController(() => { });
            timeWarpController.addOrUpdateTimeControls(timelines, bindings);
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
        it('should place pins where expected', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }], integrationEnv);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);
        });

        it('should create and update a pin on drag', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // no data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));
            assert.isNotNull(bindingTickData);
            assert.equal(bindingTickData.color, DataTypesColor[DataTypes.NUM]);
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

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // the tick was drawn
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId], "warp ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));

            assert(bindingTickData, "tick was not drawn");
            assert.equal(bindingTickData.color, DataTypesColor[DataTypes.NUM], "color was not set properly");

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
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // no data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);
        });
    })
});

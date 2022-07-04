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
            let bindings = [{
                id: "id1",
                bindings: [{
                    rowId: "id2",
                    timeVal: 5,
                    type: DataTypes.NUM,
                    linePercent: 0.5,
                    isValid: true,
                }],
                linePoints: [{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }],
            }, {
                id: "id3",
                bindings: [{
                    rowId: "id4",
                    timeVal: 10,
                    type: DataTypes.NUM,
                    linePercent: 0.25,
                    isValid: true,
                }],
                linePoints: [{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }],
            }];

            let timeWarpController = getTimeWarpController(() => { });
            timeWarpController.addOrUpdateTimeControls(bindings);
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

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }], integrationEnv.enviromentVariables);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 102 }], integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.dragLine([{ x: 125, y: 101 }], integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 3);

            expect(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 0);
        });
    })

    describe('warp data tests', function () {
        it('should create and update a pin on drag', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            let timelineId = integrationEnv.ModelController.getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv.enviromentVariables);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // no data was bound
            assert.equal(integrationEnv.ModelController.getBoundData().length, 0);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));
            assert.isNotNull(bindingTickData);
            assert.equal(bindingTickData.color, DataTypesColor[DataTypes.NUM]);
        });
    })

    describe('warp data tests', function () {
        it('should display a pin while dragging, but not update until done', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            let timelineId = integrationEnv.ModelController.getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timelineTarget'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getAllTimelines()[0].id);

            let onLineDragStart = timeLineTargets.drag.start;
            let onLineDrag = timeLineTargets.drag.drag;
            let onLineDragEnd = timeLineTargets.drag.end;

            onLineDragStart({ x: 150, y: 110 }, data)

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // the tick was drawn
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId], "warp ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            let bindingTickData = integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.find(d => d.hasOwnProperty('binding'));

            assert.isNotNull(bindingTickData);
            assert.equal(bindingTickData.color, DataTypesColor[DataTypes.NUM], "color was not set properly");

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 0);

            onLineDrag({ x: 125, y: 110 }, data);

            // the tick was updated
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId], "warp ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".warpTick_" + timelineId].innerData.length > 0, true, "ticks were passed data");
            assert.isNotNull(bindingTickData);
            assert.equal(bindingTickData.color, 0);

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 0);

            onLineDragEnd({ x: 125, y: 110 }, data);

            // the timeline has been updated
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings[0].linePercent, 0.25);

            // the table was created and a row added
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[0][0].val, "0.5");

            // no data was bound
            assert.equal(integrationEnv.ModelController.getBoundData().length, 0);

        });
    })
});

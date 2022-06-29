const chai = require('chai');

let assert = chai.assert;
let expect = chai.expect;


describe('Test TimeWarpController', function () {
    let integrationEnv;
    let getTimeWarpController;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
        getTimeWarpController = function () {
            let TimeWarpController = integrationEnv.enviromentVariables.TimeWarpController;
            return new TimeWarpController(integrationEnv.enviromentVariables.d3.svg);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getTimeWarpController();
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

            let timeWarpController = getTimeWarpController();
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
        it('should link non-blank data cell', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 102 }, { x: 200, y: 104 }], integrationEnv.enviromentVariables);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 125, y: 101 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 175, y: 103 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 3);
            expect(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.map(w => Math.round(w.linePercent * 100) / 100).sort()).to.eql([0.25, 0.50, 0.75]);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 0);
        });
    })
});

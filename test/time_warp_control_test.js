const chai = require('chai');
const rewire = require('rewire');

let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();


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

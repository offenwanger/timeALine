const chai = require('chai');
const rewire = require('rewire');

let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();


describe('Test TimeWarpController', function () {
    let getTimeWarpController;
    let enviromentVariables;
    let DataStructs;

    beforeEach(function (done) {
        let time_warp_controller = rewire('../js/time_warp_controller.js');
        let data_structures = rewire('../js/data_structures.js');

        let utility = rewire('../js/utility.js');
        DataStructs = data_structures.__get__("DataStructs");

        enviromentVariables = {
            d3: Object.assign({}, TestUtils.mockD3),
            PathMath: utility.__get__('PathMath'),
            MathUtil: utility.__get__('MathUtil'),
            TimeWarpUtil: utility.__get__('TimeWarpUtil'),
            document: TestUtils.fakeDocument,
            svg: Object.assign({}, TestUtils.mockSvg),
            DataStructs,
        }

        getTimeWarpController = function () {
            time_warp_controller.__set__(enviromentVariables);
            let TimeWarpController = time_warp_controller.__get__('TimeWarpController');
            return new TimeWarpController(Object.assign({}, enviromentVariables.svg));
        }

        done();
    });

    afterEach(function (done) {
        Object.keys(enviromentVariables).forEach((key) => {
            delete global[key];
        })
        delete enviromentVariables;
        done();
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

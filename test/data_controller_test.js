const chai = require('chai');
const rewire = require('rewire');

let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();


describe('Test DataController', function () {
    let getDataController;
    let enviromentVariables;

    beforeEach(function (done) {
        let data_controller = rewire('../js/data_controller.js');

        let utility = rewire('../js/utility.js');

        enviromentVariables = {
            PathMath: utility.__get__('PathMath'),
            DataUtil: utility.__get__('DataUtil'),
            d3: Object.assign({}, TestUtils.mockD3),
            document: TestUtils.fakeDocument,
        }

        getDataController = function () {
            data_controller.__set__(enviromentVariables);
            let DataViewController = data_controller.__get__('DataViewController');
            return new DataViewController(Object.assign({}, TestUtils.mockSvg));
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
            getDataController();
        })
    });

    describe('annotation draw test', function () {
        it('should try to draw annotations at the correct location', function () {
            let wasCalled = false;
            let mockAnnotation = Object.assign({}, TestUtils.mockAnnotation);
            mockAnnotation.annotations = function (result) {
                wasCalled = true;
                expect(result.map(i => { return { x: Math.floor(i.x), y: Math.floor(i.y) } })).to.eql([{ x: 20, y: 10 }, { x: 10, y: 5 }, { x: 30, y: 15 }], 0.0001);
            }
            enviromentVariables.d3.annotation = () => mockAnnotation;
            let controller = getDataController();

            let boundData = [{
                id: "1656331754127_8",
                type: "text",
                val: "0.28",
                offset: { "x": 10, "y": 10 },
                linePercent: 0.5,
                line: [{ x: 0, y: 0 }, { x: 40, y: 20 }]
            }, {
                id: "1656331754663_11",
                type: "text",
                val: "0.40",
                offset: { "x": 10, "y": 10 },
                linePercent: 0.25,
                line: [{ x: 0, y: 0 }, { x: 40, y: 20 }]
            }, {
                id: "1656331756433_14",
                type: "text",
                val: "0.82",
                offset: { "x": 10, "y": 10 },
                linePercent: 0.75,
                line: [{ x: 0, y: 0 }, { x: 40, y: 20 }]
            }]

            controller.drawData(boundData);

            assert.equal(wasCalled, true);
        })
    });
});

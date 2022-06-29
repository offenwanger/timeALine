const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;


describe('Test DataController', function () {
    let integrationEnv;
    let getDataController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getDataController = function () {
            let DataViewController = integrationEnv.enviromentVariables.DataViewController;
            return new DataViewController(integrationEnv.enviromentVariables.d3.svg);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDataController();
        })
    });

    describe('annotation draw test', function () {
        it('should try to draw annotations at the correct location', function () {

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

            getDataController().drawData(boundData);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            expect(annotationSet.map(i => { return { x: Math.floor(i.x), y: Math.floor(i.y) } }))
                .to.eql([{ x: 20, y: 10 }, { x: 10, y: 5 }, { x: 30, y: 15 }], 0.0001);
        })
    });
});

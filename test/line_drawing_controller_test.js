let chai = require('chai');
let assert = chai.assert;

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

            IntegrationUtils.drawLine([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 1, y: 15 }], integrationEnv.enviromentVariables);

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
            IntegrationUtils.drawLine(longerLine, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].points.length, 5)

            IntegrationUtils.drawLine([], integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
        });
    })
});
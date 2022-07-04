let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            integrationEnv.mainInit();
        });
    })

    describe('link data test', function () {
        it('should link non-blank data cell', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.enviromentVariables.handsontables.length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "timeCell"],
                [0, 1, "", "10"],
                [1, 1, "", "20"],
                [2, 1, "", "text1"],
                [2, 2, "", "text2"],
            ])

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].linePath.points.length, 5)

            integrationEnv.enviromentVariables.handsontables[0].selected = [
                [0, 0, 0, 2],
                [0, 0, 1, 1]
            ];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getBoundData().length, 3);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val1, 10);
            assert.equal(integrationEnv.ModelController.getBoundData().find(item => item.axis).axis.val2, 20);
        });
    });
});
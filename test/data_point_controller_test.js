const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test DataPointController', function () {
    let integrationEnv;
    let getDataPointController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getDataPointController = function () {
            let DataPointController = integrationEnv.enviromentVariables.DataPointController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new DataPointController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDataPointController();
        })
    });
});

describe('Integration Test DataPointController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('data test', function () {
        it('should draw data on the line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 3)

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 1, 1]];

            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 15);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 25);
        });

        it('should update the axis', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 3)

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 1, 1]];
            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);

            let axisControlCircles = integrationEnv.enviromentVariables.d3.selectors['.axis-target-circle'];
            assert.equal(axisControlCircles.innerData.length, 2);

            let data = axisControlCircles.innerData.find(d => d.ctrl == 1);

            axisControlCircles.eventCallbacks.pointerdown({ x: 0, y: 50 }, data);
            IntegrationUtils.pointerMove({ x: 0, y: 50 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 0, y: 50 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].axisBinding.dist1, 40);
        });
    })
});
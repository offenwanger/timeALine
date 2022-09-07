const { expect } = require('chai');
const chai = require('chai');
let assert = chai.assert;

describe('Integration Test StrokeController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('lens stroke draw and display', function () {
        it('should show a stroke drawn in lens in the canvas', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 110, y: 100 },
                { x: 120, y: 110 },
                { x: 130, y: 100 },
                { x: 140, y: 110 },
                { x: 150, y: 102 },
                { x: 160, y: 110 }
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 1);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([{ x: 205, y: 150 },
                { x: 210, y: 160 },
                { x: 215, y: 150 },
                { x: 220, y: 160 },
                { x: 225, y: 152 },
                { x: 230, y: 160 }]);

            IntegrationUtils.drawLensColorLine([{ x: 10, y: 100 }, { x: 34, y: 110 }], integrationEnv);
            IntegrationUtils.drawLensColorLine([{ x: 130, y: 100 }, { x: 324, y: 110 }], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 3);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 3);
        });
    })
});

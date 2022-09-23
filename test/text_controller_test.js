const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;


describe('Test TextController', function () {
    let integrationEnv;
    let getTextController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getTextController = function () {
            let TextController = integrationEnv.enviromentVariables.TextController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new TextController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getTextController();
        })
    });
});

describe('Integration Test TextController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('text test', function () {
        it('should draw text at the correct location', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 100 },
                { x: 90, y: 100 },
                { x: 40, y: 100 },
                { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", 1],
                ["Jan 20, 2021", 1]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([100, 100, 100]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);
        });

        it('should move text', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 100 },
                { x: 90, y: 100 },
                { x: 40, y: 100 },
                { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", 1],
                ["Jan 20, 2021", 1]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 40, y: 103 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(textSet.length, 2);

            let annotationData = textSet[1]
            let movingTextId = annotationData.binding.cellBinding.id;
            expect(annotationData.offsetX).to.eql(10)
            expect(annotationData.offsetY).to.eql(10)

            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            let movingTextTargetData = textTargetSet.find(item => item.binding.cellBinding.id == movingTextId);
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].
                eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, movingTextTargetData);
            IntegrationUtils.pointerMove({ x: 140, y: 120 }, integrationEnv);

            // Check that the correct annotation is updating
            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;

            annotationData = textSet.find(item => item.binding.cellBinding.id == movingTextId);
            expect(annotationData.offsetX).to.eql(20)
            expect(annotationData.offsetY).to.eql(20)
            annotationData = textSet.find(item => item.binding.cellBinding.id != movingTextId);
            expect(annotationData.offsetX).to.eql(10)
            expect(annotationData.offsetY).to.eql(10)
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .filter(b => b.dataCell.getType() == DataTypes.TEXT)
                .map(b => b.cellBinding.offset.x)).to.eql([10, 10])
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .filter(b => b.dataCell.getType() == DataTypes.TEXT)
                .map(b => b.cellBinding.offset.y)).to.eql([10, 10])


            IntegrationUtils.pointerUp({ x: 140, y: 120 }, integrationEnv);

            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            annotationData = textSet.find(item => item.binding.cellBinding.id == movingTextId);
            expect(annotationData.offsetX).to.eql(20)
            expect(annotationData.offsetY).to.eql(20)
            integrationEnv.ModelController.getModel().getAllCellBindingData()

            // Check that the correct cell binding was updated
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .find(item => item.cellBinding.id == movingTextId)
                .cellBinding.offset).to.eql({ x: 20, y: 20 });
        });
    })
});
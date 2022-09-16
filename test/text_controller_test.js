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

    describe('text draw test', function () {
        it('should try to draw text at the correct location', function () {
            let timelines = [{ id: "tid1", points: [{ x: 0, y: 0 }, { x: 40, y: 20 }] }];
            let boundData = [
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid1",
                    "table1",
                    "row1",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.28"),
                    0.5),
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid2",
                    "table1",
                    "row2",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.40"),
                    0.25),
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid3",
                    "table1",
                    "row3",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.82"),
                    0.75),
            ];

            getTextController().drawAnnotations(timelines, boundData);

            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelines[0].id].innerData;
            expect(textSet.map(i => { return { x: Math.floor(i.x), y: Math.floor(i.y) } }))
                .to.eql([{ x: 20, y: 10 }, { x: 10, y: 5 }, { x: 30, y: 15 }], 0.0001);
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
        it('should add text to a line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([100, 102, 105]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);
        });

        it('should move text', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 40, y: 103 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(textSet[1].offsetX).to.eql(10)
            expect(textSet[1].offsetY).to.eql(10)
            let annotationData = textSet[1]
            let label = annotationData.text;

            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].
                eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, textTargetSet[1]);
            IntegrationUtils.pointerMove({ x: 140, y: 120 }, integrationEnv);

            // Check that the correct annotation is updating
            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(textSet[1].offsetX).to.eql(20)
            expect(textSet[1].offsetY).to.eql(20)
            expect(textSet[1].text).to.eql(label)

            IntegrationUtils.pointerUp({ x: 140, y: 120 }, integrationEnv);

            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(textSet[1].offsetX).to.eql(20)
            expect(textSet[1].offsetY).to.eql(20)
            expect(textSet[1].text).to.eql(label)

            // Check that the correct cell binding was updated
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].dataCell.offset).to.eql({ x: 20, y: 20 });
        });
    })
});
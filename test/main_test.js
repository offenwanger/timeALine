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
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].points.length, 5)

            integrationEnv.enviromentVariables.handsontables[0].selected = [
                [0, 0, 0, 2],
                [0, 0, 1, 1]
            ];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 3);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 10);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 20);
        });
    });


    describe('Two way warp binding test', function () {
        it('warp binding should move comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getAllTimelines()[0].id;

            // add a warp binding at 50%, and drag to 25%
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.5);

            // check that a table row was created with a time
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[0].dataCells[0].val, "0.5");

            // add a comment
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 1, "annotation not created");
            assert.equal(annotationSet[0].x, 125);
            assert.equal(annotationSet[0].y, 100);

            // add a second comment
            IntegrationUtils.clickLine({ x: 150, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 2, "annotation not created");
            // TODO: Actually, create a binding for the row as well so the comment stick where it was clicked
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);

            // check that two table rows were created
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 3);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[1].dataCells[1].val, "0.5");
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[2].dataCells[1].val, "1");

            // check that the annotation was bound to the line
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[0].timeCell.getValue(), 0.5);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[0].dataCell.getValue(), "0.5");
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[1].timeCell.getValue(), 1);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[1].dataCell.getValue(), "1");


            // move the warp binding
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let d = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].innerData[0];
            let dragStart = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.start;
            let drag = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.drag;
            let dragEnd = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.end;
            dragStart({ x: 125, y: 100 }, d);
            drag({ x: 175, y: 110 }, d);
            dragEnd({ x: 175, y: 110 }, d);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.75);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.5);

            // check that comments moved
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 2)
            assert.equal(annotationSet[0].x, 175);
            assert.equal(annotationSet[0].y, 100);
            assert.equal(annotationSet[0].note.label, "0.5");
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);
            assert.equal(annotationSet[1].note.label, "1");

            // TODO update the table data
            // check the the comment moved
        });
    });
});
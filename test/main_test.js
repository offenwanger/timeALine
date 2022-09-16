let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();

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

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert(integrationEnv.enviromentVariables.handsontables.length > 0);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
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
                { x: 10, y: 105 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 5)

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [
                [0, 0, 0, 2],
                [0, 0, 1, 1]
            ];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 10);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 20);
        });

        it('draw data points for linked cells', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.getLastHoTable(integrationEnv).init.afterCreateRow(0, 5);

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert(integrationEnv.enviromentVariables.handsontables.length > 0);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],

                [1, 0, "", "1"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "2"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "1.5"], [3, 1, "", "text4"], [3, 2, "", "10"],

                [4, 0, "", "2022-05-6"], [4, 1, "", "text6"], [4, 2, "", "text7"],
                [5, 0, "", "May 11, 2022"], [5, 1, "", "text8"], [5, 2, "", "13"],
                [6, 0, "", "2022-05-21"], [6, 1, "", "15"], [6, 2, "", "text9"],
                [7, 0, "", "May 2022"], [7, 1, "", "16"], [7, 2, "", "18"],
            ])

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 150, y: 100 },
                { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 7, 2]];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // check that all 8 data cells were bound, with one axis for each column
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 16);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 2);

            // check that the comments were drawn in the correct places
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + integrationEnv.ModelController.getModel().getAllTimelines()[0].id].innerData;
            assert.equal(annotationSet.length, 9)
            expect(annotationSet.map(a => {
                return {
                    x: Math.round(a.x),
                    y: Math.round(a.y),
                    label: a.text
                }
            }).sort((a, b) => a.label < b.label ? -1 : 1)).to.eql([{
                x: 100,
                y: 100,
                label: "text1"
            }, {
                x: 200,
                y: 100,
                label: "text2"
            }, {
                x: 200,
                y: 100,
                label: "text3"
            }, {
                x: 150,
                y: 100,
                label: "text4"
            }, {
                x: 100,
                y: 100,
                label: "text5"
            }, {
                x: 125,
                y: 100,
                label: "text6"
            }, {
                x: 125,
                y: 100,
                label: "text7"
            }, {
                x: 150,
                y: 100,
                label: "text8"
            }, {
                x: 200,
                y: 100,
                label: "text9"
            }]);

            // check that the numbers were drawn in the correct places
            let dataPoints = integrationEnv.enviromentVariables.d3.selectors[".data-display-point"].innerData;
            assert.equal(dataPoints.length, 7)
            expect(dataPoints.map(d => {
                return {
                    x: Math.round(d.x),
                    y: Math.round(d.y)
                }
            }).sort((a, b) => a.x - b.x == 0 ? a.y - b.y : a.x - b.x)).to.eql([{
                x: 100,
                y: 0,
            }, {
                x: 100,
                y: 0,
            }, {
                x: 100,
                y: 28,
            }, {
                x: 100,
                y: 70,
            }, {
                x: 150,
                y: 44,
            }, {
                x: 150,
                y: 70,
            }, {
                x: 200,
                y: 35,
            }]);
        });
    });


    describe('table - warp binding test', function () {
        it('warp binding should move comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            // add a warp binding at 40%, and drag to 20%
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 140, y: 110 }, { x: 120, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].linePercent, 0.2);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].timeCell.getValue(), 0.4);

            // check that a table row was created with a time
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[0].dataCells[0].getValue(), 0.4);
            // check that row is displaying
            assert.equal(IntegrationUtils.getLastHoTable(integrationEnv).init.data[0][0], "0.4");
            assert.equal(IntegrationUtils.getLastHoTable(integrationEnv).init.data[0][1], "");

            // add a comment
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 120, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 1, "annotation not created");
            assert.equal(annotationSet[0].x, 120);
            assert.equal(annotationSet[0].y, 100);

            // add a second comment
            IntegrationUtils.clickLine({ x: 150, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 2, "annotation not created");
            // TODO: Actually, create a binding for the row as well so the comment stick where it was clicked
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);

            // check that two table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[1].dataCells[1].val, "0.4");
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[2].dataCells[1].val, "1");
            let lastCreatedTable = integrationEnv.enviromentVariables.handsontables[integrationEnv.enviromentVariables.handsontables.length - 1];
            assert.equal(lastCreatedTable.init.data.length, 3);
            assert.equal(lastCreatedTable.init.data[1][0], "0.4");
            assert.equal(lastCreatedTable.init.data[1][1], "0.4");
            assert.equal(lastCreatedTable.init.data[2][0], "1");
            assert.equal(lastCreatedTable.init.data[2][1], "1");

            // check that the annotation was bound to the line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].timeCell.getValue(), 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].dataCell.getValue(), "0.4");
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].timeCell.getValue(), 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].dataCell.getValue(), "1");


            // move the warp binding
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let d = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].innerData[0];
            let dragStart = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].eventCallbacks.pointerdown;
            let drag = (point) => { IntegrationUtils.pointerMove(point, integrationEnv) };

            dragStart({ x: 120, y: 100 }, d);
            drag({ x: 150, y: 110 }, d);
            IntegrationUtils.pointerUp({ x: 150, y: 110 }, integrationEnv)

            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].linePercent, 0.5);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].timeCell.getValue(), 0.4);

            // check that comments moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 2)
            assert.equal(annotationSet[0].x, 150);
            assert.equal(annotationSet[0].y, 100);
            assert.equal(annotationSet[0].text, "0.4");
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);
            assert.equal(annotationSet[1].text, "1");

            // add and drag another pin (with 0.4 mapped to 0.5, 0.75 should be 0.7)
            IntegrationUtils.dragLine([{ x: 175, y: 110 }, { x: 170, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[1].linePercent, 0.7);
            expect(integrationEnv.ModelController.getModel().getAllWarpBindingData()[1].timeCell.getValue()).to.be.closeTo(0.7, 0.0000001);

            // update the time cells
            // check the table is what we expect it to be
            lastCreatedTable = integrationEnv.enviromentVariables.handsontables[integrationEnv.enviromentVariables.handsontables.length - 1];
            expect(lastCreatedTable.init.data).to.eql([['0.4', ''], ['0.4', '0.4'], ['1', '1'], ['0.7', '']])
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].timeCell.getValue(), 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].linePercent, 0.5);

            lastCreatedTable.init.afterChange([[0, 0, "0.4", "0.2"]])

            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].timeCell.getValue(), 0.2);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].linePercent, 0.5);

            // check the the comment moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 2)
            assert.equal(annotationSet[0].x, 158);
            assert.equal(annotationSet[0].y, 100);
            assert.equal(annotationSet[0].text, "0.4");
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);
            assert.equal(annotationSet[1].text, "1");
        });
    });

    describe('Data - warp binding test', function () {
        it('should create a warp point for a dragged comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);


            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 0);

            // drag the comment
            let targetData = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId]
                .eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, targetData[2]);
            IntegrationUtils.pointerMove({ x: 130, y: 130 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 150 }, integrationEnv);

            // check that there are still three table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // check that a binding was created for the annotation row
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet[2].binding.cellBindingId, targetData[2].binding.cellBindingId);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].rowId, annotationSet[2].binding.rowId);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData()[0].timeCell.getValue(), 0.2);

            // check that the comment is where it's expect to be
            assert.equal(annotationSet[2].x, 140);
            assert.equal(annotationSet[2].y, 100);
            assert.equal(annotationSet[2].offsetX, 0);
            assert.equal(annotationSet[2].offsetY, 50, "offset not updated");
        });

        it('should set the offset correctly for dragged comment creating warp point', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 200 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 180 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // get the drag functions
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(annotationSet[2].offsetX).to.be.closeTo(10, 0.1);
            expect(annotationSet[2].offsetY).to.be.closeTo(10, 0.1);


            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllWarpBindingData().length, 0);

            // drag the comment
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].eventCallbacks.pointerdown;
            let targetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            onCommentDragStart({ clientX: 130, clientY: 190 }, targetSet[2]);
            IntegrationUtils.pointerMove({ x: 150, y: 170 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 160, y: 180 }, integrationEnv);

            // check that there are still three table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // check that the offset is what it's expect to be
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(annotationSet[2].x).to.be.closeTo(140, 0.1);
            expect(annotationSet[2].y).to.be.closeTo(160, 0.1);
            expect(annotationSet[2].offsetX).to.be.closeTo(20, 0.1);
            expect(annotationSet[2].offsetY).to.be.closeTo(20, 0.1);
        });
    });

    describe('Data linking - eraser test', function () {
        it('should correctly add end warp points', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 0, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 100, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 5, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 50, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 95, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            IntegrationUtils.erase([
                { x: 30, y: 10 },
                { x: 30, y: 100 },
                { x: 70, y: 100 },
                { x: 70, y: 10 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[2].warpBindings.length, 1);

            let id1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let id2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let id3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            let warpBindingData = integrationEnv.ModelController.getModel().getAllWarpBindingData();
            expect(warpBindingData.map(wbd => wbd.timeCell.getValue())).to.eql([0.05, 0.50, 0.95]);
            expect(warpBindingData.map(wbd => wbd.timelineId)).to.eql([id1, id2, id3]);
            expect(warpBindingData.map(wbd => Math.round(wbd.linePercent * 100) / 100)).to.eql([0.25, 0.47, 0.74]);
        });

        it('should eliminate and split cell bindings', function () {
            integrationEnv.mainInit();

            // Draw the line
            let longerLine = [
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }
            ];
            IntegrationUtils.drawLine(longerLine, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            // Link Data
            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.getLastHoTable(integrationEnv).init.afterCreateRow(0, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert(integrationEnv.enviromentVariables.handsontables.length > 0);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],
                [1, 0, "", "1"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "2"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "1.3"], [3, 1, "", "text4"], [3, 2, "", "10"],
                [4, 0, "", "1.1"], [4, 1, "", "text6"], [4, 2, "", "12"],
                [5, 0, "", "1.9"], [5, 1, "", "text7"], [5, 2, "", "17"],
            ])

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 5, 2]];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 12);
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData().map(cbd => Math.round(cbd.linePercent * 100) / 100).sort())
                .to.eql([0, 0, 0, 0, 0.1, 0.1, 0.3, 0.3, 0.9, 0.9, 1, 1])

            // this erases a chunk between .26 and .32 percent of the line
            IntegrationUtils.erase([{ x: 150, y: 102 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 10);
        })
    })
    describe('Data Highlight test', function () {
        it('should highlight timeline bound points', function () {
            integrationEnv.mainInit();

            // Draw the line
            let longerLine = [
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }
            ];
            IntegrationUtils.drawLine(longerLine, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            // Link Data
            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.getLastHoTable(integrationEnv).init.afterCreateRow(0, 3);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],
                [1, 0, "", "1"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "2"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "1.3"], [3, 1, "", "text4"], [3, 2, "", "10"],
                [4, 0, "", "1.1"], [4, 1, "", "text6"], [4, 2, "", "12"],
                [5, 0, "", "1.9"], [5, 1, "", "text7"], [5, 2, "", "17"],
            ])

            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 3, 1]];
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timelineTarget'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);
            timeLineTargets.eventCallbacks['mouseover']({ x: 150, y: 102 }, data);

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert(integrationEnv.enviromentVariables.handsontables.length > 0);
            let renderer = IntegrationUtils.getLastHoTable(integrationEnv).init.cells().renderer;

            //check bound time rows
            for (let i = 0; i < 4; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 0)
                should.not.exist(td.style.filter)
            }
            //check unbound time rows
            for (let i = 4; i < 6; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 0)
                should.exist(td.style.filter)
            }
            //check bound data rows
            for (let i = 0; i < 4; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 1)
                should.not.exist(td.style.filter)
            }
            //check unbound data rows
            for (let i = 4; i < 6; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 1)
                should.exist(td.style.filter)
            }
            // check unbound col
            for (let i = 0; i < 6; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 2)
                should.exist(td.style.filter)
            }

            timeLineTargets.eventCallbacks['mouseout']({ x: 150, y: 102 }, data);
            // all data showing again
            for (let i = 0; i < 6; i++) {
                let td = { style: {} };
                renderer({}, td, i, 0, 0)
                should.not.exist(td.style.filter)
                renderer({}, td, i, 0, 1)
                should.not.exist(td.style.filter)
                renderer({}, td, i, 0, 2)
                should.not.exist(td.style.filter)
            }

            let cirleData = integrationEnv.enviromentVariables.d3.selectors['.data-target-point'];
            data = cirleData.innerData[1];
            cirleData.eventCallbacks['mouseover']({ x: 150, y: 102 }, data);
            // all data showing again
            for (let i = 0; i < 6; i++) {
                if (i == 1) {
                    let td = { style: {} };
                    // the single set data cell
                    renderer({}, td, i, 0, 1)
                    should.not.exist(td.style.filter)

                    // the single set time cell
                    td = { style: {} };
                    renderer({}, td, i, 0, 0)
                    should.not.exist(td.style.filter)

                    td = { style: {} };
                    renderer({}, td, i, 0, 2)
                    should.exist(td.style.filter)
                } else {
                    let td = { style: {} };
                    renderer({}, td, i, 0, 0)
                    should.exist(td.style.filter)

                    td = { style: {} };
                    renderer({}, td, i, 0, 1)
                    should.exist(td.style.filter)

                    td = { style: {} };
                    renderer({}, td, i, 0, 2)
                    should.exist(td.style.filter)
                }
            }
        })
    })
});
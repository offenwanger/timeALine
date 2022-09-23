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
            // WARNING: This test liable to break when moved to another timezone. (written for CET)
            integrationEnv.mainInit();

            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.getLastHoTable(integrationEnv).init.afterCreateRow(0, 5);

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert(integrationEnv.enviromentVariables.handsontables.length > 0);

            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],

                [1, 0, "", "2022"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "Jan 30, 2022"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "2022-01-03"], [3, 1, "", "text4"], [3, 2, "", "10"],

                [4, 0, "", "2022-01-6"], [4, 1, "", "text6"], [4, 2, "", "text7"],
                [5, 0, "", "Jan 15, 2022"], [5, 1, "", "text8"], [5, 2, "", "13"],
                [6, 0, "", "2022-01-27"], [6, 1, "", "15"], [6, 2, "", "text9"],
                [7, 0, "", "Jan 2022"], [7, 1, "", "16"], [7, 2, "", "18"],
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
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + integrationEnv.ModelController.getModel().getAllTimelines()[0].id].innerData;
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
                x: 107,
                y: 100,
                label: "text4"
            }, {
                x: 100,
                y: 100,
                label: "text5"
            }, {
                x: 117,
                y: 100,
                label: "text6"
            }, {
                x: 117,
                y: 100,
                label: "text7"
            }, {
                x: 148,
                y: 100,
                label: "text8"
            }, {
                x: 190,
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
                x: 107,
                y: 70,
            }, {
                x: 148,
                y: 44,
            }, {
                x: 190,
                y: 35,
            }]);
        });
    });


    describe('table - time pin test', function () {
        it('time pin should move comment', function () {
            integrationEnv.mainInit();

            // draw a line, bind data
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            // add a time pin at 40%, and drag to 20%
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 140, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.40 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // add a comment
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 3, "annotation not created");
            assert.equal(annotationSet[2].x, 125);
            assert.equal(annotationSet[2].y, 100);

            // add a second comment
            IntegrationUtils.clickLine({ x: 150, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 4, "annotation not created");
            assert.equal(annotationSet[3].x, 150);
            assert.equal(annotationSet[3].y, 100);

            // check that two table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 5);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[3].dataCells[1].val, "<text>");
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[4].dataCells[1].val, "<text>");
            let lastCreatedTable = integrationEnv.enviromentVariables.handsontables[integrationEnv.enviromentVariables.handsontables.length - 1];
            assert.equal(lastCreatedTable.init.data.length, 5);
            assert.equal(lastCreatedTable.init.data[3][0], DataUtil.getFormattedDate(new Date("Jan 14, 2021")));
            assert.equal(lastCreatedTable.init.data[3][1], "<text>");
            assert.equal(lastCreatedTable.init.data[4][0], DataUtil.getFormattedDate(new Date("Jan 16, 2021")));
            assert.equal(lastCreatedTable.init.data[4][1], "<text>");

            // check that the annotation was bound to the line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[2].timeCell.getValue(), new Date("Jan 14, 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[2].dataCell.getValue(), "<text>");
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[3].timeCell.getValue(), new Date("Jan 16, 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[3].dataCell.getValue(), "<text>");

            // move the time pin
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let tickTargets = integrationEnv.enviromentVariables.d3.selectors['.pinTickTarget_' + timelineId];
            tickTargets.eventCallbacks.pointerdown({ clientX: 150, clientY: 110 }, tickTargets.innerData[0]);
            IntegrationUtils.pointerMove({ x: 150, y: 110 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 110 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.40 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // check that comments moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 4)
            assert.equal(annotationSet[2].x, 150);
            assert.equal(annotationSet[2].y, 100);
            assert.equal(annotationSet[2].text, '<text>');
            assert.equal(Math.round(annotationSet[3].x), 167);
            assert.equal(annotationSet[3].y, 100);
            assert.equal(annotationSet[3].text, '<text>');

            // add and drag another pin (with 0.4 mapped to 0.5, 0.75 should be 0.7)
            IntegrationUtils.dragLine([{ x: 175, y: 110 }, { x: 170, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[1].linePercent, 0.7);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[1].timeStamp, new Date("Jan 17 2021").getTime());

            // update the time cells
            // check the table is what we expect it to be
            lastCreatedTable = integrationEnv.enviromentVariables.handsontables[integrationEnv.enviromentVariables.handsontables.length - 1];
            expect(lastCreatedTable.init.data).to.eql([
                ['Jan 10, 2021', 'sometext1', ''],
                ['Jan 20, 2021', 'sometext3', ''],
                ['', '', ''],
                ['Jan 14, 2021 00:00:00', '<text>', ''],
                ['Jan 16, 2021 00:00:00', '<text>', '']
            ])
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 14 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);

            lastCreatedTable.init.afterChange([[3, 0, 'Jan 14, 2021 00:00:00', "Jan 12, 2021"]])

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 14 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);

            // check the the comment moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet.length, 4)
            assert.equal(annotationSet[2].x, 125);
            assert.equal(annotationSet[2].y, 100);
            assert.equal(annotationSet[2].text, "<text>");
            assert.equal(Math.round(annotationSet[3].x), 163);
            assert.equal(annotationSet[3].y, 100);
            assert.equal(annotationSet[3].text, "<text>");
        });
    });

    describe('Data - time pin test', function () {
        it('should create a time pin for a dragged comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the comment
            let targetData = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId]
                .eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, targetData[2]);
            IntegrationUtils.pointerMove({ x: 130, y: 130 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 150 }, integrationEnv);

            // check that there are still the six table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // check that a binding was created for the annotation row
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            assert.equal(annotationSet[2].binding.cellBindingId, targetData[2].binding.cellBindingId);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 12 2021").getTime());

            // check that the comment is where it's expect to be
            assert.equal(annotationSet[2].x, 140);
            assert.equal(annotationSet[2].y, 100);
            assert.equal(annotationSet[2].offsetX, 0);
            assert.equal(annotationSet[2].offsetY, 50, "offset not updated");
        });

        it('should create a time pin for a dragged data point', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "<text1>"],
                ["Jan 15, 2021", "10"],
                ["Jan 20, 2021", "<text2>"]
            ], integrationEnv)

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the point
            let targetData = integrationEnv.enviromentVariables.d3.selectors[".data-target-point"].innerData;
            assert.equal(targetData.length, 1);
            assert.equal(targetData[0].x, 150);
            assert.equal(targetData[0].y, 0);
            integrationEnv.enviromentVariables.d3.selectors[".data-target-point"]
                .eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, targetData[0]);
            IntegrationUtils.pointerMove({ x: 130, y: 130 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 150 }, integrationEnv);

            // check that there are still the six table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // check that a binding was created
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 15 2021").getTime());

            // check that the point is where it's expect to be
            targetData = integrationEnv.enviromentVariables.d3.selectors[".data-target-point"].innerData;
            assert.equal(targetData.length, 1);
            assert.equal(targetData[0].x, 140);
            assert.equal(targetData[0].y, 0);
        });


        it('should set the offset correctly for dragged comment creating time pin', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 200 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 180 }, timelineId, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // get the drag functions
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(annotationSet[2].offsetX).to.be.closeTo(10, 0.1);
            expect(annotationSet[2].offsetY).to.be.closeTo(10, 0.1);


            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the comment
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].eventCallbacks.pointerdown;
            let targetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target_" + timelineId].innerData;
            onCommentDragStart({ clientX: 130, clientY: 190 }, targetSet[2]);
            IntegrationUtils.pointerMove({ x: 150, y: 170 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 160, y: 180 }, integrationEnv);

            // check that there are still three extra table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // check that the offset is what it's expect to be
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData;
            expect(annotationSet[2].x).to.be.closeTo(140, 0.1);
            expect(annotationSet[2].y).to.be.closeTo(160, 0.1);
            expect(annotationSet[2].offsetX).to.be.closeTo(20, 0.1);
            expect(annotationSet[2].offsetY).to.be.closeTo(20, 0.1);
        });
    });

    describe('Data linking - eraser test', function () {
        it('should correctly add end time pins', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

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
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[2].timePins.length, 1);

            let timePins = integrationEnv.ModelController.getModel().getAllTimelines().map(t => t.timePins);
            expect(timePins.map(b => b[0].timeStamp)).to.eql([
                0.05 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                0.50 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                0.95 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
            ]);
            expect(timePins.map(b => Math.round(b[0].linePercent * 100) / 100)).to.eql([0.25, 0.47, 0.74]);
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
                [1, 0, "", "Jan 10, 2022"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "Jan 20, 2022"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "Jan 13, 2022"], [3, 1, "", "text4"], [3, 2, "", "10"],
                [4, 0, "", "Jan 11, 2022"], [4, 1, "", "text6"], [4, 2, "", "12"],
                [5, 0, "", "Jan 19, 2022"], [5, 1, "", "text7"], [5, 2, "", "17"],
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
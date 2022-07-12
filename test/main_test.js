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

        it('draw data points for linked cells', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            integrationEnv.enviromentVariables.handsontables[0].init.afterCreateRow(0, 1);

            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.enviromentVariables.handsontables.length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],
                [1, 0, "", "1"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "2"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "1.5"], [3, 1, "", "text4"], [3, 2, "", "10"],
            ])

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 150, y: 100 },
                { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 3, 2]];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // check that all 8 data cells were bound, with one axis for each column
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 8);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 2);

            // check that the comments were drawn in the correct places
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 5)
            expect(annotationSet.map(a => {
                return {
                    x: a.x,
                    y: a.y,
                    label: a.note.label
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
            }]);

            // check that the numbers were drawn in the correct places
            let dataPoints = integrationEnv.enviromentVariables.d3.selectors[".data-display-point"].innerData;
            assert.equal(dataPoints.length, 3)
            expect(dataPoints.map(d => {
                return {
                    x: d.x,
                    y: d.y
                }
            }).sort((a, b) => a.x - b.x == 0 ? a.y - b.y : a.x - b.x)).to.eql([{
                x: 100,
                y: 0,
            }, {
                x: 100,
                y: 70,
            }, {
                x: 150,
                y: 0,
            }]);
        });
    });


    describe('table - warp binding test', function () {
        it('warp binding should move comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getAllTimelines()[0].id;

            // add a warp binding at 40%, and drag to 20%
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 140, y: 110 }, { x: 120, y: 110 }], timelineId, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.2);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.4);

            // check that a table row was created with a time
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[0].dataCells[0].getValue(), 0.4);
            // check that row is displaying
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[0][0], "0.4");
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[0][1], "");

            // add a comment
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 120, y: 110 }, timelineId, integrationEnv.enviromentVariables);
            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 1, "annotation not created");
            assert.equal(annotationSet[0].x, 120);
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
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[1].dataCells[1].val, "0.4");
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows[2].dataCells[1].val, "1");
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data.length, 3);
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[1][0], "0.4");
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[1][1], "0.4");
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[2][0], "1");
            assert.equal(integrationEnv.enviromentVariables.handsontables[0].init.data[2][1], "1");

            // check that the annotation was bound to the line
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[0].timeCell.getValue(), 0.4);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[0].dataCell.getValue(), "0.4");
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[1].timeCell.getValue(), 1);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[1].dataCell.getValue(), "1");


            // move the warp binding
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let d = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].innerData[0];
            let dragStart = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.start;
            let drag = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.drag;
            let dragEnd = integrationEnv.enviromentVariables.d3.selectors[".warpTickTarget_" + timelineId].drag.end;
            dragStart({ x: 120, y: 100 }, d);
            drag({ x: 150, y: 110 }, d);
            dragEnd({ x: 150, y: 110 }, d);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.5);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.4);

            // check that comments moved
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 2)
            assert.equal(annotationSet[0].x, 150);
            assert.equal(annotationSet[0].y, 100);
            assert.equal(annotationSet[0].note.label, "0.4");
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);
            assert.equal(annotationSet[1].note.label, "1");

            // add and drag another pin (with 0.4 mapped to 0.5, 0.75 should be 0.7)
            IntegrationUtils.dragLine([{ x: 175, y: 110 }, { x: 170, y: 110 }], timelineId, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[1].linePercent, 0.7);
            expect(integrationEnv.ModelController.getAllWarpBindingData()[1].timeCell.getValue()).to.be.closeTo(0.7, 0.0000001);

            // update the time cells
            // check the table is what we expect it to be
            expect(integrationEnv.enviromentVariables.handsontables[0].init.data).to.eql([['0.4', ''], ['0.4', '0.4'], ['1', '1'], ['0.7', '']])
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.4);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.5);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([[0, 0, "0.4", "0.2"]])

            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.2);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.5);

            // check the the comment moved
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 2)
            assert.equal(annotationSet[0].x, 158);
            assert.equal(annotationSet[0].y, 100);
            assert.equal(annotationSet[0].note.label, "0.4");
            assert.equal(annotationSet[1].x, 200);
            assert.equal(annotationSet[1].y, 100);
            assert.equal(annotationSet[1].note.label, "1");
        });
    });

    describe('Data - warp binding test', function () {
        it('should create a warp point for a dragged comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 3);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 3);

            // get the drag functions
            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            let fakeThis = {
                attr: function () {
                    return annotationSet[2].className;
                }
            }
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.start;
            let onCommentDrag = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.drag;
            let onCommentDragEnd = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.end;

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 0);

            // drag the comment
            onCommentDragStart.call(fakeThis, { x: 130, y: 110 });
            onCommentDrag.call(fakeThis, { x: 140, y: 130 });
            onCommentDragEnd.call(fakeThis, { x: 140, y: 130 });

            // check that there are still three table rows
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 3);

            // check that a binding was created for the annotation row
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].rowId, annotationSet[2].binding.rowId);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData()[0].timeCell.getValue(), 0.2);

            // check that the comment is where it's expect to be
            assert.equal(annotationSet[2].x, 140);
            assert.equal(annotationSet[2].y, 100);
            assert.equal(annotationSet[2].dx, 10);
            assert.equal(annotationSet[2].dy, 40, "offset not updated");
        });

        it('should set the offset correctly for dragged comment creating warp point', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 100 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 200 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 120, y: 180 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 3);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 3);

            // get the drag functions
            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            let fakeThis = {
                attr: function () {
                    return annotationSet[2].className;
                }
            }
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.start;
            let onCommentDrag = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.drag;
            let onCommentDragEnd = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.end;

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getAllWarpBindingData().length, 0);

            // drag the comment
            onCommentDragStart.call(fakeThis, { x: 130, y: 190 });
            onCommentDrag.call(fakeThis, { x: 150, y: 170 });
            onCommentDragEnd.call(fakeThis, { x: 150, y: 170 });

            // check that there are still three table rows
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTables()[0].dataRows.length, 3);

            // check that the offset is what it's expect to be
            annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            expect(annotationSet[2].x).to.be.closeTo(140, 0.1);
            expect(annotationSet[2].y).to.be.closeTo(160, 0.1);
            expect(annotationSet[2].dx).to.be.closeTo(20, 0.1);
            expect(annotationSet[2].dy).to.be.closeTo(20, 0.1);
        });
    });

    describe('Data linking - eraser test', function () {
        it('should correctly add end warp points', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1, "line not drawn");

            // add a few comments
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 0, y: 10 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 100, y: 10 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 5, y: 10 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 50, y: 10 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 95, y: 10 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            IntegrationUtils.erase([
                { x: 30, y: 10 },
                { x: 30, y: 100 },
                { x: 70, y: 100 },
                { x: 70, y: 10 }], 10, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[1].warpBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[2].warpBindings.length, 1);

            let id1 = integrationEnv.ModelController.getAllTimelines()[0].id;
            let id2 = integrationEnv.ModelController.getAllTimelines()[1].id;
            let id3 = integrationEnv.ModelController.getAllTimelines()[2].id;

            let warpBindingData = integrationEnv.ModelController.getAllWarpBindingData();
            expect(warpBindingData.map(wbd => wbd.timeCell.getValue())).to.eql([0.05, 0.50, 0.95]);
            expect(warpBindingData.map(wbd => wbd.timelineId)).to.eql([id1, id2, id3]);
            expect(warpBindingData.map(wbd => Math.round(wbd.linePercent * 100) / 100)).to.eql([0.25, 0.5, 0.75]);
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
            IntegrationUtils.drawLine(longerLine, integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1, "line not drawn");

            // Link Data
            IntegrationUtils.clickButton('#add-datasheet-button', integrationEnv.enviromentVariables.$);
            integrationEnv.enviromentVariables.handsontables[0].init.afterCreateRow(0, 3);
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);
            assert.equal(integrationEnv.enviromentVariables.handsontables.length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "textTime"], [0, 1, "", "10"], [0, 2, "", "text1"],
                [1, 0, "", "1"], [1, 1, "", "20"], [1, 2, "", "text5"],
                [2, 0, "", "2"], [2, 1, "", "text2"], [2, 2, "", "text3"],
                [3, 0, "", "1.3"], [3, 1, "", "text4"], [3, 2, "", "10"],
                [4, 0, "", "1.1"], [4, 1, "", "text6"], [4, 2, "", "12"],
                [5, 0, "", "1.9"], [5, 1, "", "text7"], [5, 2, "", "17"],
            ])

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 5, 2]];

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 12);
            expect(integrationEnv.ModelController.getAllCellBindingData().map(cbd => Math.round(cbd.linePercent * 100) / 100).sort())
                .to.eql([0, 0, 0, 0, 0.1, 0.1, 0.3, 0.3, 0.9, 0.9, 1, 1])

            // this erases a chunk between .26 and .32 percent of the line
            IntegrationUtils.erase([{ x: 150, y: 102 }], 10, integrationEnv.enviromentVariables);

            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 10);
        })
    })
});
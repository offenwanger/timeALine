let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test ModelController', function () {
    let integrationEnv;
    let modelController;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        modelController = new integrationEnv.enviromentVariables.ModelController();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('percent - time mapping tests', function () {
        it('should caluclate NUM with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5), 0.5);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25), 0.25);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.8), 0.8);

            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.5), 0.5);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.25), 0.25);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.8), 0.8);
        });

        it('should caluclate NUM with one positive warp binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let time = 1 / 3;
            let percent = 2 / 3;

            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null,
                tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0), 0);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25), 0.125);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5), 0.25);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.8), 0.4);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1), 0.5);

            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0), 0);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.125), 0.25);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.25), 0.5);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.4), 0.8);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.5), 1);
        });

        it('should caluclate NUM with one negative warp binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let time = -1 / 3;
            let percent = 1 / 3;

            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null,
                tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(-1, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25)).to.be.closeTo(-0.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.75)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(1, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -0.5)).to.be.closeTo(0.25, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(0.75, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate NUM with one positive cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            modelController.addBoundTextRow("", 0.5, timeline.id);

            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0), 0);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25), 0.125);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5), 0.25);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.8), 0.4);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1), 0.5);

            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0), 0);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.125), 0.25);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.25), 0.5);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.4), 0.8);
            assert.equal(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.5), 1);
        });

        it('should caluclate NUM with one negative cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            modelController.addBoundTextRow("", -1, timeline.id);

            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(-1, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25)).to.be.closeTo(-0.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.75)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(1, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -0.5)).to.be.closeTo(0.25, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(0.75, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate NUM with two cell bindings', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            modelController.addBoundTextRow("", -2, timeline.id);
            modelController.addBoundTextRow("", -1, timeline.id);

            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(-2, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25)).to.be.closeTo(-1.75, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(-1.5, .0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.75)).to.be.closeTo(-1.25, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(-1, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -2)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1.75)).to.be.closeTo(0.25, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1.5)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1.25)).to.be.closeTo(0.75, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1)).to.be.closeTo(1, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -3)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate NUM with one cell binding and one warp binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let time = -2 / 3;
            let percent = 1 / 3;

            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null, tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            modelController.addBoundTextRow("", -1, timeline.id);

            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(-1, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25)).to.be.closeTo(-0.75, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(-0.5, .0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.75)).to.be.closeTo(-0.25, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(0, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -1)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -0.75)).to.be.closeTo(0.25, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -0.5)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, -0.25)).to.be.closeTo(0.75, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate NUM with one cell binding between two warp bindings', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let time = 3;
            let percent = 1 / 3;

            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null, tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            let time2 = 5;
            let percent2 = 2 / 3;

            let tableRowData2 = modelController.addTimeRow(time2);
            let warpBindingData2 = new DataStructs.WarpBindingData(timeline.id, null, tableRowData2.tableId, tableRowData2.rowId, tableRowData2.timeCell,
                percent2);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData2);

            modelController.addBoundTextRow("", 3, timeline.id);

            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0)).to.be.closeTo(1, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25)).to.be.closeTo(2.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5)).to.be.closeTo(4, .0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.75)).to.be.closeTo(5.5, 0.0001);
            expect(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(7, 0.0001);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 1)).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 2.5)).to.be.closeTo(0.25, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 4)).to.be.closeTo(0.5, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 5.5)).to.be.closeTo(0.75, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.NUM, 7)).to.be.closeTo(1, 0.0001);
        });


        it('should map TEXT to 0 or a binding', function () {
            // TODO: map text based on Index
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let time = "summer";
            let percent = 0.25;

            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null, tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.TEXT, "winter")).to.be.closeTo(0, 0.0001);
            expect(modelController.mapTimeToLinePercent(timeline.id, DataTypes.TEXT, "summer")).to.be.closeTo(0.25, 0.0001);
        });
    })

    describe('Cell binding test', function () {
        it('should bind a cell without error', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.5";
            table.dataRows[0].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [new DataStructs.CellBinding(table.id, table.dataRows[0].id, table.dataColumns[1].id, table.dataRows[0].dataCells[1].id)])

            assert.equal(modelController.getAllCellBindingData().length, 1);
            assert.equal(modelController.getAllCellBindingData()[0].linePercent, 1);
        });
    })

    describe('delete points tests', function () {
        it('should break one line into two', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);

            assert.equal(modelController.getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.25";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "0.75";
            table.dataRows[1].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.id, table.dataRows[0].id, table.dataColumns[1].id, table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.id, table.dataRows[1].id, table.dataColumns[1].id, table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(modelController.getAllCellBindingData().length, 2);
            modelController.breakTimeline(modelController.getAllTimelines()[0].id, [
                {
                    label: SEGMENT_LABELS.UNAFFECTED,
                    points: [{ x: 0, y: 0 },
                    { x: 5, y: 0 },
                    { x: 10, y: 0 },
                    { x: 14, y: 0 },]
                },
                {
                    label: SEGMENT_LABELS.DELETED,
                    points: [
                        { x: 14, y: 0 },
                        { x: 15, y: 0 },
                        { x: 16, y: 0 }]
                },
                {
                    label: SEGMENT_LABELS.UNAFFECTED,
                    points: [
                        { x: 16, y: 0 },
                        { x: 20, y: 0 }]
                },
            ]);

            assert.equal(modelController.getAllTimelines().length, 2);
            assert.equal(modelController.getAllTimelines()[0].cellBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[1].cellBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[1].warpBindings.length, 1);
        });
    })


    describe('delete updateTimelinePoints tests', function () {
        it('should update the points', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            let time = "summer";
            let percent = 0.75;
            let tableRowData = modelController.addTimeRow(time);
            let warpBindingData = new DataStructs.WarpBindingData(timeline.id, null, tableRowData.tableId, tableRowData.rowId, tableRowData.timeCell,
                percent);
            modelController.addOrUpdateWarpBinding(timeline.id, warpBindingData);

            let oldSegments = PathMath.segmentPath(timeline.points, true, (point) => point.x > 11 ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);
            let newSegments = oldSegments.map(s => { return { label: s.label, points: [...s.points] } });
            newSegments[1].points = [{ x: 15, y: 0 }, { x: 20, y: 10 }, { x: 20, y: 0 }]

            modelController.updateTimelinePoints(timeline.id, oldSegments, newSegments);

            assert.equal(modelController.getAllTimelines().length, 1);
            expect(modelController.getAllTimelines()[0].points.map(p => p.y)).to.eql([0, 0, 0, 0, 0, 10, 0]);
            assert.equal(modelController.getAllTimelines()[0].warpBindings.length, 1);
            expect(modelController.getAllTimelines()[0].warpBindings[0].linePercent).to.be.closeTo(0.55, 0.01);

        });
    })

    describe('tableUpdate tests', function () {
        it('should delete axis whose cells changed type', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[i].id, table.dataColumns[1].id, table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getAllCellBindingData().length, 10);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);

            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = "text";
            }

            modelController.tableUpdated(table, TableChange.UPDATE_CELLS, table.dataRows.map(r => r.dataCells[1].id));
            assert.equal(modelController.getAllCellBindingData().length, 10);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis whose cells were in a deleted row', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[i].id, table.dataColumns[1].id, table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getAllCellBindingData().length, 10);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);

            let deleteRows = [table.dataRows[5].id, table.dataRows[6].id, table.dataRows[7].id];
            table.dataRows = table.dataRows.filter((r, i) => i < 5 || i > 7);
            table.dataRows.forEach((r, i) => { if (i > 7) r.index -= 3 });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getAllCellBindingData().length, 7);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis for deleted column', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i > 3) table.dataRows[i].dataCells[1].val = i;
                table.dataRows[i].dataCells[2].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[i].id, table.dataColumns[1].id, table.dataRows[i].dataCells[1].id));
                cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[i].id, table.dataColumns[2].id, table.dataRows[i].dataCells[2].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getAllCellBindingData().length, 20);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 2);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val1, 4);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[1].val1, 0);

            let deleteCols = [table.dataColumns[1].id, table.dataRows[3].id];
            table.dataColumns = table.dataColumns.filter((c, i) => i != 1 && i != 3);
            table.dataRows.forEach((r) => { r.dataCells = r.dataCells.filter(cell => !deleteCols.includes(cell.columnId)) });

            modelController.tableUpdated(table, TableChange.DELETE_COLUMNS, deleteCols);
            assert.equal(modelController.getAllCellBindingData().length, 10);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val1, 0);
        });

        it('should update axis values', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[i].id, table.dataColumns[1].id, table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getAllCellBindingData().length, 10);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val1, 5);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val2, 7);

            let deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getAllTables().length, 1);
            assert.equal(modelController.getAllTables()[0].dataRows.length, 9);
            assert.equal(modelController.getAllCellBindingData().length, 9);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val1, 6);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val2, 7);

            deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });
            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);

            assert.equal(modelController.getAllCellBindingData().length, 8);
            assert.equal(modelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val1, 0);
            assert.equal(modelController.getAllTimelines()[0].axisBindings[0].val2, 7);
        });
    })
});

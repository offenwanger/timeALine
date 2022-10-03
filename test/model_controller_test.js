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
        it('should now have mapping with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 10, 2021").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one cell binding and one time pin that are the same', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 10, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should caluclate time with two cell bindings', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            modelController.addBoundTextRow(timeline.id, "<text1>", "Jan 10, 2022");
            modelController.addBoundTextRow(timeline.id, "<text2>", "Jan 20, 2022");

            let percentToTime = function (percent) { return percent * (new Date("Jan 20, 2022").getTime() - new Date("Jan 10, 2022").getTime()) + new Date("Jan 10, 2022").getTime(); }
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(percentToTime(0.25), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(percentToTime(0.5), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(percentToTime(0.75), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 20, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 12, 2022").getTime())).to.be.closeTo(0.2, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 16, 2022").getTime())).to.be.closeTo(0.6, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(1, 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 9, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 21, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate time with one cell binding and one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 20, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            let percentToTime = function (percent) { return percent * (new Date("Jan 30, 2022").getTime() - new Date("Jan 10, 2022").getTime()) + new Date("Jan 10, 2022").getTime(); }
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(percentToTime(0.25), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(percentToTime(0.5), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(percentToTime(0.75), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 30, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.25, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 25, 2022").getTime())).to.be.closeTo(1, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 30, 2022").getTime())).to.be.closeTo(1, 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 1, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Feb 10, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate time with one cell binding between two time pins', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 15, 2022");

            let timePin = new DataStructs.TimePin(0.25);
            timePin.timeStamp = new Date("Jan 10, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            timePin = new DataStructs.TimePin(0.75);
            timePin.timeStamp = new Date("Jan 20, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);


            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 5, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(new Date("Jan 15, 2022").getTime(), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(new Date("Jan 20, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 25, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 5, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0.25, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(0.75, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 25, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should throw error for get time with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 100), 0);
        });

        it('should throw error for get time one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let timePin = new DataStructs.TimePin(0.3);
            timePin.timeStamp = 100;
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 100), 0);
        });

        it('should throw error for get time with one cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "", 50);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 100), 0);
        });

        it('should map bound cell to a value', function () {
            // TODO: map text based on Index
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "some text", "textTimeValue");
            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            let binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.linePercent, NO_LINE_PERCENT);

            let timePin = new DataStructs.TimePin(0.5);
            modelController.updatePinBinding(timeline.id, timePin);
            modelController.updateTimePinBinding(binding.cellBinding.id, timePin.id);

            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.cellBinding.timePinId, timePin.id);
            assert.equal(binding.linePercent, 0.5);
        });

        it('should map text time to no line percent', function () {
            // TODO: map text based on Index
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "some text", "textTimeValue");
            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            let binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.linePercent, NO_LINE_PERCENT);
        });
    })

    describe('cell binding test', function () {
        it('should bind a cell without error', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "Jan 2022";
            table.dataRows[0].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id)])

            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);
            assert.equal(modelController.getModel().getAllCellBindingData()[0].linePercent, 1);
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

            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "Jan 10, 2022";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "Jan 20, 2022";
            table.dataRows[1].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(modelController.getModel().getAllCellBindingData().length, 2);
            modelController.breakTimeline(modelController.getModel().getAllTimelines()[0].id, [
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

            assert.equal(modelController.getModel().getAllTimelines().length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].timePins.length, 1);
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
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let timePin = new DataStructs.TimePin(0.75);
            modelController.updatePinBinding(timeline.id, timePin);

            let oldSegments = PathMath.segmentPath(timeline.points, (point) => point.x > 11 ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);
            let newSegments = oldSegments.map(s => { return { label: s.label, points: [...s.points] } });
            newSegments[1].points = [{ x: 15, y: 0 }, { x: 20, y: 10 }, { x: 20, y: 0 }]

            modelController.updateTimelinePoints(timeline.id, oldSegments, newSegments);

            assert.equal(modelController.getModel().getAllTimelines().length, 1);
            expect(modelController.getModel().getAllTimelines()[0].points.map(p => p.y)).to.eql([0, 0, 0, 0, 10, 0]);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            expect(modelController.getModel().getAllTimelines()[0].timePins[0].linePercent).to.be.closeTo(0.41, 0.01);

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
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);

            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = "text";
            }

            modelController.tableUpdated(table, TableChange.UPDATE_CELLS, table.dataRows.map(r => r.dataCells[1].id));
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis whose cells were in a deleted row', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);

            let deleteRows = [table.dataRows[5].id, table.dataRows[6].id, table.dataRows[7].id];
            table.dataRows = table.dataRows.filter((r, i) => i < 5 || i > 7);
            table.dataRows.forEach((r, i) => { if (i > 7) r.index -= 3 });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 7);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis for deleted column', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i > 3) table.dataRows[i].dataCells[1].val = i;
                table.dataRows[i].dataCells[2].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[2].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 20);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 4);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[1].val1, 0);

            let deleteCols = [table.dataColumns[1].id, table.dataRows[3].id];
            table.dataColumns = table.dataColumns.filter((c, i) => i != 1 && i != 3);
            table.dataRows.forEach((r) => { r.dataCells = r.dataCells.filter(cell => !deleteCols.includes(cell.columnId)) });

            modelController.tableUpdated(table, TableChange.DELETE_COLUMNS, deleteCols);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 0);
        });

        it('should update axis values', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 5);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);

            let deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getModel().getAllTables().length, 1);
            assert.equal(modelController.getModel().getAllTables()[0].dataRows.length, 9);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 9);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 6);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);

            deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });
            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);

            assert.equal(modelController.getModel().getAllCellBindingData().length, 8);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 0);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);
        });
    })

    describe('undo/redo tests', function () {
        it('should add, undo, redo, then erase without error', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);

            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "Jan 10, 2022";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "Jan 20, 2022";
            table.dataRows[1].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(modelController.getModel().getAllCellBindingData().length, 2);

            modelController.undo();
            // cells are gone but line and table is still there
            assert.equal(modelController.getModel().getAllCellBindingData().length, 0);
            assert.equal(modelController.getModel().getAllTables().length, 1);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.undo();
            // table is gone
            assert.equal(modelController.getModel().getAllCellBindingData().length, 0);
            assert.equal(modelController.getModel().getAllTables().length, 0);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.undo();
            //everything is gone
            assert.equal(modelController.getModel().getAllCellBindingData().length, 0);
            assert.equal(modelController.getModel().getAllTables().length, 0);
            assert.equal(modelController.getModel().getAllTimelines().length, 0);

            modelController.redo();
            // line is back
            assert.equal(modelController.getModel().getAllCellBindingData().length, 0);
            assert.equal(modelController.getModel().getAllTables().length, 0);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.redo();
            // table is back
            assert.equal(modelController.getModel().getAllCellBindingData().length, 0);
            assert.equal(modelController.getModel().getAllTables().length, 1);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.redo();
            // binding is back
            assert.equal(modelController.getModel().getAllCellBindingData().length, 2);
            assert.equal(modelController.getModel().getAllTables().length, 1);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.breakTimeline(modelController.getModel().getAllTimelines()[0].id, [
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

            assert.equal(modelController.getModel().getAllTimelines().length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].timePins.length, 1);

            modelController.undo();
            assert.equal(modelController.getModel().getAllCellBindingData().length, 2);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            modelController.redo();
            assert.equal(modelController.getModel().getAllTimelines().length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].timePins.length, 1);
        });
    });
});


describe('Integration Test ModelController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('data tooltips test', function () {
        it('should show a tooltip with a date', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 200 },
                { x: 150, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");


            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            IntegrationUtils.getLastHoTable(integrationEnv).init.afterChange([
                [0, 0, "", "July 1 2022"], [0, 1, "", "Text1"],
                [1, 0, "", "July 11 2022"], [1, 1, "", "Text2"],
                [2, 0, "", "July 21 2022"], [2, 1, "", "Text3"],
            ]);
            IntegrationUtils.getLastHoTable(integrationEnv).selected = [[0, 0, 2, 1]];
            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 200 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timelineTarget'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);
            timeLineTargets.eventCallbacks['mouseover']({ clientX: 125, clientY: 200 }, data);

            assert.equal(integrationEnv.enviromentVariables.$.selectors["#tooltip-div"].html, DataUtil.getFormattedDate(new Date("Jul 10, 2022 23:32:16")));
        });
    });

    describe('Import Export Test', function () {
        it('should serialize and unserialize to the same object (except for the Ids)', function (done) {
            // Running this as an integration test to test the upload/download buttons code
            integrationEnv.mainInit();
            let timeline = integrationEnv.ModelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);

            integrationEnv.ModelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 245, y: 16 },
                { x: 23, y: 2 },
                { x: 34, y: 1234 }]);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.25";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "0.75";
            table.dataRows[1].dataCells[1].val = "text1";
            integrationEnv.ModelController.addTable(table);

            integrationEnv.ModelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            let originalModel = integrationEnv.ModelController.getModelAsObject();

            integrationEnv.enviromentVariables.$.selectors['#download-button'].eventCallbacks.click();
            integrationEnv.enviromentVariables.window.fileText = integrationEnv.enviromentVariables.URL.objectUrls[0].init[0];

            // clear the data
            integrationEnv.ModelController.setModelFromObject({ canvas: new DataStructs.Canvas(), timelines: [], dataTables: [] });
            let originalFunc = integrationEnv.ModelController.setModelFromObject;

            integrationEnv.ModelController.setModelFromObject = function (result) {
                assert.equal(integrationEnv.ModelController.getModelAsObject().timelines.length, 0);
                assert.equal(integrationEnv.ModelController.getModelAsObject().dataTables.length, 0);

                originalFunc.call(integrationEnv.ModelController, result);

                // Do both directions to make sure we aren't missing anything. 
                TestUtils.deepEquals(integrationEnv.ModelController.getModelAsObject(), originalModel);
                TestUtils.deepEquals(originalModel, integrationEnv.ModelController.getModelAsObject());

                done();
            }

            integrationEnv.enviromentVariables.$.selectors["#upload-button"].eventCallbacks.click();
        });
    });

    describe('Line modification tests', function () {
        it('should extend an timeline with data without moving the data', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let timeline = integrationEnv.ModelController.getModel().getAllTimelines()[0];

            IntegrationUtils.bindDataToLine(timeline.id, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"],
                ["Jan 15, 2021", 2],
                ["Jan 14, 2021", 1.5],
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)

            assert.equal(PathMath.getPathLength(timeline.points), 50)

            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.x)).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.y)).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => item.x)).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => item.y)).to.eql([100, 100, 100]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 50, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 25, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 0, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 0, y: 100 }, integrationEnv);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 150)

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].timeStamp, new Date("Jan 10, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.66666, 0.0001);

            // the data should have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);

            // get the end button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 200)

            // there should be another time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[1].timeStamp, new Date("Jan 20, 2021").getTime());
            // and the first one should have had it's line percent updated
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.5, 0.0001);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 125, 120]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timeline.id]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });

        it('should merge an empty timeline without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.map(p => p.x)).to.eql([0, 50, 75, 100, 150, 175, 200, 250]);
        });

        it('should merge a timeline with data without moving the data when its possible', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 14, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].x, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => Math.round(b.linePercent * 100) / 100)).to.eql([0.33, 0.67]);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            let newTimelineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData.length, 2)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].x, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].y, 100)

            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 14, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.4, 0.6, 0.8]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.x))).to.eql([50, 100, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });

        it('should merge a timeline with data moving the data when its necessary', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 13, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 12, 2021", "Text Note 2"],
                ["Jan 16, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].x, 50)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].x, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId1].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId2].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-point'].eventCallbacks.pointerdown({}, {
                id: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 1);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].timeStamp).to.eql(new Date("Jan 13, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].linePercent).to.be.closeTo(0.33333, 0.0001);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            let newTimelineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData.length, 2)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].x, 50)
            // this one had to move
            expect(selectors[".annotation-text_" + newTimelineId].innerData[1].x).to.be.closeTo(33.333333, 0.0001)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[0].y, 100)
            assert.equal(selectors[".annotation-text_" + newTimelineId].innerData[1].y, 100)

            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].x, 250)
            assert.equal(selectors[".annotation-text_" + timelineId3].innerData[0].y, 100)

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-point'].eventCallbacks.pointerdown({}, {
                id: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 16, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.6]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                // this last data display point had to move to 
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 117]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.x))).to.eql([50, 33, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text_" + timelineId]
                .innerData.map(item => Math.round(item.y))).to.eql([100, 100, 100]);
        });
    });
});
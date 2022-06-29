let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test TableViewer', function () {
    let integrationEnv;
    let getTableViewController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getTableViewController = function () {
            let DataTableController = integrationEnv.enviromentVariables.DataTableController;
            return new DataTableController();
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            let controller = getTableViewController();
            controller.addTable(TestUtils.makeTestTable(3, 3));
        });
    })

    describe('move row test', function () {
        it('should shift one element down the table', function (done) {
            integrationEnv.asyncDone = done;

            let callbackCalled = false;
            let rowCount = 6;
            let controller = getTableViewController();

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql(["0_0", "2_0", "3_0", "4_0", "1_0", "5_0"])
                callbackCalled = true;
            });

            controller.addTable(TestUtils.makeTestTable(rowCount, 3));
            integrationEnv.enviromentVariables.handsontables[0].init.afterRowMove([1], 4)

            assert.equal(callbackCalled, true);
        });

        it('should shift one element up the table', function (done) {
            integrationEnv.asyncDone = done;

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getTableViewController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql(["0_0", "3_0", "1_0", "2_0", "4_0", "5_0"]);
                callbackCalled = true;
            });

            controller.addTable(TestUtils.makeTestTable(rowCount, 3));

            integrationEnv.enviromentVariables.handsontables[0].init.afterRowMove([3], 1)

            assert.equal(callbackCalled, true);
        });

        it('should shift multiple elements down the table', function (done) {
            integrationEnv.asyncDone = done;

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getTableViewController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql(["2_0", "3_0", "4_0", "0_0", "1_0", "5_0"]);
                callbackCalled = true;
            });

            controller.addTable(TestUtils.makeTestTable(rowCount, 3));

            integrationEnv.enviromentVariables.handsontables[0].init.afterRowMove([0, 1], 3)

            assert.equal(callbackCalled, true);
        })

        it('should shift multiple elements up the table', function (done) {
            integrationEnv.asyncDone = done;

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getTableViewController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql(["0_0", "3_0", "4_0", "1_0", "2_0", "5_0"]);
                callbackCalled = true;
            });

            controller.addTable(TestUtils.makeTestTable(rowCount, 3));

            integrationEnv.enviromentVariables.handsontables[0].init.afterRowMove([3, 4], 1);

            assert.equal(callbackCalled, true);
        })
    })


    describe('sort rows test', function () {
        it('should sort all text rows by multiple columns', function (done) {
            let doneCalls = 5;
            let doneCalled = 0;
            integrationEnv.asyncDone = function () {
                // async cleanup
                doneCalled++;
                if (doneCalled == doneCalls) done();
            };

            let callbackCalled = 0;

            let rowCount = 6;

            let controller = getTableViewController();

            controller.addTable(TestUtils.makeTestTable(rowCount, 3));
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });

            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["5_0", "4_0", "3_0", "2_0", "1_0", "0_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 1 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["5_0", "4_0", "3_0", "2_0", "1_0", "0_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 1 }])

            assert.equal(callbackCalled, doneCalls);
        });

        it('should mixed types correctly', function (done) {
            let doneCalls = 2;
            let doneCalled = 0;
            integrationEnv.asyncDone = function () {
                // async cleanup
                doneCalled++;
                if (doneCalled == doneCalls) done();
            };

            let callbackCalled = 0;

            let rowCount = 6;

            let controller = getTableViewController();

            let table = TestUtils.makeTestTable(rowCount, 3);
            table.dataRows[0].dataCells[0].val = "text1"
            table.dataRows[1].dataCells[0].val = "text2"
            table.dataRows[2].dataCells[0].val = "2022-02-03"
            table.dataRows[3].dataCells[0].val = "2022-02-04"
            table.dataRows[4].dataCells[0].val = "7"
            table.dataRows[5].dataCells[0].val = "10"
            controller.addTable(table);

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["2022-02-03", "2022-02-04", "7", "10", "text1", "text2"]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["text2", "text1", "10", "7", "2022-02-04", "2022-02-03"]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled++;
            });
            integrationEnv.enviromentVariables.handsontables[0].init.
                beforeColumnSort([], [{ column: 0 }])

            assert.equal(callbackCalled, doneCalls);
        });
    });


    describe('remove columns and rows test', function () {
        it('should remove one column', function (done) {
            integrationEnv.asyncDone = done;

            let callbackCalled = false;

            let controller = getTableViewController();

            let rowCount = 6;
            let colCount = 5;
            controller.addTable(TestUtils.makeTestTable(rowCount, colCount));

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                assert.equal(table.dataColumns.length, 3);

                expect(table.dataColumns.map(col => col.index).sort()).to.eql([0, 1, 2]);
                expect(table.dataRows[0].dataCells.map(cell => cell.val).sort()).to.eql(["0_0", "0_3", "0_4"]);

                callbackCalled = true;
            });

            integrationEnv.enviromentVariables.handsontables[0].init.
                afterRemoveCol(1, 2)

            assert.equal(callbackCalled, true);
        });
    });
});

let chai = require('chai');
let rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

describe('Test TableViewer', function () {
    let enviromentVariables;
    let getController;
    let DataStructs;
    let makeTestTable = function (height, width) {
        let t = new DataStructs.DataTable([new DataStructs.DataColumn("Time", 0)]);
        for (let i = 1; i < width; i++) {
            t.dataColumns.push(new DataStructs.DataColumn("Col" + i, i))
        }

        for (let i = 0; i < height; i++) {
            let dataRow = new DataStructs.DataRow()
            dataRow.index = i;
            for (let j = 0; j < t.dataColumns.length; j++) {
                dataRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, i + "_" + j, t.dataColumns[j].id));
            }
            t.dataRows.push(dataRow)
        }
        return t;
    }

    beforeEach(function () {
        let table_view_controller = rewire('../js/table_view_controller.js');
        let data_structures = rewire('../js/data_structures.js');

        DataStructs = data_structures.__get__("DataStructs");

        enviromentVariables = {
            $: () => {
                return {
                    find: function () { return this },
                    on: function () { return this },
                    append: function () { return this },
                    get: function () { return this },
                }
            },
            Handsontable: function (div, init) { },
            DataStructs,
        }

        getController = function () {
            table_view_controller.__set__(enviromentVariables);
            let DataTableController = table_view_controller.__get__('DataTableController');
            return new DataTableController();
        }
    });

    afterEach(function () {
        enviromentVariables = null;
        DataStructs = null;
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            let controller = getController();
            controller.addTable(makeTestTable(3, 3));
        });
    })

    describe('move row test', function () {
        it('should shift one element down the table', function (done) {
            let afterRowMove;
            enviromentVariables.Handsontable = function (div, init) {
                afterRowMove = init.afterRowMove;
                this.loadData = function () { done() };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                let indexes = [];
                table.dataRows.forEach(row => {
                    indexes.push(row.index);
                    if (row.index == 0) {
                        assert.equal(row.dataCells[0].val, "0_0");
                    } else if (row.index == 1) {
                        assert.equal(row.dataCells[0].val, "2_0");
                    } else if (row.index == 2) {
                        assert.equal(row.dataCells[0].val, "3_0");
                    } else if (row.index == 3) {
                        assert.equal(row.dataCells[0].val, "4_0");
                    } else if (row.index == 4) {
                        assert.equal(row.dataCells[0].val, "1_0");
                    } else if (row.index == 5) {
                        assert.equal(row.dataCells[0].val, "5_0");
                    }
                })

                expect(indexes.sort()).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });

            controller.addTable(makeTestTable(rowCount, 3));

            afterRowMove([1], 4)

            assert.equal(callbackCalled, true);
        });

        it('should shift one element up the table', function (done) {
            let afterRowMove;
            enviromentVariables.Handsontable = function (div, init) {
                afterRowMove = init.afterRowMove;
                this.loadData = function () { done() };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                let indexes = [];
                table.dataRows.forEach(row => {
                    indexes.push(row.index);
                    if (row.index == 0) {
                        assert.equal(row.dataCells[0].val, "0_0");
                    } else if (row.index == 1) {
                        assert.equal(row.dataCells[0].val, "3_0");
                    } else if (row.index == 2) {
                        assert.equal(row.dataCells[0].val, "1_0");
                    } else if (row.index == 3) {
                        assert.equal(row.dataCells[0].val, "2_0");
                    } else if (row.index == 4) {
                        assert.equal(row.dataCells[0].val, "4_0");
                    } else if (row.index == 5) {
                        assert.equal(row.dataCells[0].val, "5_0");
                    }
                })

                expect(indexes.sort()).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });

            controller.addTable(makeTestTable(rowCount, 3));

            afterRowMove([3], 1)

            assert.equal(callbackCalled, true);
        });

        it('should shift multiple elements down the table', function (done) {
            let afterRowMove;
            enviromentVariables.Handsontable = function (div, init) {
                afterRowMove = init.afterRowMove;
                this.loadData = function () { done() };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                let indexes = [];
                table.dataRows.forEach(row => {
                    indexes.push(row.index);
                    if (row.index == 0) {
                        assert.equal(row.dataCells[0].val, "2_0");
                    } else if (row.index == 1) {
                        assert.equal(row.dataCells[0].val, "3_0");
                    } else if (row.index == 2) {
                        assert.equal(row.dataCells[0].val, "4_0");
                    } else if (row.index == 3) {
                        assert.equal(row.dataCells[0].val, "0_0");
                    } else if (row.index == 4) {
                        assert.equal(row.dataCells[0].val, "1_0");
                    } else if (row.index == 5) {
                        assert.equal(row.dataCells[0].val, "5_0");
                    }
                })

                expect(indexes.sort()).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });

            controller.addTable(makeTestTable(rowCount, 3));

            afterRowMove([0, 1], 3)

            assert.equal(callbackCalled, true);
        })

        it('should shift multiple elements up the table', function (done) {
            let afterRowMove;
            enviromentVariables.Handsontable = function (div, init) {
                afterRowMove = init.afterRowMove;
                this.loadData = function () { done() };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                let indexes = [];
                table.dataRows.forEach(row => {
                    indexes.push(row.index);
                    if (row.index == 0) {
                        assert.equal(row.dataCells[0].val, "0_0");
                    } else if (row.index == 1) {
                        assert.equal(row.dataCells[0].val, "3_0");
                    } else if (row.index == 2) {
                        assert.equal(row.dataCells[0].val, "4_0");
                    } else if (row.index == 3) {
                        assert.equal(row.dataCells[0].val, "1_0");
                    } else if (row.index == 4) {
                        assert.equal(row.dataCells[0].val, "2_0");
                    } else if (row.index == 5) {
                        assert.equal(row.dataCells[0].val, "5_0");
                    }
                })

                expect(indexes.sort()).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });

            controller.addTable(makeTestTable(rowCount, 3));

            afterRowMove([3, 4], 1)

            assert.equal(callbackCalled, true);
        })
    })


    describe('sort rows test', function () {
        it('should sort all text rows by multiple columns', function (done) {
            let beforeColumnSort;

            let doneCalls = 5;
            let doneCalled = 0;
            enviromentVariables.Handsontable = function (div, init) {
                beforeColumnSort = init.beforeColumnSort;
                this.loadData = function () {
                    // async cleanup
                    doneCalled++;
                    if (doneCalled == doneCalls) done();
                };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();

            controller.addTable(makeTestTable(rowCount, 3));

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["5_0", "4_0", "3_0", "2_0", "1_0", "0_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["0_0", "1_0", "2_0", "3_0", "4_0", "5_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 1 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["5_0", "4_0", "3_0", "2_0", "1_0", "0_0",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 1 }])

            assert.equal(callbackCalled, true);
        });

        it('should mixed types correctly', function (done) {
            let beforeColumnSort;

            let doneCalls = 2;
            let doneCalled = 0;
            enviromentVariables.Handsontable = function (div, init) {
                beforeColumnSort = init.beforeColumnSort;
                this.loadData = function () {
                    // async cleanup
                    doneCalled++;
                    if (doneCalled == doneCalls) done();
                };
            }

            let callbackCalled = false;

            let rowCount = 6;

            let controller = getController();

            let table = makeTestTable(rowCount, 3);
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

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 0 }])

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["text2", "text1", "10", "7", "2022-02-04", "2022-02-03"]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            beforeColumnSort([], [{ column: 0 }])


            assert.equal(callbackCalled, true);
        });
    });
});

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

    describe('LinePercent to TimeBinding mapping tests', function () {
        it('should caluclate NUM with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5), 0.5);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25), 0.25);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.8), 0.8);
        });
    })

    describe('TimeBinding to line point mapping tests', function () {
        it('should caluclate NUM with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.5";
            table.dataRows[0].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [new DataStructs.CellBinding(table.id, table.dataRows[0].id, table.dataColumns[1].id, table.dataRows[0].dataCells[1].id)])

            assert.equal(modelController.getBoundData().length, 1);
            assert.equal(modelController.getBoundData()[0].linePercent, 1);
        });
    })

    describe('delete points tests', function () {
        it('should break one line into two', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 }, { x: 20, y: 0 }]);

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

            assert.equal(modelController.getBoundData().length, 2);

            let mockMask = {
                isCovered: function (point) {
                    return (point.x == 10) ? true : false;
                }
            }
            modelController.deletePoints(mockMask);

            assert.equal(modelController.getAllTimelines().length, 2);
            assert.equal(modelController.getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(modelController.getAllTimelines()[0].warpBindings.length, 1);
            assert.equal(modelController.getAllTimelines()[1].cellBindings.length, 2);
            assert.equal(modelController.getAllTimelines()[1].warpBindings.length, 1);
        });
    })
});

let chai = require('chai');
let rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

describe('Test ModelController', function () {
    let ModelController;
    let enviromentVariables;

    beforeEach(function (done) {
        let data_structures = rewire('../js/data_structures.js');
        let utility = rewire('../js/utility.js');

        enviromentVariables = {
            DataStructs: data_structures.__get__("DataStructs"),
            DataUtil: utility.__get__("DataUtil"),
        }

        let model_controller = rewire('../js/model_controller.js');
        model_controller.__set__(enviromentVariables);

        ModelController = model_controller.__get__('ModelController');

        done();
    });

    afterEach(function (done) {
        Object.keys(enviromentVariables).forEach((key) => {
            delete global[key];
        })
        delete enviromentVariables;
        delete PathMath;
        done();
    });

    describe('LinePercent to TimeBinding mapping tests', function () {
        it('should caluclate NUM with no references', function () {
            let modelController = new ModelController();
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.5), 0.5);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.25), 0.25);
            assert.equal(modelController.mapLinePercentToTime(timeline.id, DataTypes.NUM, 0.8), 0.8);
        });
    })

    describe('TimeBinding to line point mapping tests', function () {
        it('should caluclate NUM with no references', function () {
            let ds = enviromentVariables.DataStructs;
            let modelController = new ModelController();
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.5";
            table.dataRows[0].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [new ds.CellBinding(table.id, table.dataRows[0].id, table.dataColumns[1].id, table.dataRows[0].dataCells[1].id)])

            assert.equal(modelController.getBoundData().length, 1);
            assert.equal(modelController.getBoundData()[0].linePercent, 0.5);
        });
    })
});

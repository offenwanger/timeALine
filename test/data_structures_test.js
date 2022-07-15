let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test DataStructs', function () {
    let integrationEnv;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('percent - time mapping tests', function () {
        it('should create objects from objects', function () {
            let table = TestUtils.makeTestTable(5, 8);
            table.dataRows[3].dataCells[2].val = new DataStructs.TimeBinding();
            table.dataRows[3].dataCells[3].val = new DataStructs.TimeBinding();

            let timeline = new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 20, y: 40 }, { x: 20, y: 10 }, { x: 10, y: 400 }]);
            timeline.warpBindings.push(new DataStructs.WarpBinding(table.id, table.dataRows[0].id, 0.5));
            timeline.warpBindings.push(new DataStructs.WarpBinding(table.id, table.dataRows[3].id, 0.5));
            timeline.cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[1].id, table.dataColumns[3].id, table.dataRows[1].dataCells[3].id));
            timeline.cellBindings.push(new DataStructs.CellBinding(table.id, table.dataRows[3].id, table.dataColumns[3].id, table.dataRows[3].dataCells[3].id));
            timeline.axisBindings.push(new DataStructs.AxisBinding(table.dataColumns[3].id));

            // expect them to be the same at sub levels for easier debugging of this test
            function check(obj, original) {
                if (typeof obj == 'object') {
                    Object.keys(obj).forEach(key => {
                        check(obj[key], original[key]);
                    })
                } else if (typeof obj == 'function') {
                    assert(typeof original, 'function');
                    return;
                } else {
                    expect(obj).to.eql(original);
                }
                
            }

            check(DataStructs.DataTable.fromObject(JSON.parse(JSON.stringify(table))), table)
            check(DataStructs.Timeline.fromObject(JSON.parse(JSON.stringify(timeline))), timeline)

        });
    })
});

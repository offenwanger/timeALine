const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;


describe('Test DataController', function () {
    let integrationEnv;
    let getDataController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getDataController = function () {
            let DataViewController = integrationEnv.enviromentVariables.DataViewController;
            return new DataViewController(integrationEnv.enviromentVariables.d3.svg);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDataController();
        })
    });

    describe('annotation draw test', function () {
        it('should try to draw annotations at the correct location', function () {
            let timelines = [{ id: "tid1", points: [{ x: 0, y: 0 }, { x: 40, y: 20 }] }];
            let boundData = [
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid1",
                    "table1",
                    "row1",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.28"),
                    0.5),
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid2",
                    "table1",
                    "row2",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.40"),
                    0.25),
                new DataStructs.CellBindingData(
                    "tid1",
                    "cbid3",
                    "table1",
                    "row3",
                    new DataStructs.DataCell(DataTypes.UNSPECIFIED, "anything"),
                    new DataStructs.DataCell(DataTypes.TEXT, "0.82"),
                    0.75),
            ];

            getDataController().drawData(timelines, boundData);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            expect(annotationSet.map(i => { return { x: Math.floor(i.x), y: Math.floor(i.y) } }))
                .to.eql([{ x: 20, y: 10 }, { x: 10, y: 5 }, { x: 30, y: 15 }], 0.0001);
        })
    });
});

describe('Integration Test DataController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('comment test', function () {
        it('should add a comment to a line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            assert.equal(annotationSet.length, 3, "Annotations not created")
            expect(annotationSet.map(r => Math.round(r.x)).sort()).to.eql([10, 100, 150]);
            expect(annotationSet.map(r => Math.round(r.y)).sort()).to.eql([100, 102, 105]);

            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 3);
        });

        it('should move a comment', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);

            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);
            IntegrationUtils.clickButton("#comment-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 1);

            let annotationSet = integrationEnv.enviromentVariables.d3.fakeAnnotation.annotationData;
            let fakeThis = {
                attr: function () {
                    return annotationSet[0].className;
                }
            }
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.start;
            let onCommentDrag = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.drag;
            let onCommentDragEnd = integrationEnv.enviromentVariables.d3.selectors[".annotation"].drag.end;

            onCommentDragStart.call(fakeThis, { x: 130, y: 110 });
            onCommentDrag.call(fakeThis, { x: 140, y: 120 });
            onCommentDragEnd.call(fakeThis, { x: 140, y: 120 });

            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 1);

            expect(integrationEnv.ModelController.getAllCellBindingData()[0].dataCell.offset).to.eql({ x: 20, y: 20 });
        });
    })


    describe('data test', function () {
        it('should draw data on the line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].points.length, 3)

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 1, 1]];
            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 15);
            assert.equal(integrationEnv.ModelController.getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 25);
        });

        it('should update the axis', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getAllTables().length, 1);

            integrationEnv.enviromentVariables.handsontables[0].init.afterChange([
                [0, 0, "", "5"], [0, 1, "", "15"],
                [1, 0, "", "10"], [1, 1, "", "25"],
            ])

            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv.enviromentVariables);
            assert.equal(integrationEnv.ModelController.getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getAllTimelines()[0].points.length, 3)

            integrationEnv.enviromentVariables.handsontables[0].selected = [[0, 0, 1, 1]];
            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getAllTimelines()[0].id, integrationEnv.enviromentVariables);

            let axisControlCircles = integrationEnv.enviromentVariables.d3.selectors['.axis-control-circle'];
            assert.equal(axisControlCircles.innerData.length, 2);

            let data = axisControlCircles.innerData.find(d => d.ctrl == 1);

            let fakeCircle = { attr: () => { } };
            axisControlCircles.drag.drag.call(fakeCircle, { x: 0, y: 50 }, data)
            axisControlCircles.drag.end.call(fakeCircle, { x: 0, y: 50 }, data)

            assert.equal(integrationEnv.ModelController.getAllCellBindingData()[0].axisBinding.dist1, 40);
        });
    })
});
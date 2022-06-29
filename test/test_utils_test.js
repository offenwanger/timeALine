// This file defines the constants for all the tests. 
let fs = require('fs');
let vm = require('vm');
let rewire = require('rewire');

before(function () {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../js/constants.js"));

    TestUtils = {
        fakeSVGPath: {
            setAttribute: function (attrName, attr) {
                if (attrName == "d") {
                    this.d = attr;
                }
            },
            getTotalLength: function () {
                let d = this.d;
                // aproximate the d value
                let len = 0;
                for (let i = 1; i < d.length; i++) {
                    let a = d[i - 1];
                    let b = d[i]
                    let diffX = a.x - b.x;
                    let diffY = a.y - b.y;
                    len += Math.sqrt(diffX * diffX + diffY * diffY);
                }
                return len;
            },
            getPointAtLength: function (length) {
                let d = this.d;
                if (length < 0) return d[0];

                // aproximate the d value
                let len = 0;
                for (let i = 1; i < d.length; i++) {
                    let a = d[i - 1];
                    let b = d[i]

                    let diffX = b.x - a.x;
                    let diffY = b.y - a.y;
                    let lineLen = Math.sqrt(diffX * diffX + diffY * diffY);
                    if (length >= len && length <= len + lineLen) {
                        let percent = (length - len) / lineLen
                        return { x: diffX * percent + a.x, y: diffY * percent + a.y };
                    }

                    len += lineLen;
                }

                if (length > len) {
                    return d[d.length - 1]
                }

                throw new Error("should be unreachable");
            }
        },

        fakeDocument: {
            createElementNS: (ns, item) => {
                if (item == "path") {
                    return Object.assign({}, TestUtils.fakeSVGPath);
                }
            }
        },

        mockHandsontable: {
            getSelected: function () { return null },
            loadData: function () { },
            updateSettings: function () { },
        },

        makeMockHandsontable: function (div, init) { Object.assign(this, TestUtils.mockHandsontable); },

        mockElement: {
            attrs: {},
            styles: {},
            innerData: {},
            attr: function (name, val = null) {
                if (val != null) {
                    this.attrs[name] = val;
                    return this;
                } else return this.attrs[name];
            },
            style: function (name, val = null) {
                if (val != null) {
                    this.styles[name] = val;
                    return this;
                } else return this.styles[name];
            },
            classed: function () { return this; },
            call: function () { return this; },
            on: function () { return this; },
            append: function () { return Object.assign({}, this) },
            select: function () { return this; },
            selectAll: function () { return this; },
            remove: () => { },
            data: function (data) { innerData = data; return this; },
            exit: function () { return this; },
            enter: function () { return this; },
            node: function () { },
            text: function () { return this; },
        },

        mockSvg: {
            append: () => Object.assign({}, TestUtils.mockElement),
            attr: () => { return 10 },
        },

        mockDrag: {
            on: function (e, func) { this[e] = func; return this; }
        },

        mockD3: {
            line: () => Object.assign({}, TestUtils.mockLine),
            curveCatmullRom: { alpha: () => { } },
            select: () => Object.assign({}, TestUtils.mockSvg),
            selectAll: () => Object.assign({}, TestUtils.mockElement),
            annotation: () => Object.assign({}, TestUtils.mockAnnotation),
            drag: () => Object.assign({}, TestUtils.mockDrag),
            pointer: (coords) => [coords.x, coords.y],
        },

        mockJqueryElement: {
            find: function () { return this },
            on: function () { return this },
            append: function () { return this },
            get: function () { return this },
            val: function () { return "" },
            farbtastic: function () { return this },
            setColor: function () { return this },
            css: function () { return this },
            hide: function () { return this },
            show: function () { return this },
        },

        mockLine: {
            x: function () { return this },
            y: function () { return this },
            curve: function () { return function (val) { return val } },
            node: function () { },
        },

        mockAnnotation: {
            accessors: function () { return this },
            annotations: function () { return this },
        },

        makeMockJquery: (mockJqueryElement = null) => {
            let mockJQ = (id) => Object.assign({ id }, mockJqueryElement ? mockJqueryElement : TestUtils.mockJqueryElement);
            mockJQ.farbtastic = () => Object.assign({}, TestUtils.mockJqueryElement);
            return mockJQ;
        },

        makeTestTable: function (height, width) {
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
    }

    getIntegrationVariables = function () {
        let returnable = {};

        if (global.d3) throw new Error("Context leaks!")

        global.document = Object.assign({
            addEventListener: function (event, callback) {
                if (event == "DOMContentLoaded") {
                    returnable.mainInit = callback;
                }
            }
        }, TestUtils.fakeDocument);

        let main = rewire('../js/main.js');
        let data_structures = rewire('../js/data_structures.js');
        let table_view_controller = rewire('../js/table_view_controller.js');
        let model_controller = rewire('../js/model_controller.js');
        let line_manipulation_tools_controller = rewire('../js/line_manipulation_tools_controller.js');
        let line_view_controller = rewire('../js/line_view_controller.js');
        let time_warp_controller = rewire('../js/time_warp_controller.js');
        let data_controller = rewire('../js/data_controller.js');

        let utility = rewire('../js/utility.js');

        // designed to extract objects with contructors that are called one time
        returnable.snagConstructor = function (source, constructor) {
            return function () {
                source.__get__(constructor).call(this, ...arguments);
                returnable[constructor] = this;
            }
        };

        returnable.enviromentVariables = {
            d3: Object.assign({}, TestUtils.mockD3),
            $: TestUtils.makeMockJquery(),
            Handsontable: TestUtils.makeMockHandsontable,
            window: { innerWidth: 1000, innerHeight: 800 },
            DataStructs: data_structures.__get__("DataStructs"),
            ModelController: returnable.snagConstructor(model_controller, "ModelController"),
            LineViewController: line_view_controller.__get__("LineViewController"),
            TimeWarpController: time_warp_controller.__get__("TimeWarpController"),
            DataViewController: data_controller.__get__("DataViewController"),
            AnnotationController: data_controller.__get__("AnnotationController"),
            LineDrawingController: line_manipulation_tools_controller.__get__("LineDrawingController"),
            EraserController: line_manipulation_tools_controller.__get__("EraserController"),
            DragController: line_manipulation_tools_controller.__get__("DragController"),
            IronController: line_manipulation_tools_controller.__get__("IronController"),
            DataTableController: table_view_controller.__get__("DataTableController"),
            PathMath: utility.__get__("PathMath"),
            MathUtil: utility.__get__("MathUtil"),
            DataUtil: utility.__get__("DataUtil"),
            TimeBindingUtil: utility.__get__("TimeBindingUtil"),
        };
        main.__set__(returnable.enviromentVariables);

        function setVariables() {
            main.__set__(returnable.enviromentVariables);
        }
        returnable.setVariables = setVariables;

        function cleanup(done) {
            Object.keys(returnable.enviromentVariables).forEach((key) => {
                delete global[key];
            })
            delete returnable.enviromentVariables;
            delete returnable.modelController;
            delete global.document;

            done();
        };
        returnable.cleanup = cleanup;

        return returnable;
    }
});
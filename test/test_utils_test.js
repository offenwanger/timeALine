// This file defines the constants for all the tests. 
let fs = require('fs');
let vm = require('vm');

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

        makeMockHandsOnTable: function (div, init) {
            return {
                getSelected: function () { return null }
            }
        },

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
});
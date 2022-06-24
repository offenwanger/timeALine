// This file defines the constants for all the tests. 
let fs = require('fs');
let vm = require('vm');

before(function () {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../js/constants.js"));

    TestUtils = {
        fakeSVGPath: {
            setAttribute: (attrName, attr) => {
                if (attrName == "d") {
                    this.d = attr;
                }
            },
            getTotalLength: () => {
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
            getPointAtLength: (length) => {
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
            append: function () { return Object.assign({}, TestUtils.mockElement) },
            selectAll: function () { return Object.assign({}, TestUtils.mockElement) },
            remove: () => { },
            data: function (data) { innerData = data; return this; },
            exit: function () { return Object.assign({}, TestUtils.mockElement) },
            enter: function () { return Object.assign({}, TestUtils.mockElement) },
        },

        mockSvg: {
            append: () => Object.assign({}, TestUtils.mockElement),
            attr: () => { return 10 },
        },

        mockDrag: {
            on: function (e, func) { this[e] = func; return this; }
        },

        mockD3: {
            line: () => Object.assign({}, mockLine),
            line: () => {
                return {
                    x: function () { return this },
                    y: function () { return this },
                    curve: function () { return function (val) { return val } },
                }
            },
            curveCatmullRom: { alpha: () => { } },
            select: () => Object.assign({}, TestUtils.mockSvg),
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

        },

        makeMockJquery: (mockJqueryElement = null) => {
            let mockJQ = (id) => Object.assign({ id }, mockJqueryElement ? mockJqueryElement : TestUtils.mockJqueryElement);
            mockJQ.farbtastic = () => Object.assign({}, TestUtils.mockJqueryElement);
            return mockJQ;
        },
    }
});
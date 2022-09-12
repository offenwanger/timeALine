// This file defines the constants for all the tests. 
let fs = require('fs');
let vm = require('vm');
let rewire = require('rewire');

let chai = require('chai');
let assert = chai.assert;

before(function () {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../js/constants.js"));

    function fakeD3() {
        let selectors = {};

        this.selectors = selectors;

        this.mockSvg = {
            attrs: { width: 500, height: 500 },
            append: () => new MockElement(),
            attr: function (name, val = null) {
                if (val != null) {
                    this.attrs[name] = val;
                    return this;
                } else return this.attrs[name];
            },
            node: function () {
                return {
                    outerHTML: "",
                    getBoundingClientRect: () => { return { x: 0, y: 0 } },
                };
            },
        };

        function MockElement() {
            this.attrs = {};
            this.attr = function (name, val = null) {
                if (val != null) {
                    this.attrs[name] = val;
                    if (name == "id" && selectors) { selectors["#" + val] = this; }
                    return this;
                } else return this.attrs[name];
            };
            this.styles = {};
            this.style = function (name, val = null) {
                if (val != null) {
                    this.styles[name] = val;
                    return this;
                } else return this.styles[name];
            };
            this.classes = [];
            this.classed = function (name, isTrue) {
                if (isTrue != null) {
                    this.classes[name] = isTrue;
                    if (selectors) selectors["." + name] = this;
                    return this;
                } else return this.classes[name];
            };
            this.drag = null;
            this.call = function (val) {
                if (typeof val.drag == 'function') this.drag = val;
                return this;
            };
            this.eventCallbacks = {};
            this.on = function (event, func) {
                this.eventCallbacks[event] = func;
                return this;
            };
            this.children = [];
            this.append = function (type) {
                let child = new MockElement();
                child.type = type;
                // bad mocking but w/e
                child.innerData = this.innerData;
                this.children.push(child)
                return child;
            };
            this.select = function (selector) {
                if (selectors) {
                    if (!selectors[selector]) selectors[selector] = new MockElement();
                    return selectors[selector]
                } else return new MockElement();
            };
            this.selectAll = function (selector) {
                if (selectors) {
                    if (!selectors[selector]) selectors[selector] = new MockElement();
                    return selectors[selector]
                } else return new MockElement();
            };
            this.remove = () => { };
            this.innerData = null;
            this.data = function (data) { this.innerData = data; return this; };
            this.datum = function (data) { if (data) { this.innerData = data; return this; } else return this.innerData };
            this.exit = function () { return this; };
            this.enter = function () { return this; };
            this.node = function () {
                let node = Object.assign({}, fakeSVGPath);
                node.d = this.attrs.d;
                node.getBoundingClientRect = () => { return { x: 0, y: 0 } };
                return node;
            };
            this.each = function (func) { };
            this.text = function () { return this; };
        };
        this.mockElement = MockElement;

        this.mockDrag = {
            on: function (e, func) { this[e] = func; return this; }
        }

        this.svg = Object.assign({}, this.mockSvg);
        this.lensSVG = Object.assign({}, this.mockSvg);


        this.line = function () {
            return {
                x: function () { return this },
                y: function () { return this },
                curve: function () { return function (val) { return val } },
                node: function () { },
            }
        };

        this.curveCatmullRom = { alpha: () => { } };
        this.select = function (selection) {
            if (selection.attr) {
                // it's one of those cases where we are selected an obj
                return selection;
            } else if (selection == '#svg_container') return this.svg;
            else if (selection == '#lens-view') return this.lensSVG;
            else return selection;
        };
        this.selectAll = function (selector) {
            if (!selectors[selector]) selectors[selector] = new MockElement();
            return selectors[selector];
        }

        this.drag = () => Object.assign({}, this.mockDrag);
        this.pointer = (coords) => [coords.x, coords.y];
    }


    function fakeJqueryFactory() {
        let selectors = { "#tooltip-div": new MockJqueryElement() };

        function MockJqueryElement(selector) {
            this.selector = selector;
            this.find = function () { return this };
            this.eventCallbacks = {};
            this.on = function (event, func) {
                this.eventCallbacks[event] = func;
                return this;
            };
            this.append = function () { return this };
            this.empty = function () { };
            this.get = function () { return this };
            this.val = function () { return "" };
            this.farbtastic = function () { return this };
            this.setColor = function () { return this };
            this.css = function () { return this };
            this.hide = function () { return this };
            this.show = function () { return this };
            this.html = function (html) { if (html) this.html = html; return this.html; };
            this.width = function () { return 100 };
            this.height = function () { return 100 };
        };

        function fakeJquery(selector) {
            if (typeof selector === 'object' && selector.isDocument) {
                return global.document;
            } else if (!selectors[selector]) {
                selectors[selector] = new MockJqueryElement(selector)
            };
            return selectors[selector];
        };
        fakeJquery.MockJqueryElement = MockJqueryElement;
        fakeJquery.farbtastic = () => new MockJqueryElement();
        fakeJquery.selectors = selectors;

        return fakeJquery;
    }

    let fakeSVGPath = {
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
    };


    let fakeDocument = {
        isDocument: true,
        createElementNS: (ns, item) => {
            if (item == "path") {
                return Object.assign({}, fakeSVGPath);
            } else if (item == "svg") {
                return Object.assign({}, new fakeD3().mockSvg);
            }
        },
        canvasImage: Array(500).fill().map(() => Array(500).fill().map(() => { return { data: [0, 0, 0, 0] }; })),
        createElement: function (name) {
            if (name == 'canvas') return Object.assign({ height: 500, width: 500, canvasImage: this.canvasImage }, mockCanvas);
            if (name == 'a') return { click: () => { } };
        }
    };

    let mockCanvas = {
        getContext: function () { return this; },
        drawImage: function () { },
        getImageData: function (x, y, height, width) { return this.canvasImage[x][y]; },
    }

    function makeTestTable(height, width) {
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

    function MockHandsontable(div, init) {
        this.selected = null;
        this.getSelected = function () { return this.selected };
        this.loadData = function (data) { this.init.data = data; this.asyncDone() };
        this.updateSettings = function () { };
        this.render = function () { };
        this.init = init;
        // silly workaround
        this.asyncDone = () => { };
    };

    function getIntegrationEnviroment() {
        let returnable = {};

        if (global.d3) throw new Error("Context leaks!")

        returnable.documentCallbacks = [];
        global.document = Object.assign({
            addEventListener: function (event, callback) {
                if (event == "DOMContentLoaded") {
                    returnable.mainInit = callback;
                } else {
                    returnable.documentCallbacks.push({ event, callback });
                }
            },
            on: function (event, callback) {
                returnable.documentCallbacks.push({ event, callback });
            }
        }, TestUtils.fakeDocument);

        let main = rewire('../js/main.js');
        let data_structures = rewire('../js/data_structures.js');
        let table_view_controller = rewire('../js/table_view_controller.js');
        let model_controller = rewire('../js/model_controller.js');
        let brush_controller = rewire('../js/brush_controller.js');
        let color_brush_controller = rewire('../js/color_brush_controller.js');
        let eraser_controller = rewire('../js/eraser_controller.js');
        let drag_controller = rewire('../js/drag_controller.js');
        let iron_controller = rewire('../js/iron_controller.js');
        let line_drawing_controller = rewire('../js/line_drawing_controller.js');
        let drawer_controller = rewire('../js/drawer_controller.js');
        let lens_controller = rewire('../js/lens_controller.js');
        let stroke_controller = rewire('../js/stroke_controller.js');
        let line_view_controller = rewire('../js/line_view_controller.js');
        let time_warp_controller = rewire('../js/time_warp_controller.js');
        let data_point_controller = rewire('../js/data_point_controller.js');
        let text_controller = rewire('../js/text_controller.js');
        let file_handling = rewire('../js/file_handling.js');

        let utility = rewire('../js/utility.js');

        // designed to extract objects with contructors that are called one time
        returnable.snagConstructor = function (source, constructor) {
            return function () {
                source.__get__(constructor).call(this, ...arguments);
                returnable[constructor] = this;
            }
        };

        // silly workaround
        returnable.asyncDone = () => { };

        returnable.snagTable = function (tableConstructor) {
            return function () {
                tableConstructor.call(this, ...arguments);
                this.asyncDone = returnable.asyncDone;
                returnable.enviromentVariables.handsontables.push(this);
            }
        };

        returnable.enviromentVariables = {
            d3: new fakeD3(),
            $: fakeJqueryFactory(),
            handsontables: [],
            Handsontable: returnable.snagTable(MockHandsontable),
            window: {
                innerWidth: 500,
                innerHeight: 500,
                createObjectURL: () => { },
                showOpenFilePicker: async function () {
                    return [{
                        getFile: async function () {
                            return {
                                text: async function () {
                                    return returnable.enviromentVariables.window.fileText
                                }
                            }
                        }
                    }]
                }
            },
            Blob: function () { this.init = arguments },
            URL: { objectUrls: [], createObjectURL: function (object) { this.objectUrls.push(object); return "thisistotallyanObjectURL"; } },
            img: {},
            Image: function () { returnable.enviromentVariables.img = this },
            DataStructs: data_structures.__get__("DataStructs"),
            ModelController: returnable.snagConstructor(model_controller, "ModelController"),
            LineViewController: line_view_controller.__get__("LineViewController"),
            TimeWarpController: time_warp_controller.__get__("TimeWarpController"),
            TextController: text_controller.__get__("TextController"),
            DataPointController: data_point_controller.__get__("DataPointController"),
            BrushController: brush_controller.__get__("BrushController"),
            ColorBrushController: color_brush_controller.__get__("ColorBrushController"),
            LineDrawingController: line_drawing_controller.__get__("LineDrawingController"),
            DrawerController: drawer_controller.__get__("DrawerController"),
            LensController: lens_controller.__get__("LensController"),
            StrokeController: stroke_controller.__get__("StrokeController"),
            EraserController: eraser_controller.__get__("EraserController"),
            DragController: drag_controller.__get__("DragController"),
            IronController: iron_controller.__get__("IronController"),
            DataTableController: table_view_controller.__get__("DataTableController"),
            PathMath: utility.__get__("PathMath"),
            MathUtil: utility.__get__("MathUtil"),
            DataUtil: utility.__get__("DataUtil"),
            TimeBindingUtil: utility.__get__("TimeBindingUtil"),
            WarpBindingUtil: utility.__get__("WarpBindingUtil"),
            ToolTip: utility.__get__("ToolTip"),
            FileHandler: file_handling.__get__("FileHandler"),
        };
        returnable.enviromentVariables.Handsontable.renderers = { TextRenderer: { apply: function () { } } };

        file_handling.__set__(returnable.enviromentVariables);
        main.__set__(returnable.enviromentVariables);
        // needs DataStructs to be set. 
        let utility_data_structures = rewire('../js/utility_data_structures.js');

        function setVariables() {
            file_handling.__set__(returnable.enviromentVariables);
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

            fakeDocument.canvasImage = Array(500).fill().map(() => Array(500).fill().map(() => { return { data: [0, 0, 0, 0] }; }));

            done();
        };
        returnable.cleanup = cleanup;

        return returnable;
    }

    TestUtils = {
        fakeD3,
        fakeJqueryFactory,
        fakeSVGPath,
        fakeDocument,
        makeTestTable,
        MockHandsontable,
        getIntegrationEnviroment,
    }

    function drawLine(points, integrationEnv) {
        assert('#line-drawing-g' in integrationEnv.enviromentVariables.d3.selectors, "Line Drawing G not created!");
        let lineDrawingG = integrationEnv.enviromentVariables.d3.selectors['#line-drawing-g'];
        let drawingRect = lineDrawingG.children.find(c => c.type == 'rect');
        let onLineDragStart = drawingRect.eventCallbacks.pointerdown;
        assert(onLineDragStart, "drawing DragStart not set");

        clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

        onLineDragStart()
        points.forEach(point => {
            pointerMove(point, integrationEnv);
        })
        pointerUp(points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 }, integrationEnv);

        clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);
    }

    function drawLensColorLine(points, integrationEnv) {
        assert('#color-drawing-g' in integrationEnv.enviromentVariables.d3.selectors, "Color Drawing G not created!");
        let colorDrawingG = integrationEnv.enviromentVariables.d3.selectors['#color-drawing-g'];
        let drawingRect = colorDrawingG.children.find(c => c.type == 'rect');

        clickButton("#color-brush-button", integrationEnv.enviromentVariables.$);

        drawingRect.eventCallbacks.pointerdown()
        points.forEach(point => {
            pointerMove(point, integrationEnv);
        })
        pointerUp(points[points.length - 1], integrationEnv);

        clickButton("#color-brush-button", integrationEnv.enviromentVariables.$);
    }

    function pointerUp(eventparams, integrationEnv) {
        integrationEnv.documentCallbacks
            .filter(c => c.event == "pointerup")
            .map(c => c.callback).forEach(callback => callback({originalEvent:eventparams}));
    }

    function pointerMove(eventparams, integrationEnv) {
        integrationEnv.documentCallbacks
            .filter(c => c.event == "pointermove")
            .map(c => c.callback).forEach(callback => callback({originalEvent:eventparams}));
    }

    function getLastHoTable(integrationEnv) {
        return integrationEnv.enviromentVariables.handsontables[integrationEnv.enviromentVariables.handsontables.length - 1];
    }

    function clickButton(buttonId, fakeJQ) {
        assert(buttonId in fakeJQ.selectors, buttonId + " not found!");
        let clickFunc = fakeJQ.selectors[buttonId].eventCallbacks['click'];
        assert(clickFunc, buttonId + " click not set!");
        clickFunc();
    }

    function clickLine(coords, lineId, enviromentVariables) {
        let timeLineTargets = enviromentVariables.d3.selectors['.timelineTarget'];
        let data = timeLineTargets.innerData.find(d => d.id == lineId);
        timeLineTargets.eventCallbacks['click'](coords, data);
    }

    function dragLine(points, lineId, integrationEnv) {
        assert('.timelineTarget' in integrationEnv.enviromentVariables.d3.selectors, "No timeline targets!");
        let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timelineTarget'];
        let data = timeLineTargets.innerData.find(d => d.id == lineId);

        let onLineDragStart = timeLineTargets.eventCallbacks.pointerdown;
        assert(onLineDragStart, "line DragStart not set");

        onLineDragStart(points.length > 0 ? points[0] : { x: 0, y: 0 }, data)
        points.forEach(point => {
            pointerMove(point, integrationEnv);
        })
        pointerUp(points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 }, integrationEnv);
    }

    function erase(points, radius, integrationEnv) {
        colorSquare = function (x1, y1, x2, y2, val) {
            for (let i = x1; i < x2; i++) {
                for (let j = y1; j < y2; j++) {
                    global.document.canvasImage[i][j].data = [0, 0, 0, val];
                }
            }
        }

        points.forEach(point => colorSquare(
            point.x - radius,
            point.y - radius,
            point.x + radius,
            point.y + radius,
            1
        ))

        clickButton("#eraser-button", integrationEnv.enviromentVariables.$);

        let eraserStart = integrationEnv.enviromentVariables.d3.selectors['#brush-g'].children.find(c => c.type == 'rect').eventCallbacks.pointerdown;

        eraserStart(points[0]);
        points.forEach(point => pointerMove(point, integrationEnv))
        pointerUp(points[points.length - 1], integrationEnv);

        assert.isNotNull(integrationEnv.enviromentVariables.img.onload);
        integrationEnv.enviromentVariables.img.onload();

        clickButton("#eraser-button", integrationEnv.enviromentVariables.$);

        points.forEach(point => colorSquare(
            point.x - radius,
            point.y - radius,
            point.x + radius,
            point.y + radius,
            0
        ))
    }

    IntegrationUtils = {
        drawLine,
        drawLensColorLine,
        pointerUp,
        pointerMove,
        getLastHoTable,
        clickButton,
        clickLine,
        dragLine,
        erase,
    }
});
// This file defines the constants for all the tests. 
let fs = require('fs');
let vm = require('vm');

before(function () {
    vm.runInThisContext(fs.readFileSync(__dirname + "/" + "../js/constants.js"));

    // set in the global context
    fakeDocument = {
        createElementNS: (ns, item) => {
            if (item == "path") {
                let d = null;
                return {
                    setAttribute: (attrName, attr) => {
                        if (attrName == "d") {
                            d = attr;
                        }
                    },
                    getTotalLength: () => {
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
                }
            }
        }
    }
});
let chai = require('chai');
let rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

describe('Test PathMath', function () {
    let PathMath;

    beforeEach(function (done) {
        global.d3 = {
            line: () => {
                return {
                    x: function () { return this },
                    y: function () { return this },
                    curve: function () { return function (val) { return val } },
                }
            },
            curveCatmullRom: { alpha: () => { } }
        };
        // pulling from the constants import part
        global.document = fakeDocument;

        let utility = rewire('../js/utility.js');
        PathMath = utility.__get__('PathMath');

        done();
    });

    afterEach(function (done) {
        PathMath = null;
        // No cleanup needed yet
        done();

        global.document = null;
        global.d3 = null;
    });

    describe('path length test', function () {
        it('should call without error', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            PathMath.getPathLength(points);
        })

        it('should get simple lengths', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]


            expect(PathMath.getPathLength(points)).to.be.closeTo(27, .1);
        })

        it('should get cloest point on end of line', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let point = PathMath.getClosestPointOnPath({ x: 0, y: 0 }, points);

            expect(point.x).to.be.closeTo(10, .0001);
            expect(point.y).to.be.closeTo(10, .0001);

            point = PathMath.getClosestPointOnPath({ x: 30, y: 30 }, points);

            expect(point.x).to.be.closeTo(20, .0001);
            expect(point.y).to.be.closeTo(20, .0001);

            point = PathMath.getClosestPointOnPath({ x: 11, y: 12.5 }, points);

            expect(point.x).to.be.closeTo(10, .0001);
            expect(point.y).to.be.closeTo(12.5, .0001);


            point = PathMath.getClosestPointOnPath({ x: 15, y: 15 }, points);

            expect(point.x).to.be.closeTo(15, .0001);
            expect(point.y).to.be.closeTo(15, .0001);
        })
    })
});

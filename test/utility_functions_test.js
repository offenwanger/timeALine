let chai = require('chai');
var rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

let PathMath = rewire('../js/utilityFunctions.js').__get__('PathMath');


describe('Test Math', function () {
    describe('points and PercentDistMapping tests', function () {
        it('should create correct simple mapping', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let expectedResult = [
                { percent: 10 / 20, dist: 10 },
                { percent: 10 / 20, dist: 15 },
                { percent: 15 / 20, dist: 15 },
                { percent: 20 / 20, dist: 15 },
                { percent: 15 / 20, dist: 20 },
                { percent: 20 / 20, dist: 20 },
            ]

            let result = PathMath.pointsToPercentDistMapping(points, { x: 0, y: 0 }, { x: 20, y: 0 });

            for (let i = 0; i < points.length; i++) {
                expect(expectedResult[i].percent).to.be.closeTo(result[i].percent, .0001);
                expect(expectedResult[i].dist).to.be.closeTo(result[i].dist, .0001);
            }
        })

        it('should invert without changing the points', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let result = PathMath.percentDistMappingToPoints(
                PathMath.pointsToPercentDistMapping(points, { x: 0, y: 0 }, { x: 20, y: 0 }),
                { x: 0, y: 0 }, { x: 20, y: 0 });

            for (let i = 0; i < points.length; i++) {
                expect(points[i].x).to.be.closeTo(result[i].x, .0001);
                expect(points[i].y).to.be.closeTo(result[i].y, .0001);
            }
        })

        it('should rotate points 90 degrees', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let expectedPoints = [
                { x: -10, y: 10 },
                { x: -15, y: 10 },
                { x: -15, y: 15 },
                { x: -15, y: 20 },
                { x: -20, y: 15 },
                { x: -20, y: 20 }
            ]


            let result = PathMath.percentDistMappingToPoints(
                PathMath.pointsToPercentDistMapping(points, { x: 0, y: 0 }, { x: 20, y: 0 }),
                { x: 0, y: 0 }, { x: 0, y: 20 });

            for (let i = 0; i < points.length; i++) {
                expect(expectedPoints[i].x).to.be.closeTo(result[i].x, .0001);
                expect(expectedPoints[i].y).to.be.closeTo(result[i].y, .0001);
            }
        })
    })
});

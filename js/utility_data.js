let DataUtil = function () {
    function inferDataAndType(cellVal) {
        if (typeof (x) === 'number') {
            return { val: cellVal, type: DataTypes.NUM }
        } else if (isNumeric(String(cellVal))) {
            return { val: parseFloat("" + cellVal), type: DataTypes.NUM }
        } else {
            return { val: String(cellVal), type: DataTypes.TEXT }
        }
    }

    function isDate(val) {
        // this is too aggressive
        return !isNaN(Date.parse(val));
    }

    function isNumeric(val) {
        return isFloat(val) || isInt(val);
    }

    function isFloat(val) {
        var floatRegex = /^-?\d+(?:[.,]\d*?)?$/;
        if (!floatRegex.test(val))
            return false;

        val = parseFloat(val);
        if (isNaN(val))
            return false;
        return true;
    }

    function isInt(val) {
        var intRegex = /^-?\d+$/;
        if (!intRegex.test(val))
            return false;

        var intVal = parseInt(val, 10);
        return parseFloat(val) == intVal && !isNaN(intVal);
    }

    function getUniqueList(list, key = null) {
        return [...new Map(list.map(item => [key ? item[key] : item, item])).values()]
    }

    function AGreaterThanB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a > b;
        } else if (type == DataTypes.TEXT) {
            return String(a) > String(b);
        } else { throw new Error("Cannot calculate greaterThan for type: " + type); }
    }

    function subtractAFromB(a, b, type) {
        if (type == DataTypes.NUM) {
            return b - a;
        } else { throw new Error("Cannot calculate subtract for type: " + type); }
    }

    function AEqualsB(a, b, type) {
        if (type == DataTypes.NUM) {
            // only check to 4 decimal places
            return Math.round(a * 10000) == Math.round(b * 10000);
        } else if (type == DataTypes.TEXT) {
            return a == b;
        } else { throw new Error("Cannot calculate equals for type: " + type); }
    }

    function incrementAByB(a, b, type) {
        if (type == DataTypes.NUM) {
            return a + b;
        } else { throw new Error("Cannot calculate increment by for type: " + type); }
    }

    function getFormattedDate(date) {
        if (!(date instanceof Date)) {
            let num = date;
            date = new Date(num);
            if (isNaN(date)) {
                console.error("Not a date!", num);
                return "";
            }
        }

        let year = date.getFullYear();
        let month = date.toLocaleString('en-US', { month: 'short' });
        let day = date.getDate();
        let hour = date.getHours();
        let min = date.getMinutes();
        let sec = date.getSeconds();

        day = (day < 10 ? "0" : "") + day;
        hour = (hour < 10 ? "0" : "") + hour;
        min = (min < 10 ? "0" : "") + min;
        sec = (sec < 10 ? "0" : "") + sec;

        return month + " " + day + ", " + year + " " + hour + ":" + min + ":" + sec;
    }

    function getColorBetween(color1, color2, percent) {
        let rgb1 = color1.match(/\w\w/g).map((c) => parseInt(c, 16));
        let rgb2 = color2.match(/\w\w/g).map((c) => parseInt(c, 16));

        if ((rgb1.length != 3 && rgb1.length != 4) ||
            (rgb2.length != 3 && rgb2.length != 4) ||
            rgb1.some(n => isNaN(n)) ||
            rgb2.some(n => isNaN(n))) {
            console.error("Invalid hex color!", color1, color2);
            return "#000000";
        }

        if (rgb1.length == 3) {
            rgb1.push(255)
        }

        if (rgb2.length == 3) {
            rgb2.push(255)
        }

        let avgRGB = []
        for (let i = 0; i < 4; i++) {
            avgRGB[i] = Math.round(rgb1[i] + ((rgb2[i] - rgb1[i]) * percent)).toString(16).padStart(2, '0');
        }
        return '#' + avgRGB.join("");
    }

    function filterTimePinByChangedPin(pins, changedPin, timeAttribute) {
        if (!timeAttribute || isNaN(changedPin[timeAttribute])) {
            console.error("Invalid pin or time attribute!", changedPin, timeAttribute);
            return pins;
        }

        let filtered = pins.filter(pin => {
            // clear the binding out of the array so we can read the new data
            if (pin.id == changedPin.id) return false;
            if (!pin[timeAttribute] || !changedPin[timeAttribute]) return true;

            // otherwise make sure time and bindings both increase in the same direction
            return (pin[timeAttribute] < changedPin[timeAttribute] && pin.linePercent < changedPin.linePercent) ||
                (pin[timeAttribute] > changedPin[timeAttribute] && pin.linePercent > changedPin.linePercent);
        });
        filtered.push(changedPin);
        filtered.sort((a, b) => a.linePercent - b.linePercent);
        return filtered;
    }

    function timelineStrokesChanged(timeline1, timeline2) {
        if (!timeline1) {
            if (!timeline2) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline2.annotationStrokes.map(s => s.id);
        }

        if (!timeline2) {
            if (!timeline1) {
                console.error("If they're both duds why are you asking?", timeline1, timeline2);
                return [];
            }

            // one timeline is a dud, they're all changes
            return timeline1.annotationStrokes.map(s => s.id);
        }

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let pinChanged = timelinesPinsChanged(timeline1, timeline2);
        if (pinChanged) {
            return DataUtil.getUniqueList(
                timeline1.annotationStrokes.map(s => s.id).concat(
                    timeline2.annotationStrokes.map(s => s.id)));
        }

        let allIds = DataUtil.getUniqueList(
            timeline1.annotationStrokes.map(s => s.id).concat(
                timeline2.annotationStrokes.map(s => s.id)));

        let changedIds = allIds.filter(id => {
            let stroke1 = timeline1.annotationStrokes.find(s => s.id == id);
            let stroke2 = timeline2.annotationStrokes.find(s => s.id == id);
            // if either is missing this has changed.
            if (!stroke1 || !stroke2) return true;
            // if the path has changed it's changed.
            if (!stroke1.equals(stroke2)) return true;
            // no change
            return false;
        });
        return changedIds;
    }


    function timelineDataPointsChanged(timelineId, model1, model2) {
        let timeline1 = model1.getAllTimelines().find(t => t.id == timelineId);
        let timeline2 = model2.getAllTimelines().find(t => t.id == timelineId);

        if (!timeline1) {
            if (!timeline2) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return timeline2.cellBindings.map(s => s.id);
        }

        if (!timeline2) {
            if (!timeline1) { console.error("If they're both duds why are you asking?", timeline1, timeline2); return []; }
            // one timeline is a dud, they're all changes
            return timeline1.cellBindings.map(s => s.id);
        }

        if (!PathMath.equalsPath(timeline1.points, timeline2.points)) {
            return DataUtil.getUniqueList(
                timeline1.cellBindings.map(s => s.id).concat(
                    timeline2.cellBindings.map(s => s.id)));
        }

        let pinChanged = timelinesPinsChanged(timeline1, timeline2);
        if (pinChanged) {
            return DataUtil.getUniqueList(
                timeline1.cellBindings.map(s => s.id).concat(
                    timeline2.cellBindings.map(s => s.id)));
        }

        let timelineData1 = model1.getCellBindingData(timelineId);
        let timelineData2 = model2.getCellBindingData(timelineId);
        let allIds = DataUtil.getUniqueList(
            timeline1.cellBindings.map(s => s.id).concat(
                timeline2.cellBindings.map(s => s.id)));

        let changedIds = allIds.filter(id => {
            let binding1 = timelineData1.find(b => b.cellBinding.id == id);
            let binding2 = timelineData2.find(b => b.cellBinding.id == id);
            // if either is missing this has changed.
            if (!binding1 || !binding2) return true;
            // if the path has changed it's changed.
            if (!binding1.equals(binding2)) return true;
            // no change
            return false;
        });
        return changedIds;
    }

    function timelinesPinsChanged(timeline1, timeline2) {
        return timeline1.timePins.length != timeline2.timePins.length ||
            timeline1.timePins.some(pin => {
                // check if at least one pin has changed.
                let oldPin = timeline2.timePins.find(p => p.id == pin.id);
                // pin set mismatch, that's a change.
                if (!oldPin) return true;
                // otherwise check if the line percent has changed.
                if (oldPin.linePercent != pin.linePercent) return true;
                return false;
            });
    }

    function svgToCanvas(svgElement, x, y, width, height, backgroundColor = null) {
        return new Promise((resolve, reject) => {
            let exportSVG = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
                .attr('width', width)
                .attr('height', height)
                .style("background-color", backgroundColor)
                // this is required for unknown reasons
                .attr("xmlns", "http://www.w3.org/2000/svg");

            exportSVG.append("g")
                .attr("transform", "translate(" + -x + "," + -y + ")")
                .append(function () { return svgElement; });

            let svgURL = new XMLSerializer().serializeToString(exportSVG.node());
            let image = new Image();
            image.onload = function () {
                let canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                let context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, width, height);
                resolve(canvas);
            }
            image.onerror = function () { reject("The image export failed. Chrome refuses to give further information. Sorry."); }
            image.src = 'data:image/svg+xml; charset=utf8, ' + encodeURIComponent(svgURL);
        })
    }

    return {
        inferDataAndType,
        getUniqueList,
        isDate,
        isNumeric,

        AGreaterThanB,
        subtractAFromB,
        AEqualsB,
        incrementAByB,

        getFormattedDate,

        getColorBetween,

        filterTimePinByChangedPin,
        timelineStrokesChanged,
        timelineDataPointsChanged,

        svgToCanvas,
    }
}();

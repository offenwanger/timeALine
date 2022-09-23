function ModelController() {
    let mModel = new DataStructs.DataModel();

    let mUndoStack = [];
    let mRedoStack = [];

    function newTimeline(points) {
        undoStackPush();

        if (points.length < 2) { console.error("Invalid point array! Too short!", points); return; }

        let timeline = new DataStructs.Timeline(points.map(p => Object.assign({}, p)));
        mModel.getAllTimelines().push(timeline);

        return timeline;
    }

    function extendTimeline(timelineId, points, extendStart) {
        undoStackPush();

        let timeline = mModel.getTimelineById(timelineId);
        let originalLength = PathMath.getPathLength(timeline.points);

        // knock off the first point for smoothing purposes. 
        extendStart ? points.pop() : points.unshift();

        let newPoints = extendStart ? points.concat(timeline.points) : timeline.points.concat(points);
        let newLength = PathMath.getPathLength(newPoints);

        timeline.warpBindings.push(...getCapWarpBindings(timeline, extendStart));

        timeline.points = newPoints;
        if (extendStart) {
            let diff = newLength - originalLength;
            timeline.warpBindings.forEach(binding => {
                let originalLengthAlongLine = binding.linePercent * originalLength;
                binding.linePercent = (originalLengthAlongLine + diff) / newLength;
            })
        } else {
            let conversionRatio = originalLength / newLength;
            timeline.warpBindings.forEach(binding => {
                binding.linePercent *= conversionRatio;
            })
        }
    }

    function mergeTimeline(timelineIdStart, timelineIdEnd, points) {
        undoStackPush();

        let startTimeline = mModel.getTimelineById(timelineIdStart);
        let endTimeline = mModel.getTimelineById(timelineIdEnd);

        let originalStartLength = PathMath.getPathLength(startTimeline.points);
        let originalEndLength = PathMath.getPathLength(endTimeline.points);

        // knock off the end points for smoothing purposes.
        points.pop();
        points.unshift();

        let newPoints = startTimeline.points.concat(points, endTimeline.points);
        let newLength = PathMath.getPathLength(newPoints);

        let newTimeline = new DataStructs.Timeline(newPoints);
        newTimeline.cellBindings = DataUtil.getUniqueList(startTimeline.cellBindings.concat(endTimeline.cellBindings), 'cellId');

        let numericDataCells = newTimeline.cellBindings.map(cb => mModel.getCellById(cb.cellId)).filter(cell => cell.getType() == DataTypes.NUM);
        if (numericDataCells.length > 0) {
            // if there is no numeric data there should be no axis, otherwise merge them
            newTimeline.axisBindings = [...startTimeline.axisBindings];
            endTimeline.axisBindings.forEach(axis => {
                let otherAxis = newTimeline.axisBindings.find(ab => ab.columnId == axis.columnId);
                if (otherAxis) {
                    // update the data
                    otherAxis.val1 = Math.min(...numericDataCells
                        .filter(cell => cell.columnId == axis.columnId)
                        .map(cell => cell.getValue()))
                    otherAxis.dist1 = Math.min(otherAxis.dist1, axis.dist1);

                    otherAxis.val2 = Math.min(...numericDataCells
                        .filter(cell => cell.columnId == axis.columnId)
                        .map(cell => cell.getValue()))
                    otherAxis.dist2 = Math.max(otherAxis.dist2, axis.dist2);
                } else {
                    newTimeline.axisBindings.push(axis);
                }
            });
        }

        let conversionRatio = originalStartLength / newLength;
        let diff = newLength - originalEndLength;

        // Update warp binding line percents
        let warpBindings = []
        startTimeline.warpBindings.concat(getCapWarpBindings(startTimeline, false)).forEach(binding => {
            let newBinding = binding.copy();
            newBinding.linePercent = binding.linePercent * conversionRatio;
            warpBindings.push(newBinding);
        });
        endTimeline.warpBindings.concat(getCapWarpBindings(endTimeline, true)).forEach(binding => {
            let newBinding = binding.copy();
            let originalLengthAlongLine = binding.linePercent * originalEndLength;
            newBinding.linePercent = (originalLengthAlongLine + diff) / newLength;
            warpBindings.push(newBinding);
        });

        // filter to bindings which are still valid and add them to the new line
        let timeSetBindings = []
        warpBindings.forEach(binding => {
            if (binding.timeStamp) {
                timeSetBindings.push(binding);
            } else {
                newTimeline.warpBindings.push(binding)
            }
        })

        if (timeSetBindings.length > 0) {
            timeSetBindings.sort((a, b) => { a.linePercent - b.linePercent; });
            newTimeline.warpBindings.push(timeSetBindings[0])
            for (let i = 1; i < timeSetBindings.length; i++) {
                if (timeSetBindings[i - 1].timeStamp < timeSetBindings[i].timeStamp) {
                    newTimeline.warpBindings.push(timeSetBindings[i])
                }
            }
        }

        // update the annotation stroke line percents
        startTimeline.annotationStrokes.forEach(stroke => {
            // TODO: either change strokes to use a time representation set along with the warp points
            // or map all the strokes to time here and back to line percents (which will have to happen
            // every time we move a warp point...)
            console.error("Finish me!");

            let newStoke = new DataStructs.Stroke([], stroke.color);
            newStoke.points = stroke.points.map(p => {
                let point = p.copy();
                point.linePercent = p.linePercent * conversionRatio;
                return point;
            })
            newTimeline.annotationStrokes.push(newStoke);
        })

        endTimeline.annotationStrokes.forEach(stroke => {
            let newStoke = new DataStructs.Stroke([], stroke.color);
            newStoke.points = stroke.points.map(p => {
                let point = p.copy();
                point.linePercent = ((p.linePercent * originalEndLength) + diff) / newLength;
                return point;
            })
            newTimeline.annotationStrokes.push(newStoke);
        })

        mModel.setTimelines(mModel.getAllTimelines().filter(timeline => timeline.id != timelineIdStart && timeline.id != timelineIdEnd));
        mModel.getAllTimelines().push(newTimeline);

        return [timelineIdStart, timelineIdEnd];
    }

    /* Utility Function */
    function getCapWarpBindings(timeline, capStart) {
        let returnable = []
        // before we make any changes, if needed, add a warp point so things won't move
        let bindingValues = mModel.getTimeBindingValues(timeline);
        if (bindingValues.length > 1) {
            let capBinding = capStart ? bindingValues[0] : bindingValues[bindingValues.length - 1];
            if (isNaN(capBinding.linePercent)) {
                // it's needed
                if (mModel.hasTimeMapping(timeline.id)) {
                    let linePercent = mModel.mapTimeToLinePercent(timeline.id, capBinding.timeStamp);
                    let warpBinding = new DataStructs.WarpBinding(linePercent);
                    warpBinding.timeStamp = capBinding.timeStamp;
                    returnable.push(warpBinding);
                } else {
                    console.error("Bad State! Should not have multiple binding values and no mapping!")
                }
            }
        }

        return returnable;
    }
    /* End Utiltiy Function */

    function deleteTimeline(timelineId) {
        undoStackPush();

        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
    }

    function breakTimeline(timelineId, segments) {
        undoStackPush();

        if (segments.length < 2) throw new Error("Expecting at least part of the timeline to be erased.")

        let timeline = mModel.getTimelineById(timelineId);

        // assign the segments their correct line percents:
        let totalLength = PathMath.getPathLength(timeline.points);
        segments[0].startLength = 0;
        segments[0].startPercent = 0;
        segments[0].endLength = PathMath.getPathLength(segments[0].points);
        segments[0].endPercent = segments[0].endLength / totalLength;
        for (let i = 1; i < segments.length; i++) {
            segments[i].startLength = segments[i - 1].endLength;
            segments[i].startPercent = segments[i - 1].endPercent;
            segments[i].endLength = PathMath.getPathLength(PathMath.mergeSegments(segments.slice(0, i + 1)));
            segments[i].endPercent = segments[i].endLength / totalLength;
            // ensure the last segment does indeed go to one, avoid rounding errors.
            if (i == segments.length - 1) segments[i].endPercent = 1;
        }


        // split up the warp bindings into their proper segments
        segments.forEach(s => s.warpBindings = []);
        let warpBindingData = mModel.getTimelineById(timeline.id).warpBindings;
        warpBindingData.forEach(binding => {
            let segment = segments.find(s =>
                binding.linePercent >= s.startPercent &&
                binding.linePercent <= s.endPercent);
            if (!segment) { console.error("Unhandled edge case!", binding.linePercent, segments); return; };
            segment.warpBindings.push(binding);
        })

        // split up the cell bindings into their proper segments
        segments.forEach(s => s.cellBindingsData = []);
        let cellBindingData = mModel.getCellBindingData(timeline.id);
        cellBindingData.forEach(binding => {
            let segment = segments.find(s =>
                binding.linePercent >= s.startPercent &&
                binding.linePercent <= s.endPercent);
            if (!segment) { console.error("Something wierd here. Didn't find segment for linePercent: " + binding.linePercent); return; };
            segment.cellBindingsData.push(binding);
        });

        // add warp bindings to ensure the data doesn't move because of being disconnected
        segments.forEach(segment => {
            // we only care about data with valid time cells because invalid ones are either pegged or not, 
            // and will therefore either way not be affected by the splice. 
            let validCellBindings = segment.cellBindingsData.filter(c => c.timeCell.isValid());
            let validWarpBindings = segment.warpBindings.filter(wb => wb.timeStamp);
            if (validCellBindings.length > 0) {
                // get the max/min data items
                validCellBindings.sort((a, b) => a.linePercent - b.linePercent);
                validWarpBindings.sort((a, b) => a.linePercent - b.linePercent);

                // if there's already a binding at the start, don't bother creating a pin, it won't move
                if (validCellBindings[0].linePercent > segment.startPercent && (
                    validWarpBindings.length == 0 ||
                    validCellBindings[0].linePercent < validWarpBindings[0].linePercent)) {
                    // create a warp binding for this item. 
                    let warpBinding = new DataStructs.WarpBinding(validCellBindings[0].linePercent);
                    warpBinding.timeStamp = validCellBindings[0].timeCell.getValue();
                    segment.warpBindings.push(warpBinding);

                    // update the valid warp bindings in with the new one. 
                    validWarpBindings = segment.warpBindings.filter(wb => wb.timeStamp);
                    validWarpBindings.sort((a, b) => a.linePercent - b.linePercent);
                }

                let lastCell = validCellBindings[validCellBindings.length - 1];
                // if there's already a binding at the end, don't bother creating a pin, it won't move
                // if there was only one warp binding, and we created a peg for it, this will be false because it's 
                // line percent will be equal. 
                if (lastCell.linePercent < segment.endPercent && (
                    validWarpBindings.length == 0 ||
                    lastCell.linePercent < validWarpBindings[validWarpBindings.length - 1].linePercent)) {
                    // create a warp binding for this item. 
                    let warpBinding = new DataStructs.WarpBinding(lastCell.linePercent);
                    warpBinding.timeStamp = lastCell.timeCell.getValue();
                    segment.warpBindings.push(warpBinding);
                }
            }
        })

        segments.forEach(s => s.annotationStrokes = []);
        timeline.annotationStrokes.forEach(stroke => {
            segments.forEach(segment => {
                let currSet = [];
                stroke.points.forEach(point => {
                    if (point.linePercent >= segment.startPercent && point.linePercent <= segment.endPercent) {
                        currSet.push(point);
                    } else if (currSet.length > 0) {
                        // we were in the segment but then we left
                        if (currSet.length > 1) {
                            // only push a stroke if it has more than one point
                            segment.annotationStrokes.push(new DataStructs.Stroke(currSet, stroke.color));
                        }
                        currSet = [];
                    }
                })
                // if we finished inside the segment, push the last stroke
                if (currSet.length > 1) {
                    segment.annotationStrokes.push(new DataStructs.Stroke(currSet, stroke.color));
                }
            })
        });

        segments.forEach(segment => {
            // map the strokes to the new line percents.
            segment.annotationStrokes.forEach(segmentStroke => {
                segmentStroke.points = segmentStroke.points.map(p => {
                    let point = p.copy();
                    point.linePercent = (point.linePercent - segment.startPercent) / (segment.endPercent - segment.startPercent);
                    return point;
                });
            });
        })

        // create the new timelines
        let newTimelines = segments.filter(s => s.label == SEGMENT_LABELS.UNAFFECTED).map(segment => {
            let newTimeline = new DataStructs.Timeline(segment.points);

            newTimeline.warpBindings = segment.warpBindings.map(wb => {
                let warpBinding = wb.clone();
                warpBinding.linePercent = (warpBinding.linePercent - segment.startPercent) / (segment.endPercent - segment.startPercent);
                return warpBinding;
            });

            newTimeline.cellBindings = segment.cellBindingsData.map(b => b.cellBinding);
            let axesColumns = DataUtil.getUniqueList(segment.cellBindingsData.filter(cbd => cbd.dataCell.getType() == DataTypes.NUM).map(cbd => cbd.dataCell.columnId));
            newTimeline.axisBindings = timeline.axisBindings.filter(ab => axesColumns.includes(ab.columnId)).map(ab => ab.clone());

            newTimeline.annotationStrokes = segment.annotationStrokes;

            return newTimeline;
        })

        mModel.setTimelines(mModel.getAllTimelines().filter(t => t.id != timelineId));
        mModel.getAllTimelines().push(...newTimelines);
    }

    function updateTimelinePoints(timelineId, oldSegments, newSegments) {
        undoStackPush();

        let timeline = mModel.getTimelineById(timelineId);

        timeline.points = PathMath.mergeSegments(newSegments);

        // update the warp points
        let newLength = PathMath.getPathLength(PathMath.mergeSegments(newSegments));
        let oldLength = PathMath.getPathLength(PathMath.mergeSegments(oldSegments));
        let cumulativeNewLength = 0;
        let cumulativeOldLength = 0;
        for (let i = 0; i < oldSegments.length; i++) {
            let newSegmentLength = PathMath.getPathLength(newSegments[i].points);
            let oldSegmentLength = PathMath.getPathLength(oldSegments[i].points);

            let newStartPercent = cumulativeNewLength / newLength;
            let oldStartPercent = cumulativeOldLength / oldLength;

            cumulativeNewLength += newSegmentLength;
            cumulativeOldLength += oldSegmentLength;

            let newEndPercent = cumulativeNewLength / newLength;
            let oldEndPercent = cumulativeOldLength / oldLength;

            let newInterval = newEndPercent - newStartPercent;
            let oldInterval = oldEndPercent - oldStartPercent;

            timeline.warpBindings
                .filter(binding =>
                    binding.linePercent >= oldStartPercent &&
                    binding.linePercent <= oldEndPercent)
                .forEach(binding => {
                    binding.linePercent = (((binding.linePercent - oldStartPercent) / oldInterval) * newInterval) + newStartPercent;
                })
        }
    }

    function addBoundTextRow(text, time, timelineId) {
        undoStackPush();

        if (mModel.getAllTables().length == 0) {
            let newTable = new DataStructs.DataTable([
                new DataStructs.DataColumn("Time", 0),
                new DataStructs.DataColumn("", 1),
            ]);
            mModel.getAllTables().push(newTable);
        }

        let newRow = new DataStructs.DataRow();
        newRow.index = mModel.getAllTables()[0].dataRows.length;
        mModel.getAllTables()[0].dataRows.push(newRow);

        let timeColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 0).id;
        let timeCell = new DataStructs.TimeCell(time, timeColId)
        newRow.dataCells.push(timeCell);

        let nextColId = mModel.getAllTables()[0].dataColumns.find(col => col.index == 1).id;
        let textCell = new DataStructs.DataCell(DataTypes.TEXT, text, nextColId, { x: 10, y: 10 })
        newRow.dataCells.push(textCell);

        for (let i = 2; i < mModel.getAllTables()[0].dataColumns.length; i++) {
            let colId = mModel.getAllTables()[0].dataColumns.find(col => col.index == i).id;
            let cell = new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", colId)
            newRow.dataCells.push(cell);
        }

        let newBinding = new DataStructs.CellBinding(textCell.id);
        mModel.getTimelineById(timelineId).cellBindings.push(newBinding);
    }

    function updateWarpBinding(timelineId, binding) {
        undoStackPush();

        if (!timelineId) throw new Error("Invalid TimelineId: " + timelineId);

        let timeline = mModel.getTimelineById(timelineId);

        if (!timeline) throw new Error("Invalid TimelineId: " + timelineId);

        timeline.warpBindings = timeline.warpBindings.filter(wb =>
            // clear the binding out of the array so we can readd the new data
            wb.id != binding.id &&
            // if we don't have timestamps set, we have no information to eliminate bindings on.
            (!wb.timeStamp ||
                // otherwise make sure time and bindings both increase in the same direction
                (wb.timeStamp < binding.timeStamp && wb.linePercent < binding.linePercent) ||
                (wb.timeStamp > binding.timeStamp && wb.linePercent > binding.linePercent)));

        timeline.warpBindings.push(binding);
    }

    function updateText(cellId, text) {
        undoStackPush();

        let cell = mModel.getCellById(cellId);
        cell.val = text;
    }

    function updateTextOffset(cellBindingId, offset) {
        undoStackPush();

        let cellBinding = mModel.getCellBindingById(cellBindingId);
        cellBinding.offset = offset;
    }

    function addTimelineStroke(timelineId, points, color) {
        undoStackPush();

        mModel.getTimelineById(timelineId).annotationStrokes.push(new DataStructs.Stroke(points, color));
    }

    function addTable(table) {
        undoStackPush();

        // TODO validate table.
        mModel.getAllTables().push(table.copy());
    }

    function addTableFromCSV(array2d) {
        undoStackPush();

        // TODO validate array

        let table = new DataStructs.DataTable();

        let firstColIsTime = false;
        let count = 0
        array2d.forEach((row) => {
            let item = row[0];
            if (!isNaN(Date.parse(item))) count++;
        });
        if (count > array2d.length / 2) firstColIsTime = true;

        array2d[0].forEach((cell, index) => {
            let startIndex = 0
            if (index == 0) {
                table.dataColumns.push(new DataStructs.DataColumn("Time", index));
                if (!firstColIsTime) {
                    startIndex = 1;
                    table.dataColumns.push(DataStructs.DataColumn("Col" + index + startIndex));
                }
            } else {
                table.dataColumns.push(DataStructs.DataColumn("Col" + index + startIndex));
            }
        })

        array2d.forEach((row, index) => {
            let dataRow = new DataStructs.DataRow();
            dataRow.index = index;
            row.forEach((cell, index) => {
                dataRow.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, cell, table.dataColumns[index]));
            });
            table.dataRows.push(dataRow)
        });
    }

    function tableUpdated(table, change, changeData) {
        undoStackPush();

        // sanitize the table to prevent data leaks
        table = table.copy();

        let index = mModel.getAllTables().findIndex(t => t.id == table.id);
        mModel.getAllTables()[index] = table;

        if (change == TableChange.DELETE_ROWS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let prevCount = timeLine.cellBindings.length;
                timeLine.cellBindings = timeLine.cellBindings
                    // check each cell to see if it's still in the model, if not, filter it out.
                    .filter(cellBinding => mModel.getCellById(cellBinding.cellId) ? true : false);

                if (timeLine.cellBindings.length != prevCount) {
                    updateTimelineAxes(timeLine);
                }
            })
        } else if (change == TableChange.DELETE_COLUMNS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let prevCount = timeLine.cellBindings.length;
                timeLine.cellBindings = timeLine.cellBindings
                    // check each cell to see if it's still in the model, if not, filter it out.
                    .filter(cellBinding => mModel.getCellById(cellBinding.cellId) ? true : false);
                timeLine.axisBindings = timeLine.axisBindings.filter(b => !changeData.includes(b.columnId));
            })
        } else if (change == TableChange.UPDATE_CELLS) {
            mModel.getAllTimelines().forEach(timeLine => {
                let wasChanged = timeLine.cellBindings.some(b => changeData.includes(b.cellId));
                if (wasChanged) {
                    updateTimelineAxes(timeLine);
                    updateWarpBindingTimeStamps(timeLine);
                }
            })
        }
    }

    //// table Update Util functions ////
    function updateTimelineAxes(timeline) {
        let prevAxis = timeline.axisBindings;
        timeline.axisBindings = [];

        let dataCells = timeline.cellBindings.map(cb => mModel.getCellById(cb.cellId));

        prevAxis.forEach(axis => {
            let cells = dataCells.filter(cell => cell.columnId == axis.columnId && cell.getType() == DataTypes.NUM);
            if (cells.length > 0) {
                axis.val1 = Math.min(...cells.map(c => c.getValue()));
                axis.val2 = Math.max(...cells.map(c => c.getValue()));

                if (axis.val1 == axis.val2) axis.val1 = 0;
                timeline.axisBindings.push(axis);
            }
        });
    }
    //// end of table Update Util functions ////

    function bindCells(lineId, cellBindings) {
        undoStackPush();

        let timeline = mModel.getTimelineById(lineId);

        cellBindings = cellBindings.filter(cb => {
            let cell = mModel.getCellById(cb.cellId);
            if (!cell) { console.error("Invalid cell id: ", cb.cellId); return false; }
            // filter out time cells
            if (cell.isTimeCell) return false;
            // don't bind empty cells. 
            if (cell.val !== 0 && !cell.val) return false;

            return true;
        });

        timeline.cellBindings.push(...cellBindings);

        // update the axis
        let oldAxes = timeline.axisBindings;
        timeline.axisBindings = []

        let boundCells = timeline.cellBindings.map(c => mModel.getCellById(c.cellId));

        let columnsIds = DataUtil.getUniqueList(boundCells.map(c => c.columnId));
        columnsIds.forEach(columnId => {
            let numCells = boundCells.filter(cell =>
                cell.columnId == columnId &&
                cell.getType() == DataTypes.NUM &&
                cell.isValid());

            if (numCells.length > 0) {
                let min = Math.min(...numCells.map(i => i.getValue()));
                let max = Math.max(...numCells.map(i => i.getValue()));
                if (min == max) min > 0 ? min = 0 : max = 0;

                let axis = oldAxes.find(a => a.columnId == columnId);
                if (!axis) {
                    axis = new DataStructs.AxisBinding(columnId);
                    axis.dist1 = 30;
                    axis.dist2 = 100;
                }

                axis.val1 = min;
                axis.val2 = max;
                timeline.axisBindings.push(axis)
            }
        });

        updateWarpBindingTimeStamps(timeline);
    }

    function updateWarpBindingTimeStamps(timeline) {
        if (mModel.hasTimeMapping(timeline.id) && timeline.warpBindings.some(wb => !wb.timeStamp)) {
            timeline.warpBindings.forEach(wb => {
                if (!wb.timeStamp) {
                    wb.timeStamp = mModel.mapLinePercentToTime(timeline.id, wb.linePercent);
                }
            })
        }
    }

    function updateAxisDist(axisId, oneOrTwo, dist) {
        undoStackPush();

        let axis = mModel.getAxisById(axisId);

        if (!axis) throw Error("Invalid axis id: " + axisId);
        if (oneOrTwo == 1) {
            axis.dist1 = dist;
        } else {
            axis.dist2 = dist;
        }
    }

    /****
     * Utility
     */

    function setModelFromObject(obj) {
        undoStackPush();

        // TODO: Do complete model validation.

        mModel = new DataStructs.DataModel();
        obj.timelines.forEach(timeline => {
            let cleanedPoints = timeline.points.filter(p => {
                if (isNaN(p.x) || isNaN(p.y)) return false;
                else return true;
            });
            if (cleanedPoints.length != timeline.points.length) {
                // flag it but carry on with the filtered list.
                console.error("Invalid points in loaded timeline!", timeline.points);
                return;
            }

            mModel.getAllTimelines().push(DataStructs.Timeline.fromObject(timeline))
        })
        obj.dataTables.forEach(table => mModel.getAllTables().push(DataStructs.DataTable.fromObject(table)))
    }

    function getModelAsObject() {
        return {
            timelines: mModel.getAllTimelines(),
            dataTables: mModel.getAllTables()
        }
    }

    function undo() {
        if (mUndoStack.length == 0) return false;
        // throws away our currently version, but will hide annoying errors for a bit...
        mRedoStack.push(mModel.copy());
        mModel = mUndoStack.pop();

        return true;
    }

    function redo() {
        if (mRedoStack.length == 0) return false;
        mUndoStack.push(mModel.copy());
        mModel = mRedoStack.pop();
        return true;
    }

    function undoStackPush() {
        mRedoStack = [];
        mUndoStack.push(mModel.copy());
    }

    /****
     * Exports
     */

    this.newTimeline = newTimeline;
    this.extendTimeline = extendTimeline;
    this.mergeTimeline = mergeTimeline;
    this.deleteTimeline = deleteTimeline;
    this.breakTimeline = breakTimeline;
    this.updateTimelinePoints = updateTimelinePoints;

    this.addTable = addTable;
    this.addTableFromCSV = addTableFromCSV;
    this.tableUpdated = tableUpdated;

    this.bindCells = bindCells;
    this.updateWarpBinding = updateWarpBinding;

    // clean these up so they only modify the table, and clear that they do so.
    this.addBoundTextRow = addBoundTextRow;
    this.updateText = updateText;
    this.updateTextOffset = updateTextOffset;

    this.addTimelineStroke = addTimelineStroke;

    this.updateAxisDist = updateAxisDist;

    this.getModel = () => mModel.copy();

    this.setModelFromObject = setModelFromObject;
    this.getModelAsObject = getModelAsObject;

    this.undo = undo;
    this.redo = redo;
}
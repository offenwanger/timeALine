function DataTableController() {
    let mTableUpdatedCallback;
    let mSelectionCallback;

    let mLastSort = -1;

    let mHoTables = {};
    let mDataTables = {};

    let mHighlightCells = [];

    function updateModel(model) {
        redrawAllTables(model.getAllTables());
    }

    function redrawAllTables(allTables) {
        $("#table-list").empty();
        mHoTables = {};
        mDataTables = {};
        addOrUpdateTables(allTables);
    }

    function addOrUpdateTables(tables) {
        if (!Array.isArray(tables)) tables = [tables];
        tables.forEach(table => {
            mDataTables[table.id] = table;
            if (table.id in mHoTables) {
                mHoTables[table.id].loadData(getTextArray(table));
            } else {
                let tableId = table.id;

                table.dataColumns.sort((a, b) => a.index - b.index)
                let colHeader = table.dataColumns.map(col => col.name)

                let newDiv = $("<p>");
                $("#table-list").append(newDiv);

                mHoTables[tableId] = new Handsontable(newDiv.get(0), {
                    data: getTextArray(table),
                    rowHeaders: true,
                    colHeaders: colHeader,
                    columnSorting: true,
                    fixedColumnsStart: 1,
                    height: 'auto',
                    manualColumnMove: true,
                    manualRowMove: true,
                    contextMenu: true,
                    //// Formats Cells ////
                    cells: function (row, col) {
                        return {
                            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                                Handsontable.renderers.TextRenderer.apply(this, arguments);

                                let columnId = mDataTables[tableId].dataColumns.find(col => col.index == prop).id;
                                let cell = mDataTables[tableId].dataRows.find(r => r.index == row).getCell(columnId);
                                if (mHighlightCells.length > 0 && !mHighlightCells.includes(cell.id)) {
                                    td.style.filter = 'brightness(85%) contrast(0.85) opacity(0.5)';
                                }
                            }
                        };
                    },
                    //// Updates Data ////
                    afterChange: function () { afterChange(tableId, ...arguments) },
                    afterCreateRow: function () { afterCreateRow(tableId, ...arguments) },
                    afterCreateCol: function () { afterCreateCol(tableId, ...arguments) },
                    afterRemoveRow: function () { afterRemoveRow(tableId, ...arguments) },
                    afterRemoveCol: function () { afterRemoveCol(tableId, ...arguments) },
                    afterColumnMove: function () { afterColumnMove(tableId, ...arguments) },
                    afterRowMove: function () { afterRowMove(tableId, ...arguments) },
                    beforeColumnSort: function () { beforeColumnSort(tableId, ...arguments) },
                    //// Controls interaction ////
                    afterSelection: function () { afterSelection(tableId, ...arguments) },
                    afterDeselect,
                    beforeCreateCol,
                    beforeRemoveCol,
                    beforeColumnMove,
                    outsideClickDeselects,
                    licenseKey: 'non-commercial-and-evaluation' // for non-commercial use only
                });
            }
        })
    }

    //// Table Interaction functions ////
    function afterChange(tableId, changes) {
        // Note: this function calls every time we load data. 

        // TODO: probably need to update highlighting here

        // sent table updated call
        // don't need to update the table here because no cells moved, so it will be up to date
        if (changes) {
            let updatedCells = [];
            changes.forEach(([row, prop, oldValue, newValue]) => {
                let columnId = mDataTables[tableId].dataColumns.find(col => col.index == prop).id;
                let cell = mDataTables[tableId].dataRows.find(r => r.index == row).getCell(columnId);
                cell.val = newValue;
                updatedCells.push(cell.id);
            });

            mTableUpdatedCallback(mDataTables[tableId], TableChange.UPDATE_CELLS, updatedCells);
        }
    }

    function afterCreateRow(tableId, startIndex, numberOfRows) {
        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index >= startIndex) row.index += numberOfRows;
        })

        let newRows = [];
        for (let i = 0; i < numberOfRows; i++) {
            let newRow = new DataStructs.DataRow();
            mDataTables[tableId].dataColumns.forEach(column => {
                if (column.index == 0) {
                    newRow.dataCells.push(new DataStructs.TimeCell("", column.id));
                } else {
                    newRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", column.id));
                }
            });
            newRow.index = startIndex + i;
            mDataTables[tableId].dataRows.push(newRow);
            newRows.push(newRow.id);
        }

        mTableUpdatedCallback(mDataTables[tableId], TableChange.CREATE_ROWS, newRows);
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => mHoTables[tableId].loadData(getTextArray(mDataTables[tableId])), 0);
    }

    function afterRemoveRow(tableId, index, amount) {
        let removedRows = mDataTables[tableId].dataRows.filter(row => row.index >= index && row.index < index + amount).map(row => row.id);

        mDataTables[tableId].dataRows = mDataTables[tableId].dataRows.filter(row => row.index < index || row.index >= index + amount);

        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index > index) row.index -= amount;
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.DELETE_ROWS, removedRows);
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => mHoTables[tableId].loadData(getTextArray(mDataTables[tableId])), 0);
    }

    function afterRowMove(tableId, movedRows, finalIndex) {
        // moved rows appears to always be a sequential set.
        // TODO verify this assumption. 
        let startIndex = Math.min(...movedRows);
        let endIndex = Math.max(...movedRows);
        let numberOfRows = endIndex - startIndex + 1;
        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index >= startIndex && row.index <= endIndex) {
                row.index = row.index - startIndex + finalIndex;
            } else if (row.index < startIndex && row.index >= finalIndex) {
                row.index += numberOfRows;
            } else if (row.index < finalIndex + numberOfRows && row.index > endIndex) {
                row.index -= numberOfRows;
            }
        })

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_ROWS);
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => mHoTables[tableId].loadData(getTextArray(mDataTables[tableId])), 0);
    }

    function afterCreateCol(tableId, startIndex, numberOfCols) {
        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index >= startIndex) col.index += numberOfCols;
        })

        let newCols = [];
        for (let i = 0; i < numberOfCols; i++) {
            let newCol = new DataStructs.DataColumn("", startIndex + i);
            mDataTables[tableId].dataRows.forEach(row => row.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", newCol.id)));
            mDataTables[tableId].dataColumns.push(newCol);
            newCols.push(newCol.id);
        }

        mTableUpdatedCallback(mDataTables[tableId], TableChange.CREATE_COLUMNS, newCols)
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => {
            mDataTables[tableId].dataColumns.sort((a, b) => a.index - b.index)
            mHoTables[tableId].loadData(getTextArray(mDataTables[tableId]));
            mHoTables[tableId].updateSettings({ colHeaders: mDataTables[tableId].dataColumns.map(col => col.name) });
        }, 0);
    }

    function afterRemoveCol(tableId, index, amount) {
        let removedColumns = mDataTables[tableId].dataColumns.filter(col => col.index >= index && col.index < index + amount).map(col => col.id);
        mDataTables[tableId].dataColumns = mDataTables[tableId].dataColumns.filter(col => col.index < index || col.index >= index + amount);

        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index > index) col.index -= amount;
        })

        mDataTables[tableId].dataRows.forEach(row => {
            row.dataCells = row.dataCells.filter(cell => !removedColumns.includes(cell.columnId));
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.DELETE_COLUMNS, removedColumns)
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => {
            mHoTables[tableId].updateSettings({ colHeaders: mDataTables[tableId].dataColumns.map(col => col.name) });
            mHoTables[tableId].loadData(getTextArray(mDataTables[tableId]));
        }, 0);
    }

    function afterColumnMove(tableId, movedColumns, finalIndex) {
        // moved cols appears to always be a sequential set.
        // TODO verify this assumption. 
        let startIndex = Math.min(...movedColumns);
        let endIndex = Math.max(...movedColumns);
        let numberOfCols = endIndex - startIndex + 1;
        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index >= startIndex && col.index <= endIndex) {
                col.index = col.index - startIndex + finalIndex;
            } else if (col.index < startIndex && col.index >= finalIndex) {
                col.index += numberOfCols;
            } else if (col.index < finalIndex + numberOfCols && col.index > endIndex) {
                col.index -= numberOfCols;
            }
        })

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_COLUMNS);
        // For some reason handsontable objects to being updated in this function, so just make it async.
        setTimeout(() => {
            mDataTables[tableId].dataColumns.sort((a, b) => a.index - b.index)
            mHoTables.loadData(getTextArray(mDataTables[tableId]));
            mHoTables.updateSettings({ colHeaders: mDataTables[tableId].dataColumns.map(col => col.name) });
        }, 0);
    }

    function beforeColumnSort(tableId, currentSortConfig, destinationSortConfigs) {
        let columnIndex = destinationSortConfigs[0].column
        let column = mDataTables[tableId].dataColumns[columnIndex];
        let order = 1;

        if (mLastSort == columnIndex) {
            order = -1;
            mLastSort = -1;
        } else mLastSort = columnIndex;

        mDataTables[tableId].dataRows.sort((rowA, rowB) => {
            let returnable = 0;
            let cellA = rowA.getCell(column.id);
            let cellB = rowB.getCell(column.id);

            if ((cellA.isTimeCell && !cellB.isTimeCell) || (!cellA.isTimeCell && cellB.isTimeCell)) {
                console.error("Bad state! TimeCell in non-time row or non-time cell in time row", cellA, cellB);
                return 0;
            }

            if (cellA.isTimeCell) {
                if (cellA.isValid() && cellB.isValid()) {
                    returnable = (cellA.getValue() - cellB.getValue()) / Math.abs(cellA.getValue() - cellB.getValue());
                } else if (cellA.isValid() && !cellB.isValid()) {
                    // a goes before b
                    returnable = -1;
                } else if (!cellA.isValid() && cellB.isValid()) {
                    // a goes after b
                    returnable = 1;
                } else if (!cellA.isValid() && !cellB.isValid()) {
                    returnable = cellA.getValue() == cellB.getValue() ? 0 : (cellA.getValue() < cellB.getValue() ? -1 : 1);
                }
            } else {
                let typeA = cellA.getType();
                let typeB = cellB.getType();

                if (typeA != typeB) {
                    if (typeA == DataTypes.NUM) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == DataTypes.NUM) {
                        // a goes after b
                        returnable = 1;
                    } else { console.error("Unhandled case!"); return 0; }
                } else {
                    returnable = DataUtil.AGreaterThanB(cellA.getValue(), cellB.getValue(), typeA) ? 1 : -1;
                }
            }

            return returnable * order;
        });

        mDataTables[tableId].dataRows.forEach((row, index) => {
            row.index = index;
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_ROWS);
        setTimeout(() => { mHoTables[tableId].loadData(getTextArray(mDataTables[tableId])); }, 0);

        return false;
    }

    function afterSelection(tableId) {
        let selected = mHoTables[tableId].getSelected() || [];
        if (selected.length == 0) {
            mSelectionCallback(null, 0, 0);
            return;
        }

        if (selected.length == 1 &&
            selected[0][0] == -1 &&
            selected[0][1] == -1 &&
            selected[0][2] == -1 &&
            selected[0][3] == -1) return;

        let data = [];
        for (let i = 0; i < selected.length; i += 1) {
            // TODO: This should actually just get the cell IDs
            data.push(mHoTables[tableId].getData(...selected[i]));
        }
        // top row can be -1, so make sure it is at least 0.
        let topRow = Math.max(0, Math.min(...selected.map(s => Math.min(s[0], s[2]))))
        let bottomRow = Math.max(...selected.map(s => Math.max(s[0], s[2])))

        let selectionTop = mHoTables[tableId].getCell(topRow, 0).getBoundingClientRect().top;
        let selectionBottom = mHoTables[tableId].getCell(bottomRow, 0).getBoundingClientRect().bottom;

        mSelectionCallback(data, selectionTop, selectionBottom)
    }

    function afterDeselect(e) {
        mSelectionCallback(null, 0, 0)
    }

    function beforeCreateCol(index) {
        if (index == 0) {
            return false;
        }
        return true;
    }

    function beforeRemoveCol(index) {
        if (index == 0) {
            return false;
        }
        return true;
    }

    function beforeColumnMove(columnsMoving, target) {
        if (columnsMoving[0] < 1 || target < 1) {
            return false;
        }
        return true;
    }

    function outsideClickDeselects(target) {
        let inDrawerContent = $(target).closest("#table-list");
        if (inDrawerContent.length > 0 && $(target).attr("id") != "link-button") {
            return true;
        }

        return false;
    }

    //// ////

    function getSelectedCells() {
        let data = [];
        Object.entries(mHoTables).forEach(([tableId, hoTable]) => {
            let selected = hoTable.getSelected() || [];
            if (selected.length == 1 &&
                selected[0][0] == -1 &&
                selected[0][1] == -1 &&
                selected[0][2] == -1 &&
                selected[0][3] == -1) return;

            selected.forEach(select => {
                // selection can be 0 if the row/col header is selected.
                let startRow = Math.max(0, Math.min(select[0], select[2]));
                let startCol = Math.max(0, Math.min(select[1], select[3]));
                let endRow = Math.max(0, select[0], select[2]);
                let endCol = Math.max(0, select[1], select[3]);

                for (let col = startCol; col <= endCol; col++) {
                    for (let row = startRow; row <= endRow; row++) {
                        // TODO: verify datarow is actually found;
                        let dataRow = mDataTables[tableId].dataRows.find(r => r.index == row);
                        let columnId = mDataTables[tableId].dataColumns.find(c => c.index == col).id;
                        let cellId = dataRow.getCell(columnId).id;
                        data.push(new DataStructs.CellBinding(cellId));
                    }
                }
            })
        });
        return data;
    }

    function highlightCells(cellIds) {
        if (cellIds.length == 0 && mHighlightCells.length == 0) {
            return;
        }
        mHighlightCells = cellIds;
        Object.values(mHoTables).forEach(hoTable => hoTable.render())
    }

    // this functions takes complex data types and simplifies them for table display
    function getTextArray(table) {
        let arr2D = Array(table.dataRows.length).fill(0).map(i => Array(table.dataColumns.length));

        table.dataRows.forEach(row => row.dataCells.forEach(cell => {
            let column = table.getColumn(cell.columnId);
            if (!column) {
                console.error("Column missing!")
            } else {
                arr2D[row.index][column.index] = cell.toString();
            }
        }))

        return arr2D;
    }

    function validateCellData(type, value) {
        // TODO: Actaully validate the data.
        return false;
    }

    this.updateModel = updateModel;

    this.redrawAllTables = redrawAllTables;
    this.addOrUpdateTables = addOrUpdateTables;
    this.highlightCells = highlightCells;
    this.deselectCells = () => Object.values(mHoTables).forEach(table => table.deselectCell());

    this.getSelectedCells = getSelectedCells;
    this.setOnSelectionCallback = (callback) => mSelectionCallback = callback;
    this.setTableUpdatedCallback = (callback) => mTableUpdatedCallback = callback;
}
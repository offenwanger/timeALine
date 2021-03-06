function DataTableController() {
    let mDrawerController = new DrawerController("#data-drawer");
    mDrawerController.setOnDrawerClosed(() => {
        Object.values(hotTables).forEach(table => table.deselectCell());
    });

    let mTableUpdatedCallback;
    let mSelectionCallback;

    let mLastSort = -1;

    let hotTables = {};

    let mHighlightCells = [];

    function updateTableData(tables) {
        tables.forEach(table => {
            if (table.id in hotTables) {
                hotTables[table.id].loadData(getTextArray(table));
            } else {
                addTable(table);
            }
        })
    }

    function addTable(table) {
        table.dataColumns.sort((a, b) => a.index - b.index)
        let colHeader = table.dataColumns.map(col => col.name)

        let newDiv = $("<p>");
        $("#table-list").append(newDiv);

        let hot = new Handsontable(newDiv.get(0), {
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
                return { renderer: highlightRender };
            },
            //// Updates Data ////
            afterChange,
            afterCreateRow,
            afterCreateCol,
            afterRemoveRow,
            afterRemoveCol,
            afterColumnMove,
            afterRowMove,
            beforeColumnSort,
            //// Controls interaction ////
            afterSelection,
            afterDeselect,
            beforeCreateCol,
            beforeRemoveCol,
            beforeColumnMove,
            outsideClickDeselects,
            licenseKey: 'non-commercial-and-evaluation' // for non-commercial use only
        });

        hot.getSelectionData = function () {
            let data = [];
            let selected = hot.getSelected() || [];
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
                        let tableId = table.id;
                        // TODO: verify datarow is actually found;
                        let dataRow = table.dataRows.find(r => r.index == row);
                        let rowId = dataRow.id;
                        let columnId = table.dataColumns.find(c => c.index == col).id;
                        let cellId = dataRow.getCell(columnId).id;
                        data.push(new DataStructs.CellBinding(tableId, rowId, columnId, cellId));
                    }
                }
            })

            return data;
        }

        function highlightRender(instance, td, row, col, prop, value, cellProperties) {
            Handsontable.renderers.TextRenderer.apply(this, arguments);

            let columnId = table.dataColumns.find(col => col.index == prop).id;
            let cell = table.dataRows.find(r => r.index == row).getCell(columnId);
            if (mHighlightCells.length > 0 && !mHighlightCells.includes(cell.id)) {
                td.style.filter = 'brightness(85%) contrast(0.85) opacity(0.5)';
            }
        }

        function afterChange(changes) {
            // Note: this function calls every time we load data. 

            // TODO: probably need to update highlighting here

            // sent table updated call
            // don't need to update the table here because no cells moved, so it will be up to date
            if (changes) {
                let updatedCells = [];
                changes.forEach(([row, prop, oldValue, newValue]) => {
                    let columnId = table.dataColumns.find(col => col.index == prop).id;
                    let cell = table.dataRows.find(r => r.index == row).getCell(columnId);
                    cell.val = newValue;
                    updatedCells.push(cell.id);
                });

                mTableUpdatedCallback(table, TableChange.UPDATE_CELLS, updatedCells);
            }
        }

        function afterCreateRow(startIndex, numberOfRows) {
            table.dataRows.forEach(row => {
                if (row.index >= startIndex) row.index += numberOfRows;
            })

            let newRows = [];
            for (let i = 0; i < numberOfRows; i++) {
                let newRow = new DataStructs.DataRow();
                table.dataColumns.forEach(column => newRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", column.id)));
                newRow.index = startIndex + i;
                table.dataRows.push(newRow);
                newRows.push(newRow.id);
            }

            mTableUpdatedCallback(table, TableChange.CREATE_ROWS, newRows);
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getTextArray(table)), 0);
        }

        function afterRemoveRow(index, amount) {
            let removedRows = table.dataRows.filter(row => row.index >= index && row.index < index + amount).map(row => row.id);

            table.dataRows = table.dataRows.filter(row => row.index < index || row.index >= index + amount);

            table.dataRows.forEach(row => {
                if (row.index > index) row.index -= amount;
            });

            mTableUpdatedCallback(table, TableChange.DELETE_ROWS, removedRows);
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getTextArray(table)), 0);
        }

        function afterRowMove(movedRows, finalIndex) {
            // moved rows appears to always be a sequential set.
            // TODO verify this assumption. 
            let startIndex = Math.min(...movedRows);
            let endIndex = Math.max(...movedRows);
            let numberOfRows = endIndex - startIndex + 1;
            table.dataRows.forEach(row => {
                if (row.index >= startIndex && row.index <= endIndex) {
                    row.index = row.index - startIndex + finalIndex;
                } else if (row.index < startIndex && row.index >= finalIndex) {
                    row.index += numberOfRows;
                } else if (row.index < finalIndex + numberOfRows && row.index > endIndex) {
                    row.index -= numberOfRows;
                }
            })

            mTableUpdatedCallback(table, TableChange.REORDER_ROWS);
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getTextArray(table)), 0);
        }

        function afterCreateCol(startIndex, numberOfCols) {
            table.dataColumns.forEach(col => {
                if (col.index >= startIndex) col.index += numberOfCols;
            })

            let newCols = [];
            for (let i = 0; i < numberOfCols; i++) {
                let newCol = new DataStructs.DataColumn("", startIndex + i);
                table.dataRows.forEach(row => row.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", newCol.id)));
                table.dataColumns.push(newCol);
                newCols.push(newCol.id);
            }

            mTableUpdatedCallback(table, TableChange.CREATE_COLUMNS, newCols)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.loadData(getTextArray(table));
                table.dataColumns.sort((a, b) => a.index - b.index)
                hot.updateSettings({ colHeaders: table.dataColumns.map(col => col.name) });
            }, 0);
        }

        function afterRemoveCol(index, amount) {
            let removedColumns = table.dataColumns.filter(col => col.index >= index && col.index < index + amount).map(col => col.id);
            table.dataColumns = table.dataColumns.filter(col => col.index < index || col.index >= index + amount);

            table.dataColumns.forEach(col => {
                if (col.index > index) col.index -= amount;
            })

            table.dataRows.forEach(row => {
                row.dataCells = row.dataCells.filter(cell => !removedColumns.includes(cell.columnId));
            });

            mTableUpdatedCallback(table, TableChange.DELETE_COLUMNS, removedColumns)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.updateSettings({ colHeaders: table.dataColumns.map(col => col.name) });
                hot.loadData(getTextArray(table));
            }, 0);
        }

        function afterColumnMove(movedColumns, finalIndex) {
            // moved cols appears to always be a sequential set.
            // TODO verify this assumption. 
            let startIndex = Math.min(...movedColumns);
            let endIndex = Math.max(...movedColumns);
            let numberOfCols = endIndex - startIndex + 1;
            table.dataColumns.forEach(col => {
                if (col.index >= startIndex && col.index <= endIndex) {
                    col.index = col.index - startIndex + finalIndex;
                } else if (col.index < startIndex && col.index >= finalIndex) {
                    col.index += numberOfCols;
                } else if (col.index < finalIndex + numberOfCols && col.index > endIndex) {
                    col.index -= numberOfCols;
                }
            })

            mTableUpdatedCallback(table, TableChange.REORDER_COLUMNS);
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.loadData(getTextArray(table));
                table.dataColumns.sort((a, b) => a.index - b.index)
                hot.updateSettings({ colHeaders: table.dataColumns.map(col => col.name) });
            }, 0);
        }

        function beforeColumnSort(currentSortConfig, destinationSortConfigs) {
            let columnIndex = destinationSortConfigs[0].column
            let column = table.dataColumns[columnIndex];
            let order = 1;

            if (mLastSort == columnIndex) {
                order = -1;
                mLastSort = -1;
            } else mLastSort = columnIndex;

            table.dataRows.sort((rowA, rowB) => {
                let returnable = 0;
                let cellA = rowA.getCell(column.id);
                let cellB = rowB.getCell(column.id);
                let typeA = cellA.getType();
                let typeB = cellB.getType();

                if (typeA != typeB) {
                    if (typeA == DataTypes.TIME_BINDING) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == DataTypes.TIME_BINDING) {
                        // a goes after b
                        returnable = 1;
                    } else if (typeA == DataTypes.NUM) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == DataTypes.NUM) {
                        // a goes after b
                        returnable = 1;
                    } else { console.error("Unhandled case!"); return 0; }
                } else {
                    returnable = DataUtil.AGreaterThanB(cellA.getValue(), cellB.getValue(), typeA) ? 1 : -1;
                }

                return returnable * order;
            });

            table.dataRows.forEach((row, index) => {
                row.index = index;
            });

            mTableUpdatedCallback(table, TableChange.REORDER_ROWS);
            setTimeout(() => { hot.loadData(getTextArray(table)); }, 0);

            return false;
        }

        function afterSelection() {
            let selected = hot.getSelected() || [];
            if (selected.length == 1 &&
                selected[0][0] == -1 &&
                selected[0][1] == -1 &&
                selected[0][2] == -1 &&
                selected[0][3] == -1) return;

            let data = [];
            for (let i = 0; i < selected.length; i += 1) {
                // TODO: This should actually just get the cell IDs
                data.push(hot.getData(...selected[i]));
            }
            // top row can be -1, so make sure it is at least 0.
            let topRow = Math.max(0, Math.min(...selected.map(s => Math.min(s[0], s[2]))))
            let bottomRow = Math.max(...selected.map(s => Math.max(s[0], s[2])))

            let selectionTop = hot.getCell(topRow, 0).getBoundingClientRect().top;
            let selectionBottom = hot.getCell(bottomRow, 0).getBoundingClientRect().bottom;

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

        hotTables[table.id] = hot;
    }

    function getSelectedCells() {
        let data = [];
        Object.values(hotTables).forEach(hot => {
            data.push(...hot.getSelectionData());
        });
        return data;
    }

    function highlightCells(cellIds) {
        if (cellIds.length == 0 && mHighlightCells.length == 0) {
            return;
        }
        mHighlightCells = cellIds;
        Object.values(hotTables).forEach(hot => hot.render())
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

    this.addTable = addTable;
    this.updateTableData = updateTableData;
    this.setTableUpdatedCallback = (callback) => mTableUpdatedCallback = callback;
    this.getSelectedCells = getSelectedCells;
    this.highlightCells = highlightCells;
    this.setOnSelectionCallback = (callback) => mSelectionCallback = callback;
    this.openTableView = () => mDrawerController.openDrawer();
    this.closeTableView = () => mDrawerController.closeDrawer();
    this.isOpen = () => mDrawerController.isOpen();
}

function DrawerController(dataDrawerId) {
    const OPEN_SPEED = 50;
    const CLOSE_SPEED = 350;

    let mIsOpen = false;

    let mOnDrawerClosedCallback = () => { };

    $(dataDrawerId).find('.close-button').on('click', closeDrawer);

    function openDrawer() {
        document.documentElement.style.overflow = 'hidden';
        $(dataDrawerId).addClass('is-active');
        setTimeout(function () {
            $(dataDrawerId).addClass('is-visible')
        }, OPEN_SPEED);

        mIsOpen = true;
    }

    function closeDrawer() {
        document.documentElement.style.overflow = '';
        $(dataDrawerId).removeClass('is-visible');
        setTimeout(function () {
            $(dataDrawerId).removeClass('is-active');
        }, CLOSE_SPEED);

        mIsOpen = false;

        mOnDrawerClosedCallback();
    }

    this.openDrawer = openDrawer;
    this.closeDrawer = closeDrawer;
    this.setOnDrawerClosed = (callback) => mOnDrawerClosedCallback = callback;
    this.isOpen = () => mIsOpen;
}
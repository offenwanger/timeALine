function DataTableController() {
    let mDrawerController = new DrawerController("#data-drawer");
    let mTableUpdatedCallback;
    let mSelectionCallback;

    let mLastSort = -1;

    let hotTables = {};

    function updateTableData(tables) {
        tables.forEach(table => {
            if (table.id in hotTables) {
                hotTables[table.id].loadData(getSimpleTable(table));
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
            data: getSimpleTable(table),
            rowHeaders: true,
            colHeaders: colHeader,
            columnSorting: true,
            fixedColumnsStart: 1,
            height: 'auto',
            manualColumnMove: true,
            manualRowMove: true,
            contextMenu: true,
            // Updates Data
            afterChange,
            afterCreateRow,
            afterRemoveRow,
            afterRowMove,
            afterCreateCol,
            afterRemoveCol,
            afterColumnMove,
            beforeColumnSort,
            // Controls interaction
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
                let startCol = Math.max(0, select[0]);
                let endCol = Math.max(0, select[2]);
                let startRow = Math.max(0, select[1]);
                let endRow = Math.max(0, select[3]);

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

        function afterChange(changes) {
            // Note: this function calls every time we load data. 

            // TODO: probably need to update highlighting here

            // sent table updated call
            // don't need to update the table here because no cells moved, so it will be up to date
            if (changes) {
                changes.forEach(([row, prop, oldValue, newValue]) => {
                    let columnId = table.dataColumns.find(col => col.index == prop).id;
                    let cell = table.dataRows.find(r => r.index == row).getCell(columnId);
                    // check the type, check if the new data is valid, if no, set cell to invalid
                    cell.val = newValue;
                    if (cell.type != DataTypes.UNSPECIFIED) {
                        cell.valid = validateCellData(cell.type, cell.val);
                    }
                });

                mTableUpdatedCallback(table, true)
            }
        }

        function afterCreateRow(startIndex, numberOfRows) {
            table.dataRows.forEach(row => {
                if (row.index >= startIndex) row.index += numberOfRows;
            })

            for (let i = 0; i < numberOfRows; i++) {
                let newRow = new DataStructs.DataRow();
                table.dataColumns.forEach(column => newRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", column.id)));
                newRow.index = startIndex + i;
                table.dataRows.push(newRow);
            }

            mTableUpdatedCallback(table)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getSimpleTable(table)), 0);
        }

        function afterRemoveRow(index, amount) {
            table.dataRows = table.dataRows.filter(row => row.index < index || row.index >= index + amount);

            table.dataRows.forEach(row => {
                if (row.index > index) row.index -= amount;
            });

            mTableUpdatedCallback(table, true)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getSimpleTable(table)), 0);
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

            mTableUpdatedCallback(table, true)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => hot.loadData(getSimpleTable(table)), 0);
        }

        function afterCreateCol(startIndex, numberOfCols) {
            table.dataColumns.forEach(col => {
                if (col.index >= startIndex) col.index += numberOfCols;
            })

            for (let i = 0; i < numberOfCols; i++) {
                let newCol = new DataStructs.DataColumn("", startIndex + i);
                table.dataRows.forEach(row => row.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", newCol.id)));
                table.dataColumns.push(newCol);
            }

            mTableUpdatedCallback(table)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.loadData(getSimpleTable(table));
                table.dataColumns.sort((a, b) => a.index - b.index)
                hot.updateSettings({ colHeaders: table.dataColumns.map(col => col.name) });
            }, 0);
        }

        function afterRemoveCol(index, amount) {
            let removedColumns = table.dataColumns.filter(col => col.index >= index || col.index < index + amount).map(col => col.id);
            table.dataColumns = table.dataColumns.filter(col => col.index < index || col.index >= index + amount);

            table.dataColumns.forEach(col => {
                if (col.index > index) col.index -= amount;
            })

            table.dataRows.forEach(row => {
                row.dataCells = row.dataCells.filter(cell => !removedColumns.includes(cell.columnId));
            });

            mTableUpdatedCallback(table, true)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.loadData(getSimpleTable(table));
                table.dataColumns.sort((a, b) => a.index - b.index)
                hot.updateSettings({ colHeaders: table.dataColumns.map(col => col.name) });
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

            mTableUpdatedCallback(table)
            // For some reason handsontable objects to being updated in this function, so just make it async.
            setTimeout(() => {
                hot.loadData(getSimpleTable(table));
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
                if (cellA.type == DataTypes.UNSPECIFIED || cellA.type == DataTypes.TIME_BINDING) {
                    cellA = DataUtil.inferDataAndType(cellA.val);
                }
                if (cellB.type == DataTypes.UNSPECIFIED || cellB.type == DataTypes.TIME_BINDING) {
                    cellB = DataUtil.inferDataAndType(cellB.val);
                }
                let typeA = cellA.type;
                let typeB = cellB.type;

                if (typeA != typeB) {
                    if (typeA == TimeBindingTypes.TIMESTRAMP) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == TimeBindingTypes.TIMESTRAMP) {
                        // a goes after b
                        returnable = 1;
                    } else if (typeA == DataTypes.NUM) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == DataTypes.NUM) {
                        // a goes after b
                        returnable = 1;
                    } else {
                        console.error("Unhandled case!")
                        return 0
                    }
                } else {
                    if (typeA == TimeBindingTypes.TIMESTRAMP || typeA == DataTypes.NUM) {
                        returnable = cellA.val - cellB.val;
                    } else if (typeA == DataTypes.TEXT) {
                        returnable = cellA.val == cellB.val ? 0 : cellA.val < cellB.val ? -1 : 1;
                    } else {
                        console.error("Unhandled case!")
                        return 0
                    }
                }

                return returnable * order;
            });

            table.dataRows.forEach((row, index) => {
                row.index = index;
            });

            mTableUpdatedCallback(table, true)
            setTimeout(() => { hot.loadData(getSimpleTable(table)); }, 0);

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

    // this functions takes complex data types and simplifies them for table display
    function getSimpleTable(table) {
        let arr2D = Array(table.dataRows.length).fill(0).map(i => Array(table.dataColumns.length));

        table.dataRows.forEach(row => row.dataCells.forEach(cell => {
            let column = table.getColumn(cell.columnId);
            if (!column) {
                console.error("Column missing!")
            } else {
                arr2D[row.index][column.index] = cell.getValue();
                if (arr2D[row.index][column.index] instanceof DataStructs.TimeBinding) {
                    arr2D[row.index][column.index] = arr2D[row.index][column.index].toString();
                }
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
    this.setOnSelectionCallback = (callback) => mSelectionCallback = callback;
    this.openTableView = () => mDrawerController.openDrawer();
    this.closeTableView = () => mDrawerController.closeDrawer();
    this.isOpen = () => mDrawerController.isOpen();
}

function DrawerController(dataDrawerId) {
    const OPEN_SPEED = 50;
    const CLOSE_SPEED = 350;

    let isOpen = false;

    $(dataDrawerId).find('.close-button').on('click', closeDrawer);

    function openDrawer() {
        document.documentElement.style.overflow = 'hidden';
        $(dataDrawerId).addClass('is-active');
        setTimeout(function () {
            $(dataDrawerId).addClass('is-visible')
        }, OPEN_SPEED);

        isOpen = true;
    }

    function closeDrawer() {
        document.documentElement.style.overflow = '';
        $(dataDrawerId).removeClass('is-visible');
        setTimeout(function () {
            $(dataDrawerId).removeClass('is-active');
        }, CLOSE_SPEED);

        isOpen = false;
    }

    this.openDrawer = openDrawer;
    this.closeDrawer = closeDrawer;
    this.isOpen = () => isOpen;
}
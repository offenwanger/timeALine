function DataTableController() {
    let mDrawerController = new DrawerController("#data-drawer");
    let mTableUpdatedCallback;
    let mSelectionCallback;

    let hotTables = {};

    function updateTableData(tables) {
        tables.forEach(table => {
            if (table.id in hotTables) {
                hotTables[table.id].loadData(simplifyDataset(table.getDataset()));
            } else {
                hotTables[table.id] = addTable(table);
            }
        })
    }

    function addTable(table) {
        let data = table.getDataset();
        let colHeader = table.dataColumns.map(col => col.name)

        let newDiv = $("<p>");
        $("#table-list").append(newDiv);

        let hot = new Handsontable(newDiv.get(0), {
            data: data,
            rowHeaders: true,
            colHeaders: colHeader,
            columnSorting: true,
            fixedColumnsStart: 1,
            height: 'auto',
            manualColumnMove: true,
            manualRowMove: true,
            contextMenu: true,
            // Updates Data
            beforeChange,
            afterChange,
            afterCreateRow,
            afterRemoveRow,
            afterRowMove,
            afterCreateCol,
            afterRemoveCol,
            afterColumnMove,
            afterColumnSort,
            // Controls interaction
            afterSelection,
            afterDeselect,
            beforeRemoveCol,
            beforeColumnMove,
            outsideClickDeselects,
            licenseKey: 'non-commercial-and-evaluation' // for non-commercial use only
        });

        function beforeChange(changes) {
            console.log("Finish me! beforeChange");
            console.log(changes);
            // check the type for the changes cell, if it's a complex type, format the change appropriately
            // [[row, prop, oldVal, newVal], ...]
            // changes[0][3] = 10;
        }

        function afterChange(changes) {
            console.log("Finish me! afterChange");
            // sent table updated call
            // don't need to update the table here because no cells moved, so it will be up to date
            if (changes)
                changes.forEach(([row, prop, oldValue, newValue]) => {
                    console.log(row, prop, oldValue, newValue);
                });

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
            console.log(table.getDataset())
            setTimeout(() => hot.loadData(simplifyDataset(table.getDataset())), 0);
        }

        function afterRemoveRow(index, amount, physicalRows) {
            // remove rows from table, decrement indexes after these
            // sent table updated call
            // set table data based on new table
            console.log("Finish me! afterRemoveRow");
        }

        function afterRowMove(movedRows, finalIndex, dropIndex, movePossible, orderChanged) {
            // not sure if I need to check the actual current order here...
            // set indexes
            // sent table updated call
            // update table data
            console.log("Finish me! afterRowMove");
        }

        function afterCreateCol(index, amount) {
            // add new column to table, set indexes, increament column indicies after these
            // add new cells to each row for new column
            // sent table updated call
            // set table data based on new table
            console.log("Finish me! afterCreateCol");
        }

        function afterRemoveCol(index, amount, physicalColumns) {
            // remove columns from table, decrement column indicies after these
            // remove cells that belonged to the column
            // send table updated call
            // set table data based on new table
            console.log("Finish me! afterRemoveCol");
        }

        function afterColumnMove(movedColumns, finalIndex, dropIndex, movePossible, orderChanged) {
            // set indexes
            // sent table updated call
            // update table data
            console.log("Finish me! afterColumnMove");
        }

        function afterColumnSort(currentSortConfig, destinationSortConfigs) {
            // set indexes
            // sent table updated call
            // pretty sure I don't want to update table data yet, so that when we unsort it will go back to how it was
            console.log("Finish me! afterColumnSort");
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

        return hot;
    }

    // this functions takes complex data types and simplifies them for table display
    function simplifyDataset(dataset) {
        return dataset.map(row => row.map(cell => {
            if (cell instanceof DataStructs.TimeBinding) {
                return cell.toString();
            } else {
                return cell;
            }
        }))
    }

    this.addTable = addTable;
    this.updateTableData = updateTableData;
    this.setTableUpdatedCallback = (callback) => mTableUpdatedCallback = callback;
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
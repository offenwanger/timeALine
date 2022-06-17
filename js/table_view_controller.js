function DataTableController() {
    let mDrawerController = new DrawerController("#data-drawer");
    let mCellUpdatedCallback;
    let mSelectionCallback;

    function setTables(tables) {
        clearTables();
        tables.forEach(table => {
            addTable(table);
        })
    }

    function addTable(table) {
        let data = table.dataRows;
        let colHeader = table.dataColumns.map(col => col.name)

        let newDiv = $("<p>");
        $("#table-list").append(newDiv);

        let hot = new Handsontable(newDiv.get(0), {
            data: data,
            rowHeaders: true,
            colHeaders: colHeader,
            columnSorting: true,
            fixedColumnsStart: 1,
            beforeColumnMove: function (columnsMoving, target) {
                if (columnsMoving[0] < 1 || target < 1) {
                    return false;
                }
                return true;
            },
            height: 'auto',
            manualColumnMove: true,
            manualRowMove: true,
            contextMenu: true,
            afterChange: (changes) => {
                if (changes)
                    changes.forEach(([row, prop, oldValue, newValue]) => {
                        console.log(row, prop, oldValue, newValue);
                    });
            },
            afterSelection: afterSelection,
            outsideClickDeselects: outsideClickDeselects,
            afterDeselect: afterDeselect,
            licenseKey: 'non-commercial-and-evaluation' // for non-commercial use only
        });

        function afterSelection() {
            let selected = hot.getSelected() || [];
            let data = [];
            for (let i = 0; i < selected.length; i += 1) {
                data.push(hot.getData(...selected[i]));
            }
            // top row can be -1, so make sure it is at least 0.
            let topRow = Math.max(0, Math.min(...selected.map(s => Math.min(s[0], s[2]))))
            let bottomRow = Math.max(...selected.map(s => Math.max(s[0], s[2])))

            let selectionTop = hot.getCell(topRow, 0).getBoundingClientRect().top;
            let selectionBottom = hot.getCell(bottomRow, 0).getBoundingClientRect().bottom;

            mSelectionCallback(data, selectionTop, selectionBottom)
        }

        function outsideClickDeselects(target) {
            let inDrawerContent = $(target).closest("#table-list");
            if (inDrawerContent.length > 0 && $(target).attr("id") != "link-button") {
                return true;
            }

            return false;
        }

        function afterDeselect(e) {
            mSelectionCallback(null, 0, 0)
        }
    }

    function clearTables() {
        $("table-list").empty();
    }

    this.addTable = addTable;
    this.setTables = setTables;
    this.setCellUpdatedCallback = (callback) => mCellUpdatedCallback = callback;
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
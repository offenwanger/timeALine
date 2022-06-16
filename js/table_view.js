function DataTableController() {
    let mDrawerController = new DrawerController("#data-drawer");
    let mCellUpdatedCallback;

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

        new Handsontable(newDiv.get(0), {
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
            licenseKey: 'non-commercial-and-evaluation' // for non-commercial use only
        });
    }

    function clearTables() {
        $("table-list").empty();
    }

    this.addTable = addTable;
    this.setTables = setTables;
    this.setCellUpdatedCallback = (callback) => mCellUpdatedCallback = callback;
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
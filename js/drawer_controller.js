
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
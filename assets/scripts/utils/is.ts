/**
 * Determines if the argument is object-like.
 *
 * A value is object-like if it's not `null` and has a `typeof` result of "object".
 *
 * @param  {*} x - The value to be checked.
 * @return {boolean}
 */

const isObject = (x) => x && typeof x === 'object';

/**
 * Determines if the argument is a function.
 *
 * @param  {*} x - The value to be checked.
 * @return {boolean}
 */

const isFunction = (x) => typeof x === 'function';

function isSafari() {
    // Check if the userAgent contains "Safari" and "Version"
    if (
        navigator.userAgent.indexOf('Safari') != -1 &&
        navigator.userAgent.indexOf('Version') != -1
    ) {
        return true;
    }
    return false;
}

/**
 * Determines if the device is a touch device.
 * @return {boolean}
 */
const isTouchDevice = () => {
    return (
        'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    );
};

let localStorageAvailable = null;
let sessionStorageAvailable = null;

const isLocalStorageAvailable = () => {
    return (localStorageAvailable ??= isStorageAvailable(window.localStorage));
};

const isSessionStorageAvailable = () => {
    return (sessionStorageAvailable ??= isStorageAvailable(window.sessionStorage));
};

function isStorageAvailable(storage) {
    try {
        const x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (error) {
        return (
            error instanceof DOMException &&
            // everything except Firefox
            (error.code === 22 ||
                // Firefox
                error.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                error.name === 'QuotaExceededError' ||
                // Firefox
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage &&
            storage.length !== 0
        );
    }
}

const isWebKit = () => {
    const ua = navigator.userAgent || '';
    const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
    const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (ua.includes('Macintosh') && navigator.maxTouchPoints > 1) ||
        navigator.userAgentData?.platform === 'iOS';

    return isSafari || isIOS;
};

export {
    isObject,
    isFunction,
    isSafari,
    isWebKit,
    isTouchDevice,
    isLocalStorageAvailable,
    isSessionStorageAvailable
};

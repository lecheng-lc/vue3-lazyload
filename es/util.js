import assign from 'assign-deep';
var inBrowser = typeof window !== 'undefined';
export var hasIntersectionObserver = checkIntersectionObserver();
function checkIntersectionObserver() {
    if (inBrowser &&
        'IntersectionObserver' in window &&
        'IntersectionObserverEntry' in window &&
        'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
        // Minimal polyfill for Edge 15's lack of `isIntersecting`
        // See: https://github.com/w3c/IntersectionObserver/issues/211
        if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
            Object.defineProperty(window.IntersectionObserverEntry.prototype, 'isIntersecting', {
                get: function () {
                    return this.intersectionRatio > 0;
                }
            });
        }
        return true;
    }
    return false;
}
export var modeType;
(function (modeType) {
    modeType["event"] = "event";
    modeType["observer"] = "observer";
})(modeType || (modeType = {}));
function remove(arr, item) {
    if (!arr.length)
        return;
    var index = arr.indexOf(item);
    if (index > -1)
        return arr.splice(index, 1);
}
function getBestSelectionFromSrcset(el, scale) {
    var _a;
    if (el.tagName !== 'IMG' || !el.getAttribute('data-srcset'))
        return;
    var options = (_a = el.getAttribute('data-srcset')) !== null && _a !== void 0 ? _a : '';
    var result = [];
    var container = el.parentNode;
    var containerWidth = container.offsetWidth * scale;
    console.log(container, containerWidth);
    var spaceIndex;
    var tmpSrc;
    var tmpWidth;
    options = options.trim().split(',');
    if (Array.isArray(options))
        options.map(function (item) {
            item = item.trim();
            spaceIndex = item.lastIndexOf(' ');
            if (spaceIndex === -1) {
                tmpSrc = item;
                tmpWidth = 999998;
            }
            else {
                tmpSrc = item.slice(0, spaceIndex);
                tmpWidth = parseInt(item.slice(spaceIndex + 1, item.length - spaceIndex - 2), 10);
            }
            result.push([tmpWidth, tmpSrc]);
        });
    result.sort(function (a, b) {
        if (a[0] < b[0]) {
            return 1;
        }
        if (a[0] > b[0]) {
            return -1;
        }
        if (a[0] === b[0]) {
            if (b[1].indexOf('.webp', b[1].length - 5) !== -1) {
                return 1;
            }
            if (a[1].indexOf('.webp', a[1].length - 5) !== -1) {
                return -1;
            }
        }
        return 0;
    });
    var bestSelectedSrc = '';
    var tmpOption;
    for (var i = 0; i < result.length; i++) {
        tmpOption = result[i];
        bestSelectedSrc = tmpOption[1];
        var next = result[i + 1];
        if (next && next[0] < containerWidth) {
            bestSelectedSrc = tmpOption[1];
            break;
        }
        else if (!next) {
            bestSelectedSrc = tmpOption[1];
            break;
        }
    }
    return bestSelectedSrc;
}
var getDPR = function (scale) {
    if (scale === void 0) { scale = 1; }
    return inBrowser ? (window.devicePixelRatio || scale) : scale;
};
function supportWebp() {
    if (!inBrowser)
        return false;
    var support = true;
    var d = document;
    try {
        var el = d.createElement('object');
        el.type = 'image/webp';
        el.style.visibility = 'hidden';
        el.innerHTML = '!';
        d.body.appendChild(el);
        support = !el.offsetWidth;
        d.body.removeChild(el);
    }
    catch (err) {
        support = false;
    }
    return support;
}
function throttle(action, delay) {
    var timeout = 0;
    var lastRun = 0;
    return function () {
        if (timeout) {
            return;
        }
        var elapsed = Date.now() - lastRun;
        // @ts-ignore
        var context = this;
        var args = arguments;
        var runCallback = function () {
            lastRun = Date.now();
            timeout = 0;
            action.apply(context, args);
        };
        if (elapsed >= delay) {
            runCallback();
        }
        else {
            timeout = setTimeout(runCallback, delay);
        }
    };
}
function testSupportsPassive() {
    if (!inBrowser)
        return false;
    var support = false;
    try {
        var opts = Object.defineProperty({}, 'passive', {
            get: function () {
                support = true;
            }
        });
        window.addEventListener('test', function () { }, opts);
    }
    catch (e) { }
    return support;
}
var supportsPassive = testSupportsPassive();
var _ = {
    on: function (el, type, func, capture) {
        if (capture === void 0) { capture = false; }
        if (supportsPassive) {
            el.addEventListener(type, func, {
                capture: capture,
                passive: true
            });
        }
        else {
            el.addEventListener(type, func, capture);
        }
    },
    off: function (el, type, func, capture) {
        if (capture === void 0) { capture = false; }
        el.removeEventListener(type, func, capture);
    }
};
var loadImageAsync = function (item, resolve, reject) {
    var image = new Image();
    if (!item || !item.src) {
        var err = new Error('image src is required');
        return reject(err);
    }
    image.src = item.src;
    image.onload = function () {
        resolve({
            naturalHeight: image.naturalHeight,
            naturalWidth: image.naturalWidth,
            src: image.src
        });
    };
    image.onerror = function (e) {
        reject(e);
    };
};
var style = function (el, prop) {
    return typeof getComputedStyle !== 'undefined'
        ? getComputedStyle(el, null).getPropertyValue(prop)
        : el.style[prop];
};
var overflow = function (el) {
    return "".concat(style(el, 'overflow')).concat(style(el, 'overflowY')).concat(style(el, 'overflowX'));
};
var scrollParent = function (el) {
    if (!inBrowser)
        return;
    if (!(el instanceof Element)) {
        return window;
    }
    var parent = el;
    while (parent) {
        if (parent === document.body || parent === document.documentElement) {
            break;
        }
        if (!parent.parentNode) {
            break;
        }
        if (/(scroll|auto)/.test(overflow(parent))) {
            return parent;
        }
        parent = parent.parentNode;
    }
    return window;
};
function isObject(obj) {
    return obj !== null && typeof obj === 'object';
}
function noop() { }
var ImageCache = /** @class */ (function () {
    function ImageCache(_a) {
        var max = _a.max;
        this.options = {
            max: max || 100
        };
        this._caches = [];
    }
    ImageCache.prototype.has = function (key) {
        return this._caches.includes(key);
    };
    ImageCache.prototype.add = function (key) {
        if (this.has(key))
            return;
        this._caches.push(key);
        if (this._caches.length > this.options.max) {
            this.free();
        }
    };
    ImageCache.prototype.free = function () {
        this._caches.shift();
    };
    return ImageCache;
}());
export { ImageCache, inBrowser, remove, assign, noop, _, isObject, throttle, supportWebp, getDPR, scrollParent, loadImageAsync, getBestSelectionFromSrcset };

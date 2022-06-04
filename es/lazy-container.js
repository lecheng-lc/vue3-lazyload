import { remove, assign, } from './util';
var LazyContainerMananger = /** @class */ (function () {
    function LazyContainerMananger(lazy) {
        this.lazy = lazy;
        lazy.lazyContainerMananger = this;
        this._queue = [];
    }
    LazyContainerMananger.prototype.bind = function (el, binding, vnode) {
        var container = new LazyContainer(el, binding, vnode, this.lazy);
        this._queue.push(container);
    };
    LazyContainerMananger.prototype.update = function (el, binding) {
        var container = this._queue.find(function (item) { return item.el === el; });
        if (!container)
            return;
        container.update(el, binding);
    };
    LazyContainerMananger.prototype.unbind = function (el) {
        var container = this._queue.find(function (item) { return item.el === el; });
        if (!container)
            return;
        container.clear();
        remove(this._queue, container);
    };
    return LazyContainerMananger;
}());
export default LazyContainerMananger;
var defaultOptions = {
    selector: 'img'
};
var LazyContainer = /** @class */ (function () {
    function LazyContainer(el, binding, vnode, lazy) {
        this.el = null;
        this.vnode = vnode;
        this.binding = binding;
        this.options = {};
        this.lazy = lazy;
        this._queue = [];
        this.update(el, binding);
    }
    LazyContainer.prototype.update = function (el, binding) {
        var _this = this;
        this.el = el;
        this.options = assign({}, defaultOptions, binding.value);
        var imgs = this.getImgs();
        imgs.forEach(function (el) {
            _this.lazy.add(el, assign({}, _this.binding, {
                value: {
                    src: 'dataset' in el ? el.dataset.src : el.getAttribute('data-src'),
                    error: ('dataset' in el ? el.dataset.error : el.getAttribute('data-error')) || _this.options.error,
                    loading: ('dataset' in el ? el.dataset.loading : el.getAttribute('data-loading')) || _this.options.loading
                }
            }));
        });
    };
    LazyContainer.prototype.getImgs = function () {
        return Array.from(this.el.querySelectorAll(this.options.selector));
    };
    LazyContainer.prototype.clear = function () {
        var _this = this;
        var imgs = this.getImgs();
        imgs.forEach(function (el) { return _this.lazy.remove(el); });
        this.vnode = null;
        this.binding = null;
        this.lazy = null;
    };
    return LazyContainer;
}());

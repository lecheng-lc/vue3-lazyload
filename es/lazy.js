import { inBrowser, remove, _, throttle, supportWebp, getDPR, scrollParent, getBestSelectionFromSrcset, assign, isObject, hasIntersectionObserver, modeType, ImageCache } from './util';
import { nextTick } from 'vue';
import ReactiveListener from './listener';
var DEFAULT_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var DEFAULT_EVENTS = ['scroll', 'wheel', 'mousewheel', 'resize', 'animationend', 'transitionend', 'touchmove'];
var DEFAULT_OBSERVER_OPTIONS = {
    rootMargin: '0px',
    threshold: 0
};
var Lazy = /** @class */ (function () {
    function Lazy(_a) {
        var _b = _a.preLoad, preLoad = _b === void 0 ? 1.3 : _b, _c = _a.error, error = _c === void 0 ? DEFAULT_URL : _c, _d = _a.throttleWait, throttleWait = _d === void 0 ? 200 : _d, _e = _a.preLoadTop, preLoadTop = _e === void 0 ? 0 : _e, _f = _a.dispatchEvent, dispatchEvent = _f === void 0 ? false : _f, _g = _a.loading, loading = _g === void 0 ? DEFAULT_URL : _g, _h = _a.attempt, attempt = _h === void 0 ? 3 : _h, _j = _a.silent, silent = _j === void 0 ? true : _j, scale = _a.scale, listenEvents = _a.listenEvents, _k = _a.filter, filter = _k === void 0 ? {} : _k, _l = _a.adapter, adapter = _l === void 0 ? {} : _l, _m = _a.observer, observer = _m === void 0 ? true : _m, _o = _a.observerOptions, observerOptions = _o === void 0 ? {} : _o;
        this.version = '__VUE_LAZYLOAD_VERSION__';
        this.mode = modeType.event;
        this.ListenerQueue = [];
        this.TargetIndex = 0;
        this.TargetQueue = [];
        this.Event = {
            listeners: {
                loading: [],
                loaded: [],
                error: []
            }
        };
        this.options = {
            silent: silent,
            dispatchEvent: !!dispatchEvent,
            throttleWait: throttleWait,
            preLoad: preLoad,
            preLoadTop: preLoadTop,
            error: error,
            loading: loading,
            attempt: attempt,
            scale: scale || getDPR(scale),
            listenEvents: listenEvents || DEFAULT_EVENTS,
            hasbind: false,
            supportWebp: supportWebp(),
            filter: filter,
            adapter: adapter,
            observer: !!observer,
            observerOptions: observerOptions || DEFAULT_OBSERVER_OPTIONS
        };
        this._initEvent(); // 初始化事件事件队列
        this._imageCache = new ImageCache({ max: 200 }); // 缓存图片的数量
        this.lazyLoadHandler = throttle(this._lazyLoadHandler.bind(this), this.options.throttleWait); //
        this.setMode(this.options.observer ? modeType.observer : modeType.event); // 初始化队列中reactiveListener实例中的监听事件
    }
    /**
     * update config
     * @param  {Object} config params
     * @return
     */
    Lazy.prototype.config = function (options) {
        if (options === void 0) { options = {}; }
        assign(this.options, options);
    };
    /**
     * output listener's load performance
     * @return {Array}
     */
    Lazy.prototype.performance = function () {
        var list = [];
        this.ListenerQueue.map(function (item) {
            list.push(item.performance());
        });
        return list;
    };
    /*
     * add lazy component to queue
     * @param  {Vue} vm lazy component instance
     * @return
     */
    Lazy.prototype.addLazyBox = function (vm) {
        this.ListenerQueue.push(vm);
        console.log(vm);
        if (inBrowser) {
            this._addListenerTarget(window);
            this._observer && this._observer.observe(vm.el);
            if (vm.$el && vm.$el.parentNode) {
                this._addListenerTarget(vm.$el.parentNode);
            }
        }
    };
    /*
     * add image listener to queue
     * @param  {DOM} el
     * @param  {object} binding vue directive binding
     * @param  {vnode} vnode vue directive vnode
     * @return
     */
    Lazy.prototype.add = function (el, binding) {
        var _this = this;
        if (this.ListenerQueue.some(function (item) { return item.el === el; })) {
            this.update(el, binding);
            return nextTick(this.lazyLoadHandler);
        }
        var _a = this._valueFormatter(binding.value), src = _a.src, loading = _a.loading, error = _a.error; // 获取元素loadedSrc loadingSrc errorSrc的值
        nextTick(function () {
            src = getBestSelectionFromSrcset(el, _this.options.scale) || src; // 设置获取最好的图片尺寸
            _this._observer && _this._observer.observe(el);
            var container = Object.keys(binding.modifiers)[0]; // 捕获是v-lazy.image   还是v-lazy.container
            var $parent;
            if (container) { // 自定义可滚动的父元素容器
                $parent = binding.instance.$refs[container];
                // if there is container passed in, try ref first, then fallback to getElementById to support the original usage
                $parent = $parent ? $parent.$el || $parent : document.getElementById(container);
            }
            if (!$parent) {
                $parent = scrollParent(el); // 如果父元素存在，获取滚动的父元素,如果父级元素不存在，那么默认滚动元素为window
            }
            var newListener = new ReactiveListener(el, src, error, loading, binding.arg, $parent, _this.options, 
            //@ts-ignore
            _this._elRenderer.bind(_this), _this._imageCache);
            _this.ListenerQueue.push(newListener);
            if (inBrowser) {
                _this._addListenerTarget(window);
                _this._addListenerTarget($parent);
            }
            nextTick(function () { return _this.lazyLoadHandler(); });
        });
    };
    /**
    * update image src
    * @param  {DOM} el
    * @param  {object} vue directive binding
    * @return
    */
    Lazy.prototype.update = function (el, binding) {
        var _this = this;
        var _a = this._valueFormatter(binding.value), src = _a.src, loading = _a.loading, error = _a.error;
        src = getBestSelectionFromSrcset(el, this.options.scale) || src;
        var exist = this.ListenerQueue.find(function (item) { return item.el === el; });
        if (!exist) {
            this.add(el, binding);
        }
        else {
            exist.update({
                src: src,
                loading: loading,
                error: error
            });
        }
        if (this._observer) {
            this._observer.unobserve(el);
            this._observer.observe(el);
        }
        nextTick(function () { return _this.lazyLoadHandler(); });
    };
    /**
    * remove listener form list
    * @param  {DOM} el
    * @return
    */
    Lazy.prototype.remove = function (el) {
        if (!el)
            return;
        this._observer && this._observer.unobserve(el);
        var existItem = this.ListenerQueue.find(function (item) { return item.el === el; });
        if (existItem) {
            this._removeListenerTarget(existItem.$parent);
            this._removeListenerTarget(window);
            remove(this.ListenerQueue, existItem);
            existItem.$destroy();
        }
    };
    /*
     * remove lazy components form list
     * @param  {Vue} vm Vue instance
     * @return
     */
    Lazy.prototype.removeComponent = function (vm) {
        if (!vm)
            return;
        remove(this.ListenerQueue, vm);
        this._observer && this._observer.unobserve(vm.el);
        if (vm.$parent && vm.$el.parentNode) {
            this._removeListenerTarget(vm.$el.parentNode);
        }
        this._removeListenerTarget(window);
    };
    /**
     *
     * @param {*} mode 设置监听模式。我们通常使用事件模式或者IntersectionObserver来判断元素是否进入视图，若进入视图则需为图片加载真实路径。如果使用监听事件模式，mode为event，如果使用IntersectionObserver，mode为observer
     */
    Lazy.prototype.setMode = function (mode) {
        var _this = this;
        if (!hasIntersectionObserver && mode === modeType.observer) {
            mode = modeType.event;
        }
        this.mode = mode; // event or observer
        if (mode === modeType.event) {
            if (this._observer) {
                this.ListenerQueue.forEach(function (listener) {
                    _this._observer.unobserve(listener.el);
                });
                this._observer = null;
            }
            this.TargetQueue.forEach(function (target) {
                _this._initListen(target.el, true);
            });
        }
        else {
            this.TargetQueue.forEach(function (target) {
                _this._initListen(target.el, false);
            });
            this._initIntersectionObserver();
        }
    };
    /*
    *** Private functions ***
    */
    /*
     * 加载监听者目标
     * @param  {DOM} el listener target
     * @return
     */
    Lazy.prototype._addListenerTarget = function (el) {
        if (!el)
            return;
        var target = this.TargetQueue.find(function (target) { return target.el === el; });
        if (!target) {
            target = {
                el: el,
                id: ++this.TargetIndex,
                childrenCount: 1,
                listened: true
            };
            this.mode === modeType.event && this._initListen(target.el, true);
            this.TargetQueue.push(target);
        }
        else {
            target.childrenCount++;
        }
        return this.TargetIndex;
    };
    /*
     * remove listener target or reduce target childrenCount
     * @param  {DOM} el or window
     * @return
     */
    Lazy.prototype._removeListenerTarget = function (el) {
        var _this = this;
        this.TargetQueue.forEach(function (target, index) {
            if (target.el === el) {
                target.childrenCount--;
                if (!target.childrenCount) {
                    _this._initListen(target.el, false);
                    _this.TargetQueue.splice(index, 1);
                    target = null;
                }
            }
        });
    };
    /*
     * add or remove eventlistener
     * @param  {DOM} el DOM or Window
     * @param  {boolean} start flag
     * @return
     */
    Lazy.prototype._initListen = function (el, start) {
        var _this = this;
        this.options.listenEvents.forEach(function (evt) { return _[start ? 'on' : 'off'](el, evt, _this.lazyLoadHandler); });
    };
    Lazy.prototype._initEvent = function () {
        var _this = this;
        this.$on = function (event, func) {
            if (!_this.Event.listeners[event])
                _this.Event.listeners[event] = [];
            _this.Event.listeners[event].push(func);
        };
        this.$once = function (event, func) {
            var vm = _this;
            function on(arg) {
                vm.$off(event, on);
                func.apply(vm, arg);
            }
            _this.$on(event, on);
        };
        this.$off = function (event, func) {
            if (!func) {
                if (!_this.Event.listeners[event])
                    return;
                _this.Event.listeners[event].length = 0;
                return;
            }
            remove(_this.Event.listeners[event], func);
        };
        this.$emit = function (event, context, inCache) {
            if (!_this.Event.listeners[event])
                return;
            _this.Event.listeners[event].forEach(function (func) { return func(context, inCache); });
        };
    };
    /**
     * 监听队列中loaded状态的监听对象取出存放在freeList中并删掉，判断未加载的监听对象是否处在预加载位置，如果是则执行load方法。
     * @return
     */
    Lazy.prototype._lazyLoadHandler = function () {
        var _this = this;
        var freeList = [];
        console.log(this.ListenerQueue);
        this.ListenerQueue.forEach(function (listener) {
            if (!listener.el || !listener.el.parentNode) {
                freeList.push(listener);
            }
            console.log('检查了么');
            var catIn = listener.checkInView(); // 判断是否在视图内
            if (!catIn)
                return; // 如果在视图内，那么就执行下一步
            listener.load();
        });
        freeList.forEach(function (item) {
            console.log(222);
            remove(_this.ListenerQueue, item);
            item.$destroy();
        });
    };
    /**
    * init IntersectionObserver
    * set mode to observer
    * @return
    */
    Lazy.prototype._initIntersectionObserver = function () {
        var _this = this;
        if (!hasIntersectionObserver)
            return;
        this._observer = new IntersectionObserver(this._observerHandler.bind(this), this.options.observerOptions);
        if (this.ListenerQueue.length) {
            this.ListenerQueue.forEach(function (listener) {
                _this._observer.observe(listener.el);
            });
        }
    };
    /**
    * init IntersectionObserver
    * @return
    */
    Lazy.prototype._observerHandler = function (entries) {
        var _this = this;
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                _this.ListenerQueue.forEach(function (listener) {
                    if (listener.el === entry.target) {
                        if (listener.state.loaded)
                            return _this._observer.unobserve(listener.el);
                        listener.load();
                    }
                });
            }
        });
    };
    /**
    * set element attribute with image'url and state
    * @param  {object} lazyload listener 监听el的实例
    * @param  {string} state 将会被渲染
    * @param  {bool} inCache  是否从缓存中渲染
    * @return
    */
    Lazy.prototype._elRenderer = function (listener, state, cache) {
        if (!listener.el)
            return;
        var el = listener.el, bindType = listener.bindType;
        var src;
        switch (state) {
            case 'loading':
                src = listener.loading;
                break;
            case 'error':
                src = listener.error;
                break;
            default:
                src = listener.src;
                break;
        }
        if (bindType) {
            // @ts-ignore
            el.style[bindType] = 'url("' + src + '")';
        }
        else if (el.getAttribute('src') !== src) {
            el.setAttribute('src', src);
        }
        // console.log(state) // 会执行两次loading,
        el.setAttribute('lazy', state);
        this.$emit(state, listener, cache);
        this.options.adapter[state] && this.options.adapter[state](listener, this.options); // 监听图片各个元素的加载过程的回调方法
        if (this.options.dispatchEvent) { // 自定义方法,当方法开始执行去执行
            var event_1 = new CustomEvent(state, {
                detail: listener
            });
            el.dispatchEvent(event_1);
        }
    };
    /**
    * 返回图片的loadingSrc loadedSrc errorSrc
    * @param {string} image's src
    * @return {object} image's loading, loaded, error url
    */
    Lazy.prototype._valueFormatter = function (value) {
        var src = value;
        var loading = this.options.loading;
        var error = this.options.error;
        if (isObject(value)) {
            if (!value.src && !this.options.silent)
                console.error('Vue Lazyload warning: miss src with ' + value);
            src = value.src;
            loading = value.loading || this.options.loading;
            error = value.error || this.options.error;
        }
        return {
            src: src,
            loading: loading,
            error: error
        };
    };
    return Lazy;
}());
export { Lazy };
export default function () {
    return Lazy;
}

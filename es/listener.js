import { loadImageAsync, noop } from './util';
var ReactiveListener = /** @class */ (function () {
    function ReactiveListener(el, src, error, loading, bindType, $parent, options, elRenderer, imageCache) {
        this.el = el; // dom元素
        this.src = src; // dom元素src
        this.error = error; // dom元素错误的src
        this.loading = loading; // dom元素加载的src
        this.bindType = bindType; // 监测方式
        this.attempt = 0; // 重试次数
        this.naturalHeight = 0; // 图片原始高度
        this.naturalWidth = 0; // 图片原始宽度
        this.options = options; // lazyload的各种初始化选项
        this.rect = {}; // 当前元素距离屏幕顶部的上下左右距离
        this.$parent = $parent; // 当前元素父元素
        this.elRenderer = elRenderer; // 元素渲染的方式
        this._imageCache = imageCache; // 图像缓存数组
        this.performanceData = {
            init: Date.now(),
            loadStart: 0,
            loadEnd: 0
        };
        this.filter(); // 图片过滤函数执行
        this.initState(); // 初始化函数执行状态
        this.render('loading', false); // 开始执行渲染逻辑
    }
    /*
     * 将真实的图片路径绑定到元素的data-src属性上，并为监听对象添加error、loaded、rendered状态
     * @return
     */
    ReactiveListener.prototype.initState = function () {
        if (!this.el)
            return;
        if ('dataset' in this.el) {
            this.el.dataset.src = this.src;
        }
        else {
            this.el.setAttribute('data-src', this.src);
        }
        this.state = {
            loading: false,
            error: false,
            loaded: false,
            rendered: false
        };
    };
    /*
     * record performance
     * @return
     */
    ReactiveListener.prototype.record = function (event) {
        this.performanceData[event] = Date.now();
    };
    /*
     * 更新图片的数据
     * @param  {String} image uri
     * @param  {String} loading image uri
     * @param  {String} error image uri
     * @return
     */
    ReactiveListener.prototype.update = function (option) {
        var oldSrc = this.src;
        this.src = option.src;
        this.loading = option.loading;
        this.error = option.error;
        this.filter();
        if (oldSrc !== this.src) {
            this.attempt = 0;
            this.initState();
        }
    };
    /*
     * 获得元素距离屏幕的距离
     * @return
     */
    ReactiveListener.prototype.getRect = function () {
        this.rect = this.el.getBoundingClientRect();
    };
    /*
     *  检查元素是否在视图窗口中
     * @return {Boolean} el is in view
     */
    ReactiveListener.prototype.checkInView = function () {
        if (!this.rect)
            return false;
        this.getRect();
        return (this.rect.top < window.innerHeight * this.options.preLoad && this.rect.bottom > this.options.preLoadTop) &&
            (this.rect.left < window.innerWidth * this.options.preLoad && this.rect.right > 0);
    };
    /*
     * 执行过滤的函数
     */
    ReactiveListener.prototype.filter = function () {
        var _this = this;
        Object.keys(this.options.filter).map(function (key) {
            _this.options.filter[key](_this, _this.options);
        });
    };
    /*
     * render loading first
     * @params cb:Function
     * @return
     */
    ReactiveListener.prototype.renderLoading = function (cb) {
        var _this = this;
        this.state.loading = true;
        loadImageAsync({
            src: this.loading
        }, function () {
            _this.render('loading', false); // 加载图像
            _this.state.loading = false;
            cb();
        }, function () {
            // 图像加载失败
            cb();
            _this.state.loading = false;
            if (!_this.options.silent)
                console.warn("VueLazyload log: load failed with loading image(".concat(_this.loading, ")"));
        });
    };
    /*
     * try load image and  render it
     * @return
     */
    ReactiveListener.prototype.load = function (onFinish) {
        var _this = this;
        if (onFinish === void 0) { onFinish = noop; }
        // 如果尝试加载图片的次数大于设置的次数，那么抛出错误，图片不再加载,并执行回调
        if ((this.attempt > this.options.attempt - 1) && this.state.error) {
            if (!this.options.silent)
                console.log("VueLazyload log: ".concat(this.src, " tried too more than ").concat(this.options.attempt, " times"));
            onFinish();
            return;
        }
        if (this.state.rendered && this.state.loaded)
            return; // 如果图片已经渲染或者已经加载完毕那么不再往下执行
        if (this._imageCache.has(this.src)) { // 如果图片已经加载过，且缓存起来了，那么不再加载
            console.log('jinbuqude');
            this.state.loaded = true;
            this.render('loaded', true);
            this.state.rendered = true;
            return onFinish();
        }
        this.renderLoading(function () {
            _this.attempt++;
            _this.options.adapter['beforeLoad'] && _this.options.adapter['beforeLoad'](_this, _this.options);
            _this.record('loadStart');
            loadImageAsync({
                src: _this.src
            }, function (data) {
                _this.naturalHeight = data.naturalHeight;
                _this.naturalWidth = data.naturalWidth;
                _this.state.loaded = true;
                _this.state.error = false;
                _this.record('loadEnd');
                _this.render('loaded', false);
                _this.state.rendered = true;
                _this._imageCache.add(_this.src);
                onFinish();
            }, function (err) {
                !_this.options.silent && console.error(err);
                _this.state.error = true;
                _this.state.loaded = false;
                _this.render('error', false);
            });
        });
    };
    /*
     * render image
     * @param  {String} state to render // ['loading', 'src', 'error']
     * @param  {String} is form cache
     * @return
     */
    ReactiveListener.prototype.render = function (state, cache) {
        this.elRenderer(this, state, cache);
    };
    /*
     * output performance data
     * @return {Object} performance data
     */
    ReactiveListener.prototype.performance = function () {
        var state = 'loading';
        var time = 0;
        if (this.state.loaded) {
            state = 'loaded';
            time = (this.performanceData.loadEnd - this.performanceData.loadStart) / 1000;
        }
        if (this.state.error)
            state = 'error';
        return {
            src: this.src,
            state: state,
            time: time
        };
    };
    /*
     * $destroy
     * @return
     */
    ReactiveListener.prototype.$destroy = function () {
        this.el = null;
        this.src = '';
        this.error = '';
        this.loading = '';
        this.bindType = '';
        this.attempt = 0;
    };
    return ReactiveListener;
}());
export default ReactiveListener;

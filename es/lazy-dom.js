export default function (lazy, options) {
    return /** @class */ (function () {
        function LazyDom(el, viewParams) {
            this.eleLoaded = false;
            this.state = {
                inited: false,
                loaded: false
            };
            this.$el = el;
            this.el = el;
            this.viewParams = viewParams;
            this.viewed = false;
            this.options = {
                preLoad: options.preLoad,
                preLoadTop: options.preLoadTop,
                domTypes: []
            };
            this.destroy = false;
        }
        LazyDom.prototype.addLazyDom = function () {
            if (!this.state.inited) {
                this.state.inited = true;
                lazy.addLazyBox(this);
                lazy.lazyLoadHandler();
            }
        };
        LazyDom.prototype.getRect = function () {
            this.rect = this.$el.getBoundingClientRect();
        };
        LazyDom.prototype.update = function () { };
        LazyDom.prototype.checkInView = function () {
            this.getRect();
            return (this.rect.top < window.innerHeight * this.options.preLoad && this.rect.bottom > this.options.preLoadTop) &&
                (this.rect.left < window.innerWidth * this.options.preLoad && this.rect.right > 0);
        };
        LazyDom.prototype.load = function () {
            if (!this.state.loaded) {
                this.state.loaded = true;
                this.triggerEleView();
            }
        };
        LazyDom.prototype.$destroy = function () {
            this.$el = null;
        };
        LazyDom.prototype.triggerEleView = function () {
            if (!this.viewed && this.state.loaded) {
                var event_1 = new CustomEvent('view', {
                    detail: {}
                });
                this.$el.dispatchEvent(event_1);
                this.viewed = true;
            }
        };
        return LazyDom;
    }());
}

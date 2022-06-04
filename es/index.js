import Lazy from './lazy';
import LazyComponent from './lazy-component';
import LazyContainer from './lazy-container';
import LazyImage from './lazy-image';
import LazyDom from './lazy-dom';
export default {
    /*
    * install function
    * @param  {app} Vue 实例
    * @param  {object} options  lazyload options
    */
    install: function (app, options) {
        var LazyClass = Lazy();
        var lazy = new LazyClass(options);
        var lazyContainer = new LazyContainer(lazy);
        var lazyDom = LazyDom(lazy, options);
        var isVue3 = app.version.split('.')[0] === '3';
        app.config.globalProperties.$Lazyload = lazy;
        if (options.lazyComponent) {
            app.component('lazy-component', LazyComponent(lazy));
        }
        if (options.lazyImage) {
            app.component('lazy-image', LazyImage(lazy));
        }
        if (isVue3) {
            app.directive('lazy', {
                beforeMount: lazy.add.bind(lazy),
                beforeUpdate: lazy.update.bind(lazy),
                updated: lazy.lazyLoadHandler.bind(lazy),
                unmounted: lazy.remove.bind(lazy)
            });
            app.directive('lazy-container', {
                beforeMount: lazyContainer.bind.bind(lazyContainer),
                updated: lazyContainer.update.bind(lazyContainer),
                unmounted: lazyContainer.unbind.bind(lazyContainer)
            });
            app.directive('view', {
                mounted: function (el, binding) {
                    var haveFilterType = options.viewNodeNames && options.viewNodeNames.length;
                    var nodeName = el.nodeName;
                    var viewParams = binding.value;
                    if (haveFilterType && options.viewNodeNames.includes(nodeName)) {
                        var lazyBox = el.domLazyBox = new lazyDom(el, viewParams);
                        lazyBox.addLazyDom();
                    }
                    else if (!haveFilterType) {
                        var lazyBox = el.domLazyBox = new lazyDom(el, viewParams);
                        lazyBox.addLazyDom();
                    }
                },
                // beforeUpdate: lazy.update.bind(lazy),
                // updated: lazy.lazyLoadHandler.bind(lazy),
                unmounted: function (el) {
                    var lazyBox = el.domLazyBox || null;
                    if (lazyBox) {
                        !lazyBox.destroyed && lazy.removeComponent(lazyBox);
                        delete el.domLazyBox;
                    }
                }
            });
        }
        else {
            console.warn('只针对vue3版本');
        }
    }
};

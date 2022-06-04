import { inBrowser, loadImageAsync, noop } from './util';
import { h, defineComponent, onMounted, getCurrentInstance, onBeforeMount, ref, watch, computed, reactive } from 'vue';
export default (function (lazyManager) {
    return defineComponent({
        props: {
            src: [String, Object],
            tag: {
                type: String,
                default: 'img'
            }
        },
        setup: function (props) {
            var el = ref();
            var renderSrc = ref('');
            var options = reactive({
                src: '',
                error: '',
                loading: '',
                attempt: lazyManager.options.attempt
            });
            var rect = reactive({});
            var state = reactive({
                loaded: false,
                error: false,
                attempt: 0
            });
            var instance = getCurrentInstance();
            var init = function () {
                var _a = lazyManager._valueFormatter(props.src), src = _a.src, loading = _a.loading, error = _a.error;
                options.src = src;
                options.error = error || '';
                options.loading = loading || '';
                renderSrc.value = options.loading;
            };
            onBeforeMount(function () {
                init();
            });
            onMounted(function () {
                var _a;
                el.value = (_a = instance === null || instance === void 0 ? void 0 : instance.proxy) === null || _a === void 0 ? void 0 : _a.$el;
            });
            var getRect = function () {
                rect = el.value.getBoundingClientRect();
            };
            var checkInView = function () {
                getRect();
                return inBrowser && (rect.top < window.innerHeight * lazyManager.options.preLoad && rect.bottom > 0) && (rect.left < window.innerWidth * lazyManager.options.preLoad && rect.right > 0);
            };
            var vm = computed(function () {
                return {
                    el: el.value,
                    rect: rect,
                    checkInView: checkInView,
                    load: load,
                    state: state,
                };
            });
            watch(function () { return props.src; }, function () {
                init();
                lazyManager.addLazyBox(vm.value);
                lazyManager.lazyLoadHandler();
            });
            var load = function (onFinish) {
                if (onFinish === void 0) { onFinish = noop; }
                if ((state.attempt > options.attempt - 1) && state.error) {
                    if (!lazyManager.options.silent)
                        console.log("VueLazyload log: ".concat(options.src, " tried too more than ").concat(options.attempt, " times"));
                    onFinish();
                    return;
                }
                var src = options.src;
                loadImageAsync({ src: src }, function (_a) {
                    var src = _a.src;
                    renderSrc.value = src;
                    state.loaded = true;
                }, function () {
                    state.attempt++;
                    renderSrc.value = options.error;
                    state.error = true;
                });
            };
            return {
                renderSrc: ''
            };
        },
        render: function () {
            return h(this.tag, {
                attrs: {
                    src: this.renderSrc
                }
            }, this.$slots.default);
        },
    });
});

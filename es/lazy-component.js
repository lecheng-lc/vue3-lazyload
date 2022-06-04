import { inBrowser } from './util';
import { defineComponent, onMounted, onBeforeUnmount, getCurrentInstance, ref, createVNode, computed, reactive } from 'vue';
export default (function (lazy) {
    return defineComponent({
        props: {
            src: [String, Object],
            tag: {
                type: String,
                default: 'div'
            }
        },
        // @ts-ignore
        setup: function (props, ctx) {
            var instance = getCurrentInstance();
            var el = ref();
            var rect = reactive({
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
            });
            var show = ref(false);
            var state = reactive({
                loaded: false,
                error: false,
                attempt: 0
            });
            var vm = computed(function () {
                var _a;
                return {
                    el: (_a = instance === null || instance === void 0 ? void 0 : instance.proxy) === null || _a === void 0 ? void 0 : _a.$el,
                    rect: rect,
                    checkInView: checkInView,
                    load: load,
                    state: state,
                };
            });
            onMounted(function () {
                var _a;
                console.log(223344);
                el.value = (_a = instance === null || instance === void 0 ? void 0 : instance.proxy) === null || _a === void 0 ? void 0 : _a.$el;
                lazy.addLazyBox(vm.value);
                lazy.lazyLoadHandler();
            });
            onBeforeUnmount(function () {
                lazy.removeComponent(vm.value);
            });
            var getRect = function () {
                rect = el.value.getBoundingClientRect();
            };
            var checkInView = function () {
                getRect();
                return inBrowser && (rect.top < window.innerHeight * lazy.options.preLoad && rect.bottom > 0) && (rect.left < window.innerWidth * lazy.options.preLoad && rect.right > 0);
            };
            var load = function () {
                show.value = true;
                state.loaded = true;
                ctx.emit('show', instance === null || instance === void 0 ? void 0 : instance.proxy);
            };
            // const destroy = () => {
            //   // @TODO
            //   return instance?.proxy
            // }
            return function () {
                var _a, _b;
                return createVNode(props.tag, {
                    ref: el
                }, [show.value && ((_b = (_a = ctx.slots).default) === null || _b === void 0 ? void 0 : _b.call(_a))]);
            };
        }
    });
});

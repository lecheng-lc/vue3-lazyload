import { inBrowser } from './util'
import { Lazy } from './lazy'
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance,
  ref,
  createVNode,
  computed,
  reactive
} from 'vue'
export default (lazy: Lazy) => {
  return defineComponent({
    props: {
      src: [String, Object],
      tag: {
        type: String,
        default: 'div'
      }
    },
    setup(props, ctx) {
      const instance = getCurrentInstance()
      const el = ref<HTMLElement>()
      let rect = reactive({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      })
      const show = ref<boolean>(false)
      const state = reactive({
        loaded: false,
        error: false,
        attempt: 0
      })
      const vm = computed(() => {
        return {
          el: instance?.proxy?.$el,
          $el: instance?.proxy?.$el,
          rect,
          checkInView,
          load,
          state,
        }
      })
      onMounted(() => {
        el.value = instance?.proxy?.$el
        lazy.addLazyBox(vm.value)
        lazy.lazyLoadHandler()
      })
      onBeforeUnmount(() => {
        lazy.removeComponent(vm.value)
      })
      const getRect = () => {
        rect = el.value!.getBoundingClientRect()
      }
      const checkInView = () => {
        getRect()
        return inBrowser && (rect.top < window.innerHeight * lazy.options.preLoad && rect.bottom > 0) && (rect.left < window.innerWidth * lazy.options.preLoad && rect.right > 0)
      }
      const load = () => {
        show.value = true
        state.loaded = true
        ctx.emit('show', show.value)
      }
      return () => createVNode(
        props.tag,
        null,
        [show.value && ctx.slots.default?.()]
      )
    }
  })
}

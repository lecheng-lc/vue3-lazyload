import {
  inBrowser,
  loadImageAsync,
  noop
} from './util'
import { Lazy } from './lazy'
import {
  defineComponent,
  onMounted,
  getCurrentInstance,
  createVNode,
  ref,
  watch,
  computed,
  reactive
} from 'vue'
export default (lazyManager:Lazy) => {
  return defineComponent({
    props: {
      src: [String, Object],
      tag: {
        type: String,
        default: 'img'
      }
    },
    setup(props,ctx) {
      const el = ref<HTMLElement>()
      const renderSrc = ref<string>('')
      const options = reactive({
        src: '',
        error: '',
        loading: '',
        attempt: lazyManager.options.attempt
      })
      let rect = reactive(<DOMRect>{})
      const state = reactive({
        loaded: false,
        error: false,
        attempt: 0
      })
      const instance = getCurrentInstance()
      const init = () => {
        const { src, loading, error } = lazyManager._valueFormatter(props.src)
        options.src = src
        options.error = error || ''
        options.loading = loading || ''
        renderSrc.value = options.loading
      }
      init()
      onMounted(() => {
        el.value = instance?.proxy?.$el
      })
      const getRect = () => {
        rect = el.value!.getBoundingClientRect()
      }
      const checkInView = () => {
        getRect()
        return inBrowser && (rect.top < window.innerHeight * lazyManager.options.preLoad && rect.bottom > 0) && (rect.left < window.innerWidth * lazyManager.options.preLoad && rect.right > 0)
      }
      const vm = computed(() => {
        return {
          el: el.value,
          rect,
          checkInView,
          load,
          state,
        }
      })
      watch(() => props.src, () => {
        init()
        lazyManager.addLazyBox(vm.value)
        lazyManager.lazyLoadHandler()
      })
      const load = (onFinish = noop) => {
        if ((state.attempt > options.attempt! - 1) && state.error) {
          if (!lazyManager.options.silent) console.log(`VueLazyload log: ${options.src} tried too more than ${options.attempt} times`)
          onFinish()
          return
        }
        const src = options.src
        loadImageAsync({ src }, ({ src = '' }) => {
          renderSrc.value = src
          state.loaded = true
        }, () => {
          state.attempt++
          renderSrc.value = options.error
          state.error = true
        })
      }
      return () => createVNode(
        props.tag,
        {
          src: renderSrc.value,
          ref: el
        },
        [ctx.slots.default?.()]
      )
    }
  })
}

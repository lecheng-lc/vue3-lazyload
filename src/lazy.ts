import {
  inBrowser,
  remove,
  _,
  throttle,
  supportWebp,
  getDPR,
  scrollParent,
  getBestSelectionFromSrcset,
  assign,
  isObject,
  hasIntersectionObserver,
  modeType,
  ImageCache
} from './util'
import LazyContainerMananger from './lazy-container'
import { nextTick ,DirectiveBinding} from 'vue'
import ReactiveListener from './listener'
import { Tlistener, VueLazyloadOptions, VueLazyloadListenEvent, VueReactiveListener } from '../types/index'
const DEFAULT_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const DEFAULT_EVENTS = ['scroll', 'wheel', 'mousewheel', 'resize', 'animationend', 'transitionend', 'touchmove']
const DEFAULT_OBSERVER_OPTIONS = {
  rootMargin: '0px',
  threshold: 0
}
type ListenersType = 'loading' | 'loaded' | 'error'
export class Lazy {
  version: string
  mode: string
  ListenerQueue: Array<Tlistener>
  TargetIndex: number
  TargetQueue: Array<any>
  options: VueLazyloadOptions
  _imageCache: ImageCache
  lazyLoadHandler: () => any
  _observer: IntersectionObserver | null
  lazyContainerMananger: LazyContainerMananger | null;
  Event!: {
    listeners: {
      loading: any[],
      loaded: any[],
      error: any[]
    }
  }
  $on: (event: string, callback: VueLazyloadListenEvent) => void
  $once: (event: string, callback: VueLazyloadListenEvent) => void
  $off: (event: string, callback: Tlistener) => void
  $emit: (event: string, context: any, inCache: boolean) => void
  constructor({
    preLoad = 1.3,
    error = DEFAULT_URL,
    throttleWait = 200,
    preLoadTop = 0,
    dispatchEvent = false,
    loading = DEFAULT_URL,
    attempt = 3,
    silent = true,
    scale,
    listenEvents,
    filter = {},
    adapter = {},
    observer = true,
    observerOptions = {}
  }: VueLazyloadOptions) {
    this.version = '__VUE_LAZYLOAD_VERSION__'
    this.mode = modeType.event
    this.ListenerQueue = []
    this.TargetIndex = 0
    this.TargetQueue = []
    this.Event! = {
      listeners :{
        loading: [],
        loaded: [],
        error: []
      }
    }
    this.options = {
      silent: silent, // 是否打印debug日志
      dispatchEvent: !!dispatchEvent, //  @TODO
      throttleWait: throttleWait, // 函数节流滚动监听频次
      preLoad: preLoad, //  预装高度，比如一屏，
      preLoadTop: preLoadTop,
      error: error, // 加载错误的图像
      loading: loading, // 正在加载的图像
      attempt: attempt, // 尝试的次数
      scale: scale || getDPR(scale), // 缩放倍数
      listenEvents: listenEvents ||  DEFAULT_EVENTS, // 监听的事件 列表
      hasbind: false,
      supportWebp: supportWebp(), // 是否支持webp
      filter: filter, // 通过过滤函数可以动态的修改src
      adapter: adapter, // 监听图片加载过程的毁掉方法，loaded,loding,error
      observer: !!observer, // 是否使用了IntersectionObserver,可以提升性能，但前提要引入IntersectionObserver的poly-fill
      observerOptions: observerOptions || DEFAULT_OBSERVER_OPTIONS
    }
    this._initEvent() // 初始化事件事件队列
    this._imageCache = new ImageCache({ max: 200 }) // 缓存图片的数量
    this.lazyLoadHandler = throttle(this._lazyLoadHandler.bind(this), this.options.throttleWait!) //
    this.setMode(this.options.observer ? modeType.observer : modeType.event) // 初始化队列中reactiveListener实例中的监听事件
  }

  /**
   * update config
   * @param  {Object} config params
   * @return
   */
  config(options = {}) {
    assign(this.options, options)
  }

  /**
   * output listener's load performance
   * @return {Array}
   */
  performance() {
    let list: VueReactiveListener[] = []
    this.ListenerQueue.map(item => {
      list.push(item.performance())
    })

    return list
  }

  /*
   * add lazy component to queue
   * @param  {Vue} vm lazy component instance
   * @return
   */
  addLazyBox(vm: Tlistener) {
    this.ListenerQueue.push(vm)
    if (inBrowser) {
      this._addListenerTarget(window)
      this._observer && this._observer.observe(vm.el)
      console.log(vm.$el,'jjjj')
      if (vm.$el && vm.$el.parentNode) {
        this._addListenerTarget(vm.$el.parentNode)
      }
    }
  }

  /*
   * add image listener to queue
   * @param  {DOM} el
   * @param  {object} binding vue directive binding
   * @param  {vnode} vnode vue directive vnode
   * @return
   */
  add(el: HTMLElement, binding: DirectiveBinding ):Promise<void> | void {
    if (this.ListenerQueue.some(item => item.el === el)) {
      this.update(el, binding)
      return nextTick(this.lazyLoadHandler)
    }

    let { src, loading, error } = this._valueFormatter(binding.value) // 获取元素loadedSrc loadingSrc errorSrc的值
    nextTick(() => {
      src = getBestSelectionFromSrcset(el, this.options.scale!) || src // 设置获取最好的图片尺寸
      this._observer && this._observer.observe(el)

      const container = Object.keys(binding.modifiers)[0] // 捕获是v-lazy.image   还是v-lazy.container
      let $parent:any
      if (container) {  // 自定义可滚动的父元素容器
        $parent = binding.instance!.$refs[container]
        // if there is container passed in, try ref first, then fallback to getElementById to support the original usage
        $parent = $parent ? $parent.$el || $parent : document.getElementById(container)
      }
      if (!$parent) {
        $parent = scrollParent(el) // 如果父元素存在，获取滚动的父元素,如果父级元素不存在，那么默认滚动元素为window
      }
      const newListener = new ReactiveListener(
        el,
        src,
        error!,
        loading!,
        binding.arg!,
        $parent,
        this.options,
        //@ts-ignore
        this._elRenderer.bind(this),
        this._imageCache
      )
      this.ListenerQueue.push(newListener)
      if (inBrowser) {
        this._addListenerTarget(window)
        this._addListenerTarget($parent)
      }
      nextTick(() => this.lazyLoadHandler())
    })
  }

  /**
  * update image src
  * @param  {DOM} el
  * @param  {object} vue directive binding
  * @return
  */
  update(el: HTMLElement, binding: DirectiveBinding) {
    let { src, loading, error } = this._valueFormatter(binding.value)
    src = getBestSelectionFromSrcset(el, this.options.scale!) || src

    const exist = this.ListenerQueue.find(item => item.el === el)
    if (!exist) {
      this.add(el, binding)
    } else {
      exist.update({
        src,
        loading,
        error
      })
    }
    if (this._observer) {
      this._observer.unobserve(el)
      this._observer.observe(el)
    }
    nextTick(() => this.lazyLoadHandler())
  }

  /**
  * remove listener form list
  * @param  {DOM} el
  * @return
  */
  remove(el: HTMLElement) {
    if (!el) return
    this._observer && this._observer.unobserve(el)
    const existItem = this.ListenerQueue.find(item => item.el === el)
    if (existItem) {
      this._removeListenerTarget(existItem.$parent)
      this._removeListenerTarget(window)
      remove(this.ListenerQueue, existItem)
      existItem.$destroy()
    }
  }

  /*
   * remove lazy components form list
   * @param  {Vue} vm Vue instance
   * @return
   */
  removeComponent(vm: Tlistener) {
    if (!vm) return
    remove(this.ListenerQueue, vm)
    this._observer && this._observer.unobserve(vm.el)
    if (vm.$parent && vm.$el.parentNode) {
      this._removeListenerTarget(vm.$el.parentNode)
    }
    this._removeListenerTarget(window)
  }


  /**
   *
   * @param {*} mode 设置监听模式。我们通常使用事件模式或者IntersectionObserver来判断元素是否进入视图，若进入视图则需为图片加载真实路径。如果使用监听事件模式，mode为event，如果使用IntersectionObserver，mode为observer
   */
  setMode(mode: string) {
    if (!hasIntersectionObserver && mode === modeType.observer) {
      mode = modeType.event
    }

    this.mode = mode // event or observer
    if (mode === modeType.event) {
      if (this._observer) {
        this.ListenerQueue.forEach(listener => {
          this._observer!.unobserve(listener.el)
        })
        this._observer = null
      }
      this.TargetQueue.forEach(target => {
        this._initListen(target.el, true)
      })
    } else {
      this.TargetQueue.forEach(target => {
        this._initListen(target.el, false)
      })
      this._initIntersectionObserver()
    }
  }

  /*
  *** Private functions ***
  */

  /*
   * 加载监听者目标
   * @param  {DOM} el listener target
   * @return
   */
  _addListenerTarget(el: HTMLElement | Window) {
    if (!el) return
    let target = this.TargetQueue.find((target) => target.el === el)
    if (!target) {
      target = {
        el: el,
        id: ++this.TargetIndex,
        childrenCount: 1,
        listened: true
      }
      this.mode === modeType.event && this._initListen(target.el, true)
      this.TargetQueue.push(target)
    } else {
      target.childrenCount++
    }
    return this.TargetIndex
  }

  /*
   * remove listener target or reduce target childrenCount
   * @param  {DOM} el or window
   * @return
   */
  _removeListenerTarget(el: HTMLElement | Window) {
    this.TargetQueue.forEach((target, index) => {
      if (target.el === el) {
        target.childrenCount--
        if (!target.childrenCount) {
          this._initListen(target.el, false)
          this.TargetQueue.splice(index, 1)
          target = null as unknown as Tlistener
        }
      }
    })
  }

  /*
   * add or remove eventlistener
   * @param  {DOM} el DOM or Window
   * @param  {boolean} start flag
   * @return
   */
  _initListen(el: HTMLElement, start: boolean) {
    this.options.listenEvents!.forEach((evt: string) => _[start ? 'on' : 'off'](el, evt, this.lazyLoadHandler))
  }

  _initEvent() {
    this.$on = (event: string, func: VueLazyloadListenEvent) => {
      if (!this.Event.listeners[event as ListenersType]) this.Event.listeners[event as ListenersType] = []
      this.Event.listeners[event as ListenersType].push(func)
    }

    this.$once = (event: string, func: VueLazyloadListenEvent) => {
      const vm = this
      function on(arg: any) {
        vm.$off(event, on as any)
        func.apply(vm, arg)
      }
      this.$on(event, on)
    }

    this.$off = (event: string, func: Tlistener) => {
      if (!func) {
        if (!this.Event.listeners[event as ListenersType]) return
        this.Event.listeners[event as ListenersType].length = 0
        return
      }
      remove(this.Event.listeners[event as ListenersType], func)
    }

    this.$emit = (event, context, inCache) => {
      if (!this.Event.listeners[event as ListenersType]) return
      this.Event.listeners[event as ListenersType].forEach((func: Function) => func(context, inCache))
    }
  }

  /**
   * 监听队列中loaded状态的监听对象取出存放在freeList中并删掉，判断未加载的监听对象是否处在预加载位置，如果是则执行load方法。
   * @return
   */
  _lazyLoadHandler() {
    const freeList: Tlistener[] = []
    this.ListenerQueue.forEach((listener) => {
      if (!listener.el || !listener.el.parentNode) {
        freeList.push(listener)
      }
      const catIn = listener.checkInView() // 判断是否在视图内
      if (!catIn) return // 如果在视图内，那么就执行下一步
      listener.load()
    })
    freeList.forEach(item => {
      remove(this.ListenerQueue, item)
      item.$destroy()
    })
  }
  /**
  * init IntersectionObserver
  * set mode to observer
  * @return
  */
  _initIntersectionObserver() {
    if (!hasIntersectionObserver) return
    this._observer = new IntersectionObserver(this._observerHandler.bind(this), this.options.observerOptions)
    if (this.ListenerQueue.length) {
      this.ListenerQueue.forEach(listener => {
        (this._observer as any).observe(listener.el)
      })
    }
  }

  /**
  * init IntersectionObserver
  * @return
  */
  _observerHandler(entries: Array<IntersectionObserverEntry>) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.ListenerQueue.forEach(listener => {
          if (listener.el === entry.target) {
            if (listener.state.loaded) return this._observer!.unobserve(listener.el)
            listener.load()
          }
        })
      }
    })
  }

  /**
  * set element attribute with image'url and state
  * @param  {object} lazyload listener 监听el的实例
  * @param  {string} state 将会被渲染
  * @param  {bool} inCache  是否从缓存中渲染
  * @return
  */
  _elRenderer(listener: ReactiveListener, state: ListenersType, cache: boolean) {
    if (!listener.el) return
    const { el, bindType } = listener

    let src
    switch (state) {
      case 'loading':
        src = listener.loading
        break
      case 'error':
        src = listener.error
        break
      default:
        src = listener.src
        break
    }
    if (bindType) {
      // @ts-ignore
      el.style[bindType] = 'url("' + src + '")'
    } else if (el.getAttribute('src') !== src) {
      el.setAttribute('src', src)
    }
    // console.log(state) // 会执行两次loading,
    el.setAttribute('lazy', state)
    this.$emit(state, listener, cache)
    this.options.adapter[state] && this.options.adapter[state](listener, this.options)
    if (this.options.dispatchEvent) {
      const event = new CustomEvent(state, {
        detail: listener
      })
      el.dispatchEvent(event)
    }
  }

  /**
  * 返回图片的loadingSrc loadedSrc errorSrc
  * @param {string} image's src
  * @return {object} image's loading, loaded, error url
  */
  _valueFormatter(value: any) {
    let src = value
    let loading = this.options.loading
    let error = this.options.error
    if (isObject(value)) {
      if (!value.src && !this.options.silent) console.error('Vue Lazyload warning: miss src with ' + value)
      src = value.src
      loading = value.loading || this.options.loading
      error = value.error || this.options.error
    }
    return {
      src,
      loading,
      error
    }
  }
}
export default function () {
  return Lazy
}

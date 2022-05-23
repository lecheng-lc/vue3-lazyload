import {
  inBrowser,
  CustomEvent,
  remove,
  some,
  find,
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

import ReactiveListener from './listener'

const DEFAULT_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const DEFAULT_EVENTS = ['scroll', 'wheel', 'mousewheel', 'resize', 'animationend', 'transitionend', 'touchmove']
const DEFAULT_OBSERVER_OPTIONS = {
  rootMargin: '0px',
  threshold: 0
}

export default function (Vue) {
  return class Lazy {
    constructor ({ preLoad, error, throttleWait, preLoadTop, dispatchEvent, loading, attempt, silent = true, scale, listenEvents, hasbind, filter, adapter, observer, observerOptions }) {
      this.version = '__VUE_LAZYLOAD_VERSION__'
      this.mode = modeType.event
      this.ListenerQueue = []
      this.TargetIndex = 0
      this.TargetQueue = []
      this.options = {
        silent: silent, // 是否打印debug日志
        dispatchEvent: !!dispatchEvent, //  @TODO
        throttleWait: throttleWait || 200, // 函数节流滚动监听频次
        preLoad: preLoad || 1.3, //  预装高度，比如一屏，
        preLoadTop: preLoadTop || 0,
        error: error || DEFAULT_URL, // 加载错误的图像
        loading: loading || DEFAULT_URL, // 正在加载的图像
        attempt: attempt || 3, // 尝试的次数
        scale: scale || getDPR(scale), // 缩放倍数
        ListenEvents: listenEvents || DEFAULT_EVENTS, // 监听的事件 列表
        hasbind: false,
        supportWebp: supportWebp(), // 是否支持webp
        filter: filter || {}, // 通过过滤函数可以动态的修改src
        adapter: adapter || {}, // 监听图片加载过程的毁掉方法，loaded,loding,error
        observer: !!observer, // 是否使用了IntersectionObserver,可以提升性能，但前提要引入IntersectionObserver的poly-fill
        observerOptions: observerOptions || DEFAULT_OBSERVER_OPTIONS
      }
      this._initEvent() // 初始化事件事件队列  
      this._imageCache = new ImageCache({ max: 200 }) // 缓存图片的数量
      this.lazyLoadHandler = throttle(this._lazyLoadHandler.bind(this), this.options.throttleWait) // 
      this.setMode(this.options.observer ? modeType.observer : modeType.event) // 初始化队列中reactiveListener实例中的监听事件
    }

    /**
     * update config
     * @param  {Object} config params
     * @return
     */
    config (options = {}) {
      assign(this.options, options)
    }

    /**
     * output listener's load performance
     * @return {Array}
     */
    performance () {
      let list = []

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
    addLazyBox (vm) {
      this.ListenerQueue.push(vm)
      if (inBrowser) {
        this._addListenerTarget(window)
        this._observer && this._observer.observe(vm.el)
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
    add (el, binding, vnode) {
      // console.log(this.ListenerQueue,'===')
      // console.log(binding,'===')
      if (some(this.ListenerQueue, item => item.el === el)) {
        this.update(el, binding)
        return Vue.nextTick(this.lazyLoadHandler)
      }

      let { src, loading, error } = this._valueFormatter(binding.value) // 获取元素loadedSrc loadingSrc errorSrc的值
      Vue.nextTick(() => {
       
        src = getBestSelectionFromSrcset(el, this.options.scale) || src // 设置获取最好的图片尺寸
        this._observer && this._observer.observe(el)

        const container = Object.keys(binding.modifiers)[0] // 捕获是v-lazy.image   还是v-lazy.container
        let $parent
        if (container) {  // 自定义可滚动的父元素容器
          $parent = vnode.context.$refs[container]
          // if there is container passed in, try ref first, then fallback to getElementById to support the original usage
          $parent = $parent ? $parent.$el || $parent : document.getElementById(container)
        }
        if (!$parent) {
          $parent = scrollParent(el) // 如果父元素存在，获取滚动的父元素,如果父级元素不存在，那么默认滚动元素为window
        }

        const newListener = new ReactiveListener({
          bindType: binding.arg,
          $parent,
          el,
          loading,
          error,
          src,
          elRenderer: this._elRenderer.bind(this),
          options: this.options,
          imageCache: this._imageCache
        })

        this.ListenerQueue.push(newListener)
        if (inBrowser) {
          this._addListenerTarget(window)
          this._addListenerTarget($parent)
        }

        this.lazyLoadHandler()
        Vue.nextTick(() => this.lazyLoadHandler())
      })
    }

    /**
    * update image src
    * @param  {DOM} el
    * @param  {object} vue directive binding
    * @return
    */
    update (el, binding, vnode) {
      let { src, loading, error } = this._valueFormatter(binding.value)
      src = getBestSelectionFromSrcset(el, this.options.scale) || src

      const exist = find(this.ListenerQueue, item => item.el === el)
      if (!exist) {
        this.add(el, binding, vnode)
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
      this.lazyLoadHandler()
      Vue.nextTick(() => this.lazyLoadHandler())
    }

    /**
    * remove listener form list
    * @param  {DOM} el
    * @return
    */
    remove (el) {
      if (!el) return
      this._observer && this._observer.unobserve(el)
      const existItem = find(this.ListenerQueue, item => item.el === el)
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
    removeComponent (vm) {
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
    setMode (mode) {
      if (!hasIntersectionObserver && mode === modeType.observer) {
        mode = modeType.event
      }

      this.mode = mode // event or observer

      if (mode === modeType.event) {
        if (this._observer) {
          this.ListenerQueue.forEach(listener => {
            this._observer.unobserve(listener.el)
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
    _addListenerTarget (el) {
      if (!el) return
      let target = find(this.TargetQueue, target => target.el === el)
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
    _removeListenerTarget (el) {
      this.TargetQueue.forEach((target, index) => {
        if (target.el === el) {
          target.childrenCount--
          if (!target.childrenCount) {
            this._initListen(target.el, false)
            this.TargetQueue.splice(index, 1)
            target = null
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
    _initListen (el, start) {
      this.options.ListenEvents.forEach((evt) => _[start ? 'on' : 'off'](el, evt, this.lazyLoadHandler))
    }

    _initEvent () {
      this.Event = {
        listeners: {
          loading: [],
          loaded: [],
          error: []
        }
      }

      this.$on = (event, func) => {
        if (!this.Event.listeners[event]) this.Event.listeners[event] = []
        this.Event.listeners[event].push(func)
      }

      this.$once = (event, func) => {
        const vm = this
        function on () {
          vm.$off(event, on)
          func.apply(vm, arguments)
        }
        this.$on(event, on)
      }

      this.$off = (event, func) => {
        if (!func) {
          if (!this.Event.listeners[event]) return
          this.Event.listeners[event].length = 0
          return
        }
        remove(this.Event.listeners[event], func)
      }

      this.$emit = (event, context, inCache) => {
        if (!this.Event.listeners[event]) return
        
        this.Event.listeners[event].forEach(func => func(context, inCache))
      }
    }

    /**
     * 监听队列中loaded状态的监听对象取出存放在freeList中并删掉，判断未加载的监听对象是否处在预加载位置，如果是则执行load方法。
     * @return
     */
    _lazyLoadHandler () {
      const freeList = []
      console.log(this.ListenerQueue)
      this.ListenerQueue.forEach((listener, index) => {
        if (!listener.el || !listener.el.parentNode) {
          freeList.push(listener)
        }
        const catIn = listener.checkInView() // 判断是否在视图内
        if (!catIn) return // 如果在视图内，那么就执行下一步
        listener.load()
      })
      freeList.forEach(item => {
        console.log(222)
        remove(this.ListenerQueue, item)
        item.$destroy()
      })
    }
    /**
    * init IntersectionObserver
    * set mode to observer
    * @return
    */
    _initIntersectionObserver () {
      if (!hasIntersectionObserver) return
      this._observer = new IntersectionObserver(this._observerHandler.bind(this), this.options.observerOptions)
      if (this.ListenerQueue.length) {
        this.ListenerQueue.forEach(listener => {
          this._observer.observe(listener.el)
        })
      }
    }

    /**
    * init IntersectionObserver
    * @return
    */
    _observerHandler (entries, observer) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.ListenerQueue.forEach(listener => {
            if (listener.el === entry.target) {
              if (listener.state.loaded) return this._observer.unobserve(listener.el)
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
    _elRenderer (listener, state, cache) {
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
        el.style[bindType] = 'url("' + src + '")'
      } else if (el.getAttribute('src') !== src) {
        el.setAttribute('src', src)
      }
      // console.log(state) // 会执行两次loading,
      el.setAttribute('lazy', state)
      this.$emit(state, listener, cache)
      this.options.adapter[state] && this.options.adapter[state](listener, this.options) // 监听图片各个元素的加载过程的回调方法
      if (this.options.dispatchEvent) { // 自定义方法,当方法开始执行去执行
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
    _valueFormatter (value) {
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
}

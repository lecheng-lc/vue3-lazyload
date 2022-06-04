import {
  loadImageAsync,
  noop,
  ImageCache
} from './util'


import { VueLazyloadOptions ,Tlistener} from '../types/index'
export default class ReactiveListener {
  el: HTMLElement | null
  src: string
  error: string
  loading: string
  bindType: string
  attempt: number
  naturalHeight: number
  naturalWidth: number
  options: VueLazyloadOptions
  rect: DOMRect
  $parent: Element | null
  elRenderer: (listener: Tlistener, state: string, cache: boolean) => void
  _imageCache: ImageCache
  performanceData: Record<string, any>
  state: {
    loading: boolean,
    loaded: boolean,
    error: boolean,
    rendered: boolean,
  }
  constructor(
    el: HTMLElement,
    src: string,
    error: string,
    loading: string,
    bindType: string,
    $parent: Element,
    options: VueLazyloadOptions,
    elRenderer: (listener: Tlistener, state: string, cache: boolean) => void,
    imageCache: ImageCache
  ) {
    this.el = el // dom元素
    this.src = src // dom元素src
    this.error = error // dom元素错误的src
    this.loading = loading // dom元素加载的src
    this.bindType = bindType // 监测方式
    this.attempt = 0 // 重试次数

    this.naturalHeight = 0 // 图片原始高度
    this.naturalWidth = 0 // 图片原始宽度

    this.options = options // lazyload的各种初始化选项

    this.rect = <DOMRect>{} // 当前元素距离屏幕顶部的上下左右距离
    this.$parent = $parent // 当前元素父元素
    this.elRenderer = elRenderer // 元素渲染的方式
    this._imageCache = imageCache // 图像缓存数组
    this.performanceData = {  //性能表现参数
      init: Date.now(),
      loadStart: 0,
      loadEnd: 0
    }

    this.filter() // 图片过滤函数执行
    this.initState() // 初始化函数执行状态
    this.render('loading', false) // 开始执行渲染逻辑
  }

  /*
   * 将真实的图片路径绑定到元素的data-src属性上，并为监听对象添加error、loaded、rendered状态
   * @return
   */
  initState() {
    if (!this.el) return
    if ('dataset' in this.el) {
      this.el.dataset.src = this.src
    } else {
      (this.el as HTMLElement).setAttribute('data-src', this.src)
    }
    this.state = {
      loading: false,
      error: false,
      loaded: false,
      rendered: false
    }
  }

  /*
   * record performance
   * @return
   */
  record(event: string) {
    this.performanceData[event] = Date.now()
  }

  /*
   * 更新图片的数据
   * @param  {String} image uri
   * @param  {String} loading image uri
   * @param  {String} error image uri
   * @return
   */
  update(option: { src: string, loading: string, error: string }) {
    const oldSrc = this.src
    this.src = option.src
    this.loading = option.loading
    this.error = option.error
    this.filter()
    if (oldSrc !== this.src) {
      this.attempt = 0
      this.initState()
    }
  }

  /*
   * 获得元素距离屏幕的距离
   * @return
   */
  getRect() {
    this.rect = this.el!.getBoundingClientRect()
  }

  /*
   *  检查元素是否在视图窗口中
   * @return {Boolean} el is in view
   */
  checkInView() {
    if (!this.rect) return false
    this.getRect()
    return (this.rect.top < window.innerHeight * this.options.preLoad && this.rect.bottom > this.options.preLoadTop!) &&
      (this.rect.left < window.innerWidth * this.options.preLoad && this.rect.right > 0)
  }

  /*
   * 执行过滤的函数
   */
  filter() {
    Object.keys(this.options.filter).map(key => {
      this.options.filter[key](this, this.options)
    })
  }

  /*
   * render loading first
   * @params cb:Function
   * @return
   */
  renderLoading(cb: () => void) {
    this.state.loading = true
    loadImageAsync({
      src: this.loading
    }, () => {
      this.render('loading', false) // 加载图像
      this.state.loading = false
      cb()
    }, () => {
      // 图像加载失败
      cb()
      this.state.loading = false
      if (!this.options.silent) console.warn(`VueLazyload log: load failed with loading image(${this.loading})`)
    })
  }

  /*
   * try load image and  render it
   * @return
   */
  load(onFinish = noop) {
    // 如果尝试加载图片的次数大于设置的次数，那么抛出错误，图片不再加载,并执行回调
    if ((this.attempt > this.options.attempt! - 1) && this.state.error) {
      if (!this.options.silent) console.log(`VueLazyload log: ${this.src} tried too more than ${this.options.attempt} times`)
      onFinish()
      return
    }
    if (this.state.rendered && this.state.loaded) return // 如果图片已经渲染或者已经加载完毕那么不再往下执行
    if (this._imageCache.has(this.src)) { // 如果图片已经加载过，且缓存起来了，那么不再加载
      console.log('jinbuqude')
      this.state.loaded = true
      this.render('loaded', true)
      this.state.rendered = true
      return onFinish()
    }

    this.renderLoading(() => {
      this.attempt++
      this.options.adapter['beforeLoad'] && this.options.adapter['beforeLoad'](this, this.options)
      this.record('loadStart')
      loadImageAsync({
        src: this.src
      }, (data: any) => {
        this.naturalHeight = data.naturalHeight
        this.naturalWidth = data.naturalWidth
        this.state.loaded = true
        this.state.error = false
        this.record('loadEnd')
        this.render('loaded', false)
        this.state.rendered = true
        this._imageCache.add(this.src)
        onFinish()
      }, (err: any) => {
        !this.options.silent && console.error(err)
        this.state.error = true
        this.state.loaded = false
        this.render('error', false)
      })
    })
  }

  /*
   * render image
   * @param  {String} state to render // ['loading', 'src', 'error']
   * @param  {String} is form cache
   * @return
   */
  render(state: any, cache: boolean) {
    this.elRenderer(this, state, cache)
  }

  /*
   * output performance data
   * @return {Object} performance data
   */
  performance() {
    let state = 'loading'
    let time = 0

    if (this.state.loaded) {
      state = 'loaded'
      time = (this.performanceData.loadEnd - this.performanceData.loadStart) / 1000
    }

    if (this.state.error) state = 'error'

    return {
      src: this.src,
      state,
      time
    }
  }

  /*
   * $destroy
   * @return
   */
  $destroy() {
    this.el = null
    this.src = ''
    this.error = ''
    this.loading = ''
    this.bindType = ''
    this.attempt = 0
  }
}

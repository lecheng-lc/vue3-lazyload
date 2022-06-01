export default function (lazy, options) {
  return class LazyDom {
    el:HTMLElement
    $el:HTMLElement
    viewParams: {[x:string]:any}
    eleLoaded:boolean
    state: {
      inited:boolean,
      loaded:boolean
    }
    options: {
      preLoad: number,
      preLoadTop:number
      domTypes: string[]
    }
    rect: DOMRect
    destroy: boolean
    viewed: boolean
    constructor(el, viewParams) {
      this.eleLoaded = false
      this.state = {
        inited: false,
        loaded: false
      }
      this.$el = el
      this.el = el
      this.viewParams = viewParams
      this.viewed = false
      this.options = {
        preLoad: options.preLoad,
        preLoadTop: options.preLoadTop,
        domTypes:[]
      }
      this.destroy = false
    }

    addLazyDom() {
      if (!this.state.inited) {
        this.state.inited = true
        lazy.addLazyBox(this)
        lazy.lazyLoadHandler()
      }
    }
    getRect() {
      this.rect = this.$el.getBoundingClientRect()
    }
    update() { }
    checkInView() {
      this.getRect()
      return (this.rect.top < window.innerHeight * this.options.preLoad && this.rect.bottom > this.options.preLoadTop) &&
        (this.rect.left < window.innerWidth * this.options.preLoad && this.rect.right > 0)
    }
    load() {
      if (!this.state.loaded) {
        this.state.loaded = true
        this.triggerEleView()
      }
    }
    $destroy() {
      this.$el = null
    }
    triggerEleView() {
      if (!this.viewed && this.state.loaded) {
        const event = new CustomEvent('view', {
          detail: {}
        })
        this.$el.dispatchEvent(event)
        this.viewed = true
      }
    }
  }
}

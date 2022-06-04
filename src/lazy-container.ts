import {
  remove,
  assign,
} from './util'
import { Lazy } from './lazy'
import {DirectiveBinding,VNode} from 'vue'
export default class LazyContainerMananger {
  lazy: Lazy
  _queue: Array<LazyContainer>
  constructor(lazy: Lazy) {
    this.lazy = lazy
    lazy.lazyContainerMananger = this
    this._queue = []
  }

  bind(el:HTMLElement, binding:DirectiveBinding, vnode:VNode) {
    const container = new LazyContainer(el, binding, vnode, this.lazy)
    this._queue.push(container)
  }

  update(el:HTMLElement, binding:DirectiveBinding) {
    const container = this._queue.find(item => item.el === el)
    if (!container) return
    container.update(el, binding)
  }

  unbind(el:HTMLElement) {
    const container = this._queue.find(item => item.el === el)
    if (!container) return
    container.clear()
    remove(this._queue, container)
  }
}

const defaultOptions = {
  selector: 'img'
}

type DefaultOptions = {
  selector: keyof HTMLElementTagNameMap,
  error: '',
  loading: ''
}

class LazyContainer {
  el: HTMLElement | null
  vnode: VNode | null
  binding: DirectiveBinding | null
  options: DefaultOptions
  lazy: Lazy | null
  _queue:  Array<LazyContainer>
  constructor(el: HTMLElement, binding: DirectiveBinding, vnode: VNode, lazy: Lazy) {
    this.el = null
    this.vnode = vnode
    this.binding = binding
    this.options = <DefaultOptions>{}
    this.lazy = lazy
    this._queue = []
    this.update(el, binding)
  }

  update(el:HTMLElement, binding:DirectiveBinding) {
    this.el = el
    this.options = assign({}, defaultOptions, binding.value)
    const imgs = this.getImgs()
    imgs.forEach((el: HTMLElement) => {
      this.lazy!.add(el, assign({}, this.binding, {
        value: {
          src: 'dataset' in el ? el.dataset.src : el.getAttribute('data-src'),
          error: ('dataset' in el ? el.dataset.error : el.getAttribute('data-error')) || this.options.error,
          loading: ('dataset' in el ? el.dataset.loading : el.getAttribute('data-loading')) || this.options.loading
        }
      }))
    })
  }

  getImgs() {
    return Array.from(this.el!.querySelectorAll(this.options.selector))
  }

  clear() {
    const imgs = this.getImgs()
    imgs.forEach(el => this.lazy!.remove(el))
    this.vnode = null
    this.binding = null
    this.lazy = null
  }
}

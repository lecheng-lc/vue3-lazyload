
import assign from 'assign-deep'
const inBrowser = typeof window !== 'undefined'
import {loadImageAsyncOption} from './type'
export const hasIntersectionObserver = checkIntersectionObserver()
function checkIntersectionObserver() {
  if (inBrowser &&
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
    // Minimal polyfill for Edge 15's lack of `isIntersecting`
    // See: https://github.com/w3c/IntersectionObserver/issues/211
    if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
      Object.defineProperty(window.IntersectionObserverEntry.prototype,
        'isIntersecting', {
        get: function () {
          return this.intersectionRatio > 0
        }
      })
    }
    return true
  }
  return false
}
export enum modeType {
  event = 'event',
  observer = 'observer'

}


function remove(arr: Array<any>, item: any) {
  if (!arr.length) return
  const index = arr.indexOf(item)
  if (index > -1) return arr.splice(index, 1)
}


function getBestSelectionFromSrcset(el: HTMLElement, scale: number) {
  if (el.tagName !== 'IMG' || !el.getAttribute('data-srcset')) return
  let options: string | string[] = el.getAttribute('data-srcset') ?? ''
  const result:  Array<[tmpWidth: number, tmpSrc: string]> = []
  const container = <HTMLElement>el.parentNode
  const containerWidth = container.offsetWidth * scale
  console.log(container, containerWidth)
  let spaceIndex:number
  let tmpSrc:string
  let tmpWidth:number
  options = options.trim().split(',')
  if (Array.isArray(options))
    options.map((item: string) => {
      item = item.trim()
      spaceIndex = item.lastIndexOf(' ')
      if (spaceIndex === -1) {
        tmpSrc = item
        tmpWidth = 999998
      } else {
        tmpSrc = item.slice(0, spaceIndex)
        tmpWidth = parseInt(item.slice(spaceIndex + 1, item.length - spaceIndex - 2), 10)
      }
      result.push([tmpWidth, tmpSrc])
    })

  result.sort(function (a, b) {
    if (a[0] < b[0]) {
      return 1
    }
    if (a[0] > b[0]) {
      return -1
    }
    if (a[0] === b[0]) {
      if (b[1].indexOf('.webp', b[1].length - 5) !== -1) {
        return 1
      }
      if (a[1].indexOf('.webp', a[1].length - 5) !== -1) {
        return -1
      }
    }
    return 0
  })
  let bestSelectedSrc = ''
  let tmpOption

  for (let i = 0; i < result.length; i++) {
    tmpOption = result[i]
    bestSelectedSrc = tmpOption[1]
    const next = result[i + 1]
    if (next && next[0] < containerWidth) {
      bestSelectedSrc = tmpOption[1]
      break
    } else if (!next) {
      bestSelectedSrc = tmpOption[1]
      break
    }
  }

  return bestSelectedSrc
}

const getDPR = (scale = 1) => inBrowser ? (window.devicePixelRatio || scale) : scale

function supportWebp() {
  if (!inBrowser) return false
  let support:boolean = true
  const d = document
  try {
    let el = d.createElement('object')
    el.type = 'image/webp'
    el.style.visibility = 'hidden'
    el.innerHTML = '!'
    d.body.appendChild(el)
    support = !el.offsetWidth
    d.body.removeChild(el)
  } catch (err) {
    support = false
  }

  return support
}

function throttle(action: Function, delay: number) {
  let timeout: number = 0
  let lastRun = 0
  return function () {
    if (timeout) {
      return
    }
    let elapsed = Date.now() - lastRun
    // @ts-ignore
    let context = this
    let args = arguments
    let runCallback = function () {
      lastRun = Date.now()
      timeout = 0
      action.apply(context, args)
    }
    if (elapsed >= delay) {
      runCallback()
    } else {
      timeout = setTimeout(runCallback, delay)
    }
  }
}

function testSupportsPassive(): boolean {
  if (!inBrowser) return false
  let support = false
  try {
    let opts = Object.defineProperty({}, 'passive', {
      get: function () {
        support = true
      }
    })
    window.addEventListener('test', () => { }, opts)
  } catch (e) { }
  return support
}

const supportsPassive = testSupportsPassive()

const _ = {
  on(el: Element, type: string, func: ()=>void, capture = false) {
    if (supportsPassive) {
      el.addEventListener(type, func, {
        capture: capture,
        passive: true
      })
    } else {
      el.addEventListener(type, func, capture)
    }
  },
  off(el: Element, type: string, func: () => void, capture = false) {
    el.removeEventListener(type, func, capture)
  }
}

const loadImageAsync:loadImageAsyncOption = (item, resolve, reject) => {
  let image = new Image()
  if (!item || !item.src) {
    const err = new Error('image src is required')
    return reject(err)
  }
  image.src = item.src
  image.onload = function () {
    resolve({
      naturalHeight: image.naturalHeight,
      naturalWidth: image.naturalWidth,
      src: image.src
    })
  }

  image.onerror = function (e) {
    reject(e)
  }
}

const style = (el: HTMLElement, prop: string) => {
  return typeof getComputedStyle !== 'undefined'
    ? getComputedStyle(el, null).getPropertyValue(prop)
    : el.style[prop as keyof CSSStyleDeclaration]
}

const overflow = (el: HTMLElement) => {
  return `${style(el, 'overflow')}${style(el, 'overflowY')}${style(el, 'overflowX')}`
}

const scrollParent = (el: HTMLElement) => {
  if (!inBrowser) return
  if (!(el instanceof Element)) {
    return window
  }

  let parent = el

  while (parent) {
    if (parent === document.body || parent === document.documentElement) {
      break
    }
    if (!parent.parentNode) {
      break
    }
    if (/(scroll|auto)/.test(overflow(parent))) {
      return parent
    }
    parent = <HTMLElement>parent.parentNode
  }

  return window
}

function isObject(obj: any) {
  return obj !== null && typeof obj === 'object'
}


function noop():void { }

class ImageCache {
  options: { max: number }
  _caches: string[]
  constructor({ max }: any) {
    this.options = {
      max: max || 100
    }
    this._caches = []
  }

  has(key: string) {
    return this._caches.includes(key)
  }

  add(key: string) {
    if (this.has(key)) return
    this._caches.push(key)
    if (this._caches.length > this.options.max) {
      this.free()
    }
  }

  free() {
    this._caches.shift()
  }
}

export {
  ImageCache,
  inBrowser,
  remove,
  assign,
  noop,
  _,
  isObject,
  throttle,
  supportWebp,
  getDPR,
  scrollParent,
  loadImageAsync,
  getBestSelectionFromSrcset
}

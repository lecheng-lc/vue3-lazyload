import Lazy from './lazy'
import LazyComponent from './lazy-component'
import LazyContainer from './lazy-container'
import LazyImage from './lazy-image'
import LazyDom from './lazy-dom'
import { VueLazyloadOptions } from '../types/index'
import { App } from 'vue'
export default {
  /*
  * install function
  * @param  {app} Vue 实例
  * @param  {object} options  lazyload options
  */
  install(app: App, options: VueLazyloadOptions) {
    const LazyClass = Lazy()
    const lazy = new LazyClass(options)
    const lazyContainer = new LazyContainer(lazy)
    const lazyDom = LazyDom(lazy, options)
    const isVue3 = app.version.split('.')[0] === '3'
    app.config.globalProperties.$Lazyload = lazy
    if (options.lazyComponent) {
      app.component('lazy-component', LazyComponent(lazy))
    }
    if (options.lazyImage) {
      app.component('lazy-image', LazyImage(lazy))
    }
    if (isVue3) {
      app.directive('lazy', {
        beforeMount: lazy.add.bind(lazy),
        beforeUpdate: lazy.update.bind(lazy),
        updated: lazy.lazyLoadHandler.bind(lazy),
        unmounted: lazy.remove.bind(lazy)
      })
      app.directive('lazy-container', {
        beforeMount: lazyContainer.bind.bind(lazyContainer),
        updated: lazyContainer.update.bind(lazyContainer),
        unmounted: lazyContainer.unbind.bind(lazyContainer)
      })
      app.directive('view', {
        mounted: (el,binding)=>{
          const haveFilterType = options.viewNodeNames && options.viewNodeNames.length
          const nodeName = el.nodeName
          const viewParams = binding.value
          if(haveFilterType && options.viewNodeNames!.includes(nodeName)) {
            const lazyBox = el.domLazyBox = new lazyDom(el,viewParams)
            lazyBox.addLazyDom()
          } else if(!haveFilterType){
            const lazyBox = el.domLazyBox = new lazyDom(el,viewParams)
            lazyBox.addLazyDom()
          }
        },
        unmounted: (el)=>{
          const lazyBox = el.domLazyBox || null
          if (lazyBox) {
            !lazyBox.destroyed && lazy.removeComponent(lazyBox)
            delete el.domLazyBox
          }
        }
      })
    } else {
      console.warn('只针对vue3版本')
    }
  }
}

import { App } from "vue";

type PluginFunction<T> = (Vue: App, options?: T) => void

interface PluginObject<T> {
  install: PluginFunction<T>;
  [key: string]: any;
}
interface IntersectionObserverInit {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export interface VueLazyloadImage {
  src: string;
  error?: string;
  loading?: string;
}
export interface loadImageAsyncOption {
  (item: { src: string },options:(options: { naturalHeight: number, naturalWidth: number, src: string }) => void,reject: (options: string | Event | Error) => void):void
}
export interface VueLazyloadOptions {
  lazyComponent?: boolean;
  lazyImage?: boolean;
  preLoad?: any;
  error?: string;
  loading?: string;
  attempt?: number;
  listenEvents?: string[];
  adapter?: any;
  filter?: any;
  dispatchEvent?: boolean;
  throttleWait?: number;
  observer?: boolean;
  observerOptions?: IntersectionObserverInit;
  silent?: boolean;
  preLoadTop?: number;
  scale?: number;
  hasbind?: boolean;
  viewNodeNames?: string[];
  supportWebp?: boolean;
}

export interface VueReactiveListener {
  el: Element;
  src: string;
  error: string;
  loading: string;
  bindType: string;
  attempt: number;
  naturalHeight: number;
  naturalWidth: number;
  options: VueLazyloadOptions;
  rect: DOMRect;
  $parent: Element
  elRenderer: Function;
  performanceData: {
    init: number,
    loadStart: number,
    loadEnd: number
  };
}

export interface VueLazyloadListenEvent {
  (listener: VueReactiveListener, cache: boolean) : void;
}

export interface VueLazyloadHandler {
  $on (event: string, callback: VueLazyloadListenEvent): void;
  $once (event: string, callback: VueLazyloadListenEvent): void;
  $off (event: string, callback?: VueLazyloadListenEvent): void;
  lazyLoadHandler (): void;
}
export  type Tlistener = {
  [key: string]: any;
  state: {
    loading?: boolean;
    loaded?: boolean;
    error?: boolean;
    attempt?: number;
    rendered?: boolean;
  };
  el: any;
  rect: object
  checkInView: () => boolean;
  load: () => void;
}
export interface VueLazyloadPluginObject extends PluginObject<VueLazyloadOptions> {}

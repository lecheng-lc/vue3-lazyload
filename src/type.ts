export interface VueLazyloadOptions {
    lazyComponent?: boolean;
    preLoad?: any;
    lazyImage?: boolean
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
    supportWebp?: boolean
    viewNodeNames?: string[]
  }
  export type Tlistener = {
    state: {
      loading?: boolean;
      loaded?: boolean;
      error?: boolean;
      attempt?: number;
      rendered?: boolean;
    };
    el: any;
    rect: any
    checkInView: () => boolean;
    load: () => void;
    [key: string]: any;
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
  (listener: Tlistener, cache: boolean) : void;
}

export interface loadImageAsyncOption {
  (item: { src: string },options:(options: { naturalHeight: number, naturalWidth: number, src: string }) => void,reject: (options: string | Event | Error) => void):void
}

import assign from 'assign-deep';
declare const inBrowser: boolean;
import { loadImageAsyncOption } from './type';
export declare const hasIntersectionObserver: boolean;
export declare enum modeType {
    event = "event",
    observer = "observer"
}
declare function remove(arr: Array<any>, item: any): any[] | undefined;
declare function getBestSelectionFromSrcset(el: HTMLElement, scale: number): string | undefined;
declare const getDPR: (scale?: number) => number;
declare function supportWebp(): boolean;
declare function throttle(action: Function, delay: number): () => void;
declare const _: {
    on(el: Element, type: string, func: () => void, capture?: boolean): void;
    off(el: Element, type: string, func: () => void, capture?: boolean): void;
};
declare const loadImageAsync: loadImageAsyncOption;
declare const scrollParent: (el: HTMLElement) => (Window & typeof globalThis) | HTMLElement | undefined;
declare function isObject(obj: any): boolean;
declare function noop(): void;
declare class ImageCache {
    options: {
        max: number;
    };
    _caches: string[];
    constructor({ max }: any);
    has(key: string): boolean;
    add(key: string): void;
    free(): void;
}
export { ImageCache, inBrowser, remove, assign, noop, _, isObject, throttle, supportWebp, getDPR, scrollParent, loadImageAsync, getBestSelectionFromSrcset };

/** addEventListener that returns its own remover. */
export function listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, options?: AddEventListenerOptions): () => void;
export function listen<K extends keyof DocumentEventMap>(target: Document, type: K, fn: (e: DocumentEventMap[K]) => void, options?: AddEventListenerOptions): () => void;
export function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions): () => void;
export function listen(target: EventTarget, type: string, fn: (e: never) => void, options?: AddEventListenerOptions): () => void {
    target.addEventListener(type, fn as EventListener, options);
    return () => target.removeEventListener(type, fn as EventListener, options);
}

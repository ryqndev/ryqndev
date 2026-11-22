import { listen } from './dom';

/** Keys currently held, by KeyboardEvent.code. */
export const keys: Record<string, boolean> = {};
/** Mouse state accumulated between frames; the player consumes and clears dx/dy/wheel. */
export const mouse = { dx: 0, dy: 0, l: false, wheel: 0 };
export const opts = { sens: 0.0022 };

export interface InputHost {
    canvas: HTMLCanvasElement;
    /** scripted sessions start without pointer lock */
    skipLock: boolean;
    playing(): boolean;
    /** pointer lock was gained, or is unavailable and play should start regardless */
    onEngage(): void;
    /** pointer lock was lost (or Escape pressed without lock) while playing */
    onRelease(): void;
    /** a non-repeating key press while playing */
    onKey(code: string): void;
    onSecondaryButton(): void;
}

export interface Input {
    /** Captures the pointer and starts play. Must be called from a user gesture. */
    engage(): void;
    dispose(): void;
}

const SCROLL_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];

export function attachInput(host: InputHost): Input {
    const { canvas } = host;
    // set when the page cannot take pointer lock at all (some embeds); play then runs on plain mouse deltas
    let noLock = false;
    let wheelT = 0;

    const request = (raw: boolean) => {
        const onError = (e: unknown) => {
            const name = (e as { name?: string } | null)?.name;
            if (raw && name === 'NotSupportedError') return request(false);
            if (name === 'WrongDocumentError') {
                noLock = true;
                host.onEngage();
            }
        };
        try {
            const r = (raw ? canvas.requestPointerLock({ unadjustedMovement: true }) : canvas.requestPointerLock()) as Promise<void> | undefined;
            if (r && r.catch) r.catch(onError);
        } catch (e) {
            onError(e);
        }
    };
    const engage = () => {
        if (host.skipLock || noLock) host.onEngage();
        else request(true);
    };

    const off = [
        listen(canvas, 'click', () => {
            if (host.playing() && document.pointerLockElement !== canvas && !host.skipLock && !noLock) request(true);
        }),
        listen(document, 'pointerlockchange', () => {
            if (document.pointerLockElement === canvas) host.onEngage();
            else if (host.playing()) host.onRelease();
        }),
        listen(document, 'mousemove', (e) => {
            if (document.pointerLockElement === canvas || (noLock && host.playing())) {
                mouse.dx += e.movementX;
                mouse.dy += e.movementY;
            }
        }),
        listen(window, 'mousedown', (e) => {
            if (!host.playing()) return;
            if (e.button === 0) mouse.l = true;
            if (e.button === 2) host.onSecondaryButton();
        }),
        listen(window, 'mouseup', (e) => {
            if (e.button === 0) mouse.l = false;
        }),
        listen(window, 'contextmenu', (e) => e.preventDefault()),
        listen(
            window,
            'wheel',
            (e) => {
                if (host.playing() && performance.now() - wheelT > 180) {
                    wheelT = performance.now();
                    mouse.wheel = 1;
                }
                e.preventDefault();
            },
            { passive: false }
        ),
        listen(window, 'keydown', (e) => {
            if (e.repeat) return;
            keys[e.code] = true;
            if (SCROLL_KEYS.includes(e.code)) e.preventDefault();
            if (!host.playing()) return;
            if (e.code === 'Escape') {
                if (noLock) host.onRelease();
            } else host.onKey(e.code);
        }),
        listen(window, 'keyup', (e) => {
            keys[e.code] = false;
        }),
        listen(window, 'blur', () => {
            for (const k in keys) keys[k] = false;
            mouse.l = false;
        }),
    ];

    return {
        engage,
        dispose() {
            for (const remove of off) remove();
            for (const k in keys) keys[k] = false;
            mouse.l = false;
        },
    };
}

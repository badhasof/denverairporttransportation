import { $scroll } from '@scripts/stores/scroll';

import LocomotiveScroll, {
    type lenisTargetScrollTo,
    type ILenisScrollToOptions
} from 'locomotive-scroll';

export class Scroll {
    static locomotiveScroll: LocomotiveScroll;

    // =============================================================================
    // Lifecycle
    // =============================================================================
    static init() {
        this.locomotiveScroll = new LocomotiveScroll({
            lenisOptions: {
                duration: 0.7,
                lerp: 0.5
            },
            scrollCallback({ scroll, limit, velocity, direction, progress }) {
                $scroll.set({
                    scroll,
                    limit,
                    velocity,
                    direction,
                    progress
                });
            }
        });
    }

    static destroy() {
        this.locomotiveScroll?.destroy();
    }

    // =============================================================================
    // Methods
    // =============================================================================
    static start() {
        this.locomotiveScroll?.start();
    }

    static stop() {
        this.locomotiveScroll?.stop();
    }

    static addScrollElements(container: HTMLElement) {
        this.locomotiveScroll?.addScrollElements(container);
        console.log('Added scroll elements:', container);
    }

    static removeScrollElements(container: HTMLElement) {
        this.locomotiveScroll?.removeScrollElements(container);
        console.log('Removed scroll elements:', container);
    }

    static scrollTo(target: lenisTargetScrollTo, options?: ILenisScrollToOptions) {
        this.locomotiveScroll?.scrollTo(target, options);
    }
}

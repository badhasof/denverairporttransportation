import { $mediaStatus } from '@scripts/stores/deviceStatus';
import { gsap } from 'gsap';

export class HeroVisual extends HTMLElement {
    // UI
    private $line: HTMLElement;
    private $dummyLine: HTMLElement;

    constructor() {
        super();

        this.$line = this.querySelector('[data-line]')!;
        this.$dummyLine = this.querySelector('[data-dummy-line]')!;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        if (!$mediaStatus.get().isFromMedium) return;

        this.animateLines();
    }

    disconnectedCallback() {}

    // =============================================================================
    // Methods
    // =============================================================================
    private animateLines(): void {
        const offset = this.$dummyLine.offsetLeft - this.$line.offsetLeft;

        gsap.from(this.$line, {
            x: offset,
            duration: 1,
            ease: 'power4.inOut',
            delay: 0.8,
            clearProps: 'all'
        });
    }
}

import { subscribeKeys } from 'nanostores';
import { $screenDebounce } from '../stores/screen';
import { $mediaStatus } from '../stores/deviceStatus';

export class ParallaxImage extends HTMLElement {
    $parallaxElement: any;
    parallaxSpeed: number;
    unbindTouchScreenListener: () => void;
    wHeight: number;

    constructor() {
        super();

        // Binding
        this.onResize = this.onResize.bind(this);
        this.onTouchScreenChange = this.onTouchScreenChange.bind(this);

        // UI
        this.$parallaxElement = this.querySelector('[data-scroll-speed]');
        this.parallaxSpeed = parseFloat(this.$parallaxElement.dataset.scrollSpeed) || 0;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        this.unbindTouchScreenListener = subscribeKeys(
            $mediaStatus,
            ['isTouchScreen'],
            this.onTouchScreenChange
        );
    }

    disconnectedCallback() {
        this.unbindTouchScreenListener?.();
    }

    // =============================================================================
    // Events
    // =============================================================================
    bindEvents() {
        this.unbindTouchScreenListener = $screenDebounce.subscribe(this.onResize);
    }

    unbindEvents() {
        this.unbindTouchScreenListener?.();
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    onTouchScreenChange(value) {
        if (value.isSmall) {
            this.unbindEvents();
        } else {
            this.bindEvents();
        }
    }

    onResize() {
        this.wHeight = window.innerHeight;
        this.computeScale();
    }

    computeScale() {
        const elHeight = this.offsetHeight;
        const distance = Math.abs(this.wHeight * this.parallaxSpeed);
        const scale = 1 + distance / elHeight;
        this.style.setProperty('--parallax-scale', scale.toString());
    }
}

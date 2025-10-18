import { $screenDebounce } from '../stores/screen';
import BezierEasing from 'bezier-easing';

interface ScrollProgressEventDetail {
    progress: number;
}

export class AbstractMask extends HTMLElement {
    static SCROLL_PROGRESS_EVENT = 'onScrollProgress';
    static PROGRESS_EASING = BezierEasing(0.35, 0, 0, 1);

    private uid: string | undefined;
    private $fromRef: HTMLElement | null = null;
    private $toRef: HTMLElement | null = null;
    private $focusArea: HTMLElement | null = null;
    private unbindScreenListener: (() => void) | null = null;

    constructor() {
        super();

        // Data
        this.uid = this.dataset.uid;

        // UI
        this.$fromRef = this.querySelector<HTMLElement>('[data-mask-from-ref]');
        this.$toRef = this.querySelector<HTMLElement>('[data-mask-to-ref]');
        this.$focusArea = this.querySelector('[data-focus-area]');
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback(): void {
        this.bindEvents();
    }

    disconnectedCallback(): void {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
        this.addEventListener('focusin', this.focusIn);

        if (this.uid) {
            window.addEventListener(
                `${AbstractMask.SCROLL_PROGRESS_EVENT}${this.uid}`,
                this.onScrollProgress as EventListener
            );
        }
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;
        this.removeEventListener('focusin', this.focusIn);

        if (this.uid) {
            window.removeEventListener(
                `${AbstractMask.SCROLL_PROGRESS_EVENT}${this.uid}`,
                this.onScrollProgress as EventListener
            );
        }
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onScrollProgress = (e: CustomEvent<ScrollProgressEventDetail>): void => {
        const { progress } = e.detail;
        const eased = AbstractMask.PROGRESS_EASING(progress);
        this.style.setProperty('--mask-progress', eased.toString());
    };

    private onResize = (): void => {
        this.setMetrics();
    };

    private focusIn = (event: FocusEvent): void => {
        this.$focusArea?.scrollIntoView();
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private setMetrics(): void {
        if (!this.$fromRef || !this.$toRef) return;

        const fromWidth = this.$fromRef.offsetWidth;
        const fromHeight = this.$fromRef.offsetHeight;
        const toWidth = this.$toRef.offsetWidth;
        const toHeight = this.$toRef.offsetHeight;

        const coverScaleRatio = Math.max(fromWidth / toWidth, fromHeight / toHeight);
        this.style.setProperty('--cover-ratio', coverScaleRatio.toString());
    }
}

import BezierEasing from 'bezier-easing';

export class SmoothProgress extends HTMLElement {
    private smoothProgress: number;
    private easingType: string;

    private easings: Object;

    private uid: string;

    static readonly SCROLL_PROGRESS_EVENT = 'onScrollProgress';

    constructor() {
        super();

        // Easing values
        this.easings = {
            power1In: BezierEasing(0.55, 0.085, 0.68, 0.53),
            power1Out: BezierEasing(0.25, 0.46, 0.45, 0.94),
            power1InOut: BezierEasing(0.455, 0.03, 0.515, 0.955),
            power2In: BezierEasing(0.55, 0.055, 0.675, 0.19),
            power2Out: BezierEasing(0.215, 0.61, 0.355, 1.0),
            power2InOut: BezierEasing(0.645, 0.045, 0.355, 1.0),
            power3In: BezierEasing(0.895, 0.03, 0.685, 0.22),
            power3Out: BezierEasing(0.165, 0.84, 0.44, 1.0),
            power3InOut: BezierEasing(0.77, 0.0, 0.175, 1.0),
            power4In: BezierEasing(0.755, 0.05, 0.855, 0.06),
            power4Out: BezierEasing(0.23, 1.0, 0.32, 1.0),
            power4InOut: BezierEasing(0.86, 0.0, 0.07, 1.0)
        };

        this.easingType = this.dataset.easing || 'power2InOut';
        this.uid = this.dataset.uid || '';
    }

    // =============================================================================
    // Lifecyle
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
        window.addEventListener(
            `${SmoothProgress.SCROLL_PROGRESS_EVENT}${this.uid}`,
            this.onScrollProgress
        );
    }

    private unbindEvents(): void {
        window.removeEventListener(
            `${SmoothProgress.SCROLL_PROGRESS_EVENT}${this.uid}`,
            this.onScrollProgress
        );
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    onScrollProgress = (e: CustomEvent): void => {
        const progress = e.detail.progress;
        this.smoothProgress = this.easings[this.easingType](progress);
        this.computeProgress();
    };

    // =============================================================================
    // Methods
    // =============================================================================
    computeProgress() {
        this.style.setProperty('--smooth-progress', String(this.smoothProgress));
    }
}

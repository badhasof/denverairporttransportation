import { $screenDebounce } from '@scripts/stores/screen';
import { $scroll } from '@scripts/stores/scroll';
import { $mediaStatus } from '@scripts/stores/deviceStatus';
import { mapRange, clamp } from '@scripts/utils/maths';
import BezierEasing from 'bezier-easing';
import gsap from 'gsap';

export class HeroHome extends HTMLElement {
    static ANIMATION = {
        EASING: BezierEasing(0.15, 0.61, 0.0, 1.0)
    };

    // UI
    private $mask: HTMLElement | null = null;
    private $inner: HTMLElement | null = null;
    private $images: NodeListOf<HTMLElement> | null = null;
    private $dummyVisual: HTMLElement | null = null;
    private $focusArea: HTMLElement | null = null;

    // Listeners
    private unbindScreenListener: (() => void) | null = null;
    private unbindScrollListener: (() => void) | null = null;

    // Data
    private scaleRatio: number;
    private elHeight: number;
    private timeline: gsap.core.Timeline | null = null;

    private progressObj: {
        current: number;
        items: Array<{
            progress: number;
        }>;
    };

    private opacityProgress: {
        current: number;
        from: number;
        to: number;
    };

    private clip: {
        x: number;
        y: number;
    };

    private vHeight: number;

    constructor() {
        super();

        // UI
        this.$mask = this.querySelector('[data-mask]');
        this.$inner = this.querySelector('[data-inner]');
        this.$images = this.querySelectorAll('[data-image]');
        this.$dummyVisual = this.querySelector('[data-dummy-visual]');
        this.$focusArea = this.querySelector('[data-focus-area]');

        // Data
        this.clip = {
            x: 0,
            y: 0
        };

        this.opacityProgress = {
            current: 0,
            from: 0,
            to: 0.2
        };

        this.progressObj = {
            current: 0,
            items: []
        };
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        if ($mediaStatus.get().isReducedMotion || $mediaStatus.get().isTouchScreen) {
            return;
        }

        if (this.$images) {
            for (let i = 0; i < this.$images.length + 1; i++) {
                this.progressObj.items.push({ progress: 0 });
            }
        }

        this.timeline = gsap.timeline({ paused: true });

        this.timeline.to(this.progressObj.items, {
            duration: 1,
            stagger: 0.1,
            progress: 1,
            ease: 'none'
        });

        this.computeMetrics();
        this.bindEvents();
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
        this.unbindScrollListener = $scroll.subscribe(this.onScroll);
        this.addEventListener('focusin', this.focusIn);
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;

        this.unbindScrollListener?.();
        this.unbindScrollListener = null;

        this.removeEventListener('focusin', this.focusIn);
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onScroll = (): void => {
        const scroll = $scroll.get().scroll;
        this.progressObj.current = clamp(
            0,
            1,
            mapRange(0, this.elHeight - this.vHeight, 0, 1, scroll)
        );
        this.timeline?.progress(this.progressObj.current);

        this.computeClip();
        this.computeScale();
        this.computeImagesProgress();
        this.computeOpacity();
    };

    private onResize = (): void => {
        this.computeMetrics();
        this.onScroll();
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private computeMetrics(): void {
        this.vHeight = window.innerHeight;
        this.elHeight = this.clientHeight || 0;

        if (this.$mask && this.$dummyVisual) {
            this.clip.x = (this.$mask.clientWidth - this.$dummyVisual.clientWidth) / 2;
            this.clip.y = (this.$mask.clientHeight - this.$dummyVisual.clientHeight) / 2;

            const ratio = {
                initial: this.$mask.clientWidth / this.$mask.clientHeight,
                final: this.$dummyVisual.clientWidth / this.$dummyVisual.clientHeight
            };

            if (ratio.initial > ratio.final) {
                this.scaleRatio = 1 - this.$dummyVisual.clientHeight / this.$mask.clientHeight;
            } else {
                this.scaleRatio = 1 - this.$dummyVisual.clientWidth / this.$mask.clientWidth;
            }
        }
    }

    private computeClip(): void {
        const progress = HeroHome.ANIMATION.EASING(this.progressObj.items[0].progress);

        const clip = {
            x: progress * this.clip.x,
            y: progress * this.clip.y
        };

        if (this.$mask) {
            this.$mask.style.clipPath = `inset(${clip.y}px ${clip.x}px round var(--radius-md))`;
        }
    }

    private computeScale(): void {
        const progress = HeroHome.ANIMATION.EASING(this.progressObj.items[0].progress);
        const scale = 1 - progress * (0.75 * this.scaleRatio);
        if (this.$inner) {
            this.$inner.style.transform = `scale(${scale})`;
        }
    }

    private computeImagesProgress(): void {
        if (!this.$images) return;
        this.$images.forEach(($image, index) => {
            const progress = HeroHome.ANIMATION.EASING(this.progressObj.items[index + 1].progress);
            $image.style.setProperty('--image-progress', String(progress));
        });
    }

    private computeOpacity(): void {
        this.opacityProgress.current = clamp(
            0,
            1,
            mapRange(
                this.opacityProgress.from,
                this.opacityProgress.to,
                0,
                1,
                this.progressObj.current
            )
        );

        this.style.setProperty('--hero-ui-opacity', String(1 - this.opacityProgress.current));
    }

    focusIn = (event: FocusEvent): void => {
        this.$focusArea?.scrollIntoView();
    };
}

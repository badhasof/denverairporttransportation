import { roundNumber } from '@scripts/utils/maths';
import gsap from 'gsap';
import { isTouchDevice } from '@scripts/utils/is';

export class HoverVideo extends HTMLElement {
    // UI
    private $toggler: any;
    private $video: HTMLVideoElement;
    private $circle: any;

    // Data
    private progress: {
        default: number;
        smooth: number;
    };
    private lerp: number;
    private isRafPlaying: boolean;
    private rafIncrement: number;

    // Classes
    static CLASS_PLAYING = 'is-playing';

    constructor() {
        super();

        // UI
        this.$toggler = this.closest('[data-hover-video-toggler]') || (this as HTMLElement);
        this.$video = this.querySelector('[data-video]') as HTMLVideoElement;
        this.$circle = this.querySelector('[data-circle]');

        // Progress
        this.progress = {
            default: 0,
            smooth: 0
        };

        this.lerp = 0.1;

        // Raf
        this.isRafPlaying = false;
        this.rafIncrement = 0;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback(): void {
        this.bindEvents();
        this.style.setProperty('--circle-length', `${this.$circle.getTotalLength()}px`);
    }

    disconnectedCallback(): void {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.addEventListener('click', this.onClick);

        if (!isTouchDevice()) {
            this.$toggler.addEventListener('mouseenter', this.onMouseEnter);
            this.$toggler.addEventListener('mouseleave', this.onMouseLeave);
        }
    }

    private unbindEvents(): void {
        this.removeEventListener('click', this.onClick);

        if (!isTouchDevice()) {
            this.$toggler.removeEventListener('mouseenter', this.onMouseEnter);
            this.$toggler.removeEventListener('mouseleave', this.onMouseLeave);
        }

        this.pause();
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onMouseEnter = (): void => {
        this.play();
    };

    private onMouseLeave = (): void => {
        this.pause();
    };

    private onClick = (event: MouseEvent): void => {
        this.$video.paused ? this.play() : this.pause();
    };

    private onVideoEnded = (): void => {
        this.$video.currentTime = 0;
        this.classList.remove(HoverVideo.CLASS_PLAYING);
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private play(): void {
        if (this.$video && !this.$video.paused) {
            return;
        }

        this.$video.play().catch((error) => {
            console.warn('InlineVideo: Error playing video:', error);
            return;
        });

        this.classList.add(HoverVideo.CLASS_PLAYING);
        this.playRaf();

        this.$video.addEventListener('ended', this.onVideoEnded);
    }

    private pause(): void {
        this.$video?.pause();
        this.classList.remove(HoverVideo.CLASS_PLAYING);
        this.$video?.removeEventListener('ended', this.onVideoEnded);
    }

    private updateProgress(): void {
        if (this.$video.duration != null && this.$video.duration > 0) {
            this.progress.default = this.$video.currentTime / this.$video.duration;
        } else {
            this.progress.default = 0;
        }
    }

    // RAF
    ///////////////
    private playRaf(): void {
        if (this.isRafPlaying) return;

        this.isRafPlaying = true;
        this.rafIncrement = 0;
        gsap.ticker.add(this.updateRaf);
    }

    private pauseRaf(): void {
        if (!this.isRafPlaying) return;

        this.isRafPlaying = false;
        gsap.ticker.remove(this.updateRaf);
    }

    private updateRaf = (): void => {
        // Update default progress value + input value
        this.updateProgress();

        // Lerp progress
        if (this.progress.default > 0.02) {
            this.progress.smooth += (this.progress.default - this.progress.smooth) * this.lerp;
        } else {
            this.progress.smooth = 0;
        }
        // Update progress
        this.style.setProperty('--video-progress', `${this.progress.smooth}`);

        // Add delay before stopping raf (if not playing)
        // ==============================================
        if (roundNumber(this.progress.smooth, 3) == roundNumber(this.progress.default, 3)) {
            this.rafIncrement++;

            if (this.rafIncrement >= 30) {
                this.pauseRaf();
            }
        }
    };
}

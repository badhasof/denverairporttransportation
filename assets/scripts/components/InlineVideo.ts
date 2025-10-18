import { $mediaStatus } from '@scripts/stores/deviceStatus';

interface InviewEventDetail {
    way: 'enter' | 'exit';
}

export class InlineVideo extends HTMLElement {
    static EVENTS = {
        INVIEW: 'inline-video-inview'
    };

    // UI
    private $video: HTMLVideoElement;

    // State
    private isInview: boolean;

    constructor() {
        super();

        // Flags
        this.isInview = false;

        // UI
        this.$video = this.querySelector('[data-video]') as HTMLVideoElement;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback(): void {
        this.bindEvents();

        if (this.isInview && !$mediaStatus.get().isReducedMotion) {
            this.play();
        }
    }

    disconnectedCallback(): void {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        window.addEventListener(
            `${InlineVideo.EVENTS.INVIEW}-${this.id}`,
            this.onInview as EventListener
        );
    }

    private unbindEvents(): void {
        window.removeEventListener(
            `${InlineVideo.EVENTS.INVIEW}-${this.id}`,
            this.onInview as EventListener
        );

        this.pause();
    }

    // =============================================================================
    // Callbacks
    // =============================================================================

    private onInview = (e: CustomEvent<InviewEventDetail>): void => {
        if (e.detail.way === 'enter' && !$mediaStatus.get().isReducedMotion) {
            this.isInview = true;
            this.play();
        } else {
            this.isInview = false;
            this.pause();
        }
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
        });
    }

    private pause(): void {
        if (this.$video && this.$video.paused) {
            return;
        }
        this.$video.pause();
    }
}

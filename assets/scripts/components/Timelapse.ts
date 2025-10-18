import { $mediaStatus } from '../stores/deviceStatus';

export class Timelapse extends HTMLElement {
    private $video: HTMLVideoElement;
    private $circle: SVGGeometryElement;

    constructor() {
        super();

        // UI
        this.$video = this.querySelector('video') as HTMLVideoElement;
        this.$circle = this.querySelector('[data-circle]') as SVGGeometryElement;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback(): void {
        if ($mediaStatus.get().isReducedMotion) return;

        this.$video.addEventListener('loadedmetadata', this.onVideoLoadedMetadata);
        this.style.setProperty('--circle-length', `${this.$circle.getTotalLength()}px`);
    }

    disconnectedCallback(): void {}

    private onVideoLoadedMetadata = (): void => {
        this.style.setProperty('--video-duration', `${this.$video.duration}s`);
        this.$video.removeEventListener('loadedmetadata', this.onVideoLoadedMetadata);
    };
}

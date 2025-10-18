/* eslint-disable @typescript-eslint/no-unused-expressions */
import gsap from 'gsap';
import { $screenDebounce, type ScreenDebounceValues } from '@stores/screen';
import { $mediaStatus } from '@stores/deviceStatus';
import { SequenceEvents } from '@utils/sequenceEvents';

// Define custom types for sequence loading types
type SequenceLoadingType = 'auto' | 'lazy';
type LoadingState = 'loading' | 'loaded-enough' | 'loaded' | 'loading-error' | '';

interface SequenceEventMap {
    sequenceready: CustomEvent<{ uid: string; totalImages: number; loadedImages: number }>;
    sequenceloaded: CustomEvent<{ uid: string; totalImages: number; duration: number }>;
    sequenceerror: CustomEvent<{ uid: string; error: string; imageIndex?: number }>;
    sequenceplaystart: CustomEvent<{ uid: string }>;
    sequenceplayend: CustomEvent<{ uid: string }>;
    sequenceprogress: CustomEvent<{ uid: string; progress: number; frameIndex: number }>;
}

declare global {
    interface HTMLElementEventMap extends SequenceEventMap {}
}

// Interface for image sequence configuration
interface ImageSequenceConfig {
    baseUrl: string;
    prefix: string;
    index0: boolean;
    timeByFold: number;
    hasPaddingIndex: boolean;
    frames: number;
    prioritizedFrames: number;
    duration: number;
    fps: number;
    extension: string;
    canPlayThreshold: number;
    sources: {
        desktop: {
            path: string;
            width: number;
            height: number;
        };
        mobile: {
            path: string;
            width: number;
            height: number;
        };
    };
}

export default class Sequence extends HTMLElement {
    // =============================================================================
    // Private properties
    // =============================================================================
    private unbindScreenListener: (() => void) | null = null;
    private readonly $canvas: HTMLCanvasElement;
    private readonly $wrapper: HTMLElement;
    private readonly $lazyTrigger: HTMLElement | null;

    // Video properties
    private duration = 0;
    private readonly progress = { value: 0 }; // Track video progress
    private readonly loading: SequenceLoadingType;

    // GSAP timeline for player controls
    public playerTimeline: gsap.core.Timeline | null = null; // GSAP timeline for controls
    private isInitialized = false; // Flag to prevent re-initialization
    public loadingState: LoadingState = '';

    // Image sequence configuration
    public readonly imagesSequence: ImageSequenceConfig | null;

    // Canvas properties
    private readonly ctx: CanvasRenderingContext2D | null;
    private readonly dpr = window.devicePixelRatio;
    private canvasImageWidth = 0;
    private canvasImageHeight = 0;
    private drawingWidth = 0;
    private drawingHeight = 0;
    private canvasWidth = 0;
    private canvasHeight = 0;
    private canvasCenterX = 0;
    private canvasCenterY = 0;
    private readonly canvasImagePath: string | undefined;

    // Image loading properties
    private imagesBuckets: { value: number; bucket: number }[][] = [];
    private readonly images: HTMLImageElement[] = [];
    private isSequenceImageCanPlay = false;
    private totalLoadedImages = 0;
    private currentFrameIndex = 0;
    private isLoadRequested = false;
    private readonly uid: string;

    // Callbacks
    private onReverseSequenceCallback: () => void = () => {};
    private onCompleteSequenceCallback: () => void = () => {};

    // Constants
    private static readonly CANVAS_ALIGNMENT = 4.0; // For optimal GPU performance

    constructor() {
        super();

        // Validate required elements early
        this.$canvas = this.querySelector('[data-sequence-images]') as HTMLCanvasElement;
        this.$wrapper = this.querySelector('[data-sequence-wrapper]') as HTMLElement;
        this.$lazyTrigger = this.querySelector('[data-sequence-lazy-trigger]');

        if (!this.$canvas || !this.$wrapper) {
            throw new Error(
                'Sequence component requires [data-sequence-images] and [data-sequence-wrapper] elements'
            );
        }

        // Parse and validate configuration with better error handling
        this.imagesSequence = this.parseImageSequenceConfig();

        // Set configuration with better defaults
        this.uid =
            this.getAttribute('data-uid') || `sequence-${Math.random().toString(36).substr(2, 9)}`;
        this.loading = (this.getAttribute('data-loading') as SequenceLoadingType) || 'auto';

        // Initialize canvas context early
        this.ctx = this.$canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D context from canvas element');
        }

        // Set canvas image path based on device
        this.canvasImagePath = $mediaStatus.get().isPortrait
            ? this.imagesSequence?.sources.mobile.path
            : this.imagesSequence?.sources.desktop.path;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        if (this.isInitialized) return;

        this.init();
        this.bindEvents();
        this.bindCanvasEvents();
    }

    disconnectedCallback() {
        this.cleanup();
    }

    // =============================================================================
    // Private initialization methods
    // =============================================================================
    private parseImageSequenceConfig(): ImageSequenceConfig | null {
        if (!this.dataset.imagesSequence) return null;

        try {
            const config = JSON.parse(this.dataset.imagesSequence) as Partial<ImageSequenceConfig>;

            if (config.canPlayThreshold === undefined) {
                config.canPlayThreshold = 1 / (config.frames || 1);
            }
            if (config.prioritizedFrames === undefined) {
                config.prioritizedFrames = 0;
            }

            return config as ImageSequenceConfig;
        } catch (error) {
            console.error('Invalid imagesSequence configuration:', error);
            return null;
        }
    }

    private cleanup(): void {
        this.unbindEvents();
        this.unbindCanvasEvents();
        this.playerTimeline?.kill();
        this.playerTimeline = null;
        this.isInitialized = false;
    }

    // =============================================================================
    // Event handling
    // =============================================================================
    private bindEvents(): void {
        if (this.loading === 'lazy') {
            window.addEventListener(
                `${this.uid}${SequenceEvents.LAZY_CALL}`,
                this.onLazyCall as EventListener,
                { once: true }
            );
        }
    }

    private unbindEvents(): void {
        if (this.loading === 'lazy') {
            window.removeEventListener(
                `${this.uid}${SequenceEvents.LAZY_CALL}`,
                this.onLazyCall as EventListener
            );
        }
    }

    private bindCanvasEvents(): void {
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
    }

    private unbindCanvasEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;
    }

    // =============================================================================
    // Events dispatch methods
    // =============================================================================
    private dispatchSequenceReady(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceready', {
                detail: {
                    uid: this.uid,
                    totalImages: this.imagesSequence?.frames || 0,
                    loadedImages: this.totalLoadedImages
                },
                bubbles: true
            })
        );
    }

    private dispatchSequenceLoaded(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceloaded', {
                detail: {
                    uid: this.uid,
                    totalImages: this.imagesSequence?.frames || 0,
                    duration: this.duration
                },
                bubbles: true
            })
        );
    }

    private dispatchSequenceError(error: string, imageIndex?: number): void {
        this.dispatchEvent(
            new CustomEvent('sequenceerror', {
                detail: {
                    uid: this.uid,
                    error,
                    imageIndex
                },
                bubbles: true
            })
        );
    }

    private dispatchSequencePlayStart(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceplaystart', {
                detail: {
                    uid: this.uid
                },
                bubbles: true
            })
        );
    }

    private dispatchSequencePlayEnd(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceplayend', {
                detail: {
                    uid: this.uid
                },
                bubbles: true
            })
        );
    }
    private dispatchSequencePlayPause(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceplaypause', {
                detail: {
                    uid: this.uid
                },
                bubbles: true
            })
        );
    }

    private dispatchSequenceProgress(): void {
        this.dispatchEvent(
            new CustomEvent('sequenceprogress', {
                detail: {
                    uid: this.uid,
                    progress: this.progress.value,
                    frameIndex: this.currentFrameIndex
                },
                bubbles: false // Progress events shouldn't bubble (performance)
            })
        );
    }

    // =============================================================================
    // Callback methods
    // =============================================================================
    private onLazyCall = (): void => {
        this.$canvas && this.loadImages();
    };

    private onResize = ({ width, height }: ScreenDebounceValues): void => {
        this.$canvas && this.setCanvasSize(width, height);
    };

    private onLoadingState = (): void => {
        this.updateLoadingState('loading');
    };

    private onLoadedEnoughState = (): void => {
        this.updateLoadingState('loaded-enough');
        this.dispatchSequenceReady();
    };

    private onLoadedState = (): void => {
        this.updateLoadingState('loaded');
        this.dispatchSequenceLoaded();
    };

    private onErrorState = (): void => {
        this.updateLoadingState('loading-error');
        this.dispatchSequenceError('Loading error occurred');
    };

    private handleImageError = (index: number): void => {
        console.error(`Failed to load image at index ${index}`);
        this.dispatchSequenceError(`Failed to load image at index ${index}`, index);
    };

    // =============================================================================
    // Core methods
    // =============================================================================
    private init = (): void => {
        if (this.isInitialized) return;

        this.onLoadingState();
        this.isInitialized = true;

        if (this.$canvas && this.imagesSequence) {
            this.duration = this.imagesSequence.duration;

            // Set canvas dimensions
            this.updateCanvasDimensions();

            this.setSequenceTimeline();

            // Start loading process
            requestAnimationFrame(() => {
                if (this.shouldAutoLoad()) {
                    this.loadImages();
                }
            });
        }
    };

    private shouldAutoLoad = (): boolean => {
        return (
            this.loading === 'auto' ||
            (this.loading === 'lazy' && !!this.$lazyTrigger?.classList.contains('is-inview'))
        );
    };

    private updateCanvasDimensions = (): void => {
        if (!this.imagesSequence) return;

        const isPortrait = $mediaStatus.get().isPortrait;
        const source = isPortrait
            ? this.imagesSequence.sources.mobile
            : this.imagesSequence.sources.desktop;

        this.canvasImageWidth = source.width;
        this.canvasImageHeight = source.height;
    };

    private updateLoadingState = (state: LoadingState): void => {
        // Remove previous state class
        if (this.loadingState) {
            this.classList.remove(`-${this.loadingState}`);
        }

        this.loadingState = state;

        // Add new state class
        if (state) {
            this.classList.add(`-${state}`);
        }
    };

    // =============================================================================
    // Loading methods
    // =============================================================================
    public loadImages = (): void => {
        if (this.imagesBuckets.length || !this.imagesSequence || this.isLoadRequested) return;

        this.isLoadRequested = true;
        this.images.length = 0;
        this.images.length = this.imagesSequence.frames;

        const indices = Array.from({ length: this.imagesSequence.frames }, (_, i) => i).slice(
            this.imagesSequence.prioritizedFrames,
            this.imagesSequence.frames
        );

        const initialArray: Record<number, { value: number; bucket: number }> = {};
        const buckets = this._splitArray(initialArray, indices, 0);

        this.imagesBuckets = [];
        Object.values(buckets).forEach((item) => {
            if (!this.imagesBuckets[item.bucket])
                this.imagesBuckets[item.bucket] = [] as { value: number; bucket: number }[];
            this.imagesBuckets[item.bucket].push({
                value: item.value,
                bucket: item.bucket + 1
            });
        });

        const priorityBucket = [] as { value: number; bucket: number }[];
        for (let i = 0; i < this.imagesSequence.prioritizedFrames; i++) {
            priorityBucket.push({ value: i, bucket: 0 });
        }
        this.imagesBuckets.unshift(priorityBucket);

        this.loadImage(0);
        this.loadImage(this.imagesSequence.frames - 1);
        this.loadBucket();
    };

    private loadImage(index: number, callback?: (index: number) => void): void {
        if (!this.imagesSequence) return;

        if (this.images[index]) {
            callback?.(index);
            return;
        }

        const img = new Image();
        img.onload = () => this.handleImageLoad(index, img, callback);
        img.onerror = () => this.handleImageError(index);
        img.src = this.generateImageSrc(index);
        img.setAttribute('index', index.toString());
    }

    private handleImageLoad = (
        index: number,
        img: HTMLImageElement,
        callback?: (index: number) => void
    ): void => {
        this.totalLoadedImages++;
        this.images[index] = img;
        callback?.(index);

        // Threshold logic
        if (
            this.imagesSequence &&
            this.totalLoadedImages >
                this.imagesSequence.frames * this.imagesSequence.canPlayThreshold &&
            !this.isSequenceImageCanPlay
        ) {
            this.isSequenceImageCanPlay = true;

            requestAnimationFrame(() => {
                this.renderSequence();
                this.onLoadedEnoughState();
            });
        }
    };

    private generateImageSrc = (index: number): string => {
        if (!this.imagesSequence) return '';

        const normalizedIndex = this.imagesSequence.index0 === true ? index : index + 1;
        const paddedIndex = this.imagesSequence.hasPaddingIndex
            ? String(normalizedIndex).padStart(String(this.imagesSequence.frames).length, '0')
            : String(normalizedIndex);

        const basePath = this._removeTrailingSlash(this.imagesSequence.baseUrl);
        const imagePath = this.canvasImagePath
            ? this._removeTrailingSlash(this.canvasImagePath!) + '/'
            : '';

        return `${basePath}/${imagePath}${this.imagesSequence.prefix}${paddedIndex}.${this.imagesSequence.extension}`;
    };

    private loadBucket = (): void => {
        if (!this.isInitialized) return;

        const bucket = this.imagesBuckets.shift();

        if (!bucket) {
            requestAnimationFrame(() => {
                this.onLoadedState();
                this.renderSequence();
            });
            return;
        }

        const promises = bucket.map(({ value }) => {
            return new Promise((resolve) => {
                this.loadImage(value, resolve);
            });
        });

        Promise.all(promises)
            .then(() => {
                this.loadBucket();
                this.renderSequence();
            })
            .catch((error) => {
                console.error(error);
                this.onErrorState();
            });
    };

    // =============================================================================
    // Timeline and animation methods
    // =============================================================================
    private setSequenceTimeline = (): void => {
        this.playerTimeline?.kill();

        requestAnimationFrame(() => {
            this.playerTimeline = gsap.timeline({
                paused: true,
                onReverseComplete: () => this.onReverseSequenceCallback(),
                onComplete: () => this.onCompleteSequenceCallback()
            });

            this.playerTimeline.to(this.progress, {
                value: 1,
                ease: 'none',
                duration: this.duration,
                onUpdate: () => {
                    this.renderSequence();
                }
            });
        });
    };

    private setCanvasSize = (windowWidth: number, windowHeight: number): void => {
        const width = this.$wrapper.offsetWidth || windowWidth;
        const height = this.$wrapper.offsetHeight || windowHeight;

        // Align to 4-pixel boundaries for better GPU performance
        this.canvasWidth =
            Math.ceil((this.dpr * width) / Sequence.CANVAS_ALIGNMENT) * Sequence.CANVAS_ALIGNMENT;
        this.canvasHeight =
            Math.ceil((this.dpr * height) / Sequence.CANVAS_ALIGNMENT) * Sequence.CANVAS_ALIGNMENT;

        this.$canvas.width = this.canvasWidth;
        this.$canvas.height = this.canvasHeight;
        this.$canvas.style.width = `${width}px`;
        this.$canvas.style.height = `${height}px`;

        this.calculateDrawingDimensions();
        this.drawFrame();
    };

    private calculateDrawingDimensions = (): void => {
        const scaleX = this.canvasWidth / this.canvasImageWidth;
        const scaleY = this.canvasHeight / this.canvasImageHeight;
        const scale = Math.max(scaleX, scaleY);

        this.drawingWidth = this.canvasImageWidth * scale;
        this.drawingHeight = this.canvasImageHeight * scale;
        this.canvasCenterX = (this.canvasWidth - this.drawingWidth) * 0.5;
        this.canvasCenterY = (this.canvasHeight - this.drawingHeight) * 0.5;
    };

    // =============================================================================
    // Public control methods
    // =============================================================================
    public playSequence = (): void => {
        if (!this.playerTimeline) return;

        this.playerTimeline.play();
        this.dispatchSequencePlayStart();

        this.playerTimeline.eventCallback('onComplete', () => {
            this.dispatchSequencePlayEnd();
        });
    };

    public restartSequence = (): void => {
        if (!this.isReady) {
            console.warn('Sequence not ready yet, ignoring restart');
            return;
        }

        this.playerTimeline?.restart();
        this.dispatchSequencePlayStart();

        this.playerTimeline?.eventCallback('onComplete', () => {
            this.dispatchSequencePlayEnd();
        });
    };

    public pauseSequence = (): void => {
        if (!this.playerTimeline) return;

        this.playerTimeline.pause();
        this.dispatchSequencePlayPause();
    };

    public reverseSequence = (): void => {
        if (!this.isReady) {
            console.warn('Sequence not ready yet, ignoring reverse');
            return;
        }

        this.playerTimeline?.reverse();
        this.dispatchSequencePlayStart();

        this.playerTimeline?.eventCallback('onReverseComplete', () => {
            this.dispatchSequencePlayEnd();
        });
    };

    public setTimelineProgress = (progress: number): void => {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        this.playerTimeline?.pause().progress(clampedProgress);
    };

    // =============================================================================
    // Rendering methods
    // =============================================================================
    private setCurrentFrameIndex = (): void => {
        const currentFrameIndex =
            Math.min(
                Math.floor(this.progress.value * this.totalLoadedImages),
                this.totalLoadedImages - 1
            ) % this.totalLoadedImages;

        if (this.images[currentFrameIndex]) {
            this.currentFrameIndex = currentFrameIndex;
        } else {
            let nearestPrev = Number.MAX_SAFE_INTEGER;
            let nearestNext = Number.MAX_SAFE_INTEGER;

            for (let i = currentFrameIndex; i >= 0; i--) {
                if (this.images[i]) {
                    nearestPrev = i;
                    break;
                }
            }

            for (let i = currentFrameIndex; i < this.images.length; i++) {
                if (this.images[i]) {
                    nearestNext = i;
                    break;
                }
            }

            if (
                Math.abs(currentFrameIndex - nearestPrev) <=
                Math.abs(currentFrameIndex - nearestNext)
            ) {
                if (this.images[nearestPrev]) this.currentFrameIndex = nearestPrev;
            } else {
                if (this.images[nearestNext]) this.currentFrameIndex = nearestNext;
            }
        }
    };

    private drawFrame = (): void => {
        if (!this.ctx || !this.images.length) return;

        const image = this.images[this.currentFrameIndex];
        if (!image) return;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.drawImage(
            image,
            this.canvasCenterX,
            this.canvasCenterY,
            this.drawingWidth,
            this.drawingHeight
        );
    };

    private renderSequence = (): void => {
        this.setCurrentFrameIndex();
        this.drawFrame();
        this.dispatchSequenceProgress();
    };

    // =============================================================================
    // Public getters
    // =============================================================================
    public get isReady(): boolean {
        return this.loadingState === 'loaded-enough' || this.loadingState === 'loaded';
    }

    // =============================================================================
    // Public methods
    // =============================================================================
    public resize = ({ width, height }: { width: number; height: number }): void => {
        this.onResize({ width, height });
    };

    // =============================================================================
    // Convenience methods for event handling
    // =============================================================================
    public onReady(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceready', callback);
        return () => this.removeEventListener('sequenceready', callback);
    }

    public onLoaded(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceloaded', callback);
        return () => this.removeEventListener('sequenceloaded', callback);
    }

    public onError(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceerror', callback);
        return () => this.removeEventListener('sequenceerror', callback);
    }

    public onProgress(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceprogress', callback);
        return () => this.removeEventListener('sequenceprogress', callback);
    }

    public onPlayStart(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceplaystart', callback);
        return () => this.removeEventListener('sequenceplaystart', callback);
    }

    public onPlayEnd(callback: (event: CustomEvent) => void): () => void {
        this.addEventListener('sequenceplayend', callback);
        return () => this.removeEventListener('sequenceplayend', callback);
    }

    // =============================================================================
    // Utility methods
    // =============================================================================
    private _splitArray = (
        array: Record<number, { value: number; bucket: number }>,
        items: number[],
        depth: number
    ): Record<number, { value: number; bucket: number }> => {
        const half = Math.floor(items.length / 2);
        const key = items[half];

        const value = array[key] ? array[key].value : key;

        array[key] = { value, bucket: depth };

        const left = items.slice(0, half);
        const right = items.slice(half + 1);

        if (left.length) this._splitArray(array, left, depth + 1);
        if (right.length) this._splitArray(array, right, depth + 1);

        return array;
    };

    private _removeTrailingSlash = (url: string): string => {
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };
}

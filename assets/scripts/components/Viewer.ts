import type Sequence from './Sequence';
import { $mediaStatus } from '@stores/deviceStatus';
import gsap from 'gsap';
import { createFocusTrap, type FocusTrap } from 'focus-trap';
import { clamp, mapRange, roundToDecimals } from '@utils/maths';
import type Turntable from './Turntable';
import { $screen } from '@scripts/stores/screen';
import { getFocusableElements } from '@utils/focusableElements';
import { Scroll } from '@scripts/classes/Scroll';

interface DragState {
    startX: number;
    lastX: number;
    oldX: number;
    x: number;
    smoothX: number;
    lerp: number;
    max: number;
    isStarted: boolean;
}

interface SequenceData {
    uid: string | null;
    sequence: Sequence;
    isLoaded: boolean;
    isReady: boolean;
}

interface ViewerConfig {
    pixelsPerFrame: number;
    dragDirection: -1 | 1;
    lerpFactor: number;
}

export default class Viewer extends HTMLElement {
    // =============================================================================
    // Static properties
    // =============================================================================
    private static readonly CLASSES = {
        MODAL: {
            ACTIVE: 'has-viewer-open',
            VIEWER_ACTIVE: 'is-viewer-active'
        },
        VIEWER: {
            ACTIVE: 'is-active',
            DRAGGING: 'is-dragging'
        }
    } as const;

    private static readonly DEFAULTS = {
        PIXELS_PER_FRAME: 6,
        LERP_FACTOR: 0.1,
        DRAG_TOLERANCE: 0.5,
        RAF_THRESHOLD: 1,
        FOCUS_CHECK_INTERVAL: 5
    } as const;

    // =============================================================================
    // Private properties
    // =============================================================================

    // DOM elements
    private readonly $modalClose: HTMLElement;
    private readonly $turntable: Turntable | null;
    private $scrollToRef: HTMLElement | null = this.querySelector('[data-viewer-scroll-to]');

    // Configuration
    private readonly config: ViewerConfig;
    private readonly isTouchOrSmall: boolean;

    // State management
    private sequenceData: SequenceData | null = null;
    private readonly dragState: DragState;
    private isRafPlaying = false;
    private rafIncrement = 0;
    private isLeaving = false;
    private isInitialized = false;

    // Focus and accessibility
    private readonly focusTrap: FocusTrap;

    // Constants
    private static readonly FREEZE_CLASS = 'is-frozen';

    // When loaded
    whenLoaded = Promise.all([customElements.whenDefined('c-sequence')]);

    // =============================================================================
    // Constructor
    // =============================================================================
    constructor() {
        super();

        // Get DOM elements with validation
        this.$modalClose = this.querySelector('[data-modal-close]') as HTMLElement;
        this.$turntable = this.closest('c-turntable') as Turntable | null;
        this.$scrollToRef = this.querySelector('[data-viewer-scroll-to]') as HTMLElement | null;

        if (!this.$modalClose) {
            throw new Error('Viewer component requires [data-modal-close] element');
        }

        // Parse configuration
        this.config = this.parseConfig();
        this.isTouchOrSmall = $mediaStatus.value?.isTouchOrSmall ?? false;

        // Initialize drag state
        this.dragState = this.createInitialDragState();

        // Initialize focus trap with better error handling
        this.focusTrap = this.createFocusTrap();
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        this.whenLoaded.then(() => {
            requestAnimationFrame(() => {
                if (this.isInitialized) return;

                this.init();

                this.bindEvents();
                this.isInitialized = true;
            });
        });
    }

    disconnectedCallback() {
        this.cleanup();
    }

    // =============================================================================
    // Private initialization methods
    // =============================================================================
    private parseConfig(): ViewerConfig {
        const dragDirection = this.dataset.dragDirection === 'left' ? -1 : 1;
        const pixelsPerFrame =
            parseInt(this.dataset.pixelsPerFrame || '') || Viewer.DEFAULTS.PIXELS_PER_FRAME;
        const lerpFactor = parseFloat(this.dataset.lerpFactor || '') || Viewer.DEFAULTS.LERP_FACTOR;

        return {
            pixelsPerFrame,
            dragDirection,
            lerpFactor: clamp(0.01, 1, lerpFactor)
        };
    }

    private createInitialDragState(): DragState {
        return {
            startX: 0,
            lastX: 0,
            oldX: 0,
            x: 0,
            smoothX: 0,
            lerp: this.config.lerpFactor,
            max: 0,
            isStarted: false
        };
    }

    private createFocusTrap(): FocusTrap {
        const $focusableElements = getFocusableElements();
        const $excludedFocusTrapElements = Array.from(
            document.querySelectorAll('[data-exclude-focus-trap]')
        );
        const $focusableTurntableElements: HTMLElement[] = [];
        $excludedFocusTrapElements.forEach((el) => {
            const focusableElements = getFocusableElements(el, true);
            $focusableTurntableElements.push(...focusableElements);
        });

        const $difference = $focusableElements.filter(
            ($el: HTMLElement) => !$focusableTurntableElements.includes($el)
        );
        const $focusableParents = $difference
            .map((el) => el.parentElement)
            .filter(Boolean)
            .filter((el) => {
                return !Array.from(el.classList).some((className) =>
                    className.includes('grecaptcha')
                );
            });
        const $uniqueFocusableParents = Array.from(new Set($focusableParents));

        const focusCheckHelper = this.createFocusCheckHelper();

        const trapContainers: (HTMLElement | SVGElement)[] = [...$uniqueFocusableParents, this];

        return createFocusTrap(trapContainers, {
            checkCanFocusTrap: focusCheckHelper,
            onActivate: () => this.onViewerActivate(),
            onPostActivate: () => this.onViewerPostActivate(),
            onDeactivate: () => this.onViewerDeactivate(),
            onPostDeactivate: () => this.onViewerPostDeactivate(),
            initialFocus: this.$modalClose
        });
    }

    private createFocusCheckHelper() {
        return (trapContainers: (HTMLElement | SVGElement)[]) => {
            const results = trapContainers.map((trapContainer) => {
                return new Promise<void>((resolve) => {
                    const interval = setInterval(() => {
                        if (getComputedStyle(trapContainer as Element).visibility !== 'hidden') {
                            clearInterval(interval);
                            resolve();
                        }
                    }, Viewer.DEFAULTS.FOCUS_CHECK_INTERVAL);
                });
            });

            return Promise.all(results).then(() => {});
        };
    }

    private setElementInertState(element: HTMLElement, isInert: boolean): void {
        if (isInert) {
            if ('inert' in HTMLElement.prototype) {
                element.setAttribute('inert', '');
            } else {
                element.setAttribute('aria-hidden', 'true');
            }
        } else {
            element.removeAttribute('inert');
            element.removeAttribute('aria-hidden');
        }
    }

    private init(): void {
        this.setSequence();
    }

    private cleanup(): void {
        this.unbindEvents();
        this.pause();
        this.focusTrap?.deactivate();
        this.isInitialized = false;
    }

    // =============================================================================
    // Event handling
    // =============================================================================
    private bindEvents(): void {
        this.$modalClose.addEventListener('click', this.onClose);

        // Pointer events for drag interaction
        this.addEventListener('pointerdown', this.onDragStart);
        this.addEventListener('pointerup', this.onDragEnd);
        this.addEventListener('pointerleave', this.onDragEnd);
        this.addEventListener('pointermove', this.onDrag);
    }

    private unbindEvents(): void {
        this.$modalClose.removeEventListener('click', this.onClose);

        // Pointer events for drag interaction
        this.removeEventListener('pointerdown', this.onDragStart);
        this.removeEventListener('pointerup', this.onDragEnd);
        this.removeEventListener('pointerleave', this.onDragEnd);
        this.removeEventListener('pointermove', this.onDrag);
    }

    // =============================================================================
    // Event handlers
    // =============================================================================
    private onDragStart = (event: PointerEvent): void => {
        // Prevent drag on close button or when leaving
        if (this.shouldIgnoreDragEvent(event) || this.isLeaving) {
            return;
        }

        this.startDrag(event.clientX);
    };

    private onDragEnd = (): void => {
        if (!this.dragState.isStarted) return;

        this.dragState.isStarted = false;
        this.classList.remove(Viewer.CLASSES.VIEWER.DRAGGING);
    };

    private onDrag = (event: PointerEvent): void => {
        if (!this.dragState.isStarted) return;

        this.updateDragPosition(event.clientX);
    };

    private onDragUpdate = (): void => {
        this.updateSmoothDrag();
        this.computeSequenceProgress();

        if (this.shouldStopDrag()) {
            this.rafIncrement++;
            if (this.rafIncrement >= Viewer.DEFAULTS.RAF_THRESHOLD) {
                this.pause();
            }
        }
    };

    private onClose = (): void => {
        this.closeModal();
    };

    // =============================================================================
    // Focus trap handlers
    // =============================================================================
    private onViewerActivate(): void {
        this.classList.add(Viewer.CLASSES.VIEWER.ACTIVE);
        this.$turntable?.classList.add(Viewer.CLASSES.MODAL.VIEWER_ACTIVE);
        document.documentElement.classList.add(Viewer.CLASSES.MODAL.ACTIVE);

        // Set inert state
        this.setElementInertState(this, false);
    }

    private onViewerPostActivate(): void {
        // Update close button accessibility
        const closeLabel = this.getAttribute('data-close-label') || 'Close viewer';
        this.$modalClose.setAttribute('aria-label', closeLabel);
        this.$modalClose.setAttribute('aria-expanded', 'true');
    }

    private onViewerDeactivate(): void {
        this.classList.remove(Viewer.CLASSES.VIEWER.ACTIVE);
        this.$turntable?.classList.remove(Viewer.CLASSES.MODAL.VIEWER_ACTIVE);

        this.setElementInertState(this, true);
    }

    private onViewerPostDeactivate(): void {
        // Update close button accessibility
        const openLabel = this.getAttribute('data-open-label') || 'Open viewer';
        this.$modalClose.setAttribute('aria-label', openLabel);
        this.$modalClose.setAttribute('aria-expanded', 'false');

        // Perform cleanup
        document.documentElement.classList.remove(Viewer.CLASSES.MODAL.ACTIVE);
        this.isLeaving = false;
    }

    // =============================================================================
    // Drag interaction methods
    // =============================================================================
    private shouldIgnoreDragEvent(event: PointerEvent): boolean {
        const target = event.target as Node;
        return this.$modalClose.contains(target) || target === this.$modalClose;
    }

    private startDrag(clientX: number): void {
        this.classList.add(Viewer.CLASSES.VIEWER.DRAGGING);

        this.dragState.isStarted = true;
        this.dragState.oldX = this.dragState.x;
        this.dragState.startX = clientX;

        this.play();
    }

    private updateDragPosition(clientX: number): void {
        this.dragState.x =
            this.dragState.oldX + this.config.dragDirection * (clientX - this.dragState.startX);
        this.dragState.lastX = clientX;
    }

    private updateSmoothDrag(): void {
        this.dragState.smoothX += (this.dragState.x - this.dragState.smoothX) * this.dragState.lerp;
        this.dragState.smoothX = roundToDecimals(this.dragState.smoothX, 1);
    }

    private shouldStopDrag(): boolean {
        const isCloseToTarget =
            Math.abs(this.dragState.smoothX - this.dragState.x) <= Viewer.DEFAULTS.DRAG_TOLERANCE;
        return isCloseToTarget && !this.dragState.isStarted;
    }

    // =============================================================================
    // Animation methods
    // =============================================================================
    private play(): void {
        if (this.isRafPlaying) return;

        this.isRafPlaying = true;
        this.rafIncrement = 0;
        gsap.ticker.add(this.onDragUpdate);
    }

    private pause(): void {
        if (!this.isRafPlaying) return;

        this.isRafPlaying = false;
        gsap.ticker.remove(this.onDragUpdate);
    }

    // =============================================================================
    // Sequence management methods
    // =============================================================================
    private setSequence(): void {
        const sequenceElement = this.querySelector('c-sequence') as Sequence;
        if (!sequenceElement) {
            console.warn('Viewer: No sequence element found');
            return;
        }

        const uid = sequenceElement.getAttribute('data-uid');
        this.sequenceData = {
            uid,
            sequence: sequenceElement,
            isLoaded: false,
            isReady: false
        };

        // Set max drag distance based on frames
        requestAnimationFrame(() => {
            const frames = sequenceElement.imagesSequence?.frames || 0;
            this.dragState.max = frames * this.config.pixelsPerFrame;
        });
    }

    private async loadSequence({
        readyCallback = null,
        loadedCallback = null
    }: {
        readyCallback?: (() => void) | null;
        loadedCallback?: (() => void) | null;
    } = {}): Promise<void> {
        if (!this.sequenceData || this.sequenceData.isLoaded) {
            loadedCallback?.();
            return;
        }

        const sequence = this.sequenceData.sequence;

        // Start loading
        sequence.loadImages();

        this.$turntable?.classList.add(Viewer.FREEZE_CLASS);

        // Wait for ready state
        return new Promise((resolve, reject) => {
            const unsubscribeReady = sequence.onReady(() => {
                this.sequenceData!.isReady = true;
                readyCallback?.();
                unsubscribeReady();
                resolve();
            });

            const unsubscribeLoaded = sequence.onLoaded(() => {
                this.sequenceData!.isLoaded = true;
                this.$turntable?.classList.remove(Viewer.FREEZE_CLASS);
                loadedCallback?.();
                unsubscribeLoaded();
            });

            const unsubscribeError = sequence.onError((event) => {
                unsubscribeReady();
                unsubscribeLoaded();
                unsubscribeError();
                reject(new Error(event.detail.error));
            });
        });
    }
    private computeSequenceProgress(): void {
        if (!this.sequenceData || this.dragState.max === 0) return;

        const frameProgress = this.dragState.smoothX % this.dragState.max;
        const signProgress = frameProgress < 0 ? frameProgress + this.dragState.max : frameProgress;
        const normalizedProgress = clamp(0, 1, mapRange(0, this.dragState.max, 0, 1, signProgress));

        this.sequenceData.sequence.playerTimeline?.progress(normalizedProgress);
    }

    // =============================================================================
    // Modal management methods
    // =============================================================================
    public openModal(): void {
        requestAnimationFrame(() => {
            this.focusTrap.activate();
            this.focus();
        });
    }

    public closeModal(): void {
        try {
            this.focusTrap.deactivate();
        } catch (error) {
            console.error('Error deactivating focus trap:', error);
        }
    }

    // =============================================================================
    // Public methods
    // =============================================================================

    public async active(isProgrammatic = false): Promise<void> {
        if (this.$scrollToRef) {
            Scroll.scrollTo(this.$scrollToRef);
        }

        if (!isProgrammatic) {
            try {
                await this.loadSequence({
                    loadedCallback: () => {
                        this.openModal();
                    }
                });
                this.sequenceData?.sequence.resize($screen.get());
            } catch (error) {
                console.error('Error loading sequence:', error);
            }
        } else {
            this.openModal();
        }
    }

    public async lazyLoad(): Promise<void> {
        await this.loadSequence();
    }
}

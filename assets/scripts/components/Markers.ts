import { $screenDebounce } from '@stores/screen';
import { $mediaStatus } from '@stores/deviceStatus';
import { createFocusTrap, type FocusTrap } from 'focus-trap';
import type Turntable from './Turntable';
import { getFocusableElements } from '@utils/focusableElements';
import { Scroll } from '@scripts/classes/Scroll';

export class Markers extends HTMLElement {
    static MODAL_ACTIVE_CLASS = 'has-markers-modal-open';

    // Listeners
    private unbindScreenListener: (() => void) | null = null;

    // Elements
    private $markers: NodeListOf<HTMLElement>;
    private $modal: HTMLElement;
    private $modalTarget: HTMLElement;
    private $modalClose: HTMLElement;
    private $slides: NodeListOf<HTMLElement>;
    private $activeSlide: HTMLElement | null;
    private $previousSlide: HTMLElement | null;
    private $scrollToRef: HTMLElement | null;

    private items: {
        id: string;
        label: string;
        coords: {
            desktop: {
                x: number;
                y: number;
            };
            mobile: {
                x: number;
                y: number;
            };
        };
    }[]; // Data for markers

    private frameMetrics: {
        desktop: {
            width: number;
            height: number;
        };
        mobile: {
            width: number;
            height: number;
        };
    }; // Metrics for the frame that contains markers
    private objectFit: string = 'cover';
    private wHeight: number = window.innerHeight;
    private wWidth: number = window.innerWidth;
    private elWidth: number = 0;
    private elHeight: number = 0;
    private isTouchOrSmall: boolean = $mediaStatus.value?.isTouchOrSmall;

    private focusTrap: FocusTrap;
    private $nextButton: HTMLButtonElement | null = null;

    constructor() {
        super();

        // Elements
        this.$markers = this.querySelectorAll('[data-marker]') as NodeListOf<HTMLElement>;
        this.$modal = this.querySelector('[data-modal]') as HTMLElement;
        this.$modalTarget = this.querySelector('[data-modal-target]') as HTMLElement;
        this.$modalClose = this.querySelector('[data-modal-close]') as HTMLElement;
        this.$slides = this.querySelectorAll('[data-modal-slide]') as NodeListOf<HTMLElement>;
        this.$activeSlide = null as HTMLElement | null;
        this.$previousSlide = null as HTMLElement | null;
        this.$scrollToRef = this.closest('[data-markers-scroll-to-ref]') as HTMLElement | null;

        // Data
        this.items = JSON.parse(this.getAttribute('data-items') ?? '[]');
        this.frameMetrics = JSON.parse(
            this.getAttribute('data-frame-metrics') ?? '{ width: 0, height: 0 }'
        );
        this.objectFit = this.getAttribute('data-object-fit') || 'cover';
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
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
            .filter((el: HTMLElement) => {
                return !Array.from(el.classList).some((className) =>
                    className.includes('grecaptcha')
                );
            });
        const $uniqueFocusableParents = Array.from(new Set($focusableParents)) as (
            | HTMLElement
            | SVGElement
        )[];

        const trapContainers: (HTMLElement | SVGElement)[] = [
            ...$uniqueFocusableParents,
            this.$modalTarget
        ];

        // Focus trap
        this.focusTrap = createFocusTrap(trapContainers, {
            checkCanFocusTrap: async (trapContainers) => {
                const results = trapContainers.map((trapContainer) => {
                    return new Promise<void>((resolve) => {
                        const interval = setInterval(() => {
                            if (getComputedStyle(trapContainer).visibility !== 'hidden') {
                                resolve();
                                clearInterval(interval);
                            }
                        }, 5);
                    });
                });

                // Return a promise that resolves when all the trap containers are able to receive focus
                await Promise.all(results);
            },
            onActivate: this.onActivate,
            onPostActivate: this.onPostActivate,
            onDeactivate: this.onDeactivate,
            onPostDeactivate: this.onPostDeactivate,
            initialFocus: this.$modalClose,
            clickOutsideDeactivates: true
        });

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

        this.$modalClose.addEventListener('click', this.onClose);

        this.$markers.forEach(($marker) => {
            $marker.addEventListener('click', this.onMarkerClick);
        });
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;

        this.$modalClose.removeEventListener('click', this.onClose);

        this.$markers.forEach(($marker) => {
            $marker.removeEventListener('click', this.onMarkerClick);
        });
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onResize = ({ height }): void => {
        this.wHeight = height;
        this.wWidth = document.body.offsetWidth;
        this.elWidth = this.offsetWidth;
        this.elHeight = this.offsetHeight;

        // if (!this.isTouchOrSmall) {
        this.setMarkerPositions(); // Update marker positions for desktop
        // }
    };

    private onMarkerClick = (event: MouseEvent): void => {
        const $marker = event.currentTarget as HTMLElement;
        const id = $marker.dataset.marker;

        const $slide = Array.from(this.$slides).find(
            ($slide) => $slide.dataset.id === id
        ) as HTMLElement;

        if (!$slide) return;

        this.openModal();
        this.activateSlide($slide);
    };

    // Close the modal on user action
    onClose = () => {
        this.closeModal();
    };

    onNext = (event: Event) => {
        const $target = event.currentTarget as HTMLElement;
        const nextId = $target.dataset.nextId;
        const $nextSlide = Array.from(this.$slides).find(
            ($slide) => $slide.dataset.id === nextId
        ) as HTMLElement;

        if (!$nextSlide) return;

        this.$previousSlide?.classList.remove('is-prev');
        this.deactivateSlide(this.$activeSlide, true);
        this.activateSlide($nextSlide);

        setTimeout(() => {
            this.$nextButton?.focus();
        }, 300);
    };

    // ==========
    // Modal
    // ==========
    // Activates the modal view
    onActivate = () => {
        this.$modal.classList.add('is-active');
        const $turntable = this.closest('c-turntable') as Turntable;
        $turntable?.classList.add('is-markers-modal-active');

        requestAnimationFrame(() => {
            this.$modal.setAttribute('aria-hidden', 'false');
        });
    };

    // Additional activation logic after the modal is visible
    onPostActivate = () => {};

    // Deactivates the modal
    onDeactivate = () => {
        requestAnimationFrame(() => {
            this.deactivateSlide();
            this.$modal.classList.remove('is-active');
            this.$modal.setAttribute('aria-hidden', 'true');
        });
    };

    // Post-deactivation logic for cleanup
    onPostDeactivate = () => {
        const $turntable = this.closest('c-turntable') as Turntable;
        $turntable?.classList.remove('is-markers-modal-active');
    };

    // =============================================================================
    // Methods
    // =============================================================================
    setMarkerPositions() {
        const containerAspect = this.elWidth / this.elHeight;

        const imageWidthDesktop = this.frameMetrics.desktop.width;
        const imageHeightDesktop = this.frameMetrics.desktop.height;
        const imageAspectDesktop = imageWidthDesktop / imageHeightDesktop;

        const imageWidthMobile = this.frameMetrics.mobile.width;
        const imageHeightMobile = this.frameMetrics.mobile.height;
        const imageAspectMobile = imageWidthMobile / imageHeightMobile;

        let scaledImageWidthDesktop = this.elWidth;
        let scaledImageHeightDesktop = this.elHeight;

        let scaledImageWidthMobile = this.elWidth;
        let scaledImageHeightMobile = this.elHeight;

        // ---- Desktop scaling ----
        if (this.objectFit === 'contain') {
            if (imageAspectDesktop > containerAspect) {
                scaledImageWidthDesktop = this.elWidth;
                scaledImageHeightDesktop = this.elWidth / imageAspectDesktop;
            } else {
                scaledImageHeightDesktop = this.elHeight;
                scaledImageWidthDesktop = this.elHeight * imageAspectDesktop;
            }
        } else if (this.objectFit === 'cover') {
            if (imageAspectDesktop > containerAspect) {
                scaledImageHeightDesktop = this.elHeight;
                scaledImageWidthDesktop = this.elHeight * imageAspectDesktop;
            } else {
                scaledImageWidthDesktop = this.elWidth;
                scaledImageHeightDesktop = this.elWidth / imageAspectDesktop;
            }
        }

        // ---- Mobile scaling ----
        if (this.objectFit === 'contain') {
            if (imageAspectMobile > containerAspect) {
                scaledImageWidthMobile = this.elWidth;
                scaledImageHeightMobile = this.elWidth / imageAspectMobile;
            } else {
                scaledImageHeightMobile = this.elHeight;
                scaledImageWidthMobile = this.elHeight * imageAspectMobile;
            }
        } else if (this.objectFit === 'cover') {
            if (imageAspectMobile > containerAspect) {
                scaledImageHeightMobile = this.elHeight;
                scaledImageWidthMobile = this.elHeight * imageAspectMobile;
            } else {
                scaledImageWidthMobile = this.elWidth;
                scaledImageHeightMobile = this.elWidth / imageAspectMobile;
            }
        }

        // ---- Place markers ----

        this.items.forEach((item) => {
            const $marker = document.querySelector(`[data-marker="${item.id}"]`) as HTMLElement;
            if ($marker) {
                const ratio = {
                    desktop: {
                        x: scaledImageWidthDesktop / this.frameMetrics.desktop.width,
                        y: scaledImageHeightDesktop / this.frameMetrics.desktop.height
                    },
                    mobile: {
                        x: scaledImageWidthMobile / this.frameMetrics.mobile.width,
                        y: scaledImageHeightMobile / this.frameMetrics.mobile.height
                    }
                };

                // For object-fit: contain, the offset centers the image within the container
                // When the image is smaller than the container, we need to add the centering offset
                const offset = {
                    desktop: {
                        x: (this.elWidth - scaledImageWidthDesktop) / 2,
                        y: (this.elHeight - scaledImageHeightDesktop) / 2
                    },
                    mobile: {
                        x: (this.elWidth - scaledImageWidthMobile) / 2,
                        y: (this.elHeight - scaledImageHeightMobile) / 2
                    }
                };

                const pos = {
                    desktop: {
                        x: item.coords.desktop.x * ratio.desktop.x + offset.desktop.x,
                        y: item.coords.desktop.y * ratio.desktop.y + offset.desktop.y
                    },
                    mobile: {
                        x: item.coords.mobile.x * ratio.mobile.x + offset.mobile.x,
                        y: item.coords.mobile.y * ratio.mobile.y + offset.mobile.y
                    }
                };

                // Update marker's CSS position
                $marker.style.setProperty('--marker-desktop-x', `${pos.desktop.x}px`);
                $marker.style.setProperty('--marker-desktop-y', `${pos.desktop.y}px`);
                $marker.style.setProperty('--marker-mobile-x', `${pos.mobile.x}px`);
                $marker.style.setProperty('--marker-mobile-y', `${pos.mobile.y}px`);
            }
        });
    }

    openModal() {
        document.documentElement.classList.add(Markers.MODAL_ACTIVE_CLASS);

        requestAnimationFrame(() => {
            this.focusTrap.activate();
            if (this.$scrollToRef) {
                const height = this.$scrollToRef.offsetHeight;
                const differenceHeight = this.wHeight - height;
                let scrollToTop = 0;
                if (differenceHeight > 0) {
                    scrollToTop = differenceHeight * -1;
                }

                Scroll.scrollTo(this.$scrollToRef, { offset: scrollToTop });
            }
        });
    }

    // Closes the modal and deactivates the focus trap
    closeModal() {
        this.focusTrap.deactivate();
    }

    activateSlide($slide: HTMLElement) {
        $slide.classList.add('is-active');
        this.$activeSlide = $slide;

        this.$nextButton = $slide.querySelector('[data-next]');
        this.$nextButton?.addEventListener('click', this.onNext);
    }

    deactivateSlide($slide = this.$activeSlide, isPrev = false) {
        if (!$slide) return;
        this.$nextButton = $slide.querySelector('[data-next]');
        this.$nextButton?.removeEventListener('click', this.onNext);

        $slide.classList.remove('is-active');

        if (isPrev) {
            $slide.classList.add('is-prev');
            this.$previousSlide = $slide;
        } else {
            this.$previousSlide?.classList.remove('is-prev');
            this.$previousSlide = null;
        }
    }
}

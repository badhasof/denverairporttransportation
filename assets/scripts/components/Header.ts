import { $screenDebounce } from '@scripts/stores/screen';
import { $scroll } from '@scripts/stores/scroll';
import { clamp, mapRange } from '@scripts/utils/maths';
import BezierEasing from 'bezier-easing';
import * as focusTrap from 'focus-trap';
import { $html } from '@scripts/utils/dom';
import gsap from 'gsap';
import lottie from 'lottie-web';
import { $mediaStatus } from '@scripts/stores/deviceStatus';
import { subscribeKeys } from 'nanostores';

export class Header extends HTMLElement {
    static ANIMATION = {
        SCROLL: {
            DISTANCE: 800,
            TRANSPARENCY_THRESHOLD: 0.02,
            EASING_CLIP: BezierEasing(0.15, 0.61, 0.0, 1.0),
            EASING_LOGO: BezierEasing(0.15, 0.1, 0.0, 0.65)
        },
        DROPDOWN: {
            DURATION: 0.6,
            EASE: 'power4.out'
        },
        MENU: {
            DURATION: 1,
            EASE: 'power2.out'
        },
        LERP: 0.1,
        PRECISION: 10000
    };

    static CLASS = {
        IS_TRANSPARENT: 'is-transparent',
        IS_OPEN: 'is-open',
        MODAL_OPEN: 'has-modal-open',
        DROPDOWN_OPEN: 'has-dropdown-open',
        MENU_OPEN: 'has-menu-open'
    };

    // UI
    private $container: HTMLElement;
    private $activeModal: HTMLElement | null = null;
    private $dropdowns: NodeListOf<HTMLElement>;
    private $menu: HTMLElement;
    private $menuToggler: HTMLElement;
    private $logo: HTMLElement;

    // Listeners
    private unbindScreenListener: (() => void) | null = null;
    private unbindScrollListener: (() => void) | null = null;
    private unbindMediumDetection: (() => void) | null = null;

    // Data
    private rafIncrement: number = 0;
    private headerCompactWidth: string | number;
    private clip = {
        x: {
            from: 0,
            target: 0,
            current: 0,
            scroll: 0
        },
        y: {
            from: 0,
            target: 0,
            current: 0
        }
    };

    private logoProgress = {
        current: 0,
        scroll: 0
    };

    // Flags
    private isAnimating = false;
    private isRafPlaying = false;
    private hasModalOpen = false;
    private hasMenuOpen = false;
    private hasDropdownOpen = false;
    private isMedium = false;
    private isTransparent = false;

    // Focus trap
    private focusTrap: focusTrap.FocusTrap;
    private lottie: any;

    constructor() {
        super();

        // UI
        this.$container = this.querySelector('[data-container]') as HTMLElement;
        this.$dropdowns = this.querySelectorAll('[data-header-dropdown]');
        this.$menu = this.querySelector('[data-header-menu]') as HTMLElement;
        this.$menuToggler = this.querySelector('[data-menu-toggler]');
        this.$logo = this.querySelector('[data-header-logo]') as HTMLElement;

        // Data
        this.isAnimating = false;
        this.isRafPlaying = false;
        this.hasModalOpen = false;
        this.hasMenuOpen = false;
        this.hasDropdownOpen = false;

        this.clip = {
            x: {
                from: 0,
                target: 0,
                current: 0,
                scroll: 0
            },
            y: {
                from: 0,
                target: 0,
                current: 0
            }
        };

        this.logoProgress = {
            current: 0,
            scroll: 0
        };

        this.isTransparent = this.hasAttribute('data-header-transparent') || false;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        // Create focus trap for custom modal
        this.focusTrap = focusTrap.createFocusTrap(this.$container, {
            onActivate: this.onActivate,
            onDeactivate: this.onDeactivate,
            clickOutsideDeactivates: true
        });

        this.initLottie();

        this.computeMetrics();
        this.bindEvents();
    }

    disconnectedCallback() {
        this.unbindEvents();
        this.focusTrap?.deactivate?.();
        this.lottie?.destroy?.();
        this.lottie = null;
    }

    private initLottie(): void {
        // Initialize lottie animation
        this.lottie = lottie.loadAnimation({
            container: this.$logo,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: this.$logo.dataset.lottiePath || ''
        });

        this.lottie.addEventListener('DOMLoaded', this.onLottieLoaded);
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.unbindMediumDetection = subscribeKeys(
            $mediaStatus,
            ['isFromMedium'],
            this.onBreakpointChange
        );

        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);

        this.$dropdowns.forEach(($dropdown) => {
            const $toggler = $dropdown.querySelector('[data-dropdown-toggler]');
            $toggler?.addEventListener('click', this.onDropdownTogglerClick);
        });

        this.$menuToggler.addEventListener('click', this.onMenuTogglerClick.bind(this));
        this.unbindScrollListener = $scroll.subscribe(this.onScroll);
    }

    private unbindEvents(): void {
        this.unbindMediumDetection?.();

        this.unbindScreenListener?.();
        this.unbindScreenListener = null;

        this.$dropdowns.forEach(($dropdown) => {
            const $toggler = $dropdown.querySelector('[data-dropdown-toggler]');
            $toggler?.removeEventListener('click', this.onDropdownTogglerClick);
        });

        this.$menuToggler.removeEventListener('click', this.onMenuTogglerClick.bind(this));

        this.lottie?.removeEventListener('DOMLoaded', this.onLottieLoaded);

        this.unbindScrollListener?.();
        this.unbindScrollListener = null;
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onScroll = (): void => {
        if (!this.isMedium) return;

        const scroll = $scroll.get().scroll;
        const progress = clamp(0, 1, mapRange(0, Header.ANIMATION.SCROLL.DISTANCE, 0, 1, scroll));

        // Update logo progress
        this.logoProgress.scroll = progress;
        if (!this.hasModalOpen) this.logoProgress.current = this.logoProgress.scroll;

        this.computeLogoProgress();

        // Update clip scroll progress
        this.clip.x.scroll = Header.ANIMATION.SCROLL.EASING_CLIP(progress);
        if (!this.hasModalOpen) this.clip.x.current = this.clip.x.scroll;

        this.computeClip();

        // Toggle transparency class
        if (this.isTransparent) {
            this.toggleTransparency(progress);
        }
    };

    private onResize = (): void => {
        this.computeMetrics();

        if (this.hasMenuOpen) {
            this.clip.y.current = this.$menu.offsetHeight || 0;
        } else if (this.hasDropdownOpen) {
            const $container = this.$activeModal.querySelector(
                '[data-dropdown-container]'
            ) as HTMLElement;
            this.clip.y.current = $container?.offsetHeight || 0;
        }

        this.onScroll();
    };

    private onDropdownTogglerClick = (event: MouseEvent): void => {
        const $toggler = event.currentTarget as HTMLElement;
        const $dropdown = $toggler.closest('[data-header-dropdown]') as HTMLElement;
        if (!$dropdown) return;

        // Check class on specific dropdown in case of multiple dropdowns
        const isOpen = $dropdown.classList.contains(Header.CLASS.IS_OPEN);

        // Set toggler aria-expanded attribute
        $toggler.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

        if (isOpen) {
            this.focusTrap?.deactivate?.();
        } else {
            // If menu is open, close it
            if (this.hasMenuOpen) {
                $html.classList.remove(Header.CLASS.MENU_OPEN);
                this.$activeModal?.classList.remove(Header.CLASS.IS_OPEN);
                this.$menuToggler.setAttribute('aria-expanded', 'false');
            }

            requestAnimationFrame(() => {
                this.openDropdown($dropdown);
            });
        }
    };

    private onMenuTogglerClick = (): void => {
        // Toggle menu open state
        const isOpen = $html.classList.contains(Header.CLASS.MENU_OPEN);

        // Set toggler aria-expanded attribute
        this.$menuToggler.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

        if (isOpen) {
            this.focusTrap?.deactivate?.();
        } else {
            // If dropdown is open, close it
            if (this.hasDropdownOpen) {
                $html.classList.remove(Header.CLASS.DROPDOWN_OPEN);
                this.$activeModal?.classList.remove(Header.CLASS.IS_OPEN);
            }

            requestAnimationFrame(() => {
                this.openMenu();
            });
        }
    };

    private onBreakpointChange = (): void => {
        if ($mediaStatus.get().isFromMedium) {
            // Desktop - Full experience
            this.isMedium = true;

            // Init lottie if not already initialized
            if (!this.lottie) {
                this.initLottie();
            }
        } else {
            this.isMedium = false;

            this.classList.remove(Header.CLASS.IS_TRANSPARENT);
            this.logoProgress.current = 1;
            this.computeLogoProgress();
        }
    };

    // Focus trap callbacks
    // ------------------------------------------------------------------------
    private onActivate = (): void => {
        // Set flags
        this.isAnimating = true;
        this.hasModalOpen = true;

        // Add active modal class
        $html.classList.add(Header.CLASS.MODAL_OPEN);

        // Stop closing raf if any
        this.isRafPlaying && this.pause(this.updateClosing);

        // Start opening raf
        requestAnimationFrame(() => {
            this.play(this.updateOpening);
        });
    };

    private onDeactivate = (): void => {
        // Set flags
        this.isAnimating = true;
        this.hasMenuOpen = false;
        this.hasDropdownOpen = false;

        // Remove active modal class
        this.$activeModal?.classList.remove(Header.CLASS.IS_OPEN);

        // Empty active modal
        this.$activeModal = null;

        // Remove open classes
        $html.classList.remove(
            Header.CLASS.MODAL_OPEN,
            Header.CLASS.MENU_OPEN,
            Header.CLASS.DROPDOWN_OPEN
        );

        // Set new clip y target
        this.clip.y.target = 0;

        // Stop closing raf if any
        this.isRafPlaying && this.pause(this.updateOpening);

        // Start closing raf
        requestAnimationFrame(() => {
            this.play(this.updateClosing);
        });
    };

    private onPostOpen = (): void => {
        this.pause(this.updateOpening);
        this.isAnimating = false;
    };

    private onPostClose = (): void => {
        this.pause(this.updateClosing);
        this.isAnimating = false;
        this.hasModalOpen = false;
    };

    // Lottie callback
    // ------------------------------------------------------------------------
    private onLottieLoaded = (): void => {
        this.computeLogoProgress();
    };

    // =============================================================================
    // Methods
    // =============================================================================

    private toggleTransparency(progress: number): void {
        if (
            progress < Header.ANIMATION.SCROLL.TRANSPARENCY_THRESHOLD &&
            !this.classList.contains(Header.CLASS.IS_TRANSPARENT)
        ) {
            this.classList.add(Header.CLASS.IS_TRANSPARENT);
        } else if (
            progress >= Header.ANIMATION.SCROLL.TRANSPARENCY_THRESHOLD &&
            this.classList.contains(Header.CLASS.IS_TRANSPARENT)
        ) {
            this.classList.remove(Header.CLASS.IS_TRANSPARENT);
        }
    }

    private computeMetrics(): void {
        const headerCompactWidthStr =
            window.getComputedStyle(this).getPropertyValue('--header-compact-width') || '';

        this.headerCompactWidth = parseInt(headerCompactWidthStr) || window.innerWidth;

        if ($mediaStatus.get().isFromMedium) {
            this.clip.x.target = Math.max((this.clientWidth - this.headerCompactWidth) / 2, 0);
        } else {
            this.clip.x.target = 0;
        }

        this.clip.x.scroll = 1;
        this.clip.x.current = 1;

        this.clip.y.from = this.$container.clientHeight;

        this.computeClip();
    }

    private computeClip(): void {
        const clip = {
            x: this.clip.x.current * this.clip.x.target,
            y: this.clip.y.current + this.clip.y.from
        };

        this.style.setProperty('--clip-x', `${clip.x}px`);
        this.style.setProperty('--clip-y', `${clip.y}px`);
    }

    private computeLogoProgress(): void {
        this.style.setProperty(
            '--header-scroll-progress',
            `${Header.ANIMATION.SCROLL.EASING_LOGO(this.logoProgress.current)}`
        );

        this.lottie?.goToAndStop(
            (1 - Header.ANIMATION.SCROLL.EASING_LOGO(this.logoProgress.current)) *
                this.lottie.totalFrames,
            true
        );
    }

    // Dropdowns
    // ------------------------------------------------------------------------
    private openDropdown($dropdown: HTMLElement): void {
        const $container = $dropdown.querySelector('[data-dropdown-container]') as HTMLElement;
        if (!$container) return;

        // Set flags
        this.hasMenuOpen = false;
        this.hasDropdownOpen = true;

        // Add open classes
        $dropdown.classList.add(Header.CLASS.IS_OPEN);
        $html.classList.add(Header.CLASS.DROPDOWN_OPEN);

        // Store active modal
        this.$activeModal = $dropdown;

        // Set new clip y target
        this.clip.y.target = $container.offsetHeight;

        // Activate focus trap
        if (this.focusTrap?.active) {
            this.onActivate();
        } else {
            this.focusTrap.activate?.();
        }
    }

    // Menu
    // ------------------------------------------------------------------------
    private openMenu(): void {
        // Set flags
        this.hasMenuOpen = true;
        this.hasDropdownOpen = false;

        // Add open classes
        $html.classList.add(Header.CLASS.MENU_OPEN);

        // Set new clip y target
        this.clip.y.target = this.$menu.clientHeight;

        // Store active modal
        this.$activeModal = this.$menu;

        // Activate focus trap
        if (this.focusTrap?.active) {
            this.onActivate();
        } else {
            this.focusTrap.activate?.();
        }
    }

    // Animation
    // ------------------------------------------------------------------------
    private updateOpening = (): void => {
        // Clip X
        // -------------------------------------------------------------------
        if (this.isMedium) {
            this.clip.x.current += (this.clip.x.from - this.clip.x.current) * Header.ANIMATION.LERP;
            this.clip.x.current =
                ((Header.ANIMATION.PRECISION *
                    (this.clip.x.current + 1 / Header.ANIMATION.PRECISION)) |
                    0) /
                Header.ANIMATION.PRECISION;
        }

        // Clip Y
        // -------------------------------------------------------------------
        this.clip.y.current += (this.clip.y.target - this.clip.y.current) * Header.ANIMATION.LERP;
        this.clip.y.current =
            ((Header.ANIMATION.PRECISION * (this.clip.y.current + 1 / Header.ANIMATION.PRECISION)) |
                0) /
            Header.ANIMATION.PRECISION;

        this.computeClip();

        // Logo progress
        // -------------------------------------------------------------------
        if (this.isMedium) {
            this.logoProgress.current += (1 - this.logoProgress.current) * Header.ANIMATION.LERP;
            this.logoProgress.current =
                ((Header.ANIMATION.PRECISION *
                    (this.logoProgress.current + 1 / Header.ANIMATION.PRECISION)) |
                    0) /
                Header.ANIMATION.PRECISION;

            this.computeLogoProgress();
        }

        // Add delay before stopping raf
        // -------------------------------------------------------------------
        if (
            this.clip.x.current < 1 / (Header.ANIMATION.PRECISION * 0.1) &&
            Math.round(this.clip.y.current) === Math.round(this.clip.y.target)
        ) {
            this.rafIncrement++;

            if (this.rafIncrement >= 30) {
                this.onPostOpen();
            }
        }
    };

    private updateClosing = (): void => {
        // Clip X
        // -------------------------------------------------------------------
        this.clip.x.current += (this.clip.x.scroll - this.clip.x.current) * Header.ANIMATION.LERP;
        this.clip.x.current =
            ((Header.ANIMATION.PRECISION * (this.clip.x.current + 1 / Header.ANIMATION.PRECISION)) |
                0) /
            Header.ANIMATION.PRECISION;

        // Clip Y
        // -------------------------------------------------------------------
        this.clip.y.current += (this.clip.y.target - this.clip.y.current) * Header.ANIMATION.LERP;
        this.clip.y.current =
            ((Header.ANIMATION.PRECISION * (this.clip.y.current + 1 / Header.ANIMATION.PRECISION)) |
                0) /
            Header.ANIMATION.PRECISION;

        this.computeClip();

        // Logo progress
        // -------------------------------------------------------------------
        if (this.isMedium) {
            this.logoProgress.current +=
                (this.logoProgress.scroll - this.logoProgress.current) * Header.ANIMATION.LERP;
            this.logoProgress.current =
                ((Header.ANIMATION.PRECISION *
                    (this.logoProgress.current + 1 / Header.ANIMATION.PRECISION)) |
                    0) /
                Header.ANIMATION.PRECISION;

            this.computeLogoProgress();
        }

        // Add delay before stopping raf
        // -------------------------------------------------------------------
        if (
            Math.round(this.clip.x.current) === Math.round(this.clip.x.scroll) &&
            Math.round(this.clip.y.current) === Math.round(this.clip.y.target)
        ) {
            this.rafIncrement++;

            if (this.rafIncrement >= 30) {
                this.onPostClose();
            }
        }
    };

    // =============================================================================
    // RAF
    // =============================================================================
    private play(callback: gsap.TickerCallback): void {
        if (this.isRafPlaying) return;

        this.isRafPlaying = true;
        this.rafIncrement = 0;
        gsap.ticker.add(callback);
    }

    private pause(callback: gsap.Callback): void {
        if (!this.isRafPlaying) return;

        this.isRafPlaying = false;
        gsap.ticker.remove(callback);
    }
}

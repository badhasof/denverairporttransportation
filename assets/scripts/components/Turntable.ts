import { $mediaStatus } from '@stores/deviceStatus';
import { debounce } from 'ts-debounce';
import { listenKeys } from 'nanostores';

// The TurntableSequenceElement interface defines the expected structure for elements with
// specific methods related to 'active' and 'initLoad'
export interface TurntableSequenceElement extends HTMLElement {
    active(isProgrammatic?: boolean, $fromTab?: HTMLElement, $toTab?: HTMLElement): void;
    initLoad(): void;
}

// Configuration interface for better type safety
interface TurntableConfig {
    tabsId: string;
    autoLoadOnInview?: boolean;
    reloadOnMediaChange?: boolean;
    debounceDelay?: number;
}

// Turntable is a custom HTML element extending HTMLElement that manages
// tab-based elements and their interactions based on user actions and screen events
export default class Turntable extends HTMLElement {
    // =============================================================================
    // Private properties
    // =============================================================================
    private unbindTouchOrSmallListener: (() => void) | null = null;
    private debouncedOnTouchOrSmallStatusChange: () => void;
    private readonly config: TurntableConfig;
    private hasRequestLoading = false;
    private readonly $turntableSequenceElements: TurntableSequenceElement[];
    private isInitialized = false;
    private loadingTimeoutId: number | null = null;
    private loadEventName: string;

    // Constants
    private static readonly DEFAULT_DEBOUNCE_DELAY = 100;
    private static readonly LOAD_EVENT_SUFFIX = 'Load';

    // =============================================================================
    // Constructor
    // =============================================================================
    constructor() {
        super();

        // Parse and validate configuration
        this.config = this.parseConfig();

        // Validate required configuration
        if (!this.config.tabsId) {
            throw new Error('Turntable component requires data-tabs-id attribute');
        }

        // Gather all turntable elements based on a specific data attribute
        this.$turntableSequenceElements = this.getTurntableSequenceElements();

        // Initialize debounced function for media status changes
        this.debouncedOnTouchOrSmallStatusChange = debounce(
            this.onTouchOrSmallStatusChange,
            this.config.debounceDelay
        );

        this.loadEventName = `${this.config.tabsId}${Turntable.LOAD_EVENT_SUFFIX}`;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        if (this.isInitialized) return;

        this.init();
        this.bindEvents();
        this.isInitialized = true;
    }

    disconnectedCallback() {
        this.cleanup();
    }

    // =============================================================================
    // Private initialization methods
    // =============================================================================
    private parseConfig(): TurntableConfig {
        const tabsId = this.getAttribute('data-tabs-id');
        const autoLoadOnInview = this.getAttribute('data-auto-load') !== 'false';
        const reloadOnMediaChange = this.getAttribute('data-reload-on-media-change') !== 'false';
        const debounceDelay =
            parseInt(this.getAttribute('data-debounce-delay') || '') ||
            Turntable.DEFAULT_DEBOUNCE_DELAY;

        if (!tabsId) {
            throw new Error('Turntable requires data-tabs-id attribute');
        }

        return {
            tabsId,
            autoLoadOnInview,
            reloadOnMediaChange,
            debounceDelay
        };
    }

    private getTurntableSequenceElements(): TurntableSequenceElement[] {
        const $elements = Array.from(
            this.querySelectorAll('[data-turntable-sequence-element]')
        ) as TurntableSequenceElement[];

        return $elements;
    }

    private init(): void {
        // If the element is already in view and auto-load is enabled, trigger the sequence loading
        if (this.config.autoLoadOnInview && this.classList.contains('is-inview')) {
            this.onRequestSequenceLoading();
        }
    }

    private cleanup(): void {
        this.unbindEvents();
        this.clearLoadingTimeout();
        this.isInitialized = false;
    }

    private clearLoadingTimeout(): void {
        if (this.loadingTimeoutId !== null) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
        }
    }

    // =============================================================================
    // Event handling
    // =============================================================================
    private bindEvents(): void {
        // Listen for a custom load event for tabs and trigger sequence loading with locomotive-scroll
        window.addEventListener(this.loadEventName, this.onRequestSequenceLoading);
        window.addEventListener('hideProductBar', this.hideProductBar);

        // Only bind media status listener if reload on media change is enabled
        if (this.config.reloadOnMediaChange) {
            this.unbindTouchOrSmallListener = listenKeys(
                $mediaStatus,
                ['isTouchOrSmall'],
                this.debouncedOnTouchOrSmallStatusChange
            );
        }
    }

    private unbindEvents(): void {
        // Remove the load event listener for this specific tab ID
        window.removeEventListener(this.loadEventName, this.onRequestSequenceLoading);
        window.removeEventListener('hideProductBar', this.hideProductBar);

        // Unbind media status listener
        this.unbindTouchOrSmallListener?.();
        this.unbindTouchOrSmallListener = null;
    }

    // =============================================================================
    // Callback methods
    // =============================================================================
    private onRequestSequenceLoading = (): void => {
        if (this.hasRequestLoading) return;

        this.hasRequestLoading = true;
        this.clearLoadingTimeout();

        // Use requestAnimationFrame to batch DOM operations for better performance
        requestAnimationFrame(() => {
            this.initializeTurntableSequenceElements();
        });
    };

    private initializeTurntableSequenceElements(): void {
        if (this.$turntableSequenceElements.length === 0) {
            console.warn('No turntable elements found to initialize');
            return;
        }

        try {
            // Initialize loading of idle sequences for each turntable element
            this.$turntableSequenceElements.forEach(
                ($turntableSequenceElement: TurntableSequenceElement, index: number) => {
                    try {
                        $turntableSequenceElement.initLoad();
                    } catch (error) {
                        console.error(
                            `Error initializing turntable element at index ${index}:`,
                            error
                        );
                    }
                }
            );
        } catch (error) {
            console.error('Error during turntable elements initialization:', error);
        }
    }

    private onTouchOrSmallStatusChange = (): void => {
        // Add a small delay to avoid rapid reloads during orientation changes
        this.loadingTimeoutId = window.setTimeout(() => {
            this.reloadPage();
        }, 50);
    };

    private reloadPage(): void {
        /* try {
            window.location.reload();
        } catch (error) {
            console.error('Error reloading page:', error);
            // Fallback: try to reload using alternative method
            window.location.href = window.location.href;
        } */
    }

    private hideProductBar = (args: any): void => {
        const way = args?.detail?.way || '';
        document.documentElement.classList.toggle('is-product-bar-hidden', way === 'enter');
    };
}

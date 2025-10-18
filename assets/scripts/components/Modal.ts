import { delegateEvent } from '@utils/events';
import { createFocusTrap } from 'focus-trap';

export class Modal extends HTMLElement {
    // Listeners
    private unbindToggleEvent: (() => void) | null = null;

    // Properties
    private focusTrap: ReturnType<typeof createFocusTrap> | null = null;
    private _name: string;
    private _selector: string;
    private $togglers: NodeListOf<HTMLElement>;
    private $focusTrapTargets: HTMLElement[];
    private isOpen: boolean;
    private args: Record<string, any>;
    private focusTrapOptions: {
        checkCanFocusTrap: (trapContainers: HTMLElement[]) => Promise<void[]>;
        onActivate: () => void;
        onPostActivate: () => void;
        onDeactivate: () => void;
        onPostDeactivate: () => void;
        clickOutsideDeactivates: boolean;
        initialFocus: HTMLElement | null;
    };

    constructor() {
        super();

        this._name = this.dataset.modalName;
        this._selector = `[data-modal-${this._name}-toggler]`;

        // UI
        this.$togglers = document.querySelectorAll(this._selector);
        this.$focusTrapTargets = Array.from(
            document.querySelectorAll(`[data-modal-${this._name}-target]`)
        );

        // Data

        // Args store
        this.args = {};

        // Focus trap options
        this.focusTrapOptions = {
            /**
             * There is a delay between when the class is applied
             * and when the element is focusable
             */
            checkCanFocusTrap: (trapContainers) => {
                const results = trapContainers.map((trapContainer) => {
                    return new Promise((resolve) => {
                        const interval = setInterval(() => {
                            if (getComputedStyle(trapContainer).visibility !== 'hidden') {
                                resolve();
                                clearInterval(interval);
                            }
                        }, 5);
                    });
                });

                // Return a promise that resolves when all the trap containers are able to receive focus
                return Promise.all(results);
            },

            onActivate: () => {
                this.classList.add('is-active');
                document.documentElement.classList.add(
                    'has-modal-open',
                    `has-modal-${this._name}-open`
                );
                this.removeAttribute('inert');
                this.isOpen = true;

                this.onOpen?.(this.args);

                this.onActivate?.();
            },

            onPostActivate: () => {
                this.$togglers.forEach(($toggler) => {
                    $toggler.setAttribute('aria-expanded', true);
                });
            },

            onDeactivate: () => {
                this.classList.remove('is-active');
                document.documentElement.classList.remove(
                    'has-modal-open',
                    `has-modal-${this._name}-open`
                );
                this.setAttribute('inert', '');

                this.isOpen = false;

                // window.dispatchEvent(new CustomEvent(CUSTOM_EVENT.MODAL_CLOSE, { detail: this }));

                this.onClose?.(this.args);

                this.onDeactivate?.();
            },

            onPostDeactivate: () => {
                this.$togglers.forEach(($toggler) => {
                    $toggler.setAttribute('aria-expanded', false);
                });
            },

            clickOutsideDeactivates: true,
            initialFocus: this.$focusTrapTargets[0]
        };

        this.isOpen = false;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        this.bindEvents();

        this.focusTrap = createFocusTrap(
            this.$focusTrapTargets.length > 0 ? this.$focusTrapTargets : this,
            this.focusTrapOptions
        );
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    bindEvents() {
        this.unbindToggleEvent = delegateEvent(
            document.body,
            'click',
            this._selector,
            this.onToggle
        );
    }

    unbindEvents() {
        // this.unbindToggleEvent?.();
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    onToggle = (e: Event) => {
        if (this.classList.contains('is-active')) {
            this.close(e);
        } else {
            this.open(e);
        }
    };

    onVisitStart = (): void => {
        // Close the modal on page change
        this.close(undefined);
    };

    onModalOpen = (e): void => {
        // Close the modal if another one is opened
        if (e.detail !== this) {
            this.close(undefined);
        }
    };

    // =============================================================================
    // Methods
    // =============================================================================
    open(args): void {
        if (this.isOpen) return;
        this.args = args;
        this.focusTrap?.activate?.();
    }

    close(args): void {
        if (!this.isOpen) return;
        this.args = args;
        this.focusTrap?.deactivate?.();
    }

    rebindTogglers(): void {
        // Called from Load
        this.$togglers = document.querySelectorAll(`[data-modal-${this._name}-toggler]`);
    }
}

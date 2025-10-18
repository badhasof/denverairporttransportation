const CLASS = {
    IS_SUCCESS: 'is-success',
    IS_LOADING: 'is-loading',
    IS_ERROR: 'is-error'
} as const;

interface FormResponse {
    message?: string;
    [key: string]: any;
}

export class Form extends HTMLElement {
    private $form: HTMLFormElement;
    private $feedbackEl: HTMLElement | null;
    private $loaderEl: HTMLElement | null;
    private confirmMessage: string | null;
    private errorMessage: string | null;
    private onSubmit: (event: SubmitEvent) => void;

    constructor() {
        super();

        // UI
        const formElement = this.querySelector('form');
        if (!formElement) {
            throw new Error('Form element not found');
        }
        this.$form = formElement as HTMLFormElement;
        this.$feedbackEl = this.querySelector('[data-feedback]') as HTMLElement;
        this.$loaderEl = this.querySelector('[data-form-loader]') as HTMLElement;
        // Data
        this.confirmMessage = this.getAttribute('data-confirm-message');
        this.errorMessage = this.getAttribute('data-error-message');

        // Binding
        this.onSubmit = this.submit.bind(this);
    }

    connectedCallback(): void {
        this.$form.addEventListener('submit', this.onSubmit);
    }

    disconnectedCallback(): void {
        this.$form.removeEventListener('submit', this.onSubmit);
    }

    /**
     * Set loading state
     */
    private setLoadingState(state: boolean): void {
        (this.$form as any).isSubmitting = state;
        this.classList.toggle(CLASS.IS_LOADING, state);
        if (this.$loaderEl) {
            this.$loaderEl.classList.toggle('-active', state);
        }
    }

    /**
     * Set confirmation state & display confirmation message
     */
    private setConfirmationState(message: string): void {
        this.clearState();

        this.$form.reset();

        this.classList.add(CLASS.IS_SUCCESS);
        if (this.$feedbackEl) {
            this.$feedbackEl.innerHTML = message;
            this.$feedbackEl.style.color = 'var(--color-green)';
            this.showElement(this.$feedbackEl);
        }

        this.updateScroll();
    }

    /**
     * Set error state
     */
    private setErrorState(message: string): void {
        this.clearState();

        this.classList.add(CLASS.IS_ERROR);
        if (this.$feedbackEl) {
            this.$feedbackEl.innerHTML = message;
            this.$feedbackEl.style.color = 'var(--color-red)';
            this.showElement(this.$feedbackEl);
        }

        this.updateScroll();
    }

    /**
     * Clear all state
     */
    private clearState(): void {
        this.classList.remove(CLASS.IS_SUCCESS, CLASS.IS_LOADING, CLASS.IS_ERROR);

        if (this.$feedbackEl) {
            this.$feedbackEl.innerHTML = '';
            this.hideElement(this.$feedbackEl);
        }

        this.updateScroll();
    }

    /**
     * Hide Element from DOM
     */
    private hideElement(el: HTMLElement): void {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
    }

    /**
     * Show Element in DOM
     */
    private showElement(el: HTMLElement): void {
        el.style.display = 'block';
        el.setAttribute('aria-hidden', 'false');
    }

    /**
     * In case of use of locomotive-scroll, we need to update page height
     */
    private updateScroll(): void {
        //requestAnimationFrame(() => { this.call('update', null, 'Scroll') })
    }

    /**
     * Custom submit
     */
    private async submit(event: SubmitEvent): Promise<void> {
        try {
            event.preventDefault();
            const form = event.target as HTMLFormElement;

            // Check if form is already submitting
            if ((form as any).isSubmitting) {
                return;
            }

            this.clearState();
            this.setLoadingState(true);

            const action = form.getAttribute('action');
            if (!action) {
                throw new Error('Form action not found');
            }

            const response = await fetch(action, {
                method: 'POST',
                body: new FormData(form)
            });

            const data: FormResponse = await response.json();

            if (response.status !== 200) {
                this.setErrorState(this.errorMessage || 'An error occurred');
            } else {
                // This is the only way to determine if there was an error since SalesForce always returns 200 OK
                // if ((data.message || '').includes('success')) {
                this.setConfirmationState(this.confirmMessage || 'Form submitted successfully');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.setErrorState(this.errorMessage || 'An error occurred');
        } finally {
            this.setLoadingState(false);
        }
    }
}

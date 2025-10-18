import { Modal } from '@components/Modal';

export class ModalSaveBuild extends Modal {
    private $content: HTMLElement;
    private $contentActive: HTMLElement;
    private $form: HTMLFormElement;
    private $loader: HTMLElement;
    constructor() {
        super();
        // UI
        this.$content = this.querySelector('[data-modal-save-build-content]') as HTMLElement;
        this.$contentActive = this.querySelector(
            '[data-modal-save-build-content-active]'
        ) as HTMLElement;
        this.$form = this.querySelector('[data-modal-save-build-form]') as HTMLFormElement;
        this.$loader = this.querySelector('[data-modal-save-build-loader]') as HTMLElement;
        this.init();
    }

    private init(): void {
        this.$form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Use form data to send to the API
            const form = e.currentTarget as HTMLFormElement;
            const formData = new FormData(form);

            this.enterBusyState();

            try {
                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    body: formData
                });

                // Server error
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }

                // API returns JSON data
                const data = await response.json();

                // @todo Check if data.success is true

                // Exit busy state and show success message
                this.exitBusyState();
                this.showActiveContent();
            } catch (error) {
                // Show an error message
                this.showErrorMessage('Submission failed. Please try again.');
                this.exitBusyState();
            }
        });
    }

    private enterBusyState(): void {
        // Disable form inputs and show a loading indicator
        this.$loader.classList.add('-active');
    }

    private exitBusyState(): void {
        // Re-enable form inputs and hide the loading indicator
        this.$loader.classList.remove('-active');
    }

    private showErrorMessage(message: string): void {
        // Display an error message to the user
        // @todo
        console.error(message);
    }

    private showActiveContent(): void {
        this.$content.classList.add('-active');
        this.$contentActive.classList.remove('-active');
    }

    private hideActiveContent(): void {
        this.$content.classList.remove('-active');
        this.$contentActive.classList.add('-active');
    }

    onOpen(args: any): void {}

    onClose(): void {
        setTimeout(() => {
            this.hideActiveContent();
        }, 100);
    }
}

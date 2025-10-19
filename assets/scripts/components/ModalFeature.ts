import { Modal } from '@components/Modal';

export class ModalFeature extends Modal {
    private $inner: HTMLElement;

    constructor() {
        super();

        // UI
        this.$inner = this.querySelector('[data-modal-feature-inner]');
    }

    onOpen(args: any): void {
        const $target = args.target as HTMLElement;
        const data = $target.dataset.details;
        if (!data) return;

        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = data;
        const decodedData = textarea.value;

        this.$inner.innerHTML = decodedData;
    }

    onClose(): void {}
}

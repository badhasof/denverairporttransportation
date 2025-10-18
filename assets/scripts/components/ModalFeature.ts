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
        const data = $target.dataset.details ? JSON.parse($target.dataset.details) : {};
        if (!data) return;
        this.$inner.innerHTML = data;
    }

    onClose(): void {}
}

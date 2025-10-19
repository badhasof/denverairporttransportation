"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalFeature = void 0;
const Modal_1 = require("@components/Modal");
class ModalFeature extends Modal_1.Modal {
    constructor() {
        super();
        // UI
        this.$inner = this.querySelector('[data-modal-feature-inner]');
    }
    onOpen(args) {
        const $target = args.target;
        const data = $target.dataset.details;
        if (!data)
            return;

        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = data;
        const decodedData = textarea.value;

        this.$inner.innerHTML = decodedData;
    }
    onClose() { }
}
exports.ModalFeature = ModalFeature;

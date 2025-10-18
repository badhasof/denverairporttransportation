import { $screenDebounce } from '@scripts/stores/screen';

export class Rail extends HTMLElement {
    // Listeners
    private unbindScreenListener: (() => void) | null = null;

    private $item: HTMLElement;
    private $inner: HTMLElement;

    constructor() {
        super();

        this.$item = this.querySelector('[data-item]') as HTMLElement;
        this.$inner = this.querySelector('[data-inner]') as HTMLElement;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
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
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onResize = (): void => {
        this.$inner.innerHTML = '';
        this.constructRail();
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private constructRail(): void {
        const itemWidth = this.$item.clientWidth;
        const containerWidth = this.clientWidth;

        for (let i = 0; i < 2; i++) {
            const $list = document.createElement('ul');

            const nbOfLoop = Math.ceil(containerWidth / itemWidth) + 1;
            this.style.setProperty('--animation-duration', `${nbOfLoop * 5}s`);

            for (let j = 0; j < nbOfLoop; j++) {
                const clone = this.$item.cloneNode(true) as HTMLElement;
                $list.appendChild(clone);
            }

            this.$inner.appendChild($list);
        }
    }
}

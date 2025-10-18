import { $screenDebounce } from '@stores/screen';
import { FONT } from '../config';
import { whenReady } from '@utils/fonts';

export class Switcher extends HTMLElement {
    private $items: HTMLButtonElement[];
    private currentIndex: number | null;
    private data: {
        buttonWidth: number[];
        buttonOffset: number[];
    };

    private unbindScreenListener: () => void;

    constructor() {
        super();

        // UI
        this.$items = Array.from(
            this.querySelectorAll('[data-switcher-item]') as NodeListOf<HTMLButtonElement>
        );

        // Data
        this.currentIndex = null;

        this.data = {
            buttonWidth: [],
            buttonOffset: []
        };
    }

    ///////////////
    // Lifecyle
    ///////////////
    connectedCallback(): void {
        this.getDefaultIndex();
        this.bindEvents();
    }

    disconnectedCallback(): void {
        this.unbindEvents();
    }

    ///////////////
    // Events
    ///////////////
    bindEvents() {
        whenReady(FONT.EAGER).then((fonts) => this.onFontsLoaded(fonts));
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);

        for (const $item of this.$items) {
            $item.addEventListener('mouseenter', this.onMouseEnter);
            $item.addEventListener('mouseleave', this.onMouseLeave);
            $item.addEventListener('click', this.onItemClick);
        }
    }

    unbindEvents() {
        this.unbindScreenListener?.();

        for (const $item of this.$items) {
            $item.removeEventListener('mouseenter', this.onMouseEnter);
            $item.removeEventListener('mouseleave', this.onMouseLeave);
            $item.removeEventListener('click', this.onItemClick);
        }
    }

    ///////////////
    // Callbacks
    ///////////////
    private onResize = (): void => {
        this.computeMetrics();
        this.computeValues();
    };

    private onFontsLoaded = (fonts: any): void => {
        this.computeMetrics();
        this.computeValues();
    };

    private onItemClick = (event: MouseEvent): void => {
        event.preventDefault();

        const $item = event.currentTarget as HTMLButtonElement;
        const index = Array.from(this.$items).indexOf($item);

        this.setActiveItem(index);
        this.computeValues(index);
    };

    private onMouseEnter = (event: MouseEvent): void => {
        const $item = event.target as HTMLButtonElement;
        const index = Array.from(this.$items).indexOf($item);
        this.computeValues(index);
    };

    private onMouseLeave = (event: MouseEvent): void => {
        this.computeValues(this.currentIndex);
    };

    ///////////////
    // Methods
    ///////////////
    private getDefaultIndex(): void {
        this.setActiveItem(0);
    }

    private computeMetrics(): void {
        let index = 0;
        let cumulativeWidth = 0;

        while (index < this.$items.length) {
            const itemWidth = this.$items[index].clientWidth;
            this.data.buttonWidth[index] = itemWidth;

            if (index > 0) {
                cumulativeWidth += this.data.buttonWidth[index - 1];
                this.data.buttonOffset[index] = cumulativeWidth;
            } else {
                this.data.buttonOffset[index] = 0;
            }

            index++;
        }
    }

    public setActiveItem(index: number = null): void {
        // Remove active to old
        let i = 0;
        while (i < this.$items.length) {
            if (this.$items[i].disabled == true) {
                this.$items[i].removeAttribute('disabled');
                this.$items[i].classList.remove('is-active');
                break;
            }
            i++;
        }

        // Set active to selected item
        if (index !== null) {
            this.$items[index].setAttribute('disabled', '');
            this.$items[index].classList.add('is-active');
        }

        this.currentIndex = index;
    }

    public computeValues(index: number | null = this.currentIndex): void {
        const safeIndex = index !== null ? index : 0;
        this.style.setProperty('--button-width', `${this.data.buttonWidth[safeIndex]}px`);
        this.style.setProperty('--button-offset', `${this.data.buttonOffset[safeIndex]}px`);
    }
}

import { $screenDebounce } from '@scripts/stores/screen';
import { FONT } from '../config';
import { whenReady } from '@utils/fonts';
import { $mediaStatus } from '@scripts/stores/deviceStatus';

export class Aside extends HTMLElement {
    // Listeners
    private unbindScreenListener: (() => void) | null = null;

    static ASIDE_PROGRESS_EVENT = 'onAsideProgress';
    static SECTION_PROGRESS_EVENT = 'onSectionProgress';
    static SECTION_INVIEW_EVENT = 'onSectionInview';

    $el: HTMLElement;
    $inner: HTMLElement | undefined;
    $list: HTMLElement | undefined;
    $innerArea: HTMLElement | undefined;
    $items: HTMLElement[];
    $links: HTMLElement[];
    listHeight: number = 0;
    delta: number = 0;
    uid: string;

    constructor() {
        super();

        // UI
        this.$inner = this.querySelector('[data-inner]') as HTMLElement;
        this.$list = this.querySelector('[data-list]') as HTMLElement;
        this.$innerArea = this.querySelector('[data-inner-area]') as HTMLElement;
        this.$items = Array.from(this.querySelectorAll('[data-item]')) as HTMLElement[];
        this.$links = Array.from(this.querySelectorAll('[data-link]')) as HTMLElement[];

        this.uid = this.getAttribute('data-id') || '';
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        if ($mediaStatus.get().isFromMedium) {
            this.bindEvents();
        }
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        whenReady(FONT.EAGER).then((fonts) => this.onFontsLoaded(fonts));
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
        if (this.uid) {
            window.addEventListener(
                `${Aside.ASIDE_PROGRESS_EVENT}${this.uid}`,
                this.onScrollProgress as EventListener
            );

            window.addEventListener(
                `${Aside.SECTION_PROGRESS_EVENT}${this.uid}`,
                this.onSectionProgress as EventListener
            );

            window.addEventListener(
                `${Aside.SECTION_INVIEW_EVENT}${this.uid}`,
                this.onSectionInview as EventListener
            );
        }
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.unbindScreenListener = null;

        if (this.uid) {
            window.removeEventListener(
                `${Aside.ASIDE_PROGRESS_EVENT}${this.uid}`,
                this.onScrollProgress as EventListener
            );

            window.removeEventListener(
                `${Aside.SECTION_PROGRESS_EVENT}${this.uid}`,
                this.onSectionProgress as EventListener
            );

            window.removeEventListener(
                `${Aside.SECTION_INVIEW_EVENT}${this.uid}`,
                this.onSectionInview as EventListener
            );
        }
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onResize = (): void => {
        this.computeMetrics();
    };

    private onFontsLoaded = (fonts: any): void => {
        this.computeMetrics();
    };

    private onScrollProgress = (e: CustomEvent<ScrollProgressEventDetail>): void => {
        const { progress } = e.detail;
        this.style.setProperty('--inview-progress', progress);
    };

    private onSectionProgress = (e: CustomEvent<ScrollProgressEventDetail>): void => {
        const progress = e.detail.progress;
        const $target = e.detail.target as HTMLElement;
        const index = Number($target.dataset.index);

        if (index == 0) console.log(progress);

        this.$items[index]?.style.setProperty('--section-progress', progress.toString());
    };

    private onSectionInview = (e: CustomEvent<ScrollProgressEventDetail>): void => {
        const way = e.detail.way;
        const $target = e.detail.target as HTMLElement;
        const index = Number($target.dataset.index);

        const $link = this.$items[index]?.querySelector('a') as HTMLElement;
        $link?.classList.toggle('is-active', way === 'enter');
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private computeMetrics(): void {
        if (!this.$list || !this.$inner) return;

        this.listHeight = this.$list.clientHeight;
        this.delta = this.$innerArea.clientHeight - this.listHeight;

        this.style.setProperty('--delta', this.delta.toString());
        this.style.setProperty('--list-height', `${this.listHeight}px`);
    }
}

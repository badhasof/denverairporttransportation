import { Blossom } from '@blossom-carousel/core';
import { $screenDebounce } from '@stores/screen';

export class Carousel extends HTMLElement {
    private blossom!: ReturnType<typeof Blossom>;
    private $container!: HTMLElement;
    private $prev!: HTMLButtonElement;
    private $next!: HTMLButtonElement;
    private $pagination!: HTMLElement;
    private $pages!: NodeListOf<HTMLElement>;
    private $pageClone!: HTMLElement;
    private $links!: NodeListOf<HTMLAnchorElement>;
    private itemWidth: number;
    private containerWidth: number;
    private $items!: NodeListOf<HTMLElement>;
    private oldActiveIndex: number;
    private activeIndex: number = 0;
    private threshold: number;
    private itemsPerView: number;
    private totalPages: number;
    unbindScreenListener: () => void;

    constructor() {
        super();

        // UI
        this.$container = this.querySelector('[data-container]') || this;
        this.$items = this.querySelectorAll('[data-item]');
        this.$prev = this.querySelector('[data-prev]') as HTMLButtonElement;
        this.$next = this.querySelector('[data-next]') as HTMLButtonElement;
        this.$pagination = this.querySelector('[data-pagination]')!;
        this.$pageClone = this.querySelector('[data-page-clone]')!;
        this.$pages = this.querySelectorAll('[data-page]');

        this.$links = this.querySelectorAll('a');

        // Data
        this.totalPages = -1; // Total number of pages
        this.oldActiveIndex = -1; // Previous active index
        this.activeIndex = 0;
        this.threshold = 0.65; // Threshold for active index detection
        this.itemWidth = 0;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        if (!this.$container || !this.$items.length) {
            console.warn('Carousel: Container or items not found.');
            return;
        }

        this.$links.forEach(($link) => {
            $link.setAttribute('draggable', 'false');
        });

        this.blossom = Blossom(this.$container);
        this.blossom.init();

        this.computeMetrics();
        this.computePagination();

        requestAnimationFrame(() => {
            this.bindEvents();
            this.onScroll();
        });
    }

    disconnectedCallback() {
        this.blossom.destroy();
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
        this.$container.addEventListener('scroll', this.onScroll);
        this.$prev?.addEventListener('click', this.onPrevClick);
        this.$next?.addEventListener('click', this.onNextClick);
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        this.$container.removeEventListener('scroll', this.onScroll);
        this.$prev?.removeEventListener('click', this.onPrevClick);
        this.$next?.removeEventListener('click', this.onNextClick);
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onPrevClick = (): void => {
        this.goTo(this.activeIndex - 1);
    };

    private onNextClick = (): void => {
        this.goTo(this.activeIndex + 1);
    };

    private onPageClick = (event: MouseEvent): void => {
        const $target = event.currentTarget as HTMLElement;
        const parent = $target.parentNode as HTMLElement | null;
        const index = parseInt(parent?.dataset.index || '0', 10);

        if (index === this.activeIndex) return;

        this.goTo(index);
    };

    private onSlideChange = (index: number): void => {
        // Update old active index
        this.oldActiveIndex = this.activeIndex;

        // Update active index
        this.$pages.forEach(($page) => {
            $page.classList.remove('is-active');
        });

        if (this.$pages[index]) {
            this.$pages[index].classList.add('is-active');
        }

        // Disable next button if on last slide
        if (index == this.$pages.length - 1) {
            this.$next.disabled = true;
        } else {
            this.$next.disabled = false;
        }

        // Disable previous button if on first slide
        if (index == 0) {
            this.$prev.disabled = true;
        } else {
            this.$prev.disabled = false;
        }
    };

    private onResize = (): void => {
        this.computeMetrics();
        this.computePagination();
        this.onScroll();
    };

    private onScroll = (): void => {
        const scrollLeft = Math.abs(this.$container.scrollLeft);
        const scrollProgress = (scrollLeft - this.threshold * this.itemWidth) / this.containerWidth;
        this.activeIndex = Math.floor(scrollProgress / (1 / this.$items.length) + 1);

        // Check if the active index has changed
        if (this.activeIndex !== this.oldActiveIndex) {
            this.onSlideChange(this.activeIndex);
        }
    };

    // =============================================================================
    // Methods
    // =============================================================================

    private computeMetrics(): void {
        this.itemWidth = this.$items[0].getBoundingClientRect().width;
        this.containerWidth = this.$items.length * this.itemWidth;
    }

    private computePagination(): void {
        // Calculate the items per view
        this.itemsPerView = Math.floor(
            this.$container.getBoundingClientRect().width / this.itemWidth
        );

        // Calculate how many indexes we need
        const totalPages = this.$items.length - this.itemsPerView + 1;

        if (totalPages !== this.totalPages) {
            this.removePaginationEvents();

            this.totalPages = totalPages;

            // Clear previous pagination
            this.$pagination.innerHTML = '';

            if (this.totalPages > 1) {
                this.showPagination();
            } else {
                this.hidePagination();
                return;
            }

            // Add pagination items
            for (let i = 0; i < this.totalPages; i++) {
                const $page = this.$pageClone.cloneNode(true) as HTMLElement;
                $page.removeAttribute('data-page-clone');
                $page.dataset.index = i.toString();
                this.$pagination.appendChild($page);
            }

            this.$pageClone.remove();

            // Update reference
            this.$pages = this.$pagination.querySelectorAll('[data-page]');
            this.addPaginationEvents();
        }
    }

    private showPagination(): void {
        this.classList.remove('is-pagination-hidden');
    }

    private hidePagination(): void {
        this.classList.add('is-pagination-hidden');
    }

    private removePaginationEvents(): void {
        this.$pages?.forEach(($page) => {
            $page.removeEventListener('click', this.onPageClick);
        });
    }

    private addPaginationEvents(): void {
        this.$pages.forEach(($page) => {
            $page.addEventListener('click', this.onPageClick);
        });
    }

    private goTo(index: number): void {
        if (index < 0 || index >= this.$pages.length) {
            console.warn('Carousel: Index out of bounds.');
            return;
        }

        this.$items[index].scrollIntoView({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest'
        });

        this.activeIndex = index;
        this.onSlideChange(this.activeIndex);
    }
}

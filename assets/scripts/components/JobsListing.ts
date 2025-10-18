import { Scroll } from '@classes/Scroll';

export class JobsListing extends HTMLElement {
    // UI
    private $list: HTMLElement;
    private $items: NodeListOf<HTMLElement>;
    private $sortButtons: NodeListOf<HTMLElement>;
    private $filtersButtons: NodeListOf<HTMLElement>;

    constructor() {
        super();

        // UI
        this.$list = this.querySelector('[data-list]') as HTMLElement;
        this.$items = this.querySelectorAll('[data-item]') as NodeListOf<HTMLElement>;
        this.$sortButtons = this.querySelectorAll('[data-sort]') as NodeListOf<HTMLElement>;
        this.$filtersButtons = this.querySelectorAll('[data-filter]') as NodeListOf<HTMLElement>;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    private connectedCallback() {
        this.bindEvents();
    }

    private disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents() {
        this.$sortButtons.forEach(($button) => {
            $button.addEventListener('click', this.onSortClick);
        });

        this.$filtersButtons.forEach(($button) => {
            $button.addEventListener('click', this.onFilterClick);
        });
    }

    private unbindEvents() {
        this.$sortButtons.forEach(($button) => {
            $button.removeEventListener('click', this.onSortClick);
        });

        this.$filtersButtons.forEach(($button) => {
            $button.removeEventListener('click', this.onFilterClick);
        });
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onSortClick = (e: MouseEvent) => {
        const $target: any = e.target;
        const slug = $target.dataset.slug;

        // Error
        if (slug == null) {
            console.warn('Error: no slug provided');
            return;
        }

        // Get current order
        const currentOrder = parseInt($target.dataset.order);

        // Compute new order
        const newOrder = currentOrder == 0 ? 1 : -1 * currentOrder;

        // Sort items
        this.sortItems(slug, newOrder);
        // Update order attribute
        $target.dataset.order = newOrder;
    };

    private onFilterClick = (e: MouseEvent) => {
        const $target: any = e.target;
        const category = $target.dataset.filter;

        // Error
        if (category == null) {
            console.warn('Error: no category provided');
            return;
        }

        // Reset all filters
        this.$filtersButtons.forEach(($button) => {
            $button.classList.remove('is-active');
        });

        // Activate current filter
        $target.classList.add('is-active');

        // Filter items
        this.filterItems(category);

        Scroll.scrollTo(this, { offset: -100, duration: 0.8 });
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private sortItems(slug: string, order: number) {
        const sortedItems = Array.from(this.$items).sort((a, b) => {
            if (a.dataset[slug] && b.dataset[slug]) {
                if (a.dataset[slug] < b.dataset[slug]) {
                    return order * -1;
                } else if (a.dataset[slug] > b.dataset[slug]) {
                    return order;
                }
            }
            return 0;
        });

        // Append sorted items to list
        for (let item of sortedItems) {
            this.$list.appendChild(item);
        }
    }

    private async filterItems(category: string) {
        await this.hideList();

        this.$items.forEach(($item) => {
            const itemCategory = $item.dataset.category;
            if (category === 'all') {
                $item.classList.remove('hidden');
                $item.ariaHidden = 'false';
            } else {
                $item.classList.toggle('hidden', category !== itemCategory);
                $item.ariaHidden = (category !== itemCategory).toString();
            }
        });

        await this.showList();
    }

    private hideList(): Promise<void> {
        return new Promise((resolve) => {
            const animation = this.$list.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 200,
                easing: 'ease-in-out',
                fill: 'forwards'
            });

            animation.onfinish = () => resolve();
        });
    }

    private showList(): Promise<void> {
        return new Promise((resolve) => {
            const animation = this.$list.animate(
                [
                    { opacity: 0, transform: 'translateY(30px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                {
                    duration: 600,
                    easing: 'cubic-bezier(0.38, 0, 0.215, 1)',
                    fill: 'forwards'
                }
            );

            animation.onfinish = () => resolve();
        });
    }
}

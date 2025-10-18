import { $screenDebounce } from '@scripts/stores/screen';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export class ProductList extends HTMLElement {
    // Listeners
    private unbindScreenListener: (() => void) | null = null;
    private heading: HTMLElement;
    private cards: NodeListOf<HTMLElement>;
    private prevOffset: number = 0;
    private tls: GSAPTimeline[] = [];
    constructor() {
        super();
        this.heading = this.querySelector('[data-heading]') as HTMLElement;
        this.cards = this.querySelectorAll('[data-card]');
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
        this.tls.forEach((tl) => tl.kill());
        this.tls = [];
        this.cards.forEach((card) => {
            card.style.setProperty('--sticky-progress', '0');
        });
        this.computeOffset();
    };

    private computeOffset = (): void => {
        const cardHeight = this.cards[0]?.getBoundingClientRect().height || 0;
        const headingStyle = getComputedStyle(this.heading);
        const marginBottom = parseFloat(headingStyle.getPropertyValue('margin-bottom'));
        const cardStickyTop = window.innerWidth * 0.12;
        const headingHeight = this.heading.getBoundingClientRect().height;
        const overlap = headingHeight - cardStickyTop;
        const offset = cardHeight - marginBottom - overlap + this.prevOffset;
        this.style.setProperty('--padding-offset', `${offset}px`);
        this.prevOffset = offset;

        const top = window.innerWidth * 0.1 + window.innerHeight * 0.1;
        this.cards.forEach((card, index) => {
            this.tls[index] = gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    start: `top-=${top}px top`,
                    end: `bottom-=${top} top`,
                    scrub: true,
                    onUpdate: (e) => {
                        card.style.setProperty('--sticky-progress', e.progress.toString());
                    }
                }
            });
        });
    };
}

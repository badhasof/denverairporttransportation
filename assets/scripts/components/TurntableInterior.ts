enum ColorType {
    GreenYellow = 'green-yellow',
    TangerinePlum = 'tangerine-plum'
}

export default class TurntableInterior extends HTMLElement {
    // =============================================================================
    // Private properties
    // =============================================================================

    // DOM elements
    private readonly $colorTogglers: NodeListOf<HTMLElement>;
    private readonly $images: NodeListOf<HTMLElement>;

    // State
    private $activeImage: HTMLElement | null = null;
    private currentColor: ColorType;
    private isInitialized = false;

    // Constants
    private static readonly ACTIVE_CLASS = 'is-active';

    constructor() {
        super();

        // Get DOM elements
        this.$colorTogglers = this.querySelectorAll('[data-color-toggler]');
        this.$images = this.querySelectorAll('[data-image]');

        // Set default color
        this.currentColor =
            (this.getAttribute('data-default-color') as ColorType) || ColorType.GreenYellow;

        // Basic validation
        if (this.$images.length === 0) {
            console.warn('TurntableInterior: No images found');
        }
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        if (this.isInitialized) return;

        this.bindEvents();
        this.initializeFirstImage();
        this.updateDataAttributes();
        this.isInitialized = true;
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Private methods
    // =============================================================================
    private initializeFirstImage(): void {
        // Find already active image or activate first one
        const activeImage = Array.from(this.$images).find((img) =>
            img.classList.contains(TurntableInterior.ACTIVE_CLASS)
        );

        if (activeImage) {
            this.setActiveImage(activeImage);
        } else if (this.$images.length > 0) {
            this.setActiveImage(this.$images[0]);
        }
    }

    private updateDataAttributes(): void {
        this.dataset.color = this.currentColor;
    }

    private setActiveImage(imageElement: HTMLElement): void {
        // Remove active state from current image
        if (this.$activeImage) {
            this.$activeImage.classList.remove(TurntableInterior.ACTIVE_CLASS);
        }

        // Set new active image
        this.$activeImage = imageElement;
        imageElement.classList.add(TurntableInterior.ACTIVE_CLASS);

        // Update current color based on the active image
        const color = imageElement.getAttribute('data-image');
        if (color) {
            this.currentColor = color as ColorType;
            this.updateDataAttributes();
        }
    }

    private findImageByColor(color: ColorType): HTMLElement | null {
        return (
            Array.from(this.$images).find((image) => image.getAttribute('data-image') === color) ||
            null
        );
    }

    // =============================================================================
    // Event handling
    // =============================================================================
    private bindEvents(): void {
        this.$colorTogglers.forEach((toggler) => {
            toggler.addEventListener('click', this.onColorTogglerClick);
        });
    }

    private unbindEvents(): void {
        this.$colorTogglers.forEach((toggler) => {
            toggler.removeEventListener('click', this.onColorTogglerClick);
        });
    }

    private onColorTogglerClick = (event: MouseEvent): void => {
        const target = event.currentTarget as HTMLElement;
        const color = target.getAttribute('data-color-toggler') as ColorType;

        if (!color || this.currentColor === color) {
            return;
        }

        const targetImage = this.findImageByColor(color);
        if (targetImage) {
            this.setActiveImage(targetImage);
        } else {
            console.warn(`No image found for color: ${color}`);
        }
    };
}

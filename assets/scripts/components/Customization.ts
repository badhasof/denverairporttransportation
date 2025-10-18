import {
    $customization,
    $customizationExteriorColor,
    $customizationFeatures,
    $customizationInteriorColor,
    $customizationView
} from '../stores/customization';
import { Switcher } from './Switcher';

export class Customization extends HTMLElement {
    private exteriorViewBtn: HTMLButtonElement;
    private interiorViewBtn: HTMLButtonElement;
    private exteriorColorBtns: NodeListOf<HTMLInputElement>;
    private interiorColorBtns: NodeListOf<HTMLInputElement>;
    private customizationFeatures: NodeListOf<HTMLLIElement>;
    private customizationImage: HTMLImageElement;
    private customizationExteriorImageMobile: HTMLImageElement;
    private customizationInteriorImageMobile: HTMLImageElement;
    private customizationData: any;
    private submitBtn: HTMLAnchorElement;
    private switcher: Switcher;
    private price: HTMLSpanElement;
    // Listeners
    private unbindCustomizationViewListener: (() => void) | null = null;
    private unbindCustomizationExteriorColorListener: (() => void) | null = null;
    private unbindCustomizationInteriorColorListener: (() => void) | null = null;
    private unbindCustomizationFeaturesListener: (() => void) | null = null;
    private unbindCustomizationListener: (() => void) | null = null;

    whenLoaded = Promise.all([customElements.whenDefined('c-switcher')]);

    constructor() {
        super();

        this.exteriorViewBtn = this.querySelector(
            '[data-customization-view="exterior"]'
        ) as HTMLButtonElement;
        this.interiorViewBtn = this.querySelector(
            '[data-customization-view="interior"]'
        ) as HTMLButtonElement;
        this.exteriorColorBtns = this.querySelectorAll(
            'input[data-customization-color-exterior]'
        ) as NodeListOf<HTMLInputElement>;
        this.interiorColorBtns = this.querySelectorAll(
            'input[data-customization-color-interior]'
        ) as NodeListOf<HTMLInputElement>;
        this.customizationFeatures = this.querySelectorAll(
            '[data-customization-feature]'
        ) as NodeListOf<HTMLLIElement>;
        this.customizationImage = this.querySelector('[data-customization-image]')?.querySelector(
            'img'
        ) as HTMLImageElement;
        this.customizationExteriorImageMobile = this.querySelector(
            '[data-customization-exterior-image]'
        )?.querySelector('img') as HTMLImageElement;
        this.customizationInteriorImageMobile = this.querySelector(
            '[data-customization-interior-image]'
        )?.querySelector('img') as HTMLImageElement;
        this.customizationData = JSON.parse(this.getAttribute('data-customization') || '{}');
        this.submitBtn = this.querySelector('a[data-customization-submit]') as HTMLAnchorElement;
        this.price = this.querySelector('[data-customization-price]') as HTMLSpanElement;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        this.whenLoaded.then(() => {
            requestAnimationFrame(() => {
                this.switcher = this.querySelector('.c-switcher') as Switcher;
            });
        });

        //If no customization data is found, initialize the colors and features from the data, otherwise use the stored data
        if (
            $customization.get().product_id === '' ||
            $customization.get().product_id !== this.customizationData.id
        ) {
            $customization.setKey('colorways', {
                exterior: this.customizationData.colorways.exterior.find(
                    (color: any) => color.selected
                )?.id,
                interior: this.customizationData.colorways.interior.find(
                    (color: any) => color.selected
                )?.id
            });
            $customization.setKey(
                'features',
                this.customizationData.features
                    .filter((feature: any) => feature.selected)
                    .map((feature: any) => feature.id)
            );
            $customization.setKey('product_id', this.customizationData.id);
        }

        //If addons are included, set the features to the included features
        if (this.customizationData.addons.some((addon: any) => addon.included)) {
            $customization.setKey(
                'features',
                this.customizationData.addons
                    .filter((addon: any) => addon.included)
                    .map((addon: any) => addon.id)
            );
        }
        this.buildUrl();
        this.bindEvents();
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        this.unbindCustomizationExteriorColorListener = $customizationExteriorColor.listen(() => {
            this.onColorChange('exterior');
            this.onViewChange('exterior');
        });
        this.unbindCustomizationInteriorColorListener = $customizationInteriorColor.listen(() => {
            this.onColorChange('interior');
            this.onViewChange('interior');
        });
        this.unbindCustomizationFeaturesListener = $customizationFeatures.listen(
            this.onFeatureChange
        );
        this.unbindCustomizationViewListener = $customizationView.listen(this.onViewChange);
        this.unbindCustomizationListener = $customization.listen(this.onCustomizationChange);

        this.exteriorViewBtn.addEventListener('click', () => this.setView('exterior'));
        this.interiorViewBtn.addEventListener('click', () => this.setView('interior'));
        this.exteriorColorBtns.forEach((btn) =>
            btn.addEventListener('click', () => this.setColor('exterior', btn.id))
        );
        this.interiorColorBtns.forEach((btn) =>
            btn.addEventListener('click', () => this.setColor('interior', btn.id))
        );
        this.customizationFeatures.forEach((feature) =>
            feature
                .querySelector('button')
                ?.addEventListener('click', () => this.setFeature(feature.id))
        );
    }

    private unbindEvents(): void {
        this.unbindCustomizationViewListener = null;
        this.unbindCustomizationExteriorColorListener = null;
        this.unbindCustomizationInteriorColorListener = null;
        this.exteriorViewBtn.removeEventListener('click', () => this.setView('exterior'));
        this.interiorViewBtn.removeEventListener('click', () => this.setView('interior'));
        this.exteriorColorBtns.forEach((btn) =>
            btn.removeEventListener('click', () => this.setColor('exterior', btn.id))
        );
        this.interiorColorBtns.forEach((btn) =>
            btn.removeEventListener('click', () => this.setColor('interior', btn.id))
        );
    }

    // =============================================================================
    // Callbacks
    // =============================================================================

    // Update the URL with the current customization data
    private onCustomizationChange = (): void => {
        this.updatePrice();
        this.buildUrl();
    };

    private buildUrl(): void {
        const customization = $customization.get();
        const params = new URLSearchParams(window.location.search);

        // Set or update the color params
        if (customization.colorways?.interior) {
            params.set('interior_color', customization.colorways.interior);
        }
        if (customization.colorways?.exterior) {
            params.set('exterior_color', customization.colorways.exterior);
        }

        // Remove any existing addons (both formats just in case)
        params.delete('addons');
        params.delete('addons[]');

        // Add new addons[] if features exist
        if (Array.isArray(customization.features) && customization.features.length > 0) {
            customization.features.forEach((feature: string) => {
                params.append('addons[]', feature);
            });
        }

        // Create final search string with decoded []
        const searchString = params.toString().replace(/%5B%5D/g, '[]');

        // Update the URL without reloading the page
        const newUrl = `${window.location.pathname}?${searchString}`;
        window.history.replaceState(window.history.state, '', newUrl);

        // Also update the submit link href
        const reviewPath = window.location.pathname.replace(/customization/g, 'review');
        this.submitBtn.href = `${reviewPath}?${searchString}&price=${this.computePrice()}`;
    }

    // Update the image src based on the current view
    private onViewChange = (view: 'exterior' | 'interior'): void => {
        let src = '';
        if (view === 'exterior') {
            src = this.customizationData.colorways[view].find(
                (color: any) => color.id === $customization.get().colorways.exterior
            )?.image.src;
            this.customizationExteriorImageMobile.src = src;
        } else if (view === 'interior') {
            src = this.customizationData.colorways[view].find(
                (color: any) => color.id === $customization.get().colorways.interior
            )?.image.src;
            this.customizationInteriorImageMobile.src = src;
        }
        this.customizationImage.src = src;
        this.setViewButton(view);
    };

    // Update the feature buttons based on the current features
    private onFeatureChange = (): void => {
        this.customizationFeatures.forEach((feature) => {
            const btn = feature.querySelector('button');
            if (btn && !btn.classList.contains('-disabled')) {
                if ($customization.get().features.includes(feature.id)) {
                    btn.classList.add('-color-black');
                    const label = btn.querySelector('.c-button_label');
                    const container = btn.querySelector('.c-button_label-container');
                    if (label) label.innerHTML = 'Remove';
                    if (container) container.setAttribute('data-label', 'Remove');
                } else {
                    btn.classList.remove('-color-black');
                    btn.classList.add('-color-white');
                    const label = btn.querySelector('.c-button_label');
                    const container = btn.querySelector('.c-button_label-container');
                    if (label) label.innerHTML = 'Add';
                    if (container) container.setAttribute('data-label', 'Add');
                }
            }
        });
    };

    private onColorChange = (view: 'exterior' | 'interior'): void => {
        const selectedColorId = $customization.get().colorways[view];
        const btns = view === 'exterior' ? this.exteriorColorBtns : this.interiorColorBtns;
        btns.forEach((btn) => {
            btn.checked = btn.id === selectedColorId;
        });
    };

    // =============================================================================
    // Methods
    // =============================================================================

    private setView(view: 'exterior' | 'interior'): void {
        $customization.setKey('view', view);
        this.setViewButton(view);
        this.onViewChange(view);
    }

    private setViewButton(view: 'exterior' | 'interior'): void {
        if (!this.switcher) return;
        if (view === 'exterior') {
            this.switcher.setActiveItem(0);
            this.switcher.computeValues(0);
        } else {
            this.switcher.setActiveItem(1);
            this.switcher.computeValues(1);
        }
    }

    private setColor(view: 'exterior' | 'interior', id: string): void {
        $customization.setKey('colorways', {
            ...$customization.get().colorways,
            [view]: id
        });
    }

    private setFeature(id: string): void {
        const features = $customization.get().features;
        if (features.includes(id)) {
            $customization.setKey(
                'features',
                features.filter((feature) => feature !== id)
            );
        } else {
            $customization.setKey('features', [...features, id]);
        }
    }

    private updatePrice(): void {
        this.price.innerHTML = this.formatPrice(this.computePrice());
    }

    private computePrice(): number {
        let price = this.customizationData.price.startingFrom;
        const features = $customization.get().features;
        const addons = this.customizationData.addons;

        features.forEach((feature: string) => {
            const addon = addons.find((addon: any) => addon.id === feature);
            if (addon && !addon.included) {
                price += addon.price;
            }
        });

        return price;
    }

    private formatPrice(price: number): string {
        return `$${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
}

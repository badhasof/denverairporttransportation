import { computed, map } from 'nanostores';
import { persistStore } from './localStorage';

export type CustomizationValues = {
    view: 'exterior' | 'interior';
    product_id: string;
    features: string[];
    colorways: {
        exterior: string;
        interior: string;
    };
};

export const $customization = map<CustomizationValues>({
    view: 'exterior',
    product_id: '',
    features: [],
    colorways: {
        exterior: '',
        interior: ''
    }
});

persistStore($customization, 'customization');

export const $customizationView = computed($customization, (customization) => customization.view);
export const $customizationExteriorColor = computed(
    $customization,
    (customization) => customization.colorways.exterior
);
export const $customizationInteriorColor = computed(
    $customization,
    (customization) => customization.colorways.interior
);
export const $customizationFeatures = computed(
    $customization,
    (customization) => customization.features
);

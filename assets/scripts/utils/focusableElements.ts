/**
 * Selector for all potentially focusable elements
 */
const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    'details',
    '[tabindex]',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'iframe',
    'object',
    'embed',
    'area[href]'
] as const;

/**
 * Get all focusable elements within a container
 * @param container - The container element to search within
 * @param includeContainer - Whether to include the container itself if it's focusable
 * @returns Array of focusable HTML elements
 */
export function getFocusableElements(
    container: Element | Document = document,
    includeContainer: boolean = false
): HTMLElement[] {
    const selector = FOCUSABLE_SELECTORS.join(', ');
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];

    // Add container if it's focusable and requested
    if (includeContainer && container !== document) {
        const containerElement = container as HTMLElement;
        if (FOCUSABLE_SELECTORS.some((sel) => containerElement.matches(sel))) {
            elements.unshift(containerElement);
        }
    }

    return elements;
}

import { Transitions } from '@classes/Transitions';
import { Scroll } from '@classes/Scroll';
import { $screen } from '@stores/screen';
import registerComponents from '@scripts/registerComponents';
import { setViewportSize } from '@utils/setViewportSize';
import { isWebKit } from '@utils/is';

// Initialize the Transitions class
const transitions = new Transitions();
transitions.init();

// Initialize the Scroll class
Scroll.init();

document.documentElement.classList.toggle('is-webkit', isWebKit());

if (process.env.NODE_ENV === 'development') {
    // Dynamically import the grid-helper only in development mode
    import('@locomotivemtl/grid-helper')
        .then(({ default: GridHelper }) => {
            new GridHelper({
                columns: 'var(--grid-columns)',
                gutterWidth: `var(--grid-gutter)`,
                marginWidth: `var(--grid-margin)`
            });
        })
        .catch((error) => {
            console.error('Failed to load the grid helper:', error);
        });
}

// Set viewport sizes
$screen.subscribe(() => {
    setViewportSize();
});

// Register components
registerComponents();

/**
 * Debug focus
 */
/* document.addEventListener(
    'focusin',
    function () {
        console.log('focused: ', document.activeElement);
    },
    true
);
 */

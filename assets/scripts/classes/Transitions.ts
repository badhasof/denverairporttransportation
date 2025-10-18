import Swup from 'swup';
import SwupHeadPlugin from '@swup/head-plugin';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupScriptsPlugin from '@swup/scripts-plugin';
import SwupScrollPlugin from '@swup/scroll-plugin';
import SwupA11yPlugin from '@swup/a11y-plugin';
import SwupFragmentPlugin from '@swup/fragment-plugin';
import { Scroll } from '@scripts/classes/Scroll';
import { $html } from '@scripts/utils/dom';
import { toDash } from '@scripts/utils/string';
import { getComponentsByPrototype } from '@locomotivemtl/component-manager';
export class Transitions {
    static CLASS = {
        READY: 'is-ready',
        FIRST_LOADED: 'is-first-loaded',
        TRANSITION: 'is-transitioning'
    };
    swup;
    constructor() { }
    // =============================================================================
    // Lifecycle
    // =============================================================================
    init() {
        this.initSwup();
        requestAnimationFrame(() => {
            $html.classList.add(Transitions.CLASS.READY);
            $html.classList.add(Transitions.CLASS.FIRST_LOADED);
        });
    }
    destroy() {
        this.swup?.destroy();
    }
    // =============================================================================
    // Methods
    // =============================================================================
    initSwup() {
        this.swup = new Swup({
            animateHistoryBrowsing: true,
            linkToSelf: 'navigate',
            ignoreVisit: (url, { el, event } = {}) => {
                if (url.lastIndexOf('#show-cookie-consent') != -1) {
                    return true;
                }
                return !!el?.closest('[data-no-swup]');
            },
            plugins: this._getSwupPlugins()
        });
        // Hooks
        this.swup.hooks.on('visit:start', this.onVisitStart);
        this.swup.hooks.before('content:replace', this.beforeContentReplace);
        this.swup.hooks.on('content:replace', this.onContentReplace);
        this.swup.hooks.on('animation:in:end', this.onAnimationInEnd);
        this.swup.hooks.on('animation:out:start', this.onAnimationOutStart);
        this.swup.hooks.on('fetch:error', (e) => {
            console.log('fetch:error:', e);
            /* debugger; */
        });
        this.swup.hooks.on('fetch:timeout', (e) => {
            console.log('fetch:timeout:', e);
            /* debugger; */
        });
    }
    _getSwupPlugins() {
        const rules = [
            {
                from: [`/journal`, `/journal\\?(.*)`],
                to: [`/journal`, `/journal\\?(.*)`],
                containers: ['#listing'],
                name: 'listing'
            }
        ];
        const plugins = [
            new SwupHeadPlugin({
                persistAssets: true,
                awaitAssets: true
            }),
            new SwupPreloadPlugin({
                preloadHoveredLinks: true,
                preloadInitialPage: !process.env.NODE_ENV
            }),
            new SwupScriptsPlugin({
                optin: true
            }),
            new SwupScrollPlugin({
                offset: 120,
                animateScroll: {
                    betweenPages: false,
                    samePageWithHash: !window.matchMedia('(prefers-reduced-motion: reduce)')
                        .matches,
                    samePage: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                }
            }),
            new SwupFragmentPlugin({
                rules,
                debug: true
            }),
            new SwupA11yPlugin({
                announcements: {
                    'en-US': {
                        visit: 'Navigated to: {title}',
                        url: 'New page at {url}'
                    },
                    'de-DE': {
                        visit: 'Navigiert zu: {title}',
                        url: 'Neue Seite unter {url}'
                    },
                    'fr-FR': {
                        visit: 'Navigué vers : {title}',
                        url: 'Nouvelle page à {url}'
                    },
                    '*': {
                        visit: '{title}',
                        url: '{url}'
                    }
                }
            })
        ];
        return plugins;
    }
    /**
     * Retrieve HTML dataset on next container and update our real html element dataset accordingly
     *
     * @param visit: VisitType
     */
    updateDocumentAttributes(visit) {
        if (visit.fragmentVisit)
            return;
        const parser = new DOMParser();
        const nextDOM = parser.parseFromString(visit.to.html, 'text/html');
        const newDataset = {
            ...nextDOM.querySelector('html')?.dataset
        };
        Object.entries(newDataset).forEach(([key, val]) => {
            $html.setAttribute(`data-${toDash(key)}`, val ?? '');
        });
    }
    // =============================================================================
    // Hooks
    // =============================================================================
    /**
     * On visit:start
     * Transition to a new page begins
     *
     * @see https://swup.js.org/hooks/#visit-start
     * @param visit: VisitType
     */
    onVisitStart = (visit) => {
        if (!visit.fragmentVisit) {
            visit.scroll.reset = false;
            $html.classList.add(Transitions.CLASS.TRANSITION);
            $html.classList.remove(Transitions.CLASS.READY);
        }
        if (visit.fragmentVisit) {
            switch (visit.fragmentVisit.name) {
                case 'open-modal':
                    getComponentsByPrototype('Dialog').forEach(($component) => {
                        $component.open();
                    });
                    break;
                case 'close-modal':
                    getComponentsByPrototype('Dialog').forEach(($component) => {
                        $component.close();
                    });
                    break;
                case 'listing':
                    Scroll.scrollTo('#listing', { offset: -200, duration: 0.4 });
                    break;
            }
        }
    };
    /**
     * On before:content:replace
     * The old content of the page is replaced by the new content.
     *
     * @see https://swup.js.org/hooks/#content-replace
     * @param visit: VisitType
     */
    beforeContentReplace = (visit) => {
        if (!visit.fragmentVisit) {
            Scroll?.destroy();
        }
        if (visit.fragmentVisit) {
            const $container = document.querySelector(visit.fragmentVisit.containers[0]);
            $container && Scroll?.removeScrollElements($container);
        }
    };
    /**
     * On content:replace
     * The old content of the page is replaced by the new content.
     *
     * @see https://swup.js.org/hooks/#content-replace
     * @param visit: VisitType
     */
    onContentReplace = (visit) => {
        if (visit.fragmentVisit) {
            const $container = document.querySelector(visit.fragmentVisit.containers[0]);
            $container && Scroll?.addScrollElements($container);
            if (visit.fragmentVisit.name == 'open-modal') {
                // this.call('show', null, 'Dialog')
            }
        }
        else {
        }
        if (!visit.fragmentVisit) {
            Scroll?.init();
            this.updateDocumentAttributes(visit);
            $html.classList.remove('is-product-bar-hidden');
            window.scrollTo(0, 0);
        }
    };
    /**
     * On animation:out:start
     * Current content starts animating out. Class `.is-animating` is added.
     *
     * @see https://swup.js.org/hooks/#animation-out-start
     * @param visit: VisitType
     */
    onAnimationOutStart = (visit) => { };
    /**
     * On animation:in:end
     * New content finishes animating out.
     *
     * @see https://swup.js.org/hooks/#animation-in-end
     * @param visit: VisitType
     */
    onAnimationInEnd = (visit) => {
        if (!visit.fragmentVisit) {
            $html.classList.remove(Transitions.CLASS.TRANSITION);
            $html.classList.add(Transitions.CLASS.READY);
        }
    };
}

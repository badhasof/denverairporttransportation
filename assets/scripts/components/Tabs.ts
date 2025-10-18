import { $mediaStatus } from '@stores/deviceStatus';
import type { TurntableSequenceElement } from './Turntable';

export class Tabs extends HTMLElement {
    // =============================================================================
    // Properties
    // =============================================================================

    private $tabs: HTMLElement[];
    private $panels: HTMLElement[] = [];
    public $firstTab: HTMLElement | null = null;
    public $lastTab: HTMLElement | null = null;
    private $currentTab: HTMLElement | null = null;
    private $oldTab: HTMLElement | null = null;
    private $oldPanel: HTMLElement | null = null;
    private isTouchOrSmall: boolean = $mediaStatus.value?.isTouchOrSmall;

    // =============================================================================
    // Constructor
    // =============================================================================
    constructor() {
        super();

        // UI
        this.$tabs = Array.from(this.querySelectorAll('[data-tab]')) as HTMLElement[];
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback() {
        this.initTabs();
        // if (this.isTouchOrSmall) {
        //     this.setSelectedTab(null, true, true);
        // } else {
        this.setSelectedTab(this.$firstTab!, true, true);
        // }
        this.bindEvents();
    }

    disconnectedCallback() {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    bindEvents() {
        for (let i = 0; i < this.$tabs.length; i += 1) {
            const $tab = this.$tabs[i];
            $tab.addEventListener('keydown', this.onKeydown);
            $tab.addEventListener('click', this.onClick);
        }
    }
    unbindEvents() {
        for (let i = 0; i < this.$tabs.length; i += 1) {
            const $tab = this.$tabs[i];
            $tab.removeEventListener('keydown', this.onKeydown);
            $tab.removeEventListener('click', this.onClick);
        }
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    onKeydown = (event: KeyboardEvent) => {
        const $target = event.currentTarget;
        let flag = false;

        switch (event.key) {
            case 'ArrowLeft':
                this.moveFocusToPreviousTab($target as HTMLElement);
                flag = true;
                break;

            case 'ArrowRight':
                this.moveFocusToNextTab($target as HTMLElement);
                flag = true;
                break;

            case 'Home':
                this.moveFocusToTab(this.$firstTab as HTMLElement);
                flag = true;
                break;

            case 'End':
                this.moveFocusToTab(this.$lastTab as HTMLElement);
                flag = true;
                break;

            default:
                break;
        }

        if (flag) {
            event.stopPropagation();
            event.preventDefault();
        }
    };

    onClick = (event: MouseEvent) => {
        this.setSelectedTab(event.currentTarget as HTMLElement);
    };

    // =============================================================================
    // Methods
    // =============================================================================
    initTabs() {
        for (let i = 0; i < this.$tabs.length; i += 1) {
            const $tab = this.$tabs[i];

            $tab.tabIndex = -1;
            $tab.setAttribute('aria-selected', 'false');
            const $tabpanel = this.querySelector(
                `#${$tab.getAttribute('aria-controls')}`
            ) as HTMLElement;

            this.$panels.push($tabpanel);

            if (!this.$firstTab) {
                this.$firstTab = $tab;
                this.$panels[i].setAttribute('data-default-tab', '');
            }
            this.$lastTab = $tab;
        }
    }

    setSelectedTab($currentTab: HTMLElement | null, firstLoad = false, isProgrammatic = false) {
        const unactiveOldTab = () => {
            if (!this.$oldTab) return;
            const oldTabIndex = this.$tabs.indexOf(this.$oldTab);
            this.$oldPanel = this.$panels[oldTabIndex];
            this.$oldTab.setAttribute('aria-selected', 'false');
            this.$oldTab.tabIndex = -1;
            this.$oldPanel.classList.add('is-hidden');
            this.$oldPanel.classList.remove('is-active');
            // this.$oldPanel.hidden = true;
            this.$oldPanel.tabIndex = -1;
        };

        const setFirstLoadTabs = (currentTabIndex: number) => {
            for (let index = 0; index < this.$tabs.length; index++) {
                if (index === currentTabIndex) {
                    continue;
                }
                const $tab = this.$tabs[index];
                const $panel = this.$panels[index];
                $tab.setAttribute('aria-selected', 'false');
                $tab.tabIndex = -1;
                $panel.classList.add('is-hidden');
                $panel.classList.remove('is-active');
                // $panel.hidden = true;
                $panel.tabIndex = -1;
            }
        };

        if ($currentTab && $currentTab.getAttribute('aria-selected') === 'true') return;

        if (!$currentTab) {
            setFirstLoadTabs(-1);
            return;
        }

        this.$oldTab = this.$currentTab;
        this.$currentTab = $currentTab;
        const currentTabIndex = this.$tabs.indexOf($currentTab);
        const $currentPanel = this.$panels[currentTabIndex];

        this.$currentTab.setAttribute('aria-selected', 'true');
        this.$currentTab.removeAttribute('tabindex');
        $currentPanel.classList.remove('is-hidden');
        // $currentPanel.hidden = false;
        $currentPanel.tabIndex = 0;

        requestAnimationFrame(() => {
            $currentPanel.classList.add('is-active');
            const $turntableSequenceElement = $currentPanel.querySelector(
                '[data-turntable-sequence-element]'
            ) as TurntableSequenceElement;
            $turntableSequenceElement?.active(
                isProgrammatic,
                this.$oldPanel ?? undefined,
                $currentPanel
            );
        });

        if (this.$oldTab && !firstLoad && this.$currentTab !== this.$oldTab) {
            unactiveOldTab?.();
        }

        if (firstLoad) {
            setFirstLoadTabs(currentTabIndex);
        }
    }

    moveFocusToTab($currentTab: HTMLElement) {
        $currentTab.focus();
    }

    moveFocusToPreviousTab($currentTab: HTMLElement) {
        let index: number;

        if ($currentTab === this.$firstTab) {
            if (this.$lastTab) this.moveFocusToTab(this.$lastTab);
        } else {
            index = this.$tabs.indexOf($currentTab);
            this.moveFocusToTab(this.$tabs[index - 1]);
        }
    }

    moveFocusToNextTab($currentTab: HTMLElement) {
        let index: number;

        if ($currentTab === this.$lastTab) {
            if (this.$firstTab) this.moveFocusToTab(this.$firstTab);
        } else {
            index = this.$tabs.indexOf($currentTab);
            this.moveFocusToTab(this.$tabs[index + 1]);
        }
    }
}

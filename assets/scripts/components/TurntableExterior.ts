import Sequence from './Sequence';
import Viewer from './Viewer';
import type { TurntableSequenceElement } from './Turntable';
import type Turntable from './Turntable';

// Define types for better type safety
enum ModeType {
    Camp = 'camp',
    Road = 'road'
}
// enum ColorType {
//     Shademoss = 'shademoss',
//     Granitebraun = 'granitebraun',
//     Snowline = 'snowline'
// }

interface SequenceData {
    uid: string;
    sequence: Sequence;
}

interface TurntableExteriorConfig {
    defaultMode: ModeType;
    defaultColor: string;
    idleSequencesIds: string[];
    lazySequencesIds: string[];
}

// TurntableExterior extends HTMLElement and implements TurntableSequenceElement.
export default class TurntableExterior extends HTMLElement implements TurntableSequenceElement {
    // =============================================================================
    // Private properties
    // =============================================================================

    // DOM elements
    private readonly $modeTogglers: NodeListOf<HTMLElement>;
    private readonly $colorTogglers: NodeListOf<HTMLElement>;
    private readonly $viewerToggler: HTMLElement | null;
    private readonly $viewer: Viewer | null;
    private readonly $turnableRoot: Turntable | null;

    // Sequences management
    private $firstSequence: Sequence | null = null;
    private $activeSequence: Sequence | null = null;
    private readonly sequences: Sequence[] = [];
    private readonly sequencesCollection = new Map<string, SequenceData>();

    // Configuration and state
    private readonly config: TurntableExteriorConfig;
    private currentMode: ModeType;
    private currentColor: string;
    private isAnimating = false;
    private isInitialized = false;

    // Constants
    private static readonly ACTIVE_SEQUENCE_CLASS = 'is-active';
    private static readonly FREEZE_CLASS = 'is-frozen';

    // When loaded
    whenLoaded = Promise.all([customElements.whenDefined('c-sequence')]);
    defaultColor: string;

    constructor() {
        super();

        // Get DOM elements
        this.$viewerToggler = this.querySelector('[data-viewer-toggler]');
        this.$viewer = this.querySelector('c-viewer') as Viewer | null;
        this.$modeTogglers = this.querySelectorAll('[data-mode-toggler]');
        this.$colorTogglers = this.querySelectorAll('[data-color-toggler]');
        this.$turnableRoot = this.closest('c-turntable') as Turntable | null;

        // Parse configuration
        this.config = this.parseConfig();
        this.currentMode = this.config.defaultMode;
        this.currentColor = this.config.defaultColor;
    }

    // =============================================================================
    // Lifecycle methods
    // =============================================================================
    connectedCallback() {
        this.whenLoaded.then(() => {
            requestAnimationFrame(() => {
                if (this.isInitialized) return;

                this.init();

                this.bindEvents();
                this.isInitialized = true;
            });
        });
    }

    disconnectedCallback() {
        this.cleanup();
    }

    // =============================================================================
    // Private initialization methods
    // =============================================================================
    private parseConfig(): TurntableExteriorConfig {
        const parseJsonAttribute = (attrName: string, fallback: any[] = []): any[] => {
            try {
                const attr = this.getAttribute(attrName);
                return attr ? JSON.parse(attr) : fallback;
            } catch (error) {
                console.warn(`Failed to parse ${attrName}:`, error);
                return fallback;
            }
        };

        return {
            defaultMode: (this.getAttribute('data-default-mode') as ModeType) || ModeType.Camp,
            defaultColor: this.getAttribute('data-default-color') || ''
        };
    }

    private init(): void {
        this.setSequences();
        this.updateDataAttributes();
    }

    private cleanup(): void {
        this.unbindEvents();
        this.isInitialized = false;
    }

    private updateDataAttributes(): void {
        this.dataset.mode = this.currentMode;
        this.dataset.color = this.currentColor;
    }

    // =============================================================================
    // Event handling
    // =============================================================================
    private bindEvents(): void {
        this.$viewerToggler?.addEventListener('click', this.onViewerTogglerClick);

        this.$modeTogglers.forEach((toggler) => {
            toggler.addEventListener('click', this.onModeTogglerClick);
        });

        this.$colorTogglers?.forEach((toggler) => {
            toggler.addEventListener('click', this.onColorTogglerClick);
        });
    }

    private unbindEvents(): void {
        this.$viewerToggler?.removeEventListener('click', this.onViewerTogglerClick);

        this.$modeTogglers.forEach((toggler) => {
            toggler.removeEventListener('click', this.onModeTogglerClick);
        });

        this.$colorTogglers?.forEach((toggler) => {
            toggler.removeEventListener('click', this.onColorTogglerClick);
        });
    }

    // =============================================================================
    // Event handlers
    // =============================================================================
    private onModeTogglerClick = async (event: MouseEvent): Promise<void> => {
        const target = event.currentTarget as HTMLElement;
        const mode = target.getAttribute('data-mode-toggler') as ModeType;

        if (!mode || this.currentMode === mode || this.isAnimating) {
            return;
        }

        if (!this.$activeSequence) {
            console.warn('No active sequence available for mode change');
            return;
        }

        try {
            const sequenceData = this.getSequenceDataByElement(this.$activeSequence);
            if (!sequenceData) {
                console.warn('Active sequence not found in collection');
                return;
            }

            await this.ensureSequenceReady(sequenceData);
            await this.ensureSequenceLoaded(sequenceData);

            this.currentMode = mode;
            this.updateDataAttributes();

            await this.changeMode(mode, sequenceData.sequence);
        } catch (error) {
            console.error('Error changing mode:', error);
        }
    };

    private onColorTogglerClick = async (event: MouseEvent): Promise<void> => {
        const target = event.currentTarget as HTMLElement;
        const color = target.getAttribute('data-color-toggler');

        if (!color || this.currentColor === color || this.isAnimating) {
            return;
        }

        try {
            const sequenceData = this.sequencesCollection.get(color);
            if (!sequenceData) {
                console.warn(`No sequence found for color: ${color}`);
                return;
            }

            this.$turnableRoot?.classList.add(TurntableExterior.FREEZE_CLASS);

            await this.ensureSequenceReady(sequenceData);
            await this.ensureSequenceLoaded(sequenceData);

            this.currentColor = color as ColorType;
            this.updateDataAttributes();

            this.changeColor(sequenceData.sequence);
        } catch (error) {
            console.error('Error changing color:', error);
        }
    };

    private onViewerTogglerClick = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        if (!this.$viewer) {
            console.warn('Viewer not available');
            return;
        }

        try {
            this.$viewer.active();
        } catch (error) {
            console.error('Error activating viewer:', error);
        }
    };

    // =============================================================================
    // Sequence management methods
    // =============================================================================
    private setSequences(): void {
        const sequenceElements = Array.from(this.querySelectorAll('c-sequence')).filter(
            ($el): $el is Sequence => $el instanceof Sequence
        );

        sequenceElements.forEach((sequence) => {
            const uid = sequence.getAttribute('data-uid');
            if (!uid) {
                console.warn('Sequence element missing data-uid attribute');
                return;
            }

            const sequenceData: SequenceData = {
                uid,
                sequence
            };

            this.sequencesCollection.set(uid, sequenceData);
            this.sequences.push(sequence);

            // Set first sequence as active
            if (!this.$firstSequence && !sequence.hasAttribute('data-viewer-sequence')) {
                this.$firstSequence = sequence;
                this.setActiveSequence(sequence);
            }
        });

        if (this.sequences.length === 0) {
            console.warn('No sequences found in TurntableExterior');
        }
    }

    private setActiveSequence(sequence: Sequence): void {
        // Remove active class from current active sequence
        if (this.$activeSequence) {
            this.$activeSequence.classList.remove(TurntableExterior.ACTIVE_SEQUENCE_CLASS);
        }

        // Set new active sequence
        this.$activeSequence = sequence;
        sequence.classList.add(TurntableExterior.ACTIVE_SEQUENCE_CLASS);
    }

    private getSequenceDataByElement(sequence: Sequence): SequenceData | undefined {
        for (const [, data] of this.sequencesCollection) {
            if (data.sequence === sequence) {
                return data;
            }
        }
        return undefined;
    }

    private async ensureSequenceReady(sequenceData: SequenceData): Promise<void> {
        if (sequenceData.sequence.isReady) return;

        return new Promise((resolve) => {
            const unsubscribe = sequenceData.sequence.onReady(() => {
                unsubscribe(); // Auto cleanup
                resolve();
            });

            sequenceData.sequence.loadImages();
        });
    }

    private async ensureSequenceLoaded(sequenceData: SequenceData): Promise<void> {
        if (sequenceData.sequence.loadingState === 'loaded') return;

        return new Promise((resolve) => {
            const unsubscribe = sequenceData.sequence.onLoaded(() => {
                unsubscribe(); // Auto cleanup
                resolve();
            });
        });
    }

    private async loadSequencesByIds(ids: string[]): Promise<void> {
        const loadPromises = ids.map(async (id) => {
            const sequenceData = this.sequencesCollection.get(id);
            if (!sequenceData) {
                console.warn(`Sequence with id "${id}" not found`);
                return;
            }

            try {
                await this.ensureSequenceReady(sequenceData);
                await this.ensureSequenceLoaded(sequenceData);
            } catch (error) {
                console.error(`Failed to load sequence "${id}":`, error);
            }
        });

        await Promise.allSettled(loadPromises);
    }

    // =============================================================================
    // Animation methods
    // =============================================================================

    private async changeMode(mode: ModeType, sequence: Sequence): Promise<void> {
        return new Promise((resolve, reject) => {
            // Single subscription that handles both start and end
            const unsubscribeStart = sequence.onPlayStart(() => {
                this.isAnimating = true;
                this.$turnableRoot?.classList.add(TurntableExterior.FREEZE_CLASS);
            });

            const unsubscribeEnd = sequence.onPlayEnd(() => {
                this.isAnimating = false;
                this.$turnableRoot?.classList.remove(TurntableExterior.FREEZE_CLASS);
                unsubscribeStart();
                unsubscribeEnd();
                resolve();
            });

            // Handle errors with cleanup
            const handleError = (error: any) => {
                this.isAnimating = false;
                unsubscribeStart();
                unsubscribeEnd();
                reject(error);
            };

            try {
                if (mode === ModeType.Road) {
                    sequence.restartSequence();
                } else {
                    sequence.reverseSequence();
                }
            } catch (error) {
                handleError(error);
            }
        });
    }

    private changeColor(sequence: Sequence): void {
        // Set timeline progress based on current mode
        const progress = this.currentMode === ModeType.Road ? 1 : 0;
        sequence.setTimelineProgress(progress);

        this.$turnableRoot?.classList.remove(TurntableExterior.FREEZE_CLASS);

        // Update active sequence
        this.setActiveSequence(sequence);
    }

    // =============================================================================
    // TurntableSequenceElement interface implementation
    // =============================================================================
    public active(isProgrammatic?: boolean, $fromTab?: HTMLElement, $toTab?: HTMLElement): void {
        try {
            if (!isProgrammatic) {
                this.initLoad();
            }
        } catch (error) {
            console.error('Error in TurntableExterior.active():', error);
        }
    }

    public initLoad(): void {
        try {
            const firstSequenceId = this.$firstSequence.getAttribute('data-uid');
            this.loadSequencesByIds([firstSequenceId]).catch((error) => {
                console.error('Error during initial load:', error);
            });
        } catch (error) {
            console.error('Error in TurntableExterior.initLoad():', error);
        }
    }
}

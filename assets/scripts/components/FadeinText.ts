import { gsap } from 'gsap';
import SplitText from 'gsap/SplitText';
import { $screenDebounce } from '@stores/screen';
import { FONT } from '../config';
import { whenReady } from '@utils/fonts';

gsap.registerPlugin(SplitText);

export class FadeinText extends HTMLElement {
    static readonly LINE_TAG = 'span';
    static readonly CLASS = {
        LINE: 'c-fadein-text_line',
        LINE_INNER: 'c-fadein-text_line_inner'
    };

    static readonly SCROLL_PROGRESS_EVENT = 'onScrollProgress';

    private $paragraphs: NodeListOf<HTMLParagraphElement> | null = null;
    private $lines: HTMLElement[] = [];

    private splits: SplitText[] = [];
    private lineCount: number = 0;
    private activeLine: number = -1;
    private oldActiveLine: number = -1;
    private windowWidth: number = 0;

    private uid: string = '';

    private progress: number = 0;

    unbindScreenListener: () => void;

    constructor() {
        super();

        this.windowWidth = window.innerWidth;
        this.uid = this.dataset.uid ?? '';

        // Get all p tags inside text
        this.$paragraphs = this.querySelectorAll('div') || null;
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================
    connectedCallback(): void {
        this.bindEvents();
    }

    disconnectedCallback(): void {
        this.unbindEvents();
    }

    // =============================================================================
    // Events
    // =============================================================================
    private bindEvents(): void {
        whenReady(FONT.EAGER).then((fonts) => this.onFontsLoaded(fonts));
        this.unbindScreenListener = $screenDebounce.subscribe(this.onResize);
        window.addEventListener(
            `${FadeinText.SCROLL_PROGRESS_EVENT}${this.uid}`,
            this.onScrollProgress
        );
    }

    private unbindEvents(): void {
        this.unbindScreenListener?.();
        window.removeEventListener(
            `${FadeinText.SCROLL_PROGRESS_EVENT}${this.uid}`,
            this.onScrollProgress
        );
    }

    // =============================================================================
    // Callbacks
    // =============================================================================
    private onResize = (): void => {
        // If width has not changed, don't redo the split
        if (window.innerWidth === this.windowWidth || this.splits.length === 0) return;

        // Reset text as default
        this.revertSplits();

        // Wait a frame to get split reverted
        requestAnimationFrame(async () => {
            // Split again
            await this.initSplits();

            // Wait another frame, so the split is done
            // and a 'onScrollProgress' has been called
            requestAnimationFrame(() => {
                // Add active class to lines
                let index = 0;
                while (index < this.activeLine) {
                    this.$lines[index].classList.add('is-active');
                    index++;
                }
            });
        });
    };

    private onFontsLoaded = (fonts: any): void => {
        this.initSplits();
    };

    private onScrollProgress = (e: Event): void => {
        const detail = (e as CustomEvent<{ progress: number }>).detail;
        if (!detail) return;

        this.progress = detail.progress;
        this.computeProgress(this.progress);
    };

    // =============================================================================
    // Methods
    // =============================================================================
    private initSplits(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.$paragraphs) {
                resolve();
                return;
            }

            let globalLineIndex = 0;
            let paragraphIndex = 0;

            this.splits = []; // Reset splits
            this.$lines = []; // Reset lines
            this.lineCount = 0; // Reset line count

            while (paragraphIndex < this.$paragraphs.length) {
                const $paragraph = this.$paragraphs[paragraphIndex];

                // Split text
                const split = new SplitText($paragraph, {
                    type: 'lines',
                    linesClass: FadeinText.CLASS.LINE,
                    reduceWhiteSpace: false,
                    tag: FadeinText.LINE_TAG
                });

                this.splits[paragraphIndex] = split;

                // Add nesting level to each line for reveal animation purpose
                let lineIndex = 0;
                while (lineIndex < split.lines.length) {
                    const lineEl = split.lines[lineIndex];
                    const currentLineDom = lineEl.innerHTML;

                    const newLineDom = `<${FadeinText.LINE_TAG} class="${FadeinText.CLASS.LINE_INNER}" style="--line-index:${globalLineIndex}">${currentLineDom}</span>`;

                    lineEl.innerHTML = newLineDom;

                    globalLineIndex++;
                    lineIndex++;
                }

                // Add blank line for spacing between paragraphs
                if (paragraphIndex > 0) {
                    const emptyLine = document.createElement(FadeinText.LINE_TAG);
                    emptyLine.classList.add(FadeinText.CLASS.LINE, '-empty');
                    $paragraph.prepend(emptyLine);

                    this.lineCount++;
                    this.$lines.push(emptyLine);
                }

                // Add lines to global arrays
                this.lineCount += split.lines.length;
                this.$lines.push(...(split.lines as HTMLElement[]));

                paragraphIndex++;
            }

            // Update scroll after adding the empty lines to get progress
            requestAnimationFrame(() => {
                this.computeProgress(this.progress);
                resolve();
            });
        });
    }

    private revertSplits(): void {
        if (!this.$paragraphs) return;

        // Revert each split text
        let index = 0;
        while (index < this.$paragraphs.length) {
            this.splits[index].revert();
            index++;
        }

        // Reset data to default
        this.$lines = [];
        this.lineCount = 0;
        this.oldActiveLine = -1;
        this.activeLine = -1;
    }

    private computeProgress(progress: number): void {
        const mappedProgress: number = progress * this.lineCount;
        const flooredProgress: number = gsap.utils.clamp(
            0,
            this.lineCount - 1,
            Math.floor(mappedProgress)
        );

        if (flooredProgress !== this.activeLine) {
            this.activeLine = flooredProgress;
            this.computeActiveLine();
        }
    }

    private computeActiveLine(): void {
        if (this.oldActiveLine < this.activeLine) {
            this.activatePreviousLines(this.activeLine);
        } else {
            this.disableNextLines(this.activeLine);
        }

        this.oldActiveLine = this.activeLine;
    }

    private activatePreviousLines(activeLine: number): void {
        let index = 0;
        while (index <= activeLine) {
            this.$lines[index].classList.add('is-active');
            index++;
        }
    }

    private disableNextLines(activeLine: number): void {
        let index = activeLine + 1;
        while (index < this.$lines.length) {
            this.$lines[index].classList.remove('is-active');
            index++;
        }
    }
}

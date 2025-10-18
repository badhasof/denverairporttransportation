import { Modal } from '@components/Modal';

export class ModalVideo extends Modal {
    private $inner: HTMLElement;
    emptyTimeout: ReturnType<typeof setTimeout>;
    appendDelay: ReturnType<typeof setTimeout>;

    constructor() {
        super();

        // UI
        this.$inner = this.querySelector('[data-modal-video-inner]');
    }

    onOpen(args: any): void {
        if (this.emptyTimeout) clearTimeout(this.emptyTimeout);

        const $target = args.target || null;
        const url = $target?.dataset?.url || null;
        const provider = this.getVideoProvider(url);
        const id = this.getVideoId(url, provider);

        this.appendDelay = setTimeout(() => {
            this.appendVideo({ provider, id });
        }, 500);
    }

    onClose(): void {
        if (this.appendDelay) clearTimeout(this.appendDelay);

        this.emptyTimeout = setTimeout(() => {
            this.$inner.innerHTML = '';
        }, 300);
    }

    appendVideo(obj: { provider: any; id: any }) {
        const { id, provider } = obj;

        switch (provider) {
            case 'youtube':
                this.$inner.innerHTML = `<iframe src='https://www.youtube.com/embed/${id}?&autoplay=1' frameborder='0' fullscreen' allowfullscreen allow='autoplay; fullscreen'></iframe>`;
                break;
            case 'vimeo':
                this.$inner.innerHTML = `<iframe src='https://player.vimeo.com/video/${id}?autoplay=1&loop=1&autopause=0' frameborder='0' fullscreen' allowfullscreen></iframe>`;
                break;
            default:
                break;
        }
    }

    getVideoProvider(url: string) {
        const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
        const vimeoRegex = /vimeo\.com\/(\d+|video\/\d+)/;

        if (youtubeRegex.test(url)) {
            return 'youtube';
        } else if (vimeoRegex.test(url)) {
            return 'vimeo';
        }

        return null;
    }

    getVideoId(url: string, provider: string | null) {
        switch (provider) {
            case 'youtube':
                const youtubeRegex =
                    /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*$/i;
                let mYoutube: any[] | null;
                if ((mYoutube = youtubeRegex.exec(url)) !== null) {
                    return mYoutube[1];
                }
            case 'vimeo':
                const vimeoRegex =
                    /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
                let mVimeo: any[] | null;
                if ((mVimeo = vimeoRegex.exec(url)) !== null) {
                    return mVimeo[1];
                }
                break;

            default:
                return null;
        }
    }
}

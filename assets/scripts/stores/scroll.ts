import { atom, map } from 'nanostores';

export type ScrollValues = {
    scroll: number;
    limit: number;
    velocity: number;
    direction: number;
    progress: number;
};

export const $scroll = map<ScrollValues>({
    scroll: window.scrollY,
    limit: 0,
    velocity: 0,
    direction: 0,
    progress: 0
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const $scrollInstance: any = atom(null);

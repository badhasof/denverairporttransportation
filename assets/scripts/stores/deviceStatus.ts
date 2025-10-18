import { map } from 'nanostores';

// =============================================================================
// Breakpoints
// =============================================================================
export type Breakpoints = {
    sm: string;
    md: string;
};

const root = document.documentElement;
const breakpointSm = getComputedStyle(root).getPropertyValue('--breakpoint-sm').trim();
const breakpointMd = getComputedStyle(root).getPropertyValue('--breakpoint-md').trim();

export const $breakpoints = map<Breakpoints>({
    sm: breakpointSm,
    md: breakpointMd
});

// =============================================================================
// MediaQueries
// =============================================================================
export type MediaQueries = {
    reducedMotion: string;
    touchScreen: string;
    touchOrSmall: string;
    fromMedium: string;
    fromSmall: string;
    portrait: string;
};

export const $mediaQueries = map<MediaQueries>({
    reducedMotion: `(prefers-reduced-motion: reduce)`,
    touchScreen: `(hover: none)`,
    touchOrSmall: `(max-width: ${$breakpoints.value?.sm}), (hover: none)`,
    fromMedium: `(min-width: ${$breakpoints.value?.md})`,
    fromSmall: `(min-width: ${$breakpoints.value?.sm})`,
    portrait: `(orientation: portrait)`
});

// =============================================================================
// States
// =============================================================================
type MediaStatusQueries = {
    reducedMotion: MediaQueryList;
    touchScreen: MediaQueryList;
    touchOrSmall: MediaQueryList;
    fromMedium?: MediaQueryList;
    fromSmall?: MediaQueryList;
    portrait: MediaQueryList;
};

const mediaStatusQueries = {
    reducedMotion: matchMedia($mediaQueries.value?.reducedMotion || ''),
    touchScreen: matchMedia($mediaQueries.value?.touchScreen || ''),
    touchOrSmall: matchMedia($mediaQueries.value?.touchOrSmall || ''),
    fromMedium: matchMedia($mediaQueries.value.fromMedium || ''),
    fromSmall: matchMedia($mediaQueries.value.fromSmall || ''),
    portrait: matchMedia($mediaQueries.value?.portrait || '')
};

export type MediaStatus = {
    isReducedMotion: boolean;
    isTouchScreen: boolean;
    isTouchOrSmall: boolean;
    isFromMedium: boolean;
    isFromSmall: boolean;
    isPortrait: boolean;
};

export const $mediaStatus = map<MediaStatus>({
    isReducedMotion: mediaStatusQueries.reducedMotion.matches,
    isTouchScreen: mediaStatusQueries.touchScreen.matches,
    isTouchOrSmall: mediaStatusQueries.touchOrSmall.matches,
    isFromMedium: mediaStatusQueries.fromMedium.matches,
    isFromSmall: mediaStatusQueries.fromSmall.matches,
    isPortrait: mediaStatusQueries.portrait.matches
});

for (const mediaQuery in mediaStatusQueries) {
    mediaStatusQueries[mediaQuery as keyof MediaStatusQueries].addEventListener('change', () => {
        const property = `is${mediaQuery.charAt(0).toUpperCase() + mediaQuery.slice(1)}`;

        $mediaStatus.setKey(
            property as keyof MediaStatus,
            mediaStatusQueries[mediaQuery as keyof MediaStatusQueries].matches
        );
    });
}

// =============================================================================

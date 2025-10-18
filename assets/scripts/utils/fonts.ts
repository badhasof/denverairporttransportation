/**
 * Font Faces – Minimal `whenReady` utility in TypeScript
 */

type FontFaceReference = {
    family: string;
    style?: string;
    weight?: string;
};

function trim(value: string): string {
    return value.replace(/['"]+/g, '');
}

function conformsToReference(font: FontFace, criterion: FontFaceReference): boolean {
    for (const [key, value] of Object.entries(criterion)) {
        switch (key) {
            case 'family':
                if (trim((font as any)[key]) !== value) return false;
                break;
            case 'weight':
                if ((font as any)[key] != value) return false;
                break;
            default:
                if ((font as any)[key] !== value) return false;
                break;
        }
    }
    return true;
}

function conformsToShorthand(font: FontFace, criterion: string): boolean {
    const family = trim(font.family);
    if (trim(family) === criterion) return true;

    if (
        criterion.endsWith(trim(family)) &&
        (criterion.includes(font.weight ?? '') || criterion.includes(font.style ?? ''))
    ) {
        return true;
    }

    return false;
}

function findManyByReference(search: FontFaceReference): FontFace[] {
    const found: FontFace[] = [];
    document.fonts.forEach((font) => {
        if (conformsToReference(font, search)) {
            found.push(font);
        }
    });
    return found;
}

function findManyByShorthand(search: string): FontFace[] {
    const found: FontFace[] = [];
    document.fonts.forEach((font) => {
        if (conformsToShorthand(font, search)) {
            found.push(font);
        }
    });
    return found;
}

function getMany(queries: FontFaceReference | string | (FontFaceReference | string)[]): FontFace[] {
    if (!Array.isArray(queries)) {
        queries = [queries];
    }

    const found = new Set<FontFace>();

    queries.forEach((search) => {
        if (search) {
            if (typeof search === 'string') {
                findManyByShorthand(search).forEach((font) => found.add(font));
            } else if (typeof search === 'object') {
                findManyByReference(search).forEach((font) => found.add(font));
            } else {
                throw new TypeError('Expected font query to be font shorthand or font reference');
            }
        }
    });

    return Array.from(found);
}

/**
 * Returns a Promise that resolves with the specified fonts
 * when they are done loading or failed.
 */
async function whenReady(
    queries: FontFaceReference | string | (FontFaceReference | string)[]
): Promise<FontFace[]> {
    const fonts = getMany(queries);
    return await Promise.all(fonts.map((font) => font.loaded));
}

export { whenReady, FontFaceReference };

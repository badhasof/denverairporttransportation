import type { MapStore } from 'nanostores';

export function persistStore<T extends object>(
    store: MapStore<T>,
    key: string,
    storage: Storage = localStorage
) {
    // Load from storage on init
    const saved = storage.getItem(key);
    if (saved) {
        store.set(JSON.parse(saved));
    }

    // Subscribe to changes and save to storage
    store.subscribe((value) => {
        storage.setItem(key, JSON.stringify(value));
    });
}

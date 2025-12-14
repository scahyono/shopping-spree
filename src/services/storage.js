import { getCurrentUser, loadFamilyData, saveFamilyBudget, saveFamilyItems } from './firebase';
import { createDefaultBudget, normalizeBudgetToCents } from '../utils/currency';

const STORAGE_KEYS = {
    BUDGET: 'shopping_spree_budget',
    ITEMS: 'shopping_spree_items'
};

// Local Storage Helpers
const getLocal = (key, fallback) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
        console.error("Local Storage Error", e);
        return fallback;
    }
};

const setLocal = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Local Storage Save Error", e);
    }
};

// Check if Firebase is enabled
function isFirebaseEnabled() {
    return Boolean(getCurrentUser());
}

// Sync to Firebase (if enabled and online)
async function syncBudgetToFirebase(budget) {
    if (!isFirebaseEnabled()) return;

    try {
        await saveFamilyBudget(budget);
    } catch (error) {
        console.error('Firebase sync error:', error);
        // Continue working offline
    }
}

async function syncItemsToFirebase(items) {
    if (!isFirebaseEnabled()) return;

    try {
        await saveFamilyItems(items);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
}

export const StorageService = {
    // === BUDGET ===
    getBudget: async () => {
        // Always read from localStorage first (offline-first)
        const localBudgetRaw = getLocal(STORAGE_KEYS.BUDGET, createDefaultBudget());
        const { budget: localBudget, migrated: localMigrated } = normalizeBudgetToCents(localBudgetRaw);

        if (localMigrated) {
            setLocal(STORAGE_KEYS.BUDGET, localBudget);
        }

        // If Firebase is enabled, try to load from cloud (but don't block)
        if (isFirebaseEnabled()) {
            try {
                const familyData = await loadFamilyData();
                if (familyData && familyData.budget) {
                    const { budget: normalizedBudget, migrated } = normalizeBudgetToCents(familyData.budget);
                    // Merge cloud data with local (cloud wins)
                    setLocal(STORAGE_KEYS.BUDGET, normalizedBudget);

                    if (migrated) {
                        await syncBudgetToFirebase(normalizedBudget);
                    }

                    return normalizedBudget;
                }
            } catch (error) {
                console.error('Firebase load error:', error);
                // Fall back to local data
            }
        }

        return localBudget;
    },
    saveBudget: async (budget) => {
        const { budget: normalizedBudget } = normalizeBudgetToCents(budget);

        // Always save to localStorage first (offline-first)
        setLocal(STORAGE_KEYS.BUDGET, normalizedBudget);

        // Sync to Firebase if enabled
        await syncBudgetToFirebase(normalizedBudget);
    },

    // === ITEMS ===
    getItems: async () => {
        // Always read from localStorage first (offline-first)
        let localItems = getLocal(STORAGE_KEYS.ITEMS, []);

        // Ensure localItems is an array (handle old object format)
        if (!Array.isArray(localItems)) {
            localItems = localItems && typeof localItems === 'object'
                ? Object.values(localItems)
                : [];
        }

        // If Firebase is enabled, try to load from cloud (but don't block)
        if (isFirebaseEnabled()) {
            try {
                const familyData = await loadFamilyData();
                if (familyData && familyData.items) {
                    // Ensure items is an array
                    let items = familyData.items;
                    if (!Array.isArray(items)) {
                        items = items && typeof items === 'object'
                            ? Object.values(items)
                            : [];
                    }
                    // Merge cloud data with local (cloud wins)
                    setLocal(STORAGE_KEYS.ITEMS, items);
                    return items;
                }
            } catch (error) {
                console.error('Firebase load error:', error);
                // Fall back to local data
            }
        }

        return localItems;
    },
    saveItems: async (items) => {
        // Always save to localStorage first (offline-first)
        setLocal(STORAGE_KEYS.ITEMS, items);

        // Sync to Firebase if enabled
        await syncItemsToFirebase(items);
    },

    // Low level adapter exposure if needed
    getKeys: () => STORAGE_KEYS
};

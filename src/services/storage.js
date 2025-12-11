import { loadFamilyData, saveFamilyBudget, saveFamilyItems } from './firebase';

const STORAGE_KEYS = {
    BUDGET: 'shopping_spree_budget',
    ITEMS: 'shopping_spree_items',
    SETTINGS: 'shopping_spree_settings'
};

const DEFAULT_BUDGET = {
    income: { target: 0, actual: 0 },
    needs: { target: 0, actual: 0 },
    future: { target: 0, actual: 0 },
    wants: { target: 0, actual: 0 }
};

const DEFAULT_SETTINGS = {
    useFirebase: false
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
    const settings = getLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return settings.useFirebase === true;
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
    // === SETTINGS ===
    getSettings: async () => {
        return getLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },
    saveSettings: async (settings) => {
        setLocal(STORAGE_KEYS.SETTINGS, settings);
    },

    // === BUDGET ===
    getBudget: async () => {
        // Always read from localStorage first (offline-first)
        const localBudget = getLocal(STORAGE_KEYS.BUDGET, DEFAULT_BUDGET);

        // If Firebase is enabled, try to load from cloud (but don't block)
        if (isFirebaseEnabled()) {
            try {
                const familyData = await loadFamilyData();
                if (familyData && familyData.budget) {
                    // Merge cloud data with local (cloud wins)
                    setLocal(STORAGE_KEYS.BUDGET, familyData.budget);
                    return familyData.budget;
                }
            } catch (error) {
                console.error('Firebase load error:', error);
                // Fall back to local data
            }
        }

        return localBudget;
    },
    saveBudget: async (budget) => {
        // Always save to localStorage first (offline-first)
        setLocal(STORAGE_KEYS.BUDGET, budget);

        // Sync to Firebase if enabled
        await syncBudgetToFirebase(budget);
    },

    // === ITEMS ===
    getItems: async () => {
        // Always read from localStorage first (offline-first)
        const localItems = getLocal(STORAGE_KEYS.ITEMS, []);

        // If Firebase is enabled, try to load from cloud (but don't block)
        if (isFirebaseEnabled()) {
            try {
                const familyData = await loadFamilyData();
                if (familyData && familyData.items) {
                    // Merge cloud data with local (cloud wins)
                    setLocal(STORAGE_KEYS.ITEMS, familyData.items);
                    return familyData.items;
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

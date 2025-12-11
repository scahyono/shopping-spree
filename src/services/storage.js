const STORAGE_KEYS = {
    BUDGET: 'shopping_spree_budget',
    ITEMS: 'shopping_spree_items',
    SETTINGS: 'shopping_spree_settings'
};

const DEFAULT_BUDGET = {
    income: { target: 0, actual: 0 },
    needs: { target: 0, actual: 0 },
    future: { target: 0, actual: 0 },
    wants: { target: 0, actual: 0 } // "actual" here tracks weekly spent
};

const DEFAULT_SETTINGS = {
    useFirebase: false,
    firebaseConfig: null
};

// Local Storage Internal Helpers
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

export const StorageService = {
    // === SETTINGS ===
    getSettings: async () => {
        return getLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },
    saveSettings: async (settings) => {
        setLocal(STORAGE_KEYS.SETTINGS, settings);
        // If switching to Firebase, init logic would go here
    },

    // === BUDGET ===
    getBudget: async () => {
        // TODO: Add Firebase check
        return getLocal(STORAGE_KEYS.BUDGET, DEFAULT_BUDGET);
    },
    saveBudget: async (budget) => {
        // TODO: Add Firebase check
        setLocal(STORAGE_KEYS.BUDGET, budget);
    },

    // === ITEMS ===
    getItems: async () => {
        // TODO: Add Firebase check
        return getLocal(STORAGE_KEYS.ITEMS, []); // Returns array of Item objects
    },
    saveItems: async (items) => {
        // TODO: Add Firebase check
        setLocal(STORAGE_KEYS.ITEMS, items);
    },

    // Low level adapter exposure if needed
    getKeys: () => STORAGE_KEYS
};

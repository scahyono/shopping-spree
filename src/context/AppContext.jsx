import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { StorageService } from '../services/storage';
import { deleteItem as firebaseDeleteItem, loadBuildInfoFromDatabase, onAuthChange, saveBuildInfo, saveFamilyBudget, updateBudgetField, updateItem as firebaseUpdateItem, isUserWhitelisted } from '../services/firebase';
import buildInfo from '../buildInfo.json';
import { BUDGET_CURRENCY_VERSION, createDefaultBudget, normalizeBudgetToCents, parseCurrencyInput } from '../utils/currency';

const AppContext = createContext();

const DEMO_ITEMS = [
    { id: 'demo-1', name: 'Milk', isInStock: false, isOnShoppingList: true, activatedAt: Date.now() },
    { id: 'demo-2', name: 'Eggs', isInStock: true, isOnShoppingList: false, activatedAt: Date.now() },
    { id: 'demo-3', name: 'Bread', isInStock: false, isOnShoppingList: true, activatedAt: Date.now() },
    { id: 'demo-4', name: 'Coffee', isInStock: true, isOnShoppingList: true, activatedAt: Date.now() }, // Both
    { id: 'demo-5', name: 'Ice Cream', isInStock: false, isOnShoppingList: false }, // Hidden
];

const DEMO_BUDGET = normalizeBudgetToCents({
    currencyVersion: BUDGET_CURRENCY_VERSION,
    weekly: { remaining: parseCurrencyInput('100') }
}).budget;

export function AppProvider({ children }) {
    const [budget, setBudget] = useState(createDefaultBudget());
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
    const isFirebaseUpdateRef = useRef(false); // Use ref for synchronous flag

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            const [loadedBudget, loadedItems] = await Promise.all([
                StorageService.getBudget(),
                StorageService.getItems()
            ]);

            // Ensure loadedItems is always an array (final safety check)
            const safeItems = Array.isArray(loadedItems) ? loadedItems : [];

            // DEMO DATA INJECTION
            if ((safeItems.length === 0) && (!loadedBudget || Number(loadedBudget.weekly?.remaining) === 0)) {
                setBudget(DEMO_BUDGET);
                setItems(DEMO_ITEMS);
            } else {
                setBudget(loadedBudget);
                setItems(safeItems);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setCurrentUser(user);
        });

        return () => unsubscribe?.();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleOnlineChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnlineChange);
        window.addEventListener('offline', handleOnlineChange);

        return () => {
            window.removeEventListener('online', handleOnlineChange);
            window.removeEventListener('offline', handleOnlineChange);
        };
    }, []);

    // Persist on Changes (but NOT when update comes from Firebase)
    useEffect(() => {
        if (!loading && !isFirebaseUpdateRef.current) {
            StorageService.saveBudget(budget);
        }
        // Reset flag after save check
        isFirebaseUpdateRef.current = false;
    }, [budget, loading]);

    useEffect(() => {
        if (!loading && !isFirebaseUpdateRef.current) {
            StorageService.saveItems(items);
        }
        // Reset flag after save check
        isFirebaseUpdateRef.current = false;
    }, [items, loading]);

    // Firebase Real-time Listener
    useEffect(() => {
        if (loading || !currentUser) return;

        let cleanup;

        // Import Firebase listeners dynamically
        import('../services/firebase').then(async ({ listenToFamilyBudget, listenToFamilyItems, stopListening }) => {
            const unsubscribeBudget = listenToFamilyBudget((familyBudget) => {
                if (!familyBudget) return;
                const { budget: normalizedBudget, migrated } = normalizeBudgetToCents(familyBudget);
                isFirebaseUpdateRef.current = true;
                setBudget(normalizedBudget);
                localStorage.setItem('shopping_spree_budget', JSON.stringify(normalizedBudget));

                if (migrated) {
                    StorageService.saveBudget(normalizedBudget).catch(console.error);
                    saveFamilyBudget(normalizedBudget).catch(console.error);
                }
            });

            const unsubscribeItems = listenToFamilyItems((familyItems) => {
                if (!familyItems) return;
                isFirebaseUpdateRef.current = true;
                // Ensure familyItems is always an array
                const itemsArray = Array.isArray(familyItems) ? familyItems : [];
                setItems(itemsArray);
                localStorage.setItem('shopping_spree_items', JSON.stringify(itemsArray));
            });

            cleanup = () => {
                unsubscribeBudget?.();
                unsubscribeItems?.();
                stopListening();
            };
        }).catch(err => {
            console.error('Firebase listener error:', err);
        });

        return () => {
            cleanup?.();
        };
    }, [loading, currentUser]);

    useEffect(() => {
        if (loading || !currentUser || !isOnline) return;

        const syncBuildInfoIfNeeded = async () => {
            try {
                const whitelisted = await isUserWhitelisted(currentUser.uid);
                if (!whitelisted) return;

                const remoteInfo = await loadBuildInfoFromDatabase();
                const remoteBuildNumber = Number(remoteInfo?.buildNumber);
                const localBuildNumber = Number(buildInfo.buildNumber);

                const shouldUpdateRemote = Number.isFinite(localBuildNumber)
                    && (!Number.isFinite(remoteBuildNumber) || remoteBuildNumber < localBuildNumber);

                if (shouldUpdateRemote) {
                    await saveBuildInfo({
                        buildNumber: localBuildNumber,
                        builtAt: buildInfo.builtAt,
                    });
                }
            } catch (error) {
                console.error('Failed to sync build info to database', error);
            }
        };

        syncBuildInfoIfNeeded();
    }, [loading, currentUser, isOnline]);

    // === ACTIONS ===

    const updateBudget = (category, field, value, options = {}) => {
        if (category !== 'weekly') return;

        const parsedValue = Math.round(Number(value) || 0);
        const metadata = {
            lastModified: new Date().toISOString(),
            lastModifiedBy: currentUser?.email ?? 'Local user'
        };

        setBudget(prev => {
            const previousValue = Number(prev?.weekly?.[field]) || 0;
            const delta = Number.isFinite(Number(options.change))
                ? Math.round(Number(options.change))
                : parsedValue - previousValue;
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const existingHistory = Array.isArray(prev?.history) ? prev.history : [];
            const recentHistory = existingHistory.filter((entry) => {
                const timestamp = Date.parse(entry?.timestamp);
                return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo;
            });

            const nextBudget = {
                ...prev,
                currencyVersion: prev.currencyVersion ?? BUDGET_CURRENCY_VERSION,
                metadata: {
                    ...prev.metadata,
                    ...metadata
                },
                history: [
                    ...recentHistory,
                    {
                        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                        timestamp: new Date().toISOString(),
                        change: delta,
                        method: options.method ?? 'set',
                        previous: previousValue,
                        next: parsedValue
                    }
                ],
                weekly: {
                    ...prev.weekly,
                    [field]: parsedValue
                }
            };

            if (currentUser) {
                updateBudgetField(category, field, parsedValue).catch(console.error);
            }

            return nextBudget;
        });
    };

    const addItem = (name) => {
        // Check if exists in master list (hidden)
        const normalizedName = name.trim();
        if (!normalizedName) return;

        const existing = items.find(i => i.name.toLowerCase() === normalizedName.toLowerCase());

        if (existing) {
            // If exists, verify logic. Usually "Add" implies adding to Stock or Shop depending on context.
            // For now, let's assume this is "Create New Item" or "Search".
            // If we just want to create, we return the existing one.
            return existing;
        }

        const newItem = {
            id: crypto.randomUUID(),
            name: normalizedName,
            isInStock: false,
            isOnShoppingList: false,
            activatedAt: Date.now()
        };

        // Sync to Firebase granularly
        if (currentUser) {
            firebaseUpdateItem(newItem).catch(console.error);
        }

        setItems(prev => [...prev, newItem]);
        return newItem;
    };

    const toggleStock = (id, nextState) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const resolvedState = typeof nextState === 'boolean' ? nextState : !item.isInStock;
            const updatedItem = {
                ...item,
                isInStock: resolvedState,
                activatedAt: resolvedState ? Date.now() : item.activatedAt
            };

            // Sync to Firebase granularly
            if (currentUser) {
                firebaseUpdateItem(updatedItem).catch(console.error);
            }

            return updatedItem;
        }));
    };

    const toggleShop = (id, nextState) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const resolvedState = typeof nextState === 'boolean' ? nextState : !item.isOnShoppingList;
            const updatedItem = {
                ...item,
                isOnShoppingList: resolvedState,
                activatedAt: resolvedState ? Date.now() : item.activatedAt
            };

            // Sync to Firebase granularly
            if (currentUser) {
                firebaseUpdateItem(updatedItem).catch(console.error);
            }

            return updatedItem;
        }));
    };

    const markBought = (id) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            // Logic: Remove from Shop. 
            // If it was in stock, it stays in stock (just replenished).
            // If it wasn't in stock, it becomes hidden.
            const updatedItem = {
                ...item,
                isOnShoppingList: false
                // We don't touch isInStock. If it was true, it remains true (permanent stock item).
            };

            // Sync to Firebase granularly
            if (currentUser) {
                firebaseUpdateItem(updatedItem).catch(console.error);
            }

            return updatedItem;
        }));
        // Optional: Deduct from Budget? User didn't specify auto-deduct, just manual budget tracking.
    };

    const renameItem = (id, newName) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return; // Reject empty names

        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updatedItem = { ...item, name: trimmedName };

            // Sync to Firebase granularly
            if (currentUser) {
                firebaseUpdateItem(updatedItem).catch(console.error);
            }

            return updatedItem;
        }));
    };

    const hideItem = (id, source = 'both') => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updatedItem = {
                ...item,
                isInStock: source === 'shop' ? item.isInStock : false,
                isOnShoppingList: source === 'stock' ? item.isOnShoppingList : false
            };

            // Sync to Firebase granularly
            if (currentUser) {
                firebaseUpdateItem(updatedItem).catch(console.error);
            }

            return updatedItem;
        }));
    };

    const deleteItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));

        if (currentUser) {
            firebaseDeleteItem(id).catch(console.error);
        }
    };

    // === DERIVED STATE ===

    const weeklyBudgetState = useMemo(() => ({
        remaining: Number(budget?.weekly?.remaining) || 0
    }), [budget]);

    const value = {
        budget,
        items,
        loading,
        currentUser,
        actions: {
            updateBudget,
            addItem,
            toggleStock,
            toggleShop,
            markBought,
            renameItem,
            hideItem,
            deleteItem
        },
        computed: {
            weeklyRemaining: weeklyBudgetState?.remaining || 0
        }
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { StorageService } from '../services/storage';
import { countSaturdays, getCurrentWeekNumber } from '../utils/dateHelpers';
import { calculateIncomeActual, calculateWantsTarget, calculateWeeklyRemaining } from '../utils/budgetCalculations';
import { loadBuildInfoFromDatabase, onAuthChange, saveBuildInfo, updateBudgetField, updateItem as firebaseUpdateItem, isUserWhitelisted } from '../services/firebase';
import buildInfo from '../buildInfo.json';

const AppContext = createContext();

const DEMO_ITEMS = [
    { id: 'demo-1', name: 'Milk', isInStock: false, isOnShoppingList: true, activatedAt: Date.now() },
    { id: 'demo-2', name: 'Eggs', isInStock: true, isOnShoppingList: false, activatedAt: Date.now() },
    { id: 'demo-3', name: 'Bread', isInStock: false, isOnShoppingList: true, activatedAt: Date.now() },
    { id: 'demo-4', name: 'Coffee', isInStock: true, isOnShoppingList: true, activatedAt: Date.now() }, // Both
    { id: 'demo-5', name: 'Ice Cream', isInStock: false, isOnShoppingList: false }, // Hidden
];

const DEMO_BUDGET = {
    income: { target: 5000, actual: 3100 }, // 1950 + 1000 + 150
    needs: { target: 2000, actual: 1950 },
    future: { target: 1000, actual: 1000 },
    wants: { target: 2000, actual: 150 } // 5000 - 2000 - 1000
};

const parseNumericExpression = (rawValue, fallback = 0) => {
    const trimmed = String(rawValue ?? '').trim();

    if (trimmed === '') return 0;

    const parts = trimmed.match(/[+-]?\s*\d*\.?\d+/g);
    if (parts?.length) {
        const total = parts.reduce((sum, part) => sum + Number(part.replace(/\s+/g, '')), 0);
        if (!Number.isNaN(total)) return total;
    }

    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? fallback : numeric;
};

export function AppProvider({ children }) {
    const [budget, setBudget] = useState(null);
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
            if ((safeItems.length === 0) && (!loadedBudget || loadedBudget.income.target === 0)) {
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
                isFirebaseUpdateRef.current = true;
                setBudget(familyBudget);
                localStorage.setItem('shopping_spree_budget', JSON.stringify(familyBudget));
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

    const updateBudget = (category, field, value) => {
        // Validation: 
        // 1. Income Actual is derived (Read-only)
        // 2. Wants Target is derived (Read-only: Income Target - Needs Target - Future Target)
        if (category === 'income' && field === 'actual') return;
        if (category === 'wants' && field === 'target') return;

        setBudget(prev => {
            const resolvedValue = parseNumericExpression(value, prev?.[category]?.[field]);

            const nextBudget = {
                ...prev,
                [category]: {
                    ...prev[category],
                    [field]: resolvedValue
                }
            };

            // Auto-calculate Income Actual = Sum of other Actuals
            // Get the provisional values for calculations
            const needsActual = category === 'needs' && field === 'actual' ? resolvedValue : nextBudget.needs.actual;
            const futureActual = category === 'future' && field === 'actual' ? resolvedValue : nextBudget.future.actual;
            const wantsActual = category === 'wants' && field === 'actual' ? resolvedValue : nextBudget.wants.actual;

            nextBudget.income.actual = calculateIncomeActual(needsActual, futureActual, wantsActual);

            // Auto-calculate Wants Target = Income Target - Needs Target - Future Target
            // We use the NEW values if they are being updated, otherwise current values
            const incomeTarget = category === 'income' && field === 'target' ? resolvedValue : nextBudget.income.target;
            const needsTarget = category === 'needs' && field === 'target' ? resolvedValue : nextBudget.needs.target;
            const futureTarget = category === 'future' && field === 'target' ? resolvedValue : nextBudget.future.target;

            nextBudget.wants.target = calculateWantsTarget(incomeTarget, needsTarget, futureTarget);

            // Sync to Firebase granularly if user is authenticated
            if (currentUser) {
                // Sync the directly updated field
                updateBudgetField(category, field, resolvedValue).catch(console.error);

                // Sync derived fields
                if (category === 'needs' || category === 'future' || category === 'wants') {
                    updateBudgetField('income', 'actual', nextBudget.income.actual).catch(console.error);
                }
                if (category === 'income' || category === 'needs' || category === 'future') {
                    updateBudgetField('wants', 'target', nextBudget.wants.target).catch(console.error);
                }
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

    // === DERIVED STATE ===

    const weeklyWantsRemaining = useMemo(() => {
        if (!budget) return 0;
        const now = new Date();
        const saturdays = countSaturdays(now.getFullYear(), now.getMonth());
        // Avoid division by zero
        const safeSaturdays = saturdays || 1;

        const monthlyTarget = budget.wants.target;
        const totalSpent = budget.wants.actual;
        const currentWeek = getCurrentWeekNumber(now);

        const result = calculateWeeklyRemaining(monthlyTarget, totalSpent, currentWeek, safeSaturdays);

        return {
            remaining: result.remaining,
            currentWeek,
            totalWeeks: safeSaturdays
        };
    }, [budget]);

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
            hideItem
        },
        computed: {
            weeklyWantsRemaining: weeklyWantsRemaining?.remaining || 0,
            currentWeek: weeklyWantsRemaining?.currentWeek || 1,
            totalWeeks: weeklyWantsRemaining?.totalWeeks || 4
        }
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { countSaturdays, getCurrentWeekNumber } from '../utils/dateHelpers';
import { calculateIncomeActual, calculateWantsTarget, calculateWeeklyRemaining } from '../utils/budgetCalculations';

const AppContext = createContext();

const DEMO_ITEMS = [
    { id: 'demo-1', name: 'Milk', isInStock: false, isOnShoppingList: true },
    { id: 'demo-2', name: 'Eggs', isInStock: true, isOnShoppingList: false },
    { id: 'demo-3', name: 'Bread', isInStock: false, isOnShoppingList: true },
    { id: 'demo-4', name: 'Coffee', isInStock: true, isOnShoppingList: true }, // Both
    { id: 'demo-5', name: 'Ice Cream', isInStock: false, isOnShoppingList: false }, // Hidden
];

const DEMO_BUDGET = {
    income: { target: 5000, actual: 3100 }, // 1950 + 1000 + 150
    needs: { target: 2000, actual: 1950 },
    future: { target: 1000, actual: 1000 },
    wants: { target: 2000, actual: 150 } // 5000 - 2000 - 1000
};

export function AppProvider({ children }) {
    const [budget, setBudget] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            const [loadedBudget, loadedItems] = await Promise.all([
                StorageService.getBudget(),
                StorageService.getItems()
            ]);

            // DEMO DATA INJECTION
            if ((!loadedItems || loadedItems.length === 0) && (!loadedBudget || loadedBudget.income.target === 0)) {
                setBudget(DEMO_BUDGET);
                setItems(DEMO_ITEMS);
            } else {
                setBudget(loadedBudget);
                setItems(loadedItems);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Persist on Changes
    useEffect(() => {
        if (!loading) StorageService.saveBudget(budget);
    }, [budget, loading]);

    useEffect(() => {
        if (!loading) StorageService.saveItems(items);
    }, [items, loading]);

    // === ACTIONS ===

    const updateBudget = (category, field, value) => {
        // Validation: 
        // 1. Income Actual is derived (Read-only)
        // 2. Wants Target is derived (Read-only: Income Target - Needs Target - Future Target)
        if (category === 'income' && field === 'actual') return;
        if (category === 'wants' && field === 'target') return;

        setBudget(prev => {
            const nextBudget = {
                ...prev,
                [category]: {
                    ...prev[category],
                    [field]: Number(value)
                }
            };

            // Auto-calculate Income Actual = Sum of other Actuals
            // Get the provisional values for calculations
            const needsActual = category === 'needs' && field === 'actual' ? Number(value) : nextBudget.needs.actual;
            const futureActual = category === 'future' && field === 'actual' ? Number(value) : nextBudget.future.actual;
            const wantsActual = category === 'wants' && field === 'actual' ? Number(value) : nextBudget.wants.actual;

            nextBudget.income.actual = calculateIncomeActual(needsActual, futureActual, wantsActual);

            // Auto-calculate Wants Target = Income Target - Needs Target - Future Target
            // We use the NEW values if they are being updated, otherwise current values
            const incomeTarget = category === 'income' && field === 'target' ? Number(value) : nextBudget.income.target;
            const needsTarget = category === 'needs' && field === 'target' ? Number(value) : nextBudget.needs.target;
            const futureTarget = category === 'future' && field === 'target' ? Number(value) : nextBudget.future.target;

            nextBudget.wants.target = calculateWantsTarget(incomeTarget, needsTarget, futureTarget);

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
            isOnShoppingList: false
        };
        setItems(prev => [...prev, newItem]);
        return newItem;
    };

    const toggleStock = (id) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return { ...item, isInStock: !item.isInStock };
        }));
    };

    const toggleShop = (id) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return { ...item, isOnShoppingList: !item.isOnShoppingList };
        }));
    };

    const markBought = (id) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            // Logic: Remove from Shop. 
            // If it was in stock, it stays in stock (just replenished).
            // If it wasn't in stock, it becomes hidden.
            return {
                ...item,
                isOnShoppingList: false
                // We don't touch isInStock. If it was true, it remains true (permanent stock item).
            };
        }));
        // Optional: Deduct from Budget? User didn't specify auto-deduct, just manual budget tracking.
    };

    const renameItem = (id, newName) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return; // Reject empty names

        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return { ...item, name: trimmedName };
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
        actions: {
            updateBudget,
            addItem,
            toggleStock,
            toggleShop,
            markBought,
            renameItem
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

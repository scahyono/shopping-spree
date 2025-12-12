import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import SmartOmnibox from '../components/SmartOmnibox';
import { useApp } from '../context/AppContext';
import { scrollAndHighlightItem } from '../utils/highlightItem';
import { sortByActivationThenName } from '../utils/omnibox';

export default function StockPage() {
    const { items, actions } = useApp();
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const hasQuery = normalizedQuery.length > 0;

    const isActive = (item) => item.isInStock;

    const stockItems = useMemo(
        () => items.filter(isActive).sort(sortByActivationThenName),
        [items]
    );

    const searchMatches = useMemo(
        () => hasQuery ? items.filter(i => i.name.toLowerCase().includes(normalizedQuery)) : [],
        [hasQuery, items, normalizedQuery]
    );

    const sortedSearchMatches = useMemo(
        () => [...searchMatches].sort((a, b) => {
            const activeDelta = Number(isActive(a)) - Number(isActive(b));
            if (activeDelta !== 0) return activeDelta;
            return sortByActivationThenName(a, b);
        }),
        [searchMatches]
    );

    const addableMatches = sortedSearchMatches.filter(item => !isActive(item));
    const hiddenMatches = addableMatches.filter(item => !item.isInStock && !item.isOnShoppingList);
    const visibleAddableMatches = addableMatches.filter(item => item.isInStock || item.isOnShoppingList);
    const onStockMatches = sortedSearchMatches.filter(isActive);

    const handleActivate = (item) => {
        actions.toggleStock(item.id, true);
    };

    const handleCreate = (name) => actions.addItem(name);

    const handleExistingActive = (item) => {
        scrollAndHighlightItem(item.id);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Inventory</h2>

            <SmartOmnibox
                items={items}
                isActive={isActive}
                activateItem={handleActivate}
                createItem={handleCreate}
                onExistingActive={handleExistingActive}
                onQueryChange={setQuery}
                placeholder="Search or Add item..."
                actionIcon={PackagePlus}
                actionLabel="Add to inventory"
            />

            {!hasQuery && stockItems.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <p>Your pantry is empty.</p>
                </div>
            )}

            {hasQuery ? (
                <div className="space-y-2">
                    {sortedSearchMatches.length === 0 ? (
                        <p className="text-sm text-gray-500">No matches found. Press Enter to add &quot;{query.trim()}&quot;.</p>
                    ) : (
                        <div className="space-y-3">
                            {visibleAddableMatches.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Available to add</p>
                                    {visibleAddableMatches.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between"
                                        >
                                            <span className="font-medium text-gray-800">{item.name}</span>
                                            <button
                                                onClick={() => actions.toggleStock(item.id, true)}
                                                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-brand-500 text-white hover:bg-brand-600"
                                            >
                                                Add to inventory
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {hiddenMatches.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Hidden items</p>
                                    {hiddenMatches.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between"
                                        >
                                            <span className="font-medium text-gray-800">{item.name}</span>
                                            <button
                                                onClick={() => actions.toggleStock(item.id, true)}
                                                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-brand-500 text-white hover:bg-brand-600"
                                            >
                                                Add to inventory
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {onStockMatches.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Already in inventory</p>
                                    {onStockMatches.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between"
                                        >
                                            <span className="font-medium text-gray-800">{item.name}</span>
                                            <button
                                                disabled
                                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-500 cursor-not-allowed"
                                            >
                                                In inventory
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {stockItems.map(item => (
                        <ItemCard key={item.id} item={item} mode="stock" />
                    ))}
                </div>
            )}
        </div>
    );
}

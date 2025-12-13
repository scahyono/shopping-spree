import { useCallback, useMemo } from 'react';
import { PackagePlus } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import SmartOmnibox from '../components/SmartOmnibox';
import { useApp } from '../context/AppContext';
import useOmniboxSearch from '../hooks/useOmniboxSearch';
import { scrollAndHighlightItem } from '../utils/highlightItem';
import { sortByActivationThenName } from '../utils/omnibox';

export default function StockPage() {
    const { items, actions } = useApp();
    const isActive = useCallback((item) => item.isInStock, []);

    const {
        query,
        setQuery,
        hasQuery,
        sortedMatches,
        visibleAddableMatches,
        hiddenMatches,
        activeMatches,
    } = useOmniboxSearch({ items, isActive });

    const stockItems = useMemo(
        () => items.filter(isActive).sort(sortByActivationThenName),
        [items, isActive]
    );

    const handleActivate = (item) => {
        actions.toggleStock(item.id, true);
    };

    const handleCreate = (name) => actions.addItem(name);

    const handleExistingActive = (item) => {
        scrollAndHighlightItem(item.id);
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">Inventory</h2>

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
                <div className="text-center py-8 sm:py-10 opacity-50">
                    <p>Your pantry is empty.</p>
                </div>
            )}

            {hasQuery ? (
                <div className="space-y-2">
                    {sortedMatches.length === 0 ? (
                        <p className="text-sm text-gray-500">No matches found. Press Enter to add &quot;{query.trim()}&quot;.</p>
                    ) : (
                        <div className="space-y-2.5 sm:space-y-3">
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

                            {activeMatches.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Already in inventory</p>
                                    {activeMatches.map(item => (
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

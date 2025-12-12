import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ItemCard from '../components/ItemCard';
import { Ghost, Search, ShoppingCart } from 'lucide-react';

export default function ShopPage() {
    const { items, actions } = useApp();
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const hasQuery = normalizedQuery.length > 0;

    const shopItems = items.filter(i => i.isOnShoppingList);

    const searchMatches = hasQuery
        ? items.filter(i => i.name.toLowerCase().includes(normalizedQuery))
        : [];

    const sortedSearchMatches = [...searchMatches].sort((a, b) => {
        const onListDelta = Number(a.isOnShoppingList) - Number(b.isOnShoppingList);
        if (onListDelta !== 0) return onListDelta;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const addableMatches = sortedSearchMatches.filter(item => !item.isOnShoppingList);
    const onListMatches = sortedSearchMatches.filter(item => item.isOnShoppingList);
    const sortedShopItems = [...shopItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!normalizedQuery) return;

        if (sortedSearchMatches.length > 0) {
            const bestMatch = addableMatches[0] ?? sortedSearchMatches[0];
            if (!bestMatch.isOnShoppingList) {
                actions.toggleShop(bestMatch.id);
            }
            setQuery('');
            return;
        }

        const item = actions.addItem(query);
        if (item && !item.isOnShoppingList) {
            actions.toggleShop(item.id);
        }
        setQuery('');
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Shopping List</h2>

            {/* Search / Add Bar */}
            <form onSubmit={handleAdd} className="sticky top-0 bg-brand-50 pt-2 pb-4 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search or Add item..."
                        className="w-full bg-white rounded-xl py-3 pl-10 pr-12 shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        list="shop-search-options"
                    />
                    <datalist id="shop-search-options">
                        {sortedSearchMatches.map(item => (
                            <option key={item.id} value={item.name} />
                        ))}
                    </datalist>
                    <button
                        type="submit"
                        disabled={!query}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 text-white p-1.5 rounded-lg disabled:opacity-50"
                    >
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </form>

            {shopItems.length === 0 && !hasQuery ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
                    <Ghost size={48} className="mb-4 text-brand-300" />
                    <p>Your list is empty!</p>
                    <p className="text-sm">Check Stock to add items.</p>
                </div>
            ) : (
                hasQuery ? (
                    <div className="space-y-2">
                        {sortedSearchMatches.length === 0 ? (
                            <p className="text-sm text-gray-500">No matches found. Press Enter to add &quot;{query.trim()}&quot;.</p>
                        ) : (
                            <div className="space-y-3">
                                {addableMatches.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-gray-500">Available to add</p>
                                        {addableMatches.map(item => (
                                            <div key={item.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-gray-800">{item.name}</span>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        <span>Not in current list</span>
                                                        {!item.isInStock && <span aria-hidden>&bull;</span>}
                                                        {!item.isInStock && <span>Not in stock</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => actions.toggleShop(item.id)}
                                                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-brand-500 text-white hover:bg-brand-600"
                                                >
                                                    Add to list
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {onListMatches.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-wide text-gray-500">Already on your list</p>
                                        {onListMatches.map(item => (
                                            <div key={item.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                <button
                                                    disabled
                                                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-500 cursor-not-allowed"
                                                >
                                                    On list
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    sortedShopItems.map(item => (
                        <ItemCard key={item.id} item={item} mode="shop" />
                    ))
                )
            )}
        </div>
    );
}

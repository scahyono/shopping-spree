import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ItemCard from '../components/ItemCard';
import { Search, PackagePlus } from 'lucide-react';

export default function StockPage() {
    const { items, actions } = useApp();
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const hasQuery = normalizedQuery.length > 0;

    const stockItems = items.filter(i => i.isInStock);

    const searchMatches = hasQuery
        ? items.filter(i => i.name.toLowerCase().includes(normalizedQuery))
        : [];

    const sortedSearchMatches = [...searchMatches].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const sortedStockItems = [...stockItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!normalizedQuery) return;

        if (sortedSearchMatches.length > 0) {
            const bestMatch = sortedSearchMatches[0];
            if (!bestMatch.isInStock) {
                actions.toggleStock(bestMatch.id);
            }
            setQuery('');
            return;
        }

        const item = actions.addItem(query);
        if (item && !item.isInStock) {
            actions.toggleStock(item.id);
        }
        setQuery('');
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Inventory</h2>

            {/* Smart Search Bar */}
            <form onSubmit={handleAdd} className="sticky top-0 bg-brand-50 pt-2 pb-4 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search or Add item..."
                        className="w-full bg-white rounded-xl py-3 pl-10 pr-12 shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        list="stock-search-options"
                    />
                    <datalist id="stock-search-options">
                        {sortedSearchMatches.map(item => (
                            <option key={item.id} value={item.name} />
                        ))}
                    </datalist>
                    <button
                        type="submit"
                        disabled={!query}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 text-white p-1.5 rounded-lg disabled:opacity-50"
                    >
                        <PackagePlus size={20} />
                    </button>
                </div>
            </form>

            {!hasQuery && sortedStockItems.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <p>Your pantry is empty.</p>
                </div>
            )}

            {hasQuery ? (
                <div className="space-y-2">
                    {sortedSearchMatches.length === 0 ? (
                        <p className="text-sm text-gray-500">No matches found. Press Enter to add &quot;{query.trim()}&quot;.</p>
                    ) : (
                        sortedSearchMatches.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between"
                            >
                                <span className="font-medium text-gray-800">{item.name}</span>
                                <button
                                    onClick={() => !item.isInStock && actions.toggleStock(item.id)}
                                    disabled={item.isInStock}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${item.isInStock
                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        : 'bg-brand-500 text-white hover:bg-brand-600'}
                                    `}
                                >
                                    {item.isInStock ? 'In inventory' : 'Add to inventory'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedStockItems.map(item => (
                        <ItemCard key={item.id} item={item} mode="stock" />
                    ))}
                </div>
            )}
        </div>
    );
}

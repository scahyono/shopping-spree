import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ItemCard from '../components/ItemCard';
import { Search, PackagePlus } from 'lucide-react';

export default function StockPage() {
    const { items, actions } = useApp();
    const [query, setQuery] = useState('');

    const stockItems = items.filter(i => i.isInStock);

    // Auto-search logic: Filter items by name. If not found, show "Add new"
    const filteredItems = stockItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

    // If query exists and matches NO existing visible item (even hidden ones? user wants to reuse),
    // we should check if it exists in the global `items` array to "unhide" it or toggle it.
    // The requirements say: "Search master database. If exists, reuse."
    // So distinct lists:
    // 1. Visible Stock Items (isInStock=true)
    // 2. Search Results (from ALL items)

    const displayItems = query ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())) : stockItems;

    const handleAdd = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        const item = actions.addItem(query);
        // If it was hidden/new, make sure it's in stock
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
                    />
                    <button
                        type="submit"
                        disabled={!query}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 text-white p-1.5 rounded-lg disabled:opacity-50"
                    >
                        <PackagePlus size={20} />
                    </button>
                </div>
            </form>

            {displayItems.length === 0 && !query && (
                <div className="text-center py-10 opacity-50">
                    <p>Your pantry is empty.</p>
                </div>
            )}

            <div className="space-y-3">
                {displayItems.map(item => (
                    <ItemCard key={item.id} item={item} mode="stock" />
                ))}
            </div>
        </div>
    );
}

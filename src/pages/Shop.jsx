import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ItemCard from '../components/ItemCard';
import { Ghost, Search, ShoppingCart } from 'lucide-react';

export default function ShopPage() {
    const { items, actions } = useApp();
    const [query, setQuery] = useState('');

    const shopItems = items.filter(i => i.isOnShoppingList);

    // Filter visible items
    const displayItems = query
        ? shopItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
        : shopItems;
    const sortedDisplayItems = [...displayItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const handleAdd = (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const item = actions.addItem(query);
        // Ensure it's on the shopping list
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
                    />
                    <button
                        type="submit"
                        disabled={!query}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 text-white p-1.5 rounded-lg disabled:opacity-50"
                    >
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </form>

            {shopItems.length === 0 && !query ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
                    <Ghost size={48} className="mb-4 text-brand-300" />
                    <p>Your list is empty!</p>
                    <p className="text-sm">Check Stock to add items.</p>
                </div>
            ) : (
                sortedDisplayItems.map(item => (
                    <ItemCard key={item.id} item={item} mode="shop" />
                ))
            )}
        </div>
    );
}

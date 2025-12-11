import confetti from 'canvas-confetti';
import { Check, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ItemCard({ item, mode }) {
    const { actions } = useApp();

    const handleBuy = (e) => {
        // Trigger confetti from the click coordinates
        const rect = e.target.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
            origin: { x, y },
            particleCount: 50,
            spread: 60,
            colors: ['#f43f5e', '#fb7185', '#ffe4e6']
        });

        actions.markBought(item.id);
    };

    const handleAddToShop = () => {
        actions.toggleShop(item.id);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between group animate-pop">
            <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-800">{item.name}</h3>
                {mode === 'stock' && item.isOnShoppingList && (
                    <span className="text-xs text-brand-500 font-bold bg-brand-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                        <ShoppingCart size={10} /> To Buy
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {mode === 'shop' && (
                    <button
                        onClick={handleBuy}
                        className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors active:scale-90"
                        title="Mark Bought"
                    >
                        <Check size={20} />
                    </button>
                )}

                {mode === 'stock' && (
                    <button
                        onClick={handleAddToShop}
                        disabled={item.isOnShoppingList}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${item.isOnShoppingList
                            ? 'bg-gray-100 text-gray-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-brand-500 hover:text-white'
                            }`}
                        title="Add to Shop"
                    >
                        <Plus size={20} />
                    </button>
                )}

                {/* Optional: Add remove/hidden logic if needed, but requirements focused on the flow */}
            </div>
        </div>
    );
}

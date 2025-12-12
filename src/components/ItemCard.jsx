import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, EyeOff, ShoppingCart, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ItemCard({ item, mode }) {
    const { actions } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

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

    const handleHideFromStock = () => {
        actions.hideItem(item.id);
    };

    const startEditing = () => {
        setEditName(item.name);
        setIsEditing(true);
    };

    const saveEdit = () => {
        if (editName.trim()) {
            actions.renameItem(item.id, editName);
        } else {
            setEditName(item.name); // Revert if empty
        }
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setEditName(item.name);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between group animate-pop">
            <div className="flex-1 flex items-center gap-2">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="flex-1 font-medium text-lg text-gray-800 border-b-2 border-brand-500 outline-none bg-transparent"
                    />
                ) : (
                    <>
                        <h3 className="font-medium text-lg text-gray-800">{item.name}</h3>
                        <button
                            onClick={startEditing}
                            className="p-1 hover:bg-gray-100 rounded transition-opacity"
                            title="Rename"
                        >
                            <Pencil size={16} className="text-gray-400" />
                        </button>
                    </>
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
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${item.isOnShoppingList
                            ? 'bg-brand-500 text-white hover:bg-brand-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-brand-500 hover:text-white'
                            }`}
                        title={item.isOnShoppingList ? 'Remove from Shopping List' : 'Add to Shopping List'}
                    >
                        <ShoppingCart size={20} />
                    </button>
                )}

                {mode === 'stock' && (
                    <button
                        onClick={handleHideFromStock}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 bg-red-50 text-red-500 hover:bg-red-100"
                        title="Hide from Stock"
                    >
                        <EyeOff size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, ShoppingCart, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ItemCard({ item, mode }) {
    const { actions } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const inputRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const longPressTimerRef = useRef(null);
    const pressStartRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const triggerConfettiAt = (point) => {
        const origin = {
            x: (point?.x ?? window.innerWidth / 2) / window.innerWidth,
            y: (point?.y ?? window.innerHeight / 2) / window.innerHeight
        };

        confetti({
            origin,
            particleCount: 50,
            spread: 60,
            colors: ['#f43f5e', '#fb7185', '#ffe4e6']
        });
    };

    const handleBuy = (e, customPoint) => {
        if (e?.target) {
            const rect = e.target.getBoundingClientRect();
            triggerConfettiAt({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        } else {
            triggerConfettiAt(customPoint || lastPointerRef.current);
        }

        actions.markBought(item.id);
    };

    const handleAddToShop = () => {
        actions.toggleShop(item.id);
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

    const clearLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const startLongPress = (point) => {
        if (isEditing) return;
        pressStartRef.current = point;
        lastPointerRef.current = point;

        clearLongPress();
        longPressTimerRef.current = setTimeout(() => {
            actions.hideItem(item.id, mode);
        }, 600);
    };

    const cancelLongPressOnMove = (point) => {
        if (!pressStartRef.current) return;
        const dx = Math.abs(point.x - pressStartRef.current.x);
        const dy = Math.abs(point.y - pressStartRef.current.y);

        if (dx > 10 || dy > 10) {
            clearLongPress();
        }
    };

    const endLongPress = () => {
        clearLongPress();
        pressStartRef.current = null;
    };

    const handlePointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('button')) return;
        e.stopPropagation();
        startLongPress({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e) => {
        e.stopPropagation();
        cancelLongPressOnMove({ x: e.clientX, y: e.clientY });
    };

    const handlePointerEnd = () => {
        endLongPress();
    };

    const handleTouchStart = (e) => {
        if (!e.touches?.length) return;
        if (e.target.closest('button')) return;
        e.stopPropagation();
        startLongPress({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchMove = (e) => {
        if (!e.touches?.length) return;
        e.stopPropagation();
        cancelLongPressOnMove({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = (e) => {
        if (!e.changedTouches?.length) return;
        e.stopPropagation();
        lastPointerRef.current = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };
        endLongPress();
    };

    return (
        <div
            className="relative"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                data-item-id={item.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between group animate-pop transition-transform duration-150 cursor-pointer"
                style={{ touchAction: 'pan-y' }}
            >
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
                </div>
            </div>
        </div>
    );
}

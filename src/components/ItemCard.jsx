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
    const dragStartRef = useRef(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

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

    const getActiveAction = (offset) => {
        if (Math.abs(offset) < 10) return null;

        return offset < 0 ? 'hide' : null;
    };

    const resetDrag = () => {
        setDragOffset(0);
        setIsDragging(false);
        dragStartRef.current = null;
    };

    const startDrag = (point, source) => {
        dragStartRef.current = { ...point, source };
        lastPointerRef.current = point;
        setIsDragging(true);
    };

    const updateDrag = (point, source) => {
        if (!isDragging || !dragStartRef.current || dragStartRef.current.source !== source || isConfirming) return;
        lastPointerRef.current = point;
        const deltaX = point.x - dragStartRef.current.x;
        setDragOffset(Math.min(deltaX, 0));
    };

    const endDrag = (source) => {
        if (!isDragging || dragStartRef.current?.source !== source || isConfirming) return;
        const action = Math.abs(dragOffset) > 80 ? getActiveAction(dragOffset) : null;

        if (action === 'hide') {
            setIsConfirming(true);
        }

        resetDrag();
    };

    const handlePointerDown = (e) => {
        if (isConfirming) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (dragStartRef.current?.source === 'touch') return;
        if (e.target.closest('button')) return;
        e.stopPropagation();
        startDrag({ x: e.clientX, y: e.clientY }, 'pointer');
    };

    const handlePointerMove = (e) => {
        updateDrag({ x: e.clientX, y: e.clientY }, 'pointer');
    };

    const handlePointerEnd = (e) => {
        e.stopPropagation();
        endDrag('pointer');
    };

    const handleTouchStart = (e) => {
        if (!e.touches?.length || isConfirming) return;
        if (e.target.closest('button')) return;
        e.stopPropagation();
        startDrag({ x: e.touches[0].clientX, y: e.touches[0].clientY }, 'touch');
    };

    const handleTouchMove = (e) => {
        if (!e.touches?.length) return;
        updateDrag({ x: e.touches[0].clientX, y: e.touches[0].clientY }, 'touch');
    };

    const handleTouchEnd = (e) => {
        if (!e.changedTouches?.length) return;
        e.stopPropagation();
        lastPointerRef.current = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };
        endDrag('touch');
    };

    const handleHideConfirm = () => {
        actions.hideItem(item.id, mode);
        setIsConfirming(false);
    };

    const handleDeleteConfirm = () => {
        actions.deleteItem(item.id);
        setIsConfirming(false);
    };

    const cancelConfirm = () => setIsConfirming(false);

    const activeAction = getActiveAction(dragOffset);
    const leftActionLabel = 'Swipe left to hide or delete';
    const leftBg = 'bg-red-50';

    return (
        <div className="relative">
            <div
                className={`absolute inset-0 rounded-xl px-4 flex items-center justify-end select-none transition-colors duration-150 ${activeAction === 'hide' ? leftBg : 'bg-gray-50'}`}
                style={{ touchAction: 'pan-y' }}
            >
                <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap text-red-500 text-right transition-opacity ${dragOffset < -10 ? 'opacity-100' : 'opacity-40'}`}>
                    {leftActionLabel}
                </span>
            </div>

            <div
                data-item-id={item.id}
                className={`bg-white rounded-xl shadow-sm p-4 flex items-center justify-between group animate-pop transition-transform duration-150 ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                style={{ transform: `translateX(${dragOffset}px)`, touchAction: 'pan-y' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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

            {isConfirming && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-gray-800">Hide or delete this item?</h3>
                            <p className="text-sm text-gray-600">Choose whether to temporarily hide it from the list or delete it permanently.</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelConfirm}
                                className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleHideConfirm}
                                className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                            >
                                Hide
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

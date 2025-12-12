import { useRef } from 'react';
import { Search } from 'lucide-react';
import useSmartOmnibox from '../hooks/useSmartOmnibox';

export default function SmartOmnibox({
    items,
    isActive,
    activateItem,
    createItem,
    onExistingActive,
    onQueryChange,
    placeholder = 'Search or add item...',
    actionIcon: ActionIcon,
    actionLabel
}) {
    const inputRef = useRef(null);

    const { value, handleChange, handleKeyDown, handleSubmit } = useSmartOmnibox({
        items,
        isActive,
        activateItem,
        createItem,
        onExistingActive,
        onQueryChange,
        inputRef,
    });

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="sticky top-0 bg-brand-50 pt-2 pb-4 z-10">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    className="w-full bg-white rounded-xl py-3 pl-10 pr-12 shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    aria-label={placeholder}
                />
                <button
                    type="submit"
                    disabled={!value.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 text-white p-1.5 rounded-lg disabled:opacity-50"
                >
                    {ActionIcon ? <ActionIcon size={20} aria-hidden /> : <Search size={20} aria-hidden />}
                    <span className="sr-only">{actionLabel || 'Submit item'}</span>
                </button>
            </div>
        </form>
    );
}

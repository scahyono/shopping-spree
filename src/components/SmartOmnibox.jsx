import { useRef } from 'react';
import { Search, XCircle } from 'lucide-react';
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

    const { value, handleChange, handleKeyDown, handleSubmit, clearInput } = useSmartOmnibox({
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
                    className="w-full bg-white rounded-xl py-3 pl-10 pr-28 shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    aria-label={placeholder}
                />
                {value.trim() && (
                    <button
                        type="button"
                        onClick={() => {
                            clearInput();
                            inputRef.current?.focus();
                        }}
                        className="absolute right-12 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white"
                        aria-label="Clear filter"
                    >
                        <XCircle size={18} aria-hidden />
                    </button>
                )}
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

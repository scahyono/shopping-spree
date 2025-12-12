import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { findBestSuggestion, normalizeName } from '../utils/omnibox';

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
    const [value, setValue] = useState('');
    const [baseQuery, setBaseQuery] = useState('');
    const [pendingSelection, setPendingSelection] = useState(null);
    const [autocompletePaused, setAutocompletePaused] = useState(false);

    useEffect(() => {
        onQueryChange?.(baseQuery.trim());
    }, [baseQuery, onQueryChange]);

    useEffect(() => {
        if (pendingSelection && inputRef.current) {
            inputRef.current.setSelectionRange(pendingSelection.start, pendingSelection.end);
            setPendingSelection(null);
        }
    }, [pendingSelection, value]);

    const clearInput = () => {
        setValue('');
        setBaseQuery('');
        setAutocompletePaused(false);
    };

    const applyAutocomplete = (rawValue, pausedOverride = autocompletePaused) => {
        if (!rawValue) {
            setValue('');
            setPendingSelection({ start: 0, end: 0 });
            return;
        }

        if (pausedOverride) {
            setValue(rawValue);
            setPendingSelection({ start: rawValue.length, end: rawValue.length });
            return;
        }

        const suggestion = findBestSuggestion(items, rawValue);
        if (suggestion) {
            const suggestionName = suggestion.name;
            const lowerName = suggestionName.toLowerCase();
            const normalizedInput = normalizeName(rawValue);

            if (lowerName.startsWith(normalizedInput) && suggestionName.length > rawValue.length) {
                setValue(suggestionName);
                setPendingSelection({ start: rawValue.length, end: suggestionName.length });
                return;
            }
        }

        setValue(rawValue);
        setPendingSelection({ start: rawValue.length, end: rawValue.length });
    };

    const handleChange = (e) => {
        const rawValue = e.target.value;
        const shouldResumeAutocomplete = e.nativeEvent?.inputType?.startsWith('insert') || rawValue === '';
        const nextPaused = shouldResumeAutocomplete ? false : autocompletePaused;
        setAutocompletePaused(nextPaused);

        setBaseQuery(rawValue);
        applyAutocomplete(rawValue, nextPaused);
    };

    const handleBackspace = (e) => {
        if (!inputRef.current) return false;

        const { selectionStart, selectionEnd } = inputRef.current;
        if (selectionStart !== selectionEnd) {
            e.preventDefault();
            const prefix = value.slice(0, selectionStart) + value.slice(selectionEnd);
            setAutocompletePaused(true);
            setBaseQuery(prefix);
            setValue(prefix);
            setPendingSelection({ start: prefix.length, end: prefix.length });
            return true;
        }

        return false;
    };

    const handleSubmit = () => {
        const normalized = value.trim();
        if (!normalized) return;

        const exactMatch = items.find(item => normalizeName(item.name) === normalizeName(normalized));
        if (exactMatch) {
            if (isActive(exactMatch)) {
                onExistingActive?.(exactMatch);
            } else {
                activateItem(exactMatch);
            }
            clearInput();
            return;
        }

        const created = createItem(normalized);
        if (created) {
            activateItem(created);
        }
        clearInput();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Backspace') {
            if (handleBackspace(e)) return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

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

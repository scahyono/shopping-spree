import { useEffect, useState } from 'react';
import { findBestSuggestion, normalizeName } from '../utils/omnibox';

export function useSmartOmnibox({
    items,
    isActive,
    activateItem,
    createItem,
    onExistingActive,
    onQueryChange,
    inputRef,
}) {
    const [value, setValue] = useState('');
    const [baseQuery, setBaseQuery] = useState('');
    const [pendingSelection, setPendingSelection] = useState(null);
    const [autocompletePaused, setAutocompletePaused] = useState(false);

    useEffect(() => {
        onQueryChange?.(baseQuery.trim());
    }, [baseQuery, onQueryChange]);

    useEffect(() => {
        if (pendingSelection && inputRef?.current) {
            inputRef.current.setSelectionRange(pendingSelection.start, pendingSelection.end);
            setPendingSelection(null);
        }
    }, [pendingSelection, value, inputRef]);

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
        if (!inputRef?.current) return false;

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
        if (!normalized) return { status: 'noop' };

        const exactMatch = items.find(item => normalizeName(item.name) === normalizeName(normalized));
        if (exactMatch) {
            if (isActive(exactMatch)) {
                onExistingActive?.(exactMatch);
                clearInput();
                return { status: 'existing', item: exactMatch };
            }
            activateItem(exactMatch);
            clearInput();
            return { status: 'reactivated', item: exactMatch };
        }

        const created = createItem(normalized);
        if (created) {
            activateItem(created);
            clearInput();
            return { status: 'created', item: created };
        }

        clearInput();
        return { status: 'noop' };
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

    return {
        value,
        handleChange,
        handleKeyDown,
        handleSubmit,
    };
}

export default useSmartOmnibox;

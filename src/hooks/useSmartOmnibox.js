import { useEffect, useRef, useState } from 'react';
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
    const lastBackspaceRef = useRef(false);
    const hadSuggestionRef = useRef(false);
    const skipAutocompleteOnceRef = useRef(false);

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
        hadSuggestionRef.current = false;

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
                hadSuggestionRef.current = true;
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
        const inputType = e.inputType || e.nativeEvent?.inputType;
        const isDelete = inputType === 'deleteContentBackward' || lastBackspaceRef.current;
        const isInsert = inputType?.startsWith('insert') ?? !isDelete;
        const wasAutocompleting = hadSuggestionRef.current;
        const hadBackspace = lastBackspaceRef.current;
        if (isInsert && (wasAutocompleting || hadBackspace)) {
            skipAutocompleteOnceRef.current = true;
            hadSuggestionRef.current = false;
        }
        lastBackspaceRef.current = false;

        const shouldResumeAutocomplete = isInsert || rawValue === '';
        const nextPaused = isDelete ? true : (shouldResumeAutocomplete ? false : autocompletePaused);
        const skipThisChange = skipAutocompleteOnceRef.current && isInsert;
        if (skipThisChange) {
            skipAutocompleteOnceRef.current = false;
        }

        setAutocompletePaused(nextPaused);

        setBaseQuery(rawValue);
        applyAutocomplete(rawValue, skipThisChange ? true : nextPaused);
    };

    const handleBackspace = (e) => {
        if (!inputRef?.current) return false;

        const { selectionStart, selectionEnd } = inputRef.current;
        if (selectionStart !== selectionEnd) {
            e.preventDefault();
            const prefix = value.slice(0, selectionStart) + value.slice(selectionEnd);
            skipAutocompleteOnceRef.current = true;
            setAutocompletePaused(true);
            setBaseQuery(prefix);
            setValue(prefix);
            setPendingSelection({ start: prefix.length, end: prefix.length });
            return true;
        }

        if (value.length > baseQuery.length) {
            e.preventDefault();
            const trimmed = value.slice(0, selectionStart);
            skipAutocompleteOnceRef.current = true;
            setAutocompletePaused(true);
            setBaseQuery(trimmed);
            setValue(trimmed);
            setPendingSelection({ start: trimmed.length, end: trimmed.length });
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
            lastBackspaceRef.current = true;
            if (handleBackspace(e)) {
                lastBackspaceRef.current = false;
                return;
            }
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

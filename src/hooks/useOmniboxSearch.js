import { useMemo, useState } from 'react';
import { normalizeName, sortByActivationThenName } from '../utils/omnibox';

export default function useOmniboxSearch({ items, isActive }) {
    const [query, setQuery] = useState('');
    const normalizedQuery = normalizeName(query);
    const hasQuery = normalizedQuery.length > 0;

    const matches = useMemo(() => {
        if (!hasQuery) return [];
        return items.filter(item => normalizeName(item.name).includes(normalizedQuery));
    }, [hasQuery, items, normalizedQuery]);

    const sortedMatches = useMemo(() =>
        [...matches].sort((a, b) => {
            const activeDelta = Number(isActive(a)) - Number(isActive(b));
            if (activeDelta !== 0) return activeDelta;
            return sortByActivationThenName(a, b);
        }),
    [matches, isActive]);

    const addableMatches = useMemo(
        () => sortedMatches.filter(item => !isActive(item)),
        [sortedMatches, isActive]
    );

    const hiddenMatches = useMemo(
        () => addableMatches.filter(item => !item.isInStock && !item.isOnShoppingList),
        [addableMatches]
    );

    const visibleAddableMatches = useMemo(
        () => addableMatches.filter(item => item.isInStock || item.isOnShoppingList),
        [addableMatches]
    );

    const activeMatches = useMemo(
        () => sortedMatches.filter(isActive),
        [sortedMatches, isActive]
    );

    return {
        query,
        setQuery,
        normalizedQuery,
        hasQuery,
        sortedMatches,
        visibleAddableMatches,
        hiddenMatches,
        activeMatches,
    };
}

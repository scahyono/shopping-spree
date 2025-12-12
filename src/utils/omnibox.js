export function normalizeName(value) {
    return value.trim().toLowerCase();
}

export function findBestSuggestion(items, rawInput) {
    const normalizedInput = normalizeName(rawInput);
    if (!normalizedInput) return null;

    const candidates = items.filter(item => item.name?.toLowerCase().includes(normalizedInput));
    if (candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(normalizedInput);
        const bStarts = b.name.toLowerCase().startsWith(normalizedInput);

        if (aStarts !== bStarts) {
            return aStarts ? -1 : 1;
        }

        const lengthDelta = a.name.length - b.name.length;
        if (lengthDelta !== 0) return lengthDelta;

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return sorted[0];
}

export const sortByActivationThenName = (a, b) => {
    const activationDelta = (b.activatedAt ?? 0) - (a.activatedAt ?? 0);
    if (activationDelta !== 0) return activationDelta;

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
};

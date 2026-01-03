export const CURRENCY_SCALE = 100;
export const BUDGET_CURRENCY_VERSION = 2;

export function formatCurrency(valueInCents = 0) {
    const numeric = Number(valueInCents);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;

    return (safeValue / CURRENCY_SCALE).toFixed(2);
}

export function parseCurrencyInput(input) {
    const parsed = Math.round(parseFloat(input ?? '0') * CURRENCY_SCALE);

    return Number.isFinite(parsed) ? parsed : 0;
}

export function createDefaultBudget() {
    return {
        currencyVersion: BUDGET_CURRENCY_VERSION,
        metadata: {
            lastModified: null,
            lastModifiedBy: null
        },
        weekly: { target: 0, actual: 0 }
    };
}

export function normalizeBudgetToCents(rawBudget) {
    const needsMigration = rawBudget?.currencyVersion !== BUDGET_CURRENCY_VERSION;
    const sourceBudget = rawBudget && typeof rawBudget === 'object' ? rawBudget : createDefaultBudget();

    const isLikelyInCents = (value) => Math.abs(value) >= CURRENCY_SCALE * 20;
    const weeklyBudget = sourceBudget?.weekly || sourceBudget?.wants || {};
    const values = [weeklyBudget.target, weeklyBudget.actual].map(Number).filter(Number.isFinite);
    const hasLikelyCents = needsMigration && values.some(isLikelyInCents);

    const normalizeValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 0;

        if (!needsMigration || hasLikelyCents) return Math.round(numeric);

        return isLikelyInCents(numeric)
            ? Math.round(numeric)
            : Math.round(numeric * CURRENCY_SCALE);
    };

    const sourceMetadata = sourceBudget?.metadata && typeof sourceBudget.metadata === 'object' ? sourceBudget.metadata : {};
    const normalized = {
        currencyVersion: BUDGET_CURRENCY_VERSION,
        metadata: {
            lastModified: typeof sourceMetadata.lastModified === 'string' ? sourceMetadata.lastModified : (typeof sourceBudget.lastModified === 'string' ? sourceBudget.lastModified : null),
            lastModifiedBy: typeof sourceMetadata.lastModifiedBy === 'string' ? sourceMetadata.lastModifiedBy : (typeof sourceBudget.lastModifiedBy === 'string' ? sourceBudget.lastModifiedBy : null)
        },
        weekly: {
            target: normalizeValue(weeklyBudget.target ?? 0),
            actual: normalizeValue(weeklyBudget.actual ?? 0)
        }
    };

    return { budget: normalized, migrated: needsMigration };
}

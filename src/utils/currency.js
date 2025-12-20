export const CURRENCY_SCALE = 100;
export const BUDGET_CURRENCY_VERSION = 1;

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
        income: { target: 0, actual: 0 },
        needs: { target: 0, actual: 0 },
        future: { target: 0, actual: 0 },
        wants: { target: 0, actual: 0 }
    };
}

export function normalizeBudgetToCents(rawBudget) {
    const needsMigration = rawBudget?.currencyVersion !== BUDGET_CURRENCY_VERSION;
    const sourceBudget = rawBudget && typeof rawBudget === 'object' ? rawBudget : createDefaultBudget();

    const normalizeValue = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 0;

        return needsMigration ? Math.round(numeric * CURRENCY_SCALE) : Math.round(numeric);
    };

    const sourceMetadata = sourceBudget?.metadata && typeof sourceBudget.metadata === 'object' ? sourceBudget.metadata : {};
    const normalized = {
        currencyVersion: BUDGET_CURRENCY_VERSION,
        metadata: {
            lastModified: typeof sourceMetadata.lastModified === 'string' ? sourceMetadata.lastModified : (typeof sourceBudget.lastModified === 'string' ? sourceBudget.lastModified : null),
            lastModifiedBy: typeof sourceMetadata.lastModifiedBy === 'string' ? sourceMetadata.lastModifiedBy : (typeof sourceBudget.lastModifiedBy === 'string' ? sourceBudget.lastModifiedBy : null)
        },
        income: {
            target: normalizeValue(sourceBudget.income?.target ?? 0),
            actual: normalizeValue(sourceBudget.income?.actual ?? 0)
        },
        needs: {
            target: normalizeValue(sourceBudget.needs?.target ?? 0),
            actual: normalizeValue(sourceBudget.needs?.actual ?? 0)
        },
        future: {
            target: normalizeValue(sourceBudget.future?.target ?? 0),
            actual: normalizeValue(sourceBudget.future?.actual ?? 0)
        },
        wants: {
            target: normalizeValue(sourceBudget.wants?.target ?? 0),
            actual: normalizeValue(sourceBudget.wants?.actual ?? 0)
        }
    };

    return { budget: normalized, migrated: needsMigration };
}

import { calculateWeeklyBalance } from './budgetCalculations';

export const CURRENCY_SCALE = 100;
export const BUDGET_CURRENCY_VERSION = 3;
export const LOCAL_BUDGET_OWNER_ID = 'local-user';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function formatCurrency(valueInCents = 0) {
    const numeric = Number(valueInCents);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;

    return (safeValue / CURRENCY_SCALE).toFixed(2);
}

export function parseCurrencyInput(input) {
    const parsed = Math.round(parseFloat(input ?? '0') * CURRENCY_SCALE);

    return Number.isFinite(parsed) ? parsed : 0;
}

export function createDefaultUserBudget() {
    return {
        currencyVersion: BUDGET_CURRENCY_VERSION,
        metadata: {
            lastModified: null,
            lastModifiedBy: null
        },
        history: [],
        weekly: { remaining: 0 }
    };
}

export function createDefaultBudget() {
    return {
        currencyVersion: BUDGET_CURRENCY_VERSION,
        byUser: {}
    };
}

export function normalizeBudgetToCents(rawBudget, ownerId = 'shared') {
    const budgetSource = rawBudget && typeof rawBudget === 'object' ? rawBudget : createDefaultBudget();
    const needsStructureMigration = !budgetSource?.byUser;

    const normalizeSingleBudget = (sourceBudget) => {
        const needsMigration = sourceBudget?.currencyVersion !== BUDGET_CURRENCY_VERSION;
        const isLikelyInCents = (value) => Math.abs(value) >= CURRENCY_SCALE * 20;
        const weeklyBudget = sourceBudget?.weekly || sourceBudget?.wants || {};
        const values = [weeklyBudget.remaining, weeklyBudget.target, weeklyBudget.actual].map(Number).filter(Number.isFinite);
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
        const deriveRemaining = () => {
            const explicitRemaining = weeklyBudget.remaining;

            if (Number.isFinite(Number(explicitRemaining))) return explicitRemaining;

            return calculateWeeklyBalance(Number(weeklyBudget.target) || 0, Number(weeklyBudget.actual) || 0);
        };

        const history = Array.isArray(sourceBudget.history) ? sourceBudget.history : [];
        const thirtyDaysAgo = Date.now() - THIRTY_DAYS_MS;
        const normalizedHistory = history
            .map((entry) => ({
                id: entry?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                timestamp: entry?.timestamp ?? null,
                change: Math.round(Number(entry?.change) || 0),
                method: typeof entry?.method === 'string' ? entry.method : 'set',
                previous: Math.round(Number(entry?.previous) || 0),
                next: Math.round(Number(entry?.next) || 0)
            }))
            .filter((entry) => {
                const timestamp = Date.parse(entry.timestamp);
                return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo;
            });

        return {
            currencyVersion: BUDGET_CURRENCY_VERSION,
            metadata: {
                lastModified: typeof sourceMetadata.lastModified === 'string' ? sourceMetadata.lastModified : (typeof sourceBudget.lastModified === 'string' ? sourceBudget.lastModified : null),
                lastModifiedBy: typeof sourceMetadata.lastModifiedBy === 'string' ? sourceMetadata.lastModifiedBy : (typeof sourceBudget.lastModifiedBy === 'string' ? sourceBudget.lastModifiedBy : null)
            },
            history: normalizedHistory,
            weekly: {
                remaining: normalizeValue(deriveRemaining())
            }
        };
    };

    const sourceByUser = budgetSource?.byUser && typeof budgetSource.byUser === 'object'
        ? budgetSource.byUser
        : null;

    const normalizedByUser = sourceByUser
        ? Object.entries(sourceByUser).reduce((acc, [userId, userBudget]) => {
            acc[userId] = normalizeSingleBudget(userBudget || createDefaultUserBudget());
            return acc;
        }, {})
        : { [ownerId]: normalizeSingleBudget(budgetSource) };

    const migrated = needsStructureMigration || Object.values(normalizedByUser).some((userBudget) => userBudget.currencyVersion !== budgetSource?.currencyVersion);

    return {
        budget: {
            currencyVersion: BUDGET_CURRENCY_VERSION,
            byUser: normalizedByUser
        },
        migrated
    };
}

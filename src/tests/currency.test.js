import { describe, expect, it } from 'vitest';
import { normalizeBudgetToCents, BUDGET_CURRENCY_VERSION } from '../utils/currency';

describe('normalizeBudgetToCents', () => {
    it('derives remaining budget from legacy data stored in cents', () => {
        const ownerId = 'test-user-cents';
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 20000, actual: 1500 }
        }, ownerId);

        expect(budget.byUser[ownerId].weekly.remaining).toBe(18500);
        expect(budget.currencyVersion).toBe(BUDGET_CURRENCY_VERSION);
    });

    it('converts dollar-based budgets to cents during migration and preserves remaining', () => {
        const ownerId = 'test-user-dollar';
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 50, actual: 12.5 }
        }, ownerId);

        expect(budget.byUser[ownerId].weekly.remaining).toBe(3750);
    });

    it('keeps only recent budget history entries and normalizes values', () => {
        const thirtyOneDaysAgo = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)).toISOString();
        const recentTimestamp = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString();

        const ownerId = 'history-user';
        const { budget } = normalizeBudgetToCents({
            weekly: { remaining: 5000 },
            history: [
                { id: 'old', timestamp: thirtyOneDaysAgo, change: 1000, method: 'add', previous: 4000, next: 5000 },
                { id: 'recent', timestamp: recentTimestamp, change: -200.5, method: 'sub', previous: 5200, next: 5000 }
            ]
        }, ownerId);

        expect(budget.byUser[ownerId].history).toHaveLength(1);
        expect(budget.byUser[ownerId].history[0]).toMatchObject({ id: 'recent', change: -200, next: 5000 });
    });
});

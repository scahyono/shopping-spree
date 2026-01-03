import { describe, expect, it } from 'vitest';
import { normalizeBudgetToCents, BUDGET_CURRENCY_VERSION } from '../utils/currency';

describe('normalizeBudgetToCents', () => {
    it('derives remaining budget from legacy data stored in cents', () => {
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 20000, actual: 1500 }
        });

        expect(budget.weekly.remaining).toBe(18500);
        expect(budget.currencyVersion).toBe(BUDGET_CURRENCY_VERSION);
    });

    it('converts dollar-based budgets to cents during migration and preserves remaining', () => {
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 50, actual: 12.5 }
        });

        expect(budget.weekly.remaining).toBe(3750);
    });
});

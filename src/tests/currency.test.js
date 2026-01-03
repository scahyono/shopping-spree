import { describe, expect, it } from 'vitest';
import { normalizeBudgetToCents, BUDGET_CURRENCY_VERSION, parseCurrencyInput } from '../utils/currency';

describe('normalizeBudgetToCents', () => {
    it('preserves cents when currency version is missing but values are already scaled', () => {
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 20000, actual: 1500 }
        });

        expect(budget.weekly.target).toBe(20000);
        expect(budget.weekly.actual).toBe(1500);
        expect(budget.currencyVersion).toBe(BUDGET_CURRENCY_VERSION);
    });

    it('converts dollar-based budgets to cents during migration', () => {
        const { budget } = normalizeBudgetToCents({
            weekly: { target: 50, actual: 12.5 }
        });

        expect(budget.weekly.target).toBe(5000);
        expect(budget.weekly.actual).toBe(parseCurrencyInput('12.5'));
    });
});

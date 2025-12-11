import { describe, it, expect } from 'vitest';
import { calculateWantsTarget, calculateIncomeActual, calculateWeeklyRemaining } from '../utils/budgetCalculations';
import { countSaturdays, getCurrentWeekNumber } from '../utils/dateHelpers';

describe('Budget Calculations', () => {
    describe('calculateWantsTarget', () => {
        it('should calculate wants target correctly', () => {
            const income = 5000;
            const needs = 2000;
            const future = 1000;
            // 5000 - 2000 - 1000 = 2000
            expect(calculateWantsTarget(income, needs, future)).toBe(2000);
        });

        it('should handle zero values', () => {
            expect(calculateWantsTarget(0, 0, 0)).toBe(0);
        });

        it('should handle negative result (over budget)', () => {
            expect(calculateWantsTarget(3000, 2000, 1500)).toBe(-500);
        });
    });

    describe('calculateIncomeActual', () => {
        it('should sum up actuals correctly', () => {
            expect(calculateIncomeActual(100, 200, 300)).toBe(600);
        });
    });

    describe('calculateWeeklyRemaining', () => {
        it('should calculate remaining for week 1 with no spending', () => {
            // Monthly Target: 400, Total Weeks: 4
            // Weekly Limit: 100
            // Week 1 Cumulative Allowed: 100
            // Spent: 0
            // Remaining: 100
            const result = calculateWeeklyRemaining(400, 0, 1, 4);
            expect(result.remaining).toBe(100);
            expect(result.weeklyLimit).toBe(100);
        });

        it('should calculate remaining for week 2 with partial spending', () => {
            // Monthly Target: 400, Total Weeks: 4
            // Weekly Limit: 100
            // Week 2 Cumulative Allowed: 200
            // Spent: 80 (Week 1 spent likely)
            // Remaining: 120 (20 rollover + 100 for this week)
            const result = calculateWeeklyRemaining(400, 80, 2, 4);
            expect(result.remaining).toBe(120);
        });

        it('should handle zero total weeks (divide by zero protection)', () => {
            // Should fallback to 1 week
            const result = calculateWeeklyRemaining(100, 0, 1, 0);
            expect(result.weeklyLimit).toBe(100);
        });

        it('should handle overspending', () => {
            // Monthly Target: 400
            // Week 1
            // Spent: 150
            // Remaining: -50
            const result = calculateWeeklyRemaining(400, 150, 1, 4);
            expect(result.remaining).toBe(-50);
        });
    });
});

describe('Date Helpers', () => {
    describe('countSaturdays', () => {
        it('should count Saturdays correctly for a known month (Nov 2024)', () => {
            // Nov 1, 2024 is Friday
            // Sat: 2, 9, 16, 23, 30 -> 5 Saturdays
            expect(countSaturdays(2024, 10)).toBe(5); // Month is 0-indexed, 10 = Nov
        });

        it('should count Saturdays correctly for a known month (Feb 2024)', () => {
            // Feb 1, 2024 is Thursday (Leap Year)
            // Sat: 3, 10, 17, 24 -> 4 Saturdays
            expect(countSaturdays(2024, 1)).toBe(4);
        });
    });

    describe('getCurrentWeekNumber', () => {
        it('should calculate week number based on Saturdays passed', () => {
            // Nov 2024
            // Nov 1 (Fri) -> Week 1 (0 Sat passed)
            // Nov 2 (Sat) -> Week 1 (0 Sat passed strictly before? Code says strictly before)
            // Nov 3 (Sun) -> Week 2 (1 Sat passed)

            // Let's verify code logic:
            // for i=1 to day-1. check if Saturday.
            // Nov 1: loop doesn't run. saturdaysPassed=0. Week 1.
            // Nov 2: loop runs for i=1(Nov 1 Friday). Not Sat. saturdaysPassed=0. Week 1.
            // Nov 3: loop 1..2. Nov 2 is Sat. saturdaysPassed=1. Week 2.

            const nov1 = new Date(2024, 10, 1);
            expect(getCurrentWeekNumber(nov1)).toBe(1);

            const nov2 = new Date(2024, 10, 2);
            expect(getCurrentWeekNumber(nov2)).toBe(1);

            const nov3 = new Date(2024, 10, 3);
            expect(getCurrentWeekNumber(nov3)).toBe(2);
        });
    });
});

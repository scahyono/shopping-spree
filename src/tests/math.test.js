import { describe, it, expect } from 'vitest';
import { calculateWeeklyBalance } from '../utils/budgetCalculations';
import { countSaturdays, getCurrentWeekNumber } from '../utils/dateHelpers';

describe('Budget Calculations', () => {
    describe('calculateWeeklyBalance', () => {
        it('should subtract spending from the weekly budget', () => {
            expect(calculateWeeklyBalance(400, 150)).toBe(250);
        });

        it('should allow overspending scenarios', () => {
            expect(calculateWeeklyBalance(200, 260)).toBe(-60);
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

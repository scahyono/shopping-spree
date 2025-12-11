import { describe, it, expect } from 'vitest';
import { countSaturdays } from '../utils/dateHelpers';

describe('Date Helpers', () => {
    it('should count Saturdays correctly for a month with 5 Saturdays', () => {
        // September 2023 has 5 Saturdays (2nd, 9th, 16th, 23rd, 30th)
        // JS Month is 8-indexed
        expect(countSaturdays(2023, 8)).toBe(5);
    });

    it('should count Saturdays correctly for a month with 4 Saturdays', () => {
        // February 2023 has 4 Saturdays
        // JS Month is 1-indexed
        expect(countSaturdays(2023, 1)).toBe(4);
    });

    it('should handle leap years correctly', () => {
        // February 2024 (Leap Year) has 29 days.
        // Feb 1st 2024 is Thursday.
        // Sats: 3, 10, 17, 24. (4 Saturdays)
        expect(countSaturdays(2024, 1)).toBe(4);
    });
});

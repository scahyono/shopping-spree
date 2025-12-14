import { describe, expect, it, beforeEach } from 'vitest';
import { evaluateFocusReward, getFocusRank, getFocusRewardConstants, markSessionStart } from '../utils/focusReward';

const { cooldownMs, maxRank, storageKeys } = getFocusRewardConstants();

describe('focus reward cooldown', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('does not celebrate without a prior session', () => {
        const result = evaluateFocusReward(1_000);

        expect(result.shouldCelebrate).toBe(false);
        expect(result.focusRank).toBe(maxRank);
        expect(result.lastSessionStart).toBeNull();
    });

    it('rewards when the three-hour abstinence window is complete', () => {
        const lastSession = 1_000;
        localStorage.setItem(storageKeys.LAST_SESSION_START, String(lastSession));

        const result = evaluateFocusReward(lastSession + cooldownMs + 10);

        expect(result.shouldCelebrate).toBe(true);
        expect(result.focusRank).toBe(maxRank);
        expect(result.lastSessionStart).toBe(lastSession);
        expect(localStorage.getItem(storageKeys.FOCUS_RANK)).toBe(String(maxRank));
        expect(Number(localStorage.getItem(storageKeys.LAST_REWARDED_AT))).toBe(lastSession + cooldownMs + 10);
    });

    it('does not double-award for the same abstinence window', () => {
        const lastSession = 1_000;
        const celebrateAt = lastSession + cooldownMs + 1;
        localStorage.setItem(storageKeys.LAST_SESSION_START, String(lastSession));
        localStorage.setItem(storageKeys.LAST_REWARDED_AT, String(celebrateAt));

        const result = evaluateFocusReward(celebrateAt + 120); // Short return after reward

        expect(result.shouldCelebrate).toBe(false);
        expect(result.focusRank).toBe(maxRank);
        expect(result.lastSessionStart).toBe(lastSession);
    });

    it('records the latest session start for future cooldowns', () => {
        const sessionTime = 5_000;
        markSessionStart(sessionTime);

        expect(Number(localStorage.getItem(storageKeys.LAST_SESSION_START))).toBe(sessionTime);
        expect(getFocusRank()).toBe(maxRank);
    });
});

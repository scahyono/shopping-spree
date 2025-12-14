const STORAGE_KEYS = {
    LAST_SESSION_START: 'focus_last_session_start',
    LAST_REWARDED_AT: 'focus_last_rewarded_at',
    FOCUS_RANK: 'focus_rank'
};

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const MAX_FOCUS_RANK = 10;

const readNumber = (key) => {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

export function markSessionStart(timestamp = Date.now()) {
    localStorage.setItem(STORAGE_KEYS.LAST_SESSION_START, String(timestamp));
}

export function getFocusRank() {
    const storedRank = readNumber(STORAGE_KEYS.FOCUS_RANK);
    return Number.isFinite(storedRank) ? storedRank : MAX_FOCUS_RANK;
}

export function evaluateFocusReward(timestamp = Date.now()) {
    const lastSessionStart = readNumber(STORAGE_KEYS.LAST_SESSION_START);
    const lastRewardedAt = readNumber(STORAGE_KEYS.LAST_REWARDED_AT);
    const previousFocusRank = getFocusRank();
    const hasServedCooldown = Number.isFinite(lastSessionStart)
        ? timestamp - lastSessionStart >= THREE_HOURS_MS
        : false;
    const alreadyRewarded = Number.isFinite(lastRewardedAt) && Number.isFinite(lastSessionStart)
        ? lastRewardedAt >= lastSessionStart
        : false;

    if (hasServedCooldown && !alreadyRewarded) {
        localStorage.setItem(STORAGE_KEYS.FOCUS_RANK, String(MAX_FOCUS_RANK));
        localStorage.setItem(STORAGE_KEYS.LAST_REWARDED_AT, String(timestamp));

        return {
            shouldCelebrate: true,
            focusRank: MAX_FOCUS_RANK,
            previousFocusRank,
            lastSessionStart
        };
    }

    return {
        shouldCelebrate: false,
        focusRank: previousFocusRank,
        previousFocusRank,
        lastSessionStart
    };
}

export function getFocusRewardConstants() {
    return { cooldownMs: THREE_HOURS_MS, maxRank: MAX_FOCUS_RANK, storageKeys: { ...STORAGE_KEYS } };
}

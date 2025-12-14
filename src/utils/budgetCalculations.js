export function calculateWantsTarget(income, needs, future) {
    return income - needs - future;
}

export function calculateIncomeActual(needsActual, futureActual, wantsActual) {
    return needsActual + futureActual + wantsActual;
}

export function calculateWeeklyRemaining(monthlyTarget, totalSpent, currentWeek, totalWeeks) {
    // Avoid division by zero
    const safeWeeks = totalWeeks || 1;

    // Monthly Target divided by number of Saturdays = Weekly Limit
    const weeklyLimit = Math.round(monthlyTarget / safeWeeks);

    // We accumulate budget for every week that has started.
    // If we are in Week 2, we should have (WeeklyLimit * 2) available total.
    const cumulativeAllowed = Math.round((monthlyTarget * currentWeek) / safeWeeks) || weeklyLimit * currentWeek;

    return {
        remaining: cumulativeAllowed - totalSpent,
        weeklyLimit,
        cumulativeAllowed
    };
}

export function countSaturdays(year, month) {
    // Month is 0-indexed (0 = Jan, 11 = Dec) in JS Date, but let's accept 1-12 for user friendliness 
    // or standard JS Date 0-11? Let's stick to standard JS Date behavior for the input to match Date.getMonth(),
    // but often utils are better with 1-based.
    // Let's use 0-indexed month to align with new Date().

    let count = 0;
    const date = new Date(year, month, 1);

    // Iterate through the days of the month
    while (date.getMonth() === month) {
        if (date.getDay() === 6) { // 6 is Saturday
            count++;
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
}

export function getCurrentWeekNumber(date = new Date()) {
    // Week 1 starts on the 1st.
    // A new week starts the day AFTER a Saturday.
    // So we simple count how many Saturdays have passed strictly before today.
    // Week = SaturdaysPassed + 1.

    const d = new Date(date);
    const day = d.getDate();
    let saturdaysPassed = 0;

    // Iterate from day 1 up to day-1
    for (let i = 1; i < day; i++) {
        const check = new Date(d.getFullYear(), d.getMonth(), i);
        if (check.getDay() === 6) saturdaysPassed++;
    }

    return saturdaysPassed + 1;
}

export function getWeeksInMonth(year, month) {
    // Fallback logic if needed, but the requirements mostly care about Saturdays
    return countSaturdays(year, month);
}

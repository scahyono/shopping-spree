import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SyncControls from './SyncControls';
import buildInfo from '../buildInfo.json';

const ARITHMETIC_PATTERN = /^[0-9+\-\.\s]+$/;

function parseArithmeticInput(rawValue, fallback = 0) {
    const trimmed = `${rawValue ?? ''}`.trim();

    if (!trimmed) return fallback;

    // Only allow digits, plus/minus signs, dots, and whitespace
    if (!ARITHMETIC_PATTERN.test(trimmed)) {
        const numeric = Number(trimmed);
        return Number.isNaN(numeric) ? fallback : numeric;
    }

    const tokens = trimmed.match(/[+\-]?[0-9]*\.?[0-9]+/g);

    if (!tokens) return fallback;

    const total = tokens.reduce((sum, token) => sum + Number(token), 0);
    return Number.isNaN(total) ? fallback : total;
}

export default function BudgetHeader() {
    const { computed, actions, budget, loading, currentUser } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [draftValues, setDraftValues] = useState(null);

    useEffect(() => {
        if (!budget) return;

        setDraftValues({
            income: { ...budget.income },
            needs: { ...budget.needs },
            future: { ...budget.future },
            wants: { ...budget.wants },
        });
    }, [budget]);

    const commitValue = (category, field) => {
        if (!draftValues || !budget) return;

        const rawValue = draftValues?.[category]?.[field];
        const fallback = budget?.[category]?.[field] ?? 0;
        const parsedValue = parseArithmeticInput(rawValue, fallback);

        setDraftValues(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: parsedValue
            }
        }));

        actions.updateBudget(category, field, parsedValue);
    };

    const handleInputChange = (category, field, value) => {
        setDraftValues(prev => ({
            ...(prev ?? {}),
            [category]: {
                ...(prev?.[category] ?? {}),
                [field]: value
            }
        }));
    };

    const labsEnabled = currentUser?.uid === 'vy1PP3WXv3PFz6zyCEiEN0ILmDW2';
    const buildStamp = useMemo(() => {
        if (!buildInfo?.builtAt) return null;
        try {
            return new Date(buildInfo.builtAt).toLocaleString();
        } catch {
            return buildInfo.builtAt;
        }
    }, []);

    if (loading) return <div className="h-24 bg-brand-500 animate-pulse" />;

    const remaining = computed.weeklyWantsRemaining;
    const isNegative = remaining < 0;

    return (
        <header className="bg-brand-500 text-white shadow-md z-10 transition-all duration-300 relative">
            <div className="px-4 pt-3 pb-2 grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="flex flex-col gap-1">
                    {labsEnabled && (
                        <div className="opacity-80 text-xs font-medium uppercase tracking-wider">Weekly Wants</div>
                    )}
                    <div className="bg-brand-600 px-2 py-0.5 rounded text-xs font-medium opacity-90 w-fit">
                        Week {computed.currentWeek} / {computed.totalWeeks}
                    </div>
                </div>
                {/* The Single Truth */}
                {labsEnabled ? (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="justify-self-center flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:opacity-90 transition-opacity"
                    >
                        <div className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${isNegative ? 'text-red-200' : 'text-white'}`}>
                            {Math.floor(remaining)}
                        </div>

                        <div className="flex justify-center -mt-1 opacity-50">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                    </button>
                ) : (
                    <div className="justify-self-center text-center text-sm font-semibold opacity-50" aria-hidden="true">
                        —
                    </div>
                )}
                <div className="flex justify-end">
                    <SyncControls compact />
                </div>
            </div>

            {/* Detailed View */}
            {labsEnabled && (
                <div className={`bg-brand-600 overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4 text-xs uppercase tracking-wide text-brand-100">
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold">Labs</span>
                                <span className="text-[11px] opacity-80">Code-tracked build metadata</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold">Build #{buildInfo.buildNumber ?? '—'}</div>
                                {buildStamp && <div className="text-[11px] opacity-70">Built {buildStamp}</div>}
                            </div>
                        </div>
                        {['income', 'needs', 'future', 'wants'].map(cat => (
                            <div key={cat} className="flex items-center justify-between">
                                <span className="capitalize font-medium opacity-90">{cat}</span>
                                <div className="flex gap-4 text-right">
                                    <div>
                                        <div className="text-xs opacity-60">Target</div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'wants' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={draftValues?.[cat]?.target ?? ''}
                                            onChange={(e) => handleInputChange(cat, 'target', e.target.value)}
                                            onBlur={() => commitValue(cat, 'target')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    commitValue(cat, 'target');
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={cat === 'wants'}
                                        />
                                    </div>
                                    <div className="border-l border-brand-500 pl-4">
                                        <div className="text-xs opacity-60">Actual</div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'income' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={draftValues?.[cat]?.actual ?? ''}
                                            onChange={(e) => handleInputChange(cat, 'actual', e.target.value)}
                                            onBlur={() => commitValue(cat, 'actual')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    commitValue(cat, 'actual');
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={cat === 'income'}
                                        />
                                    </div>
                                    <div className="border-l border-brand-500 pl-4">
                                        <div className="text-xs opacity-60">Remaining</div>
                                        <div className={`w-20 text-right font-medium ${budget[cat].target - budget[cat].actual < 0 ? 'text-red-300' : 'text-white'}`}>
                                            {budget[cat].target - budget[cat].actual}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}

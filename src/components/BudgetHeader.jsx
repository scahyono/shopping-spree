import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SyncControls from './SyncControls';
import buildInfo from '../buildInfo.json';

export default function BudgetHeader() {
    const { computed, actions, budget, loading, currentUser } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [remoteBuildInfo, setRemoteBuildInfo] = useState(null);

    const labsEnabled = currentUser?.uid === 'vy1PP3WXv3PFz6zyCEiEN0ILmDW2';
    const formatBuildTimestamp = (timestamp) => {
        if (!timestamp) return '—';
        try {
            return new Date(timestamp).toLocaleString();
        } catch {
            return timestamp;
        }
    };

    useEffect(() => {
        let unsubscribe;

        import('../services/firebase')
            .then(({ listenToBuildInfo }) => {
                unsubscribe = listenToBuildInfo((info) => setRemoteBuildInfo(info));
            })
            .catch((error) => {
                console.error('Build info listener error:', error);
            });

        return () => unsubscribe?.();
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
                <div className="flex justify-end items-start text-right">
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
                                <span className="text-[11px] opacity-80">Budget configuration</span>
                            </div>
                        </div>
                        {['income', 'needs', 'future', 'wants'].map(cat => (
                            <div key={cat} className="flex items-center justify-between">
                                <span className="capitalize font-medium opacity-90">{cat}</span>
                                <div className="flex gap-4 text-right">
                                    <div>
                                        <div className="text-xs opacity-60">Target</div>
                                        <input
                                            type="number"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'wants' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={budget[cat].target}
                                            onChange={(e) => actions.updateBudget(cat, 'target', e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={cat === 'wants'}
                                        />
                                    </div>
                                    <div className="border-l border-brand-500 pl-4">
                                        <div className="text-xs opacity-60">Actual</div>
                                        <input
                                            type="number"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'income' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={budget[cat].actual}
                                            onChange={(e) => actions.updateBudget(cat, 'actual', e.target.value)}
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
                        <div className="mt-4 pt-4 border-t border-brand-500/60 text-[11px] uppercase tracking-wide text-brand-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span className="font-semibold">Build metadata</span>
                            <div className="text-sm font-semibold text-white flex flex-wrap items-center gap-2">
                                <span>Local #{buildInfo.buildNumber ?? '—'}</span>
                                <span className="text-white/40">/</span>
                                <span>Database #{remoteBuildInfo?.buildNumber ?? '—'}</span>
                                {remoteBuildInfo?.builtAt && (
                                    <span className="text-[11px] font-medium text-white/60">(updated {formatBuildTimestamp(remoteBuildInfo.builtAt)})</span>
                                )}
                                {!remoteBuildInfo && (
                                    <span className="text-[11px] font-medium text-white/60">Waiting for database build metadata</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

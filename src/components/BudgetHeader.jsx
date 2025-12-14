import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SyncControls from './SyncControls';
import buildInfo from '../buildInfo.json';

export default function BudgetHeader() {
    const { computed, actions, budget, loading, currentUser } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [remoteBuildInfo, setRemoteBuildInfo] = useState(null);
    const [cacheStatus, setCacheStatus] = useState('');
    const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
    const [activeBudgetField, setActiveBudgetField] = useState(null);
    const [pendingValue, setPendingValue] = useState('');
    const inputRefs = useRef({});
    const actionBarRef = useRef(null);

    const labsEnabled = currentUser?.uid === 'vy1PP3WXv3PFz6zyCEiEN0ILmDW2';
    const formatBuildTimestamp = (timestamp) => {
        if (!timestamp) return '—';
        try {
            const date = new Date(timestamp);
            const pad = (value) => value.toString().padStart(2, '0');

            return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

    const handleUpdateApp = async () => {
        setCacheStatus('');
        setIsApplyingUpdate(true);

        try {
            if ('caches' in window) {
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map((key) => caches.delete(key)));
            }

            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
            }

            setCacheStatus('Update applied. Reloading…');
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear local cache', error);
            setCacheStatus('Update failed. Please refresh manually.');
            setIsApplyingUpdate(false);
        }
    };

    const getFieldKey = (category, field) => `${category}-${field}`;
    const isFieldActive = (category, field) => activeBudgetField?.category === category && activeBudgetField?.field === field;

    const handleInputFocus = (category, field) => {
        setActiveBudgetField({ category, field });
        setPendingValue('');
    };

    const handleInputChange = (category, field, value) => {
        setActiveBudgetField({ category, field });
        setPendingValue(value);
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            const isBudgetInput = Object.values(inputRefs.current).includes(activeElement);
            const isActionBarElement = actionBarRef.current?.contains(activeElement);

            if (!isBudgetInput && !isActionBarElement) {
                setActiveBudgetField(null);
                setPendingValue('');
            }
        }, 0);
    };

    const parsePendingValue = () => {
        const amount = parseFloat(pendingValue);
        return Number.isFinite(amount) ? amount : 0;
    };

    const applyBudgetAction = (actionType) => {
        if (!activeBudgetField) return;

        const { category, field } = activeBudgetField;
        const baseValue = Number(budget?.[category]?.[field]) || 0;
        const amount = parsePendingValue();
        let nextValue = baseValue;

        if (actionType === 'set') nextValue = amount;
        if (actionType === 'add') nextValue = baseValue + amount;
        if (actionType === 'sub') nextValue = baseValue - amount;

        actions.updateBudget(category, field, nextValue);
        setPendingValue('');

        const inputEl = inputRefs.current[getFieldKey(category, field)];
        inputEl?.focus();
        inputEl?.select();
    };

    if (loading) return <div className="h-24 bg-brand-500 animate-pulse" />;

    const remaining = computed.weeklyWantsRemaining;
    const isNegative = remaining < 0;

    return (
        <>
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
                                            ref={(el) => { inputRefs.current[getFieldKey(cat, 'target')] = el; }}
                                            type="number"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'wants' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={isFieldActive(cat, 'target') ? pendingValue : budget[cat].target}
                                            onChange={(e) => handleInputChange(cat, 'target', e.target.value)}
                                            onFocus={() => handleInputFocus(cat, 'target')}
                                            onBlur={handleInputBlur}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={cat === 'wants'}
                                            placeholder={String(budget[cat].target)}
                                        />
                                    </div>
                                    <div className="border-l border-brand-500 pl-4">
                                        <div className="text-xs opacity-60">Actual</div>
                                        <input
                                            ref={(el) => { inputRefs.current[getFieldKey(cat, 'actual')] = el; }}
                                            type="number"
                                            className={`w-20 bg-brand-700 text-white text-right rounded px-1 focus:ring-2 focus:ring-white outline-none ${cat === 'income' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={isFieldActive(cat, 'actual') ? pendingValue : budget[cat].actual}
                                            onChange={(e) => handleInputChange(cat, 'actual', e.target.value)}
                                            onFocus={() => handleInputFocus(cat, 'actual')}
                                            onBlur={handleInputBlur}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={cat === 'income'}
                                            placeholder={String(budget[cat].actual)}
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
                        <div className="mt-4 pt-4 border-t border-brand-500/60 flex justify-end">
                            <div className="text-sm font-semibold text-white flex flex-col items-end gap-2 text-right w-full">
                                <div className="flex flex-wrap items-center gap-2 justify-end">
                                    <span>Build #{buildInfo.buildNumber ?? '—'}</span>
                                    <span className="text-white/40">/</span>
                                    <span>DB #{remoteBuildInfo?.buildNumber ?? '—'}</span>
                                    {remoteBuildInfo?.builtAt ? (
                                        <span className="text-[11px] font-medium text-white/60">({formatBuildTimestamp(remoteBuildInfo.builtAt)})</span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-white/60">Waiting for database build metadata</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleUpdateApp}
                                        disabled={isApplyingUpdate}
                                        className="text-xs bg-white text-brand-700 font-semibold px-2.5 py-1 rounded-lg shadow-sm hover:bg-brand-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isApplyingUpdate ? 'Updating…' : 'Update'}
                                    </button>
                                </div>
                                {cacheStatus && (
                                    <div className="text-[11px] font-medium text-white/70" aria-live="polite">{cacheStatus}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </header>
            {activeBudgetField && (
                <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
                    <div
                        ref={actionBarRef}
                        className="max-w-xl mx-auto bg-white text-gray-800 rounded-2xl shadow-xl border border-gray-100 p-3"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            <span>
                                {activeBudgetField.category} — {activeBudgetField.field}
                            </span>
                            <span className="text-gray-700">Current: {budget?.[activeBudgetField.category]?.[activeBudgetField.field] ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('set')}
                                className="flex-1 py-2 rounded-lg font-semibold text-sm uppercase bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-[0.99] transition"
                            >
                                = Set
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('add')}
                                className="flex-1 py-2 rounded-lg font-semibold text-sm uppercase bg-green-100 text-green-800 hover:bg-green-200 active:scale-[0.99] transition"
                            >
                                + Add
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('sub')}
                                className="flex-1 py-2 rounded-lg font-semibold text-sm uppercase bg-red-100 text-red-800 hover:bg-red-200 active:scale-[0.99] transition"
                            >
                                − Sub
                            </button>
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">Enter an amount, then choose how to apply it.</div>
                    </div>
                </div>
            )}
        </>
    );
}

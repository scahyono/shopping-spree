import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SyncControls from './SyncControls';
import buildInfo from '../buildInfo.json';
import { formatCurrency, parseCurrencyInput } from '../utils/currency';

export default function BudgetHeader() {
    const { computed, actions, loading, currentUser } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [remoteBuildInfo, setRemoteBuildInfo] = useState(null);
    const [cacheStatus, setCacheStatus] = useState('');
    const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
    const [activeBudgetField, setActiveBudgetField] = useState(null);
    const [pendingValue, setPendingValue] = useState('');
    const inputRefs = useRef({});
    const actionBarRef = useRef(null);
    const [actionBarPosition, setActionBarPosition] = useState({ top: 0, left: 0, width: 0 });

    const formatTimestamp = (timestamp) => {
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
    const getFieldLabel = (category, field) => {
        if (category === 'weekly' && field === 'remaining') return 'weekly — budget';

        return `${category} — ${field}`;
    };

    const positionActionBar = (category, field) => {
        const inputEl = inputRefs.current[getFieldKey(category, field)];

        if (!inputEl) return;

        const rect = inputEl.getBoundingClientRect();
        const viewportLeft = rect.left + window.scrollX;
        const viewportTop = rect.bottom + window.scrollY;
        const targetWidth = Math.max(rect.width, 220);
        const maxLeft = Math.max(0, (window.innerWidth + window.scrollX) - targetWidth - 12);

        setActionBarPosition({
            left: Math.min(viewportLeft, maxLeft),
            top: viewportTop + 8,
            width: targetWidth,
        });
    };

    const handleInputFocus = (category, field) => {
        setActiveBudgetField({ category, field });
        setPendingValue('');
        positionActionBar(category, field);
    };

    const handleInputChange = (category, field, value) => {
        setActiveBudgetField({ category, field });
        setPendingValue(value);
        positionActionBar(category, field);
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

    const parsePendingValue = () => parseCurrencyInput(pendingValue);

    const applyBudgetAction = (actionType) => {
        if (!activeBudgetField) return;

        const { category, field } = activeBudgetField;
        const baseValue = Number(computed.userBudget?.[category]?.[field]) || 0;
        const amount = parsePendingValue();
        let nextValue = baseValue;

        if (actionType === 'set') nextValue = amount;
        if (actionType === 'add') nextValue = baseValue + amount;
        if (actionType === 'sub') nextValue = baseValue - amount;

        actions.updateBudget(category, field, nextValue, { method: actionType, change: nextValue - baseValue });
        setPendingValue('');

        const inputEl = inputRefs.current[getFieldKey(category, field)];
        inputEl?.focus();
        inputEl?.select();
        positionActionBar(category, field);
    };

    useEffect(() => {
        const syncPosition = () => {
            if (activeBudgetField) {
                positionActionBar(activeBudgetField.category, activeBudgetField.field);
            }
        };

        window.addEventListener('resize', syncPosition);
        window.addEventListener('scroll', syncPosition, true);

        return () => {
            window.removeEventListener('resize', syncPosition);
            window.removeEventListener('scroll', syncPosition, true);
        };
    }, [activeBudgetField]);

    if (loading) return <div className="h-24 bg-brand-500 animate-pulse" />;

    const budgetAmount = computed.weeklyRemaining;
    const isNegative = budgetAmount < 0;
    const formattedBudget = formatCurrency(budgetAmount);
    const userLabel = currentUser ? (currentUser.displayName || currentUser.email || '') : '';

    const budgetHistory = Array.isArray(computed.userBudget?.history) ? computed.userBudget.history : [];
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = budgetHistory
        .filter((entry) => {
            const timestamp = Date.parse(entry?.timestamp);
            return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo;
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const formatChange = (change = 0) => {
        const numeric = Number(change) || 0;
        const prefix = numeric >= 0 ? '+' : '−';
        return `${prefix}${formatCurrency(Math.abs(numeric))}`;
    };

    return (
        <>
            <header className="bg-brand-500 text-white shadow-md z-10 transition-all duration-300 relative">
                <div className="px-4 pt-3 pb-2 grid grid-cols-[1fr_auto_1fr] items-center">
                    <div className="flex flex-col gap-0.5">
                        <div className="opacity-80 text-xs font-medium uppercase tracking-wider">Weekly Budget</div>
                        {userLabel ? (
                            <div className="text-sm font-semibold leading-tight text-white truncate" title={userLabel}>
                                {userLabel}
                            </div>
                        ) : null}
                    </div>
                    {/* The Single Truth */}
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="justify-self-center flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:opacity-90 transition-opacity"
                    >
                        <div className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${isNegative ? 'text-red-200' : 'text-white'}`}>
                            {formattedBudget}
                        </div>

                        <div className="flex justify-center -mt-1 opacity-50">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                    </button>
                    <div className="flex flex-col items-end text-right gap-1">
                        <SyncControls compact />
                    </div>
                </div>

                {/* Detailed View */}
                <div className={`bg-brand-600 overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4 text-xs uppercase tracking-wide text-brand-100">
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold">Budget</span>
                                <span className="text-[11px] opacity-80">Configuration</span>
                            </div>
                            <a
                                href="https://github.com/scahyono/shopping-spree"
                                target="_blank"
                                rel="noreferrer"
                                className="text-lg font-semibold text-white hover:text-brand-50"
                                aria-label="Project documentation"
                            >
                                ?
                            </a>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold">Weekly Budget</span>
                                    <span className="text-[11px] opacity-80">Set your budget for the week</span>
                                </div>
                                <input
                                    ref={(el) => { inputRefs.current[getFieldKey('weekly', 'remaining')] = el; }}
                                    type="number"
                                    className="w-28 bg-brand-700 text-white text-right rounded px-2 py-1 focus:ring-2 focus:ring-white outline-none"
                                    value={isFieldActive('weekly', 'remaining') ? pendingValue : formatCurrency(computed.userBudget?.weekly?.remaining ?? 0)}
                                    onChange={(e) => handleInputChange('weekly', 'remaining', e.target.value)}
                                    onFocus={() => handleInputFocus('weekly', 'remaining')}
                                    onBlur={handleInputBlur}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={formatCurrency(computed.userBudget?.weekly?.remaining ?? 0)}
                                />
                            </div>
                            <div className="flex justify-end text-sm font-semibold text-white">
                                <span className={isNegative ? 'text-red-200' : 'text-white'}>Budget: {formattedBudget}</span>
                            </div>
                            <div className="pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold">Budget History</span>
                                        <span className="text-[11px] opacity-80">Last 30 days</span>
                                    </div>
                                </div>
                                <div className="bg-brand-700/60 rounded-lg border border-brand-500/60 divide-y divide-brand-500/60">
                                    {recentHistory.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-brand-100">No budget changes recorded in the last 30 days.</div>
                                    ) : (
                                        recentHistory.map((entry) => (
                                            <div key={entry.id} className="px-3 py-2 flex items-start justify-between gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-white">{formatTimestamp(entry.timestamp)}</span>
                                                    <span className="text-[11px] text-brand-200 capitalize">{entry.method} update</span>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-0.5">
                                                    <span className={`text-sm font-semibold ${entry.change < 0 ? 'text-red-100' : 'text-green-100'}`}>
                                                        {formatChange(entry.change)}
                                                    </span>
                                                    <span className="text-[11px] text-brand-200">Budget: {formatCurrency(entry.next)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-brand-500/60 flex justify-end">
                            <div className="text-sm font-semibold text-white flex flex-col items-end gap-2 text-right w-full">
                                <div className="flex flex-wrap items-center gap-2 justify-end">
                                    <span>Build #{buildInfo.buildNumber ?? '—'}</span>
                                    <span className="text-white/40">/</span>
                                    <span>DB #{remoteBuildInfo?.buildNumber ?? '—'}</span>
                                    {remoteBuildInfo?.builtAt ? (
                                        <span className="text-[11px] font-medium text-white/60">({formatTimestamp(remoteBuildInfo.builtAt)})</span>
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
            </header>
            {activeBudgetField && (
                <div className="fixed inset-0 z-30 pointer-events-none">
                    <div
                        ref={actionBarRef}
                        className="pointer-events-auto max-w-xs bg-white text-gray-800 rounded-xl shadow-lg border border-gray-100 p-2"
                        style={{
                            top: actionBarPosition.top,
                            left: actionBarPosition.left,
                            width: actionBarPosition.width || undefined,
                            position: 'absolute',
                        }}
                    >
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            <span>
                                {getFieldLabel(activeBudgetField.category, activeBudgetField.field)}
                            </span>
                            <span className="text-gray-700">{formatCurrency(computed.userBudget?.[activeBudgetField.category]?.[activeBudgetField.field] ?? 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('set')}
                                className="flex-1 py-1.5 rounded-lg font-semibold text-[13px] uppercase bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-[0.99] transition"
                            >
                                = Set
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('add')}
                                className="flex-1 py-1.5 rounded-lg font-semibold text-[13px] uppercase bg-green-100 text-green-800 hover:bg-green-200 active:scale-[0.99] transition"
                            >
                                + Add
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyBudgetAction('sub')}
                                className="flex-1 py-1.5 rounded-lg font-semibold text-[13px] uppercase bg-red-100 text-red-800 hover:bg-red-200 active:scale-[0.99] transition"
                            >
                                − Sub
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

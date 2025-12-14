import { useEffect, useRef } from 'react';
import { PartyPopper, TimerReset } from 'lucide-react';
import { getFocusRewardConstants } from '../utils/focusReward';

const { cooldownMs, maxRank } = getFocusRewardConstants();

function playCelebrationTone(audioContextRef) {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;

    try {
        const context = new window.AudioContext();
        audioContextRef.current = context;

        const scheduleNote = (frequency, startTime, duration) => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.value = frequency;

            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.18, startTime + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            oscillator.connect(gainNode).connect(context.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration + 0.02);
        };

        const start = context.currentTime + 0.05;
        scheduleNote(554.37, start, 0.35); // C#5
        scheduleNote(659.25, start + 0.22, 0.4); // E5
        scheduleNote(830.61, start + 0.44, 0.5); // G#5

        setTimeout(() => {
            context.close().catch(() => {});
        }, 1200);
    } catch (error) {
        console.warn('Focus celebration sound could not play', error);
    }
}

export default function FocusCelebration({ rank = maxRank, previousRank, onDismiss }) {
    const audioContextRef = useRef(null);
    const hours = Math.round(cooldownMs / (1000 * 60 * 60));
    const priorRank = Number.isFinite(previousRank) ? previousRank : rank;

    useEffect(() => {
        playCelebrationTone(audioContextRef);

        const timer = setTimeout(() => {
            onDismiss?.();
        }, 3600);

        return () => {
            clearTimeout(timer);
            const context = audioContextRef.current;
            if (context?.state !== 'closed') {
                context.close().catch(() => {});
            }
        };
    }, [onDismiss]);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white flex items-center justify-center px-6 py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.1),transparent_28%)]" aria-hidden />
            <div
                className="relative max-w-lg w-full bg-white/10 border border-white/20 rounded-3xl shadow-2xl backdrop-blur-md p-6 sm:p-8 text-center animate-[pop_0.4s_ease-out]"
                role="dialog"
                aria-modal="true"
                aria-label="Focus reward celebration"
            >
                <div className="flex items-center justify-center gap-3 text-sm uppercase tracking-[0.24em] text-white/80 mb-3">
                    <TimerReset className="h-5 w-5" aria-hidden />
                    <span>Focus Reign</span>
                </div>

                <div className="flex items-center justify-center gap-3 mb-2">
                    <PartyPopper className="h-7 w-7" aria-hidden />
                    <h1 className="text-3xl sm:text-4xl font-black">Focus Rank: {rank} (was {priorRank})</h1>
                </div>

                <p className="text-xl font-semibold text-white/90 mb-4">Rank Restored</p>
                <p className="text-sm sm:text-base text-white/80 mb-6 leading-relaxed">
                    You stayed out for {hours} hours. Your Focus Rank is reset to the maximum level—enjoy the minimum delay and a fresh start.
                </p>

                <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-brand-700 font-semibold shadow-lg shadow-brand-900/30 transition transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/80"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

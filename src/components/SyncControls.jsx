import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { onAuthChange, signInWithGoogle, signOut, getCurrentUser } from '../services/firebase';

export default function SyncControls({ compact = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [waitingStatus, setWaitingStatus] = useState('idle');

    useEffect(() => {
        let unsubscribe;

        setCurrentUser(getCurrentUser());

        unsubscribe = onAuthChange((user) => {
            setCurrentUser(user);
            if (user) {
                setStatus(`Syncing as ${user.email}`);
                setError('');
                setWaitingStatus('approved');
            } else {
                setWaitingStatus('idle');
            }
        });

        return () => unsubscribe?.();
    }, []);

    const handleSignIn = async () => {
        setError('');
        setStatus('');
        setWaitingStatus('idle');
        try {
            const user = await signInWithGoogle();
            setCurrentUser(user);
            setStatus(`Syncing as ${user.email}`);
            setWaitingStatus('approved');
        } catch (err) {
            if (err.code === 'auth/waiting-list') {
                setStatus('Waiting for admin approval');
                setWaitingStatus('pending');
            } else {
                setError(err.message);
            }
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setCurrentUser(null);
            setStatus('Signed out');
            setWaitingStatus('idle');
        } catch (err) {
            setError('Failed to sign out');
        }
    };

    const isWaiting = waitingStatus === 'pending' && !currentUser;

    const buttonClasses = () => {
        if (currentUser) {
            return compact
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        }

        if (isWaiting) {
            return compact
                ? 'bg-amber-500/80 text-white'
                : 'bg-amber-500 text-white hover:bg-amber-600';
        }

        return compact
            ? 'bg-white/10 text-white/90'
            : 'bg-blue-500 text-white hover:bg-blue-600';
    };

    const renderIcon = () => {
        if (currentUser) return <LogOut size={18} />;
        if (isWaiting) return <Clock size={18} />;
        return <LogIn size={18} />;
    };

    const statusClass = () => {
        if (error) return 'text-red-600';
        if (isWaiting) return 'text-amber-600';
        return 'text-green-600';
    };

    return (
        <div className={`flex items-center gap-2 ${compact ? 'text-white' : 'bg-white rounded-xl shadow-sm p-4 border border-brand-100'}`}>
            <button
                onClick={currentUser ? handleSignOut : handleSignIn}
                className={`flex items-center justify-center h-9 px-3 rounded-full transition ${buttonClasses()}`}
                aria-label={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
                title={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
            >
                {renderIcon()}
                {!compact && (
                    <span className="ml-2 text-sm font-medium">
                        {currentUser ? 'Sign Out' : isWaiting ? 'Pending' : 'Sign In'}
                    </span>
                )}
            </button>

            {!compact && (
                <div className="flex-1 text-sm text-gray-700 min-w-0">
                    <p className="font-medium truncate">{currentUser ? currentUser.email : 'Sign in to sync across devices'}</p>
                    {(status || error) && (
                        <p className={statusClass()}>{error || status}</p>
                    )}
                </div>
            )}

            {compact && (status || error) && (
                <span className="sr-only" aria-live="polite">{error || status}</span>
            )}
        </div>
    );
}

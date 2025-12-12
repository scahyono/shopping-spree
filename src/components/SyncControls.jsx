import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { onAuthChange, signInWithGoogle, signOut, getCurrentUser } from '../services/firebase';

export default function SyncControls({ compact = false }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let unsubscribe;

        setCurrentUser(getCurrentUser());

        unsubscribe = onAuthChange((user) => {
            setCurrentUser(user);
            if (user) {
                setStatus(`Syncing as ${user.email}`);
                setError('');
            }
        });

        return () => unsubscribe?.();
    }, []);

    const handleSignIn = async () => {
        setError('');
        setStatus('');
        try {
            const user = await signInWithGoogle();
            setCurrentUser(user);
            setStatus(`Syncing as ${user.email}`);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setCurrentUser(null);
            setStatus('Signed out');
        } catch (err) {
            setError('Failed to sign out');
        }
    };

    return (
        <div className={`flex items-center gap-2 ${compact ? 'text-white' : 'bg-white rounded-xl shadow-sm p-4 border border-brand-100'}`}>
            <button
                onClick={currentUser ? handleSignOut : handleSignIn}
                className={`flex items-center justify-center h-9 px-3 rounded-full transition ${currentUser ? (compact ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') : (compact ? 'bg-white/10 text-white/90' : 'bg-blue-500 text-white hover:bg-blue-600')}`}
                aria-label={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
                title={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
            >
                {currentUser ? <LogOut size={18} /> : <LogIn size={18} />}
                {!compact && (
                    <span className="ml-2 text-sm font-medium">
                        {currentUser ? 'Sign Out' : 'Sign In'}
                    </span>
                )}
            </button>

            {!compact && (
                <div className="flex-1 text-sm text-gray-700 min-w-0">
                    <p className="font-medium truncate">{currentUser ? currentUser.email : 'Sign in to sync across devices'}</p>
                    {(status || error) && (
                        <p className={error ? 'text-red-600' : 'text-green-600'}>{error || status}</p>
                    )}
                </div>
            )}

            {compact && (status || error) && (
                <span className="sr-only" aria-live="polite">{error || status}</span>
            )}
        </div>
    );
}

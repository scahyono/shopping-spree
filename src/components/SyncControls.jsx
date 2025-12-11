import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';
import { onAuthChange, signInWithGoogle, signOut, getCurrentUser } from '../services/firebase';
import { StorageService } from '../services/storage';

export default function SyncControls({ compact = false }) {
    const [useFirebase, setUseFirebase] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let unsubscribe;

        StorageService.getSettings().then(settings => {
            setUseFirebase(Boolean(settings.useFirebase));
        });

        setCurrentUser(getCurrentUser());

        unsubscribe = onAuthChange((user) => {
            setCurrentUser(user);
            if (user) {
                setStatus(`Signed in as ${user.email}`);
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
            setStatus(`Signed in as ${user.email}`);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setCurrentUser(null);
            setUseFirebase(false);
            await StorageService.saveSettings({ useFirebase: false });
            setStatus('Signed out and sync disabled');
        } catch (err) {
            setError('Failed to sign out');
        }
    };

    const handleToggleFirebase = async () => {
        if (!currentUser) {
            setError('Sign in with Google to enable sync');
            return;
        }

        const nextValue = !useFirebase;
        setUseFirebase(nextValue);
        await StorageService.saveSettings({ useFirebase: nextValue });
        setStatus(`Realtime sync ${nextValue ? 'enabled' : 'disabled'}`);

        if (nextValue) {
            window.location.reload();
        }
    };

    return (
        <div className={`flex items-center gap-2 ${compact ? 'text-white' : 'bg-white rounded-xl shadow-sm p-4 border border-brand-100'}`}>
            <button
                onClick={handleToggleFirebase}
                className={`flex items-center justify-center h-9 w-9 rounded-full transition ${useFirebase ? 'bg-white/20 text-white' : compact ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                aria-label={useFirebase ? 'Disable realtime sync' : 'Enable realtime sync'}
                title={useFirebase ? 'Disable realtime sync' : 'Enable realtime sync'}
            >
                {useFirebase ? <Cloud size={18} /> : <CloudOff size={18} />}
            </button>

            <button
                onClick={currentUser ? handleSignOut : handleSignIn}
                className={`flex items-center justify-center h-9 w-9 rounded-full transition ${currentUser ? (compact ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') : (compact ? 'bg-white/10 text-white/90' : 'bg-blue-500 text-white hover:bg-blue-600')}`}
                aria-label={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
                title={currentUser ? 'Sign out of Google' : 'Sign in with Google'}
            >
                {currentUser ? <LogOut size={18} /> : <LogIn size={18} />}
            </button>

            {!compact && (
                <div className="flex-1 text-sm text-gray-700">
                    {currentUser ? (
                        <p className="font-medium">{currentUser.email}</p>
                    ) : (
                        <p className="text-gray-500">Sign in to sync across devices</p>
                    )}
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

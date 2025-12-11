import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LogIn, LogOut } from 'lucide-react';
import { signInWithGoogle, signOut, getCurrentUser } from '../services/firebase';
import { StorageService } from '../services/storage';

export default function SyncControls() {
    const [useFirebase, setUseFirebase] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        StorageService.getSettings().then(settings => {
            setUseFirebase(Boolean(settings.useFirebase));
        });
        setCurrentUser(getCurrentUser());
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
        <div className="bg-white rounded-xl shadow-sm p-4 border border-brand-100">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {useFirebase ? <Cloud className="text-brand-500" size={20} /> : <CloudOff className="text-gray-400" size={20} />}
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Realtime Sync</p>
                        <p className="text-xs text-gray-600">Share budgets and lists across devices</p>
                    </div>
                </div>
                <button
                    onClick={handleToggleFirebase}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${useFirebase ? 'bg-brand-500' : 'bg-gray-300'}`}
                >
                    <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${useFirebase ? 'translate-x-7' : 'translate-x-1'}`}
                    />
                </button>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
                {currentUser ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold">
                            {currentUser.email[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium">{currentUser.email}</p>
                            <p className="text-xs text-gray-500">Connected</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">Sign in to start syncing across your family</p>
                )}

                {currentUser ? (
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition"
                    >
                        <LogOut size={18} />
                        Sign out
                    </button>
                ) : (
                    <button
                        onClick={handleSignIn}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        <LogIn size={18} />
                        Sign in with Google
                    </button>
                )}
            </div>

            {(status || error) && (
                <div className="mt-3 text-sm">
                    {status && <p className="text-green-600">{status}</p>}
                    {error && <p className="text-red-600">{error}</p>}
                </div>
            )}
        </div>
    );
}

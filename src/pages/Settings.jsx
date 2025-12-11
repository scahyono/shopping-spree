import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogIn, LogOut, Save, AlertCircle } from 'lucide-react';
import { signInWithGoogle, signOut, getCurrentUser } from '../services/firebase';

export default function SettingsPage() {
    const [firebaseConfig, setFirebaseConfig] = useState({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    });

    const [useFirebase, setUseFirebase] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Load settings from localStorage
        const settings = JSON.parse(localStorage.getItem('shopping_spree_settings') || '{}');
        if (settings.firebaseConfig) {
            setFirebaseConfig(settings.firebaseConfig);
        }
        setUseFirebase(settings.useFirebase || false);

        // Check current user
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    const handleConfigChange = (field, value) => {
        setFirebaseConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveConfig = () => {
        try {
            const settings = {
                firebaseConfig,
                useFirebase: false // Don't enable yet
            };
            localStorage.setItem('shopping_spree_settings', JSON.stringify(settings));
            setSuccess('Firebase configuration saved!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to save configuration');
        }
    };

    const handleSignIn = async () => {
        setError('');
        try {
            const user = await signInWithGoogle();
            setCurrentUser(user);
            setSuccess(`Signed in as ${user.email}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setCurrentUser(null);
            setUseFirebase(false);

            // Update settings
            const settings = JSON.parse(localStorage.getItem('shopping_spree_settings') || '{}');
            settings.useFirebase = false;
            localStorage.setItem('shopping_spree_settings', JSON.stringify(settings));

            setSuccess('Signed out successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to sign out');
        }
    };

    const handleToggleFirebase = async () => {
        if (!useFirebase && !currentUser) {
            // Need to sign in first
            setError('Please sign in with Google first');
            return;
        }

        const newValue = !useFirebase;
        setUseFirebase(newValue);

        // Save to localStorage
        const settings = JSON.parse(localStorage.getItem('shopping_spree_settings') || '{}');
        settings.useFirebase = newValue;
        localStorage.setItem('shopping_spree_settings', JSON.stringify(settings));

        setSuccess(`Firebase sync ${newValue ? 'enabled' : 'disabled'}`);
        setTimeout(() => setSuccess(''), 3000);

        // Reload page to reinitialize with new settings
        if (newValue) {
            window.location.reload();
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <SettingsIcon size={32} className="text-brand-500" />
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                    {success}
                </div>
            )}

            {/* Firebase Configuration */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Firebase Configuration</h2>

                <div className="space-y-3">
                    {Object.keys(firebaseConfig).map(key => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input
                                type="text"
                                value={firebaseConfig[key]}
                                onChange={(e) => handleConfigChange(key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder={`Enter ${key}`}
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSaveConfig}
                    className="w-full bg-brand-500 text-white py-2 px-4 rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={20} />
                    Save Configuration
                </button>
            </div>

            {/* Authentication */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Authentication</h2>

                {currentUser ? (
                    <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
                            <p className="text-sm text-gray-600">Signed in as:</p>
                            <p className="font-medium text-gray-800">{currentUser.email}</p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleSignIn}
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} />
                        Sign In with Google
                    </button>
                )}
            </div>

            {/* Firebase Sync Toggle */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Firebase Sync</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-800">Enable Firebase Sync</p>
                        <p className="text-sm text-gray-600">Sync data with family members in real-time</p>
                    </div>
                    <button
                        onClick={handleToggleFirebase}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${useFirebase ? 'bg-brand-500' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${useFirebase ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}

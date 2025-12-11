import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

let firebaseApp = null;
let auth = null;
let db = null;
let unsubscribe = null;

// Initialize Firebase with user-provided config from localStorage
export function initializeFirebase() {
    const settings = JSON.parse(localStorage.getItem('shopping_spree_settings') || '{}');
    const config = settings.firebaseConfig;

    if (!config) {
        throw new Error('Firebase config not found in settings');
    }

    if (!firebaseApp) {
        firebaseApp = initializeApp(config);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
    }

    return { auth, db };
}

// Google Sign-In
export async function signInWithGoogle() {
    const { auth } = initializeFirebase();
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check whitelist
        const isWhitelisted = await checkWhitelist(user.email);
        if (!isWhitelisted) {
            await firebaseSignOut(auth);
            throw new Error(`Email ${user.email} is not whitelisted. Contact admin.`);
        }

        return user;
    } catch (error) {
        console.error('Sign-in error:', error);
        throw error;
    }
}

// Check if email is in whitelist
async function checkWhitelist(email) {
    const { db } = initializeFirebase();
    const whitelistDoc = doc(db, 'whitelist', email);
    const snapshot = await getDoc(whitelistDoc);
    return snapshot.exists();
}

// Sign out
export async function signOut() {
    if (auth) {
        await firebaseSignOut(auth);
    }
}

// Get current user
export function getCurrentUser() {
    return auth?.currentUser || null;
}

// Load shared family data from Firestore
export async function loadFamilyData() {
    const { db } = initializeFirebase();
    const familyDoc = doc(db, 'family', 'shared');
    const snapshot = await getDoc(familyDoc);

    if (snapshot.exists()) {
        return snapshot.data();
    }
    return null;
}

// Save shared family data to Firestore
export async function saveFamilyData(data) {
    const { db, auth } = initializeFirebase();
    const user = auth.currentUser;

    if (!user) {
        throw new Error('User not authenticated');
    }

    const familyDoc = doc(db, 'family', 'shared');
    await setDoc(familyDoc, {
        ...data,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

// Listen to real-time updates on shared family data
export function listenToFamilyData(callback) {
    const { db } = initializeFirebase();
    const familyDoc = doc(db, 'family', 'shared');

    // Unsubscribe from previous listener if exists
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = onSnapshot(familyDoc, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        }
    });

    return unsubscribe;
}

// Stop listening to updates
export function stopListening() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

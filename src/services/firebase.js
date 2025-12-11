import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getDatabase, get, off, onValue, ref, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyDks3_CoJfEpj2bqTCGeQZhGibXgY9n9l8",
    authDomain: "shopping-spree-94c4d.firebaseapp.com",
    projectId: "shopping-spree-94c4d",
    storageBucket: "shopping-spree-94c4d.firebasestorage.app",
    messagingSenderId: "289860492862",
    appId: "1:289860492862:web:63f3b31fe637472280fb6f",
    databaseURL: "https://shopping-spree-94c4d-default-rtdb.firebaseio.com"
};

let firebaseApp = null;
let auth = null;
let database = null;
const listeners = [];

function initializeFirebase() {
    if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        database = getDatabase(firebaseApp);
    }

    return { auth, database };
}

function sanitizeEmail(email) {
    return email.replace(/[.#$\[\]/]/g, ',');
}

export async function signInWithGoogle() {
    const { auth } = initializeFirebase();
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const isWhitelisted = await checkWhitelist(user.email);
    if (!isWhitelisted) {
        await firebaseSignOut(auth);
        throw new Error(`Email ${user.email} is not whitelisted. Contact admin.`);
    }

    return user;
}

async function checkWhitelist(email) {
    const { database } = initializeFirebase();
    const safeEmail = sanitizeEmail(email);
    const whitelistRef = ref(database, `whitelist/${safeEmail}`);
    const snapshot = await get(whitelistRef);
    return snapshot.exists();
}

export async function signOut() {
    if (!auth) return;
    await firebaseSignOut(auth);
}

export function getCurrentUser() {
    return auth?.currentUser || null;
}

export async function loadFamilyData() {
    const { database } = initializeFirebase();
    const familyRef = ref(database, 'family/shared');
    const snapshot = await get(familyRef);
    return snapshot.exists() ? snapshot.val() : null;
}

export async function saveFamilyBudget(budget) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const familyRef = ref(database, 'family/shared');
    await update(familyRef, {
        budget,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

export async function saveFamilyItems(items) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const familyRef = ref(database, 'family/shared');
    await update(familyRef, {
        items,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

export function listenToFamilyBudget(callback) {
    const { database } = initializeFirebase();
    const budgetRef = ref(database, 'family/shared/budget');

    const handler = (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    };

    onValue(budgetRef, handler);
    listeners.push({ ref: budgetRef, handler });

    return () => off(budgetRef, 'value', handler);
}

export function listenToFamilyItems(callback) {
    const { database } = initializeFirebase();
    const itemsRef = ref(database, 'family/shared/items');

    const handler = (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    };

    onValue(itemsRef, handler);
    listeners.push({ ref: itemsRef, handler });

    return () => off(itemsRef, 'value', handler);
}

export function stopListening() {
    listeners.splice(0).forEach(({ ref: targetRef, handler }) => {
        off(targetRef, 'value', handler);
    });
}

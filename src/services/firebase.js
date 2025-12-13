import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getDatabase, get, off, onValue, ref, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyDks3_CoJfEpj2bqTCGeQZhGibXgY9n9l8",
    authDomain: "shopping-spree-94c4d.firebaseapp.com",
    projectId: "shopping-spree-94c4d",
    storageBucket: "shopping-spree-94c4d.firebasestorage.app",
    messagingSenderId: "289860492862",
    appId: "1:289860492862:web:63f3b31fe637472280fb6f",
    databaseURL: "https://shopping-spree-94c4d-default-rtdb.europe-west1.firebasedatabase.app"
};

let firebaseApp = null;
let auth = null;
let database = null;
const listeners = [];
const BUILD_INFO_PATH = 'family/shared/buildInfo';

function initializeFirebase() {
    if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        database = getDatabase(firebaseApp);
    }

    return { auth, database };
}

export function waitForAuthReady() {
    const { auth } = initializeFirebase();

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                resolve(user);
            },
            () => {
                unsubscribe();
                resolve(null);
            }
        );
    });
}

export function onAuthChange(callback) {
    const { auth } = initializeFirebase();
    return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
    const { auth } = initializeFirebase();
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const isWhitelisted = await checkWhitelist(user.uid);
    if (!isWhitelisted) {
        await addToWaitingList(user);
        await firebaseSignOut(auth);
        const waitingError = new Error(
            `${user.email} is not whitelisted yet. You've been added to the waiting list.`
        );
        waitingError.code = 'auth/waiting-list';
        waitingError.waitingUid = user.uid;
        throw waitingError;
    }

    return user;
}

async function checkWhitelist(uid) {
    const { database } = initializeFirebase();
    const whitelistRef = ref(database, `whitelist/${uid}`);
    const snapshot = await get(whitelistRef);
    return snapshot.exists();
}

async function addToWaitingList(user) {
    const { database } = initializeFirebase();
    const waitingRef = ref(database, `waitingList/${user.uid}`);

    await update(waitingRef, {
        email: user.email,
        displayName: user.displayName || '',
        requestedAt: new Date().toISOString(),
        status: 'pending'
    });
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

    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    // Convert items object to array if it exists
    if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        data.items = Object.values(data.items);
    }

    return data;
}

export async function loadBuildInfoFromDatabase() {
    const { database } = initializeFirebase();
    const buildInfoRef = ref(database, BUILD_INFO_PATH);
    const snapshot = await get(buildInfoRef);

    if (!snapshot.exists()) return null;

    return snapshot.val();
}

// Granular update for a single budget field
export async function updateBudgetField(category, field, value) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const budgetFieldRef = ref(database, `family/shared/budget/${category}/${field}`);
    await update(ref(database, 'family/shared'), {
        [`budget/${category}/${field}`]: value,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

// Granular update for a single item
export async function updateItem(item) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await update(ref(database, 'family/shared'), {
        [`items/${item.id}`]: item,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

// Delete a single item
export async function deleteItem(itemId) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await update(ref(database, 'family/shared'), {
        [`items/${itemId}`]: null,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

// Bulk update for initial sync or migration (kept for compatibility)
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

    // Convert array to object keyed by id
    const itemsObject = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});

    const familyRef = ref(database, 'family/shared');
    await update(familyRef, {
        items: itemsObject,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.email
    });
}

export async function saveBuildInfo(buildInfo) {
    const { database, auth } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await update(ref(database, BUILD_INFO_PATH), {
        ...buildInfo,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: user.email
    });
}

export function listenToFamilyBudget(callback) {
    const { database } = initializeFirebase();
    const budgetRef = ref(database, 'family/shared/budget');

    const handler = (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
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
            const itemsObject = snapshot.val();
            // Convert object to array
            const itemsArray = Object.values(itemsObject || {});
            callback(itemsArray);
        }
    };

    onValue(itemsRef, handler);
    listeners.push({ ref: itemsRef, handler });

    return () => off(itemsRef, 'value', handler);
}

export function listenToBuildInfo(callback) {
    const { database } = initializeFirebase();
    const buildInfoRef = ref(database, BUILD_INFO_PATH);

    const handler = (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    };

    onValue(buildInfoRef, handler);
    listeners.push({ ref: buildInfoRef, handler });

    return () => off(buildInfoRef, 'value', handler);
}

export function stopListening() {
    listeners.splice(0).forEach(({ ref: targetRef, handler }) => {
        off(targetRef, 'value', handler);
    });
}

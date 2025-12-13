import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'buildInfo.json');
const databaseURL = 'https://shopping-spree-94c4d-default-rtdb.europe-west1.firebasedatabase.app';
const buildInfoPath = 'buildInfo';
const firebaseApiKey = 'AIzaSyDks3_CoJfEpj2bqTCGeQZhGibXgY9n9l8';
const buildBotUid = 'f1Csbq9tI1gqg0mZ7IVSiVFpTWx1';
const buildBotEmail = 'builtbot@shopping-spree.bot';

function loadBuildInfo() {
    if (!fs.existsSync(filePath)) {
        return { buildNumber: 0, builtAt: null };
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        console.warn('[bump-build] Unable to read build info, resetting.', error);
        return { buildNumber: 0, builtAt: null };
    }
}

function saveBuildInfo(info) {
    fs.writeFileSync(filePath, `${JSON.stringify(info, null, 2)}\n`);
}

async function pushBuildInfoToDatabase(buildInfo) {
    let authToken = null;
    let writerIdentity = buildBotEmail;
    let writerUid = buildBotUid;

    try {
        const { idToken, localId, email } = await getIdTokenWithPassword(buildBotEmail);
        authToken = idToken;
        writerIdentity = email || writerIdentity;
        writerUid = localId || writerUid;

        const normalizedBase = databaseURL.endsWith('/') ? databaseURL.slice(0, -1) : databaseURL;
        const url = new URL(`${normalizedBase}/${buildInfoPath}.json`);
        url.searchParams.set('auth', authToken);

        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...buildInfo,
                lastUpdatedAt: new Date().toISOString(),
                lastUpdatedBy: writerIdentity,
                writerUid
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} - ${errorText}`);
        }

        console.log(`[bump-build] Build info stored in Realtime Database (build #${buildInfo.buildNumber}).`);
    } catch (error) {
        console.warn('[bump-build] Failed to push build info to Realtime Database.', error);
    }
}

async function getIdTokenWithPassword(email) {
    const password = derivePasswordFromEmail(email);

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Password sign-in failed: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { idToken: data.idToken, localId: data.localId, email: data.email };
}

function derivePasswordFromEmail(email) {
    return email.split('@')[0];
}

async function bump() {
    const current = loadBuildInfo();
    const nextNumber = Number.isFinite(current.buildNumber) ? current.buildNumber + 1 : 1;
    const next = {
        ...current,
        buildNumber: nextNumber,
        builtAt: new Date().toISOString(),
    };

    saveBuildInfo(next);
    console.log(`[bump-build] Build number updated to ${next.buildNumber}`);
    await pushBuildInfoToDatabase(next);
}

bump().catch((error) => {
    console.error('[bump-build] Fatal error while bumping build number.', error);
    process.exitCode = 1;
});

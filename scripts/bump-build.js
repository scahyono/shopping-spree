import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'buildInfo.json');
const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://shopping-spree-94c4d-default-rtdb.europe-west1.firebasedatabase.app';
const buildInfoPath = 'family/shared/buildInfo';

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

function loadServiceAccount() {
    const inlineCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inlineCredentials) {
        try {
            return JSON.parse(inlineCredentials);
        } catch (error) {
            console.warn('[bump-build] Failed to parse FIREBASE_SERVICE_ACCOUNT.');
        }
    }

    const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (credentialPath) {
        try {
            const resolvedPath = path.isAbsolute(credentialPath)
                ? credentialPath
                : path.join(process.cwd(), credentialPath);
            const raw = fs.readFileSync(resolvedPath, 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            console.warn('[bump-build] Failed to read FIREBASE_SERVICE_ACCOUNT_PATH.', error);
        }
    }

    return null;
}

async function pushBuildInfoToDatabase(buildInfo) {
    const credentials = loadServiceAccount();
    let authToken = process.env.FIREBASE_DATABASE_AUTH || null;

    try {
        if (!authToken && credentials) {
            authToken = await getAccessTokenFromServiceAccount(credentials);
        }

        if (!authToken) {
            console.warn('[bump-build] No database auth token available; skipping database buildInfo update.');
            return;
        }

        const normalizedBase = databaseURL.endsWith('/') ? databaseURL.slice(0, -1) : databaseURL;
        const url = new URL(`${normalizedBase}/${buildInfoPath}.json`);
        url.searchParams.set('auth', authToken);

        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...buildInfo,
                lastUpdatedAt: new Date().toISOString(),
                lastUpdatedBy: 'build-script'
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

async function getAccessTokenFromServiceAccount(credentials) {
    if (!credentials?.client_email || !credentials?.private_key) {
        console.warn('[bump-build] Service account missing client_email or private_key.');
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    };

    const base64url = (input) => Buffer.from(JSON.stringify(input)).toString('base64url');
    const token = `${base64url(header)}.${base64url(payload)}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(token);
    const signature = signer.sign(credentials.private_key, 'base64url');

    const assertion = `${token}.${signature}`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
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

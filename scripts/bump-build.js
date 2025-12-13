import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'buildInfo.json');

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

function bump() {
    const current = loadBuildInfo();
    const nextNumber = Number.isFinite(current.buildNumber) ? current.buildNumber + 1 : 1;
    const next = {
        ...current,
        buildNumber: nextNumber,
        builtAt: new Date().toISOString(),
    };

    saveBuildInfo(next);
    console.log(`[bump-build] Build number updated to ${next.buildNumber}`);
}

try {
    bump();
} catch (error) {
    console.error('[bump-build] Fatal error while bumping build number.', error);
    process.exitCode = 1;
}

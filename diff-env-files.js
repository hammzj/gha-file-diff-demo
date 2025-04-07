const path = require('path');
const dotenvenc = require('@tka85/dotenvenc');
const core = require('@actions/core');

const getKeyDifferences = (base, current) => {
    const baseKeys = Object.keys(base);
    const currentKeys = Object.keys(current);
    const diffs = [];
    for (const baseKey of baseKeys) {
        if (!currentKeys.includes(baseKey)) diffs.push(baseKey);
    }
    return diffs;
};

const removed = (base, current) => {
    return getKeyDifferences(base, current);
};

const added = (base, current) => {
    return getKeyDifferences(current, base);
};

const modified = (base, current) => {
    const baseKeys = Object.keys(base);
    const currentKeys = Object.keys(current);
    const diffs = [];
    for (const baseKey of baseKeys) {
        if (currentKeys.includes(baseKey)) {
            if (JSON.stringify(base[baseKey]) !== JSON.stringify(current[baseKey])) {
                diffs.push(baseKey);
            }
        }
    }
    return diffs;
};

function performDiff(baseBranchFile, currentBranchFile) {
    return {
        Added: added(baseBranchFile, currentBranchFile),
        Removed: removed(baseBranchFile, currentBranchFile),
        Modified: modified(baseBranchFile, currentBranchFile),
    };
}

/**
 * Writes the diffs of each key in a readable GitHub Markdown Format
 * @example Changes for each diff type
 * ## Added
 * - MY_API_KEY
 * - CUSTOMER_KEY
 * ## Removed
 * - MY_PASSWORD
 * ## Modified
 * - MY_API_URL
 *
 * @example Changes for additions only
 * ## Added
 * - MY_API_KEY
 * - CUSTOMER_KEY
 */
const getAsMarkdown = (diffs) => {
    const createList = (items) => {
        return items.map((i) => `- ${i}`).join('\n');
    };

    return Object.entries(diffs)
        .map(([key, vals]) => {
            //Only build if there are values for the key.
            if (vals.length > 0) {
                return [`## ${key}`, createList([vals].flat()), '\n'].join('\n');
            }
        })
        .join('')
        .trim();
};

async function main() {
    //base-ref (target branch) file
    const baseBranchFile = await dotenvenc.decrypt({encryptedFile: path.resolve(process.env.BASE_ENV_ENC_FILE_PATH)})
    //head-ref (source branch) file
    const currentBranchFile = await dotenvenc.decrypt({encryptedFile: path.resolve(process.env.CURRENT_ENV_ENC_FILE_PATH)})

    //Get diffs
    const diffs = performDiff(baseBranchFile, currentBranchFile);
    const hasDiffs = Object.values(diffs).some((d) => d.length > 0);

    //Add outputs to GitHub Actions workflow
    const message = hasDiffs ?
        getAsMarkdown(diffs) :
        'No differences exist between the files.'
    core.setOutput('diffs', diffs);
    core.setOutput('message', message);
}

main();

const {readFileSync} = require('fs');
const path = require('path');
const dotenv = require('dotenv');
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

function main() {
    const BASE_ENV_ENC_FILE_PATH = path.resolve(process.env.BASE_ENV_ENC_FILE_PATH);
    const CURRENT_ENV_ENC_FILE_PATH = path.resolve(process.env.CURRENT_ENV_ENC_FILE_PATH)

    //base-ref (target branch) file
    const baseBranchFile = dotenvenc.decrypt(BASE_ENV_ENC_FILE_PATH)
    //head-ref (source branch) file
    const currentBranchFile =  dotenvenc.decrypt(CURRENT_ENV_ENC_FILE_PATH)

    const diffs = performDiff(baseBranchFile, currentBranchFile);
    console.debug('diffs',diffs)
    const hasDiffs = Object.values(diffs).some((d) => d.length > 0);

    const message = hasDiffs ?
        getAsMarkdown(diffs) :
        'No differences exist between the files.'

    //Add output to GitHub Actions workflow
    core.setOutput('message', message);
}

main();

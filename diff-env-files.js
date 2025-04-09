const path = require('path');
const dotenvenc = require('@tka85/dotenvenc');
const core = require('@actions/core');

const hideKeys = (diffs) => {
    let sensitiveKeysChanged = 0
    //@example: DB_PASSWORD,SECRET_TOKEN
    const SENSITIVE_KEYS = `${process.env.DOTENV_SENSITIVE_KEYS}`.split(',')

    Object.entries(diffs).map(([section, keys]) => {
        keys.map(k => {
            if (SENSITIVE_KEYS.includes(k)) {
                sensitiveKeysChanged++;
                const keyIndex = diffs[section].indexOf(k)
                diffs[section].splice(keyIndex, 1)
            }
        })
        if (diffs[section].length === 0) delete diffs[section]
    })

    if (sensitiveKeysChanged > 0) {
        diffs['Other sensitive keys changed'] = [`${sensitiveKeysChanged} key(s)`]
    }
    return diffs;
}

function performDiff(baseBranchFile, currentBranchFile) {
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
function getAsMarkdown(diffs) {
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

/**
 * When run, it will decrypted two `.env` files, a base and current,
 *  perform a diff against them, and list keys from the current file that has Added, Removed, or Modified keys compared to the base file.
 * It then supplies two outputs to the GitHub Actions:2
 * * `diffs`: the JSON diffs
 * * `message`: A Markdown-formatted message to use for posting comments on Git issues and pull requests.
 *
 * Environment variables:
 * * `BASE_DOTENVENC_FILE_PATH`: path to the base (target) branch encrypted `.env` file
 * * `CURRENT_DOTENVENC_FILE_PATH`: path to the current (source/head) branch encrypted `.env` file
 * * `DOTENVENC_PASS`: the password used to encrypt and decrypt the files
 * * `DOTENV_SENSITIVE_KEYS`: (optional) a comma-delimited list of keys to hide in the output
 *
 * @see dotenvenc
 * @returns {Promise<void>}
 */
async function main() {
    //base-ref (target branch) file
    const baseBranchFile = await dotenvenc.decrypt({encryptedFile: path.resolve(process.env.BASE_DOTENVENC_FILE_PATH)})
    //head-ref (source branch) file
    const currentBranchFile = await dotenvenc.decrypt({encryptedFile: path.resolve(process.env.CURRENT_DOTENVENC_FILE_PATH)})

    //Get diffs and hide any sensitive keys
    const diffs = hideKeys(performDiff(baseBranchFile, currentBranchFile));
    const hasDiffs = Object.values(diffs).some((d) => d.length > 0);
    //Add outputs to GitHub Actions workflow
    const message = hasDiffs ?
        getAsMarkdown(diffs) :
        'No differences exist between the files.'
    core.setOutput('diffs', diffs);
    core.setOutput('message', message);
}

main();

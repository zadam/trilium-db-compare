"use strict";

require('colors');
const jsdiff = require('diff');
const sqlite = require('sqlite');
const sql = require('./sql');

function printDiff(one, two) {
    const diff = jsdiff.diffChars(one, two);

    diff.forEach(function(part){
        // green for additions, red for deletions
        // grey for common parts
        const color = part.added ? 'green' :
            part.removed ? 'red' : 'grey';
        process.stderr.write(part.value[color]);
    });
}

function checkMissing(table, name, ids1, ids2) {
    const missing = ids1.filter(item => ids2.indexOf(item) < 0);

    if (missing.length > 0) {
        console.log("Missing IDs from " + name + " table " + table + ": ", missing);
    }
}

function compareRows(table, rsLeft, rsRight, column) {
    const leftIds = Object.keys(rsLeft);
    const rightIds = Object.keys(rsRight);

    checkMissing(table, "right", leftIds, rightIds);
    checkMissing(table, "left", rightIds, leftIds);

    const commonIds = leftIds.filter(item => rightIds.includes(item));

    for (const id of commonIds) {
        const left = JSON.stringify(rsLeft[id], null, 2);
        const right = JSON.stringify(rsRight[id], null, 2);

        if (left !== right) {
            console.log("Table " + table + " row with " + column + "=" + id + " differs:");
            console.log("Left: ", left);
            console.log("Right: ", right);
            printDiff(left, right);
        }
    }
}

async function main() {
    const dbLeftPath = process.argv[2];
    const dbRightPath = process.argv[3];

    const dbLeft = await sqlite.open(dbLeftPath, { Promise });
    const dbRight = await sqlite.open(dbRightPath, { Promise });

    async function compare(table, column, query) {
        const rsLeft = await sql.getIndexed(dbLeft, column, query);
        const rsRight = await sql.getIndexed(dbRight, column, query);

        compareRows(table, rsLeft, rsRight, column);
    }

    await compare("notes_tree", "note_tree_id", "SELECT note_tree_id, note_id, note_pid, note_pos, date_modified, is_deleted, prefix FROM notes_tree");
    await compare("notes", "note_id", "SELECT note_id, note_title, note_text, date_modified, is_protected, is_deleted FROM notes");
    await compare("notes_history", "note_history_id", "SELECT note_history_id, note_id, note_title, note_text, date_modified_from, date_modified_to, is_protected FROM notes_history");
    await compare("recent_notes", "note_tree_id", "SELECT note_tree_id, note_path, date_accessed, is_deleted FROM recent_notes");
    await compare("options", "opt_name", "SELECT opt_name, opt_value FROM options " +
 "WHERE opt_name IN ('username', 'password_verification_hash', 'encrypted_data_key', 'protected_session_timeout', 'history_snapshot_time_interval')");
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
    }
})();
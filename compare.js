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

    await compare("note_tree", "noteTreeId", "SELECT noteTreeId, noteId, parentNoteId, notePosition, dateModified, isDeleted, prefix FROM note_tree");
    await compare("notes", "noteId", "SELECT noteId, title, content, dateModified, isProtected, isDeleted FROM notes");
    await compare("note_history", "noteHistoryId", "SELECT noteRevisionId, noteId, title, content, dateModifiedFrom, dateModifiedTo, isProtected FROM note_revisions");
    await compare("recent_notes", "noteTreeId", "SELECT noteTreeId, notePath, dateAccessed, isDeleted FROM recent_notes");
    await compare("options", "name", `SELECT name, value FROM options WHERE isSynced = 1`);
    await compare("attributes", "attributeId", "SELECT attributeId, noteId, name, value, dateCreated, dateModified FROM attributes");
    await compare("api_tokens", "apiTokenId", "SELECT apiTokenId, token, dateCreated, isDeleted FROM api_tokens");
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
    }
})();
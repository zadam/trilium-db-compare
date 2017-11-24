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

function compareRows(rs1, rs2) {
    const len = Math.max(rs1.length, rs2.length);

    for (let i = 0; i < len; i++) {
        const r1 = JSON.stringify(rs1[i], null, 2);
        const r2 = JSON.stringify(rs2[i], null, 2);

        if (r1 !== r2) {
            console.log("Row #" + i + " differs:");
            console.log("First: ", r1);
            console.log("Second: ", r2);
            printDiff(r1, r2);
            process.exit(1);
        }
    }
}

async function main() {
    const db1Path = process.argv[2];
    const db2Path = process.argv[3];

    const db1 = await sqlite.open(db1Path, { Promise });
    const db2 = await sqlite.open(db2Path, { Promise });

    async function compare(query) {
        const rs1 = await sql.getResults(db1, query);
        const rs2 = await sql.getResults(db2, query);

        compareRows(rs1, rs2);
    }

    await compare("SELECT note_id, note_title, note_text, date_modified, is_protected, is_deleted FROM notes ORDER BY note_id");
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e);
    }
})();
"use strict";

async function getSingleResult(db, query, params = []) {
    return await wrap(db, async db => db.get(query, ...params));
}

async function getSingleResultOrNull(db, query, params = []) {
    const all = await wrap(db, async db => db.all(query, ...params));

    return all.length > 0 ? all[0] : null;
}

async function getSingleValue(db, query, params = []) {
    const row = await getSingleResultOrNull(db, query, params);

    if (!row) {
        return null;
    }

    return row[Object.keys(row)[0]];
}

async function getResults(db, query, params = []) {
    return await wrap(db, async db => db.all(query, ...params));
}

async function getIndexed(db, column, query, params = []) {
    const results = await getResults(db, query, params);

    const map = {};

    for (const row of results) {
        map[row[column]] = row;
    }

    return map;
}

async function getMap(db, query, params = []) {
    const map = {};
    const results = await getResults(db, query, params);

    for (const row of results) {
        const keys = Object.keys(row);

        map[row[keys[0]]] = row[keys[1]];
    }

    return map;
}

async function getFlattenedResults(db, key, query, params = []) {
    const list = [];
    const result = await getResults(db, query, params);

    for (const row of result) {
        list.push(row[key]);
    }

    return list;
}

async function execute(db, query, params = []) {
    return await wrap(db, async db => db.run(query, ...params));
}

async function wrap(db, func) {
    const thisError = new Error();

    try {
        return await func(db);
    }
    catch (e) {
        console.error("Error executing query. Inner exception: " + e.stack + thisError.stack);

        throw thisError;
    }
}

module.exports = {
    getSingleValue,
    getSingleResult,
    getSingleResultOrNull,
    getResults,
    getIndexed,
    getMap,
    getFlattenedResults,
    execute
};
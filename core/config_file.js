'use strict';
const fs = require('fs');

module.exports = (filename) => {
    let data;
    try {
        data = fs.readFileSync(filename);
    } catch (err) {
        console.error(`Unable to load config file, can't access ${filename}`, err);
        process.exit(1);
        return;
    }

    let config;
    try {
        config = JSON.parse(data);
    } catch (err) {
        console.error(`Unable to load config file, invalid ${filename}`, err);
        process.exit(1);
        return;
    }

    return config;
};
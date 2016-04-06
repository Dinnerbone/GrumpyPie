'use strict';
const core = require('./core');
const config_file = require('./core/config_file');

config_file('config.json')
    .then((config) => {
        core(config);
    })
    .catch((error) => {
        console.error("Couldn't load config.json", error);
        process.exit(1);
    });
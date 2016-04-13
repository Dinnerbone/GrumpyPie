'use strict';
const core = require('./core');
const config_file = require('./core/config_file');

config_file('configs/bot.json')
    .then((config) => {
        if (!config.exists) throw 'Please read the instructions in README.md';
        core(config);
    })
    .catch((error) => {
        console.error("Couldn't load bot.json :(", error);
        process.exit(1);
    });
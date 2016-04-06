'use strict';
const irc = require('irc');
const command_dispatcher = require('./commands');

module.exports = (config) => {
    const bot = {};
    bot.client = new irc.Client(config.data.irc.server, config.data.irc.nickname, config.data.irc);
    bot.plugins = {};
    bot.commands = command_dispatcher(bot);

    bot.loadPlugin = (name) => {
        const safename = name.replace(/[^a-z_]/g, '');
        return new Promise((resolve, reject) => {
            if (typeof bot.plugins[safename] !== 'undefined') {
                return reject(new Error(`Plugin ${safename} is already loaded.`));
            }
            try {
                console.log(`Loaded plugin ${safename}`);
                const plugin = require(`../plugins/${safename}`)(bot);
                if (typeof plugin.commands !== 'undefined') {
                    bot.commands.addCommands(plugin, plugin.commands);
                }
                bot.plugins[safename] = plugin;
                return resolve();
            } catch (err) {
                console.error(`Can't load plugin ${safename}`, err);
                return reject(err);
            }
        });
    };

    bot.notify = (nick, message) => {
        bot.client.notice(nick, message);
    };

    bot.client.addListener('message', (nick, channel, message) => {
        if (message.startsWith(config.data.commandPrefix)) {
            bot.commands.runCommand(nick, channel, message.slice(config.data.commandPrefix.length));
        }
    });

    bot.loadPlugin('admin');
    return bot;
};

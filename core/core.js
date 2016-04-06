'use strict';
const irc = require('irc');
const command_dispatcher = require('./commands');
const user_manager = require('./users');
const permission_list = require('./permissions');

module.exports = (config) => {
    const bot = {};
    bot.client = new irc.Client(config.data.irc.server, config.data.irc.nickname, config.data.irc);
    bot.plugins = {};
    bot.commands = command_dispatcher(bot);
    bot.permissions = permission_list(bot, config);
    bot.users = user_manager(bot);

    bot.loadPlugin = (name) => {
        const safename = name.replace(/[^a-z_]/g, '');
        return new Promise((resolve, reject) => {
            if (typeof bot.plugins[safename] !== 'undefined') {
                return reject(new Error(`Plugin ${safename} is already loaded.`));
            }
            try {
                console.log(`Loaded plugin ${safename}`);
                if (typeof config.data.plugins === 'undefined') {
                    config.data.plugins = {};
                }
                if (typeof config.data.plugins[safename] === 'undefined') {
                    config.data.plugins[safename] = {};
                }
                const pluginConfig = {
                    data: config.data.plugins[safename],
                    load: config.load,
                    save: config.save
                };
                const plugin = require(`../plugins/${safename}`)(bot, pluginConfig);
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
        bot.users.saveChat(channel, nick, message);
        if (message.startsWith(config.data.commandPrefix)) {
            bot.commands.runCommand(nick, channel, message.slice(config.data.commandPrefix.length));
        }
    });

    // List of names, emitted on joining a channel
    bot.client.addListener('names', (channel, names) => {
        bot.users.parseUsersChannel(channel, names);
    });

    bot.client.addListener('join', (channel, nick, message) => {
        bot.users.joined(nick, channel, Date.now());
    });

    bot.client.addListener('part', (channel, nick, reason, message) => {
        bot.users.leave(nick, channel);
    });

    bot.client.addListener('quit', (nick, reason, channels, message) => {
       bot.users.quit(nick);
    });

    bot.client.addListener('nick', (oldNick, newNick, channels, message) => {
        bot.users.renamed(oldNick, newNick);
    });

    bot.loadPlugin('admin');
    return bot;
};

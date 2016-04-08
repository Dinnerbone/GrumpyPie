'use strict';
const irc = require('irc');
const command_dispatcher = require('./commands');
const user_manager = require('./users');
const permission_list = require('./permissions');

let modeWatch = {op: {}, deop: {}, voice: {}, devoice: {}};

module.exports = (config) => {
    const bot = {};
    bot.client = new irc.Client(config.data.irc.server, config.data.irc.nickname, config.data.irc);
    bot.plugins = {};
    bot.permissions = permission_list(bot, config);
    bot.commands = command_dispatcher(bot);
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

    bot.giveOp = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `OP ${channel} ${nick}`);
            modeWatch.op[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.op[nick]}, 10000);
        });
    };
    bot.takeOp = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `DEOP ${channel} ${nick}`);
            modeWatch.deop[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.deop[nick]}, 10000);
        });
    };
    bot.giveVoice = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `VOICE ${channel} ${nick}`);
            modeWatch.voice[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.voice[nick]}, 10000);
        });
    };
    bot.takeVoice = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `DEVOICE ${channel} ${nick}`);
            modeWatch.devoice[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.devoice[nick]}, 10000);
        });
    };

    bot.client.addListener('message', (nick, channel, message) => {
        bot.users.events.saveChat(channel, nick, message);
        if (message.startsWith(config.data.commandPrefix)) {
            bot.commands.runCommand(nick, channel, message.slice(config.data.commandPrefix.length));
        }
    });

    // List of names, emitted on joining a channel
    bot.client.addListener('names', (channel, names) => {
        bot.users.events.parseUsersChannel(channel, names);
    });

    bot.client.addListener('join', (channel, nick, message) => {
        bot.users.events.joined(nick, channel, Date.now());
    });

    bot.client.addListener('part', (channel, nick, reason, message) => {
        bot.users.events.leave(nick, channel);
    });

    bot.client.addListener('quit', (nick, reason, channels, message) => {
        bot.users.events.quit(nick);
    });

    bot.client.addListener('nick', (oldNick, newNick, channels, message) => {
        bot.users.events.renamed(oldNick, newNick);
    });

    bot.client.addListener('+mode', (channel, by, mode, arg, message) => {
        let dict = {o: 'op', v: 'voice'};
        if(dict[mode] && modeWatch[dict[mode]][arg]){
            modeWatch[dict[mode]][arg].resolve();
            delete modeWatch[dict[mode]][arg];
        }
    });

    bot.client.addListener('-mode', (channel, by, mode, arg, message) => {
        let dict = {o: 'deop', v: 'devoice'};
        if(dict[mode] && modeWatch[dict[mode]][arg]){
            modeWatch[dict[mode]][arg].resolve();
            delete modeWatch[dict[mode]][arg];
        }
    });

    bot.loadPlugin('admin');
    return bot;
};

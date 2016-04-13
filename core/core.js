'use strict';
const irc = require('irc');
const command_dispatcher = require('./commands');
const user_manager = require('./users');
const permission_list = require('./permissions');
const config_file = require('./config_file');

let modeWatch = {op: {}, deop: {}, voice: {}, devoice: {}, quiet: {}, unquiet: {}, ban: {}, unban: {}};

module.exports = (config) => {
    const bot = {};
    bot.client = new irc.Client(config.data.irc.server, config.data.irc.nickname, config.data.irc);
    bot.plugins = {};
    bot.permissions = permission_list(bot, config);
    bot.commands = command_dispatcher(bot);
    bot.users = user_manager(bot);

    bot.loadPlugin = (name) => {
        const safename = name.replace(/[^a-z_]/g, '');
        return config_file(`configs/plugin_${safename}.json`)
            .then((pluginConfig) => {
                if (typeof bot.plugins[safename] !== 'undefined') {
                    throw `Plugin ${safename} is already loaded.`;
                }
                try {
                    console.log(`Loaded plugin ${safename}`);
                    if (typeof config.data.plugins === 'undefined') {
                        config.data.plugins = [];
                    }
                    if (config.data.plugins.indexOf(safename) === -1) {
                        config.data.plugins.push(safename);
                        config.save();
                    }
                    const plugin = require(`../plugins/${safename}`)(bot, pluginConfig);
                    if (typeof plugin.commands !== 'undefined') {
                        bot.commands.addCommands(plugin, plugin.commands);
                    }
                    if (typeof plugin.listeners !== 'undefined') {
                        for (const event in plugin.listeners) {
                            bot.client.addListener(event, plugin.listeners[event]);
                        }
                    }
                    bot.plugins[safename] = plugin;
                } catch (err) {
                    console.error(`Can't load plugin ${safename}`, err);
                    throw err;
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
            setTimeout(() => {reject('Request timed out'); delete modeWatch.op[nick];}, 10000);
        });
    };
    bot.takeOp = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `DEOP ${channel} ${nick}`);
            modeWatch.deop[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.deop[nick];}, 10000);
        });
    };
    bot.giveVoice = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `VOICE ${channel} ${nick}`);
            modeWatch.voice[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.voice[nick];}, 10000);
        });
    };
    bot.takeVoice = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `DEVOICE ${channel} ${nick}`);
            modeWatch.devoice[nick] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.devoice[nick];}, 10000);
        });
    };
    bot.giveQuiet = (mask, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `QUIET ${channel} ${mask}`);
            modeWatch.quiet[mask] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.quiet[mask];}, 10000);
        });
    };
    bot.takeQuiet = (mask, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.say('chanserv', `UNQUIET ${channel} ${mask}`);
            modeWatch.unquiet[mask] = {resolve: resolve, reject: reject};
            setTimeout(() => {reject('Request timed out'); delete modeWatch.unquiet[mask];}, 10000);
        });
    };
    bot.giveBan = (mask, channel) => {
        return new Promise((resolve, reject) => {
            bot.giveOp(bot.client.nick, channel)
                .then(() => {
                    bot.client.send('mode', channel, '+b', mask);
                    modeWatch.ban[mask] = {resolve: resolve, reject: reject};
                    setTimeout(() => {reject('Request timed out'); delete modeWatch.ban[mask];}, 10000);
                })
                .then(() => bot.takeOp(bot.client.nick, channel))
                .catch((error) => reject(error));
        });
    };
    bot.takeBan = (mask, channel) => {
        return new Promise((resolve, reject) => {
            bot.giveOp(bot.client.nick, channel)
                .then(() => {
                    bot.client.send('mode', channel, '-b', mask);
                    modeWatch.unban[mask] = {resolve: resolve, reject: reject};
                    setTimeout(() => {reject('Request timed out'); delete modeWatch.unban[mask];}, 10000);
                })
                .then(() => bot.takeOp(bot.client.nick, channel))
                .catch((error) => reject(error));
        });
    };
    bot.kick = (nick, channel) => {
        return new Promise((resolve, reject) => {
            bot.client.send('KICK', channel, nick);
            resolve();
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

    bot.client.addListener('kick', (channel, nick, by, reason, message) => {
       bot.users.events.kick(nick, channel);
    });

    bot.client.addListener('quit', (nick, reason, channels, message) => {
        bot.users.events.quit(nick);
    });

    bot.client.addListener('nick', (oldNick, newNick, channels, message) => {
        bot.users.events.renamed(oldNick, newNick);
    });

    bot.client.addListener('+mode', (channel, by, mode, arg, message) => {
        let dict = {o: 'op', v: 'voice', q: 'quiet', b: 'ban'};
        if(dict[mode] && modeWatch[dict[mode]][arg]){
            modeWatch[dict[mode]][arg].resolve();
            delete modeWatch[dict[mode]][arg];
        }
    });

    bot.client.addListener('-mode', (channel, by, mode, arg, message) => {
        let dict = {o: 'deop', v: 'devoice', q: 'unquiet', b: 'unban'};
        if(dict[mode] && modeWatch[dict[mode]][arg]){
            modeWatch[dict[mode]][arg].resolve();
            delete modeWatch[dict[mode]][arg];
        }
    });

    bot.loadPlugin('admin');

    if (typeof config.data.plugins !== 'undefined') {
        bot.client.once('registered', () => {
            for (const i in config.data.plugins) {
                bot.loadPlugin(config.data.plugins[i]);
            }
        });
    }

    return bot;
};

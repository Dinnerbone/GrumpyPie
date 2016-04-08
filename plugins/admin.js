'use strict';

module.exports = (bot, config) => {
    return {
        commands: {
            load: [
                [/^([a-z_]+)$/, (nick, channel, plugin) => {
                    bot.loadPlugin(plugin)
                        .then(() => {
                            bot.notify(nick, `Plugin ${plugin} has been successfully loaded.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Plugin ${plugin} could not be loaded: ${error}`);
                        });
                }],
                'Usage: load PLUGIN_NAME'
            ],
            admins: [
                [/^add (\S+)$/, (nick, channel, user) => {
                    if (bot.permissions.isAdmin(user)) {
                        return bot.notify(nick, `User ${user} is already an administrator.`);
                    }
                    bot.permissions.setAdmin(user, true)
                        .then(() => {
                            bot.notify(nick, `User ${user} is now an administrator.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not save permissions: ${error}`);
                        });
                }],
                [/^remove (\S+)$/, (nick, channel, user) => {
                    if (!bot.permissions.isAdmin(user)) {
                        return bot.notify(nick, `User ${user} is not an administrator.`);
                    }
                    bot.permissions.setAdmin(user, false)
                        .then(() => {
                            bot.notify(nick, `User ${user} is no longer an administrator.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not save permissions: ${error}`);
                        });
                }],
                'Usage: admins <add|remove> USER_NAME'
            ],
            op: [
                [/^(\S+)$/, (nick, channel, user) => {
                    if (!bot.permissions.isAdmin(nick, channel)) {
                        return bot.notify(nick, `User ${user} is not an operator.`);
                    }
                    bot.giveOp(user, channel)
                        .then(() => {
                            bot.notify(nick, `User ${user} was opped.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not op user: ${error}`)
                        });
                }],
                'Usage: op USER_NAME'
            ],
            deop: [
                [/^(\S+)$/, (nick, channel, user) => {
                    if (!bot.permissions.isAdmin(nick, channel)) {
                        return bot.notify(nick, `User ${user} is not an operator.`);
                    }
                    bot.takeOp(user, channel)
                        .then(() => {
                            bot.notify(nick, `User ${user} was deopped.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not deop user: ${error}`)
                        });
                }],
                'Usage: deop USER_NAME'
            ],
            voice: [
                [/^(\S+)$/, (nick, channel, user) => {
                    if (!bot.permissions.isAdmin(nick, channel)) {
                        return bot.notify(nick, `User ${user} is not an operator.`);
                    }
                    bot.giveVoice(user, channel)
                        .then(() => {
                            bot.notify(nick, `User ${user} was voiced.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not voice user: ${error}`)
                        });
                }],
                'Usage: voice USER_NAME'
            ],
            devoice: [
                [/^(\S+)$/, (nick, channel, user) => {
                    if (!bot.permissions.isAdmin(nick, channel)) {
                        return bot.notify(nick, `User ${user} is not an operator.`);
                    }
                    bot.takeVoice(user, channel)
                        .then(() => {
                            bot.notify(nick, `User ${user} was devoiced.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Could not devoice user: ${error}`)
                        });
                }],
                'Usage: devoice USER_NAME'
            ]
        }
    };
};
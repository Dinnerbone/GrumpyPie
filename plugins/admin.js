'use strict';

module.exports = (bot, config) => {
    return {
        commands: {
            load: [
                {
                    pattern: /^([a-z_]+)$/,
                    requires: 'admin',
                    execute: (event, plugin) => {
                        bot.loadPlugin(plugin)
                            .then(() => {
                                bot.notify(event.nick, `Plugin ${plugin} has been successfully loaded.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Plugin ${plugin} could not be loaded: ${error}`);
                            });
                    }
                },
                'Usage: load PLUGIN_NAME'
            ],
            admins: [
                {
                    pattern: /^add (\S+)$/,
                    requires: 'admin',
                    execute: (event, user) => {
                        if (bot.permissions.isAdmin(user)) {
                            return bot.notify(event.nick, `User ${user} is already an administrator.`);
                        }
                        bot.permissions.setAdmin(user, true)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} is now an administrator.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not save permissions: ${error}`);
                            });
                    }
                },
                {
                    pattern: /^remove (\S+)$/,
                    requires: 'admin',
                    execute: (event, user) => {
                        if (!bot.permissions.isAdmin(user)) {
                            return bot.notify(event.nick, `User ${user} is not an administrator.`);
                        }
                        bot.permissions.setAdmin(user, false)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} is no longer an administrator.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not save permissions: ${error}`);
                            });
                    }
                },
                'Usage: admins <add|remove> USER_NAME'
            ],
            op: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        bot.giveOp(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was opped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not op user: ${error}`);
                            });
                        }
                },
                'Usage: op USER_NAME'
            ],
            deop: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        bot.takeOp(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was deopped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not deop user: ${error}`);
                            });
                        }
                },
                'Usage: deop USER_NAME'
            ],
            voice: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        bot.giveVoice(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was voiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not voice user: ${error}`);
                            });
                        }
                },
                'Usage: voice USER_NAME'
            ],
            devoice: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        bot.takeVoice(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was devoiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not devoice user: ${error}`);
                            });
                        }
                },
                'Usage: devoice USER_NAME'
            ]
        }
    };
};
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
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                const user = whois.user;
                                if (user === null) {
                                    return bot.notify(event.nick, `${target} is not authed, cannot make them an administrator.`);
                                }
                                if (bot.permissions.isAdmin(user)) {
                                    return bot.notify(event.nick, `${target} (${user}) is already an administrator.`);
                                }
                                bot.permissions.setAdmin(user, true)
                                    .then(() => {
                                        bot.notify(event.nick, `${target} (${user}) is now an administrator.`);
                                    })
                                    .catch((error) => {
                                        bot.notify(event.nick, `Could not save permissions. ${error}`);
                                    });
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not make ${target} an administrator. ${error}`);
                            });
                    }
                },
                {
                    pattern: /^remove (\S+)$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                const user = whois.user;
                                if (user === null) {
                                    return bot.notify(event.nick, `${target} is not authed, cannot make them an administrator.`);
                                }
                                if (!bot.permissions.isAdmin(user)) {
                                    return bot.notify(event.nick, `${target} (${user}) is not an administrator.`);
                                }
                                bot.permissions.setAdmin(user, false)
                                    .then(() => {
                                        bot.notify(event.nick, `${target} (${user}) is no longer an administrator.`);
                                    })
                                    .catch((error) => {
                                        bot.notify(event.nick, `Could not save permissions. ${error}`);
                                    });
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not remove ${target} as an administrator. ${error}`);
                            });
                    }
                },
                'Usage: admins <add|remove> USER_NAME',
            ],
            channel: [
                {
                    pattern: /^ops add (\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                const user = whois.user;
                                if (user === null) {
                                    return bot.notify(event.nick, `${target} is not authed, cannot make them an operator of ${event.channel}.`);
                                }
                                if (bot.permissions.isOperator(user, event.channel)) {
                                    return bot.notify(event.nick, `${target} (${user}) is already an operator of ${event.channel}.`);
                                }
                                bot.permissions.setOperator(user, event.channel, true)
                                    .then(() => {
                                        bot.notify(event.nick, `${target} (${user}) is now an operator of ${event.channel}.`);
                                    })
                                    .catch((error) => {
                                        bot.notify(event.nick, `Could not save permissions. ${error}`);
                                    });
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not make ${target} an operator of ${event.channel}. ${error}`);
                            });
                    }
                },
                {
                    pattern: /^ops remove (\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                const user = whois.user;
                                if (user === null) {
                                    return bot.notify(event.nick, `${target} is not authed, cannot make them an operator of ${event.channel}.`);
                                }
                                if (!bot.permissions.isOperator(user, event.channel)) {
                                    return bot.notify(event.nick, `${target} (${user}) is not an operator of ${event.channel}.`);
                                }
                                bot.permissions.setOperator(user, event.channel, false)
                                    .then(() => {
                                        bot.notify(event.nick, `${target} (${user}) is no longer an operator of ${event.channel}.`);
                                    })
                                    .catch((error) => {
                                        bot.notify(event.nick, `Could not save permissions. ${error}`);
                                    });
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not remove ${target} as an operator of ${event.channel}. ${error}`);
                            });
                    }
                },
                'Usage: channel ops <add|remove> USER_NAME'
            ]
        }
    };
};
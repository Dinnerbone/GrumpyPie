'use strict';

module.exports = (bot, config) => {
    const getUser = (nick) => {
        return bot.users.get(nick)
            .then((whois) => {
                if (whois.user === null) {
                    throw `${nick} is not authed.`;
                }
                return whois.user;
            });
    };

    return {
        commands: {
            load: [
                {
                    pattern: /^([a-z_]+)$/,
                    requires: 'admin',
                    execute: (event, plugin) => {
                        return bot.loadPlugin(plugin)
                            .then(() => bot.notify(event.nick, `Plugin ${plugin} has been successfully loaded.`));
                    }
                },
                'Usage: load PLUGIN_NAME'
            ],
            admins: [
                {
                    pattern: /^add (\S+)$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        return getUser(target)
                            .then((user) => {
                                if (bot.permissions.isAdmin(user)) {
                                    throw `${target} (${user}) is already an administrator.`;
                                }
                                return Promise.all([user, bot.permissions.setAdmin(user, true)]);
                            })
                            .then((results) => {
                                const user = results[0];
                                bot.notify(event.nick, `${target} (${user}) is now an administrator.`);
                            });
                    }
                },
                {
                    pattern: /^remove (\S+)$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        return getUser(target)
                            .then((user) => {
                                if (!bot.permissions.isAdmin(user)) {
                                    throw `${target} (${user}) is not an administrator.`;
                                }
                                return Promise.all([user, bot.permissions.setAdmin(user, false)]);
                            })
                            .then((results) => {
                                const user = results[0];
                                bot.notify(event.nick, `${target} (${user}) is no longer an administrator.`);
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
                        return getUser(target)
                            .then((user) => {
                                if (bot.permissions.isOperator(user, event.channel)) {
                                    throw `${target} (${user}) is already an operator of ${event.channel}.`;
                                }
                                return Promise.all([user, bot.permissions.setOperator(user, event.channel, true)]);
                            })
                            .then((results) => {
                                const user = results[0];
                                bot.notify(event.nick, `${target} (${user}) is now an operator of ${event.channel}.`);
                            });
                    }
                },
                {
                    pattern: /^ops remove (\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return getUser(target)
                            .then((user) => {
                                if (!bot.permissions.isOperator(user, event.channel)) {
                                    throw `${target} (${user}) is not an operator of ${event.channel}.`;
                                }
                                return Promise.all([user, bot.permissions.setOperator(user, event.channel, false)]);
                            })
                            .then((results) => {
                                const user = results[0];
                                bot.notify(event.nick, `${target} (${user}) is no longer an operator of ${event.channel}.`);
                            });
                    }
                },
                'Usage: channel ops <add|remove> USER_NAME'
            ]
        }
    };
};
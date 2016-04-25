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
                    pattern: /^add ({{nickname}})$/,
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
                    pattern: /^remove ({{nickname}})$/,
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
                {
                    pattern: /^list$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        return bot.permissions.getAdmins()
                            .then((admins) => {
                                bot.notify(event.nick, `Admins: ${admins.join(', ')}`);
                            })
                    }
                },
                'Usage: admins <add|remove|list> USER_NAME'
            ],
            channel: [
                {
                    pattern: /^ops add ({{nickname}})$/,
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
                    pattern: /^ops remove ({{nickname}})$/,
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
                {
                    pattern: /^ops list$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.permissions.getOperators(event.channel)
                            .then((ops) => {
                                ops = (ops.length > 0) ? ops.join(', ') : 'No operators';
                                bot.notify(event.nick, `Operators in ${event.channel}: ${ops}.`);
                            })

                    }
                },
                {
                    pattern: /^ops list ({{channel}})$/,
                    requires: 'anybody',
                    execute: (event, target) => {
                        return getUser(event.nick)
                            .then((user) => {
                                if(!bot.permissions.isOperator(user, target) && !bot.permissions.isAdmin(user)){
                                    throw (`You are not an operator in ${target}.`);
                                }
                            })
                            .then(() => bot.permissions.getOperators(target))
                            .then((ops) => {
                                ops = (ops.length > 0) ? ops.join(', ') : 'No operators';
                                bot.notify(event.nick, `Operators in ${target}: ${ops}.`);
                            })

                    }
                },
                'Usage: channel ops <add|remove|list> (USER_NAME|CHANNEL)'
            ],
            join: [
                {
                    pattern: /^({{channel}})$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        console.log(target);
                        return bot.join(target)
                            .then(() => bot.notify(event.nick, `Joined ${target}.`));
                    }
                },
                'usage: join CHANNEL'
            ],
            part: [
                {
                    pattern: /^({{channel}})$/,
                    requires: 'admin',
                    execute: (event, target) => {
                        return bot.part(target)
                            .then(() => bot.notify(event.nick, `Left ${target}.`));
                    }
                },
                {
                    pattern: '',
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.part(event.channel)
                            .then(() => bot.notify(event.nick, `Left ${event.channel}.`));
                    }
                },
                'usage: part [CHANNEL]'
            ]
        }
    };
};
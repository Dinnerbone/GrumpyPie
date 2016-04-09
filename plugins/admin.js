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
            ]
        }
    };
};
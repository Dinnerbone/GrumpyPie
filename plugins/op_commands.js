'use strict';

module.exports = (bot, config) => {
    return {
        commands: {
            op: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        bot.giveOp(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was opped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not op user: ${error}`);
                            });
                    }
                },
                'Usage: op [USER_NAME]'
            ],
            deop: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        bot.takeOp(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was deopped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not deop user: ${error}`);
                            });
                    }
                },
                'Usage: deop [USER_NAME]'
            ],
            voice: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        bot.giveVoice(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was voiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not voice user: ${error}`);
                            });
                    }
                },
                'Usage: voice [USER_NAME]'
            ],
            devoice: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        bot.takeVoice(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was devoiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not devoice user: ${error}`);
                            });
                    }
                },
                'Usage: devoice [USER_NAME]'
            ],
            quiet: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        bot.giveQuiet(user, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `User ${user} was voiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not voice user: ${error}`);
                            });
                    }
                },
                'Usage: voice [USER_NAME]'
            ]
        }
    };
};
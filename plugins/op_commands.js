'use strict';

var moment = require('moment');

module.exports = (bot, config) => {
    if (typeof config.data.timers === 'undefined') {
        config.data.timers = [];
    }
    const timers = config.data.timers;
    const actions = {
        deop: bot.takeOp,
        devoice: bot.takeVoice,
        unquiet: bot.takeQuiet
    };

    function addTimer(time, action, target, channel) {
        let timer = {
            time: time,
            action: action,
            target: target,
            channel: channel
        };
        timers.push(timer);
        setTimeout(executeTimer, moment(time).diff(moment()), timer);
        config.save();
    }

    function removeTimer(timer) {
        let location = timers.indexOf(timer);
        timers.splice(location, 1);
        config.save();
    }

    function executeTimer(timer) {
        try {
            actions[timer.action](timer.target, timer.channel);
            removeTimer(timer);
        } catch (e) {
            setTimeout(executeTimer, 10 * 1000, timer);
        }

    }

    function parseTime(args) {
        args = args.split(' ');

        for (let i = 0; i < args.length; i++) {
            if ((/^\d+$/).test(args[i])) {
                let unit = 'seconds';
                if ((/^\w+$/).test(args[i + 1])) unit = moment.normalizeUnits(args[i + 1]) || unit;
                return moment().add(args[i], unit);

            } else if (/^\d+\w$/.test(args[i])) {
                let time = args[i].replace(/[^\d]/gi, '');
                let unit = args[i].replace(/[\d]/gi, '');
                return moment().add(time, moment.normalizeUnits(unit));
            }
        }
    }

    // Load timers on plugin load
    for (let timer of timers) {
        let time = moment(timer.time).diff(moment());
        time = Math.max(time, 15 * 1000); // Timeout to make sure the bot is connected.
        setTimeout(executeTimer, time, timer);
    }


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
                {
                    pattern: /^(\S*) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        const time = parseTime(event.args);
                        bot.giveOp(user, event.channel)
                            .then(() => {
                                addTimer(time, 'deop', user, event.channel);

                                bot.notify(event.nick, `User ${user} was opped for ${time.toNow(true)}.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not op user: ${error}`);
                            });
                    }
                },
                'Usage: op [USER_NAME] [TIME_STAMP]'
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
                {
                    pattern: /^(\S*) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, user) => {
                        if (user.length === 0) user = event.nick;
                        const time = parseTime(event.args);
                        bot.giveVoice(user, event.channel)
                            .then(() => {
                                addTimer(time, 'devoice', user, event.channel);

                                bot.notify(event.nick, `User ${user} was voiced for ${time.toNow(true)}.`);
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
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                return bot.giveQuiet(`*!*@${whois.host}`, event.channel);
                            })
                            .then(() => {
                                bot.notify(event.nick, `${target} has been quieted.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not quiet ${target}: ${error}`);
                            });
                    }
                },
                {
                    pattern: /^(\S*) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        const time = parseTime(event.args);
                        bot.users.get(target)
                            .then((whois) => {
                                addTimer(time, 'unquiet', `*!*@${whois.host}`, event.channel);

                                return bot.giveQuiet(`*!*@${whois.host}`, event.channel);
                            })
                            .then(() => {
                                bot.notify(event.nick, `${target} has been quieted for ${time.toNow(true)}.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not quiet ${target}: ${error}`);
                            });
                    }
                },
                'Usage: quiet [USER_NAME]'
            ],
            unquiet: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                return bot.takeQuiet(`*!*@${whois.host}`, event.channel);
                            })
                            .then(() => {
                                bot.notify(event.nick, `${target} has been unquieted.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not unquiet ${target}: ${error}`);
                            });
                    }
                },
                'Usage: unquiet [USER_NAME]'
            ],
            kick: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                if(bot.users.isInChannel(target, event.channel)){
                                    bot.giveOp(bot.client.nick, event.channel)
                                        .then(() => bot.kick(target, event.channel))
                                        .then(() => bot.takeOp(bot.client.nick, event.channel));
                                }else{
                                    throw ('User not in channel');
                                }

                            })
                            .then(() => {
                                bot.notify(event.nick, `${target} has been kicked.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not kick ${target}: ${error}`);
                            });
                    }
                },
                'Usage: kick [USER_NAME]'
            ]
        }
    };
};
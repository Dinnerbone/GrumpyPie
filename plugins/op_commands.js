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
        const timer = {
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
        const location = timers.indexOf(timer);
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
                const time = args[i].replace(/[^\d]/gi, '');
                const unit = args[i].replace(/[\d]/gi, '');
                return moment().add(time, moment.normalizeUnits(unit));
            }
        }
    }

    // Load timers on plugin load
    for (const timer of timers) {
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
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        bot.giveOp(target, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `${target} was opped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not op ${target}: ${error}`);
                            });
                    }
                },
                {
                    pattern: /^(\S*) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        const time = parseTime(event.args);
                        bot.giveOp(target, event.channel)
                            .then(() => {
                                addTimer(time, 'deop', target, event.channel);

                                bot.notify(event.nick, `${target} was opped for ${time.toNow(true)}.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not op ${target}: ${error}`);
                            });
                    }
                },
                'Usage: op TARGET_NICK [TIME_STAMP]'
            ],
            deop: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        bot.takeOp(target, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `${target} was deopped.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not deop ${target}: ${error}`);
                            });
                    }
                },
                'Usage: deop [TARGET_NICK]'
            ],
            voice: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        bot.giveVoice(target, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `${target} was voiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not voice ${target}: ${error}`);
                            });
                    }
                },
                {
                    pattern: /^(\S*) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        const time = parseTime(event.args);
                        bot.giveVoice(target, event.channel)
                            .then(() => {
                                addTimer(time, 'devoice', target, event.channel);

                                bot.notify(event.nick, `${target} was voiced for ${time.toNow(true)}.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not voice ${target}: ${error}`);
                            });
                    }
                },
                'Usage: voice [TARGET_NICK]'
            ],
            devoice: [
                {
                    pattern: /^(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        bot.takeVoice(target, event.channel)
                            .then(() => {
                                bot.notify(event.nick, `${target} was devoiced.`);
                            })
                            .catch((error) => {
                                bot.notify(event.nick, `Could not devoice ${target}: ${error}`);
                            });
                    }
                },
                'Usage: devoice [TARGET_NICK]'
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
                'Usage: quiet [TARGET_NICK]'
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
                'Usage: unquiet [TARGET_NICK]'
            ],
            kick: [
                {
                    pattern: /^(\S+)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        bot.users.get(target)
                            .then((whois) => {
                                if (bot.users.isInChannel(target, event.channel)) {
                                    bot.giveOp(bot.client.nick, event.channel)
                                        .then(() => bot.kick(target, event.channel))
                                        .then(() => bot.takeOp(bot.client.nick, event.channel));
                                } else {
                                    throw 'Not in channel';
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
                'Usage: kick [TARGET_NICK]'
            ]
        }
    };
};
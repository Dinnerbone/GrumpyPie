'use strict';

var moment = require('moment');
var schedule = require('node-schedule');

module.exports = (bot, config) => {
    if (typeof config.data.timers === 'undefined') {
        config.data.timers = [];
    }
    const timers = config.data.timers;
    const actions = {
        deop: bot.takeOp,
        devoice: bot.takeVoice,
        unquiet: bot.takeQuiet,
        unban: bot.takeBan
    };

    function addTimer(time, action, target, channel) {
        const timer = {
            time: time,
            action: action,
            target: target,
            channel: channel
        };
        timers.push(timer);
        schedule.scheduleJob(moment(time).toDate(), () => {executeTimer(timer)});

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
        let time = moment(timer.time);
        if(time.diff(moment()) < 15*100) time = moment().add(15, 's'); // Timeout to make sure the bot's connected.
        let job = schedule.scheduleJob(time.toDate(), () => {executeTimer(timer)});
    }

    return {
        commands: {
            op: [
                {
                    pattern: /^({{nickname}}?)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        return bot.giveOp(target, event.channel)
                            .then(() => bot.notify(event.nick, `${target} was opped.`));
                    }
                },
                {
                    pattern: /^({{nickname}}) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        const time = parseTime(event.args);
                        return bot.giveOp(target, event.channel)
                            .then(() => {
                                addTimer(time, 'deop', target, event.channel);

                                bot.notify(event.nick, `${target} was opped for ${time.toNow(true)}.`);
                            });
                    }
                },
                'Usage: op TARGET_NICK [TIME_STAMP]'
            ],
            deop: [
                {
                    pattern: /^({{nickname}}?)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        return bot.takeOp(target, event.channel)
                            .then(() => bot.notify(event.nick, `${target} was deopped.`));
                    }
                },
                'Usage: deop [TARGET_NICK]'
            ],
            flex: [
                {
                    pattern: "",
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.giveOp(event.nick, event.channel)
                            .then(() => addTimer(moment().add(5, 's'), 'deop', event.nick, event.channel));
                    }
                }
            ],
            voice: [
                {
                    pattern: /^({{nickname}}?)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        return bot.giveVoice(target, event.channel)
                            .then(() => bot.notify(event.nick, `${target} was voiced.`));
                    }
                },
                {
                    pattern: /^({{nickname}}) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        const time = parseTime(event.args);
                        return bot.giveVoice(target, event.channel)
                            .then(() => {
                                addTimer(time, 'devoice', target, event.channel);

                                bot.notify(event.nick, `${target} was voiced for ${time.toNow(true)}.`);
                            });
                    }
                },
                'Usage: voice [TARGET_NICK]'
            ],
            devoice: [
                {
                    pattern: /^({{nickname}}?)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        if (target.length === 0) target = event.nick;
                        return bot.takeVoice(target, event.channel)
                            .then(() => bot.notify(event.nick, `${target} was devoiced.`));
                    }
                },
                'Usage: devoice [TARGET_NICK]'
            ],
            quiet: [
                {
                    pattern: /^({{nickname}})$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.users.get(target)
                            .then((whois) => bot.giveQuiet(`*!*@${whois.host}`, event.channel))
                            .then(() => bot.notify(event.nick, `${target} has been quieted.`));
                    }
                },
                {
                    pattern: /^({{nickname}}) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        const time = parseTime(event.args);
                        return bot.users.get(target)
                            .then((whois) => {
                                addTimer(time, 'unquiet', `*!*@${whois.host}`, event.channel);

                                return bot.giveQuiet(`*!*@${whois.host}`, event.channel);
                            })
                            .then(() => bot.notify(event.nick, `${target} has been quieted for ${time.toNow(true)}.`));
                    }
                },
                'Usage: quiet [TARGET_NICK]'
            ],
            unquiet: [
                {
                    pattern: /^({{nickname}})$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.users.get(target)
                            .then((whois) => bot.takeQuiet(`*!*@${whois.host}`, event.channel))
                            .then(() => bot.notify(event.nick, `${target} has been unquieted.`));
                    }
                },
                'Usage: unquiet [TARGET_NICK]'
            ],
            kick: [
                {
                    pattern: /^({{nickname}})$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.users.get(target)
                            .then((whois) => {
                                if (bot.users.isInChannel(target, event.channel)) {
                                    return bot.giveOp(bot.client.nick, event.channel);
                                } else {
                                    throw 'Not in channel';
                                }
                            })
                            .then(() => bot.kick(target, event.channel))
                            .then(() => bot.takeOp(bot.client.nick, event.channel))
                            .then(() => bot.notify(event.nick, `${target} has been kicked.`));
                    }
                },
                'Usage: kick [TARGET_NICK]'
            ],
            ban: [
                {
                    pattern: /^({{nickname}})$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.users.get(target)
                            .then((whois) => bot.giveBan(`*!*@${whois.host}`, event.channel))
                            .then(() => bot.notify(event.nick, `${target} has been banned.`));
                    }
                },
                {
                    pattern: /^({{nickname}}) (\S+) *(\S*)$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        const time = parseTime(event.args);
                        return bot.users.get(target)
                            .then((whois) => {
                                bot.giveBan(`*!*@${whois.host}`, event.channel);
                                addTimer(time, 'unban', `*!*@${whois.host}`, event.channel);
                            })
                            .then(() => bot.notify(event.nick, `${target} has been banned for ${time.toNow(true)}.`));
                    }
                },
                'Usage: ban [TARGET_NICK]'
            ],
            unban: [
                {
                    pattern: /^({{nickname}})$/,
                    requires: 'operator',
                    execute: (event, target) => {
                        return bot.users.get(target)
                            .then((whois) => bot.takeBan(`*!*@${whois.host}`, event.channel))
                            .then(() => bot.notify(event.nick, `${target} has been unbanned.`));
                    }
                },
                'Usage: unban [TARGET_NICK]'
            ]
        }
    };
};
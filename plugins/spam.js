'use strict';

const moment = require('moment');
const XRegExp = require('xregexp');
var schedule = require('node-schedule');

module.exports = (bot, config) => {
    if (typeof config.data.channels === 'undefined') {
        config.data.channels = {};
    }
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
            schedule.scheduleJob(moment().add(10, 's').toDate(), () => {executeTimer(timer)});
        }
    }

    // Load timers on plugin load
    for (const timer of timers) {
        let time = moment(timer.time);
        if(time.diff(moment()) < 15*1000) time = moment().add(15, 's'); // Timeout to make sure the bot's connected.
        let job = schedule.scheduleJob(time.toDate(), () => {executeTimer(timer)});
    }

    const getChannel = (name) => {
        name = name.toLowerCase();
        let result = config.data.channels[name];
        if (typeof result === 'undefined') {
            result = {
                enabled: false,
                advertisingThreshold: 600,
                advertisingKickMessage: "Advertising is not permitted in this channel.",
                advertisingNotice: "Advertising is not permitted in this channel.",
                autoBanEnabled: false,
                autoBanPattern: "^$",
                autoBanDuration: moment.duration(30, "days")
            };
            config.data.channels[name] = result;
        }
        return result;
    };

    const hasAdvertising = (message) => {
        message = message.toLowerCase().replace(/\s+/g, ' ');
        if (message.indexOf('join #') > -1) return true;
        const pattern = /(?:^|\s|ip(?:=|:)|\*)(\d{1,3}(?:\.\d{1,3}){3})\.?(?:\s|$|:|\*|!|\.|,|;|\?)/;
        return message.match(pattern) !== null;
    };

    const onChannelMessage = (nick, channelName, message) => {
        const channel = getChannel(channelName);
        if (!channel.enabled) return;
        const now = moment();
        const joinTime = moment.duration(now.diff(moment(bot.users.getJoinTime(nick, channelName))));

        if (joinTime.asSeconds() < channel.advertisingThreshold) {
            if (hasAdvertising(message)) {
                return bot.users.get(nick)
                    .then((whois) => {
                        if (bot.users.isInChannel(nick, channelName)) {
                            return bot.giveOp(bot.client.nick, channelName);
                        } else {
                            throw 'Not in channel';
                        }
                    })
                    .then(() => bot.kick(nick, channelName, channel.advertisingKickMessage))
                    .then(() => bot.takeOp(bot.client.nick, channelName))
                    .then(() => bot.notify(nick, channel.advertisingNotice))
                    .catch((error) => console.error(`Could not kick ${nick} from ${channelName} for advertising!`, error));
            }
        }
    };

    const onUserJoined = (channelName, nick, message) => {
        const channel = getChannel(channelName);
        if (!channel.enabled || !channel.autoBanEnabled) return;
        const mask = `${message.nick}!${message.user}@${message.host}`;
        const banmask = `*!*@${message.host}`;
        const pattern = XRegExp(channel.autoBanPattern || "^$");
        if (XRegExp.test(mask, pattern)) {
            addTimer(moment().add(channel.autoBanDuration, "seconds"), "unban", banmask, channelName);
            bot.kickBan(banmask, channelName, nick, "Suspicious bot.").catch(console.error);
        }
    };

    return {
        commands: {
            spam: [
                {
                    pattern: /^enable$/,
                    requires: 'operator',
                    execute: (event) => {
                        const channel = getChannel(event.channel);
                        channel.enabled = true;
                        return config.save()
                            .then(() => bot.notify(event.nick, `Spam protection enabled. ${event.channel} is now protected from spam.`));
                    }
                },
                {
                    pattern: /^disable$/,
                    requires: 'operator',
                    execute: (event) => {
                        const channel = getChannel(event.channel);
                        channel.enabled = false;
                        return config.save()
                            .then(() => bot.notify(event.nick, `Spam protection disabled. ${event.channel} is no longer protected from spam.`));
                    }
                },
                {
                    pattern: /^set advertising threshold (\d+) (\w+)$/,
                    requires: 'operator',
                    execute: (event, amount, unit) => {
                        const channel = getChannel(event.channel);
                        const duration = moment.duration(Number(amount), unit);
                        channel.advertisingThreshold = duration.asSeconds();
                        return config.save()
                            .then(() => bot.notify(event.nick, `The advertising threshold for a user joining ${event.channel} is now ${duration.humanize()}.`));
                    }
                },
                {
                    pattern: /^set automatic ban pattern (.+)$/,
                    requires: 'operator',
                    execute: (event, rawPattern) => {
                        const channel = getChannel(event.channel);
                        try {
                            const pattern = XRegExp(rawPattern);
                        } catch (error) {
                            return bot.notify(event.nick, `Invalid pattern /${rawPattern}/: ${error}`);
                        }
                        channel.autoBanPattern = rawPattern;
                        return config.save()
                            .then(() => bot.notify(event.nick, `The automatic ban pattern for ${event.channel} has been set to /${rawPattern}/.`));
                    }
                },
                {
                    pattern: /^set automatic ban duration (\d+) (\w+)$/,
                    requires: 'operator',
                    execute: (event, amount, unit) => {
                        const channel = getChannel(event.channel);
                        const duration = moment.duration(Number(amount), unit);
                        channel.autoBanDuration = duration.asSeconds();
                        return config.save()
                            .then(() => bot.notify(event.nick, `The automatic ban duration for ${event.channel} is now ${duration.humanize()}.`));
                    }
                },
                {
                    pattern: /^enable automatic ban$/,
                    requires: 'operator',
                    execute: (event, rawPattern) => {
                        const channel = getChannel(event.channel);
                        channel.autoBanEnabled = true;
                        return config.save()
                            .then(() => bot.notify(event.nick, `I will now automatically ban anyone joining ${event.channel} matching the pattern /${rawPattern}/.`));
                    }
                },
                {
                    pattern: /^disable automatic ban$/,
                    requires: 'operator',
                    execute: (event, rawPattern) => {
                        const channel = getChannel(event.channel);
                        channel.autoBanEnabled = false;
                        return config.save()
                            .then(() => bot.notify(event.nick, `I will no longer automatically ban anyone joining ${event.channel} matching the pattern /${rawPattern}/.`));
                    }
                },
                {
                    pattern: /^set advertising kick (.+)$/,
                    requires: 'operator',
                    execute: (event, message) => {
                        const channel = getChannel(event.channel);
                        channel.advertisingKickMessage = message;
                        return config.save()
                            .then(() => bot.notify(event.nick, `The kick message for a user joining ${event.channel} and advertising has now changed.`));
                    }
                },
                {
                    pattern: /^set advertising notice (.+)$/,
                    requires: 'operator',
                    execute: (event, message) => {
                        const channel = getChannel(event.channel);
                        channel.adveritsingNotice = message;
                        return config.save()
                            .then(() => bot.notify(event.nick, `The /notice to a user joining ${event.channel} and advertising has now changed.`));
                    }
                },
                "Usage: spam <enable|disable|set advertising threshold ... ...|set advertising kick ...|set advertising notice ...>"
            ]
        },
        listeners: {
            'message#': onChannelMessage,
            'join': onUserJoined
        }
    };
};
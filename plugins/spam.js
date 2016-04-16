'use strict';

const moment = require('moment');
const XRegExp = require('xregexp');

module.exports = (bot, config) => {
    if (typeof config.data.channels === 'undefined') {
        config.data.channels = {};
    }

    const getChannel = (name) => {
        name = name.toLowerCase();
        let result = config.data.channels[name];
        if (typeof result === 'undefined') {
            result = {
                enabled: false,
                advertisingThreshold: 600,
                advertisingKickMessage: "Advertising is not permitted in this channel.",
                advertisingNotice: "Advertising is not permitted in this channel."
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
            'message#': onChannelMessage
        }
    };
};
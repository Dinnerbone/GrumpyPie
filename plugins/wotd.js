'use strict';

const schedule = require('node-schedule');
const moment = require('moment');
const fs = require('fs');

module.exports = (bot, config) => {
    if (typeof config.data.channels === 'undefined') {
        config.data.channels = {};
    }
    if (typeof config.data.awardDelay === 'undefined') {
        config.data.awardDelay = {min: 1000, max: 60000};
    }
    if (typeof config.data.wordlist === 'undefined') {
        config.data.wordlist = 'wordlist.txt';
    }

    const jobs = {};

    const pickNewWord = () => {
        const filename = config.data.wordlist || '';
        try {
            const data = fs.readFileSync(filename, 'utf-8');
            const lines = data.split(/\s+/);
            return lines[Math.floor(Math.random() * lines.length)];
        } catch (error) {
            console.error(`Can't read wordlist at ${filename}`, error);
            return null;
        }
    };

    const stopJob = (channel) => {
        channel = channel.toLowerCase();
        const job = jobs[channel];
        if (typeof job !== 'undefined') {
            job.cancel();
            delete jobs[channel];
            delete config.data.channels[channel];
            return config.save();
        }
    };

    const startJob = (channel, cron, loading) => {
        channel = channel.toLowerCase();
        let job = jobs[channel];
        if (typeof job !== 'undefined') {
            job.reschedule(cron);
        } else {
            job = schedule.scheduleJob(cron, () => resetChannel(channel));
            jobs[channel] = job;
        }
        if (loading) {
            return job;
        } else {
            config.data.channels[channel] = {schedule: cron, word: pickNewWord(), winners: [], maxWinners: 3};
            return config.save().then(() => job);
        }
    };

    const getJob = (channel) => {
        return jobs[channel.toLowerCase()];
    };

    const resetChannel = (channel) => {
        channel = channel.toLowerCase();
        const info = config.data.channels[channel];
        if (typeof info === 'undefined') return;
        const time = moment(getJob(channel).nextInvocation()).fromNow(true);
        if (info.winners.length === 0) {
            bot.client.say(channel, `Aww, nobody guessed today's Word of the Day. The word was '${info.word}'. A new word has been chosen, you have ${time} to guess!`);
        } else {
            bot.client.say(channel, `Thanks for playing Word of the Day! Congratulations to all the winners. The word was '${info.word}'. A new word has been chosen, you have ${time} to guess!`);
            for (const i in info.winners) {
                bot.takeVoice(info.winners[i], channel);
            }
        }
        info.word = pickNewWord();
        info.winners = [];
        config.save();
    };

    const getAwardDelay = () => {
        const delay = config.data.awardDelay;
        return delay.min + Math.random() * (delay.max - delay.min);
    };

    const checkForWord = (nick, channel, message) => {
        channel = channel.toLowerCase();
        const info = config.data.channels[channel];
        if (typeof info === 'undefined') return;
        if (info.winners.length >= info.maxWinners) return;
        if (info.winners.indexOf(nick) > -1) return;

        if (message.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/ /).indexOf(info.word) > -1) {
            info.winners.push(nick);
            const next = moment(getJob(channel).nextInvocation());
            if (next.diff(moment()) > config.data.awardDelay.max) setTimeout(() => bot.giveVoice(nick, channel), getAwardDelay());
            bot.notify(nick, `You guessed the secret Word of The Day! It was '${info.word}', but shh! Don't tell anybody!`);
            if (info.winners.length === info.maxWinners) {
                bot.client.say(channel, `That's all the winners! The Word of The Day was '${info.word}'. Enjoy your voice until the next draw ${next.fromNow()}! <3`);
            }
            config.save();
        }
    };

    for (const channel in config.data.channels) {
        startJob(channel, config.data.channels[channel].schedule, true);
    }

    return {
        commands: {
            wotd: [
                {
                    pattern: /^set schedule (.+)$/,
                    requires: 'operator',
                    execute: (event, cron) => {
                        return startJob(event.channel, cron)
                            .then((job) => bot.notify(event.nick, `Schedule set. Next WOTD will be ${moment(job.nextInvocation()).fromNow()}.`));
                    }
                },
                {
                    pattern: /^set wordlist (.+)$/,
                    requires: 'admin',
                    execute: (event, wordlist) => {
                        config.data.wordlist = wordlist;
                        return config.save()
                            .then((job) => bot.notify(event.nick, `Wordlist set.`));
                    }
                },
                {
                    pattern: /^set winner count (\d+)$/,
                    requires: 'admin',
                    execute: (event, count) => {
                        const info = config.data.channels[event.channel.toLowerCase()];
                        if (typeof info === 'undefined') {
                            bot.notify(event.nick, `Can't set winner count for a channel with no WotD`);
                        } else {
                            info.maxWinners = Number(count);
                            return config.save()
                                .then((job) => bot.notify(event.nick, `Winner count has been set to ${count}.`));
                        }
                    }
                },
                {
                    pattern: /^stop$/,
                    requires: 'operator',
                    execute: (event) => {
                        return stopJob(event.channel)
                            .then((job) => bot.notify(event.nick, `Schedule cleared. No more WOTDs will happen for this channel.`));
                    }
                },
                {
                    pattern: /^reset$/,
                    requires: 'operator',
                    execute: (event) => resetChannel(event.channel)
                },
                "Usage: wotd <set <schedule CRON_SCHEDULE|wordlist WORDLIST_FILE.txt|winner count WINNER_COUNT>|stop|reset>"
            ]
        },
        listeners: {
            'message#': checkForWord
        }
    };
};

'use strict';

const schedule = require('node-schedule');
const moment = require('moment');

module.exports = (bot, config) => {
    if (typeof config.data.channels === 'undefined') {
        config.data.channels = {};
    }

    const jobs = {};

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
            job = schedule.scheduleJob(cron, () => drawWinner(channel));
            jobs[channel] = job;
        }
        if (loading) {
            return job;
        } else {
            config.data.channels[channel] = {schedule: cron, players: {}, winner: null};
            return config.save().then(() => job);
        }
    };

    const getJob = (channel) => {
        return jobs[channel.toLowerCase()];
    };

    const drawWinner = (channel) => {
        const lowerChannel = channel.toLowerCase();
        const info = config.data.channels[lowerChannel];
        if (typeof info === 'undefined') return;
        const nextDraw = moment(getJob(lowerChannel).nextInvocation()).fromNow(true);
        const users = bot.users.getChannelOccupants(channel);
        const considerations = {};
        const allOdds = [];
        let totalWeight = 0;


        for (let nick in users) {
            if (users[nick].modes.indexOf('v') === -1 && info.players[nick]) {
                const player = info.players[nick];
                const weight = player.messages * player.multiplier;
                console.log(`Weight for ${nick} is ${weight}`);
                if (weight > 0) {
                    considerations[nick] = weight;
                    totalWeight += weight;
                }
            }
        }

        let weight = 0;
        let target = Math.random() * totalWeight;
        let winner = null;
        for (let nick in considerations) {
            allOdds.push({nick: nick, weight: considerations[nick], chance: Math.floor(weight / totalWeight * 100)});
            if (!winner) {
                weight += considerations[nick];
                if (target < weight) {
                    winner = nick;
                }
            }
        }

        allOdds.sort((a, b) => {
            return b.weight - a.weight;
        });

        for (let nick in info.players) {
            const player = info.players[nick];
            if (nick !== winner) {
                player.multiplier = Math.min(1, player.multiplier * 1.5);
            } else {
                player.multiplier = Math.max(0.01, player.multiplier * 0.01);
            }
            player.messages = Math.floor(player.messages / 2);
        }

        if (winner) {
            info.players[winner].wins++;
            const allWinners = [];
            for (let nick in info.players) {
                const player = info.players[nick];
                if (player.wins > 0) {
                    allWinners.push({nick: nick, wins: player.wins});
                }
            }
            allWinners.sort((a, b) => {
                return b.wins - a.wins;
            });
            let rank = 0;
            for (let i = 0; i < allWinners.length; i++) {
                if (allWinners[i].nick === winner) {
                    rank = i + 1;
                    break;
                }
            }

            if (info.winner) {
                bot.takeVoice(info.winner, channel);
            }
            info.winner = winner;

            bot.client.say(channel, `Ready everyone? It's time to choose a new Voice of the Day!`);
            setTimeout(() => {
                const winnerChance = Math.floor(considerations[winner] / totalWeight * 100);
                const bestOdds = allOdds[0];
                const runnerOdds = allOdds.length > 1 ? allOdds[1] : null;
                const player = info.players[winner];
                let message = `Coming in with`;
                let tail = ` and ${player.wins} total wins, todays hat goes to...`;
                if (bestOdds.nick === winner) {
                    if (runnerOdds) {
                        if (winnerChance - runnerOdds.chance > 5) {
                            message = `In a landslide win with`;
                        } else {
                            message = `Narrowly beating the competition with`;
                        }
                    } else {
                        message = `Perhaps because they're the only player, winning with`;
                    }
                } else if (runnerOdds && runnerOdds.nick === winner) {
                    message = `The underdog in today's race with`;
                } else if (winnerChance < 1) {
                    message = `With the impossible odds of`;
                } else if (winnerChance < 5) {
                    message = `Beating the odds with`;
                }
                if (player.wins === 1) {
                    tail = `, today's absolute first-time winner is...`;
                } else if (player.wins === 2) {
                    tail = ` and claiming their second ever hat, todays winner is...`;
                } else if (player.wins === 3) {
                    tail = `, today's third-time lucky winner is...`;
                } else if (rank === 1) {
                    tail = ` and supreme champion hatter of ${channel} claiming win #${player.wins} is...`;
                } else if (rank === 2) {
                    tail = ` and chasing for first place with #${player.wins} wins is...`;
                } else if (rank - 1 < allWinners.length / 3) {
                    tail = `, todays mad-hatter with #${player.wins} wins and #${rank} on the scoreboard is...`;
                }
                bot.client.say(channel, `${message} ${winnerChance}%${tail}`);
                setTimeout(() => {
                    bot.client.say(channel, `${winner}!`);
                    setTimeout(() => {
                        bot.giveVoice(winner, channel);
                    }, 1000);
                }, 2000);
            }, 3000);
        } else {
            console.warn(`Couldn't execute Voice of the Day - there was nobody eligable in ${channel} :(`);
        }
        
        config.save();
    };

    const showOdds = (target, channel, prefix) => {
        const info = config.data.channels[channel.toLowerCase()];

        if (!info) {
            return bot.client.say(channel, `${prefix}: Nobody has any chance of winning Voice of the Day because this channel is boring. :(`);
        }
        if (!info.players[target]) {
            return bot.client.say(channel, `${prefix}: ${target} has no chance of winning Voice of the Day. :( (Did you spell their nick correctly?)`);
        }
        const targetPlayer = info.players[target];
        const users = bot.users.getChannelOccupants(channel);
        const considerations = {};
        let totalWeight = 0;
        for (let nick in users) {
            if (users[nick].modes.indexOf('v') === -1 && info.players[nick]) {
                const player = info.players[nick];
                const weight = player.messages * player.multiplier;
                if (weight > 0) {
                    totalWeight += weight;
                }
            }
        }
        const allWinners = [];
        for (let nick in info.players) {
            const player = info.players[nick];
            if (player.wins > 0) {
                allWinners.push({nick: nick, wins: player.wins});
            }
        }
        allWinners.sort((a, b) => {
            return b.wins - a.wins;
        });
        let rank = 0;
        for (let i = 0; i < allWinners.length; i++) {
            if (allWinners[i].nick === target) {
                rank = i + 1;
                break;
            }
        }

        const youHave = prefix === target ? `You have` : `${target} has`;
        const youAre = prefix === target ? `You're` : `They're`;
        const chance = Math.floor(targetPlayer.messages * targetPlayer.multiplier / totalWeight * 100);
        const nextDraw = moment(jobs[channel.toLowerCase()].nextInvocation()).fromNow();
        if (targetPlayer.wins === 0) {
            return bot.client.say(channel, `${prefix}: ${youHave} never won Voice of the Day :( ${youAre} about ${chance}% likely to win ${nextDraw}...`);
        } else if (targetPlayer.wins === 1) {
            return bot.client.say(channel, `${prefix}: ${youHave} won Voice of the Day once! :O ${youAre} about ${chance}% likely to win again ${nextDraw}...`);
        } else {
            return bot.client.say(channel, `${prefix}: ${youHave} won Voice of the Day ${targetPlayer.wins} times, coming in at rank #${rank}! ${youAre} about ${chance}% likely to win again ${nextDraw}...`);
        }
    };

    const transferWinner = (target, channel, requestee) => {
        const info = config.data.channels[channel.toLowerCase()];
        if (!info) {
            return bot.notify(requestee, `Nothing to transfer because this channel is boring. :(`);
        }
        if (!info.winner) {
            return bot.notify(requestee, `Nothing to transfer because nobody has won yet. :(`);
        }
        if (info.winner !== requestee && !bot.permissions.isAdmin(requestee) && !bot.permissions.isOperator(requestee, channel)) {
            return bot.notify(requestee, `Cheeky cheeky...`);
        }

        var occupants = bot.users.getChannelOccupants(channel);
        if (!occupants[target]) {
            return bot.notify(requestee, `I don't know who that is...`);
        }
        if (occupants[target].modes.indexOf('v') > -1) {
            return bot.notify(requestee, `They already have voice...`);
        }

        bot.takeVoice(info.winner, channel);
        info.winner = target;
        bot.giveVoice(target, channel);
        bot.client.say(channel, `${target}: Bam!`);
    };

    const addMessageCount = (nick, channel, message) => {
        channel = channel.toLowerCase();
        const info = config.data.channels[channel];
        if (typeof info === 'undefined') return;
        if (typeof info.players === 'undefined') info.players = {};
        if (typeof info.players[nick] === 'undefined') info.players[nick] = {messages: 0, wins: 0, multiplier: 1};

        info.players[nick].messages++;
        config.save();
    };

    for (const channel in config.data.channels) {
        startJob(channel, config.data.channels[channel].schedule, true);
    }

    return {
        commands: {
            votd: [
                {
                    pattern: /^set schedule (.+)$/,
                    requires: 'operator',
                    execute: (event, cron) => {
                        return startJob(event.channel, cron)
                            .then((job) => bot.notify(event.nick, `Schedule set. Next VotD will be ${moment(job.nextInvocation()).fromNow()}.`));
                    }
                },
                {
                    pattern: /^stop$/,
                    requires: 'operator',
                    execute: (event) => {
                        return stopJob(event.channel)
                            .then((job) => bot.notify(event.nick, `Schedule cleared. No more VotDs will happen for this channel.`));
                    }
                },
                {
                    pattern: /^draw$/,
                    requires: 'operator',
                    execute: (event) => drawWinner(event.channel)
                },
                {
                    pattern: /^odds$/,
                    execute: (event) => showOdds(event.nick, event.channel, event.nick)
                },
                {
                    pattern: /^odds ({{nickname}})$/,
                    execute: (event, target) => showOdds(target, event.channel, event.nick)
                },
                {
                    pattern: /^transfer ({{nickname}})$/,
                    execute: (event, target) => transferWinner(target, event.channel, event.nick)
                },
                "Usage: votd <set schedule CRON_SCHEDULE|stop|draw|odds [PERSON]|transfer PERSON>"
            ]
        },
        listeners: {
            'message#': addMessageCount
        }
    };
};
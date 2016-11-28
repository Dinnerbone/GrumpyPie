'use strict';

module.exports = (bot) => {
    const events = {};
    const users = {};
    const channels = {};

    events.parseUsersChannel = (channel, names) => {
        for (let name in names) {
            if (!names.hasOwnProperty(name)) continue;
            let modes = [];
            if (names[name].indexOf('@') > -1) modes.push('o');
            if (names[name].indexOf('+') > -1) modes.push('v');
            events.joined(name, channel, 0, modes);
        }
    };

    events.leave = (name, channel) => {
        channel = channel.toLowerCase();

        const index = users[name].channels.indexOf(channel);
        if (index > -1) users[name].channels.splice(index, 1);
        if (users[name].channels.length === 0) delete users[name];

        if (channels[channel] !== undefined) delete channels[channel].users[name];
    };

    events.quit = (name) => {
        if (users[name] !== undefined) delete users[name];

        for (const channel in channels) {
            delete channels[channel].users[name];
        }
    };

    events.joined = (name, channel, timestamp, modes) => {
        channel = channel.toLowerCase();

        if (users[name] === undefined) users[name] = {channels: []};
        if (users[name].channels.indexOf(channel) === -1) users[name].channels.push(channel);

        if (channels[channel] === undefined) channels[channel] = {users: {}};
        if (channels[channel].users[name] === undefined) channels[channel].users[name] = {joined: timestamp, modes: modes};
    };

    events.kick = (name, channel) => {
        events.leave(name, channel);
    };

    events.renamed = (oldName, newName) => {
        if (users[oldName] !== undefined) {
            users[newName] = users[oldName];
            delete users[oldName];
        }

        for (const channel in channels) {
            channels[channel].users[newName] = channels[channel].users[oldName];
            delete channels[channel].users[oldName];
        }
    };

    events.changeMode = (channel, mode, name, adding) => {
        if (mode !== 'o' && mode !== 'v') return;

        channel = channel.toLowerCase();
        if (channels[channel] !== undefined) {
            if (channels[channel].users[name] !== undefined) {
                const index = channels[channel].users[name].modes.indexOf(mode);
                if (index === -1 && adding) {
                    channels[channel].users[name].modes.push(mode);
                } else if (index > -1 && !adding) {
                    channels[channel].users[name].modes.splice(index, 1);
                }
            }
        }
    };

    return {
        events: events,
        get: (nick) => {
            if (typeof users[nick] === 'undefined') {
                return Promise.reject(`Untracked nick '${nick}'.`);
            }
            const expireTime = 30 * 1000;
            if (typeof users[nick].whois !== 'undefined') {
                const whois = users[nick].whois;
                if (typeof whois.pending !== 'undefined') {
                    return whois.pending;
                }
                if (whois.canExpire && Date.now() - whois.at >= expireTime) {
                    delete users[nick].whois;
                } else {
                    return Promise.resolve(whois);
                }
            }

            users[nick].whois = {
                pending: new Promise((resolve, reject) => {
                    bot.client.whois(nick, (whois) => {
                        const user = whois.account || null;
                        users[nick].whois = {
                            user: user,
                            at: Date.now(),
                            ident: whois.user,
                            host: whois.host,
                            realname: whois.realname,
                            canExpire: typeof user !== 'string' || user.length === 0
                        };
                        resolve(users[nick].whois);
                    });
                })
            };

            return users[nick].whois.pending;
        },
        getChannelOccupants: (name) => {
            name = name.toLowerCase();
            if (typeof channels[name] === 'undefined') return [];
            return channels[name].users;
        },
        isInChannel: (nick, channel) => {
            return (users[nick] !== undefined && users[nick].channels.indexOf(channel.toLowerCase()) > -1);
        },
        getJoinTime: (nick, channel) => {
            channel = channel.toLowerCase();
            if (typeof channels[channel] === 'undefined') return null;
            if (typeof channels[channel].users[nick] === 'undefined') return null;
            return channels[channel].users[nick].joined;
        },
        nickHasChannelMode: (nick, channel, mode) => {
            channel = channel.toLowerCase();
            if (typeof channels[channel] === 'undefined') return false;
            if (typeof channels[channel].users[nick] === 'undefined') return false;
            return channels[channel].users[nick].modes.indexOf(mode) > -1;
        }
    };
};
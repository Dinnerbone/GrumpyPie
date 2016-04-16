'use strict';

module.exports = (bot) => {
    const events = {};
    const users = {};

    events.parseUsersChannel = (channel, names) => {
        for (let name in names) {
            if (names.hasOwnProperty(name)) events.joined(name, channel, 0);
        }
    };

    events.leave = (name, channel) => {
        if (users[name].channels[channel] !== undefined && users[name].channels.length > 1) {
            delete users[name].channels[channel];
        } else if (users[name].channels[channel] !== undefined) {
            delete users[name];
        }
    };

    events.quit = (name) => {
        if (users[name] !== undefined) delete users[name];
    };

    events.joined = (name, channel, timestamp) => {
        if (users[name] !== undefined) {  // user exists
            users[name].channels[channel] = {join: timestamp};
        } else {
            users[name] = {
                name: name,
                channels: {[channel]: {join: timestamp}}
            };
        }
    };

    events.kick = (name, channel) => {
        if (users[name] !== undefined && users[name].channels[channel] !== undefined) {
            delete users[name].channels[channel];
        }
    };

    events.renamed = (oldName, newName) => {
        if (users[oldName] !== undefined) {
            users[newName] = users[oldName];
            delete users[oldName];
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
        isInChannel: (nick, channel) => {
            return (users[nick] !== undefined && users[nick].channels[channel] !== undefined);
        },
        getJoinTime: (nick, channel) => {
            if (typeof users[nick] === 'undefined') return null;
            if (typeof users[nick].channels[channel] === 'undefined') return null;
            return users[nick].channels[channel].join;
        }
    };
};
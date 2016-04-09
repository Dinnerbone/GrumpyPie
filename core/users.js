'use strict';

module.exports = (bot, config) => {
    const events = {};
    const users = {};

    events.parseUsersChannel = (channel, names) => {
        for (let name in names) {
            if (names.hasOwnProperty(name)) events.joined(name, channel, 0);
        }
    };

    events.saveChat = (channel, name, text) => {
        const maxChatToKeep = 3;
        if (users[name].channels[channel].lastChat.length >= config.data.maxChatToKeep) {
            users[name].channels[channel].lastChat.shift();
            users[name].channels[channel].lastChat.push(text);
        } else {
            users[name].channels[channel].lastChat.push(text);
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
            users[name].channels[channel] = {join: timestamp, lastChat: []};
        } else {
            users[name] = {
                name: name,
                channels: {[channel]: {join: timestamp, lastChat: []}}
            };
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
        }
    };
};
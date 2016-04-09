'use strict';

module.exports = (bot) => {
    const events = {};
    const users = {};

    events.parseUsersChannel = (channel, names) => {
        for (let name in names) {
            if (names.hasOwnProperty(name)) events.joined(name, channel, 0);
        }
    };

    events.saveChat = (channel, name, text) => {
        const maxChatToKeep = 3;
        if (users[name].channels[channel].lastChat.length >= maxChatToKeep) {
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
        getUser: (name) => {
            if (typeof users[name] === 'undefined') {
                return Promise.reject(`Untracked nick '${name}'.`);
            }
            const expireTime = 30 * 1000;
            if (typeof users[name].whois !== 'undefined') {
                const whois = users[name].whois;
                if (typeof whois.pending !== 'undefined') {
                    return whois.pending;
                }
                if (whois.canExpire && Date.now() - whois.at >= expireTime) {
                    delete users[name].whois;
                } else {
                    return Promise.resolve(whois.user);
                }
            }

            users[name].whois = {
                pending: new Promise((resolve, reject) => {
                    bot.client.whois(name, (whois) => {
                        const user = whois.account || null;
                        users[name].whois = {
                            user: user,
                            at: Date.now(),
                            canExpire: typeof user !== 'string' || user.length === 0
                        };
                        resolve(user);
                    });
                })
            };

            return users[name].whois.pending;
        }
    };
};
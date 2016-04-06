'use strict';

module.exports = (bot) => {
    const manager = {};
    let users = {};

    manager.parseUsersChannel = (channel, names) => {
        for (let name in names) {
            if (names.hasOwnProperty(name)) manager.joined(name, channel, 0);
        }
    };

    manager.saveChat = (channel, name, text) => {
        if (users[name].channels[channel].lastChat.length >= 3) {
            users[name].channels[channel].lastChat.shift();
            users[name].channels[channel].lastChat.push(text);
        } else {
            users[name].channels[channel].lastChat.push(text);
        }
    };

    manager.leave = (name, channel) => {
        if (users[name].channels[channel] !== undefined && users[name].channels.length > 1) {
            delete users[name].channels[channel];
        } else if (users[name].channels[channel] !== undefined) {
            delete users[name];
        }
    };

    manager.quit = (name) => {
        if (users[name] !== undefined) delete users[name];
    };

    manager.joined = (name, channel, timestamp) => {
        if (users[name] !== undefined) {  // user exists
            users[name].channels[channel] = {join: timestamp, lastChat: []};
        } else {
            users[name] = {
                name: name,
                channels: {[channel]: {join: timestamp, lastChat: []}}
            };
        }
    };

    manager.renamed = (oldName, newName) => {
        if (users[oldName] !== undefined) {
            users[newName] = users[oldName];
            delete users[oldName];
        }
    };


    return manager;


};
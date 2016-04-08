'use strict';

module.exports = (bot, config) => {
    if (typeof config.data.permissions === 'undefined') {
        config.data.permissions = {};
    }
    const users = config.data.permissions;
    return {
        isAdmin: (user) => {
            return Boolean(users[user] && users[user].admin);
        },
        isOperator: (user, channel) => {
            return Boolean(users[user] && users[user].channels && users[user].channels.indexOf(channel) > -1);
        },
        setAdmin: (user, value) => {
            if (typeof users[user] === 'undefined') {
                users[user] = {};
            }
            users[user].admin = !!value;
            return config.save();
        },
        setOperator: (user, channel, value) => {
            if (typeof users[user] === 'undefined') {
                users[user] = {};
            }
            if (typeof users[user].channels === 'undefined') {
                users[user].channels = [];
            }
            const index = users[user].channels.indexOf(channel);
            if (value && index === -1) {
                users[user].channels.push(channel);
                return config.save();
            } else if (!value && index > -1) {
                users.splice(index, 1);
                return config.save();
            }
        }
    };
};
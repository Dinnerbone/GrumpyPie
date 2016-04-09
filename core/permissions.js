'use strict';

module.exports = (bot, config) => {
    if (typeof config.data.permissions === 'undefined') {
        config.data.permissions = {};
    }
    const users = config.data.permissions;
    const getUser = (name) => {
        name = name.toLowerCase();
        let result = users[name];
        if (typeof result === 'undefined') {
            result = {admin: false, channels: []};
            users[name] = result;
        }
        return result;
    };
    const saveConfig = () => {
        for (const name in users) {
            const user = users[name];
            if (!user.admin && user.channels.length === 0) {
                delete users[name];
            }
        }
        return config.save();
    };

    for (const name in users) {
        const user = users[name];
        if (typeof user.admin !== 'boolean') {
            user.admin = false;
        }
        if (!Array.isArray(user.channels)) {
            user.channels = [];
        }
    }

    return {
        isAdmin: (name) => {
            return getUser(name).admin;
        },
        isOperator: (name, channel) => {
            return getUser(name).channels.indexOf(channel.toLowerCase()) > -1;
        },
        setAdmin: (name, value) => {
            const user = getUser(name);
            user.admin = !!value;
            return saveConfig();
        },
        setOperator: (name, channel, value) => {
            const user = getUser(name);
            const index = user.channels.indexOf(channel.toLowerCase());
            if (value && index === -1) {
                user.channels.push(channel.toLowerCase());
                return saveConfig();
            } else if (!value && index > -1) {
                user.channels.splice(index, 1);
                return saveConfig();
            }
        }
    };
};
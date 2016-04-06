'use strict';

module.exports = (bot) => {
    const commands = {};
    const dispatcher = {};

    dispatcher.addCommands = (plugin, list) => {
        for (const command in list) {
            const entries = [];
            let fallback = null;
            let usage = null;

            for (let i = 0; i < list[command].length; i++) {
                const item = list[command][i];
                if (Array.isArray(item)) {
                    if (item.length != 2) {
                        throw new Error(`Command entry in ${command} needs to either be a usage string (1 only), a function for no arguments (1 only), or an array of [pattern, callback]. Found array of ${item.length}.`);
                    }
                    entries.push({
                        pattern: item[0],
                        callback: item[1]
                    });
                } else if (typeof item === 'function') {
                    if (fallback !== null) {
                        throw new Error(`Command entry in ${command} needs to either be a usage string (1 only), a function for no arguments (1 only), or an array of [pattern, callback]. Found multiple no-argument functions.`);
                    }
                    fallback = item;
                } else if (typeof item === 'string') {
                    if (usage !== null) {
                        throw new Error(`Command entry in ${command} needs to either be a usage string (1 only), a function for no arguments (1 only), or an array of [pattern, callback]. Found multiple usage strings.`);
                    }
                    usage = item;
                } else {
                    throw new Error(`Command entry in ${command} needs to either be a usage string (1 only), a function for no arguments (1 only), or an array of [pattern, callback]. Found a ${typeof item}`);
                }
            }

            if (entries.length === 0 && fallback === null) {
                throw new Error(`Command entry ${command} contains no callbacks. What should it do?!`);
            }

            commands[command] = {
                entries: entries,
                fallback: fallback,
                usage: usage,
                plugin: plugin
            };
        }
    };

    dispatcher.runCommand = (nick, channel, message) => {
        const space = message.indexOf(' ');
        let name = message;
        let args = '';
        if (space > -1) {
            name = message.substr(0, space);
            args = message.substr(space + 1);
        }
        if (typeof commands[name] === 'object') {
            const command = commands[name];
            if (args.length === 0 && command.fallback) {
                command.fallback(nick, channel);
                return;
            }
            for (let i = 0; i < command.entries.length; i++) {
                const entry = command.entries[i];
                const match = entry.pattern.exec(args);
                if (match) {
                    const params = [nick, channel];
                    for (let j = 1; j < match.length; j++) {
                        params.push(match[j]);
                    }
                    entry.callback.apply(null, params);
                    return;
                }
            }
            if (command.usage) {
                bot.notify(nick, command.usage);
            }
        }
    };

    return dispatcher;
};
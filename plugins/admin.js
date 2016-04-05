'use strict';

module.exports = (bot) => {
    return {
        commands: {
            load: [
                [/^([a-z_]+)$/, (nick, channel, plugin) => {
                    bot.loadPlugin(plugin)
                        .then(() => {
                            bot.notify(nick, `Plugin ${plugin} has been successfully loaded.`);
                        })
                        .catch((error) => {
                            bot.notify(nick, `Plugin ${plugin} could not be loaded: ${error}`);
                        });
                }],
                'Usage: load PLUGIN_NAME'
            ]
        }
    };
};
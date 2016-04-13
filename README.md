# GrumpyPie
GrumpyPie is an operator bot for the #minecraft channel on freenode. It's very specific in its actions, and is mostly just used to ban some people, and voice those who say 'butts' enough times.

## Installation
- Install Node.
- Clone the repository.
- Set up a config file as shown below.
- `$ npm install`
- `$ node .`

## Configuration
To run the bot you must set up a config file with the IRC server/channels. Make a file called `configs/bot.json` using the following template:
```json
{
  "irc": {
    "server": "irc.freenode.net",
    "nickname": "GrumpyPie",
    "userName": "GrumpyPie",
    "realName": "A GrumpyPie Clone - https://github.com/Dinnerbone/GrumpyPie",
    "channels": [
      "##MySecretChannel"
    ]
  },
  "commandPrefix": "!",
  "permissions": {
    "dinnerbone": {
      "admin": true,
      "channels": []
    }
  }
}
```
For possible values in the `irc` section, please see [node-irc](https://node-irc.readthedocs.org/en/latest/API.html).
You may enter your own **username** in the `permissions` section. It must be lowercase, and it'll be using whichever nickserv your network has. *(If it doesn't have any - sorry, we don't support it! You're welcome to contribute a fix though!)*

## It runs! ... now what?
You can enable any plugin from the `plugins/` directory using `!load plugin_name`. For example, to load the `wotd` plugin (Word of the Day), use `!load wotd`. You may then configure the plugin using whichever commands it has, or its configuration file which will automatically be made in `configs/plugin_wotd.json`.
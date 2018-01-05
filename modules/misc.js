const ytdl = require('ytdl-core');

exports.id = 2000;
exports.commands = {
    "ping": {
        id: 1,
        description: "You ping, I pong!",
        callback: function (message) {
            message.reply("pong");
        }
    },
    "help": {
        id: 2,
        description: "I help you find all the commands you need!",
        callback: async function (message) {
            message.reply("I'm sending you the commands in DM!");
            let help_messages = []
            Object.keys(global.modules).forEach((m) => {
                let module = global.modules[m];
                let help_lines = []
                help_lines.push(`Module "${module.name}": ${module.description}`);
                Object.keys(module.commands).forEach((key) => {
                    help_lines.push(`\t"${key}": ${module.commands[key].description}`);
                });
                help_messages.push(help_lines)
            });

            help_messages.push("If you have any bug report or feature request, please send me an email at flat.bartender@gmail.com!");
            let chan = await message.member.createDM();
            for (let m of help_messages) chan.send("```" + m.join("\n") + "```");
        }
    }
};
exports.name = "misc";
exports.description = "Provides miscellaneous functions that everyone can access.";
// Anyone can use this module.
exports.permission = function () {
    return true;
};


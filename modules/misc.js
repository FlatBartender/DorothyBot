const ytdl = require('ytdl-core');

exports.id = 2000;
exports.commands = {
    "ping": {
        id: 1,
        description: "You ping, I pong!",
        callback: function (message) {
            message.reply("pong");
        }
    }
};
exports.name = "misc";
// Anyone can use this module.
exports.permission = function () {
    return true;
};


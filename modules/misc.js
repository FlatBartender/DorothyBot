const ytdl = require('ytdl-core');

exports.commands = {
    "ping": {
        description: "You ping, I pong!",
        callback: function (message) {
            message.reply("pong");
        }
    }
};
exports.name = "misc";

// Anyone can use this module.
exports.permission = function () {
    return false;
};


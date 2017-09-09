const eliza = require("elizabot");

exports.id = 4000;

let sessions = {};

exports.commands = {
    "estart": {
        id: 1,
        description: "Start a psychotherapy session with me!",
        callback: function (message) {
            sessions[message.member.id] = new eliza();
            message.reply(sessions[message.member.id].getInitial());
        }
    },
    "estop": {
        id: 2,
        description: "Stop the psychotherapy session you're currently in.",
        callback: function (message) {
            if (sessions[message.member.id]) {
                message.reply(sessions[message.member.id].getFinal());
                delete sessions[message.member.id];
            } else {
                message.reply("We can't end a session when we're not even in one!");
            }
        }
    },
    "e": {
        id: 3,
        description: "Talk with me, and I'll help you as much as I can.",
        callback: function (message, content) {
            let session = sessions[message.member.id];
            if (session) {
                message.reply(session.transform(content));
            } else {
                message.reply("Appointments only!");
            }
        }
    }
};
exports.name = "eliza";
exports.description = "I'm a psychotherapist now!";
// Anyone can use this module.
exports.permission = function () {
    return true;
};

